# case-file-video

A Claude skill that turns any knowledge topic into a ~60-second vertical explainer video in a noir **"case file"** style: halftone photos cut out of newsprint, ransom-note word clippings, red stamps, pins and red string on a cork board, all moving like stop-motion paper.

![preview](docs/preview.jpg)

Each run produces:
- **A playable web page**: the same neural narrator as the MP4 baked in, a generated noir-jazz score and paper sound effects, word-synced captions.
- **An MP4**: 1080×1920, 30 fps, with an offline neural voice (Kokoro, picked per video from a menu of narrators), ready for Shorts, Reels or TikTok.

## Install

**Claude Code**: copy the skill folder into your skills directory:
```bash
git clone https://github.com/<you>/<this-repo>.git
mkdir -p ~/.claude/skills && cp -r <this-repo>/case-file-video ~/.claude/skills/
```

**Claude app**: zip the `case-file-video` folder (with `SKILL.md` at the top of the zip folder) and upload it as a custom skill in Claude's settings.

## Use
Ask Claude something like *"Make a case-file video explaining how vaccines work"*. Claude then:
1. **Plans**: researches the topic, writes a creative brief and a scene table, and picks effects from the catalog.
2. **Storyboards**: sends one image with every scene's frame, narration, effects and the assets it still needs.
3. **Asks for media** it can't make itself (real photos, maps, a hand, your voiceover…), each with a fallback.
4. **Builds, checks and exports**: a playable web page plus a 1080x1920 MP4 (−14 LUFS) and an .srt caption file.

Example storyboard sheet: [docs/storyboard-example.jpg](docs/storyboard-example.jpg)

## Requirements (installed by the skill when missing)
Node 18+, Python 3.10+, ffmpeg, Playwright + Chromium, and the Python packages `kokoro-onnx`, `soundfile`, `opencv-python-headless`, `scipy`, `pillow` and `numpy`. The full-precision Kokoro model files (~350 MB) are downloaded from the kokoro-onnx GitHub releases.

## Layout
```
case-file-video/
  SKILL.md                 instructions Claude follows
  scripts/
    engine.template.html   the player engine + worked example ("What is a token?")
    render_svgs.js         SVG props -> PNG
    stickers.py            PNG -> halftone newsprint cutouts (embedded in the page)
    build.py               inlines cutouts (and the baked narration) into the page
    check.js               headless QA (poster frames, playthrough)
    storyboard.js          storyboard sheet: every scene's frame + narration, effects, assets needed
    narrate.py             Kokoro narration (voice blends, noir treatment) + word timings
    audition.py            renders one line in several voices to pick a narrator by ear
    export.js              frame-accurate MP4 export (+ .srt, loudness-normalized)
  references/
    effects.md             effects catalog: built-in vs recipes vs needs-assets
    engine-api.md          scene API, coordinates, export-safety rules
  assets/
    svg/                   reusable props (robot detective, magnifier, scissors, coins, ...)
    stickers.example.json  cutout spec example
    pron.example.json      pronunciation fixes example
```
