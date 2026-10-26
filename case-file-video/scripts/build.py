"""Usage: python3 build.py <engine_src.html> <stickers.js> <out.html> [--voice <voice_dir>]
Inlines the sticker data into the page. With --voice (the folder narrate.py / export.js --voice-only wrote), it also bakes
the neural narration into the page as small MP3s, so the web page speaks with the same voice as the MP4 instead of the
browser's built-in voice (the browser voice stays available as a fallback in the voice menu)."""
import sys, os, json, base64, subprocess, tempfile
args = sys.argv[1:]
voice_dir = None
if '--voice' in args:
    i = args.index('--voice'); voice_dir = args[i + 1]; del args[i:i + 2]
src, st, out = args[:3]
s = open(src).read(); assert '/*STICKERS*/' in s
js = open(st).read()
if voice_dir:
    nar = json.load(open(os.path.join(voice_dir, 'narration.json')))
    meta_p = os.path.join(voice_dir, 'voice_meta.json')
    meta = json.load(open(meta_p)) if os.path.exists(meta_p) else {}
    says_p = os.path.join(voice_dir, '..', 'says.json')
    says = json.load(open(says_p)) if os.path.exists(says_p) else [None] * len(nar)
    scenes = []
    with tempfile.TemporaryDirectory() as td:
        for n, say in zip(nar, says):
            wav = n['wav'] if os.path.exists(n['wav']) else os.path.join(voice_dir, os.path.basename(n['wav']))
            mp3 = os.path.join(td, 'v.mp3')
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', '44100', '-b:a', '80k', mp3], check=True)
            scenes.append({'src': base64.b64encode(open(mp3, 'rb').read()).decode(), 'dur': n['dur'], 'lead': n['lead'], 'times': n['times'], 'say': say})
    label = meta.get('voice', 'neural voice')
    js += '\nwindow.__VOICE__ = ' + json.dumps({'label': label, 'scenes': scenes}, separators=(',', ':')) + ';\n'
    print(f'baked {len(scenes)} narration clips ({sum(len(x["src"]) for x in scenes) * 3 // 4 // 1024} KB), voice {label}')
open(out, 'w').write(s.replace('/*STICKERS*/', js)); print('wrote', out)
