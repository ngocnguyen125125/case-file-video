"""Render the narration with Kokoro (offline neural TTS) and compute per-word start times for the engine's cues.
Usage: python3 narrate.py <says.json> <out_dir> [--voice am_michael] [--speed 0.95] [--pron pron.json] [--models <dir with kokoro.onnx + voices.bin>]
  says.json : ["scene 1 narration", "scene 2 narration", ...]   (export.js writes it from the page's SCENES)
  pron.json : {"A.I.": "AI", "believ...": "beleev..."}  spoken-only replacements; captions keep the original words
Writes out_dir/scene_N.wav and out_dir/narration.json = [{"wav", "dur", "lead", "times": [word start seconds]}]
Setup (once): pip install --break-system-packages kokoro-onnx soundfile
  curl -L -o kokoro.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx
  curl -L -o voices.bin  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin"""
import sys, os, re, json, argparse, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

ap = argparse.ArgumentParser()
ap.add_argument('says'); ap.add_argument('out')
ap.add_argument('--voice', default='am_michael'); ap.add_argument('--speed', type=float, default=0.95)
ap.add_argument('--pron', default=None); ap.add_argument('--models', default='.')
ap.add_argument('--lead', type=float, default=0.35, help='seconds between scene start and first word')
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
says = json.load(open(a.says))
pron = {"A.I.s": "AIs", "A.I.": "AI", "R's": "Rs"}
if a.pron: pron.update(json.load(open(a.pron)))
k = Kokoro(os.path.join(a.models, 'kokoro.onnx'), os.path.join(a.models, 'voices.bin'))
lang = 'en-gb' if a.voice.startswith('b') else 'en-us'
GAP = 0.22  # pause between sentences

def spoken(word):
    for src, dst in pron.items():
        word = word.replace(src, dst)
    return word

def trim(x, sr, thr=0.008):
    idx = np.where(np.abs(x) > thr)[0]
    if not len(idx): return x
    return x[max(0, idx[0] - int(.02 * sr)): idx[-1] + int(.06 * sr)]

out = []
for si, text in enumerate(says):
    words = text.split()
    # sentences = runs of words ending in . ? !
    sents, cur = [], []
    for i, w in enumerate(words):
        cur.append(i)
        if re.search(r'[.?!]["\')]*$', w) and not w.endswith('...') and not re.match(r'^([A-Za-z]\.)+s?$', w): sents.append(cur); cur = []
    if cur: sents.append(cur)
    audio, times, t, sr = [], [0.0] * len(words), 0.0, 24000
    for sent in sents:
        say = ' '.join(spoken(words[i]) for i in sent)
        x, sr = k.create(say, voice=a.voice, speed=a.speed, lang=lang)
        x = trim(np.asarray(x, np.float32), sr); d = len(x) / sr
        # word starts: share the sentence duration by spoken length, with extra weight for pauses after punctuation
        wts = []
        for i in sent:
            w = re.sub(r'[^\w]', '', spoken(words[i])) or 'x'
            wts.append(len(w) + 1.5)
        pause = [3.5 if re.search(r'(\.\.\.|[,:;])$', words[i]) else 0 for i in sent]
        tot = sum(wts) + sum(pause[:-1]); acc = 0.0
        for j, i in enumerate(sent):
            times[i] = round(t + d * acc / tot, 3); acc += wts[j] + (pause[j] if j < len(sent) - 1 else 0)
        audio.append(x); audio.append(np.zeros(int(GAP * sr), np.float32)); t += d + GAP
    y = np.concatenate(audio[:-1]) if audio else np.zeros(1, np.float32)
    fn = os.path.join(a.out, f'scene_{si + 1}.wav'); sf.write(fn, y, sr)
    out.append({'wav': fn, 'dur': round(len(y) / sr, 3), 'lead': a.lead, 'times': times})
    print(f'scene {si + 1}: {len(y) / sr:.2f}s, {len(words)} words', flush=True)
json.dump(out, open(os.path.join(a.out, 'narration.json'), 'w'))
