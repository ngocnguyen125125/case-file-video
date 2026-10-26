"""Voice audition: render the same short line in several narrator voices so the user can pick by ear.
Usage: python3 audition.py <out_dir> [--text "Case file zero zero seven..."] [--voices "am_fenrir;bm_george:60,bm_fable:40"]
                           [--speed 0.94] [--fx noir|clean] [--models <dir with kokoro.onnx + voices.bin>]
Without --voices it renders the menu from SKILL.md. Writes one level-matched MP3 per voice, numbered, named after the voice."""
import os, re, argparse, subprocess, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

MENU = ['am_michael:60,am_fenrir:40', 'am_michael', 'am_fenrir', 'am_puck', 'bm_george:60,bm_fable:40',
        'bm_george', 'bm_fable', 'af_heart', 'af_bella']
NOIR_FX = ('highpass=f=75,equalizer=f=180:t=q:w=1:g=2.5,equalizer=f=3200:t=q:w=1.2:g=2,'
           'acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=2,aecho=0.85:0.6:38|67:0.12|0.07,')
ap = argparse.ArgumentParser()
ap.add_argument('out')
ap.add_argument('--text', default="Case file zero zero seven. The suspect reads a million words a day... but it has never seen "
                                  "a single letter. Not one. So what is it really looking at? Case closed.")
ap.add_argument('--voices', default=';'.join(MENU), help='voices separated by ";" (each may be a blend a:60,b:40)')
ap.add_argument('--speed', type=float, default=0.94); ap.add_argument('--fx', default='noir', choices=['noir', 'clean'])
ap.add_argument('--models', default='.')
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
k = Kokoro(os.path.join(a.models, 'kokoro.onnx'), os.path.join(a.models, 'voices.bin'))
for n, v in enumerate([x.strip() for x in a.voices.split(';') if x.strip()], 1):
    spec = [(p.partition(':')[0], float(p.partition(':')[2] or 1)) for p in v.split(',')]
    tot = sum(w for _, w in spec)
    style = spec[0][0] if len(spec) == 1 else sum(k.get_voice_style(nm) * (w / tot) for nm, w in spec)
    lang = 'en-gb' if max(spec, key=lambda s: s[1])[0].startswith('b') else 'en-us'
    x, sr = k.create(a.text, voice=style, speed=a.speed, lang=lang)
    wav = os.path.join(a.out, 'tmp.wav'); sf.write(wav, np.asarray(x, np.float32), sr)
    name = f'{n:02d}_' + re.sub(r'[^\w]+', '-', v).strip('-') + '.mp3'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-af', (NOIR_FX if a.fx == 'noir' else '') + 'loudnorm=I=-16:TP=-1.5',
                    '-ar', '44100', '-b:a', '160k', os.path.join(a.out, name)], check=True)
    os.remove(wav); print(name, flush=True)
