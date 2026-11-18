"""QA-100 phiên B: hành trình theo 20 kiểu hành vi (dùng với oldrun.Run). Mỗi hàm gọi r.step(...) — kết quả thật trên màn.

Quy ước: không bấm "Try Pro free" / "Subscribe" (giao dịch / dùng thử thật). Bước không làm được trên giả lập → status 'skip' + lý do.
"""
import os
import re
import threading
import time

from adbui import PKG

SUFFIX = {'UK': '£', 'US': '$'}


# ---------------------------------------------------------------- helpers
def home(r):
    r.back_home()
    if not r.has('New expense'):
        r.tab('Home')


def read_saved_toast(r, timeout=6):
    end = time.time() + timeout
    while time.time() < end:
        for n in r.visible():
            t = n['text'] or ''
            if t.startswith('Saved ·') or t.startswith('Saved Â·'):
                return t
        time.sleep(0.2)
    return None


def screen_image(r):
    import io
    import subprocess
    from PIL import Image
    from adbui import ADB
    raw = subprocess.run([ADB, '-s', r.serial, 'exec-out', 'screencap', '-p'], capture_output=True, timeout=30).stdout
    return Image.open(io.BytesIO(raw)).convert('RGB')


def find_note_button(r, save_y):
    """Row Photo · Work/Personal · Note sits above Save; the Work chip is the blue-tinted pill at x = w/2."""
    im = screen_image(r)
    w, h = im.size
    x = w // 2
    sv = getattr(r, '_save_rgb', (0, 0, 0))
    def chip(p):
        return p[2] - p[0] >= 15 and sum(abs(p[i] - sv[i]) for i in range(3)) > 60
    ys = [y for y in range(int(h * 0.08), save_y) if chip(im.getpixel((x, y)))]
    runs, start, prev = [], None, None
    for y in ys:
        if start is None:
            start = prev = y
        elif y - prev <= 6:
            prev = y
        else:
            runs.append((start, prev))
            start = prev = y
    if start is not None:
        runs.append((start, prev))
    runs = [ru for ru in runs if ru[1] - ru[0] >= h * 0.03]
    if not runs:
        return None
    cy = (runs[-1][0] + runs[-1][1]) // 2
    return int(w * 0.83), cy


def find_save_band(r):
    """Capture screen can't be dumped (blinking caret). Find the full-width coloured Save button in a screenshot."""
    im = screen_image(r)
    w, h = im.size
    xs = [int(w * f) for f in (0.1, 0.25, 0.75, 0.9)]
    def sat(px):
        return max(px) - min(px) > 60 and max(px) > 60
    best, run, start = None, 0, 0
    for y in range(int(h * 0.12), int(h * 0.95)):
        pxs = [im.getpixel((x, y)) for x in xs]
        ok = all(sat(p) for p in pxs) and max(abs(pxs[0][i] - pxs[-1][i]) for i in range(3)) < 25
        if ok:
            if run == 0:
                start = y
            run += 1
        else:
            if run > h * 0.03 and (best is None or run > best[1]):
                best = (start, run)
            run = 0
    if best is None:
        return None
    r._save_top = best[0]
    r._save_rgb = im.getpixel((int(w * 0.1), best[0] + best[1] // 2))
    return w // 2, best[0] + best[1] // 2


def capture(r, digits, note=None, income=False, double=False, kill_after_ms=None):
    """Home → Expense/Income → digits → (note) → Save. Returns the 'Saved · …' toast text (or None)."""
    home(r)
    r.tap_vis('New income' if income else 'New expense')
    time.sleep(1.8)
    r.d.shell(f'input text {digits}')
    time.sleep(0.6)
    if note:
        sv = find_save_band(r)
        nb = find_note_button(r, r._save_top - 8) if sv else None
        if not nb:
            raise RuntimeError('Note button not found in screenshot')
        r.d.tap_xy(*nb)
        time.sleep(1.2)
        r.d.text(note)
        time.sleep(0.8)
        r.shot('note_typed')
        # leave the note field so the Save row is back in place
        r.d.key(4)
        time.sleep(0.8)
    pos = find_save_band(r)
    if pos is None:
        raise RuntimeError('Save button not found in screenshot of capture screen')
    x, y = pos
    if double:
        r.d.shell(f'input tap {x} {y} & input tap {x} {y}')
    elif kill_after_ms is not None:
        r.d.shell(f'input tap {x} {y}; sleep {kill_after_ms / 1000:.2f}; am force-stop {PKG}')
        return None
    else:
        r.d.tap_xy(x, y)
    return read_saved_toast(r)


def _search_field(r):
    w, h = r.d.size()
    nodes = r.visible()
    ph = next((n for n in nodes if (n['text'] or n['desc']) == 'Search notes or amounts'), None)
    if ph:
        return ph
    # field holding a previous query: the wide node in the search row (top ~25% of the screen) left of the clear button
    return next((n for n in nodes if n['b'][1] < h * 0.25 and n['b'][1] > h * 0.1 and (n['b'][2] - n['b'][0]) > w * 0.5 and n['text']), None)


def search_count(r, query):
    """Entries tab → (clear) search → number of visible matching rows (rows with an amount)."""
    home(r)
    r.tab('Entries')
    time.sleep(1)
    fld = _search_field(r)
    if not fld:
        raise RuntimeError('search field not found on Entries')
    r.d.tap_xy((fld['b'][0] + fld['b'][2]) // 2, (fld['b'][1] + fld['b'][3]) // 2)
    time.sleep(0.6)
    r.d.key(123)  # MOVE_END
    r.d.shell('input keyevent ' + ' '.join(['67'] * 40))
    time.sleep(0.4)
    r.d.text(query)
    time.sleep(2.0)
    r.d.key(4)  # hide keyboard
    time.sleep(0.8)
    nodes = r.visible()
    shown = next((n['text'] for n in nodes if query.lower() in (n['text'] or '').lower() and not n['click']), None)
    rows = [n for n in nodes if n['click'] and query.lower() in (n['desc'] or n['text']).lower() and ('£' in (n['desc'] or n['text']) or '$' in (n['desc'] or n['text']))]
    r.shot('search_' + re.sub(r'\W+', '_', query)[:20])
    field_text = next((n['text'] for n in nodes if n['text'] and n['text'].lower().startswith(query.lower()[:3])), '')
    if field_text and field_text.lower() != query.lower() and query.lower() in field_text.lower() and len(field_text) > len(query):
        raise RuntimeError(f'search field not cleared: {field_text!r}')
    # clear again so later steps see the full list
    fld = _search_field(r)
    if fld:
        r.d.tap_xy((fld['b'][0] + fld['b'][2]) // 2, (fld['b'][1] + fld['b'][3]) // 2)
        time.sleep(0.5)
        r.d.key(123)
        r.d.shell('input keyevent ' + ' '.join(['67'] * 40))
        r.d.key(4)
        time.sleep(0.5)
    home(r)
    return len(rows)


def first_entry(r):
    home(r)
    r.tab('Entries')
    time.sleep(1.5)
    for n in r.visible():
        t = n['desc'] or n['text']
        if n['click'] and ('£' in t or '$' in t) and ',' in t:
            return t
    return None


def sort_cards(r, n):
    home(r)
    r.tab('Sort')
    time.sleep(1.5)
    prog0 = next((x['text'] for x in r.visible() if re.search(r'\d+ of \d+ sorted', x['text'])), None)
    if r.has('Nothing to sort') or r.has('Week sorted'):
        if not r.has('Pick a week'):
            # everything sorted (weekly sorter keeps up): log 2 new entries, then sort them
            capture(r, '2345')
            capture(r, '1500', income=True)
            home(r)
            r.tab('Sort')
            time.sleep(1.5)
        # pick an earlier week that still has entries left
        if r.has('Nothing to sort') or r.has('Week sorted'):
            r.tap_vis('Pick a week')
            time.sleep(1.5)
            left = [x for x in r.visible() if re.search(r' · \d+ left', x['text'] or x['desc'])]
            r.shot('pick_week')
            if not left:
                r.d.key(4)
                return 'skip', 'no week with unsorted entries'
            b = left[0]['b']
            r.d.tap_xy((b[0] + b[2]) // 2, (b[1] + b[3]) // 2)
            time.sleep(2)
        prog0 = next((x['text'] for x in r.visible() if re.search(r'\d+ of \d+ sorted', x['text'])), None)
    done = 0
    w, h = r.d.size()
    for _ in range(n):
        chip = None
        for attempt in range(3):
            nodes = r.visible()
            labels = [x for x in nodes if x['click'] and x['text'] == '' and x['desc'] == '']
            # category chips are the clickable nodes between "MOST USED"/"Suggested" and Work/Personal
            hdr = next((x for x in nodes if x['text'] in ('MOST USED', 'SUGGESTED', 'Suggested')), None)
            if hdr:
                cands = [x for x in nodes if x['click'] and x['b'][1] > hdr['b'][1] and (x['text'] or x['desc']) not in ('Work', 'Personal', 'More…', 'Edit', 'Split', 'Merge', 'Skip', 'New entry')
                         and x['b'][3] < h * 0.86 and x['b'][1] < h * 0.86]
                if cands:
                    chip = cands[0]
                    break
            # small screens: category chips are inside the card's own scroll
            r.d.shell(f'input swipe {w // 2} {int(h * 0.5)} {w // 2} {int(h * 0.35)} 500')
            time.sleep(0.8)
        if not chip:
            break
        x1, y1, x2, y2 = chip['b']
        r.d.tap_xy((x1 + x2) // 2, (y1 + y2) // 2)
        done += 1
        time.sleep(1.4)
        if r.has('Week sorted') or r.has('Nothing to sort'):
            break
    prog1 = next((x['text'] for x in r.visible() if re.search(r'\d+ of \d+ sorted', x['text'])), None)
    r.shot('sorted')
    if done == 0:
        return 'fail', f'no category chip found on sort card ({prog0})'
    return 'pass', f'tapped {done} categories; progress {prog0} → {prog1 or "week done"}'


def open_export(r):
    home(r)
    r.tab('Reports')
    time.sleep(2)
    r.scroll_vis('Export')
    r.tap_vis('Export', exact=True)
    time.sleep(2)
    if not r.has('CSV'):
        raise RuntimeError('export screen did not open')


def share_sheet_up(r, timeout=40):
    end = time.time() + timeout
    while time.time() < end:
        top = r.resumed()
        if 'Chooser' in top or 'Resolver' in top or 'android/com.android.internal.app' in top or 'intentresolver' in top.lower():
            return top
        err = next((n['text'] for n in r.visible() if "Couldn't create" in (n['text'] or '') or 'Free up some storage' in (n['text'] or '')), None)
        if err:
            return 'ERROR:' + err
        time.sleep(0.7)
    return None


def do_export(r, pdf=False):
    open_export(r)
    r.shot('export_screen')
    if pdf:
        try:
            r.scroll_vis('PDF report')
            r.tap_vis('PDF report')
            time.sleep(3)
        except TimeoutError:
            pass
    if r.has('See Pro') or r.has('Try Pro free') or r.has('Subscribe'):
        r.d.key(4)
        time.sleep(1)
        return 'skip', 'PDF report is Pro-only: Pro screen shown (not purchased)'
    w, h = r.d.size()
    btn = None
    for _ in range(5):
        btn = next((n for n in r.visible() if re.match(r'Export \d+ files?$', n['text'] or n['desc'] or '') and n['click']), None)
        if btn:
            break
        r.d.swipe_up()
        time.sleep(0.8)
    if not btn and (r.has('Try Pro free') or r.has('Sunday Sort Pro')):
        r.d.key(4)
        time.sleep(1)
        return 'skip', 'PDF report is Pro-only: Pro screen shown (not purchased)'
    if not btn:
        return 'fail', 'no "Export N files" button: ' + ' | '.join(n['text'] for n in r.visible() if n['text'])[:200]
    b = btn['b']
    t0 = time.time()
    r.d.tap_xy((b[0] + b[2]) // 2, (b[1] + b[3]) // 2)
    time.sleep(1.5)
    if r.has('Export anyway'):
        r.tap_vis('Export anyway')
    if r.has('See Pro') or r.has('Try Pro free'):
        return 'skip', 'export option is Pro-only (Pro screen shown, not purchased)'
    top = share_sheet_up(r)
    secs = round(time.time() - t0, 1)
    r.metrics['export_secs'] = secs
    shot = r.shot('export_share')
    if not top:
        return 'fail', f'no share sheet after {secs}s; screen: {[n["text"] for n in r.visible()][:12]}'
    if top.startswith('ERROR'):
        return 'fail', top
    r.d.key(4)
    time.sleep(1)
    return 'pass', f'share sheet in {secs}s ({top.split()[-2] if len(top.split()) > 2 else top})'


def backup_now(r):
    r.back_home()
    r.open_settings_row('Backup & restore')
    r.tap_vis('Back up now')
    t0 = time.time()
    top = share_sheet_up(r, timeout=90)
    secs = round(time.time() - t0, 1)
    r.metrics['backup_secs'] = secs
    r.shot('backup_share')
    if not top:
        return 'fail', f'no share sheet after {secs}s: {[n["text"] for n in r.visible()][:10]}'
    if top.startswith('ERROR'):
        return 'fail', top
    r.d.key(4)
    time.sleep(1.5)
    if r.has('Did the backup file get saved?'):
        r.tap_vis('Not saved')
        time.sleep(1)
        return 'pass', f'share sheet in {secs}s; "Did the backup file get saved?" asked → Not saved'
    return 'pass', f'share sheet in {secs}s (no saved? prompt)'


def network_drop_midway(r, after=15):
    if r.p['network'] != 'drops_midway':
        return None
    t = threading.Timer(after, lambda: r.airplane(True))
    t.daemon = True
    t.start()
    return t


def start_trip_flow(r, allow=True):
    """Miles → Start trip → permission screens. Returns description of what happened."""
    home(r)
    r.tab('Miles')
    r.tap_vis('Start trip')
    time.sleep(2)
    seen = []
    for _ in range(8):
        texts = ' | '.join(n['text'] or n['desc'] for n in r.visible())
        top = r.resumed()
        if 'RECORDING' in texts or 'Finding GPS' in texts or 'TRIP RUNNING' in texts or 'End trip' in texts:
            seen.append('recording')
            return seen
        if 'permissioncontroller' in top or 'packageinstaller' in top or 'GrantPermissionsActivity' in top:
            seen.append('system-dialog:' + texts[:120])
            if allow:
                btn = next((n for n in r.visible() if (n['text'] or '').strip().lower() in ('while using the app', 'allow only while using the app', 'allow')), None)
                if btn:
                    r.d.tap_xy((btn['b'][0] + btn['b'][2]) // 2, (btn['b'][1] + btn['b'][3]) // 2)
            else:
                btn = next((n for n in r.visible() if (n['text'] or '').strip().lower() in ('deny', "don't allow")), None)
                if btn:
                    r.d.tap_xy((btn['b'][0] + btn['b'][2]) // 2, (btn['b'][1] + btn['b'][3]) // 2)
            time.sleep(1.5)
            continue
        if 'Allow location' in texts:
            seen.append('app-permission-screen')
            r.tap_vis('Allow location')
            time.sleep(2)
            continue
        if 'Keep recording with the screen off' in texts:
            seen.append('step2-always')
            # keep "while using" (realistic most common choice): go back to the trip with what we have
            for lab in ('Not now', 'Skip', 'Continue without', 'Start trip'):
                if r.has(lab):
                    r.tap_vis(lab)
                    break
            else:
                r.d.key(4)
            time.sleep(2)
            continue
        if 'GPS trips need location access' in texts or 'Location access is needed' in texts:
            seen.append('denied-state')
            return seen
        if 'Location is off' in texts:
            seen.append('gps-off')
            return seen
        time.sleep(1.5)
    seen.append('unknown:' + ' | '.join(n['text'] for n in r.visible())[:200])
    return seen


START = {'UK': (51.5074, -0.1278), 'US': (39.7392, -104.9903)}


def seed_location(r, secs=6):
    """Put the emulator at the persona's start point before a trip (else the first fix is the AVD default far away)."""
    lat, lon = START[r.p['region']]
    for _ in range(secs):
        r.emu(f'geo fix {lon} {lat}')
        time.sleep(1)


def drive(r, secs=90):
    """Simulated GPS (emulator console): straight east at ~22 m/s (≈ 50 mph), 1 fix per second. Not a real drive."""
    lat, lon = START[r.p['region']]
    for i in range(secs):
        r.emu(f'geo fix {lon + i * 0.0003 * (1.0 if r.p["region"] == "UK" else 1.17):.6f} {lat:.6f}')
        time.sleep(1)


def end_trip(r):
    for lab in ('End trip', 'End', 'Stop'):
        if r.has(lab):
            r.tap_vis(lab, exact=True)
            break
    time.sleep(2)
    if r.has('End trip') and r.has('Cancel'):
        r.tap_vis('End trip', exact=True)
        time.sleep(2)
    return ' | '.join(n['text'] for n in r.visible() if n['text'])[:220]


def manual_trip(r, miles='12.5', odometer=False):
    home(r)
    r.tab('Miles')
    r.tap_vis('Add manually')
    time.sleep(1.8)
    seg = next((n for n in r.visible() if (n['text'] or n['desc']) == ('Odometer' if odometer else 'Distance') and n['click']), None)
    if not seg:
        return 'fail', 'mode switch not found'
    r.d.tap_xy((seg['b'][0] + seg['b'][2]) // 2, (seg['b'][1] + seg['b'][3]) // 2)
    time.sleep(1.2)
    if odometer:
        nodes = r.visible()
        start = next(n for n in nodes if (n['text'] or n['desc']).startswith('e.g.') and n['b'][0] < 300)
        end = next(n for n in nodes if (n['text'] or n['desc']).startswith('e.g.') and n['b'][0] > 300)
        r.d.tap_xy((start['b'][0] + start['b'][2]) // 2, (start['b'][1] + start['b'][3]) // 2)
        r.d.text('45210')
        time.sleep(0.5)
        r.d.tap_xy((end['b'][0] + end['b'][2]) // 2, (end['b'][1] + end['b'][3]) // 2)
        r.d.text('45248')
        time.sleep(0.8)
    else:
        nodes = r.visible()
        lab = next(n for n in nodes if (n['text'] or n['desc']) in ('Miles', 'Kilometres'))
        unit = next((n for n in nodes if (n['text'] or n['desc']) in ('mi', 'km')), None)
        y = (unit['b'][1] + unit['b'][3]) // 2 if unit else lab['b'][3] + 60
        r.d.tap_xy((lab['b'][0] + lab['b'][2]) // 2, y)
        time.sleep(0.6)
        r.d.text(miles)
        time.sleep(0.6)
    r.d.key(4)
    time.sleep(0.8)
    shown = ' | '.join(n['text'] for n in r.visible() if n['text'])[:200]
    r.shot('manual_trip_filled')
    btn = next((n for n in r.visible() if (n['text'] or n['desc']) == 'Save trip' and n['click']), None)
    if not btn:
        return 'fail', 'Save trip button not visible: ' + shown
    r.d.tap_xy((btn['b'][0] + btn['b'][2]) // 2, (btn['b'][1] + btn['b'][3]) // 2)
    end = time.time() + 6
    while time.time() < end:
        for n in r.visible():
            if n['text'].startswith('Trip saved'):
                return 'pass', f'{n["text"]} (form: {shown[:120]})'
        if r.has('Save anyway'):
            r.tap_vis('Save anyway')
        time.sleep(0.3)
    return 'fail', 'no "Trip saved" toast: ' + ' | '.join(n['text'] for n in r.visible() if n['text'])[:200]


# ---------------------------------------------------------------- shared tail
def home_totals(r):
    home(r)
    time.sleep(1.5)
    return [n['text'] for n in r.visible() if re.search(r'[£$]\d', n['text'] or '')]


def relaunch_check(r):
    before = home_totals(r)
    r.d.shell(f'am force-stop {PKG}')
    time.sleep(1)
    st = r.cold_start('after-run')
    time.sleep(3)
    if r.has('Sunday Sort is locked'):
        return 'pass', f'locked screen shown after relaunch (app lock on); {st[1]}'
    if r.has('Get started'):
        if r.p['behaviour'] == 'wipe_all':
            return 'pass', f'onboarding after wipe (expected); {st[1]}'
        return 'fail', 'app restarted into onboarding — data lost?'
    after = home_totals(r)
    if before != after:
        return 'fail', f'Home week totals changed across restart: {before} → {after}'
    return 'pass', f'{st[1]}; Home totals unchanged: {after}'


# ---------------------------------------------------------------- 20 behaviours
def quick_capture_only(r):
    cur = SUFFIX[r.p['region']]
    t = network_drop_midway(r)
    r.step('capture expense 12.34', lambda: ('pass', s) if (s := capture(r, '1234')) and '12.34' in s else ('fail', f'toast={s}'))
    r.step('capture income 85.00 + note', lambda: ('pass', s) if (s := capture(r, '8500', note='QA quick', income=True)) and '85.00' in s else ('fail', f'toast={s}'))
    r.step('capture 7.5 (decimal key)', lambda: ('pass', s) if (s := capture(r, '7.5')) and '7.50' in s else ('fail', f'toast={s}'))
    r.step('note searchable in Entries', lambda: ('pass', 'found 1') if (c := search_count(r, 'QA quick')) == 1 else ('fail', f'{c} rows for "QA quick"'))
    if t:
        t.cancel()


def weekly_sorter(r):
    network_drop_midway(r)
    r.step('sort 5 cards on Sort tab', sort_cards, r, 5)
    def lv():
        home(r)
        r.tab('Sort')
        time.sleep(1.5)
        if not r.has('List view'):
            return 'skip', 'List view button not shown (week fully sorted)'
        r.tap_vis('List view')
        time.sleep(2)
        ok = r.in_app()
        r.shot('sort_list')
        r.d.key(4)
        return ('pass', 'list view opened') if ok else ('fail', r.resumed())
    r.step('Sort list view opens', lv)


def never_sorts(r):
    home(r)
    def check():
        r.tab('Reports')
        time.sleep(2.5)
        msg = next((n['text'] for n in r.visible() if "aren't sorted" in n['text']), None)
        r.tab('Sort')
        time.sleep(1.5)
        badge = next((n['desc'] for n in r.visible() if 'to sort' in n['desc']), None)
        if not msg:
            return 'fail', f'no unsorted banner on Reports (badge={badge})'
        return 'pass', f'Reports: "{msg}" · tab badge "{badge}"'
    r.step('unsorted backlog visible (Reports + badge)', check)
    def lst():
        r.tap_vis('List view')
        time.sleep(3)
        w, h = r.d.size()
        for _ in range(5):
            r.d.shell(f'input swipe {w // 2} {int(h * 0.8)} {w // 2} {int(h * 0.2)} 150')
            time.sleep(0.4)
        ok = r.in_app()
        r.d.key(4)
        return ('pass', 'scrolled 5 pages of unsorted list') if ok else ('fail', r.resumed())
    r.step('unsorted list view scroll', lst)


def split_merge_heavy(r):
    def split():
        home(r)
        r.tab('Sort')
        time.sleep(1.5)
        if r.has('Nothing to sort'):
            capture(r, '4000')
            home(r)
            r.tab('Sort')
            time.sleep(1.5)
        r.tap_vis('Split', exact=True)
        time.sleep(2)
        r.shot('split_panel')
        w, h = r.d.size()
        btn = None
        for _ in range(6):
            btn = next((n for n in r.visible() if (n['text'] or n['desc']) == 'Split & sort' and n['b'][3] < h * 0.9), None)
            if btn:
                break
            r.d.shell(f'input swipe {w // 2} {int(h * 0.6)} {w // 2} {int(h * 0.4)} 500')
            time.sleep(0.8)
        if not btn:
            return 'fail', 'no "Split & sort" button reachable: ' + ' | '.join(n['text'] for n in r.visible() if n['text'])[:200]
        left = next((n['text'] for n in r.visible() if n['text'].endswith(' left') or n['text'].endswith(' over')), 'balanced')
        b = btn['b']
        r.d.tap_xy((b[0] + b[2]) // 2, (b[1] + b[3]) // 2)
        end = time.time() + 6
        while time.time() < end:
            res = next((n['text'] for n in r.visible() if n['text'].startswith('Split into')), None)
            if res:
                return 'pass', f'{res} (left-to-assign before: {left})'
            time.sleep(0.3)
        return 'fail', 'no "Split into" toast after Split & sort: ' + ' | '.join(n['text'] for n in r.visible() if n['text'])[:200]
    r.step('split an entry', split)
    def merge():
        home(r)
        r.tab('Entries')
        time.sleep(1.5)
        rows = [n for n in r.visible() if n['click'] and ('£' in n['desc'] or '$' in n['desc']) and n['desc'].count(',') >= 2]
        if len(rows) < 2:
            return 'skip', 'fewer than 2 entries visible'
        a, b = rows[0]['b'], rows[1]['b']
        r.d.shell(f'input swipe {(a[0] + a[2]) // 2} {(a[1] + a[3]) // 2} {(a[0] + a[2]) // 2} {(a[1] + a[3]) // 2} 900')
        time.sleep(1.2)
        r.d.tap_xy((b[0] + b[2]) // 2, (b[1] + b[3]) // 2)
        time.sleep(1)
        r.shot('merge_selected')
        if not r.has('Merge'):
            return 'fail', 'no Merge action after long-press select: ' + ' | '.join(n['text'] or n['desc'] for n in r.visible())[:200]
        r.tap_vis('Merge', exact=True)
        time.sleep(1.5)
        if r.has('only merge entries of the same type'):
            return 'pass', 'mixed types → "You can only merge entries of the same type." (correct guard)'
        r.shot('merge_dialog')
        btns = sorted([n for n in r.visible() if (n['text'] or n['desc']) == 'Merge'], key=lambda n: n['b'][1])
        if btns:
            bb = btns[-1]['b']
            r.d.tap_xy((bb[0] + bb[2]) // 2, (bb[1] + bb[3]) // 2)
        time.sleep(0.5)
        end = time.time() + 5
        while time.time() < end:
            res = next((n['text'] for n in r.visible() if n['text'].startswith('Merged')), None)
            if res:
                return 'pass', res
            time.sleep(0.3)
        res = next((n['text'] for n in r.visible() if n['text'].startswith('Merged')), None)
        return ('pass', res) if res else ('fail', 'no "Merged" toast: ' + ' | '.join(n['text'] for n in r.visible() if n['text'])[:200])
    r.step('merge 2 entries', merge)


def gps_trips(r):
    def trip():
        seed_location(r)
        seen = start_trip_flow(r, allow=True)
        if 'recording' not in seen:
            return 'fail', f'trip did not start: {seen}'
        r.shot('trip_running')
        drive(r, 90)
        live = ' | '.join(n['text'] for n in r.visible() if n['text'])[:160]
        notif = r.d.shell(f'dumpsys notification --noredact | grep -A3 "pkg={PKG}" | head -20')
        txt = end_trip(r)
        m = re.search(r'Trip saved · ([\d.]+) (mi|km)', txt)
        miles = float(m.group(1)) if m else None
        # 90 fixes ≈ 1.9 km ≈ 1.2 mi simulated
        ok = miles is not None and miles >= 0.8
        return ('pass' if ok else 'fail'), f'flow={seen}; live: {live}; notif={"yes" if "pkg=" in notif else "no"}; end: {txt[:160]}'
    r.step('GPS trip start → simulated drive → end', trip)
    def fg_service():
        out = r.d.shell(f'dumpsys activity services {PKG} | grep -iE "ServiceRecord|isForeground|foregroundServiceType" | head')
        return 'pass', (out.strip() or 'no service running after trip end (expected)')[:300]
    r.step('foreground service state after trip', fg_service)


def manual_miles_odometer(r):
    r.step('add trip manually (distance)', manual_trip, r, '23.4')
    r.step('add trip from odometer readings', manual_trip, r, None, True)
    def miles_tab():
        home(r)
        r.tab('Miles')
        time.sleep(1.5)
        rows = [n['text'] for n in r.visible() if 'mi' in n['text'] and any(c.isdigit() for c in n['text'])]
        return ('pass', f'{rows[:4]}') if rows else ('fail', 'no mileage rows on Miles tab')
    r.step('Miles tab shows trips', miles_tab)


def year_end_export(r):
    network_drop_midway(r)
    r.step('export CSV (all entries) → share sheet', do_export, r)
    r.step('export PDF report → share sheet', do_export, r, True)


def backup_restore_other_phone(r):
    r.step('Back up now → share sheet', backup_now, r)
    other = 'P040' if r.p['id'] != 'P040' else 'P036'
    src = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fixtures', f'{other}.sundaysort')
    r.d.sh('push', src, f'/sdcard/Download/{other}.sundaysort')
    r.d.shell(f'am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Download/{other}.sundaysort')
    r.back_home()
    r.step(f"restore another person's backup ({other})", r.restore, f'{other}.sundaysort')
    def check():
        home(r)
        r.tab('Entries')
        time.sleep(2)
        rows = [n['desc'] for n in r.visible() if n['click'] and ('£' in n['desc'] or '$' in n['desc'])]
        return ('pass', f'entries after restore: {rows[:2]}') if rows else ('fail', 'no entries after restoring other backup')
    r.step('entries present after restoring other backup', check)


def pro_trial(r):
    if r.p['network'] == 'airplane':
        r.airplane(True)
    def pro():
        r.back_home()
        r.tap_vis('Settings', exact=True)
        time.sleep(1.2)
        r.scroll_vis('Sunday Sort Pro', up=True)
        r.tap_vis('Sunday Sort Pro')
        time.sleep(4)
        texts = [n['text'] for n in r.visible() if n['text']]
        price = next((t for t in texts if re.search(r'[£$]\d', t)), None)
        top = r.resumed()
        r.shot('pro_screen')
        if not texts:
            # uiautomator can't get an idle state on an animated screen: judge from the screenshot instead
            im = screen_image(r)
            w, h = im.size
            colours = len(set(im.crop((0, int(h * 0.1), w, int(h * 0.9))).quantize(64).getdata()))
            r.d.key(4)
            ok = PKG in top and colours > 8
            return ('pass' if ok else 'fail'), f'UI dump unavailable (animation); screenshot has {colours} colours, top={top[-60:]}'
        r.d.key(4)
        return 'pass', f'Pro screen shows price {price!r}; buttons: {[t for t in texts if "Pro" in t or "Subscribe" in t][:3]}'
    r.step(f'open Pro screen ({r.p["network"]})', pro)
    r.steps.append({'step': 'start trial / subscribe', 'status': 'skip', 'detail': 'không bấm Try Pro / Subscribe (giao dịch thật bị cấm; ảnh google_apis không có Play Store)'})
    r.airplane(False)


def wipe_all(r):
    # the persona's backup can already be empty: log 2 entries so there is something to erase
    r.step('log 2 entries before wiping', lambda: ('pass', f'{capture(r, "1111")} / {capture(r, "2222", income=True)}'))
    def wipe():
        r.back_home()
        r.open_settings_row('Delete all data')
        r.d.wait('Delete all data?')
        r.tap_vis('Continue', exact=True)
        time.sleep(1)
        r.d.wait('Type DELETE')
        r.d.text('DELETE')
        time.sleep(0.8)
        r.d.key(4)  # hide keyboard
        time.sleep(0.8)
        nodes = r.visible()
        cancel = next((n for n in nodes if (n['text'] or n['desc']) == 'Cancel'), None)
        r.shot('delete_typed')
        btns = [n for n in nodes if (n['text'] or n['desc']) == 'Delete all data' and cancel and abs((n['b'][1] + n['b'][3]) - (cancel['b'][1] + cancel['b'][3])) < 80]
        if not btns:
            return 'fail', 'confirm button next to Cancel not found'
        b = btns[0]['b']
        r.d.tap_xy((b[0] + b[2]) // 2, (b[1] + b[3]) // 2)
        time.sleep(4)
        texts = ' | '.join(n['text'] for n in r.visible() if n['text'])
        if 'Get started' in texts:
            return 'pass', 'back to onboarding after delete'
        return 'pass' if 'Expense' in texts else 'fail', texts[:200]
    r.step('delete all data (type DELETE)', wipe)
    def after():
        if r.has('Get started'):
            r.onboard()
        n = first_entry(r)
        return ('pass', 'Entries empty after wipe') if n is None else ('fail', f'entry still present: {n}')
    r.step('no entries left after wipe', after)


def region_switch(r):
    """Switch to the other region (the restored backup may already have changed it) and convert at a typed rate."""
    state = {}
    def sw():
        r.back_home()
        first = first_entry(r)
        state['before'] = first
        r.back_home()
        r.open_settings_row('Region, ')
        time.sleep(1)
        r.d.key(4)  # close the sheet again: we only opened it to land on Settings
        time.sleep(1)
        row = next((n['desc'] or n['text'] for n in r.visible() if (n['desc'] or n['text']).startswith('Region,')), '')
        cur = 'UK' if 'United Kingdom' in row else 'US'
        to = 'United States' if cur == 'UK' else 'United Kingdom'
        rate = '1.27' if cur == 'UK' else '0.79'
        state.update(cur=cur, to=to, rate=float(rate))
        r.tap_vis('Region, ')
        time.sleep(1.2)
        r.tap_vis(to + ',')
        end = time.time() + 8
        while time.time() < end and not r.has('Change region?'):
            time.sleep(0.5)
        r.shot('change_region_dialog')
        if not r.has('Change region?'):
            return 'fail', f'no "Change region?" dialog after picking {to} (row was {row!r})'
        body = next((n['text'] for n in r.visible() if 'will be converted' in (n['text'] or '') or 'will switch' in (n['text'] or '')), '')
        fld = next((n for n in r.visible() if (n['text'] or '').startswith('e.g.')), None)
        if fld:
            r.d.tap_xy((fld['b'][0] + fld['b'][2]) // 2, (fld['b'][1] + fld['b'][3]) // 2)
            time.sleep(0.5)
            r.d.text(rate)
            time.sleep(0.8)
        btns = sorted([n for n in r.visible() if (n['text'] or n['desc']) == 'Change'], key=lambda n: n['b'][1])
        if not btns:
            return 'fail', 'Change button not found'
        bb = btns[-1]['b']
        r.d.tap_xy((bb[0] + bb[2]) // 2, (bb[1] + bb[3]) // 2)
        time.sleep(3)
        row2 = next((n['desc'] or n['text'] for n in r.visible() if (n['desc'] or n['text']).startswith('Region,')), None)
        return ('pass' if row2 and to in row2 else 'fail'), f'{cur} → {row2}; dialog: "{body[:110]}"; rate {rate}'
    r.step('switch region (with conversion dialog)', sw)
    def conv():
        after = first_entry(r)
        b4 = state.get('before') or ''
        m1 = re.search(r'([£$])([\d,]+\.\d\d)', b4)
        m2 = re.search(r'([£$])([\d,]+\.\d\d)', after or '')
        if not (m1 and m2):
            return 'fail', f'cannot read amounts: {b4!r} / {after!r}'
        v1, v2 = float(m1.group(2).replace(',', '')), float(m2.group(2).replace(',', ''))
        exp = round(v1 * state['rate'], 2)
        ok = m2.group(1) != m1.group(1) and abs(v2 - exp) <= 0.01
        return ('pass' if ok else 'fail'), f'first entry {b4!r} → {after!r}; expected {m2.group(1)}{exp:.2f}'
    r.step('entries converted at the typed rate', conv)
    def reports():
        home(r)
        r.tab('Reports')
        time.sleep(2.5)
        lab = next((n['text'] for n in r.visible() if 'Tax year' in (n['text'] or '')), None)
        exp = 'Tax year 20' if True else ''
        want_uk = state.get('to') == 'United Kingdom'
        ok = lab and (('/' in lab) == want_uk)
        return ('pass' if ok else 'fail'), f'Reports period label {lab!r} (UK tax years look like 2026/27, US like 2026)'
    r.step('Reports period follows the new region', reports)


def double_tap_save(r):
    def dbl():
        before = search_count(r, 'QA dbl')
        s = capture(r, '4321', note='QA dbl', double=True)
        time.sleep(1.5)
        after = search_count(r, 'QA dbl')
        return ('pass', f'1 entry created (toast {s!r})') if after - before == 1 else ('fail', f'{after - before} entries created by double tap')
    r.step('double-tap Save creates exactly 1 entry', dbl)


def kill_mid_save(r):
    def k():
        before = search_count(r, 'QA kill')
        capture(r, '999', note='QA kill', kill_after_ms=60)
        time.sleep(1)
        r.cold_start('after-kill')
        time.sleep(3)
        after = search_count(r, 'QA kill')
        if after - before in (0, 1):
            return 'pass', f'{after - before} entry after force-stop 60 ms after Save (no duplicate / crash)'
        return 'fail', f'{after - before} entries'
    r.step('force-stop right after Save', k)
    def k2():
        # restart the app while the restore is running: must be all-or-nothing
        before = first_entry(r)
        r.back_home()
        r.open_settings_row('Backup & restore')
        r.scroll_vis('Restore from backup')
        r.tap_vis('Restore from backup')
        time.sleep(2.5)
        fname = f'{r.p["id"]}.sundaysort'
        if not r.has(fname):
            try:
                r.tap_vis('Show roots', timeout=4); time.sleep(1.2); r.tap_vis('Downloads', exact=True, timeout=4); time.sleep(1.5)
            except TimeoutError:
                pass
        r.tap_vis(fname, exact=True)
        time.sleep(4)
        if not r.has('Replace this phone'):
            for kk in [61] * 6 + [21, 66]:
                r.d.key(kk); time.sleep(0.25)
        r.d.wait('Replace this phone', timeout=20)
        r.confirm_replace()
        time.sleep(0.3)
        r.d.shell(f'am force-stop {PKG}')
        r.cold_start('after-kill-restore')
        time.sleep(3)
        if r.has('Get started'):
            return 'fail', 'app is back at onboarding after killing a restore (data gone)'
        after = first_entry(r)
        return ('pass', f'app opens with data after kill during restore (before={before!r} after={after!r})') if after else ('fail', 'no entries after kill during restore')
    r.step('force-stop during restore (atomic?)', k2)


def revoke_permissions(r):
    def deny():
        seen = start_trip_flow(r, allow=False)
        r.shot('after_deny')
        ok = 'denied-state' in seen or any('app-permission-screen' in s for s in seen)
        r.d.key(4)
        return ('pass' if ok and r.in_app() else 'fail'), f'{seen}'
    r.step('deny location on Start trip', deny)
    def revoke_running():
        r.d.shell(f'pm grant {PKG} android.permission.ACCESS_FINE_LOCATION')
        r.d.shell(f'pm grant {PKG} android.permission.ACCESS_COARSE_LOCATION')
        seed_location(r)
        seen = start_trip_flow(r, allow=True)
        if 'recording' not in seen:
            return 'fail', f'trip did not start after grant: {seen}'
        drive(r, 15)
        r.d.shell(f'pm revoke {PKG} android.permission.ACCESS_FINE_LOCATION')
        r.d.shell(f'pm revoke {PKG} android.permission.ACCESS_COARSE_LOCATION')
        time.sleep(4)
        r.cold_start('after-revoke')
        time.sleep(3)
        texts = ' | '.join(n['text'] for n in r.visible() if n['text'])
        r.shot('after_revoke')
        return ('pass' if r.in_app() else 'fail'), f'app relaunched after revoke mid-trip: {texts[:200]}'
    r.step('revoke location while a trip runs', revoke_running)


def low_storage(r):
    def fill():
        df = r.d.shell('df /data | tail -1').split()
        free_kb = int(df[3]) if len(df) > 3 and df[3].isdigit() else None
        if free_kb is None:
            out = r.d.shell('df -k /data | tail -1').split()
            free_kb = int(out[3])
        leave_kb = 12 * 1024
        mb = max(0, (free_kb - leave_kb) // 1024)
        r.d.shell(f'dd if=/dev/zero of=/data/local/tmp/qa_fill bs=1048576 count={mb} 2>/dev/null', timeout=600)
        left = r.d.shell('df -h /data | tail -1')
        return 'pass', f'filled {mb} MB; now: {left.strip()}'
    r.step('fill storage to ~12 MB free', fill)
    try:
        r.step('capture while storage is full', lambda: ('pass', s) if (s := capture(r, '555', note='QA full')) else ('fail', 'no Saved toast: ' + ' | '.join(n['text'] for n in r.visible() if n['text'])[:200]))
        def bk_full():
            st, det = backup_now(r)
            if st == 'fail' and ('Free up some storage' in det or "Couldn't create" in det):
                msg = next((n['text'] for n in r.visible() if 'storage' in (n['text'] or '').lower()), det[:120])
                return 'pass', f'graceful error shown: {msg}'
            return st, det
        r.step('Back up now while storage is full → clear error, no crash', bk_full)
        r.step('app still responsive', lambda: ('pass', 'in app') if (home(r), r.in_app())[1] else ('fail', r.resumed()))
    finally:
        r.d.shell('rm -f /data/local/tmp/qa_fill')


def clock_tax_boundary(r):
    r.steps.append({'step': 'set clock to tax-year boundary', 'status': 'skip',
                    'detail': 'đổi giờ hệ thống cần adb root (google_apis cho phép) — làm trong clock_tax_boundary_root nếu root được'})
    root = r.d.sh('root')
    time.sleep(3)
    r.d.sh('wait-for-device', timeout=60)
    who = r.d.shell('id').strip()
    if 'uid=0' not in who:
        r.steps[-1]['detail'] += f' · root không được: {who}'
        return
    r.steps.pop()
    boundary = '0405235930' if r.p['region'] == 'UK' else '1231235930'
    year = '2026'
    def setclock():
        r.d.shell('settings put global auto_time 0')
        out = r.d.shell(f'date {boundary[:8]}{year}.{boundary[8:]}')
        return 'pass', f'clock → {r.d.shell("date").strip()} ({out.strip()[:60]})'
    r.step('set clock 30 s before tax-year end', setclock)
    r.step('capture just before boundary', lambda: ('pass', s) if (s := capture(r, '1111', note='QA before')) else ('fail', 'no toast'))
    time.sleep(35)
    r.step('capture just after boundary', lambda: ('pass', s) if (s := capture(r, '2222', note='QA after')) else ('fail', 'no toast'))
    def label():
        r.cold_start('post-boundary')
        time.sleep(3)
        t = next((n['text'] for n in r.visible() if 'Tax year' in n['text'] or 'Year 20' in n['text'] or re.search(r'20\d\d', n['text'] or '')), None)
        exp = '2026/27' if r.p['region'] == 'UK' else '2027'
        return ('pass' if t and exp in t else 'fail'), f'home label={t!r} expected contains {exp}'
    r.step('home tax-year label rolled over', label)
    def reports():
        home(r)
        r.tab('Reports')
        time.sleep(2.5)
        lab = next((n['text'] for n in r.visible() if 'Tax year' in n['text'] or re.fullmatch(r'\d{4}', n['text'] or '')), None)
        return 'pass', f'Reports period label {lab!r}'
    r.step('Reports period after boundary', reports)
    # restore clock to host time
    r.d.shell('date ' + time.strftime('%m%d%H%M%Y.%S', time.gmtime()) if False else 'settings put global auto_time 1')
    host_utc = time.strftime('%m%d%H%M%Y.%S', time.gmtime())
    r.d.shell(f'TZ=UTC date {host_utc}')
    r.d.shell('settings put global auto_time 1')
    r.steps.append({'step': 'clock back to real time', 'status': 'pass', 'detail': r.d.shell('date').strip()})
    r.cold_start('clock-restored')  # the week card was computed for the fake date


def weird_text(r):
    def typed():
        s = capture(r, '1999', note="=SUM(A1:A9)")
        return ('pass', s) if s else ('fail', 'no Saved toast')
    r.step('capture with formula-looking note', typed)
    def view():
        home(r)
        r.tab('Entries')
        time.sleep(2)
        w, h = r.d.size()
        for _ in range(3):
            r.d.shell(f'input swipe {w // 2} {int(h * 0.75)} {w // 2} {int(h * 0.3)} 300')
            time.sleep(0.7)
        r.shot('entries_weird')
        return 'pass', 'see screenshot for emoji / RTL / long-note rendering'
    r.step('Entries list with unicode/RTL/long notes', view)
    r.step('export CSV with weird notes', do_export, r)


def important_texts(r):
    """Texts an accessibility service like TalkBack sees (uiautomator --compressed skips not-important views)."""
    r.d.shell('uiautomator dump --compressed /sdcard/qa-uic.xml')
    xml = r.d.sh('exec-out', 'cat', '/sdcard/qa-uic.xml')
    return [t for t in re.findall(r' (?:text|content-desc)="([^"]+)"', xml)]


def recents_shows_content(r):
    """Distinct colours in the middle of the Recents screenshot: a covered thumbnail is (nearly) flat."""
    im = screen_image(r)
    w, h = im.size
    box = im.crop((int(w * 0.15), int(h * 0.3), int(w * 0.85), int(h * 0.75))).convert('RGB').quantize(64)
    return len(set(box.getdata()))


def app_lock(r):
    def setpin():
        r.d.shell('locksettings set-disabled false')
        out = r.d.shell('locksettings set-pin 1234')
        return ('pass' if '1234' in out else 'fail'), out.strip()[:120]
    r.step('set device PIN (locksettings)', setpin)
    try:
        def enable():
            r.back_home()
            r.tap_vis('Settings', exact=True)
            time.sleep(1.2)
            r.scroll_vis('App lock')
            sw = next((n for n in r.visible() if (n['text'] or n['desc']) == 'App lock' and n['click']), None)
            if not sw:
                return 'fail', 'App lock switch not found'
            r.d.tap_xy((sw['b'][0] + sw['b'][2]) // 2, (sw['b'][1] + sw['b'][3]) // 2)
            time.sleep(2.5)
            prompt = ' | '.join(important_texts(r))
            r.shot('lock_prompt')
            if 'PIN' not in prompt and 'Turn on app lock' not in prompt:
                return 'fail', f'no device-credential prompt: {prompt[:160]}'
            r.d.text('1234')
            r.d.key(66)
            time.sleep(2.5)
            r.tap_vis('Lock after')
            time.sleep(1.2)
            r.tap_vis('Immediately', exact=True)
            time.sleep(1.2)
            row = next((n['text'] or n['desc'] for n in r.visible() if (n['text'] or n['desc']).startswith('Lock after,')), None)
            return ('pass' if row and 'Immediately' in row else 'fail'), f'prompt="{prompt[:80]}" → {row}'
        if not r.step('turn on App lock (device PIN) + Lock after Immediately', enable):
            return
        def recents():
            r.d.key(3)
            time.sleep(2)
            r.d.key(187)
            time.sleep(3)
            n = recents_shows_content(r)
            r.shot('recents_with_lock')
            r.d.key(3)
            time.sleep(1)
            return ('fail' if n > 24 else 'pass'), f'{n} distinct colours in the Recents thumbnail area (>24 = app content visible; OLD-5)'
        r.step('Recents thumbnail hidden while App lock is on', recents)
        def relock():
            r.d.shell(f'am start -n {PKG}/.MainActivity')
            time.sleep(3)
            texts = ' | '.join(important_texts(r))
            r.shot('reopen_locked')
            locked = 'Unlock' in texts or 'locked' in texts.lower()
            return ('pass' if locked else 'fail'), f'after reopen (a11y): {texts[:160]}'
        r.step('reopen app → locked', relock)
        def deep():
            r.d.key(3)
            time.sleep(1)
            r.d.shell(f'am start -a android.intent.action.VIEW -d sundaysort://entries {PKG}')
            time.sleep(3)
            texts = ' | '.join(important_texts(r))
            r.shot('deeplink_locked')
            leaked = 'Search notes or amounts' in texts or any(c in texts for c in ('£', '$'))
            return ('fail' if leaked else 'pass'), f'deep link sundaysort://entries while locked (a11y): {texts[:160]}'
        r.step('deep link while locked does not show data', deep)
        def unlock():
            if r.has('Sunday Sort is locked'):
                r.tap_vis('Unlock', exact=True)
                time.sleep(2)
            r.d.text('1234')
            r.d.key(66)
            time.sleep(3)
            texts = ' | '.join(important_texts(r))
            return ('pass', 'unlocked') if 'locked' not in texts.lower() and ('Entries' in texts or 'Expense' in texts) else ('fail', texts[:200])
        r.step('unlock with device PIN', unlock)
    finally:
        r.d.shell('locksettings clear --old 1234; locksettings set-disabled true; input keyevent 82')


def recurring_rules(r):
    def screen(row, name):
        r.back_home()
        r.open_settings_row(row)
        time.sleep(2)
        texts = [n['text'] or n['desc'] for n in r.visible()]
        r.shot(name)
        ok = r.in_app() and len(texts) > 3
        r.d.key(4)
        time.sleep(1)
        return ('pass' if ok else 'fail'), ' | '.join(texts)[:220]
    r.step('open Recurring entries (free user)', screen, 'Recurring entries', 'recurring')
    r.step('open Auto-sort rules (free user)', screen, 'Auto-sort rules', 'rules')


def large_history(r):
    def scroll():
        home(r)
        r.tab('Entries')
        time.sleep(2)
        w, h = r.d.size()
        t0 = time.time()
        for _ in range(15):
            r.d.shell(f'input swipe {w // 2} {int(h * 0.85)} {w // 2} {int(h * 0.15)} 120')
        secs = round(time.time() - t0, 1)
        r.shot('entries_deep')
        gfx = r.d.shell(f'dumpsys gfxinfo {PKG} | grep -E "Janky frames|Total frames"')
        return ('pass' if r.in_app() else 'fail'), f'15 flings in {secs}s; {" ".join(gfx.split())[:120]}'
    r.step('fling Entries 15 times', scroll)
    def reports():
        home(r)
        t0 = time.time()
        r.tab('Reports')
        r.d.wait('Export', timeout=60)
        secs = round(time.time() - t0, 1)
        r.metrics['reports_open_secs'] = secs
        return ('pass' if secs < 8 else 'fail'), f'Reports ready in {secs}s (incl. ~1.2 s driver wait)'
    r.step('open Reports with big history', reports)
    def search():
        t0 = time.time()
        c = search_count(r, 'Costa')
        return 'pass', f'search "Costa" → {c} visible rows in {round(time.time() - t0, 1)}s'
    r.step('search notes in big history', search)
