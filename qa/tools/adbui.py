"""Small adb UI helper for QA-100 (Android). Waits for text on screen before tapping (fact adb-device-testing).

Usage as a module:  from adbui import Dev; d = Dev('emulator-5554'); d.wait('Get started'); d.tap('Get started')
CLI:  python adbui.py <serial> dump        → visible texts with bounds
      python adbui.py <serial> shot <file> → screenshot PNG
"""
import os
import re
import subprocess
import sys
import time

ADB = os.environ.get('ADB', r'C:\Users\Admin\AppData\Local\Android\Sdk\platform-tools\adb.exe')
PKG = 'com.phiotron.sundaysort'
NODE = re.compile(r'<node [^>]*?text="([^"]*)"[^>]*?content-desc="([^"]*)"[^>]*?clickable="(true|false)"[^>]*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"')


def unescape(s):
    return s.replace('&apos;', "'").replace('&amp;', '&').replace('&quot;', '"').replace('&lt;', '<').replace('&gt;', '>').replace('&#10;', '\n')


class Dev:
    def __init__(self, serial):
        self.serial = serial

    def sh(self, *args, timeout=60, check=False):
        r = subprocess.run([ADB, '-s', self.serial, *args], capture_output=True, timeout=timeout)
        if check and r.returncode:
            raise RuntimeError(r.stderr.decode('utf-8', 'replace'))
        return r.stdout.decode('utf-8', 'replace')

    def shell(self, cmd, timeout=60):
        return self.sh('shell', cmd, timeout=timeout)

    def top(self):
        out = self.shell('dumpsys activity activities | grep topResumedActivity')
        return out.strip()

    def nodes(self):
        for _ in range(3):
            out = self.shell('uiautomator dump /sdcard/qa-ui.xml')
            if 'dumped' in out:
                xml = self.sh('exec-out', 'cat', '/sdcard/qa-ui.xml')
                res = []
                for m in NODE.finditer(xml):
                    t, d, c, x1, y1, x2, y2 = m.groups()
                    res.append({'text': unescape(t), 'desc': unescape(d), 'click': c == 'true', 'b': (int(x1), int(y1), int(x2), int(y2))})
                return res
            time.sleep(0.5)
        return []

    def find(self, label, exact=False, nodes=None):
        for n in nodes if nodes is not None else self.nodes():
            for v in (n['text'], n['desc']):
                if v and ((v == label) if exact else (label.lower() in v.lower())):
                    return n
        return None

    def wait(self, label, timeout=20, exact=False):
        end = time.time() + timeout
        while time.time() < end:
            n = self.find(label, exact)
            if n:
                return n
            time.sleep(0.4)
        raise TimeoutError(f'"{label}" not on screen ({self.top()})')

    def tap_xy(self, x, y):
        self.shell(f'input tap {x} {y}')

    def tap(self, label, timeout=20, exact=False):
        n = self.wait(label, timeout, exact)
        # Screens slide in: only tap once the element stopped moving (two dumps agree).
        for _ in range(10):
            time.sleep(0.25)
            m = self.find(label, exact)
            if m and m['b'] == n['b']:
                break
            n = m or n
        x1, y1, x2, y2 = n['b']
        self.tap_xy((x1 + x2) // 2, (y1 + y2) // 2)
        return n

    def size(self):
        m = re.search(r'(\d+)x(\d+)', self.shell('wm size').splitlines()[-1])
        return int(m.group(1)), int(m.group(2))

    def swipe_up(self, frac=0.5):
        w, h = self.size()
        self.shell(f'input swipe {w // 2} {int(h * 0.75)} {w // 2} {int(h * (0.75 - frac))} 400')

    def scroll_to(self, label, tries=8, exact=False):
        for _ in range(tries):
            n = self.find(label, exact)
            if n and n['b'][3] < self.size()[1] * 0.9:
                return n
            self.swipe_up()
            time.sleep(0.6)
        raise TimeoutError(f'"{label}" not found after scrolling')

    def text(self, s):
        self.shell("input text '" + s.replace(' ', '%s').replace("'", "") + "'")

    def key(self, code):
        self.shell(f'input keyevent {code}')

    def shot(self, path):
        data = subprocess.run([ADB, '-s', self.serial, 'exec-out', 'screencap', '-p'], capture_output=True, timeout=30).stdout
        with open(path, 'wb') as f:
            f.write(data)

    def texts(self):
        return [n['text'] or n['desc'] for n in self.nodes() if n['text'] or n['desc']]


if __name__ == '__main__':
    d = Dev(sys.argv[1])
    if sys.argv[2] == 'dump':
        for n in d.nodes():
            if n['text'] or n['desc']:
                print(('*' if n['click'] else ' '), n['b'], repr(n['text'] or n['desc'])[:90])
    elif sys.argv[2] == 'shot':
        d.shot(sys.argv[3])
