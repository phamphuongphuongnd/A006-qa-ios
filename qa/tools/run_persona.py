"""QA-100 persona runner for Android (emulator). One persona = one fresh install walk-through with real taps.

  python run_persona.py --serial emulator-5554 --persona P001
  python run_persona.py --serial emulator-5554 --all-on api37_phone,api37_320dp,api37_tablet [--skip-done]
  python run_persona.py --serial emulator-5556 --persona P002 --profile-override api30_mid --out android-old

Per persona: device profile (density/size, font scale, dark, time zone, network) → pm clear → push the persona's
backup file → cold start (TotalTime) → onboarding for the persona's region → restore through the UI and check the
numbers on screen against our own sums of backup.json → tour of tabs/screens with screenshots → one behaviour
journey → logcat/meminfo → qa-runs/<out>/<id>/result.json → profile back to default.

Every step is ✅ / ❌ / ⏭ with a reason. A ❌ caused by a UI wait is marked kind=ui_timeout: re-check it by hand
before calling it an app bug (runner bugs are not app bugs). Git Bash: set MSYS_NO_PATHCONV=1 PYTHONIOENCODING=utf-8.
"""
import argparse
import contextlib
import datetime as dt
import json
import os
import re
import subprocess
import sys
import time
import traceback
import zipfile
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from adbui import ADB, NODE, PKG, Dev, unescape  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PERSONAS = os.path.join(ROOT, 'qa', 'personas.json')
FIXTURES = os.path.join(ROOT, 'qa', 'fixtures')
ACTIVITY = f'{PKG}/.MainActivity'
SYM = {'UK': '£', 'US': '$'}

# Device profiles. api37_* are overrides on one API 37 phone AVD; the old-API profiles run on their own AVDs as-is.
PROFILES = {
    'api37_phone': {},
    'api37_320dp': {'density': 540},
    'api37_tablet': {'size': '1600x2560', 'density': 320},
    'api30_mid': {},
    'api26_small': {},
}
# adb emu network presets (emulator console): speed / delay.
NETWORK = {
    'online': ('full', 'none'),
    'slow_3g': ('umts', 'umts'),
    'edge_delay': ('edge', 'edge'),
    'drops_midway': ('full', 'none'),  # + airplane mode switched on in the middle of the journey
    'airplane': ('full', 'none'),  # + airplane mode for the whole run
}


class Skip(Exception):
    """Step can't run here (reason in the message) → ⏭."""


class Fail(Exception):
    """Step ran and the app did the wrong thing → ❌."""


def money(minor, region):
    s = f'{SYM[region]}{abs(minor) // 100:,}.{abs(minor) % 100:02d}'
    return ('−' + s) if minor < 0 else s


def parse_money(s):
    m = re.search(r'([−-])?[£$]([\d,]+)\.(\d\d)', s or '')
    if not m:
        return None
    v = int(m.group(2).replace(',', '')) * 100 + int(m.group(3))
    return -v if m.group(1) else v


# ───────────────────────────────────────── device helpers ─────────────────────────────────────────

SLOW = float(os.environ.get('QA_SLOW', '2'))  # timeout multiplier (busy host: 6 emulators)


class Phone(Dev):
    def wait(self, label, timeout=20, exact=False):
        return super().wait(label, timeout * SLOW, exact)

    def __init__(self, serial):
        super().__init__(serial)
        self.sdk = int(self.shell('getprop ro.build.version.sdk').strip() or 0)

    _size = None

    def nodes(self):
        # adbui.nodes with a hard timeout per dump: under host load uiautomator can hang or crash
        # ("Timeout while connecting UiAutomation"); retry instead of failing the step.
        for _ in range(4):
            try:
                out = self.sh('shell', 'uiautomator dump /sdcard/qa-ui.xml', timeout=45)
            except subprocess.TimeoutExpired:
                self.shell('pkill -f uiautomator', timeout=15)
                continue
            if 'dumped' in out:
                xml = self.sh('exec-out', 'cat', '/sdcard/qa-ui.xml', timeout=30)
                res = []
                for m in NODE.finditer(xml):
                    t, d, c, x1, y1, x2, y2 = m.groups()
                    res.append({'text': unescape(t), 'desc': unescape(d), 'click': c == 'true',
                                'b': (int(x1), int(y1), int(x2), int(y2))})
                return res
            time.sleep(0.5)
        return []

    def shot(self, path):
        try:
            data = subprocess.run([ADB, '-s', self.serial, 'exec-out', 'screencap', '-p'], capture_output=True, timeout=40).stdout
        except subprocess.TimeoutExpired:
            self.shell('pkill -f screencap', timeout=15)
            return
        with open(path, 'wb') as f:
            f.write(data)

    def size(self):
        # cached: under host load `wm size` sometimes returns nothing (IndexError in adbui.size)
        if self._size is None:
            for _ in range(5):
                m = re.findall(r'(\d+)x(\d+)', self.shell('wm size'))
                if m:
                    self._size = (int(m[-1][0]), int(m[-1][1]))
                    break
                time.sleep(1)
        return self._size or (1080, 2400)

    def emu(self, *args):
        return self.sh('emu', *args, timeout=20)

    def is_ours(self):
        return PKG in self.top()

    def kb_shown(self):
        return 'mInputShown=true' in self.shell('dumpsys input_method | grep mInputShown')

    def hide_kb(self):
        if self.kb_shown():
            self.key(4)
            time.sleep(0.6)

    def type(self, s):
        """input text with shell quoting (ASCII only — `input text` can't type emoji/RTL)."""
        s = s.replace(' ', '%s')
        s = "'" + s.replace("'", "'\\''") + "'"
        self.shell('input text ' + s)

    def find_click(self, label, exact=True, nodes=None):
        """Clickable node whose text/desc matches; falls back to any matching node."""
        nodes = nodes if nodes is not None else self.nodes()
        hit = None
        for n in nodes:
            for v in (n['text'], n['desc']):
                if v and ((v == label) if exact else (label.lower() in v.lower())):
                    if n['click']:
                        return n
                    hit = hit or n
        return hit

    def tap_node(self, n):
        x1, y1, x2, y2 = n['b']
        self.tap_xy((x1 + x2) // 2, (y1 + y2) // 2)

    def press(self, label, timeout=20, exact=True, scroll=True):
        """Wait for label (scrolling down if needed), wait until it stops moving, tap it."""
        timeout *= SLOW
        end = time.time() + timeout
        h = self.size()[1]
        swipes = 0
        tries = 0
        while time.time() < end:
            ns = self.nodes()
            tries += 1
            n = self.find_click(label, exact, ns)
            if n and n['b'][3] > n['b'][1] and n['b'][1] < h * 0.93:
                # Animations are off on the QA emulators (animator scale 0), so one dump is enough; a dump costs ~2.5 s.
                time.sleep(0.2)
                self.tap_node(n)
                return n
            # Not (fully) visible on a screen that has content: scroll down. Each swipe buys time (dumps are slow).
            if scroll and swipes < 10 and ns and (n or tries >= 2):
                self.swipe_up(0.35 if n else 0.45)
                swipes += 1
                end += 4
                time.sleep(0.5)
                continue
            time.sleep(0.4)
        raise TimeoutError(f'"{label}" not on screen ({self.top()[-80:]})')

    def wait_scroll(self, label, timeout=25, exact=False, swipes=6):
        """Like wait(), but scrolls down when the screen has content and the label is not there yet."""
        timeout *= SLOW
        end = time.time() + timeout
        n_sw = 0
        tries = 0
        while time.time() < end:
            ns = self.nodes()
            tries += 1
            n = self.find(label, exact, ns)
            if n and n['b'][3] > n['b'][1] and n['b'][3] < self.size()[1] * 0.95:
                return n
            if ns and n_sw < swipes and (n or tries >= 2):
                self.swipe_up(0.4)
                n_sw += 1
                end += 4
                time.sleep(0.5)
                continue
            time.sleep(0.4)
        raise TimeoutError(f'"{label}" not on screen after scrolling ({self.top()[-80:]})')

    def has(self, label, exact=False):
        return self.find(label, exact) is not None

    def wait_any(self, labels, timeout=20):
        timeout *= SLOW
        end = time.time() + timeout
        while time.time() < end:
            ns = self.nodes()
            for lb in labels:
                if self.find(lb, False, ns):
                    return lb
            time.sleep(0.5)
        raise TimeoutError(f'none of {labels} on screen ({self.top()[-80:]})')

    def value_right_of(self, label, nodes=None):
        """Text of the node on the same row as `label`, to its right (Reports rows)."""
        nodes = nodes if nodes is not None else self.nodes()
        lab = next((n for n in nodes if n['text'] == label), None)
        if not lab:
            return None
        cy = (lab['b'][1] + lab['b'][3]) / 2
        best = None
        for n in nodes:
            if n is lab or not n['text']:
                continue
            if n['b'][1] - 30 <= cy <= n['b'][3] + 30 and n['b'][0] > lab['b'][2] - 5:
                if best is None or n['b'][0] > best['b'][0]:
                    best = n
        return best['text'] if best else None

    def value_below(self, label, nodes=None):
        """Text of the node right under `label` in the same column (Home week card)."""
        nodes = nodes if nodes is not None else self.nodes()
        lab = next((n for n in nodes if n['text'] == label), None)
        if not lab:
            return None
        cx = (lab['b'][0] + lab['b'][2]) / 2
        best = None
        for n in nodes:
            if n is lab or not n['text']:
                continue
            if n['b'][0] - 5 <= cx <= n['b'][2] + 5 and n['b'][1] >= lab['b'][3] - 5:
                if best is None or n['b'][1] < best['b'][1]:
                    best = n
        return best['text'] if best else None

    def crash_dialog(self):
        ns = self.nodes()
        for n in ns:
            t = n['text'] or ''
            if ('keeps stopping' in t or "isn't responding" in t or 'has stopped' in t) and 'Sunday' in t:
                return t
        return None

    def screenshot_band(self, path):
        """Capture screen has a blinking caret (no uiautomator dump): find the Save button as the widest band of
        one saturated colour in the lower half of a screenshot. Returns (x, y) centre or None."""
        from PIL import Image
        self.shot(path)
        im = Image.open(path).convert('RGB')
        w, h = im.size
        rows = []
        for y in range(int(h * 0.25), int(h * 0.97), 6):
            c = Counter(im.getpixel((x, y)) for x in range(0, w, 8))
            col, cnt = c.most_common(1)[0]
            sat = max(col) - min(col)
            if cnt > (w / 8) * 0.55 and sat > 50 and max(col) < 250:
                rows.append((y, col))
        if not rows:
            return None
        # group consecutive rows of the same colour; take the tallest group
        groups, cur = [], [rows[0]]
        for r in rows[1:]:
            if r[0] - cur[-1][0] <= 12 and r[1] == cur[-1][1]:
                cur.append(r)
            else:
                groups.append(cur)
                cur = [r]
        groups.append(cur)
        g = max(groups, key=len)
        if len(g) < 5:
            return None
        return w // 2, (g[0][0] + g[-1][0]) // 2

    def dev_tz_offset(self, zone, ts_ms):
        out = self.shell(f'TZ={zone} date -d @{int(ts_ms // 1000)} +%z').strip()
        m = re.match(r'([+-])(\d\d)(\d\d)', out)
        if not m:
            return 0
        s = (int(m.group(2)) * 60 + int(m.group(3))) * 60
        return s if m.group(1) == '+' else -s


# ───────────────────────────────────────── oracle (our own sums) ─────────────────────────────────────────

def local_midnight_ms(phone, zone, y, mo, d):
    """Epoch ms of local midnight y-mo-d in `zone` (offset asked from the device: Python here has no tzdata)."""
    guess = dt.datetime(y, mo, d, tzinfo=dt.timezone.utc).timestamp() * 1000
    off = phone.dev_tz_offset(zone, guess)
    off = phone.dev_tz_offset(zone, guess - off * 1000)
    return int(guess - off * 1000)


def oracle(backup, region, phone, zone, now_ms):
    t = backup['tables']
    E = t['entries']
    cats = {c['id']: c for c in t['categories']}
    off = phone.dev_tz_offset(zone, now_ms)
    local = dt.datetime.fromtimestamp(now_ms / 1000, dt.timezone(dt.timedelta(seconds=off)))
    mon = (local - dt.timedelta(days=local.weekday())).date()
    w0 = local_midnight_ms(phone, zone, mon.year, mon.month, mon.day)
    sun = mon + dt.timedelta(days=7)
    w1 = local_midnight_ms(phone, zone, sun.year, sun.month, sun.day)
    if region == 'US':
        y0 = local.year
        ty0, ty1 = local_midnight_ms(phone, zone, y0, 1, 1), local_midnight_ms(phone, zone, y0 + 1, 1, 1)
        label = f'Tax year {y0}'
    else:
        y0 = local.year if (local.month, local.day) >= (4, 6) else local.year - 1
        ty0, ty1 = local_midnight_ms(phone, zone, y0, 4, 6), local_midnight_ms(phone, zone, y0 + 1, 4, 6)
        label = f'Tax year {y0}/{str(y0 + 1)[2:]}'
    wk = [e for e in E if w0 <= e['occurredAt'] < w1 and e['scope'] == 'work']
    ty = [e for e in E if ty0 <= e['occurredAt'] < ty1]
    inc = sum(e['amountMinor'] for e in ty if e['scope'] == 'work' and e['type'] == 'income')
    exp_all = sum(e['amountMinor'] for e in ty if e['scope'] == 'work' and e['type'] == 'expense')
    covered = sum(e['amountMinor'] for e in ty if e['scope'] == 'work' and e['type'] == 'expense'
                  and e['categoryId'] and cats.get(e['categoryId'], {}).get('vehicleRunningCost'))
    # mileage allowance (domain/mileage.ts DEFAULT_RATES): work trips in the tax year, rate by trip date
    cut = local_midnight_ms(phone, zone, 2026, 4, 6) if region == 'UK' else local_midnight_ms(phone, zone, 2026, 7, 1)
    miles_cum, claim = 0.0, 0.0
    for tr in sorted((x for x in t.get('trips', []) if x.get('scope') == 'work' and ty0 <= x['startedAt'] < ty1),
                     key=lambda x: x['startedAt']):
        mi = tr['distanceM'] / 1609.344
        if region == 'UK':
            hi = 55 if tr['startedAt'] >= cut else 45
            under = max(0.0, min(mi, 10_000 - miles_cum))
            claim += under * hi + (mi - under) * 25
        else:
            claim += mi * (76 if tr['startedAt'] >= cut else 72.5)
        miles_cum += mi
    return {
        'mileageClaim': round(claim),
        'entries': len(E),
        'trips': len(t.get('trips', [])),
        'photos': backup.get('counts', {}).get('photos'),
        'unsorted': sum(1 for e in E if e['categoryId'] is None),
        'weekIn': sum(e['amountMinor'] for e in wk if e['type'] == 'income'),
        'weekOut': sum(e['amountMinor'] for e in wk if e['type'] == 'expense'),
        'taxYearLabel': label,
        'yearIncome': inc,
        'yearExpenseNoMileage': exp_all - covered,
        'personalExcluded': sum(e['amountMinor'] for e in ty if e['scope'] == 'personal'),
        'hasTrips': len(t.get('trips', [])) > 0,
        'weekStart': w0,
        'tzOffsetS': off,
    }


# ───────────────────────────────────────── runner ─────────────────────────────────────────

class Run:
    def __init__(self, phone, persona, out_root, profile):
        self.p = phone
        self.persona = persona
        self.profile = profile
        self.dir = os.path.join(out_root, persona['id'])
        os.makedirs(self.dir, exist_ok=True)
        for f in os.listdir(self.dir):
            if f.endswith('.png') or f.endswith('.txt'):
                os.remove(os.path.join(self.dir, f))
        self.steps = []
        self.ui_notes = []
        self.n = 0
        self.metrics = {}
        self.orig = {}
        self.region = persona['region']  # app region after restore (backup settings win)
        self.backup = None
        self.expect = None
        self.fixture = os.path.join(FIXTURES, persona['id'] + '.sundaysort')

    # ── recording ──
    def shot(self, name):
        self.n += 1
        fn = f'{self.n:02d}-' + re.sub(r'[^A-Za-z0-9_.-]+', '-', name) + '.png'
        try:
            self.p.shot(os.path.join(self.dir, fn))
        except Exception:
            return None
        return fn

    @contextlib.contextmanager
    def step(self, name):
        rec = {'step': name, 'status': '✅', 'notes': [], 'shots': []}
        t0 = time.time()
        self.cur = rec
        try:
            yield rec
        except Skip as e:
            rec['status'] = '⏭'
            rec['reason'] = str(e)
        except Fail as e:
            rec['status'] = '❌'
            rec['reason'] = str(e)
            rec['kind'] = 'app'
            s = self.shot(name + '-fail')
            if s:
                rec['shots'].append(s)
        except TimeoutError as e:
            rec['status'] = '❌'
            rec['reason'] = str(e)
            rec['kind'] = 'ui_timeout'
            s = self.shot(name + '-timeout')
            if s:
                rec['shots'].append(s)
        except Exception as e:  # runner/adb error
            rec['status'] = '❌'
            rec['reason'] = f'{type(e).__name__}: {e}'
            rec['kind'] = 'runner'
            rec['trace'] = traceback.format_exc()[-1500:]
            s = self.shot(name + '-error')
            if s:
                rec['shots'].append(s)
        finally:
            rec['ms'] = int((time.time() - t0) * 1000)
            crash = None
            try:
                crash = self.p.crash_dialog()
            except Exception:
                pass
            if crash:
                rec['status'] = '❌'
                rec['kind'] = 'app'
                rec['reason'] = (rec.get('reason', '') + ' | crash dialog: ' + crash).strip(' |')
            self.steps.append(rec)
            print(f"  {rec['status']} {name} ({rec['ms']} ms) {rec.get('reason', '')[:160]}", flush=True)

    def note(self, s):
        self.cur['notes'].append(s)

    def snap(self, name):
        s = self.shot(name)
        if s:
            self.cur['shots'].append(s)

    def check(self, what, got, want):
        ok = got == want
        self.note(f'{what}: screen={got!r} expected={want!r} {"OK" if ok else "MISMATCH"}')
        if not ok:
            raise Fail(f'{what}: screen {got!r} ≠ expected {want!r}')

    # ── navigation ──
    def ensure_app(self):
        if not self.p.is_ours():
            self.p.shell(f'am start -n {ACTIVITY}')
            time.sleep(2)

    def home(self):
        self.tab('Home')

    def tab(self, name):
        """Back out to the tab bar (Back / Close / system back) and tap tab `name`. One dump per round."""
        p = self.p
        h = p.size()[1]
        for _ in range(7):
            self.ensure_app()
            p.hide_kb()
            ns = p.nodes()
            bar = [n for n in ns if n['click'] and n['b'][1] > h * 0.85]
            tabn = next((n for n in bar if (n['desc'] or n['text']) == name or (n['desc'] or '').startswith(name + ',')), None)
            if tabn and any((n['desc'] or n['text']) == 'Reports' for n in bar):
                p.tap_node(tabn)
                time.sleep(1.0)
                return
            if p.find_click('Back', True, ns):
                p.tap_node(p.find_click('Back', True, ns))
            elif p.find_click('Close', True, ns):
                p.tap_node(p.find_click('Close', True, ns))
            else:
                p.key(4)
            time.sleep(1)
        raise TimeoutError(f'could not get back to the tab bar ({name})')

    def settings(self):
        self.home()
        self.p.press('Settings', scroll=False)
        self.p.wait('REGION & TAX', 10)

    # ── profile ──
    def set_profile(self):
        p, per = self.p, self.persona
        prof = PROFILES.get(self.profile, {})
        self.orig = p.defaults
        cmds = []
        if 'size' in prof:
            cmds.append(f"wm size {prof['size']}")
        if 'density' in prof:
            cmds.append(f"wm density {prof['density']}")
        cmds.append(f"settings put system font_scale {per['fontScale']}")
        cmds.append(f"cmd uimode night {'yes' if per['dark'] else 'no'}")
        for c in cmds:
            p.shell(c)
        p._size = None
        self.set_tz(per['timeZone'])
        speed, delay = NETWORK[per['network']]
        p.emu('network', 'speed', speed)
        p.emu('network', 'delay', delay)
        if per['network'] == 'airplane':
            self.airplane(True)
        self.note(f"profile {self.profile}: {cmds}; tz={per['timeZone']}; network={per['network']} ({speed}/{delay})")
        self.note('device now: ' + p.shell('date').strip() + ' · ' + p.shell('wm size').strip().replace('\n', ' ') +
                  ' · ' + p.shell('wm density').strip().replace('\n', ' '))

    def set_tz(self, zone):
        # `cmd time_zone_detector suggest_manual_time_zone` needs SUGGEST_MANUAL_TIME_AND_ZONE (shell lacks it on the
        # Play API 37 image); AlarmManager.setTimeZone (service call alarm 3) works for shell on every API.
        p = self.p
        if p.sdk >= 30:
            p.shell('cmd time_zone_detector set_auto_detection_enabled false')
        p.shell('settings put global auto_time_zone 0')
        p.shell(f'service call alarm 3 s16 {zone}')
        time.sleep(0.5)
        got = p.shell('getprop persist.sys.timezone').strip()
        if got != zone:
            raise Fail(f'time zone not applied: {got} ≠ {zone}')

    def airplane(self, on):
        p = self.p
        if p.sdk >= 28:
            p.shell(f"cmd connectivity airplane-mode {'enable' if on else 'disable'}")
        else:
            p.shell(f"settings put global airplane_mode_on {1 if on else 0}")
            p.shell('am broadcast -a android.intent.action.AIRPLANE_MODE')
        time.sleep(1)

    def set_clock(self, epoch_ms):
        """Manual device clock. `cmd time_detector suggest_manual_time` needs a permission shell lacks on API 37;
        AlarmManager.setTime (service call alarm 2) works once auto time is off."""
        p = self.p
        p.shell('settings put global auto_time 0')
        if p.sdk >= 30:
            p.shell('cmd time_detector set_auto_detection_enabled false')
        p.shell(f'service call alarm 2 i64 {int(epoch_ms)}')
        time.sleep(0.5)

    def clock_auto(self):
        p = self.p
        if self.orig.get('auto_time', '1') == '1':
            p.shell('settings put global auto_time 1')
            if p.sdk >= 30:
                p.shell('cmd time_detector set_auto_detection_enabled true')
        time.sleep(1)

    def reset_profile(self):
        p, o = self.p, self.orig
        p.shell('wm size reset')
        p.shell('wm density reset')
        p._size = None
        p.shell(f"settings put system font_scale {o.get('font_scale') or '1.0'}")
        p.shell('cmd uimode night ' + ('yes' if 'yes' in o.get('night', '') else 'no'))
        self.airplane(False)
        p.emu('network', 'speed', 'full')
        p.emu('network', 'delay', 'none')
        self.clock_auto()
        if o.get('tz'):
            p.shell(f"service call alarm 3 s16 {o['tz']}")
        if o.get('tz_auto') == '1':
            p.shell('settings put global auto_time_zone 1')
            if p.sdk >= 30:
                p.shell('cmd time_zone_detector set_auto_detection_enabled true')
        p.shell('rm -f /sdcard/Download/qa-fill.bin')
        self.note('reset: ' + ' | '.join([
            p.shell('wm size').strip().replace('\n', ' '), p.shell('wm density').strip().replace('\n', ' '),
            'font ' + p.shell('settings get system font_scale').strip(), p.shell('cmd uimode night').strip(),
            'tz ' + p.shell('getprop persist.sys.timezone').strip(),
            'airplane ' + p.shell('settings get global airplane_mode_on').strip()]))

    # ── steps ──
    def prepare(self):
        p = self.p
        out = p.shell(f'pm clear {PKG}').strip()
        if 'Success' not in out:
            raise Fail('pm clear: ' + out)
        p.shell('rm -f /sdcard/Download/*.sundaysort')
        p.sh('logcat', '-b', 'all', '-c')
        self.log_since = p.shell("date '+%m-%d %H:%M:%S'").strip()
        if os.path.exists(self.fixture):
            with zipfile.ZipFile(self.fixture) as z:
                self.backup = json.loads(z.read('backup.json'))
            s = self.backup['tables']['settings']
            reg = next((json.loads(x['value']) for x in s if x['key'] == 'region'), None)
            if reg:
                self.region = reg
            if self.backup['counts']['entries'] > 0:
                r = p.sh('push', self.fixture, f"/sdcard/Download/{self.persona['id']}.sundaysort")
                p.shell(f"am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Download/{self.persona['id']}.sundaysort")
                self.note('pushed fixture: ' + r.strip()[-80:])
            self.note(f"fixture counts {self.backup['counts']}, region in backup={reg}")
        else:
            self.note('no fixture file')

    def cold_start(self):
        p = self.p
        p.shell(f'am force-stop {PKG}')
        out = p.shell(f'am start -W -n {ACTIVITY}', timeout=60)
        m = re.search(r'TotalTime: (\d+)', out)
        self.metrics['coldStartMs'] = int(m.group(1)) if m else None
        self.note(f'TotalTime={self.metrics["coldStartMs"]} ms')
        p.wait('Get started', 30)
        self.snap('welcome')

    def onboarding(self):
        p, per = self.p, self.persona
        p.press('Get started')
        p.wait('Where do you file', 15)
        p.press('United Kingdom' if per['region'] == 'UK' else 'United States', exact=False)
        time.sleep(0.5)
        self.snap('region')
        p.press('Continue')
        p.wait('How do you claim', 15)
        p.press('Continue')
        p.wait('Your categories are ready', 15)
        self.snap('categories')
        p.press('Looks good')
        p.wait('Continue free', 15)
        self.snap('free-pro')
        p.press('Continue free')
        p.wait('When do you want to sort', 15)
        p.press('Not now')
        p.wait('Reports', 15)
        self.snap('home-new')
        tax = p.find('Tax year', False)
        self.note('home header: ' + (tax['text'] if tax else '?'))

    def pick_file_in_picker(self, name):
        p = self.p
        end = time.time() + 25
        while time.time() < end:
            if 'documentsui' not in p.top():
                time.sleep(0.5)
                continue
            ns = p.nodes()
            n = p.find(name, True, ns)
            if n:
                p.tap_node(n)
                return
            sr = p.find_click('Show roots', True, ns)
            if sr:
                p.tap_node(sr)
                time.sleep(1)
                d = p.find('Downloads', True)
                if d:
                    p.tap_node(d)
                    time.sleep(1.5)
                    continue
            time.sleep(0.8)
        raise TimeoutError(f'{name} not in file picker')

    def restore(self, fname=None):
        p, ex = self.p, self.expect
        fname = fname or self.persona['id'] + '.sundaysort'
        self.settings()
        p.press('Backup & restore')
        p.press('Restore from backup')
        self.pick_file_in_picker(fname)
        p.wait("Replace this phone's data", 30)
        ns = p.nodes()
        self.snap('restore-preview')
        lab = {n['text']: n for n in ns}
        for key in ('entries', 'trips', 'photos'):
            v = None
            node = lab.get(key) or lab.get(key[:-1])
            if node:
                above = [n for n in ns if n['text'] and n['b'][3] <= node['b'][1] + 5 and n['b'][0] <= (node['b'][0] + node['b'][2]) / 2 <= n['b'][2]]
                above.sort(key=lambda n: -n['b'][3])
                v = above[0]['text'] if above else None
            if ex and v is not None:
                want = {'entries': ex['entries'], 'trips': ex['trips'], 'photos': ex['photos']}[key]
                self.check(f'preview {key}', v.replace(',', ''), str(want))
        p.press("Replace this phone's data")
        p.wait('Replace everything', 10)
        body = p.find('entries', False)
        self.note('dialog: ' + (body['text'] if body else '?'))
        t0 = time.time()
        p.press('Restore')
        # Big files take a while; wait for Settings (we land back there) or an error.
        got = p.wait_any(['REGION & TAX', 'YOUR DATA', 'SECURITY', "Couldn't", 'went wrong', 'failed'], timeout=240)
        self.metrics['restoreMs'] = int((time.time() - t0) * 1000)
        self.note(f'restore finished in {self.metrics["restoreMs"]} ms → {got}')
        if got in ("Couldn't", 'went wrong', 'failed'):
            raise Fail('restore error on screen')
        self.snap('after-restore')

    def home_read(self, shot=None):
        """Home values, scrolling down if the card is below the fold (big font / small dp). Each value is read from
        the dump in which it is visible. Returns dict(tax, sorted_line, in, out)."""
        p = self.p
        self.home()
        time.sleep(0.8)
        got = {'tax': None, 'sorted_line': None, 'in': None, 'out': None}
        for k in range(5):
            ns = p.nodes()
            if not ns:
                time.sleep(2)
                continue
            if k == 0 and shot:
                self.snap(shot)
            if got['tax'] is None:
                t = p.find('Tax year', False, ns)
                got['tax'] = t['text'] if t else None
            if got['sorted_line'] is None:
                got['sorted_line'] = next((n['text'] for n in ns if re.search(r'to sort$|All sorted', n['text'] or '')), None)
            for lab in ('In', 'Out'):
                if got[lab.lower()] is None and p.find(lab, True, ns):
                    got[lab.lower()] = parse_money(p.value_below(lab, ns))
            empty = p.find('Your first entry', False, ns)
            if got['out'] is not None and (got['sorted_line'] or empty):
                break
            p.swipe_up(0.3)
            time.sleep(0.6)
        return got

    def verify_numbers(self):
        p, ex = self.p, self.expect
        h = self.home_read('home')
        sorted_line = h['sorted_line']
        if ex.get('entries', 0) == 0:
            want = None  # empty Home shows "Your first entry takes 10 seconds." instead
        elif ex['unsorted'] == 0:
            want = 'All sorted ✓'
        elif ex['unsorted'] == 1:
            want = '1 entry to sort'
        else:
            want = f"{ex['unsorted']:,} entries to sort"
        errs = []
        try:
            self.check('home to-sort', sorted_line, want)
        except Fail as e:
            errs.append(str(e))
        for lab, key in (('In', 'weekIn'), ('Out', 'weekOut')):
            try:
                self.check(f'home week {lab}', h[lab.lower()], ex[key])
            except Fail as e:
                errs.append(str(e))
        try:
            self.check('home tax year', h['tax'], ex['taxYearLabel'])
        except Fail as e:
            errs.append(str(e))
        # Reports (Year)
        self.tab('Reports')
        got = p.wait_any(['No data for this period', 'Income', 'Year'], 20)
        if got != 'No data for this period':
            got = 'Income' if p.wait_scroll('Income', exact=True) else got
            ns = p.nodes()
            if not p.find('Expenses', True, ns) or (ex['personalExcluded'] and not any('Personal entries are excluded' in (n['text'] or '') for n in ns)):
                p.swipe_up(0.25)
                time.sleep(0.6)
                ns = ns + p.nodes()
        else:
            ns = p.nodes()
        self.snap('reports')
        if got == 'No data for this period':
            self.note('Reports: No data for this period')
            if ex['yearIncome'] or ex['yearExpenseNoMileage'] or ex.get('personalExcluded'):
                errs.append('Reports shows "No data" but the tax year has entries')
            if errs:
                raise Fail('; '.join(errs))
            return
        try:
            self.check('reports income', parse_money(p.value_right_of('Income', ns)), ex['yearIncome'])
        except Fail as e:
            errs.append(str(e))
        exp = parse_money(p.value_right_of('Expenses', ns))
        if ex['hasTrips']:
            want = ex['yearExpenseNoMileage'] + ex.get('mileageClaim', 0)
            self.note(f"reports expenses screen={exp} expected≈{want} (non-mileage {ex['yearExpenseNoMileage']} + mileage {ex.get('mileageClaim')}, ±0.2% rounding)")
            if exp is None or abs(exp - want) > max(3, want * 0.002):
                errs.append(f"reports expenses {exp} ≠ expected {want} (incl. mileage)")
        else:
            try:
                self.check('reports expenses', exp, ex['yearExpenseNoMileage'])
            except Fail as e:
                errs.append(str(e))
        pe = next((n['text'] for n in ns if 'Personal entries are excluded' in (n['text'] or '')), None)
        if ex['personalExcluded']:
            try:
                self.check('reports personal excluded', parse_money(pe), ex['personalExcluded'])
            except Fail as e:
                errs.append(str(e))
        if errs:
            raise Fail('; '.join(errs))

    def tour(self):
        p = self.p
        bad = []
        for t in ('Entries', 'Sort', 'Miles', 'Reports', 'Home'):
            self.tab(t)
            time.sleep(1)
            self.snap('tab-' + t.lower())
            if not p.is_ours():
                bad.append(t)
        # entry detail
        self.tab('Entries')
        ns = p.nodes()
        row = next((n for n in ns if n['click'] and re.search(r', [+−-][£$]', n['desc'] or n['text'] or '')), None)
        if row:
            p.tap_node(row)
            p.wait_any(['Save changes', 'Date & time'], 10)
            self.snap('entry-detail')
            self.home()
        else:
            self.note('no entry row to open')
        # sort list
        self.tab('Sort')
        if p.find_click('List view', True):
            p.press('List view', scroll=False)
            time.sleep(1.5)
            self.snap('sort-list')
            self.home()
        else:
            self.note('Sort: no List view (nothing to sort)')
        # settings screens
        self.settings()
        self.snap('settings')
        for screen, marker in (('Categories', None), ('Backup & restore', 'Restore from backup'), ('Export', 'CSV')):
            self.settings()
            p.press(screen, exact=False if screen == 'Categories' else True)
            time.sleep(1.5)
            if marker:
                p.wait_scroll(marker, 20)
            self.snap(screen.split(' ')[0].lower())
        self.home()
        if bad:
            raise Fail('left the app on tabs ' + ','.join(bad))

    # ── capture helpers ──
    def capture(self, kind, amount, save_taps=1, kill_after=False):
        """Quick capture from Home: amount typed on the number pad, Save found by colour (no dump on this screen)."""
        p = self.p
        self.home()
        p.press('New expense' if kind == 'expense' else 'New income', scroll=False)
        tmp = os.path.join(self.dir, '_cap.png')
        end = time.time() + 10
        while time.time() < end:
            if p.kb_shown():
                break
            time.sleep(0.4)
        time.sleep(0.6)
        # Cash-register keypad (calc.ts): digits only, last two are pence/cents — "7.5" must be typed as 750.
        p.type(str(round(float(amount) * 100)))
        time.sleep(0.6)
        xy = None
        for _ in range(5):
            xy = p.screenshot_band(tmp)
            if xy:
                break
            time.sleep(0.5)
        if not xy:
            # Save can sit under the keyboard (small dp + big font): hide the keyboard like a user would.
            if p.kb_shown():
                p.key(4)
                time.sleep(1)
            xy = p.screenshot_band(tmp)
            if xy:
                self.ui_notes.append('capture: Save not visible with the keyboard open; found after hiding keyboard')
                self.note(self.ui_notes[-1])
        if not xy:
            raise TimeoutError('Save button not found on capture screen')
        if save_taps == 1:
            p.tap_xy(*xy)
        else:
            p.shell(' ; '.join([f'input tap {xy[0]} {xy[1]}'] * save_taps))
        if kill_after:
            p.shell(f'am force-stop {PKG}')
        time.sleep(1.2)
        try:
            os.remove(tmp)
        except OSError:
            pass

    def home_counts(self):
        """(unsorted on Home, week out, week in)"""
        h = self.home_read()
        line = h['sorted_line'] or ''
        m = re.match(r'([\d,]+) entr', line)
        uns = int(m.group(1).replace(',', '')) if m else (0 if ('All sorted' in line or not line) else None)
        return uns, h['out'], h['in']

    # ── behaviours ──
    def journey(self):
        b = self.persona['behaviour']
        fn = getattr(self, 'j_' + b, None)
        if not fn:
            raise Skip(f'no journey for {b}')
        net_drop = self.persona['network'] == 'drops_midway'
        fn(net_drop)

    def mid_drop(self, flag):
        if flag:
            self.airplane(True)
            self.note('network dropped (airplane mode on) mid-journey')

    def j_quick_capture_only(self, drop):
        u0, o0, i0 = self.home_counts()
        self.capture('expense', '12.34')
        self.mid_drop(drop)
        self.capture('expense', '7.5')
        self.capture('income', '120')
        u1, o1, i1 = self.home_counts()
        self.snap('after-capture')
        self.check('to sort +3', u1, (u0 or 0) + 3)
        self.check('week out +19.84', o1, (o0 or 0) + 1984)
        self.check('week in +120', i1, (i0 or 0) + 12000)

    def j_weekly_sorter(self, drop):
        self.capture('expense', '23.45')
        self.capture('income', '88')
        self.mid_drop(drop)
        p = self.p
        self.tab('Sort')
        sorted_n = 0
        for _ in range(6):
            ns = p.nodes()
            if p.find('Week sorted', False, ns) or p.find('Nothing to sort', False, ns):
                break
            chip = None
            mu = p.find('MOST USED', True, ns)
            if mu:
                cands = [n for n in ns if n['click'] and n['b'][1] > mu['b'][3] and n['text'] not in ('More…',) and (n['desc'] or n['text']) not in ('More…', 'Work', 'Personal')]
                cands.sort(key=lambda n: (n['b'][1], n['b'][0]))
                chip = cands[0] if cands else None
            if not chip:
                raise TimeoutError('no category chip on sort card')
            self.note('sort → ' + (chip['desc'] or chip['text']))
            p.tap_node(chip)
            sorted_n += 1
            time.sleep(1.5)
        self.snap('sort-done')
        if not p.find('Week sorted', False):
            if p.find('Nothing to sort', False):
                self.note('Sort shows Nothing to sort')
            else:
                raise Fail('week not sorted after tapping categories')
        if p.find_click('Done', True):
            p.press('Done', scroll=False)
        u, _, _ = self.home_counts()
        self.check('unsorted after sorting', u, self.expect['unsorted'] if self.expect else 0)

    def j_never_sorts(self, drop):
        p = self.p
        self.mid_drop(drop)
        for i in range(3):
            self.capture('expense', f'{i + 1}.99')
        self.tab('Sort')
        ns = p.nodes()
        prog = next((n['text'] for n in ns if ' sorted' in (n['text'] or '') and ' of ' in (n['text'] or '')), None)
        self.note(f'Sort progress: {prog}')
        self.snap('sort-week')
        if prog and not prog.startswith('0 of 3'):
            raise Fail(f'expected "0 of 3 sorted" for this week, got {prog}')
        p.press('List view', scroll=False)
        time.sleep(1.5)
        self.snap('sort-list')
        self.home()

    def j_split_merge_heavy(self, drop):
        p = self.p
        self.capture('expense', '40')
        self.capture('expense', '10')
        self.mid_drop(drop)
        u0, o0, _ = self.home_counts()
        self.tab('Sort')
        p.press('Split', scroll=False)
        p.wait('Split into parts', 10)
        p.press('Part 1 category', exact=False)
        time.sleep(1)
        p.press('Fuel', scroll=False)
        time.sleep(0.8)
        p.press('Part 2 category', exact=False)
        time.sleep(1)
        p.press('Phone & data', scroll=False)
        time.sleep(0.8)
        self.snap('split')
        p.press('Split & sort')
        time.sleep(2)
        self.snap('after-split')
        # Merge: the remaining card + pick the other unsorted entry
        if p.find_click('Merge', True):
            p.press('Merge', scroll=False)
            time.sleep(1.5)
            self.snap('merge')
            self.note('merge screen: ' + ' | '.join(p.texts()[:12]))
            p.key(4)
            time.sleep(1)
        u1, o1, _ = self.home_counts()
        self.check('week out unchanged by split', o1, o0)
        self.note(f'unsorted {u0} → {u1}')

    def j_gps_trips(self, drop):
        p = self.p
        self.tab('Miles')
        p.press('Start trip', scroll=False)
        lb = p.wait_any(['Allow location', 'RECORDING'], 10)
        if lb == 'Allow location':
            p.press('Allow location')
            p.press('While using the app', exact=False)
            lb2 = p.wait_any(['Step 2 of 2', 'RECORDING', 'notifications'], 10)
            if lb2 == 'Step 2 of 2':
                p.press('Not now')
            lb3 = p.wait_any(['notifications?', 'RECORDING'], 10)
            if lb3 == 'notifications?':
                p.press('Allow')
        p.wait('RECORDING', 15)
        self.mid_drop(drop)
        lat0, lng = 51.5074 if self.region == 'UK' else 40.7128, -0.1278 if self.region == 'UK' else -74.0060
        # ~3.3 km north at ~30 m/s, one fix every 6 s (fused provider drops faster/closer fixes)
        for i in range(18):
            p.emu('geo', 'fix', str(lng), f'{lat0 + i * 0.0016:.6f}', '10', '8', '58')
            time.sleep(6)
        ns = p.nodes()
        dist = next((n['text'] for n in ns if re.fullmatch(r'\d+\.\d', n['text'] or '')), None)
        self.snap('trip-running')
        self.note(f'distance on active trip: {dist}')
        p.press('End trip', scroll=False)
        p.wait('Trip saved', 15)
        saved = p.find('Trip saved', False)
        self.note('end: ' + saved['text'])
        self.snap('trip-end')
        p.press('Save')
        time.sleep(1.5)
        m = re.search(r'([\d.]+) (mi|km)', saved['text'])
        if not m or float(m.group(1)) < 1.0:
            raise Fail(f'GPS trip of ~3.3 km recorded as "{saved["text"]}"')

    def j_manual_miles_odometer(self, drop):
        p = self.p
        self.tab('Miles')
        p.press('Add manually', scroll=False)
        p.wait('Start reading', 10)
        p.press('e.g. 48,210', exact=False)
        time.sleep(0.6)
        p.type('48210')
        p.hide_kb()
        p.press('e.g. 48,338', exact=False)
        time.sleep(0.6)
        p.type('48338')
        p.hide_kb()
        self.mid_drop(drop)
        dist = p.value_right_of('Distance')
        self.snap('odometer')
        self.check('distance from odometer', (dist or '').replace(',', ''), '128.0 mi' if self.region == 'US' or True else '')
        p.press('Save trip')
        p.wait('Trip saved', 10)
        self.snap('saved')

    def j_year_end_export(self, drop):
        p = self.p
        self.mid_drop(drop)
        self.tab('Reports')
        p.press('Export')
        p.wait('CSV – all entries', 10)
        self.snap('export')
        p.press('Export 1 file', exact=False)
        t0 = time.time()
        lb = p.wait_any(['Sharing 1 file', "Couldn't", 'went wrong'], 60)
        self.metrics['exportCsvMs'] = int((time.time() - t0) * 1000)
        fn = next((n['text'] for n in p.nodes() if (n['text'] or '').endswith('.csv')), None)
        self.snap('share-sheet')
        self.note(f'share sheet after {self.metrics["exportCsvMs"]} ms, file {fn}')
        p.key(4)
        time.sleep(1.5)
        if lb != 'Sharing 1 file':
            raise Fail('export failed: ' + lb)
        if not fn or not re.match(r'SundaySort-entries-\d{4}(-\d\d)?\.csv', fn):
            raise Fail(f'unexpected export file name {fn}')
        # PDF is Pro: should show the Pro gate, not crash
        self.tab('Reports')
        p.press('Export')
        p.press('PDF report', exact=False)
        time.sleep(1.5)
        self.snap('pdf-pro-gate')
        self.note('PDF tap → ' + ' | '.join(p.texts()[:8]))
        self.home()
        self.note('CSV content check ⏭: share sheet has no save-to-file target on this emulator (no account)')

    def j_backup_restore_other_phone(self, drop):
        p = self.p
        self.mid_drop(drop)
        # second phone = same app after a wipe: restore the same file again and check counts survive a cold start
        p.shell(f'am force-stop {PKG}')
        p.shell(f'am start -W -n {ACTIVITY}')
        p.wait('Reports', 20)
        u, o, i = self.home_counts()
        self.check('unsorted after cold restart', u, self.expect['unsorted'])
        self.restore()
        u, o, i = self.home_counts()
        self.check('unsorted after second restore', u, self.expect['unsorted'])
        self.check('week out after second restore', o, self.expect['weekOut'])

    def j_pro_trial(self, drop):
        p = self.p
        self.mid_drop(drop)
        self.settings()
        p.press('Sunday Sort Pro', exact=False, scroll=False)
        time.sleep(3)
        self.snap('pro')
        txt = p.texts()
        self.note('Pro screen: ' + ' | '.join(txt[:14]))
        if not p.is_ours():
            raise Fail('Pro screen left the app')
        self.home()

    def j_wipe_all(self, drop):
        p = self.p
        self.capture('expense', '9.99')
        self.capture('income', '50')
        self.mid_drop(drop)
        self.settings()
        p.press('Delete all data')
        p.wait('Delete all data?', 10)
        p.press('Continue')
        p.wait('Type DELETE', 10)
        ns = p.nodes()
        edit = next((n for n in ns if n['click'] and n['b'][1] > (p.find('Type DELETE', False, ns)['b'][3])), None)
        if edit:
            p.tap_node(edit)
            time.sleep(0.5)
        p.type('DELETE')
        p.hide_kb()
        self.snap('delete-confirm')
        btns = [n for n in p.nodes() if n['click'] and (n['text'] == 'Delete all data' or n['desc'] == 'Delete all data')]
        btns.sort(key=lambda n: -n['b'][1])
        if not btns:
            raise TimeoutError('Delete all data button in dialog')
        p.tap_node(btns[0])
        time.sleep(2.5)
        self.snap('after-delete')
        lb = p.wait_any(['Get started', 'Reports'], 20)
        self.note('after delete: ' + lb)
        if lb == 'Reports':
            u, o, i = self.home_counts()
            self.check('home after wipe: out', o, 0)
            self.check('home after wipe: unsorted', u, 0)
        self.tab('Entries') if lb == 'Reports' else None

    def j_region_switch(self, drop):
        p = self.p
        self.mid_drop(drop)
        self.settings()
        cur = 'United Kingdom' if self.region == 'UK' else 'United States'
        new = 'United States' if self.region == 'UK' else 'United Kingdom'
        p.press('Region', exact=False, scroll=False)
        time.sleep(1)
        p.press(new, exact=True, scroll=False)
        time.sleep(1.5)
        self.snap('region-dialog')
        self.note('dialog: ' + ' | '.join(p.texts()[:12]))
        ns = p.nodes()
        btn = next((n for n in ns if n['click'] and (n['text'] or n['desc']) in ('Switch', 'Change', 'Switch region', 'Change region', 'Continue', 'Keep amounts', 'Convert')), None)
        if not btn:
            cands = [n for n in ns if n['click'] and (n['text'] or n['desc']) not in ('Cancel', 'Close')]
            cands.sort(key=lambda n: -n['b'][1])
            btn = cands[0] if cands else None
        if not btn:
            raise TimeoutError('no confirm button in region dialog')
        self.note('confirm: ' + (btn['text'] or btn['desc']))
        p.tap_node(btn)
        time.sleep(2)
        if p.kb_shown():
            p.type('1.27' if self.region == 'UK' else '0.79')
            p.hide_kb()
            time.sleep(0.5)
            ns = p.nodes()
            btn = next((n for n in ns if n['click'] and (n['text'] or n['desc']) not in ('Cancel', 'Close', 'Back')), None)
            cands = sorted([n for n in ns if n['click'] and (n['text'] or n['desc']) not in ('Cancel', 'Close', 'Back')], key=lambda n: -n['b'][1])
            if cands:
                p.tap_node(cands[0])
                time.sleep(2)
        self.snap('after-switch')
        got = p.value_right_of('Region')
        self.note(f'region row: {got}')
        if p.find(new, True) is None:
            raise Fail(f'region still {cur} after switching')
        self.region = 'US' if self.region == 'UK' else 'UK'
        self.home()
        self.snap('home-new-region')
        tax = p.find('Tax year', False)
        self.note('home header: ' + (tax['text'] if tax else '?'))

    def j_double_tap_save(self, drop):
        u0, o0, _ = self.home_counts()
        self.mid_drop(drop)
        self.capture('expense', '5.55', save_taps=2)
        u1, o1, _ = self.home_counts()
        self.snap('after-double-tap')
        self.check('unsorted +1 after double tap', u1, (u0 or 0) + 1)
        self.check('week out +5.55', o1, (o0 or 0) + 555)

    def j_kill_mid_save(self, drop):
        p = self.p
        u0, o0, _ = self.home_counts()
        self.mid_drop(drop)
        self.capture('expense', '6.66', kill_after=True)
        p.shell(f'am start -W -n {ACTIVITY}')
        p.wait('Reports', 20)
        u1, o1, _ = self.home_counts()
        self.snap('after-kill')
        self.check('entry kept after force-stop right after Save', u1, (u0 or 0) + 1)
        self.check('week out +6.66', o1, (o0 or 0) + 666)

    def j_revoke_permissions(self, drop):
        p = self.p
        self.tab('Miles')
        p.shell(f'pm grant {PKG} android.permission.ACCESS_FINE_LOCATION')
        p.shell(f'pm grant {PKG} android.permission.ACCESS_COARSE_LOCATION')
        p.shell(f'pm grant {PKG} android.permission.POST_NOTIFICATIONS')
        p.press('Start trip', scroll=False)
        lb = p.wait_any(['Step 2 of 2', 'RECORDING', 'notifications?'], 10)
        if lb == 'Step 2 of 2':
            p.press('Not now')
        p.wait('RECORDING', 15)
        self.mid_drop(drop)
        lat0 = 51.5074 if self.region == 'UK' else 40.7128
        lng = -0.1278 if self.region == 'UK' else -74.0060
        for i in range(4):
            p.emu('geo', 'fix', str(lng), f'{lat0 + i * 0.0016:.6f}', '10', '8', '58')
            time.sleep(6)
        self.snap('trip-before-revoke')
        # Revoking a runtime permission kills the app process (Android behaviour).
        p.shell(f'pm revoke {PKG} android.permission.ACCESS_FINE_LOCATION')
        p.shell(f'pm revoke {PKG} android.permission.ACCESS_COARSE_LOCATION')
        p.shell(f'pm revoke {PKG} android.permission.POST_NOTIFICATIONS')
        time.sleep(2)
        p.shell(f'am start -W -n {ACTIVITY}')
        time.sleep(3)
        self.snap('after-revoke')
        txt = p.texts()
        self.note('after revoke: ' + ' | '.join(txt[:16]))
        lb = p.wait_any(['RECORDING', 'Paused', 'paused', 'Trip', 'Reports', 'location'], 20)
        self.note(f'app shows: {lb}')
        # end whatever is running
        self.home()
        ns = p.nodes()
        if p.find_click('End trip', True, ns):
            p.press('End trip', scroll=False)
            time.sleep(2)
            self.snap('end-after-revoke')
            if p.find_click('Save', True):
                p.press('Save', scroll=False)
            elif p.find_click('Discard trip', True):
                p.press('Discard trip', scroll=False)
        self.home()

    def j_low_storage(self, drop):
        p = self.p
        self.mid_drop(drop)
        df = p.shell('df /data | tail -1').split()
        free_kb = int(df[3]) if len(df) > 3 and df[3].isdigit() else None
        self.note(f'/data free before: {free_kb} KB')
        if not free_kb:
            raise Skip('cannot read free space')
        fill_kb = free_kb - 30 * 1024
        p.shell(f'fallocate -l {fill_kb}k /sdcard/Download/qa-fill.bin', timeout=120)
        self.note('/data after fill: ' + p.shell('df -h /data | tail -1').strip())
        try:
            self.capture('expense', '3.21')
            u, o, _ = self.home_counts()
            self.note(f'capture with ~30 MB free: unsorted={u} out={o}')
            self.settings()
            p.press('Backup & restore')
            p.press('Back up now', exact=False)
            time.sleep(3)
            self.snap('backup-low-storage')
            txt = p.texts()
            self.note('backup with ~30 MB free: ' + ' | '.join(txt[:10]))
            if 'intentresolver' in p.top() or 'Sharing' in ' '.join(txt):
                p.key(4)
                time.sleep(1)
        finally:
            p.shell('rm -f /sdcard/Download/qa-fill.bin')
        self.home()

    def j_clock_tax_boundary(self, drop):
        p = self.p
        self.mid_drop(drop)
        zone = self.persona['timeZone']
        # one minute before the tax-year boundary (UK: 6 Apr 00:00; US: 1 Jan 00:00) of the coming year
        now = int(p.shell('date +%s').strip()) * 1000
        y = dt.datetime.fromtimestamp(now / 1000).year
        if self.region == 'UK':
            b = local_midnight_ms(p, zone, y + 1, 4, 6)
        else:
            b = local_midnight_ms(p, zone, y + 1, 1, 1)
        self.set_clock(b - 90_000)
        self.note('device clock set to ' + p.shell('date').strip())
        try:
            p.shell(f'am force-stop {PKG}')
            p.shell(f'am start -W -n {ACTIVITY}')
            p.wait('Reports', 20)
            hdr0 = p.find('Tax year', False)
            self.snap('before-boundary')
            self.capture('expense', '1.11')
            time.sleep(max(0, (b + 20_000) - int(p.shell('date +%s').strip()) * 1000) / 1000)
            self.note('after boundary: ' + p.shell('date').strip())
            self.home()
            time.sleep(1)
            hdr1 = p.find('Tax year', False)
            self.snap('after-boundary')
            self.capture('expense', '2.22')
            self.note(f"header before={hdr0 and hdr0['text']} after={hdr1 and hdr1['text']}")
            if hdr0 and hdr1 and hdr0['text'] == hdr1['text']:
                p.shell(f'am force-stop {PKG}')
                p.shell(f'am start -W -n {ACTIVITY}')
                p.wait('Reports', 20)
                hdr2 = p.find('Tax year', False)
                self.note(f"after restart header={hdr2 and hdr2['text']}")
                if hdr2 and hdr2['text'] != hdr0['text']:
                    raise Fail(f"Home tax year stayed {hdr0['text']} after midnight boundary until app restart")
                raise Fail(f"Home tax year still {hdr0['text']} after the boundary")
            self.tab('Reports')
            time.sleep(1)
            self.snap('reports-after-boundary')
            self.note('reports: ' + ' | '.join(p.texts()[:12]))
        finally:
            self.clock_auto()
            self.note('clock back: ' + p.shell('date').strip())

    def j_weird_text(self, drop):
        p = self.p
        self.mid_drop(drop)
        self.capture('expense', '4.44')
        self.tab('Entries')
        ns = p.nodes()
        row = next((n for n in ns if n['click'] and (n['desc'] or '').startswith('No note, ')), None)
        if not row:
            raise TimeoutError('new entry row (No note) not found')
        p.tap_node(row)
        p.press('Add a note', exact=False)
        time.sleep(0.8)
        weird = '=HYPERLINK("http://x.example","click") 100% \\ back'
        p.type(weird)
        time.sleep(0.5)
        p.hide_kb()
        self.snap('weird-note')
        p.press('Save changes')
        time.sleep(1.5)
        self.home()
        self.tab('Entries')
        ns = p.nodes()
        hit = next((n for n in ns if 'HYPERLINK' in (n['text'] or '')), None)
        self.snap('entries-weird')
        if not hit:
            raise Fail('weird note not shown in Entries list')
        self.note('list shows: ' + hit['text'])
        if hit['text'].strip() != weird.strip():
            raise Fail(f'note changed: {hit["text"]!r} ≠ {weird!r}')
        # search with quote/percent characters must not crash or match everything
        p.press('Search notes or amounts', exact=False, scroll=False)
        time.sleep(0.5)
        p.type('100%')
        time.sleep(1.5)
        p.hide_kb()
        ns = p.nodes()
        rows = [n for n in ns if n['click'] and re.search(r', [+−-][£$]', n['desc'] or '')]
        self.snap('search-percent')
        self.note(f'search "100%" rows: {len(rows)}')
        if len(rows) != 1:
            raise Fail(f'search "100%" shows {len(rows)} rows, expected 1')

    def j_app_lock(self, drop):
        raise Skip('App lock needs a screen lock + fingerprint on the emulator (security setting) — waiting for coordinator')

    def j_recurring_rules(self, drop):
        p = self.p
        self.mid_drop(drop)
        self.settings()
        p.press('Recurring entries', exact=False)
        time.sleep(2)
        self.snap('recurring')
        self.note('Recurring (free user): ' + ' | '.join(p.texts()[:12]))
        self.settings()
        p.press('Auto-sort rules', exact=False)
        time.sleep(2)
        self.snap('rules')
        self.note('Rules (free user): ' + ' | '.join(p.texts()[:12]))
        if not p.is_ours():
            raise Fail('left the app')
        self.home()

    def j_large_history(self, drop):
        p = self.p
        self.mid_drop(drop)
        t0 = time.time()
        self.tab('Entries')
        p.wait('Search notes', 20)
        self.metrics['entriesTabMs'] = int((time.time() - t0) * 1000)
        for _ in range(5):
            p.shell('input swipe 540 1800 540 400 120')
            time.sleep(0.3)
        self.snap('entries-scrolled')
        t0 = time.time()
        p.press('Search notes or amounts', exact=False, scroll=False)
        p.type('Costa')
        time.sleep(2)
        p.hide_kb()
        self.metrics['searchMs'] = int((time.time() - t0) * 1000)
        self.snap('search')
        t0 = time.time()
        self.tab('Reports')
        p.wait('Income', 30)
        self.metrics['reportsMs'] = int((time.time() - t0) * 1000)
        self.note(f"entries tab {self.metrics['entriesTabMs']} ms, search {self.metrics['searchMs']} ms, reports {self.metrics['reportsMs']} ms (includes adb dump overhead)")
        self.home()

    # ── logs ──
    def collect_logs(self):
        p = self.p
        log = p.sh('logcat', '-b', 'main,system,crash', '-d', '-v', 'time', timeout=90)
        since = getattr(self, 'log_since', '')
        lines = [ln for ln in log.splitlines() if ln[:14] >= since]
        keep = [ln for ln in lines if re.search(r'FATAL|AndroidRuntime|ANR in|ReactNativeJS|sundaysort', ln)]
        with open(os.path.join(self.dir, 'logcat.txt'), 'w', encoding='utf-8') as f:
            f.write('\n'.join(keep))
        # only crashes of our app: a FATAL EXCEPTION block whose "Process:" line is ours, or "ANR in <our pkg>"
        fatal = []
        for i, ln in enumerate(lines):
            if 'FATAL EXCEPTION' in ln and any(f'Process: {PKG}' in x for x in lines[i:i + 3]):
                fatal.extend(lines[i:i + 8])
            elif f'ANR in {PKG}' in ln:
                fatal.append(ln)
        other = [ln for ln in lines if 'FATAL EXCEPTION' in ln]
        if other and not fatal:
            self.note(f'{len(other)} FATAL EXCEPTION blocks of other processes (uiautomator/system), not the app')
        jserr = [ln for ln in keep if 'ReactNativeJS' in ln and re.search(r' [EW]/', ln)]
        mem = p.shell(f'dumpsys meminfo {PKG}')
        with open(os.path.join(self.dir, 'meminfo.txt'), 'w', encoding='utf-8') as f:
            f.write(mem)
        m = re.search(r'TOTAL PSS:\s+(\d+)', mem) or re.search(r'TOTAL\s+(\d+)', mem)
        self.metrics['pssKb'] = int(m.group(1)) if m else None
        self.note(f'FATAL/ANR lines: {len(fatal)}, ReactNativeJS E/W: {len(jserr)}, PSS {self.metrics["pssKb"]} KB')
        if fatal:
            self.cur['fatal'] = fatal[:10]
            raise Fail(f'{len(fatal)} FATAL/ANR lines in logcat: {fatal[0][:200]}')
        if jserr:
            # first line of each JS warning/error (multi-line objects continue on the next lines)
            heads = sorted({re.sub(r'^.*?ReactNativeJS\(\d+\): ', '', ln)[:160] for ln in jserr if "'" in ln[:80] or 'Error' in ln})
            self.cur['jsWarnings'] = heads[:15]
            js_e = [ln for ln in jserr if ' E/ReactNativeJS' in ln]
            if js_e:
                raise Fail(f'{len(js_e)} ReactNativeJS error lines: {js_e[0][:200]}')

    def go(self):
        per = self.persona
        t0 = time.time()
        print(f"▶ {per['id']} {per['name']} [{self.profile}, {per['region']}, {per['network']}, font {per['fontScale']}, dark {per['dark']}, {per['timeZone']}, {per['entries']} entries]", flush=True)
        try:
            with self.step('profile'):
                self.set_profile()
            with self.step('prepare'):
                self.prepare()
            with self.step('cold_start') as s:
                self.cold_start()
            with self.step('onboarding'):
                self.onboarding()
            has_data = bool(self.backup and self.backup['counts']['entries'] > 0)
            if self.backup:
                now = int(self.p.shell('date +%s').strip()) * 1000
                self.expect = oracle(self.backup, self.region, self.p, per['timeZone'], now)
            with self.step('restore'):
                if not has_data:
                    raise Skip('persona has no entries to restore')
                self.restore()
            with self.step('verify_numbers'):
                if not has_data:
                    self.expect = {'unsorted': 0, 'weekIn': 0, 'weekOut': 0, 'yearIncome': 0, 'yearExpenseNoMileage': 0,
                                   'personalExcluded': 0, 'hasTrips': False,
                                   'taxYearLabel': self.expect['taxYearLabel'] if self.expect else None}
                self.verify_numbers()
            with self.step('tour'):
                self.tour()
            with self.step('journey:' + per['behaviour']):
                self.journey()
            with self.step('logs'):
                self.collect_logs()
        finally:
            with self.step('reset_profile'):
                self.reset_profile()
            res = {
                'persona': per,
                'profile': self.profile,
                'serial': self.p.serial,
                'sdk': self.p.sdk,
                'appRegion': self.region,
                'startedAt': dt.datetime.fromtimestamp(t0).isoformat(timespec='seconds'),
                'durationS': int(time.time() - t0),
                'expected': self.expect,
                'metrics': self.metrics,
                'steps': self.steps,
                'summary': dict(Counter(s['status'] for s in self.steps)),
                'uiNotes': sorted(set(self.ui_notes)),
            }
            with open(os.path.join(self.dir, 'result.json'), 'w', encoding='utf-8') as f:
                json.dump(res, f, ensure_ascii=False, indent=1)
            print(f"■ {per['id']} {res['summary']} {res['durationS']} s → {os.path.relpath(self.dir, ROOT)}", flush=True)
        return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--serial', required=True)
    ap.add_argument('--persona', action='append', help='P001 (repeatable)')
    ap.add_argument('--all-on', help='comma list of android profiles: run every persona on them')
    ap.add_argument('--profile-override', help='use this profile instead of the persona android field')
    ap.add_argument('--out', default='android37', help='folder under qa-runs/')
    ap.add_argument('--skip-done', action='store_true', help='skip personas that already have result.json')
    a = ap.parse_args()
    personas = json.load(open(PERSONAS, encoding='utf-8'))
    pick = []
    if a.persona:
        pick = [p for p in personas if p['id'] in a.persona]
    if a.all_on:
        profs = a.all_on.split(',')
        pick += [p for p in personas if p['android'] in profs and p not in pick]
    out_root = os.path.join(ROOT, 'qa-runs', a.out)
    os.makedirs(out_root, exist_ok=True)
    phone = Phone(a.serial)
    # Device defaults read once and kept in a file, so a crashed run can't make a QA value look like the original.
    dpath = os.path.join(out_root, f'_defaults-{a.serial}.json')
    if os.path.exists(dpath):
        phone.defaults = json.load(open(dpath, encoding='utf-8'))
    else:
        tz_auto = phone.shell('settings get global auto_time_zone').strip()
        if phone.sdk >= 30:
            tz_auto = '1' if 'true' in phone.shell('cmd time_zone_detector is_auto_detection_enabled') else '0'
        phone.defaults = {
            'font_scale': phone.shell('settings get system font_scale').strip(),
            'night': phone.shell('cmd uimode night').strip(),
            'tz': phone.shell('getprop persist.sys.timezone').strip(),
            'tz_auto': tz_auto,
            'auto_time': phone.shell('settings get global auto_time').strip(),
        }
        json.dump(phone.defaults, open(dpath, 'w', encoding='utf-8'))
    print('device defaults', phone.defaults, flush=True)
    for per in pick:
        if a.skip_done and os.path.exists(os.path.join(out_root, per['id'], 'result.json')):
            continue
        Run(phone, per, out_root, a.profile_override or per['android']).go()


if __name__ == '__main__':
    main()
