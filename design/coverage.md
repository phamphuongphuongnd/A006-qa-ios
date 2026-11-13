# Screen coverage

Every screen, state, dialog and notification named in product.md (bản 2), and the board in **Screens** that draws it. ✓ = drawn. Boards are listed by their card name.

## F-01 Onboarding — ScreenOnboarding, ScreenUS

| Item | State | Board |
|---|---|---|
| S-01a Welcome | — | ScreenOnboarding ✓ |
| S-01b Choose your region | UK preselected · US preselected · outside UK/US (nothing chosen, Continue dimmed) | ScreenOnboarding ✓ · ScreenUS ✓ |
| S-01c How do you claim your vehicle? | UK wording · US wording · “What's the difference?” sheet | ScreenOnboarding ✓ · ScreenUS ✓ |
| S-01d Your categories | UK · US | ScreenOnboarding ✓ · ScreenUS ✓ |
| S-01e Free & Pro | — | ScreenOnboarding ✓ |
| S-01f Weekly reminder | default · refused → snackbar “Reminders are off…” on empty Home | ScreenOnboarding ✓ · ScreenDialogs ✓ |

## F-02 Quick capture S-03 — ScreenQuickCapture

| State | Board |
|---|---|
| Empty, keypad up, Save off | ✓ (light iPhone) |
| Typed + 2 photos + note, receipt read with “From receipt” | ✓ |
| “Reading receipt…”, 3 photos (max), Photo off | ✓ |
| “Receipt says £72.40 · Use” | ✓ |
| Calculator “12.50+4.20 = £16.70” | ✓ (dark) |
| Invalid sum “Check the sum” | ✓ (dark) |
| Note open “Add a note (e.g. Shell, M62)”, ≤120 | ✓ |
| Date & time chip → picker → “Tue 10 Nov, 13:05” | ✓ |
| ≤3 free photos (orange) + max amount £999,999.99 | ✓ |
| Camera (Photo), long-press = library | ✓ |
| Free photos used up → sheet “Try Pro free for 7 days” / “Save without photo” | ✓ |
| Income + Keep adding + snackbar “Saved · £620.00 income” | ✓ (dark) |
| Snackbars “Saved · £12.50 expense”, “Saved · Fuel (auto-sorted)” | Snackbar component ✓ |
| Discard this entry? · camera denied · photo couldn't save | ScreenDialogs ✓ |
| Opened from app-icon long-press “New expense / New income / Start trip” | ScreenSystem ✓ |
| 320dp | ScreenAccessibility ✓ |

## F-03 Home S-02 — ScreenHome, ScreenUS, ScreenAccessibility

| State | Board |
|---|---|
| With data · Trial badge · auto trips on, waiting | ✓ |
| Trip running (Auto), dark | ✓ |
| Personal stop (Paused · Resume · End trip) | ✓ |
| Free: Start trip + “Tap your NFC tag or start here.” | ✓ |
| Auto trips paused (orange · Fix) | ✓ |
| Empty | ✓ |
| Alert: trip stopped recording at 14:05 | ✓ |
| Alert: automatic trips paused by your phone | ✓ |
| Alert: no trips on Tue or Wed | ✓ |
| Alert: backups are failing | ✓ (dark) |
| Alert: Pro renews on 6 Apr | ✓ (dark) |
| Banner: last backup 34 days ago | ✓ (dark) |
| “All sorted ✓” + “9 auto-sorted this week” | ✓ |
| US ($, calendar year) | ScreenUS ✓ |
| Text 200% · 320dp | ScreenAccessibility ✓ |

## F-04 / F-05 Entries S-04, Entry detail S-05 — ScreenEntries

| State | Board |
|---|---|
| List grouped by day, Auto / Recurring / Personal labels, paperclip ×2, FAB | ✓ |
| Search | ✓ |
| Swipe right = Work/Personal + “Marked as personal” · swipe left = Delete + “Entry deleted” | ✓ · ScreenDialogs ✓ |
| Date ▾ / Category ▾ filter sheet | ✓ |
| Multi-select: Merge · Set category · Work/Personal · Delete | ✓ |
| Empty “No entries yet” · filters match nothing | ✓ |
| Detail: rule “Sorted by rule ‘Shell → Fuel’” + “Read from receipt” | ✓ |
| Detail: “Split from £60.00 on 9 Nov”, Save lit, ⋯ menu (Split, Duplicate, Make recurring PRO, Delete) | ✓ |
| Detail: “Created by recurring ‘Van lease’” · “Edit recurring” | ✓ (dark) |
| Receipt full screen · “Delete photo” | ✓ (dark) |
| Discard changes? · Delete this entry? | ScreenDialogs ✓ |
| US entries | ScreenUS ✓ |

## F-06 Sort S-06 — ScreenSort

| State | Board |
|---|---|
| Entry card, Pro “Suggested” + snackbar “Sorted as Fuel” | ✓ |
| Week picker with “… left” | ✓ |
| “More…” all categories | ✓ |
| Split in place, balanced · not balanced (“£5.00 left”) | ✓ · ✓ (dark) |
| Trip card Work / Personal / Split trip | ✓ (dark) |
| Rule offer “Always sort ‘DPD’…” | ✓ (dark) |
| Free “Most used” + Edit in place | ✓ |
| Merge sheet “Merge with…” | ✓ |
| S-06a List view Pro · Free · “Apply suggested categories to 12 entries?” | ✓ · ✓ · ScreenDialogs ✓ |
| S-06d Auto-sorted review | ✓ |
| S-06c Week sorted | ✓ |
| Empty “Nothing to sort” | ✓ (dark) |
| Text 200% · 320dp | ScreenAccessibility ✓ |

## F-08 – F-10 Categories, rules, recurring — ScreenSettings, ScreenRules

| Item | Board |
|---|---|
| S-11 list with SA103 + MTD lines · edit sheet (MTD category, Vehicle running cost, Hide) | ScreenSettings ✓ |
| S-11 add category, duplicate-name error · hidden categories | ScreenSettings ✓ |
| S-18 rules Pro · rule sheet · free/ended locked · empty | ScreenRules ✓ |
| S-17 recurring list · edit sheet | ScreenRules ✓ |

## F-11 – F-13 Trips & Miles — ScreenMiles, ScreenTripSetup

| Item | Board |
|---|---|
| S-07 Miles: Mileage rate + 10,000 mi bar · 10,000 reached (dark) · Actual costs · empty + location denied · swipe left Personal · swipe right Work · ⋯ menu · tax-year picker | ScreenMiles ✓ |
| S-07b Active trip Auto (dark) · manual + “Weak GPS signal” · End trip sheet · Discard trip? | ScreenMiles ✓ · ScreenDialogs ✓ |
| S-07c Trip detail: stops + stop sheet · Personal segment · edit times + “Edited” (dark) · time picker · Delete this trip? | ScreenMiles ✓ · ScreenDialogs ✓ |
| S-08 Add trip · odometer error · long trip 1,240 mi | ScreenMiles ✓ · ScreenDialogs ✓ |
| S-07a Location explainer 1 of 2 · 2 of 2 | ScreenTripSetup ✓ |
| S-07e steps 1–4 (one screen each) | ScreenTripSetup ✓ |
| S-07d Android · iOS (setup unfinished, orange) · free/locked · van Bluetooth picker · Work hours | ScreenMiles ✓ · ScreenTripSetup ✓ |
| S-07f Battery tips (Samsung) | ScreenTripSetup ✓ |
| S-07g Android write · Tag ready ✓ · iPhone Shortcuts · not supported | ScreenTripSetup ✓ · ScreenMiles ✓ · ScreenDialogs ✓ |
| Activity / location permission denied | ScreenDialogs ✓ |
| US Miles (Business use 87%) | ScreenUS ✓ |

## F-14 / F-15 Reports S-09, Export S-10 — ScreenReports, ScreenUS

| Item | Board |
|---|---|
| Tax year · unsorted warning · totals · “Covered by mileage rate” | ScreenReports ✓ |
| By tax form line SA103 · MTD categories Q2 cumulative (dark) · Standard/Calendar | ScreenReports ✓ |
| Not sure yet card · Actual costs · month chart · empty period | ScreenReports ✓ |
| Schedule C + “Using actual costs” | ScreenUS ✓ |
| Export Pro with MTD unsorted warning · every file type unlocked · free (Pro locked) · FreeAgent name · Preparing | ScreenReports ✓ |
| Export anyway (non-MTD) · Couldn't create the file | ScreenDialogs ✓ |
| Share sheet with the files | ScreenSystem ✓ |

## F-16 Backup S-12 — ScreenBackup, ScreenSystem

No folder · nightly on · 3 failures (dark) · restore list + confirm ✓ · folder picker · file picker ✓.

## F-17 Notifications — ScreenNotifications, ScreenSettings

| Notification | iPhone | Android |
|---|---|---|
| 14 to sort · About 3 minutes | ✓ | ✓ |
| Nothing logged today | ✓ | ✓ |
| Trip running (ongoing + actions) · GPS service notice | — (Android only) | ✓ |
| Trip started automatically | ✓ | ✓ |
| Trip started / Trip saved (NFC) | — | ✓ |
| Trip saved · Work / Sort on Sunday | ✓ | ✓ |
| Still on a trip? | ✓ | ✓ |
| Trip isn't recording | ✓ | ✓ |
| Automatic trips were paused by your phone | ✓ | ✓ |
| Pro renews on 6 Apr | ✓ | ✓ |
| Your Pro trial ends tomorrow | ✓ | ✓ |
| Tap to finish last night's backup | ✓ | ✓ |
| S-20 settings | ScreenSettings ✓ | |

## F-18 Pro S-19 — ScreenPro, ScreenUS, ScreenDialogs

Full page (not tried) · sheets for automatic trips / photos / tax-year files · trial (dark) · bought · ended · purchase failed · store unreachable · “No purchase found for this account.” · US $31.99 ✓.

## F-19 – F-22 — ScreenSettings, ScreenWidgets, ScreenPro

| Item | Board |
|---|---|
| S-13 Locked light + dark · App lock / Lock after | ScreenSettings ✓ |
| S-14 widgets small + medium, iOS + Android, light + dark, Auto trips on/paused | ScreenWidgets ✓ |
| S-15 Settings free · Pro (top + scrolled) · Vehicle costs · Mileage rates · Theme · How Sunday Sort works | ScreenPro ✓ · ScreenSettings ✓ |
| Change region · Change vehicle method · Delete all data (step 1 + 2) | ScreenDialogs ✓ |
| S-16 Not tax advice | ScreenSettings ✓ |

## Copy written for the mockups

product.md gives no exact wording for these, so the text is a proposal: the “What's the difference?” lines, Not tax advice body, How Sunday Sort works, Change region dialog, location / physical-activity denied text, Delete all data step 1, Discard trip, Delete this trip, Export anyway, Apply suggested categories body, add-category duplicate error, store share/folder sheets.

## System screens (indicative) — ScreenSystem

App-icon long-press shortcuts (iOS + Android) · share sheet for Export · folder picker for nightly backup · file picker for Restore · permission prompts for notifications (iOS), location (iOS + Android) and physical activity (Android) · App Store and Google Play purchase sheets · Rate the app prompt. These belong to the OS; they are drawn so every step of each flow can be followed.

## Not drawn

Only pages outside the app: the phone's own Settings pages that “Open settings” / “Open battery settings” jump to, and the web Privacy policy / Terms. The app icon stays the v1 icon (not supplied); mockups use a placeholder sun tile.
