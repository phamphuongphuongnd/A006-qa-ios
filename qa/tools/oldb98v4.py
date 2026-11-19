"""B-98 v4 check (phiên B), per font scale 0.85 / 1.3:
 1) Save fully above the keyboard (px visible), 2) open Note, type → Note field + Save visible,
 3) keyboard closed → Photo/Work/Note row back, 4) keyboard ✓ saves.
python qa/tools/oldb98v4.py <serial> <persona> <outdir>   (persona data already on the device)"""
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


def kb_top(im):
    w, h = im.size
    def kbish(p):
        return abs(p[0] - p[1]) < 10 and abs(p[1] - p[2]) < 10 and 225 <= p[0] <= 245
    return next((y for y in range(int(h * 0.35), h) if kbish(im.getpixel((3, y))) and kbish(im.getpixel((w // 2, y))) and kbish(im.getpixel((w - 4, y)))), h)


def save_band(im, kb):
    w, h = im.size
    red = lambda p: p[0] - p[1] > 60 and p[0] > 100  # noqa: E731
    rows = [y for y in range(int(h * 0.2), kb) if red(im.getpixel((int(w * 0.08), y))) and red(im.getpixel((int(w * 0.92), y)))]
    if not rows:
        return None
    end = rows[-1]
    start = end
    for y in reversed(rows):
        if start - y <= 2:
            start = y
        else:
            break
    return start, end


def work_row_visible(im, kb):
    """The blue-tinted Work chip in the middle column above the keyboard."""
    w, h = im.size
    for y in range(int(h * 0.15), kb):
        if sum(1 for x in range(int(w * 0.4), int(w * 0.6), 6) if (lambda p: p[2] - p[0] >= 15 and p[2] > 150 and p[0] > 150)(im.getpixel((x, y)))) > 8:
            return True
    return False


def snap(tag):
    im = b.screen_image(r)
    im.save(os.path.join(out, f'{tag}.png'))
    kb = kb_top(im)
    band = save_band(im, kb)
    return im, kb, band


res = []
for fs in ('0.85', '1.3'):
    rec = {'font': fs}
    d.shell(f'settings put system font_scale {fs}')
    d.shell(f'am force-stop {oldrun.PKG}')
    d.shell(f'am start -n {oldrun.PKG}/.MainActivity')
    time.sleep(5)
    r.back_home()
    r.tap_vis('New expense')
    time.sleep(2.5)
    d.shell(f"input text {b.typed_amount('1250')}")
    time.sleep(1.5)
    im, kb, band = snap(f'v4_f{fs}_1_typing')
    rec['1_kb_top'] = kb
    rec['1_save_band'] = band
    rec['1_save_visible_px'] = (band[1] - band[0] + 1) if band else 0
    rec['1_save_fully_above_kb'] = bool(band) and band[1] < kb - 2
    rec['1_work_row_shown_while_typing'] = work_row_visible(im, kb)
    # 3) keyboard closed → Photo/Work/Note row back
    d.key(4)
    time.sleep(1.5)
    im, kb3, band3 = snap(f'v4_f{fs}_3_kb_closed')
    rec['3_kb_closed'] = kb3 >= im.size[1] - 2
    rec['3_work_row_back'] = work_row_visible(im, kb3)
    # 2) Note open + typing
    if band3:
        r._save_top = band3[0]
        nb = b.find_note_button(r, band3[0] - 8)
    else:
        nb = None
    rec['2_note_button'] = nb
    if nb:
        d.tap_xy(*nb)
        time.sleep(1.5)
        d.text('QA note')
        time.sleep(1.5)
        im, kb2, band2 = snap(f'v4_f{fs}_2_note_typing')
        rec['2_kb_top'] = kb2
        rec['2_save_visible_px'] = (band2[1] - band2[0] + 1) if band2 else 0
        rec['2_save_fully_above_kb'] = bool(band2) and band2[1] < kb2 - 2
        # note field: a dark-outlined box containing the typed text — check that text pixels exist above Save
        rec['2_note_text_seen'] = r.has('QA note')
        d.key(4)
        time.sleep(1)
    # 4) keyboard ✓ saves: reopen the amount keyboard by tapping the amount, then ✓
    w, h = d.size()
    d.tap_xy(w // 2, int(h * 0.19))
    time.sleep(1.5)
    d.key(66)
    rec['4_done_key_toast'] = b.read_saved_toast(r, 6)
    res.append(rec)
    print(rec, flush=True)
    r.back_home()
d.shell('settings put system font_scale 0.85')
