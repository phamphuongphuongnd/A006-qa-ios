"""Print shell `export` lines for one QA-100 persona (iOS run).

Usage: python3 qa/ios/persona_env.py P001 [fixtures_dir]
Maps persona fields to simulator settings + Maestro -e values. Nothing here is a test result.
"""
import json
import os
import shlex
import sys

# fontScale → iOS Dynamic Type category (`xcrun simctl ui <dev> content_size`). Body text is 17 pt at `large`.
CONTENT_SIZE = {
    0.85: 'small',  # 15 pt ≈ 0.88
    1: 'large',  # 17 pt = 1.0
    1.3: 'extra-extra-extra-large',  # 23 pt ≈ 1.35
    2: 'accessibility-large',  # 33 pt ≈ 1.94
}
# Persona id suffixes (`P052-xxl`, `P001-ipad`): `-ipad` only names the lane; a size suffix overrides the persona's
# Dynamic Type so one persona can be re-run at a neighbouring size (B-147 regression: SE XXL vs XXXL).
SIZE_SUFFIX = {
    'l': 'large',
    'xl': 'extra-large',
    'xxl': 'extra-extra-large',
    'xxxl': 'extra-extra-extra-large',
    'axm': 'accessibility-medium',
    'axl': 'accessibility-large',
}
REGION_LABEL = {'UK': 'United Kingdom', 'US': 'United States'}
REGION_SWITCH = {'region_switch', 'recurring_rules'}


def main():
    pid = sys.argv[1]
    fixtures = sys.argv[2] if len(sys.argv) > 2 else 'qa/fixtures'
    personas = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'personas.json'), encoding='utf-8'))
    p = next(x for x in personas if x['id'] == pid.split('-')[0])
    fixture_file = os.path.join(fixtures, f"{p['id']}.sundaysort")
    has_fixture = p['entries'] > 0 and os.path.isfile(fixture_file)
    size = next((SIZE_SUFFIX[x] for x in pid.lower().split('-')[1:] if x in SIZE_SUFFIX), None)
    other = 'US' if p['region'] == 'UK' else 'UK'
    env = {
        'PID': pid,
        'P_DEVICE': p['ios'] or '',
        'P_BEHAVIOUR': p['behaviour'],
        'P_ENTRIES': str(p['entries']),
        'P_NETWORK': p['network'],
        'P_FONT_SCALE': str(p['fontScale']),
        'P_TZ': p['timeZone'],
        'CONTENT_SIZE': size or CONTENT_SIZE.get(p['fontScale'], 'large'),
        'APPEARANCE': 'dark' if p['dark'] else 'light',
        'REGION': p['region'],
        'REGION_LABEL': REGION_LABEL[p['region']],
        'OTHER_REGION_LABEL': REGION_LABEL[other],
        'AMOUNT': str(5 + p['seed'] % 90),
        'NOTE': f"QA-{pid} Shell M62",
        'FIXTURE': p['id'] if has_fixture else 'none',
        'FIXTURE_FILE': fixture_file if has_fixture else '',
        'FIXTURE_NOTE': '' if has_fixture else ('persona has 0 entries' if p['entries'] == 0 else f'missing {fixture_file}'),
        'DO_REGION_SWITCH': 'true' if p['behaviour'] in REGION_SWITCH else 'false',
        'DO_KILL': 'true' if p['behaviour'] == 'kill_mid_save' else 'false',
        'DO_WIPE': 'true' if p['behaviour'] == 'wipe_all' else 'false',
    }
    for k, v in env.items():
        print(f'export {k}={shlex.quote(v)}')


if __name__ == '__main__':
    main()
