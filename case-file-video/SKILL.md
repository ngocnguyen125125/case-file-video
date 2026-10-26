---
name: case-file-video
description: "Make a vertical noir case-file explainer video in the newspaper-cutout, stop-motion evidence-board style, delivered as a playable web page plus an exported 1080x1920 MP4 with narration."
---

# Case-file explainer video (newspaper-cutout · stop-motion · evidence board)

Use this when the user wants a knowledge topic explained as a short vertical video in the "declassified dossier / evidence board" collage style: halftone photo cutouts snipped from newsprint, ransom-note word clippings, red stamps, pins and red string, typewriter captions. Deliver two things every time:
1. a **playable web page** (browser speechSynthesis narration, Web Audio noir-jazz score + SFX, word-synced captions), and
2. an **MP4 export** (1080x1920, 30 fps, H.264/AAC, offline neural voice). The user always wants the video file, so never skip the export.

Everything needed is bundled in this skill folder: `scripts/` (engine + tools) and `assets/` (prop SVGs, example configs). Below, `SKILL_DIR` means the folder that contains this file.

## The look (keep it consistent)
- 9:16 stage (720x1280 design units). Dark wooden desk lit by a lamp, light through window blinds, drifting dust. A 16:9 cork board sits in the middle (720x405 units). The scene title is a yellow evidence-tape label above the board, with a small typed kicker label above that. Word-highlighted captions sit below the board.
- Each scene opens on a clean base paper (instant, no animation). Clippings then enter **stop-motion** from the nearest board edge: about 12 fps held frames, lifted while moving, pressed flat on landing, then a faint per-frame twitch. Stamps slam down in three frames with a board jolt. Pins pop in, then red string draws from pin to pin in steps. Typed strips type on. The camera drifts and zooms smoothly the whole time. Between scenes, the old board blurs and dissolves into the new one.
- Photo props are halftone prints with scissor-cut polygon edges and newsprint margins showing bits of article text. Single-word clippings get mixed newspaper type (bold serif, condensed headline, white-on-black) like a ransom note.
- Fonts: Anton (labels, stamps), Special Elite (typed labels), Courier Prime (captions, mono strips), Old Standard TT (newsprint). Red #b3231d, tape yellow #e9b82a.

## Step 0. Setup (once per session, in a work folder)
```bash
cp -r "$SKILL_DIR/scripts" kit && cp -r "$SKILL_DIR/assets/svg" svg && cp "$SKILL_DIR"/assets/*.json .
npm init -y >/dev/null && npm i @fontsource/anton @fontsource/special-elite @fontsource/courier-prime @fontsource/old-standard-tt
pip install --break-system-packages -q kokoro-onnx soundfile opencv-python-headless scipy pillow numpy
mkdir -p tts && curl -sSL -o tts/kokoro.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx \
  && curl -sSL -o tts/voices.bin https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```
Also needed: Node 18+, Python 3.10+, ffmpeg, and Playwright with Chromium (`npm i playwright && npx playwright install chromium` if it isn't already installed).

## Step 1. Script (do this first; it drives everything)
- 7 to 9 scenes, 120 to 170 words in total (about 55 to 75 s). Each scene has one idea and 12 to 25 words of narration.
- Arc: **Case file #00N** hook (the "suspect" and its secret) → **Evidence A, B, C…** (one mechanism per scene) → an **Unsolved case / mystery** the idea explains → **The verdict** that ends "Case closed." ELI5 wording, short sentences, concrete examples.
- Each scene object has `kicker` (e.g. `EVIDENCE B · BIG WORDS`), `title` (22 characters or fewer, shown in caps), and `say` (the narration, also the captions).
- Facts must be right. Search the web for anything current or numeric. Label made-up example numbers on the board (e.g. a strip saying "ID numbers are examples").
- Write `A.I.` and similar as you want them captioned. Pronunciation fixes go in `pron.json` (spoken only; see `pron.example.json`).

## Step 2. Props (photo cutouts)
- Reuse the bundled SVGs where they fit (robot detective, magnifier, scissors, strawberry, coins, stopwatch, filing cabinet, dice). For new props, hand-draw SVGs: grayscale gradients with strong light/dark contrast, #1a1a1a outlines, no text, `width`/`height` attributes set, roughly 200 to 400 px. A single spot colour is allowed through `tint` in the spec (e.g. a red strawberry).
- User-supplied photos are the biggest upgrade: save each as `raw/<name>_raw.png` with a transparent background (cut it out first) and give it a spec entry.
- Render and halftone:
```bash
node kit/render_svgs.js svg raw        # svg/*.svg -> raw/<name>_raw.png
python3 kit/stickers.py raw stickers.json stickers.js preview   # spec like stickers.example.json; h is about 2x on-board height
```
Look at `preview/*.png` once before building.

## Step 3. Scenes (engine contract)
Copy `kit/engine.template.html` to `page.src.html`. Edit the `TOPIC:` markers (title, series line, start note, end-card verdict) and **replace the whole `SCENES` array**. The "What is a token?" scenes in the template are the worked example, so copy their patterns. Each scene's `build(B)` uses board coordinates (720x405):
- `B.piece({x,y,w,h,rot,cls,html,style,z,anim,sfx,tornJ})`: `cls` is `paper`/`manila` (base sheets: an area of 90,000 or more is placed instantly), `news` (use `B.news(x,y,w,h,rot)`), `card` (lined index card), `chip` (word clipping; single words get ransom-note type automatically), `strip` (typed label; use `anim:'wipe', sfx:'type'`), or `yellow` (tape headline). Pieces enter stop-motion from the nearest edge by default.
- `B.sticker(name,x,y,h,rot,z)` places a photo cutout. `B.stamp(text,x,y,size,rot,{round:px})` adds a red stamp (one or two per scene). `B.pin(x,y,brass)` adds a pin, and `B.string(pinA,pinB,sag)` the red string between two pins. `B.tape(x,y,rot,w)` adds tape. `B.el(html,'fade'|'wipe'|'hop','none')` is for custom bits (censor bars, cut lines, a chip that hops into a blank via `--dx/--dy`).
- `B.cue(key, [items], {stagger})` sets timing: `key` is an exact narration word (punctuation ignored, case-insensitive; append `*` to match a prefix) or `'@0'` for the scene start (base paper, news, tape). Cues must follow narration order, and each key matches the first occurrence after the previous cue.
- Layout rules: keep everything inside the board. Use at most about 14 animated items per scene. Leave the top-left corner of a chip clear for its pin. Yellow labels shouldn't cover chips. Put the scene's payoff (yellow label + stamp) on the last cue.
- If you edit engine internals, use `later(fn, ms)`, never raw `setTimeout`; SFX must use `now()`; any new CSS or Web Animations are picked up by export automatically.

## Step 4. Build and QA
```bash
python3 kit/build.py page.src.html stickers.js page.html
node kit/check.js page.html node_modules/@fontsource qa poster '#scene3'   # one fully assembled scene -> qa/poster.png
node kit/check.js page.html node_modules/@fontsource qa play                # frames through the whole run (captions-only timing)
```
Render a poster for every scene and fix overlaps, clipped text or pins on letters. A syntax error shows as `PAGEERR`. A headless browser has no voices; that's expected.

## Step 5. Share the playable page
`page.html` is a single self-contained page (only Google Fonts load from the network). Publish it wherever the user wants, e.g. as a Claude artifact (icon `film`). It plays with the viewer's browser voice (picker and speed controls included), and the Web Audio score ducks under speech.

## Step 6. Export the MP4 (always)
```bash
node kit/export.js page.html node_modules/@fontsource exp exp/preview.mp4 --models tts --pron pron.json --preview 6     # quick check
node kit/export.js page.html node_modules/@fontsource exp out/<slug>.mp4 --models tts --pron pron.json --reuse-voice   # full render
```
- It renders Kokoro narration per scene with word timings (default voice `am_michael` at speed 0.95; also good: `am_fenrir`, `bm_george`, `af_heart`). It steps the page's virtual clock frame by frame, so every stop-motion frame is exact, renders music and SFX offline from the page's event log, and mixes the narration in at the exact cue times.
- Speed is about 3.4 rendered frames per second, so a 70 s video takes about 10 to 12 minutes. Run the full render in the background, then verify:
  `ffprobe` (1080x1920, 30 fps, h264 + aac), a 1-fps frame strip of the whole video, and `ffmpeg -af volumedetect` (peak at or below 0 dB). Fix and re-render if anything is off.
- Give the user the MP4. Mention that the voice can be swapped (`--voice`) and that mispronunciations go in `pron.json`.

## Media that makes it more realistic (offer once, briefly)
Black-and-white or AI-generated photos per scene ("1940s black and white press photograph of [subject], high contrast, film grain, plain background"), real paper and cork scans, the user's own voiceover (drop it in as the scene wavs), a licensed noir music track, and a channel name for the series line and end card.
