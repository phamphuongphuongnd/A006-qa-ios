"""Download Firebase Test Lab results and build qa-runs/firebase/summary.json (QA-100 session G).

  python -I qa/firebase/collect.py matrix-id [matrix-id ...]

Per execution: copies the device folder from the results bucket to qa-runs/firebase/<model>-<api>/
(skips if already there), then reads the Tool Results step (outcome, issues, perf series) and the local
logcat / actions.json. Merges into qa-runs/firebase/summary.json keyed by "<model>-<api>".
Facts only — notes from looking at screenshots are added by hand under "review".
"""
import json
import os
import re
import subprocess
import sys
import urllib.request

PROJECT = 'sundaysort-qa-107cd'
PKG = 'com.phiotron.sundaysort'
GCLOUD = r'C:\Users\Admin\qa-tools\google-cloud-sdk\bin\gcloud.cmd'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'qa-runs', 'firebase')
ROOT = os.path.normpath(ROOT)
ROBO_STEPS = ['Get started', 'region', 'Continue', 'Continue', 'Looks good', 'Continue free', 'Not now', 'Entries', 'Sort',
              'Miles', 'Reports', 'Home', 'New expense', 'type 1250', 'Save', 'media scan', 'Settings',
              'swipe', 'swipe', 'Backup & restore', 'Restore from backup', 'Show roots', 'Downloads', 'P096.sundaysort',
              "Replace this phone's data", 'Restore', 'Back', 'Home', 'Entries', 'Reports', 'Sort', 'Home']


def token():
    return subprocess.run([GCLOUD, 'auth', 'print-access-token'], capture_output=True, text=True, shell=False).stdout.strip()


def get(url, tok):
    req = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + tok})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def perf(base, tok):
    out = {}
    try:
        series = get(base + '/perfSampleSeries', tok).get('perfSampleSeries', [])
    except Exception as e:  # noqa: BLE001
        return {'error': repr(e)}
    for s in series:
        label = s['basicPerfSampleSeries']['sampleSeriesLabel']
        vals, page = [], ''
        try:
            while True:
                r = get(base + f"/perfSampleSeries/{s['sampleSeriesId']}/samples?pageSize=5000" + (f'&pageToken={page}' if page else ''), tok)
                vals += [x.get('value', 0.0) for x in r.get('perfSamples', [])]  # a missing value is a 0 sample
                page = r.get('nextPageToken')
                if not page:
                    break
        except Exception:  # noqa: BLE001
            pass
        if not vals:
            out[label] = None
        elif label.startswith('network'):
            out[label] = {'samples': len(vals), 'max_Bps': max(vals), 'approx_total_bytes': round(sum(vals))}
        else:
            out[label] = {'samples': len(vals), 'max': round(max(vals), 1), 'avg': round(sum(vals) / len(vals), 1)}
    return out


def local(d):
    r = {}
    lc = os.path.join(d, 'logcat')
    if os.path.exists(lc):
        txt = open(lc, encoding='utf-8', errors='replace').read()
        pids = set(re.findall(r'Start proc (\d+):' + re.escape(PKG), txt))
        fatal = [m.group(0)[:300] for m in re.finditer(r'FATAL EXCEPTION.*\n(?:.*\n){0,6}', txt) if PKG in m.group(0)]
        anr = [l[:200] for l in txt.splitlines() if 'ANR in ' + PKG in l]
        disp = re.findall(r'Displayed ' + re.escape(PKG) + r'/\S+(?: for user \d+)?: \+(\S+)', txt)
        r.update({
            'app_pids': sorted(pids), 'fatal_exceptions': fatal, 'anrs': anr, 'displayed_times': disp[:5],
            'input_injection_failed': txt.count('input event injection failed'),
            'reactnative_js_errors': [l[:200] for l in txt.splitlines() if 'ReactNativeJS' in l and (' E ' in l or 'Error' in l)][:10],
        })
    aj = os.path.join(d, 'actions.json')
    if os.path.exists(aj):
        ev = json.load(open(aj, encoding='utf-8'))['events']
        stop = next((i for i, e in enumerate(ev) if 'roboscriptFinished' in e), len(ev))
        script = [e for e in ev[:stop] if e.get('isRoboscriptActive') and ('target' in e or 'adbCommandEvent' in e)]
        finished = [e['roboscriptFinished'].get('reason') for e in ev if 'roboscriptFinished' in e]
        r.update({
            'robo_actions': len([e for e in ev if 'sequence' in e]),
            'crawl_seconds': round(max((e.get('endTimeSeconds') or 0) for e in ev), 1),
            'script_steps_done': len(script),
            'script_last_step': ROBO_STEPS[len(script) - 1] if 0 < len(script) <= len(ROBO_STEPS) else None,
            'script_stop_reason': finished[0] if finished else None,
            'screens_visited': len({e.get('destinationScreenId') for e in ev if e.get('destinationScreenId')}),
        })
    art = os.path.join(d, 'artifacts')
    r['screenshots'] = len([n for n in os.listdir(art) if n.endswith('.png')]) if os.path.isdir(art) else 0
    return r


def main(matrices):
    tok = token()
    path = os.path.join(ROOT, 'summary.json')
    summary = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {}
    for mid in matrices:
        m = get(f'https://testing.googleapis.com/v1/projects/{PROJECT}/testMatrices/{mid}', tok)
        gcs = m['resultStorage']['googleCloudStorage']['gcsPath'].rstrip('/')
        app = m['testSpecification'].get('androidRoboTest', {}).get('appApk', {}).get('gcsPath', '')
        script = m['testSpecification'].get('androidRoboTest', {}).get('roboScript', {}).get('gcsPath', '')
        for e in m.get('testExecutions', []):
            dev = e['environment']['androidDevice']
            key = f"{dev['androidModelId']}-{dev['androidVersionId']}"
            folder = f"{dev['androidModelId']}-{dev['androidVersionId']}-{dev['locale']}-{dev['orientation']}"
            d = os.path.join(ROOT, key)
            if e['state'] == 'FINISHED' and not os.path.exists(os.path.join(d, 'logcat')):
                os.makedirs(d, exist_ok=True)
                subprocess.run([GCLOUD, 'storage', 'cp', '-r', f'{gcs}/{folder}/*', d], capture_output=True)
            st = e.get('toolResultsStep', {})
            base = (f"https://toolresults.googleapis.com/toolresults/v1beta3/projects/{PROJECT}/histories/{st.get('historyId')}"
                    f"/executions/{st.get('executionId')}/steps/{st.get('stepId')}")
            rec = {'matrix': mid, 'state': e['state'], 'device': dev, 'apk': os.path.basename(app),
                   'robo_script': os.path.basename(script), 'results_gcs': f'{gcs}/{folder}/',
                   'test_details': {k: v for k, v in e.get('testDetails', {}).items() if k != 'progressMessages'}}
            if st.get('stepId') and e['state'] == 'FINISHED':
                try:
                    step = get(base, tok)
                    rec['outcome'] = step.get('outcome')
                    rec['issues'] = [{k: t.get(k) for k in ('type', 'severity', 'errorMessage')}
                                     for t in step.get('testExecutionStep', {}).get('testIssues', [])]
                    pm = get(base + '/perfMetricsSummary', tok)
                    rec['perf_environment'] = pm.get('perfEnvironment')
                    rec['app_start_time'] = pm.get('appStartTime')
                    rec['perf'] = perf(base, tok)
                except Exception as ex:  # noqa: BLE001
                    rec['toolresults_error'] = repr(ex)
            if os.path.isdir(d):
                rec['local'] = local(d)
            old = summary.get(key, {})
            rec['review'] = old.get('review', [])
            summary[key] = rec
            print(key, e['state'], rec.get('outcome', {}).get('summary') if rec.get('outcome') else '', rec.get('local', {}).get('script_steps_done'))
    json.dump(summary, open(path, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)


if __name__ == '__main__':
    main(sys.argv[1:])
