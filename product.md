# Sunday Sort: Driver Expenses — product.md

> Mã app `A006-sundaysort` · Bundle `com.phiotron.sundaysort` · Android + iOS · React Native + Expo
> Tài liệu này gửi **Claude Design** để vẽ mockup Hi-Fi. Mô tả bằng tiếng Việt; **mọi chữ hiện trên app viết bằng tiếng
> Anh trong ngoặc kép** — dùng đúng chữ đó trên mockup.
> Ngày: 2026-11-11

---

## 0. Tóm tắt một đoạn

Tài xế van / courier tự kinh doanh được trả tiền và tiêu tiền rải rác cả ngày trên đường nhưng không có thời gian chọn
danh mục. Sunday Sort tách việc làm 2 bước: **ghi trong 10 giây** (Thu hay Chi → số tiền → ảnh hoá đơn nếu muốn → 1 dòng
ghi chú, **không chọn danh mục**) và **phân loại cả tuần một lần vào Chủ nhật**, có gợi ý danh mục học từ lịch sử trên máy.
App ghi thêm quãng đường (nhập tay hoặc GPS bấm Start/Stop). Cuối năm thuế có sẵn tổng thu – chi theo danh mục khớp ô tờ
khai (UK: SA103 · Mỹ: Schedule C) và xuất CSV/PDF cho kế toán. Miễn phí, không quảng cáo, không tài khoản, không server,
dữ liệu không rời điện thoại.

---

## 1. Đối thủ (tra 2026-11-11)

| Chức năng | Hurdlr | Everlance | MileIQ | Cash Book | **Sunday Sort** |
|---|---|---|---|---|---|
| Ghi khoản không cần chọn danh mục | Không | Không | — | Không | **Có (lõi)** |
| Hàng chờ phân loại theo tuần | Không | Không | Không | Không | **Có** |
| Gợi ý danh mục | Có (AI, trả phí) | Có (trả phí) | — | Không | **Có, trên máy, miễn phí** |
| Sửa / gộp / tách khoản | Sửa | Sửa | Sửa chuyến | Sửa | **Sửa + gộp + tách** |
| Ghi quãng đường | Tự dò (trả phí) / bán tự động | Tự dò | Tự dò | Không | **Nhập tay + GPS Start/Stop** |
| Đánh dấu công việc / cá nhân | Có | Có | Có | Không | **Có** |
| Năm thuế UK (6/4–5/4) | Không (app Mỹ) | Không | Có (bản UK) | Không | **Có + năm Mỹ** |
| Xuất CSV / PDF | Có | Có (trả phí) | Có | Có | **Có, miễn phí** |
| Không cần tài khoản | Không | Không | Không | Có | **Có** |
| Không kết nối ngân hàng | Tuỳ chọn có | Tuỳ chọn có | — | Có | **Có** |
| Widget | ? | ? | ? | ? | **Có** |
| Quảng cáo | Không | Không | Không | Có | **Không** |
| Giá bản trả phí | Premium $9.99/tháng hoặc $100/năm; Pro $200/năm | Starter $8.99/tháng hoặc $69.99/năm; Professional $99.99/năm | Free 40 chuyến/tháng; Unlimited £9.49/tháng hoặc £7.91/tháng trả năm | Có IAP (chưa rõ) | **Miễn phí hoàn toàn** |

Nguồn giá: Capterra (Hurdlr), everlance.com/premium, mileiq.com/pricing-uk, AppGoblin (Cash Book). Trùng tên: tra
"Sunday Sort" không thấy app nào trùng trên store.

**Người dùng đối thủ chê nhiều nhất** (theo file ý tưởng): bị thu phí không báo (44), kết quả sai / âm thầm ngừng (35),
tự ghi bị sót chuyến (32) → Sunday Sort: miễn phí, GPS do người dùng bấm Start/Stop, luôn có thông báo khi đang ghi.

---

## 2. Người dùng & nguyên tắc thiết kế

**Persona chính — Dan, 38 tuổi, tài xế van multi-drop ở Leeds.** Chạy 120–150 điểm giao/ngày, 6 ngày/tuần. Trả tiền xăng,
phí đỗ, bữa trưa giữa các điểm. Dùng Android tầm trung, thường cầm máy bằng một tay, đeo găng mùa đông, đứng ngoài trời
nắng. Chủ nhật ngồi sofa 15–20 phút làm sổ. Mỗi tháng Giêng sợ khai Self Assessment.

**Persona phụ — Maria, 44 tuổi, courier tự do ở Texas (Mỹ)**, chạy Amazon Flex + giao hàng địa phương, khai Schedule C.

**Nguyên tắc UX (Claude Design ưu tiên theo thứ tự):**
1. **10 giây là luật.** Từ lúc chạm widget/nút tới lúc lưu xong một khoản: tối đa 3 lần chạm + gõ số. Không có trường bắt buộc nào ngoài số tiền.
2. **Một tay, ngón cái.** Nút chính nằm nửa dưới màn hình. Vùng chạm ≥ 56dp cho nút chính, ≥ 48dp cho mọi nút khác.
3. **Đọc được ngoài nắng.** Tương phản ≥ 7:1 cho số tiền và nút chính; chữ thân ≥ 16sp; số tiền nhập ≥ 48sp.
4. **Chủ nhật là lúc thoải mái** — màn Phân loại có thể dày thông tin hơn, nhưng mỗi khoản là một thẻ, thao tác chạm chip.
5. **Không làm người dùng sợ.** Không đỏ rực cho chi phí; dùng màu ấm. Luôn có Undo sau xoá / gộp / tách.
6. **Không tư vấn thuế.** Mọi con số "ước tính" ghi rõ "Estimate only — not tax advice".

---

## 3. Định hướng thiết kế (cho Claude Design)

- **Tính cách:** bình tĩnh, gọn, đáng tin, hơi ấm áp — "sổ sách gọn gàng sáng Chủ nhật", không phải app ngân hàng lạnh.
- **Màu gợi ý (Claude Design được chỉnh, giữ tương phản):**
  - Nền sáng: off-white ấm `#FAF8F4`; nền tối: xanh than `#12161C`.
  - Màu chính (brand, nút chính): xanh than đậm `#1F2A44` (sáng) / vàng nắng `#F5B841` làm nhấn ở chế độ tối.
  - Nhấn "Sunday": vàng nắng `#F5B841` (badge số khoản chưa phân loại, thanh tiến độ Phân loại).
  - Thu (Income): xanh lá `#1E8E5A`; Chi (Expense): cam đất `#C8553D` (không dùng đỏ báo lỗi cho chi phí).
  - Lỗi: `#B42318`. Công việc (Work): xanh dương `#2E6FD8`; Cá nhân (Personal): xám tím `#7A6F9B`.
- **Chữ:** sans-serif rõ (Inter hoặc tương đương), **số dùng tabular figures**. Số tiền lớn: 48–64sp đậm.
- **Hình khối:** bo góc 16dp cho thẻ, 28dp cho nút chính dạng viên thuốc; bóng rất nhẹ; icon nét (outline) 24dp.
- **Chế độ:** Sáng + Tối (theo hệ thống, đổi được). Hỗ trợ cỡ chữ 200% (layout không vỡ, thẻ giãn dọc).
- **Khung mockup:** iPhone 390×844 và Android 360×800. Vẽ đủ cả sáng và tối cho các màn chính (S-02, S-03, S-06, S-09).
- **Ảnh minh hoạ:** tối giản, nét (một chiếc van, một tờ hoá đơn, mặt trời buổi sáng Chủ nhật) cho Onboarding và trạng thái rỗng.
- **Icon app:** chữ "S" hoặc tờ hoá đơn gấp + mặt trời nhỏ, nền xanh than, nhấn vàng nắng.

---

## 4. Điều hướng

**Thanh tab dưới (5 tab):**
1. "Home" (icon nhà)
2. "Entries" (icon danh sách)
3. "Sort" (icon thẻ xếp chồng) — **badge vàng** = số khoản chưa phân loại (ẩn khi 0; "99+" khi > 99)
4. "Miles" (icon đồng hồ tốc độ / con đường)
5. "Reports" (icon biểu đồ cột)

**Nút ghi nhanh**: trên Home là 2 nút lớn; trên các tab khác có **FAB "+"** góc dưới phải (mở Ghi nhanh, mặc định Expense).
**Settings**: icon bánh răng góc trên phải màn Home.

**Deep link** (widget, thông báo): `sundaysort://capture?type=income|expense`, `sundaysort://trip/start`,
`sundaysort://sort`, `sundaysort://trip/active`.

---

## 5. Danh mục mặc định theo vùng

Người dùng đổi tên / thêm / ẩn / sắp xếp được. Mỗi danh mục gắn một **ô tờ khai** (chỉ để xuất file, không phải tư vấn).

**UK (SA103 – Self-employment):**
| Loại | Tên hiện trên app | Ô tờ khai |
|---|---|---|
| Income | "Delivery income" | Turnover |
| Income | "Tips & bonuses" | Turnover |
| Income | "Other income" | Other business income |
| Expense | "Fuel" | Car, van and travel expenses |
| Expense | "Van repairs & servicing" | Car, van and travel expenses |
| Expense | "Van insurance & tax" | Car, van and travel expenses |
| Expense | "Parking, tolls & congestion" | Car, van and travel expenses |
| Expense | "Van lease / finance" | Car, van and travel expenses |
| Expense | "Phone & data" | Phone, fax, stationery and other office costs |
| Expense | "Equipment & uniform" | Other allowable business expenses |
| Expense | "Accountant & fees" | Accountancy, legal and other professional fees |
| Expense | "Other expenses" | Other allowable business expenses |

**US (Schedule C):**
| Loại | Tên | Dòng Schedule C |
|---|---|---|
| Income | "Delivery income" | Line 1 Gross receipts |
| Income | "Tips & bonuses" | Line 1 Gross receipts |
| Income | "Other income" | Line 6 Other income |
| Expense | "Fuel" | Line 9 Car and truck expenses |
| Expense | "Vehicle repairs" | Line 21 Repairs and maintenance |
| Expense | "Vehicle insurance" | Line 15 Insurance |
| Expense | "Parking & tolls" | Line 9 Car and truck expenses |
| Expense | "Vehicle lease" | Line 20a Rent or lease – vehicles |
| Expense | "Phone & data" | Line 25 Utilities |
| Expense | "Supplies & equipment" | Line 22 Supplies |
| Expense | "Professional fees" | Line 17 Legal and professional services |
| Expense | "Other expenses" | Line 27a Other expenses |

**Mức tính dặm mặc định (sửa được trong Settings):** UK 45p/dặm cho 10.000 dặm đầu, 25p sau đó (theo năm thuế).
US: $0.725/dặm (IRS 2026; từ 1/7/2026 IRS nâng lên $0.76 — app hỗ trợ mức theo khoảng ngày). Ghi chú luôn hiện: "Estimate only — not tax advice."

---

## 6. Tính năng (F-xx) và màn hình (S-xx)

> Mỗi màn: mục đích → bố cục từ trên xuống → nút → trạng thái → lỗi. Chữ trong "…" là chữ hiện trên app.

### F-01 · Onboarding (lần mở đầu) — S-01a…S-01d

**S-01a Welcome**
- Minh hoạ: van + mặt trời Chủ nhật.
- Tiêu đề: "Log it in 10 seconds. Sort it on Sunday."
- Phụ đề: "A simple money and mileage log for self-employed drivers. No account. No bank link. Your data stays on your phone."
- Nút chính: "Get started". Không có nút đăng nhập.

**S-01b Choose your region**
- Tiêu đề: "Where do you file your taxes?"
- 2 thẻ lớn chọn 1 (radio dạng thẻ, có cờ):
  - "United Kingdom" — dòng phụ "£ · Tax year 6 Apr – 5 Apr · Self Assessment (SA103)"
  - "United States" — dòng phụ "$ · Calendar year · Schedule C"
- Mặc định chọn theo vùng của máy; nếu không phải UK/US → không chọn sẵn, nút "Continue" mờ tới khi chọn.
- Ghi chú nhỏ: "You can change this later in Settings."
- Nút: "Continue" · nút quay lại góc trên trái.

**S-01c Your categories**
- Tiêu đề: "Your categories are ready". Phụ đề: "You'll only use these on Sunday. Rename or hide any of them later."
- Danh sách chip danh mục theo vùng (mục 5), chia "Income" / "Expenses". Không chỉnh ở đây.
- Nút: "Looks good".

**S-01d Weekly reminder**
- Tiêu đề: "When do you want to sort your week?"
- Bộ chọn ngày (Mon…Sun, mặc định "Sun") + giờ (mặc định 18:00).
- Nút chính: "Turn on reminder" → xin quyền thông báo hệ thống.
- Nút phụ (chữ): "Not now".
- Quyền bị từ chối → vẫn vào app, hiện snackbar: "Reminders are off. You can turn them on in Settings."
- Xong → vào Home (S-02) ở trạng thái rỗng.

### F-02 · Ghi nhanh (Quick capture) — S-03

Mở từ: 2 nút lớn Home, FAB "+", widget, phím tắt icon app (long-press: "New expense", "New income", "Start trip").

**S-03 Quick capture** (bottom sheet toàn màn hình, mở lên trong < 300ms, bàn phím số tự bật)
- Hàng trên: nút đóng "✕" (trái) · công tắc 2 nửa **"Expense" | "Income"** (giữa; màu cam/xanh lá theo loại) ·
  chip ngày giờ "Now" (phải; chạm mở chọn ngày giờ; khi đổi hiện "Tue 10 Nov, 13:05").
- Giữa: số tiền rất lớn, ký hiệu tiền theo vùng ("£0.00" / "$0.00"), con trỏ nhấp nháy. Gõ "1250" → "£12.50"
  (nhập theo kiểu máy tính tiền, 2 số lẻ tự động).
- Dưới số tiền, hàng 3 nút tròn 56dp:
  - "Photo" (icon máy ảnh) → mở camera ngay; sau khi chụp hiện ảnh nhỏ 56dp có dấu ✕ để bỏ. Giữ lâu → chọn từ thư viện.
  - "Work" / "Personal" (chip bật tắt, mặc định theo Settings, mặc định "Work").
  - "Note" → ô 1 dòng "Add a note (e.g. Shell, M62)"; tối đa 120 ký tự.
- Gợi ý ghi chú nhanh: hàng chip cuộn ngang gồm 5 ghi chú dùng nhiều nhất (vd "Shell", "Parking", "Greggs", "Amazon Flex payout").
- Nút lưu to ở đáy, ngay trên bàn phím: **"Save"** (mờ khi số tiền = 0).
- **Không có ô danh mục.** Dòng chữ nhỏ dưới nút: "No category needed — you'll sort it on Sunday."
- Lưu xong: sheet đóng, snackbar "Saved · £12.50 expense" + nút "Undo" (5 giây). Rung nhẹ.
- Tuỳ chọn "Keep adding" (Settings) → sau Save, sheet trống lại để ghi khoản tiếp theo.
- Lỗi:
  - Số tiền vượt £/$ 999,999.99 → không nhận thêm số, rung nhẹ.
  - Camera bị từ chối quyền → hộp thoại "Camera access is off" · "Sunday Sort needs the camera to photograph receipts." · "Open settings" / "Not now".
  - Bộ nhớ đầy khi lưu ảnh → "Couldn't save the photo. Your entry was saved without it."
- Huỷ: bấm ✕ khi đã gõ số → hỏi "Discard this entry?" · "Discard" / "Keep editing".

### F-03 · Home — S-02

**S-02 Home** (bố cục từ trên xuống)
1. Header: lời chào theo giờ ("Morning, driver" — không cần tên) · nhãn năm thuế "Tax year 2026/27" (UK) hoặc "Tax year 2026" (US) · icon bánh răng.
2. **Banner sao lưu** (chỉ hiện khi > 30 ngày chưa sao lưu, hoặc chưa sao lưu lần nào và có ≥ 20 khoản):
   "Last backup 34 days ago" / "You haven't backed up yet" · nút "Back up now" · nút ✕ (ẩn 7 ngày).
3. **Thẻ "This week"** (Thứ 2 → Chủ nhật): "In £1,240.00" (xanh) · "Out £186.40" (cam) · "Net £1,053.60" (lớn) ·
   "Business miles 612". Chạm → Reports, lọc tuần này.
4. **Thẻ "To sort"** (nền vàng nắng nhạt): "14 entries to sort" + dòng phụ "Sunday's job — about 3 minutes" + nút "Sort now".
   Khi 0: "All sorted ✓" + "Nice. Nothing waiting for Sunday."
5. **Thẻ chuyến đi**:
   - Không có chuyến chạy: nút viền "Start trip" (icon cờ) + dòng phụ "GPS records your business miles until you stop."
   - Đang chạy: thẻ đậm "Trip running · 42.3 mi · 2h 14m" có chấm đỏ nhấp nháy · nút "Personal stop" · nút "End trip".
   - Đang tạm dừng (personal stop): "Paused for personal stop" · nút "Resume" · "End trip".
6. **2 nút lớn cạnh nhau ở nửa dưới** (cao 72dp): **"− Expense"** (cam) và **"+ Income"** (xanh lá).
7. "Recent" — 5 khoản gần nhất (dòng: icon loại, ghi chú hoặc "No note", giờ, số tiền, chấm vàng nếu chưa phân loại,
   icon ảnh nếu có hoá đơn). Link "See all" → Entries.
- **Trạng thái rỗng** (chưa có khoản nào): thay mục 7 bằng minh hoạ + "Your first entry takes 10 seconds." + mũi tên chỉ 2 nút lớn.

### F-04 · Sổ (Entries) — S-04

**S-04 Entries**
- Thanh tìm kiếm "Search notes or amounts".
- Hàng chip lọc: "All" · "Unsorted" · "Income" · "Expenses" · "Work" · "Personal" · "With receipt" · "Date ▾" · "Category ▾".
- Danh sách nhóm theo ngày ("Today", "Yesterday", "Mon 9 Nov"), mỗi nhóm có tổng ngày bên phải ("−£42.10 / +£310.00").
- Dòng khoản: icon tròn theo danh mục (hoặc "?" vàng nếu chưa phân loại) · ghi chú (đậm) · dòng phụ "Fuel · Work · 07:42"
  hoặc "Unsorted · Work · 07:42" · số tiền phải (xanh "+", cam "−") · icon kẹp giấy nếu có ảnh · nhãn "Personal" xám nếu cá nhân.
- Chạm → S-05. **Giữ lâu → chế độ chọn nhiều**: thanh trên đổi thành "3 selected" + nút "Merge", "Set category", "Work/Personal", "Delete".
- Vuốt trái 1 dòng → "Delete"; vuốt phải → "Personal"/"Work" (đảo).
- Trạng thái rỗng: "No entries yet" + nút "Add your first entry". Khi lọc không có kết quả: "Nothing matches these filters" + "Clear filters".

### F-05 · Chi tiết & sửa khoản — S-05

**S-05 Entry detail** (sửa trực tiếp trên màn, không có chế độ xem riêng)
- Header: "✕" · tiêu đề "Expense" / "Income" · menu "⋯" (Split, Duplicate, Delete).
- Số tiền lớn (chạm để sửa) · công tắc Expense/Income.
- Trường: "Date & time" · "Note" · "Category" (chip mở danh sách; có "Unsorted") · "Work / Personal" (công tắc) ·
  "Receipts" (lưới ảnh nhỏ, nút "+ Add photo"; chạm ảnh → xem toàn màn hình, zoom, nút "Delete photo").
- Nếu khoản sinh ra từ tách: dòng nhỏ "Split from £60.00 on 9 Nov" (chạm → mở các phần cùng nhóm).
- Nút đáy: "Save changes" (chỉ sáng khi có thay đổi). Thoát khi chưa lưu → "Discard changes?" · "Discard" / "Keep editing".
- Xoá → hộp thoại "Delete this entry?" · "This also deletes its receipt photos." · "Delete" (đỏ) / "Cancel" → snackbar "Entry deleted" + "Undo".

### F-06 · Tách khoản (Split) — S-06b

- Từ "⋯ → Split" ở S-05 hoặc nút "Split" trong thẻ Phân loại.
- **S-06b Split entry**: tiêu đề "Split £60.00" · danh sách phần, mỗi phần: số tiền · danh mục · Work/Personal ·
  ghi chú (mặc định ghi chú gốc). Mặc định 2 phần chia đôi. Nút "+ Add part" (tối đa 10).
- Thanh trạng thái dưới: "Left to assign £0.00" (xanh khi = 0; cam "£5.00 left" / "£5.00 over").
- Nút "Split" chỉ sáng khi còn lại = 0 và mỗi phần > 0. Ảnh hoá đơn gắn với **mọi** phần.
- Ví dụ mẫu: "Tesco £60.00" → "Fuel £45.00 · Work" + "Groceries £15.00 · Personal".

### F-07 · Gộp khoản (Merge)

- Chọn ≥ 2 khoản **cùng loại** (cùng Income hoặc cùng Expense) trong S-04 → "Merge".
- Hộp thoại xem trước: "Merge 3 entries into one £27.40 expense?" · ngày = ngày sớm nhất · ghi chú nối bằng " · " ·
  giữ mọi ảnh · danh mục: giữ nếu tất cả giống nhau, khác nhau → "Unsorted". Nút "Merge" / "Cancel".
- Chọn khác loại → nút "Merge" mờ, chạm hiện "You can only merge entries of the same type."
- Sau gộp: snackbar "Merged 3 entries" + "Undo".

### F-08 · Phân loại tuần (Weekly sort) — S-06, S-06c

**S-06 Sort** (tab "Sort")
- Header: "Sort your week" · bộ chọn tuần "This week · 9–15 Nov ▾" (danh sách các tuần còn khoản chưa phân loại, mỗi tuần kèm số, vd "2–8 Nov · 3 left").
- Thanh tiến độ vàng: "9 of 14 sorted".
- **Thẻ khoản** (một thẻ lớn ở giữa, các thẻ sau xếp chồng mờ phía sau):
  - Số tiền lớn + loại · ghi chú · ngày giờ · ảnh hoá đơn nhỏ (chạm phóng to).
  - **Hàng gợi ý**: "Suggested" + tối đa 3 chip danh mục (chip đầu được tô viền vàng = gợi ý tốt nhất), vd "Fuel" "Van repairs & servicing" "Other expenses". Chip "More…" mở toàn bộ danh mục.
  - Công tắc "Work" / "Personal".
  - Hàng nút nhỏ: "Edit" (→ S-05) · "Split" (→ S-06b) · "Skip" (để sau, đẩy xuống cuối).
  - **Chạm một chip danh mục = phân loại xong** → thẻ trượt đi, thẻ kế lên (hiệu ứng 200ms), Undo ở snackbar.
- Nút phụ trên cùng phải: "List view" → **S-06a** dạng danh sách: mỗi dòng có chip gợi ý tốt nhất + nút "✓" để chấp nhận;
  nút đáy "Accept all suggestions (12)" (hỏi xác nhận: "Apply suggested categories to 12 entries?").
- **S-06c Done**: minh hoạ mặt trời + "Week sorted ✓" · tóm tắt "In £1,240.00 · Out £186.40 · 612 business miles" ·
  nếu cần sao lưu: thẻ "Back up your log" + nút "Back up now" · nút "Done".
- Rỗng (không có gì để phân loại): "Nothing to sort" · "Entries you log during the week will wait here for Sunday."

### F-09 · Gợi ý danh mục (logic, không có màn riêng)

- Chạy hoàn toàn trên máy. Điểm cho mỗi danh mục dựa trên:
  1. **Lịch sử của người dùng:** các khoản đã phân loại có ghi chú chứa cùng từ khoá (không phân biệt hoa thường, bỏ dấu câu) — trọng số cao nhất; khoản gần đây nặng hơn.
  2. **Bộ từ khoá sẵn** theo vùng: vd "shell, bp, esso, texaco, fuel, diesel, petrol, gas" → Fuel; "parking, ncp, ringgo, toll, dart, congestion, ulez" → Parking; "ee, vodafone, o2, three, verizon, t-mobile" → Phone; "amazon flex, dpd, evri, yodel, payout, uber" → Delivery income…
  3. **Số tiền giống** (±10%) với khoản trước cùng ghi chú.
  4. **Loại** (Income chỉ gợi ý danh mục Income).
- Không đủ dữ liệu → gợi ý 3 danh mục dùng nhiều nhất của loại đó. Gợi ý cũng gợi ý Work/Personal theo lịch sử.
- Mục tiêu: sau 4 tuần dùng, ≥ 70% lần chip đầu tiên đúng.

### F-10 · Danh mục — S-11

**S-11 Categories** (từ Settings)
- Hai mục "Income" / "Expenses"; mỗi dòng: icon màu · tên · ô tờ khai (chữ nhỏ xám, vd "SA103: Car, van and travel expenses") · tay nắm kéo để sắp xếp.
- Chạm dòng → sheet sửa: "Name" · "Icon & colour" (lưới 24 icon, 10 màu) · "Tax form line" (danh sách chọn) · "Hide category" (công tắc).
- Nút "+ Add category".
- Không xoá danh mục đã dùng: chỉ ẩn ("Hidden categories keep their past entries."). Danh mục chưa dùng có "Delete".
- Mục "Hidden (2)" thu gọn ở cuối.
- Lỗi: tên trống → "Name can't be empty"; trùng tên → "You already have a category with this name".

### F-11 · Quãng đường nhập tay — S-08

**S-08 Add trip (manual)**
- Tiêu đề "Add trip". Công tắc kiểu nhập: "Odometer" | "Distance".
  - Odometer: "Start reading" · "End reading" → tự tính "= 128 mi".
  - Distance: "Miles" (US/UK đều dùng dặm; Settings cho đổi sang km nếu muốn).
- "Date" (mặc định hôm nay) · "Work / Personal" (mặc định Work) · "Purpose" ("e.g. Amazon route DLS4").
- Nút "Save trip".
- Lỗi: End < Start → "End reading must be higher than start"; > 1.000 dặm → hỏi "That's a long trip — 1,240 mi. Save anyway?".

### F-12 · Chuyến GPS (Start/Stop) — S-07a, S-07b

- **Start trip** (Home, tab Miles, widget, phím tắt): lần đầu giải thích quyền trước khi hệ thống hỏi:
  **S-07a Location permission explainer**: "Track business miles with GPS" · "Sunday Sort records your route only while a
  trip is running. You start and stop every trip — nothing runs in the background otherwise." · "Location stays on your phone." ·
  nút "Allow location" / "Not now". Android cần thêm "Allow all the time" để ghi khi tắt màn hình → bước 2 giải thích riêng:
  "To keep recording with the screen off, choose 'Allow all the time'." + "Open settings".
- Đang ghi: **thông báo cố định** "Trip running · 42.3 mi" với nút "Personal stop" và "End trip".
- **S-07b Active trip** (chạm thẻ trên Home hoặc thông báo): số dặm rất lớn "42.3 mi" · thời gian "2h 14m" ·
  phác hoạ đường đi dạng đường kẻ đơn giản (không bản đồ nền) · trạng thái GPS "GPS good" / "Weak GPS signal" ·
  nút "Personal stop" (tạm dừng, các đoạn trong lúc dừng không tính) · nút "End trip" (đỏ viền).
- End trip → sheet xác nhận: "Trip saved · 128.4 mi" · "Work / Personal" · "Purpose" · nút "Save" / "Discard trip" (hỏi lại).
- **Nhắc quên:** chuyến chạy > 12 giờ → thông báo "Still driving? Your trip has been running for 12 hours." · nút "End trip" / "Keep going".
- **Chống sót âm thầm:** nếu hệ thống dừng ghi (pin, quyền bị thu hồi), lần mở app tiếp theo hiện thẻ cam
  "Your trip stopped recording at 14:05" · "Saved 86.2 mi up to that point." · "Add missing miles" (→ S-08) / "OK".
- Lỗi: GPS tắt → "Location is off. Turn it on to start a trip." + "Open settings"; quyền bị từ chối → thẻ ở tab Miles
  "GPS trips need location access" + "Allow" và gợi ý "Or add trips manually".

### F-13 · Tab Miles — S-07

**S-07 Miles**
- Header: "Miles · Tax year 2026/27 ▾".
- Thẻ tổng: "Business 8,412 mi" (lớn) · "Personal 1,032 mi" · dòng ước tính "≈ £3,785.40 at HMRC rates (45p / 25p)"
  + "Estimate only — not tax advice." (US: "≈ $6,098.70 at $0.725/mi").
- Thẻ chuyến đang chạy (nếu có) như Home.
- 2 nút: "Start trip" (chính) · "Add manually" (viền).
- Danh sách chuyến theo tháng: dòng "Tue 10 Nov · 128.4 mi · GPS · Work · Amazon route DLS4". Chạm → sửa (như S-08,
  với chuyến GPS chỉ sửa được Work/Personal, purpose, và sửa dặm thủ công kèm nhãn "Edited").
- Rỗng: "No trips yet" · "Start a GPS trip or add miles from your odometer."

### F-14 · Báo cáo — S-09

**S-09 Reports**
- Bộ chọn kỳ: "Tax year 2026/27 ▾" + đoạn chip "Year" · "Q1" · "Q2" · "Q3" · "Q4" · "Custom".
  UK quý: 6 Apr–5 Jul, 6 Jul–5 Oct, 6 Oct–5 Jan, 6 Jan–5 Apr. US quý: theo quý dương lịch.
- **Cảnh báo chưa phân loại** (nếu có): "7 entries in this period aren't sorted yet" + "Sort now".
- Thẻ tổng: "Income £18,240.00" · "Expenses £4,812.55" · "Profit £13,427.45" (chỉ tính khoản **Work**; dòng nhỏ
  "Personal entries are excluded (£612.30)").
- Biểu đồ cột ngang theo danh mục chi (sắp giảm dần), mỗi cột: tên · số · % ; chạm → Entries lọc danh mục + kỳ.
- Bảng "By tax form line" (SA103 / Schedule C): tên ô · tổng.
- Thẻ "Mileage" (tổng dặm + ước tính).
- Biểu đồ đường nhỏ "Income vs expenses by month".
- Nút đáy: **"Export"** → S-10.
- Rỗng: "No data for this period".

### F-15 · Xuất file — S-10

**S-10 Export** (sheet)
- "Period": kỳ đang chọn ở Reports (đổi được).
- Chọn định dạng (thẻ chọn 1 hoặc nhiều):
  - "CSV – all entries" (mỗi dòng: date, type, amount, currency, category, tax_line, work_personal, note, has_receipt, entry_id).
  - "CSV – totals by category" (dạng dán vào bridging software / bảng tính kế toán).
  - "CSV – mileage log" (date, miles, work_personal, purpose, source GPS/manual, start/end odometer).
  - "PDF report" (trang tổng + theo danh mục + theo tháng + nhật ký dặm + danh sách khoản; footer "Generated by Sunday Sort · Not tax advice").
  - "Receipt photos (ZIP)" — tên file ảnh theo ngày + số tiền.
- Công tắc "Include personal entries" (mặc định tắt).
- Ghi chú UK: "Making Tax Digital: Sunday Sort isn't MTD software. Use these CSVs with bridging software or send them to your accountant."
- Nút "Export" → tạo file (vòng tiến độ "Preparing your files…") → share sheet hệ thống.
- Có khoản chưa phân loại → cảnh báo trước: "7 entries aren't sorted. They'll appear as 'Unsorted'." · "Export anyway" / "Sort first".
- Lỗi: "Couldn't create the file. Free up some storage and try again."

### F-16 · Sao lưu & khôi phục — S-12

**S-12 Backup & restore** (từ Settings, banner Home, màn Done)
- Thẻ trạng thái: "Last backup: 10 Nov 2026, 18:22" hoặc "Never backed up" (cam).
- Giải thích: "Your log lives only on this phone. Save a backup file to Google Drive, iCloud Drive, email or anywhere you like."
- Nút "Back up now" → tạo file `SundaySort-backup-2026-11-10.sundaysort` (gồm dữ liệu + ảnh) → share sheet.
  Tiến độ: "Packing 1,204 entries and 318 photos…".
- Nút "Restore from backup" → chọn file → xem trước "Backup from 10 Nov 2026 · 1,204 entries · 96 trips · 318 photos" →
  hộp thoại "Replace everything on this phone with this backup?" · "This can't be undone." · "Replace" / "Cancel".
- Công tắc "Remind me to back up every 30 days" (mặc định bật).
- Lỗi: file sai định dạng → "This isn't a Sunday Sort backup file."; file hỏng → "This backup is damaged and can't be restored.";
  bản sao lưu từ phiên bản mới hơn → "This backup is from a newer version. Update Sunday Sort first."

### F-17 · Nhắc phân loại hằng tuần (thông báo)

- Một thông báo/tuần vào ngày giờ đã chọn (mặc định Sun 18:00), **chỉ khi có khoản chưa phân loại**:
  "14 entries to sort · About 3 minutes. Tap to sort your week." → mở S-06.
- Không bao giờ nhắc sau mỗi khoản ghi.
- Settings: bật/tắt, ngày, giờ.

### F-18 · Khoá app — S-13

- Settings → "App lock" công tắc → xác thực vân tay / Face ID một lần để bật.
- "Lock after": "Immediately" · "After 1 minute" (mặc định) · "After 5 minutes".
- **S-13 Locked**: logo + "Sunday Sort is locked" + nút "Unlock" (tự bật hộp thoại sinh trắc khi mở). Lùi về mã máy nếu sinh trắc lỗi.
- Máy không có sinh trắc/mã khoá → công tắc mờ + "Set up a screen lock on your phone first."
- Widget và thông báo vẫn mở Ghi nhanh **sau khi** mở khoá.

### F-19 · Widget màn hình chính — S-14

- **Android nhỏ (2×1) / iOS nhỏ:** 2 nút "−" (Expense) và "+" (Income) + số nhỏ "14 to sort".
- **Android vừa (4×2) / iOS vừa:** hàng 3 nút "− Expense" · "+ Income" · "Start trip" (hoặc "End trip · 42.3 mi" khi đang chạy) +
  dòng "This week: Net £1,053.60 · 14 to sort".
- Màu theo theme app, nền bo góc; chế độ tối theo hệ thống.
- Chạm nút → mở thẳng S-03 với loại đã chọn / bắt đầu chuyến (vào app hiện S-07b).
- Mockup: vẽ 4 widget trên nền màn hình chính Android và iOS (sáng + tối).

### F-20 · Cài đặt — S-15

**S-15 Settings** (danh sách nhóm)
- **Region & tax**: "Region" (United Kingdom / United States — đổi sẽ hỏi "Change region? Currency, tax year and form lines will switch."; nếu đã có khoản tiền tệ cũ: người dùng nhập tỷ giá "1 £ = ? $", mọi khoản quy đổi sang tiền tệ mới (làm tròn tới xu), không hoàn tác được — Phương chốt 2026-11-12, B-14) · "Currency" (chỉ hiển thị) · "Tax year" (UK: 6 Apr – 5 Apr; US: Jan – Dec) · "Mileage rates" (sửa mức, nút "Reset to default").
- **Logging**: "Default for new entries" (Work/Personal) · "Keep adding after save" · "Distance unit" (Miles/Kilometres).
- **Sunday sort**: "Weekly reminder" (bật/tắt) · "Day" · "Time".
- **Categories** → S-11.
- **Security**: "App lock" · "Lock after".
- **Your data**: "Backup & restore" → S-12 · "Export" → S-10 · "Delete all data" (đỏ; hỏi 2 lần, lần 2 gõ "DELETE").
- **Appearance**: "Theme" (System / Light / Dark).
- **About**: "How Sunday Sort works" (xem lại onboarding) · "Privacy policy" (mở web) · "Not tax advice" (S-16) ·
  "Rate the app" · "Contact" (mở email) · "Version 1.0.0".

### F-21 · Thông tin & miễn trừ — S-16

**S-16 Not tax advice**: "Sunday Sort helps you keep records. It doesn't tell you what you can claim, and it doesn't file
taxes for you. Category and tax-form-line names are labels to help you and your accountant. Mileage amounts are estimates
using standard rates you can edit. Check HMRC / IRS guidance or ask an accountant."

---

## 7. Dữ liệu (cho phần code — Claude Design không cần vẽ)

- **Entry**: id, type (income/expense), amount_minor (số nguyên pence/cent), currency, occurred_at, note, category_id (null = chưa phân loại), scope (work/personal), sorted_at, split_group_id, created_at, updated_at.
- **Receipt**: id, entry_id, file_path, created_at.
- **Category**: id, type, name, icon, color, tax_line_code, order, hidden, region.
- **Trip**: id, source (gps/manual), started_at, ended_at, distance_m, odo_start, odo_end, scope, purpose, edited, status (running/paused/done/interrupted).
- **TripPoint**: trip_id, ts, lat, lng, accuracy (chỉ dùng để tính dặm và vẽ phác hoạ; xoá được).
- **Settings**: region, tax_year_start, mileage_rates, default_scope, reminder (day, time, on), app_lock, lock_after, theme, last_backup_at, distance_unit.
- Tuần = Thứ 2 00:00 → Chủ nhật 23:59 theo giờ máy. Năm thuế UK: khoản ngày 5/4 thuộc năm cũ.

---

## 8. Dữ liệu mẫu cho mockup

**UK (Dan, tuần 9–15 Nov 2026, £):**
| Ngày giờ | Loại | Số tiền | Ghi chú | Danh mục | Phạm vi | Ảnh |
|---|---|---|---|---|---|---|
| Mon 9 Nov 06:12 | Expense | 72.40 | Shell M62 | (chưa) gợi ý Fuel | Work | Có |
| Mon 9 Nov 11:30 | Expense | 4.20 | Greggs | (chưa) gợi ý Other | Personal | Không |
| Mon 9 Nov 14:05 | Expense | 3.50 | RingGo Leeds | Parking, tolls & congestion | Work | Không |
| Tue 10 Nov 18:40 | Income | 620.00 | DPD weekly payout | Delivery income | Work | Không |
| Wed 11 Nov 07:01 | Expense | 60.00 | Tesco | (chưa) → tách Fuel 45 + Personal 15 | Work | Có |
| Thu 12 Nov 16:22 | Expense | 189.99 | Kwik Fit tyres | (chưa) gợi ý Van repairs & servicing | Work | Có |
| Fri 13 Nov 19:00 | Income | 620.00 | DPD weekly payout | (chưa) gợi ý Delivery income | Work | Không |
| Sat 14 Nov 09:15 | Expense | 15.00 | EE phone | (chưa) gợi ý Phone & data | Work | Không |
- Tuần: In £1,240.00 · Out £186.40 · 14 khoản chưa phân loại · 612 dặm công việc.
- Năm thuế 2026/27 tới nay: Income £18,240.00 · Expenses £4,812.55 · 8,412 dặm công việc · 1,032 dặm cá nhân.

**US (Maria, $):** "Amazon Flex payout $186.50", "Chevron $58.20", "Toll – Harris County $3.75", "Verizon $65.00",
"Jiffy Lube $79.99"; năm 2026: Income $41,820.00 · Expenses $9,412.30 · 8,412 mi ≈ $6,098.70.

---

## 9. Danh sách màn cho Claude Design (vẽ đủ)

| Mã | Màn | Ghi chú vẽ |
|---|---|---|
| S-01a–d | Onboarding: Welcome, Region, Categories, Reminder | sáng |
| S-02 | Home — có dữ liệu, rỗng, có banner sao lưu, đang chạy chuyến | sáng + tối |
| S-03 | Quick capture — trống, đã gõ số + ảnh + ghi chú, Income | sáng + tối |
| S-04 | Entries — danh sách, chế độ chọn nhiều, lọc rỗng | sáng |
| S-05 | Entry detail / edit + xem ảnh toàn màn | sáng |
| S-06 | Sort — chế độ thẻ | sáng + tối |
| S-06a | Sort — List view + "Accept all" | sáng |
| S-06b | Split entry | sáng |
| S-06c | Week sorted (Done) | sáng |
| S-07 | Miles — có dữ liệu, rỗng, quyền bị từ chối | sáng |
| S-07a | Location permission explainer (2 bước) | sáng |
| S-07b | Active trip + sheet End trip + thẻ "Trip stopped recording" | sáng + tối |
| S-08 | Add trip (manual) | sáng |
| S-09 | Reports — năm, quý, có cảnh báo chưa phân loại | sáng + tối |
| S-10 | Export sheet + đang tạo file | sáng |
| S-11 | Categories + sheet sửa danh mục | sáng |
| S-12 | Backup & restore + hộp thoại Replace | sáng |
| S-13 | Locked | sáng + tối |
| S-14 | Widget Android 2×1, 4×2 + iOS nhỏ, vừa | sáng + tối |
| S-15 | Settings | sáng |
| S-16 | Not tax advice | sáng |
| — | Các hộp thoại & snackbar: Discard, Delete + Undo, Merge, Change region, Delete all data, lỗi quyền camera/vị trí | sáng |
| — | Thông báo hệ thống: nhắc Chủ nhật, chuyến đang chạy, chuyến > 12h | Android + iOS |
| — | Icon app | — |

**Bàn giao từ Claude Design:** link dự án + export HTML từng màn + file token (màu, chữ, bo góc, khoảng cách) → để vào
`apps/A006-sundaysort/design/`.

---

## 10. Ngoài phạm vi (cố ý không làm)

- Không tài khoản, không đồng bộ cloud, không kết nối ngân hàng, không server.
- Không tư vấn khoản nào được trừ thuế; không nộp thuế / MTD thay.
- Không tự dò chuyến đi khi người dùng chưa bấm Start.
- Không quảng cáo, không mua trong app, không thu phí.
- Không bản đồ nền (chỉ phác hoạ đường đi) — tránh khoá API bản đồ.
- Chỉ tiếng Anh ở bản này (code dựng sẵn i18n).
