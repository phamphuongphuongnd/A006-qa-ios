# QA-100 — Sunday Sort: báo cáo kiểm thử (2026-11-17 → 2026-11-18)

> Phương yêu cầu: đóng vai đội QA, mô phỏng 100 người dùng thật (hành vi / thiết bị / mạng khác nhau), Android + iOS, thao tác thật
> trên app, tìm lỗi → nguyên nhân gốc → sửa → chạy lại + regression, **không giả lập kết quả**. Ca nào không chạy thật = ⏭ kèm lý do.
> Chi tiết từng phiên: `qa/findings/*.md` · bằng chứng (ảnh, logcat, dòng OCR thô): `qa-runs/` (không đưa lên git) · lỗi: `BUGS.md` mục QA-100.

## Bản cuối
- **Android:** `C:\Users\Admin\qa-tools\apk\sundaysort-qa-b843037-all.apk` — dev `b843037`, build 2026-11-18 16:46, đủ 4 ABI (có armeabi-v7a cho A13).
  = `ef470b7` (16:18, đã cài A13 16:21 và kiểm trên API 26) + Sort giữ inset khi cuộn, nút thẻ xếp dọc ở chữ lớn, `+not-found`, B-121.
  **Đang cài trên A13 (16:52):** `b843037`. Bản `2454233` (17:09) = cùng code app + manifest khai camera / Bluetooth / GPS
  `required="false"` (aapt2: `uses-feature-not-required`) để Google Play không ẩn app trên máy thiếu phần cứng — không cần cài lại A13.
  Bản QA ký khoá debug — **không phải bản phát hành** (khoá ký / AAB / store chờ Phương).
- **Kiểm tự động trên bản cuối:** `npx jest` **939/939** ✅ · `npx expo lint` ✅ · `npx tsc --noEmit` ✅.
- **iOS:** chưa có bản iOS từ `ef470b7` (lượt 4g trên GitHub Actions chạy dev `4e4b030` = cùng code app).

## Ma trận 100 persona (`qa/personas.json`, seed cố định)
UK 50 · US 50 · 20 hành vi × 5 biến thể · hồ sơ Android: API 26 nhỏ 20 · API 30 20 · API 37 phone 20 · API 37 320dp 20 · API 37 tablet 20 ·
iOS: SE / 16 Pro Max / iPad · mạng: online / 3G / EDGE trễ / mất mạng / máy bay · chữ 0.85–2.0 · sáng/tối · 0 → 20.000 khoản.

## Kết quả theo tầng (số thật)
| Tầng | Ở đâu | Kết quả |
|---|---|---|
| T1 logic 100 persona | Jest + SQLite thật (`personas100.test.ts`) | **100/100** hành trình, bất biến tiền / năm thuế / sao lưu↔khôi phục / CSV injection ✅ (nằm trong 939 test) |
| Android 8 + 11 (40 persona) | phiên B, giả lập API 26 / 30 | **39/40 ✅** trên 538ede9; ❌ P074 "ghi khi bộ nhớ đầy" = B-74 (Save im lặng khi SQLITE_FULL) → đã sửa ("Couldn't save…" + giữ số tiền) và ✅ ở lượt kiểm lại · + Android 7 8/8 · regression 3f26b33/07f4aac: P003 ✅ P041 ✅ · **bản cuối ef470b7: P016 (chữ 2.0) 10/10 ✅**, B-109 / B-114 / B-115 ✅ |
| Android 17 (60 persona: phone / 320dp / tablet) | phiên A, giả lập API 37 | ⏳ điền khi phiên A chốt `qa-runs/android37/summary.json` |
| Điện thoại đời mới (Pixel 9, gập, 16 KB) | phiên F | ✅ (MOD-1…12, 16 KB page size đạt) |
| Máy thật Firebase Test Lab | phiên G | Galaxy S26 (A16), Pixel 11 (A17), Galaxy S9 (A10), OPPO A38 (ColorOS 14): onboarding → 5 tab → ghi khoản → Settings + Robo: **0 crash, 0 ANR, 0 lỗi JS, 0 byte mạng**. Xiaomi 14 HyperOS: cài + mở ✅, thao tác ⏭ (HyperOS chặn bơm sự kiện). Máy ảo A8 / A14 / tablet A15 / A17 16 KB ✅; khôi phục 20.011 khoản ~3 s |
| Galaxy A13 của Phương (dữ liệu thật) | phiên E | **Bản cuối ef470b7 đã cài 16:21** (Phương yêu cầu trước 17:30); 5 tab không lỗi, Sort chữ 2.0 ✅. Dữ liệu thật **nguyên vẹn** qua mọi lần cài đè (233 khoản / 266 chuyến / 8 ảnh / 12 danh mục, id khớp); hoá đơn thật, App lock vân tay thật, sao lưu Drive thật |
| Bảo mật / hiệu năng / mạng / bất thường | phiên D | Monkey 10.000 sự kiện **0 crash 0 ANR**; mở nguội 20k khoản trung vị **1,04 s**; 34 deep link lạ 0 crash; 21+28 file sao lưu độc đều bị từ chối, dữ liệu không đổi; manifest release không RECORD_AUDIO, không debuggable; logcat không lộ số tiền / ghi chú |
| iOS (GitHub Actions macOS, simulator) | phiên C | Lượt 3: 14/27, 0 crash · lượt 4d: 0 crash, B-90 ✅ tối; QI-4 → B-114 · lượt 4e/4g ⏳ (B-117 End trip, B-100, B-101) |
| iOS thật trên Appetize | phiên H | onboarding, màn chuyến tự động, quyền vị trí ✅; tìm **B-117 🔴** (End trip treo) + B-118 |
| Đọc hoá đơn (OCR) — 32 hoá đơn Phương gom | phiên F (giả lập, ML Kit thật) + E (A13) | bản 3f26b33: **số tiền 29/32 · nơi bán 29/32 · ngày 30/32** (lần đầu: 18/20 · 16/20 · 6/20). 104 lần đọc thật thành bộ test `receiptSet.test.ts` |

## Lỗi (BUGS.md mục QA-100, B-56 … B-121 = 66 mục)
- **Đã sửa + kiểm trên máy: 44** (🔴 1 · 🟠 21 · 🟡 22).
- **Còn mở: 22** — gồm: đã sửa, chờ kiểm trên máy (B-109 v3, B-110, B-114 v3, B-117 iOS, B-118, B-119, B-120, B-100 v3, B-101, B-104, B-90 Android);
  giới hạn / chờ Phương (B-88 cần thêm chuyến xe thật, B-95/B-96 cần iPhone thật, B-99 cần App lock + vân tay thật, B-107 cần chuyến tự động ngắn
  thật, B-113 nghi do script chạm toạ độ, B-121 để sau, B-60/B-66/B-71/B-78 nhỏ).
- **Lỗi nặng tìm được và đã sửa trong đợt:** B-115 🔴 Take photo không mở camera trên Android 7–9 (quyền bị plugin xoá) ✅ · B-102 🟠 hoá đơn ra £0.00
  khi ảnh nghiêng ✅ · B-103 🟠 chụp hoá đơn 15–18 s → ~4,3 s ✅ · B-105 🟠 tự điền giá 1 món làm tổng ✅ · B-108 🟠 hoá đơn cũ ghi sai năm thuế ✅ ·
  B-111 thư mục sao lưu Drive của Phương hỏng thật (đã chọn lại, sao lưu đêm bật) ✅ · B-117 🔴 iOS End trip treo (sửa, chờ iOS).
- **Phương quyết trong đợt:** B-106 giữ camera điện thoại (Samsung mở cam trước = giới hạn đã biết) · B-107 hỏi Discard/Keep · B-108 bỏ giới hạn
  400 ngày · thư mục sao lưu A006 + sao lưu đêm.

## Không kiểm được thật (⏭, không báo PASS)
- **iPhone thật:** chuyến tự động iOS (B-95/B-96 — 8 điểm trong `qa/findings/ios-auto-trips.md`), VoiceOver bằng tai, widget iOS trên máy.
- **Mua thật / dùng thử thật trên store** (không bấm Subscribe), Play Billing chỉ thử ở trạng thái DB.
- **Chạy xe thật nhiều lần** cho B-88 (chuyến tự động Android bị sót tối 17/11 — cần thêm file chẩn đoán sau chuyến xe).
- **TalkBack nghe bằng tai**; NFC thẻ thật; App lock + chờ > 1 phút với camera (B-99) — cần Phương.
- Xiaomi HyperOS thao tác (Test Lab chặn); Android 7 trên Firebase (không có).

## Chờ Phương
1. Xem câu xin quyền vị trí iOS mới (B-118, `app.json`) trước khi nộp App Store.
2. iOS bản cuối: build EAS `ios-simulator-preview` từ `ef470b7` → Appetize (~15 phút còn lại) để kiểm B-117 / B-114 / B-100 — tốn 1 lượt EAS.
3. GitHub Billing đang báo lỗi thanh toán (lượt 4f bị chặn kể cả repo công khai). Repo `A006-qa-ios` hiện **công khai** — khoá / xoá sau QA-100.
4. Bước 6: nội dung store nháp `store/listing.md` (Data safety có 2 điểm ❓), ảnh store, khoá ký → AAB + iOS, nộp — **chưa làm gì phần ký / nộp**.
