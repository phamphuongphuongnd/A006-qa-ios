"""Write result.json for one persona run from the Maestro JUnit report + what the runner observed.

Usage: python3 qa/ios/collect_result.py <out_dir> <maestro_exit> <duration_s>
Reads env written by persona_env.py plus DEVICE_NAME, RUNTIME, UDID, TZ_APPLIED, FIXTURE_PLACED, LANE.
Steps not in the JUnit file are reported as "not_run" — never as passed.
"""
import glob
import json
import os
import sys
import xml.etree.ElementTree as ET

STEPS = ['01_onboarding', '02_restore', '03_tour', '04_quick_add', '05_entry_detail', '06_sort_one', '07_split_one',
         '08_manual_trip', '09_export_csv', '10_weird_note', '11_double_save', '12_region_switch', '13_kill_mid_save',
         '14_wipe_all', '15_auto_trips', '16_end_trip', '17_gps_trip', '18_recently_deleted', '19_notifications', '20_free_texts',
         '21_export_groups', '22_rules_recurring', '23_sort_edit_split', '24_trip_map', '99_final_state']


def junit_steps(path):
    res = {}
    if not os.path.isfile(path):
        return res
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as e:
        return {'_parse_error': str(e)}
    for tc in root.iter('testcase'):
        name = tc.get('name') or tc.get('id') or '?'
        fail = tc.find('failure')
        err = tc.find('error')
        skipped = tc.find('skipped')
        status = 'failed' if (fail is not None or err is not None) else ('skipped' if skipped is not None else 'passed')
        msg = ''
        node = fail if fail is not None else err
        if node is not None:
            msg = (node.get('message') or node.text or '').strip()[:600]
        res[name] = {'status': status, 'time_s': tc.get('time'), 'message': msg}
    return res


def main():
    out, code, dur = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    e = os.environ
    steps = junit_steps(os.path.join(out, 'junit.xml'))
    conditional = {
        '02_restore': e.get('FIXTURE') != 'none',
        '12_region_switch': e.get('DO_REGION_SWITCH') == 'true',
        '13_kill_mid_save': e.get('DO_KILL') == 'true',
        '14_wipe_all': e.get('DO_WIPE') == 'true',
    }
    step_list = []
    for s in STEPS:
        r = steps.get(s, {'status': 'not_run', 'time_s': None, 'message': 'no testcase in junit.xml'})
        r = dict(r, step=s)
        if s in conditional and not conditional[s] and r['status'] == 'passed':
            r['status'] = 'not_applicable'
        step_list.append(r)
    skipped = [
        {'item': 'network profile', 'reason': f"persona network={e.get('P_NETWORK')}: simulator shares the runner's network and the app has no server; Network Link Conditioner needs a GUI"},
    ]
    if e.get('FIXTURE') == 'none':
        skipped.append({'item': 'persona data restore', 'reason': e.get('FIXTURE_NOTE') or 'no fixture'})
    elif e.get('FIXTURE_PLACED') != 'yes':
        skipped.append({'item': 'persona data restore', 'reason': 'could not copy fixture into Files (File Provider container not found)'})
    if e.get('P_BEHAVIOUR') in ('app_lock', 'revoke_permissions', 'low_storage', 'gps_trips', 'pro_trial', 'clock_tax_boundary', 'recurring_rules'):
        skipped.append({'item': f"behaviour {e.get('P_BEHAVIOUR')}", 'reason': 'not scripted in the iOS Maestro suite (round 1 runs the common journey only)'})
    shots = sorted(os.path.basename(p) for p in glob.glob(os.path.join(out, 'shots', '*')))
    crashes = sorted(os.path.basename(p) for p in glob.glob(os.path.join(out, 'crash', '*')))
    log_path = os.path.join(out, 'app.log')
    log_lines = 0
    js_errors = []
    if os.path.isfile(log_path):
        with open(log_path, encoding='utf-8', errors='replace') as f:
            for line in f:
                log_lines += 1
                low = line.lower()
                if ('error' in low or 'exception' in low or 'fatal' in low) and len(js_errors) < 40:
                    js_errors.append(line.strip()[:400])
    result = {
        'persona': e.get('PID'),
        'lane': e.get('LANE'),
        'device': {'name': e.get('DEVICE_NAME'), 'udid': e.get('UDID'), 'runtime': e.get('RUNTIME'), 'persona_device': e.get('P_DEVICE')},
        'settings': {
            'region': e.get('REGION'), 'appearance': e.get('APPEARANCE'), 'content_size': e.get('CONTENT_SIZE'),
            'font_scale': e.get('P_FONT_SCALE'), 'time_zone': e.get('P_TZ'), 'tz_applied': e.get('TZ_APPLIED'),
            'locale': e.get('DEVICE_LOCALE'), 'behaviour': e.get('P_BEHAVIOUR'), 'entries': e.get('P_ENTRIES'), 'fixture': e.get('FIXTURE'),
        },
        'maestro_exit': code,
        'duration_s': dur,
        'steps': step_list,
        'passed': sum(1 for s in step_list if s['status'] == 'passed'),
        'failed': sum(1 for s in step_list if s['status'] == 'failed'),
        'not_run': sum(1 for s in step_list if s['status'] == 'not_run'),
        'screenshots': shots,
        'crash_reports': crashes,
        'log_lines': log_lines,
        'log_error_lines': js_errors,
        'skipped': skipped,
    }
    with open(os.path.join(out, 'result.json'), 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=1)
    print(f"{result['persona']}: passed {result['passed']} failed {result['failed']} not_run {result['not_run']} crashes {len(crashes)} shots {len(shots)}")


if __name__ == '__main__':
    main()
