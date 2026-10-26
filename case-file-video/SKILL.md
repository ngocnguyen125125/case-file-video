---
name: case-file-video
description: "Plan, storyboard and produce a vertical noir case-file explainer video in the newspaper-cutout, stop-motion evidence-board style, delivered as a storyboard sheet, a playable web page and an exported 1080x1920 MP4 with narration and captions."
---

# Case-file explainer video

Turn any knowledge topic into a ~60 s vertical video that looks like a detective's evidence board come to life: halftone photos snipped out of newsprint, ransom-note word clippings, red stamps, pins and red string, typewriter captions, all moving like hand-animated stop-motion paper, with a noir-jazz score and a narrator.

**You are the director.** This skill gives you an engine, a library of effects and a process. How you use them is your call. Push for the most inventive, memorable video the topic allows, not a re-skin of the example. Plan first, show a storyboard, ask for the media you need, then build and export.

Deliverables, every time:
1. **Plan + storyboard sheet** (an image with every scene's frame, narration, effects and missing assets), shown *before* the full build.
2. **Playable web page** (browser voice, Web Audio score, word-synced captions). Publish it as an artifact when that tool exists.
3. **MP4** (1080x1920, 30 fps, H.264/AAC, −14 LUFS, offline neural voice) **plus an .srt caption file**. Never skip the export.

The house look. Keep it consistent; be inventive inside it.
- **Stage.** 9:16 (720x1280 design units). A dark wooden desk lit by a lamp, light through window blinds, drifting dust, a light film look (grain, flicker, scratches). A 16:9 cork board sits in the middle (720x405 units). Above it: a yellow evidence-tape title with a small typed kicker. Below it: word-highlighted captions.
- **Scene motion.** Each scene opens on a clean base paper. Clippings enter **stop-motion** from the nearest board edge at about 12 fps held frames: lifted while moving, pressed flat on landing, then a faint twitch. Stamps slam in three frames with a board jolt. Pins pop, then red string draws pin to pin in steps. Typed strips type on. The camera drifts smoothly, and between scenes the old board blurs and dissolves into the new one.
- **Paper.** Photo props are halftone prints with scissor-cut polygon edges and newsprint margins showing bits of article text. Single-word clippings use mixed newspaper type (bold serif, condensed headline, white-on-black) like a ransom note.
- **Type and colour.** Anton (labels, stamps), Special Elite (typed labels), Courier Prime (captions, mono strips), Old Standard TT (newsprint). Red #b3231d, tape yellow #e9b82a.

Bundled files (`SKILL_DIR` = the folder holding this file):
- `scripts/`: `engine.template.html` (engine + worked example "What is a token?"), `render_svgs.js`, `stickers.py`, `build.py`, `check.js`, `storyboard.js`, `narrate.py`, `export.js`
- `assets/svg/`: reusable props (robot detective, magnifier, scissors, strawberry, coins, stopwatch, filing cabinet, dice); `assets/*.example.json`
- `references/effects.md`: **the effects catalog**, with what is built in and recipes for everything else. Read it while planning.
- `references/engine-api.md`: scene-building API, layout coordinates, export-safety rules. Read it before building.

---

## Phase 0. Setup (once per session)
If `SKILL_DIR/scripts` doesn't exist (the skill was installed without its files), get them from GitHub first:
`git clone --depth 1 https://github.com/ngocnguyen125125/case-file-video cfv-skill` and use `cfv-skill/case-file-video` as `SKILL_DIR`. If the repo is private, attach it with the session's GitHub tools first.
```bash
mkdir -p work && cd work
cp -r "$SKILL_DIR/scripts" kit && cp -r "$SKILL_DIR/assets/svg" svg && cp "$SKILL_DIR"/assets/*.json .
npm init -y >/dev/null && npm i @fontsource/anton @fontsource/special-elite @fontsource/courier-prime @fontsource/old-standard-tt
pip install --break-system-packages -q kokoro-onnx soundfile opencv-python-headless scipy pillow numpy
mkdir -p tts && curl -sSL -o tts/kokoro.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx \
  && curl -sSL -o tts/voices.bin https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```
Also needed: Node 18+, Python 3.10+, ffmpeg, and Playwright with Chromium (install them only if missing; don't reinstall a preinstalled Playwright).

## Phase 1. Plan (no engine code yet)
1. **Research the topic.** Search the web for anything factual, current or numeric. Find the *mystery*: the counter-intuitive fact, famous puzzle or "wait, really?" that makes this a case.
2. **Write a creative brief** (5 lines): audience; the case framing (who or what is the "suspect", what's the "secret"); tone (playful noir, cold-case serious, pulp…); length; **signature device**, the one visual idea this video will be remembered for (e.g. a flashlight sweeping a dark board, a recap board where every string lights up, a ransom-note title assembling letter by letter).
3. **Scene plan table.** 7 to 9 scenes and 120 to 170 words in total. Columns: `#`, `kicker`, `title` (22 characters or fewer), `narration`, `visual idea`, `effects` (named from `references/effects.md`), `assets needed (+ fallback)`, `sound accents`.
   - Arc: **Case file #00N** hook → **Evidence A, B, C…** (one mechanism each) → **an unsolved case / mystery** the idea explains → **the verdict**, ending "Case closed." ELI5 wording, short sentences, concrete examples.
   - Creativity rules:
     - Give each scene one *hero effect*, and don't repeat the same hero.
     - Use at least 8 different techniques across the video, with one set-piece "wow" moment (usually the mystery or the verdict).
     - Call back to earlier evidence at the end, e.g. a recap board.
     - Match motion to meaning: chop things that get split, stamp verdicts, string together what's connected, redact secrets.
     - Vary entrances (slide, drop, unfold, flash pop, hand placement…) so the board never feels templated.
   - Label made-up example numbers on screen ("figures are examples").

## Phase 2. Storyboard (show it before the full build)
1. Make props (Phase 4, step 1) for what you can draw yourself. Leave media you need from the user as **`B.placeholder({x,y,w,h,label})`** cards: red dashed "ASSET NEEDED" boxes in their final place.
2. Write the `SCENES` array with real layout and cues. Fill each scene's `fx: [...]` and `assets: [...]` fields from the plan table.
3. Render the sheet and send it to the user with the plan table:
```bash
python3 kit/build.py page.src.html stickers.js page.html
node kit/storyboard.js page.html node_modules/@fontsource storyboard.png --title "<video title>"
```
   For a brand-new effect, also render one key frame with `node kit/check.js page.html node_modules/@fontsource qa poster '#sceneN'`.
4. **Gate:** if the user is around, wait for their go-ahead or edits. If they're away, continue with the fallbacks and say which ones you used.

## Phase 3. Ask for the media you need
When an effect needs something you can't make convincingly, **ask the user to send it**. Typical cases:
- photos of real people, places, events or products
- archival footage
- a specific map
- a logo
- a photo of a hand (for hand-placement shots)
- the user's own voiceover
- a licensed music track
- real paper or cork scans

Send one numbered request list. For each item, give:
- **what** it is
- **where** it goes (scene number + effect)
- **specs**: JPG/PNG, at least 1000 px on the long side, transparent background welcome; voice as WAV/M4A, one file per scene or one file with clear pauses
- **the fallback** you'll use if it doesn't come

Then process what arrives:
- **Photos.** Cut the subject out: try `pip install rembg[cli]` then `rembg i in.jpg out.png`. If that fails, ask for a transparent PNG or crop to a rectangle with a scissor-cut edge. Save as `raw/<name>_raw.png`, add a spec entry, and run `stickers.py`.
- **Voiceover.** Put one WAV per scene in the voice folder and write `narration.json` (`wav`, `dur`, `lead`, `times`). Spread word start times over each clip's voiced span with the same weighting `narrate.py` uses, then export with `--reuse-voice`.
- **Footage.** Keep it short. Extract it to a frame sequence with ffmpeg and draw it on a canvas from `B.onFrame` (export-safe). Don't use a live `<video>` element.

## Phase 4. Build
1. **Props.** Reuse bundled SVGs or hand-draw new ones: grayscale gradients with strong contrast, #1a1a1a outlines, no text, `width`/`height` set, roughly 200 to 400 px. An optional spot colour goes through `tint`. Then:
   `node kit/render_svgs.js svg raw && python3 kit/stickers.py raw stickers.json stickers.js preview`. Look at `preview/` once.
2. **Scenes.** Follow `references/engine-api.md`. Built-in helpers:
   - `B.piece`, `B.news`, `B.sticker`, `B.stamp`, `B.pin` + `B.string`, `B.tape`
   - `B.marker` (circle, underline, arrow, cross), `B.highlight`, `B.punch` (camera punch-in)
   - `B.placeholder`, `B.onFrame`, and function cue items for custom moments
   
   Build new effects from the recipes in `references/effects.md`. Tune the film look with `LOOK = {grain, flicker, scratches, weave}`. Edit the `TOPIC:` markers (page title, series line, start note, end-card line).
3. **Export-safety (hard rules):**
   - Animate with CSS classes or `element.animate()`, or per frame via `B.onFrame`/`frameHooks`.
   - Use `later()`, never `setTimeout`.
   - New sounds use `now()` and `sfxBus`.
   - Anything else won't appear in the MP4.
4. **Platform safe zones.** Keep key text out of the board's lower-right corner (x > 620 and y > 260 in board units), where TikTok/Reels buttons sit. Keep captions where the engine puts them.

## Phase 5. QA
- `node kit/check.js page.html node_modules/@fontsource qa poster '#sceneN'` for every scene. Fix overlaps, clipped text, pins on letters and anything in the safe zone.
- `node kit/check.js page.html node_modules/@fontsource qa play`: the run must reach the end card with no `PAGEERR`.
- Export a 6–10 s preview (`--preview 8`) and inspect a frame strip around every hero effect (`ffmpeg -ss … -vf "fps=6,scale=360:-1,tile=6x3"`).

## Phase 6. Deliver
1. Publish `page.html` as an artifact (icon `film`), or send the file.
2. Export the full MP4 in the background (about 3.4 rendered frames per second, so 10–12 min for 70 s):
```bash
node kit/export.js page.html node_modules/@fontsource exp out/<slug>.mp4 --models tts --pron pron.json [--voice am_michael] [--reuse-voice]
```
   Voices: `am_michael` (default), `am_fenrir`, `bm_george`, `af_heart`. Spoken-only pronunciation fixes go in `pron.json`.
3. Verify:
   - `ffprobe` shows 1080x1920, 30 fps, h264 + aac.
   - A 1-fps frame strip of the whole video looks right.
   - `ffmpeg -af ebur128` gives about −14 LUFS.
   - The `.srt` exists.
4. Send the MP4 and the .srt. In one line, say which assets were placeholders or fallbacks and what sending real ones would improve.
