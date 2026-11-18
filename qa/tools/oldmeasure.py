"""Số đo màn nhập khoản (capture) từ ảnh chụp + dumpsys window — cho B-57/B-58/B-72 (phiên B).

measure(r) → dict: chiều cao chữ số tiền (px, dp), vị trí hàng + − × ÷ (CalcBar) so với mép trên bàn phím.
Cách đo: số tiền = các hàng pixel có màu số tiền (đỏ expense / xanh income, bão hoà) nằm giữa thanh trên và hàng Photo/Work/Note;
CalcBar = các hàng có pixel xanh dương của ký hiệu + − × ÷ ngay trên bàn phím; bàn phím = khung cửa sổ InputMethod trong `dumpsys window`.
"""
import re


def ime_frame(r):
    out = r.d.shell('dumpsys window windows')
    blocks = out.split('Window #')
    for b in blocks:
        if 'InputMethod' in b.split('\n')[0] and ('mHasSurface=true' in b or 'isVisible=true' in b or 'mViewVisibility=0x0' in b):
            m = re.search(r'mFrame=\[(\d+),(\d+)\]\[(\d+),(\d+)\]', b) or re.search(r'frame=\[(\d+),(\d+)\]\[(\d+),(\d+)\]', b)
            if m:
                return tuple(int(x) for x in m.groups())
    return None


def measure(r, im=None):
    from behaviours import screen_image
    im = im or screen_image(r)
    w, h = im.size
    density = int(re.search(r'(\d+)', r.d.shell('wm density').splitlines()[-1]).group(1)) / 160
    kb = ime_frame(r)
    kb_top = kb[1] if kb else h
    # amount: saturated red or green pixels between the top bar (≈10% h) and the Photo/Work/Note row (first blue Work chip band)
    def is_amount(p):
        r_, g, b = p
        return (r_ - g > 60 and r_ - b > 50 and r_ > 100) or (g - r_ > 40 and g - b > 15 and g > 70)
    def is_work(p):
        return p[2] - p[0] >= 15 and p[2] > 150
    work_top = None
    for y in range(int(h * 0.1), kb_top):
        if sum(1 for x in range(int(w * 0.4), int(w * 0.6), 6) if is_work(im.getpixel((x, y)))) > 8:
            work_top = y
            break
    top = int(h * 0.11)
    bottom = (work_top or kb_top) - 4
    rows = [y for y in range(top, bottom) if sum(1 for x in range(int(w * 0.05), int(w * 0.85), 2) if is_amount(im.getpixel((x, y)))) >= 2]
    amount_px = (rows[-1] - rows[0] + 1) if rows else 0
    # CalcBar glyphs: blue (+ − × ÷) rows in the 25% of the screen above the keyboard
    def is_op(p):
        return p[2] - p[0] > 80 and p[2] > 120
    op_rows = [y for y in range(max(0, kb_top - int(h * 0.25)), min(h, kb_top + 40)) if sum(1 for x in range(0, w, 3) if is_op(im.getpixel((x, y)))) >= 2]
    res = {
        'screen_px': [w, h], 'density': density, 'ime_frame': kb, 'kb_top_px': kb_top,
        'work_row_top_px': work_top,
        'amount_glyph_px': amount_px, 'amount_glyph_dp': round(amount_px / density, 1),
        'amount_rows_px': [rows[0], rows[-1]] if rows else None,
        'calc_glyph_rows_px': [op_rows[0], op_rows[-1]] if op_rows else None,
    }
    if op_rows:
        res['calc_glyph_bottom_vs_kb_px'] = kb_top - op_rows[-1]  # >0: glyph fully above the keyboard
    return res
