"""B-98 check (phiên B): Save button fully above the keyboard + keyboard ✓ saves, at font 0.85 and 1.3.
python qa/tools/oldb98.py <serial> <persona> <outdir>   (persona data must already be restored on the device)"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import oldrun  # noqa: E402
import behaviours as b  # noqa: E402

serial, pid, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
r = oldrun.Run(serial, pid)
d = r.d
KB_COLOURS = ((236, 239, 241),)


def measure(tag):
    im = b.screen_image(r)
    im.save(os.path.join(out, f'{tag}.png'))
    w, h = im.size
    # keyboard top: first row (below 40% h) where the left edge AND the centre are keyboard-grey
    def kbish(p):
        return abs(p[0] - p[1]) < 10 and abs(p[1] - p[2]) < 10 and 225 <= p[0] <= 245
    kb = next((y for y in range(int(h * 0.4), h) if kbish(im.getpixel((3, y))) and kbish(im.getpixel((w // 2, y))) and kbish(im.getpixel((w - 4, y)))), h)
    red = lambda p: p[0] - p[1] > 60 and p[0] > 100  # noqa: E731
    rows = [y for y in range(int(h * 0.35), kb) if red(im.getpixel((int(w * 0.08), y))) and red(im.getpixel((int(w * 0.92), y)))]
    # the Save button band: last contiguous red run above the keyboard
    band = None
    if rows:
        end = rows[-1]
        start = end
        for y in reversed(rows):
            if start - y <= 2:
                start = y
            else:
                break
        band = (start, end)
    full = bool(band) and band[1] < kb - 2 and (band[1] - band[0]) >= 80
    return {'tag': tag, 'kb_top': kb, 'save_band': band, 'save_h_px': (band[1] - band[0] + 1) if band else 0, 'save_fully_above_kb': full,
            'gap_px': (kb - band[1]) if band else None}


res = []
for fs in ('0.85', '1.3'):
    d.shell(f'settings put system font_scale {fs}')
    d.shell(f'am force-stop {oldrun.PKG}')
    d.shell(f'am start -n {oldrun.PKG}/.MainActivity')
    time.sleep(5)
    r.back_home()
    r.tap_vis('New expense')
    time.sleep(2.5)
    d.shell('input text 1250')
    time.sleep(1)
    m = measure(f'b98_f{fs}_typed')
    d.key(66)  # keyboard ✓ (Done)
    toast = b.read_saved_toast(r, 6)
    m['done_key_toast'] = toast
    res.append(m)
    print(m, flush=True)
    r.back_home()
d.shell('settings put system font_scale 0.85')
print('RESULT', res)
