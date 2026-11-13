Sunday Sort is a money-and-mileage log for self-employed van and courier drivers: **log it in 10 seconds, sort it on Sunday.** The UI should feel like a tidy notebook on a Sunday morning — calm, clean, trustworthy, a little warm. One app for iOS and Android: same layouts and words, native status bar, gestures and system sheets.

The **Screens** group holds every screen in product.md as hi-fi mockups (iPhone 390×844 and Android 360×800, light and dark), one board per area: Onboarding · Home · Quick capture · Entries · Sort · Miles · Trip setup · Reports & export · Rules & recurring · Backup & restore · Settings & more · Pro & settings · Widgets · Dialogs & errors · System notifications · United States (Maria) · Large text & small screens · Shortcuts & system sheets. The **Screen coverage** section lists every item in product.md and the board that draws it. The other groups are the parts they are built from.

## Content

- Every word on screen is English, copied exactly from product.md (in quotes there). Sentence case, verb-first buttons: "Sort now", "Start trip", "Add missing miles".
- Speak to the driver as "you". Short, plain sentences. No exclamation marks, no emoji, no jargon beyond the tax terms the user already knows (SA103, MTD, Schedule C).
- Never scare: say what happened and what to do — "Your trip stopped recording at 14:05 · Saved 86.2 mi up to that point."
- Never sell while someone is working. Pro is mentioned in onboarding, on a locked feature, in Settings and with a small "PRO" label — nowhere else.
- Every estimate carries "Estimate only — not tax advice." in `caption`.
- Money: "£1,053.60", expenses "−£72.40", income "+£620.00". Miles: "42.3 mi". Dates: "Tue 10 Nov · 07:02–11:48".

## Colour

- Background `bg` (warm paper / night blue); cards `surface`; inputs and keypad `surface-sunk`.
- Text `ink`; secondary `ink-muted`. Amounts and main buttons stay ≥7:1 for reading in sunlight.
- One main action per screen in `primary` (navy in light, sunshine yellow in dark) with `on-primary` text.
- `sunday` is the brand accent: Sort badge, progress, the suggested chip ring, PRO. `sunday-soft` marks things waiting for Sunday (To sort card, unsorted rows, receipt-filled fields).
- Money direction: income `income` / `income-text`, expenses `expense` / `expense-text` — terracotta, never red. Red (`error`, `live`) is only for real errors and a recording trip.
- Scope: Work `work`, Personal `personal`, text on their fills `on-scope`.
- Automation status: `ok` / `warn` / `off`, always with a word next to the dot.
- Focus ring: 2px `focus-ring` with a 2px gap.

## Type

- Inter (Google Fonts), tabular figures for every number.
- `amount-xl` 56–60px for the number being typed; `amount-lg` for hero totals; `amount-md` in cards; `amount-row` at the end of list rows.
- `title` for screen titles, `headline` for card and sheet titles, `body` 16px minimum for running text, `label` for metadata, `caption` for fine print, `overline` for PRO/AUTO and Settings section labels.
- Layouts must survive 200% text: cards grow, nothing is fixed-height except buttons.

## Shape, space, touch

- Cards `radius-card` (16px), main buttons `radius-pill`, chips and dots `radius-full`, sheets `radius-sheet` on top.
- Screen margin and card padding `space-4`; stack cards with `space-3`.
- Hit areas: `tap-min` 48px everywhere, `tap-main` 56px for main/round buttons, `tap-hero` 72px for the Home capture buttons. Main actions sit in the bottom half for one-thumb use with gloves.
- Shadows are barely there: `shadow-card` on cards, `shadow-raised` for FAB, snackbar, the top Sort card and sheets.

## Behaviour patterns

- Quick capture: ✕ · Expense|Income · date chip, giant amount, 3 round buttons (Photo · Work · Note), Save just above the in-app keypad. Only the amount is required; "No category needed — you'll sort it on Sunday."
- Sort: one card at a time, stacked. Tapping a category chip saves and slides the card away. Edit, Split and Merge open in place on the card.
- Every destructive or automatic change gets an Undo snackbar for 5 seconds.
- Automation is visible: status dot on Home and Miles, one warning card on Home, notification when anything stops.
- Pro lapses never lock or delete data; raw CSV export is always open.

## Iconography

- Own line set in `components/bundle.css` (Icons card): 24px, 1.75px stroke, round caps, `currentColor`, used as `<i class="ic ic-fuel"></i>`.
- No logo was supplied (the v1 app icon is kept); the name is set in plain type. Illustrations (van, receipt, Sunday sun, NFC sticker) are minimal line drawings in `ink` with `sunday` / `sunday-soft` fills.

## Platforms

- iOS: Dynamic Island status bar, home indicator, App Store wording. Android: punch-hole status bar, gesture bar, Google Play wording, persistent trip notification.
- Shared: tab bar, keypad, sheets and all components are identical so the 10-second flow is the same on both.
