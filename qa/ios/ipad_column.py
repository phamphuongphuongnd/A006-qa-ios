"""B-146 check on iPad screenshots: is anything drawn outside the centre column (CONTENT_MAX = 640 pt)?

Usage: python -I qa/ios/ipad_column.py <shots dir> [<shots dir> ...] [--width-pt N]

Width in pt defaults to the iPad Pro 13" frame: 1032 for a portrait shot, 1376 for a landscape one (B-155). Each line
says which, so a `-land` persona whose simulator never rotated shows up as "portrait".

For every JPG/PNG it looks at the two side margins (outside 640 pt + 6 pt slack, below the 30 pt status bar) and
reports the bands (in pt from the top) where a margin is not one flat colour. A flat margin = nothing of the app
leaks out of the column. Bands from system UI that is full width by design (iPad keyboard, share sheet, system
alerts, the page-sheet dimming edge) are expected: read them against the screenshot. Nothing here is a verdict.
"""
import os
import sys

from PIL import Image

CONTENT_MAX = 640
SLACK = 6
STATUS_BAR = 30


def bands(rows, step):
    out, start, prev = [], None, None
    for y in rows:
        if start is None:
            start = prev = y
        elif y - prev > step * 3:
            out.append((start, prev))
            start = y
        prev = y
    if start is not None:
        out.append((start, prev))
    return out


def check(path, width_pt):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    if width_pt is None:
        width_pt = 1376 if w > h else 1032
    s = w / width_pt
    half = (CONTENT_MAX / 2 + SLACK) * s
    left_end, right_start = int(w / 2 - half), int(w / 2 + half)
    if left_end < 4:
        return None
    px = im.load()
    step = max(1, int(2 * s))
    busy = {'left': [], 'right': []}
    colours = {'left': [], 'right': []}
    for y in range(int(STATUS_BAR * s), h, step):
        for side, xs in (('left', range(0, left_end, 2)), ('right', range(right_start, w, 2))):
            vals = [px[x, y] for x in xs]
            ref = sorted(vals)[len(vals) // 2]
            colours[side].append(ref)
            off = sum(1 for v in vals if max(abs(v[i] - ref[i]) for i in range(3)) > 28)
            if off > max(2, len(vals) // 100):
                busy[side].append(y)
    res = {}
    for side in busy:
        res[side] = [(round(a / s), round(b / s)) for a, b in bands(busy[side], step)]
    lc = colours['left'][len(colours['left']) // 2]
    rc = colours['right'][len(colours['right']) // 2]
    res['margin_rgb'] = (lc, rc)
    res['size'] = (w, h)
    res['orient'] = 'landscape' if w > h else 'portrait'
    return res


def main():
    args = sys.argv[1:]
    width_pt = None
    if '--width-pt' in args:
        i = args.index('--width-pt')
        width_pt = float(args[i + 1])
        del args[i:i + 2]
    for d in args:
        files = sorted(f for f in os.listdir(d) if f.lower().endswith(('.jpg', '.jpeg', '.png')))
        print(f'## {d} ({len(files)} shots)')
        for f in files:
            r = check(os.path.join(d, f), width_pt)
            if r is None:
                print(f'- {f}: too narrow for a margin check')
                continue
            flat = not r['left'] and not r['right']
            tag = 'flat margins' if flat else f"left busy {r['left'] or '-'} | right busy {r['right'] or '-'}"
            print(f"- {f} [{r['orient']}]: {tag} · margin colour {r['margin_rgb'][0]} / {r['margin_rgb'][1]}")


if __name__ == '__main__':
    main()
