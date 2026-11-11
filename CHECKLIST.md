# A006-sundaysort — Checklist

> Làm từ trên xuống, xong mục nào (đã kiểm) tick `[x]` + commit rồi mới sang mục sau. Mỗi việc **1 dòng**.
> Việc mới phát sinh → thêm dòng vào đúng bước, không làm ngay. Quy trình: `playbook/PLAYBOOK.md`.

## Bước 1 — Grill & product.md
- [x] Cấp mã, thư mục, APP.md, CHECKLIST.md, git `main` + `dev`
- [x] Link repo (hỏi Phương) → tạo/nối repo, ghi REGISTRY
- [x] Bảng chức năng 3–4 đối thủ + tra trùng tên 2 store
- [x] Grill: toàn bộ tính năng, kiếm tiền, tên, bundle ID → APP.md
- [x] Grill công nghệ: FE / BE / DB / đăng nhập → APP.md (+ ADR nếu cần)
- [x] Viết product.md (từng màn, từng nút, trạng thái)
- [x] Điền danh sách bước 3 từ product.md
- [x] Phương duyệt product.md

## Bước 2 — Mockup Hi-Fi (Phương làm ở Claude Design)
- [ ] Mockup đủ mọi màn trong `design/`

## Bước 3 — Làm app theo mockup
- [x] Phương: tạo tài khoản Expo + `eas login` trên máy (đã đăng nhập: phamthuphuong)
- [x] Khung Expo (TS, expo-router đủ route, theme tạm, i18n EN, Jest, eas.json, CI lint+test)
- [ ] Thay theme tạm (`src/theme/tokens.ts`) bằng token từ mockup
- [x] Dữ liệu & logic: schema SQLite/Drizzle, repository, năm thuế UK/US + quý, tiền số nguyên + unit test
- [x] F-09 Gợi ý danh mục (từ khoá sẵn + lịch sử) + unit test
- [ ] F-01 Onboarding (S-01a–d)
- [ ] F-02 Ghi nhanh (S-03) + phím tắt icon app
- [ ] F-03 Home (S-02)
- [ ] F-04 Entries + chọn nhiều + lọc/tìm (S-04)
- [ ] F-05 Chi tiết & sửa khoản + ảnh hoá đơn (S-05)
- [ ] F-06 Tách khoản (S-06b)
- [ ] F-07 Gộp khoản
- [ ] F-08 Phân loại tuần: thẻ, List view, Done (S-06, S-06a, S-06c)
- [ ] F-10 Danh mục (S-11)
- [ ] F-11 Quãng đường nhập tay (S-08)
- [ ] F-12 Chuyến GPS nền Start/Stop/Personal stop + thông báo + nhắc 12h + phát hiện ngắt (S-07a, S-07b)
- [ ] F-13 Tab Miles (S-07) + mức dặm theo khoảng ngày (IRS 2026: 72.5¢ tới 30/6, 76¢ từ 1/7)
- [ ] F-14 Báo cáo năm/quý (S-09)
- [ ] F-15 Xuất CSV ×3 + PDF + ZIP ảnh (S-10)
- [ ] F-16 Sao lưu & khôi phục + nhắc 30 ngày (S-12)
- [ ] F-17 Nhắc phân loại hằng tuần (thông báo local)
- [ ] F-18 Khoá app sinh trắc (S-13)
- [ ] F-19 Widget Android (2×1, 4×2)
- [ ] F-19 Widget iOS (nhỏ, vừa) — build EAS
- [ ] F-20 Settings (S-15) + xoá toàn bộ dữ liệu
- [ ] F-21 Not tax advice (S-16) + icon app + splash
- [ ] Toàn bộ test xanh + dev build chạy trên Galaxy A13 → gộp `dev` → `main`

## Bước 4 — Test toàn bộ (chỉ ghi lỗi)
- [ ] Viết TESTCASES.md (100–200 case)
- [ ] Chạy hết case (test tự động + thử máy) → BUGS.md

## Bước 5 — Sửa lỗi
- [ ] Sửa hết BUGS.md (tick trong BUGS.md)
- [ ] Chạy lại toàn bộ test + case từng lỗi → gộp `dev` → `main`

## Bước 6 — Kiểm cuối & lên store
- [ ] Giả lập người dùng thật trên máy, xem giao diện từng màn
- [ ] Store listing + privacy + Data safety / App Privacy + ảnh store
- [ ] Phương tạo khoá ký → tag `v1.0.0` → AAB + iOS
- [ ] checklists release-android + release-ios
- [ ] Nộp Google Play (closed test) + App Store (TestFlight)
- [ ] Retro 3 dòng APP.md + 1 dòng METRICS.md
