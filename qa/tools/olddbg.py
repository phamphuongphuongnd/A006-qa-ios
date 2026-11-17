"""Gỡ lỗi 1 hành trình trên máy phụ: python qa/tools/olddbg.py <serial> <persona> <behaviour> [--setup]
Kết quả/ảnh vào qa-runs/android-old/_dbg/<persona>-<behaviour>/ (không tính vào 40 persona)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import oldrun  # noqa: E402
import behaviours  # noqa: E402

serial, pid, beh = sys.argv[1:4]
r = oldrun.Run(serial, pid)
r.out = os.path.join(oldrun.RUNS, '_dbg', f'{pid}-{beh}')
os.makedirs(r.out, exist_ok=True)
if '--setup' in sys.argv:
    r.step('device profile', r.setup_device)
    r.step('fresh', r.fresh_install_state)
    r.step('cold', r.cold_start)
    r.step('onboard', r.onboard)
    r.step('restore', r.restore)
getattr(behaviours, beh)(r)
r.step('relaunch', behaviours.relaunch_check, r)
r.step('logs', r.logs)
