# A006-sundaysort — Lỗi (bước 4–6)

> Bước 4 chỉ ghi, bước 5 sửa từ nặng tới nhẹ. Sửa xong + test hồi quy → tick `[x]` và ghi commit.
> Mức: 🔴 chặn/sai dữ liệu · 🟠 sai chức năng · 🟡 giao diện/chữ.
> Thử trên Galaxy A13, APK release `f211b38`, dữ liệu mẫu khôi phục từ file sao lưu dựng sẵn (2026-11-12).

- [x] **B-01** 🔴 Thẻ Sort: khoản đã đánh **Personal** bị lật thành **Work** khi chạm chip danh mục — công tắc Work/Personal trên thẻ
  lấy gợi ý lịch sử và đè phạm vi người dùng đã chọn → chi tiêu cá nhân bị tính vào chi phí kinh doanh — case TC-094 —
  tái hiện: tách "Shell M62 £72.40" thành 60.00 Work + 12.40 **Personal** → tab Sort, thẻ £12.40 có nhãn "Personal" nhưng công tắc
  sáng "Work" → chạm "Fuel" → Entries hiện "Shell M62, −£12.40, Fuel, **Work**". (List view "Accept all" giữ đúng Personal.) — commit: `4e1e67d` — thử A13: thẻ Personal giữ Personal, Entries "Fuel, Personal"
- [x] **B-02** 🟠 Sao lưu: huỷ bảng chia sẻ vẫn ghi "Last backup …" → banner Home và nhắc 30 ngày tắt dù chưa có file nào được lưu —
  case TC-168 — tái hiện: Settings → Backup & restore → "Back up now" → bấm Back đóng bảng chia sẻ → "Last backup 12 Nov 2026, 11:58". — commit: `c286d92` — thử A13: đóng share sheet → hỏi "Did the backup file get saved?" → Not saved → vẫn "Never backed up"
- [x] **B-03** 🟠 Settings › About thiếu "Privacy policy" (mở web) và "Contact" (mở email) theo product.md F-20 — case TC-189 —
  tái hiện: Settings → cuộn xuống ABOUT: chỉ có How Sunday Sort works, Not tax advice, Rate the app, Version. Cần Phương cho link
  privacy policy + email liên hệ. — commit: `16c8f35` — Privacy policy mở https://phamphuongphuongnd.github.io/sundaysort-privacy/ (repo public riêng, Phương duyệt 2026-11-12); Contact ẩn tới Bước 6 khi chốt email — thử A13: hàng "Privacy policy" có trong About
- [x] **B-04** 🟠 FAB "+" chỉ có ở tab Entries; Sort / Miles / Reports không có (product.md §4 + F-02: "trên các tab khác có FAB") —
  case TC-019 — tái hiện: mở tab Sort / Miles / Reports, không có nút "+". Mockup cũng chỉ vẽ FAB ở Entries → Phương chọn theo
  product.md hay theo mockup. — commit: `ee5e150` — thử A13: FAB ở Sort/Miles/Reports, không đè thẻ Sort
- [x] **B-05** 🟡 Chữ gợi ý (placeholder) đậm như dữ liệu thật: số đồng hồ "48,210" / "48,338" ở Add trip, "e.g. Amazon route DLS4"
  ở Add trip và Edit trip, ô "DELETE" ở hộp thoại xoá toàn bộ (trông như đã gõ, nút đỏ trông bấm được nhưng không làm gì) —
  case TC-119, TC-188 — tái hiện: Miles → Add manually: ô trống trông như đã điền số. — commit: `d33b3f7` — thử A13: placeholder nhạt, nét thường, có "e.g."; nút Delete all mờ tới khi gõ DELETE (máy đang bật chữ tương phản cao nên chữ nhạt có viền — do cài đặt máy)
- [x] **B-06** 🟡 Reports › "By tax form line" có 2 dòng "Unsorted" giống hệt (một của thu £620.00, một của chi £420.67), không biết
  dòng nào là thu/chi — case TC-148 — tái hiện: Reports → Year, kỳ có cả thu và chi chưa phân loại → cuộn tới bảng SA103. — commit: `f78bdbe` — thử A13: "Unsorted income" / "Unsorted expenses"
- [x] **B-07** 🟡 Mở Entries từ Reports (chạm cột danh mục): chip lọc đang bật ("Selected period", "Fuel") nằm khuất cuối hàng chip,
  màn đầu chỉ thấy "All" không sáng → không biết danh sách đang bị lọc; "Selected period" không nói kỳ nào — case TC-147 —
  tái hiện: Reports → chạm cột "Fuel" → Entries. — commit: `c1dcf10` — thử A13: chip bật lên đầu, kỳ "6 Apr 2026 – 5 Apr 2027"
- [x] **B-08** 🟡 Widget Android 2×1: nút "−" / "+" không có nhãn trợ năng (TalkBack không đọc gì; widget 4×2 thì có) — case TC-180 —
  tái hiện: `uiautomator dump` trên màn hình chính: 2 nút của widget 2×1 không có `content-desc`. — commit: `829d58a` — thử A13: nút widget 2×1 có content-desc "New expense"/"New income"; viên "x to sort" có nhãn "12 to sort" (đã thử bản `4a66c4e`)
- [x] **B-09** 🟠 Tab Miles không cập nhật trạng thái quyền vị trí: từ chối quyền ở S-07a thì thẻ "GPS trips need location access"
  không hiện (kể cả chuyển tab); cấp lại quyền trong Cài đặt rồi quay lại app thì thẻ vẫn còn — chỉ đúng sau khi mở lại app —
  case TC-121 — tái hiện: Start trip → Allow location → "Không cho phép" → tab Miles không có thẻ; buộc dừng + mở lại thì có. — commit: `e6e7288` — thử A13: thu hồi quyền → thẻ "GPS trips need location access" hiện ngay; cấp lại + quay lại app → thẻ mất, không cần mở lại app
- [x] **B-10** 🟡 Khi chạy chuyến có 2 thông báo cùng lúc: "Sunday Sort · trip recording / Recording your route until you end the trip."
  (dịch vụ nền) và "Trip running · x mi" (có nút) — product.md chỉ 1 thông báo cố định — case TC-124 — tái hiện: Start trip → kéo
  thanh thông báo. — commit: `3a93276`, `9a50703` — không sửa thêm: Samsung luôn hiện thông báo dịch vụ GPS (kênh MIN vẫn hiện); Phương chấp nhận 2 thông báo 2026-11-12, product.md đã ghi — thử lại 2026-11-13 bản `ba29652`: đúng 2 thông báo; nút End trip trên thông báo mở "Trip saved", cả 2 thông báo tắt, dịch vụ GPS hết foreground
- [x] **B-11** 🟠 Thẻ "Your trip stopped recording at …" chỉ hiện ở tab Miles; mockup đặt ở Home khi mở app lần sau (Home không gắn
  `InterruptedTripCard`) → người không mở Miles sẽ không biết chuyến bị ngắt — case TC-132 — tái hiện: Start trip → thu hồi quyền vị
  trí → mở app: Home không có thẻ cam, Miles có. — commit: `1c03509` — thử A13: chuyến bị ngắt (thu hồi quyền) → Home hiện "Your trip stopped recording…"; kèm sửa điểm GPS cũ `829d58a`
- [x] **B-12** 🟡 Giao diện tối: thanh điều hướng hệ thống Android vẫn trắng — case TC-187 — tái hiện: Settings → Theme Dark. — commit: `ca62a5e`, `9a50703`, sửa thật ở commit `fix B-12` (module `modules/system-bars`) — gốc: androidx core 1.18 trên Android 11–14 chỉ đổi cờ systemUiVisibility cũ, hệ thống bỏ qua vì cửa sổ đã ở chế độ appearance mới → gọi thẳng `setSystemBarsAppearance` (cả cửa sổ Modal) — thử A13 (nav 3 nút, máy Light): Dark → thanh tối nút trắng (apr không còn LIGHT_NAVIGATION_BARS); Light/System → thanh sáng; mở/đóng sheet Region, ra nền rồi vào lại vẫn đúng. Thử lại 2026-11-13 máy Dark (Phương bật): app Light → thanh sáng nút tối (cả khi mở sheet, mở nguội, ra nền vào lại); app System → thanh tối
- [x] **B-13** 🟡 Distance unit = Kilometres: Miles / Reports đổi sang km nhưng thẻ "This week" ở Home vẫn "Business miles 179" (đúng
  phải ~288 km) — case TC-186 — tái hiện: Settings → Distance unit → Kilometres → Home. — commit: `d5fb2ca` — thử A13: Home "Business km 246" (= 153 mi)
- [x] **B-14** 🟠 Đổi vùng UK → US: các khoản giữ £ (đúng như hộp thoại) nhưng tổng ở Home/Reports gắn ký hiệu $ cho số tiền bảng
  ("$278.41" cộng từ các khoản £) — case TC-184 — tái hiện: dữ liệu UK → Settings → Region → United States → Home. Cần Phương chọn
  cách xử lý (cảnh báo / tách theo tiền tệ / chặn đổi khi đã có dữ liệu). — commit: `dbd7f17` — thử A13: UK → US tỷ giá 1.27: 234 khoản quy đổi, In £620 → $787.40, £12.40 → $15.75, năm thuế 2026; dữ liệu demo đã khôi phục lại
- [x] **B-15** 🟠 Màn Mileage rates: nút "Save" bị thanh điều hướng hệ thống che nửa dưới (cả sáng và tối) — case TC-185 —
  tái hiện: Settings → Mileage rates. — commit: `db53f99` — thử A13: nút Save đáy 2239 px, thanh điều hướng từ 2273 px
- [x] **B-16** 🟡 Widget ghi "1 to sort" (chỉ tuần này) trong khi badge tab Sort / Home ghi 2 (mọi tuần) — 2 con số khác nhau cho
  cùng một việc — case TC-182 — tái hiện: có khoản chưa phân loại ở tuần trước → so widget với badge. Phương chọn đếm kiểu nào. — commit: `2356f10` — thử A13: widget "12 to sort" = badge Sort 12
- [x] **B-17** 🟡 Deep link `sundaysort://trip/start` (product.md §4) mở "Edit trip · This trip no longer exists."; app thực dùng
  `sundaysort://trip/active?start=1` — case TC-191 — tái hiện: `adb shell am start -d sundaysort://trip/start`. Sửa link hoặc
  product.md cho khớp. — commit: `7d8f7ff` — thử A13: `sundaysort://trip/start` mở màn chuyến đang ghi
- [x] **B-18** 🟠 Khôi phục sao lưu khi đang chạy chuyến: dữ liệu chuyến mất đúng nhưng thông báo "Trip running · 0.0 mi" và
  dịch vụ ghi vị trí vẫn chạy; bấm "End trip" trên thông báo không xoá được nó (chỉ hết khi buộc dừng app) — case TC-171 —
  tái hiện: Start trip → Settings → Restore from backup → Replace → kéo thanh thông báo. — commit: `4d07e01` — thử A13: chạy chuyến → khôi phục A006-big → không còn thông báo, dịch vụ GPS hết foreground
- [x] **B-19** 🟠 APK khai quyền thừa so với app không mạng / không push: `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`,
  `com.google.android.c2dm.permission.RECEIVE`, `INTERNET` (+ quyền badge của nhiều hãng launcher) — ảnh hưởng Data safety và
  câu "dữ liệu không rời máy" — case TC-198 — tái hiện: `aapt2 dump permissions app-release.apk`. — commit: `38be276` — aapt2: APK release chỉ còn vị trí, dịch vụ nền, thông báo, sinh trắc, camera, wake lock
- [x] **B-20** 🟠 Cuộn Entries giật với dữ liệu lớn (1.515 khoản): 50% khung hình 61–101 ms, 90% 150–250 ms trên Galaxy A13
  (mượt cần ≤ 16 ms) — case TC-175 — tái hiện: khôi phục file 1.500 khoản → Entries → vuốt nhanh; `dumpsys gfxinfo`. — commit: `be72dc6` (nhánh perf/speed) — **cải thiện, chưa đạt ≤ 16 ms**:
  đo lại cùng cách (1.515 khoản, 20 lần vuốt): khung hình vẽ được 98 → 413, giật 20% → 11%, p90 89 → 44 ms, p99 200 → 61 ms.
  Đo lại 2026-11-12 tối (bản `9a50703`, cùng cách): 1.052 khung hình, giật 7,9%, p50 36 ms, p90 48 ms, p95 57 ms — máy đang bật chữ tương phản cao (vẽ chữ chậm hơn). Chờ Phương: chấp nhận hay làm đợt tối ưu riêng.
  Đợt tối ưu 2026-11-13 (A/B trên A13, cùng kịch bản 20 lần vuốt nhanh, 1.515 khoản, máy bật chữ tương phản cao): luồng JS bận
  ~như nhau ở mọi biến thể (FlashList đo lại ô mỗi lần cuộn, không làm giật vì cuộn chạy native); giật đến từ dựng lại dòng trên luồng UI.
  Sửa: ô tái dùng theo icon danh mục (không dựng lại SVG) + SwipeRow chỉ gắn transform khi đang vuốt → giật 16% → 8,5%, p90 69 → 48 ms,
  p99 ~110 → 77 ms (p50 ~33 ms không đổi). Dòng tối giản 1 chữ (giới hạn dưới) đạt 1%, p90 24 ms → phần còn lại là chữ + Pressable của dòng.
  Đã thử không có lợi: luôn gắn sẵn nhãn Personal/kẹp giấy. Phương chấp nhận mức này 2026-11-13 (commit `838f3fa`).
- [x] **B-21** 🟡 Mở Ghi nhanh qua màn khoá (widget / thông báo khi App lock bật): sau khi mở khoá, bàn phím số không tự bật
  (product.md: "bàn phím số tự bật"), dòng "No category needed…" nằm dưới thanh điều hướng — case TC-178 — tái hiện: App lock +
  Immediately → ra màn hình chính → widget 2×1 "−" → mở khoá vân tay. — commit: `41195ac` — thử A13: App lock + Immediately → widget "−" → Phương mở khoá vân tay → bàn phím số tự bật (mInputShown=true), dòng "No category needed…" hiện đủ; App lock đã tắt lại
- [x] **B-22** 🟡 Màn 320dp: nút "Add manually" ở tab Miles bị cắt thành "Add manua…" — case TC-194 — tái hiện: Thu phóng màn hình
  lớn nhất (density 540 = 320dp) → Miles. — commit: `38ac936` — thử A13 mật độ 540 (320dp): "Start trip" / "Add manually" xếp 2 hàng, đủ chữ
- [x] **B-23** 🔴 App tắt đột ngột ở lần bấm đầu sau khi đổi cỡ chữ hệ thống: "JavascriptException: The imperative router is
  unavailable before the first render has finished" (router.push trong onPress) — case TC-195 — tái hiện: app đang chạy nền →
  đổi Cỡ chữ trong Cài đặt máy → mở lại app → bấm "− Expense" ngay → app tắt. Mở lại lần sau thì không lỗi. Có thể cũng xảy ra với
  đổi chế độ tối / ngôn ngữ máy (đều dựng lại Activity). — commit: `3304de9` — thử A13: app ở nền → đổi cỡ chữ 0.8→1.3 và 1.3→1.0 → mở lại, bấm "− Expense" liên tục ngay khi mở: Ghi nhanh mở, không crash, logcat không có JavascriptException
- [x] **B-24** 🟡 Cỡ chữ 200%: số tiền vẫn hiện đủ nhưng nhiều nhãn bị cắt / vỡ: Ghi nhanh "Expens/e" xuống dòng, 3 nhãn
  "Photo · Tap for Personal · Note" dính thành một dòng; "This week ·..", "Kwik Fi..", "Unsorte..", "Add ma..", "Busine.."; badge số
  đè icon tab Sort — case TC-195 — tái hiện: Cỡ chữ lớn nhất (font_scale 2.0) → các tab. — commit: `41b6c0e`, thẻ Sort cuộn `4a66c4e` — thử A13 font_scale 2.0: Home nhãn xuống dòng gọn, badge không đè icon, Ghi nhanh không vỡ chữ, Miles nút xếp 2 hàng, thẻ Sort cuộn được tới Edit/Split/Skip
- [x] **B-25** 🟡 Khôi phục từ file sao lưu xong, Settings vẫn ghi "Backup & restore · Never" và Home hiện "You haven't backed up yet" —
  trạng thái sao lưu lấy theo nội dung file (đóng gói trước khi bấm "Yes, saved") — tìm thấy khi thử lại B-10/B-12 (2026-11-13) —
  tái hiện: Back up now → lưu lên Drive → Yes, saved → Restore from backup → chọn file vừa lưu → Replace → Settings: "Never". — commit: `fix B-25` (khôi phục đặt Last backup = ngày tạo file, bỏ hoãn banner) — thử A13: khôi phục file Drive 13/11 → "Last backup 13 Nov 2026, 09:03", Home hết banner, dữ liệu nguyên (8,478 mi)
- [x] **B-26** 🟡 PDF báo cáo (mở xem thật lần đầu 2026-11-13, bản in xem trước trên A13): số liệu đúng (cộng tay khớp từng bảng)
  nhưng trình bày thô — bảng sang trang không lặp tiêu đề cột; chữ "work"/"expense"/"income" viết thường; "8477.5 business miles"
  không dấu phẩy (app ghi 8,478); nhật ký dặm mới→cũ còn bảng khoản cũ→mới; cột Note căn phải — case TC-160 —
  tái hiện: Export → chỉ PDF → Export anyway → share sheet → In (xem trước). — commit: `fix B-26` (thead lặp mỗi trang, nhãn Work/Personal/Income/Expense, số dặm có dấu phẩy, nhật ký dặm cũ→mới, căn cột) — thử A13 bản xem trước 6 trang: tiêu đề cột lặp ở trang 2–6, "8,478 business miles", số liệu không đổi

## Bước 6 — giả lập người dùng thật (2026-11-13, APK release `14cbdf0`, cài mới)

- [x] **B-27** 🟠 Snackbar có Undo nằm đè lên FAB "+" (Entries/Sort/Miles/Reports): bấm Undo trễ một chút (snackbar vừa tắt ở giây
  thứ 5) thì cú bấm rơi xuống FAB → mở Ghi nhanh, không Undo được → người dùng tưởng đã Undo nhưng khoản vẫn bị xoá —
  tái hiện: Entries → vuốt trái 1 dòng → Delete → chờ ~5 s → bấm "Undo" → mở màn Ghi nhanh, dòng vẫn mất. — sửa: snackbar nổi trên FAB (FAB báo vị trí khi màn đang hiện) — thử A13: snackbar ở trên nút +, Undo khôi phục dòng; bấm chỗ cũ sau khi snackbar tắt không mở Ghi nhanh
- [x] **B-28** 🟡 Màn giải thích quyền vị trí (S-07a bước 1 và 2): nút "Not now" ở đáy bị thanh điều hướng hệ thống che nửa chữ —
  nút nằm cuối nội dung cuộn nhưng không cộng inset đáy — tái hiện: cài mới → Miles → Start trip → nhìn đáy màn. — sửa: đệm inset đáy cho nội dung màn quyền — thử A13: "Not now" nằm trọn trên thanh hệ thống
- [x] **B-29** 🟡 PDF báo cáo: tiêu đề mục ("Mileage log") có thể nằm trơ cuối trang, bảng của nó sang trang sau — tái hiện: dữ liệu
  ít (6 khoản, 1 chuyến) → Export chỉ PDF → share sheet → In: trang 1 kết thúc bằng "Mileage log", bảng ở đầu trang 2. — sửa: h2 break-after: avoid — thử A13 bản In xem trước: "Mileage log" sang trang 2 cùng bảng
- [x] **B-30** 🟡 Settings › About: hàng "Privacy policy" hiện cả mũi tên mở web ↗ lẫn chevron > (mockup S-15 chỉ có ↗) — tái hiện:
  Settings → cuộn tới ABOUT. — sửa: NavRow `external` — thử A13: chỉ còn ↗
- [x] **B-31** 🟠 Thêm/sửa danh mục: ô "Tax form line" của danh mục **Expense** vẫn cho chọn dòng thu ("SA103: Turnover", "Other business
  income"; US: "Line 1 Gross receipts", "Line 6 Other income") và ngược lại → báo cáo/PDF/CSV cho kế toán có thể cộng chi phí vào
  doanh thu — tái hiện: Settings → Categories → + → Expense → Tax form line: danh sách bắt đầu bằng Turnover. — sửa: `taxLinesFor(region, type)` — thử A13: danh mục Expense (US) chỉ có Line 8…27a, không còn Line 1/Line 6
- [x] **B-32** 🟡 Hộp thoại / sheet có ô nhập không đẩy lên khi bàn phím mở (Android): "Change region?" — nút Cancel/Change nằm dưới
  bàn phím (bấm trúng phím của bàn phím); sheet "New category" — nút Save bị che. Người dùng phải tự ẩn bàn phím mới thấy nút —
  tái hiện: Settings → Region → United States → chạm ô "Exchange rate". — sửa: KeyboardAvoidingView cho Sheet + Dialog trên Android — thử A13: "Change region?" và sheet New category nổi trên bàn phím, bấm được Change/Save
- [x] **B-33** 🟠 Đổi vùng UK → US: danh mục tự tạo giữ nguyên dòng thuế cũ ("SA103: Car, van and travel expenses") trong khi danh mục có
  sẵn đã sang Schedule C → báo cáo/CSV US có dòng SA103 lạc (và ngược lại US → UK) — tái hiện: Settings → Categories → + "Van cleaning"
  (Car, van and travel) → Region → United States → Change → Categories: "Van cleaning · SA103: …". — sửa: `mapTaxLine` cho danh mục tự tạo khi đổi vùng — thử A13: US→UK→US, "Van cleaning" = Line 9 Car and truck expenses
- [x] **B-34** 🟡 Chữ 200%: thẻ GPS trên Home ("GPS records your business miles until you stop.") bị ép thành cột hẹp cạnh nút
  "Start trip", ngắt giữa chữ "bu / siness" — tái hiện: font_scale 2.0 → Home, cuộn tới thẻ Start trip. — sửa: chữ cạnh nút có minWidth theo fontScale + flexWrap — thử A13: 0.8/1.0 nút cạnh chữ; 1.3, 2.0, 320dp nút xuống dòng, không ngắt giữa từ
- [x] **B-35** 🟡 (góp ý, Phương duyệt 2026-11-13) Export: "CSV – mileage log" mặc định tắt kể cả khi kỳ xuất có chuyến → tài xế dễ quên
  gửi nhật ký dặm cho kế toán. Sửa: tự tick khi kỳ có chuyến. — sửa: `defaultExportKinds` theo kỳ có chuyến — thử A13: Export năm 2026 tự tick mileage log
- [x] **B-36** 🟡 (góp ý, Phương duyệt 2026-11-13) Màn sửa khoản (S-05) và Add trip (S-08): khi bàn phím mở, nút "Save changes" /
  "Save trip" bị che, phải ẩn bàn phím mới thấy. Sửa: nút lưu nổi ngay trên bàn phím như màn Ghi nhanh. — sửa: Screen `avoidKeyboard` + nút lưu ở thanh đáy (Add/Edit trip), KeyboardAvoidingView ở S-05 — thử A13: Save trip / Save changes nổi trên bàn phím, lưu được khi bàn phím mở

## Bản 2 — P5 Ghép & kiểm (2026-11-16, `dev` sau `d3df44e`; Galaxy A13 dev build S1b + Metro `dev`, trình giả lập cho cài mới)

- [x] **B-37** 🔴 Cài mới không vào onboarding: mở app lần đầu rơi vào màn dev "OCR probe" (bản release: các route bản 2 không
  khai trong `Stack.Protected` — `dev/ocr`, `dev/probe`, `mileage-rates`, `trip/odometer`, `trip/setup`, `trip/toggle` — nên trước
  onboarding vẫn mở được và router chọn route đầu tiên) — case TC-217 — tái hiện: trình giả lập cài mới APK dev → mở app → "OCR
  probe". — sửa: khai đủ 6 route trong nhóm `guard={onboarded}` + test `src/state/__tests__/routesDeclared.test.ts` (mọi route
  phải được khai) — thử trình giả lập: cài mới → S-01a "Log it in 10 seconds…"
- [x] **B-38** 🟡 Sort → Split tại chỗ: khi gõ số tiền một phần, bàn phím che dòng "Left to assign" và nút "Split & sort" — phải
  ẩn bàn phím mới biết còn thiếu / thừa bao nhiêu (giống B-36) — case TC-242 — tái hiện: A13 → Sort → thẻ Shell M62 → Split →
  chạm ô Part 1 → gõ 41.20. — sửa: màn Sort `KeyboardAvoidingView` + ẩn FAB khi bàn phím mở, thẻ tự cuộn tới cuối form (`useKeyboardUp`) + test `src/ui/__tests__/keyboardSort.test.ts` — thử A13: gõ 41.20 ở Part 2 → "Left to assign £5.00 over" + "Split & sort" (mờ) nổi trên bàn phím
- [x] **B-39** 🟡 S-01b: thẻ United Kingdom ghi "£ · Tax year 6 Apr – 5 Apr · Self Assessment (SA103)"; product.md v2 F-01 ghi
  "Self Assessment & MTD" — case TC-218 — tái hiện: cài mới → Get started. — sửa: `onboarding.regionUKSub` (dùng chung S-01b + Settings Region) + test `src/i18n/__tests__/copyV2.test.ts`
- [x] **B-40** 🟠 CSV "mileage log" chưa có cột From / To / Round trip cho chuyến A → B (Q25) → kế toán không thấy chuyến đi đâu
  (HMRC cần mục đích + nơi đến) — case TC-270 — `src/domain/csv.ts` `mileageCsv` (TODO P5); thêm cả cột `estimated` theo F-15. — sửa: cột `from`, `to`, `round_trip` (trống với chuyến không phải A → B) + `estimated` (yes khi source = gap); `buildExport` truyền nhãn — test `reportCsv.test.ts` "A → B trips carry from / to / round trip"
- [x] **B-41** 🟠 S-17 Recurring: lưu được mẫu khi chưa chọn danh mục → khoản tạo ra "Unsorted", vào hàng chờ Sort (trái với
  "Created already sorted… never wait in the Sort queue"); danh sách hiện "Recurring entries · £289.00" khi không có ghi chú
  (nên lấy tên danh mục) — case TC-257 — tái hiện: Settings → Recurring entries → Add → gõ 289.00 → Save (chưa chọn Category). — sửa: `validateRecurring` trả `category` (tạo mẫu mới bắt buộc có danh mục; mẫu cũ có danh mục bị xoá vẫn sửa / tạm dừng được), sheet báo "Pick a category"; danh sách / tiêu đề sheet lấy tên danh mục khi không có ghi chú (`recurringName`) + test `recurring.test.ts` "B-41 …" — thử A13: Add → 12.00 → Save → "Pick a category", sheet giữ nguyên; chọn Phone & data → Save → danh sách "Phone & data · £12.00 · Monthly on the 16th", khoản tạo ra đã phân loại
- [x] **B-42** 🟡 Số ít/số nhiều: "Apply suggested categories to 1 entries?", "1 auto-sorted · 1 recurring entries added" (S-06c),
  snackbar "Sorted 1 entries" — case TC-248, TC-249 — tái hiện: tuần chỉ còn 1 khoản → List view → Accept all. — sửa: `tn()` (`src/i18n/index.ts`) chọn chuỗi `<key>One` khi đếm = 1; thêm bản số ít cho acceptAllConfirm, sortedMany, autoAndRecurring, recurringOnly, undoneAll, categorySet, scopeSet, settings.backupDays + test `copyV2.test.ts` "singular counts" — thử A13: tuần 16–22 còn 1 khoản → "Apply the suggested category to 1 entry?" → snackbar "Sorted 1 entry"
- [x] **B-43** 🟡 Thẻ Sort: khi chip gợi ý xuống 3 hàng (hoặc thẻ chuyến có hình tuyến), hàng "Edit · Split · Merge · Skip" /
  "Split trip · Skip" nằm dưới mép thẻ, phải cuộn trong thẻ mới thấy, không có dấu hiệu cuộn — case TC-244 — tái hiện: A13
  (cỡ chữ 0.8) → Sort tuần 9–15 Nov → thẻ "EE phone £15.00" (Phone & data / Van repairs & servicing / Fuel / More…).
  Đề xuất: ghim hàng hành động ở đáy thẻ, ngoài vùng cuộn. — sửa: `SortEntryCard` / `SortTripCard` đưa hàng hành động ra ngoài
  ScrollView (ghim đáy thẻ) + thanh cuộn hiện thường trực khi thẻ cuộn được (`persistentScrollbar`; iOS nháy thanh cuộn) + test
  `sortCardLayout.test.ts` — thử A13: thẻ EE phone → Edit · Split · Merge · Skip luôn hiện ở đáy, thanh cuộn bên phải, cuộn trong thẻ tới Work / Personal
- [x] **B-44** 🟡 Backup & restore: ô "Backup folder" hiện "acc=6;doc=encoded=…" (mã tài liệu Google Drive) thay vì tên thư mục —
  case TC-320 — sửa: `folderLabel` bỏ tên dạng mã → "Google Drive"; nhãn đã lưu được làm sạch khi hiển thị (`shownFolderLabel`,
  `src/features/backup/folderLabel.ts`) + test `folderLabel.test.ts` — thử A13: "Backup folder · Google Drive"
- [x] **B-45** 🔴 Sao lưu đêm vào Google Drive luôn lỗi "We can't reach your backup folder" và "Restore from backup" báo
  "No backups in this folder yet": trên Drive `File.name` (expo-file-system) = mã tài liệu, không phải tên file → không tìm thấy
  file vừa ghi ("copy did not land"), không nhận ra bản sao lưu cũ, không dọn được bản thứ 8 — case TC-321, TC-323 — sửa:
  `androidPort` lấy tên thật từ `Directory.info().files` (DISPLAY_NAME, cùng thứ tự `list()`) — thử A13 (nút dev "Port put test"):
  put / list / remove ok; sao lưu thật 15:34 + 15:38 vào Drive; danh sách khôi phục hiện "Mon 16 Nov · 15:38 · 239 entries · 13 photos"
- [x] **B-46** 🟠 Settings trong app không đọc lại khi tác vụ nền / sao lưu đêm ghi vào DB → S-12 vẫn báo "Last 3 backups failed ·
  not reachable" sau khi sao lưu đã thành công (tới khi mở lại app) — case TC-321 — sửa: `SettingsProvider` đọc lại settings khi
  bảng `settings` đổi (`useTablesVersion`) — thử A13: chạy sao lưu khi đang ở S-12 → "Nightly backup on · Last: today 15:38"
- [x] **B-47** 🟡 Reports → tab "MTD categories": khoản chưa phân loại hiện 2 dòng cùng tên "Unsorted" (thu £620.00, chi £420.67),
  tab SA103 thì ghi "Unsorted income" / "Unsorted expenses" — case TC-309 — sửa: `mtdRowLabel` (`src/domain/report.ts`) dùng
  `unsortedLine` + test `reportLabels.test.ts` — thử A13: "Unsorted income £620.00" / "Unsorted expenses £420.67"
- [x] **B-48** 🟠 Miles khi chọn Actual costs vẫn hiện "≈ £4,774.11 at HMRC rates" — product.md §5.3 / F-13: ẩn tiền theo dặm,
  hiện "Business use 89%" (chuỗi `vehicle.businessUse` có sẵn nhưng Miles không dùng) — case TC-298 — sửa: thẻ tổng Miles theo
  `vehicleTreatment().showsBusinessUse` → "Business use N%" · "W of T mi" + thanh xanh (mockup 06-miles); `Progress` thêm
  `tone="ok"` (Reports dùng chung) — thử A13: Actual costs → "Business use 87% · 8,680 of 9,998 mi", không còn số tiền
- [x] **B-49** 🟠 Miles thiếu dòng "10,000 mi at 55p reached on 14 Aug · now 25p" + thanh tiến độ khi vượt 10.000 dặm (F-13,
  mockup "miles-10-000-mi-reached") — case TC-297 — sửa: `tierThresholdReached` (`src/domain/mileage.ts`, đếm cộng dồn theo ngày
  như ước tính) + dòng màu vàng dưới ước tính + test `mileageRates.test.ts` "tierThresholdReached" — thử A13 (chuyến tay tạm
  1,400 mi, đã xoá): "≈ £5,520.05 at HMRC rates (55p / 25p)" + thanh đầy + "10,000 mi at 55p reached on 16 Nov · now 25p"
- [x] **B-50** 🟡 Bật rồi tắt chuyến bằng NFC / `sundaysort://trip/toggle` mà xe không chạy → lưu chuyến
  "0.0 mi · NFC · Work" trong Miles (chạm nhầm 2 lần là có rác) — case TC-293 — đề xuất: tắt chuyến < 0.1 mi thì bỏ, snackbar
  "Trip under 0.1 mi — not saved". — Phương duyệt 2026-11-16 — sửa: `tooShortToKeep` / `MIN_KEPT_TRIP_M` (`src/domain/mileage.ts`),
  `trip/toggle` bỏ chuyến < 0.1 mi bằng `discardTrip` + snackbar `autoTrip.nfcTooShort` + test `mileageRates.test.ts` "tooShortToKeep"
  — thử A13: toggle bật → tắt ngay → "Trip under 0.1 mi — not saved", Miles không có chuyến mới
- [ ] **B-51** 🟠 Hao pin: trên A13 (app dev, tiến trình chạy từ 12:19) luồng chính chạy 100% CPU (38 phút CPU), GC ~23 MB mỗi
  2,3 giây; nút Export trên Reports không phản hồi. simpleperf: vòng lặp `IntentModule.waitForActivityAndGetInitialURL` →
  `onHostResume` → `addLifecycleEventListener` (RN 0.88.1 `Linking.getInitialURL()` khi `currentActivity` = null mà context đang
  RESUMED → mỗi lần resume lại chờ tiếp, không bao giờ dừng). Mở app mới, Back rồi mở lại bằng deep link, Reload dev đều
  không tái hiện — chưa rõ bước kích hoạt (nghi: tác vụ nền / widget khởi động JS khi chưa có Activity). Đề xuất P6:
  patch-package `IntentModule.kt` — trong `onHostResume` nếu Activity vẫn null thì `resolve(null)` thay vì chờ lại; build
  native mới, để máy chạy nền qua đêm rồi đo `top -H`. **P6:** `android/` cục bộ sinh ngày 13/11 (manifest release cũ còn gỡ
  INTERNET) → trước khi build native / release cục bộ chạy `npx expo prebuild --clean` (EAS tự prebuild).
- [ ] **B-52** 🟠 Chữ 200% (font_scale 2.0, Phương bật) — case TC-345 — S-19, S-07d, S-08b, Backup, thẻ Sort (hàng hành động
  ghim đáy, B-43) đạt. Sai: (1) 🟠 Miles: tiêu đề "Miles · Tax year 2026/27 ⌄" đẩy nút ⋯ "More" ra ngoài mép phải (còn 14 px)
  → không mở được menu Automatic trips / NFC tag / Odometer check; (2) 🟡 Miles: dòng chuyến cắt "Fri 13 Nov ·.." mất số dặm;
  (3) 🟡 A → B: chip nơi hay đến "Wakefield Westgate Railwa…" tràn quá mép phải, công tắc "Odometer | Distance | A → B" ép
  sát; (4) 🟡 Sort → Split: nút danh mục từng phần còn "Choo.." (mất chữ "Choose"). Ảnh bằng chứng: thư mục scratchpad P5-3
  (tc345/miles.png, ab.png, split.png).

### S6 (nhánh `s6-competitor-ideas`, thử trên giả lập theo Phương 2026-11-16)
- [x] **B-S6a** 🟠 Ô "Parking & tolls" ở Thêm / Sửa chuyến: bấm vào thì ô và hàng "+ − × ÷" nằm sau nút Save + bàn phím →
  không thấy số đang gõ, bấm "+" trúng Save (lưu £2.50 thay vì 2.50+1.00). Sửa: khi đang gõ, thanh dưới (trên nút Save) hiện
  "Parking & tolls  2.50+1.00 = £3.50" + hàng "+ − × ÷" (`ParkingKeyBar`); sheet End trip giữ hàng phép tính ngay dưới ô —
  thử giả lập: £3.50 lưu đúng.
