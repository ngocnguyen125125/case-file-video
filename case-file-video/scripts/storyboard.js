// Storyboard sheet: renders every scene's assembled frame and lays them out with narration, planned effects and needed assets.
// Usage: node storyboard.js <page.html> <fontsource_dir> <out.png> [--cols 3] [--title "What is a token?"]
// Scenes may declare  fx: ['punch-in on the secret', ...]  and  assets: ['photo of ENIAC (user)', ...]  for this sheet.
// Missing media should be drawn with B.placeholder({...}) so the sheet shows where it goes.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const [page, fdir, out] = args;
const COLS = +opt('cols', 3);
const F = (fam, dir, w, file) => `@font-face{font-family:'${fam}';font-weight:${w};src:url(http://local/f/${dir}/files/${file})}`;
const fontCSS = [F('Anton', 'anton', 400, 'anton-latin-400-normal.woff2'), F('Special Elite', 'special-elite', 400, 'special-elite-latin-400-normal.woff2'),
  F('Courier Prime', 'courier-prime', 400, 'courier-prime-latin-400-normal.woff2'), F('Courier Prime', 'courier-prime', 700, 'courier-prime-latin-700-normal.woff2'),
  F('Old Standard TT', 'old-standard-tt', 400, 'old-standard-tt-latin-400-normal.woff2'), F('Old Standard TT', 'old-standard-tt', 700, 'old-standard-tt-latin-700-normal.woff2')].join('\n');
const esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: .5 });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.addInitScript(() => { window.__EXPORT__ = { narration: null }; });   // export mode = stage at 1:1, no controls/overlays
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: fontCSS }));
  await p.route('https://fonts.gstatic.com/**', r => r.abort());
  await p.route('http://local/f/**', r => r.fulfill({ path: path.join(fdir, r.request().url().replace('http://local/f/', '')) }));
  const html = fs.readFileSync(page, 'utf8');
  await p.route('http://local/page', r => r.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>${html}</body></html>` }));
  await p.goto('http://local/page');
  await p.evaluate(() => document.fonts.ready);
  const meta = await p.evaluate(() => window.__caseFile);
  const shots = [];
  for (let i = 1; i <= meta.count; i++) {
    await p.goto('http://local/page#scene' + i); await p.reload();
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1500);   // let stop-motion entrances land
    const box = await (await p.$('#stage')).boundingBox();
    shots.push((await p.screenshot({ clip: box, type: 'jpeg', quality: 85 })).toString('base64'));
  }
  const cards = meta.scenes.map((s, i) => `
    <div class="card"><img src="data:image/jpeg;base64,${shots[i]}">
      <div class="meta"><div class="n">SCENE ${i + 1} · ${esc(s.kicker)}</div><div class="t">${esc(s.title)}</div>
      <div class="say">“${esc(s.say)}”</div>
      ${s.fx.length ? `<div class="lbl">Effects</div><div class="chips">${s.fx.map(f => `<span>${esc(f)}</span>`).join('')}</div>` : ''}
      ${s.assets.length ? `<div class="lbl need">Assets needed</div><ul>${s.assets.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}</div></div>`).join('');
  const sheet = `<!doctype html><html><head><meta charset="utf-8"><style>${fontCSS}
    body{margin:0;background:#16110c;color:#e8dcc4;font-family:'Courier Prime',monospace;padding:28px}
    h1{font-family:Anton;font-weight:400;letter-spacing:1px;font-size:34px;margin:0 0 4px;color:#e9b82a;text-transform:uppercase}
    .sub{font-family:'Special Elite';color:#9c8f78;margin-bottom:22px}
    .grid{display:grid;grid-template-columns:repeat(${COLS},360px);gap:22px}
    .card{background:#211912;border:1px solid #3a2f24;border-radius:6px;overflow:hidden}
    .card img{display:block;width:360px;height:640px}
    .meta{padding:12px 14px 16px}.n{font-family:'Special Elite';font-size:12px;color:#9c8f78}
    .t{font-family:Anton;font-size:22px;text-transform:uppercase;color:#e9b82a;margin:2px 0 8px}
    .say{font-size:13px;line-height:1.45;color:#e8dcc4}
    .lbl{font-family:Anton;font-size:12px;letter-spacing:1px;margin:10px 0 5px;color:#c9b99a}.lbl.need{color:#ff6b5e}
    .chips{display:flex;flex-wrap:wrap;gap:5px}.chips span{font-size:11px;background:#33271c;border:1px solid #4a3a2a;padding:2px 6px;border-radius:3px}
    ul{margin:0;padding-left:18px;font-size:12px;color:#ffb4ab}
  </style></head><body><h1>${esc(opt('title', 'Storyboard'))}</h1><div class="sub">${meta.count} scenes · frames show each scene fully assembled</div><div class="grid">${cards}</div></body></html>`;
  const sctx = await b.newContext({ viewport: { width: 28 * 2 + COLS * 360 + (COLS - 1) * 22, height: 800 }, deviceScaleFactor: 1 });
  await sctx.route('http://local/f/**', r => r.fulfill({ path: path.join(fdir, r.request().url().replace('http://local/f/', '')) }));
  await sctx.route('http://local/sheet', r => r.fulfill({ contentType: 'text/html', body: sheet }));
  const sp = await sctx.newPage();
  await sp.goto('http://local/sheet'); await sp.evaluate(() => document.fonts.ready); await sp.waitForTimeout(300);
  await sp.screenshot({ path: out, fullPage: true });
  await b.close(); console.log('wrote', out);
})();
