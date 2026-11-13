# design/

Mockup Hi-Fi **Sunday Sort bản 2** (product.md bản 2, 13 Nov 2026): link design system + export HTML từng màn + file token. Bản 1 đã chuyển vào `v1/`.

## Link design system (Claude)

https://claude.ai/artifact/7w2ceQsYxs6dBJFANRpU6h

> Link đang để **riêng tư** — chủ tài khoản bấm **Share** trên trang thì người khác mới mở được. Shortcut Windows: `design-system.url`.
> Bản export dưới đây là snapshot ngày 13 Nov 2026 (version `1794558073-196e`). Sửa design system xong thì export lại.

## Cấu trúc thư mục

| Đường dẫn | Nội dung |
|---|---|
| `index.html` | Mở file này trước — lưới thumbnail mọi màn theo bảng, bấm vào để xem HTML |
| `tokens.json` | Token gốc (màu light/dark, chữ, khoảng cách, bo góc, đổ bóng, vùng chạm) — dựng theme React Native từ file này |
| `tokens.css` | Cùng token dạng CSS variables (`:root` = sáng, `[data-theme="dark"]` = tối) |
| `sunday.css` | `tokens.css` + toàn bộ class component (nút, chip, thẻ, sheet, dialog, keypad, tab bar…) + khung mockup |
| `screens/*.html` | Export HTML **từng màn** (180 file, 1 điện thoại / file), tên `<bảng>__<mã S>__<trạng thái>.html` |
| `boards/*.html` | Export HTML từng bảng (18 bảng) |
| `components/*.html` + `*.md` | Từng component: preview HTML + hướng dẫn dùng |
| `png/screens/*.png` | Ảnh từng màn @2x — đưa cho Claude Code xem trực quan |
| `png/boards/*.png` | Ảnh toàn bảng @1x |
| `brand-book.md` | Quy tắc thiết kế (nội dung, màu, chữ, hình khối, hành vi, icon, nền tảng) |
| `coverage.md` | Đối chiếu từng mục product.md → bảng đã vẽ |
| `fonts/` | Inter (OFL) để HTML mở offline |
| `v1/` | Toàn bộ export bản 1 (11 Nov 2026), giữ nguyên |

## Ghi chú cho Claude Code

- Khung: iPhone 390×844, Android 360×800; kiểm tra thêm 320×700 và chữ 200% (bảng 17). Lề màn 16, thẻ bo 16, nút chính cao 56 (viên thuốc), 2 nút Home cao 72, vùng chạm tối thiểu 48.
- Màu chính: sáng `primary #1F2A44` (xanh than), tối `primary #F5B841` (vàng nắng). Nhấn Sunday `#F5B841`. Chi phí tông đất (terracotta), không dùng đỏ; đỏ chỉ cho lỗi và chấm đang ghi chuyến.
- Số tiền và chữ trên nền đều đạt ≥ 7:1: income `#0C5C37` / `#6FD9A6`, expense `#8C331F` / `#F29C86` (sáng / tối). Màu spec `#1E8E5A` / `#C8553D` chỉ dùng cho icon, chấm, biểu đồ.
- Trạng thái tự động: `ok` xanh dịu = đang ổn, `warn` cam = cần chú ý, `off` xám = tắt — luôn có chữ đi kèm chấm.
- Bàn phím số trong Quick capture là **bàn phím riêng của app** (có hàng `+ − × ÷`), giống nhau trên iOS và Android.
- Chọn ngày giờ khác "Now": chip ngày rơi xuống dòng dưới công tắc Expense | Income (không vừa 1 hàng). Ở 320dp chip thu lại còn icon.
- Icon: bộ nét riêng 24px / 1.75 (`components/Icons.html`), dùng `currentColor`. Icon app: giữ bản 1 (chưa có file) — mockup dùng ô vàng hình mặt trời tạm.
- Bảng 18 (shortcut, share sheet, chọn thư mục/file, hộp xin quyền, sheet mua của store, đánh giá app) là **giao diện hệ thống** — vẽ minh hoạ luồng, không phải UI cần code.
- Mọi chữ hiển thị là tiếng Anh theo product.md; chữ do thiết kế tự viết (spec không ghi nguyên văn) liệt kê ở cuối `coverage.md` — cần duyệt.

## Danh sách màn (180)

| Mã | Màn / trạng thái | Nền tảng · theme | File |
|---|---|---|---|
| S-01a | Welcome — Onboarding 1 of 6 | iPhone 390×844 · Light | `screens/01-onboarding__s-01a__welcome.html` |
| S-01b | Choose your region — Preselected from the phone's region | Android 360×800 · Light | `screens/01-onboarding__s-01b__choose-your-region.html` |
| S-01c | Vehicle costs — “Not sure yet” preselected | iPhone 390×844 · Light | `screens/01-onboarding__s-01c__vehicle-costs.html` |
| S-01c | “What's the difference?” sheet — Four lines, no advice | iPhone 390×844 · Light | `screens/01-onboarding__s-01c__what-s-the-difference-sheet.html` |
| S-01d | Your categories — UK set shown; US uses the Schedule C list | Android 360×800 · Light | `screens/01-onboarding__s-01d__your-categories.html` |
| S-01e | Free & Pro — Limits said plainly at install | iPhone 390×844 · Light | `screens/01-onboarding__s-01e__free-pro.html` |
| S-01f | Weekly reminder — Asks for notification permission next | iPhone 390×844 · Light | `screens/01-onboarding__s-01f__weekly-reminder.html` |
| S-02 | Home — with data — Pro trial | iPhone 390×844 · Light | `screens/02-home__s-02__home-with-data.html` |
| S-02 | Home — trip running (Auto) — Backup warning card | Android 360×800 · Dark | `screens/02-home__s-02__home-trip-running-auto.html` |
| S-02 | Home — warning card — Only one warning shows at a time | Android 360×800 · Light | `screens/02-home__s-02__home-warning-card.html` |
| S-02 | Home — empty — First run, free plan | iPhone 390×844 · Light | `screens/02-home__s-02__home-empty.html` |
| S-02 | Home — trip stopped recording — Top-priority card, cannot be hidden | iPhone 390×844 · Light | `screens/02-home__s-02__home-trip-stopped-recording.html` |
| S-02 | Home — no trips on work days — Free plan | Android 360×800 · Light | `screens/02-home__s-02__home-no-trips-on-work-days.html` |
| S-02 | Home — Pro renewal notice — 7 days before | iPhone 390×844 · Dark | `screens/02-home__s-02__home-pro-renewal-notice.html` |
| S-02 | Home — old backup banner — Only when nightly backup is off and >30 days | Android 360×800 · Dark | `screens/02-home__s-02__home-old-backup-banner.html` |
| S-03 | Quick capture — empty — Opens in <300ms, keypad up | iPhone 390×844 · Light | `screens/03-capture__s-03__quick-capture-empty.html` |
| S-03 | 2 photos + receipt read (Pro) — Amount, note, date filled from receipt | iPhone 390×844 · Light | `screens/03-capture__s-03__2-photos-receipt-read-pro.html` |
| S-03 | Reading receipt, 3 photos (Pro) — ≤ 2 s, typing never blocked; 3 photos max | iPhone 390×844 · Light | `screens/03-capture__s-03__reading-receipt-3-photos-pro.html` |
| S-03 | “Receipt says” chip (Pro) — Typed amount differs from the receipt | Android 360×800 · Light | `screens/03-capture__s-03__receipt-says-chip-pro.html` |
| S-03 | Calculator in the amount — Save stores the result | Android 360×800 · Dark | `screens/03-capture__s-03__calculator-in-the-amount.html` |
| S-03 | Invalid sum — Big number dims, Save off | Android 360×800 · Dark | `screens/03-capture__s-03__invalid-sum.html` |
| S-03 | Note open — “Add a note (e.g. Shell, M62)” | iPhone 390×844 · Light | `screens/03-capture__s-03__note-open.html` |
| S-03 | Date & time chip — “Now” → picked date shows on the chip | Android 360×800 · Light | `screens/03-capture__s-03__date-time-chip.html` |
| S-03 | 3 or fewer free photos, max amount — Counter turns orange at ≤ 3 | iPhone 390×844 · Light | `screens/03-capture__s-03__3-or-fewer-free-photos-max-amount.html` |
| S-03 | Camera (Photo) — Opens straight away | iPhone 390×844 · Dark | `screens/03-capture__s-03__camera-photo.html` |
| S-03 | Free photos used up — Sheet, never a blocking popup | Android 360×800 · Light | `screens/03-capture__s-03__free-photos-used-up.html` |
| S-03 | Income, Keep adding on — Snackbar with Undo (5 s) + light haptic | iPhone 390×844 · Dark | `screens/03-capture__s-03__income-keep-adding-on.html` |
| S-04 | Entries — Grouped by day, labels for Auto / Recurring | iPhone 390×844 · Light | `screens/04-entries__s-04__entries.html` |
| S-04 | Entries — search — Matches notes and amounts | Android 360×800 · Light | `screens/04-entries__s-04__entries-search.html` |
| S-04 | Entries — swipe right — Flips Work ↔ Personal, then Undo | iPhone 390×844 · Light | `screens/04-entries__s-04__entries-swipe-right.html` |
| S-04 | Entries — Date ▾ / Category ▾ — One sheet for both filters | Android 360×800 · Light | `screens/04-entries__s-04__entries-date-category.html` |
| S-04 | Entries — multi-select — Long-press to select, actions at the bottom | Android 360×800 · Light | `screens/04-entries__s-04__entries-multi-select.html` |
| S-04 | Entries — empty — First run | Android 360×800 · Light | `screens/04-entries__s-04__entries-empty.html` |
| S-04 | Entries — filters match nothing — One tap to clear | iPhone 390×844 · Light | `screens/04-entries__s-04__entries-filters-match-nothing.html` |
| S-05 | Entry detail — rule + receipt read — Save lights up only after a change | iPhone 390×844 · Light | `screens/04-entries__s-05__entry-detail-rule-receipt-read.html` |
| S-05 | Entry detail — edited, ⋯ menu — From a split | Android 360×800 · Light | `screens/04-entries__s-05__entry-detail-edited-menu.html` |
| S-05 | Entry detail — from a recurring entry — Editing this one never changes the template | iPhone 390×844 · Dark | `screens/04-entries__s-05__entry-detail-from-a-recurring-entry.html` |
| S-05 | Receipt full screen — Swipe between photos, pinch to zoom | iPhone 390×844 · Dark | `screens/04-entries__s-05__receipt-full-screen.html` |
| S-06 | Sort — entry card (Pro) — Tap a chip = done, card slides away | iPhone 390×844 · Light | `screens/05-sort__s-06__sort-entry-card-pro.html` |
| S-06 | Sort — week picker — Each week shows what's left | iPhone 390×844 · Light | `screens/05-sort__s-06__sort-week-picker.html` |
| S-06 | Sort — “More…” categories — Full list, tap = sorted | Android 360×800 · Light | `screens/05-sort__s-06__sort-more-categories.html` |
| S-06 | Sort — Split in place — Tesco £60 → Fuel £45 Work + £15 Personal | Android 360×800 · Light | `screens/05-sort__s-06__sort-split-in-place.html` |
| S-06 | Sort — Split not balanced — Orange “£5.00 left” / “£5.00 over”, button off | iPhone 390×844 · Dark | `screens/05-sort__s-06__sort-split-not-balanced.html` |
| S-06 | Sort — trip card — Unsure auto trip: one tap Work / Personal | iPhone 390×844 · Dark | `screens/05-sort__s-06__sort-trip-card.html` |
| S-06 | Sort — rule offer (Pro) — After the 3rd same-place sort | Android 360×800 · Dark | `screens/05-sort__s-06__sort-rule-offer-pro.html` |
| S-06 | Sort — free, Edit in place — “Most used” chips, never leaves Sort | iPhone 390×844 · Light | `screens/05-sort__s-06__sort-free-edit-in-place.html` |
| S-06 | Sort — Merge sheet — Same type, ±1 day, preview before merge | iPhone 390×844 · Light | `screens/05-sort__s-06__sort-merge-sheet.html` |
| S-06a | Sort — List view (Pro) — Best suggestion per row, W / P for trips | Android 360×800 · Light | `screens/05-sort__s-06a__sort-list-view-pro.html` |
| S-06a | Sort — List view (free) — “Choose” chip, no bulk accept | iPhone 390×844 · Light | `screens/05-sort__s-06a__sort-list-view-free.html` |
| S-06d | Auto-sorted review (Pro) — Grouped by rule; change any chip | iPhone 390×844 · Light | `screens/05-sort__s-06d__auto-sorted-review-pro.html` |
| S-06c | Week sorted — Shown after the last card | iPhone 390×844 · Light | `screens/05-sort__s-06c__week-sorted.html` |
| S-06 | Sort — empty — Badge hidden at 0 | Android 360×800 · Dark | `screens/05-sort__s-06__sort-empty.html` |
| S-07 | Miles — Mileage rate — Swipe left = Personal, right = Work | iPhone 390×844 · Light | `screens/06-miles__s-07__miles-mileage-rate.html` |
| S-07 | Miles — swipe right = Work, ⋯ menu — Blue behind Work, violet behind Personal | Android 360×800 · Light | `screens/06-miles__s-07__miles-swipe-right-work-menu.html` |
| S-07 | Tax-year picker (Miles & Reports) — “Tax year 2026/27 ▾” | iPhone 390×844 · Light | `screens/06-miles__s-07__tax-year-picker-miles-reports.html` |
| S-07 | Miles — 10,000 mi reached — Example: a 35,000 mi/year driver | iPhone 390×844 · Dark | `screens/06-miles__s-07__miles-10-000-mi-reached.html` |
| S-07 | Miles — Actual costs, free — Business-use share instead of £ per mile | Android 360×800 · Light | `screens/06-miles__s-07__miles-actual-costs-free.html` |
| S-07 | Miles — empty, location denied — Explains the fix, never a dead end | iPhone 390×844 · Light | `screens/06-miles__s-07__miles-empty-location-denied.html` |
| S-07b | Active trip — Huge numbers, buttons in the thumb zone | Android 360×800 · Dark | `screens/06-miles__s-07b__active-trip.html` |
| S-07b | Active trip — manual, weak GPS — Started with “Start trip” | iPhone 390×844 · Light | `screens/06-miles__s-07b__active-trip-manual-weak-gps.html` |
| S-07b | End trip — manual trip — Sheet after “End trip”; Discard asks again | Android 360×800 · Light | `screens/06-miles__s-07b__end-trip-manual-trip.html` |
| S-07c | Trip detail — tap a stop — Stops numbered, Personal segment dotted | iPhone 390×844 · Light | `screens/06-miles__s-07c__trip-detail-tap-a-stop.html` |
| S-07c | Trip detail — edit times — Original values kept under “Recorded” | iPhone 390×844 · Dark | `screens/06-miles__s-07c__trip-detail-edit-times.html` |
| S-07c | Trip detail — time picker — Start ✎ / End ✎ / Miles ✎ | Android 360×800 · Dark | `screens/06-miles__s-07c__trip-detail-time-picker.html` |
| S-08 | Add trip (manual) — Odometer or distance | iPhone 390×844 · Light | `screens/06-miles__s-08__add-trip-manual.html` |
| S-07d | Automatic trips (Android) — Status always visible: ok / attention / off | Android 360×800 · Light | `screens/06-miles__s-07d__automatic-trips-android.html` |
| S-07g | NFC tag — written — Free feature, Android writes the tag | Android 360×800 · Light | `screens/06-miles__s-07g__nfc-tag-written.html` |
| S-07a | Location explainer — 1 of 2 — Before the system permission prompt | iPhone 390×844 · Light | `screens/07-trip-setup__s-07a__location-explainer-1-of-2.html` |
| S-07a | Location explainer — 2 of 2 — Android only: “Allow all the time” | Android 360×800 · Light | `screens/07-trip-setup__s-07a__location-explainer-2-of-2.html` |
| S-07e | Step 1 — Recognise driving — iOS asks for Motion & Fitness | iPhone 390×844 · Light | `screens/07-trip-setup__s-07e__step-1-recognise-driving.html` |
| S-07e | Step 2 — Location all the time — Android: “Allow all the time” | Android 360×800 · Light | `screens/07-trip-setup__s-07e__step-2-location-all-the-time.html` |
| S-07e | Step 3 — Notifications — Last step on iPhone | iPhone 390×844 · Light | `screens/07-trip-setup__s-07e__step-3-notifications.html` |
| S-07e | Step 4 — Battery (Android) — Opens battery settings → “Unrestricted” | Android 360×800 · Light | `screens/07-trip-setup__s-07e__step-4-battery-android.html` |
| S-07d | Automatic trips — iOS, setup unfinished — Orange status + “Finish setup” | iPhone 390×844 · Light | `screens/07-trip-setup__s-07d__automatic-trips-ios-setup-unfinished.html` |
| S-07d | Automatic trips — free plan — Switch locked, free options listed | Android 360×800 · Light | `screens/07-trip-setup__s-07d__automatic-trips-free-plan.html` |
| S-07d | Choose van Bluetooth — Paired devices only, chosen once | Android 360×800 · Light | `screens/07-trip-setup__s-07d__choose-van-bluetooth.html` |
| S-07d | Work hours — Off by default | iPhone 390×844 · Light | `screens/07-trip-setup__s-07d__work-hours.html` |
| S-07f | Battery tips — Samsung — Per-brand steps | Android 360×800 · Light | `screens/07-trip-setup__s-07f__battery-tips-samsung.html` |
| S-07g | NFC tag — iPhone (Shortcuts) — 4 steps + Copy link | iPhone 390×844 · Light | `screens/07-trip-setup__s-07g__nfc-tag-iphone-shortcuts.html` |
| S-07g | NFC tag — writing — Android, waiting for the sticker | Android 360×800 · Dark | `screens/07-trip-setup__s-07g__nfc-tag-writing.html` |
| S-09 | Reports — tax year, Mileage rate — “Covered” group shown, not added | iPhone 390×844 · Light | `screens/08-reports__s-09__reports-tax-year-mileage-rate.html` |
| S-09 | Reports — By tax form line (SA103) — Tab SA103 | MTD categories | iPhone 390×844 · Light | `screens/08-reports__s-09__reports-by-tax-form-line-sa103.html` |
| S-09 | Reports — Q2, MTD categories — Cumulative like the quarterly update | Android 360×800 · Dark | `screens/08-reports__s-09__reports-q2-mtd-categories.html` |
| S-09 | Reports — vehicle method — “Not sure yet” card + Actual costs view | iPhone 390×844 · Light | `screens/08-reports__s-09__reports-vehicle-method.html` |
| S-09 | Reports — empty period — Custom range with nothing in it | Android 360×800 · Light | `screens/08-reports__s-09__reports-empty-period.html` |
| S-10 | Export — Pro, unsorted warning — Raw CSV always open, Pro files labelled | iPhone 390×844 · Light | `screens/08-reports__s-10__export-pro-unsorted-warning.html` |
| S-10 | Export — Pro, every file type — All unlocked, pick any mix | Android 360×800 · Light | `screens/08-reports__s-10__export-pro-every-file-type.html` |
| S-10 | Export — free plan — Pro files visible, locked, tap opens Pro sheet | iPhone 390×844 · Light | `screens/08-reports__s-10__export-free-plan.html` |
| S-10 | Export — FreeAgent name — Asked once, then remembered | Android 360×800 · Light | `screens/08-reports__s-10__export-freeagent-name.html` |
| S-10 | Export — preparing — Then the system share sheet opens | iPhone 390×844 · Dark | `screens/08-reports__s-10__export-preparing.html` |
| S-18 | Auto-sort rules — Pro — One switch per rule | iPhone 390×844 · Light | `screens/09-rules__s-18__auto-sort-rules-pro.html` |
| S-18 | Rule sheet — Match text + type + optional amount range | Android 360×800 · Light | `screens/09-rules__s-18__rule-sheet.html` |
| S-18 | Auto-sort rules — free / Pro ended — List still visible, switches locked | Android 360×800 · Light | `screens/09-rules__s-18__auto-sort-rules-free-pro-ended.html` |
| S-18 | Auto-sort rules — empty —  | iPhone 390×844 · Dark | `screens/09-rules__s-18__auto-sort-rules-empty.html` |
| S-17 | Recurring entries — Also from ⋯ → Make recurring on an entry | iPhone 390×844 · Light | `screens/09-rules__s-17__recurring-entries.html` |
| S-17 | Recurring sheet — Weekly | Android 360×800 · Light | `screens/09-rules__s-17__recurring-sheet.html` |
| S-12 | Backup — no folder yet — Free | iPhone 390×844 · Light | `screens/10-backup__s-12__backup-no-folder-yet.html` |
| S-12 | Backup — nightly on — Green status, folder shown | Android 360×800 · Light | `screens/10-backup__s-12__backup-nightly-on.html` |
| S-12 | Backup — 3 failures — Also raises the Home card | iPhone 390×844 · Dark | `screens/10-backup__s-12__backup-3-failures.html` |
| S-12 | Restore — confirm — List of the 7 nightly backups | Android 360×800 · Light | `screens/10-backup__s-12__restore-confirm.html` |
| S-15 | Settings — Pro (top) — Pro row first | iPhone 390×844 · Light | `screens/11-settings__s-15__settings-pro-top.html` |
| S-15 | Settings — Pro (scrolled) — Sorting → About | Android 360×800 · Light | `screens/11-settings__s-15__settings-pro-scrolled.html` |
| S-15 | Vehicle costs — Changing mid-year asks first (see Dialogs) | Android 360×800 · Light | `screens/11-settings__s-15__vehicle-costs.html` |
| S-15 | Mileage rates — Edit per period, “Reset to default” | iPhone 390×844 · Light | `screens/11-settings__s-15__mileage-rates.html` |
| S-15 | App lock & Lock after — Immediately / 1 min / 5 min | Android 360×800 · Dark | `screens/11-settings__s-15__app-lock-lock-after.html` |
| S-15 | Theme — System | iPhone 390×844 · Light | `screens/11-settings__s-15__theme.html` |
| S-15 | How Sunday Sort works — From About | Android 360×800 · Light | `screens/11-settings__s-15__how-sunday-sort-works.html` |
| S-11 | Categories — SA103 box + MTD category under each name, drag to reorder | Android 360×800 · Light | `screens/11-settings__s-11__categories.html` |
| S-11 | Edit category sheet — MTD category + vehicle running cost | iPhone 390×844 · Light | `screens/11-settings__s-11__edit-category-sheet.html` |
| S-11 | Add category, duplicate name — Empty name: “Enter a name” | iPhone 390×844 · Light | `screens/11-settings__s-11__add-category-duplicate-name.html` |
| S-11 | Hidden categories — Used categories can only be hidden | Android 360×800 · Dark | `screens/11-settings__s-11__hidden-categories.html` |
| S-20 | Notifications — Each type on its own switch | iPhone 390×844 · Light | `screens/11-settings__s-20__notifications.html` |
| S-16 | Not tax advice — Plain words, no legalese | Android 360×800 · Light | `screens/11-settings__s-16__not-tax-advice.html` |
| S-13 | Locked — Face ID / fingerprint on Unlock | iPhone 390×844 · Light | `screens/11-settings__s-13__locked.html` |
| S-13 | Locked — Face ID / fingerprint on Unlock | Android 360×800 · Dark | `screens/11-settings__s-13__locked-dark.html` |
| S-19 | Pro — full page from Settings — Not tried yet | iPhone 390×844 · Light | `screens/12-pro__s-19__pro-full-page-from-settings.html` |
| S-19 | Pro — sheet in context — Opened by tapping a locked feature | iPhone 390×844 · Light | `screens/12-pro__s-19__pro-sheet-in-context.html` |
| S-19 | Pro — sheet from photo limit — Sheet subtitle: “You've used this month's 20 free photos” | Android 360×800 · Light | `screens/12-pro__s-19__pro-sheet-from-photo-limit.html` |
| S-19 | Pro — sheet from Export — Sheet subtitle: “Tax-year files are a Pro feature” | iPhone 390×844 · Dark | `screens/12-pro__s-19__pro-sheet-from-export.html` |
| S-19 | Pro — trial running — Trial | Android 360×800 · Dark | `screens/12-pro__s-19__pro-trial-running.html` |
| S-19 | Pro — bought / ended / error — Plain words, no pressure | iPhone 390×844 · Light | `screens/12-pro__s-19__pro-bought-ended-error.html` |
| S-15 | Settings — free plan — Pro row first, PRO labels on locked items | Android 360×800 · Light | `screens/12-pro__s-15__settings-free-plan.html` |
| S-14 | Widgets — iOS — iOS small + medium | iOS small + medium · Light | `screens/13-widgets__s-14__widgets-ios.html` |
| S-14 | Widgets — iOS — iOS small + medium | iOS small + medium · Dark | `screens/13-widgets__s-14__widgets-ios-dark.html` |
| S-14 | Widgets — Android — Android 2×1 + 4×2 | Android 2×1 + 4×2 · Light | `screens/13-widgets__s-14__widgets-android.html` |
| S-14 | Widgets — Android — Android 2×1 + 4×2 | Android 2×1 + 4×2 · Dark | `screens/13-widgets__s-14__widgets-android-dark.html` |
| dialog | Discard this entry? — ✕ after typing an amount | iPhone 390×844 · Light | `screens/14-dialogs__dialog__discard-this-entry.html` |
| dialog | Discard changes? — S-05, leaving with unsaved edits | iPhone 390×844 · Light | `screens/14-dialogs__dialog__discard-changes.html` |
| dialog | Delete this entry? — S-05 ⋯ → Delete | Android 360×800 · Light | `screens/14-dialogs__dialog__delete-this-entry.html` |
| dialog | Swipe to delete + Undo — Snackbar “Entry deleted” | iPhone 390×844 · Light | `screens/14-dialogs__dialog__swipe-to-delete-undo.html` |
| dialog | Delete this trip? — S-07c, then Undo | Android 360×800 · Light | `screens/14-dialogs__dialog__delete-this-trip.html` |
| dialog | Accept all suggestions? — S-06a, Pro | Android 360×800 · Light | `screens/14-dialogs__dialog__accept-all-suggestions.html` |
| dialog | Change region — Settings → Region | iPhone 390×844 · Light | `screens/14-dialogs__dialog__change-region.html` |
| dialog | Change vehicle method — Settings → Vehicle costs | Android 360×800 · Light | `screens/14-dialogs__dialog__change-vehicle-method.html` |
| dialog | Delete all data — step 1 of 2 — Settings → Your data | Android 360×800 · Light | `screens/14-dialogs__dialog__delete-all-data-step-1-of-2.html` |
| dialog | Delete all data — step 2 of 2 — Asked twice, typed confirmation | iPhone 390×844 · Light | `screens/14-dialogs__dialog__delete-all-data-step-2-of-2.html` |
| dialog | Camera access is off — Tapping Photo with camera denied | Android 360×800 · Light | `screens/14-dialogs__dialog__camera-access-is-off.html` |
| dialog | Location access is off — Start trip with location denied | iPhone 390×844 · Light | `screens/14-dialogs__dialog__location-access-is-off.html` |
| dialog | Physical activity is off — Automatic trips | Android 360×800 · Light | `screens/14-dialogs__dialog__physical-activity-is-off.html` |
| dialog | Long trip check — S-08, over 1,000 mi | iPhone 390×844 · Light | `screens/14-dialogs__dialog__long-trip-check.html` |
| dialog | Odometer error — S-08 inline validation | Android 360×800 · Light | `screens/14-dialogs__dialog__odometer-error.html` |
| dialog | Discard trip? — From the End trip sheet | Android 360×800 · Dark | `screens/14-dialogs__dialog__discard-trip.html` |
| dialog | Export failed — S-10 error | iPhone 390×844 · Light | `screens/14-dialogs__dialog__export-failed.html` |
| dialog | Unsorted before a non-MTD export — PDF / CSV: “Export anyway” | iPhone 390×844 · Light | `screens/14-dialogs__dialog__unsorted-before-a-non-mtd-export.html` |
| dialog | Photo couldn't save — Storage full | Android 360×800 · Light | `screens/14-dialogs__dialog__photo-couldn-t-save.html` |
| dialog | Reminders refused — End of onboarding (S-01f) | iPhone 390×844 · Light | `screens/14-dialogs__dialog__reminders-refused.html` |
| dialog | NFC not supported — S-07g on a phone without NFC | Android 360×800 · Dark | `screens/14-dialogs__dialog__nfc-not-supported.html` |
| dialog | Store unreachable — S-19 purchase errors | Android 360×800 · Light | `screens/14-dialogs__dialog__store-unreachable.html` |
| notif | Notifications — reminders — Sunday, nudge, saved, trial | iPhone · Light | `screens/15-notifications__notif__notifications-reminders.html` |
| notif | Notifications — trips & alerts — Long-press shows the actions | iPhone · Dark | `screens/15-notifications__notif__notifications-trips-alerts.html` |
| notif | Notifications — iPhone, the rest — Paused trips, backup, saved for Sunday | iPhone · Light | `screens/15-notifications__notif__notifications-iphone-the-rest.html` |
| notif | Notification shade — trip running — Ongoing trip + required GPS notice | Android · Light | `screens/15-notifications__notif__notification-shade-trip-running.html` |
| notif | Notification shade — everyday — Silent where nothing needs doing | Android · Dark | `screens/15-notifications__notif__notification-shade-everyday.html` |
| notif | Notification shade — the rest — Auto start, nudge, trial | Android · Light | `screens/15-notifications__notif__notification-shade-the-rest.html` |
| S-01b | United States — Maria | iPhone 390×844 · Light | `screens/16-us__s-01b__united-states.html` |
| S-01b | Phone outside UK/US — Nothing preselected, Continue dimmed | Android 360×800 · Light | `screens/16-us__s-01b__phone-outside-uk-us.html` |
| S-01c | US wording — Maria picks Actual costs | iPhone 390×844 · Light | `screens/16-us__s-01c__us-wording.html` |
| S-01d | US categories — Schedule C set | iPhone 390×844 · Light | `screens/16-us__s-01d__us-categories.html` |
| S-02 | Home — US — Calendar year, $, Pro | iPhone 390×844 · Light | `screens/16-us__s-02__home-us.html` |
| S-04 | Entries — US — Maria's sample data | Android 360×800 · Light | `screens/16-us__s-04__entries-us.html` |
| S-07 | Miles — US, Actual costs — No $ per mile shown | iPhone 390×844 · Dark | `screens/16-us__s-07__miles-us-actual-costs.html` |
| S-09 | Reports — US, Schedule C, Actual costs — Calendar year 2026 | iPhone 390×844 · Light | `screens/16-us__s-09__reports-us-schedule-c-actual-costs.html` |
| S-19 | Pro — US price — $31.99 / year | iPhone 390×844 · Light | `screens/16-us__s-19__pro-us-price.html` |
| a11y | Text at 200% — Home — Cards grow taller; grids become one column; nothing is cut | iPhone 390×844 · Light | `screens/17-accessibility__a11y__text-at-200-pct-home.html` |
| a11y | Text at 200% — Sort card — Chips stack one per line | Android 360×800 · Light | `screens/17-accessibility__a11y__text-at-200-pct-sort-card.html` |
| a11y | 320dp — Home — Narrowest supported width | Android 320×700 (narrowest) · Light | `screens/17-accessibility__a11y__320dp-home.html` |
| a11y | 320dp — Quick capture — Date chip collapses to its icon; note chips scroll off | Android 320×700 (narrowest) · Light | `screens/17-accessibility__a11y__320dp-quick-capture.html` |
| a11y | 320dp — Sort card — Header buttons wrap, chips wrap | Android 320×700 (narrowest) · Dark | `screens/17-accessibility__a11y__320dp-sort-card.html` |
| system | App shortcuts — iPhone — Long-press the app icon | iPhone · Light | `screens/18-system__system__app-shortcuts-iphone.html` |
| system | App shortcuts — Android — Long-press the app icon | Android · Dark | `screens/18-system__system__app-shortcuts-android.html` |
| system | System share sheet — Export — Files named by period and type (system UI, indicative) | Android 360×800 · Light | `screens/18-system__system__system-share-sheet-export.html` |
| system | System folder picker — Backup — “Choose backup folder” (system UI, indicative) | iPhone 390×844 · Light | `screens/18-system__system__system-folder-picker-backup.html` |
| system | System file picker — Restore — “Restore from backup” → choose a file (system UI, indicative) | Android 360×800 · Dark | `screens/18-system__system__system-file-picker-restore.html` |
| system | System prompt — notifications (iOS) — After “Turn on reminder” (S-01f) | iPhone 390×844 · Light | `screens/18-system__system__system-prompt-notifications-ios.html` |
| system | System prompt — location (iOS) — After “Allow location” (S-07a) | iPhone 390×844 · Light | `screens/18-system__system__system-prompt-location-ios.html` |
| system | System prompt — location (Android) — Then S-07a step 2 asks for “Allow all the time” | Android 360×800 · Light | `screens/18-system__system__system-prompt-location-android.html` |
| system | System prompt — physical activity (Android) — S-07e step 1 | Android 360×800 · Light | `screens/18-system__system__system-prompt-physical-activity-android.html` |
| system | Store sheet — App Store — After “Try Pro free for 7 days” | iPhone 390×844 · Light | `screens/18-system__system__store-sheet-app-store.html` |
| system | Store sheet — Google Play — After “Subscribe” | Android 360×800 · Light | `screens/18-system__system__store-sheet-google-play.html` |
| system | System prompt — Rate the app — Settings → About | iPhone 390×844 · Light | `screens/18-system__system__system-prompt-rate-the-app.html` |
