#!/usr/bin/env bash
# Run a list of personas sequentially on one emulator: oldbatch.sh <serial> <apk-name> P001 P002 ...
# One batch per emulator (lock dir). Exit 9 from oldrun = emulator/adb trouble → wait for the device and re-run (max 2).
cd "$(dirname "$0")/../.."
serial=$1; apk=$2; shift 2
ADB=/c/Users/Admin/AppData/Local/Android/Sdk/platform-tools/adb.exe
lock="qa-runs/android-old/_logs/lock-$serial"
mkdir -p qa-runs/android-old/_logs
if ! mkdir "$lock" 2>/dev/null; then echo "another batch holds $lock"; exit 3; fi
echo $$ > "$lock/pid"
trap 'rm -rf "$lock"' EXIT
export MSYS_NO_PATHCONV=1 PYTHONIOENCODING=utf-8 QA_APK=$apk
wait_up() {
  for i in $(seq 1 36); do
    if [ "$(timeout 10 $ADB -s $serial shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; then return 0; fi
    $ADB reconnect offline >/dev/null 2>&1; sleep 5
  done
  return 1
}
for p in "$@"; do
  for attempt in 1 2 3; do
    wait_up || { echo "=== $serial not coming back, stop"; exit 4; }
    echo "=== $p try $attempt $(date +%H:%M:%S)"
    timeout 1500 python qa/tools/oldrun.py "$serial" "$p" > "qa-runs/android-old/_logs/$p.log" 2>&1
    rc=$?
    tail -n 1 "qa-runs/android-old/_logs/$p.log"
    [ $rc -ne 9 ] && break
    cp "qa-runs/android-old/_logs/$p.log" "qa-runs/android-old/_logs/$p.infra$attempt.log"
  done
done
echo "=== done $(date +%H:%M:%S)"
