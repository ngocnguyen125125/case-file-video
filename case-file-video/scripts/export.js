// Frame-accurate MP4 export of a case-file page: 1080x1920 (FORMAT '9:16') or 1920x1080 (FORMAT '16:9'), 30 fps, H.264 + AAC.
// Usage: node export.js <page.html> <fontsource_dir> <work_dir> <out.mp4> [--voice am_michael:60,am_fenrir:40] [--speed 0.94] [--fx noir|clean]
//          [--pron pron.json] [--models <kokoro dir>] [--fps 30] [--preview 6] [--reuse-voice] [--voice-only]
//  1. reads each scene's narration from the page and renders it with narrate.py (Kokoro voice + word timings) into <work_dir>/voice
//     --voice-only stops here (bake the voice into the page with build.py --voice <work_dir>/voice, then export with --reuse-voice)
//  2. steps the page's virtual clock frame by frame and pipes JPEG frames into ffmpeg
//  3. renders the Web Audio music + sound effects offline (OfflineAudioContext) from the page's event log
//  4. mixes narration (placed at the exact times the page started each line) over music + sfx and muxes the MP4
// --preview N renders only the first N seconds (fast check). Needs: playwright (preinstalled), ffmpeg, python3 + kokoro-onnx.
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const [page, fdir, work, outMp4] = args;
const FPS = +opt('fps', 30), PREVIEW = +opt('preview', 0);
fs.mkdirSync(work, { recursive: true }); fs.mkdirSync(path.dirname(path.resolve(outMp4)), { recursive: true });
const F = (fam, dir, w, file) => `@font-face{font-family:'${fam}';font-weight:${w};src:url(http://local/f/${dir}/files/${file})}`;
const fontCSS = [F('Anton', 'anton', 400, 'anton-latin-400-normal.woff2'), F('Special Elite', 'special-elite', 400, 'special-elite-latin-400-normal.woff2'),
  F('Courier Prime', 'courier-prime', 400, 'courier-prime-latin-400-normal.woff2'), F('Courier Prime', 'courier-prime', 700, 'courier-prime-latin-700-normal.woff2'),
  F('Old Standard TT', 'old-standard-tt', 400, 'old-standard-tt-latin-400-normal.woff2'), F('Old Standard TT', 'old-standard-tt', 700, 'old-standard-tt-latin-700-normal.woff2')].join('\n');

async function openPage(browser, exp) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1280 }, deviceScaleFactor: 1.5 });   // fits either stage (720x1280 or 1280x720)
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.addInitScript(e => { window.__EXPORT__ = e; }, exp);
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: fontCSS }));
  await p.route('https://fonts.gstatic.com/**', r => r.abort());
  await p.route('http://local/f/**', r => r.fulfill({ path: path.join(fdir, r.request().url().replace('http://local/f/', '')) }));
  const html = fs.readFileSync(page, 'utf8');
  await p.route('http://local/page', r => r.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>${html}</body></html>` }));
  await p.goto('http://local/page');
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  return { ctx, p };
}
const run = (cmd, a) => execFileSync(cmd, a, { stdio: 'inherit' });

(async () => {
  const browser = await chromium.launch();
  // 1. narration
  let { ctx, p } = await openPage(browser, { narration: null });
  const says = await p.evaluate(() => window.__EXPORT__.says);
  await ctx.close();
  fs.writeFileSync(path.join(work, 'says.json'), JSON.stringify(says));
  const nar = [path.join(__dirname, 'narrate.py'), path.join(work, 'says.json'), path.join(work, 'voice'), '--voice', opt('voice', 'am_michael:60,am_fenrir:40'), '--speed', opt('speed', '0.94'), '--fx', opt('fx', 'noir'), '--models', opt('models', '.')];
  if (opt('pron')) nar.push('--pron', opt('pron'));
  if (!(args.includes('--reuse-voice') && fs.existsSync(path.join(work, 'voice', 'narration.json')))) run('python3', nar);
  const narration = JSON.parse(fs.readFileSync(path.join(work, 'voice', 'narration.json'), 'utf8'));
  if (args.includes('--voice-only')) { await browser.close(); console.log('voice ready in', path.join(work, 'voice')); return; }

  // 2. frames -> ffmpeg
  ({ ctx, p } = await openPage(browser, { narration }));
  const stage = await p.$('#stage'); const box = await stage.boundingBox();
  const cdp = await ctx.newCDPSession(p);   // direct CDP capture is ~2x faster than page.screenshot
  const grab = async () => Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, optimizeForSpeed: true,
    clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1.5 } })).data, 'base64');   // 1.5x the stage: 1080x1920 or 1920x1080
  const silent = path.join(work, 'video_silent.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  await p.evaluate(() => window.__EXPORT__.begin());
  const dt = 1 / FPS; let f = 0, doneAt = null; const t0 = Date.now();
  while (true) {
    const done = await p.evaluate(d => window.__EXPORT__.step(d), dt);
    const buf = await grab();
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    f++;
    if (done && doneAt === null) doneAt = f;
    if (doneAt !== null && f - doneAt >= Math.round(2.8 * FPS)) break;   // hold the last board ~2.8 s
    if (PREVIEW && f >= PREVIEW * FPS) break;
    if (f % (FPS * 5) === 0) console.log(`frame ${f} (${(f / FPS).toFixed(0)}s video, ${((Date.now() - t0) / 1000).toFixed(0)}s elapsed)`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  const dur = f / FPS;

  // 3. music + sfx, rendered offline from the page's event log
  const exp = await p.evaluate(() => ({ speech: window.__EXPORT__.speech, endT: window.__EXPORT__.endT || null }));
  const nbytes = await p.evaluate(d => window.__EXPORT__.renderAudio(d), dur);
  const parts = []; const CH = 3 << 20;
  for (let i = 0; i < nbytes; i += CH) parts.push(Buffer.from(await p.evaluate(([a, b]) => window.__EXPORT__.wavChunk(a, b), [i, CH]), 'base64'));
  const bed = path.join(work, 'music_sfx.wav'); fs.writeFileSync(bed, Buffer.concat(parts));
  await ctx.close(); await browser.close();

  // 4. place each narration line where the page started it, mix, mux
  const inputs = ['-i', bed], filt = []; let k = 1;
  exp.speech.forEach(s => {
    const n = narration[s.scene]; if (!n) return;
    inputs.push('-i', n.wav);
    filt.push(`[${k}:a]aresample=44100,aformat=channel_layouts=stereo,volume=1.6,adelay=${Math.round(s.start * 1000)}|${Math.round(s.start * 1000)}[v${k}]`); k++;
  });
  const vin = Array.from({ length: k - 1 }, (_, i) => `[v${i + 1}]`).join('');
  filt.push(`${vin}amix=inputs=${k - 1}:normalize=0[vo]`, `[0:a][vo]amix=inputs=2:normalize=0,alimiter=limit=0.95,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100[mix]`);
  const mix = path.join(work, 'mix.wav');
  run('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filt.join(';'), '-map', '[mix]', '-t', String(dur), mix]);
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', mix, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', outMp4]);
  // captions file next to the MP4: phrases of up to 7 words, timed from the narration word starts
  const ts = x => { const ms = Math.round(x * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s2 = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s2).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
  const cues = [];
  exp.speech.forEach(sp => {
    const w = says[sp.scene].split(/\s+/), tm = narration[sp.scene].times; let cur = [];
    const flush = () => { if (!cur.length) return; const a = cur[0], z = cur[cur.length - 1]; cues.push({ s: sp.start + tm[a], e: z + 1 < w.length ? sp.start + tm[z + 1] : sp.end, t: cur.map(i => w[i]).join(' ') }); cur = []; };
    w.forEach((x, i) => { cur.push(i); if (cur.length >= 7 || /[.?!:,]$/.test(x) && !/^([A-Za-z]\.)+s?$/.test(x) && cur.length >= 3 || /[.?!]$/.test(x) && !/^([A-Za-z]\.)+s?$/.test(x)) flush(); });
    flush();
  });
  const srt = outMp4.replace(/\.mp4$/i, '') + '.srt';
  fs.writeFileSync(srt, cues.filter(c => c.s < dur).map((c, i) => `${i + 1}\n${ts(c.s)} --> ${ts(Math.min(c.e, dur))}\n${c.t}\n`).join('\n'));
  console.log(`wrote ${outMp4} (${dur.toFixed(1)}s, ${f} frames) + ${srt}`);
})();
