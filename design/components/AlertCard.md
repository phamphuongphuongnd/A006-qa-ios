# AlertCard

At most one alert card on Home, under the header, in this priority: trip stopped recording → automatic trips paused by the phone → no trips on working days → backups failing → Pro renews → old backup (only when nightly backup is off and the last one is over 30 days old).

- Problems: `warn-soft` + `warn-text` icon. Information (renewal): `sunday-soft`.
- Title bold, one-sentence body, one primary action + a text "Later/OK". ✕ hides for 7 days (not for the first one).
- On iOS the renewal card says "App Store" instead of "Google Play".
