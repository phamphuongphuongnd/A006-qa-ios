# design/

Mockup Hi-Fi từ Claude Design: link dự án + export HTML từng màn + file token.

## Link canvas (Claude Design)

https://claude.ai/artifact/2rYaeHyPiY1wtH8iaVLMiH

> Link đang để **riêng tư** — chủ tài khoản bấm **Share** trên trang thì người khác mới mở được.
> Bản export dưới đây là snapshot ngày 11 Nov 2026 (canvas version 17). Sửa canvas xong thì export lại.

## Cấu trúc thư mục

| Đường dẫn | Nội dung |
|---|---|
| `index.html` | Mở file này trước — lưới thumbnail mọi màn, bấm vào để xem HTML |
| `sunday.css` | **Nguồn token + primitive** (màu sáng `.ph`, tối `.ph.dark`, chữ, nút, chip, thẻ, sheet, dialog…) |
| `tokens.json` | Cùng token dạng JSON để dựng theme React Native (color light/dark, type, radius, spacing, touch) |
| `screens/*.html` | Export HTML **từng màn** (1 điện thoại / file), đặt tên `<board>__<mã S>__<trạng thái>.html` |
| `boards/*.html` | Export HTML từng bảng (nhiều màn cùng luồng) |
| `png/screens/*.png` | Ảnh từng màn @2x — đưa cho Claude Code xem trực quan |
| `png/boards/*.png` | Ảnh toàn bảng @1x |
| `source/` | File gốc của canvas (`*.dc.html`, `canvas.json`, `sunday.css`) |
| `fonts/` | Inter (OFL) để HTML mở offline |

## Ghi chú cho Claude Code

- Khung: iPhone 390×844 (sáng), Android 360×800 (tối, board 12). Gutter 20 (iOS) / 16 (Android).
- Màu chữ số tiền + nút chính dùng tông đậm để đạt ≥ 7:1: income `#0F5C39`, expense `#93371F` (sáng); `#62D29C` / `#F49C86` (tối). Màu spec gốc `#1E8E5A` / `#C8553D` chỉ dùng cho icon, chấm, biểu đồ.
- Home: 2 nút **Expense / Income cố định** trên tab bar (không cuộn theo nội dung).
- Quick capture: nút Save đổi màu theo loại khoản; không có ô danh mục.
- Entries chế độ chọn nhiều: thanh hành động (Merge / Set category / Work/Personal / Delete) thay tab bar ở đáy.
- Mọi chữ hiển thị là tiếng Anh theo product.md; vài chữ phụ do thiết kế thêm (vd "Tap for Personal") — có thể bỏ.
- Bàn phím số trong Quick capture là bàn phím hệ thống, chỉ vẽ để minh hoạ — không phải UI của app.

## Danh sách màn (68)

| Mã | Màn / trạng thái | File |
|---|---|---|
| S-01a | Welcome | `screens/01-onboarding__s-01a__welcome.html` |
| S-01b | Choose your region | `screens/01-onboarding__s-01b__choose-your-region.html` |
| S-01c | Your categories | `screens/01-onboarding__s-01c__your-categories.html` |
| S-01d | Weekly reminder | `screens/01-onboarding__s-01d__weekly-reminder.html` |
| S-02 | Home · with data | `screens/02-home__s-02__home-with-data.html` |
| S-02 | Home · empty (first run) | `screens/02-home__s-02__home-empty-first-run.html` |
| S-02 | Backup banner · all sorted · saved snackbar | `screens/02-home__s-02__backup-banner-all-sorted-saved-snackbar.html` |
| S-02 | Home · trip running | `screens/02-home__s-02__home-trip-running.html` |
| S-03 | Empty · Expense default | `screens/03-capture__s-03__empty-expense-default.html` |
| S-03 | Typed + photo + note | `screens/03-capture__s-03__typed-photo-note.html` |
| S-03 | Income · date changed | `screens/03-capture__s-03__income-date-changed.html` |
| S-03 | Close with amount → Discard? | `screens/03-capture__s-03__close-with-amount-discard.html` |
| S-04 | Entries · list | `screens/04-entries__s-04__entries-list.html` |
| S-04 | Multi-select | `screens/04-entries__s-04__multi-select.html` |
| S-04 | Filters · no results | `screens/04-entries__s-04__filters-no-results.html` |
| S-05 | Entry detail · edited · ⋯ menu | `screens/04-entries__s-05__entry-detail-edited-menu.html` |
| S-05 | Receipt · full screen | `screens/04-entries__s-05__receipt-full-screen.html` |
| S-06 | Sort · card mode | `screens/05-sort__s-06__sort-card-mode.html` |
| S-06a | Sort · list view | `screens/05-sort__s-06a__sort-list-view.html` |
| S-06b | Split entry | `screens/05-sort__s-06b__split-entry.html` |
| S-06c | Week sorted · done | `screens/05-sort__s-06c__week-sorted-done.html` |
| S-06 | Nothing to sort | `screens/05-sort__s-06__nothing-to-sort.html` |
| S-07 | Miles · with data | `screens/06-miles__s-07__miles-with-data.html` |
| S-07 | Empty · location denied | `screens/06-miles__s-07__empty-location-denied.html` |
| S-07a | Location explainer · step 1 | `screens/06-miles__s-07a__location-explainer-step-1.html` |
| S-07a | Step 2 · Android “all the time” | `screens/06-miles__s-07a__step-2-android-all-the-time.html` |
| S-08 | Add trip · odometer | `screens/06-miles__s-08__add-trip-odometer.html` |
| S-07b | Active trip | `screens/07-trip__s-07b__active-trip.html` |
| S-07b | Paused · personal stop | `screens/07-trip__s-07b__paused-personal-stop.html` |
| S-07b | End trip · confirm sheet | `screens/07-trip__s-07b__end-trip-confirm-sheet.html` |
| S-07b | Trip stopped recording | `screens/07-trip__s-07b__trip-stopped-recording.html` |
| S-09 | Reports · tax year | `screens/08-reports__s-09__reports-tax-year.html` |
| S-09 | Reports · scrolled | `screens/08-reports__s-09__reports-scrolled.html` |
| S-09 | Quarter · unsorted warning | `screens/08-reports__s-09__quarter-unsorted-warning.html` |
| S-10 | Export sheet | `screens/08-reports__s-10__export-sheet.html` |
| S-10 | Preparing files | `screens/08-reports__s-10__preparing-files.html` |
| S-15 | Settings · top | `screens/09-settings__s-15__settings-top.html` |
| S-15 | Settings · scrolled | `screens/09-settings__s-15__settings-scrolled.html` |
| S-11 | Categories | `screens/09-settings__s-11__categories.html` |
| S-11 | Edit category sheet | `screens/09-settings__s-11__edit-category-sheet.html` |
| S-12 | Backup & restore · packing | `screens/10-data__s-12__backup-restore-packing.html` |
| S-12 | Restore · preview → Replace? | `screens/10-data__s-12__restore-preview-replace.html` |
| S-13 | Locked | `screens/10-data__s-13__locked.html` |
| S-16 | Not tax advice | `screens/10-data__s-16__not-tax-advice.html` |
| S-05 | Unsaved edits | `screens/11-dialogs__s-05__unsaved-edits.html` |
| S-05 | Delete | `screens/11-dialogs__s-05__delete.html` |
| F-07 | Merge preview | `screens/11-dialogs__f-07__merge-preview.html` |
| S-06a | Accept all | `screens/11-dialogs__s-06a__accept-all.html` |
| S-15 | Change region | `screens/11-dialogs__s-15__change-region.html` |
| S-15 | Delete all data (2 of 2) | `screens/11-dialogs__s-15__delete-all-data-2-of-2.html` |
| S-03 | Camera denied | `screens/11-dialogs__s-03__camera-denied.html` |
| F-12 | GPS off | `screens/11-dialogs__f-12__gps-off.html` |
| S-10 | Unsorted before export | `screens/11-dialogs__s-10__unsorted-before-export.html` |
| S-08 | Long trip | `screens/11-dialogs__s-08__long-trip.html` |
| Snackbars | Undo 5 s | `screens/11-dialogs__snackbars__undo-5-s.html` |
| Info & error snackbars | Info & error snackbars | `screens/11-dialogs__info-error-snackbars__info-error-snackbars.html` |
| S-02 | Home | `screens/12-dark__s-02__home.html` |
| S-03 | Quick capture | `screens/12-dark__s-03__quick-capture.html` |
| S-06 | Sort · card | `screens/12-dark__s-06__sort-card.html` |
| S-09 | Reports | `screens/12-dark__s-09__reports.html` |
| S-07b | Active trip | `screens/12-dark__s-07b__active-trip.html` |
| S-13 | Locked | `screens/12-dark__s-13__locked.html` |
| S-14 | Android · light · 2×1 + 4×2 | `screens/13-system__s-14__android-light-2-1-4-2.html` |
| S-14 | Android · dark · trip running | `screens/13-system__s-14__android-dark-trip-running.html` |
| S-14 | iOS · light · small + medium | `screens/13-system__s-14__ios-light-small-medium.html` |
| S-14 | iOS · dark · trip running | `screens/13-system__s-14__ios-dark-trip-running.html` |
| F-12/17 | Android · notification shade | `screens/13-system__f-12-17__android-notification-shade.html` |
| F-12/17 | iOS · lock screen | `screens/13-system__f-12-17__ios-lock-screen.html` |
