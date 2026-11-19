"""QA-100: roll qa-runs/<out>/<id>/result.json up into qa-runs/<out>/summary.json.

  python qa/tools/summarize_runs.py --out android37 --profiles api37_phone,api37_320dp,api37_tablet

Every persona of the chosen profiles is listed; a persona without result.json is reported as missing (never PASS).
A persona is "pass" only when every step is ✅ or ⏭ (⏭ steps keep their reason).
"""
import argparse
import json
import os
from collections import Counter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='android37')
    ap.add_argument('--profiles', default='api37_phone,api37_320dp,api37_tablet')
    a = ap.parse_args()
    profs = a.profiles.split(',')
    personas = [p for p in json.load(open(os.path.join(ROOT, 'qa', 'personas.json'), encoding='utf-8')) if p['android'] in profs]
    base = os.path.join(ROOT, 'qa-runs', a.out)
    rows, verdicts, apks = [], Counter(), Counter()
    fails, skips, metrics = [], [], {'coldStartMs': [], 'restoreMs': [], 'pssKb': []}
    for p in personas:
        f = os.path.join(base, p['id'], 'result.json')
        if not os.path.exists(f):
            rows.append({'id': p['id'], 'verdict': 'missing'})
            verdicts['missing'] += 1
            continue
        r = json.load(open(f, encoding='utf-8'))
        bad = [s for s in r['steps'] if s['status'] == '❌']
        sk = [s for s in r['steps'] if s['status'] == '⏭']
        v = 'fail' if bad else 'pass'
        verdicts[v] += 1
        apks[r.get('apk') or 'ece3819'] += 1
        for s in bad:
            fails.append({'id': p['id'], 'step': s['step'], 'kind': s.get('kind'), 'reason': s.get('reason', '')[:300]})
        for s in sk:
            skips.append({'id': p['id'], 'step': s['step'], 'reason': s.get('reason', '')})
        for k in metrics:
            v2 = (r.get('metrics') or {}).get(k)
            if v2:
                metrics[k].append(v2)
        rows.append({
            'id': p['id'], 'behaviour': p['behaviour'], 'profile': r.get('profile'), 'region': p['region'],
            'network': p['network'], 'fontScale': p['fontScale'], 'dark': p['dark'], 'entries': p['entries'],
            'apk': r.get('apk') or 'ece3819', 'verdict': v, 'summary': r.get('summary'), 'durationS': r.get('durationS'),
            'metrics': r.get('metrics'), 'uiNotes': r.get('uiNotes', []),
            'failed': [f"{s['step']}: {s.get('reason', '')[:160]}" for s in bad],
            'skipped': [f"{s['step']}: {s.get('reason', '')}" for s in sk],
        })

    def stat(xs):
        xs = sorted(xs)
        return {'n': len(xs), 'min': xs[0], 'median': xs[len(xs) // 2], 'max': xs[-1]} if xs else None

    out = {
        'out': a.out, 'profiles': profs, 'personas': len(personas), 'verdicts': dict(verdicts), 'apk': dict(apks),
        'metrics': {k: stat(v) for k, v in metrics.items()},
        'failures': fails, 'skips': skips, 'rows': rows,
    }
    path = os.path.join(base, 'summary.json')
    json.dump(out, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(json.dumps({k: out[k] for k in ('personas', 'verdicts', 'apk', 'metrics')}, ensure_ascii=False))
    for f in fails:
        print('❌', f['id'], f['step'], f['kind'], f['reason'][:140])


if __name__ == '__main__':
    main()
