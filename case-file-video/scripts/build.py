"""Usage: python3 build.py <engine_src.html> <stickers.js> <out.html>  — inlines the sticker data into the page."""
import sys
src, st, out = sys.argv[1:4]
s = open(src).read(); assert '/*STICKERS*/' in s
open(out, 'w').write(s.replace('/*STICKERS*/', open(st).read())); print('wrote', out)
