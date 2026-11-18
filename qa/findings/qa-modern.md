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

## B-102 OCR 20 hoá đơn — 2026-11-18 11:45–14:40 (3 bản: 322acd6 → 4f297e1 → 08cdb7b)

**Cách chạy:**
- **Máy:** XL `qa_pixel9proxl`, API 37 Play Store, Google Play services 26.45, `-gpu swiftshader_indirect` (`-gpu host` treo máy sau
  lần đọc đầu), chữ 1.0.
- **Dữ liệu:** vùng **United Kingdom** (P001 + một dòng `proState` trial bắt đầu hôm nay, khôi phục qua Backup → Restore), Pro "Trial · 7
  days left". Không bấm Subscribe.
- **Mỗi ảnh:**
  - đẩy vào `/sdcard/Pictures` (chỉ 1 ảnh mỗi lần) + quét media;
  - Home → Expense → Photo → Choose from library → chọn → Done;
  - chờ 16 s, chụp màn hình (`qa-runs/receipts/run*/rNN.png`);
  - đóng (X) → Discard; không lưu khoản nào.
- **Lấy dòng thô:** sau mỗi ≤ 3 ảnh: Settings → giữ lâu "Version 1.0.0" → chia sẻ file chẩn đoán.
  - Ảnh Play Store không `adb root` được, và không có app nào nhận file `.json` (chỉ Drive/Gmail cần tài khoản, Quick Share). Nên tôi
    dựng tại máy một APK nhận chia sẻ rất nhỏ `qa.rx` (javac + d8 + aapt2 của SDK, ký bằng debug keystore có sẵn). Nó chép file vào
    `/sdcard/Android/data/qa.rx/files/` để `adb pull`.
  - File gốc: `qa-runs/receipts/diag*/`.
- **Thử ảnh API 30 google_apis (root được):** ⏭ không dùng được. Play services 20.18 không tải được module `vision.ocr` ("No acceptable
  module… remote version is 0", "rate limiting").
- **Kết quả:**
  - Dòng thô (text + box) và `parsed` của từng bản: `qa-runs/receipts/ocr-raw.json` (322acd6) và `ocr-raw-4f297e1.json` (4f297e1, có
    `timing`).
  - Ảnh r21–r32: chưa có thư mục `qa-runs/receipts/new/` → chưa chạy.

**Cách chấm "app điền":** đúng như `fill.ts` / `receiptSignal.ts`:
- Trường có độ tin cậy ≥ 0.6 mới được điền.
- Ngày chỉ đổi trên màn ghi khi hoá đơn trong vòng 400 ngày.
- Ảnh chụp màn hình khớp 100% với cách tính này: đã đối chiếu r01–r03, r11, r12, r16, r20 bản cũ và r03, r11, r18 bản mới.

Cột ngày chấm theo ngày bộ đọc ra (≥ 0.6) so với đáp án, vì hoá đơn > 400 ngày thì màn ghi giữ "Now" theo thiết kế. Trong ngoặc là giá trị
bộ đọc ra nhưng dưới ngưỡng (@ độ tin cậy). Ở hai cột sửa, "a+b ms" là `timing.shrinkMs + ocrMs`.

| Ảnh | Đáp án (số tiền / nơi bán / ngày) | Trước sửa 322acd6 | Sửa 1 4f297e1 (· thu nhỏ+OCR) | Sửa 2 08cdb7b (· thu nhỏ+OCR) |
|---|---|---|---|---|
| r01 | 154.44 / Tesco / 2017-06-06 | ❌ — (154.44 @0.5) / ✅ / ❌ — (2017-06-06 @0.3) | ❌ — (154.44 @0.5) / ✅ / ❌ — (2017-06-06 @0.3) · 77+1646 ms | ✅ / ✅ / ❌ — (2017-06-06 @0.3) · 82+2019 ms |
| r02 | 33.50 / Tesco / 2026-05-07 | ✅ / ✅ / ✅ | ✅ / ✅ / ✅ · 269+748 ms | ✅ / ✅ / ✅ · 18+1129 ms |
| r03 | 5.08 / Tesco / 2012-04-23 | ✅ / ❌ Iesço / ❌ — (2012-04-22 @0.3) | ❌ — (5.08 @0.4) / ❌ merro / ❌ — (2012-04-22 @0.3) · 191+930 ms | ❌ 0.95 / ✅ / ❌ — (2012-04-23 @0.3) · 302+1053 ms |
| r04 | 23.42 / Tesco / — | ✅ / ✅ / ✅ | ✅ / ✅ / ✅ · 262+837 ms | ✅ / ✅ / ✅ · 12+1062 ms |
| r05 | 54.73 / Tesco / — | ✅ / ✅ / ✅ | ✅ / ✅ / ✅ · 234+1043 ms | ✅ / ✅ / ✅ · 240+1161 ms |
| r06 | 21.90 / Tesco / 2026-10-06 | ✅ / ✅ / ❌ — | ✅ / ✅ / ❌ — · 46+903 ms | ✅ / ✅ / ✅ · 79+1153 ms |
| r07 | 5.67 / Tesco / 1990-12-14 | ✅ / ✅ / ❌ — (1990-12-14 @0.3) | ✅ / ✅ / ❌ — (1990-12-14 @0.3) · 158+1020 ms | ✅ / ✅ / ❌ — (1990-12-14 @0.3) · 17+822 ms |
| r08 | 6.71 / Tesco / 1994-04-19 | ✅ / ✅ / ❌ — (2094-04-19 @0.2) | ✅ / ✅ / ❌ — (2094-04-19 @0.2) · 352+735 ms | ✅ / ✅ / ❌ — (1994-04-19 @0.3) · 37+1104 ms |
| r09 | 20.00 / Shell / 2006-06-21 | ✅ / ✅ / ❌ — | ✅ / ✅ / ❌ — · 163+904 ms | ✅ / ✅ / ❌ — (2006-06-21 @0.3) · 7+1007 ms |
| r10 | 53.69 / Shell / 2025-11-24 | ✅ / ✅ / ✅ | ✅ / ✅ / ✅ · 263+701 ms | ✅ / ✅ / ✅ · 10+812 ms |
| r11 | 69.03 / Shell / 2025-10-18 | ❌ 69.83 / ❌ MuReceiptME / ❌ — | ❌ 69.83 / ❌ MuReceiptM / ❌ — (2028-11-18 @0.2) · 365+942 ms | ❌ 69.83 / ✅ / ❌ — · 29+989 ms |
| r12 | 15.04 / Shell / 2026-03-10 | ✅ / ✅ / ❌ 2026-10-03 | ✅ / ✅ / ❌ 2026-10-03 · 157+828 ms | ✅ / ✅ / ✅ · 38+752 ms |
| r13 | 393.95 / Shell / 2025-06-08 | ✅ / ✅ / ❌ — (2025-06-08 @0.3) | ✅ / ✅ / ❌ — (2025-06-08 @0.3) · 108+844 ms | ✅ / ✅ / ❌ — (2025-06-08 @0.3) · 85+946 ms |
| r14 | 199.82 / Fuelmax Station / 2024-04-26 | ✅ / ✅ / ❌ — (2024-04-26 @0.3) | ✅ / ✅ / ❌ — (2024-04-26 @0.3) · 261+872 ms | ✅ / ✅ / ❌ — (2024-04-26 @0.3) · 29+1079 ms |
| r15 | 32.02 / Shell / 2022-04-22 | ✅ / ✅ / ❌ — (2022-04-22 @0.3) | ✅ / ✅ / ❌ — (2022-04-22 @0.3) · 54+782 ms | ✅ / ✅ / ❌ — (2022-04-22 @0.3) · 196+771 ms |
| r16 | 88.20 / United Pacific / 2024-03-15 | ✅ / ❌ 250 Tiburon Blud / ❌ — (2024-03-15 @0.3) | ✅ / ❌ 250 Tiburon Blud / ❌ — (2024-03-15 @0.3) · 319+675 ms | ✅ / ✅ / ❌ — (2024-03-15 @0.3) · 85+1124 ms |
| r17 | 21.74 / FreshHarvest Market / 2019-11-20 | ✅ / ✅ / ❌ — (2019-11-20 @0.3) | ✅ / ✅ / ❌ — (2019-11-20 @0.3) · 74+863 ms | ✅ / ✅ / ❌ — (2019-11-20 @0.3) · 105+1012 ms |
| r18 | 11.51 / WideMart Supermarket / 2025-04-18 | ✅ / ✅ / ❌ — (2025-04-18 @0.3) | ✅ / ❌ WideMart Supernarket / ❌ — (2025-04-18 @0.3) · 284+845 ms | ✅ / ✅ / ❌ — (2025-04-18 @0.3) · 10+1054 ms |
| r19 | 25.97 / The Shop / — | ✅ / ✅ / ✅ | ✅ / ✅ / ✅ · 50+847 ms | ✅ / ✅ / ✅ · 397+632 ms |
| r20 | 47.95 / — / — | ✅ / ❌ Shop Name / ✅ | ✅ / ❌ Shop Name / ✅ · 31+1297 ms | ✅ / ✅ / ✅ · 21+843 ms |

**Tổng:**

| | Số tiền | Nơi bán | Ngày |
|---|---|---|---|
| **322acd6** | 18/20 | 16/20 | 6/20 |
| **4f297e1** | 17/20 | 15/20 | 6/20 |
| **08cdb7b** | 18/20 | 20/20 | 8/20 |

**Sửa 1 (4f297e1):** không ca nào tốt lên. Có **2 ca thụt lùi**, cả hai do ảnh đã thu nhỏ cho OCR ra dòng khác:
- **r03:** dòng "TOTAL" đứng riêng biến mất → số tiền 5.08 còn @0.4, không điền; nơi bán thành "merro".
- **r18:** "Supermarket" bị đọc thành "Supernarket".

**Sửa 2 (08cdb7b), chạy 14:00–14:40:** nơi bán 20/20.
- **Tốt lên:**
  - r01 số tiền 154.44.
  - r03, r11, r16, r18, r20 đúng nơi bán.
  - r06 đọc được ngày "06 0CT 2026".
  - r12 ra 10 Mar (màn ghi đổi ngày đúng: "Tue 10 Mar, 17:24").
- **Không có ngày nào bị đổi sai.** r08 / r09 nay ra đúng năm và ngày nhưng @0.3 nên không điền.
- **🟠 Thụt lùi mới, r03: tự điền SAI số tiền £0.95** (@0.9) thay vì 5.08. Sai còn tệ hơn để trống.
  - Bản 322acd6 điền đúng 5.08; bản 4f297e1 để trống.
  - Dòng thô:
    - `£0.95` (x 0.50, y 0.330) là giá đơn vị của dòng `2@` (y 0.322).
    - `TOTAL` ở (0.13, 0.367). Số đúng `5.08` ở cột phải (0.75, 0.380 và 0.402).
  - Nghi parser ưu tiên "số có dấu £" ở gần nhãn TOTAL hơn số cùng hàng ở cột phải.
  - Ảnh: `qa-runs/receipts/run-08cdb7b/r03.png`.
- **r11:** vẫn 69.83 (dòng OCR đọc nhầm, như điều phối đã kết luận).
- **Thời gian:** thu nhỏ 7–397 ms, OCR 632–2019 ms.

### r21–r32 (12 hoá đơn thêm: hoá đơn công ty, gửi xe, đổ xăng) — APK e6bb124, 14:25–14:45

- **Nguồn ảnh:** Phương dán 12 ảnh vào chat phiên điều phối (05:01 UTC). Tôi trích từ lịch sử phiên đó ra
  `qa-runs/receipts/new/r21…r32.png`; thứ tự đã đối chiếu với `qa/receipts-expected.json`.
- **APK:** e6bb124 **chưa có 379001d** (sửa r03). `parsed` ở đây là parser 08cdb7b + B-105.
- **Dòng thô:** `qa-runs/receipts/ocr-raw-e6bb124.json` (có `timing`).
- **Luật chấm nơi bán:** từ đợt này phải chứa đủ tên đúng (trước đây chấp nhận cả chuỗi con, nên "lexnet" từng bị chấm ✅). Ba bản
  trên chấm lại vẫn giữ nguyên điểm.

| Ảnh | Số tiền app điền | Đáp án | | Nơi bán app điền | Đáp án | | Ngày bộ đọc ra (≥0.6) · màn ghi | Đáp án | | Dòng OCR |
|---|---|---|---|---|---|---|---|---|---|---|
| r21 | 225.00 | 225.00 | ✅ | Acme Inc | Acme Inc. | ✅ | — (đọc 2013-03-08 @0.3) · giữ Now | 2013-03-08 | ❌ | 44 |
| r22 | 1575.01 | 1575.01 | ✅ | lexnet | Flexnet | ❌ | — (đọc 2016-06-13 @0.3) · giữ Now | 2016-06-13 | ❌ | 35 |
| r23 | — (đọc 3025.00 @0.4) | 3025.00 | ❌ | Jane Smith | Smith & Co | ❌ | — (đọc 2023-05-10 @0.3) · giữ Now | 2023-05-10 | ❌ | 22 |
| r24 | 5400.00 | 5400.00 | ✅ | Sample | Stark Industries | ❌ | — (đọc 2023-01-01 @0.3) · giữ Now | 2023-01-01 | ❌ | 59 |
| r25 | 7.00 | 7.00 | ✅ | Address | — | ❌ | — (đọc 2018-07-28 @0.3) · giữ Now | 2018-07-28 | ❌ | 9 |
| r26 | 5.00 | 5.00 | ✅ | Pe NAME | — | ❌ | — · giữ Now | — | ✅ | 18 |
| r27 | 150.00 | 150.00 | ✅ | Parking Garage | Parking Garage | ✅ | — (đọc 2020-03-18 @0.3) · giữ Now | 2020-03-20 | ❌ | 25 |
| r28 | — (đọc 96.80 @0.4) | 81.80 | ❌ | Ala Moana Center | Glideparcs | ❌ | — (đọc 2028-05-09 @0.2) · giữ Now | 2026-05-09 | ❌ | 40 |
| r29 | 42.00 | 42.00 | ✅ | Fuelmax Station | Fuelmax Station | ✅ | — (đọc 2025-01-10 @0.3) · giữ Now | 2025-01-10 | ❌ | 32 |
| r30 | 19.75 | 19.75 | ✅ | H-E-B | H-E-B | ✅ | — · giữ Now | — | ✅ | 18 |
| r31 | 48.40 | 48.40 | ✅ | Pin Used | — | ❌ | — · giữ Now | — | ✅ | 15 |
| r32 | 200.00 | 200.00 | ✅ | Speedway | Speedway | ✅ | — (đọc 2020-04-02 @0.3) · giữ Now | 2020-02-04 | ❌ | 21 |

**Đúng:** số tiền 10/12 · nơi bán 5/12 · ngày 3/12. Ảnh màn ghi khớp (r22, r23, r28, r31).

**Số tiền:**
- **r23:** `$3025.00` cạnh dòng `Total` nhưng chỉ @0.4, nên không điền.
- **r28 (bảng gửi xe):** bộ đọc chọn `$96.80" due 05/24/26` (@0.4), trong khi `SUBTOTAL` → `$81.80**`.

**Nơi bán:**
- r22: `lexnet`, trong khi có dòng `Flexnet VS`.
- r23: `Jane Smith`, trong khi có `Smith & Ge`.
- r24: `Sample` (chữ mẫu), trong khi có `Stark Industries`.
- r28: `Ala Moana Center` (địa điểm), đáp án Glideparcs.
- Lấy chữ mẫu / chữ rác thay vì để trống:
  - r25 "Address";
  - r26 "Pe NAME";
  - r31 "Pin Used".

**Ngày:**
- **r32 `Date: 02/04/2020`:** hoá đơn `$` nhưng đọc thành 2 Apr (@0.3). Đáp án 4 Feb.
- **r27:** lấy `Entry Time : 03/18/2020` thay vì `Exit Time: 03/20/2020`.
- **r28:** năm `26` đọc thành 2028 (@0.2).
- Các ngày còn lại đọc đúng nhưng @0.3, nên không điền.

### Chạy lại đủ 32 ảnh trên APK 3f26b33 — 15:08–15:52

**Bản này có:**
- parser sửa theo r21–r32;
- B-108: ngày cũ cũng được điền (bỏ giới hạn 400 ngày);
- B-112: chip ngày có năm.

**Dòng thô:** `qa-runs/receipts/ocr-raw-3f26b33.json`. Ảnh màn ghi: `qa-runs/receipts/run-3f26b33/`.

**Tổng 32 ảnh:**

| | Số tiền | Nơi bán | Ngày |
|---|---|---|---|
| **Đúng** | 29/32 | 29/32 | 30/32 |

**Ảnh màn ghi khớp bảng:**
- r01 "Tue 6 Jun 2017, 08:46" · £154.44 · Tesco;
- r32 "Tue 4 Feb 2020, 12:00" · £200.00 · Speedway;
- r25 "Sat 28 Jul 2018, 10:27" · £7.00, không điền nơi bán;
- r28 giữ "Now", £0.00, điền "Ala Moana Center".

**r01–r20 (so với 08cdb7b):**

| Ảnh | Đáp án (số tiền / nơi bán / ngày) | 08cdb7b | 3f26b33 |
|---|---|---|---|
| r01 | 154.44 / Tesco / 2017-06-06 | ✅ / ✅ / ❌ — (2017-06-06 @0.3) · 82+2019 ms | ✅ / ✅ / ✅ · 21+2049 ms |
| r02 | 33.50 / Tesco / 2026-05-07 | ✅ / ✅ / ✅ · 18+1129 ms | ✅ / ✅ / ✅ · 9+1151 ms |
| r03 | 5.08 / Tesco / 2012-04-23 | ❌ 0.95 / ✅ / ❌ — (2012-04-23 @0.3) · 302+1053 ms | ✅ / ✅ / ✅ · 248+976 ms |
| r04 | 23.42 / Tesco / — | ✅ / ✅ / ✅ · 12+1062 ms | ✅ / ✅ / ✅ · 98+1084 ms |
| r05 | 54.73 / Tesco / — | ✅ / ✅ / ✅ · 240+1161 ms | ✅ / ✅ / ✅ · 44+1328 ms |
| r06 | 21.90 / Tesco / 2026-10-06 | ✅ / ✅ / ✅ · 79+1153 ms | ✅ / ✅ / ✅ · 24+958 ms |
| r07 | 5.67 / Tesco / 1990-12-14 | ✅ / ✅ / ❌ — (1990-12-14 @0.3) · 17+822 ms | ✅ / ✅ / ✅ · 95+943 ms |
| r08 | 6.71 / Tesco / 1994-04-19 | ✅ / ✅ / ❌ — (1994-04-19 @0.3) · 37+1104 ms | ✅ / ✅ / ✅ · 94+1151 ms |
| r09 | 20.00 / Shell / 2006-06-21 | ✅ / ✅ / ❌ — (2006-06-21 @0.3) · 7+1007 ms | ✅ / ✅ / ✅ · 38+1282 ms |
| r10 | 53.69 / Shell / 2025-11-24 | ✅ / ✅ / ✅ · 10+812 ms | ✅ / ✅ / ✅ · 8+1201 ms |
| r11 | 69.03 / Shell / 2025-10-18 | ❌ 69.83 / ✅ / ❌ — · 29+989 ms | ❌ 69.83 / ✅ / ❌ — · 31+1006 ms |
| r12 | 15.04 / Shell / 2026-03-10 | ✅ / ✅ / ✅ · 38+752 ms | ✅ / ✅ / ✅ · 33+630 ms |
| r13 | 393.95 / Shell / 2025-06-08 | ✅ / ✅ / ❌ — (2025-06-08 @0.3) · 85+946 ms | ✅ / ✅ / ✅ · 3+851 ms |
| r14 | 199.82 / Fuelmax Station / 2024-04-26 | ✅ / ✅ / ❌ — (2024-04-26 @0.3) · 29+1079 ms | ✅ / ✅ / ✅ · 102+883 ms |
| r15 | 32.02 / Shell / 2022-04-22 | ✅ / ✅ / ❌ — (2022-04-22 @0.3) · 196+771 ms | ✅ / ✅ / ✅ · 115+699 ms |
| r16 | 88.20 / United Pacific / 2024-03-15 | ✅ / ✅ / ❌ — (2024-03-15 @0.3) · 85+1124 ms | ✅ / ✅ / ✅ · 13+820 ms |
| r17 | 21.74 / FreshHarvest Market / 2019-11-20 | ✅ / ✅ / ❌ — (2019-11-20 @0.3) · 105+1012 ms | ✅ / ✅ / ✅ · 55+1083 ms |
| r18 | 11.51 / WideMart Supermarket / 2025-04-18 | ✅ / ✅ / ❌ — (2025-04-18 @0.3) · 10+1054 ms | ✅ / ✅ / ✅ · 182+1128 ms |
| r19 | 25.97 / The Shop / — | ✅ / ✅ / ✅ · 397+632 ms | ✅ / ✅ / ✅ · 160+813 ms |
| r20 | 47.95 / — / — | ✅ / ✅ / ✅ · 21+843 ms | ✅ / ✅ / ✅ · 16+985 ms |

**r21–r32 (so với e6bb124):**

| Ảnh | Đáp án (số tiền / nơi bán / ngày) | e6bb124 | 3f26b33 |
|---|---|---|---|
| r21 | 225.00 / Acme Inc. / 2013-03-08 | ✅ / ✅ / ❌ — (2013-03-08 @0.3) · 40+1836 ms | ✅ / ✅ / ✅ · 34+1014 ms |
| r22 | 1575.01 / Flexnet / 2016-06-13 | ✅ / ❌ lexnet / ❌ — (2016-06-13 @0.3) · 3+1247 ms | ✅ / ❌ lexnet / ✅ · 2+858 ms |
| r23 | 3025.00 / Smith & Co / 2023-05-10 | ❌ — (3025.00 @0.4) / ❌ Jane Smith / ❌ — (2023-05-10 @0.3) · 50+847 ms | ❌ — (3025.00 @0.4) / ❌ Jane Smith / ✅ · 1+806 ms |
| r24 | 5400.00 / Stark Industries / 2023-01-01 | ✅ / ❌ Sample / ❌ — (2023-01-01 @0.3) · 55+1297 ms | ✅ / ✅ / ✅ · 186+1277 ms |
| r25 | 7.00 / — / 2018-07-28 | ✅ / ❌ Address / ❌ — (2018-07-28 @0.3) · 183+888 ms | ✅ / ✅ / ✅ · 87+1070 ms |
| r26 | 5.00 / — / — | ✅ / ❌ Pe NAME / ✅ · 4+1351 ms | ✅ / ✅ / ✅ · 32+1046 ms |
| r27 | 150.00 / Parking Garage / 2020-03-20 | ✅ / ✅ / ❌ — (2020-03-18 @0.3) · 59+865 ms | ✅ / ✅ / ✅ · 292+835 ms |
| r28 | 81.80 / Glideparcs / 2026-05-09 | ❌ — (96.80 @0.4) / ❌ Ala Moana Center / ❌ — (2028-05-09 @0.2) · 247+999 ms | ❌ — (96.80 @0.4) / ❌ Ala Moana Center / ❌ — (2028-05-09 @0.2) · 48+1071 ms |
| r29 | 42.00 / Fuelmax Station / 2025-01-10 | ✅ / ✅ / ❌ — (2025-01-10 @0.3) · 295+881 ms | ✅ / ✅ / ✅ · 15+763 ms |
| r30 | 19.75 / H-E-B / — | ✅ / ✅ / ✅ · 82+1007 ms | ✅ / ✅ / ✅ · 79+683 ms |
| r31 | 48.40 / — / — | ✅ / ❌ Pin Used / ✅ · 161+820 ms | ✅ / ✅ / ✅ · 124+1005 ms |
| r32 | 200.00 / Speedway / 2020-02-04 | ✅ / ✅ / ❌ — (2020-04-02 @0.3) · 37+855 ms | ✅ / ✅ / ✅ · 119+785 ms |

**Còn sai trên 3f26b33** (đã báo điều phối lúc 15:55):
- **Nơi bán điền SAI, cả 3 ca đúng mức 0.62** (sát ngưỡng 0.6):
  - r22 `lexnet`, trong khi có `Flexnet VS` @0.81.
  - r23 `Jane Smith`, trong khi có `Smith & Ge` @0.72.
  - r28 `Ala Moana Center`, trong khi có `GLIDEPARCS Enforcement` @0.83.
- **Số tiền không điền:**
  - r23: `$3025.00` @0.4 cạnh `Total`.
  - r28: chọn 96.80 @0.4, đáp án SUBTOTAL `$81.80**`.
- **r28 ngày:** OCR đọc ô Date thành `05/09/2028` → 2028 @0.2, không điền. Các dòng `due 05/09/26` có năm đúng.
- **r11:** 69.83 do OCR đọc nhầm số (đã biết). Dòng ngày OCR ra rác `1e/11/282s 8s: 18 AH`.

**Chốt (điều phối, 16:00):** B-102 dừng ở 29/32 · 29/32 · 30/32; không chạy lại bản cuối. Ghi là giới hạn đã biết:
- r11 do OCR đọc nhầm;
- nơi bán @0.62 ở r22 / r23 / r28: nâng ngưỡng sẽ làm mất các tên đúng có cùng độ tin cậy.

**Ghi chú cho `parseReceipt.ts` (từ dòng thô, bản 322acd6):**
- **Ngày đọc đúng nhưng chỉ @0.3** (r01, r03, r07, r13–r18) → không bao giờ điền. Dòng dạng `06/06/2017 8:46 …`, `03/15/2024 21162400`.
- **r12 `DATE 3/10/26 17:24`** trên hoá đơn `$` bị đọc theo kiểu UK thành 3 Oct (@ ≥ 0.6, **đổi ngày sai** trên màn ghi). r09
  `DATE06/21/06` (không có cách) không đọc được. Cả hai là hoá đơn Mỹ, máy để vùng UK.
- **r06 `TUE 06 0CT 2026`:** OCR đọc chữ O thành số 0, nên không ra ngày.
- **r08:** năm 2 chữ số `94` → 2094 (@0.2).
- **r03:** lấy `TOTAL UP TO 22/04/12` (điểm Clubcard) thay vì dòng giờ in `23/04/12 19:51`.
- **r11:** dòng OCR là `$69.83`, đáp án 69.03 → cần nhìn lại ảnh (OCR đọc nhầm số hay đáp án nhầm). Nơi bán lấy `MuRe…`, trong khi có
  dòng `She I Riverstde Mart`.
- **r16:** lấy dòng địa chỉ `250 TIBURON BLUD`, trong khi dòng đầu là `UNITED PACIFIC 5651`.
- **r20:** chữ mẫu "Shop Name" được điền làm nơi bán (đáp án: không có).
- **r01:** số tiền đúng nhưng @0.5 (hoá đơn dài, có Cash 160.00 / Change / Rounding).
- **Thời gian (4f297e1, máy ảo):** thu nhỏ 31–365 ms, OCR 675–1646 ms.

## 2e. Chạy lại trên APK `sundaysort-qa-97ceb60-all.apk` (dev 97ceb60, B-56…B-94) — 2026-11-18 10:12–10:18

Bằng chứng: `qa-runs/modern/regress-97ceb60/`. Fold mở, chia đôi ngang 852×436dp (`--windowingMode 6` + `am task resize`).

| Lỗi | Kiểm | Kết quả |
|---|---|---|
| B-94 (MOD-11) | Sort ở cửa sổ 436dp | ✅ thẻ hiện đủ thân (Expense, $119.99, Phone bill, ngày); cả màn cuộn được tới MOST USED / Work-Personal / Edit-Split-Merge-Skip (`s436-0.png`, `s436-1-scrolled.png`) |
| | Edit | ✅ bảng sửa mở ngay trong thẻ (Amount, Note, Done), cuộn được (`s436-2-edit.png`) |
| | Split | ✅ "Split into parts" 60.00 / 59.99, chọn nhóm + W/P (`s436-3-split.png`) |
| | Phân loại: chạm "Phone & data" | ✅ "Sorted as Phone & data", 2 → 3 of 6, sang thẻ kế (Evri $242.38) (`s436-4-sorted.png`) |
| | Về toàn màn 852×883dp | ✅ thẻ Sort như cũ, nút "+" hiện lại, đếm giữ 3 of 6 (`full-sort.png`) |

Ghi chú: đang mở bảng Edit trong thẻ mà bấm Back → về tab Home; quay lại Sort thì bảng Edit vẫn mở (giữ trạng thái) — chấp nhận được.

## 2d. Chạy lại trên APK `sundaysort-qa-bcc8c7a-all.apk` (dev bcc8c7a, "B-89 v2") — 2026-11-18 09:57–10:07

Bằng chứng: `qa-runs/modern/regress-bcc8c7a/`. Kịch bản B-89 (script `b89.py` trong scratchpad): Ghi nhanh → Take photo → camera mở →
mở Settings (app *cached*) → `am kill` (pid mất) → Recents về camera → chụp + Done (hoặc Back = huỷ) → ảnh chụp sau 6 s và 12 s.

| Lỗi | Kiểm | Kết quả |
|---|---|---|
| B-89 v2 | XL, $3.21 **có sẵn 1 ảnh** → chụp ảnh 2 lúc app đã chết | ✅ tiến trình mới mở lại Ghi nhanh: **"2 of 3"**, không nhân đôi sau 12 s; Save → "Saved · $3.21 expense" (`withphoto-*.png`) |
| | XL, $6.54 **chưa có ảnh** | ✅ mở lại có $6.54 + "1 of 3" (`nophoto-*.png`); Discard → "The photo will be deleted too.", bộ đếm ảnh miễn phí trả lại (17 → 18/20) |
| | XL, khoản trống → camera → **Back (huỷ)** | ✅ tiến trình mới về Ghi nhanh trống $0.00 (đúng chỗ đang đứng); `force-stop` + mở lại → **Home**, không tự vào Ghi nhanh (nháp đã xoá) (`cancel-*.png`) |
| Nút "+" < 520dp | Fold chia đôi ngang 852×436dp: Home / Entries / Sort / Miles / Reports | ✅ không còn nút "+" ở tab nào; Entries hiện đủ số tiền các dòng. Toàn màn 883dp: "+" hiện lại (`fold-436-montage.png`) |

Ghi chú: nháp $3.21 có 1 ảnh để lại từ lượt 8cb9c8f, sau khi cài đè bcc8c7a mở lại **không còn ảnh** (chỉ còn số tiền). Hiếm (chỉ khi cập
nhật app đúng lúc có nháp) — để ý nếu ảnh nháp nằm trong `cache/` có thể bị dọn.

### MOD-11 🟠 Cửa sổ thấp (chia đôi ngang 436dp): thẻ Sort bẹp còn mỗi hàng Edit / Split / Merge / Skip — không phân loại được
- **Máy:** Fold mở, chia đôi ngang (`am start --windowingMode 6` + `am task resize … 0 1090 2076 2152` → `w852dp h436dp`), APK bcc8c7a.
- **Thực tế:** phần thân thẻ (số tiền, tên, các nút nhóm chi, Work/Personal) cao ~0, chỉ còn thanh cuộn nhỏ; dưới thẻ trống ~100dp
  (`regress-bcc8c7a/fold-436-Sort.png`). Người dùng không thấy khoản cũng không bấm được nhóm chi → luồng chính Sort không dùng được
  ở chế độ chia đôi trên máy gập / tablet.
- **Nguyên nhân gốc nghi ngờ:** `src/app/(tabs)/sort.tsx:161` luôn đệm `paddingBottom: 96` (chừa chỗ nút "+") — nay nút "+" đã ẩn ở cửa
  sổ < 520dp nên phần đệm này thừa; thẻ (`SortEntryCard.tsx:104/467` `flex: 1`) không có `minHeight`, phần thân là ScrollView `flex: 1`
  nên bị ép về 0 khi chiều cao còn lại < hàng nút. Gợi ý: đệm đáy theo đúng điều kiện hiện "+" (12 khi ẩn); `minHeight` ~260dp cho thẻ
  và cho cả màn cuộn được khi cửa sổ thấp hơn mức đó.

## 2c. Chạy lại trên APK `sundaysort-qa-8cb9c8f-all.apk` (dev 8cb9c8f, gồm B-89 50974d7) — 2026-11-18 09:39–09:46

Bằng chứng: `qa-runs/modern/regress-8cb9c8f/`.

| Lỗi | Kiểm | Kết quả |
|---|---|---|
| B-89 (MOD-10) | XL: Ghi nhanh $3.21 + 1 ảnh chụp thường → Take photo → mở Settings (app *cached*) → `am kill` (pid mất) → Recents về camera → chụp → Done → chờ 6 s và 12 s | ❌ **vẫn "1 of 3"**, ảnh thứ 2 mất (`r1-2-after6s.png`, `r1-3-after12s.png`). Nháp số tiền + ảnh cũ vẫn được mở lại ✅ |
| B-89 (nút +) | Fold chia đôi ngang 852×436dp | ✅ Reports: nút "+" ẩn, "Sort now" không bị đè. 🟡 Entries/Sort/Home cùng cửa sổ 436dp vẫn hiện "+" — ở Entries đè số tiền dòng thứ 2 (cuộn được) (`fold-mw-b89-montage.png`) |
| | Fold chia dọc 423dp, toàn màn | ✅ "+" hiện bình thường |

### MOD-10 — nguyên nhân gốc thật (gọi lại `getPendingResultAsync` từ JS không đủ)
- Logcat tiến trình mới (`regress-8cb9c8f/logcat-b89-pid4175.txt`):
  `09:41:22.573 W BridgelessReact: ReactHost{0}.raiseSoftException(onActivityResult(… requestCode = "1415501858", resultCode = "-1" …))`
  → `ReactNoCrashSoftException … Tried to access onActivityResult while context is not ready`; mãi tới `09:41:23.675 ReactNativeJS:
  Running "main"` React mới sẵn sàng.
- Đường đi: `MainActivity` → `expo.modules.ReactActivityDelegateWrapper.onActivityResult` (node_modules/expo …/ReactActivityDelegateWrapper.kt:244-261)
  chỉ chờ `loadAppReady` (hoàn tất ở dòng 147 ngay sau `awaitDelayLoadAppWhenReady`, **trước** khi ReactHost có context) rồi chuyển cho
  `ReactHostImpl.onActivityResult` (react-native 0.88.1, ReactHostImpl.kt:654-668) → `currentReactContext == null` → bỏ kết quả. Do đó
  `AppContext.onActivityResult` → `ActivityResultsManager.dispatchResult` không bao giờ chạy, `ImagePickerModule.pendingMediaPickingResult`
  luôn `null`; JS gọi `getPendingResultAsync` bao nhiêu lần cũng ra `null`. (Bản sửa đường cũ của Expo viết cho kiến trúc bridge,
  không còn đúng với bridgeless.)
- Gợi ý sửa (chọn 1):
  1. **Native, trong app:** `MainActivity.onActivityResult` — nếu `reactHost.currentReactContext == null` thì giữ (requestCode, resultCode, data)
     và phát lại khi context sẵn sàng (`reactHost.addReactInstanceEventListener { onReactContextInitialized → super.onActivityResult(...) }`),
     qua config plugin để prebuild không mất.
  2. **JS, không đụng native:** trước `launchCameraAsync` ghi `cameraStartedAt` vào nháp; khi mở lại nháp mà có `cameraStartedAt` thì liệt kê
     thư mục ảnh của expo-image-picker trong cache (`FileSystem.cacheDirectory + 'ImagePicker/'`) lấy file mới hơn `cameraStartedAt`, kích
     thước > 0 → gắn vào. Camera vẫn ghi file (logcat: tiến trình được dựng lại vì `ImagePickerFileProvider`).
- Chưa chạy lượt 2 (không ảnh sẵn) trên 8cb9c8f vì nguyên nhân gốc giống hệt; sẽ chạy cả 2 lượt khi có bản sửa mới.

## 2b. Chạy lại trên APK `sundaysort-qa-5ce0626-all.apk` (dev 5ce0626, B-56…B-87) — 2026-11-18 08:55–09:12

Bằng chứng: `qa-runs/modern/regress-5ce0626/`. XL (`-gpu host`) rồi Fold (`-gpu swiftshader_indirect`), từng máy một, 3072 MB, khởi động lại giữa 2 lô.

| Lỗi | Kiểm | Kết quả |
|---|---|---|
| B-79 (MOD-8) | XL, P098 5.006 khoản | ✅ "2,037 entries to sort" |
| B-64/B-72 (MOD-2) | XL chữ 2.0 tối: gõ 1234 | ✅ "$12.34" to rõ; bàn phím số (`xl-f2-typed.png`) |
| | Fold mở xoay ngang, chữ 1.0 và 2.0: gõ 750 | ✅ "$7.50" rõ ở cả hai (`fold-land-montage.png`) |
| B-73 (MOD-9) | XL: Back ẩn bàn phím → chạm số tiền (2 lần liên tiếp); Fold ngang: như trên | ✅ bàn phím hiện lại (`mInputShown=true`), gõ tiếp nối vào số ($12.34 → $123.45) |
| B-86 (MOD-5) | Chạm Photo ở Ghi nhanh và "Add photo" ở Sửa khoản | ✅ bảng "Add a receipt photo": Take photo / Choose from library |
| B-82 (MOD-6 + Discard) | Sửa khoản chữ 2.0 và 1.3 | ✅ "Category" nguyên chữ, "Add photo" nằm trong khung (`xl-b82-detail-*.png`) |
| | Discard khi có ảnh | ✅ "$123.45 expense won't be saved. The photo will be deleted too." |
| B-84 (MOD-3) | Ghi nhanh gõ số (+1 ảnh) → Take photo → camera mở → mở Settings (app thành *cached*) → `am kill` (pid mất) → Recents về camera → chụp → Done | ✅ tiến trình mới mở lại Ghi nhanh với **số cũ + ảnh đã gắn trước đó**. ❌ **ảnh vừa chụp lúc app đã chết bị mất** — lặp 2 lần: lần 1 có sẵn 1 ảnh → vẫn "1 of 3"; lần 2 không có ảnh → mở lại không có ảnh (`xl-b84-after.png`, `xl-b84-run2.png`). Xem MOD-10 |
| B-85 (MOD-4) | Fold mở 5 tab; xoay ngang; chia đôi 423dp dọc / 436dp ngang | ✅ cột ~640dp giữa màn khi rộng; nửa dọc dùng hết bề ngang (`fold-open-montage.png`, `fold-mw-montage.png`). 🟡 cửa sổ thấp 436dp: nút "+" đè lên nút "Sort now" của dải "99+ entries … aren't sorted" ở Reports (`fold-mw-bottom-reports.png`) |

Ghi chú: `am kill` không giết được app khi app vừa rời sang camera (trạng thái *previous*, oom adj 700) — phải đưa app về *cached* (mở app
khác) mới giống máy thật bị thu hồi bộ nhớ.

### MOD-10 🟡 (phần còn lại của B-84) Ảnh chụp trong lúc app bị Android giết không được gắn lại vào Ghi nhanh
- **Máy:** XL API 37, APK 5ce0626, P098. Bước như hàng B-84 ở trên. Logcat: `Start proc …sundaysort for content provider
  {…expo.modules.imagepicker.fileprovider.ImagePickerFileProvider}` — tức camera vẫn ghi file vào app, nhưng màn Ghi nhanh mở lại
  không nhận ảnh.
- **Nguyên nhân nghi ngờ:** `src/app/capture.tsx:128-132` gọi `ImagePicker.getPendingResultAsync()` một lần khi màn mở; lúc đó kết quả
  camera có thể chưa được giao cho Activity mới (Home đẩy sang Ghi nhanh trước khi `onActivityResult` tới), hoặc module chỉ giữ kết quả chờ
  khi chính Activity (không phải tiến trình) bị dựng lại. Gợi ý: gọi lại `getPendingResultAsync` khi `AppState` → `active` lần đầu / sau
  ~1 s; hoặc tự lưu đường dẫn file đích trước khi mở camera (`launchCameraAsync` với `uri` biết trước) để nháp tự nhặt file nếu có.

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
