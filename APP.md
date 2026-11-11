# A006-sundaysort · Sunday Sort: Driver Expenses

> Brief tĩnh của app. **≤ 60 dòng, không ghi lịch sử** (lịch sử ở git + `memory/sessions/`).
> Tiến độ: `CHECKLIST.md` · Tính năng: `product.md` · Test: `TESTCASES.md` · Lỗi: `BUGS.md`.

**Đang ở:** Bước 2 — Phương làm mockup ở Claude Design, chờ export vào `design/` (2026-11-11)

## Brief
- **Mã app / thư mục:** `A006-sundaysort` → `apps/A006-sundaysort/`
- **Repo:** https://github.com/phamphuongphuongnd/A006-sundaysort · **Bundle ID:** `com.phiotron.sundaysort`
- **Một câu mô tả:** Sổ thu chi cho tài xế van/courier tự kinh doanh: ghi khoản trong 10 giây không chọn danh mục,
  Chủ nhật phân loại cả tuần, ghi quãng đường, cuối năm thuế có sẵn tổng + file cho kế toán.
- **Người dùng mục tiêu:** tài xế van, courier, multi-drop, sole trader tự khai thuế ở UK (Self Assessment) và Mỹ (Schedule C).
- **Kiếm tiền:** miễn phí hoàn toàn — không quảng cáo, không mua trong app.
- **Nền tảng:** Android + iOS — **tất cả tính năng trong 1 bản**, không chia bản.
- **Ngôn ngữ / tiền tệ / vùng:** chỉ tiếng Anh (i18n dựng sẵn). Lần mở đầu chọn vùng: UK (£, năm thuế 6/4–5/4,
  danh mục SA103, dặm 45p/25p) hoặc US ($, năm dương lịch, danh mục Schedule C, IRS rate). Đổi được trong Settings.
- **Thị trường:** UK + Mỹ ngang nhau.
- **Khác đối thủ ở đâu:** ghi nhanh không danh mục + phân loại tuần là bước chính + sửa/gộp/tách trên 1 màn;
  không tài khoản, không kết nối ngân hàng, dữ liệu không rời máy; GPS bấm Start/Stop (không tự dò → không sót âm thầm);
  miễn phí, không thu phí âm thầm.
- **Cố ý không làm:** không tư vấn khoản nào được trừ thuế; không nộp thuế/MTD thay (chỉ xuất CSV quý + năm cho
  phần mềm cầu nối/kế toán, ghi rõ "not MTD software").

## Công nghệ
- **FE:** React Native + Expo (TypeScript), expo-router.
- **BE:** không có (không server).
- **DB:** SQLite trên máy (expo-sqlite + Drizzle). Ảnh hoá đơn trong thư mục app. Sao lưu = 1 file (dữ liệu + ảnh)
  qua share sheet; khôi phục từ file; nhắc nếu > 30 ngày chưa sao lưu.
- **Đăng nhập / đồng bộ:** không (yêu cầu file ý tưởng §6.2: "không cần tạo tài khoản").
- **Native:** expo-location + expo-task-manager (GPS nền) · react-native-android-widget + @bacons/apple-targets
  (widget iOS) · expo-local-authentication · expo-notifications (local) · expo-image-picker · expo-print + expo-sharing ·
  expo-file-system + expo-document-picker.
- **Build:** EAS Build (Phương tự tạo tài khoản Expo + `eas login`). Thử Android trên Galaxy A13 qua adb.

## Cách làm app này
- 1–2 phiên chính; **Claude tự tạo phiên con khi hợp lý** (Phương cho phép 2026-11-11), mỗi phiên con 1 worktree,
  1 nhóm file riêng.

## Lệnh hay dùng
- Test: `npx jest` · Kiểm: `npx expo lint` + `npx tsc --noEmit` · Cài máy: `npx expo run:android --device` (ANDROID_HOME = C:SERSADMINAPPDATAocalandroidsdk)

## Lưu ý dễ vấp của app (mỗi ý 1 dòng)
- Widget + GPS nền cần dev build (không chạy trong Expo Go); widget iOS build trên EAS vì không có Mac.
- Năm thuế UK 6/4–5/4: khoản ngày 5/4 thuộc năm cũ, 6/4 thuộc năm mới.
- Tiền lưu số nguyên (pence/cent), không dùng float.

## Retro (điền khi nộp store, 3 dòng)
- Chậm nhất ở đâu, vì sao:
- Thứ tái dùng được cho app sau:
- Cải tiến đề xuất cho Playbook:
