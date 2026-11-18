"""Tổng hợp qa-runs/android-old/<id>/result.json → bảng markdown (in ra stdout) + qa-runs/android-old/summary.json."""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from oldrun import analyze_logcat  # noqa: E402
RUNS = os.path.join(HERE, '..', '..', 'qa-runs', 'android-old')
rows, allres = [], []
for pid in sorted(os.listdir(RUNS)):
    f = os.path.join(RUNS, pid, 'result.json')
    if not pid.startswith('P') or not os.path.exists(f):
        continue
    r = json.load(open(f, encoding='utf-8'))
    # re-grade the log step with the current filter (runner's own force-stops / permission-revoke kills are not app faults)
    lc = os.path.join(RUNS, pid, 'logcat.txt')
    for s_ in r['steps']:
        if s_['step'] == 'logs + meminfo' and os.path.exists(lc):
            fatal, js_err, _w, killed, net = analyze_logcat(open(lc, encoding='utf-8', errors='replace').read())
            new = 'fail' if (fatal or killed or js_err) else 'pass'
            if new != s_['status']:
                s_['detail'] = f"(re-graded {s_['status']}→{new}) fatal={len(fatal)} js_err={len(js_err)} killed={len(killed)} map_net_err={net} | " + ' || '.join((fatal + killed + js_err)[:2])[:300]
                s_['status'] = new
    r['result'] = 'fail' if any(x['status'] == 'fail' for x in r['steps']) else 'pass'
    allres.append(r)
    p = r['persona']
    st = r['steps']
    n = {k: sum(1 for s in st if s['status'] == k) for k in ('pass', 'fail', 'skip')}
    m = r.get('metrics', {})
    start = [list(x.values())[0] for x in m.get('start_ms', []) if list(x.values())[0]]
    fails = '; '.join(f"{s['step']}: {str(s.get('detail'))[:90]}" for s in st if s['status'] == 'fail')
    skips = '; '.join(f"{s['step']}" for s in st if s['status'] == 'skip')
    icon = '❌' if n['fail'] else ('✅' if not n['skip'] else '✅⏭')
    rows.append(f"| {pid} | API {r['api']} | {p['region']} | {p['behaviour']} | {p['network']} | {p['fontScale']}{' tối' if p['dark'] else ''} | {p['entries']} | "
                f"{icon} {n['pass']}/{n['fail']}/{n['skip']} | {start[0] if start else '-'} | {m.get('pss_kb') or '-'} | {fails or '-'} | {skips or '-'} |")
print('| Persona | Máy | Vùng | Hành vi | Mạng | Chữ | Khoản | KQ ✅/❌/⏭ | Mở nguội ms | PSS KB | Bước lỗi | Bỏ qua |')
print('|---|---|---|---|---|---|---|---|---|---|---|---|')
print('\n'.join(rows))
json.dump([{'id': r['persona']['id'], 'api': r['api'], 'apk': r.get('apk'), 'result': r['result'], 'metrics': r.get('metrics'),
            'fails': [s['step'] for s in r['steps'] if s['status'] == 'fail'], 'skips': r.get('skipped')} for r in allres],
          open(os.path.join(RUNS, 'summary.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f"\n{len(allres)} persona; pass={sum(r['result'] == 'pass' for r in allres)} fail={sum(r['result'] == 'fail' for r in allres)}", file=sys.stderr)
