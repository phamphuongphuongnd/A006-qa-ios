"""Contact sheet of Test Lab screenshots: python -I qa/firebase/sheet.py <dir-with-pngs> <out.png> [cols] [thumb_w]"""
import os
import re
import sys

from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 8
tw = int(sys.argv[4]) if len(sys.argv) > 4 else 200


def key(n):
    m = re.match(r'(\d+)', n)
    return (0, int(m.group(1)), n) if m else (1, 0, n)


names = sorted([n for n in os.listdir(src) if n.lower().endswith('.png')], key=key)
thumbs = []
for n in names:
    im = Image.open(os.path.join(src, n)).convert('RGB')
    th = int(im.height * tw / im.width)
    thumbs.append((n, im.resize((tw, th))))
th = max(t.height for _, t in thumbs) + 16
rows = (len(thumbs) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (tw + 6), rows * th), 'white')
d = ImageDraw.Draw(sheet)
for i, (n, t) in enumerate(thumbs):
    x, y = (i % cols) * (tw + 6), (i // cols) * th
    sheet.paste(t, (x, y + 14))
    d.text((x + 2, y), n[:34], fill='black')
sheet.save(out)
print(len(thumbs), sheet.size)
