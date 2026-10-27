---
name: case-file-video
description: "Plan, storyboard and produce a noir case-file explainer video in the newspaper-cutout, stop-motion evidence-board style, sized for the platform it will be posted on, delivered as a storyboard sheet and a playable web page with narration and captions, plus an MP4 export on request."
---

# Case-file explainer video

Turn any knowledge topic into a ~60 s video (vertical 9:16 or horizontal 16:9) that looks like a detective's evidence board come to life: halftone photos snipped out of newsprint, ransom-note word clippings, red stamps, pins and red string, typewriter captions, all moving like hand-animated stop-motion paper, with a noir-jazz score and a narrator.

**You are the director.** This skill gives you an engine, a library of effects and a process. How you use them is your call. Push for the most inventive, memorable video the topic allows, not a re-skin of the example. Plan first, show a storyboard, ask for the media you need, then build and export.

Deliverables:
1. **Plan + storyboard sheet** (an image with every scene's frame, narration, effects and missing assets), shown *before* the full build. Every time.
2. **Playable web page** (the neural narrator baked in, Web Audio score, word-synced captions; no browser voice), checked for smooth motion (Phase 5). Publish it as an artifact when that tool exists. Every time.
3. **MP4 on request** (1080x1920 for 9:16 or 1920x1080 for 16:9, 30 fps, H.264/AAC, −14 LUFS, offline neural voice) **plus an .srt caption file**. The export takes 10–12 minutes, so don't start it on your own: export when the user asked for the MP4 up front, or offer it in one line once they have the page (Phase 6).

The house look. Keep it consistent; be inventive inside it.
- **Stage.** 9:16 (720x1280 design units) or 16:9 (1280x720), chosen per video (`FORMAT`). A dark wooden desk lit by a lamp, light through window blinds, drifting dust, a light film look (grain, flicker, scratches). A cork board in one of three **board shapes** (chosen per video, see Phase 1): `tall` 4:5, `classic` 16:9, or `full` (the whole frame). Above it: a yellow evidence-tape title with a small typed kicker. Below it: word-highlighted captions.
- **Scene motion.** Each scene opens on a clean base paper. Clippings enter **stop-motion** from the nearest board edge at about 12 fps held frames: lifted while moving, pressed flat on landing, then a faint twitch. Stamps slam in three frames with a board jolt. Pins pop, then red string draws pin to pin in steps. Typed strips type on. The camera drifts smoothly. Scenes change with a varied **transition** (dissolve, whip pan, smash cut, iris, sheet drop), and the board grows to full screen for the big moments.
- **Paper.** Photo props are halftone prints with scissor-cut polygon edges and newsprint margins showing bits of article text. Single-word clippings use mixed newspaper type (bold serif, condensed headline, white-on-black) like a ransom note.
- **Type and colour.** Anton (labels, stamps), Special Elite (typed labels), Courier Prime (captions, mono strips), Old Standard TT (newsprint). Red #b3231d, tape yellow #e9b82a.

Bundled files (`SKILL_DIR` = the folder holding this file):
- `scripts/`: `engine.template.html` (engine + worked example "What is a token?"), `render_svgs.js`, `stickers.py`, `build.py`, `check.js`, `storyboard.js`, `narrate.py`, `audition.py`, `motion.js` (motion QA), `export.js`
- `assets/svg/`: reusable props (robot detective, magnifier, scissors, strawberry, coins, stopwatch, filing cabinet, dice); `assets/*.example.json`
- `references/story.md`: **the story playbook**: central question, hook options and tests, clue chain, visual change, close, plus where the rules come from. Read it before writing any narration.
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
mkdir -p tts && curl -sSL -o tts/kokoro.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx \
  && curl -sSL -o tts/voices.bin https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```
Also needed: Node 18+, Python 3.10+, ffmpeg, and Playwright with Chromium (install them only if missing; don't reinstall a preinstalled Playwright).
Use the full-precision `kokoro-v1.0.onnx` (~325 MB) shown above, not the int8 file: the int8 voice is audibly grainier.

## Phase 1. Plan (no engine code yet)
1. **Research the topic.** Search the web for anything factual, current or numeric. Find the *conflict*: the counter-intuitive fact, the famous puzzle, the two points of view that disagree, the "wait, really?" that makes this a case.
2. **Find the story** (follow `references/story.md`):
   - **One central question** the whole video answers, e.g. "What would you actually see falling into a black hole?" Not a topic, and not five facts.
   - **An ABT logline**: "[setup] AND [what we know], BUT [the contradiction], THEREFORE [what we'll find out]." No real BUT means no story yet, so keep researching.
   - **Three hook options**, one each for suspense, surprise and emotion. Keep the one that passes the muted, gap, spine and truth tests.
3. **Write a creative brief** (8 lines): audience; **central question + ABT logline**; **the hook** (the winner, plus the two runners-up so the user can swap); the case framing (who or what is the "suspect", what's the "secret"); tone (playful noir, cold-case serious, pulp…); **narrator voice** (from the menu below, matched to the tone, or the user's own pick); **platform → format and board shape** (step 6); **signature device**, the one visual idea this video will be remembered for (e.g. a flashlight sweeping a dark board, a recap board where every string lights up, a ransom-note title assembling letter by letter).
4. **Scene plan table.** 7 to 9 scenes and 120 to 170 words in total. Columns: `#`, `beat`, `question raised → answered`, `kicker`, `title` (22 characters or fewer), `narration`, `visual change` (a verb), `layout`, `transition`, `effects` (named from `references/effects.md`), `certainty` (see the accuracy pass), `assets needed (+ fallback)`, `sound accents`.
   - **Arc: Hook → Body → Close.**
     1. **Hook (the first second).** Scene 1's first frame is the hero visual plus the hook question as text (`B.question` at `'@0'`). Its first spoken words are the hook (12 words or fewer, done by about 3 s). Use `layout: 'full', head: false, transition: 'smash'`. No intro card, no logo, and no "Case file #00N" first; that framing comes right after, as a stamp at the end of scene 1 or the kicker of scene 2.
     2. **Body: a chain of clues.** Each scene answers part of the question and raises the next. Chain scenes with **but / so / therefore**, never "and then / also / next": the first words of the scenes read in order should sound like a story. Pay off small answers along the way, but hold the big one.
     3. **Proof.** One scene shows the idea solving something: a famous puzzle, an unsolved case, a "that's why…". It is often a full-screen moment.
     4. **Verdict.** Answer the central question in plain words, as a callback to the hook. "Case closed" goes here, but it is not the last beat.
     5. **Payoff (last scene).** A final surprising, true twist ("one last clue"), then **a question that invites comments**, tied to the central question ("Would you jump in?"). Show it big with `B.question` as the last frame, and put the same question on the end card (`TOPIC: one-line verdict`).
   - **Pictures push the story:**
     - In every scene the hero visual *does* the point (splits, fills, freezes, gets crossed out): that's the `visual change` verb.
     - Something new happens on screen every 1–2 seconds, and each scene's first new piece lands within 1.5 s.
     - The hero action lands on the key word of the narration.
   - **Talk like a person.** Address the viewer as "you", use contractions, short sentences and the odd rhetorical question. No "In this video…" or "Let's explore…". Read it aloud.
   - **Variety rules** (it must never feel like a slideshow):
     - At most two scenes in a row with the same composition (title strip + board).
     - Besides the hook, give one or two scenes a **full-screen moment** (`layout: 'full'`): the mystery, the wow moment or the payoff.
     - Vary transitions to match the meaning: whip pan for "next", smash cut for a shock, iris for a focus or reveal, sheet drop for new evidence. Use no transition more than three times.
     - Move the camera too: punch-ins (`B.punch`), the flashlight, stop-motion moves.
   - **Size rules** (most viewers watch on a phone):
     - Each scene has one hero visual, marked with `B.hero(...)`, that covers at least 10% of the frame or spans most of its width. Make it the biggest thing on the board, never a small prop among many.
     - No text smaller than 18 stage units. In practice for 9:16: notes and strips ≥ 23 units on the tall board (it is drawn at 0.82×), chips ≥ 40, labels ≥ 44. Fewer, bigger notes beat many small ones; cut any note the narration doesn't need.
     - `check.js lint` checks both (Phase 5).
   - Creativity rules:
     - Give each scene one *hero effect*, and don't repeat the same hero.
     - Use at least 8 different techniques across the video, with one set-piece "wow" moment (usually the mystery or the verdict).
     - Call back to earlier evidence at the end, e.g. a recap board.
     - Match motion to meaning: chop things that get split, stamp verdicts, string together what's connected, redact secrets.
     - Vary entrances (slide, drop, unfold, flash pop, hand placement…) so the board never feels templated.
   - Label made-up example numbers on screen ("figures are examples").
5. **Accuracy pass.** Simplify without saying anything false. For every claim in the narration, fill the `certainty` column: *established*, *mainstream theory* or *speculative*. Then:
   - **Name the point of view when it changes the answer.** Not "you freeze at the edge" but "to someone watching from far away, you seem to freeze at the edge; you yourself fall straight through."
   - **Frame speculation as speculation.** Use "physicists think…", "one leading idea…", "nobody knows yet…", and mark it on screen (a `THEORY` or `UNCONFIRMED` stamp). The distant future, untested hypotheses and contested numbers are speculative.
   - **No absolutes for open questions.** Prefer "can", "some", "about" to "always", "all", "exactly". Round numbers honestly and say they are rough.
   - Re-check the hook and the payoff twist hardest: they are the most quoted lines.
6. **Platform → format and board shape.** Don't ask the user about formats, ratios or board shapes. Ask one plain question, **"Where will you post it?"**, unless they already said, and derive both settings from the answer (set them in `topic.json`, Phase 2):

   | Platform | `format` | `board` |
   |---|---|---|
   | TikTok, Instagram Reels, YouTube Shorts, Facebook Reels, Stories | `9:16` (1080x1920) | `tall` |
   | YouTube (regular video), a website, slides, a lesson or presentation | `16:9` (1920x1080) | `classic` |
   | Several platforms, or a mix of the above | `9:16` | `tall` (vertical plays everywhere short-form lives) |
   | Not sure / no answer | `9:16` | `tall` |

   Then say the result in one line ("TikTok, so a vertical 1080x1920 video"). Pick `full` as the board shape yourself only when the whole video is one immersive scene; otherwise keep the default and use `layout: 'full'` for the hook, the payoff and one or two big moments. Board units stay the same in both formats (classic 720x405, tall 720x900); only `full` changes (720x1280 vertical, 1280x720 horizontal), so always lay out with `B.W`, `B.H` and `B.safe`.
7. **Self-check** with the checklist at the end of `references/story.md` before you build the storyboard. Send the brief and the plan table together with the storyboard sheet.

### Narrator voice
The voice is chosen per video, like the tone. Pass it as `--voice` to `export.js` (or `narrate.py`). A blend `a:60,b:40` mixes two voices.

| `--voice` | Sound | Good for |
|---|---|---|
| `am_michael:60,am_fenrir:40` **(default)** | gritty American detective | classic noir, most topics |
| `am_michael` | warm, steady American male | calm, clear explainers |
| `am_fenrir` | deeper, rougher American male | cold-case serious, dark history |
| `am_puck` | brighter, lively American male | playful pulp, fast fun topics |
| `bm_george:60,bm_fable:40` | British inspector | Sherlock-style cases, history, science |
| `bm_george` | measured British male | serious, documentary feel |
| `bm_fable` | lighter British storyteller | whimsical, kids' topics |
| `af_heart` | warm female narrator | friendly ELI5, health, everyday life |
| `af_bella` | smooth, sultry female | femme-fatale noir, glamorous mysteries |

- Default speed is `--speed 0.94`. Go to 0.9 for a slower, heavier read and 1.0 for a punchy one.
- `--fx noir` (default) adds a warm "radio narrator" treatment. `--fx clean` gives a dry voice.
- If the user wants to choose by ear, or hasn't heard the voices before, run an audition and send the MP3s:
  `python3 kit/audition.py audition --models tts [--voices "am_puck;af_bella"] [--text "<a line from the script>"]`
- Write narration for the ear. Use commas and `...` where a pause should fall, and keep sentences short. The voice reads each scene in one pass, and its pauses also drive the caption timing.

## Phase 2. Storyboard (show it before the full build)
1. Make props (Phase 4, step 1) for what you can draw yourself. Leave media you need from the user as **`B.placeholder({x,y,w,h,label})`** cards: red dashed "ASSET NEEDED" boxes in their final place.
2. Write the scenes in their own file, `scenes.js`, defining `const SCENES = [...]` (plus any small helpers it uses) with real layout and cues. Fill each scene's `fx: [...]` and `assets: [...]` fields from the plan table. Put the page's settings in `topic.json`: `title`, `series`, `start`, `end` (the comment question), `format`, `board` and, optionally, `look`. Never edit the template by hand: `build.py` splices both in.
3. Render the sheet and send it to the user with the plan table:
```bash
python3 kit/build.py kit/engine.template.html stickers.js page.html --scenes scenes.js --topic topic.json
node kit/storyboard.js page.html node_modules/@fontsource storyboard.png --title "<video title>"
```
   For a brand-new effect, also render one key frame with `node kit/check.js page.html node_modules/@fontsource qa poster '#sceneN'`. Run `node kit/check.js page.html node_modules/@fontsource qa lint` and fix its warnings before showing the sheet.
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
- **Voiceover.** Put one WAV per scene in `exp/voice/` and write `narration.json` (`wav`, `dur`, `lead`, `times`). Spread word start times over each clip's voiced span the way `narrate.py` does (anchor sentence starts to the pauses, spread words by length). Then bake it into the page (`build.py kit/engine.template.html stickers.js page.html --scenes scenes.js --topic topic.json --voice exp/voice`), skip the `--voice-only` render in Phase 5, and export with `--reuse-voice`.
- **Footage.** Keep it short. Extract it to a frame sequence with ffmpeg and draw it on a canvas from `B.onFrame` (export-safe). Don't use a live `<video>` element.

## Phase 4. Build
1. **Props.** Reuse bundled SVGs or hand-draw new ones: grayscale gradients with strong contrast, #1a1a1a outlines, no text, `width`/`height` set, roughly 200 to 400 px. An optional spot colour goes through `tint`. Then:
   `node kit/render_svgs.js svg raw && python3 kit/stickers.py raw stickers.json stickers.js preview`. Look at `preview/` once, and check that each prop reads as what it is and nothing else. Halftone makes accidental faces easy: two dots above a line on a round shape (a planet with craters, a ball, a cookie) reads as a frowning face. Move or drop those details.
2. **Scenes.** Follow `references/engine-api.md`. Built-in helpers:
   - `B.piece`, `B.news`, `B.sticker`, `B.stamp`, `B.pin` + `B.string`, `B.tape`
   - `B.marker` (circle, underline, arrow, cross), `B.highlight`, `B.punch` (camera punch-in)
   - `B.move` (stop-motion move/split), `B.shake` (rattle), `B.flash` (camera flash), `B.flashlight` (dark board + searching beam); `anim: 'spin'` (spinning newspaper), `anim: 'print'` (receipt printing)
   - `B.placeholder`, `B.onFrame`, and function cue items for custom moments
   
   - `B.question` (big ransom-note question for the hook and the payoff; `hot` prints words red, `colors: {index: css}` paints any word, e.g. `{ '-1': '#2f5a9a' }` for a blue last word), `B.hero` (mark the hero visual), `B.fill` (full-board backdrop for full-screen moments); scene options `layout`, `head: false`, `transition`.

   Build new effects from the recipes in `references/effects.md`. The page title, series line, start note, end-card line, `FORMAT`, `BOARD_SHAPE` and the film look (`LOOK = {grain, flicker, scratches, weave}`) all come from `topic.json`.
3. **Export-safety (hard rules):**
   - Animate with CSS classes or `element.animate()`, or per frame via `B.onFrame`/`frameHooks`.
   - Use `later()`, never `setTimeout`.
   - New sounds use `now()` and `sfxBus`.
   - Anything else won't appear in the MP4.
4. **Platform safe zones.** In 9:16, TikTok, Reels and Shorts cover the top ~15% (tabs), the bottom ~25% (account name, description) and the right edge from ~55% down (buttons). The engine keeps the title and captions clear of them. `B.safe` gives the clear area for scene content in board units: put key text between `B.safe.top` and `B.safe.cap` (below the title or the tabs, above the captions), and out of the corner `x > B.safe.x && y > B.safe.y`. In 16:9 only the bottom edge (player bar) is reserved. `check.js lint` flags any covered text, and text that the camera drift will push off the board edge. It skips pieces you deliberately park off the board (flown out, knocked away), and anything inside an element with `data-lint="ignore"`. Keep captions where the engine puts them.

## Phase 5. Voice, then QA for smooth motion
A poster or storyboard shows each scene fully assembled, so it hides most of what makes a video feel rough: empty openings, dead air, things that pop in, leftovers that outlive their reason, labels a punch-in cuts off. Check the motion itself before anyone sees the page.
1. **Render the narration and bake it into the page** (scene timing comes from the voice, so QA needs it first):
```bash
node kit/export.js page.html node_modules/@fontsource exp out/<slug>.mp4 --models tts --pron pron.json --voice-only [--voice <from the menu>] [--speed 0.94] [--fx noir]
python3 kit/build.py kit/engine.template.html stickers.js page.html --scenes scenes.js --topic topic.json --voice exp/voice
```
   Spoken-only pronunciation fixes go in `pron.json`. If you change any narration later, rerun both commands: a scene whose text no longer matches its baked clip plays with captions only.
2. **Static checks.**
   - `node kit/check.js page.html node_modules/@fontsource qa lint`: every scene must pass (text ≥ 18 units, hero big enough, no text under platform UI, the title, the captions or off the board edge, every cue word found in the narration, nothing visible before its cue).
   - `node kit/check.js page.html node_modules/@fontsource qa play`: the run must reach the end card with no `PAGEERR`.
3. **Motion check** (about 2 minutes, on the same frame-accurate clock as the MP4):
```bash
node kit/motion.js page.html node_modules/@fontsource exp qa/motion
```
   Fix every `WARN` it prints:
   - **dead air**: more than 2 s with nothing new on the board. Cue the next piece earlier, split a cue into two beats, add a punch-in or a stop-motion move.
   - **slow open**: a scene's first new piece lands after 1.5 s. Put something meaningful on the board at `'@0'` or on the first spoken word, not only a background sheet.
   - **pops in without motion**: a mid-scene piece with `anim: 'base'` just appears. Give it an entrance (`slide`, `drop`, `wipe`, a flash pop).
4. **Look at every contact sheet** (`qa/motion/scene<N>.png`, a time-stamped frame every 1/6 s) and fix what a script can't judge:
   - **Leftovers.** Anything that should leave with its cause: a light beam whose sun has moved, a label for a piece that is gone, an arrow pointing at nothing. Remove or move it on the same cue.
   - **Collisions.** Pieces that fly or land over the title strip, the captions or each other.
   - **Crop by the camera.** Labels cut off during a punch-in or the drift.
   - **Rhythm.** Something should change every 1–2 s, and the hero action should land on its key word. Read the caption in each frame against what is on the board.
   - **Transitions.** For any scene that still feels rough, render it densely and step through every stop-motion frame: `node kit/motion.js page.html node_modules/@fontsource exp qa/sN --fps 12 --scene N`.
   - **The hook.** In scene 1's sheet, the question and the hero visual must be on screen before 1.0 s.
5. Repeat steps 2–4 until there are no warnings and the sheets look clean, then republish.

## Phase 6. Deliver
1. Publish `page.html` as an artifact (icon `film`), or send the file.
2. **MP4 only on request.** If the user asked for the video file from the start, export now. Otherwise, after they've seen the page, offer it in one line ("Want the MP4 too? It takes about 10 minutes to render."), and export only if they say yes. If they say no, or stop an export, don't bring it up again.
```bash
node kit/export.js page.html node_modules/@fontsource exp out/<slug>.mp4 --models tts --pron pron.json --reuse-voice
```
   It renders about 3.4 frames per second (10–12 min for 70 s), so run it in the background. A quick check of the opening first: `--preview 8`.
3. After an export, verify:
   - `ffprobe` shows 1080x1920 (9:16) or 1920x1080 (16:9), 30 fps, h264 + aac.
   - A 1-fps frame strip of the whole video looks right.
   - `ffmpeg -af ebur128` gives about −14 LUFS.
   - The `.srt` exists.
4. Send the MP4 and the .srt. In one line, say which assets were placeholders or fallbacks and what sending real ones would improve.
