"""Render the narration with Kokoro (offline neural TTS) and compute per-word start times for the engine's cues.
Usage: python3 narrate.py <says.json> <out_dir> [--voice am_michael:60,am_fenrir:40] [--speed 0.94] [--fx noir|clean]
                          [--pron pron.json] [--models <dir with kokoro.onnx + voices.bin>]
  says.json : ["scene 1 narration", "scene 2 narration", ...]   (export.js writes it from the page's SCENES)
  --voice   : one Kokoro voice (am_fenrir) or a blend of voices with weights (am_michael:60,am_fenrir:40). See SKILL.md for the menu.
  --fx      : noir = warm "radio narrator" treatment (EQ, light compression, short room); clean = dry voice
  pron.json : {"A.I.": "AI", "believ...": "beleev..."}  spoken-only replacements; captions keep the original words
Each scene is spoken in ONE pass so the phrasing flows across sentences. Word start times come from the pauses the
voice actually makes: punctuation is matched to detected silences, words in between are spread by spoken length.
Writes out_dir/scene_N.wav, out_dir/narration.json = [{"wav", "dur", "lead", "times": [word start seconds]}]
and out_dir/voice_meta.json (voice, speed, fx; build.py reads it to label the baked page voice).
Setup (once): pip install --break-system-packages kokoro-onnx soundfile
  curl -L -o kokoro.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
  curl -L -o voices.bin  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin"""
import sys, os, re, json, argparse, subprocess, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

DEFAULT_VOICE = 'am_michael:60,am_fenrir:40'
NOIR_FX = ('highpass=f=75,equalizer=f=180:t=q:w=1:g=2.5,equalizer=f=3200:t=q:w=1.2:g=2,'
           'acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=2,aecho=0.85:0.6:38|67:0.12|0.07')

ap = argparse.ArgumentParser()
ap.add_argument('says'); ap.add_argument('out')
ap.add_argument('--voice', default=DEFAULT_VOICE); ap.add_argument('--speed', type=float, default=0.94)
ap.add_argument('--fx', default='noir', choices=['noir', 'clean'])
ap.add_argument('--pron', default=None); ap.add_argument('--models', default='.')
ap.add_argument('--lead', type=float, default=0.35, help='seconds between scene start and first word')
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
says = json.load(open(a.says))
pron = {"A.I.s": "AIs", "A.I.": "AI", "R's": "Rs"}
if a.pron: pron.update(json.load(open(a.pron)))
k = Kokoro(os.path.join(a.models, 'kokoro.onnx'), os.path.join(a.models, 'voices.bin'))

# voice: "name" or "name:weight,name:weight"
spec = []
for part in a.voice.split(','):
    name, _, w = part.strip().partition(':')
    spec.append((name, float(w) if w else 1.0))
known = set(k.get_voices())
bad = [n for n, _ in spec if n not in known]
if bad: sys.exit(f'unknown voice(s) {bad}. Available: {sorted(known)}')
tot_w = sum(w for _, w in spec)
voice = spec[0][0] if len(spec) == 1 else sum(k.get_voice_style(n) * (w / tot_w) for n, w in spec)
lang = 'en-gb' if max(spec, key=lambda s: s[1])[0].startswith('b') else 'en-us'
SR = 24000

def spoken(word):
    for src, dst in pron.items():
        word = word.replace(src, dst)
    return word

def trim(x, thr=0.008):
    idx = np.where(np.abs(x) > thr)[0]
    if not len(idx): return x
    return x[max(0, idx[0] - int(.02 * SR)): idx[-1] + int(.06 * SR)]

def is_abbr(w): return bool(re.match(r'^([A-Za-z]\.)+s?$', w))
def pause_kind(w):
    """2 = sentence end, 1 = clause pause (comma, colon, ellipsis, dash), 0 = none"""
    if is_abbr(w): return 0
    if re.search(r'(\.\.\.|…)["\')]*$', w): return 1
    if re.search(r'[.?!]["\')]*$', w): return 2
    if re.search(r'[,:;—–-]["\')]*$', w): return 1
    return 0

def silences(x, min_len=0.06):
    hop = int(.01 * SR); n = len(x) // hop
    if n < 3: return [], 0.0, len(x) / SR
    rms = np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1))
    thr = max(0.004, 0.06 * np.percentile(rms, 95))
    quiet = rms < thr
    voiced = np.where(~quiet)[0]
    first, last = (voiced[0], voiced[-1]) if len(voiced) else (0, n - 1)
    gaps, i = [], first
    while i <= last:
        if quiet[i]:
            j = i
            while j <= last and quiet[j]: j += 1
            if (j - i) * .01 >= min_len: gaps.append((i * .01, j * .01))
            i = j
        else: i += 1
    return gaps, first * .01, (last + 1) * .01

def word_times(words, x):
    """Start time of every word: punctuation pauses are anchored to real silences, the rest spread by spoken length."""
    wts = [len(re.sub(r'[^\w]', '', spoken(w)) or 'x') + 1.5 for w in words]
    kinds = [pause_kind(w) for w in words]
    gaps, v0, v1 = silences(x)
    # expected end time of each punctuated word, from weights
    tot = sum(wts) + sum(3.5 * (kd > 0) for kd in kinds[:-1]); acc = 0.0; exp = []
    for i, w in enumerate(wts):
        acc += w; exp.append(v0 + (v1 - v0) * acc / tot); acc += 3.5 * (kinds[i] > 0)
    anchors, gi = {}, 0                       # word index -> (gap start, gap end): pause right after that word
    tol = max(0.6, 0.15 * (v1 - v0))
    for i in range(len(words) - 1):
        if not kinds[i]: continue
        best = None
        for g in range(gi, len(gaps)):
            c = (gaps[g][0] + gaps[g][1]) / 2
            if c - exp[i] > tol: break
            if abs(c - exp[i]) <= tol and (best is None or abs(c - exp[i]) < abs((gaps[best][0] + gaps[best][1]) / 2 - exp[i])): best = g
        if best is not None: anchors[i] = gaps[best]; gi = best + 1
    times, seg_start, s0 = [0.0] * len(words), 0, v0
    bounds = sorted(anchors) + [len(words) - 1]
    for b in bounds:
        e = anchors[b][0] if b in anchors else v1
        seg = list(range(seg_start, b + 1))
        sw = [wts[i] + (3.5 if kinds[i] and i != b else 0) for i in seg]; tw = sum(sw) or 1; acc = 0.0
        for i, w in zip(seg, sw):
            times[i] = round(s0 + (e - s0) * acc / tw, 3); acc += w
        if b in anchors: s0 = anchors[b][1]
        seg_start = b + 1
    return times

out = []
for si, text in enumerate(says):
    words = text.split()
    say = ' '.join(spoken(w) for w in words)
    x, sr = k.create(say, voice=voice, speed=a.speed, lang=lang)
    x = trim(np.asarray(x, np.float32))
    times = word_times(words, x)
    fn = os.path.join(a.out, f'scene_{si + 1}.wav')
    if a.fx == 'noir':
        raw = fn + '.raw.wav'; sf.write(raw, x, SR)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', NOIR_FX, '-ar', str(SR), '-ac', '1', fn], check=True)
        os.remove(raw); x = sf.read(fn, dtype='float32')[0]
    else:
        sf.write(fn, x, SR)
    out.append({'wav': fn, 'dur': round(len(x) / SR, 3), 'lead': a.lead, 'times': times})
    print(f'scene {si + 1}: {len(x) / SR:.2f}s, {len(words)} words', flush=True)
json.dump(out, open(os.path.join(a.out, 'narration.json'), 'w'))
json.dump({'voice': a.voice, 'speed': a.speed, 'fx': a.fx}, open(os.path.join(a.out, 'voice_meta.json'), 'w'))
