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
| Q16 | Giá | **Chỉ thuê bao năm** (chốt P0 2026-11-13); giá tạm **£24.99/năm**, Phương chỉnh sau; US quy đúng tỷ giá thực; không gói tháng / trọn đời |
| Q17 | Dùng thử | **7 ngày, không cần thẻ**; hết hạn chỉ tắt phần Pro |
| Q13 | Bước 6 cũ | Phiên Bước 6 sửa xong lỗi rồi dừng (B-27…B-36 đã sửa); **lên store sau P5** |
| Q18 | Bật chuyến không chạm máy (X5) | **Thêm thẻ NFC** (Android: chạm thẻ mở deep link bật/tắt chuyến; iOS: qua Phím tắt). **Bỏ Android Auto / CarPlay** (dễ bị store từ chối) — miễn phí |
| Q19 | Sửa giờ chuyến GPS | **Cho sửa** giờ đầu / cuối + số dặm; chuyến đã sửa có nhãn "Edited" trong sổ, báo cáo, CSV — miễn phí |
| Q20 | Máy tính trong ô số tiền | **Có** ("12.50+4.20" → 16.70) — miễn phí |
| Q21 | Nhiều ảnh lúc ghi nhanh | **Có** (2–3 ảnh khi ghi; tính vào giới hạn ảnh bản miễn phí; không giới hạn vẫn là Pro) |
| Q22 | Nhắc ghi hằng ngày | **Có**: 1 thông báo cuối ca nếu hôm đó chưa ghi khoản nào; **mặc định tắt** — miễn phí |
| Q23 | TalkBack | P5: Claude soạn kịch bản ~10 phút qua 6 màn chính, **Phương nghe trên A13**, báo chỗ đọc sai |
| Q24 | Cách tính xe (X2) | Cài đặt "Vehicle costs: Mileage rate / Actual costs" — **miễn phí** |

**Miễn phí / Pro** (Phương "No preference" → chốt theo mục 7 + đánh giá đối thủ):
- **Miễn phí:** ghi nhanh · phân loại Chủ nhật bằng tay · Start/Stop tay · ảnh hoá đơn có giới hạn (số chốt ở P1) · báo khi
  nghi sót · sao lưu tay + tự động · báo cáo xem trong app · **xuất toàn bộ dữ liệu thô (CSV)**.
- **Pro:** xuất file năm thuế (PDF, CSV tổng theo ô SA103 / Schedule C, CSV cho MTD, ZIP ảnh) · ảnh không giới hạn ·
  gợi ý danh mục + tự phân loại + OCR · chuyến tự động · khoản lặp lại.
- Cam kết: không quảng cáo; không khoá / xoá dữ liệu khi hết hạn; không tự gia hạn mà không báo trước.
- **Phương tạo** sản phẩm trong Play Console / App Store Connect (không tự tạo khoá / tài khoản).

## Quyết định P1 (grill 2026-11-13)
| # | Việc | Chốt |
|---|---|---|
| P1-1 | Dò chuyến | Cảm biến chuyển động + **nhận diện hoạt động** (lái xe / đi bộ / xe đạp) tự phát hiện bắt đầu & kết thúc; Bluetooth van / cắm sạc là tín hiệu thêm. Ngắt Bluetooth **không** dừng chuyến. Dừng (đi bộ / đứng yên) **< 20 phút** gộp vào cùng **chuyến ca**; giờ kết thúc lùi về lúc xe dừng thật. Settings đổi được 10 / 20 / 45 phút (Claude chốt số, Phương không chọn) |
| P1-2 | Gắn Work/Personal cho chuyến tự động | Chắc (tuyến/nơi quen, nối Bluetooth van, trong giờ làm) → tự gắn; không chắc → **Unsorted**, hiện ở màn Sort cùng khoản tiền; vuốt ở Miles vẫn được |
| P1-3 | Giờ làm (Work hours) | Có, **mặc định tắt**; bật thì ngoài giờ vẫn ghi nhưng tự gắn Personal |
| P1-4 | Ảnh bản miễn phí | **20 ảnh / tháng** (đếm cả nhiều ảnh/khoản), đếm ngược hiện rõ; hết lượt vẫn lưu khoản; ảnh đã có không bao giờ khoá |
| P1-5 | Dùng thử | **Trong app** (store bắt thẻ), 7 ngày, **bắt đầu khi người dùng bấm** "Try Pro free for 7 days" lúc chạm tính năng Pro đầu tiên |
| P1-6 | Cách tính xe (X2) | **Hỏi ở onboarding** (UK + US): Mileage rate / Actual costs / Not sure (= tạm theo dặm, báo cáo nhắc); đổi trong Settings |
| P1-7 | Sao lưu tự động | **Mỗi đêm nếu có đổi, giữ 7 bản**; ghi lỗi 3 lần liền → thẻ cảnh báo Home |
| P1-8 | File MTD (Pro) | **Cả 4**: MTD summary CSV (15 danh mục HMRC, cộng dồn, Standard/Calendar) · sổ chi tiết cột MTDsorted · FreeAgent Expenses + Mileage CSV · **.xlsx đúng mẫu MTDsorted** (P3 cài thư viện .xlsx) |
| P1-9 | Khoản lặp lại | Tự tạo đúng hạn, **đã phân loại**, nhãn "Recurring", không vào hàng chờ; màn Done ghi số khoản đã thêm |
| P1-10 | Luật tự phân loại | Cùng nơi bán → cùng danh mục 3 lần liền → **hỏi 1 chạm** "Always sort … as …?"; khoản tự xếp bỏ qua hàng chờ nhưng có "N auto-sorted — Review"; màn Rules trong Settings |
| P1-11 | Báo gia hạn | Thông báo + thẻ Home **7 ngày trước** ngày gia hạn, nút "Manage subscription"; màn Pro luôn ghi ngày gia hạn |
| P1-12 | OCR | Chụp khi ô trống → tự điền số tiền / nơi bán / ngày (tô "From receipt"); đã gõ số khác → chip "Receipt says £… — Use"; không đọc được thì im lặng |

## Các phase
| Phase | Ai | Việc | Ra gì | Xong khi |
|---|---|---|---|---|
| **P0 Nghiên cứu nốt** | Điều phối | ✅ **Xong 2026-11-13** → `research.md` §6–8. Reddit + dùng thử app + Facebook: bỏ / không xem được (Phương chốt); mẫu MTDsorted + FreeAgent đã đọc; giá Q16 đã chốt | `research.md` | ✅ |
| **P1 product.md v2** | Điều phối | Grill chi tiết bằng popup (ngưỡng tự dừng, thời gian gộp điểm dừng, giới hạn ảnh miễn phí, màn Pro, **X2 cách tính xe, X5 NFC / Android Auto, X6 giới hạn bản miễn phí**…) → **viết lại toàn bộ `product.md`**: mọi màn, nút, trạng thái, lỗi, chữ hiện trên app (tiếng Anh trong ngoặc kép), luồng tự động, màn Pro / dùng thử, dữ liệu mới, danh sách màn cho Claude Design. Sửa §1 bảng đối thủ, §10 (bỏ "không tự dò chuyến", "không mua trong app") | `product.md` v2 | Phương duyệt |
| **P2 Mockup Hi-Fi** | **Phương** | Gửi product.md v2 cho Claude Design → vẽ Hi-Fi toàn bộ app → export HTML + tokens vào `design/` | `design/` v2 | Phương báo xong |
| **P3 Nền chung** | Điều phối (tuần tự) | Cài **mọi** thư viện native mới, kể cả mua trong app (phiên con không cài); schema + migration (luật phân loại, khoản lặp lại, đoạn chuyến, cấu hình sao lưu, kết quả OCR, quyền Pro); **hàm chung kiểm Pro + dùng thử 7 ngày**; kiểu dữ liệu chung; khoá i18n; **UI kit + token + các màn không thuộc S1–S5 theo mockup v2**; **ô cài đặt "Vehicle costs" (Q24)**; **trang onboarding nói rõ giới hạn bản miễn phí (X6, nội dung do S5)**; **nội dung widget bản 2**; dev build chạy A13 | Commit `dev` | Test + lint + tsc xanh, A13 mở được |
| **P4 Song song** | 5 phiên con | Bảng dưới; mỗi phiên 1 worktree, nhánh riêng, báo về điều phối bằng SendMessage | 5 nhánh | Test xanh + thử A13 + báo xong |
| **P5 Ghép & kiểm** | Điều phối | Gộp 5 nhánh vào `dev`; thêm TESTCASES cho tính năng mới; chạy toàn bộ; **chạy xe thật** cho chuyến tự động (nhiều điểm dừng, đèn đỏ, đi bộ, ngồi nhà); **build + thử widget iOS trên EAS** (treo từ Bước 3); **TalkBack theo kịch bản, Phương nghe (Q23)** | BUGS.md | Chạy hết case |
| **P6 Sửa lỗi → store** | Điều phối (+ phiên con nếu nhiều lỗi) | Sửa BUGS → Bước 6: giả lập người dùng, store listing (nhấn: UK, không tài khoản, không ngân hàng, ghi không danh mục, tự động không sót âm thầm; **tiêu đề / mô tả ngắn dẫn bằng "receipt", kèm "mileage", "self assessment"** — K8), privacy, khoá ký (Phương tạo), AAB + iOS, nộp | Bản nộp store | CHECKLIST Bước 6 |

## P4 — 5 phiên song song (không 2 phiên cùng sửa 1 file)
| Phiên | Phạm vi | File chính |
|---|---|---|
| **S1 Chuyến tự động** | Tự bắt đầu (Bluetooth / cắm sạc / chuyển động), gộp điểm dừng thành chuyến ca, tự dừng, báo khi nghi sót, tách đoạn Cá nhân sau chuyến, khoá phần Pro; **thẻ NFC bật/tắt chuyến + hướng dẫn trong app (Q18)**; **sửa giờ đầu/cuối chuyến GPS, nhãn "Edited" (Q19)**; **vuốt phải = Công việc, trái = Cá nhân ở tab Miles, có Undo (mục 6.3)** | `modules/trip-detect/`, `src/features/trips/`, `src/app/trip/`, `src/app/(tabs)/miles.tsx` |
| **S2 Phân loại** | Thẻ Sort sửa / tách / gộp tại chỗ; luật tự phân loại + tuyến/nơi quen; số tiền là tín hiệu riêng | `src/app/(tabs)/sort.tsx`, `src/app/sort-list.tsx`, `src/domain/suggest.ts`, phần sort trong `src/features/entries/` |
| **S3 Đọc hoá đơn** | OCR trên máy → tự điền số tiền / nơi bán / ngày; đưa dữ liệu cho gợi ý qua giao diện chung từ P3 (không sửa `suggest.ts`); giới hạn ảnh miễn phí; **máy tính trong ô số tiền (Q20)**; **nhiều ảnh lúc ghi nhanh (Q21)** | `modules/receipt-ocr/`, `src/features/ocr/`, `src/app/capture.tsx`, `src/app/entry/[id].tsx` |
| **S4 Sao lưu & lặp lại** | Sao lưu tự động vào thư mục đã chọn; khoản lặp lại; nhắc tuần không tắt sau 4 tuần; **nhắc ghi hằng ngày, mặc định tắt (Q22)** | `src/features/backup/`, `src/features/recurring/`, `src/features/settings/notifications.ts`, `src/app/backup.tsx` |
| **S5 Báo cáo, Xuất MTD, Pro** | CSV đúng mẫu bridging + FreeAgent, **tổng cộng dồn từ đầu năm theo danh mục HMRC, kỳ chuẩn / theo lịch (X3)**; xử lý Unsorted trước khi xuất quý; màn mua Pro, khôi phục mua, dùng thử 7 ngày; **báo cáo + xuất theo cách tính xe (X2/Q24)**: theo dặm → chi phí chạy xe (xăng, sửa xe, bảo hiểm, thuế xe, thuê xe) không cộng vào ô thuế, ghi chú rõ; đỗ xe / cầu đường / congestion luôn cộng; theo chi phí thật → ẩn tiền theo dặm, hiện tỷ lệ dặm công việc / tổng dặm; **nội dung nói rõ giới hạn bản miễn phí (X6)** | `src/features/reports/buildExport.ts`, `src/domain/csv.ts`, `src/features/reports/ExportPanel.tsx`, `src/app/(tabs)/reports.tsx`, `src/features/reports/series.ts`, `src/features/reports/useReport.ts`, `src/features/pro/`, `src/app/pro.tsx` |

## Rủi ro kỹ thuật (grill ở P1, kiểm ở P3)
- Tự viết module dò chuyến: thử nhiều trên xe thật; Samsung tắt app nền → hướng dẫn tắt tối ưu pin trong app.
- iOS không có sự kiện Bluetooth xe khi chạy nền → iOS dựa vào CoreMotion "automotive" + thay đổi vị trí đáng kể.
- Sao lưu vào thư mục Drive qua trình chọn file: chưa chắc ghi ngầm được → thử sớm ở P3; dự phòng nhắc người dùng bấm.
- OCR: ML Kit (Android) / Vision (iOS), chạy trên máy.
- Mua trong app: thư viện cài ở P3; sản phẩm do Phương tạo trên 2 store.

## Lỗi / thiếu mới (research.md §7)
| # | Việc | Làm ở |
|---|---|---|
| **X1** | Mức dặm UK 2026/27 = **55p** cho 10.000 dặm đầu (áp dụng lùi từ 6/4/2026), 25p sau đó; A006 để cứng 45p | **Sửa ngay, trước P1** — kế hoạch chi tiết ở mục dưới |
| **X2** | Mức dặm cố định đã gồm xăng / bảo hiểm / sửa xe / MOT / thuế đường → cài đặt "Vehicle costs" (Q24) | P1 viết spec → P3 ô cài đặt → S5 báo cáo + xuất |
| **X3** | CSV MTD cộng dồn từ đầu năm + kỳ chuẩn / theo lịch | S5 |
| **X4** | Đối thủ UK chính: Driversnote; app UK mới miễn phí (MileClear, PocketReceipt) | P1 §1 + định vị |
| **X5** | Bật chuyến không chạm máy | Đã chốt Q18 (NFC, bỏ Android Auto/CarPlay) → S1 |
| **X6** | Nói rõ giới hạn bản miễn phí ngay lúc cài | P1 spec → P3 trang onboarding → S5 nội dung + màn Pro |

## Sửa X1 ngay — kế hoạch chi tiết (Phương duyệt 2026-11-13, làm ở phiên mới)
1. `src/domain/mileage.ts` `DEFAULT_RATES.UK`: giữ kỳ cũ `{10_000, 45}`, `{null, 25}` + thêm kỳ
   `{ upToMiles: 10_000, minorPerMile: 55, from: '2026-04-06' }`, `{ upToMiles: null, minorPerMile: 25, from: '2026-04-06' }`;
   chú thích nguồn: gov.uk policy paper 17/6/2026. Không đổi hàm — `mileageEstimateByDate`, `ratesOn`, `periodsIn` và
   `ratesLabel` (`src/features/reports/series.ts`) đã xử lý kỳ theo ngày; bậc 10.000 dặm đếm cộng dồn trong năm thuế.
2. `src/db/settingsRepo.ts` `getSettings`: `mileageRates.UK` lưu đúng mặc định cũ (45/10.000 + 25) → đọc ra mặc định mới;
   mức người dùng tự sửa giữ nguyên. Cũng áp cho dữ liệu khôi phục từ sao lưu (cùng đi qua `getSettings`).
3. `src/i18n/en.ts:247` `estimateUK` để cứng "(45p / 25p)": còn dùng thì đổi sang `{rates}`, không dùng thì xoá
   (màn Miles dùng `miles.hmrcRates` động; Reports dùng `reports.estimateUK` có `{rates}`).
4. Tài liệu: `product.md` (dòng 136, 327), `APP.md` (dòng 17), `TESTCASES.md` TC-135 + 1 case mới. Không sửa `design/`.
5. Test: sửa kỳ vọng năm 2026/27 trong `src/domain/__tests__/mileageRates.test.ts` và
   `src/features/reports/__tests__/reports.test.ts` (45p → 55p, nhãn "55p / 25p", ghi chú PDF); thêm: chuyến 5/4/2026 tính 45p,
   6/4/2026 tính 55p; vượt 10.000 dặm năm 2026/27; nhãn 2025/26 vẫn "45p / 25p"; `getSettings` đổi mức cũ đã lưu, giữ mức tự
   sửa. `splitMergeMileage.test.ts` dùng `mileageEstimate` (bỏ qua ngày) → không đổi.
6. Kiểm: `npx jest`, `npx expo lint`, `npx tsc --noEmit` xanh; Galaxy A13: Miles + Reports năm 2026/27 hiện "55p / 25p", tiền =
   dặm × 55p; Settings → Mileage rates có kỳ "From 6 Apr 2026"; năm 2025/26 vẫn 45p; PDF ghi "(55p / 25p)". Commit `dev`.

## Câu nhắn từng phase (Phương chép gửi)
- **Sửa X1 ngay (phiên mới, nhỏ):** "A006: làm theo PLAN-v2.md mục 'Sửa X1 ngay — kế hoạch chi tiết' (mức dặm UK 55p từ 6/4/2026), thử A13, commit dev."
- **P0 (mở phiên điều phối):** "Phiên điều phối A006 bản 2: đọc `apps/A006-sundaysort/PLAN-v2.md` và `research.md`, chạy P0
  phần còn lại (thử 4 app + Driversnote/TripLog trên giả lập, tải mẫu CSV bridging/FreeAgent, nhóm Facebook tài xế van).
  Câu hỏi đưa popup, có cả phần thu phí; đề xuất giá Pro." — kèm nội dung 5 luồng Reddit Phương dán.
- **P1:** "Chạy P1: grill tôi bằng popup chỗ còn mờ (ngưỡng tự dừng, gộp điểm dừng, giới hạn ảnh miễn phí, màn Pro, X2, X6, Q18–Q22),
  rồi viết lại toàn bộ `product.md` v2 cho Claude Design vẽ lại cả app. Xong gửi tôi duyệt."
- **P2 (gửi Claude Design kèm product.md v2):** "Vẽ Hi-Fi toàn bộ app Sunday Sort theo product.md đính kèm, iPhone 390×844 +
  Android 360×800, sáng + tối, một tay, đọc được ngoài nắng, chữ 200% không vỡ. Xuất HTML từng màn + tokens." → bỏ vào
  `design/` rồi nhắn phiên điều phối: "Mockup v2 đã ở design/, chạy P3."
- **P3 → P4:** "Chạy P3, xong tự mở 5 phiên S1–S5 cho P4, báo tôi từng phiên xong."
- **P5 → P6:** "Gộp 5 nhánh, chạy P5 (test toàn bộ + chạy xe thật), rồi P6."
- **Phiên dài (~150k token):** "/dong-phien" → phiên mới: "Tiếp tục điều phối A006 bản 2 từ CHECKLIST + PLAN-v2.md."
