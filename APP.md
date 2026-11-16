# A006-sundaysort · Sunday Sort: Driver Expenses

> Brief tĩnh của app. **≤ 60 dòng, không ghi lịch sử** (lịch sử ở git + `memory/sessions/`).
> Tiến độ: `CHECKLIST.md` · Tính năng: `product.md` · Test: `TESTCASES.md` · Lỗi: `BUGS.md`.

**Đang ở:** bản 2 (`PLAN-v2.md`): P0–P4 xong, đã ghép S1b/S1c → **P5 Ghép & kiểm** `dev` `3e6f45e` (421 test): còn 50 case ⏳, lỗi B-41/42/43 chưa sửa, widget iOS chờ Appetize (build `ios-simulator-preview` afa5a63e), TalkBack + chạy xe cần Phương → rồi P6 (2026-11-16)

## Brief
- **Mã app / thư mục:** `A006-sundaysort` → `apps/A006-sundaysort/`
- **Repo:** https://github.com/phamphuongphuongnd/A006-sundaysort · **Bundle ID:** `com.phiotron.sundaysort`
- **Một câu mô tả:** Sổ thu chi cho tài xế van/courier tự kinh doanh: ghi khoản trong 10 giây không chọn danh mục,
  Chủ nhật phân loại cả tuần, ghi quãng đường, cuối năm thuế có sẵn tổng + file cho kế toán.
- **Người dùng mục tiêu:** tài xế van, courier, multi-drop, sole trader tự khai thuế ở UK (Self Assessment) và Mỹ (Schedule C).
- **Kiếm tiền:** miễn phí phần ghi + phân loại tay; **Pro thuê bao năm** (giá tạm £24.99, US theo tỷ giá), dùng thử 7 ngày trong app; không quảng cáo (product.md §6).
- **Nền tảng:** Android + iOS — **tất cả tính năng trong 1 bản**, không chia bản.
- **Ngôn ngữ / tiền tệ / vùng:** chỉ tiếng Anh (i18n dựng sẵn). Lần mở đầu chọn vùng: UK (£, năm thuế 6/4–5/4,
  danh mục SA103, dặm 55p/25p từ 6/4/2026) hoặc US ($, năm dương lịch, danh mục Schedule C, IRS rate). Đổi được trong Settings.
- **Thị trường:** UK + Mỹ ngang nhau.
- **Khác đối thủ ở đâu:** ghi nhanh không danh mục + phân loại tuần là bước chính + sửa/gộp/tách trên 1 màn;
  không tài khoản, không kết nối ngân hàng, dữ liệu không rời máy; chuyến tự động [Pro] + Start/Stop/NFC, luôn báo khi ngừng ghi (không sót âm thầm) + phát hiện chuyến sót + đối chiếu đồng hồ (miễn phí);
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
  expo-file-system + expo-document-picker · bản 2: expo-iap · react-native-nfc-manager · write-excel-file ·
  expo-background-task · expo-intent-launcher · @maplibre/maplibre-react-native (bản đồ OpenFreeMap, Q25) · module tự viết `modules/trip-detect`, `receipt-ocr`, `backup-folder` (PLAN-v2 §P3).
- **Build:** EAS Build (tài khoản Expo `phamthuphuong` đã đăng nhập trên máy). Thử Android trên Galaxy A13 qua adb.

## Cách làm app này
- 1–2 phiên chính; **Claude tự tạo phiên con khi hợp lý** (Phương cho phép 2026-11-11), mỗi phiên con 1 worktree,
  1 nhóm file riêng.

## Lệnh hay dùng
- Test: `npx jest` · Kiểm: `npx expo lint` + `npx tsc --noEmit` · Cài máy: `npx expo run:android --device` (ANDROID_HOME = `C:\Users\Admin\AppData\Local\Android\Sdk`)

## Lưu ý dễ vấp của app (mỗi ý 1 dòng)
- Widget + GPS nền cần dev build (không chạy trong Expo Go); widget iOS build trên EAS vì không có Mac.
- Năm thuế UK 6/4–5/4: khoản ngày 5/4 thuộc năm cũ, 6/4 thuộc năm mới.
- Tiền lưu số nguyên (pence/cent), không dùng float.
- React Compiler bật: `useLive` và file widget Android phải có `'use no memo'` (không thì màn không tự cập nhật / widget trắng).
- PDF (expo-print Android): không dùng `position: fixed` — WebView vẽ đè giữa trang.
- `useLive(query, deps, tables)`: khai đủ bảng mà truy vấn đọc + deps — thiếu bảng thì màn không tự cập nhật sau khi ghi.
- Danh sách dài: SQL thô `db.all(sql`…`)` (query builder Drizzle map từng dòng, chậm ~3× trên A13) + tải/vẽ theo trang.
- Icon: import từ `@/ui/icons` (thêm 1 dòng/icon), không import thẳng `lucide-react-native` (kéo ~2.000 icon lúc mở app).
- Font Inter Android nhúng bằng plugin `expo-font` (app.json): đổi font → `npx expo prebuild` lại.
- Thử máy qua adb: chờ chữ trên màn (`uiautomator dump`) rồi mới bấm, không bấm theo giờ chờ cố định.
- Điều hướng: import `router` từ `@/services/router` (không từ `expo-router`) — tránh crash khi Activity dựng lại (B-23).

## Retro (điền khi nộp store, 3 dòng)
- Chậm nhất ở đâu, vì sao:
- Thứ tái dùng được cho app sau:
- Cải tiến đề xuất cho Playbook:
