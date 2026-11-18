"""Real-phone performance probes for QA-100 phase E (Galaxy A13). Run after a large fixture is restored.

  python a13_perf.py cold          → 5 cold starts (am start -W TotalTime) + JS-thread CPU of the start
  python a13_perf.py tabs          → first + second open of each tab: JS-thread CPU (ms) and wall time to marker
  python a13_perf.py scroll        → Entries list: 10 flings, JS + UI(RenderThread/main) CPU, gfxinfo jank
  python a13_perf.py idle <sec>    → app in background: CPU of every thread + wakelocks over <sec> (B-51: measure only)

JS CPU = utime+stime of the busiest `mqt_v_js` thread in /proc/<pid>/task/*/stat (×10 ms). Results → stdout JSON.
"""
import json
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from run_a13 import A13Phone, SERIAL  # noqa: E402
from adbui import PKG  # noqa: E402

ACT = f'{PKG}/.MainActivity'


def pid(p):
    return p.shell(f'pidof {PKG}').strip().split(' ')[0]


def threads(p, pi):
    """{tid: (name, ticks)}"""
    out = p.shell(f'for t in /proc/{pi}/task/*; do cat $t/stat 2>/dev/null; echo; done')
    res = {}
    for ln in out.splitlines():
        m = re.match(r'(\d+) \((.*?)\) \S (.*)', ln.strip())
        if not m:
            continue
        f = m.group(3).split()
        res[m.group(1)] = (m.group(2), int(f[11]) + int(f[12]))  # utime, stime (fields 14,15)
    return res


def delta(a, b):
    out = {}
    for tid, (name, t) in b.items():
        d = t - a.get(tid, (name, 0))[1]
        if d > 0:
            out.setdefault(name, []).append(d * 10)
    return out


def js_ms(d):
    return max(d.get('mqt_v_js', [0]) or [0])


def total_ms(d):
    return sum(sum(v) for v in d.values())


def cold(p, n=5):
    res = []
    for _ in range(n):
        p.shell(f'am force-stop {PKG}')
        time.sleep(2)
        out = p.shell(f'am start -W -n {ACT}', timeout=60)
        m = re.search(r'TotalTime: (\d+)', out)
        t0 = time.time()
        p.wait('Reports', 30)
        ready = int((time.time() - t0) * 1000)
        pi = pid(p)
        th = threads(p, pi)
        js = max([t for (nm, t) in th.values() if nm == 'mqt_v_js'] or [0]) * 10
        res.append({'totalTimeMs': int(m.group(1)) if m else None, 'homeVisibleAfterMs': ready, 'jsCpuSinceStartMs': js,
                    'allCpuSinceStartMs': sum(t for _, t in th.values()) * 10})
        time.sleep(2)
    return res


def tabs(p):
    from run_persona import Run  # noqa: F401
    res = {}
    marks = {'Entries': 'Search notes', 'Sort': None, 'Miles': None, 'Reports': 'Income', 'Home': 'to sort'}
    for rnd in ('first', 'second'):
        for t, mk in marks.items():
            p.guard()
            n = p.find(t, True)
            if not n:
                continue
            pi = pid(p)
            a = threads(p, pi)
            t0 = time.time()
            x1, y1, x2, y2 = n['b']
            p.tap_xy((x1 + x2) // 2, (y1 + y2) // 2)
            if mk:
                try:
                    p.wait(mk, 20)
                except TimeoutError:
                    pass
            wall = int((time.time() - t0) * 1000)
            time.sleep(2)
            d = delta(a, threads(p, pi))
            res[f'{t}:{rnd}'] = {'wallToMarkerMs': wall, 'jsCpuMs': js_ms(d), 'allCpuMs': total_ms(d)}
    return res


def scroll(p):
    p.guard()
    n = p.find('Entries', True)
    x1, y1, x2, y2 = n['b']
    p.tap_xy((x1 + x2) // 2, (y1 + y2) // 2)
    p.wait('Search notes', 20)
    time.sleep(2)
    p.shell(f'dumpsys gfxinfo {PKG} reset')
    pi = pid(p)
    a = threads(p, pi)
    t0 = time.time()
    for _ in range(10):
        p.guard()
        p.shell('input swipe 540 1900 540 500 150')
        time.sleep(0.6)
    wall = int((time.time() - t0) * 1000)
    d = delta(a, threads(p, pi))
    g = p.shell(f'dumpsys gfxinfo {PKG}')
    gi = {k: (re.search(rf'{k}: ([^\n]+)', g) or [None, None])[1] for k in
          ('Total frames rendered', 'Janky frames', '50th percentile', '90th percentile', '95th percentile', '99th percentile')}
    top = sorted(((k, sum(v)) for k, v in d.items()), key=lambda x: -x[1])[:6]
    return {'wallMs': wall, 'jsCpuMs': js_ms(d), 'topThreadsMs': top, 'gfxinfo': gi}


def idle(p, sec):
    pi = pid(p)
    p.shell('input keyevent 3')  # home: app goes to background (same as the user leaving it)
    time.sleep(3)
    a = threads(p, pi)
    bat0 = p.shell('dumpsys battery | grep level').strip()
    time.sleep(sec)
    b = threads(p, pi)
    d = delta(a, b)
    wl = p.shell(f'dumpsys power | grep -i {PKG}').strip().splitlines()[:10]
    alive = p.shell(f'pidof {PKG}').strip()
    loc = [ln.strip() for ln in p.shell('dumpsys location').splitlines() if 'sundaysort' in ln][-5:]
    top = sorted(((k, sum(v)) for k, v in d.items()), key=lambda x: -x[1])[:8]
    return {'seconds': sec, 'cpuMsTotal': total_ms(d), 'cpuPct': round(total_ms(d) / (sec * 1000) * 100, 2),
            'topThreadsMs': top, 'wakelocks': wl, 'pidAlive': bool(alive), 'battery': [bat0, p.shell('dumpsys battery | grep level').strip()],
            'locationLines': loc}


if __name__ == '__main__':
    p = A13Phone(SERIAL)
    cmd = sys.argv[1]
    if cmd == 'cold':
        r = cold(p)
    elif cmd == 'tabs':
        r = tabs(p)
    elif cmd == 'scroll':
        r = scroll(p)
    elif cmd == 'idle':
        r = idle(p, int(sys.argv[2]))
    else:
        raise SystemExit(__doc__)
    print(json.dumps(r, ensure_ascii=False, indent=1))
