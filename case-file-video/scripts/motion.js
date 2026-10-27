// Motion QA: plays the page on the export's virtual clock (frame-accurate, same timing as the MP4) and reports what a
// poster or storyboard can't show: dead air, pieces that pop in without motion, and a contact sheet of every scene in motion.
// Usage: node motion.js <page.html> <fontsource_dir> <work_dir> <out_dir> [--fps 6] [--gap 2] [--scene N] [--cols 8]
//   <work_dir> must hold voice/narration.json (export.js --voice-only writes it), so scene timing matches the narration.
//   --fps    frames per second in the contact sheets (6 = overview; 12 = every stop-motion frame, use with --scene)
//   --gap    longest allowed stretch with nothing new happening on the board, in seconds (default 2)
//   --scene  only keep frames for scene N (the run still plays from the start so timing is real)
// Writes <out_dir>/scene<N>.png (one contact sheet per scene, a frame every 1/fps s, time stamped) and <out_dir>/motion.json,
// and prints one line per scene. Fix every WARN, then look at each sheet for what a script can't judge (see SKILL.md, Phase 5).
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const [page, fdir, work, out] = args;
const SHOT_FPS = +opt('fps', 6), GAP = +opt('gap', 2), ONLY = opt('scene') ? +opt('scene') : null, COLS = +opt('cols', 8);
const STEP_FPS = 12;   // engine stop-motion runs at 12 fps; stepping at that rate catches every held frame
const narP = path.join(work, 'voice', 'narration.json');
if (!fs.existsSync(narP)) { console.error(`missing ${narP}: run export.js ... --voice-only first`); process.exit(1); }
const narration = JSON.parse(fs.readFileSync(narP, 'utf8'));
const F = (fam, dir, w, file) => `@font-face{font-family:'${fam}';font-weight:${w};src:url(http://local/f/${dir}/files/${file})}`;
const fontCSS = [F('Anton', 'anton', 400, 'anton-latin-400-normal.woff2'), F('Special Elite', 'special-elite', 400, 'special-elite-latin-400-normal.woff2'),
  F('Courier Prime', 'courier-prime', 400, 'courier-prime-latin-400-normal.woff2'), F('Courier Prime', 'courier-prime', 700, 'courier-prime-latin-700-normal.woff2'),
  F('Old Standard TT', 'old-standard-tt', 400, 'old-standard-tt-latin-400-normal.woff2'), F('Old Standard TT', 'old-standard-tt', 700, 'old-standard-tt-latin-700-normal.woff2')].join('\n');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const fr = path.join(out, 'frames'); fs.rmSync(fr, { recursive: true, force: true }); fs.mkdirSync(fr);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1280 }, deviceScaleFactor: .5 });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.addInitScript(e => { window.__EXPORT__ = e; }, { narration });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: fontCSS }));
  await p.route('https://fonts.gstatic.com/**', r => r.abort());
  await p.route('http://local/f/**', r => r.fulfill({ path: path.join(fdir, r.request().url().replace('http://local/f/', '')) }));
  const html = fs.readFileSync(page, 'utf8');
  await p.route('http://local/page', r => r.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>${html}</body></html>` }));
  await p.goto('http://local/page');
  await p.evaluate(() => document.fonts.ready);
  const stage = await p.$('#stage'); const box = await stage.boundingBox();

  // watch every piece that gets revealed (class pre -> in) on the board
  await p.evaluate(() => {
    window.__qa = { reveals: [] };
    new MutationObserver(ms => { for (const m of ms) {
      const e = m.target; if (!e.classList || !(m.oldValue || '').split(' ').includes('pre') || e.classList.contains('pre')) continue;
      if (e.classList.contains('flash')) { window.__qa.reveals.push({ t: window.__EXPORT__.t, flash: true }); continue; }
      if (!e.classList.contains('in')) continue;
      const cls = [...e.classList].find(c => c.startsWith('a-')) || '';
      const big = e.offsetWidth * e.offsetHeight > 200000 || e.classList.contains('flash') || e.classList.contains('dark');
      const label = (e.textContent || '').trim().slice(0, 24) || (e.tagName === 'IMG' ? 'cutout' : (e.getAttribute('class') || '').split(' ').filter(c => !/^(abs|pre|in|shadow|shadow-lg|boil)$/.test(c))[0] || e.tagName.toLowerCase());
      window.__qa.reveals.push({ t: window.__EXPORT__.t, anim: cls.slice(2), big, label, lint: !!e.closest('[data-lint="ignore"]') });
    } }).observe(document.querySelector('#board'), { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    window.__EXPORT__.begin();
  });

  const dt = 1 / STEP_FPS, every = Math.max(1, Math.round(STEP_FPS / SHOT_FPS));
  const frames = []; let f = 0, doneAt = null, nShot = 0;
  while (true) {
    const st = await p.evaluate(d => {
      const done = window.__EXPORT__.step(d), board = document.querySelector('#board');
      let moving = 0;
      for (const a of document.getAnimations()) {          // finite animations on the board that are mid-flight = motion
        const tg = a.effect && a.effect.target; if (!tg || !board.contains(tg) || tg.classList.contains('cam')) continue;
        const end = a.effect.getComputedTiming().endTime; if (!isFinite(end)) continue;
        if (a.currentTime > 0 && a.currentTime < end) moving++;
      }
      const n = window.__qa.reveals.length;
      return { done, t: window.__EXPORT__.t, scene: +document.querySelector('#stage').dataset.scene, moving, reveals: n };
    }, dt);
    let file = null;
    if (f % every === 0 && (ONLY === null || st.scene + 1 === ONLY)) {
      file = path.join(fr, `f${String(nShot++).padStart(5, '0')}.jpg`);
      await p.screenshot({ path: file, type: 'jpeg', quality: 70, clip: box });
    }
    frames.push({ ...st, file }); f++;
    if (st.done && doneAt === null) doneAt = f;
    if (doneAt !== null && f - doneAt >= 2 * STEP_FPS) break;
    if (f > STEP_FPS * 600) break;
  }
  const reveals = await p.evaluate(() => window.__qa.reveals);
  await ctx.close(); await b.close();

  // per scene: activity timeline, dead air, pops
  const scenes = [];
  frames.forEach((x, i) => { const s = scenes[x.scene] || (scenes[x.scene] = { n: x.scene + 1, t0: x.t, t1: x.t, frames: [] }); s.t1 = x.t; s.frames.push(i); });
  const report = []; let warns = 0;
  const endT = frames[frames.length - 1].t;
  scenes.forEach(s => {
    if (!s || s.n < 1) return;
    const inS = reveals.filter(r => r.t >= s.t0 - 1e-6 && r.t <= s.t1 + 1e-6), flashes = inS.filter(r => r.flash).map(r => r.t);
    const rv = inS.filter(r => !r.flash);
    const act = s.frames.map(i => frames[i].moving > 0 || frames[i].reveals > (i ? frames[i - 1].reveals : 0));
    const gaps = []; let run = 0;
    s.frames.forEach((i, k) => { if (!act[k]) run += dt; if (act[k] || k === s.frames.length - 1) { if (run > GAP) gaps.push({ at: +(frames[i].t - run - s.t0).toFixed(1), len: +run.toFixed(1) }); run = 0; } });
    const last = s.n === scenes.length - 1 ? gaps.filter(g => g.at + g.len < s.t1 - s.t0 - 2.2) : gaps;   // the final board may hold
    const firstNew = rv.find(r => !r.big && r.t - s.t0 > .35);
    const pops = rv.filter(r => r.anim === 'base' && !r.big && !r.lint && r.t - s.t0 > .5 && !flashes.some(t => Math.abs(r.t - t) < .3)).map(r => `"${r.label}" at ${(r.t - s.t0).toFixed(1)}s`);
    const w = [];
    last.forEach(g => w.push(`dead air: nothing new for ${g.len}s from ${g.at}s (add a beat, cue something earlier, or punch in)`));
    if (firstNew && firstNew.t - s.t0 > 1.6) w.push(`slow open: the first new piece lands at ${(firstNew.t - s.t0).toFixed(1)}s (aim for under 1.5s)`);
    if (pops.length) w.push(`pops in without motion (anim 'base' mid-scene): ${pops.join(', ')}`);
    warns += w.length;
    report.push({ scene: s.n, start: +s.t0.toFixed(2), dur: +(s.t1 - s.t0).toFixed(2), reveals: rv.length, gaps: last, pops, warnings: w });
    console.log(`scene ${s.n}: ${(s.t1 - s.t0).toFixed(1)}s, ${rv.length} reveals${w.length ? '\n   WARN ' + w.join('\n   WARN ') : ' · ok'}`);
  });
  fs.writeFileSync(path.join(out, 'timeline.json'), JSON.stringify(frames.map(x => [+x.t.toFixed(2), x.scene + 1, x.moving, x.reveals])));
  fs.writeFileSync(path.join(out, 'motion.json'), JSON.stringify({ total: +endT.toFixed(2), gap: GAP, scenes: report }, null, 1));

  // contact sheets: one per scene, time-stamped
  scenes.forEach(s => {
    if (!s || s.n < 1) return;
    const shots = s.frames.map(i => frames[i]).filter(x => x.file);
    if (!shots.length) return;
    const list = path.join(fr, `s${s.n}.txt`);
    fs.writeFileSync(list, shots.map(x => `file '${path.resolve(x.file)}'\nduration ${1 / SHOT_FPS}`).join('\n') + `\nfile '${path.resolve(shots[shots.length - 1].file)}'\n`);
    const rows = Math.ceil(shots.length / COLS);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list,
      '-vf', `fps=${SHOT_FPS},scale=200:-1,drawtext=text='%{eif\\:t\\:d}.%{eif\\:mod(t*10\\,10)\\:d}s':x=6:y=6:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.6,tile=${COLS}x${rows}:padding=4:color=black`,
      '-frames:v', '1', path.join(out, `scene${s.n}.png`)]);
  });
  console.log(`${warns ? warns + ' warning(s)' : 'all scenes pass'} · total ${endT.toFixed(1)}s · sheets in ${out}/scene<N>.png`);
})();
