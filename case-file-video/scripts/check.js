// QA harness. Serves the page like the artifact host (local fonts instead of Google Fonts).
// Usage: node check.js <page.html> <fontsource_dir> <out_dir> poster [#sceneN]   -> out_dir/poster.png
//        node check.js <page.html> <fontsource_dir> <out_dir> play               -> a frame every 2.9s until the end card
//        node check.js <page.html> <fontsource_dir> <out_dir> record [seconds]   -> out_dir/*.webm (inspect with ffmpeg tiles)
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
  else if (mode === 'play') {
    await p.click('#startBtn'); const stage = await p.$('#stage');
    for (let i = 0; i < 60; i++) {
      await p.waitForTimeout(2900);
      const sc = await p.evaluate(() => [...document.querySelectorAll('#counter i')].findIndex(e => e.classList.contains('cur')));
      await stage.screenshot({ path: path.join(out, `t${String(i).padStart(2, '0')}_s${sc}.png`) });
      if (await p.evaluate(() => !document.querySelector('#endOv').hidden)) { console.log('reached end card at frame', i); break; }
    }
  } else if (mode === 'record') { await p.click('#startBtn'); await p.waitForTimeout((+arg || 20) * 1000); }
  await ctx.close(); await b.close();
})();
