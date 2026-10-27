"""Usage: python3 build.py <engine.template.html | page.src.html> <stickers.js> <out.html> [--scenes scenes.js] [--topic topic.json] [--voice <voice_dir>]
Builds the playable page from the engine template.
  --scenes  a JS file that defines `const SCENES = [...]` (plus any helpers it needs). It replaces the worked example's SCENES
            array, so you never edit the template by hand.
  --topic   a JSON file with the page's TOPIC settings, all optional:
            {"title": "The Blue Sky Case",            page <title> (2-4 word name)
             "series": "CASE FILES · SCIENCE EXPLAINED", series / channel line under the board
             "start": "About 60 seconds, with sound.",  note on the start overlay
             "end": "Red sunset or blue? Pick one in the comments.",  one line on the end card (the comment question)
             "format": "9:16", "board": "tall",          FORMAT and BOARD_SHAPE (see SKILL.md, Phase 1: chosen from the platform)
             "look": {"grain": .5, "flicker": .35, "scratches": .5, "weave": .5}}
  --voice   bakes the neural narration (the folder export.js --voice-only wrote) into the page as small MP3s, so the web page
            speaks with the same voice as the MP4 (the browser voice stays available as a fallback in the voice menu).
Inlines the sticker data into the page in every case."""
import sys, os, re, json, base64, subprocess, tempfile
args = sys.argv[1:]
def take(flag):
    if flag in args:
        i = args.index(flag); v = args[i + 1]; del args[i:i + 2]; return v
    return None
voice_dir, scenes_p, topic_p = take('--voice'), take('--scenes'), take('--topic')
src, st, out = args[:3]
s = open(src).read(); assert '/*STICKERS*/' in s

def sub1(pattern, repl, text, what):
    new, n = re.subn(pattern, lambda m: repl(m), text, count=1, flags=re.S)
    if not n: sys.exit(f'build.py: could not find the {what} in {src}')
    return new

if scenes_p:
    sc = open(scenes_p).read()
    if 'const SCENES' not in sc: sys.exit(f'build.py: {scenes_p} must define `const SCENES = [...]`')
    a = s.find('const SCENES = ['); b = s.find('/* ---------- audio')
    if a < 0 or b < 0: sys.exit('build.py: the template has no SCENES array / audio marker')
    s = s[:a] + sc.rstrip() + '\n\n' + s[b:]

if topic_p:
    t = json.load(open(topic_p)); esc = lambda x: x.replace('&', '&amp;').replace('<', '&lt;')
    if 'title' in t: s = sub1(r'<title>.*?</title>', lambda m: f'<title>{esc(t["title"])}</title>', s, 'page title')
    if 'series' in t: s = sub1(r'<div class="handle">.*?</div>', lambda m: f'<div class="handle">{esc(t["series"])}</div>', s, 'series line')
    if 'start' in t:
        old = re.search(r'<p id="startNote">(.*?)</p>', s, re.S)
        if not old: sys.exit('build.py: could not find the start note')
        o = old.group(1)
        s = s.replace(f'<p id="startNote">{o}</p>', f'<p id="startNote">{esc(t["start"])}</p>', 1)
        js_s = t['start'].replace('\\', '\\\\').replace("'", "\\'")
        s = s.replace(f"'{o}'", f"'{js_s}'")   # the same sentence the engine shows again once the voice is baked
    if 'end' in t: s = sub1(r'(id="replayBtn"[^>]*>.*?</button>\s*(?:<!--.*?-->\s*)?<p>).*?(</p>)', lambda m: m.group(1) + esc(t['end']) + m.group(2), s, 'end-card line')
    if 'format' in t:
        if t['format'] not in ('9:16', '16:9'): sys.exit('build.py: format must be "9:16" or "16:9"')
        s = sub1(r"const FORMAT = '[^']*';", lambda m: f"const FORMAT = '{t['format']}';", s, 'FORMAT')
    if 'board' in t:
        if t['board'] not in ('tall', 'classic', 'full'): sys.exit('build.py: board must be "tall", "classic" or "full"')
        s = sub1(r"const BOARD_SHAPE = '[^']*';", lambda m: f"const BOARD_SHAPE = '{t['board']}';", s, 'BOARD_SHAPE')
    if 'look' in t:
        look = {'grain': .5, 'flicker': .35, 'scratches': .5, 'weave': .5, **t['look']}
        s = sub1(r'const LOOK = \{[^}]*\};', lambda m: 'const LOOK = { ' + ', '.join(f'{k}: {v}' for k, v in look.items()) + ' };', s, 'LOOK')

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
