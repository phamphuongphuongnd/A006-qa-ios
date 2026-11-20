#!/usr/bin/env bash
# B-96 v2 (iOS) on ONE booted simulator: a driver's trip that stops moving must end with ONE local notification
# "Trip ended at HH:MM · 0.0 mi" + Continue trip, also when iOS no longer runs the app.
# Usage: run-b96.sh <udid> <app_path> <out_root> <persona>
#   variant K: app killed (stopApp) → after ~12 min the booked notice; Continue → trip runs again
#   variant H: app in the background (Home) → after ~12 min exactly one notice; app → Miles shows the ended trip
# Each look that finds nothing waits until minute 23 and looks once more. Real phone sleep is not covered (⏭).
set -u
UDID=$1 APP=$2 OUT_ROOT=$3 PIDX=${4:-P022}
REPO=$(cd "$(dirname "$0")/../.." && pwd)
SUITE="$REPO/qa/maestro"
OUT="$OUT_ROOT/b96"
mkdir -p "$OUT/raw" "$OUT/shots"
log() { echo "[b96 $(date +%H:%M:%S)] $*" | tee -a "$OUT/b96.log"; }

eval "$(python3 "$REPO/qa/ios/persona_env.py" "$PIDX" none)"
xcrun simctl terminate "$UDID" com.phiotron.sundaysort >/dev/null 2>&1
xcrun simctl uninstall "$UDID" com.phiotron.sundaysort >/dev/null 2>&1
xcrun simctl install "$UDID" "$APP"
if [ "$REGION" = UK ]; then LOC=en_GB; LANGS='("en-GB")'; else LOC=en_US; LANGS='("en-US")'; fi
xcrun simctl spawn "$UDID" defaults write -g AppleLocale "$LOC"
xcrun simctl spawn "$UDID" defaults write -g AppleLanguages "$LANGS"
xcrun simctl ui "$UDID" appearance "$APPEARANCE"
xcrun simctl ui "$UDID" content_size "$CONTENT_SIZE"
xcrun simctl spawn "$UDID" launchctl setenv TZ "$P_TZ" >/dev/null 2>&1
touch "$OUT/raw/.marker"

m() { # $1 = name, rest = maestro args after the flow path
  local name=$1 flow=$2; shift 2
  (cd "$OUT/raw" && perl -e 'alarm shift; exec @ARGV' 900 maestro --device "$UDID" test "$flow" \
     --format junit --output "$OUT/$name.junit.xml" --debug-output "$OUT/debug-$name" "$@") >> "$OUT/maestro.txt" 2>&1
  local code=$?
  log "$name exit $code"
  return $code
}
wait_until() { local t=$1; while [ "$(date +%s)" -lt "$t" ]; do sleep 20; done; }
look() { # $1 = variant tag, $2 = CONT, $3 = epoch the app was left
  local v=$1 cont=$2 left=$3
  wait_until $(( left + 13 * 60 ))
  if m "check-$v-13" "$SUITE/extra/b96_check.yaml" -e "PID=$PID" -e "TAG=${v}13" -e "CONT=$cont"; then echo "$v found at ~13 min" >> "$OUT/result.txt"; return 0; fi
  wait_until $(( left + 23 * 60 ))
  if m "check-$v-23" "$SUITE/extra/b96_check.yaml" -e "PID=$PID" -e "TAG=${v}23" -e "CONT=$cont"; then echo "$v found at ~23 min" >> "$OUT/result.txt"; return 0; fi
  echo "$v NOT found by 23 min" >> "$OUT/result.txt"; return 1
}

m onboarding "$SUITE/01_onboarding.yaml" -e "PID=$PID" -e "REGION_LABEL=$REGION_LABEL" -e "REGION=$REGION"
if [ $? -ne 0 ]; then
  log "onboarding failed: retry once after a simulator reboot"
  xcrun simctl shutdown "$UDID" >/dev/null 2>&1; xcrun simctl boot "$UDID"; xcrun simctl bootstatus "$UDID" -b >/dev/null
  m onboarding2 "$SUITE/01_onboarding.yaml" -e "PID=$PID" -e "REGION_LABEL=$REGION_LABEL" -e "REGION=$REGION" \
    || { echo "onboarding failed twice: B-96 not run" >> "$OUT/result.txt"; exit 0; }
fi

# Variant K: app killed.
if m start-K "$SUITE/extra/b96_start.yaml" -e "PID=$PID" -e "MODE=kill"; then
  LEFT=$(date +%s); log "K: app killed, waiting"
  look K 1 "$LEFT"
else
  echo "K start failed" >> "$OUT/result.txt"
fi

# Variant H: app only in the background.
if m start-H "$SUITE/extra/b96_start.yaml" -e "PID=$PID" -e "MODE=home"; then
  LEFT=$(date +%s); log "H: app in background, waiting"
  look H 0 "$LEFT"
else
  echo "H start failed" >> "$OUT/result.txt"
fi

xcrun simctl spawn "$UDID" log show --start "$(date -r "$(stat -f %m "$OUT/raw/.marker")" '+%Y-%m-%d %H:%M:%S')" --style compact \
  --predicate 'process == "SundaySort" AND subsystem != "com.apple.dt.xctest"' 2>/dev/null | tail -n 20000 > "$OUT/app.log"
find "$OUT" "$REPO/qa" "$HOME/.maestro/tests" -newer "$OUT/raw/.marker" -name '*.png' 2>/dev/null | while read -r f; do
  case "$f" in */shots/*) continue ;; esac
  sips -s format jpeg -s formatOptions 70 -Z 1400 "$f" --out "$OUT/shots/$(basename "$f" .png).jpg" >/dev/null 2>&1 && rm -f "$f"
done
find "$OUT" -name 'device-simulator.log' -delete 2>/dev/null
log "done"; cat "$OUT/result.txt"
