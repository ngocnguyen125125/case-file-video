# Engine API (scripts/engine.template.html)

## Coordinates and layers
- The stage is 720x1280 units (exported at 1.5x = 1080x1920). Scene code works in **board units**, origin at the board's top-left; `B.W` x `B.H` gives the size:

| Shape (`BOARD_SHAPE` or scene `layout`) | Board units | Where it sits on the stage | Title / captions |
|---|---|---|---|
| `tall` (4:5, default for new videos) | 720 x 900 | x 42, y 170, scaled to 0.883 (636 x 795) | title y 46, captions y 986 |
| `classic` (16:9) | 720 x 405 | x 0, y 437 | title y 268, captions y 880 |
| `full` (whole frame) | 720 x 1280 | the whole stage | title floats at y 70, captions float at y 952 |

- `B.safe` = keep-clear zones in board units: `{x, y}` = platform-button corner (keep key text out of `x > safe.x && y > safe.y`), `cap` = where captions start (full layout), `top` = where the title ends.
- Above the board: kicker + yellow title (`kicker`, `title`; hide it per scene with `head: false`). Below it: karaoke captions from `say`. Bottom: series line (no progress bar).
- When consecutive scenes use different shapes, the board animates into the new shape during the transition.
- Inside a scene: `layer > .zoom (punch-ins) > .cam (Ken Burns drift) > pieces`. z-index guide: base papers 1, props 20–35, yellow labels 40, tape 60, highlights 65, stamps 70, strings 78, pins 80, markers 85.
- Platform safe zone: keep key text out of `x > B.safe.x, y > B.safe.y` (TikTok/Reels buttons). Classic: x > 620, y > 260. Tall: x > 654, y > 597. Full: x > 620, y > 697.
- Phone legibility (checked by `check.js lint`): no text under 18 stage px (≈ 21 units on the tall board), and a hero visual marked with `B.hero` that covers ≥ 10% of the frame or spans ≥ 75% of its width.

## A scene
```js
{ kicker: 'EVIDENCE B · BIG WORDS', title: '1 word → 3 tokens',
  layout: 'full',            // optional: this scene's board shape ('tall' | 'classic' | 'full'); default BOARD_SHAPE
  head: false,               // optional: hide the kicker/title strip (hooks, full-screen moments, payoff)
  transition: 'whip',        // optional: how this scene arrives: 'dissolve' (default) | 'whip' | 'smash' | 'iris' | 'drop'
  fx: ['index card', 'cut lines', 'chips land on each syllable'],   // storyboard only
  assets: ['photo of the inventor (user) — fallback: drawn portrait'], // storyboard only
  say: "Common words, like 'the' or 'cat', are usually one token. …",
  build(B) { /* create pieces, then cues */ } }
```

## Builder `B`
| Call | Purpose |
|---|---|
| `B.piece({x,y,w,h,rot,cls,html,style,z,anim,sfx,tornJ,shadow})` | Any paper piece. `cls`: `paper`, `manila` (base sheets; area ≥ 90,000 appears instantly), `card`, `chip`, `strip`, `yellow`, `news`, `ph`. `anim`: `slide` (default stop-motion), `wipe`, `drop`, `fade`, `hop`, `spin` (spinning newspaper), `print` (receipt prints top-down), `base` (instant). `tornJ` = edge roughness (0 = none). |
| `B.news(x,y,w,h,rot)` | Newspaper clipping with a generated headline + columns |
| `B.sticker(name,x,y,h,rot,z)` | Photo cutout from `stickers.js` |
| `B.stamp(text,x,y,size,rot,{round:px, style})` | Red rubber stamp (slams + jolt) |
| `B.pin(x,y,brass)` → pin; `B.string(pinA,pinB,sag)` | Pins and red string |
| `B.tape(x,y,rot,w)` | Masking tape |
| `B.marker(kind, params, {color,width})` | Red marker draw-on: `circle {cx,cy,rx,ry}`, `underline {x1,x2,y}`, `arrow {x1,y1,x2,y2}`, `cross {x,y,w,h}`, `path {d}` |
| `B.highlight(x,y,w,h,rot)` | Yellow highlighter swipe |
| `B.punch(x,y,scale,hold)` | Returns a cue item that punches the camera in on a point |
| `B.move(el, dx, dy, {frames, rot, delay, sound})` | Cue item: stop-motion move of an already placed piece (split apart, regroup, slide aside) |
| `B.shake(el, {deg, px, dur})` | Cue item: rattle a piece (dice roll) |
| `B.flash()` | Cue item: white camera flash over the board + shutter sound |
| `B.flashlight(pts, {r})` → `{el, off}` | Dark board with a searching beam; `pts = [[t,x,y],…]` in scene seconds and board units. Reveal `el` at `'@0'`, cue `off` to switch the lights on |
| `B.question(text, {x,y,w,size,rot,z,hot})` → `{el, words}` | Big ransom-note question (hook, comment prompt). Every word is its own clipping; the last word ending in `?` and the words at indexes in `hot` print red. Cue the words early: `B.cue('@0', q.words, {stagger: .06})` |
| `B.hero(...items)` | Mark the scene's hero visual (one element or a group). `check.js lint` measures it |
| `B.fill(style, z)` | Full-board backdrop (e.g. `'background:#05040a'` for space). Reveal at `'@0'`. On dark backdrops, give stamps a paper back: `B.stamp(..., {style:'background:#f3ecd9;mix-blend-mode:normal;opacity:1'})` |
| `B.placeholder({x,y,w,h,label,rot,z})` | "ASSET NEEDED" card for the storyboard; swap it for the real asset later |
| `B.el(html, anim, sfx)` | Raw element (censor bars, cut lines, custom overlays). The element starts hidden until its cue. |
| `B.onFrame(fn(sceneClock, dt))` | Per-frame JS for custom effects (export-safe) |
| `B.cue(key, items, {stagger})` | Reveal `items` when the narrator says `key` (exact word, punctuation ignored; `word*` = prefix; `'@1.5'` = seconds after scene start). Cues must follow narration order. Items may be elements or **functions** (called at that moment). |

## Globals you may tune
- `BOARD_SHAPE`: `'tall'` (default), `'classic'` or `'full'`.
- `LOOK = { grain, flicker, scratches, weave }`: film look, 0 to 1.
- `TOPIC:` markers: page `<title>`, series line, start note, end-card verdict.
- `R(a,b)` = seeded random (layout stays identical between previews and export); `Math.random()` for per-frame jitter.

## Export-safety rules (the MP4 is rendered on a virtual clock)
1. Animate only with CSS animations/classes, `element.animate()`, or per frame from `B.onFrame` / `frameHooks`. The exporter pins every animation's `currentTime` to the virtual clock.
2. Never use `setTimeout`/`setInterval` for visuals; use `later(fn, ms)`.
3. New sounds: add to `SFX` using `now()` for the start time and connect to `sfxBus`; trigger with `sfx('name')`. The exporter logs and re-renders them offline.
4. No live `<video>`: draw extracted frames on a canvas in `B.onFrame`.
5. Camera cue functions (like `B.punch`) carry `camera: true` and are skipped in poster/storyboard frames; mark your own camera moves the same way (`Object.assign(fn, {camera: true})`).
6. New CSS entrance: add `.in.a-myname{animation:myname .5s steps(6,end) both}` and use `anim:'myname'`.
