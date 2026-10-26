"""Turn raw PNG renders into halftone photos cut out of newsprint and emit `const STICKERS={...}` for the engine.
Usage: python3 stickers.py <raw_png_dir> <spec.json> <out_stickers.js> [preview_dir]
spec.json: {"robot": {"h": 640, "lift": 0.28}, "strawberry": {"h": 500, "tint": [170,30,26]}, ...}
  h = output height in px (about 2x the on-board display height), lift = lighten midtones (0-0.4),
  tint = ink colour for a spot-colour print (default near-black), margin = newsprint margin px (default 13), cell = halftone pitch."""
import io, os, sys, base64, json, numpy as np, cv2
from PIL import Image, ImageDraw
from scipy import ndimage
NEWS = np.array((226, 219, 200), np.float32)
rng = np.random.default_rng(11)

def sticker(raw, H_target, cell=4.6, tint=None, lift=0.0, margin=13):
    im = Image.open(raw).convert('RGBA')
    s = H_target / im.height; im = im.resize((max(1, int(im.width * s)), H_target), Image.LANCZOS)
    pad = margin + 10; c = Image.new('RGBA', (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0)); c.paste(im, (pad, pad)); im = c
    a = np.array(im).astype(np.float32); alpha = a[..., 3] / 255
    lum = (0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]) / 255; lum = lum * alpha + (1 - alpha)
    lum = np.clip((lum - 0.06) / 0.9, 0, 1) ** 1.1; lum = lift + (1 - lift) * lum
    H, W = lum.shape; S = 4
    big = Image.new('L', (W * S, H * S), 0); dr = ImageDraw.Draw(big)
    ang = np.deg2rad(45); ca, sa = np.cos(ang), np.sin(ang); diag = int(np.hypot(W, H)) + 8
    for i in np.arange(-diag, diag, cell):
        for j in np.arange(-diag, diag, cell):
            x = i * ca - j * sa + W / 2; y = i * sa + j * ca + H / 2
            if not (0 <= x < W and 0 <= y < H): continue
            d = 1 - lum[int(y), int(x)]
            if d < 0.03: continue
            r = cell * 0.74 * np.sqrt(d); dr.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], fill=255)
    dots = np.array(big.resize((W, H), Image.LANCZOS)).astype(np.float32) / 255
    ink = np.array(tint or (24, 22, 20), np.float32)
    photo = NEWS * (1 - dots[..., None]) + ink * dots[..., None]
    mask = alpha > 0.5
    dil = ndimage.binary_closing(ndimage.binary_dilation(mask, iterations=margin), iterations=8).astype(np.uint8)
    cnts, _ = cv2.findContours(dil, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    poly = cv2.approxPolyDP(max(cnts, key=cv2.contourArea), 4.5, True)[:, 0, :].astype(np.float32)
    poly += rng.normal(0, 1.1, poly.shape)
    cb = Image.new('L', (W * S, H * S), 0); ImageDraw.Draw(cb).polygon([(float(x) * S, float(y) * S) for x, y in poly], fill=255)
    cut = np.array(cb.resize((W, H), Image.LANCZOS)).astype(np.float32) / 255
    marg = np.repeat(NEWS[None, None], H, 0).repeat(W, 1).copy()
    tl = Image.new('L', (W, H), 0); td = ImageDraw.Draw(tl); colw = int(rng.integers(70, 110))
    for y in range(3, H, 6):
        x = int(rng.integers(-20, 0))
        while x < W:
            wl = int(rng.integers(5, 22))
            if (x % colw) + wl < colw - 6: td.rectangle([x, y, x + wl, y + 1], fill=int(rng.integers(90, 150)))
            x += wl + int(rng.integers(3, 5))
    for xc in range(colw - 3, W, colw): td.line([xc, 0, xc, H], fill=70)
    tla = np.array(tl).astype(np.float32) / 255 * 0.55
    marg = marg * (1 - tla[..., None]) + np.array((70, 66, 58), np.float32) * tla[..., None]
    rgb = np.where(mask[..., None], photo, marg) + rng.normal(0, 5, (H, W, 1))
    edge = cut - ndimage.gaussian_filter(cut, 1.2); rgb -= np.clip(edge, 0, 1)[..., None] * 40
    out = np.dstack([np.clip(rgb, 0, 255), cut * 255])
    ys, xs = np.where(out[..., 3] > 5); out = out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return Image.fromarray(out.astype(np.uint8))

if __name__ == '__main__':
    raw_dir, spec_p, out_js = sys.argv[1:4]; prev = sys.argv[4] if len(sys.argv) > 4 else None
    spec = json.load(open(spec_p)); res = {}
    for name, o in spec.items():
        img = sticker(os.path.join(raw_dir, f'{name}_raw.png'), o.get('h', 300), o.get('cell', 4.6), tuple(o['tint']) if o.get('tint') else None, o.get('lift', 0.0), o.get('margin', 13))
        if prev: os.makedirs(prev, exist_ok=True); img.save(os.path.join(prev, f'{name}.png'))
        b = io.BytesIO(); img.save(b, 'WEBP', quality=82, method=6)
        res[name] = {'src': 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(), 'ar': round(img.width / img.height, 4)}
        print(name, len(res[name]['src']) // 1024, 'KB')
    open(out_js, 'w').write('const STICKERS=' + json.dumps(res) + ';\n')
