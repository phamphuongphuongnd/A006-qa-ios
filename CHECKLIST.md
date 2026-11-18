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
- [x] Mockup đủ mọi màn trong `design/` (68 màn, tokens.json, sunday.css)

## Bước 3 — Làm app theo mockup
- [x] Phương: tạo tài khoản Expo + `eas login` trên máy (đã đăng nhập: phamthuphuong)
- [x] Khung Expo (TS, expo-router đủ route, theme tạm, i18n EN, Jest, eas.json, CI lint+test)
- [x] Thay theme tạm (`src/theme/tokens.ts`) bằng token từ mockup + font Inter
- [x] Bộ UI kit dùng chung `src/ui/` (từ sunday.css) + `useLive` + gallery `/dev/gallery`
- [x] Dữ liệu & logic: schema SQLite/Drizzle, repository, năm thuế UK/US + quý, tiền số nguyên + unit test
- [x] F-09 Gợi ý danh mục (từ khoá sẵn + lịch sử) + unit test
- [x] F-01 Onboarding (S-01a–d)
- [x] F-02 Ghi nhanh (S-03) + phím tắt icon app
- [x] F-03 Home (S-02)
- [x] F-04 Entries + chọn nhiều + lọc/tìm (S-04)
- [x] F-05 Chi tiết & sửa khoản + ảnh hoá đơn (S-05)
- [x] F-06 Tách khoản (S-06b)
- [x] F-07 Gộp khoản
- [x] F-08 Phân loại tuần: thẻ, List view, Done (S-06, S-06a, S-06c)
- [x] F-10 Danh mục (S-11)
- [x] F-11 Quãng đường nhập tay (S-08)
- [x] F-12 Chuyến GPS nền Start/Stop/Personal stop + thông báo + nhắc 12h + phát hiện ngắt (S-07a, S-07b) — lọc nhiễu đứng yên đã thử trên máy (0.0 mi / 4 phút); chạy xe thật 2026-11-13: 2 chuyến (3.3 mi, 2.9 mi), Phương xác nhận quãng đường đúng
- [x] F-13 Tab Miles (S-07) + mức dặm theo khoảng ngày (IRS 2026: 72.5¢ tới 30/6, 76¢ từ 1/7)
- [x] F-14 Báo cáo năm/quý (S-09)
- [x] F-15 Xuất CSV ×3 + PDF + ZIP ảnh (S-10)
- [x] F-16 Sao lưu & khôi phục + nhắc 30 ngày (S-12)
- [x] F-17 Nhắc phân loại hằng tuần (thông báo local)
- [x] F-18 Khoá app sinh trắc (S-13) — Phương thử vân tay OK 2026-11-12
- [x] F-19 Widget Android (2×1, 4×2)
- [ ] F-19 Widget iOS (nhỏ, vừa) — build EAS
- [x] F-20 Settings (S-15) + xoá toàn bộ dữ liệu
- [x] F-21 Not tax advice (S-16) + icon app + splash
- [x] Toàn bộ test xanh + dev build chạy trên Galaxy A13 → gộp `dev` → `main` (2026-11-13, `de880c6`)

## Bước 4 — Test toàn bộ (chỉ ghi lỗi)
- [x] Viết TESTCASES.md (100–200 case) — 200 case
- [x] Chạy hết case (test tự động + thử máy) → BUGS.md — 180 ✅ · 16 ❌ · 4 ⏭ (chạy xe thật, TalkBack nghe thật, mở PDF, widget iOS); 24 lỗi

## Bước 5 — Sửa lỗi
- [x] Tăng tốc app (Phương báo chậm): truy vấn chỉ chạy lại theo bảng, Entries FlashList + tải theo trang, SQL thô, vuốt dòng nhẹ, Miles vẽ dần, icon/font khởi động — `073f86a`..`be72dc6`
- [x] Sửa hết BUGS.md (tick trong BUGS.md) — 24/24
- [x] Chạy lại toàn bộ test + case từng lỗi → gộp `dev` → `main` — 162 test, lint, tsc xanh; mỗi lỗi đã thử A13 khi tick; `main` = `de880c6`

## Bước 6 — Kiểm cuối & lên store
- [x] Giả lập người dùng thật trên máy, xem giao diện từng màn — cài mới, vai UK + US, tối / 200% / 320dp, vân tay, widget, TalkBack nghe thật (Phương): 10 mục mới B-27…B-36 sửa + thử A13 (`6c87170`, `bd04cfe`, `40493d6`)
- [ ] **Bản 2 — tự động + Pro: xem `PLAN-v2.md` (P0–P6)** — Phương chốt 2026-11-13: dừng Bước 6 ở đây, lên store sau bản 2
  - [ ] **QA-100 (bản 2, 2026-11-17/18)** — 100 người dùng mô phỏng, Android + iOS + máy thật (`qa/QA-100-REPORT.md`, TC-366…TC-391):
        bản cuối `b843037`; B-56…B-121: 45 sửa + kiểm trên máy, còn lại chờ kiểm (phiên A Android 17, phiên C iOS 4g, Firebase ngày mai)
        hoặc cần máy thật / Phương duyệt giới hạn (B-88, B-95/96, B-99, B-107, B-113). Xong khi BUGS tick hết hoặc Phương duyệt lý do.
- [ ] Store listing + privacy + Data safety / App Privacy + ảnh store — nháp `store/listing.md` (chờ Phương duyệt, Data safety 2 điểm ❓)
- [ ] Phương tạo khoá ký → tag `v1.0.0` → AAB + iOS
- [ ] checklists release-android + release-ios
- [ ] Nộp Google Play (closed test) + App Store (TestFlight)
- [ ] Retro 3 dòng APP.md + 1 dòng METRICS.md
