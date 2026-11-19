"""QA-100 runner for Phuong's own Galaxy A13 (R58TC12SRZW) — wraps run_persona.py with personal-phone safety.

  python run_a13.py --persona P001 [--persona P009 ...] [--out a13]

Differences from run_persona.py (emulator):
  * every tap first checks the foreground app is ours (or the system file picker / share sheet / permission dialog);
    anything else (a call, Messenger, another app) → stop the run at once (fact adb-device-testing).
  * no time-zone change: the persona's zone is replaced by the phone's own zone (oracle uses the same zone).
  * no emulator network shaping (`adb emu` has no real-phone equivalent) → noted; airplane only for airplane /
    drops_midway personas, always switched back off.
  * prepare deletes only the P###.sundaysort files we pushed — never the user's own files in Download.
  * reset keeps the phone's own density override (no `wm density reset`) and puts font/night back as found.
  * low_storage only measures free space (no filling of a personal phone).
Device profile overrides (320dp / tablet) are ignored: this is one real 1080x2408 phone.
"""
import argparse
import contextlib
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run_persona as rp  # noqa: E402

SERIAL = 'R58TC12SRZW'
ALLOWED_TOP = ('com.phiotron.sundaysort', 'documentsui', 'intentresolver', 'permissioncontroller', 'packageinstaller')


class ForeignApp(Exception):
    pass


class NavBarTap(RuntimeError):
    pass


BASE = {'font_scale': '0.8', 'night': 'Night mode: no', 'airplane': '0'}  # Phuong's own settings (2026-11-17)


class A13Phone(rp.Phone):
    def sh(self, *args, timeout=60, check=False):
        # Other sessions sometimes restart the adb server: wait for the phone instead of reading empty output.
        for _ in range(3):
            r = rp.subprocess.run([rp.ADB, '-s', self.serial, *args], capture_output=True, timeout=timeout)
            err = r.stderr.decode('utf-8', 'replace')
            if 'not found' in err or 'offline' in err or 'no devices' in err:
                print('  … adb lost the phone, waiting', flush=True)
                try:
                    rp.subprocess.run([rp.ADB, '-s', self.serial, 'wait-for-device'], timeout=120)
                except rp.subprocess.TimeoutExpired:
                    raise ForeignApp('PHONE LOST: adb no longer sees ' + self.serial + ' (re-plug needed)')
                time.sleep(2)
                continue
            if check and r.returncode:
                raise RuntimeError(err)
            return r.stdout.decode('utf-8', 'replace')
        raise RuntimeError('adb lost the phone ' + self.serial)

    def guard(self):
        # Every resumed window must be ours (a Zalo chat bubble / Messenger head can sit on top of our app).
        lines = [ln for ln in self.top().splitlines() if 'topResumedActivity' in ln] or ['?']
        bad = [ln for ln in lines if not any(k in ln for k in ALLOWED_TOP)]
        if bad:
            raise ForeignApp('foreground is not our app: ' + bad[0].strip()[-120:])

    def tap_xy(self, x, y):
        if y >= 2260:
            raise NavBarTap(f'refusing tap at y={y} (navigation bar)')
        self.guard()
        super().tap_xy(x, y)

    def tap_node(self, n):
        # A row whose centre sits behind the navigation bar: tap its visible top part instead.
        x1, y1, x2, y2 = n['b']
        y = (y1 + y2) // 2
        if y >= 2200 and y1 < 2180:
            y = (y1 + min(y2, 2200)) // 2
        self.tap_xy((x1 + x2) // 2, y)

    def press(self, label, timeout=20, exact=True, scroll=True):
        # Big font: the target can sit behind the navigation bar → scroll a bit and look again.
        for _ in range(4):
            try:
                return super().press(label, timeout, exact, scroll)
            except NavBarTap:
                self.guard()
                self.shell('input swipe 540 1700 540 1200 400')
                time.sleep(0.8)
        return super().press(label, timeout, exact, scroll)

    def swipe_up(self, frac=0.5):
        self.guard()
        super().swipe_up(frac)

    def emu(self, *args):
        return ''  # real phone: no emulator console


class A13Run(rp.Run):
    @contextlib.contextmanager
    def step(self, name):
        with rp.Run.step(self, name) as rec:
            yield rec
        if self.steps and 'ForeignApp' in (self.steps[-1].get('reason') or ''):
            raise ForeignApp(self.steps[-1]['reason'])
        if name != 'reset_profile':
            lv = rp.re.search(r'level: (\d+)', self.p.shell('dumpsys battery'))
            if lv and int(lv.group(1)) < 8:
                raise ForeignApp(f'BATTERY {lv.group(1)}% < 8% — stop to keep the phone alive for Phuong')

    def set_profile(self):
        p, per = self.p, self.persona
        self.orig = dict(BASE)
        found = {
            'font_scale': p.shell('settings get system font_scale').strip(),
            'night': p.shell('cmd uimode night').strip(),
            'airplane': p.shell('settings get global airplane_mode_on').strip(),
        }
        if found != BASE:
            self.note(f'WARNING settings found {found} ≠ Phuong baseline {BASE} (restored at the end)')
        p.shell(f"settings put system font_scale {per['fontScale']}")
        p.shell(f"cmd uimode night {'yes' if per['dark'] else 'no'}")
        if per['network'] == 'airplane':
            self.airplane(True)
        self.note(f"A13 profile: font {per['fontScale']}, dark {per['dark']}; persona zone {per.get('timeZoneOrig')} → "
                  f"phone zone {per['timeZone']} (not changed on a personal phone); network {per['network']}"
                  + ('' if per['network'] in ('online', 'airplane', 'drops_midway') else ' → not emulated on a real phone (real Wi-Fi)'))
        self.note('orig: ' + json.dumps(self.orig))

    def set_tz(self, zone):
        pass

    def reset_profile(self):
        p, o = self.p, self.orig
        if o.get('font_scale'):
            p.shell(f"settings put system font_scale {o['font_scale']}")
        p.shell('cmd uimode night ' + ('yes' if 'yes' in o.get('night', '') else 'no'))
        if o.get('airplane', '0') == '0' and p.shell('settings get global airplane_mode_on').strip() == '1':
            self.airplane(False)
        p.shell(f'rm -f /sdcard/Download/{self.persona["id"]}.sundaysort')
        p.shell(f"am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Download/{self.persona['id']}.sundaysort")
        now = {
            'font_scale': p.shell('settings get system font_scale').strip(),
            'night': p.shell('cmd uimode night').strip(),
            'airplane': p.shell('settings get global airplane_mode_on').strip(),
        }
        self.note('density ' + p.shell('wm density').strip().replace('\n', ' '))
        self.note('reset: ' + json.dumps(now))
        if now != o:
            raise rp.Fail(f'phone settings not back as found: {now} ≠ {o}')

    def prepare(self):
        p = self.p
        out = p.shell(f'pm clear {rp.PKG}').strip()
        if 'Success' not in out:
            raise rp.Fail('pm clear: ' + out)
        p.sh('logcat', '-c')
        if os.path.exists(self.fixture):
            import zipfile
            with zipfile.ZipFile(self.fixture) as z:
                self.backup = json.loads(z.read('backup.json'))
            s = self.backup['tables']['settings']
            reg = next((json.loads(x['value']) for x in s if x['key'] == 'region'), None)
            if reg:
                self.region = reg
            if self.backup['counts']['entries'] > 0:
                dst = f"/sdcard/Download/{self.persona['id']}.sundaysort"
                r = p.sh('push', self.fixture, dst)
                p.shell(f'am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://{dst}')
                self.note('pushed fixture: ' + r.strip()[-80:])
            self.note(f"fixture counts {self.backup['counts']}, region in backup={reg}")
        else:
            self.note('no fixture file')

    def pick_file_in_picker(self, name):
        """Phone UI is Vietnamese and the picker reopens where it was last (Phuong's Drive) → go to Downloads first."""
        p = self.p
        end = time.time() + 40
        while time.time() < end:
            if 'documentsui' not in p.top():
                time.sleep(0.5)
                continue
            ns = p.nodes()
            n = p.find(name, True, ns)
            if n and n['b'][3] < 2200:
                p.tap_node(n)
                return
            here = p.find('Tệp đã tải xuống', True, ns) or p.find('Downloads', True, ns)
            if here and here['b'][1] < 200:  # title bar says we're in Downloads → file is further down
                p.swipe_up(0.4)
                time.sleep(0.8)
                continue
            sr = p.find_click('Hiển thị gốc', True, ns) or p.find_click('Show roots', True, ns)
            if sr:
                p.tap_node(sr)
                time.sleep(1.2)
                dl = p.find('Tệp đã tải xuống', True) or p.find('Downloads', True)
                if dl:
                    p.tap_node(dl)
                    time.sleep(1.5)
                continue
            time.sleep(0.8)
        raise TimeoutError(f'{name} not in file picker')

    def j_region_switch(self, drop):
        """Like the emulator journey, but the rate field doesn't auto-focus on the A13: tap it, type, then Change."""
        p = self.p
        self.mid_drop(drop)
        self.settings()
        new = 'United States' if self.region == 'UK' else 'United Kingdom'
        rate = '1.27' if self.region == 'UK' else '0.79'
        p.press('Region', exact=False, scroll=False)
        time.sleep(1)
        p.press(new, exact=True, scroll=False)
        p.wait('Change region?', 10)
        field = p.find('e.g.', False)
        if not field:
            raise TimeoutError('rate field not found')
        p.tap_node(field)
        time.sleep(0.8)
        p.type(rate)
        time.sleep(0.5)
        self.snap('region-rate')
        p.press('Change', exact=True, scroll=False)
        time.sleep(3)
        self.snap('after-switch')
        if p.find('Change region?', True):
            raise rp.Fail('dialog still open after typing rate ' + rate + ': ' + ' | '.join(p.texts()[:10]))
        got = p.value_right_of('Region')
        self.note(f'region row: {got}')
        if got != new:
            raise rp.Fail(f'region row shows {got!r}, expected {new!r}')
        self.region = 'US' if self.region == 'UK' else 'UK'
        self.home()
        self.snap('home-new-region')
        tax = p.find('Tax year', False)
        self.note('home header: ' + (tax['text'] if tax else '?'))
        u, o, i = self.home_counts()
        self.note(f'after switch: unsorted {u}, week out {o}, week in {i} (before: out {self.expect["weekOut"]})')
        want_out = round(self.expect['weekOut'] * float(rate))
        if o is None or abs(o - want_out) > 2 * max(1, self.expect['unsorted']):
            raise rp.Fail(f'week out after switch {o} ≠ ~{want_out} ({self.expect["weekOut"]} × {rate})')

    def j_low_storage(self, drop):
        p = self.p
        self.mid_drop(drop)
        df = p.shell('df /data | tail -1').split()
        free_kb = int(df[3]) if len(df) > 3 and df[3].isdigit() else None
        self.note(f'/data free: {free_kb} KB — personal phone, measure only (no fill)')
        self.capture('expense', '3.21')
        u, o, _ = self.home_counts()
        self.note(f'capture: unsorted={u} out={o}')
        self.settings()
        p.press('Backup & restore')
        p.press('Back up now', exact=False)
        time.sleep(3)
        self.snap('backup')
        self.note('backup: ' + ' | '.join(p.texts()[:10]))
        if 'intentresolver' in p.top():
            p.key(4)
            time.sleep(1)
        self.home()
        raise rp.Skip(f'low storage not simulated on the personal phone; free /data {free_kb} KB; capture + backup sheet OK')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--persona', action='append', required=True)
    ap.add_argument('--out', default='a13')
    a = ap.parse_args()
    personas = json.load(open(rp.PERSONAS, encoding='utf-8'))
    phone = A13Phone(SERIAL)
    zone = phone.shell('getprop persist.sys.timezone').strip()
    out_root = os.path.join(rp.ROOT, 'qa-runs', a.out)
    os.makedirs(out_root, exist_ok=True)
    for pid in a.persona:
        per = dict(next(p for p in personas if p['id'] == pid))
        per['timeZoneOrig'], per['timeZone'] = per['timeZone'], zone
        try:
            A13Run(phone, per, out_root, 'a13_real').go()
        except ForeignApp as e:
            print('STOP: ' + str(e), flush=True)
            sys.exit(3)


if __name__ == '__main__':
    main()
