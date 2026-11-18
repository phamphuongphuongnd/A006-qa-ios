# QA-100 — phiên B `qa-android-old` (Android 8 / API 26 + Android 11 / API 30)

APK lượt chính thức: **`sundaysort-qa-538ede9-all.apk`** (dev 538ede9, có bản sửa B-56..B-70). Lượt trước: ece3819 (khám phá → OLD-1..4),
7fd7305 (→ OLD-5, OLD-6; kết quả giữ ở `qa-runs/android-old/_apk7fd7305/`).
Máy ảo (`-no-window -gpu swiftshader_indirect`): `qa_old_api26` (emulator-5558, Android 8.0 google_apis x86_64 r16, RAM 1536 MB,
720×1280 @320dpi = 360×640dp) · `qa_mid_api30` (emulator-5560, Android 11 google_apis x86_64 r16, RAM 3 GB, 1080×2340 @440dpi).
Runner riêng phiên B: `qa/tools/oldrun.py` + `behaviours.py` (20 hành vi) + `oldbatch.sh` (1 lô/máy, tự chạy lại khi adb rớt) + `oldsummary.py`.
Bằng chứng: `qa-runs/android-old/<persona>/` (result.json, ảnh từng bước, logcat.txt, meminfo.txt), `summary.md`, `_dbg/` (tái hiện tay). Gitignore.

## 40 persona của phiên B
| Máy | Persona |
|---|---|
| api26_small (20) | P003 P007 P011 P020 P024 P028 P032 P036 P045 P049 P053 P057 P061 P070 P074 P078 P082 P086 P095 P099 |
| api30_mid (20) | P002 P006 P015 P019 P023 P027 P031 P040 P044 P048 P052 P056 P065 P069 P073 P077 P081 P090 P094 P098 |

## Điểm dễ vỡ riêng Android cũ → bước kiểm thêm
1. **Vị trí nền ≤ Android 9 (API 26):** không có quyền nền riêng; `trip/permission.tsx` gọi `getBackgroundPermissionsAsync`
   sau khi cấp vị trí trước → phải `granted` ngay, không được kẹt ở bước 2 "Allow all the time". API 30: chỉ cấp được ở trang cài đặt.
2. **Nhận diện hoạt động (ACTIVITY_RECOGNITION) chỉ có từ API 29:** `requestMotionActivityPermissionsAsync` trên API 26 không được treo/crash.
3. **Thông báo:** API 26 không cần quyền POST_NOTIFICATIONS (chỉ kênh); API 30 cũng vậy → nhắc Chủ nhật / thông báo chuyến phải hiện mà không hỏi quyền.
4. **Foreground service vị trí (chuyến):** API 26 `startForegroundService` không có `foregroundServiceType`; API 30 cần type location → bắt đầu/kết thúc chuyến không crash.
5. **SAF:** bộ chọn file DocumentsUI đời cũ (API 26 giao diện khác) — khôi phục sao lưu + chọn thư mục sao lưu.
6. **Widget** (react-native-android-widget) trên launcher cũ: thêm widget, hiển thị, bấm mở app.
7. **In PDF (expo-print/WebView cũ):** WebView API 26 bản cũ (Chrome 58-ish trên ảnh hệ thống) — CSS hiện đại có thể vỡ.
8. **Phông Inter / emoji / RTL** trên API 26 (bộ phông emoji cũ: emoji mới hiện ô vuông là giới hạn hệ thống, không phải lỗi app).
9. **RAM thấp 1.5 GB:** mở nguội `am start -W`, `dumpsys meminfo`, app bị kill nền khi mở bộ chọn file/camera → mất dữ liệu đang nhập?
10. **Cỡ chữ 0.85 (API 26) / 1.3 (API 30), màn 360dp:** chữ bị cắt, nút bị đẩy ra ngoài.

## Kết quả (APK 538ede9, 2026-11-17 15:03–16:51 · `qa-runs/android-old/summary.md`, `summary.json`)

**40/40 persona có `result.json` thật · 39 ✅ · 1 ❌ (P074 = OLD-8, lỗi app).** Mỗi persona 9–15 bước kiểm thật trên máy.

| | API 26 (20) | API 30 (20) |
|---|---|---|
| Kết quả | 19 ✅ · 1 ❌ (P074) | 20 ✅ |
| Mở nguội lần đầu (`am start -W` sau `pm clear`) | trung vị 2 351 ms · tối đa 3 837 ms | trung vị 2 019 ms · tối đa 2 548 ms |
| Mở nguội sau hành trình | trung vị 2 943 ms · tối đa 3 858 ms | trung vị 2 296 ms · tối đa 3 129 ms |
| PSS sau hành trình | trung vị 104 MB · tối đa 111 MB | trung vị 110 MB · tối đa 115 MB |
| Khôi phục sao lưu (2 000–12 000 khoản) | tối đa 11,4 s | tối đa 9,5 s |
| FATAL / ANR / crash native / bị kill nền (logcat lọc theo app) | 0 | 0 |

Đã kiểm thật (✅ ở 538ede9): onboarding UK/US · khôi phục file persona qua DocumentsUI Android 8 và 11 · 5 tab · ghi nhanh (expense/income/ghi
chú/"7.5"→7.50) · phân loại thẻ (kể cả chọn tuần cũ) · "Split & sort" + gộp · chuyến GPS **giả lập** (`emu geo fix`, ~1,6 mi; thông báo chuyến hiện
không cần hỏi quyền ở API 26/30; sau Save không còn foreground service) · dặm tay + đồng hồ công-tơ-mét · xuất CSV → share sheet · sao lưu →
share sheet + hỏi "đã lưu chưa" · khôi phục file của người khác · màn Pro online/máy bay · xoá toàn bộ (gõ DELETE) · đổi vùng có quy đổi
(£179.46×1.27=$227.91, $210.02×0.79=£165.92) · chạm đúp Save = 1 khoản · force-stop 60 ms sau Save / giữa lúc khôi phục (không trùng, không mất) ·
từ chối / thu hồi quyền vị trí giữa chuyến ("Saved 0.1 mi up to that point") · bộ nhớ đầy: sao lưu báo lỗi đúng · đồng hồ qua 5/4 23:59:30 (UK)
và 31/12 23:59:30 (US) → "Tax year 2026/27" / "Tax year 2027" · ghi chú `=SUM(A1:A9)`, unicode/RTL/emoji, xuất CSV · App lock bằng PIN máy (Lock
after Immediately; Recents trống; mở lại / deep link ra màn khoá) · màn Recurring/Rules khi Free · 12 000 khoản trên RAM 1,5 GB (P099): lướt
15 lần, Reports ~6 s, tìm kiếm. Mạng mỗi persona: online / 3G `umts` / EDGE + trễ 2 s / mất mạng giữa chừng / máy bay. Chữ 0,85 (API 26) /
1,3 (API 30); nền tối 15 persona.
Ngoài 40 persona: **widget** "Quick add" thêm được vào launcher Android 8, hiện "99+ to sort", bấm "+" mở màn Income ✅ (`_dbg/widget/`).

**Lưu ý trung thực:**
- Runner chấm bước ghi nhanh theo snackbar "Saved", **không** chấm cỡ chữ số tiền → OLD-9 (số tiền ~4px ở 360dp) có trên mọi persona API 26
  dù bảng ghi ✅.
- `gfxinfo` (P098: 93% khung giật) vô nghĩa với GPU phần mềm swiftshader — không dùng kết luận độ mượt.
- Fixture P048 (wipe_all) vốn rỗng → runner nhập 2 khoản trước khi xoá.
- Lượt 7fd7305 nhiều ❌ là lỗi runner (đã sửa, chạy lại); chỉ giữ các lỗi đã tái hiện tay (OLD-5, OLD-6).

**⏭ không chạy được thật:** PDF report (Pro → bấm là mở màn Pro, không mua) · dùng thử / mua Pro (cấm giao dịch thật; google_apis không có Play
Store) · "Sort list view" P006/P007 (tuần đã phân loại hết nên app không hiện nút — đúng) · chạy xe GPS thật · NFC · vân tay (dùng PIN máy) ·
chuyến tự động / Activity Recognition (Pro) · chụp hoá đơn bằng camera.

**Hồi quy bản sửa trên Android cũ (538ede9):** B-65 ✅ (P086, P090) · B-69 ✅ (P023: 12 chuyến, Miles không crash, 0 Fatal signal) ·
B-70 ✅ (P056, P057) · B-61 ✅ · B-60 ✅ (`P003/10_tab_Reports.png`: nút xếp dọc, FAB không đè) · **B-57/B-58 ❌ trên API 26** (OLD-9).

**Lỗi còn mở sau lượt này:** OLD-7 🟠 · OLD-8 🟡 · OLD-9 🟠 (hồi quy B-57/B-58).

## Lỗi tìm được

### OLD-1 🟠 Màn nhập khoản (capture) trên màn cao 640dp: số tiền đang gõ co còn ~4px, không đọc được
- **Máy:** API 26 720×1280@320dpi (360×640dp) — tái hiện cả trên **API 30 đặt `wm size 720x1280` + `wm density 320`** → do cỡ màn, không do đời Android.
  API 30 1080×2340@440 (392×851dp) hiển thị bình thường.
- **Bước:** onboarding → Home → Expense → gõ `1234`.
- **Kỳ vọng:** "£12.34" chữ lớn ở giữa màn (như API 30 màn lớn). **Thực tế:** số tiền chỉ còn chữ ~4px nằm dính trên nút Photo; vạch caret đỏ cao
  chồng lên nút Note. Đây là luồng chính "Log it in 10 seconds" — người dùng máy nhỏ không thấy mình gõ bao nhiêu.
- **Bằng chứng:** `qa-runs/android-old/_smoke26/16_expense.png`, `17_expense_typed.png` (API 26); `qa-runs/android-old/_smoke30/expense_api30_360dp.png`
  (API 30 ở 360dp) vs `expense_api30.png` (màn lớn, bình thường).
- **Nguyên nhân gốc nghi ngờ:** `src/app/capture.tsx:509` `middle: { flex: 1 }` không có `minHeight`; khi bàn phím mở (adjustResize) phần trên còn
  ~386dp, hàng Photo/Work/Note + gợi ý ghi chú + Save + CalcBar chiếm hết → `middle` còn ~0dp → `Txt adjustsFontSizeToFit` (`capture.tsx:303-306`)
  co chữ tới cỡ tối thiểu. Gợi ý: `minHeight` cho vùng số tiền (vd 72dp) và/hoặc ẩn hàng gợi ý ghi chú / dòng "20 of 20 free photos" khi
  bàn phím mở trên màn thấp, hoặc `minimumFontScale`.

### OLD-2 🟡 Android 8: hàng phím phép tính (+ − × ÷, CalcBar) bị bàn phím che nửa dưới
- **Máy:** chỉ API 26 (API 30 cùng cỡ 360dp hiển thị trọn hàng CalcBar) → khác biệt đời Android.
- **Bước:** như OLD-1. **Thực tế:** CalcBar (`capture.tsx:450`) top y=720, bàn phím từ y=773 → chỉ thấy ~nửa trên của 4 nút.
- **Bằng chứng:** `qa-runs/android-old/_smoke26/17_expense_typed.png` vs `_smoke30/expense_api30_360dp.png`.
- **Nguyên nhân gốc nghi ngờ:** `capture.tsx:258` `KeyboardAvoidingView behavior='height'` trên Android cộng với `windowSoftInputMode=adjustResize` +
  edge-to-edge: trên API < 30 không có WindowInsets IME chuẩn nên phần bù chiều cao bị lệch (thiếu ~1 hàng). Cần kiểm thêm trên máy Android 8–10 thật.

### OLD-3 🟡 360dp: nút nổi "+" (New entry) đè lên nút "Actual costs" ở Reports
- **Máy:** API 26 360dp, persona P003 (UK, chưa chọn cách tính xe). **Bằng chứng:** `qa-runs/android-old/_smoke26/15_reports.png` — FAB (560–688, 736–864)
  che phần chữ "Actual co|sts" (367–656, 762–858). Cuộn được nên vẫn bấm được nút khi cuộn, nhưng ở vị trí mặc định thì bấm vào giữa-phải nút sẽ mở
  màn nhập khoản thay vì chọn "Actual costs".

### Kiểm lại trên APK 5ce0626 (2026-11-18, API 26 360dp `-gpu host -memory 1536`; B-69 trên API 30 swiftshader) — `qa-runs/android-old/verify-5ce0626/`
| Lỗi | KQ | Bằng chứng + số đo |
|---|---|---|
| B-72 (OLD-9) số tiền | ✅ | `b72_typed_1234.png`: "$12.34" cao 58 px = **29 dp** (chữ 0.85); `b72_font13_draft_restored.png` chữ 1.3: **34 dp** |
| B-72 (OLD-9) hàng + − × ÷ trên bàn phím | ❌ | bàn phím bắt đầu y=774 px; phím CalcBar bắt đầu y≈726 → chỉ lộ ~47/85 px, ký hiệu bị cắt (~19 dp bị che). Chữ 1.3: dải CalcBar y=735→774, **chỉ lộ 39 px**, không thấy ký hiệu nào |
| B-73 Back ẩn bàn phím → chạm số tiền → bàn phím lại | ✅ | `b73_compare.png`: ẩn bàn phím thì "Tap for Personal", "20 of 20 free photos", "No category needed" hiện lại; chạm số tiền → bàn phím + màn gọn |
| B-74 (OLD-8) bộ nhớ đầy → Save báo lỗi | ⚠️ (OLD-10) | snack "Couldn't save. Free up some storage on your phone and try again." **có**, nhưng nằm sau bàn phím: 10 ảnh/3 s sau Save không thấy (`b74_strip3.png`); ẩn bàn phím mới lộ (`b74_strip4.png`) |
| B-75 (OLD-7) bộ nhớ đầy → mở app 3 lần | ✅ | `b75_open_0..2.png`, `b75_logcat.txt`: 3/3 mở được, WorkManager vẫn log SQLiteFull (D) nhưng không "bad state"/crash dialog của app (các hộp "has stopped" là Google Play Music/Gmail) |
| B-84 bị giết khi đang chọn ảnh → mở lại | ✅ | gõ 43.21 → Photo → Choose from library → `kill -9` (như lowmemorykiller; `am kill` không giết được vì app còn "perceptible") → Back → Ghi nhanh mở lại "$43.21" (`b84_c3_after_return.png`, `capture-draft.json` còn) |
| B-65 Recents khi App lock bật | ✅ | API 26: Settings và khi đang mở sheet → ảnh Recents 1 màu (trống); tắt App lock → Recents 64 màu, chụp màn được lại (`b65_*`). API 30 (538ede9) cũng ✅ (`_dbg/b65/`) |
| B-69 Miles trên swiftshader | ✅ | API 30 swiftshader, P023 12 chuyến: mở Miles + màn chi tiết chuyến (MapView) 3 lần, **0** Fatal signal (`b69_*`). Lỗi gốc không tái hiện nên nhánh "sập tối đa 1 lần" chưa được thử tới |
| B-59 migration trước tác vụ nền | ✅ | 40/40 logcat lượt 538ede9 có lần mở đầu, **0** dòng "no such table" |

### Kiểm lại B-93 / OLD-10 trên APK 97ceb60 (gồm bcc8c7a B-93), 2026-11-18 · `qa-runs/android-old/verify-97ceb60/`
| Kiểm | API 26 360dp chữ 0.85 | API 26 chữ 1.3 | Android 7 (chữ 0.85 / 1.3) |
|---|---|---|---|
| Hàng + − × ÷ thấy đủ 4 ký hiệu (B-93) | ✅ ngay dưới số tiền, ký hiệu y=361–380 (`b93_f085_1250.png`) | ✅ (`b93_f13_1250.png`) | ✅ cả hai (`api24/android7_sum_compare.png`) |
| Gõ 1250 → + → 420 = **£16.70** | ✅ "12.50+4.20 = £16.70", Save → "Saved · £16.70 expense" | ✅ | ✅ cả hai; ✓ rồi Save → "Saved · £16.70 expense" |
| Bộ nhớ đầy → Save báo lỗi trên màn (OLD-10) | ✅ bàn phím tự ẩn, snack "Couldn't save. Free up some storage…" hiện ~1,5–2 s, số tiền giữ nguyên (`old10b_strip.png`) | — | ✅ (`api24/android7_save_strip.png`) |
| Nút **Save** khi bàn phím mở | ⚠️ chỉ lộ 65/112 px (đỉnh y=709, bàn phím y=774) — chữ "Save" bị cắt, bấm phần lộ vẫn lưu | ❌ chỉ lộ 43 px, không thấy chữ "Save" | ❌ bị che hoàn toàn (bàn phím Android 7 cao hơn, có dải gợi ý; mép trên y=657) |
Ghi chú: ở 16 MB trống lưu vẫn được (lần đầu "Saved · £9.99"); phải chừa ~2 MB mới vào nhánh lỗi.

### Kiểm lại B-97 (OLD-11) trên APK c5e0d3e, Android 7, 2026-11-18 · `qa-runs/android-old/verify-c5e0d3e/`
- DocumentsUI đặt về mặc định (`pm clear com.android.documentsui`, "Show internal storage" tắt — như máy mới). Màn Backup & restore có dòng
  **"If the list is empty, tap ⋮ → Show internal storage."** dưới nút Choose backup folder ✅ (`b97_backup_screen.png`).
- Làm theo hướng dẫn: bộ chọn mở "Recent · No items" → ⋮ → Show internal storage → bộ nhớ máy → SELECT → app hiện **"Backup folder · This phone"**,
  "Nightly backup on · … · This phone" (không còn "primary:") ✅ (`b97_3_after_select.png`); file `SundaySort-backup-2026-11-18-0406-ecbcz7.sundaysort`
  được ghi ngay.
- B-93 kiểm nhanh lại trên bản này (Android 7): "12.50+4.20 = £16.70", đủ 4 ký hiệu, ✓ → Save → "Saved · £16.70 expense" ✅ (`b93_android7_sum.png`).
  Từ 97ceb60 → c5e0d3e chỉ đổi màn sao lưu (`git diff --stat`), nên kết quả B-93/OLD-10 trên API 26 ở 97ceb60 vẫn áp dụng. OLD-12 vẫn còn (Save sau bàn phím).

### Kiểm lại B-98 (OLD-12) trên APK 1dd73db, 2026-11-18 · `qa-runs/android-old/verify-1dd73db/` (`qa/tools/oldb98.py`)
| | Save lộ trên bàn phím (px, nút cao ~112) | Phím ✓ của bàn phím số |
|---|---|---|
| API 26 360dp, P003 (có hàng gợi ý), chữ 0.85 | ❌ 64 px (đỉnh y=710, bàn phím y=774) — **không đổi** so với 97ceb60 (709) | ✅ "Saved · £12.50 expense" |
| API 26, chữ 1.3 | ❌ 42 px, không thấy chữ "Save" | ✅ "Saved · £12.50 expense" |
| Android 7, dữ liệu mới (không hàng gợi ý — trường hợp dễ nhất), chữ 0.85 | ❌ 36 px (đỉnh y=622, bàn phím y=658) | ✅ |
| Android 7, chữ 1.3 | ❌ 14 px | ✅ |
- **Phím ✓ lưu** ✅ ở mọi máy/cỡ chữ → giờ người dùng có đường lưu ngay cả khi Save bị che.
- **Save vẫn bị che** ❌: đổi `keyboardVerticalOffset` từ `insets.bottom` sang `insets.top + insets.bottom` (`capture.tsx:230`, dùng ở `:368`
  `KeyboardAvoidingView behavior='height'`) không dịch nút đi pixel nào trên API 26 → giá trị offset không phải thứ quyết định ở đây (có thể KAV
  không tính lại theo offset trên Android < 11, hoặc `insets.top` = 0 khi không edge-to-edge). Gợi ý: thêm khoảng đệm cứng dưới khối nút khi
  `keyboardUp && API < 30` (vd `paddingBottom: StatusBar.currentHeight`) rồi đo lại; hoặc tính chiều cao vùng thật bằng
  `Dimensions.get('screen').height - keyboard.endCoordinates.screenY`.
- Ghi chú: lần này khôi phục P003 trên Android 7 lỗi do runner (DocumentsUI vừa bị đặt lại khi kiểm B-97) nên Android 7 chạy với dữ liệu mới.

### Kiểm lại B-98 lần 2 trên APK 322acd6 (measureInWindow), 2026-11-18 · `qa-runs/android-old/verify-322acd6/`
| | Save lộ (px) | Phím ✓ |
|---|---|---|
| API 26, P003 (có hàng gợi ý), chữ 0.85 | ❌ 64 (y=710→773, bàn phím 774) — chờ 2/5/8 s vẫn y nguyên (`wait_*s.png`) | ✅ Saved |
| API 26, chữ 1.3 | ❌ 42 | ✅ |
| Android 7, dữ liệu mới, chữ 0.85 | ❌ 36 (y=622→657, bàn phím 658) | ✅ |
| Android 7, chữ 1.3 | ❌ 14 | ✅ |
**Không đổi so với 1dd73db** → `covered` (`capture.tsx:494-499`) tính ra ≤ 1 nên không đệm. Số đo thật (720×1280 @320 = 2 px/dp, thanh trạng thái
24dp, **thanh điều hướng 48dp** ở y=1184–1280):
- API 26: mép bàn phím thật 774 px = 387dp màn hình = **363dp cửa sổ**; đáy khối Save ≈ 821 px = 410,5dp màn hình = 386,5dp cửa sổ → bị che 23,5dp.
- Android 7: mép bàn phím 658 px = 329dp màn hình = **305dp cửa sổ**; đáy Save ≈ 734 px → bị che 38dp (bàn phím có dải gợi ý).
- Khớp cả hai nếu `endCoordinates.screenY` RN báo = cao màn hình − cao bàn phím **không tính thanh điều hướng**: API 26 → 640 − 205 = 435dp,
  trừ thanh trạng thái (24) = 411dp > 386,5 → covered âm. Mép thật = screenY − **48 (nav bar)** − 24 = 363 ✓; Android 7: 640 − 263 = 377 − 48 − 24 = 305 ✓.
- Gợi ý: trên API < 30 lấy `keyboardTopInWindow = screenY − navBar − statusBar` (navBar = `Dimensions.get('screen').height −
  Dimensions.get('window').height − StatusBar.currentHeight`, hoặc `insets.bottom` nếu khác 0), hoặc log `screenY`/`measureInWindow` ra logcat để
  phiên B đọc được số thật.

### Kiểm lại B-98 lần 3 trên APK 771234e (trừ nav bar, có log [B98v3]), 2026-11-18 · `qa-runs/android-old/verify-771234e/`
| | Save lộ (px) | Phím ✓ | Log `[B98v3]` (dp) lần đầu → các lần sau |
|---|---|---|---|
| API 26 P003 chữ 0.85 | ❌ 64 (không đổi) | ✅ | `screenY=387 kb=205 top=363 y=216 h=200.5 covered=54` → h 254.5/362.5/400.5, covered 108/216/254 |
| API 26 chữ 1.3 | ❌ 42 | ✅ | `y=216 h=211.5 covered=65` → h 276.5/406.5/411.5 |
| Android 7 (dữ liệu mới) chữ 0.85 | ❌ 36 | ✅ | `screenY=329 kb=263 top=305 y=216 h=156.5 covered=68` → h 224.5/356.5 |
| Android 7 chữ 1.3 | ❌ 14 | ✅ | `y=216 h=167.5 covered=79` → h 246.5/367.5 |
- **Mép bàn phím giờ tính đúng** (`top` 363 / 305dp = đúng số đo ảnh) ✅.
- **Nhưng đệm không đẩy khối lên:** `y` của khối nút luôn = 216dp (bị nội dung phía trên giữ lại), thêm `paddingBottom` chỉ làm khối dài xuống
  (`h` tăng đúng bằng `covered` mỗi lần) → không dịch nút đi pixel nào; và `setSaveLift(l + covered)` cộng dồn mỗi `onLayout` tới trần 200.
- **Gốc thật:** không đủ chỗ. API 26: vùng trên bàn phím chỉ 363dp, phần trên khối nút đã chiếm 216dp, khối nút cần 200–211dp → thiếu 54–65dp.
  Android 7 (bàn phím có dải gợi ý): 305dp, khối cần 157–168dp từ y=216 → thiếu 68–79dp.
- **Gợi ý:** khi `keyboardUp && API < 30` thu gọn phần trên khối Save (ẩn hàng Photo/Work/Note hoặc hàng gợi ý ghi chú, chỉ giữ số tiền + hàng
  phép tính + Save) hoặc đặt khối Save `position: 'absolute', top: top − h` đè lên vùng số tiền; bỏ cộng dồn (`setSaveLift(covered)` một lần).

### Kiểm lại B-98 lần 4 trên APK 4f297e1 (thu gọn khi thiếu chỗ), 2026-11-18 · `qa-runs/android-old/verify-4f297e1/` (`qa/tools/oldb98v4.py`) — ✅ OLD-12 hết
| | (1) Save khi gõ số tiền | (2) mở Note, gõ chữ | (3) đóng bàn phím | (4) phím ✓ |
|---|---|---|---|---|
| API 26, P003 có hàng gợi ý, chữ 0.85 | ✅ trọn trên bàn phím (y=651–744, bàn phím 771) | ✅ ô Note "QA note" + Save trọn (bàn phím chữ y=683) | ✅ Photo/Work/Note, gợi ý, dòng phụ hiện lại | ✅ Saved · £12.50 |
| API 26, chữ 1.3 | ✅ (651–744 / 771) | ✅ | ✅ | ✅ |
| Android 7 (dữ liệu mới), chữ 0.85 | ✅ (535–628 / 655) | ✅ (bàn phím chữ y=655) | ✅ | ✅ |
| Android 7, chữ 1.3 | ✅ | ✅ | ✅ | ✅ |
Log `[B98v4]`: API 26 `top=363 y=216 h=200.5 covered=54 cramped=false` → `y=321 h=66 covered=24 cramped=true`; Note mở: `top=319 … cramped=true`.
Android 7 `top=305 … covered=68` → `y=263 h=66 cramped=true`. (`covered=24` còn lại ở trạng thái gọn là phần đệm dưới của khối; ảnh cho thấy Save
nằm trọn trên bàn phím, cách mép 27 px.) Ảnh: `api26/v4_strip.png`, `api24/v4_strip.png`.

### Kiểm B-114 (04fa4f9) và B-115 / B-109 v2 (07f4aac), API 26 360×640dp, 2026-11-18 15:45–16:07 · `verify-04fa4f9/`, `verify-07f4aac/`
| Kiểm | Kết quả |
|---|---|
| B-115 (OLD-14) Take photo | ✅ 07f4aac: `dumpsys package` có WRITE_EXTERNAL_STORAGE; hỏi Camera → hỏi "photos, media, files" → camera mở → chụp → ✓ → "1 of 3" → Save → `files/receipts/*.jpeg` 1080×1080, mốc xanh ở góc trên-trái như khung ngắm (đúng chiều), không FATAL. Lần đầu app Camera của máy ảo hiện màn giới thiệu (gắn vị trí) rồi về chế độ chụp thường, không trả ảnh — lỗi của app Camera máy ảo; lần 2 mở CaptureActivity đúng. Ảnh nhỏ + đứng đúng → giữ nguyên (theo thiết kế); bản tạm ImagePicker 28 KB còn trong cache. |
| B-115 trên Android 7 | ✅ 07f4aac: có WRITE_EXTERNAL_STORAGE; hỏi "photos, media, files" → camera mở → ✓ → Save → `files/receipts/*.jpeg` 480×480, mốc xanh đúng vị trí như khung ngắm (x 0,35–0,59, y 0,72–0,97). Lần chụp đầu app Camera của máy ảo (`com.android.camera2`) tự crash (NPE trong bộ nén JPEG của nó) — app mình vẫn sống, giữ khoản £4.44; lần 2 chụp được. `verify-07f4aac/api24/`. |
| B-114 (OLD-13) Sort chữ 2.0 | ⚠️ Một phần: Edit/Split/Merge/Skip cuộn tới được, bấm được (cao 96 px); Merge ✅. Còn: tiêu đề + List view đứng yên chiếm y=76–632 (nửa màn), "Sort your wee/k" vẫn bẻ giữa chữ, List view vẫn **cạnh** tiêu đề; chip tuần "This week · 1.."; nhãn nút "E… Sp.. Mer…"; nút + che Skip (chạm Skip mở Ghi nhanh). |
| **OLD-16** 🟠 Split ở chữ 1.3 và 2.0 | ❌ 04fa4f9 và 07f4aac: mở Split → thẻ cắt ở đáy (y≈842–864) dưới "Left to assign", **không tới được "Split & sort"** — vuốt trong thẻ / ngoài thẻ đều không cuộn thêm, thanh cuộn của thẻ đứng ở nửa trên. Chữ 1.0 ✅ (thấy Split & sort sau 1 lần vuốt). P016 "split an entry" ❌ vì lỗi này. Ảnh `split_f13*.png`, `split_f2_*.png`, `split_f10.png`. |
| B-109 v2 | ❌ 07f4aac: đường FAB ở Entries + ✓ → danh sách chỉ nhảy lên một đoạn (dừng ở "M6 toll / TUE 12 MAY", trên đó còn 25 MAY, 20 MAY…), không về TODAY; đường Home → Expense → ✓ → tab Entries → vẫn ở quanh "SUN 26 APR". `b109_*.png`. |
| 🟡 B-100 viên "More below" | Vuốt bắt đầu **trên** viên thì trang onboarding không cuộn; vuốt cạnh viên thì cuộn. Viên che chữ "United States". |
| Persona P016 (chữ 2.0) | onboarding ✅ (runner vuốt ở x=w/6), khôi phục ✅, 5 tab ✅, Merge ✅, Split ❌ = OLD-16, log sạch. |
Runner: `scroll_vis` vuốt ở x = w/6 (tránh viên "More below"); bước Split cuộn trong thẻ tới khi thấy nút Split.

### Hồi quy APK 3f26b33 (bản ứng viên cuối), 2026-11-18 15:06–15:45 · `qa-runs/android-old/verify-3f26b33/`
| Kiểm | API 26 (360×640dp) | Android 7 |
|---|---|---|
| B-98 (`oldb98v4.py`, chữ 0.85 + 1.3) | ✅ Save 651–744 / bàn phím 771; Note + Save thấy; hàng hiện lại; ✓ "Saved · $12.50" | ✅ 535–628 / 655, đủ 4 ý |
| Ảnh: Choose from library (JPEG 4000×3000 EXIF orientation 6) | ✅ lưu 1800×2400, đứng đúng (dải đỏ trên, xanh dưới), bản tạm ImagePicker đã xoá, khoản lưu có ảnh (`files/receipts`) | ✅ y hệt (DocumentsUI Recent, chọn bằng phím) |
| Ảnh: Take photo | 🔴 **OLD-14** — không mở camera | 🔴 OLD-14 y hệt |
| B-112 chip ngày khác năm | ✅ Ghi nhanh "Tue 18 Nov 2025, 03:33"; dòng Date & time ở Sửa khoản giống thế; tiêu đề nhóm "TUE 18 NOV 2025" (chip 2 dòng → OLD-15) | — (không kịp) |
| B-109 Save → Entries về đầu | 🟠 **chưa sửa được** — 3 đường đều giữ vị trí cũ (FAB ở Entries + ✓; FAB + nút Save; Home → Expense → ✓ → tab Entries) | — |
| Persona | P003 ✅ 12/0/0 · P041 ✅ (⏭ Try Pro) · P016 (US, chữ 2.0) ❌ chỉ bước Split = **OLD-13** | P003: runner khôi phục hỏng (hạn chế đã biết của DocumentsUI) |
Runner sửa cho bản này: đến màn chọn vùng thì tự cuộn (B-100 làm danh sách vùng cuộn được ở chữ 2.0); Ghi nhanh đóng bàn phím rồi mới tìm nút Note
(B-98 v4 ẩn hàng Photo/Work/Note khi bàn phím mở). Lần chạy đầu P003/P016 hỏng vì 2 chỗ này: `run1_P003/`, `run1_P016/`.

### OLD-14 🔴 Android 7–9 (API 24–28): "Take photo" không bao giờ mở camera
- **Máy/APK:** API 26 và Android 7, APK 3f26b33. Ghi nhanh → Photo → Take photo → hộp xin quyền Camera → ALLOW → quay lại Ghi nhanh, không có ảnh.
  Bấm lần 2 (CAMERA granted=true) vẫn vậy. Logcat có 2 lần `REQUEST_PERMISSIONS`, lần thứ hai trả về sau ~80 ms, không hiện hộp thoại, và không có
  intent camera nào được mở. Android 7 hiện snack "Couldn't save the photo. Your entry was saved without it." — câu sai (khoản chưa lưu) và che
  nút Save (`a7_04_after_allow_t1.png`).
- **Gốc (đọc code):** trên SDK < Q, `ensureCameraPermissionsAreGranted()` của expo-image-picker (ImagePickerModule.kt:275–301) đòi **cả**
  WRITE_EXTERNAL_STORAGE và CAMERA. `plugins/withReleasePermissions.js` gỡ WRITE_EXTERNAL_STORAGE (và READ) khỏi manifest release → `dumpsys package`
  không có quyền này → không xin được → UserRejectedPermissionsException → `takePhoto()` trả 'failed'. Android 10+ (A13) chỉ cần CAMERA nên không bị.
- **Gợi ý:** bỏ WRITE_EXTERNAL_STORAGE khỏi REMOVE, khai lại trong manifest release với `android:maxSdkVersion="28"`
  (`tools:replace="android:maxSdkVersion"`); Android ≤ 9 sẽ hỏi thêm quyền "ảnh, nội dung, tệp".

### OLD-13 🟠 Chữ 2.0 trên máy cao 640dp: thẻ ở tab Sort bị ép còn ~2px, không phân loại được
- **Máy/APK:** API 26 720×1280 @320dpi, font_scale 2.0, APK 3f26b33 (persona P016). Tiêu đề "Sort your wee / k" bị bẻ giữa từ vì nút List view
  nằm cạnh, cộng chip tuần + thanh tiến độ, chiếm hết chiều cao. Thẻ ở [32,828]–[688,844]: Edit/Split/Merge/Skip có bounds cao 2px. Vuốt không
  cuộn được. Chữ 1.3 / 1.5 / 1.7 bình thường (Split y≈740–848). Vẫn dùng được List view ("Choose"). A13 (800dp) không bị.
- **Gợi ý:** thẻ có chiều cao tối thiểu (~260dp); không đủ chỗ thì cả màn cuộn chứ không ép thẻ; hoặc tiêu đề 1 dòng / đưa List view xuống dưới
  tiêu đề. Ảnh: `sort_font2*.png`, `P016/12_split_panel.png`.

### OLD-15 🟡 Chip ngày có năm ("Tue 18 Nov 2025, 03:33") xuống 2 dòng, ép nút Expense|Income
- API 26, chữ 1.0, 360dp, APK 3f26b33: chữ "Expense" tràn ra ngoài viên đỏ (`d_04_chip.png`). Gợi ý: chip 1 dòng + co chữ, hoặc bỏ thứ khi có năm.

### OLD-12 🟡 Android < 11: nút Save ở Ghi nhanh nằm (một phần / hoàn toàn) sau bàn phím khi đang gõ
- **Máy/APK:** API 26 360dp và Android 7, APK 97ceb60. Bảng trên. Nút ✓ của bàn phím chỉ ẩn bàn phím (không lưu); sau đó Save hiện đủ.
- **Nguyên nhân gốc nghi ngờ:** vẫn lệch đúng ~24dp: Save đỉnh y=709 + cao 112 px = 821 so với bàn phím y=774 → 47 px = 23,5dp ≈ chiều cao thanh
  trạng thái — cùng gốc B-58 (bố cục tính theo cửa sổ dài hơn vùng thật một thanh trạng thái). Với bàn phím cao hơn (Gboard có dải gợi ý) phần
  bị che lớn hơn. Gợi ý: trừ đúng `insets.top`/dùng chiều cao vùng còn lại thật (ví dụ `useWindowDimensions().height - keyboardHeight - statusBar`)
  cho API < 30, hoặc cho phím ✓/Enter của bàn phím gọi Save khi số tiền > 0.

### Android 7.0 x86 32-bit (minSdk 24) — APK 5ce0626, 2026-11-18 · `qa-runs/android-old/api24/` (`summary.md`)
AVD `qa_min_api24_x86` (google_apis x86 r27, **32-bit**, RAM 1536 MB, 720×1280 @320 = 360dp, cổng 5568, `-gpu host`). APK cài bằng
`adb push` + `pm install` (`adb install` kiểu streamed treo trên API 24); `primaryCpuAbi=x86`.

**8/8 persona ✅** (chạy trên API 24, chọn từ nhóm api26_small): P003 P020 P024 P028 P032 P036 P061 P082 — mở nguội lần đầu trung vị **1 239 ms**
(tối đa 1 340), sau hành trình 1 473 ms; PSS trung vị 84 MB; khôi phục 2 000 khoản ≤ 3,9 s; 0 FATAL/ANR/crash native/kill.
(GPU host nhanh hơn swiftshader của lượt API 26 nên số mở nguội không so trực tiếp được.) P020/P032 là persona "tối" nhưng Android 7 không có
chế độ tối hệ thống → chạy nền sáng (ghi trong bước device profile). ⏭ PDF (Pro).

Kiểm riêng Android 7:
- **Khôi phục qua SAF** ✅ — DocumentsUI 7: mục "Downloads" chỉ liệt kê file của DownloadManager và **bỏ qua `input tap`** trên lưới → runner
  bật "Show internal storage" rồi đi bằng phím (DPAD/ENTER; mỗi lần `uiautomator dump` xen giữa làm mất tiêu điểm phím). Giới hạn công cụ, không phải app.
- **Chọn thư mục sao lưu (OPEN_DOCUMENT_TREE)** ✅ có điều kiện (OLD-11): chọn bộ nhớ máy → "Nightly backup on · This phone / primary:", app ghi ngay
  `SundaySort-backup-2026-11-18-0337.sundaysort` + `SundaySort-backups.json` vào thư mục đó (`checks/saf_after_select.png`).
- **JobScheduler/sao lưu đêm** ✅ đăng ký: `dumpsys jobscheduler` có job WorkManager `SystemJobService` của app (latency ~2h55m). ⏭ ép chạy job:
  Android 7 từ chối `cmd jobscheduler run -f` (kể cả root).
- **Foreground service + thông báo chuyến** ✅ (P024: "RECORDING · GPS good · 1.6 mi", có thông báo, sau Save không còn service).
- **Widget** ✅ "Week & trip" trên Launcher3: hiện "£180.66 · 25 to sort", bấm "Start trip" → màn xin quyền vị trí (`checks/widget_*.png`).
- **Phông / RTL** ✅ Inter + "مرحبا بالعالم" hiển thị đúng (`P082/14_entries_weird.png`).
- WebView in PDF: ⏭ (PDF là tính năng Pro).

### OLD-11 🟡 Android 7: "Choose backup folder" mở bộ chọn chỉ có "Recent · No items"
- **Máy:** API 24, 5ce0626. **Bước:** Settings → Backup & restore → Choose backup folder.
- **Thực tế:** ngăn "Open from" chỉ có "Recent", màn chính "No items" — không có chỗ nào để chọn. Phải biết mở ⋮ → "Show internal storage" mới thấy
  bộ nhớ máy (`checks/saf_tree_picker.png`, `saf_tree_root.png`). Sau khi chọn gốc bộ nhớ, nhãn hiện "This phone / **primary:**" (lộ id tài liệu).
- **Gợi ý:** thêm extra `android.content.extra.SHOW_ADVANCED = true` vào intent OPEN_DOCUMENT_TREE (và OPEN_DOCUMENT khi khôi phục) để bộ nhớ máy hiện
  sẵn trên Android 7–9; với gốc bộ nhớ, đặt nhãn "This phone" thay vì "primary:".

### OLD-10 🟡 (từ B-74) Android 8: snackbar lỗi/“Saved” ở màn Ghi nhanh nằm sau bàn phím
- **Máy:** API 26 360dp, APK 5ce0626. **Bước:** bộ nhớ đầy → Expense → gõ 888 → Save (bàn phím đang mở như bình thường).
- **Thực tế:** 3 s không thấy gì; nhấn Back ẩn bàn phím thì snack đỏ "Couldn't save…" hiện ở đáy (đè lên nút Save). Người dùng nghĩ Save không ăn.
- **Nguyên nhân gốc nghi ngờ:** cùng gốc B-58: trên API < 30 vùng cửa sổ không co lại theo bàn phím, nên mọi thứ ở đáy (CalcBar, snack `above: 'none'`)
  nằm sau bàn phím. Gợi ý: ở màn Ghi nhanh đặt snack phía trên (`above: 'keyboard'`/top) hoặc ẩn bàn phím khi báo lỗi.

### OLD-7 🟠 Bộ nhớ máy đầy → app sập ngay khi mở ("Sunday Sort has stopped") vì WorkManager
- **Máy:** API 26 (emulator-5558), APK `538ede9-all`, dữ liệu P074. `/data` còn 16 MB (`dd` lấp đầy, như máy 16 GB rẻ tiền đầy ảnh).
- **Bước:** đầy bộ nhớ → force-stop → mở app (`am start`). Lần 1 mở được; lần 2 (và lần mở trong lúc chạy runner) → hộp **"Sunday Sort has stopped"**,
  app không vào được. Giải phóng bộ nhớ → mở lại bình thường (dữ liệu còn).
- **Log:** `E WM-ForceStopRunnable: The file system on the device is in a bad state. WorkManager cannot access the app's internal data store.`
  `android.database.sqlite.SQLiteFullException: database or disk is full (code 13)` → `Showing crash dialog for package com.phiotron.sundaysort`.
- **Bằng chứng:** `qa-runs/android-old/_dbg/full/crash_dialog_storage_full.png`, `coldstart_full_1_logcat.txt` (dòng ~1109), `logcat_full.txt` (02:37:21).
- **Nguyên nhân gốc:** WorkManager (kéo vào bởi `expo-background-task` — sao lưu đêm `sundaysort-nightly` — và `react-native-android-widget`) khởi tạo
  mặc định lúc app start; `ForceStopRunnable` ghi DB nội bộ của WorkManager, gặp SQLITE_FULL thì sau vài lần thử **ném IllegalStateException** —
  hành vi mặc định khi không có `Configuration.Builder().setInitializationExceptionHandler(...)`. App không có `Configuration.Provider` nào
  (`grep InitializationExceptionHandler|Configuration.Provider` trong `modules/`, `plugins/` = 0).
- **Gợi ý:** config plugin thêm `Application : Configuration.Provider` với `setInitializationExceptionHandler { log }` (WorkManager tắt êm, app
  vẫn mở; sao lưu đêm bỏ qua đến khi có chỗ) + tắt `WorkManagerInitializer` mặc định trong manifest (`tools:node="remove"`).

### OLD-8 🟡 Bộ nhớ đầy: bấm Save ở màn nhập khoản không lưu, không báo gì
- **Máy/APK:** như OLD-7 (API 26, 538ede9); lặp lại 2/4 lần chạy (P073 API 30 lần đầu, P074 API 26 lần chạy lại + tái hiện tay).
- **Bước:** đầy bộ nhớ (≈12–16 MB trống) → Expense → gõ 777 → Save. **Thực tế:** 3 giây sau vẫn ở màn nhập, không snackbar "Saved", không lỗi;
  khoản không có trong Entries. Người dùng không biết là chưa lưu. (Back up now trong cùng tình huống báo lỗi đúng "Couldn't create the file.
  Free up some storage…" → chỉ màn nhập thiếu.)
- **Bằng chứng:** `qa-runs/android-old/_dbg/full/k0_before.png` + `k0_after0..5.png` (6 ảnh / 3 s không đổi), `qa-runs/android-old/P074/` (bước
  "capture while storage is full").
- **Nguyên nhân gốc:** `src/app/capture.tsx:199-208` `save()` bắt lỗi rồi `throw e` lại → promise từ `onPress` bị từ chối không ai bắt; bản release
  bỏ qua im lặng. `createEntry` ném SQLITE_FULL. Gợi ý: bắt lỗi và hiện snack "Couldn't save. Free up some storage and try again." (dùng lại chuỗi
  của backup), giữ nguyên số tiền trên màn.

### OLD-9 🟠 (hồi quy B-57/B-58 trên APK 538ede9) Android 8, 360dp: số tiền đang gõ vẫn co ~4px; CalcBar vẫn bị bàn phím che nửa
- **Máy:** API 26 720×1280@320, font 0.85, dữ liệu P074 (có hàng gợi ý ghi chú "M6 toll · Car wash · …"), APK `538ede9-all`.
- **Bước:** Home → Expense → gõ 777. **Thực tế:** chế độ gọn đã chạy (dòng "20 of 20 free photos" ẩn, vùng số tiền cao ~55dp, caret cao bình thường)
  nhưng chữ "$7.77" vẫn chỉ ~4px. Hàng + − × ÷ vẫn bị bàn phím che nửa dưới.
- **Bằng chứng:** `qa-runs/android-old/_dbg/full/k0_before.png` (538ede9) so với `_smoke26/17_expense_typed.png` (ece3819).
- **Nguyên nhân gốc nghi ngờ:** `adjustsFontSizeToFit` trên Android tính cỡ chữ ở lần layout đầu (khi vùng còn ~0 lúc bàn phím đang mở) và không phóng
  to lại khi vùng được nới → cần cỡ chữ tính theo chiều cao đo được (`onLayout` → `fontSize`) hoặc `minimumFontScale` (vd 0.5) thay vì để Android
  co tự do; B-58 (`keyboardOffset` cho API < 30, `capture.tsx:160`) chưa đủ bù trên máy này.

### OLD-6 🟠 App crash native (SIGABRT) khi mở tab Miles có chuyến: MapLibre snapshotter "Failed to choose ARGB config"
- **Máy:** API 30 `qa_mid_api30` chạy GPU phần mềm (`-gpu swiftshader_indirect`), APK `7fd7305-all`, persona P023 (UK, 411 khoản, **12 chuyến**).
- **Bước:** khôi phục P023 → bấm tab **Miles**. **Thực tế:** app biến mất về launcher (không hộp "app has stopped"), log:
  `F libc: Fatal signal 6 (SIGABRT) … tid (Snapshotter), pid (tron.sundaysort)` · `Abort message: 'terminating due to uncaught exception of type
  std::runtime_error: Failed to choose ARGB config.'` · backtrace toàn `libmaplibre.so` (`__cxa_throw`). Mở lại app → vào Miles lại crash
  (ảnh thu nhỏ chưa tạo được nên lần nào cũng thử lại).
- **Kỳ vọng:** không vẽ được ảnh bản đồ thì hiện ô trống/RouteSketch, app không chết.
- **Bằng chứng:** `qa-runs/android-old/_apk7fd7305/P023/crash_maplibre_snapshotter.txt`, `logcat.txt`, `09_tab_Miles.png`, `result.json` (bước tour: "left app on Miles").
- **Phạm vi:** chỉ tái hiện khi EGL của máy không có cấu hình ARGB mà MapLibre đòi (ở đây: GPU phần mềm của emulator). Cùng máy với GPU host
  (lần chạy trước, `-gpu auto`) tab Miles mở bình thường; API 26 cũng swiftshader + 12 chuyến (P024) thì Miles **không** crash → phụ thuộc
  bộ cấu hình EGL mà driver đưa ra. Máy thật Android cũ/GPU lạ (Mali/PowerVR đời cũ, một số máy Trung Quốc) có thể gặp —
  và khi gặp thì crash cứng mỗi lần mở Miles, vì lỗi C++ không bắt được từ JS.
- **Nguyên nhân gốc:** `src/features/trips/map/thumbs.ts` — `StaticMapImageManager` (snapshotter offscreen của `@maplibre/maplibre-react-native`
  11.5) tạo ảnh 56dp cho từng chuyến khi mở Miles; snapshotter ném `std::runtime_error` ở luồng native → `abort()`. `withTimeout` chỉ đỡ trường hợp
  promise không settle, không đỡ được abort. Gợi ý: mặc định dùng `RouteSketch` (SVG, đã có) cho ảnh thu nhỏ; chỉ dùng snapshotter khi một lần
  thử trước đó thành công (ghi cờ bền vào settings TRƯỚC khi gọi, xoá sau khi xong → lần mở sau thấy cờ còn = lần trước chết giữa chừng → tắt
  snapshotter vĩnh viễn trên máy đó). Cần kiểm thêm màn chi tiết chuyến (`TripMap.tsx`, MapView) trên cùng cấu hình GPU.

### OLD-5 🟠 App lock bật ("Lock after: Immediately") nhưng màn Recents vẫn hiện rõ dữ liệu của app
- **Máy:** API 26 (emulator-5570 `qa_dbg_api26`, APK `7fd7305-all`), persona P086 (US, app_lock). PIN máy đặt bằng `locksettings set-pin`.
- **Bước:** Settings → App lock (nhập PIN máy) → Lock after → Immediately → nút Home → mở Recents (KEYCODE_APP_SWITCH).
- **Kỳ vọng:** ảnh thu nhỏ trong Recents bị che (trống / logo) — người dùng bật khoá để người khác cầm máy không xem được sổ thu chi.
  **Thực tế:** ảnh Recents hiện nguyên màn Settings (và bất kỳ màn nào đang mở, kể cả Entries có số tiền + ghi chú). Mở lại app thì có màn khoá
  đúng, nhưng chỉ cần nhìn Recents là đã thấy dữ liệu. Xác minh điểm phiên điều phối ghi "Recents không che nội dung khi bật App lock (chưa xác minh)".
- **Bằng chứng:** `qa-runs/android-old/_dbg/al_recents.png` (Recents), `al_reopen.png`/`al_deeplink.png` (màn khoá đúng khi mở lại).
- **Nguyên nhân gốc:** không có chỗ nào đặt `FLAG_SECURE` / che nội dung khi app vào nền (`grep FLAG_SECURE|preventScreenCapture` trong `src/`,
  `modules/` = 0 kết quả); `LockGate` (`src/services/data.tsx:47-59`) chỉ khoá khi app **quay lại** active, không che lúc vào nền.
  Gợi ý: khi App lock bật → `FLAG_SECURE` trên MainActivity (expo-screen-capture `preventScreenCaptureAsync`, chặn luôn chụp màn) hoặc
  phủ màn trắng/logo khi `AppState` → `inactive`/`background` (Android chụp ảnh Recents lúc onPause).
- **Đã kiểm, không lỗi:** khi khoá, cây accessibility "compressed" (như TalkBack thấy) chỉ có "Sunday Sort is locked / Unlock" — dữ liệu phía sau đã
  `no-hide-descendants` (`data.tsx:64`). `uiautomator dump` thường vẫn liệt kê dữ liệu phía sau vì nó lấy cả node "không quan trọng" → giới hạn công cụ.
  Deep link `sundaysort://entries` khi đang khoá → vẫn hiện màn khoá ✅.

### OLD-4 🟡 Lần mở đầu tiên: log `[auto-trip] sync failed … no such table: settings`
- **Máy:** API 26 + API 30, ngay sau `pm clear` mở app lần đầu (`qa-runs/android-old/_smoke26` logcat 11:34:04). Không crash, chỉ cảnh báo JS.
- **Nguyên nhân gốc nghi ngờ:** tác vụ đồng bộ auto-trip chạy trước khi migration DB tạo bảng `settings` (thứ tự khởi động). Vô hại nếu lần sau
  chạy lại, nhưng nếu đồng bộ cấu hình native (Activity Recognition) chỉ chạy lúc khởi động thì lần đầu bị bỏ qua.
