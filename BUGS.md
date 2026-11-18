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
  **Chốt 2026-11-17 (phiên chính): bản 1.0 = (c) giới hạn đã biết**, chưa sửa: không có patch-package; RN Android là AAR
  `react-android` dựng sẵn nên vá `IntentModule.kt` trong node_modules không vào bản build. Theo dõi: sau ca chạy xe đọc
  `adb shell dumpsys batterystats com.phiotron.sundaysort` + `top -H` trên bản release; nếu release cũng bị → làm (b) module
  native nhỏ ghi đè "IntentAndroid" (hoặc (a) patch-package + build RN từ nguồn).
  **Đo bản release 17/11 (P6, chỉ lệnh đọc):** không thấy vòng lặp. App mở trên màn, không vẽ khung: luồng chính ~7,5% CPU, thức
  61 lần/s theo vsync, JS ~0 (nhịp hẹn giờ JS của RN, tắt khi tắt màn / xuống nền) — không phải B-51. App ở nền 5 phút (10:38–10:43):
  luồng chính +0,02 s, JS 0. → giữ (c). Manh mối cho sau 1.0: batterystats từ lần sạc trước (gồm bản dev 16/11) có ~30 job
  WorkManager (`SystemJobService`) mỗi job giữ wakelock đủ 10 phút (hết giờ, không `jobFinished`) — nghi tác vụ nền headless
  (`expo-background-task`) treo khi JS khởi động không có Activity, khớp nghi vấn bước kích hoạt ở trên. Theo dõi tiếp sau ca chạy xe.
- [x] **B-52** 🟠 Chữ 200% (font_scale 2.0, Phương bật) — case TC-345 — S-19, S-07d, S-08b, Backup, thẻ Sort (hàng hành động
  ghim đáy, B-43) đạt. Sai: (1) 🟠 Miles: tiêu đề "Miles · Tax year 2026/27 ⌄" đẩy nút ⋯ "More" ra ngoài mép phải (còn 14 px)
  → không mở được menu Automatic trips / NFC tag / Odometer check; (2) 🟡 Miles: dòng chuyến cắt "Fri 13 Nov ·.." mất số dặm;
  (3) 🟡 A → B: chip nơi hay đến "Wakefield Westgate Railwa…" tràn quá mép phải, công tắc "Odometer | Distance | A → B" ép
  sát; (4) 🟡 Sort → Split: nút danh mục từng phần còn "Choo.." (mất chữ "Choose"). Ảnh bằng chứng: thư mục scratchpad P5-3
  (tc345/miles.png, ab.png, split.png). — sửa (code, chờ thử lại ở chữ 200% cuối phần C): Miles nhãn năm co lại
  (`flex: 1, minWidth: 0` + `numberOfLines={1}`), tiêu đề dòng chuyến 2 dòng; `Chip` `maxWidth: '100%'` + chữ `flexShrink`;
  nút danh mục ở Split `adjustsFontSizeToFit` + test `src/ui/__tests__/largeText.test.ts`
  — thử A13 lại ở chữ 200% (17/11): Miles "Tax year 20.." + nút ⋯ mở menu Automatic trips / NFC tag / Odometer check;
  dòng chuyến "Fri 13 Nov · / 2.9 mi"; chip "Wakefield Westgate Rail.." trong mép; Split "Choose" đủ chữ.
- [x] **B-53** 🟠 App lock: bấm "Unlock" không có phản hồi (Phương báo 17/11 sau TC-295) và app không khoá lại nữa (để nền
  68 giây vẫn mở) — tái hiện: App lock bật → app khoá → `sundaysort://trip/toggle` 2 lần liền (như chạm thẻ NFC) → hộp vân
  tay bị intent mới cắt ngang, `authenticateAsync` không trả kết quả → `busy` + `withLockSuspended` kẹt. Lần thử lại hộp vân
  tay hiện được (không phải lần nào cũng kẹt). — sửa: nút Unlock khi đang "busy" gọi `LocalAuthentication.cancelAuthenticate()`
  + `resetLockSuspended()` rồi hỏi lại; bộ đếm không xuống âm + test `src/features/settings/__tests__/lockState.test.ts`.
  Chưa thử A13 (cần tái hiện lúc kẹt). Hệ quả thêm thấy 17/11: toggle lần 2 tới lúc hộp vân tay đang mở thì bị bỏ qua → chuyến NFC
  vẫn chạy (GPS bật) tới khi toggle lại; widget hiện đúng "End trip · 0.0 mi". Đề xuất P6: hàng đợi deep link toggle chạy sau khi hộp
  vân tay đóng.
  **Phần 2 (P6, 17/11):** tái hiện trên A13 bản release (App lock bật, khoá sau 1 phút, app ở nền 70 s) → toggle → hộp vân tay mở →
  toggle lần 2 sau 1,5 s → chuyến vẫn chạy (thông báo trip-ongoing còn). Logcat: intent 2 tới lúc 10:27:24.88 khi toggle 1 còn đang bật
  GPS (thông báo chuyến hiện lúc 26.06) → màn `/trip/toggle` vẫn đang mở nên expo-router coi là "đã ở đó", không chạy lại. Gốc không
  phải hộp vân tay mà là 2 toggle sát nhau (hộp vân tay làm toggle 1 chậm hơn). Hộp vân tay không bị cắt ngang lần này.
  — sửa: `src/app/+native-intent.tsx` (`redirectSystemPath`, gọi 1 lần cho mỗi deep link, cả mở nguội) đếm từng lần toggle;
  `src/features/trips/toggleQueue.ts` chạy lần lượt; màn `trip/toggle` chạy hết hàng đợi rồi mới về Home + test
  `src/features/trips/__tests__/toggleQueue.test.ts` — thử A13 (release, cài đè giữ dữ liệu): (1) toggle → hộp vân tay → toggle 2 →
  chuyến tắt; (2) 2 toggle cách 0,3 s (intent 2 tới 48.075, trước khi GPS bật 48.279) → chuyến bật rồi tắt 49.117, không chuyến rác
  trong Miles; Phương mở khoá vân tay bình thường.
- [x] **B-54** 🟡 (P6) Chữ 200% còn: Miles dòng chuyến giờ bị cắt "07:4.." khi có nhãn "Exported" (S6); Home lời chào ngắt giữa
  chữ "Mor / ning, driver" vì huy hiệu "Trial · 7 days left" chiếm chỗ — case TC-345. Đề xuất: nhãn Exported xuống dòng riêng
  khi chữ lớn; lời chào `numberOfLines`/`adjustsFontSizeToFit` hoặc huy hiệu xuống dòng dưới.
  — sửa: `Screen` tiêu đề `numberOfLines={2} adjustsFontSizeToFit` + vùng headerRight co được (`maxWidth: '62%'`), Home
  huy hiệu + nút Settings xuống dòng khi hẹp; Miles dòng giờ 2 dòng + test `largeText.test.ts` (B-54). Chưa thử A13 ở chữ 200%.
- [x] **B-55** 🟡 FreeAgent mileage CSV: xe điện luôn ghi "Electric (Home charger)" / "(Public charger)", nhưng FreeAgent chỉ nhận
  2 loại này cho chuyến từ 01/09/2025; chuyến trước đó phải là "Electric" → xuất năm 2025/26 cho xe điện sẽ bị từ chối — tìm
  ra khi khảo sát TC-318 (support.freeagent.com "Import mileage claims in bulk") — sửa: `freeAgentEngineTypeOn` theo ngày chuyến
  + test `mtd.test.ts` "B-55".

### S6 (nhánh `s6-competitor-ideas`, thử trên giả lập theo Phương 2026-11-16)
- [x] **B-S6a** 🟠 Ô "Parking & tolls" ở Thêm / Sửa chuyến: bấm vào thì ô và hàng "+ − × ÷" nằm sau nút Save + bàn phím →
  không thấy số đang gõ, bấm "+" trúng Save (lưu £2.50 thay vì 2.50+1.00). Sửa: khi đang gõ, thanh dưới (trên nút Save) hiện
  "Parking & tolls  2.50+1.00 = £3.50" + hàng "+ − × ÷" (`ParkingKeyBar`); sheet End trip giữ hàng phép tính ngay dưới ô —
  thử giả lập: £3.50 lưu đúng.

## QA-100 — 100 người dùng mô phỏng (2026-11-17, `dev` `dc6d0a6`; T1 logic Jest 100 persona, Android API 37/8/11, iOS sim GH Actions, chuyên đề)
> Bằng chứng: `qa-runs/<phiên>/` (máy local, gitignore). Lỗi phiên con: `qa/findings/*.md` → phiên điều phối chép vào đây khi xác nhận.
- [x] **B-56** 🟠 Lời hứa riêng tư sai: bản release khai `allowBackup="true"` (`dumpsys package` → `ALLOW_BACKUP`) → Android tự sao lưu
  DB + ảnh lên Google của người dùng, trong khi onboarding ghi "Your data stays on your phone", màn quyền "Location stays on your
  phone", `docs/privacy.html` ghi "does not connect to the internet … nothing is sent to anyone" (sai từ bản 2: OpenFreeMap,
  openrouteservice, Play Billing, sao lưu thư mục). Phương chốt **giữ sao lưu hệ thống, sửa lời hứa** — sửa: chữ welcome "No Sunday
  Sort servers: we never see your data", permStays "Your route is never sent to us", 4 câu "lives only on this phone" → "kept on this
  phone", `docs/privacy.html` thêm mục "Outside services" + System backup + nightly folder; product.md §F-01/S-07a/§11.
  ⏳ Đăng bản privacy mới lên trang công khai + Data safety: phần store, chờ Phương.
- [x] **B-57** 🟠 (QA OLD-1, phiên B) Màn nhập khoản trên màn thấp 360×640dp (API 26, và API 30 đặt 720×1280@320): khi bàn phím số mở,
  số tiền đang gõ co còn ~4px / biến mất — `middle` `flex: 1` không có `minHeight`, hàng Photo/Work/Note + gợi ý + "20 of 20 free photos"
  + Save + chú thích + CalcBar chiếm hết ~390dp. Bằng chứng `qa-runs/android-old/_smoke26/17_expense_typed.png`. Sửa (`capture.tsx`):
  màn cao < 720dp khi bàn phím mở → ẩn "Tap for Personal", "N of 20 free photos", "No category needed…", gap 8; `middle` `minHeight: 88`;
  số tiền `minimumFontScale 0.5`. ⏳ chờ phiên B thử lại bằng APK mới.
- [x] **B-58** 🟡 (QA OLD-2) Android 8: hàng phép tính (CalcBar) bị bàn phím che nửa dưới (API 30 cùng cỡ màn không bị). Nghi: RN báo chiều
  cao bàn phím không gồm thanh điều hướng app vẽ phía sau (edge-to-edge) trước Android 11 → `KeyboardAvoidingView` bù thiếu. Sửa thử:
  `keyboardVerticalOffset = insets.bottom` khi Android < 11 (`capture.tsx`). ⏳ chờ phiên B kiểm trên API 26 (giả thuyết, chưa xác nhận).
- [x] **B-59** 🟠 (QA OLD-4, mở rộng) Migration DB chỉ chạy trong `app/_layout.tsx` (`useMigrations`), trong khi Android chạy JS **không cần
  màn** cho GPS chuyến (`TRIP_TASK`), tín hiệu chuyến tự động (headless `TRIP_DETECT_TASK`), sao lưu đêm, widget, và `onActive` 2 s sau khi mở.
  Lần mở đầu: log `[auto-trip] sync failed: no such table: settings` (API 26/30). Nặng hơn: **sau mỗi bản cập nhật có migration mới**, trước
  khi tài xế mở app, các tác vụ nền chạy trên schema cũ → điểm GPS / chuyến tự động / sao lưu đêm / widget lỗi âm thầm. Sửa: `src/db/migrate.ts`
  `ensureMigrated()` (chạy 1 lần mỗi runtime, lỗi thì thử lại), `_layout` dùng chung, mọi điểm vào nền `await ensureMigrated()`
  (`backgroundTask.ts` ×3, `nightlyTask.ts`, `widgets/register.ts`). ⏳ thử: cài mới (logcat không còn "no such table") + cập nhật đè.
- [ ] **B-60** 🟡 (QA OLD-3) 360dp: nút nổi "+" che nửa phải nút "Actual costs" trong thẻ "Choose how you claim your vehicle" (Reports) ở vị trí
  mặc định; cuộn lên thì bấm được (đệm 100dp). Phương chọn **xếp dọc**: màn < 420dp → 2 nút thành 2 hàng, chừa lề phải 56dp cho nút + (`reports.tsx`). ⏳ thử 360dp.
- [x] **B-61** 🟡 (QA phiên A) Ô số tiền: bàn phím số Android có phím "." nhưng app bỏ dấu chấm (kiểu máy tính tiền) → gõ "7.5" ra £0.75,
  "120" ra £1.20. Phương chốt **nhận dấu chấm**: `features/ocr/calc.ts` — toán hạng tiền có dấu chấm = số thập phân (≤ 2 số sau dấu, "," = "."),
  không dấu vẫn kiểu máy tính tiền; toán hạng × ÷ bỏ dấu; test `calc.test.ts` "decimal point". Áp cho Ghi nhanh, Sửa khoản, Parking & tolls. ⏳ thử máy.
- [x] **B-62** 🟡 (QA phiên A) Xuất file rồi huỷ bảng chia sẻ (Back) → khoản vẫn "Exported on …" (đánh dấu khi tạo file, trước khi chia sẻ).
  Phương chốt **hỏi lại như sao lưu**: `ExportPanel.tsx` sau bảng chia sẻ hiện "Did you send or save the files?" → chỉ "Yes, sent" mới
  `markExported`; product.md Q29 sửa theo. ⏳ thử máy (cả Export từ tab Reports lẫn S-10).
- [x] **B-63** 🟠 (QA MOD-1, phiên F) Người dùng chọn vị trí **"Approximate"** (Android 12+, kể cả "Only this time") / tắt "Precise" (iOS) →
  chuyến GPS kẹt "Finding GPS…", lưu 0.0 mi, không báo gì (Fold API 37, P039; đối chứng Precise cùng tuyến = 1.9 mi). Gốc: chỉ xem
  `fg.granted`, điểm sai số km bị lọc ở `MAX_ACCURACY_M`. Sửa: `isApproximate()` (`features/trips/controller.ts`) → `startBlocker`
  trả `needs_precise` → màn quyền bước "Turn on precise location" (Android hỏi nâng lên Precise, không được thì mở Cài đặt; iOS mở Cài
  đặt); chuyến tự động (`setup.tsx`) cũng đòi Precise; đang chạy chuyến mà hạ xuống Approximate → chuyến bị ngắt có thông báo (không ghi
  0 mi âm thầm). ⏳ phiên F thử lại.
- [x] **B-64** 🟠 (QA MOD-2, mở rộng B-57) Máy cao (Pixel 9 Pro XL 997dp) + chữ 200% → số tiền đang gõ co ~6px vì điều kiện B-57 chỉ xét
  chiều cao < 720dp. Ca thứ 3: Fold mở xoay ngang (Android 16 bỏ qua `screenOrientation=portrait` trên màn ≥ 600dp) → số tiền ~5px.
  Sửa: so theo chiều cao chia `fontScale`, **và đo thật** — bàn phím mở mà vùng số tiền < 80dp thì rút gọn tới khi bàn phím đóng
  (`onLayout`, không bật/tắt qua lại); `minHeight` 64. ⏳ phiên F thử lại (XL @2.0, Fold ngang).
- [x] **B-65** 🟠 (QA OLD-5, phiên B; nghi từ đầu QA) Bật App lock (Lock after = Immediately) → Home → Recents: ảnh thu nhỏ hiện nguyên
  màn có số tiền (API 26, `qa-runs/android-old/_dbg/al_recents.png`). Khoá vẫn đúng khi mở lại / deep link. Gốc: không có gì ẩn nội dung
  khi app vào nền. Sửa: `modules/system-bars` thêm `setHideInRecents` — Android 13+ `setRecentsScreenshotEnabled(false)` (vẫn chụp màn hình
  được), Android < 13 `FLAG_SECURE` cho cửa sổ app + cửa sổ Modal (chặn cả chụp màn hình khi App lock bật — giới hạn của Android cũ);
  iOS: phủ màn nền khi app rời `active` (`services/recentsPrivacy.ts`, `LockGate`). ⏳ cần build native mới; thử API 26 + API 37 + A13 + iOS.
- [ ] **B-66** 🟡 (QA iOS lượt 1, phiên C) iPhone SE + Dynamic Type lớn (P016, P031): màn chào "Log it in 10 seconds" — hình minh hoạ 220pt +
  đệm 48 đẩy tiêu đề/đoạn mô tả xuống dưới mép vùng nút, không thấy gợi ý cuộn (cuộn được). Sửa (`onboarding/index.tsx`, `art.tsx`): màn
  thấp hoặc chữ lớn (chiều cao / fontScale < 700) → hình còn 55%, đệm 16; tiêu đề `maxFontSizeMultiplier 1.6`. ⏳ iOS lượt 2.
  Ghi nhận (không sửa): log iOS "[expo-notifications] Error reading persisted server registration info" mỗi lần mở — thư viện đọc đăng ký
  push từ keychain, app chỉ dùng thông báo local; theo dõi ở lượt 2 xem thông báo nhắc có hiện không.
- [x] **B-67** 🟠 (QA SPE-1, phiên D) Deep link `sundaysort://reports?from=-99999999999999999&to=0` treo app vĩnh viễn (luồng JS 100%, RAM tới OOM,
  phải buộc dừng) — link BROWSABLE nên trang web/thẻ NFC bất kỳ mở được; `from=0&to=99999999999999999` treo ~190 s; Custom 1970→2026 với
  20.000 khoản treo ~95 s. Gốc: `monthlySeries` `for(;;)` gặp ngày ngoài phạm vi Date → NaN → không dừng; `linkedPeriod` không chặn biên;
  tìm tháng bằng `find` tuyến tính. Sửa: `saneReportRange` (từ 1/1/2000, ≤ 10 năm, ≤ hôm nay + 1 năm) cho deep link + ô Custom (lỗi "Choose up
  to 10 years, from 2000 onwards.", From có minimumDate); `monthlySeries` dừng khi ngày không hợp lệ, tối đa 121 tháng, tìm nhị phân; test
  `reports.test.ts` "SPE-1". ⏳ phiên D thử lại deep link.
- [x] **B-68** 🟠 (QA SPE-2, phiên D) File `.sundaysort` sửa tay mở khoá Pro vĩnh viễn: máy chưa có `pro_state` (cài mới / cài lại) → Restore file có
  `proState.trialEndsAt` năm 2100 → "Trial · 26708 days left", PDF/MTD/xlsx/FreeAgent mở (đã xuất thật). Chỉ cần sửa 1 dòng JSON → chia sẻ được
  "file Pro free". Gốc: `replaceAllData` chép nguyên `proState` của file; `validateManifest` chỉ kiểm `id`. Sửa: `sanitizeRestoredPro`
  (`domain/pro.ts`) — dùng thử tối đa 7 ngày từ ngày bắt đầu (bắt đầu ở tương lai → hôm nay); `entitlement` 'active' từ file → 'expired',
  `autoRenewing` false, `lastVerifiedAt` null → lần mở app sau kiểm lại với cửa hàng (người mua thật được Pro lại / "Restore purchase");
  máy đã có `pro_state` giữ nguyên như cũ. Test `backup.test.ts` "SPE-2". ⏳ phiên D thử lại file độc.
  (SPE-3 Recents = B-65.)
- [x] **B-69** 🟠 (QA OLD-6, phiên B) Mở tab Miles có chuyến → app sập native (SIGABRT, "Failed to choose ARGB config", `libmaplibre.so`, luồng
  Snapshotter) — API 30 GPU phần mềm, P023; mỗi lần mở Miles đều sập lại. Cùng máy GPU host thì bình thường → phụ thuộc EGL của máy (máy thật
  GPU lạ có thể gặp). JS không bắt được. Sửa (`features/trips/map/thumbs.ts`): ghi cờ file trước mỗi lần chụp ảnh bản đồ, xoá sau; lần mở sau
  còn cờ = đã sập giữa chừng → tắt ảnh bản đồ thu nhỏ vĩnh viễn trên máy đó (hàng giữ biểu tượng tròn). Còn lại: sập **1 lần** trước khi
  tự tắt — **Phương chốt 2026-11-18: chấp nhận, giới hạn đã biết**. ⏳ phiên B: mở Miles 2 lần trên máy swiftshader; kiểm thêm màn chi tiết chuyến (bản đồ MapView) trên máy đó.
- [x] **B-70** 🟠 (QA MOD-7, phiên F) Chạm đúp "Save" ở Ghi nhanh (2 chạm cách ~0,2 s, Fold P056) → lưu 2 khoản trùng (to-sort 27→29, Out +2×$5.55).
  Gốc: `capture.tsx` mở chốt `savingRef` trước `close()` — không có ảnh thì lưu xong ngay, chạm 2 thấy chốt mở và số tiền cũ. Sửa: nhánh đóng màn
  giữ chốt; "Keep adding" mở chốt sau 300 ms (khi số đã xoá); lỗi giữa chừng thì mở lại. Cùng mẫu đã sửa luôn: thêm chuyến tay (`trip/new.tsx`),
  số đồng hồ (`trip/odometer.tsx` — chốt bằng state không chặn 2 chạm cùng khung hình → thêm ref), khoản lặp lại (`recurring.tsx`, 1 lần lưu mỗi
  lần mở sheet). Luật (`rules.tsx`) đã có kiểm trùng trong DB. ⏳ phiên F thử lại P056 + thử chạm đúp 3 màn kia.
- [ ] **B-71** 🟡 (QA A13-1, phiên E) Đổi vùng US → UK có quy đổi: ô tỷ giá gợi ý "e.g. 0.79" nhưng nhập sai thì báo "Enter a rate like 1.27"
  (chuỗi lỗi cố định). Sửa: `settings.tsx` dùng chung ví dụ theo vùng cho gợi ý và lỗi (`rateError` có `{example}`). ⏳ A13.
- [x] **B-72** 🟠 (QA OLD-9, hồi quy B-57/B-58 trên 538ede9, phiên B) Android 8 360dp: chế độ gọn đã chạy nhưng số tiền vẫn ~4px và hàng
  + − × ÷ vẫn bị bàn phím che nửa. Gốc: `adjustsFontSizeToFit` của Android tính cỡ chữ 1 lần lúc vùng số còn ~0 (bàn phím đang mở) và không
  phóng lại; bù `insets.bottom` (B-58) là đoán sai. Sửa (`capture.tsx`): cỡ chữ số tiền tính từ chiều cao đo được của vùng số + độ dài chuỗi
  (24–64), bỏ `adjustsFontSizeToFit`; hàng phép tính **đo vị trí thật** (`measureInWindow`) so với mép trên bàn phím (`keyboardDidShow`
  `screenY`) rồi nâng lên đúng phần bị che (tối đa 160dp). ⏳ phiên B (API 26 360dp) + F (XL @2.0, Fold ngang) + A13.
- [x] **B-73** 🟠 (QA MOD-9, phiên F) Back ẩn bàn phím rồi chạm số tiền → bàn phím không hiện lại (ô ẩn vẫn đang focus, `focus()` không mở IME
  trên Android) — kẹt, phải đóng màn. Sửa: `features/ocr/refocus.ts` (blur rồi focus khung sau) cho Ghi nhanh, Sửa khoản, Parking & tolls.
- [x] **B-74** 🟡 (QA OLD-8, phiên B) Bộ nhớ máy đầy: Save ở Ghi nhanh không lưu, không báo gì (SQLITE_FULL bị nuốt). Sửa: báo "Couldn't save.
  Free up some storage on your phone and try again.", giữ số trên màn.
- [x] **B-75** 🟠 (QA OLD-7, phiên B) Bộ nhớ máy đầy → mở app là "Sunday Sort has stopped" (lặp lại tới khi xoá bớt): WorkManager (kéo vào bởi
  expo-background-task + widget) khởi tạo lúc mở app, ghi DB riêng gặp SQLITE_FULL → `IllegalStateException`. Sửa: plugin
  `plugins/withWorkManagerSafeInit.js` — `MainApplication` là `Configuration.Provider` với `setInitializationExceptionHandler` (ghi log, việc nền
  bỏ qua, app vẫn mở), gỡ `WorkManagerInitializer` mặc định (manifest `tools:node="remove"`), thêm `androidx.work:work-runtime:2.10.5`;
  `expo prebuild --clean` lại. ⏳ phiên B: đầy bộ nhớ → mở app 3 lần; còn chỗ → sao lưu đêm/widget vẫn chạy.
- [x] **B-76** 🟠 (QA SPE-6, phiên D) Xuất PDF kỳ dài (~8.000 khoản trở lên) treo mãi ở "Preparing your files…", WebView ~2,9 GB RAM, cả máy ì.
  Gốc: mọi khoản in vào 1 trang HTML, `printToFileAsync` không giới hạn thời gian. Sửa: bảng Entries / Mileage log trong PDF tối đa 2.000 dòng +
  dòng "Showing the first 2,000 of N entries. The full list is in the CSV export." (tổng vẫn tính đủ); in quá 120 s → báo "The PDF is taking too
  long for this period. Pick a shorter period, or use the CSV." Test `reports.test.ts` "SPE-6". ⏳ phiên D thử lại 2 năm + 20k.
- [x] **B-77** 🟡 (QA A37-3, phiên A) Home "Recent" ghi "Sun 10:23" cho khoản từ nhiều tuần trước. Sửa: `entryWhen` (`features/entries/format.ts`) —
  trong 6 ngày ghi thứ + giờ, cũ hơn ghi "25 Oct 10:23" (khác năm thêm năm); `EntryRow`. (+ MOD-5: tiêu đề ngày Entries thêm năm khi khác năm nay.)
- [ ] **B-78** 🟡 (QA A37-4/A37-5, phiên A) Chữ 200% + 320dp ở Reports: thẻ "N entries … aren't sorted yet" bẻ chữ 1 từ/dòng, huy hiệu cắt "99+";
  Income/Expenses/Profit bị cắt bên phải. Sửa (`reports.tsx`): thẻ `flexWrap` (nút "Sort now" xuống dòng, chữ `minWidth 150`, huy hiệu co theo
  chữ); hàng tổng `flexWrap` (số xuống dưới nhãn khi không vừa).
- [x] **B-79** 🟡 (QA MOD-8, phiên F) Home "2037 entries to sort" thiếu dấu phẩy nghìn. Sửa: `formatCount`.
- [x] **B-80** 🟡 (QA SPE-4, phiên D) Khôi phục file có cài đặt sai kiểu (`region: "ZZ"`, `mileageRates: "x"`, `notify: null`…) → Miles / Reports /
  Notifications / có lúc Settings sập mỗi lần mở (không vào được Backup để sửa). Sửa: `saneSetting` (`db/settingsRepo.ts`) — mỗi khoá kiểm
  kiểu / danh sách giá trị khi đọc, sai thì dùng mặc định, object thiếu/sai trường thì lấy trường mặc định; khôi phục: `amountMinor ≤ 10¹²`
  (ban đầu đặt ≤ 99,999,999 — bộ 100 persona P054 bắt được: đổi vùng quy đổi £999,999.99 ×1.27 vượt trần → sao lưu thật không khôi phục được; đã nới).
- [x] **B-81** 🟡 (QA SPE-5, phiên D) "Zip bomb" (file 207 KB giải nén 200 MB) → RAM > 1 GB khi khôi phục (không mất dữ liệu nhưng máy RAM thấp có
  thể tắt app). Sửa (`pack.ts`): bỏ qua/báo "damaged" nếu `backup.json` > 64 MB hoặc 1 ảnh > 25 MB trước khi giải nén. Còn lại (giới hạn đã biết):
  bản sao lưu thật rất nhiều ảnh vẫn nạp cả vào RAM khi khôi phục — chưa dựng được file thật cỡ đó để đo.
- [x] **B-82** 🟡 (QA MOD-6 + MOD-5, phiên F) Chi tiết khoản ở chữ 1.3–2.0: nhãn "Category" gãy giữa từ (cột nhãn cố định 96dp), "Add photo" tràn khung
  72×72. Hộp "Discard this entry?" không nhắc ảnh đã chụp sẽ mất. Sửa: nhãn `minWidth 96` + không co (tối đa ×1.6); ô Add photo `minWidth/minHeight`
  + chữ tối đa ×1.3, 2 dòng; hộp Discard thêm "The photo(s) will be deleted too." khi có ảnh.
- [x] **B-83** 🟡 (QA SPE-7/SPE-8, phiên D) Đổi cỡ chữ / cỡ hiển thị trong Cài đặt Android khi app đang mở → Activity dựng lại, về Home, mất khoản
  đang nhập dở; deep link tới đúng lúc dựng lại có thể làm sập. **Phương chốt 2026-11-18: giới hạn đã biết cho 1.0** (không đổi `configChanges`
  trước khi lên store).
- [x] **B-84** 🟡 (QA MOD-3, phiên F) Máy ít RAM: Android giết app khi đang ở bộ chọn file/camera → quay lại về Home, mất khoản đang nhập. Phương chọn
  **sửa** (2026-11-18).
  Sửa: Ghi nhanh lưu nháp (loại, biểu thức số tiền, ghi chú, Work/Personal, ngày, ảnh) vào `capture-draft.json` khi đang gõ, xoá khi Save/Discard
  (`features/entries/captureDraft.ts`); lần mở sau Home tự mở lại Ghi nhanh với nháp (≤ 24 h) + ảnh camera Android giữ hộ
  (`ImagePicker.getPendingResultAsync`), snack "Your unsaved entry is back." Còn lại: luồng Khôi phục sao lưu bị giết giữa bộ chọn file thì phải
  chọn file lại (bộ chọn file không trả kết quả cho tiến trình mới). ⏳ phiên F/B: `am kill` khi đang ở camera / bộ chọn ảnh.
- [x] **B-85** 🟡 (QA MOD-4, phiên F) Tablet / máy gập mở: bố cục điện thoại kéo giãn hết bề ngang. Phương chọn **sửa** (2026-11-18).
- [x] **B-86** 🟡 (QA MOD-5, phiên F) Thư viện ảnh chỉ mở được bằng giữ lâu nút Photo (khó phát hiện). Phương chọn **sửa** (2026-11-18).
  Sửa: chạm Photo (Ghi nhanh + Sửa khoản) mở bảng "Add a receipt photo": Take photo / Choose from library (`PhotoSourceSheet`); giữ lâu vẫn vào thư viện.
- [x] **B-87** 🟡 (QA SPE-5 phần còn lại, phiên D) Khôi phục bản sao lưu thật có rất nhiều ảnh nạp cả file + mọi ảnh vào RAM. Phương chọn **sửa**
  (2026-11-18).
  Sửa: `features/backup/streamRestore.ts` — đọc file 1 MB/lần (`FileHandle`), giải nén luồng (`fflate.Unzip`), ảnh ghi thẳng vào thư mục tạm,
  chỉ `backup.json` nằm trong RAM; xem trước (preview) bỏ qua ảnh; giữ giới hạn 64 MB / 25 MB, zip-slip, đếm ảnh; DB đổi trong 1 transaction rồi mới
  thay thư mục ảnh (`restoreFromBackupFile`, `inspectBackupFile`). Test `streamRestore.test.ts`. ⏳ phiên D/B: khôi phục P096 + file độc trên máy.
  Sửa B-85: gốc điều hướng (`app/_layout.tsx`) là cột tối đa 640dp căn giữa trên màn rộng (tablet, Fold mở, xoay ngang); sheet/hộp thoại vẫn
  toàn màn. ⏳ phiên F: Fold mở + xoay ngang, chia đôi màn hình.
- [ ] **B-88** 🟠 (QA A13-2, phiên E — chạy xe thật tối 17/11) Bản 538ede9, Automatic trips bật, đủ quyền, pin Unrestricted: cả ca **không sinh chuyến
  tự động nào** (Phương: "chạy chậm, dừng nhiều"). Sao lưu thật sau ca 18/11 08:30: chuyến mới nhất 16/11. Không còn lịch sử tín hiệu để soi (vòng
  `EventLog` 200 dòng native nhiều khả năng bị mẫu 'sample' đè). Nghi: `features/trips/auto/engine.ts` chỉ mở chuyến khi Activity Recognition báo
  'driving' (IN_VEHICLE, mẫu ≥ 75%) — không có dự phòng. Phương: **ô tô**. Phương chọn **nhật ký trước, sửa sau** (2026-11-18): Settings → giữ lâu dòng
  Version → "Share trip diagnostics" (JSON: tín hiệu native 7 ngày, trạng thái engine, quyền, Pro, cài đặt, 30 chuyến gần nhất —
  `features/trips/auto/diagnostics.ts`); vòng nhật ký native 200 → 1.000 dòng. Bản release không ghi mẫu dày nên tín hiệu tối 17/11 có thể còn.
  Tín hiệu tối 17/11 **đã mất** (lượt persona sáng 18/11 `pm clear` trước khi có nút chẩn đoán). A13 đã về dữ liệu thật + bản 8cb9c8f, Automatic
  trips "Working". ⏳ lần chạy xe tới (ô tô) → giữ lâu Version → gửi file chẩn đoán → phân tích → sửa engine.
  18/11 (8cb9c8f, A13): nút chẩn đoán chạy đúng (`qa-runs/a13/diagnostics/…02-44.json`: registered, đủ quyền, không tối ưu pin); **mở chuyến bằng
  Bluetooth ✅** (nối thiết bị đã chọn → chuyến Auto đúng giây đó). Chưa có dữ liệu Activity Recognition khi lái.
- [x] **B-89** 🟡 (QA MOD-10, phiên F — hồi quy một phần B-84) Nháp được mở lại nhưng **ảnh chụp trong lúc app đã bị giết** vẫn mất: `getPendingResultAsync`
  gọi 1 lần lúc màn mở, trước khi kết quả camera tới Activity mới. Sửa (`capture.tsx`): gọi lại sau 1 s, 3 s và mỗi khi app trở lại active, bỏ ảnh trùng.
  Kèm: cửa sổ thấp < 520dp (chia đôi màn 436dp) → ẩn nút nổi "+" (`ui/Layout.tsx`) vì nó đè "Sort now" ở Reports.
  **Lần 1 không đạt** (phiên F, 8cb9c8f): nguyên nhân gốc thật — Activity dựng lại trước khi React sẵn sàng, RN **bỏ** `onActivityResult`
  ("Tried to access onActivityResult while context is not ready") nên `getPendingResultAsync` luôn rỗng. Sửa lần 2: trước khi mở camera ghi
  `cameraStartedAt` vào nháp; mở lại nháp → lấy ảnh không rỗng mới hơn mốc đó trong `cache/ImagePicker/` (`cameraPhotosSince`); huỷ camera trên khoản
  trống thì xoá nháp. Nút "+" ẩn ở cửa sổ thấp cho mọi tab (`CaptureFab`).
- [ ] **B-90** 🟠 (QA A37-7, phiên A) Chế độ tối: mọi nút `variant="sun"` chữ vàng trên nền vàng (chỉ thấy viên thuốc trống) — "Sort first" (Export có khoản
  chưa sort), "End trip" (Home khi đang có chuyến), "Back up now"/"Choose again", "Subscribe now"/"Try free", "See Pro", Save chi tiết chuyến, "Always"…
  Gốc: `ui/Button.tsx` `sun: { fg: 'primary' }`, mà ở theme tối `primary` = `sun` = #F5B841. Sửa: chữ dùng token `onSun` có sẵn (sáng #18202F, tối
  #12161C). ⏳ phiên A: chụp lại 2 màn trên ở chế độ tối.
- [x] **B-91** 🟡 (QA REG-1, phiên D — B-81/B-87 chưa trọn) Chọn file "bom" có `backup.json` 200 MB: không báo gì, RAM giữ ~515 MB 2 phút; bom ảnh báo
  "damaged" đúng nhưng RAM vẫn lên ~520 MB. Gốc: `fail()` chỉ ghi lỗi, mục đang giải nén không dừng, mỗi lần nạp 1 MB nén có thể nở hàng trăm MB.
  Sửa (`streamRestore.ts`): kích thước khai báo trong header vượt giới hạn → từ chối trước khi giải nén; nạp 64 KB/lần; vượt → `terminate()`.
  Test "REG-1". ⏳ phiên D đo lại PSS.
- [x] **B-92** 🟡 (QA SPE-9, phiên D) 2 máy cùng sao lưu đêm vào 1 thư mục: máy A xoá bản cũ nhất của máy B (giữ 7 bản tính chung), danh sách Khôi phục trộn
  bản 2 máy không ghi máy nào; 2 máy cùng phút → trùng tên ghi đè. Sửa: tên file đêm có mã máy 6 ký tự (`SundaySort-backup-…-HHMM-<tag>`,
  `features/backup/deviceTag.ts`, lưu file riêng — không theo bản sao lưu sang máy khác); mỗi máy chỉ tỉa file của mình (+ file không mã cũ); danh sách
  Khôi phục ghi "· another phone". Test `nightly.test.ts` "SPE-9". ⏳ phiên D mô phỏng lại.
- [x] **B-93** 🟠 (QA phiên B, kiểm lại B-58/B-72 trên 5ce0626) Android 8 360dp: hàng + − × ÷ vẫn bị bàn phím che ~19dp (chữ 1.3: không thấy ký hiệu
  nào) — phép đo B-72 trộn toạ độ cửa sổ (`measureInWindow`) với toạ độ màn hình (`screenY`), lệch đúng thanh trạng thái. Sửa: Android < 11 đặt hàng
  phép tính ngay dưới vùng số tiền (không thể nằm dưới bàn phím); Android 11+ giữ như cũ. Kèm OLD-10 🟡: báo "Couldn't save…" nằm sau bàn phím
  trên Android cũ → ẩn bàn phím trước khi báo. ⏳ phiên B API 26 + Android 7.
- [x] **B-94** 🟠 (QA MOD-11, phiên F) Cửa sổ thấp 436dp (chia đôi màn): thẻ Sort bẹp còn hàng Edit/Split/Merge/Skip (thân thẻ ~0), dưới trống ~100dp
  → không phân loại được. Gốc: luôn đệm đáy 96dp cho nút "+" (đã ẩn < 520dp) + thẻ `flex: 1` không chiều cao tối thiểu. Sửa (`sort.tsx`): cửa sổ < 520dp
  → bỏ đệm, thẻ cao 360dp, cả màn cuộn được. (B-89 v2 ✅ phiên F trên bcc8c7a: ảnh chụp lúc app chết được lấy lại, không trùng; huỷ camera trên khoản
  trống không tự mở Ghi nhanh.) Ghi nhận: nháp có ảnh để lại đúng lúc cài bản cập nhật thì mất ảnh (hiếm).

> **QA-100 kiểm lại trên máy (18/11):** đã tick các mục phiên con xác nhận đạt — B-59 (B), B-61 (E), B-63/64/70/73/79/82/84/85/86/89 (F), B-65/75 (B),
> B-67/68/76/80/87/91/92 (D), B-77 (A); B-69 (B: 0 sập trên máy lỗi EGL, nhánh "sập 1 lần" là giới hạn Phương đã chấp nhận); B-81 (thay bằng B-91 ✅). Còn mở: chờ kiểm lại hoặc chờ dữ liệu (B-88).
- [ ] **B-95** 🔴 (đọc code, phiên hỏi đáp của Phương 18/11) **Chuyến tự động trên iOS chưa chạy**: `modules/trip-detect/ios/TripDetectModule.swift`
  chỉ là khung — `getRecentEvents` trả `[]`, `startTransitions` chỉ phát `onSignal` khi app đang mở, và JS không nghe `onSignal` → `readSignals` luôn rỗng →
  engine không bao giờ thấy 'driving'. Chưa có "significant location change" để đánh thức app nền (PLAN-v2 §Rủi ro). Màn Automatic trips trên iOS vẫn bật
  được ("iPhone starts trips from motion") → người dùng tưởng đang chạy. Chưa thử được trên iPhone thật (không có Apple Developer + iPhone, TC-340).
- [ ] **B-96** 🟠 (đọc code, phiên hỏi đáp của Phương 18/11) iPhone thiếu báo nghi sót của chuyến **tay** (miễn phí, F-12/Q2): "Still on a trip?" (đứng yên
  ≥ 45 phút) và "Trip isn't recording" (mất vị trí ≥ 10 phút khi đang lái) chạy nhờ báo thức đánh thức (`sync.ts` `scheduleWake`, `native.ts`
  `configureNative`/`cancelWake`/`health`) — module iOS không có các hàm này (`native.ts` nuốt lỗi) → trên iPhone chỉ hiện khi mở app. Nhắc 12 giờ vẫn chạy.
  Phương duyệt làm chung phiên B-95.
- [x] **B-97** 🟡 (QA OLD-11, phiên B — Android 7.0) "Choose backup folder": bộ chọn thư mục Android 7 chỉ hiện "Recent · No items" tới khi bật ⋮ → Show internal
  storage; nhãn thư mục gốc hiện "This phone / primary:". Bộ chọn của expo-file-system không truyền được `SHOW_ADVANCED`. Sửa: Android < 8 hiện dòng hướng
  dẫn "If the list is empty, tap ⋮ → Show internal storage." dưới nút; nhãn bỏ "primary:" → "This phone".
> Phiên B (18/11): 40 persona Android 8/11 có kết quả thật (39 PASS, P074 = B-74); Android 7.0 x86 32-bit 8/8 PASS (mở nguội 1,24 s, PSS 84 MB, 0 crash/ANR).
> Phiên B (18/11, 97ceb60): **B-93 ✅** (API 26 chữ 0.85/1.3 + Android 7: đủ 4 ký hiệu, 12.50+4.20 = £16.70 lưu được); **B-74/OLD-10 ✅** (bộ nhớ đầy: bàn
> phím ẩn, "Couldn't save…" thấy rõ, số giữ nguyên) → tick B-57/B-58/B-72 (thay bằng B-93 + B-72 phần số tiền ✅).
- [x] **B-98** 🟡 (QA OLD-12, phiên B) Android 8/7: nút **Save** ở Ghi nhanh vẫn nằm sau bàn phím khi đang gõ (API 26 chữ 0.85 lộ 65/112px; chữ 1.3 lộ 43px;
  Android 7 che hết) — thiếu đúng ~24dp = thanh trạng thái (cùng gốc B-58). Sửa: bù `insets.top + insets.bottom` cho Android < 11 (`capture.tsx`); phím ✓ của
  bàn phím số giờ lưu khi số tiền > 0. Phiên B (1dd73db): phím ✓ lưu ✅; nút Save **không nhích pixel nào** (offset không có tác dụng trên Android < 11).
  Sửa lần 2: bỏ offset; Android < 11 đo khối nút Save (`measureInWindow`) so với mép trên bàn phím **quy về toạ độ cửa sổ** (`screenY − StatusBar.currentHeight`)
  rồi đệm thêm đúng phần bị che (≤ 200dp). Lần 2 ❌ (không đổi). Lần 3 (771234e): RN báo screenY = cao màn − cao bàn phím (bỏ qua thanh điều hướng
  48dp) → trừ thêm thanh điều hướng: mép bàn phím đúng (363/305dp) nhưng Save vẫn che — **gốc thật: thiếu chỗ** (phần trên 216dp, còn 89–147dp, khối
  dưới cần 157–211dp; đệm chỉ làm khối dài ra). Lần 4 (4f297e1): bàn phím mở + khối vẫn bị che → tạm ẩn hàng Photo/Work/Note, gợi ý, ảnh nhỏ, dòng phụ;
  giữ ô Note + Save tới khi bàn phím đóng. ✅ phiên B (0bdfed4): API 26 + Android 7, chữ 0.85/1.3: Save trọn trên bàn phím, ô Note + Save khi gõ ghi chú,
  đóng bàn phím hàng hiện lại, phím ✓ lưu (`qa-runs/android-old/verify-4f297e1/`).
> Phiên E (A13 thật, 8cb9c8f, dữ liệu thật + vân tay thật, 18/11): **B-62 ✅**, B-63 ✅, B-65 ✅ (Recents trắng; deep link khi khoá chỉ hiện Unlock), B-73 ✅,
> B-84 ✅, widget cập nhật ✅, CPU nền 10 phút 0,01% (B-51 không tái hiện), 20.000 khoản: cuộn giật 12%.
- [ ] **B-99** 🟠 (QA A13-3, phiên E — A13 thật, vân tay thật) App lock (Lock after 1 minute) → Ghi nhanh → Take photo → chụp hoá đơn > 1 phút → quay lại app
  đòi mở khoá → vân tay OK → về **Home, mất ảnh hoá đơn + khoản đang nhập**. Gốc: `features/entries/photo.tsx` gọi camera / thư viện ảnh KHÔNG bọc
  `withLockSuspended` (share sheet, bộ chọn file, bộ chọn thư mục đều có). Sửa: bọc cả 3 lời gọi ImagePicker. (B-84/B-89 v2 cũng giữ lại nháp + ảnh nếu
  app bị tắt.) ⏳ phiên E thử lại với vân tay thật.
> **B-95 + B-96 — đã viết code (phiên H, nhánh `ios-auto-trips`, merge vào `dev` de75d74 theo Phương 18/11)**: iOS đánh thức bằng significant location change
> + vùng 150 m quanh chỗ đỗ cuối, CoreMotion → vòng nhật ký bền `TripEventLog` → cùng `engine.step` với Android; kết thúc chuyến theo luật cũ; B-96: hẹn sẵn
> thông báo cục bộ "Still on a trip?" / "Trip isn't recording". jest 915/915, tsc, lint, build EAS iOS simulator xanh. **CHƯA thử iPhone thật** — 8 điểm cần chạy
> xe + giới hạn đã biết ở `qa/findings/ios-auto-trips.md`. Rủi ro lớn nhất: hẹn giờ không nổ khi máy ngủ → có thể gộp 2 chuyến. B-95/B-96 để mở tới khi thử thật.
> Phiên C (iOS lượt 3, run 44221266865, iOS 26.5, iPhone SE 3 + 16 Pro Max, 14/27 persona, **0 crash**): onboarding, 5 tab, nhập nhanh, chữ lạ, Save đúp → 1
> khoản, đổi vùng, tắt app sau Save, xuất CSV + "Did you send…" đều đạt. Phút macOS dùng 154 (vượt trần 150 ~4 phút). Còn 13 persona + iPad + khôi phục dữ
> liệu chờ Phương duyệt thêm phút.
- [ ] **B-100** 🟡 (QA iOS QI-1, phiên C) iPhone SE + chữ lớn: màn chọn vùng — thẻ United States khuất dưới nút Continue, không có gợi ý cuộn (màn đã cuộn được).
  Sửa: `ui/HintScroll.tsx` — nháy thanh cuộn khi nội dung dài hơn màn (màn chào + màn chọn vùng). (Màn chào cắt chữ = B-66.)
  iOS lượt 4b (phiên C, P091 SE AX-Large): tiêu đề đủ, nhưng thanh cuộn iOS chỉ nháy ~1 s → không thấy gợi ý. Sửa lần 2: thêm viên "More below ⌄" ở
  đáy, ở lại tới khi cuộn tới cuối, chạm = cuộn xuống ~1 màn (cả iOS + Android). Phiên B: vuốt bắt đầu trên viên không cuộn trang + viên che chữ
  "United States" → lần 3: nhãn không bấm (chạm xuyên qua) ở góc phải dưới. ✅ Android — phiên B (ef470b7): vuốt bắt đầu trên nhãn cuộn được trang.
  iOS lượt 4e (lần 2): viên hiện rõ ✅ nhưng đè dòng thẻ US → lần 3 ở góc ⏳ lượt 4g.
- [x] **B-101** 🟡 (QA iOS QI-3, phiên C) Ô Note ở Ghi nhanh đảo ký tự khi gõ nhanh (P052: "QA-P052 Shell M62" → "QA-052 Shell M62P"; 1/14). Sửa: ô không còn
  điều khiển `value` (dựng lại khi app tự điền: chip, đọc hoá đơn); nháp ghi file trễ 400 ms thay vì mỗi phím.
  ✅ iOS lượt 4e (phiên C, dev f424978, P052 SE chữ XXXL): ô Note + danh sách đúng "QA-P052 Shell M62".
- [x] **B-102** 🟠 (QA A13-4, phiên E — hoá đơn Tesco thật chụp bằng A13) 2/3 hoá đơn không ra số tiền (#2 giấy cong; #3 in phẳng "TOTAL: £33.50" có
  Subtotal/Savings phía trên và Cash/Change phía dưới) dù nơi bán + ngày đúng. **Gốc (dòng OCR thật, chẩn đoán 322acd6):** ảnh nghiêng vài độ → cả cột số
  lệch xuống ~0,6 dòng (TOTAL: cy 0,664, số 0,676, nhãn Cash 0,682) → luật "nhãn khác gần hơn" trong `rowAmounts` bỏ số → fallback 0,4 → trống; Tesco
  2022 y hệt; FreshHarvest: chữ to đọc "2174" mất dấu chấm. **Sửa (2 đợt):** đo độ lệch cột nhãn↔số từ mọi cặp rồi bù (`columnShift`); số dưới nhãn
  ("FUEL TOTAL" / "$ 20.00"); số nguyên sau ký hiệu tiền ("$5400"); "1.575,01"; nhãn tách chữ ("Subtota l"); tổng mất dấu chấm chỉ nhận khi = subtotal +
  tax hoặc = dòng thẻ. 3 lần đọc thật của A13 thành fixture Jest — cả 3 điền đúng.
  **Đợt 2 (phiên F đọc thật 20 ảnh Phương gom trên giả lập API 37, 2 bản 322acd6/4f297e1 = 40 lần đọc → `receiptSet.test.ts`):** trước sửa số tiền 18/20,
  nơi bán 16, ngày điền sai 1 (r12 "3/10/26" hoá đơn $ đọc kiểu UK). Sửa: dòng "Total" bảng VAT/GST sau CHANGE hạ ưu tiên; logo đọc lệch ("Iesço",
  "ShelI"); tên có số cửa hàng; bỏ dòng địa chỉ / nhãn "Date:" / chữ mẫu (Lorem Ipsum, Shop Name, MM/DD/YYYY); tiền tệ trên hoá đơn quyết định thứ tự
  ngày; "DATE06/21/06", "0CT", năm 94 → 1994; ưu tiên dòng ngày có giờ, bỏ "TOTAL UP TO"/"EXPIRES". Bản 4f297e1 thụt lùi 2 ca (r03, r18) do nén lại ảnh
  vốn đã nhỏ → `shrink` giữ nguyên ảnh nhỏ + đúng chiều, JPEG 92. Sau sửa (dòng ảnh gốc): số tiền 19/20, nơi bán 20/20 (r20 mẫu không tên → để trống),
  0 ngày sai. Giới hạn OCR: r11 ảnh 255 px có watermark, ML Kit đọc "$69.03" thành "$69.83" (độ tin cậy dòng 0,46 nhưng số đúng chỉ 0,50 → không
  dùng làm ngưỡng được) → điền sai, ghi nhận.
  **Đợt 3 (phiên F, 32 ảnh trên 3f26b33):** số tiền 29/32, nơi bán 29/32, ngày 30/32 (ngày cũ điền kèm năm); A13: Shrewsbury £55.30, Cradley nghiêng
  £33.50, FreshHarvest $21.74 + ngày có nhãn. **Giới hạn đã biết:** r11 OCR đọc nhầm số (ảnh 255 px); nơi bán điền sai ở 3 hoá đơn mẫu kiểu công ty /
  vé phạt (r22 "lexnet" logo cắt, r23 "Jane Smith" tên người trên mẫu, r28 "Ala Moana Center" = nơi gửi xe) ở 0,62 — nâng ngưỡng sẽ mất tên đúng
  (FreshHarvest, WideMart, Fuelmax…) cùng mức; ô nơi bán sửa được. 104 lần đọc thật là bộ test `receiptSet.test.ts`.
- [x] **B-103** 🟠 (QA A13-5, phiên E — Phương: "chụp hoá đơn rất đơ, nhận diện cũng đơ") Từ lúc bấm OK ở camera tới lúc bắt đầu đọc 14,9–17,8 s trên A13
  (camera 50 MP). Gốc: `photo.tsx` gọi picker với `quality: 0.6` → expo-image-picker giải nén + nén lại cả ảnh 50 MP (`CompressionImageExporter`); ML Kit
  lại giải nén ảnh gốc lần nữa. Sửa: Android dùng `quality: 1` (picker chỉ chép file) + `ReceiptOcr.shrink` native (giải nén lấy mẫu, xoay theo EXIF,
  cạnh dài ≤ 2400 px, JPEG 85) → đọc và lưu bản nhỏ, xoá bản to trong cache. iOS không đổi. Chẩn đoán ghi thời gian từng bước (`timing`: pickedAt,
  shrinkMs, ocrStartedAt, ocrMs). ⏳ phiên E đo lại trên A13. ✅ A13 (08cdb7b/3f26b33, phiên E): bấm OK → ô số tiền điền ≈ 4,3 s (trước 15–18 s); thu nhỏ 2,1–2,5 s + OCR 1,0–1,7 s.
- [ ] **B-104** 🟡 (QA F-1, phiên G — Firebase Test Lab máy thật Galaxy S26, Pixel 11 + máy ảo A17, 3/3) Bấm "Try Pro free for 7 days" → "Trial · 8 days
  left", thanh tiến độ âm. Gốc: `usePro()` dùng `now` của `useNow(60_000)` (cũ tới 1 phút) < `trialStartedAt` → `ceil` ra 8 (`domain/pro.ts`). Sửa: đếm từ
  `max(now, trialStartedAt)`, kẹp `daysLeft` 1..7 + test. ⏳ phiên G kiểm lại lượt máy thật sau.
- [x] **B-105** 🟠 (QA A13-6, phiên E — A13 bản 08cdb7b) Tesco Shrewsbury chụp thẳng: OCR thấy nhãn TOTAL/CASH/CHANGE DUE nhưng sót cả cột số → app
  **tự điền £7.00** (giá 1 món, đúng là £55.30). Gốc: `readAmount` nhánh "không có nhãn" vẫn chạy khi đã thấy nhãn TOTAL; còn đúng 1 số → 0,65 ≥ 0,6.
  Sửa: đã thấy nhãn tổng mà không đọc được số → 0,4 (gợi ý, không điền). 3 lần đọc mới thành fixture (`a13-receipts.json`). ✅ A13 (3f26b33): Shrewsbury £55.30, Bury để trống.
- [x] **B-106** 🟠 (QA A13-7, phiên E — A13, 3/3 lần) Bấm Take photo → camera Samsung mở bằng **camera trước** (chế độ làm đẹp) dù expo-image-picker xin
  camera sau; Phương phải tự đổi 3–14 s. Samsung bỏ qua CAMERA_FACING/LENS_FACING nên app không ép được qua intent. Đã thử camera trong app
  (147d3e2) rồi **gỡ** theo Phương (18/11): "tôi muốn dùng camera của điện thoại không code hay làm thêm camera riêng" → **giới hạn đã biết, Phương
  chấp nhận**.
- [ ] **B-107** 🟡 (QA A13, phiên E — dữ liệu thật) Cắm cáp vào máy tính + cầm máy → chuyến tự động "Start when charging" bắt đầu (đúng thiết kế: không phân
  biệt sạc xe / sạc máy tính); Phương bấm End trip → **"Trip saved · 0.0 km"** (bộ tự động tự bỏ chuyến < 500 m, nhưng kết thúc tay thì lưu). Sửa:
  `trip/active.tsx` kết thúc tay chuyến startedBy=auto < 500 m → **hỏi "Only 0.0 km — keep this trip?" 2 nút Discard / Keep** (Phương chốt
  18/11 qua phiên E: không tự bỏ; bản 2ac9e15 tự bỏ là sai ý — đã đổi). Chuyến 0 km đang nằm trong dữ liệu thật
  của Phương — phiên E hỏi Phương trước khi xoá.
- [x] **B-108** 🟠 (QA — phiên "A006 chụp nhập tự động" báo, Phương duyệt 18/11) Hoá đơn cũ hơn 400 ngày: OCR không điền ngày (độ tin cậy 0,3 +
  `receiptAt` chặn) → ô vẫn "Now". Tài xế dồn nhập trước hạn Self Assessment 31/1: hoá đơn tháng 4–5 năm thuế trước đã ~600–665 ngày → khoản ghi ngày
  hôm nay = **sai năm thuế**. Phương: bỏ giới hạn (năm "94" = 1994, "22/04/12" = 2012 là ngày thật). Sửa: bỏ luật 400 ngày ở `parseReceipt.readDate` và
  `fill.receiptAt`; vẫn chặn ngày tương lai; vẫn bỏ dòng hạn điểm / hết hạn / "TOTAL UP TO". Bộ 20 hoá đơn: mọi hoá đơn có in ngày đều điền đúng ngày
  (r11 OCR đọc rác → không điền). ⏳ kiểm trên máy. ✅ phiên F (3f26b33, 32 ảnh): ngày cũ điền đúng kèm năm (30/32); A13: FreshHarvest 2019 điền ngày có năm.
- [x] **B-109** 🟡 (QA A13-8, phiên E) Sau Save, tab Entries giữ vị trí cuộn cũ → mục TODAY + khoản mới nằm trên mép màn hình. Sửa: số khoản tăng (xếp
  mới nhất trước) → cuộn danh sách lên đầu. ✅ A13 (3f26b33): khoản mới hiện ngay đầu Entries.
  ❌ phiên B (API 26, 3f26b33): cuộn xuống rồi ghi khoản (FAB / tab Home) → Entries vẫn ở chỗ cũ — lệnh cuộn chạy lúc Entries bị che, FlashList bỏ qua
  (A13 đạt vì danh sách đang ở đầu). Sửa lần 2: so số khoản khi Entries hiện lại (useIsFocused) rồi mới cuộn. Phiên B (07f4aac): vẫn chỉ cuộn được
  một đoạn (dòng phía trên chưa đo) → lần 3: `scrollToIndex(0)` không hiệu ứng, lặp lại sau 400 ms. ✅ phiên B (ef470b7, API 26): cả 3 đường (FAB+✓,
  FAB+Save, Home) với danh sách đã cuộn ~4 trang → TODAY + khoản mới ở đầu; A13 (07f4aac) ✅.
- [ ] **B-110** 🟡 (QA A37-8/A37-9, phiên A — 320dp + chữ 200%) Reports: "Profit" cắt "−$1,073,09…", "By tax form line" bẻ chữ từng âm tiết + cắt số,
  "Expenses by category" cắt tên còn "Eq..". Sửa: số tiền xuống dòng dưới nhãn khi không đủ chỗ (bỏ adjustsFontSizeToFit), tên danh mục 2 dòng,
  số + % xuống dòng. ⏳ phiên A.
- [x] **B-111** 🟡 (QA A13, phiên E) Backup & restore hiện "Backup folder, Google Drive — not reachable" nhưng không rõ lỗi thật hay nhãn sai; "Back up now"
  chỉ mở bảng chia sẻ nên không kiểm được. Bước 1: file chẩn đoán (giữ lâu Version) có mục `backup` (provider, nightly, failCount, lastError, kết quả
  liệt kê thư mục + câu lỗi thật) — không đổi cài đặt. **Kết quả (phiên E, 3f26b33):** provider Google Drive, probe `folder gone` → thư mục Drive đã chọn
  không còn mở được (xoá/đổi hoặc mất quyền sau các lần cài đè / pm clear 17/11) — lỗi thật, không phải nhãn sai. Sửa: dòng báo "… can't be opened. Tap
  to choose it again." (chạm = chọn lại thư mục). Phương chọn lại thư mục khi tiện (đổi cài đặt trên dữ liệu thật → để Phương tự làm).
  ✅ A13 (phiên E, Phương duyệt trực tiếp 18/11): chọn lại thư mục Drive "A006" + bật sao lưu đêm → app sao lưu ngay 15:34; chẩn đoán probe ok:true.
  🟡 Ghi nhận (đợt sau): dòng Backup folder chỉ ghi "Google Drive" — người có nhiều tài khoản Drive khó biết thư mục nào (URI Drive là doc id,
  không có tên → cần hỏi tên qua DocumentFile).
- [x] **B-112** 🟡 (QA A13, phiên E, bản 2ac9e15) Hoá đơn FreshHarvest 2019 (B-108 giờ điền ngày cũ) hiện chip ngày "Wed 20 Nov, 11:09" — không có năm,
  dễ tưởng là tuần này trong khi khoản vào năm thuế 2019. Sửa: `dateTimeLabel` ghi năm khi khác năm hiện tại ("Wed 20 Nov 2019, 11:09") — chip Ghi nhanh
  + dòng Date & time ở Sửa khoản. ✅ A13 (3f26b33): chip ngày hiện năm.
- [ ] **B-113** 🟠 (QA A13-10, phiên E, bản 3f26b33 — dữ liệu thật) Có khoản "FreshHarvest Market −£21.74, **Fri 20 Nov 2020**, 11:09" (hoá đơn ghi 2019) mà
  phiên E không bấm Save (nháp trước đó đã Discard lúc 14:41). Kiểm: Discard chỉ xoá nháp, không tạo khoản; 2 đường tạo khoản ở Ghi nhanh là Save và phím
  ✓ bàn phím số (B-98); cả 2 lần OCR FreshHarvest trong chẩn đoán ra 20/11/**2019**; khoản không có trong backup 14:28. Phiên E đã xoá khoản (mất
  createdAt). Phiên E trả lời: khoản tạo trong 14:28–15:19; script của E chạm theo **toạ độ cố định** trên Ghi nhanh ((95,165) "X", (185,1745)
  Photo, (540,1990) Take photo) kể cả lúc nháp được khôi phục / bàn phím số mở — chạm có thể rơi vào chip ngày (lịch Samsung → đổi năm) và phím ✓ /
  Save; một khoản Tesco £55.30 lúc 15:08 cũng tự lưu sau chuỗi chạm y hệt. **Kết luận tạm: nghi do script chạm mù, không phải người dùng** — chưa tái
  hiện được bằng thao tác người; để mở theo dõi (gặp lại: chụp màn + chẩn đoán trước khi xoá). Phiên E bỏ chạm theo toạ độ (luật xưởng: chờ chữ rồi bấm).
  Phương tự bấm (ef470b7, 16:30–16:51): nháp FreshHarvest khôi phục sau khi app bị tắt (£21.74, nơi bán, ảnh, "20 Nov 2019") → X → Discard → không
  có khoản nào được lưu; FreshHarvest Save thường lưu đúng 2019. **Không tái hiện bằng tay** → đề xuất đóng là do script (chờ Phương duyệt).
- [x] **B-114** 🟠 (QA OLD-13, phiên B — 3f26b33, API 26, 360×640dp, chữ 2.0) Tab Sort: thẻ bị ép còn ~2px (header "Sort your wee/k" bẻ giữa chữ cạnh
  List view + chip tuần + thanh tiến độ chiếm hết chiều cao) → không thấy / không dùng được thẻ; List view vẫn sort được. Chữ 1.3–1.7 ổn. Gốc: chế độ
  cuộn (MOD-11) chỉ bật khi cửa sổ < 520dp, không tính cỡ chữ. Sửa: tính theo dp ÷ cỡ chữ, thẻ cao 360 × cỡ chữ (≤ 1.6), List view xuống dòng dưới
  tiêu đề, đệm dưới giữ chỗ FAB khi FAB còn hiện. Phiên B (04fa4f9): một phần — Edit/Split/Merge/Skip tới được, nhưng form Split bị cắt, không tới
  được "Split & sort" (ScrollView của thẻ lồng trong ScrollView màn → Android cần `nestedScrollEnabled`); tiêu đề vẫn chiếm nửa màn, List view cạnh
  tiêu đề, FAB che Skip. Sửa lần 2: `nestedScrollEnabled` ở thẻ khoản + thẻ chuyến; màn cuộn → tiêu đề cuộn cùng thẻ; chữ ≥ 1.5 → List view dòng riêng;
  ẩn FAB ở Sort khi màn cuộn. Phiên B (07f4aac = bản lần 1): ở chữ **1.3** trên 640dp form Split cũng không tới được "Split & sort" (lần 1 bật bố
  cục cuộn từ 1.3) — hồi quy cho cỡ "Large". Lần 3: bố cục cuộn chỉ khi chữ ≥ 1.8 (1.3–1.7 về bố cục thường đã chạy đúng ở 3f26b33).
  iOS QI-4 (phiên C, lượt 4d trên 322acd6 — chưa có sửa nào): AX-Large → thẻ Sort cắt mất danh mục / Work-Personal (P041 Pro Max), còn "Expense" +
  nút cắt (P016 SE) — cùng gốc; lần 3 áp cho iOS (fontScale AX > 1.8 → màn cuộn). ✅ Android — phiên B (ef470b7, API 26 360×640): chữ 2.0 tiêu đề
  không bẻ chữ, List view dòng riêng, tiêu đề cuộn cùng thẻ, FAB ẩn, Edit/Split/Merge/Skip bấm được, Skip không mở Ghi nhanh, P016 10/10 (split +
  merge); chữ 1.3 bố cục thường, "Split & sort" tới được; A13 chữ 2.0 ✅ (phiên E). ⏳ iOS (lượt 4g). 🟡 còn lại: chữ 2.0 khi cuộn thẻ trượt dưới
  thanh trạng thái (thiếu inset trên); nhãn nút "E… Sp.. Mer… Sk.." vẫn cắt. → lần 4 (Phương 18/11 "đã sửa đâu"): màn cuộn giữ inset trên ở
  màn (chữ không trượt dưới thanh trạng thái); chữ ≥ 1.3 → nút thẻ icon trên + nhãn nhỏ dưới (4 nút vừa 1 hàng). ✅ A13 (b843037, chữ 2.0):
  đủ chữ Edit / Split / Merge / Skip, cuộn không chui dưới thanh trạng thái.
- [x] **B-115** 🔴 (QA OLD-14, phiên B — 3f26b33, API 26) Android 7/8/9 (API 24–28): Ghi nhanh → Photo → "Take photo" **không bao giờ mở camera** (cấp quyền
  CAMERA rồi vẫn không); "Choose from library" vẫn được. Gốc: trên SDK < Q expo-image-picker đòi cả WRITE_EXTERNAL_STORAGE lẫn CAMERA
  (`ensureCameraPermissionsAreGranted`), mà `plugins/withReleasePermissions.js` xoá WRITE_EXTERNAL_STORAGE khỏi manifest release (B-19) → không xin
  được → 'failed'. Android 10+ (A13) không bị. Sửa: giữ WRITE_EXTERNAL_STORAGE với `maxSdkVersion="28"` trong manifest release. ✅ phiên B
  (07f4aac): API 26 + Android 7 — hỏi quyền camera + ảnh/tệp → camera mở → ảnh vào khoản, đúng chiều.
- [x] **B-116** 🟡 (QA OLD-15, phiên B — 360dp chữ 1.0) Chip ngày có năm "Tue 18 Nov 2025, 03:33" xuống 2 dòng, đẩy chữ "Expense" tràn khỏi nút. Sửa: khác
  năm thì bỏ thứ ("18 Nov 2025, 03:33"). Kèm OLD-14 phụ: camera không mở báo nhầm "Couldn't save the photo. Your entry was saved without it." → câu
  riêng "Couldn't open the camera. Try again, or hold Photo to choose from your library." ✅ phiên B (07f4aac, 360dp): chip 1 dòng "18 Nov 2025, 04:18";
  nút Expense|Income hơi chật nhưng không cắt.
- [ ] **B-117** 🔴 (QA iOS — phiên H thử Appetize, iPhone 14 Pro iOS 17.2, bản 55db0eb; 3/3 lần) End trip → màn chỉ còn "0.0", EndTripSheet không hiện,
  nút thu nhỏ không bấm được → phải tắt app. Log: "Attempt to present RCTFabricModalHostViewController … while a presentation is in progress". Gốc:
  `trip/active.tsx` — gpsDialog / shortDialog / endSheet ở vị trí con khác nhau trong 2 nhánh (còn chuyến / hết chuyến) → đổi nhánh thì React gỡ rồi
  dựng lại Sheet (RN Modal) đang mở, iOS từ chối mở Modal khi cái cũ đang đóng. Android không bị. Sửa: key cố định cho 3 lớp phủ (giữ nguyên khi đổi
  nhánh); "Keep" của B-107 mở Sheet sau khi Dialog đóng (iOS trễ 400 ms). ⏳ iOS (phiên C / Appetize).
- [ ] **B-118** 🟠 (QA iOS — phiên H) Câu xin quyền vị trí iOS (app.json) hứa "only while a trip you started is running" / "Recording stops when you end the
  trip" — sai từ khi có chuyến tự động (theo dõi rời chỗ đỗ / vùng 150 m ở nền) → Apple 5.1.1. Sửa: câu mới nói rõ chuyến tự động; câu trong app
  (`trip.permBody`) cũng sửa. Cần build iOS mới mới có hiệu lực. ⏳ Phương xem chữ trước khi nộp.
- [ ] **B-119** 🟡 (QA SPE-11, phiên D) `sundaysort://dev/gallery` mở được trong bản release (gallery.tsx thiếu chặn `__DEV__`). Sửa: chuyển về Home như dev/ocr,
  dev/probe. Link lạ khác ra màn "Unmatched Route" + nút Sitemap → thêm `src/app/+not-found.tsx` chuyển về Home. ⏳ phiên D.
- [ ] **B-120** 🟡 (QA SPE-12, phiên D) `export?mode=custom&end=1e17` hiện "NaN undefined NaN", tên file "…NaN-NaN-NaN.zip". Sửa: khoảng ngày qua `saneReportRange`
  như Reports (B-67); sai thì về năm thuế. ⏳ phiên D.
- [x] **B-121** 🟡 (QA SPE-10, phiên D — đọc code) File chẩn đoán ghi MAC + tên mọi thiết bị Bluetooth đã nối trong 7 ngày, không chỉ xe (BluetoothReceiver.kt:30).
  File chỉ rời máy khi người dùng tự chia sẻ. Sửa (JS, không cần native): file chẩn đoán chỉ ghi "van" cho thiết bị xe đã chọn, mọi thiết bị khác
  thành "other device", bỏ tên. ✅ A13 (b843037): 6 tín hiệu bt chỉ ghi "van", không MAC / tên (mẫu chưa có thiết bị khác ngoài xe).
  Ghi nhận QI-2 (iOS): log "[expo-notifications] Error reading persisted server registration info" mỗi lần mở — thư viện, app chỉ dùng thông báo local.
