"""Generate Firebase Test Lab Robo scripts for A006 Sunday Sort (QA-100 session G).

  python -I qa/firebase/make_robo.py   -> robo-{uk,us}-simple.json, robo-{uk,us}-full.json next to this file

simple: onboarding (Get started -> region -> Continue x2 -> Looks good -> Continue free -> Not now) + the five tabs
        + New expense.
full:   simple + type 1250 (cash-register keypad: 12.50) + Save, then restore qa/fixtures/P096.sundaysort pushed with
        `--other-files /sdcard/Download/P096.sundaysort=...` (Settings -> Backup & restore -> Restore from backup ->
        DocumentsUI Downloads -> file -> Replace this phone's data -> Restore), then Home/Entries/Reports/Sort.

Only the plain action-list format works on Test Lab here: scripts with id/priority/contextDescriptor,
WAIT_FOR_ELEMENT, TAKE_SCREENSHOT or ELEMENT_IGNORED ended in "Infrastructure error" (2026-11-18, 5 runs), so Pro /
delete buttons cannot be fenced off — Robo may tap them after the script (no store purchase is possible: app not on Play).
Selectors: every RN control exposes only contentDescription (no `text`); rows join their texts with ", " but a
pill/badge child is not included ("Backup & restore"). Only the system file picker is matched by text.
"""
import json
import os

PKG = 'com.phiotron.sundaysort'
FILE = '/sdcard/Download/P096.sundaysort'


def wait(ms):
    return {'eventType': 'WAIT', 'delayTime': ms}


REGION_DESC = {
    'UK': 'United Kingdom. £ · Tax year 6 Apr – 5 Apr · Self Assessment & MTD',
    'US': 'United States. $ · Calendar year · Schedule C',
}


def simple_actions(region):
    """Plain action list (the format Robo itself records): exact contentDescription taps + WAITs only.
    Scripts with WAIT_FOR_ELEMENT / TAKE_SCREENSHOT / regex / priority hit "Infrastructure error" on Test Lab
    (2026-11-18, 5 tries), so the device runs use this form; Robo screenshots every action itself."""
    def tap(label):
        return {'eventType': 'VIEW_CLICKED', 'elementDescriptors': [{'contentDescription': label}]}
    a = [wait(4000)]
    for label in ('Get started', REGION_DESC[region], 'Continue', 'Continue', 'Looks good', 'Continue free', 'Not now'):
        a += [tap(label), wait(1500)]
    for tab in ('Entries', 'Sort', 'Miles', 'Reports', 'Home'):
        a += [tap(tab), wait(2000)]
    a += [tap('New expense'), wait(2500)]
    return a


def full_actions(region):
    """simple_actions + one expense of 1250 (12.50) + restore of P096 (pushed with --other-files).
    Still only exact contentDescription / text taps, WAITs and one ADB_SHELL_COMMAND (all in the plain format)."""
    def tap(label):
        return {'eventType': 'VIEW_CLICKED', 'elementDescriptors': [{'contentDescription': label}]}

    def tap_text(text):
        return {'eventType': 'VIEW_CLICKED', 'elementDescriptors': [{'text': text}]}

    a = simple_actions(region)  # ends on the capture screen (New expense)
    a += [
        {'eventType': 'ADB_SHELL_COMMAND', 'command': 'input text 1250'}, wait(1500),
        tap('Save'), wait(3000),
        {'eventType': 'ADB_SHELL_COMMAND', 'command': f'am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://{FILE}'},
        tap('Settings'), wait(2000),
        # B-104 (QA F-1) check: a fresh 7-day trial must say "7 days left". The trial is local ("No card needed"),
        # no store call. Robo takes the screenshot of the Pro screen itself.
        tap('Sunday Sort Pro. Free · See Pro'), wait(2500),
        tap('Try Pro free for 7 days'), wait(3000),
        tap('Back'), wait(2000),
        # "Backup & restore" sits below the fold on phones (2026-11-18: script stopped here on 5 devices)
        {'eventType': 'ONE_POINT_GESTURE', 'coordinates': '(50%,80%)->(50%,25%)'}, wait(1200),
        {'eventType': 'ONE_POINT_GESTURE', 'coordinates': '(50%,80%)->(50%,25%)'}, wait(1200),
        tap('Backup & restore'), wait(2000),
        tap('Restore from backup'), wait(4000),
        tap('Show roots'), wait(1500),
        tap_text('Downloads'), wait(2500),
        tap_text('P096.sundaysort'), wait(15000),
        tap("Replace this phone's data"), wait(2000),
        tap('Restore'), wait(45000),
        tap('Back'), wait(1500),
        tap('Home'), wait(3000),
        tap('Entries'), wait(4000),
        tap('Reports'), wait(4000),
        tap('Sort'), wait(3000),
        tap('Home'), wait(2000),
    ]
    return a


if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    for region in ('UK', 'US'):
        for kind, fn in (('simple', simple_actions), ('full', full_actions)):
            with open(os.path.join(here, f'robo-{region.lower()}-{kind}.json'), 'w', encoding='utf-8', newline='\n') as f:
                json.dump(fn(region), f, indent=1, ensure_ascii=False)
                f.write('\n')
    print('ok')
