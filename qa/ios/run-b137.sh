#!/usr/bin/env bash
# B-137 (iOS): the trip map must appear even when the first GPS fix comes after the old 12 s map timer.
# Usage: run-b137.sh <udid> <app_path> <out_root> <persona>
# No location → Start trip → set a location at ~20 s → look at 30 s and 60 s for the MapLibre map ("Map of the trip").
set -u
UDID=$1 APP=$2 OUT_ROOT=$3 PIDX=${4:-P092}
REPO=$(cd "$(dirname "$0")/../.." && pwd)
SUITE="$REPO/qa/maestro"
OUT="$OUT_ROOT/b137"
mkdir -p "$OUT/raw" "$OUT/shots"
log() { echo "[b137 $(date +%H:%M:%S)] $*" | tee -a "$OUT/b137.log"; }

eval "$(python3 "$REPO/qa/ios/persona_env.py" "$PIDX" none)"
xcrun simctl terminate "$UDID" com.phiotron.sundaysort >/dev/null 2>&1
xcrun simctl uninstall "$UDID" com.phiotron.sundaysort >/dev/null 2>&1
xcrun simctl install "$UDID" "$APP"
if [ "$REGION" = UK ]; then LOC=en_GB; LANGS='("en-GB")'; else LOC=en_US; LANGS='("en-US")'; fi
xcrun simctl spawn "$UDID" defaults write -g AppleLocale "$LOC"
xcrun simctl spawn "$UDID" defaults write -g AppleLanguages "$LANGS"
xcrun simctl ui "$UDID" appearance "$APPEARANCE"
xcrun simctl ui "$UDID" content_size "$CONTENT_SIZE"
touch "$OUT/raw/.marker"

m() { # $1 = name, $2 = flow, rest = maestro -e args
  local name=$1 flow=$2; shift 2
  (cd "$OUT/raw" && perl -e 'alarm shift; exec @ARGV' 600 maestro --device "$UDID" test "$flow" \
     --format junit --output "$OUT/$name.junit.xml" --debug-output "$OUT/debug-$name" "$@") >> "$OUT/maestro.txt" 2>&1
  local code=$?
  log "$name exit $code"
  return $code
}

m onboarding "$SUITE/01_onboarding.yaml" -e "PID=$PID" -e "REGION_LABEL=$REGION_LABEL" -e "REGION=$REGION" \
  || { echo "onboarding failed: B-137 not run" >> "$OUT/result.txt"; exit 0; }
xcrun simctl location "$UDID" clear 2>&1 | tee -a "$OUT/b137.log"
if m start "$SUITE/extra/b137_start.yaml" -e "PID=$PID"; then
  T0=$(date +%s)
  sleep 18
  xcrun simctl location "$UDID" set 51.5007,-0.1246 2>&1 | tee -a "$OUT/b137.log"
  log "location set at +$(( $(date +%s) - T0 ))s after the trip screen"
  while [ "$(date +%s)" -lt $(( T0 + 30 )) ]; do sleep 1; done
  if m check30 "$SUITE/extra/b137_check.yaml" -e "PID=$PID" -e "TAG=30s" -e "FINAL=0"; then echo "map at 30 s: yes" >> "$OUT/result.txt"; else echo "map at 30 s: NO" >> "$OUT/result.txt"; fi
  while [ "$(date +%s)" -lt $(( T0 + 60 )) ]; do sleep 1; done
  if m check60 "$SUITE/extra/b137_check.yaml" -e "PID=$PID" -e "TAG=60s" -e "FINAL=1"; then echo "map at 60 s: yes" >> "$OUT/result.txt"; else echo "map at 60 s: NO" >> "$OUT/result.txt"; fi
else
  echo "start failed" >> "$OUT/result.txt"
fi
find "$OUT" "$REPO/qa" "$HOME/.maestro/tests" -newer "$OUT/raw/.marker" -name '*.png' 2>/dev/null | while read -r f; do
  case "$f" in */shots/*) continue ;; esac
  sips -s format jpeg -s formatOptions 70 -Z 1400 "$f" --out "$OUT/shots/$(basename "$f" .png).jpg" >/dev/null 2>&1 && rm -f "$f"
done
find "$OUT" -name 'device-simulator.log' -delete 2>/dev/null
log "done"; cat "$OUT/result.txt"
