# Effects catalog: case-file / paper-cutout / stop-motion style

Pick effects per scene while planning. **Built in** = ready-made helper or default behaviour. **Recipe** = build it yourself; the hint says how to do it in this engine, in an export-safe way (see `engine-api.md`). **Needs** = media you can't draw convincingly yourself, so ask the user for it (with a fallback).

Stop-motion rule of thumb: step motion at 12 fps (`steps(n,end)` in CSS, or held keyframes with `easing: 'steps(1,end)'` in `element.animate`), add 1–3 px of random jitter per held frame, and add a soft paper sound per step. Camera moves stay smooth.

## 1. Entrances (how a piece arrives)
| Effect | Status | How |
|---|---|---|
| Stop-motion slide-in from nearest edge, lifted then pressed flat, faint boil after landing | Built in | default `anim` for `B.piece` / `B.sticker` |
| Typewriter wipe | Built in | `anim:'wipe', sfx:'type'` |
| Stamp slam (3 frames + board jolt) | Built in | `B.stamp(...)` |
| Pin pop + string draw | Built in | `B.pin`, `B.string` |
| Hop into a slot | Built in | `anim:'hop'` with `--dx/--dy` |
| Drop from above with bounce | Recipe | `anim:'drop'` (keyframes exist); add a dust-puff div fading at landing |
| Slap-down | Recipe | 2-frame scale 1.15→1 + `board.shake` + low thud SFX + 4 small grey specks flying out (`element.animate`) |
| Unfold (folded note or map) | Recipe | two halves; animate the top half `transform: perspective(600px) rotateX(-180deg→0)` in 5 steps, with a crease shadow gradient |
| Corner peel | Recipe | small triangle div with a gradient (paper back) scaling 0→1 at a corner, then back; or `clip-path` polygon steps |
| Out of a folder or envelope | Recipe | folder front piece at a higher z-index; slide the photo up from behind it (stepped), then the folder slides away |
| Polaroid develop | Recipe | white frame + photo with `filter: brightness(3) contrast(.3) sepia(1)` animating to normal over 2 s in 8 steps |
| Flash pop | Recipe | full-board white div opacity 1→0 in 3 frames + `sfx('shutter')`; the photo appears on frame 1 |
| Scissor-cut reveal | Recipe | `B.marker('path', {d})` dashed outline around the photo, then the photo lifts (scale 1.04 + bigger shadow) and slides; snip SFX |
| Hand placement | Needs: photo of a hand holding/pinching (transparent PNG) | hand sticker slides in with the piece (same stepped keyframes, slightly delayed), then leaves the way it came |
| Spin-in (spinning newspaper) | Recipe | `rotate: 720deg→0, scale .1→1` over 1 s, 12 fps steps, then a hard settle; classic for headlines |
| Ransom-note title assembling | Recipe | one chip per letter/word, each its own cue item with `stagger: .06` |

## 2. Paper and print look
| Effect | Status | How |
|---|---|---|
| Halftone photo, scissor-cut edge, newsprint margin with article text | Built in | `stickers.py` |
| Print showing through, ransom-note type for single words | Built in | `.chip` |
| Torn edges, masking tape, aged/manila paper, lined index cards | Built in | `cls: paper / manila / card`, `B.tape` |
| Spot-colour duotone (one colour + black) | Built in | `tint` in the sticker spec |
| Edge boil (outline changes every frame) | Recipe | regenerate the element's `clip-path` with `scissorCut()` every 3rd frame from `B.onFrame`; use sparingly (hero props only) |
| Texture boil | Recipe | swap `background-position` of the paper texture every 2 frames in `B.onFrame` |
| Folds and creases | Recipe | `linear-gradient` light/dark 1 px lines over the piece, at random angles |
| Coffee ring, burnt edge, water stain | Recipe | radial-gradient rings; burnt edge = inner `box-shadow` dark brown + jagged `clip-path` |
| Photocopy grit | Recipe | `filter: contrast(1.8) grayscale(1)` + a noise canvas with `mix-blend-mode: multiply` |
| Risograph misregistration | Recipe | duplicate the sticker twice, tint each layer (pink/blue) with `mix-blend-mode: multiply`, offset 2–3 px |
| Polaroid frame, photo corners, film-negative strip, contact sheet with grease-pencil circles | Recipe | CSS frames around stickers; negative = `filter: invert(1) sepia(.6)` inside a sprocket strip; circles via `B.marker('circle')` |

## 3. Evidence-board devices
| Effect | Status | How |
|---|---|---|
| Pins, red string, stamps, censor bar, mugshot height chart | Built in | see the example scene 1 |
| Red marker circle / underline / arrow / cross-out | Built in | `B.marker(kind, params)` (stepped draw-on + squeak) |
| Highlighter swipe | Built in | `B.highlight(x, y, w, h)` |
| String twang | Recipe | after the string draws, animate its `d` (control point sag 12→2→6) over 4 frames via `element.animate` on a wrapper, or swap the path `d` in `B.onFrame` |
| Big red X on mugshots | Built in | `B.marker('cross', {x,y,w,h})` |
| Sticky notes, index-card flip | Recipe | yellow square card; flip = `rotateY(180deg)` stepped, swapping front/back content at 90° |
| Magnifying-glass zoom | Recipe | magnifier sticker plus a circular `div` with `overflow:hidden` holding a scaled clone of the area (`transform: scale(2)`), moving together |
| Flashlight sweep | Recipe | board-sized overlay `radial-gradient(circle at var(--x) var(--y), transparent 90px, rgba(0,0,0,.85) 160px)`; move `--x/--y` in `B.onFrame`; tense music |
| Redaction lifting | Recipe | black bar as a piece; on the cue, peel it with `clip-path` from left in 6 steps, revealing the text below |
| Fingerprint, case-number tag, evidence bag | Recipe | SVG props → `stickers.py`; evidence bag = translucent rounded rect with a zip-line and a label |
| Final recap board | Recipe | last-but-one scene re-uses the key pieces of earlier scenes (small) and strings them all to the verdict; a big payoff |

## 4. Text
| Effect | Status | How |
|---|---|---|
| Karaoke captions | Built in | automatic from `say` |
| Per-character typing with a carriage "ding" | Recipe | split the text into spans; reveal one per frame in `B.onFrame`; `sfx('type')` already ends with a ding |
| Label-maker tape (embossed) | Recipe | black strip, white Courier caps, `text-shadow: 0 1px 0 #000, 0 -1px 0 #666`, scissor-cut ends |
| Spinning-newspaper headline | Recipe | big newspaper piece (`news` class + Anton headline) with the spin-in recipe; great as a scene opener |
| Text match-cut montage | Recipe | 10–12 newspaper pieces where the key word sits at the same screen point; show each for 8→3 frames, faster and faster, with a click per cut (function cues) |
| Handwritten notes | Needs (optional): a handwriting font is fine without assets | Google Font "Caveat"/"Reenie Beanie" added to the font link + stepped wipe |
| Strike-through | Built in | `B.marker('underline', {x1, x2, y: textMiddle})` |
| Ticker / receipt printing | Recipe | a narrow strip whose height grows by one line per 2 frames, with a printer buzz SFX |

## 5. Camera
| Effect | Status | How |
|---|---|---|
| Slow drift + zoom per scene | Built in | `.cam` animation (direction varies per scene) |
| Punch-in on a point | Built in | cue item `B.punch(x, y, scale, hold)` |
| Board jolt | Built in | stamps trigger it |
| Pan across one giant board | Recipe | make one scene with a 1440x810 cam and `B.punch`-style `zoom.animate` translate keyframes moving between clusters |
| Rack focus | Recipe | `filter: blur(3px)` on background pieces animating to 0 while the foreground goes to blur |
| Macro detail | Recipe | punch-in with scale 2.2 plus a blurred vignette overlay |
| 2.5D parallax photo | Needs: a photo you cut into 2–3 depth layers (or the user's layered PSD/PNGs) | stack the layers; animate different `translate` amounts in `B.onFrame` |
| Handheld micro-shake | Recipe | `B.onFrame` sets `zoom.style.translate` to ±0.8 px noise every 2 frames |
| Overhead-projector look | Recipe | duplicate the board layer at 30% opacity, offset 3 px, flicker its opacity |

## 6. Transitions between scenes (engine default: blur-dissolve to a clean base paper)
| Effect | Status | How |
|---|---|---|
| Blur-dissolve to a fresh board | Built in | default |
| Paper tear | Recipe | in the outgoing scene's last cue, add a full-board paper piece whose `clip-path` jagged edge sweeps across in 6 steps, + tear SFX (bandpass noise burst) |
| Crumple and toss | Recipe | scale the outgoing layer 1→.2, rotate 40°, add a crumple texture overlay, and fly it off a corner in 6 steps |
| Page turn | Recipe | `rotateY(0→-180deg)` with `transform-origin: left` on the outgoing layer, 8 steps, plus a shadow gradient |
| Folder close/open | Recipe | a manila folder flap piece slides over the board, the next scene loads under it, and the flap slides away |
| Swept off by hand | Needs: a hand photo | hand sticker crosses the board; pieces get the same translate with a slight delay |
| Zoom-through | Recipe | `B.punch` with scale 4 into a photo at the end of the scene, then the next scene starts zoomed in, so the dissolve hides the swap |
| White flash + shutter | Recipe | full-stage white div, 2 frames, `sfx('shutter')` |
| Film burn / ink bleed | Recipe | radial orange-white gradient growing from an edge, `mix-blend-mode: screen`, over 6 frames |
| Slide-projector change | Recipe | 1 black frame, 2 frames of over-exposure, a "clunk" (low thud) SFX |

## 7. Film and archival overlays (`LOOK` in the engine)
| Effect | Status | How |
|---|---|---|
| Lamp vignette, window blinds light, dust motes | Built in | always on |
| Film grain, exposure flicker, vertical scratches + specks, gate weave | Built in | `LOOK = { grain, flicker, scratches, weave }` (0 = off, 1 = strong) |
| Light leaks | Recipe | orange/red radial gradients drifting at the stage edge, `mix-blend-mode: screen`, 20–40% opacity |
| Chromatic aberration at the edges | Recipe | duplicate the board with red/cyan tints offset 1.5 px, masked to the edges (`mask-image: radial-gradient`) |
| Colour grade (sepia, cold-case blue) | Recipe | `filter: sepia(.3) saturate(.8)` on `.board`, or a tinted overlay with `mix-blend-mode: color` |
| Sprocket frame / film border | Recipe | SVG frame overlay around the board |

## 8. Maps and numbers
| Effect | Status | How |
|---|---|---|
| Route drawing itself | Recipe | `B.marker('path', {d}, {color:'#b3231d'})` with `stroke-dasharray: 8 6` style dashes (wrap the dashed path under a mask path that draws) |
| Pin drop with ripple | Recipe | `B.pin` + an expanding circle (`scale 0→3`, opacity 1→0, 6 steps) |
| Region marker hatch | Recipe | SVG `pattern` of diagonal red lines clipped to the region path, wiped on |
| Compass spin, globe → place zoom | Recipe | SVG props; zoom = `B.punch` with large scale into a map sticker |
| Paper-strip bar chart, tally marks, balance scale | Recipe | strips as pieces with `height` animated in steps; tallies as `B.marker('path')` |
| Real maps of specific places | Needs: a map image (public-domain/OSM screenshot) | treat as a sticker (`stickers.py` halftones it) or a paper piece |

## 9. Sound design (`SFX` in the engine; add new ones with `now()` + `sfxBus`)
| Sound | Status |
|---|---|
| paper step-rustle + landing thud, stamp thud, pin, string zip, typewriter + ding, whoosh, boom, marker squeak, camera shutter | Built in |
| vinyl crackle, noir-jazz bed that ducks under the voice | Built in |
| scissors snip, paper tear, crumple, page flip, projector whir, string twang, clock tick, cash register, verdict sting | Recipe (filtered noise bursts / short oscillator envelopes, like the existing SFX) |
| Licensed music track instead of the generated bed | Needs: the track file + its licence |

## 10. Pacing tricks
| Trick | Status | How |
|---|---|---|
| Items land exactly on the spoken word | Built in | `B.cue('word', …)` |
| Speeding photo montage (8→3 frames each) | Recipe | function cues that swap `src`/visibility on a sticker stack, with a click each |
| Freeze frame + stamp on the punchline | Recipe | pause all piece animations (`B.onFrame` stops the boil) + stamp + one beat of silence (end the line with "…") |
| Reveals on the music beat | Recipe | beat length is `60/76` s; use `'@t'` cues at multiples of it |
| Hold on the payoff | Recipe | add 1–2 extra words of narration or a short `'@t'` cue after the last word |
