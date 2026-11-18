#!/usr/bin/env bash
# QA-100 iOS: run a list of personas on ONE booted simulator, one after the other.
# Usage: run-lane.sh <lane> <udid> <device_name> <runtime> <app_path> <out_root> <deadline_epoch> <P001,P002,...>
# Per persona: reinstall app → appearance / Dynamic Type / TZ → persona backup into Files → Maestro suite →
# app log + crash reports + screenshots → result.json. Nothing is marked passed unless Maestro says so.
set -u
LANE=$1 UDID=$2 DEVICE_NAME=$3 RUNTIME=$4 APP=$5 OUT_ROOT=$6 DEADLINE=$7 PERSONAS=$8
export LANE UDID DEVICE_NAME RUNTIME
REPO=$(cd "$(dirname "$0")/../.." && pwd)
SUITE="$REPO/qa/maestro"
FIXTURES="${FIXTURES_DIR:-$REPO/qa/fixtures}"
BUNDLE=com.phiotron.sundaysort
PER_PERSONA_TIMEOUT=${PER_PERSONA_TIMEOUT:-1200}
mkdir -p "$OUT_ROOT/personas"

log() { echo "[$LANE $(date +%H:%M:%S)] $*"; }

collect_shots() { # $1 = marker file, $2 = destination dir, $3 = persona dir, $4 = screenshot name prefix
  # Lanes run in parallel: shared folders are filtered by this persona's prefix.
  local marker=$1 dest=$2 own=$3 prefix=$4
  mkdir -p "$dest"
  { find "$own" -newer "$marker" -name '*.png' 2>/dev/null
    find "$REPO/qa" "$HOME/.maestro/tests" -newer "$marker" -name "${prefix}_*.png" 2>/dev/null; } | while read -r f; do
    case "$f" in */shots/*) continue ;; esac
    local base
    base=$(basename "$f" .png)
    sips -s format jpeg -s formatOptions 70 -Z 1400 "$f" --out "$dest/$base.jpg" >/dev/null 2>&1 && rm -f "$f"
  done
}

for PIDX in ${PERSONAS//,/ }; do
  if [ "$(date +%s)" -ge "$DEADLINE" ]; then
    log "$PIDX skipped: time budget reached"
    echo "$PIDX" >> "$OUT_ROOT/budget_skipped.txt"
    continue
  fi
  OUT="$OUT_ROOT/personas/$PIDX"
  mkdir -p "$OUT/raw" "$OUT/crash"
  (
    eval "$(python3 "$REPO/qa/ios/persona_env.py" "$PIDX" "$FIXTURES")"
    log "$PIDX $P_BEHAVIOUR region=$REGION $APPEARANCE $CONTENT_SIZE tz=$P_TZ fixture=$FIXTURE"
    xcrun simctl terminate "$UDID" "$BUNDLE" >/dev/null 2>&1
    xcrun simctl uninstall "$UDID" "$BUNDLE" >/dev/null 2>&1
    xcrun simctl install "$UDID" "$APP" || { log "install failed"; }
    # Device locale follows the persona's region (expo-localization picks the default region from it).
    if [ "$REGION" = UK ]; then LOC=en_GB; LANGS='("en-GB")'; else LOC=en_US; LANGS='("en-US")'; fi
    xcrun simctl spawn "$UDID" defaults write -g AppleLocale "$LOC"
    xcrun simctl spawn "$UDID" defaults write -g AppleLanguages "$LANGS"
    export DEVICE_LOCALE=$LOC
    xcrun simctl ui "$UDID" appearance "$APPEARANCE"
    xcrun simctl ui "$UDID" content_size "$CONTENT_SIZE"
    TZ_APPLIED=no
    if xcrun simctl spawn "$UDID" launchctl setenv TZ "$P_TZ"; then TZ_APPLIED="launchctl setenv TZ + SIMCTL_CHILD_TZ (unverified)"; fi
    export SIMCTL_CHILD_TZ="$P_TZ" TZ_APPLIED

    FIXTURE_PLACED=no
    FP=$(xcrun simctl get_app_container "$UDID" com.apple.FileProvider.LocalStorage groups 2>/dev/null | awk '/group.com.apple.FileProvider.LocalStorage/ {print $2}')
    if [ -n "$FP" ]; then
      mkdir -p "$FP/File Provider Storage"
      find "$FP/File Provider Storage" -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null
      if [ "$FIXTURE" != none ] && cp "$FIXTURE_FILE" "$FP/File Provider Storage/"; then FIXTURE_PLACED=yes; fi
    fi
    if [ "$FIXTURE" != none ] && [ "$FIXTURE_PLACED" != yes ]; then
      log "fixture not placed (FP='$FP')"
      FIXTURE_NOTE="File Provider container not found"
      FIXTURE=none
    fi
    export FIXTURE FIXTURE_PLACED FIXTURE_NOTE

    # The XCTest driver is installed by the first persona of the lane; later ones reuse it.
    REINSTALL=""
    if [ -f "$OUT_ROOT/.driver-$LANE" ]; then REINSTALL="--no-reinstall-driver"; fi
    MARKER="$OUT/raw/.marker"
    touch "$MARKER"
    LOG_START=$(date '+%Y-%m-%d %H:%M:%S')
    T0=$(date +%s)
    (
      cd "$OUT/raw" || exit 99
      perl -e 'alarm shift; exec @ARGV' "$PER_PERSONA_TIMEOUT" \
        maestro --device "$UDID" test "$SUITE" $REINSTALL \
        --format junit --output "$OUT/junit.xml" --debug-output "$OUT/debug" --test-output-dir "$OUT/maestro-out" \
        -e "PID=$PID" -e "REGION=$REGION" -e "REGION_LABEL=$REGION_LABEL" -e "OTHER_REGION_LABEL=$OTHER_REGION_LABEL" \
        -e "AMOUNT=$AMOUNT" -e "NOTE=$NOTE" -e "FIXTURE=$FIXTURE" -e "DO_REGION_SWITCH=$DO_REGION_SWITCH" \
        -e "DO_KILL=$DO_KILL" -e "DO_WIPE=$DO_WIPE"
    ) > "$OUT/maestro.txt" 2>&1
    CODE=$?
    touch "$OUT_ROOT/.driver-$LANE"
    DUR=$(( $(date +%s) - T0 ))
    log "$PIDX maestro exit $CODE in ${DUR}s"

    xcrun simctl spawn "$UDID" log show --start "$LOG_START" --style compact \
      --predicate 'process == "SundaySort" AND subsystem != "com.apple.dt.xctest"' 2>"$OUT/log-show.err" | tail -n 20000 > "$OUT/app.log"
    find "$HOME/Library/Logs/DiagnosticReports" -newer "$MARKER" -type f 2>/dev/null | while read -r c; do
      if grep -q "SundaySort\|$BUNDLE" "$c" 2>/dev/null; then cp "$c" "$OUT/crash/"; fi
    done
    collect_shots "$MARKER" "$OUT/shots" "$OUT" "$PID"
    python3 "$REPO/qa/ios/collect_result.py" "$OUT" "$CODE" "$DUR"
  )
done

if [ "${RUN_WIDGET:-0}" = 1 ] && [ "$(date +%s)" -lt "$DEADLINE" ]; then
  OUT="$OUT_ROOT/widget-$LANE"
  mkdir -p "$OUT/raw"
  touch "$OUT/raw/.marker"
  (cd "$OUT/raw" && perl -e 'alarm shift; exec @ARGV' 300 maestro --device "$UDID" test "$SUITE/extra/widget_ios.yaml" \
    --format junit --output "$OUT/junit.xml" --debug-output "$OUT/debug" -e "PID=widget_$LANE") > "$OUT/maestro.txt" 2>&1
  echo "exit $?" >> "$OUT/maestro.txt"
  collect_shots "$OUT/raw/.marker" "$OUT/shots" "$OUT" "widget_$LANE"
fi
log "lane done"
