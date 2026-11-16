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
| Q25 | A→B + bản đồ thật (2026-11-16) | **A→B (Pro)** qua **openrouteservice** gói miễn phí (directions + geocode/autocomplete; khoá `EXPO_PUBLIC_ORS_KEY` trong `.env`, Phương tạo) + **bản đồ thật miễn phí** **MapLibre** (`@maplibre/maplibre-react-native`) + **OpenFreeMap** (style `https://tiles.openfreemap.org/styles/liberty`, không khoá) ở S-07b, S-07c, Miles, A→B; thiếu mạng / khoá → hình phác hoạ. **Không Mapbox.** Privacy: địa chỉ A→B gửi openrouteservice, ảnh nền tải từ OpenFreeMap (không gửi tuyến GPS). Làm ở phiên **S1b**, migration `0002` |
| Q26 | Phát hiện chuyến bị sót giữa 2 chuyến (2026-11-16) | **Miễn phí.** 2 chuyến liền nhau có toạ độ (gps/auto/nfc), 30 ngày gần nhất: điểm cuối chuyến trước → điểm đầu chuyến sau **≥ 1 mi** chim bay → dòng "Missing trip?" ở Miles + thẻ Home; ước tính **chim bay × 1,25** ("≈ estimated"), Pro + có mạng → quãng đường thật qua openrouteservice (hàm A→B). "Add" → S-08 điền sẵn (Unsorted, `source = gap`, nhãn "Estimated"); "Not a trip" → không hiện lại. Lý do: đánh giá 6 tháng gần nhất (2.526 cái, 16/11) — lời chê kỹ thuật số 1 của đối thủ là sót chuyến **âm thầm**. Dùng thẻ/sheet có sẵn mockup v2. Làm ở **S1b** · Bỏ qua khoảng trống > 500 mi chim bay hoặc cần > 100 mph (S1c thêm sau khi thử; Phương không chọn → Claude chốt giữ) |
| Q27 | Đối chiếu đồng hồ dặm (2026-11-16) | **Miễn phí.** Settings → Trips → "Odometer check" Off / Weekly / **Monthly (mặc định)** + nhắc 6/4; nhập số đồng hồ (+ ảnh tuỳ chọn, không tính 20 ảnh/tháng); so mức tăng đồng hồ với tổng dặm app ghi giữa 2 lần nhập: thiếu hoặc thừa ≥ **max(10 mi, 5%)** → thẻ Home ("114 mi not logged" → "Add missing miles" / "That's fine"; thừa → "Review trips"). Dùng thẻ/sheet có sẵn mockup v2. Làm ở **S1b** |
| Q28 | Parking & tolls trên chuyến (2026-11-16, thử thật MileIQ) | **Miễn phí.** Ô số tiền ở End trip / Trip detail / Add trip → 1 khoản Expense "Parking, tolls & congestion" gắn chuyến (`entries.trip_id`); xoá chuyến hỏi giữ/xoá khoản. Spec `product.md` F-23. Phiên **S6** |
| Q29 | Đánh dấu đã xuất (MileIQ "reported") | **Miễn phí**, mọi loại xuất ở S-10: `exported_at` trên khoản/chuyến, nhãn "Exported", sửa sau khi xuất → báo + "N changes since your last export". S6 |
| Q30 | Recently deleted 30 ngày (Cash Book, MileIQ) | **Miễn phí.** Bảng `trash` (ảnh chụp dòng), ảnh giữ tới khi dọn, màn S-21 Restore / Delete now / Empty, tự dọn > 30 ngày; Undo giữ nguyên; không vào sao lưu. S6 |
| Q31 | Saved trips (Everlance Favorite Trips) | **Miễn phí.** Bảng `saved_trips`; lưu từ Trip detail, chip ở Add trip điền sẵn + Round trip; Settings → Regular trips. Tính tuyến mới A→B vẫn Pro. S6 |
| Q16b | Gói trọn đời / không tự gia hạn (2026-11-16, Cash Book + Self Employed có) | **Không đổi** — giữ chỉ gói năm (Phương chốt) |

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
| **P1 product.md v2** | Điều phối | ✅ **Xong 2026-11-13**: grill P1-1…P1-12 (bảng trên) → `product.md` v2 viết lại toàn bộ (§6 Free/Pro, §10 danh sách màn) + `CONTEXT.md` thuật ngữ; **Phương đã duyệt** | `product.md` v2 | ✅ |
| **P2 Mockup Hi-Fi** | ✅ **Xong 2026-11-13** (Phương) | Gửi product.md v2 cho Claude Design → vẽ Hi-Fi toàn bộ app → export HTML + tokens vào `design/` | `design/` v2 | Phương báo xong |
| **P3 Nền chung** | Điều phối (tuần tự) | Cài **mọi** thư viện native mới, kể cả mua trong app (phiên con không cài); schema + migration (luật phân loại, khoản lặp lại, đoạn chuyến, cấu hình sao lưu, kết quả OCR, quyền Pro); **hàm chung kiểm Pro + dùng thử 7 ngày**; kiểu dữ liệu chung; khoá i18n; **UI kit + token + các màn không thuộc S1–S5 theo mockup v2**; **ô cài đặt "Vehicle costs" (Q24)**; **trang onboarding nói rõ giới hạn bản miễn phí (X6, nội dung do S5)**; **nội dung widget bản 2**; dev build chạy A13 | Commit `dev` | ✅ **Xong 2026-11-13** (`0665bf3`, `078ac63`) |
| **P4 Song song** | 5 phiên con | Bảng dưới; mỗi phiên 1 worktree, nhánh riêng, báo về điều phối bằng SendMessage | 5 nhánh | ✅ **Xong 2026-11-16**: ghép `dev` @ `9b58632`, 375 test — xem "P4 — kết quả" |
| **P5 Ghép & kiểm** | Điều phối | Gộp 5 nhánh vào `dev`; thêm TESTCASES cho tính năng mới; chạy toàn bộ; **chạy xe thật** cho chuyến tự động (nhiều điểm dừng, đèn đỏ, đi bộ, ngồi nhà; **tắt app giữa ca → thấy "Missing trip" (Q26); nhập 2 mốc đồng hồ → thấy thẻ thiếu dặm (Q27)**; TESTCASES cho Q26/Q27); **build + thử widget iOS trên EAS** (treo từ Bước 3); **TalkBack theo kịch bản, Phương nghe (Q23)** | BUGS.md | Chạy hết case |
| **P6 Sửa lỗi → store** | Điều phối (+ phiên con nếu nhiều lỗi) | Sửa BUGS → Bước 6: giả lập người dùng, store listing (nhấn: UK, không tài khoản, không ngân hàng, ghi không danh mục, tự động không sót âm thầm; **tiêu đề / mô tả ngắn dẫn bằng "receipt", kèm "mileage", "self assessment"** — K8), privacy, khoá ký (Phương tạo), AAB + iOS, nộp | Bản nộp store | CHECKLIST Bước 6 |

## P4 — 5 phiên song song (không 2 phiên cùng sửa 1 file)
| Phiên | Phạm vi | File chính |
|---|---|---|
| **S1 Chuyến tự động** | Tự bắt đầu (Bluetooth / cắm sạc / chuyển động), gộp điểm dừng thành chuyến ca, tự dừng, báo khi nghi sót, tách đoạn Cá nhân sau chuyến, khoá phần Pro; **thẻ NFC bật/tắt chuyến + hướng dẫn trong app (Q18)**; **sửa giờ đầu/cuối chuyến GPS, nhãn "Edited" (Q19)**; **vuốt phải = Công việc, trái = Cá nhân ở tab Miles, có Undo (mục 6.3)** | `modules/trip-detect/`, `src/features/trips/`, `src/app/trip/`, `src/app/(tabs)/miles.tsx` |
| **S2 Phân loại** | Thẻ Sort sửa / tách / gộp tại chỗ; luật tự phân loại + tuyến/nơi quen; số tiền là tín hiệu riêng | `src/app/(tabs)/sort.tsx`, `src/app/sort-list.tsx`, `src/domain/suggest.ts`, phần sort trong `src/features/entries/` |
| **S3 Đọc hoá đơn** | OCR trên máy → tự điền số tiền / nơi bán / ngày; đưa dữ liệu cho gợi ý qua giao diện chung từ P3 (không sửa `suggest.ts`); giới hạn ảnh miễn phí; **máy tính trong ô số tiền (Q20)**; **nhiều ảnh lúc ghi nhanh (Q21)** | `modules/receipt-ocr/`, `src/features/ocr/`, `src/app/capture.tsx`, `src/app/entry/[id].tsx` |
| **S4 Sao lưu & lặp lại** | Sao lưu tự động vào thư mục đã chọn; khoản lặp lại; nhắc tuần không tắt sau 4 tuần; **nhắc ghi hằng ngày, mặc định tắt (Q22)** | `src/features/backup/`, `src/features/recurring/`, `src/features/settings/notifications.ts`, `src/app/backup.tsx` |
| **S5 Báo cáo, Xuất MTD, Pro** | CSV đúng mẫu bridging + FreeAgent, **tổng cộng dồn từ đầu năm theo danh mục HMRC, kỳ chuẩn / theo lịch (X3)**; xử lý Unsorted trước khi xuất quý; màn mua Pro, khôi phục mua, dùng thử 7 ngày; **báo cáo + xuất theo cách tính xe (X2/Q24)**: theo dặm → chi phí chạy xe (xăng, sửa xe, bảo hiểm, thuế xe, thuê xe) không cộng vào ô thuế, ghi chú rõ; đỗ xe / cầu đường / congestion luôn cộng; theo chi phí thật → ẩn tiền theo dặm, hiện tỷ lệ dặm công việc / tổng dặm; **nội dung nói rõ giới hạn bản miễn phí (X6)** | `src/features/reports/buildExport.ts`, `src/domain/csv.ts`, `src/features/reports/ExportPanel.tsx`, `src/app/(tabs)/reports.tsx`, `src/features/reports/series.ts`, `src/features/reports/useReport.ts`, `src/features/pro/`, `src/app/pro.tsx` |
| **S6 Ý từ thử đối thủ** (2026-11-16, Q28–Q31) | Recently deleted, Parking & tolls trên chuyến, Saved trips, nhãn Exported — migration **`0004`**; worktree `../A006-wt/s6-competitor-ideas`, ghép `dev` khi P5 rảnh | `src/db/schema.ts`, `src/db/entriesRepo.ts`, `src/db/tripsRepo.ts`, `src/features/trash/` (mới), `src/features/savedTrips/` (mới), `src/app/recently-deleted.tsx` (mới), `src/app/trip/`, `src/features/trips/detail/`, `src/app/(tabs)/miles.tsx`, `src/features/reports/buildExport.ts` + `ExportPanel.tsx`, `src/i18n/v2/s6.ts` |

## P4 — kết quả (2026-11-16)
- Ghép `dev` `9b58632` (đã push): S5 `1712459`, S4 `431a9ef`, S3 `cc7fba8`, S2 `b5b9309`, S1 `0a3e0ba`; điều phối nối S1↔S2 tuyến quen
  (`trips/auto/routes.ts` → `rules/knownRoutes.ts`), S3→S2 luật lúc lưu (`ocr/rulesHook.ts` → `applyRulesOnSave`), S4↔S5
  (`syncProNotices` trong task đêm + S-20, `refreshProFromStore` lúc mở app). Bàn giao từng phiên:
  `side-session-notes/local_e1e02b93-41f5-44db-a7b2-f83cc14de3e9/P4-S*-handover.md`.
- Đã thử A13 trên bản ghép: Home, Sort (Free) + Undo, List view, Rules (khoá), Miles, Reports theo cách tính xe, Entries,
  S-19 (không bấm mua / dùng thử), S-12, S-17, S-20, máy tính ô số tiền, OCR Shell £72.40 (sửa lỗi đọc nhầm SUBTOTAL);
  S1 thử S-07c/d/e/f, giả lập lái xe → chuyến Auto, vuốt Miles, đăng ký lại sau cài đè. Máy đang cài **dev build của S1** (native mới).
- **Để P5:** luồng chỉ Pro chưa thử trên máy (Suggested, "Always" tạo luật, Auto-sorted review, khoản lặp lại tạo đúng hạn,
  OCR tự điền ở S-03) — dùng thử 7 ngày chỉ 1 lần trên máy Phương → cần Pro giả cho bản dev hoặc máy khác; tự kết thúc chuyến
  sau 20' đứng yên; BOOT_COMPLETED (khởi động lại máy); NFC (A13 không có NFC); mua thật (chờ sản phẩm `sundaysort_pro_annual`);
  iOS (EAS: widget, backup-folder, trip-detect); nhập file vào MTDsorted / FreeAgent thật; TESTCASES tính năng mới; TalkBack
  (Undo snackbar đã thành nút riêng, giữ 10 s khi bật trình đọc màn hình).
- **Mới — Q25 (Phương chốt 2026-11-16):** A→B (Pro) qua openrouteservice + bản đồ thật MapLibre / OpenFreeMap → phiên **S1b**.
  `@maplibre/maplibre-react-native` 11.5.1 + plugin `app.json` đã cài trên `dev` (cần prebuild + build lại dev client);
  migration của S1b = **`0002`** (cột from/to Trip + bảng `places` + **`odometer_reading`**, **`trip_gap_dismissal`**).
  **S1b làm thêm Q26 (Missing trip) + Q27 (Odometer check)** — cùng chạm `miles.tsx` / dữ liệu chuyến nên không tách phiên. ⚠️ `plugins/withReleasePermissions.js` gỡ INTERNET ở bản
  release + product.md / privacy hứa "không mạng, dữ liệu không rời máy" → S1b phải giữ INTERNET ở release và sửa product.md
  (§0, §11, F-12/F-13 phác hoạ → bản đồ); P6 sửa privacy policy + Data safety.

## Rủi ro kỹ thuật (grill ở P1, kiểm ở P3)
- Tự viết module dò chuyến: thử nhiều trên xe thật; Samsung tắt app nền → hướng dẫn tắt tối ưu pin trong app.
- iOS không có sự kiện Bluetooth xe khi chạy nền → iOS dựa vào CoreMotion "automotive" + thay đổi vị trí đáng kể.
- Sao lưu vào thư mục Drive qua trình chọn file: chưa chắc ghi ngầm được → thử sớm ở P3; dự phòng nhắc người dùng bấm.
- OCR: ML Kit (Android) / Vision (iOS), chạy trên máy.
- Mua trong app: thư viện cài ở P3; sản phẩm do Phương tạo trên 2 store.

**Kết quả thử sớm trên Galaxy A13 (2026-11-13, dev build, màn `sundaysort://dev/probe` chỉ bản dev):**
- ✅ **Ghi ngầm vào thư mục Google Drive:** chọn thư mục Drive "A006" qua trình chọn hệ thống (Android giữ quyền vĩnh viễn) →
  ghi tiền cảnh được; tác vụ `expo-background-task` chạy **headless** (không màn hình, JS khởi động lại từ đầu, ép chạy bằng
  `cmd jobscheduler run -f -n androidx.work.systemjobscheduler com.phiotron.sundaysort <id>`) ghi được file vào Drive.
  → Sao lưu đêm (S4) đi đường này; dự phòng "Tap to finish last night's backup" chỉ khi ghi lỗi. Còn lại: thử máy không
  mạng (Drive xếp hàng tải lên) + thử bản release.
- ⚠️ `expo-background-task` luôn đòi "có mạng" (WorkManager `NetworkType.CONNECTED`) → cần quyền `ACCESS_NETWORK_STATE`
  (Android 9+ ném lỗi nếu thiếu); bản release từng gỡ quyền này → **đã giữ lại** trong `plugins/withReleasePermissions.js`.
  Hệ quả: máy không mạng thì đêm đó không sao lưu (đếm lỗi khi > 24 giờ chưa chạy, không chỉ khi ghi lỗi).
- ✅ **Nhận diện hoạt động:** quyền + đăng ký chuyển trạng thái chạy nền thành công; receiver nhận "still" (100%) và sự kiện
  `still enter`. **Lái xe / đi bộ chưa thử được** (máy cắm cáp, đứng yên) → để S1 / P5 chạy xe thật (Phương); đăng ký chuyển
  trạng thái vẫn bật trên A13, sự kiện lưu trong `EventLog` (xem bằng nút "Events" ở màn probe).
- ✅ Migration 0001 chạy trên dữ liệu thật của A13 (233 khoản, 264 chuyến): 12 danh mục có MTD + cờ chi phí xe đúng §5.
- ✅ Manifest bản release (đã kiểm `processReleaseMainManifest`): giữ BILLING, NFC, ACTIVITY_RECOGNITION, BLUETOOTH_CONNECT,
  ACCESS_NETWORK_STATE; vẫn gỡ INTERNET; có meta-data ML Kit + bộ lọc thẻ NFC.
- File thử trong Drive "A006" của Phương: `probe-foreground-…txt`, `probe-background-…txt` — xoá tay được.

## P3 — nền chung đã làm (phần không cần mockup, 2026-11-13)
**Thư viện đã cài (phiên con KHÔNG cài thêm):**
| Việc | Chọn | Lý do ngắn |
|---|---|---|
| Mua trong app | `expo-iap` 6.4 | Module Expo (OpenIAP), Play Billing 8 + StoreKit 2, không cần server / RevenueCat (không tài khoản, không khoá); config plugin sẵn. Mã sản phẩm tạm `sundaysort_pro_annual` (`src/domain/pro.ts`) — Phương tạo đúng mã này trên 2 store |
| NFC (ghi thẻ Android) | `react-native-nfc-manager` 4.2 | Thư viện NFC duy nhất còn bảo trì; **không** dùng plugin của nó (luôn thêm entitlement NFC iOS cần bật capability trong tài khoản Apple) → `plugins/withNfcTripTag.js`: chỉ Android, intent-filter `NDEF_DISCOVERED` `sundaysort://trip/...` (chạm thẻ mở app thẳng). iOS dùng Phím tắt như product.md |
| Tạo .xlsx | `write-excel-file` 4.1 | Nhỏ, chỉ phụ thuộc `fflate` (đã có); có bản `universal` chạy trong RN. ExcelJS / SheetJS nặng + phụ thuộc Node |
| Chạy nền định kỳ (sao lưu đêm, khoản lặp lại) | `expo-background-task` | WorkManager (Android) / BGTaskScheduler (iOS), cùng SDK 58 |
| Mở cài đặt pin / ứng dụng | `expo-intent-launcher` | S-07e bước 4, S-07f "Open battery settings" |
| Chọn thư mục + ghi sao lưu | `expo-file-system` (có sẵn) | Android: `Directory.pickDirectoryAsync()` giữ quyền SAF vĩnh viễn (takePersistableUriPermission). iOS: URL hết hạn khi tắt app → module `modules/backup-folder/` (bookmark) |
| Nhận diện hoạt động (foreground) | `expo-location` (có sẵn) | SDK 58 có `watchMotionActivityAsync` + quyền motion; bật `isAndroidMotionActivityEnabled` + `motionUsagePermission` trong app.json |

**Module tự viết (`modules/`):**
- `trip-detect/` (S1): Android — chuyển trạng thái hoạt động **chạy nền kể cả khi app tắt** (PendingIntent → `TripDetectReceiver`), lấy mẫu thô để thử, Bluetooth ACL nối/ngắt (receiver trong manifest, được miễn giới hạn broadcast Android 8), cắm sạc (chỉ receiver lúc chạy — Android 8+ không gửi cho manifest), danh sách thiết bị đã ghép; mọi tín hiệu ghi vào sổ `EventLog` (SharedPreferences, 200 dòng) + phát `onSignal` khi JS sống. iOS — CoreMotion live + `queryActivities` (đọc lùi ~7 ngày để lùi giờ bắt đầu). Việc S1: bắt đầu/kết thúc chuyến từ tín hiệu, đăng ký lại sau khởi động máy, dịch vụ vị trí từ nền (Android 12+ được miễn khi có sự kiện activity transition).
- `receipt-ocr/` (S3): `recognize(uri)` → dòng chữ + khung chuẩn hoá 0..1 (ML Kit bản tải qua Play services, ~0 MB trong APK; iOS Vision). Model tải lúc cài: meta-data chỉ ở bản release (`plugins/withReleasePermissions.js`) vì bản debug trùng khoá với expo-dev-launcher.
- `backup-folder/` (S4, iOS): bookmark thư mục + copyInto / list / copyOut / remove. **Chưa build iOS** (cần EAS, P5).

**Dữ liệu (migration `0001_v2_automation_pro`):** bảng `trip_stops`, `trip_segments`, `rules`, `rule_offers`, `recurring`,
`known_routes`, `pro_state`; cột mới Entry (`source`, `rule_id`, `recurring_id`, `auto_reviewed_at`, `ocr_*`), Receipt
(`ocr_text`), Category (`mtd_category`, `vehicle_running_cost` — điền sẵn theo §5), Trip (`started_by` thay cho `source`
gps/auto/nfc của §8 để không vỡ chỗ đang kiểm `source === 'gps'`; `scope` thêm `unsorted`; `original_*`; `classified_by`).
Sao lưu lên bản 2 (file bản 1 vẫn khôi phục được; khôi phục / "Delete all data" không đụng `pro_state`).
**Hàm chung:** `src/domain/pro.ts` + `src/db/proRepo.ts` + `usePro()` / `usePhotoAllowance()` (`src/state/pro.ts`);
`src/domain/vehicleCosts.ts` + `src/db/vehicleCostsRepo.ts` (Q24, hỏi lại khi đổi giữa năm); `src/domain/receiptSignal.ts`
(OCR → gợi ý / luật, S3 không sửa `suggest.ts`); `src/domain/mtd.ts` (15 HMRC category); Settings mới trong `settingsRepo.ts`;
i18n: mỗi phiên 1 file `src/i18n/v2/<tên>.ts` (S1 `autoTrip`, S2 `sortV2`, S3 `ocr`, S4 `backupAuto`, S5 `mtd` + `pro`).

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
