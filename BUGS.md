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
- [ ] **B-08** 🟡 Widget Android 2×1: nút "−" / "+" không có nhãn trợ năng (TalkBack không đọc gì; widget 4×2 thì có) — case TC-180 —
  tái hiện: `uiautomator dump` trên màn hình chính: 2 nút của widget 2×1 không có `content-desc`. — commit:
- [ ] **B-09** 🟠 Tab Miles không cập nhật trạng thái quyền vị trí: từ chối quyền ở S-07a thì thẻ "GPS trips need location access"
  không hiện (kể cả chuyển tab); cấp lại quyền trong Cài đặt rồi quay lại app thì thẻ vẫn còn — chỉ đúng sau khi mở lại app —
  case TC-121 — tái hiện: Start trip → Allow location → "Không cho phép" → tab Miles không có thẻ; buộc dừng + mở lại thì có. — commit:
- [ ] **B-10** 🟡 Khi chạy chuyến có 2 thông báo cùng lúc: "Sunday Sort · trip recording / Recording your route until you end the trip."
  (dịch vụ nền) và "Trip running · x mi" (có nút) — product.md chỉ 1 thông báo cố định — case TC-124 — tái hiện: Start trip → kéo
  thanh thông báo. — commit: `3a93276`, `9a50703` — **chưa đạt**: kênh GPS mới ở mức MIN (1) nhưng Samsung vẫn hiện thông báo dịch vụ nền → vẫn 2 thông báo. Hướng tiếp (Phương chọn): (a) chấp nhận 2 thông báo, (b) bỏ thông báo "Trip running" riêng, chỉ giữ thông báo dịch vụ (mất nút Personal stop / End trip), (c) patch expo-location để thêm nút vào thông báo dịch vụ
- [ ] **B-11** 🟠 Thẻ "Your trip stopped recording at …" chỉ hiện ở tab Miles; mockup đặt ở Home khi mở app lần sau (Home không gắn
  `InterruptedTripCard`) → người không mở Miles sẽ không biết chuyến bị ngắt — case TC-132 — tái hiện: Start trip → thu hồi quyền vị
  trí → mở app: Home không có thẻ cam, Miles có. — commit:
- [ ] **B-12** 🟡 Giao diện tối: thanh điều hướng hệ thống Android vẫn trắng — case TC-187 — tái hiện: Settings → Theme Dark. — commit: `ca62a5e`, `9a50703` — **chưa đạt**: gọi native setStyle không lỗi nhưng cửa sổ vẫn giữ cờ LIGHT_NAVIGATION_BARS (`dumpsys window` mLastAppearance) khi app tối / máy sáng. Nghi: theme Activity (windowLightNavigationBar) hoặc cờ systemUiVisibility cũ đè lại — phiên sau kiểm styles.xml + thử tắt enforceNavigationBarContrast (plugin expo-navigation-bar)
- [x] **B-13** 🟡 Distance unit = Kilometres: Miles / Reports đổi sang km nhưng thẻ "This week" ở Home vẫn "Business miles 179" (đúng
  phải ~288 km) — case TC-186 — tái hiện: Settings → Distance unit → Kilometres → Home. — commit: `d5fb2ca` — thử A13: Home "Business km 246" (= 153 mi)
- [ ] **B-14** 🟠 Đổi vùng UK → US: các khoản giữ £ (đúng như hộp thoại) nhưng tổng ở Home/Reports gắn ký hiệu $ cho số tiền bảng
  ("$278.41" cộng từ các khoản £) — case TC-184 — tái hiện: dữ liệu UK → Settings → Region → United States → Home. Cần Phương chọn
  cách xử lý (cảnh báo / tách theo tiền tệ / chặn đổi khi đã có dữ liệu). — commit:
- [x] **B-15** 🟠 Màn Mileage rates: nút "Save" bị thanh điều hướng hệ thống che nửa dưới (cả sáng và tối) — case TC-185 —
  tái hiện: Settings → Mileage rates. — commit: `db53f99` — thử A13: nút Save đáy 2239 px, thanh điều hướng từ 2273 px
- [ ] **B-16** 🟡 Widget ghi "1 to sort" (chỉ tuần này) trong khi badge tab Sort / Home ghi 2 (mọi tuần) — 2 con số khác nhau cho
  cùng một việc — case TC-182 — tái hiện: có khoản chưa phân loại ở tuần trước → so widget với badge. Phương chọn đếm kiểu nào. — commit:
- [x] **B-17** 🟡 Deep link `sundaysort://trip/start` (product.md §4) mở "Edit trip · This trip no longer exists."; app thực dùng
  `sundaysort://trip/active?start=1` — case TC-191 — tái hiện: `adb shell am start -d sundaysort://trip/start`. Sửa link hoặc
  product.md cho khớp. — commit: `7d8f7ff` — thử A13: `sundaysort://trip/start` mở màn chuyến đang ghi
- [ ] **B-18** 🟠 Khôi phục sao lưu khi đang chạy chuyến: dữ liệu chuyến mất đúng nhưng thông báo "Trip running · 0.0 mi" và
  dịch vụ ghi vị trí vẫn chạy; bấm "End trip" trên thông báo không xoá được nó (chỉ hết khi buộc dừng app) — case TC-171 —
  tái hiện: Start trip → Settings → Restore from backup → Replace → kéo thanh thông báo. — commit:
- [x] **B-19** 🟠 APK khai quyền thừa so với app không mạng / không push: `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`,
  `com.google.android.c2dm.permission.RECEIVE`, `INTERNET` (+ quyền badge của nhiều hãng launcher) — ảnh hưởng Data safety và
  câu "dữ liệu không rời máy" — case TC-198 — tái hiện: `aapt2 dump permissions app-release.apk`. — commit: `38be276` — aapt2: APK release chỉ còn vị trí, dịch vụ nền, thông báo, sinh trắc, camera, wake lock
- [ ] **B-20** 🟠 Cuộn Entries giật với dữ liệu lớn (1.515 khoản): 50% khung hình 61–101 ms, 90% 150–250 ms trên Galaxy A13
  (mượt cần ≤ 16 ms) — case TC-175 — tái hiện: khôi phục file 1.500 khoản → Entries → vuốt nhanh; `dumpsys gfxinfo`. — commit: `be72dc6` (nhánh perf/speed) — **cải thiện, chưa đạt ≤ 16 ms**:
  đo lại cùng cách (1.515 khoản, 20 lần vuốt): khung hình vẽ được 98 → 413, giật 20% → 11%, p90 89 → 44 ms, p99 200 → 61 ms.
- [ ] **B-21** 🟡 Mở Ghi nhanh qua màn khoá (widget / thông báo khi App lock bật): sau khi mở khoá, bàn phím số không tự bật
  (product.md: "bàn phím số tự bật"), dòng "No category needed…" nằm dưới thanh điều hướng — case TC-178 — tái hiện: App lock +
  Immediately → ra màn hình chính → widget 2×1 "−" → mở khoá vân tay. — commit:
- [ ] **B-22** 🟡 Màn 320dp: nút "Add manually" ở tab Miles bị cắt thành "Add manua…" — case TC-194 — tái hiện: Thu phóng màn hình
  lớn nhất (density 540 = 320dp) → Miles. — commit:
- [ ] **B-23** 🔴 App tắt đột ngột ở lần bấm đầu sau khi đổi cỡ chữ hệ thống: "JavascriptException: The imperative router is
  unavailable before the first render has finished" (router.push trong onPress) — case TC-195 — tái hiện: app đang chạy nền →
  đổi Cỡ chữ trong Cài đặt máy → mở lại app → bấm "− Expense" ngay → app tắt. Mở lại lần sau thì không lỗi. Có thể cũng xảy ra với
  đổi chế độ tối / ngôn ngữ máy (đều dựng lại Activity). — commit:
- [ ] **B-24** 🟡 Cỡ chữ 200%: số tiền vẫn hiện đủ nhưng nhiều nhãn bị cắt / vỡ: Ghi nhanh "Expens/e" xuống dòng, 3 nhãn
  "Photo · Tap for Personal · Note" dính thành một dòng; "This week ·..", "Kwik Fi..", "Unsorte..", "Add ma..", "Busine.."; badge số
  đè icon tab Sort — case TC-195 — tái hiện: Cỡ chữ lớn nhất (font_scale 2.0) → các tab. — commit:
