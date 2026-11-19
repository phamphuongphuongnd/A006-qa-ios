# QA-100 · phiên C · iOS (GitHub Actions macOS, Simulator)

> Chỉ ghi điều đã thấy thật trong artifact (ảnh / log / result.json). Chưa chạy được → ⏭ + lý do.
> Mức: 🔴 chặn / mất dữ liệu / crash · 🟠 sai chức năng hoặc bố cục hỏng · 🟡 lỗi nhỏ, thẩm mỹ.

## Cách chạy
- Workflow `.github/workflows/qa-ios.yml` (nhánh `qa-ios`): build Release cho Simulator (không ký) → Maestro
  `qa/maestro` cho từng persona có trường `ios` (27 persona: 14 iPhone nhỏ, 13 Pro Max) + 2 lượt iPad (chế độ tương thích,
  app `supportsTablet: false`). Bằng chứng: artifact `qa-ios-<run>` → tải về `qa-runs/ios/<run>/` (gitignore).

## Lượt chạy
| lượt | run | commit | persona có kết quả | phút macOS | ghi chú |
|---|---|---|---|---|---|
| 1 | 44017774856 | 4e8a150 (= dev dc6d0a6 + QA) | 10/29 (đều kẹt onboarding) | 78 | Build Release simulator 7 phút OK, app chạy trên iPhone SE (3rd gen) + iPhone 16 Pro Max, 0 crash. **Lỗi kịch bản** (không phải app): tap đúng chữ "United Kingdom" nhưng nhãn trợ năng của thẻ là "United Kingdom. £ · Tax year…" → mọi bước sau ❌; 17 persona + 2 iPad ⏭ hết ngân sách 55 phút. |
| 2 | 44220110475 | a92c60b (+ merge dev 189106e) | 0 | 5 | ❌ hạ tầng: `pod install` tải Hermes từ repo.reactnative.dev bị "Connection reset by peer" → thêm thử lại 3 lần |
| 3 | 44221266865 | 9c99362 (dev 189106e + QA) | 14/27 (+0/2 iPad) | 71 | iOS 26.5, iPhone SE (3rd gen) + iPhone 16 Pro Max. **0 crash.** 13 persona + 2 iPad ⏭ hết ngân sách 50 phút. Kết quả theo bước bên dưới. |
| 4 | 44236852419 | dev 4853823 + QA | 0 | 14 | Huỷ chủ động: dev có thêm B-100/B-101 (322acd6) sau khi merge |
| 4b | 44238847151 | dev 322acd6 + QA (+ bước 15_auto_trips) | 0 | 0 | ❌ GitHub không khởi chạy job: "recent account payments have failed or your spending limit needs to be increased" (Billing & plans) |

| 4c | 44241312809 (repo công khai `A006-qa-ios`) | e25dc9a (dev 322acd6 + QA) | 17/29 có chạy, **0 bước ✅ ngoài onboarding** | 0 (repo công khai, miễn phí; job 136 phút) | ❌ **hạ tầng**: runner chậm gấp 3–4 lần (build 18 phút thay vì 7, khởi động simulator 14 phút). 9 persona `IOSDriverTimeoutException` (XCTest driver không sẵn sàng sau 240 s); P001/P076 `DeviceUnreachableException`; 5 persona qua onboarding (2–6 phút/persona) rồi hết hạn 600 s. 10 persona + 2 iPad ⏭ hết ngân sách. 0 crash. → tăng driver 480 s, 25 phút/persona |
| 4d | 44258898134 (công khai) | 94de76a (dev 322acd6) | 4/4 (P016 7 bước ✅, P041 6 bước ✅ trước khi hết 25 phút, P031 ❌ do hộp hệ thống còn treo, P052 ⏭ DeviceUnreachable) | 0 | Tuần tự. **0 crash.** Thấy **QI-4 🟠**. Bước 15: hộp "Open in “Sunday Sort”?" hiện chậm, app ở Home → B-95 ⏭; hộp đó treo sang P031 → sửa kịch bản (febb184) |
| 4e | 44264516648 (công khai) | 67fd42b (dev f424978) | 1/4 (P052: 11/16 bước ✅) | 0 | P091, P016, P041 ⏭ `IOSDriverTimeoutException` (driver XCTest không lên sau 480 s). P052: **B-101 ✅**, **B-100 v2 ✅** (viên "More below ⌄" thấy rõ). ❌ 02 (khôi phục), 06 (chạm tab Sort vẫn ở Home), 08/09 (kịch bản cũ, đã sửa ở 730b76a), 15 (kịch bản cũ). 0 crash |
| 4g | 44274943533 (công khai) | e5f0714 (dev 4e4b030: B-117, B-118, B-114 v2, B-100 v3) | 3/4 (P052 13/17 ✅, P091 10/17 ✅, P016 6 bước ✅ rồi DeviceUnreachable từ bước 08; P041 ⏭ driver không lên) | 0 | **B-117 ✅, B-95 ✅, B-100 v3 ✅, B-114 v2 ✅ (thẻ cuộn được)**. ❌ còn lại: 02 khôi phục, 06/16 ở chữ lớn (kịch bản chưa cuộn — đã sửa), 09 bảng chia sẻ, 12 P091. 0 crash |
| 4h | 44441656898 (công khai) | 64e5203 (cùng app 4g) | 0/2 | 0 | Lượt ngắn kiểm kịch bản 06/16 đã sửa (P091 SE AX-L, P041 Pro Max tối): **cả 2 ⏭ `IOSDriverTimeoutException`** (driver XCTest không lên sau 480 s) — chưa kiểm được. Driver không lên ở 15/31 lần khởi động persona qua các lượt 4c–4h (4c 9, 4e 3, 4g 1, 4h 2) trên runner công khai |
| 4i | 44450726271 (công khai) | b6aa4d1 (dev 0bf4283: B-123…B-126) | **3/3, 0 lỗi driver** (P091 14/17 ✅, P052 13/17, P041 12/17) | 0 | **1 simulator mỗi lúc** + tự khởi động lại khi driver không lên (không cần dùng tới) — mỗi persona 10–12 phút thay vì 25+. **B-114 v2 ✅** (P091 SE AX-L phân loại được ngay trên thẻ Sort), **B-117 ✅ ở AX-L** (P091 cuộn tới Save, lưu được; P041 Pro Max tối ✅), B-95 ✅ cả 3. ❌ còn lại đều kịch bản: 02 nút "Restore from backup" dưới thẻ "Back up every night" (đã thêm cuộn), 06 P052/P041 chạm tab Sort vẫn ở Home, 08 P052/P041 bàn phím số không đóng → chữ Purpose rơi vào ô End reading (app báo "Enter a number" đúng), 09 P041 nút Export nằm sát mép (đã cho thấy 50 %). 0 crash |
| 4j | 44455496596 (công khai) | b9e8dd6 (dev 0bf4283 + bước 17) | 2/2 (P022 15/18 ✅, P092 14/18) | 0 | Bước 17 chuyến GPS (nháp phiên H): **P022 ✅ 2.5 mi**, **P092 ❌ 1.4 mi — mất đoạn chạy nền → QI-5**. 1 simulator, 0 lỗi driver, 0 crash. 02/08 ❌ kịch bản (02 nay tới được bước chọn file) |
| 4k | 44462217035 (công khai) | da3f127 (dev 1770c49: B-96 v2 833c872, B-123…B-135) | B-96 (P022, iPhone SE) | 0 | **B-96 ✅** cả 2 biến thể: đúng 1 thông báo "Trip ended at HH:MM · 0.0 mi"; bấm Continue trip ⏭ (Maestro không mở được nút hành động trên màn khoá simulator) |
| 4l | 44462331611, 44463898975 (công khai) | cee0c20, c284d4c | P022, P092 ×2 | 0 | `17_gps_trip` speed 10: ✅ 3/3 (2.5 mi) → QI-5 đóng. Kiểm mạng bản đồ từ runner: 200 → QI-6 do code (hẹn giờ 12 s) |
| 4m | 44471864915 (công khai) | f974a7c (dev c9bb293: B-137) | P092 + kịch bản B-137 | 0 | **B-137 ✅** (bản đồ MapLibre hiện ở 30 s và 60 s dù điểm GPS đầu tiên về ở +21 s). P092 bộ chính 12/18 ✅; 15/16/17/99 ❌ do hộp "Open in “Sunday Sort”?" của deep link hiện sau 20 s che các bước sau — đã sửa `common/home.yaml` |
| 4n | 44478021185 (công khai) | f974a7c (dev c9bb293) | P016 14/18 ✅, P031 12/18 ✅ (iPhone SE, chữ lớn) | 0 | **B-66 ✅**. ❌ còn lại đều kịch bản: 02 bấm tên file chưa chọn được file (trình chọn file hiện đúng "P031.sundaysort"), 05 nút "Save changes" mờ (chưa sửa gì — đúng) không được tính là thấy, 06 "Sort.*" trúng "Sort now" ngoài màn → đã đổi sang chạm tab, 08/09 như cũ. 0 crash |
| 4o | 44481342409 (công khai, #14) | 97e2c45 (dev c9bb293) | 5/7 (P001 15/16 ✅, P007 12/16, P011 14/16, P017 14/16, P037 14/16; P026, P032 ⏭ hết ngân sách 100 phút) | 0 | 1 simulator, 0 lỗi driver, **0 crash**. 03–07, 10, 11, 15, 16, 17 (2.x mi), 99 ✅ cả 5. ❌ đều kịch bản: 02 (4/5, chưa chọn được file), 08 (4/5, bàn phím số), 09 P007 (bấm nút Export nằm dưới mép tấm → không mở bảng chia sẻ), 09 P037 AX-L (cuộn hết thời gian trước khi tới nút Export). Thấy **QI-7 🟡** |
| 4p | 44481352656 (công khai, #15) | 97e2c45 (dev c9bb293) | 5/7 (P056 14/16 ✅, P067 14/16, P061 14/17, P046 11/17, P047 11/17; P062, P071 ⏭ hết ngân sách) | 0 | 1 simulator, 0 lỗi driver, **0 crash**. P056 XXXL và P061 bước 13 (tắt app giữa lúc lưu) ✅. ❌ đều kịch bản: 02, 08 như 4o; 09 P061 như P007; P046/P047 15/16/17 ❌ vì bước 14 xoá hết dữ liệu (đúng: app về màn chào "Get started") mà 15–17 chạy sau và chờ "Settings" — kịch bản cần chạy lại onboarding sau bước 14 |
| 4q | 44481363012 (công khai, #16) | 97e2c45 (dev c9bb293) | 5/7 (P076, P077, P082, P086, P097 đều 16/18 ✅; P002-ipad, P041-ipad ⏭ hết ngân sách 100 phút) | 0 | 1 simulator, 0 lỗi driver, **0 crash**. P077 Pro Max tối XXXL ✅ mọi bước trừ 02/08. ❌ chỉ còn 02 (khôi phục: chưa chọn được file / P076 không thấy tên file) và 08 (bàn phím số) — cả hai kịch bản, giống 4o/4p. iPad chưa chạy được ở lượt nào |
| 4f | 44274384593 (công khai) | febb184 | 0 | 0 | ❌ GitHub không khởi chạy job (lỗi thanh toán tài khoản) — cả repo công khai |

Tổng phút macOS tính tiền (repo riêng): **168** (78 + 5 + 71 + 14). Từ lượt 4c chạy trên repo công khai `phamphuongphuongnd/A006-qa-ios` (Phương chọn; không tính phút) — **xoá repo này sau QA-100 khi Phương đồng ý**.

### Thấy được trong lượt 4c (dù hạ tầng lỗi)
- **B-90** ✅ (một phần): P077 (Pro Max, tối, `extra-extra-extra-large`) màn "Free forever. Pro when you want it." — nút vàng "Continue free" chữ tối đọc rõ, "See Pro" chữ vàng trên nền tối. P092 (tối) qua onboarding. Các nút `sun` khác (Sort first, End trip, Back up now…) chưa tới. Ảnh `qa-runs/ios/44241312809/art/personas/P077/shots/P077_01e_free_pro.jpg`.
- **B-66 / B-100** (P091, iPhone SE, `accessibility-large`, UK): tiêu đề màn chào nay hiện đủ "Log it in 10 seconds. Sort it on Sunday." (lượt 1 bị cắt); đoạn mô tả vẫn bị cắt ở "mileage log for self-" sát chấm trang; màn chọn vùng thẻ UK cắt ở "Self…", thẻ US vẫn khuất. **Không thấy thanh cuộn trong ảnh** — bản sửa B-100 chỉ *nháy* thanh cuộn ~1 s (`ui/HintScroll.tsx`, `flashScrollIndicators` sau 400 ms; `persistentScrollbar` chỉ có tác dụng trên Android), ảnh chụp sau khi màn đứng yên nên không bắt được → ⏭ cần mắt người trên máy thật/simulator. Ảnh `…/P091/shots/P091_01a_welcome.jpg`, `P091_01b_region.jpg`.
- Khôi phục (02): đã tìm được thư mục File Provider bằng metadata (cả 2 máy) và đặt file; trình chọn file mở nhưng **trắng trơn** (`P067_02c_picker_files.jpg`) trên runner chậm → chưa kết luận.


### Kết quả lượt 3 theo bước (14 persona)
| bước | ✅ | ❌ | ghi chú |
|---|---|---|---|
| 01 onboarding (UK/US, Continue free) | 13 | 1 | P016 (SE + AX-Large): thẻ "United States" nằm dưới mép màn → kịch bản không cuộn (đã sửa); xem QI-1 |
| 02 khôi phục bản sao lưu persona | 0 | 0 | ⏭ không đặt được file vào Files: `simctl get_app_container … FileProvider.LocalStorage` không trả về trên iOS 26.5 (đã thêm cách tìm khác) |
| 03 đi 5 tab + Settings/Backup/Categories/Export/Mileage rates | 12 | 2 | P016 kẹt onboarding; P037 (SE + AX-Large) cuộn 20 s chưa tới "Export" trong Settings (tăng 40 s) |
| 04 nhập nhanh 1 khoản | 12 | 2 | P052: **QI-3** (chữ trong ghi chú bị đảo); P016 kẹt onboarding |
| 05 chi tiết khoản + menu More | 12 | 2 | P052 hệ quả QI-3 |
| 06 phân loại 1 khoản ở Sort | 0 | 14 | **lỗi kịch bản**: phân loại THÀNH CÔNG (ảnh "Week sorted ✓"), kịch bản chờ snack "Sorted as…" — đã sửa |
| 07 tách khoản | 0 | 14 | **lỗi kịch bản**: màn Split hiện đúng (2 phần chia đều, "Left to assign $0.00"), nhãn gộp "Left to assign…" — đã sửa |
| 08 chuyến nhập tay (odometer) | 1 | 13 | **lỗi kịch bản**: bàn phím số che ô Purpose, cú tap rơi vào phím "2" → chữ vào ô End reading; app báo "Enter a number" đúng — đã thêm hideKeyboard |
| 09 xuất CSV → bảng chia sẻ → "Not sent" | 3 | 11 | US ✅ (bảng chia sẻ mở, hỏi "Did you send or save the files?"). UK: nút "Export 1 file" dưới các dòng MTD, kịch bản assert trước khi cuộn — đã sửa |
| 10 ghi chú chữ lạ (é ☕ 日本語 العربية 👨‍👩‍👧 'q', x) | 13 | 1 | lưu và hiện trong danh sách đúng |
| 11 bấm Save 2 lần nhanh | 13 | 1 | chỉ 1 khoản được tạo ✅ |
| 12 đổi vùng US→UK (P052) | 1 | 0 | |
| 13 tắt app ngay sau Save (P061, P062) | 2 | 0 | không nhân đôi, app mở lại bình thường |
| 14 xoá hết dữ liệu (P046, P047) | 0 | 2 | **lỗi kịch bản**: xoá thành công, app về màn chào (ảnh 14c) — kịch bản chờ Home; đã sửa |

## Lỗi tìm thấy

### QI-1 🟡 Màn chào bị cắt chữ trên iPhone SE khi chữ cỡ lớn
- Persona/thiết bị: P016 (iPhone SE 3rd gen, Dynamic Type `accessibility-large`, sáng, US), P031 (iPhone SE, `extra-extra-extra-large`, UK). Lượt 1.
- Bước: mở app lần đầu (màn Welcome).
- Kỳ vọng: đọc được trọn tiêu đề + đoạn mô tả, hoặc thấy rõ là cuộn được.
- Thực tế: P016 — tiêu đề "Log it in 10 seconds." bị cắt ngang dòng "seconds." ngay trên chấm trang, phần "Sort it on Sunday." và đoạn mô tả không thấy; P031 — đoạn mô tả chỉ còn dòng đầu. Không có gợi ý cuộn. Pro Max cùng cỡ chữ (P002) hiển thị đủ.
- Ảnh: `qa-runs/ios/44017774856/personas/P016/shots/P016_01a_welcome.jpg`, `…/P031/shots/P031_01a_welcome.jpg`.
- Nguyên nhân nghi ngờ: `src/app/onboarding/index.tsx:17-29` — nội dung trong `ScrollView` (cuộn được) nhưng vùng nút cố định bên dưới chiếm chỗ, không có fade/chỉ báo cuộn; tiêu đề `fontSize: 34` không giới hạn `maxFontSizeMultiplier`. Chưa kiểm thao tác cuộn (lượt sau).

### QI-2 🟡 Log lỗi JS mỗi lần mở app: expo-notifications
- Thấy trong `app.log` (mức E, `com.facebook.react.log:javascript`) mọi persona lượt 1: `[expo-notifications] Error reading persisted server registration info: … Calling the 'getRegistration…` (dòng bị cắt).
- Ảnh hưởng chưa rõ (app không crash, không có hộp lỗi). Nguyên nhân nghi ngờ: gọi API đăng ký push token khi app không dùng push từ server.

### QI-1 (bổ sung lượt 3) 🟡 Màn chọn vùng: thẻ thứ hai khuất hẳn khi chữ cỡ trợ năng
- P016 (iPhone SE, `accessibility-large`, máy en_US): màn "Where do you file your taxes?" chỉ thấy thẻ United Kingdom (cắt ở "Self…"), thẻ United States nằm hẳn dưới vùng nút, không có gợi ý cuộn. Nếu vùng mặc định theo máy là US, người dùng bấm Continue mà không thấy lựa chọn đang được chọn.
- Ảnh: `qa-runs/ios/44221266865/personas/P016/shots/step-008-tapOnElement-${REGION_LABEL}.jpg`. Nghi ngờ: `src/app/onboarding/region.tsx` — tiêu đề không giới hạn cỡ chữ, nút Continue cố định đáy.

### QI-3 🟡 Ghi chú bị đảo ký tự khi gõ nhanh (ô Note màn nhập nhanh)
- Persona/thiết bị: P052 (iPhone SE 3rd gen, `extra-extra-extra-large`, US, sáng). Lượt 3. 1/14 persona (13 persona khác cùng bước đúng).
- Bước: New expense → gõ số tiền → Note → gõ "QA-P052 Shell M62" (tốc độ gõ của XCTest) → Save.
- Kỳ vọng: ghi chú "QA-P052 Shell M62". Thực tế: ô hiện và lưu "QA-052 Shell M62P" — ký tự "P" thứ 4 bị dời xuống cuối.
- Ảnh: `qa-runs/ios/44221266865/personas/P052/shots/P052_04a_capture_filled.jpg` (ô Note), `P052_04c_in_entries.jpg` (danh sách "QA-052 Sh…").
- Nguyên nhân nghi ngờ: ô Note là TextInput có kiểm soát (`value={note}` + `onChangeText` gọi `setNote` và `setFromReceipt`) ở `src/app/capture.tsx` (khối `noteOpen`, ~dòng 365-380) — trên iOS, khi JS bận (vừa mở ô, cỡ chữ lớn) giá trị cũ ghi đè lên chữ vừa gõ → ký tự bị đảo/mất. Có thể chỉ xảy ra ở tốc độ gõ máy; cần thử tay trên iPhone thật. Hướng sửa thường dùng: bỏ `setFromReceipt` khi không cần, hoặc dùng `defaultValue` + ref.

### Kiểm bản sửa (lượt 4e, dev f424978)
- **B-101 ✅** P052 (SE, `extra-extra-extra-large`): ô Note hiện đúng "QA-P052 Shell M62" (`qa-runs/ios/44264516648/personas/P052/shots/P052_04a_capture_filled.jpg`), bước 04 assert "QA-P052" trong danh sách ✅ — lượt 3 cùng persona ra "QA-052 Shell M62P".
- **B-100 v2 ✅** P052: màn chọn vùng có viên "More below ⌄" ở đáy (`…/P052_01b_region.jpg`); 🟡 viên đè lên dòng mô tả thẻ United States ("$ · Calendar year · S…") — v3 (dev 1565783) đã dời sang góc phải, chờ 4g. Màn chào cùng cỡ chữ hiện đủ, không cần viên.

### Kiểm bản sửa (lượt 4g, dev 4e4b030)
- **B-117 ✅** (bước 16 mới) P052 (SE, `extra-extra-extra-large`, US): Start trip (qua màn quyền vị trí + hộp iOS) → "End trip" → bảng "Trip saved · 0.0 mi" hiện đủ (Work/Personal, Purpose, Parking & tolls, Save, Discard trip) → Save → snack "Trip saved · 0.0 mi", tab Miles bấm được, chuyến nằm trong danh sách; **màn không treo**. P091 (SE, `accessibility-large`, UK): bảng kết thúc hiện đúng (có gợi ý mục đích "QA trip P091" từ bước 08) nhưng nút Save dưới mép bảng → kịch bản không cuộn tới (đã sửa) — chưa bấm Save ở cỡ chữ này. Ảnh `qa-runs/ios/44274943533/personas/P052/shots/P052_16b_end_sheet.jpg`, `P052_16d_miles_after.jpg`, `…/P091/shots/step-020-tapOnElement-Save.jpg`.
- **B-95 ✅** P052, P091: mở "Automatic trips" hiện "This phone can't recognise driving. Use Start trip or an NFC tag.", không có "Working" (`…/P052/shots/P052_15a_auto_trips.jpg`).
- **B-100 v3 ✅** P091: viên "More below ⌄" ở góc phải đáy màn chọn vùng; 🟡 vẫn che một phần dòng mô tả thẻ UK ("Apr – 5 A…") nhưng đọc được ý (`…/P091/shots/P091_01b_region.jpg`).
- **B-114 v2 ✅ (một phần)** P016, P091 (SE, `accessibility-large`): thẻ Sort nay cao đủ, hiện "Expense · $0.81 · QA-P016 Shell…" và có thanh cuộn bên phải (lượt 4d chỉ còn "Expense" + nút bị cắt). Kịch bản chưa cuộn tới các nút danh mục nên **chưa xác nhận bấm được Fuel/More…** (đã thêm cuộn ở 06). Ảnh `…/P016/shots/P016_06a_sort.jpg`.
- B-90: lượt này P041 (tối) ⏭ — giữ kết quả lượt 4c/4d ✅.
- B-118 (câu quyền vị trí): màn quyền đã đi qua ở bước 16 (P052) nhưng không chụp riêng câu chữ → ⏭.

### Kiểm bản sửa (lượt 4i, dev 0bf4283)
- **B-114 v2 ✅** P091 (iPhone SE, `accessibility-large`, UK): bước 06 cuộn trong thẻ Sort tới nút danh mục và phân loại được (06 ✅). P052/P041 06 ❌ do chạm tab Sort không chuyển màn (ảnh `qa-runs/ios/44450726271/personas/P052/shots/step-017-tapOnElement-FuelDelivery_income.jpg` vẫn là Home) — chưa rõ do kịch bản hay do bấm tab; lượt 4g cùng cảnh này ở P052 — theo dõi.
- **B-117 ✅ cả ở chữ lớn**: P091 (SE, AX-L) cuộn tới Save trong bảng kết thúc chuyến và lưu được; P041 (Pro Max, tối, AX-L) và P052 ✅.
- **B-95 ✅** cả 3 persona. **B-101 ✅** (04 ✅ cả 3, ghi chú QA-P0xx đúng).
- **B-126** (ô số): bàn phím ô End reading nay có dấu "." (decimal-pad) — hiện đúng; số tiền Ghi nhanh ra "$45.00" khi gõ "45" (trước là $0.45) — đổi hành vi theo B-126.

### QI-5 ✅ không phải lỗi app (kịch bản) — Chuyến GPS P092 thiếu đoạn 2
- **Đóng 19/11:** `speed: 10` — `17_gps_trip` ✅ 3/3: P092 run 44462331611 và 44463898975 (cả hai "Trip saved · 2.5 mi", đoạn nền ghi đủ), P022 run 44462331611 ✅.
- **Kết luận (phiên H, theo `commands.json` của run 44455496596):** Maestro `travel speed: 20` trên simulator CI không giữ tốc độ — P092 đoạn 2 chạy 1,98 km trong 33 s ≈ **60 m/s**, vượt bộ lọc GPS nhảy `MAX_SPEED_MPS = 56` ở `src/domain/mileage.ts` (`walkTrack`) → app bỏ đúng các điểm đó. P022 ~30 m/s → đủ 2.5 mi. Đoạn chạy nền đã được P022 xác nhận ghi được. Sửa kịch bản: `speed: 10`; chạy lại P092 (run ghi bên dưới).
- Mô tả gốc (giữ để đối chiếu):
- Persona/thiết bị: P092 (iPhone 16 Pro Max, tối, `large`, US). Lượt 4j, bước `17_gps_trip`. Đối chứng P022 (iPhone SE, sáng, US) cùng lượt ✅.
- Bước: Start trip → Maestro `travel` ~2,1 km khi app mở → nút Home → `travel` thêm ~2 km khi app ở nền → mở lại app → End trip.
- Kỳ vọng: ~2.5 mi (P022: đoạn 1 = 1.3 mi, lưu ra **2.5 mi** ✅).
- Thực tế P092: mở lại app thấy **1.4 mi**, hình đường đi chỉ có đoạn 1 (lên rồi sang phải, giống hệt ảnh đoạn 1 của P022); lưu ra "Trip saved · 1.4 mi" → **đoạn ~2 km lúc app ở nền không được ghi**. (Ảnh 17a của P092 chụp ngay sau đoạn 1 còn hiện 0.5 mi — màn chậm cập nhật trên máy lớn.)
- Ảnh: `qa-runs/ios/44455496596/personas/P092/shots/P092_17a_leg1_foreground.jpg`, `P092_17b_back_from_background.jpg`, `P092_17c_end_sheet.jpg`; đối chứng `…/P022/shots/P022_17a_leg1_foreground.jpg`, `P022_17c_end_sheet.jpg`.
- Chưa kết luận: 1/2 lần, simulator; có thể do vị trí giả bị dồn khi máy runner bận, hoặc app không nhận cập nhật nền ở lần này. Cần chạy lặp (cùng P092) và thử iPhone thật. Nghi chỗ: tác vụ vị trí nền (`src/features/trips/backgroundTask.ts`, `allowsBackgroundLocationUpdates`/`pausesLocationUpdatesAutomatically` trong cấu hình expo-location).

### QI-6 → B-137 ✅ đã sửa (dev c9bb293) — Bản đồ chuyến không bao giờ hiện nếu GPS lần đầu về chậm hơn 12 s
- **Kiểm lại 19/11 (run 44471864915, P092 iPhone 16 Pro Max, tối):** xoá vị trí simulator → Start trip ("Finding GPS…", `qa-runs/ios/44471864915/b137/shots/P092_b137a_finding_gps.jpg`) → đặt vị trí ở **+21 s** → ảnh 30 s và 60 s (`P092_b137b_30s.jpg`, `P092_b137b_60s.jpg`): **bản đồ MapLibre thật** (đường phố Westminster, chấm vị trí, dòng "© OpenStreetMap · OpenFreeMap"), không còn hình vẽ dự phòng. Kịch bản báo ❌ chỉ vì nhãn trợ năng "Map of the trip" không lộ ra cho XCTest — đã đổi sang tìm dòng ghi nguồn bản đồ. (Ảnh "30 s" thực chụp ở ~+80 s vì Maestro khởi động chậm; điều kiện "điểm đầu tiên về sau 12 s" vẫn đúng.)
- **Cập nhật 19/11 (run 44463898975):** mạng runner tới bản đồ **bình thường** — `tiles.openfreemap.org/styles/liberty` HTTP 200 / 0,7 s, `/styles/dark` 200 / 0,2 s, `/planet` 200 (`qa-runs/ios/44463898975/net-tiles.txt`) → không phải lỗi mạng.
- **Nguyên nhân (đọc code):** `src/features/trips/map/TripMap.tsx:53-57` — hẹn giờ `LOAD_TIMEOUT_MS = 12_000` chạy **ngay khi component gắn vào**, cả khi chưa có điểm GPS nào; lúc đó dòng 74 (`!lines.bounds`) vẫn vẽ sketch và `MapView` **chưa hề được tạo**. Điểm GPS đầu tiên về sau 12 s → `state = 'failed'` → dòng 74 trả sketch **suốt chuyến**, bản đồ không bao giờ được thử tải. Ảnh 30 s (`…/P092/shots/P092_16a2_trip_running_30s.jpg`): vẫn "Finding GPS…", 0.0 mi. Ngoài đời GPS lạnh / trong hầm xe hay > 12 s → có thể gặp trên máy thật.
- Hướng sửa: chỉ bắt đầu đếm khi `MapView` thật sự được vẽ (`lines.bounds` có), ví dụ `if (state !== 'loading' || !lines.bounds) return;` với deps `[state, !!lines.bounds]`; hoặc cho thử lại khi có điểm mới. Chưa kiểm trên máy thật.
- Mô tả gốc:
- Persona/thiết bị: P022 (iPhone SE), P092 (iPhone 16 Pro Max). Lượt 4j, bước 17 (chuyến > 1 phút).
- Kỳ vọng: bản đồ MapLibre + OpenFreeMap (`src/features/trips/map/TripMap.tsx`, style `https://tiles.openfreemap.org/styles/liberty|dark`).
- Thực tế: luôn là hình vẽ dự phòng `RouteSketch` (lưới ô + đường đi) — tức bản đồ không báo "đã tải" trong `LOAD_TIMEOUT_MS = 12_000`. Ảnh `qa-runs/ios/44455496596/personas/P022/shots/P022_17a_leg1_foreground.jpg`, `…/P092/shots/P092_17b_back_from_background.jpg`.
- Chưa phân biệt được: mạng runner GitHub tới `tiles.openfreemap.org` chậm/chặn, hay MapLibre trên bản build iOS này lỗi; `app.log` hai persona này trống nên không thấy lỗi. Cần xem trên Appetize/iPhone thật, hoặc lượt sau thêm kiểm mạng từ simulator.

### Kiểm B-96 v2 (lượt 4k, run 44462217035, P022 iPhone SE, US / America/Los_Angeles)
- Thiết lập: Automatic trips → Merge stops **10 min** (không khoá Pro) → 1 điểm GPS cố định → Start trip → chờ "GPS good".
- **Biến thể K (tắt app, `stopApp`) ✅**: phút ~11 có **đúng 1** thông báo "**Trip ended at 21:29 · 0.0 mi**" — "You hadn't moved for a while, so the trip was saved. Still on your way? Tap Continue trip." (21:29 = lúc bắt đầu đứng yên; bắn ≈ 10 min + 90 s). Ảnh `qa-runs/ios/44462217035/b96/shots/P022_b96d_K13_notification_center.jpg`. **Continue trip ⏭**: giữ lâu thông báo trên màn khoá simulator không mở ra nút hành động (`P022_b96e_K13_expanded.jpg` giống ảnh trước) → chưa kiểm được "bấm Continue khi app đã tắt → chuyến ghi tiếp".
- **Biến thể H (về Home) ✅**: phút ~13 có **đúng 1** thông báo "Trip ended at 21:55 · 0.0 mi" (`P022_b96d_H13_notification_center.jpg`); mở app → màn chuyến "No trip running" (chuyến đã kết thúc) (`P022_b96f_H13_app_opened.jpg`). Chưa chụp được danh sách Miles (app mở vào màn chuyến, không có tab bar) → giờ kết thúc trong danh sách ⏭.
- Máy ngủ thật: ⏭ (simulator không có).

### Kiểm B-66 (lượt 4n, run 44478021185, dev c9bb293) ✅
- P016 (iPhone SE, `accessibility-large`, US): màn chào hiện đủ tiêu đề "Log it in 10 seconds. Sort it on Sunday."; đoạn mô tả bị cắt ở dòng 2 nhưng có viên "**More below ⌄**" ở đáy, không bị nút "Get started" che; hình minh hoạ thu nhỏ (~155 pt so với ~280 pt trên Pro Max cỡ chữ thường ≈ 55 %). Màn chọn vùng: thẻ US thấy sau khi cuộn, cũng có "More below". Ảnh `qa-runs/ios/44478021185/personas/P016/shots/P016_01a_welcome.jpg`, `P016_01b_region.jpg`; đối chiếu `qa-runs/ios/44455496596/personas/P092/shots/P092_01a_welcome.jpg`.
- P031 (iPhone SE, `extra-extra-extra-large`, UK): thấy **hết** tiêu đề + cả đoạn mô tả, không cần cuộn (`…/P031/shots/P031_01a_welcome.jpg`).

### QI-4 🟠 Thẻ ở màn Sort bị cắt mất phần chọn danh mục khi chữ cỡ trợ năng
- Persona/thiết bị: P041 (iPhone 16 Pro Max, `accessibility-large`, tối, UK), P016 (iPhone SE 3rd gen, `accessibility-large`, sáng, US). Lượt 4d.
- Bước: có 1 khoản chưa phân loại → tab Sort.
- Kỳ vọng: thẻ hiện số tiền, ghi chú, "MOST USED" (Fuel, Vehicle repairs…, More…), Work/Personal, rồi Edit/Split/Merge/Skip (như P002 cỡ chữ thường, lượt 3) — hoặc cuộn được tới chúng.
- Thực tế: P041 — thẻ chỉ còn "Expense · £0.56 · QA-P041 Shell M62 · ngày" rồi nhảy thẳng xuống hàng Edit/Split/Merge/Skip: **không có nút danh mục, không có Work/Personal** → không phân loại được ngay trên thẻ (phải vào Edit/List view). P016 (SE) — thẻ chỉ còn tiêu đề "Expense" và hàng nút bị cắt thành "E… S… Mer… S…", mất luôn số tiền và ghi chú. Kịch bản 06 ❌ ở cả hai ("Fuel|Delivery income" không có).
- Ảnh: `qa-runs/ios/44258898134/dl/qa-ios-2/personas/P041/shots/P041_06a_sort.jpg`, `…/P016/shots/P016_06a_sort.jpg`; đối chiếu `qa-runs/ios/44221266865/personas/P002/shots/P002_06a_sort.jpg`.
- Nguyên nhân nghi ngờ: `src/app/(tabs)/sort.tsx:155` `const short = windowHeight < 520` chỉ xét chiều cao cửa sổ, không xét `fontScale`; dòng 169 thẻ nằm trong `View { flex: 1 }` cố định theo phần màn còn lại → nội dung cao hơn bị cắt (không cuộn). Hướng sửa: tính `short` theo `windowHeight / fontScale` (như `onboarding/index.tsx` dùng `roomy`) hoặc cho thẻ tự cao + màn cuộn khi chữ lớn; xem lại `src/features/entries/SortEntryCard.tsx` phần ẩn khối khi thiếu chỗ.

### Ghi chú khác (không phải lỗi app)
- Số tiền gõ "5" thành "$0.05": nhập kiểu dồn từ phải (iOS number-pad không có dấu chấm) — đúng thiết kế theo điều phối.
- Log `container_create_or_lookup_app_group_path_by_app_group_identifier: client is not entitled`: bản build simulator **không ký** nên thiếu entitlement App Group → widget không nhận dữ liệu trong bản này; không phải lỗi app.
- Lượt 4d: 08 ❌ "Couldn't hide the keyboard" (Maestro không đóng được bàn phím số; số đọc odometer 48210→48238, Distance 28.0 hiện đúng) và 09 ❌ (nút "Export 1 file" có trong ảnh nhưng nhãn trợ năng có thêm biểu tượng) — **lỗi kịch bản**, đã sửa.
- Ô "End reading" (decimal-pad) nhận được chữ khi gõ bằng XCTest; app báo "Enter a number" → kiểm tra hợp lệ hoạt động.

## ⏭ Không kiểm được (lý do)
- Khôi phục dữ liệu persona (2000–8000 khoản) trên iOS: lượt 3 không đặt được file vào Files (xem bước 02). Chưa chạy lại.
- iPad (A16) 2 lượt + 13 persona (P001, P007, P011, P022, P026, P041, P067, P071, P076, P077, P086, P091, P092): hết ngân sách thời gian lượt 3.
- Widget màn hình chính: chưa tới lượt (chạy cuối làn iPhone nhỏ); bản không ký cũng không chia sẻ dữ liệu App Group.
- `app.log` làn Pro Max và một số persona chỉ có 1 dòng (`log show` trả rỗng khi 2 làn chạy song song) — bằng chứng log thiếu cho các persona đó.
- Mạng (slow_3g / airplane / drops_midway…): simulator dùng chung mạng của runner, app không có server; Network Link Conditioner cần giao diện.
- Múi giờ: đặt `launchctl setenv TZ` + `SIMCTL_CHILD_TZ` cho từng persona nhưng **chưa xác nhận** app nhận đúng (ghi `tz_applied: … (unverified)` trong result.json).
- Hành vi app_lock (Face ID), revoke_permissions, low_storage, gps_trips, pro_trial (không bấm Pro/dùng thử theo luật), clock_tax_boundary, recurring_rules: chưa có kịch bản iOS ở vòng này.

### QI-7 🟡 Chữ "MTDsorted" thiếu gạch nối (tấm Export)
- Persona/thiết bị: P007 (iPhone SE, sáng, UK), P037 (iPhone SE, AX-L, UK) — lượt 4o. Bước 09_export_csv, tấm Export.
- Thấy: dòng phụ của "MTD records (CSV)" là "One row per entry, MTDsorted columns". Mong đợi: "MTD-sorted columns".
- Ảnh: `qa-runs/ios/44481342409/qa-ios-14/personas/P007/shots/step-019-assertCondition-CopySave_to_FilesAirDrop.jpg`.
- Nguồn: `src/i18n/v2/mtd.ts:60` (`mtdRecordsSub`), còn nguyên trên dev hiện tại; cũng có trong chú thích `src/features/reports/mtdFiles.ts:139` và tên test `mtd.test.ts:157`.

