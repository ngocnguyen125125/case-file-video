// QA harness. Serves the page like the artifact host (local fonts instead of Google Fonts).
// Usage: node check.js <page.html> <fontsource_dir> <out_dir> poster [#sceneN]   -> out_dir/poster.png
//        node check.js <page.html> <fontsource_dir> <out_dir> play               -> a frame every 2.9s until the end card
//        node check.js <page.html> <fontsource_dir> <out_dir> record [seconds]   -> out_dir/*.webm (inspect with ffmpeg tiles)
//        node check.js <page.html> <fontsource_dir> <out_dir> lint               -> phone legibility report for every scene:
//          smallest text on the board (stage px on the 720-wide frame; warn under 18), the hero visual's size (the elements
//          marked with B.hero(...), measured as one group; else the biggest single piece): warn when it covers under 10% of
//          the frame AND spans under 75% of its width, text inside the platform-button corner (stage x > 620, y > 697),
//          B.cue words that don't match any narration word, and pieces that are visible before their cue
// fontsource_dir = node_modules/@fontsource after: npm i @fontsource/anton @fontsource/special-elite @fontsource/courier-prime @fontsource/old-standard-tt
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const [page, fdir, out, mode = 'poster', arg] = process.argv.slice(2);
const F = (fam, dir, w, file) => `@font-face{font-family:'${fam}';font-weight:${w};src:url(http://local/f/${dir}/files/${file})}`;
const fontCSS = [F('Anton', 'anton', 400, 'anton-latin-400-normal.woff2'), F('Special Elite', 'special-elite', 400, 'special-elite-latin-400-normal.woff2'),
  F('Courier Prime', 'courier-prime', 400, 'courier-prime-latin-400-normal.woff2'), F('Courier Prime', 'courier-prime', 700, 'courier-prime-latin-700-normal.woff2'),
  F('Old Standard TT', 'old-standard-tt', 400, 'old-standard-tt-latin-400-normal.woff2'), F('Old Standard TT', 'old-standard-tt', 700, 'old-standard-tt-latin-700-normal.woff2')].join('\n');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const opts = { viewport: { width: 540, height: 1000 }, deviceScaleFactor: mode === 'record' ? 1 : 2 };
  if (mode === 'record') opts.recordVideo = { dir: out, size: { width: 540, height: 1000 } };
  const ctx = await b.newContext(opts); const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  p.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: fontCSS }));
  await p.route('https://fonts.gstatic.com/**', r => r.abort());
  await p.route('http://local/f/**', r => r.fulfill({ path: path.join(fdir, r.request().url().replace('http://local/f/', '')) }));
  const html = fs.readFileSync(page, 'utf8');
  await p.route('http://local/page', r => r.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>${html}</body></html>` }));
  await p.goto('http://local/page' + (mode === 'poster' && arg ? arg : ''));
  await p.waitForTimeout(1600);
  if (mode === 'poster') { await p.screenshot({ path: path.join(out, 'poster.png') }); }
  else if (mode === 'lint') {
    const n = await p.evaluate(() => window.__caseFile.count); let warns = 0;
    for (let i = 1; i <= n; i++) {
      await p.goto('http://local/page#scene' + i); await p.reload(); await p.waitForTimeout(1200);
      const r = await p.evaluate(() => {
        const miss = (window.__cueMiss || []).map(m => m.key), early = window.__preVisible || [];
        const st = document.querySelector('#stage').getBoundingClientRect(), k = 720 / st.width;
        const layer = [...document.querySelectorAll('#board .layer')].pop();
        const toStage = rc => ({ x: (rc.left - st.left) * k, y: (rc.top - st.top) * k, w: rc.width * k, h: rc.height * k });
        const vis = e => { for (let x = e; x && x !== layer; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false; } return true; };
        const texts = [], corner = [];
        layer.querySelectorAll('*').forEach(e => {
          if (e.closest('.news') || !vis(e)) return;
          const own = [...e.childNodes].filter(c => c.nodeType === 3).map(c => c.textContent.trim()).join(' ').trim();
          if (!own) return;
          const rc = e.getBoundingClientRect(), sc = e.offsetWidth ? rc.width / e.offsetWidth : 1;
          const rot = Math.abs(Math.cos(((parseFloat(getComputedStyle(e.closest('[style*=rotate]') || e).getPropertyValue('--r')) || 0) * Math.PI) / 180)) || 1;
          const px = parseFloat(getComputedStyle(e).fontSize) * Math.min(sc * rot, sc) * k;
          texts.push({ px: +px.toFixed(1), t: own.slice(0, 28) });
          const b = toStage(rc); if (b.x + b.w > 620 && b.y + b.h > 697 && b.y < 1280) corner.push(own.slice(0, 20));
        });
        texts.sort((a, b) => a.px - b.px);
        let hero = { a: 0, what: '' };
        const marked = [...layer.querySelectorAll('[data-hero]')].filter(vis);
        if (marked.length) {
          const bs = marked.map(e => toStage(e.getBoundingClientRect())), x0 = Math.max(0, Math.min(...bs.map(b => b.x))), y0 = Math.max(0, Math.min(...bs.map(b => b.y)));
          const x1 = Math.min(720, Math.max(...bs.map(b => b.x + b.w))), y1 = Math.min(1280, Math.max(...bs.map(b => b.y + b.h)));
          return { miss, early, min: texts.slice(0, 2), hero: { pct: +((x1 - x0) * (y1 - y0) / (720 * 1280) * 100).toFixed(1), wpct: Math.round((x1 - x0) / 7.2), what: `hero (${marked.length} piece${marked.length > 1 ? 's' : ''})` }, corner };
        }
        layer.querySelectorAll('img, .chip, .yellow, .card, .q, .ph, .stamp, .news').forEach(e => {
          if (!vis(e) || (e.classList.contains('news'))) return;
          const b = toStage(e.getBoundingClientRect()), a = Math.max(0, Math.min(720, b.x + b.w) - Math.max(0, b.x)) * Math.max(0, Math.min(1280, b.y + b.h) - Math.max(0, b.y));
          if (a > hero.a) hero = { a, w: Math.min(720, b.x + b.w) - Math.max(0, b.x), what: e.tagName === 'IMG' ? 'cutout' : (e.className.split(' ').find(c => ['chip', 'yellow', 'card', 'q', 'ph', 'stamp'].includes(c)) || e.className) + (e.textContent ? ' "' + e.textContent.trim().slice(0, 18) + '"' : '') };
        });
        return { miss, early, min: texts.slice(0, 2), hero: { pct: +(hero.a / (720 * 1280) * 100).toFixed(1), wpct: Math.round((hero.w || 0) / 7.2), what: 'unmarked, biggest piece: ' + hero.what }, corner };
      });
      const w = [];
      if (r.min[0] && r.min[0].px < 18) w.push(`small text ${r.min[0].px}px "${r.min[0].t}"`);
      if (r.hero.pct < 10 && r.hero.wpct < 75) w.push(`hero visual too small: ${r.hero.pct}% of the frame, ${r.hero.wpct}% of its width`);
      if (r.corner.length) w.push(`text under the platform buttons: ${r.corner.join(' | ')}`);
      if (r.early.length) w.push(`visible before its cue (inline opacity?): ${r.early.join(' | ')}`);
      if (r.miss.length) w.push(`cue word(s) not found in the narration (they fire too early): ${r.miss.join(', ')}`);
      warns += w.length;
      console.log(`scene ${i}: smallest text ${r.min[0] ? r.min[0].px + 'px "' + r.min[0].t + '"' : '-'} · ${r.hero.what} ${r.hero.pct}% of frame, ${r.hero.wpct}% wide${w.length ? '\n   WARN ' + w.join('\n   WARN ') : ' · ok'}`);
    }
    console.log(warns ? `${warns} warning(s): enlarge small notes (or cut them), make each scene's hero visual bigger, move text out of the button corner` : 'all scenes pass');
  }
  else if (mode === 'play') {
    await p.click('#startBtn'); const stage = await p.$('#stage');
    for (let i = 0; i < 60; i++) {
      await p.waitForTimeout(2900);
      const sc = await p.evaluate(() => +document.querySelector('#stage').dataset.scene);
      await stage.screenshot({ path: path.join(out, `t${String(i).padStart(2, '0')}_s${sc}.png`) });
      if (await p.evaluate(() => !document.querySelector('#endOv').hidden)) { console.log('reached end card at frame', i); break; }
    }
  } else if (mode === 'record') { await p.click('#startBtn'); await p.waitForTimeout((+arg || 20) * 1000); }
  await ctx.close(); await b.close();
})();
