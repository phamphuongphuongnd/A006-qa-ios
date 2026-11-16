# A006-sundaysort — Test cases (bước 4)

> Sinh từ `product.md` (2026-11-12). Mỗi case 1 dòng. Kết quả: ✅ đạt · ❌ lỗi (ghi mã B-xx) · ⏭ bỏ (lý do).
> Cách: **T** = test tự động (Jest, ghi file) · **M** = thử trên Galaxy A13 qua adb · **M·P** = Phương đổi cài đặt máy
> (chữ, TalkBack, màn, mạng, vị trí, giao diện tối) rồi tôi chạy case, xong Phương trả lại như cũ.
> File test viết tắt (trong `src/**/__tests__/`): `repos` `tripsX`(tripsExtra) `rates`(mileageRates) `money` `csv`(reportCsv)
> `splitM`(splitMergeMileage) `suggest` `taxY`(taxYear) `backup` `logic`(entries/logic) `reports` `drag`(dragList)
> `reminder` `fmt`(formatSketch) `tripForm`(tripFormCheck) `widget`(widgets/data).

| Mã | Tính năng | Trường hợp | Kết quả mong đợi | Cách | Kết quả |
|---|---|---|---|---|---|
| TC-001 | F-01 | Cài mới, mở app | S-01a "Log it in 10 seconds. Sort it on Sunday.", phụ đề đúng, nút "Get started", không có đăng nhập | M | ✅ |
| TC-002 | F-01 | S-01b trên máy vùng không phải UK/US (A13 vùng VN) | Không thẻ nào chọn sẵn, "Continue" mờ tới khi chọn | M | ✅ |
| TC-003 | F-01 | Chọn "United Kingdom" | Thẻ được chọn, dòng phụ "£ · Tax year 6 Apr – 5 Apr · Self Assessment (SA103)", Continue sáng | M | ✅ |
| TC-004 | F-01 | Nút quay lại ở S-01b | Về S-01a | M | ✅ |
| TC-005 | F-01 | S-01c vùng UK | Chip 3 Income + 9 Expenses đúng tên SA103 (mục 5) | M | ✅ |
| TC-006 | F-01 | Cài mới chọn "United States", S-01c | Chip đúng tên Schedule C (Vehicle repairs, Vehicle insurance…) | M | ✅ |
| TC-007 | F-01 | S-01d mặc định | Ngày "Sun", giờ 18:00 | M | ✅ |
| TC-008 | F-01 | "Turn on reminder" + cho phép quyền | Vào Home rỗng; Settings → Weekly reminder bật Sun 18:00 | M | ✅ |
| TC-009 | F-01 | "Turn on reminder" + từ chối quyền thông báo | Vẫn vào Home, snackbar "Reminders are off. You can turn them on in Settings." | M | ✅ |
| TC-010 | F-01 | "Not now" ở S-01d | Vào Home; Weekly reminder tắt | M | ✅ |
| TC-011 | F-01 | Thoát app (vuốt khỏi đa nhiệm) ở S-01c rồi mở lại | Bắt đầu lại onboarding, không vào Home dở dang | M | ✅ |
| TC-012 | F-01 | Mở lại app sau khi xong onboarding | Vào thẳng Home | M | ✅ |
| TC-013 | F-01 | Danh mục mặc định được tạo đúng 1 lần | 3 income + 9 expense, mở lại không nhân đôi | T repos | ✅ |
| TC-014 | F-02 | Gõ "1250" | "£12.50" (kiểu máy tính tiền) | T logic, money | ✅ |
| TC-015 | F-02 | Gõ quá 999,999.99; ký tự lạ; xoá lùi | Không nhận thêm số; bỏ ký tự lạ; xoá lùi đúng | T logic, money | ✅ |
| TC-016 | F-02 | Số tiền = 0 | Nút "Save" mờ, bấm không lưu | M | ✅ |
| TC-017 | F-02 | Mở từ "− Expense" trên Home | Sheet bật "Expense" (cam), "£0.00", bàn phím số tự bật | M | ✅ |
| TC-018 | F-02 | Mở từ "+ Income" | Công tắc "Income" (xanh lá) | M | ✅ |
| TC-019 | F-02 | FAB "+" trên tab Entries / Sort / Miles / Reports | Mở Ghi nhanh mặc định Expense | M | ❌ B-04; FAB chỉ có ở Entries; Sort/Miles/Reports không có (mockup cũng chỉ vẽ ở Entries) |
| TC-020 | F-02 | Gõ 12.50 → Save | Sheet đóng, snackbar "Saved · £12.50 expense" + "Undo"; khoản ở Recent có chấm vàng | M | ✅ |
| TC-021 | F-02 | Bấm "Undo" trong 5 giây sau lưu | Khoản biến mất khỏi Recent / Entries | M | ✅ |
| TC-022 | F-02 | Chạm chip "Now", chọn ngày hôm qua 13:05 | Chip hiện dạng "Wed 11 Nov, 13:05"; khoản nằm nhóm "Yesterday" | M | ✅ |
| TC-023 | F-02 | Settings Default = Personal rồi mở Ghi nhanh | Chip mặc định "Personal" | M | ✅ |
| TC-024 | F-02 | Ghi chú dài > 120 ký tự | Dừng ở 120 ký tự | M | ✅ |
| TC-025 | F-02 | Đã có vài ghi chú lặp lại | Hàng chip gợi ý tối đa 5 ghi chú dùng nhiều nhất; chạm điền vào ô | M | ✅ |
| TC-026 | F-02 | "Photo" → chụp | Ảnh nhỏ 56dp có ✕; ✕ bỏ ảnh | M | ✅ |
| TC-027 | F-02 | Giữ lâu "Photo" | Mở chọn ảnh từ thư viện | M | ✅ |
| TC-028 | F-02 | Quyền camera bị từ chối (pm revoke) → "Photo" | Hộp thoại "Camera access is off" + "Open settings" / "Not now" | M | ✅ |
| TC-029 | F-02 | ✕ khi đã gõ số / khi chưa gõ | Đã gõ: "Discard this entry?" · Keep editing giữ số, Discard đóng; chưa gõ: đóng ngay | M | ✅ |
| TC-030 | F-02 | Settings "Keep adding after save" bật → Save | Sheet trống lại để ghi tiếp | M | ✅ |
| TC-031 | F-02 | Chữ dưới nút Save | "No category needed — you'll sort it on Sunday."; không có ô danh mục | M | ✅ |
| TC-032 | F-02 | Giữ lâu icon app | Phím tắt "New expense" / "New income" / "Start trip" mở đúng | M | ✅ |
| TC-033 | F-02 | Lưu khoản ≤ 0 ở tầng dữ liệu | Bị từ chối | T repos | ✅ |
| TC-034 | F-02 | Khoản ghi nhanh | Lưu ở trạng thái chưa phân loại (category null) | T repos | ✅ |
| TC-035 | F-03 | Home khi chưa có khoản | Minh hoạ + "Your first entry takes 10 seconds." + mũi tên chỉ 2 nút | M | ✅ |
| TC-036 | F-03 | Lời chào theo giờ | Morning / Afternoon / Evening đúng khung giờ | T logic | ✅ |
| TC-037 | F-03 | Nhãn năm thuế | UK "Tax year 2026/27", US "Tax year 2026" | M | ✅ |
| TC-038 | F-03 | Ghi 1 income + 1 expense tuần này | Thẻ "This week" In / Out / Net / Business miles đúng | M | ✅ |
| TC-039 | F-03 | Chạm thẻ "This week" | Reports lọc tuần này | M | ✅ |
| TC-040 | F-03 | Thẻ "To sort" có khoản | "N entries to sort" + "Sunday's job — about N minutes" + "Sort now" mở tab Sort | M | ✅ "1 entry to sort · about a minute" + Sort now |
| TC-041 | F-03 | Hết khoản chưa phân loại | "All sorted ✓" + "Nice. Nothing waiting for Sunday." | M | ✅ |
| TC-042 | F-03 | Ước tính phút phân loại | Đúng công thức | T logic | ✅ |
| TC-043 | F-03 | Recent | 5 khoản mới nhất, "No note" khi trống, icon ảnh, chấm vàng; "See all" → Entries | M | ✅ |
| TC-044 | F-03 | Banner: chưa sao lưu lần nào | Chỉ hiện khi ≥ 20 khoản | T logic | ✅ |
| TC-045 | F-03 | Banner: lần sao lưu cuối > 30 ngày | Hiện "Last backup N days ago" | T logic | ✅ |
| TC-046 | F-03 | Banner ✕ / tắt nhắc sao lưu | Ẩn 7 ngày; tắt nhắc → không hiện | T logic | ✅ |
| TC-047 | F-03 | Banner "Back up now" | Mở S-12 | M | ✅ |
| TC-048 | F-03 | Thẻ chuyến khi không chạy | "Start trip" + "GPS records your business miles until you stop." | M | ✅ |
| TC-049 | F-03 | Badge tab Sort | Ẩn khi 0; hiện số; "99+" khi > 99 (dữ liệu lớn TC-175) | M | ✅ 99+ |
| TC-050 | F-04 | Nhóm ngày | "Today" / "Yesterday" / "Mon 9 Nov" + tổng ngày "−£42.10 / +£310.00" | T logic | ✅ |
| TC-051 | F-04 | Tìm theo ghi chú / số tiền | Ra đúng khoản | T repos | ✅ |
| TC-052 | F-04 | Chip lọc Unsorted / Income / Expenses / Work / Personal / With receipt | Lọc đúng | T repos, logic | ✅ |
| TC-053 | F-04 | Lọc "Date ▾" | Khoảng ngày đúng | T logic | ✅ |
| TC-054 | F-04 | Lọc "Category ▾" trên máy | Chỉ khoản của danh mục đó | M | ✅ |
| TC-055 | F-04 | Lọc không ra kết quả | "Nothing matches these filters" + "Clear filters" xoá lọc | M | ✅ |
| TC-056 | F-04 | Entries rỗng | "No entries yet" + "Add your first entry" mở Ghi nhanh | M | ✅ |
| TC-057 | F-04 | Dòng khoản | "?" vàng nếu chưa phân loại, "Unsorted · Work · 07:42", kẹp giấy nếu có ảnh, nhãn "Personal" xám | M | ✅ |
| TC-058 | F-04 | Giữ lâu 1 dòng, chạm thêm 2 dòng | Thanh "3 selected" + Merge, Set category, Work/Personal, Delete | M | ✅ |
| TC-059 | F-04 | Chọn nhiều → "Set category" / "Work/Personal" | Áp danh mục / đảo phạm vi cho mọi khoản đã chọn | M | ✅ set category + work/personal |
| TC-060 | F-04 | Chọn nhiều → "Delete" | Hỏi xác nhận, xoá, có Undo | M | ✅ Undo của xoá hàng loạt chưa bắt kịp bằng uiautomator; Undo của xoá 1 dòng có |
| TC-061 | F-04 | Vuốt trái / vuốt phải 1 dòng | Trái: "Delete"; phải: đảo Personal ↔ Work | M | ✅ vuốt hiện nút Work/Delete, Undo có |
| TC-062 | F-05 | Chạm khoản | S-05: ✕, "Expense", ⋯; số tiền, Date & time, Note, Category, Work/Personal, Receipts | M | ✅ |
| TC-063 | F-05 | Chưa sửa gì | "Save changes" mờ | M | ✅ |
| TC-064 | F-05 | Sửa số tiền + ghi chú → Save | Danh sách cập nhật ngay | M | ✅ |
| TC-065 | F-05 | Đổi Expense ↔ Income | Danh mục bị xoá (về Unsorted) | T repos | ✅ |
| TC-066 | F-05 | Sửa rồi ✕ / nút back | "Discard changes?" · Discard / Keep editing | M | ✅ |
| TC-067 | F-05 | "+ Add photo", chạm ảnh | Xem toàn màn hình, zoom, "Delete photo" | M | ✅ |
| TC-068 | F-05 | ⋯ → Delete | "Delete this entry?" + "This also deletes its receipt photos." → snackbar "Entry deleted" + Undo | M | ✅ |
| TC-069 | F-05 | Xoá + Undo ở tầng dữ liệu | Khôi phục khoản + ảnh; file mồ côi được báo | T repos | ✅ |
| TC-070 | F-05 | ⋯ → Duplicate | Có bản sao cùng số tiền / ghi chú | M | ✅ |
| TC-071 | F-05 | Mở 1 phần đã tách | Dòng "Split from £60.00 on 9 Nov"; chạm mở các phần cùng nhóm | M | ✅ |
| TC-072 | F-06 | Chia mặc định | 2 phần chia đôi, số lẻ dồn phần đầu | T splitM | ✅ |
| TC-073 | F-06 | Tổng ≠ gốc / phần = 0 / > 10 phần | Bị chặn | T splitM | ✅ |
| TC-074 | F-06 | S-06b | Tiêu đề "Split £60.00"; "Left to assign £0.00" xanh; lệch → cam "£5.00 left" / "£5.00 over" | M | ✅ |
| TC-075 | F-06 | "+ Add part" tới 10 phần | Không thêm được phần 11 | M | ✅ |
| TC-076 | F-06 | Còn lại ≠ 0 hoặc có phần 0 | Nút "Split" mờ | M | ✅ |
| TC-077 | F-06 | Tách khoản có ảnh | Ảnh gắn mọi phần; Undo gộp lại | T repos | ✅ |
| TC-078 | F-06 | Tách từ nút "Split" trên thẻ Sort | Mở S-06b, xong quay lại Sort | M | ✅ |
| TC-079 | F-06 | Nhập số tiền phần | Đọc đúng "12.5", "12.50", bỏ rác | T logic | ✅ |
| TC-080 | F-07 | Gộp | Tổng đúng, ngày sớm nhất, ghi chú nối " · " không trùng | T splitM | ✅ |
| TC-081 | F-07 | Danh mục / phạm vi khác nhau | Danh mục → Unsorted | T splitM | ✅ |
| TC-082 | F-07 | Khác loại / < 2 khoản | Bị chặn | T splitM | ✅ |
| TC-083 | F-07 | Chọn 3 expense → Merge | "Merge 3 entries into one £27.40 expense?" · Merge / Cancel | M | ✅ |
| TC-084 | F-07 | Chọn 1 income + 1 expense → Merge | Nút mờ, chạm hiện "You can only merge entries of the same type." | M | ✅ |
| TC-085 | F-07 | Sau gộp → Undo | Snackbar "Merged 3 entries"; Undo trả lại 3 khoản | M | ✅ |
| TC-086 | F-08 | Hàng đợi | Cũ trước, Skip xuống cuối, đã phân loại bỏ ra | T logic | ✅ |
| TC-087 | F-08 | Chọn tuần mặc định | Tuần gần nhất còn khoản | T logic | ✅ |
| TC-088 | F-08 | Header Sort | "Sort your week" + "This week · 9–15 Nov ▾"; danh sách tuần "2–8 Nov · 3 left" | M | ✅ |
| TC-089 | F-08 | Thanh tiến độ | "N of M sorted" tăng khi phân loại | M | ✅ |
| TC-090 | F-08 | Chạm chip gợi ý | Thẻ trượt đi, thẻ kế lên; snackbar Undo trả thẻ lại | M | ✅ |
| TC-091 | F-08 | "More…" | Mở toàn bộ danh mục cùng loại (không có danh mục ẩn) | M | ✅ |
| TC-092 | F-08 | "Skip" | Thẻ xuống cuối | M | ✅ |
| TC-093 | F-08 | "Edit" trên thẻ | Mở S-05, lưu xong quay lại Sort | M | ✅ |
| TC-094 | F-08 | Công tắc Work/Personal trên thẻ | Lưu theo phạm vi chọn | M | ❌ B-01; khoản Personal bị lật Work khi chạm chip |
| TC-095 | F-08 | "List view" → ✓ 1 dòng | Dòng đó được phân loại theo chip gợi ý | M | ✅ |
| TC-096 | F-08 | "Accept all suggestions (N)" | Hỏi "Apply suggested categories to N entries?" → áp hết | M | ✅ |
| TC-097 | F-08 | Phân loại hết tuần | S-06c "Week sorted ✓" + In / Out / miles; thẻ "Back up your log" nếu cần; "Done" | M | ✅ |
| TC-098 | F-08 | Không có gì để phân loại | "Nothing to sort" + "Entries you log during the week will wait here for Sunday." | M | ✅ |
| TC-099 | F-08 | Tuần | Thứ 2 00:00 → Chủ nhật 23:59, tuần qua 2 tháng | T taxY | ✅ |
| TC-100 | F-09 | Ghi chú "SHELL, M62!" chưa có lịch sử | Fuel đứng đầu (bỏ hoa thường, dấu câu) | T suggest | ✅ |
| TC-101 | F-09 | Loại / số lượng / danh mục ẩn | Chỉ cùng loại, tối đa 3, không gợi ý danh mục ẩn | T suggest | ✅ |
| TC-102 | F-09 | Lịch sử khác từ khoá sẵn; từ khoá nhiều chữ | Lịch sử thắng; "amazon flex" chỉ khớp cả cụm | T suggest | ✅ |
| TC-103 | F-09 | Không đủ dữ liệu | 3 danh mục dùng nhiều nhất, rồi thứ tự mặc định | T suggest | ✅ |
| TC-104 | F-09 | Số tiền giống ±10% cùng ghi chú | Cộng điểm cho danh mục đó; lệch > 10% không cộng | T suggest | ✅ |
| TC-105 | F-09 | Gợi ý Work/Personal | Theo lịch sử; hoà / không dữ liệu → không gợi ý | T suggest | ✅ |
| TC-106 | F-10 | Tên trống / trùng tên | "Name can't be empty" / "You already have a category with this name" | T repos | ✅ |
| TC-107 | F-10 | Ẩn / xoá | Danh mục đã dùng chỉ ẩn được; chưa dùng mới xoá được | T repos | ✅ |
| TC-108 | F-10 | Kéo sắp xếp | Thứ tự mới lưu lại, mở lại vẫn giữ | T drag + M | ✅ |
| TC-109 | F-10 | Sửa tên, icon & màu, ô tờ khai | Lưu, dòng hiện "SA103: …" mới | M | ✅ |
| TC-110 | F-10 | "+ Add category" | Danh mục mới hiện ở Sort / More… | M | ✅ |
| TC-111 | F-10 | Ẩn 2 danh mục | Mục "Hidden (2)" thu gọn ở cuối; không hiện ở Sort | M | ✅ |
| TC-112 | F-11 | Odometer 1000 → 1128 | "= 128 mi" | T tripForm | ✅ |
| TC-113 | F-11 | End < Start | "End reading must be higher than start" | T tripForm | ✅ |
| TC-114 | F-11 | Số rác / trống | Không báo lỗi khi trống, chặn số rác | T tripForm | ✅ |
| TC-115 | F-11 | Chuyến > 1.000 dặm | Hỏi "That's a long trip — 1,240 mi. Save anyway?" | M | ✅ |
| TC-116 | F-11 | Kiểu "Distance", đơn vị km | Đổi đúng sang dặm khi lưu | T fmt, tripForm | ✅ |
| TC-117 | F-11 | Mở "Add trip" | Ngày hôm nay, Work; Purpose gợi ý chuyến cũ | M | ✅ (gợi ý purpose cũ chỉ có ở sheet kết thúc chuyến GPS — product.md không yêu cầu ở S-08) |
| TC-118 | F-11 | Sửa chuyến nhập tay | Cập nhật dặm theo số đồng hồ | T tripsX | ✅ |
| TC-119 | F-11 | Ô số đồng hồ trống | Placeholder nhạt, không giống số thật (lỗi biết từ phiên trước) | M | ❌ B-05; placeholder đậm như số thật (cả Purpose) |
| TC-120 | F-12 | Start trip lần đầu | S-07a "Track business miles with GPS" + chữ đúng; "Not now" không bắt đầu chuyến | M | ✅ |
| TC-121 | F-12 | Từ chối quyền vị trí | Tab Miles thẻ "GPS trips need location access" + "Allow" + "Or add trips manually" | M | ❌ B-09 |
| TC-122 | F-12 | Bước 2 "Allow all the time" | Giải thích + "Open settings" mở trang quyền của app | M | ✅ |
| TC-123 | F-12 | Vị trí máy tắt → Start trip | "Location is off. Turn it on to start a trip." + "Open settings" | M·P | ✅ |
| TC-124 | F-12 | Đang chạy | Thông báo cố định "Trip running · x mi" + "Personal stop" + "End trip" | M | ✅ B-10 hai thông báo cùng lúc |
| TC-125 | F-12 | Personal stop → Resume | Home "Paused for personal stop"; Resume ghi tiếp | M | ✅ |
| TC-126 | F-12 | Điểm trong lúc tạm dừng | Không tính; đoạn nối sau Resume không tính | T repos, splitM | ✅ |
| TC-127 | F-12 | Đứng yên GPS trôi; điểm sai số lớn / nhảy xa | Không cộng dặm; bỏ điểm xấu | T repos, splitM | ✅ |
| TC-128 | F-12 | S-07b | Số dặm lớn, thời gian, phác hoạ đường, "GPS good" / "Weak GPS signal" | M + T fmt | ✅ |
| TC-129 | F-12 | End trip | Sheet "Trip saved · x mi" + Work/Personal + Purpose; "Discard trip" hỏi lại | M | ✅ |
| TC-130 | F-12 | "End trip" từ thông báo | Kết thúc chuyến, mở sheet lưu | M | ✅ |
| TC-131 | F-12 | Chuyến > 12 giờ | Thông báo "Still driving? …" + "End trip" / "Keep going" (lịch đặt đúng 12h) | T longTripReminder (mới) | ✅ |
| TC-132 | F-12 | Chuyến bị ngắt (force-stop app khi đang chạy) | Lần mở sau: thẻ cam "Your trip stopped recording at …" + "Add missing miles" / "OK" | M + T tripsX | ❌ B-11 thẻ chỉ ở Miles, không ở Home |
| TC-133 | F-12 | Chạy xe thật 10–20 dặm | Sai lệch ≤ 3% so đồng hồ xe | M·P | ⏭ chờ Phương chạy xe thật (mục treo Bước 3) |
| TC-134 | F-13 | Tổng Business / Personal theo năm thuế | Đúng | T repos | ✅ |
| TC-135 | F-13 | UK ước tính | 2026/27: 55p 10.000 dặm đầu, 25p sau; vượt ngưỡng trong 1 chuyến; 2025/26 vẫn 45p / 25p | T rates, splitM, reports | ✅ |
| TC-136 | F-13 | US ước tính | 72.5¢ tới 30/6, 76¢ từ 1/7/2026 | T rates | ✅ |
| TC-137 | F-13 | Header "Miles · Tax year 2026/27 ▾" | Đổi năm thì tổng đổi theo | M | ✅ |
| TC-138 | F-13 | Danh sách chuyến | Nhóm theo tháng, dòng "Tue 10 Nov · 128.4 mi · GPS · Work · …" | M + T fmt | ✅ |
| TC-139 | F-13 | Sửa chuyến GPS | Chỉ sửa Work/Personal, purpose, dặm; sửa dặm → nhãn "Edited" | M | ✅ |
| TC-140 | F-13 | Miles rỗng | "No trips yet" + "Start a GPS trip or add miles from your odometer." | M | ✅ |
| TC-141 | F-13 | Ghi chú ước tính | "Estimate only — not tax advice." luôn hiện | M | ✅ |
| TC-142 | F-14 | Kỳ UK + Custom | Năm 6/4–5/4, quý 6 Apr–5 Jul…6 Jan–5 Apr; Custom nhãn + tên file đúng | T reports, taxY | ✅ |
| TC-143 | F-14 | Kỳ US | Năm dương lịch, quý dương lịch | T reports, taxY | ✅ |
| TC-144 | F-14 | Khoản ngày 5/4 và 6/4 | 5/4 vào năm cũ, 6/4 vào năm mới | T taxY | ✅ |
| TC-145 | F-14 | Tổng | Chỉ Work; dòng "Personal entries are excluded (£x)" | T csv + M | ✅ khớp tính độc lập |
| TC-146 | F-14 | Kỳ có khoản chưa phân loại | "N entries in this period aren't sorted yet" + "Sort now" | M | ✅ |
| TC-147 | F-14 | Biểu đồ cột danh mục | Giảm dần, tên · số · %; chạm → Entries lọc danh mục + kỳ | M | ❌ B-07 |
| TC-148 | F-14 | Bảng "By tax form line" + thẻ Mileage | Tổng theo ô SA103 / Schedule C đúng; dặm + ước tính | M | ❌ B-06 |
| TC-149 | F-14 | Biểu đồ theo tháng | Theo tháng thuế, dừng ở hôm nay | T reports | ✅ |
| TC-150 | F-14 | Kỳ không dữ liệu | "No data for this period" | M | ✅ |
| TC-151 | F-15 | CSV all entries | BOM, cột date, type, amount, currency, category, tax_line, work_personal, note, has_receipt, entry_id | T csv | ✅ |
| TC-152 | F-15 | Ghi chú bắt đầu "=", "+", "-", "@", có dấu phẩy / ngoặc kép | Được escape, không thành công thức | T csv | ✅ |
| TC-153 | F-15 | CSV mileage log | date, miles, work_personal, purpose, source, odometer | T csv | ✅ |
| TC-154 | F-15 | CSV totals by category | Một dòng mỗi danh mục, kèm ô tờ khai, tổng đúng | T csv (mới) | ✅ |
| TC-155 | F-15 | PDF | Tổng, footer "Generated by Sunday Sort · Not tax advice", escape chữ người dùng | T reports | ✅ |
| TC-156 | F-15 | Tên ảnh trong ZIP | Ngày + số tiền + danh mục, không trùng | T reports | ✅ |
| TC-157 | F-15 | Mở sheet Export | Kỳ theo Reports; "Include personal entries" tắt; ghi chú MTD (chỉ UK) | M | ✅ |
| TC-158 | F-15 | Có khoản chưa phân loại → Export | "N entries aren't sorted…" · "Export anyway" / "Sort first" | M | ✅ |
| TC-159 | F-15 | Export đủ 5 loại; huỷ share sheet | "Preparing your files…" → share sheet đủ file; huỷ thì về app không lỗi | M | ✅ 1 file ZIP chứa các file đã chọn; huỷ share về app không lỗi |
| TC-160 | F-15 | Mở PDF trên máy | Chân trang không đè chữ, nhiều trang đúng | M | ✅ 2026-11-13 mở bằng In (xem trước) trên A13: 6 trang, chân trang không đè, số khớp Reports; lỗi trình bày → B-26 (đã sửa) |
| TC-161 | F-16 | Sao lưu → khôi phục vào máy trống | Đủ mọi bảng + ảnh | T backup | ✅ |
| TC-162 | F-16 | Ảnh mất trên ổ / tên ảnh lạ | Bỏ qua ảnh đó, vẫn khôi phục | T backup | ✅ |
| TC-163 | F-16 | Huỷ giữa chừng | Dừng, không hỏng dữ liệu | T backup | ✅ |
| TC-164 | F-16 | File không phải zip / không manifest / định dạng khác | "This isn't a Sunday Sort backup file." | T backup | ✅ |
| TC-165 | F-16 | File hỏng / từ phiên bản mới hơn | "This backup is damaged…" / "…Update Sunday Sort first." | T backup | ✅ |
| TC-166 | F-16 | Tên file | `SundaySort-backup-YYYY-MM-DD.sundaysort` theo ngày máy | T backup | ✅ |
| TC-167 | F-16 | "Back up now" → chọn nơi lưu | Share sheet; "Last backup" cập nhật; banner Home biến mất | M | ✅ share sheet + tên file đúng |
| TC-168 | F-16 | "Back up now" → huỷ share sheet | KHÔNG tính là đã sao lưu (lỗi biết từ phiên trước) | M | ❌ B-02; huỷ share vẫn ghi Last backup |
| TC-169 | F-16 | "Restore from backup" → chọn file | Xem trước "Backup from … · N entries · N trips · N photos" → "Replace everything…?" | M | ✅ |
| TC-170 | F-16 | Restore → "Cancel" | Dữ liệu giữ nguyên | M | ✅ |
| TC-171 | F-16 | Restore khi đang chạy chuyến GPS | Chuyến dừng, không ghi tiếp vào dữ liệu mới | M | ❌ B-18 thông báo Trip running + dịch vụ vị trí còn chạy sau khôi phục |
| TC-172 | F-17 | Lịch nhắc | Chủ nhật 18:00 kế tiếp; cùng ngày trước/sau giờ | T reminder | ✅ |
| TC-173 | F-17 | Nội dung / không có gì để phân loại | "N entries to sort · About N minutes…"; 0 khoản → không nhắc | T reminder | ✅ |
| TC-174 | F-17 | Đặt giờ nhắc 2 phút tới, có khoản chưa phân loại | Thông báo hiện; chạm mở tab Sort | M | ✅ đến 14:13 (đặt 14:10, Android cho trễ), chạm mở Sort |
| TC-175 | Dữ liệu lớn | Khôi phục file 1.500 khoản + 200 chuyến | Entries cuộn mượt, tìm < 1 giây, badge "99+", Reports / Export chạy | M | ❌ B-20 cuộn Entries giật (p50 61–101 ms/khung); khôi phục 7s, tìm kiếm, Reports, badge 99+ ổn |
| TC-176 | F-18 | Lock after mặc định + "Immediately" | Mặc định "After 1 minute"; Immediately → ra nền vào lại thấy S-13 | M | ✅ mặc định After 1 minute; Immediately khoá ngay khi ra nền |
| TC-177 | F-18 | S-13 | "Sunday Sort is locked" + "Unlock", tự bật hộp thoại sinh trắc | M·P | ✅ |
| TC-178 | F-18 | Widget khi đang khoá | Mở khoá trước rồi mới vào Ghi nhanh | M·P | ✅ B-21 sau mở khoá bàn phím số không tự bật |
| TC-179 | F-19 | Dữ liệu widget | Net tuần, số chưa phân loại, chuyến đang chạy, "All sorted" | T widget | ✅ |
| TC-180 | F-19 | Widget 2×1 "−" / "+" | Mở thẳng Ghi nhanh đúng loại | M | ✅ nút 2×1 không có nhãn TalkBack → B-08 |
| TC-181 | F-19 | Widget 4×2 Start trip → End trip · x mi | Bắt đầu chuyến, widget đổi chữ; vào app hiện S-07b | M | ✅ |
| TC-182 | F-19 | Ghi khoản / phân loại xong | Widget cập nhật số | M | ✅ B-16 widget đếm 'to sort' tuần này, badge app đếm tất cả |
| TC-183 | F-19 | Widget iOS nhỏ + vừa | Như Android | ⏭ | ⏭ chưa có bản iOS (EAS, mục treo Bước 3) |
| TC-184 | F-20 | Đổi vùng UK → US | Hỏi "Change region? …"; $ , năm dương lịch, tên Schedule C; tên tự đổi của người dùng giữ | T repos + M | ❌ B-14 tổng gắn $ cho số £ |
| TC-185 | F-20 | Mileage rates sửa / sai / "Reset to default" | Lưu; số sai bị chặn; trả về mặc định | T rates + M | ✅ B-15 nút Save bị thanh điều hướng che |
| TC-186 | F-20 | Distance unit = Kilometres | Miles / Home / S-08 hiện km | M | ❌ B-13 Home This week vẫn ghi miles |
| TC-187 | F-20 | Theme Light / Dark / System | Đổi ngay mọi màn | M | ✅ B-12 thanh điều hướng hệ thống vẫn trắng ở chế độ tối |
| TC-188 | F-20 | "Delete all data" | Hỏi 2 lần, lần 2 phải gõ "DELETE"; xong về onboarding, ảnh bị xoá | M | ✅ ô DELETE dính B-05 |
| TC-189 | F-20 | About | "How Sunday Sort works" xem lại onboarding không mất dữ liệu; Privacy (web), Contact (email), "Version 1.0.0" | M | ❌ B-03; About thiếu Privacy policy + Contact |
| TC-190 | F-21 | S-16 + icon + splash | Đúng chữ miễn trừ; icon và splash như mockup | M | ✅ |
| TC-191 | Deep link | `sundaysort://capture?type=income`, `trip/start`, `sort`, `trip/active` | Mở đúng màn | M | ✅ capture, sort, trip/active chạy; trip/start (product.md) không có — widget dùng trip/active?start=1 → B-17 |
| TC-192 | Offline | Chế độ máy bay, dùng mọi luồng chính | Chạy bình thường; Privacy policy báo không mạng mà không treo | M·P | ✅ privacy link chưa có (B-03) |
| TC-193 | Tối | Giao diện tối hệ thống, xem mọi màn chính | Đủ tương phản, không chữ đen trên nền tối | M·P | ✅ app theo hệ thống; thanh điều hướng vẫn sáng (B-12) |
| TC-194 | 320dp | Màn hẹp 320dp | Không tràn chữ / nút bị cắt ở Home, Capture, Sort, Reports | M·P | ❌ B-22 nút 'Add manually' ở Miles bị cắt thành 'Add manua…'; các màn khác vừa |
| TC-195 | Chữ 200% | Cỡ chữ lớn nhất | Không cắt số tiền, nút vẫn bấm được | M·P | ❌ B-24 nhãn bị cắt / vỡ chữ; số tiền không bị cắt |
| TC-196 | TalkBack | Đọc Home, Capture, Sort | Mọi nút có nhãn, đọc đúng số tiền | M·P | ⏭ mọi nút trên 5 tab có nhãn trợ năng (dòng khoản đọc kiểu "Kwik Fit tyres, −£189.99, Unsorted, Work"); không điều khiển được TalkBack qua adb để nghe thật — cần người nghe |
| TC-197 | Cài đè | Cài APK mới đè bản cũ có dữ liệu | Dữ liệu, cài đặt, nhắc còn nguyên | M | ✅ |
| TC-198 | Mặc định | Quyền trong APK, không mạng, không quảng cáo, không đăng nhập | Không có quyền thừa; không gọi mạng ngoài link Privacy | M | ❌ B-19 quyền thừa trong APK |
| TC-199 | Tiền | Số thực / làm tròn | formatMoney từ chối số thực; mọi tổng là số nguyên | T money | ✅ |
| TC-200 | Ngôn ngữ | Chỉ tiếng Anh, mọi chuỗi qua i18n | Không lộ key i18n trên màn | M | ✅ không thấy key i18n lộ trên mọi màn đã đi qua |
| TC-201 | F-13 | Mức UK đổi 6/4/2026 (X1) | Chuyến 5/4/2026 tính 45p, 6/4/2026 tính 55p; mức mặc định cũ đã lưu (45p/25p) tự đọc thành mặc định mới, mức tự sửa giữ nguyên; Settings → Mileage rates có kỳ "From 6 Apr 2026" | T rates, repos + M | ✅ A13 (2026-11-13): Miles + Reports 2026/27 "≈ £4,662.64 … (55p / 25p)", 2025/26 "≈ £5,504.25 … (45p / 25p)"; Settings có kỳ "From 6 Apr 2026" 55/25; PDF "(55p / 25p)" |
| TC-202 | F-12 Q26 | 2 chuyến GPS/Auto/NFC liền nhau, điểm cuối → điểm đầu ≥ 1 mi chim bay (30 ngày gần nhất) | Dòng nét đứt "Missing trip? ≈ x mi · A → B" dưới chuyến sau ở Miles; < 1 mi, chuyến nhập tay, chuyến > 30 ngày, chuyến đang chạy → không có | T tripChecks + M | ✅ A13 (16/11, dữ liệu thật): dòng nét đứt dưới chuyến sau "≈ 1.6 mi · Sun 06:52 → Tue 05:52"; lỗi tìm thấy → sửa: khoảng trống 7,152 mi (chuyến giả lập UK ↔ vị trí Hà Nội) → thêm chặn > 500 mi chim bay / > 100 mph; qua ngày thêm thứ |
| TC-203 | F-12 Q26 | Ước tính khoảng trống | Chim bay × 1,25 làm tròn 0,1 mi, ghi "≈"; Pro + có mạng → "x mi · driving route" (openrouteservice, hỏi 1 lần / khoảng trống); không mạng / hết lượt / không Pro → giữ "≈" | T tripChecks + M | ✅ T (Pro/offline/no_route); A13 bản free: "≈" ước tính. ⏭ ORS thật trên máy chưa thử (cần Pro — P5) |
| TC-204 | F-12 Q26 | "Add" ở dòng Missing trip | S-08 điền sẵn: Distance = số dặm, ngày + giờ = lúc chuyến trước dừng → lúc chuyến sau bắt đầu, scope trống (Unsorted), dòng phụ "Estimated from the gap between two trips"; lưu → chuyến `source = gap`, nhãn "Estimated", nằm vào hàng Sort; dòng Missing trip biến mất | T tripChecksMore + M | ✅ A13: S-08 điền 1.6 mi, Sun 8 Nov, Work/Personal trống, dòng phụ; lưu → "Unsorted · Estimated", giờ "06:52–Tue 05:52", dòng Missing trip biến mất; xoá chuyến thử |
| TC-205 | F-12 Q26 | "Not a trip" | Dòng biến mất + snackbar "Gap hidden · Undo"; mở lại app không hiện lại; Undo → hiện lại; có trong sao lưu / khôi phục | T tripChecks, tripChecksMore + M | ✅ A13: "Gap hidden · Undo", mở lại app không hiện; Undo → hiện lại. Sao lưu: T |
| TC-206 | F-03 Q26 | Thẻ Home khi có khoảng trống trong 7 ngày | "N possible missing trips this week" · "≈ x mi between your trips wasn't recorded." · "Review" (→ Miles cuộn tới dòng) / "Later" (ẩn 7 ngày); thứ tự sau "No trips on…", trước "Backups are failing" | T tripChecksMore + M | ✅ A13 (vá tạm thứ tự thẻ để xem, đã gỡ): "1 possible missing trip this week · ≈ 1.6 mi…", Review → Miles cuộn tới dòng. Thứ tự: T |
| TC-207 | F-21 Q27 | Settings → Trips → "Odometer check" | Off / Weekly (Every Monday) / Monthly (On the 1st), mặc định Monthly; UK ghi thêm 6 April | M | ✅ A13: Off / Weekly "Every Monday and 6 April" / Monthly "On the 1st and 6 April" (UK), mặc định Monthly |
| TC-208 | F-11 Q27 | S-08b lần đầu (Miles ⋯ → Odometer check) | Ô "Odometer reading (mi)" + "Add photo" (ghi "Doesn't count towards your monthly photos.") → Save → "Starting point saved. We'll compare next time." | M | ✅ A13: "Starting point saved…"; dòng mốc Miles "Odometer 48,210 · 16 Nov · Starting point". ⏭ Add photo: máy hỏi quyền camera — không tự cấp quyền trên máy Phương (bấm Back → "Camera access is off" đúng); để Phương / P5 |
| TC-209 | F-11 Q27 | Lần 2: đồng hồ tăng khớp tổng dặm app (Work + Personal + Unsorted, mọi nguồn) trong ngưỡng max(10 mi, 5%) | "Matches your trips ✓ (406 mi)"; dòng mốc Miles "Odometer 48,730 · 16 Nov · ✓ matches" | T tripChecks + M | ✅ A13: sau "Add missing miles" → dòng mốc "✓ matches" |
| TC-210 | F-11 Q27 | Lần 2: thiếu ≥ ngưỡng | "114 mi not logged" · "Odometer +520 mi since 1 Oct · App 406 mi." · "Add missing miles" → S-08 Distance = 114, Unsorted, "Missing from odometer check", lưu → nhãn Estimated, lần so sau khớp; "That's fine" → thẻ Home tắt | T tripChecks + M | ✅ A13: "520 mi not logged · Odometer +520 mi since 16 Nov · App 0 mi." → S-08 520 mi, "Missing from odometer check", Unsorted → Estimated, mốc thành ✓ matches; thẻ Home "That's fine" tắt thẻ |
| TC-211 | F-11 Q27 | Lần 2: app ghi thừa ≥ ngưỡng | "The app logged more than your odometer" · "Check for trips you didn't drive." · "Review trips" (→ Miles) | T tripChecks + M | ✅ T; ⏭ A13 (cần chuyến thật giữa 2 mốc) |
| TC-212 | F-11 Q27 | Nhập số nhỏ hơn lần trước | Hỏi "That's lower than your last reading (48,210)." · "Save anyway" → mốc mới (không so) | T tripChecks + M | ✅ A13: hỏi "That's lower than your last reading (48,210)." + Save anyway / Cancel |
| TC-213 | F-03 Q27 | Thẻ Home đồng hồ | Thiếu / thừa → thẻ như S-08b; đến kỳ (Weekly thứ Hai / Monthly ngày 1 / UK 6/4) chưa nhập → "Time for an odometer check" · "Takes 10 seconds." · "Enter reading" / "Later"; tài xế mới chờ hết 1 kỳ sau chuyến đầu | T tripChecks + M | ✅ A13 (vá tạm thứ tự, đã gỡ): thẻ thiếu dặm + "Time for an odometer check · Takes 10 seconds" → Enter reading mở S-08b. Kỳ / tài xế mới: T |
| TC-214 | F-19 Q27 | Nhắc im lặng | 09:00 ngày đầu kỳ (Weekly / Monthly / UK 6/4), kênh "Odometer check" mức thấp, chạm → S-08b; Off → không hẹn; "Delete all data" huỷ | T tripChecksMore + M | ✅ A13: Weekly → hẹn Mon 23 Nov 09:00; Monthly → 1 Dec 09:00 (hẹn cũ huỷ); kênh odometer-check mức LOW. ⏭ chạm thông báo thật |
| TC-215 | F-17 Q26/Q27 | Sao lưu / khôi phục | File mới mang bảng `trip_gap_dismissals`, `odometer_readings` + ảnh đồng hồ; file cũ thiếu bảng → khôi phục rỗng; migration 0003 chạy trên dữ liệu thật | T tripChecksMore + M | ✅ T; A13: migration 0003 chạy trên dữ liệu thật (Metro trên dev build S1b). ⏭ sao lưu thật trên máy |
| TC-216 | F-15 Q26 | CSV mileage log | Chuyến ước tính ghi source `gap` | T tripChecksMore | ✅ |

## Bản 2 — P5 Ghép & kiểm (2026-11-16, `dev` `d3df44e`)

> Sinh từ `product.md` v2 + mục "Để P5" của `PLAN-v2.md`. A13 đã rút → **E** = thử trên trình giả lập Android
> `Medium_Phone_API_37.0` — **Phương đổi ý 2026-11-16: thử trên Galaxy A13 (M)**, trình giả lập chỉ dùng cho cài mới (onboarding).
> A13 đang có dùng thử Pro thật (bắt đầu 16/11 12:41, hết 23/11) → luồng Pro thử trực tiếp; ca "hết hạn" dùng công tắc
> `sundaysort://dev/probe` → "Pretend Pro (dev)" (chỉ bản dev, khoá settings `dev.fakePro`).
> **EAS** = build iOS trên EAS. **P** = cần Phương / máy thật (chạy xe thật, NFC thật, TalkBack nghe thật, mua thật).
> Trên trình giả lập dùng thử 7 ngày được bấm thật (không phải máy Phương) → thử được các luồng Pro.
> File test mới: `calc` `fill` `parseReceipt` `match` `rulesDb` `recurring` `nightly` `mtd` `purchase` `proAndVehicle`
> `alerts` `reminders` `autoEngine` `autoRepo` `longTripReminder` `migrationV2` `routeMap` `tripChecks` `tripChecksMore` `data`.

| Mã | Tính năng | Trường hợp | Kết quả mong đợi | Cách | Kết quả |
|---|---|---|---|---|---|
| TC-217 | F-01 | S-01c cài mới (UK) | 3 thẻ Mileage rate (55p/25p) / Actual costs / Not sure yet (chọn sẵn); "What's the difference?" → sheet 4 dòng + "Estimate only — not tax advice." | E | ✅ E (cài mới UK): 3 thẻ, "Not sure yet" chọn sẵn, sheet 4 dòng + "Estimate only — not tax advice." |
| TC-218 | F-01 | S-01e Free & Pro | 2 cột Free / "Pro · £24.99/year", dòng "No ads. No account…", "Continue free" → S-01f; "See Pro" → S-19, không tự bắt đầu dùng thử | E | ✅ E: 2 cột + dòng cam kết; "See Pro" → S-19 (Try / Subscribe), không tự bắt đầu dùng thử. 🟡 S-01b UK ghi "Self Assessment (SA103)" thay vì "Self Assessment & MTD" (B-39) |
| TC-219 | F-01 | S-01c vùng US | Chữ "IRS standard rate per mile…" | E | ✅ E: "IRS standard rate per mile. Gas, repairs and insurance are included." |
| TC-220 | F-02 Q20 | Máy tính "12.50+4.20" | Biểu thức nhỏ + "= £16.70"; Save lưu 16.70 | T calc + E | ⏳ |
| TC-221 | F-02 Q20 | Biểu thức lỗi ("12+", ÷0) | Số mờ + "Check the sum", Save mờ | T calc + E | ⏳ |
| TC-222 | F-02 Q21 | Nhiều ảnh | Ảnh nhỏ có ✕, nút "+ Photo", tối đa 3 ảnh/khoản | E | ⏳ |
| TC-223 | F-02 P1-4 | Bộ đếm ảnh free | "N of 20 free photos left this month"; ≤ 3 màu cam; nhiều ảnh/khoản đếm từng ảnh | T proAndVehicle + E | ⏳ |
| TC-224 | F-02 P1-4 | Hết 20 ảnh | "Photo" có ổ khoá → sheet "You've used this month's 20 free photos" → "Save without photo" lưu khoản; ảnh cũ không khoá | T proAndVehicle + E | ⏳ |
| TC-225 | F-02 P1-12 | OCR [Pro], ô số tiền trống | "Reading receipt…" → tự điền số tiền / nơi bán / ngày, nền vàng "From receipt"; chạm ô thì nhãn mất | T parseReceipt, fill + E | ⏳ |
| TC-226 | F-02 P1-12 | OCR khi đã gõ số khác | Chip "Receipt says £… · Use" | T fill + E | ⏳ |
| TC-227 | F-02 P1-12 | OCR không đọc được / bản free | Không hiện gì thêm; free không đọc, không chào bán | T fill + E | ⏳ |
| TC-228 | F-02 P1-10 | Lưu khoản khớp luật [Pro] | Snackbar "Saved · Fuel (auto-sorted)" + Undo; khoản có nhãn "Auto", không vào hàng chờ | T rulesDb + E | ⏳ |
| TC-229 | F-03 | Huy hiệu header | "Trial · N days left" khi dùng thử, "PRO" khi đã mua, không có khi free | T purchase + E | ✅ M: "Trial · 7 days left" ở header Home |
| TC-230 | F-03 Q2 | ≥ 2 ngày có khoản mà không chuyến | Thẻ "No trips on Tue or Wed" · "Add miles" / "Not driving"; không thông báo đẩy | T alerts + E | ✅ M: "No trips on Mon, Wed or Thu" · Add miles / Not driving |
| TC-231 | F-03 | Hệ thống chặn dò tự động | Thẻ "Automatic trips were paused by your phone" · "Fix now" → S-07f | T alerts | ✅ T (jest 414 xanh 16/11) |
| TC-232 | F-03 P1-7 | Sao lưu đêm lỗi 3 lần liền | Thẻ "Backups are failing" · "Check backup" | T nightly, alerts | ✅ T (jest 414 xanh 16/11) |
| TC-233 | F-03 P1-11 | 7 ngày trước gia hạn | Thẻ "Pro renews on … for £24.99" · "Manage subscription" / "OK" | T alerts, purchase | ✅ T (jest 414 xanh 16/11) |
| TC-234 | F-03 | Banner sao lưu cũ | Chỉ khi chưa bật sao lưu tự động và > 30 ngày | T alerts | ✅ T (jest 414 xanh 16/11) |
| TC-235 | F-03 | Thẻ To sort (Pro) | Dòng phụ "N auto-sorted this week" | E | ⏳ |
| TC-236 | F-03 | Thẻ chuyến khi tự động bật | Chấm xanh "Automatic trips on" · "Starts when you drive" · "Start now" | E | ⏳ |
| TC-237 | F-03 | Recent | Nhãn nhỏ "Recurring" / "Auto" | E | ⏳ |
| TC-238 | F-06 | Thẻ Sort bản free | "Most used" + 3 chip + "More…" | T suggest + E | ⏳ |
| TC-239 | F-06 | Thẻ Sort Pro | "Suggested" ≤ 3 chip, chip đầu viền vàng | T suggest + E | ✅ M: "SUGGESTED" Fuel / Parking… / Van repairs… + More… |
| TC-240 | F-06 Q5 | Edit tại chỗ | Thẻ mở form gọn (số tiền có máy tính, ghi chú, ngày) → "Done", không rời màn Sort | E | ✅ M: thẻ mở "Edit" Amount / Note / Date + Done, không rời Sort |
| TC-241 | F-06 Q5 | Split tại chỗ | 2 phần chia đôi; "Left to assign £0.00" xanh; "Split & sort" chỉ sáng khi đủ; phần có danh mục xong, phần không quay lại hàng chờ; ảnh theo mọi phần | T logic + E | ⏳ |
| TC-242 | F-06 Q5 | Split lệch tiền / nhiều phần | "£5.00 left" / "£5.00 over" cam; "+ Add part" tối đa 10 | E | ❌ B-38 M: "£5.00 over" + "Split & sort" mờ đúng, nhưng khi gõ số phần, bàn phím che dòng "Left to assign" và nút |
| TC-243 | F-06 Q5 | Merge tại chỗ | Sheet "Merge with…" khoản cùng loại ±1 ngày → "Merge N entries into one £…?" → thẻ mới vẫn ở hàng chờ; Undo | T logic + E | ⏳ |
| TC-244 | F-06 P1-2 | Thẻ chuyến Unsorted | "Work" / "Personal" = xong; "Split trip" → S-07c | E | ⏳ |
| TC-245 | F-06 P1-10 | Xếp cùng nơi bán 3 lần liền | Thẻ "Always sort 'X' as …?" → "Always" tạo luật (thấy ở S-18) | T rulesDb + E | ⏳ |
| TC-246 | F-06 P1-10 | "Not now" ở đề nghị luật | Không hỏi lại nơi bán đó 30 ngày | T rulesDb | ✅ T (jest 414 xanh 16/11) |
| TC-247 | F-06 | "N auto-sorted · Review" → S-06d | Nhóm "Shell → Fuel · N entries", đổi chip từng dòng, "Undo all from this rule", "Edit rule" | E | ⏳ |
| TC-248 | F-06 | S-06a List view Pro | Chip gợi ý mỗi dòng; "Accept all suggestions (N)" hỏi lại rồi áp | E | ⏳ |
| TC-249 | F-06 P1-9 | S-06c Done | "N auto-sorted · N recurring entries added" | E | ⏳ |
| TC-250 | F-07 | Số tiền là tín hiệu | Cùng số tiền ±2% với khoản đã xếp gần đây được gợi ý dù ghi chú khác | T suggest | ✅ T (jest 414 xanh 16/11) |
| TC-251 | F-07 | Khớp luật | Nơi bán không phân biệt hoa thường + loại + khoảng số tiền | T match, rulesDb | ✅ T (jest 414 xanh 16/11) |
| TC-252 | F-07 P1-2 | Chuyến chắc chắn | Bluetooth van / tuyến quen ≥ 70% ×3 / trong giờ làm → Work; ngoài giờ → Personal; còn lại Unsorted | T autoEngine, autoRepo | ✅ T (jest 414 xanh 16/11) |
| TC-253 | F-08 | Danh mục UK | Dòng phụ "MTD: …"; sheet có "MTD category" + "Vehicle running cost" | E | ⏳ |
| TC-254 | F-09 | S-18 Pro | "Shell → Fuel · Work · N entries" + công tắc từng luật | E | ⏳ |
| TC-255 | F-09 | Thêm / sửa / xoá luật | "+ Add rule" sheet đủ ô; "Delete rule"; rỗng "No rules yet" | E | ⏳ |
| TC-256 | F-09 | S-18 bản free | Xem được, công tắc mờ + "PRO" | E | ⏳ |
| TC-257 | F-10 | Tạo khoản lặp lại | "Van lease · £289.00 · Monthly on the 1st · Next 1 Dec" | T recurring + E | ⏳ |
| TC-258 | F-10 P1-9 | Đến hạn (ép job nền) | Tự tạo khoản đã phân loại, nhãn "Recurring", không vào hàng chờ, không thông báo | T recurring + E | ⏳ |
| TC-259 | F-10 | Weekly / Every 4 weeks / Yearly / ngày 31 / Ends | Ngày tạo đúng, dừng sau Ends | T recurring | ✅ T (jest 414 xanh 16/11) |
| TC-260 | F-10 | Pause / Delete / sửa mẫu | Pause ngừng tạo; sửa mẫu không đổi khoản cũ | T recurring + E | ⏳ |
| TC-261 | F-10 | S-05 "⋯ → Make recurring" | Mở S-17 điền sẵn từ khoản | E | ⏳ |
| TC-262 | F-11 Q25 | A → B bản free | "A → B · PRO" → S-19 "Miles from A to B are a Pro feature" | E | ⏳ |
| TC-263 | F-11 Q25 | Gợi ý địa chỉ (ORS thật) | Gõ ≥ 3 ký tự → gợi ý trong UK | E | ⏳ |
| TC-264 | F-11 Q25 | Tuyến lái xe | "= x mi · Driving route" + bản đồ xem trước | T routeMap + E | ⏳ |
| TC-265 | F-11 Q25 | Round trip | Dặm ×2, "Round trip" | T routeMap + E | ⏳ |
| TC-266 | F-11 Q25 | Frequent places | Chip điền 2 đầu, không gọi tìm kiếm | T routeMap + E | ⏳ |
| TC-267 | F-11 Q25 | Current location (geo fix UK) | Ô From = tên địa chỉ gần nhất | E | ⏳ |
| TC-268 | F-11 Q25 | Lỗi mạng / cùng chỗ / không có đường | "No internet — enter miles instead" + chuyển Distance · "From and To are the same place" · "Couldn't find a driving route…" | T routeMap + E | ⏳ |
| TC-269 | F-11 Q25 | Lưu + sửa lại chuyến A → B | Miles "A → B · Round trip"; sửa mở đúng A → B, không gọi lại dịch vụ | E | ⏳ |
| TC-270 | F-15 Q25 | CSV mileage log chuyến A → B | Có cột from / to / round_trip | T csv | ❌ B-40 T: `mileageCsv` chưa có cột from / to / round_trip (TODO P5 trong csv.ts) |
| TC-271 | F-11 Q25 | Build không có khoá ORS | Ẩn A → B | T routeMap | ⏳ |
| TC-272 | F-12 Q25 | S-07b bản đồ live (GPS giả) | Đường vẽ dần, chấm vàng vị trí, camera theo tuyến | E | ⏳ |
| TC-273 | F-12 Q25 | S-07c bản đồ | Chấm xanh lá đầu, ghim đỏ cuối, điểm dừng đánh số, "© OpenStreetMap · OpenFreeMap", kéo/phóng | E | ⏳ |
| TC-274 | F-13 Q25 | Ảnh bản đồ nhỏ ở Miles | Có ảnh cho chuyến GPS; sửa chuyến → ảnh mới; xoá chuyến → ảnh bị dọn | T routeMap + E | ⏳ |
| TC-275 | F-12 Q25 | Không mạng | S-07b / S-07c hình phác hoạ, Miles icon cũ | E | ⏳ |
| TC-276 | F-12 Q25 | Giao diện tối | Bản đồ style tối | E | ⏳ |
| TC-277 | F-12 Q25 | Chuyến 100+ dặm | Bản đồ fit đủ tuyến, ảnh nhỏ đúng | E | ⏳ |
| TC-278 | F-12 | S-07d bản free | Công tắc khoá + "PRO" → S-19 "Automatic trips are a Pro feature" | E | ⏳ |
| TC-279 | F-12 | S-07e chuỗi quyền | 4 bước, mỗi bước 1 nút; bỏ bước → cam "Automatic trips may miss drives" + "Finish setup" | E | ⏳ |
| TC-280 | F-12 | S-07d cài đặt | Van Bluetooth, Start when charging, Merge stops 10/20/45, Work hours, trạng thái | E | ⏳ |
| TC-281 | F-12 P1-1 | Tự bắt đầu khi lái | Chuyến nhãn "Auto", thông báo "Trip started automatically", điểm đầu lùi về lúc xe chạy | T autoEngine + E | ⏳ |
| TC-282 | F-12 P1-1 | Dừng < 20 phút / ngắt Bluetooth | Vẫn 1 chuyến ca | T autoEngine | ✅ T (jest 414 xanh 16/11) |
| TC-283 | F-12 P1-1 | Không lái ≥ 20 phút | Chuyến đóng, giờ kết thúc = lúc xe dừng; thông báo "Trip saved · x mi · …" | T autoEngine + E | ⏳ |
| TC-284 | F-12 P1-3 | Work hours bật | Chuyến ngoài giờ ghi Personal | T autoEngine | ✅ T (jest 414 xanh 16/11) |
| TC-285 | F-12 | Bấm Start khi tự động bật | Chuyến tay, tự động không chen | T autoEngine + E | ⏳ |
| TC-286 | F-12 Q2 | Chuyến tay đứng yên ≥ 45 phút | "Still on a trip?" · "End trip" (lùi giờ) / "Keep going" | T autoEngine, longTripReminder | ✅ T (jest 414 xanh 16/11) |
| TC-287 | F-12 Q2 | Mất vị trí ≥ 10 phút khi đang chạy | "Trip isn't recording" | T autoEngine | ✅ T (jest 414 xanh 16/11) |
| TC-288 | F-12 F-18 | Hết Pro / dùng thử khi tự động đang bật | Tự động tắt, báo ngay, về Start/Stop tay | T proAndVehicle + E | ⏳ |
| TC-289 | F-12 | Khởi động lại máy (BOOT_COMPLETED) | Dò tự động đăng ký lại | E | ⏳ |
| TC-290 | F-12 Q6 | S-07c tách Personal segment | Chạm điểm dừng → 3 lựa chọn; "Work x mi · Personal y mi"; Undo | T tripsX + E | ⏳ |
| TC-291 | F-12 Q19 | Sửa giờ / dặm chuyến GPS | Nhãn "Edited" ở S-07c, Miles, CSV; "Recorded: …" giữ số gốc | T tripsX + E | ⏳ |
| TC-292 | F-12 Q18 | S-07g máy không NFC | "This phone doesn't support NFC tags." | E | ⏳ |
| TC-293 | F-12 Q18 | Deep link `sundaysort://trip/toggle` (thay chạm thẻ) | Chưa chạy → bắt đầu chuyến NFC; đang chạy → kết thúc + thông báo | E | ⏳ |
| TC-294 | F-12 Q18 | Chạm thẻ NFC thật / iOS Phím tắt | Bật/tắt chuyến, rung | P | ⏳ |
| TC-295 | F-19 | Toggle chuyến khi app khoá | Chuyến bật/tắt, không mở nội dung | E | ⏳ |
| TC-296 | F-13 | Vuốt Miles | Phải = Work, trái = Personal, "Marked as personal" + Undo | E | ⏳ |
| TC-297 | F-13 | Vượt 10.000 dặm (UK) | "10,000 mi at 55p reached on … · now 25p" | T rates + E | ⏳ |
| TC-298 | F-13 Q24 | Actual costs | Miles "Business use N%", ẩn tiền theo dặm | T reports + E | ⏳ |
| TC-299 | F-12 | Chạy xe thật cả ca (đèn đỏ, đi bộ giao hàng, ngồi nhà, tắt app giữa ca) | 1 chuyến ca đúng dặm; "Missing trip" khi tắt app | P | ⏳ |
| TC-300 | F-12 | S-07f Battery tips | Hướng dẫn Samsung, "Open battery settings" mở cài đặt, "I've done it" | E | ⏳ |
| TC-301 | F-12 Q26 | Missing trip Pro + ORS thật | Quãng đường thật thay "≈ ước tính" | E | ⏳ |
| TC-302 | F-12 Q26 | 2 chuyến GPS giả cách nhau ≥ 1 mi | Dòng "Missing trip?" ở Miles | E | ⏳ |
| TC-303 | F-11 Q27 | App ghi thừa so với đồng hồ | "The app logged more than your odometer" · "Review trips" | T tripChecks + E | ⏳ |
| TC-304 | F-11 Q27 | Ảnh đồng hồ | Chụp được, không trừ 20 ảnh/tháng | E | ⏳ |
| TC-305 | F-17 Q27 | Chạm thông báo nhắc đồng hồ thật | Mở S-08b | E | ⏳ |
| TC-306 | F-16 Q26/Q27 | Sao lưu thật → khôi phục | Mốc đồng hồ + câu trả lời khoảng trống còn đủ | E | ⏳ |
| TC-307 | F-14 X3 | UK MTD periods + Year to date | Standard 6 Apr–5 Jul / Calendar 1 Apr–30 Jun; cộng dồn | T mtd + E | ⏳ |
| TC-308 | F-14 Q24 | Mileage rate | Nhóm "Covered by mileage rate · £…" mờ, không cộng | T reports + E | ⏳ |
| TC-309 | F-14 | UK tab "SA103 / MTD categories" | Đổi bảng theo tab | E | ⏳ |
| TC-310 | F-14 P1-6 | Vehicle costs "Not sure yet" | Thẻ cam "Choose how you claim your vehicle" | E | ⏳ |
| TC-311 | F-15 | Export bản free | PDF / totals / MTD / FreeAgent / ZIP có "PRO" → S-19; 2 CSV thô mở | E | ⏳ |
| TC-312 | F-15 | CSV all entries | Cột mtd_category, source, auto_sorted, recurring, entry_id | T csv | ⏳ |
| TC-313 | F-15 X3 | MTD summary CSV | 15 HMRC category, Disallowable 0, cộng dồn, dòng kỳ | T mtd | ✅ T (jest 414 xanh 16/11) |
| TC-314 | F-15 | MTD records CSV | Cột MTDsorted | T mtd | ✅ T (jest 414 xanh 16/11) |
| TC-315 | F-15 | MTD .xlsx | Sheet Income / Expenses / Summary | T mtd + E | ⏳ |
| TC-316 | F-15 | FreeAgent CSV | 2 file; hỏi "Your name in FreeAgent" lần đầu; van = Car | T mtd + E | ⏳ |
| TC-317 | F-15 Q3 | Unsorted trước khi xuất MTD | "N entries in Q… have no category" · "Sort now" / "Leave them out" (ghi số trong file tóm tắt) | T mtd + E | ⏳ |
| TC-318 | F-15 Q3 | Nhập file vào MTDsorted / FreeAgent thật | Nhập không lỗi | P | ⏳ |
| TC-319 | F-15 F-22 | Ghi chú "isn't MTD software" | Ở S-10 (UK) và S-16 | E | ⏳ |
| TC-320 | F-16 Q10 | Chọn thư mục sao lưu | Trình chọn hệ thống → "Back up every night" bật sẵn | E | ⏳ |
| TC-321 | F-16 P1-7 | Ép job đêm | Ghi file khi có đổi; không đổi thì không ghi; giữ 7 bản | T nightly + E | ⏳ |
| TC-322 | F-16 P1-7 | Lỗi 3 đêm | Thẻ Home; > 24 giờ chưa chạy cũng đếm lỗi | T nightly | ✅ T (jest 414 xanh 16/11) |
| TC-323 | F-16 | Khôi phục từ thư mục sao lưu | Danh sách bản "Tue 10 Nov · N entries · N photos" → Replace | E | ⏳ |
| TC-324 | F-16 | Mất quyền thư mục | "We can't reach your backup folder. Choose it again." | T nightly | ✅ T (jest 414 xanh 16/11) |
| TC-325 | F-16 | Nhắc 30 ngày | Chỉ hiện khi tắt sao lưu tự động | E | ⏳ |
| TC-326 | F-16 | File sao lưu bản 1 / pro_state | Khôi phục được; không đè pro_state | T backup, migrationV2 | ✅ T (jest 414 xanh 16/11) |
| TC-327 | F-17 | S-20 Notifications | Công tắc từng loại + giờ | E | ⏳ |
| TC-328 | F-17 Q22 | Nhắc ghi hằng ngày | Mặc định tắt; bật → 19:00 chỉ khi hôm đó chưa ghi | T reminders + E | ⏳ |
| TC-329 | F-17 | Sắp hết dùng thử | Ngày 6: "Your Pro trial ends tomorrow…" | T reminders, purchase | ✅ T (jest 414 xanh 16/11) |
| TC-330 | F-17 | Nhắc Chủ nhật | Không tự tắt sau 4 tuần | T reminders | ⏳ |
| TC-331 | F-18 | S-19 theo ngữ cảnh | Phụ đề đúng tính năng; 6 lợi ích; giá "£24.99 / year · About 48p a week…" | E | ⏳ |
| TC-332 | F-18 P1-5 | "Try Pro free for 7 days" | Trial bắt đầu, "Trial · 7 days left", nút dùng thử không hiện lại | T purchase + E | ⏳ |
| TC-333 | F-18 | Hết dùng thử | Luật ngừng, lặp lại ngừng, "Most used", 20 ảnh, file Pro khoá; dữ liệu/luật/ảnh còn nguyên; S-19 "Pro ended on …" | T proAndVehicle + E | ⏳ |
| TC-334 | F-18 | Subscribe / Restore khi chưa có sản phẩm | Báo lỗi đúng chữ, không treo | E | ⏳ |
| TC-335 | F-18 | Mua thật | Pro is on ✓, ngày gia hạn | P | ⏳ |
| TC-336 | F-21 | Dòng Pro ở Settings | "Free · See Pro" / "Trial · N days left" | E | ⏳ |
| TC-337 | F-21 Q24 | Đổi Vehicle costs giữa năm | Hỏi lại, báo cáo đổi theo | T proAndVehicle + E | ⏳ |
| TC-338 | F-22 | S-16 | Thêm câu "isn't MTD software and doesn't send anything to HMRC or the IRS." | E | ⏳ |
| TC-339 | F-20 | Widget 4×2 khi tự động bật | Dòng "Auto trips on" / "paused" | T data + E | ⏳ |
| TC-340 | F-20 | Widget iOS nhỏ + vừa | Build EAS chạy, nội dung như Android | EAS | ⏳ |
| TC-341 | iOS | Build iOS EAS | MapLibre, backup-folder, trip-detect, receipt-ocr biên dịch | EAS | ⏳ |
| TC-342 | Dữ liệu | Migration 0001–0003 | Chạy trên DB bản 1 có dữ liệu | T migrationV2 + E | ⏳ |
| TC-343 | Quyền | Manifest release | Giữ INTERNET, BILLING, NFC, ACTIVITY_RECOGNITION…; không quyền thừa | E | ⏳ |
| TC-344 | TalkBack | Kịch bản Q23 qua 6 màn | Đọc đúng nhãn | P | ⏳ |
| TC-345 | Chữ 200% | Màn mới bản 2 (Sort split, S-19, S-07d, A → B, S-08b) | Không cắt chữ | E | ⏳ |
| TC-346 | Tối | Màn mới bản 2 | Đúng màu, đọc được | E | ⏳ |
| TC-347 | Offline | Mọi luồng trừ A → B / bản đồ | Chạy bình thường | E | ⏳ |
