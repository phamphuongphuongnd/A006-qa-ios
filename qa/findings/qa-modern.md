# QA-100 phiên F — điện thoại đời mới (Android 17 / API 37)

APK thử: `sundaysort-qa-ece3819.apk` (release, x86/x86_64/arm64). Bằng chứng (ảnh, log) ở `qa-runs/modern/` (gitignore, chỉ trên máy này).

## Máy ảo

| Serial | AVD | Màn | Ghi chú |
|---|---|---|---|
| emulator-5562 | `qa_pixel9proxl` (hồ sơ `pixel_9_pro_xl`) | 1344×2992 @480dpi (448×997dp), RAM 4 GB | cắt khuyết camera: overlay `cutout.emulation.hole`; điều hướng cử chỉ |
| emulator-5564 | `qa_pixel_fold` (hồ sơ `pixel_9_pro_fold`) | mở 2076×2152 @390 (852×883dp) · gập 1080×2424 (443×994dp), RAM 4 GB | `adb emu fold/unfold`; 2 màn vật lý (screencap phải chọn `-d`) |

Cài đặt gốc từng máy: `qa-runs/modern/_baseline/`.

## 1. Trang bộ nhớ 16 KB

**Kiểm tĩnh (APK ece3819):** ✅ cho 64-bit.
- `zipalign -c -P 16 -v 4` → "Verification successful" (`qa-runs/modern/16kb/zipalign-P16.txt`).
- Đọc ELF từng `.so` (93 file, `qa-runs/modern/16kb/elf-align.txt`): **arm64-v8a 31/31 và x86_64 31/31 có LOAD align = 0x4000**, lưu không nén.
- 22 `.so` của `lib/x86/` (32-bit) align 0x1000 — yêu cầu 16 KB của Google Play chỉ áp cho ABI 64-bit nên không tính là lỗi. Bản store
  (`reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64`) cũng vậy: chỉ quan trọng arm64-v8a.

**Chạy thật trên máy 16 KB:** ✅ — ảnh `system-images;android-37.0;google_apis_playstore_ps16k;x86_64` r08 (tải 2.2 GB, SHA1
`c4045d67…` khớp repository), AVD `qa_ps16k_api37` cổng 5566, `getconf PAGESIZE` = 16384.
- Cài APK ece3819 → `dumpsys package`: `primaryCpuAbi=x86_64`, **`pageSizeCompat=0`** (chạy gốc, không bị bật chế độ tương thích 4 KB).
- Mở app → onboarding → khôi phục P034 (US, 2000 khoản, SQLite) → 5 tab → chuyến GPS 0.9 mi có bản đồ MapLibre → màn nhập khoản.
  Không crash, logcat của tiến trình app không có `dlopen`/`UnsatisfiedLinkError`/cảnh báo căn trang (`qa-runs/modern/16kb/logcat-16kb.txt`,
  ảnh `qa-runs/modern/16kb/*.png`). Chỉ có `Mbgl-MapSnapshotter: Could not generate attribution for snapshot size 147×147` (ảnh thu nhỏ
  chuyến quá bé để vẽ dòng ghi nguồn — vô hại về chạy, xem MOD-5).
- Lưu ý vận hành: máy chủ Windows chạm trần commit (7 máy ảo) nên phải tạm tắt XL để chạy máy 16 KB; lần đầu `adb install` (stream) làm
  máy 16 KB rơi offline — cài bằng `adb push` + `pm install` thì ổn.

## 2a. Chạy lại trên APK `sundaysort-qa-538ede9-all.apk` (dev 538ede9, B-56…B-70) — 2026-11-17 15:30–15:55

Bằng chứng: `qa-runs/modern/regress-538ede9/`. Máy: XL (`-gpu host`) rồi Fold (`-gpu swiftshader_indirect`), mỗi lúc 1 máy, 3072 MB.

| Lỗi | Kiểm | Kết quả |
|---|---|---|
| 16 KB tĩnh | `zipalign -P 16` + LOAD align 124 `.so` | ✅ arm64-v8a 31/31, x86_64 31/31 = 0x4000; chỉ x86 / armeabi-v7a 32-bit 0x1000 (không thuộc yêu cầu) |
| MOD-2 / B-64 | XL chữ 2.0, tối, P005: Expense → gõ 1234 | ✅ "£12.34" chữ lớn (`xl-f2-typed.png`) |
| MOD-2 / B-64 | Fold mở xoay ngang (ROTATION_90), chữ 1.0: gõ 750 | ✅ "$7.50" rõ, bố cục gọn (`fold-land-capture.png`) |
| MOD-1 / B-63 | XL: Start trip → Approximate + Only this time | ✅ màn "Turn on precise location" → hộp Android "Change to precise?" |
| | → "Keep approximate" | ✅ app mở trang App info (Android đã khoá không hỏi lại, `USER_FIXED`) |
| | Bật "Use precise location" trong Cài đặt → quay lại → "Allow precise location" | ✅ sang bước 2 → chuyến "GPS good", 2 km → 1.2 mi (`xl-mod1-*.png`). 🟡 nhỏ: quay lại từ Cài đặt màn không tự đi tiếp, phải bấm lại "Allow precise location" |
| MOD-7 / B-70 | Màn nhập, Keep adding **tắt**: 2 lệnh tap liền lên Save | ✅ 1 khoản (36 → 37) |
| | Keep adding **bật**: chạm đúp Save, rồi gõ khoản tiếp + Save | ✅ 1 khoản, màn reset £0.00, khoản sau lưu bình thường (38 → 40, Out £20.11 → £38.98) |
| | Add trip (Odometer 48210 → 48338): chạm đúp "Save trip" | ✅ 1 chuyến 128 mi (Business tổng 128 mi) |
| | Odometer check (48,500): chạm đúp Save | ✅ 1 lần đọc |
| | Recurring entries | ⏭ tính năng Pro, người dùng free không tạo được (không mua thật) |

Ghi chú: bàn phím hiện QWERTY thay bàn phím số trên máy XL lần này — **cài lại bản cũ ece3819 cũng QWERTY** → do trạng thái Gboard
của máy ảo, không phải app (`keyboardType="number-pad"` không đổi).

### MOD-9 🟠 Ẩn bàn phím bằng Back rồi chạm vào số tiền → bàn phím không hiện lại, không gõ tiếp được (có từ ece3819, 538ede9 còn)
- **Máy:** XL API 37 (bàn phím phần mềm, `hw.keyboard=no`), cả ece3819 và 538ede9; chữ 1.0 và 2.0.
- **Bước:** Home → Expense (bàn phím tự hiện) → Back (bàn phím ẩn, caret còn) → chạm vào "£0.00" / vùng giữa, 1–2 lần.
- **Kỳ vọng:** bàn phím số hiện lại. **Thực tế:** `dumpsys input_method` → `mInputShown=false` sau mỗi lần chạm; caret biến mất. Ô ẩn
  vẫn là `mServedView` (gõ bằng adb vẫn vào: "£0.05") nhưng người dùng không có bàn phím → kẹt, phải đóng màn mở lại.
  Cử chỉ Back trên Android 10+ ẩn bàn phím trước nên rất dễ gặp. (`regress-538ede9/xl-f2-kb2.png`, `xl-old-refocus*.png`)
- **Nguyên nhân gốc nghi ngờ:** `src/app/capture.tsx:113-116` `focusAmount()` gọi `amountRef.current?.focus()` lên ô **đang focus sẵn**
  → Android không mở lại IME. Gợi ý: `if (amountRef.current?.isFocused()) { amountRef.current.blur(); requestAnimationFrame(() => amountRef.current?.focus()); } else amountRef.current?.focus();`
  (hoặc lắng nghe `keyboardDidHide` → `blur()`). Kiểm cả ô số ở Sửa khoản / Parking & tolls nếu cùng mẫu ô ẩn.

## 2. Lỗi tìm được

### MOD-1 🟠 Chọn "Approximate" (vị trí gần đúng) ở hộp quyền Android → chuyến GPS ghi 0.0 mi, kẹt "Finding GPS…", không báo gì
- **Máy:** emulator-5564 Pixel Fold API 37, dữ liệu persona P039 (UK). Quyền vị trí chưa cấp.
- **Bước:** Miles → Start trip → "Allow location" → hộp quyền hệ thống chọn **Approximate** + **Only this time** → bước 2 "Not now" → cho phép
  thông báo → chạy ~3 km (36 lần `emu geo fix`, mỗi 5 s) → End trip.
- **Kỳ vọng:** app nhận ra chỉ có vị trí gần đúng (Android 12+ cho người dùng chọn) và nói rõ cần "Precise" để đo dặm, kèm nút mở cài đặt.
- **Thực tế:** màn chuyến ghi "RECORDING · Finding GPS…" suốt 4 phút, kết thúc "Trip saved · **0.0 mi**". Không có cảnh báo nào.
  Đối chứng cùng máy, cùng lộ trình sau khi cấp Precise: "GPS good", 1.9 mi (≈ 3.0 km) ✅.
- **Bằng chứng:** `qa-runs/modern/m4/fold-trip-approx-seq.png` (hộp quyền → 3 phút "Finding GPS…" 0.0 → "Trip saved · 0.0 mi"),
  `fold-trip-precise-seq.png` (đối chứng). `dumpsys package`: `ACCESS_COARSE_LOCATION granted=true … ONE_TIME|SELECTED_LOCATION_ACCURACY`,
  `ACCESS_FINE_LOCATION granted=false`.
- **Nguyên nhân gốc nghi ngờ:** `src/app/trip/permission.tsx:40-41` chỉ xem `fg.granted`, không xem `fg.android?.accuracy` ('coarse' | 'fine');
  `src/features/trips/controller.ts:48-50` `startBlocker()` cũng vậy. Vị trí gần đúng có sai số ~1–3 km → mọi điểm bị bỏ ở
  `src/domain/mileage.ts:130` (`MAX_ACCURACY_M = 50`, dòng 98). Trên emulator, chỉ có quyền coarse thì GPS provider còn không bật.
  Gợi ý: khi `accuracy === 'coarse'` → coi như `needs_permission` có lời riêng ("Turn on Precise location to measure miles") + mở cài đặt;
  màn chuyến khi > 60 s không có điểm tốt → nêu lý do. Áp cho cả chuyến tự động (Pro) nếu dùng chung đường quyền.

### MOD-7 🟠 Chạm đúp "Save" ở màn nhập khoản → lưu 2 khoản trùng
- **Máy/persona:** Fold mở, P056 (US, double_tap_save, chữ 1.3, tối, edge_delay), runner `j_double_tap_save`: gõ 5.55 → 2 lệnh
  `input tap` liền nhau lên nút Save (≈0,2 s cách nhau, như người dùng chạm đúp).
- **Kỳ vọng:** 1 khoản; "to sort" +1; Out tuần +$5.55. **Thực tế:** "29 entries to sort" (trước 27), Out tuần $56.39 → **$67.49 = +2 × $5.55**.
- **Bằng chứng:** `qa-runs/modern/P056/21-after-double-tap.png`, `result.json` (verify_numbers trước đó khớp: Out $56.39, 27 to sort).
- **Nguyên nhân gốc:** `src/app/capture.tsx:199-249` — chốt `savingRef` có, nhưng khi không có ảnh thì `save()` chạy đồng bộ hết và
  **`savingRef.current = false` ở dòng 247 trước `close()`** (dòng 249). Màn còn gắn trong lúc chuyển cảnh đóng → chạm thứ hai thấy
  `savingRef=false`, `amount.minor` vẫn 555 → `createEntry` lần nữa. (Bật "Keep adding" thì `reset()` xoá số nên không trùng.)
  Gợi ý: chỉ mở lại chốt khi `keep` (sau `reset()`), còn khi `close()` thì giữ `savingRef=true`; hoặc `disabled` nút Save khi đang lưu.

### MOD-2 🟠 (mở rộng B-57 / OLD-1) Màn cao nhưng chữ 200% → số tiền đang gõ co còn ~6px
- **Máy:** emulator-5562 Pixel 9 Pro XL **997dp cao**, `font_scale 2.0`, nền tối, persona P005.
- **Bước:** Home → Expense → chạm số tiền (bàn phím số mở) → gõ `12.34`.
- **Thực tế:** "£12.34" chỉ còn chữ ~6px ở góc trái vùng số tiền; caret vẫn cao ~110px. Ở `font_scale` 1.0 cùng máy: bình thường.
- **Bằng chứng:** `qa-runs/modern/m4/xl-f2-typed.png`, `xl-f2-typed-amount-crop.png`; đối chứng `xl-f1.0-typed.png`.
- **Nguyên nhân:** như B-57 (`src/app/capture.tsx:509` `middle flex:1` bị ép khi bàn phím mở). **Lưu ý cho bản sửa B-57:** điều kiện "màn cao
  < 720dp" sẽ **không** bắt được ca này (997dp nhưng chữ 200% làm các hàng khác cao gấp đôi). Nên dựa trên chiều cao đo được của vùng số
  tiền (onLayout) hoặc tính cả `fontScale`, và `minHeight` cho `middle` là đủ cho cả hai.
- **Ca thứ 3 (chữ 1.0):** Fold màn mở **xoay ngang** (Android 16+ bỏ qua `screenOrientation="portrait"` trên màn ≥ 600dp: logcat
  `Ignoring manifest-declared fixed orientation SCREEN_ORIENTATION_PORTRAIT … since target sdk 36`) → cao 852dp, bàn phím chiếm nửa →
  "$0.75" còn ~5px. Bằng chứng `qa-runs/modern/m4/fold-land-capture.png`, `fold-land-capture-top.png`.

### MOD-3 🟡 Android giết tiến trình app khi đang ở bộ chọn file/camera → quay lại mất luồng đang làm (về Home)
- **Máy:** Fold API 37, P039. Quyền vị trí đang là "Only this time" (từ MOD-1).
- **Bước:** Settings → Backup & restore → Restore from backup → ở bộ chọn file > 60 s → chọn `P098.sundaysort`.
- **Thực tế:** logcat `Killing 2081:com.phiotron.sundaysort (adj 900): one-time permission revoked` → chọn file xong app khởi động lại ở Home,
  không có màn xem trước khôi phục; người dùng phải làm lại từ đầu, không có lời giải thích. (`qa-runs/modern/m4/fold-logcat-onetime-kill.txt`)
- **Ý nghĩa:** cùng cơ chế với máy ít RAM giết app nền khi đang mở camera chụp hoá đơn / bộ chọn ảnh / bảng chia sẻ xuất file.
  App RN không lưu trạng thái điều hướng nên mất màn đang dở (số tiền đang gõ, ảnh vừa chụp).
- **Nguyên nhân gốc nghi ngờ:** hệ thống (quyền một lần hết hạn 60 s khi app ở nền) + app không khôi phục trạng thái sau khi bị giết.
  `src/app/backup.tsx:161` `DocumentPicker.getDocumentAsync` — kết quả trả về cho Activity mới không được nhận. Gợi ý nhẹ: lưu nháp màn
  nhập khoản (số tiền + ảnh) vào DB/MMKV và mở lại khi khởi động; với khôi phục chỉ cần chấp nhận. Mức 🟡 vì hiếm.

### MOD-4 🟡 Màn rộng (Fold mở 852dp, chia đôi màn hình) dùng nguyên bố cục điện thoại kéo giãn
- `qa-runs/modern/m4/fold-open-montage.png`, `fold-land-montage.png`, `fold-mw-montage.png`. Nút Expense/Income, Save, thẻ Sort rộng
  ~2000px; thẻ Sort có khoảng trống lớn. Không vỡ, không che chữ — chỉ là trải nghiệm tablet kém. Chia đôi dọc (423dp) và ngang (436dp
  cao) đều dùng được. Gợi ý: `maxWidth` ~600dp căn giữa cho nội dung chính khi `width ≥ 600`.

### MOD-6 🟡 Chi tiết khoản (S-04) ở chữ 1.3–2.0: nhãn "Category" gãy giữa từ, "Add photo" tràn khung, "Expense" tràn viên thuốc
- **Máy/persona:** Fold mở P037 (UK, chữ 2.0) `qa-runs/modern/P037/15-entry-detail.png` → "Catego|ry", chữ "Add photo" tràn ra ngoài
  khung đứt nét, "Expense" to hơn viên thuốc Expense/Income. XL P002 (chữ 1.3, tối) `qa-runs/modern/P002/15-entry-detail.png`: "Add photo"
  đã chạm/tràn khung. Ghép: `qa-runs/modern/m4/P037-tour.png`, `P002-tour.png`.
- **Nguyên nhân:** `src/app/entry/[id].tsx:503` nhãn hàng `width: 96` cố định (chữ 200% không vừa "Category"); `:535` `addPhoto` 72×72 cố
  định với chữ `fontSize 12` không giới hạn `maxFontSizeMultiplier` (`:372`). Gợi ý: nhãn `minWidth` + `flexShrink: 0` hoặc xếp nhãn lên
  trên khi `fontScale ≥ 1.6`; khung ảnh `minWidth/minHeight` thay cho kích thước cố định hoặc `maxFontSizeMultiplier={1.3}` cho chữ trong khung.

### MOD-8 🟡 Home: "2037 entries to sort" không có dấu phẩy nghìn, nơi khác lại có ("5,006 entries", "2,011 entries")
- P098 Fold (`qa-runs/modern/P098/08-home.png`); màn khôi phục/hộp đổi vùng dùng `formatCount`. Nguyên nhân: `src/app/(tabs)/index.tsx:115`
  truyền `count: data.unsorted` thô vào `t('home.toSort')`. Sửa: `formatCount(data.unsorted)` (như `src/app/backup.tsx:34`).

### MOD-5 🟡 Nhỏ, ghi lại cho đủ
- Danh sách Entries: tiêu đề ngày của **năm trước** không ghi năm — "MON 17 NOV" (2025) nằm ngay dưới "TODAY" (Tue 17 Nov 2026)
  (`qa-runs/modern/m4/fold-p083-search-hyperlink.png`). Gợi ý: thêm năm khi khác năm hiện tại.
- Hộp "Discard this entry?" khi đã gắn 2 ảnh vẫn ghi "$0.00 expense won't be saved." — không nhắc ảnh sẽ mất (`fold-photo-*.png`).
- Thư viện ảnh (Photo Picker) chỉ mở được bằng **giữ lâu** nút Photo (`capture.tsx:409`) — khó phát hiện. Photo Picker chạy đúng, không
  xin quyền ảnh; bỏ khoản thì bộ đếm "20 of 20 free photos" trả lại đúng.
- `android:enableOnBackInvokedCallback="false"` (manifest) → không có hiệu ứng back dự đoán của Android 16; back cử chỉ vẫn đúng.
- Màn nhập khoản: caret nhấp nháy làm `uiautomator dump` báo "could not get idle state" (chỉ ảnh hưởng công cụ test, không phải người dùng).

## 3. Persona (runner `qa/tools/run_persona.py` của phiên A, dùng nguyên bản; `--out modern`)

Hồ sơ máy: `--profile-override pixel9proxl` / `pixel_fold_open` (tên lạ → runner không đổi `wm size/density`, chỉ áp chữ/tối/múi giờ/mạng
của persona). Fold chạy qua lớp bọc `run_fold.py` (scratchpad) chỉ cắt dòng "[Warning] Multiple displays" khỏi `screencap` — không đổi logic.
Kết quả: `qa-runs/modern/<id>/result.json`. Lượt hỏng vì máy chủ cạn bộ nhớ (13:30, adb/emu treo) để riêng ở `qa-runs/modern/_infra/` và
đã chạy lại — không tính.

| Persona | Máy | Vùng · hành vi · chữ · nền · mạng | Kết quả | Ghi chú (đã xem ảnh/kiểm tay) |
|---|---|---|---|---|
| P002 | XL | US · quick_capture_only · 1.3 · tối · slow_3g | ✅ 10/10 | |
| P008 | XL | US · weekly_sorter · 2.0 · tối · airplane | ❌ restore, verify | Runner: bộ chọn file không mở sau lần bấm. **Làm tay cùng điều kiện (chữ 2.0, tối, máy bay) → bộ chọn mở bình thường** (`m4/xl-p008-picker.png`). Không tái hiện → ⏭, nghi runner bấm lúc màn đang chuyển |
| P015 | XL | UK · never_sorts · 1.3 · sáng · drops_midway | ❌ journey | Runner giả định tuần này trống; dữ liệu mẫu đã có 1 khoản thu tuần này (`expected.weekIn=4217`) → "0 of 4" là **đúng** |
| P019 | XL | UK · split_merge_heavy · 1.3 · 2000 khoản · airplane | ✅ 10/10 | |
| P025 | XL | UK · gps_trips · 2.0 · edge_delay | ✅ 10/10 | chuyến 1.9 mi. (Lượt 1 ra 0.0 mi lúc máy chủ quá tải, lệnh `emu geo fix` treo → bỏ) |
| P029 | XL | UK · manual_miles_odometer · 2.0 · tối | ❌ journey | App hiện đúng "= 128 mi" (`P029/21-odometer.png`); runner đọc nhầm nút "A → B · PRO" |
| P031 | XL | UK · year_end_export · 1.3 · 2000 khoản | ❌ journey | App hỏi "442 entries aren't sorted → Export anyway / Sort first" (đúng thiết kế); runner không bấm "Export anyway". Luồng xuất đã kiểm tay ✅ trên Fold (5.006 khoản) |
| P044 | XL | US · pro_trial · 1.3 · tối · airplane · 2000 khoản | ✅ 10/10 | |
| P050 | XL | US · wipe_all · 2.0 · tối | ❌ verify | File mẫu P050 có 0 khoản (personas.json ghi 30) → runner bỏ khôi phục nhưng vẫn tìm "Income" ở Reports trống. App đúng ("No data for this period") |
| P054 | XL | US · region_switch · 2.0 · dữ liệu UK 2011 khoản | ❌ journey | Runner bấm "Change" khi ô tỷ giá trống (bàn phím không tự hiện) → app báo "Enter a rate like 1.27" (đúng). **Làm tay: gõ 1.27 → Change → US/USD/Jan–Dec, £81.43 → $103.42 ✅** (`m4/xl-region-*.png`) |
| P037 | Fold mở | UK · backup_restore_other_phone · 2.0 · 2000 khoản | ✅ 10/10 | |
| P056 | Fold mở | US · double_tap_save · 1.3 · tối · edge_delay | ❌ journey | **Lỗi app thật → MOD-7** (chạm đúp lưu 2 khoản) |
| P062 | Fold mở | US · kill_mid_save · 2.0 · tối | ✅ 10/10 | force-stop ngay sau Save: khoản vẫn còn |
| P066 | Fold mở | US · revoke_permissions · 2.0 · slow_3g | ✅ 10/10 | thu hồi quyền giữa chuyến → Home báo "Your trip stopped recording … Saved 0.3 mi" |
| P073 | Fold mở | UK · low_storage · 1.3 | ✅ 10/10 | /data còn 30 MB: nhập khoản + sao lưu vẫn chạy |
| P077 | Fold mở | UK · clock_tax_boundary · 1.3 · tối | ✅ 10/10 | 5/4/2027 23:58 → 6/4: tiêu đề 2026/27 → 2027/28 |
| P083 | Fold mở | UK · weird_text · 2.0 · tối · airplane | ❌ journey | Runner kẹt ở nút Save (tìm theo màu). **Làm tay cùng điều kiện: lưu £4.44 ✅, ghi chú `=HYPERLINK("http://x.example","click") 100% \ back` lưu và hiện nguyên văn ✅, tìm "100%" ra đúng 4 dòng (không khớp tất cả) ✅** (`m4/fold-p083-*.png`) |
| P087 | Fold mở | UK · app_lock · 2.0 | ✅ 9 + ⏭ 1 | app_lock ⏭: cần khoá màn hình + vân tay trên máy ảo (cài đặt bảo mật — không tự đặt) |
| P091 | Fold mở | UK · recurring_rules · 2.0 · slow_3g | ✅ 10/10 | người dùng free thấy cổng Pro đúng |
| P098 | Fold mở | US · large_history · 1.3 · tối · 5.006 khoản | ❌ verify (1 dòng) | Home "2037 entries to sort" không có dấu phẩy nghìn (runner mong "2,037") → **MOD-8 🟡**. Các số khác khớp; Entries 6,6 s, tìm 8,0 s, Reports 6,9 s (gồm thời gian dump adb) |

**Tổng:** 20 persona có `result.json` thật (10 XL + 10 Fold). Lỗi app thật từ persona: MOD-7 🟠, MOD-8 🟡. Các ❌ còn lại đều đã kiểm tay
và là lỗi runner (đã gửi danh sách cho phiên A) hoặc không tái hiện (P008). ⏭: P087 app_lock (cần khoá màn hình hệ thống).

## 4. Điểm riêng máy đời mới (mục 4 kế hoạch)

| Kiểm | Máy | Kết quả |
|---|---|---|
| Gập ↔ mở **giữa lúc nhập khoản** (gõ £45.67 → gập → mở → gập → mở → Save) | Fold | ✅ số giữ nguyên qua 4 lần đổi, lưu đúng 1 khoản (Net −437.73 → −483.40). `m4/fold-type-*.png` |
| Gập ↔ mở **giữa lúc Sort** (sort 1 thẻ khi mở, 1 khi gập, 1 khi mở lại) | Fold | ✅ 5→6→7 of 9 liên tục, không mất/lặp thẻ. `m4/fold-sort-seq.png` |
| Gập ↔ mở **giữa chuyến GPS** (Precise) | Fold | ✅ 0.7 → 1.4 (gập) → 1.9 mi (mở), lưu 1.9 mi ≈ 3.0 km thật. `m4/fold-trip-precise-seq.png` |
| Quyền vị trí kiểu mới: Approximate + Only this time | Fold | ❌ MOD-1 |
| Quyền thông báo (POST_NOTIFICATIONS) hỏi lúc bắt đầu chuyến | Fold | ✅ hỏi đúng lúc, sau bước vị trí |
| Back trên màn nhập (cử chỉ) | XL | ✅ back 1 ẩn bàn phím, back 2 hỏi "Discard this entry?" |
| Edge-to-edge + thanh cử chỉ + lỗ camera, 5 tab | XL | ✅ thanh tab nằm trên vạch cử chỉ, tiêu đề dưới thanh trạng thái. `m4/xl-tabs-montage.png` |
| Chữ 200% + tối, 5 tab + màn nhập | XL | ⚠ MOD-2; còn lại xem mục lỗi 🟡 |
| Bố cục màn mở (852dp rộng) | Fold | ⚠ MOD-4 |
| Gập giữa lúc **khôi phục** 5.006 khoản (P098) | Fold | ✅ vòng quay tiếp tục, khôi phục xong, dữ liệu US vào đủ. `m4/fold-restore-seq.png` |
| Gập/mở giữa lúc **xuất CSV** (hỏi "347 entries aren't sorted" → Export anyway → bảng chia sẻ) | Fold | ✅ hộp hỏi và bảng chia sẻ `SundaySort-entries-2026.csv` còn nguyên qua gập/mở |
| Xoay ngang màn mở (portrait bị Android 16 bỏ qua) | Fold | ✅ 4 tab dùng được; ❌ màn nhập → MOD-2 ca 3 |
| Chia đôi màn hình (`--windowingMode 6` + `am task resize`: 423dp rộng / 436dp cao) | Fold | ✅ Home, nhập khoản (£12.34 rõ), Sort dùng được. `m4/fold-mw-montage.png` |
| Back cử chỉ từ cạnh (Backup → Settings → Home → thoát) | Fold | ✅ (không có back dự đoán — MOD-5) |
| Quyền camera "Only this time" → chụp bằng app camera hệ thống → gắn ảnh | Fold | ✅ "1 of 3" |
| Photo Picker mới (giữ lâu Photo) → chọn 1 ảnh | Fold | ✅ không xin quyền, "2 of 3" |
| Quyền một lần hết hạn khi app ở nền | Fold | ⚠ MOD-3 |
| Máy 16 KB | ps16k | ✅ mục 1 |
