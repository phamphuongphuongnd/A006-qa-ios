# A006-sundaysort — Lỗi (bước 4–6)

> Bước 4 chỉ ghi, bước 5 sửa từ nặng tới nhẹ. Sửa xong + test hồi quy → tick `[x]` và ghi commit.
> Mức: 🔴 chặn/sai dữ liệu · 🟠 sai chức năng · 🟡 giao diện/chữ.
> Thử trên Galaxy A13, APK release `f211b38`, dữ liệu mẫu khôi phục từ file sao lưu dựng sẵn (2026-11-12).

- [ ] **B-01** 🔴 Thẻ Sort: khoản đã đánh **Personal** bị lật thành **Work** khi chạm chip danh mục — công tắc Work/Personal trên thẻ
  lấy gợi ý lịch sử và đè phạm vi người dùng đã chọn → chi tiêu cá nhân bị tính vào chi phí kinh doanh — case TC-094 —
  tái hiện: tách "Shell M62 £72.40" thành 60.00 Work + 12.40 **Personal** → tab Sort, thẻ £12.40 có nhãn "Personal" nhưng công tắc
  sáng "Work" → chạm "Fuel" → Entries hiện "Shell M62, −£12.40, Fuel, **Work**". (List view "Accept all" giữ đúng Personal.) — commit:
- [ ] **B-02** 🟠 Sao lưu: huỷ bảng chia sẻ vẫn ghi "Last backup …" → banner Home và nhắc 30 ngày tắt dù chưa có file nào được lưu —
  case TC-168 — tái hiện: Settings → Backup & restore → "Back up now" → bấm Back đóng bảng chia sẻ → "Last backup 12 Nov 2026, 11:58". — commit:
- [ ] **B-03** 🟠 Settings › About thiếu "Privacy policy" (mở web) và "Contact" (mở email) theo product.md F-20 — case TC-189 —
  tái hiện: Settings → cuộn xuống ABOUT: chỉ có How Sunday Sort works, Not tax advice, Rate the app, Version. Cần Phương cho link
  privacy policy + email liên hệ. — commit:
- [ ] **B-04** 🟠 FAB "+" chỉ có ở tab Entries; Sort / Miles / Reports không có (product.md §4 + F-02: "trên các tab khác có FAB") —
  case TC-019 — tái hiện: mở tab Sort / Miles / Reports, không có nút "+". Mockup cũng chỉ vẽ FAB ở Entries → Phương chọn theo
  product.md hay theo mockup. — commit:
- [ ] **B-05** 🟡 Chữ gợi ý (placeholder) đậm như dữ liệu thật: số đồng hồ "48,210" / "48,338" ở Add trip, "e.g. Amazon route DLS4"
  ở Add trip và Edit trip, ô "DELETE" ở hộp thoại xoá toàn bộ (trông như đã gõ, nút đỏ trông bấm được nhưng không làm gì) —
  case TC-119, TC-188 — tái hiện: Miles → Add manually: ô trống trông như đã điền số. — commit:
- [ ] **B-06** 🟡 Reports › "By tax form line" có 2 dòng "Unsorted" giống hệt (một của thu £620.00, một của chi £420.67), không biết
  dòng nào là thu/chi — case TC-148 — tái hiện: Reports → Year, kỳ có cả thu và chi chưa phân loại → cuộn tới bảng SA103. — commit:
- [ ] **B-07** 🟡 Mở Entries từ Reports (chạm cột danh mục): chip lọc đang bật ("Selected period", "Fuel") nằm khuất cuối hàng chip,
  màn đầu chỉ thấy "All" không sáng → không biết danh sách đang bị lọc; "Selected period" không nói kỳ nào — case TC-147 —
  tái hiện: Reports → chạm cột "Fuel" → Entries. — commit:
- [ ] **B-08** 🟡 Widget Android 2×1: nút "−" / "+" không có nhãn trợ năng (TalkBack không đọc gì; widget 4×2 thì có) — case TC-180 —
  tái hiện: `uiautomator dump` trên màn hình chính: 2 nút của widget 2×1 không có `content-desc`. — commit:
- [ ] **B-09** 🟠 Tab Miles không cập nhật trạng thái quyền vị trí: từ chối quyền ở S-07a thì thẻ "GPS trips need location access"
  không hiện (kể cả chuyển tab); cấp lại quyền trong Cài đặt rồi quay lại app thì thẻ vẫn còn — chỉ đúng sau khi mở lại app —
  case TC-121 — tái hiện: Start trip → Allow location → "Không cho phép" → tab Miles không có thẻ; buộc dừng + mở lại thì có. — commit:
- [ ] **B-10** 🟡 Khi chạy chuyến có 2 thông báo cùng lúc: "Sunday Sort · trip recording / Recording your route until you end the trip."
  (dịch vụ nền) và "Trip running · x mi" (có nút) — product.md chỉ 1 thông báo cố định — case TC-124 — tái hiện: Start trip → kéo
  thanh thông báo. — commit:
- [ ] **B-11** 🟠 Thẻ "Your trip stopped recording at …" chỉ hiện ở tab Miles; mockup đặt ở Home khi mở app lần sau (Home không gắn
  `InterruptedTripCard`) → người không mở Miles sẽ không biết chuyến bị ngắt — case TC-132 — tái hiện: Start trip → thu hồi quyền vị
  trí → mở app: Home không có thẻ cam, Miles có. — commit:
- [ ] **B-12** 🟡 Giao diện tối: thanh điều hướng hệ thống Android vẫn trắng — case TC-187 — tái hiện: Settings → Theme Dark. — commit:
- [ ] **B-13** 🟡 Distance unit = Kilometres: Miles / Reports đổi sang km nhưng thẻ "This week" ở Home vẫn "Business miles 179" (đúng
  phải ~288 km) — case TC-186 — tái hiện: Settings → Distance unit → Kilometres → Home. — commit:
- [ ] **B-14** 🟠 Đổi vùng UK → US: các khoản giữ £ (đúng như hộp thoại) nhưng tổng ở Home/Reports gắn ký hiệu $ cho số tiền bảng
  ("$278.41" cộng từ các khoản £) — case TC-184 — tái hiện: dữ liệu UK → Settings → Region → United States → Home. Cần Phương chọn
  cách xử lý (cảnh báo / tách theo tiền tệ / chặn đổi khi đã có dữ liệu). — commit:
- [ ] **B-15** 🟠 Màn Mileage rates: nút "Save" bị thanh điều hướng hệ thống che nửa dưới (cả sáng và tối) — case TC-185 —
  tái hiện: Settings → Mileage rates. — commit:
- [ ] **B-16** 🟡 Widget ghi "1 to sort" (chỉ tuần này) trong khi badge tab Sort / Home ghi 2 (mọi tuần) — 2 con số khác nhau cho
  cùng một việc — case TC-182 — tái hiện: có khoản chưa phân loại ở tuần trước → so widget với badge. Phương chọn đếm kiểu nào. — commit:
- [ ] **B-17** 🟡 Deep link `sundaysort://trip/start` (product.md §4) mở "Edit trip · This trip no longer exists."; app thực dùng
  `sundaysort://trip/active?start=1` — case TC-191 — tái hiện: `adb shell am start -d sundaysort://trip/start`. Sửa link hoặc
  product.md cho khớp. — commit:
- [ ] **B-18** 🟠 Khôi phục sao lưu khi đang chạy chuyến: dữ liệu chuyến mất đúng nhưng thông báo "Trip running · 0.0 mi" và
  dịch vụ ghi vị trí vẫn chạy; bấm "End trip" trên thông báo không xoá được nó (chỉ hết khi buộc dừng app) — case TC-171 —
  tái hiện: Start trip → Settings → Restore from backup → Replace → kéo thanh thông báo. — commit:
- [ ] **B-19** 🟠 APK khai quyền thừa so với app không mạng / không push: `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`,
  `com.google.android.c2dm.permission.RECEIVE`, `INTERNET` (+ quyền badge của nhiều hãng launcher) — ảnh hưởng Data safety và
  câu "dữ liệu không rời máy" — case TC-198 — tái hiện: `aapt2 dump permissions app-release.apk`. — commit:
- [ ] **B-20** 🟠 Cuộn Entries giật với dữ liệu lớn (1.515 khoản): 50% khung hình 61–101 ms, 90% 150–250 ms trên Galaxy A13
  (mượt cần ≤ 16 ms) — case TC-175 — tái hiện: khôi phục file 1.500 khoản → Entries → vuốt nhanh; `dumpsys gfxinfo`. — commit:
