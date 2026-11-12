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
  ở Add trip và Edit trip — case TC-119 — tái hiện: Miles → Add manually: ô trống trông như đã điền số. — commit:
- [ ] **B-06** 🟡 Reports › "By tax form line" có 2 dòng "Unsorted" giống hệt (một của thu £620.00, một của chi £420.67), không biết
  dòng nào là thu/chi — case TC-148 — tái hiện: Reports → Year, kỳ có cả thu và chi chưa phân loại → cuộn tới bảng SA103. — commit:
- [ ] **B-07** 🟡 Mở Entries từ Reports (chạm cột danh mục): chip lọc đang bật ("Selected period", "Fuel") nằm khuất cuối hàng chip,
  màn đầu chỉ thấy "All" không sáng → không biết danh sách đang bị lọc; "Selected period" không nói kỳ nào — case TC-147 —
  tái hiện: Reports → chạm cột "Fuel" → Entries. — commit:
- [ ] **B-08** 🟡 Widget Android 2×1: nút "−" / "+" không có nhãn trợ năng (TalkBack không đọc gì; widget 4×2 thì có) — case TC-180 —
  tái hiện: `uiautomator dump` trên màn hình chính: 2 nút của widget 2×1 không có `content-desc`. — commit:
