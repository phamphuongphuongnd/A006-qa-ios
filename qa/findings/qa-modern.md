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

### MOD-5 🟡 Nhỏ, ghi lại cho đủ
- Hộp "Discard this entry?" khi đã gắn 2 ảnh vẫn ghi "$0.00 expense won't be saved." — không nhắc ảnh sẽ mất (`fold-photo-*.png`).
- Thư viện ảnh (Photo Picker) chỉ mở được bằng **giữ lâu** nút Photo (`capture.tsx:409`) — khó phát hiện. Photo Picker chạy đúng, không
  xin quyền ảnh; bỏ khoản thì bộ đếm "20 of 20 free photos" trả lại đúng.
- `android:enableOnBackInvokedCallback="false"` (manifest) → không có hiệu ứng back dự đoán của Android 16; back cử chỉ vẫn đúng.
- Màn nhập khoản: caret nhấp nháy làm `uiautomator dump` báo "could not get idle state" (chỉ ảnh hưởng công cụ test, không phải người dùng).

## 3. Điểm riêng máy đời mới (mục 4 kế hoạch)

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
