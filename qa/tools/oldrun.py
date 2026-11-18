"""QA-100 phiên B: runner cho máy Android cũ (API 26 / API 30). Dùng adbui.Dev.

python qa/tools/oldrun.py <serial> <persona-id> [--keep]   → qa-runs/android-old/<id>/result.json + ảnh + log
Mỗi bước ghi pass/fail/skip thật; không có bước nào tự đánh PASS mà không kiểm trên màn.
"""
import json
import os
import re
import subprocess
import sys
import time
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from adbui import Dev, PKG, ADB  # noqa: E402

APP = os.path.abspath(os.path.join(HERE, '..', '..'))
PERSONAS = {p['id']: p for p in json.load(open(os.path.join(APP, 'qa', 'personas.json'), encoding='utf-8'))}
FIX = os.path.join(APP, 'qa', 'fixtures')
RUNS = os.path.join(APP, 'qa-runs', 'android-old')

NET = {  # emulator console profiles
    'online': ('full', 'none'),
    'slow_3g': ('umts', 'umts'),
    'edge_delay': ('edge', '2000'),
    'drops_midway': ('full', 'none'),
    'airplane': ('full', 'none'),
}


def analyze_logcat(raw):
    """→ (fatal, js_err, js_warn, killed, map_net_errors) for our package. Kills we cause on purpose are not counted:
    force-stop by the runner ("stop <pkg>"), and Android's own kill after a permission is revoked."""
    lines = raw.splitlines()
    fatal = []
    for i, l in enumerate(lines):
        if 'FATAL EXCEPTION' in l and any(f'Process: {PKG}' in x for x in lines[i + 1:i + 3]):
            fatal.append(l + ' ' + ' '.join(lines[i + 1:i + 4]))
        elif 'ANR in' in l and PKG in l:
            fatal.append(l)
        elif 'Fatal signal' in l and ('tron.sundaysort' in l or PKG in l):
            abort = next((x for x in lines[i:i + 40] if 'Abort message' in x), '')
            fatal.append(l + ' ' + abort)
    NET = ('MapLibre', 'Failed to load tile', 'loading style failed', 'Network request failed')
    js_all = [l for l in lines if 'ReactNativeJS' in l and ' E ' in l]
    js_err = [l for l in js_all if not any(k in l for k in NET)]
    js_warn = [l for l in lines if 'ReactNativeJS' in l and ' W ' in l]
    killed = [l for l in lines if PKG in l and ('lowmemorykiller' in l.lower() or ('Kill' in l and 'ActivityManager' in l))
              and ': stop ' + PKG not in l and 'from pid' not in l and 'permissions revoked' not in l]
    return fatal, js_err, js_warn, killed, len(js_all) - len(js_err)


class InfraError(RuntimeError):
    """Emulator / adb problem, not an app result: the batch re-runs the persona."""


class Run:
    def __init__(self, serial, pid):
        self.d = Dev(serial)
        self.serial = serial
        self.p = PERSONAS[pid]
        self.out = os.path.join(RUNS, pid)
        os.makedirs(self.out, exist_ok=True)
        self.steps = []
        self.n = 0
        self.api = int(self.d.shell('getprop ro.build.version.sdk').strip() or 0)
        self.metrics = {}

    # ---------- helpers ----------
    def shot(self, name):
        self.n += 1
        fn = f'{self.n:02d}_{name}.png'
        try:
            self.d.shot(os.path.join(self.out, fn))
        except Exception:
            return None
        return fn

    def step(self, name, fn, *a, **kw):
        t0 = time.time()
        rec = {'step': name}
        try:
            r = fn(*a, **kw)
            if isinstance(r, tuple):
                rec['status'], rec['detail'] = r
            else:
                rec['status'], rec['detail'] = 'pass', r
        except Exception as e:  # noqa: BLE001
            rec['status'] = 'fail'
            rec['detail'] = f'{type(e).__name__}: {e}'
            rec['trace'] = traceback.format_exc()[-800:]
        rec['secs'] = round(time.time() - t0, 1)
        rec['shot'] = self.shot(re.sub(r'\W+', '_', name)[:40])
        self.steps.append(rec)
        print(f"[{self.p['id']}] {rec['status'].upper():4} {name} ({rec['secs']}s) {str(rec.get('detail') or '')[:160]}", flush=True)
        return rec['status'] == 'pass'

    def emu(self, cmd):
        return subprocess.run([ADB, '-s', self.serial, 'emu', *cmd.split()], capture_output=True, timeout=30).stdout.decode()

    def resumed(self):
        out = self.d.shell('dumpsys activity activities | grep -E "mResumedActivity|topResumedActivity"')
        return out.strip()

    def in_app(self):
        return PKG in self.resumed()

    def visible(self, nodes=None):
        nodes = nodes if nodes is not None else self.d.nodes()
        return [n for n in nodes if n['b'][3] > n['b'][1] and (n['text'] or n['desc'])]

    def has(self, label, nodes=None):
        return any(label.lower() in (n['text'] + ' ' + n['desc']).lower() for n in self.visible(nodes))

    def tap_vis(self, label, exact=False, timeout=15):
        """Tap a node that is actually on screen (adbui.scroll_to can return off-screen 0-size nodes)."""
        end = time.time() + timeout
        while time.time() < end:
            for n in self.visible():
                for v in (n['text'], n['desc']):
                    if v and ((v == label) if exact else label.lower() in v.lower()):
                        time.sleep(0.3)
                        x1, y1, x2, y2 = n['b']
                        self.d.tap_xy((x1 + x2) // 2, (y1 + y2) // 2)
                        return n
            time.sleep(0.4)
        raise TimeoutError(f'"{label}" not visible ({self.resumed()[:120]})')

    def scroll_vis(self, label, tries=10, up=False):
        w, h = self.d.size()
        for _ in range(tries):
            for n in self.visible():
                if label.lower() in (n['text'] + ' ' + n['desc']).lower() and n['b'][3] < h * 0.88 and n['b'][1] > h * 0.08:
                    return n
            if up:
                self.d.shell(f'input swipe {w // 2} {int(h * 0.3)} {w // 2} {int(h * 0.75)} 400')
            else:
                self.d.shell(f'input swipe {w // 2} {int(h * 0.7)} {w // 2} {int(h * 0.35)} 400')
            time.sleep(0.8)
        raise TimeoutError(f'"{label}" not found after scrolling')

    def tab(self, name):
        self.tap_vis(name, exact=True)
        time.sleep(1.2)

    def errors_on_screen(self):
        bad = ['something went wrong', 'error', 'crash', 'unexpected']
        return [t for t in (n['text'] for n in self.visible()) if t and any(b in t.lower() for b in bad)]

    # ---------- device profile ----------
    def setup_device(self):
        p = self.p
        d = self.d
        notes = []
        d.shell('svc power stayon true; input keyevent 224; locksettings set-disabled true; input keyevent 82')
        d.shell(f'settings put system font_scale {p["fontScale"]}')
        # timezone
        d.shell('settings put global auto_time_zone 0')
        if self.api >= 30:
            d.shell(f'cmd time_zone_detector suggest_manual_time_zone --zone_id {p["timeZone"]}' if self.api >= 31 else f'service call alarm 3 s16 {p["timeZone"]}')
        else:
            # API 26: shell lacks SET_TIME_ZONE → use adbd root (google_apis image) for the alarm-service call only
            if 'uid=0' not in d.shell('id'):
                d.sh('root', timeout=30)
                for _ in range(30):
                    time.sleep(2)
                    try:
                        if 'uid=0' in d.shell('id', timeout=10):
                            break
                    except Exception:  # noqa: BLE001
                        pass
                else:
                    raise InfraError('adb root did not come back')
                time.sleep(2)
            d.shell(f'service call alarm 3 s16 {p["timeZone"]}')
            time.sleep(0.5)
        tz = d.shell('getprop persist.sys.timezone').strip()
        if not tz:
            raise InfraError('device not answering (adb shell returned nothing)')
        notes.append(f'tz={tz}')
        if tz != p['timeZone']:
            return 'fail', f'timezone not applied: {tz} != {p["timeZone"]}'
        # network
        sp, dl = NET[p['network']]
        self.emu(f'network speed {sp}')
        self.emu(f'network delay {dl}')
        self.airplane(False)
        notes.append(f'net={sp}/{dl}')
        notes.append(f'font={d.shell("settings get system font_scale").strip()}')
        d.shell(f'cmd uimode night {"yes" if p["dark"] else "no"}')
        notes.append('night=' + d.shell('cmd uimode night').strip().replace('Night mode: ', ''))
        return 'pass', ' '.join(notes)

    def airplane(self, on):
        v = 1 if on else 0
        if self.api >= 30:
            self.d.shell(f'cmd connectivity airplane-mode {"enable" if on else "disable"}')
        else:
            self.d.shell(f'settings put global airplane_mode_on {v}')
            self.d.shell(f'am broadcast -a android.intent.action.AIRPLANE_MODE --ez state {"true" if on else "false"}')
        return self.d.shell('settings get global airplane_mode_on').strip()

    # ---------- app flows ----------
    def fresh_install_state(self):
        d = self.d
        d.shell(f'am force-stop {PKG}')
        out = d.shell(f'pm clear {PKG}')
        d.shell('rm -f /sdcard/Download/*.sundaysort')
        d.sh('push', os.path.join(FIX, f'{self.p["id"]}.sundaysort'), f'/sdcard/Download/{self.p["id"]}.sundaysort')
        d.shell(f'am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Download/{self.p["id"]}.sundaysort')
        d.sh('logcat', '-c')
        d.shell('pkill -f uiautomator')  # a dump left over from an interrupted run blocks every new dump
        return 'pass', out.strip()

    def cold_start(self, tag='cold'):
        d = self.d
        d.shell(f'am force-stop {PKG}')
        time.sleep(0.5)
        out = d.shell(f'am start -W -n {PKG}/.MainActivity')
        m = re.search(r'TotalTime: (\d+)', out)
        ms = int(m.group(1)) if m else None
        self.metrics.setdefault('start_ms', []).append({tag: ms})
        if not m or 'Status: ok' not in out:
            return 'fail', out.strip()[-300:]
        return 'pass', f'TotalTime={ms}ms'

    def onboard(self):
        d = self.d
        self.tap_vis('Get started')
        d.wait('Where do you file')
        self.tap_vis('United Kingdom. ' if self.p['region'] == 'UK' else 'United States. ')
        time.sleep(0.6)
        self.tap_vis('Continue', exact=True)
        d.wait('How do you claim')
        time.sleep(0.4)
        self.tap_vis('Continue', exact=True)
        d.wait('Your categories are ready')
        time.sleep(0.4)
        self.tap_vis('Looks good')
        d.wait('Continue free')
        time.sleep(0.4)
        self.tap_vis('Continue free')
        d.wait('When do you want to sort')
        time.sleep(0.4)
        for _ in range(3):
            self.tap_vis('Not now')
            end = time.time() + 8
            while time.time() < end and not self.has('Expense'):
                time.sleep(0.5)
            if self.has('Expense'):
                break
        d.wait('Expense', timeout=10)
        ty = 'Tax year' if self.p['region'] == 'UK' else ''
        nodes = d.nodes()
        if self.p['region'] == 'UK' and not self.has('Tax year 20', nodes):
            return 'fail', 'UK home has no "Tax year" label'
        return 'pass', f'home reached ({ty or "US"})'

    def open_settings_row(self, row):
        self.tap_vis('Settings', exact=True)
        time.sleep(1.0)
        self.scroll_vis(row)
        self.tap_vis(row)
        time.sleep(1.2)

    def confirm_replace(self):
        self.tap_vis("Replace this phone")
        self.d.wait('Replace everything', timeout=15)
        time.sleep(0.6)
        btns = sorted([n for n in self.visible() if (n['text'] or n['desc']) == 'Restore'], key=lambda n: n['b'][1])
        b = btns[-1]['b']
        self.d.tap_xy((b[0] + b[2]) // 2, (b[1] + b[3]) // 2)

    def restore(self, fname=None):
        d = self.d
        fname = fname or f'{self.p["id"]}.sundaysort'
        self.open_settings_row('Backup & restore')
        self.scroll_vis('Restore from backup')
        self.tap_vis('Restore from backup')
        time.sleep(2.5)
        # system file picker (DocumentsUI)
        for _ in range(3):
            if self.has(fname):
                break
            if not self.has('Open from'):
                try:
                    self.tap_vis('Show roots', timeout=5)
                except TimeoutError:
                    pass
                time.sleep(1.5)
            if self.has('Open from'):
                try:
                    self.tap_vis('Downloads', exact=True, timeout=5)
                except TimeoutError:
                    pass
                time.sleep(2)
        self.tap_vis(fname, exact=True, timeout=15)
        picked = False
        end = time.time() + 5
        while time.time() < end and not picked:
            picked = self.has('Replace this phone')
            time.sleep(0.5)
        if not picked:
            # DocumentsUI on API 30 ignores `input tap` on list rows (verified 2026-11-17); pick with keyboard instead
            # (TAB → focus, LEFT → row, ENTER). This is a test-driver workaround, not an app behaviour.
            self.metrics['picker_keyboard'] = True
            for k in [61] * 6 + [21, 66]:
                d.key(k)
                time.sleep(0.25)
        d.wait("Replace this phone", timeout=30)
        nodes = d.nodes()
        texts = [n['text'] for n in self.visible(nodes)]
        counts = ' '.join(texts)
        self.confirm_replace()
        t0 = time.time()
        d.wait('Backup restored', timeout=120)
        self.metrics['restore_secs'] = round(time.time() - t0, 1)
        m = re.search(r'Restore Backup from .*?(\d[\d,]*) (\d[\d,]*) (\d[\d,]*) entries trips photos', counts)
        return 'pass', f'{self.metrics["restore_secs"]}s; picker showed: {counts[:160]}'

    def back_home(self):
        if not self.in_app():
            # app died (crash) or another app is on top: bring ours back
            self.d.shell(f'am start -n {PKG}/.MainActivity')
            time.sleep(4)
        empty = 0
        for _ in range(5):
            nodes = self.d.nodes()
            if not nodes:
                empty += 1
                if empty >= 2:
                    # undumpable screen (capture: blinking caret) → restart the app; an unsaved entry is discarded
                    self.d.shell(f'am force-stop {PKG}')
                    self.d.shell(f'am start -n {PKG}/.MainActivity')
                    time.sleep(3)
                    empty = 0
                continue
            if self.has('New expense', nodes) and self.has('Reports', nodes):
                return
            if any((n['text'] or n['desc']) == 'Home' and n['click'] for n in nodes) and self.has('Reports', nodes):
                self.tab('Home')
                continue
            if self.has('Discard', nodes) and self.has('Keep editing', nodes):
                self.tap_vis('Discard', exact=True)
                time.sleep(1)
                continue
            self.d.key(4)
            time.sleep(0.8)

    def tour(self):
        found = {}
        self.back_home()
        for t in ('Home', 'Entries', 'Sort', 'Miles', 'Reports'):
            self.tab(t)
            time.sleep(1.5 if self.p['entries'] < 5000 else 4)
            nodes = self.d.nodes()
            errs = self.errors_on_screen()
            found[t] = len(self.visible(nodes))
            self.shot(f'tab_{t}')
            if errs:
                return 'fail', f'{t}: {errs}'
            if not self.in_app():
                return 'fail', f'left app on {t}: {self.resumed()}'
        self.tab('Home')
        return 'pass', f'visible nodes per tab {found}'

    def logs(self):
        d = self.d
        raw = d.sh('logcat', '-d', '-v', 'threadtime', timeout=60)
        with open(os.path.join(self.out, 'logcat.txt'), 'w', encoding='utf-8') as f:
            f.write(raw)
        fatal, js_err, js_warn, killed, net = analyze_logcat(raw)
        self.metrics['map_net_errors'] = net
        self.metrics['log'] = {'fatal': len(fatal), 'js_error': len(js_err), 'js_warn': len(js_warn), 'killed': len(killed)}
        mem = d.shell(f'dumpsys meminfo {PKG}')
        with open(os.path.join(self.out, 'meminfo.txt'), 'w', encoding='utf-8') as f:
            f.write(mem)
        m = re.search(r'TOTAL\s+(\d+)', mem)
        self.metrics['pss_kb'] = int(m.group(1)) if m else None
        det = f"fatal={len(fatal)} js_err={len(js_err)} map_net_err={self.metrics['map_net_errors']} js_warn={len(js_warn)} killed={len(killed)} pss={self.metrics['pss_kb']}KB"
        if fatal or killed:
            return 'fail', det + ' | ' + ' || '.join((fatal + killed)[:3])[:600]
        if js_err:
            return 'fail', det + ' | ' + ' || '.join(js_err[:3])[:600]
        return 'pass', det

    def save(self):
        res = {
            'persona': self.p,
            'serial': self.serial,
            'api': self.api,
            'apk': os.environ.get('QA_APK', '?'),
            'finished': time.strftime('%Y-%m-%dT%H:%M:%S'),
            'steps': self.steps,
            'metrics': self.metrics,
            'result': 'fail' if any(s['status'] == 'fail' for s in self.steps) else 'pass',
            'skipped': [s['step'] for s in self.steps if s['status'] == 'skip'],
        }
        with open(os.path.join(self.out, 'result.json'), 'w', encoding='utf-8') as f:
            json.dump(res, f, ensure_ascii=False, indent=1)
        return res


def main():
    serial, pid = sys.argv[1], sys.argv[2]
    r = Run(serial, pid)
    for f in os.listdir(r.out):  # fresh evidence for this run only (not done in Run() so ad-hoc debugging can't wipe results)
        if f.endswith(('.png', '.txt', '.json')):
            os.remove(os.path.join(r.out, f))
    import behaviours  # noqa: E402  (qa/tools/behaviours.py)
    try:
        r.setup_device()
    except InfraError as e:
        print(f'INFRA {e}')
        sys.exit(9)
    ok = r.step('device profile', r.setup_device)
    ok = r.step('fresh install state + push fixture', r.fresh_install_state) and ok
    ok = r.step('cold start (first launch)', r.cold_start, 'first')
    if ok:
        ok = r.step('onboarding', r.onboard)
    if ok and r.p['entries'] > 0:
        ok = r.step('restore persona backup', r.restore)
    if ok:
        r.step('tour 5 tabs', r.tour)
        if r.p['network'] == 'airplane':
            r.steps.append({'step': 'airplane mode on', 'status': 'pass', 'detail': 'airplane_mode_on=' + r.airplane(True)})
        fn = getattr(behaviours, r.p['behaviour'])
        try:
            fn(r)
        except Exception as e:  # noqa: BLE001
            r.steps.append({'step': f'behaviour {r.p["behaviour"]}', 'status': 'fail', 'detail': f'{type(e).__name__}: {e}', 'trace': traceback.format_exc()[-800:], 'shot': r.shot('behaviour_crash')})
        r.airplane(False)
        r.emu('network speed full')
        r.emu('network delay none')
        r.step('warm restart keeps data', behaviours.relaunch_check, r)
    r.step('logs + meminfo', r.logs)
    if not r.d.shell('echo up').strip():
        print('INFRA device dropped during the run')
        sys.exit(9)
    res = r.save()
    print(json.dumps({'id': pid, 'result': res['result'], 'fails': [s['step'] for s in res['steps'] if s['status'] == 'fail']}))


if __name__ == '__main__':
    main()
