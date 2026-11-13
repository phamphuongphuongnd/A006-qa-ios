# A006-sundaysort — Kế hoạch bản 2: tự động + Pro (chốt 2026-11-13)

> Đọc file này là chạy được, không cần đọc lại phiên khảo sát. Lý do / số liệu: `research.md`.
> Phiên điều phối mới chạy P0 → P6; phiên con chỉ mở ở P4 (Phương đã duyệt 5 phiên). Câu hỏi quyết định → popup,
> luôn hỏi cả phần thu phí khi đụng tính năng Pro.

## Quyết định Phương đã chốt
| # | Việc | Chốt |
|---|---|---|
| Q1 | Tự động ghi chuyến | **Kết hợp**: tự bắt đầu khi nối Bluetooth van hoặc cắm sạc; dự phòng dò chuyển động; gộp điểm dừng ngắn thành 1 chuyến ca; tự dừng khi đứng yên lâu; **giữ Start/Stop tay** |
| Q2 | Tự động khác | Cả 4: **báo khi nghi sót** (nhiều ngày làm không có chuyến, GPS im khi đang ghi, quên Stop) · **tự phân loại khi chắc** (luật nơi bán → danh mục, tuyến/nơi quen → Công việc/Cá nhân; không chắc mới vào hàng chờ Chủ nhật) · **sao lưu tự động** · **khoản lặp lại** |
| Q3 | MTD / UK | Làm **nguồn ghi cho phần mềm MTD**: giữ "not MTD software"; CSV đúng mẫu nhập của 1–2 bridging + FreeAgent (thử thật); xử lý khoản Unsorted trước khi xuất quý |
| Q5 | Màn Sort | **Sửa / tách / gộp ngay trên thẻ**, không rời màn |
| Q6 | Điểm dừng cá nhân | **Tách đoạn sau chuyến** (chạm điểm dừng trên phác hoạ → đoạn rẽ đi/về thành Cá nhân) **+ giữ nút Personal stop** |
| Q7 | Ảnh hoá đơn | **OCR trên máy trước khi lên store**: tự điền số tiền, nơi bán, ngày; đưa vào gợi ý danh mục; ảnh không rời máy |
| Q9 | Module chuyến | **Tự viết module native** (miễn phí): Android ActivityRecognition + sự kiện Bluetooth / cắm sạc; iOS CoreMotion (iOS không bắt được nối Bluetooth xe khi chạy nền) |
| Q10 | Sao lưu tự động | Người dùng **chọn thư mục 1 lần** (Google Drive / iCloud Drive), app tự ghi file định kỳ — không khoá; phải thử Drive ghi ngầm trên A13 |
| Q11 | Mockup | **Claude Design vẽ lại toàn bộ app** từ product.md v2 |
| Q15 | Thu phí | **Theo mục 7 file ý tưởng**: miễn phí phần ghi nhanh; trả phí xuất file năm thuế, ảnh hoá đơn không giới hạn, gợi ý danh mục |
| Q16 | Giá | P0 nghiên cứu (đối thủ UK/US + app mua 1 lần cùng loại) → **đề xuất kiểu thu (mua 1 lần / thuê bao) + giá bằng popup** |
| Q17 | Dùng thử | **7 ngày, không cần thẻ**; hết hạn chỉ tắt phần Pro |
| Q13 | Bước 6 cũ | Phiên Bước 6 sửa xong lỗi rồi dừng (B-27…B-36 đã sửa); **lên store sau P5** |

**Miễn phí / Pro** (Phương "No preference" → chốt theo mục 7 + đánh giá đối thủ):
- **Miễn phí:** ghi nhanh · phân loại Chủ nhật bằng tay · Start/Stop tay · ảnh hoá đơn có giới hạn (số chốt ở P1) · báo khi
  nghi sót · sao lưu tay + tự động · báo cáo xem trong app · **xuất toàn bộ dữ liệu thô (CSV)**.
- **Pro:** xuất file năm thuế (PDF, CSV tổng theo ô SA103 / Schedule C, CSV cho MTD, ZIP ảnh) · ảnh không giới hạn ·
  gợi ý danh mục + tự phân loại + OCR · chuyến tự động · khoản lặp lại.
- Cam kết: không quảng cáo; không khoá / xoá dữ liệu khi hết hạn; không tự gia hạn mà không báo trước.
- **Phương tạo** sản phẩm trong Play Console / App Store Connect (không tự tạo khoá / tài khoản).

## Các phase
| Phase | Ai | Việc | Ra gì | Xong khi |
|---|---|---|---|---|
| **P0 Nghiên cứu nốt** | Điều phối | (0) Cập nhật CHECKLIST / APP.md / TASKS theo file này **sau khi phiên Bước 6 đã dừng** (tránh 2 phiên cùng sửa). (1) Đọc 5 luồng Reddit trong file ý tưởng bằng **Claude in Chrome**. (2) Trình giả lập `Medium_Phone_API_37.0`: Phương đăng nhập Google Play + tự đăng ký app → cài MileIQ, Everlance, Hurdlr, Cash Book → thử ghi khoản, phân loại, chuyến (`adb emu geo fix` / GPX), xuất file; đếm số chạm so với A006; xong gỡ app. (3) Nghiên cứu giá → popup Q16 | Bổ sung `research.md` | Phương đọc, chốt giá |
| **P1 product.md v2** | Điều phối | Grill chi tiết bằng popup (ngưỡng tự dừng, thời gian gộp điểm dừng, giới hạn ảnh miễn phí, màn Pro…) → **viết lại toàn bộ `product.md`**: mọi màn, nút, trạng thái, lỗi, chữ hiện trên app (tiếng Anh trong ngoặc kép), luồng tự động, màn Pro / dùng thử, dữ liệu mới, danh sách màn cho Claude Design. Sửa §1 bảng đối thủ, §10 (bỏ "không tự dò chuyến", "không mua trong app") | `product.md` v2 | Phương duyệt |
| **P2 Mockup Hi-Fi** | **Phương** | Gửi product.md v2 cho Claude Design → vẽ Hi-Fi toàn bộ app → export HTML + tokens vào `design/` | `design/` v2 | Phương báo xong |
| **P3 Nền chung** | Điều phối (tuần tự) | Cài **mọi** thư viện native mới, kể cả mua trong app (phiên con không cài); schema + migration (luật phân loại, khoản lặp lại, đoạn chuyến, cấu hình sao lưu, kết quả OCR, quyền Pro); **hàm chung kiểm Pro + dùng thử 7 ngày**; kiểu dữ liệu chung; khoá i18n; **UI kit + token + các màn không thuộc S1–S5 theo mockup v2**; dev build chạy A13 | Commit `dev` | Test + lint + tsc xanh, A13 mở được |
| **P4 Song song** | 5 phiên con | Bảng dưới; mỗi phiên 1 worktree, nhánh riêng, báo về điều phối bằng SendMessage | 5 nhánh | Test xanh + thử A13 + báo xong |
| **P5 Ghép & kiểm** | Điều phối | Gộp 5 nhánh vào `dev`; thêm TESTCASES cho tính năng mới; chạy toàn bộ; **chạy xe thật** cho chuyến tự động (nhiều điểm dừng, đèn đỏ, đi bộ, ngồi nhà) | BUGS.md | Chạy hết case |
| **P6 Sửa lỗi → store** | Điều phối (+ phiên con nếu nhiều lỗi) | Sửa BUGS → Bước 6: giả lập người dùng, store listing (nhấn: UK, không tài khoản, không ngân hàng, ghi không danh mục, tự động không sót âm thầm), privacy, khoá ký (Phương tạo), AAB + iOS, nộp | Bản nộp store | CHECKLIST Bước 6 |

## P4 — 5 phiên song song (không 2 phiên cùng sửa 1 file)
| Phiên | Phạm vi | File chính |
|---|---|---|
| **S1 Chuyến tự động** | Tự bắt đầu (Bluetooth / cắm sạc / chuyển động), gộp điểm dừng thành chuyến ca, tự dừng, báo khi nghi sót, tách đoạn Cá nhân sau chuyến, khoá phần Pro | `modules/trip-detect/`, `src/features/trips/`, `src/app/trip/`, `src/app/(tabs)/miles.tsx` |
| **S2 Phân loại** | Thẻ Sort sửa / tách / gộp tại chỗ; luật tự phân loại + tuyến/nơi quen; số tiền là tín hiệu riêng | `src/app/(tabs)/sort.tsx`, `src/app/sort-list.tsx`, `src/domain/suggest.ts`, phần sort trong `src/features/entries/` |
| **S3 Đọc hoá đơn** | OCR trên máy → tự điền số tiền / nơi bán / ngày; đưa dữ liệu cho gợi ý qua giao diện chung từ P3 (không sửa `suggest.ts`); giới hạn ảnh miễn phí | `modules/receipt-ocr/`, `src/features/ocr/`, `src/app/capture.tsx`, `src/app/entry/[id].tsx` |
| **S4 Sao lưu & lặp lại** | Sao lưu tự động vào thư mục đã chọn; khoản lặp lại; nhắc tuần không tắt sau 4 tuần | `src/features/backup/`, `src/features/recurring/`, `src/features/settings/notifications.ts`, `src/app/backup.tsx` |
| **S5 Xuất MTD + Pro** | CSV đúng mẫu bridging + FreeAgent; xử lý Unsorted trước khi xuất quý; màn mua Pro, khôi phục mua, dùng thử 7 ngày | `src/features/reports/buildExport.ts`, `src/domain/csv.ts`, `src/features/reports/ExportPanel.tsx`, `src/features/pro/`, `src/app/pro.tsx` |

## Rủi ro kỹ thuật (grill ở P1, kiểm ở P3)
- Tự viết module dò chuyến: thử nhiều trên xe thật; Samsung tắt app nền → hướng dẫn tắt tối ưu pin trong app.
- iOS không có sự kiện Bluetooth xe khi chạy nền → iOS dựa vào CoreMotion "automotive" + thay đổi vị trí đáng kể.
- Sao lưu vào thư mục Drive qua trình chọn file: chưa chắc ghi ngầm được → thử sớm ở P3; dự phòng nhắc người dùng bấm.
- OCR: ML Kit (Android) / Vision (iOS), chạy trên máy.
- Mua trong app: thư viện cài ở P3; sản phẩm do Phương tạo trên 2 store.

## Mở phiên điều phối mới
Gõ cho phiên mới: "Phiên điều phối A006 bản 2: đọc `apps/A006-sundaysort/PLAN-v2.md` và `research.md`, chạy P0."
