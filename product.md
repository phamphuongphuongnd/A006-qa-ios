# Sunday Sort: Driver Expenses — product.md (bản 2)

> Mã app `A006-sundaysort` · Bundle `com.phiotron.sundaysort` · Android + iOS · React Native + Expo
> Tài liệu gửi **Claude Design** để vẽ lại **toàn bộ app** ở mức Hi-Fi. Mô tả bằng tiếng Việt; **mọi chữ hiện trên app viết
> bằng tiếng Anh trong ngoặc kép** — dùng đúng chữ đó trên mockup. Thuật ngữ: `CONTEXT.md`. Lý do các quyết định:
> `research.md`, `PLAN-v2.md` (Q1–Q24, P1-1…P1-12).
> Ngày: 2026-11-13 · Bản 2 = bản 1 (đã làm xong, 200 case test) + **tự động** + **Pro (thuê bao năm)**.
> Ký hiệu: **[Pro]** = chỉ bản trả phí (hoặc đang dùng thử) · **[Mới]** = chưa có ở bản 1 · **[Đổi]** = khác bản 1.

---

## 0. Tóm tắt một đoạn

Tài xế van / courier tự kinh doanh được trả và tiêu tiền rải rác cả ngày nhưng không có thời gian làm sổ. Sunday Sort tách
việc làm 2 bước: **ghi trong 10 giây** (Thu/Chi → số tiền → ảnh hoá đơn nếu muốn → 1 dòng ghi chú, **không chọn danh mục**)
và **phân loại cả tuần một lần vào Chủ nhật**. Bản 2 thêm **tự động mà không sót âm thầm**: chuyến đi tự ghi khi điện thoại
nhận ra đang lái xe, tự gộp các điểm giao thành một **chuyến ca**, luật tự phân loại nơi bán quen, khoản lặp lại, đọc hoá đơn
trên máy, sao lưu tự động mỗi đêm — và **luôn báo ngay khi app ngừng ghi**. Cuối kỳ có sẵn tổng theo ô tờ khai (UK SA103 /
MTD · Mỹ Schedule C) và file đúng mẫu để nhập vào phần mềm MTD (MTDsorted, BrightBooks, TaxCalc…) hoặc FreeAgent.
Không quảng cáo, không tài khoản, không server, không kết nối ngân hàng, dữ liệu không rời điện thoại.
**Miễn phí** phần ghi và phân loại tay; **Pro** (thuê bao năm) cho tự động + xuất file năm thuế/MTD + ảnh không giới hạn.

---

## 1. Đối thủ (cập nhật 2026-11-13, nguồn `research.md`)

| Chức năng | Driversnote (UK #1) | MileIQ | Everlance | Hurdlr | Cash Book | **Sunday Sort** |
|---|---|---|---|---|---|---|
| Ghi khoản không cần chọn danh mục | — (chỉ dặm) | — (chỉ dặm) | Không | Không | Không | **Có (lõi)** |
| Hàng chờ phân loại theo tuần | Không | Không | Không | Không | Không | **Có** |
| Tự ghi chuyến | Có (iBeacon / tự dò) | Có | Có | Có (trả phí) | Không | **Có [Pro]**, gộp chuyến ca, báo khi ngừng ghi |
| Start/Stop tay | Có | Không | Có | Có (free) | — | **Có, miễn phí** |
| Bật chuyến không chạm máy | iBeacon (mua thêm) | Không | Không | Bluetooth | — | **Bluetooth van, cắm sạc, thẻ NFC** |
| Vuốt phân loại chuyến | Có | Có | Có | Có (Speed Tagging) | — | **Có** + Personal segment sau chuyến |
| Luật tự phân loại / học nơi quen | Không | Nơi quen | Nơi quen | Có (AI) | Không | **Có [Pro]**, hỏi 1 chạm trước khi áp |
| Đọc hoá đơn (OCR) | Không | Không | Có | Có | Không | **Có [Pro], chạy trên máy** |
| Sửa / gộp / tách khoản | — | Gộp chuyến | Sửa | Sửa, gộp chuyến | Sửa | **Sửa + gộp + tách ngay trên thẻ** |
| Năm thuế UK + MTD | Logbook HMRC | Bản UK | Không | Không | Không | **SA103 + file nhập MTD + FreeAgent** |
| Không cần tài khoản / ngân hàng | Không | Không | Không | Không | Có | **Có** |
| Quảng cáo | Không | Không | Không | Không | **Có** | **Không** |
| Giới hạn bản free | **15 chuyến/tháng (giấu)** | 40 chuyến/tháng | Hạn chế | Có | Quảng cáo | **20 ảnh/tháng, nói rõ lúc cài; mọi thứ khác dùng mãi** |
| Giá trả phí (UK) | ≈ £96/năm | ≈ £95/năm | ≈ £60–100/năm | $100/năm | IAP | **£24.99/năm** (tạm, sẽ chỉnh) |

Khác biệt nói trên store: ghi không danh mục + phân loại Chủ nhật; tự động **không sót âm thầm**; không tài khoản/ngân hàng;
không khoá dữ liệu khi ngừng trả; rẻ hơn 3–4 lần. **Không** quảng bá "Start/Stop + xuất file miễn phí" là khác biệt (Hurdlr
cũng có).

---

## 2. Người dùng & nguyên tắc thiết kế

**Persona chính — Dan, 38 tuổi, tài xế van multi-drop ở Leeds.** 120–150 điểm giao/ngày, 6 ngày/tuần, ~35.000 dặm/năm. Mỗi
điểm giao tắt máy 1–3 phút. Trả xăng, phí đỗ, bữa trưa. Android tầm trung (Samsung), cầm máy một tay, đeo găng mùa đông,
đứng ngoài nắng; luật UK cấm cầm máy khi lái. Chủ nhật ngồi sofa 15–20 phút làm sổ. Từ 4/2027 phải nộp MTD theo quý.

**Persona phụ — Maria, 44 tuổi, courier tự do ở Texas (Mỹ)**, Amazon Flex + giao hàng địa phương, khai Schedule C, iPhone.

**Nguyên tắc UX (ưu tiên theo thứ tự):**
1. **10 giây là luật.** Từ lúc chạm widget/nút tới lúc lưu xong một khoản: tối đa 3 chạm + gõ số. Chỉ số tiền là bắt buộc.
2. **Không sót âm thầm.** Tự động gì cũng phải có trạng thái nhìn thấy được, và báo ngay khi ngừng ghi. Không bao giờ
   tự xoá / tự bỏ chuyến.
3. **Một tay, ngón cái, không nhìn lâu.** Nút chính nửa dưới màn hình; vùng chạm ≥ 56dp nút chính, ≥ 48dp nút khác.
4. **Đọc được ngoài nắng.** Tương phản ≥ 7:1 cho số tiền và nút chính; chữ thân ≥ 16sp; số tiền nhập ≥ 48sp.
5. **Chủ nhật là lúc thoải mái** — màn Sort dày thông tin hơn nhưng mỗi khoản là một thẻ, mọi sửa/tách/gộp làm ngay trên thẻ.
6. **Không làm người dùng sợ.** Chi phí màu ấm, không đỏ; luôn có Undo sau xoá / gộp / tách / vuốt / tự xếp.
7. **Thu phí thẳng thắn.** Giới hạn bản free nói rõ từ lúc cài; không popup bán hàng chặn việc đang làm; hết Pro không
   khoá / xoá dữ liệu; báo trước 7 ngày khi gia hạn.
8. **Không tư vấn thuế.** Mọi con số ước tính ghi "Estimate only — not tax advice".

---

## 3. Định hướng thiết kế (cho Claude Design)

- **Tính cách:** bình tĩnh, gọn, đáng tin, hơi ấm — "sổ sách gọn gàng sáng Chủ nhật". Giữ nhận diện bản 1 (`design/`
  bản 1 có token, Claude Design được tinh chỉnh để tối ưu UX/UI).
- **Màu (giữ tương phản):** nền sáng `#FAF8F4` / tối `#12161C` · chính xanh than `#1F2A44` (sáng) / vàng nắng `#F5B841`
  làm nhấn (tối) · nhấn Sunday vàng nắng `#F5B841` · Thu `#1E8E5A` · Chi `#C8553D` · Lỗi `#B42318` · Work `#2E6FD8` ·
  Personal `#7A6F9B`. **[Mới]** Pro: viền / huy hiệu vàng nắng + chữ "PRO" nhỏ, không dùng màu tím "premium" kiểu quảng cáo.
  **[Mới]** Trạng thái tự động: xanh lá dịu = đang ổn, cam = cần chú ý, xám = đang tắt.
- **Chữ:** Inter (hoặc tương đương), số dùng tabular figures; số tiền lớn 48–64sp đậm.
- **Hình khối:** thẻ bo 16dp, nút chính viên thuốc 28dp, bóng rất nhẹ, icon nét 24dp.
- **Chế độ:** Sáng + Tối (theo hệ thống, đổi được). Chữ 200% không vỡ (thẻ giãn dọc). Thử ở 320dp.
- **Khung mockup:** iPhone 390×844 và Android 360×800.
- **Minh hoạ:** tối giản nét (van, tờ hoá đơn, mặt trời Chủ nhật, thẻ NFC dán trên táp-lô) cho onboarding / trạng thái rỗng.
- **Icon app:** giữ bản 1.

---

## 4. Điều hướng

**Thanh tab dưới (5 tab):** "Home" · "Entries" · "Sort" (**badge vàng** = số khoản + chuyến Unsorted; ẩn khi 0; "99+") ·
"Miles" · "Reports".

- Ghi nhanh: Home có 2 nút lớn; các tab khác có **FAB "+"** góc dưới phải (mở Ghi nhanh, mặc định Expense).
- Settings: icon bánh răng góc trên phải Home. **[Mới]** Huy hiệu "PRO" / "Trial · 5 days left" cạnh bánh răng khi có.
- Deep link: `sundaysort://capture?type=income|expense` · `sundaysort://trip/start` · `sundaysort://trip/toggle` **[Mới]**
  (thẻ NFC, Phím tắt iOS) · `sundaysort://trip/active` · `sundaysort://sort` · `sundaysort://pro` **[Mới]**.

---

## 5. Danh mục mặc định, ô tờ khai và cách tính xe

Người dùng đổi tên / thêm / ẩn / sắp xếp được. Mỗi danh mục gắn **một ô tờ khai**; UK thêm **một HMRC category** (MTD).
Cột "Chi phí chạy xe" quyết định khoản đó có bị "bao" bởi mức dặm không (mục 5.3).

### 5.1 UK (SA103 + MTD)
| Loại | Tên hiện trên app | Ô SA103 | HMRC category (MTD) | Chi phí chạy xe |
|---|---|---|---|---|
| Income | "Delivery income" | Turnover | Turnover | — |
| Income | "Tips & bonuses" | Turnover | Turnover | — |
| Income | "Other income" | Other business income | Other business income | — |
| Expense | "Fuel" | Car, van and travel expenses | Car, van and travel expenses | Có |
| Expense | "Van repairs & servicing" | Car, van and travel expenses | Car, van and travel expenses | Có |
| Expense | "Van insurance & tax" | Car, van and travel expenses | Car, van and travel expenses | Có |
| Expense | "Van lease / finance" | Car, van and travel expenses | Car, van and travel expenses | Có |
| Expense | "Parking, tolls & congestion" | Car, van and travel expenses | Car, van and travel expenses | Không |
| Expense | "Phone & data" | Phone, fax, stationery and other office costs | Administrative costs | Không |
| Expense | "Equipment & uniform" | Other allowable business expenses | Other expenses | Không |
| Expense | "Accountant & fees" | Accountancy, legal and other professional fees | Professional fees | Không |
| Expense | "Other expenses" | Other allowable business expenses | Other expenses | Không |

Danh sách đủ 15 HMRC category (cho danh mục người dùng tự thêm): Administrative costs · Advertising and marketing · Business
entertainment · Car, van and travel expenses · Cost of goods · Depreciation · Finance charges · Interest on loans · Bad debts ·
Repairs and maintenance · Other expenses · Payments to subcontractors · Premises running costs · Professional fees · Wages and
staff costs. Thu: Turnover · Other business income.

### 5.2 US (Schedule C)
| Loại | Tên | Dòng Schedule C | Chi phí chạy xe |
|---|---|---|---|
| Income | "Delivery income" | Line 1 Gross receipts | — |
| Income | "Tips & bonuses" | Line 1 Gross receipts | — |
| Income | "Other income" | Line 6 Other income | — |
| Expense | "Fuel" | Line 9 Car and truck expenses | Có |
| Expense | "Vehicle repairs" | Line 21 Repairs and maintenance | Có |
| Expense | "Vehicle insurance" | Line 15 Insurance | Có |
| Expense | "Vehicle lease" | Line 20a Rent or lease – vehicles | Có |
| Expense | "Parking & tolls" | Line 9 Car and truck expenses | Không |
| Expense | "Phone & data" | Line 25 Utilities | Không |
| Expense | "Supplies & equipment" | Line 22 Supplies | Không |
| Expense | "Professional fees" | Line 17 Legal and professional services | Không |
| Expense | "Other expenses" | Line 27a Other expenses | Không |

### 5.3 Cách tính xe (Vehicle cost method) **[Mới]** — X2, Q24, P1-6
- Chọn ở onboarding (S-01c), đổi trong Settings: **"Mileage rate"** · **"Actual costs"** · **"Not sure yet"** (= tính như
  Mileage rate, Reports nhắc chọn).
- **Mileage rate:** khoản thuộc danh mục "Chi phí chạy xe = Có" **vẫn ghi và phân loại bình thường** nhưng **không cộng vào
  tổng chi / ô thuế / file MTD**; Reports hiện riêng nhóm "Covered by mileage rate · £3,940.20" với ghi chú "Your mileage
  claim already includes fuel, repairs, insurance and road tax. Parking, tolls and congestion charges are added on top."
  Tiền theo dặm cộng vào ô "Car, van and travel expenses" (UK) / "Line 9" (US).
- **Actual costs:** ẩn tiền theo dặm; hiện **tỷ lệ dùng cho công việc** = dặm Work / tổng dặm ("Business use 87% · 30,450 of
  35,000 mi"); các khoản xe cộng đủ (Work) và ghi chú "Your accountant applies the business-use share."
- Đổi cách tính giữa năm → hộp thoại "Change how you claim vehicle costs?" · "HMRC expects you to keep the same method
  for the same vehicle. Check with your accountant." · "Change" / "Cancel".

### 5.4 Mức dặm mặc định (sửa được trong Settings)
UK: **55p/dặm cho 10.000 dặm đầu, 25p sau đó** từ 6/4/2026 (45p/25p trước đó; app giữ cả 2 kỳ theo ngày chuyến; bậc 10.000
đếm cộng dồn trong năm thuế; nguồn gov.uk policy paper 17/6/2026). US: $0.725 tới 30/6/2026, $0.76 từ 1/7/2026. Ghi chú luôn
hiện: "Estimate only — not tax advice."

---

## 6. Miễn phí và Pro

| Tính năng | Miễn phí | Pro (thuê bao năm) |
|---|---|---|
| Ghi nhanh, máy tính trong ô số tiền, nhiều ảnh/khoản | Có | Có |
| Ảnh hoá đơn | **20 ảnh / tháng** (đếm lại ngày 1 hằng tháng) | Không giới hạn |
| Phân loại Chủ nhật, sửa/tách/gộp trên thẻ | Có — chip "Most used" | Có — chip **"Suggested"** (học lịch sử, nơi bán, số tiền, OCR) |
| Luật tự phân loại, khoản tự xếp | — | Có |
| Đọc hoá đơn (OCR) | — | Có |
| Khoản lặp lại | — | Có |
| Chuyến Start/Stop tay, thẻ NFC, Personal stop, nhập tay | Có | Có |
| Chuyến tự động (cảm biến, Bluetooth van, cắm sạc), gộp chuyến ca | — | Có |
| Tách Personal segment sau chuyến, sửa giờ chuyến, vuốt Work/Personal | Có | Có |
| Báo khi nghi sót (quên Stop, GPS im, ngày làm không có chuyến) | Có | Có |
| **[Mới]** Phát hiện chuyến bị sót giữa 2 chuyến (Q26) + đối chiếu đồng hồ dặm (Q27) | Có — ước tính chim bay × 1,25 | Có — có mạng thì quãng đường thật (openrouteservice) |
| Nhắc Chủ nhật, nhắc ghi hằng ngày | Có | Có |
| Sao lưu tay + **tự động mỗi đêm** | Có | Có |
| Báo cáo xem trong app (năm, quý, theo ô thuế, dặm) | Có | Có |
| Xuất **"CSV – all entries"** + **"CSV – mileage log"** (dữ liệu thô) | Có | Có |
| Xuất PDF, tổng theo ô thuế, file MTD (CSV + .xlsx), FreeAgent, ZIP ảnh | — | Có |
| Widget, khoá app | Có | Có |

**Giá:** "£24.99 / year" (giá tạm — Phương chỉnh trước khi lên store; US quy theo tỷ giá thực, mockup ghi "$31.99 / year").
Không gói tháng, không trọn đời. **Dùng thử:** 7 ngày, chạy trong app, không cần thẻ, người dùng tự bấm bắt đầu.
**Hết Pro / hết dùng thử:** chuyến tự động tắt (báo ngay, quay về Start/Stop tay) · luật ngừng áp (khoản mới vào hàng chờ) ·
khoản lặp lại ngừng tạo · chip "Suggested" thành "Most used" · ảnh quay về 20/tháng · file Pro khoá. **Không khoá / không xoá
bất kỳ dữ liệu, ảnh, luật nào**; xuất CSV thô luôn mở.

**Chỗ xuất hiện màn Pro (không chặn việc đang làm):** trang onboarding "Free & Pro" (S-01e) · lần đầu chạm tính năng Pro
(S-19 dạng sheet, có "Try Pro free for 7 days") · Settings → "Sunday Sort Pro" · nhãn "PRO" nhỏ cạnh tính năng khoá.

---

## 7. Tính năng (F-xx) và màn hình (S-xx)

> Mỗi màn: mục đích → bố cục trên xuống → nút → trạng thái → lỗi. Chữ trong "…" là chữ hiện trên app.

### F-01 · Onboarding — S-01a…S-01f **[Đổi]**

**S-01a Welcome** — minh hoạ van + mặt trời. "Log it in 10 seconds. Sort it on Sunday." · "A simple money and mileage log
for self-employed drivers. No account. No bank link. Your data stays on your phone." · nút "Get started".

**S-01b Choose your region** — "Where do you file your taxes?" · 2 thẻ có cờ: "United Kingdom" ("£ · Tax year 6 Apr – 5 Apr ·
Self Assessment & MTD") / "United States" ("$ · Calendar year · Schedule C"). Mặc định theo vùng máy; ngoài UK/US không
chọn sẵn, "Continue" mờ. Ghi chú "You can change this later in Settings."

**S-01c How do you claim your vehicle?** **[Mới]** — 3 thẻ chọn 1:
- "Mileage rate" — "55p a mile for the first 10,000 business miles, then 25p. Fuel, repairs and insurance are included."
  (US: "IRS standard rate per mile. Gas, repairs and insurance are included.")
- "Actual costs" — "Claim what you spend on the van, split by business use."
- "Not sure yet" — "We'll use the mileage rate for now. Ask your accountant." (mặc định chọn)
- Link nhỏ "What's the difference?" → sheet giải thích 4 dòng + "Estimate only — not tax advice." · nút "Continue".

**S-01d Your categories** — "Your categories are ready" · "You'll only use these on Sunday. Rename or hide any of them later."
· chip theo vùng chia Income / Expenses · "Looks good".

**S-01e Free & Pro** **[Mới]** (X6 — nói rõ giới hạn ngay lúc cài)
- Tiêu đề "Free forever. Pro when you want it."
- 2 cột gọn: **"Free"** — "Quick logging" · "Sunday sorting" · "Start/stop trips" · "20 receipt photos a month" · "Nightly
  backup" · "Reports in the app" · "Raw CSV export". **"Pro · £24.99/year"** — "Automatic trips" · "Auto-sort rules &
  suggestions" · "Receipt reading" · "Recurring entries" · "Unlimited photos" · "Tax-year PDF, MTD and FreeAgent files".
- Dòng cam kết: "No ads. No account. Your data is never locked or deleted if you stop paying."
- Nút chính "Continue free" · nút phụ chữ "See Pro" (→ S-19). Không bắt đầu dùng thử ở đây.

**S-01f Weekly reminder** — "When do you want to sort your week?" · chọn ngày (mặc định "Sun") + giờ (18:00) · "Turn on
reminder" → xin quyền thông báo · "Not now". Bị từ chối → snackbar "Reminders are off. You can turn them on in Settings."
→ Home rỗng.

### F-02 · Ghi nhanh — S-03 **[Đổi]**

Mở từ: 2 nút lớn Home, FAB "+", widget, phím tắt icon app (long-press: "New expense", "New income", "Start trip").

**S-03 Quick capture** (sheet toàn màn hình, < 300ms, bàn phím số tự bật)
- Hàng trên: "✕" · công tắc **"Expense" | "Income"** · chip ngày giờ "Now" (chạm chọn; đổi hiện "Tue 10 Nov, 13:05").
- Số tiền rất lớn "£0.00", gõ "1250" → "£12.50".
- **Máy tính trong ô số tiền** **[Mới]** (Q20): bàn phím có thêm hàng "+ − × ÷"; gõ "12.50+4.20" hiện biểu thức nhỏ phía trên
  và số lớn "= £16.70"; Save lưu kết quả. Biểu thức lỗi → số lớn mờ + chữ "Check the sum".
- Hàng 3 nút tròn 56dp:
  - "Photo" → camera ngay. **Nhiều ảnh** **[Mới]** (Q21): chụp xong quay lại sheet, hiện ảnh nhỏ 56dp có ✕; nút "Photo"
    thành "+ Photo" cho tới **3 ảnh**/lần ghi. Giữ lâu → chọn từ thư viện (chọn được nhiều).
  - "Work" / "Personal" (chip bật tắt, mặc định theo Settings).
  - "Note" → ô 1 dòng "Add a note (e.g. Shell, M62)", ≤ 120 ký tự.
- Chip ghi chú hay dùng cuộn ngang (5 cái).
- **Đọc hoá đơn [Pro]** **[Mới]** (Q7, P1-12): sau khi chụp, chip nhỏ "Reading receipt…" (≤ 2 giây, không chặn gõ).
  - Ô số tiền còn 0 → tự điền số tiền, ghi chú = tên nơi bán, ngày giờ = ngày trên hoá đơn; các ô vừa điền có nền vàng
    nhạt + nhãn "From receipt" (chạm vào ô thì nhãn mất).
  - Đã gõ số khác → chip "Receipt says £72.40 · Use".
  - Không đọc được → không hiện gì thêm. Bản free: không đọc, không nhắc bán hàng ở đây.
- **Bộ đếm ảnh (bản free)** **[Mới]**: dưới hàng nút, chữ nhỏ "14 of 20 free photos left this month". Còn ≤ 3 → màu cam.
  Hết lượt → nút "Photo" có ổ khoá nhỏ; chạm → sheet "You've used this month's 20 free photos" · "Your entry still saves.
  Photos reset on 1 Dec, or go Pro for unlimited." · "Try Pro free for 7 days" / "Save without photo".
- Nút "Save" ở đáy ngay trên bàn phím (mờ khi số tiền = 0). Dưới: "No category needed — you'll sort it on Sunday."
- Lưu xong: sheet đóng, snackbar "Saved · £12.50 expense" + "Undo" (5 giây), rung nhẹ. Tuỳ chọn "Keep adding".
- Khoản khớp **luật [Pro]** → snackbar "Saved · Fuel (auto-sorted)" + "Undo".
- Lỗi: số > 999,999.99 → không nhận thêm số; camera bị từ chối → "Camera access is off" · "Sunday Sort needs the camera to
  photograph receipts." · "Open settings" / "Not now"; bộ nhớ đầy → "Couldn't save the photo. Your entry was saved without it."
- Huỷ khi đã gõ số → "Discard this entry?" · "Discard" / "Keep editing".

### F-03 · Home — S-02 **[Đổi]**

Bố cục trên xuống:
1. Header: "Morning, driver" · "Tax year 2026/27" · huy hiệu "PRO" / "Trial · 5 days left" (nếu có) · bánh răng.
2. **Thẻ cảnh báo** (tối đa 1 thẻ, ưu tiên theo thứ tự; mỗi thẻ có ✕ ẩn 7 ngày trừ thẻ đầu):
   - "Your trip stopped recording at 14:05" · "Saved 86.2 mi up to that point." · "Add missing miles" / "OK".
   - **[Mới]** "Automatic trips were paused by your phone" · "Samsung battery saving stopped Sunday Sort. Fix it in 1 minute."
     · "Fix now" (→ S-07f) / "Later".
   - **[Mới]** "No trips on Tue or Wed" · "You logged entries but no miles. Forgot to start a trip?" · "Add miles" / "Not driving".
   - **[Mới] (Q26)** "2 possible missing trips this week" · "≈ 14 mi between your trips wasn't recorded." · "Review" (→ Miles,
     cuộn tới dòng "Missing trip?") / "Later".
   - **[Mới] (Q27)** "114 mi not logged" · "Odometer +520 mi since 1 Oct · App 406 mi." · "Add missing miles" (→ S-08) /
     "That's fine". Thừa: "The app logged more than your odometer" · "Check for trips you didn't drive." · "Review trips".
     Đến hạn nhập: "Time for an odometer check" · "Takes 10 seconds." · "Enter reading" (→ S-08b) / "Later".
   - **[Mới]** "Backups are failing" · "We couldn't write to your backup folder 3 nights in a row." · "Check backup".
   - **[Mới]** "Pro renews on 6 Apr for £24.99" · "Cancel anytime before then in Google Play." · "Manage subscription" / "OK".
   - Banner sao lưu cũ: chỉ khi chưa bật sao lưu tự động và > 30 ngày chưa sao lưu: "Last backup 34 days ago" · "Turn on
     nightly backup" / "Back up now".
3. Thẻ **"This week"** (T2 → CN): "In £1,240.00" · "Out £186.40" · "Net £1,053.60" · "Business miles 612". Chạm → Reports.
4. Thẻ **"To sort"** (vàng nhạt): "14 to sort · 2 trips" + "Sunday's job — about 3 minutes" + "Sort now". **[Mới]** dòng phụ
   "9 auto-sorted this week" (Pro). Khi 0: "All sorted ✓".
5. **Thẻ chuyến đi** **[Đổi]**:
   - Tự động bật, đang chờ: chấm xanh dịu + "Automatic trips on" · "Starts when you drive" · nút chữ "Start now".
   - Tự động tắt / bản free: nút viền "Start trip" + "Tap your NFC tag or start here." (dòng NFC chỉ khi đã có thẻ).
   - Đang chạy: "Trip running · 42.3 mi · 2h 14m" chấm đỏ nhấp nháy · nhãn nhỏ "Auto" nếu tự bắt đầu · "Personal stop" ·
     "End trip".
   - Đang tạm dừng: "Paused for personal stop" · "Resume" · "End trip".
   - Tự động bị hệ thống chặn: chấm cam "Automatic trips paused" · "Fix".
6. **2 nút lớn** nửa dưới (cao 72dp): **"− Expense"** · **"+ Income"**.
7. "Recent" — 5 khoản gần nhất (icon, ghi chú, giờ, số tiền, chấm vàng nếu Unsorted, kẹp giấy nếu có ảnh, nhãn nhỏ
   "Recurring" / "Auto" nếu có) · "See all".
- Rỗng: minh hoạ + "Your first entry takes 10 seconds." + mũi tên chỉ 2 nút.

### F-04 · Sổ (Entries) — S-04

- Thanh tìm "Search notes or amounts" · chip lọc "All" · "Unsorted" · "Income" · "Expenses" · "Work" · "Personal" ·
  "With receipt" · **"Recurring"** **[Mới]** · **"Auto-sorted"** **[Mới]** · "Date ▾" · "Category ▾".
- Nhóm theo ngày, tổng ngày bên phải. Dòng: icon danh mục (hoặc "?" vàng) · ghi chú · "Fuel · Work · 07:42" · số tiền ·
  kẹp giấy (kèm "×2" nếu nhiều ảnh) · nhãn "Personal" / "Recurring" / "Auto".
- Chạm → S-05. Giữ lâu → chọn nhiều: "3 selected" + "Merge", "Set category", "Work/Personal", "Delete".
- Vuốt trái → "Delete"; vuốt phải → đảo Work/Personal. Có Undo.
- Rỗng: "No entries yet" + "Add your first entry"; lọc rỗng: "Nothing matches these filters" + "Clear filters".

### F-05 · Chi tiết & sửa khoản — S-05

- Header "✕" · "Expense"/"Income" · "⋯" (Split, Duplicate, **"Make recurring" [Pro][Mới]**, Delete).
- Số tiền lớn (có máy tính như S-03) · công tắc loại · "Date & time" · "Note" · "Category" (có "Unsorted") · "Work / Personal"
  · "Receipts" (lưới ảnh, "+ Add photo"; chạm → xem toàn màn hình, zoom, "Delete photo").
- **[Mới]** Nếu có OCR: dòng nhỏ "Read from receipt: £72.40 · Shell · 9 Nov" (để đối chiếu).
- **[Mới]** Nếu tự xếp: "Sorted by rule 'Shell → Fuel'" · link "Edit rule". Nếu từ khoản lặp lại: "Created by recurring
  'Van lease'" · "Edit recurring".
- Nếu từ tách: "Split from £60.00 on 9 Nov". "Save changes" chỉ sáng khi có đổi; thoát chưa lưu → "Discard changes?".
- Xoá → "Delete this entry?" · "This also deletes its receipt photos." → snackbar "Entry deleted" + "Undo".

### F-06 · Phân loại tuần (Sort) — S-06, S-06a, S-06c, S-06d **[Đổi lớn]** (Q5: sửa / tách / gộp ngay trên thẻ)

**S-06 Sort** (tab "Sort")
- Header "Sort your week" · bộ chọn tuần "This week · 9–15 Nov ▾" (mỗi tuần kèm "3 left") · nút "List view".
- Thanh tiến độ vàng "9 of 14 sorted".
- **[Mới]** Dòng "9 auto-sorted · Review" (Pro) → S-06d.
- **Thẻ khoản tiền** (thẻ lớn giữa, các thẻ sau xếp chồng mờ):
  - Số tiền lớn + loại · ghi chú · ngày giờ · ảnh nhỏ (chạm phóng to; nhiều ảnh: "1/2").
  - Hàng chip: **Pro** "Suggested" + ≤ 3 chip (chip đầu viền vàng) · **Free** "Most used" + 3 chip dùng nhiều nhất · chip
    "More…" mở toàn bộ danh mục.
  - Công tắc "Work" / "Personal".
  - Hàng nút nhỏ: **"Edit"** · **"Split"** · **"Merge"** · "Skip".
  - **Chạm chip danh mục = xong** → thẻ trượt đi (200ms), thẻ sau lên, snackbar "Sorted as Fuel" + "Undo".
  - **Edit tại chỗ** **[Mới]**: thẻ mở rộng ngay tại chỗ thành form gọn: số tiền (có máy tính) · ghi chú · ngày · nút "Done".
    Không rời màn Sort.
  - **Split tại chỗ** **[Mới]**: thẻ mở rộng thành các dòng phần: số tiền · chip danh mục · Work/Personal; mặc định 2 phần chia
    đôi; "+ Add part" (≤ 10); thanh "Left to assign £0.00" (xanh khi 0; cam "£5.00 left"/"£5.00 over"); nút "Split & sort"
    chỉ sáng khi đủ. Phần có danh mục → xong luôn; phần chưa có quay lại hàng chờ. Ảnh gắn với mọi phần. Ví dụ "Tesco
    £60.00" → "Fuel £45.00 · Work" + "Groceries £15.00 · Personal".
  - **Merge tại chỗ** **[Mới]**: sheet nửa màn "Merge with…" liệt kê khoản cùng loại trong ±1 ngày (tick chọn) → xem trước
    "Merge 3 entries into one £27.40 expense?" → thẻ mới thay thế, vẫn ở hàng chờ. Có Undo.
- **Thẻ chuyến** **[Mới]** (P1-2: chuyến tự động chưa chắc Work/Personal): phác hoạ đường nhỏ · "Tue 10 Nov · 12:20–17:05 ·
  51.8 mi" · "Leeds → Wakefield area" (vùng gần đúng, không địa chỉ) · nút lớn **"Work"** · **"Personal"** · nút nhỏ
  "Split trip" (→ S-07c). Chạm "Work"/"Personal" = xong.
- **Đề nghị luật [Pro]** **[Mới]** (P1-10): sau lần thứ 3 liền xếp cùng nơi bán vào cùng danh mục → thẻ nhỏ chen vào hàng
  chờ: "Always sort 'DPD' as Delivery income?" · "Future DPD entries will skip the queue. You can review or undo them." ·
  "Always" / "Not now". "Not now" → không hỏi lại nơi bán đó trong 30 ngày.
- Rỗng: "Nothing to sort" · "Entries and trips you log during the week will wait here for Sunday."

**S-06a List view** — mỗi dòng: tóm tắt + chip gợi ý tốt nhất (Pro) / chip "Choose" (free) + "✓"; chuyến có 2 nút "W" / "P";
nút đáy "Accept all suggestions (12)" (Pro; hỏi "Apply suggested categories to 12 entries?").

**S-06c Week sorted (Done)** — mặt trời + "Week sorted ✓" · "In £1,240.00 · Out £186.40 · 612 business miles" ·
**[Mới]** "9 auto-sorted · 2 recurring entries added" · thẻ sao lưu (nếu chưa bật tự động) · "Done".

**S-06d Auto-sorted review** **[Mới] [Pro]** — danh sách khoản tự xếp tuần này, nhóm theo luật / khoản lặp lại: "Shell → Fuel ·
4 entries". Mỗi dòng chạm chip đổi danh mục được; nút "Undo all from this rule" · link "Edit rule".

### F-07 · Gợi ý danh mục & luật (logic) **[Đổi]**

- **Free "Most used":** 3 danh mục dùng nhiều nhất của loại đó trong 90 ngày.
- **Pro "Suggested":** điểm theo (1) lịch sử ghi chú cùng từ khoá (cao nhất, gần đây nặng hơn), (2) **nơi bán / số tiền / ngày
  từ OCR**, (3) **số tiền là tín hiệu riêng**: cùng số tiền ±2% với khoản đã xếp gần đây dù ghi chú khác, (4) bộ từ khoá sẵn
  theo vùng, (5) loại. Cũng gợi ý Work/Personal. Mục tiêu sau 4 tuần ≥ 70% chip đầu đúng.
- **Luật (Rule):** khớp theo nơi bán (từ ghi chú hoặc OCR, không phân biệt hoa thường) + loại, tuỳ chọn khoảng số tiền. Áp
  ngay lúc lưu khoản; khoản tự xếp có nhãn "Auto".
- **Chuyến chắc chắn** (P1-2): Work nếu nối Bluetooth van, hoặc ≥ 70% quãng đường trùng tuyến đã xếp Work ≥ 3 lần, hoặc trong
  giờ làm (nếu bật); Personal nếu ngoài giờ làm (nếu bật) hoặc trùng tuyến Personal quen; còn lại Unsorted.

### F-08 · Danh mục — S-11

- Hai mục Income / Expenses; dòng: icon màu · tên · ô thuế (chữ nhỏ xám "SA103: Car, van and travel expenses") · **UK
  [Mới]:** "MTD: Car, van and travel expenses" · tay nắm kéo.
- Sheet sửa: "Name" · "Icon & colour" · "Tax form line" · **[Mới]** "MTD category" (UK) · **[Mới]** "Vehicle running cost"
  (công tắc, chú thích "Covered by the mileage rate") · "Hide category".
- "+ Add category"; danh mục đã dùng chỉ ẩn được ("Hidden categories keep their past entries."). Lỗi tên trống / trùng như bản 1.

### F-09 · Luật — S-18 **[Mới] [Pro]**

- Settings → "Auto-sort rules". Danh sách: "Shell → Fuel · Work · 23 entries" · công tắc bật/tắt từng luật.
- Chạm → sheet: "When the note or receipt says" (ô chữ, vd "Shell") · "Entry type" (Expense/Income) · "Amount between"
  (tuỳ chọn) · "Sort as" (danh mục) · "Work / Personal" · "Delete rule".
- "+ Add rule". Rỗng: "No rules yet" · "When you sort the same place the same way 3 times, we'll offer to make a rule."
- Bản free: danh sách vẫn xem được, công tắc mờ + nhãn "PRO".

### F-10 · Khoản lặp lại — S-17 **[Mới] [Pro]** (P1-9)

- Settings → "Recurring entries" (và "⋯ → Make recurring" ở S-05).
- Danh sách: "Van lease · £289.00 · Monthly on the 1st · Next 1 Dec" · "EE phone · £15.00 · Monthly on the 14th".
- Sheet sửa: số tiền · loại · ghi chú · danh mục · Work/Personal · "Repeats" (Weekly · Every 4 weeks · Monthly · Yearly) ·
  "On" (ngày) · "Starts" · "Ends" (Never / ngày) · "Pause" · "Delete".
- Đúng hạn: tự tạo khoản **đã phân loại**, nhãn "Recurring", không vào hàng chờ, không thông báo. Sửa/xoá từng khoản như
  thường; sửa mẫu không đổi khoản cũ.

### F-11 · Quãng đường nhập tay — S-08

"Add trip" · công tắc "Odometer" | "Distance" · "Start reading"/"End reading" → "= 128 mi" hoặc "Miles" · "Date" · "Work /
Personal" · "Purpose" ("e.g. Amazon route DLS4") · "Save trip". Lỗi: End < Start → "End reading must be higher than start";
> 1.000 dặm → "That's a long trip — 1,240 mi. Save anyway?".
**[Mới]** Mở từ "Missing trip?" (Q26): điền sẵn ngày, giờ (từ lúc chuyến trước dừng → lúc chuyến sau bắt đầu), "Distance"
≈ số dặm ước tính, scope Unsorted, dòng phụ "Estimated from the gap between two trips" → lưu `source = gap`. Mở từ đối chiếu
đồng hồ (Q27): "Distance" = số dặm thiếu, ngày = ngày nhập đồng hồ, scope Unsorted, dòng phụ "Missing from odometer check".

**S-08b Odometer check** **[Mới]** (Q27, miễn phí; sheet, dùng lại ô số + nút ảnh của S-03/S-08 — không cần mockup mới)
- "Odometer reading" (số, bàn phím số) · "Add photo" (tuỳ chọn, **không** tính vào 20 ảnh/tháng) · "Save".
- Lần đầu: "Starting point saved. We'll compare next time." Từ lần 2: so mức tăng đồng hồ với tổng dặm app ghi (Work +
  Personal + Unsorted, mọi nguồn) giữa 2 lần nhập; lệch ≥ **max(10 mi, 5%)** → kết quả trên sheet + thẻ Home (F-03);
  khớp → "Matches your trips ✓ (406 mi)".
- Lỗi: nhỏ hơn lần trước → "That's lower than your last reading (48,210)." · "Save anyway" (đổi xe / thay đồng hồ → mốc mới).
- Nhắc: Settings → Trips → "Odometer check" Off / Weekly (thứ Hai) / **Monthly (ngày 1, mặc định)**; UK nhắc thêm 6/4.
  Thông báo im lặng "Odometer check" · "Enter your reading to catch missed miles." + thẻ Home.

### F-12 · Chuyến GPS: tay, NFC và tự động — S-07a…S-07g **[Đổi lớn]**

**Bắt đầu / dừng tay (miễn phí):** "Start trip" ở Home, Miles, widget, phím tắt, **thẻ NFC**. Đang ghi: thông báo cố định
"Trip running · 42.3 mi" + "Personal stop" / "End trip" (Android thêm thông báo dịch vụ GPS bắt buộc).

**Chuyến tự động [Pro]** (Q1, Q9, P1-1):
- Điện thoại nhận ra đang **lái xe** (cảm biến chuyển động + nhận diện hoạt động; phân biệt đi bộ, xe đạp) → tự bắt đầu,
  điểm đầu lấy lùi về lúc xe bắt đầu chạy (không hụt dặm đầu). Tín hiệu thêm (Android): **nối Bluetooth van** (chọn thiết bị
  1 lần) hoặc **cắm sạc** + đang chuyển động → bắt đầu ngay. iOS: chỉ cảm biến + vị trí thay đổi đáng kể.
- Đang chạy giống chuyến tay, nhãn "Auto". Khi tự bắt đầu, thông báo cố định ghi "Trip started automatically" · "Not driving
  for work? Tap to mark as personal." (không thêm thông báo riêng).
- **Dừng ngắn < 20 phút** (đi bộ giao hàng, đèn đỏ, chờ kho; Settings đổi 10/20/45) → vẫn cùng một **chuyến ca**; ngắt
  Bluetooth không dừng chuyến.
- **Kết thúc:** không lái xe liên tục ≥ 20 phút → chuyến đóng, **giờ kết thúc = lúc xe dừng thật**. Thông báo im lặng:
  "Trip saved · 42.3 mi · Work" hoặc "· Sort on Sunday".
- **Giờ làm** (P1-3, mặc định tắt): bật thì chuyến ngoài giờ vẫn ghi nhưng gắn Personal.
- Người dùng bấm Start khi tự động đang bật → chuyến tay, tự động không chen.

**Báo khi nghi sót (miễn phí, Q2):**
- Chuyến tay chạy mà xe đứng yên ≥ 45 phút → thông báo "Still on a trip?" · "You haven't moved for 45 minutes." · "End trip"
  (giờ kết thúc lùi về lúc dừng) / "Keep going". Giữ nhắc 12 giờ của bản 1.
- Đang ghi mà không có vị trí ≥ 10 phút trong khi điện thoại vẫn di chuyển → thông báo "Trip isn't recording" · "Your phone
  stopped sending location. Open Sunday Sort to fix it."
- Hệ thống chặn dò tự động (Samsung tối ưu pin, thu quyền) → thông báo + thẻ Home "Automatic trips were paused by your phone".
- ≥ 2 ngày có ghi khoản tiền mà không có chuyến (hoặc ngày làm theo giờ làm) → **chỉ thẻ trên Home**, không thông báo đẩy.
- App tự dừng ghi (pin, quyền) → lần mở sau: thẻ "Your trip stopped recording at 14:05" (như bản 1).
- **[Mới] Missing trip (Q26):** 2 chuyến liền nhau có toạ độ (gps/auto/nfc; chuyến nhập tay bỏ qua), trong 30 ngày gần nhất,
  điểm cuối chuyến trước → điểm đầu chuyến sau **≥ 1 mi** chim bay → khoảng trống. Ước tính **chim bay × 1,25**; Pro + có
  mạng → quãng đường thật qua openrouteservice (hàm A→B). Hiện dòng ở Miles (F-13) + thẻ Home (F-03); không thông báo đẩy.
  "Not a trip" → nhớ cặp chuyến đó, không hiện lại.
- **[Mới] Odometer check (Q27):** nhập số đồng hồ định kỳ (S-08b) → lệch với tổng dặm app ghi ≥ max(10 mi, 5%) → thẻ Home.

**S-07a Location permission explainer** (2 bước): "Track business miles with GPS" · "Sunday Sort records your route only while
a trip is running." · "Location stays on your phone." · "Allow location" / "Not now"; bước 2 Android "To keep recording with the
screen off, choose 'Allow all the time'." · "Open settings".

**S-07b Active trip** — số dặm rất lớn · thời gian · phác hoạ đường (không bản đồ nền) · "GPS good"/"Weak GPS signal" ·
nhãn "Auto" nếu có · "Personal stop" · "End trip". End → sheet "Trip saved · 128.4 mi" · "Work / Personal" · "Purpose" ·
"Save" / "Discard trip" (hỏi lại).

**S-07c Trip detail** **[Mới]** (chạm chuyến ở Miles / "Split trip" ở Sort)
- Phác hoạ đường dài hơn, **điểm dừng** là chấm tròn đánh số; chặng Personal tô xám tím.
- "Tue 10 Nov · 07:02 → 11:48 · 42.3 mi · Auto" · nhãn "Edited" nếu đã sửa.
- **Tách Personal segment** (Q6): chạm một điểm dừng → sheet "Stop at 09:40 · 12 min" · "Mark the drive to this stop as
  personal" / "Mark the drive from this stop as personal" / "Split the trip here". Chặng đổi màu ngay, dặm cập nhật
  "Work 38.1 mi · Personal 4.2 mi" · Undo.
- **Sửa giờ và dặm** (Q19): "Start 07:02 ✎" · "End 11:48 ✎" · "Miles 42.3 ✎" → chỉnh bằng bộ chọn; lưu xong nhãn "Edited"
  (hiện cả trong sổ, báo cáo, CSV); dòng nhỏ "Recorded: 07:02–11:48 · 42.3 mi" giữ số gốc.
- "Work / Personal" · "Purpose" · "Delete trip" (hỏi lại, có Undo).

**S-07d Automatic trips** **[Mới] [Pro]** (Miles → "⋯ → Automatic trips" hoặc Settings)
- Công tắc lớn "Record trips automatically". Bản free / hết Pro: công tắc khoá + "PRO" → S-19.
- Bật lần đầu → chuỗi quyền S-07e.
- Mục "Start faster" (Android): "Van Bluetooth" (chọn thiết bị đã ghép, vd "Ford Transit Audio") · "Start when charging"
  (công tắc). iOS: ghi chú "iPhone starts trips from motion. Add an NFC tag for instant start."
- "Merge stops shorter than" — "10 min" · "20 min" (mặc định) · "45 min" + "Deliveries and red lights stay in one trip."
- "Work hours" (công tắc, mặc định tắt) → ngày + giờ; "Trips outside these hours are still recorded, as personal."
- Trạng thái: "Working · last check 2 min ago" (xanh) / "Paused by battery saving · Fix" (cam).
- Link "Battery tips for Samsung" → S-07f.

**S-07e Automatic trips setup** **[Mới]** — 4 bước có minh hoạ, mỗi bước 1 nút:
1. "Recognise driving" → quyền nhận diện hoạt động ("Physical activity" Android / "Motion & Fitness" iOS).
2. "Location all the time" → "Only used while you're driving."
3. "Notifications" → "So you always know when a trip starts or stops."
4. Android: "Don't let your phone pause trips" → mở cài đặt pin, chọn "Unrestricted".
Bỏ qua bước nào → trạng thái cam "Automatic trips may miss drives" + "Finish setup".

**S-07f Battery tips** **[Mới]** — hướng dẫn theo hãng (Samsung: "Settings → Apps → Sunday Sort → Battery → Unrestricted" +
"Never sleeping apps"), "Open battery settings", "I've done it".

**S-07g NFC tag** **[Mới]** (Q18, miễn phí; Miles → "⋯ → NFC tag" hoặc Settings)
- Minh hoạ thẻ dán táp-lô. "Tap your phone on a sticker to start or end a trip — no screen needed."
- Android: "Write a tag" → "Hold an NFC sticker to the back of your phone" → "Tag ready ✓". Chạm thẻ: chưa có chuyến → bắt
  đầu; đang chạy → kết thúc (rung + thông báo "Trip started" / "Trip saved · 42.3 mi").
- iOS: hướng dẫn 4 bước tạo Automation trong app Phím tắt ("When NFC tag is scanned → Open URL sundaysort://trip/toggle")
  + "Copy link".
- Máy không có NFC → "This phone doesn't support NFC tags."

### F-13 · Tab Miles — S-07 **[Đổi]**

- Header "Miles · Tax year 2026/27 ▾" · "⋯" (Automatic trips, NFC tag).
- Thẻ tổng: "Business 8,412 mi" · "Personal 1,032 mi" · (Mileage rate) "≈ £4,626.60 at HMRC rates (55p / 25p)"; **[Mới]**
  khi vượt 10.000 dặm: thanh tiến độ "10,000 mi at 55p reached on 14 Aug · now 25p"; (Actual costs) "Business use 89%".
  + "Estimate only — not tax advice."
- Thẻ trạng thái tự động (như Home mục 5) · thẻ chuyến đang chạy.
- 2 nút: "Start trip" · "Add manually".
- Danh sách theo tháng: "Tue 10 Nov · 07:02–11:48 · 42.3 mi · Auto · Work" + nhãn "Unsorted" vàng / "Edited" / "GPS" /
  "Manual" / "NFC". **Vuốt phải = Work, vuốt trái = Personal** **[Mới]**, nền xanh dương / xám tím, snackbar "Marked as
  personal" + "Undo". Chạm → S-07c.
- **[Mới] (Q26)** Dòng nét đứt giữa 2 chuyến: "Missing trip? ≈ 6.2 mi · Depot → Tesco Extra" · "Add" (→ S-08 điền sẵn) /
  "Not a trip". Chuyến đã thêm từ khoảng trống mang nhãn "Estimated".
- **[Mới] (Q27)** Dòng mốc (không vuốt): "Odometer 48,210 · 1 Nov" + "✓ matches" hoặc "114 mi not logged". "⋯" thêm
  "Odometer check" → S-08b.
- Rỗng: "No trips yet" · "Start a trip, turn on automatic trips, or add miles from your odometer."

### F-14 · Báo cáo — S-09 **[Đổi]**

- Bộ chọn kỳ "Tax year 2026/27 ▾" + chip "Year" · "Q1" · "Q2" · "Q3" · "Q4" · "Custom". **[Mới] UK:** "MTD periods: Standard |
  Calendar" (Standard 6 Apr–5 Jul…; Calendar 1 Apr–30 Jun…) và công tắc "Year to date" (cộng dồn từ đầu năm như cập nhật quý
  MTD).
- Cảnh báo chưa phân loại: "7 entries and 2 trips in this period aren't sorted yet" + "Sort now".
- Thẻ tổng: "Income £18,240.00" · "Expenses £4,812.55" · "Profit £13,427.45" (chỉ Work; "Personal entries are excluded
  (£612.30)"). **[Mới]** "Using the mileage rate · Change" / "Using actual costs · Change"; khi "Not sure yet": thẻ cam
  "Choose how you claim your vehicle" · "Mileage rate" / "Actual costs".
- Cột ngang theo danh mục chi; **[Mới]** nhóm riêng "Covered by mileage rate · £3,940.20" (mờ, không cộng) khi Mileage rate.
- Bảng "By tax form line" (SA103 / Schedule C); **[Mới] UK** tab "SA103 | MTD categories".
- Thẻ "Mileage" (dặm + tiền ước tính hoặc tỷ lệ dùng cho công việc) · biểu đồ "Income vs expenses by month".
- Nút đáy "Export" → S-10. Rỗng: "No data for this period".

### F-15 · Xuất file — S-10 **[Đổi]**

**S-10 Export** (sheet)
- "Period" (theo Reports, đổi được; UK có Standard/Calendar).
- **Miễn phí:** "CSV – all entries" (date, type, amount, currency, category, tax_line, mtd_category, work_personal, note,
  receipts, source, auto_sorted, recurring, entry_id) · "CSV – mileage log" (date, start, end, miles, work_personal, purpose,
  source GPS/auto/manual/NFC/gap, edited, estimated, original_miles).
- **Pro** (thẻ có nhãn "PRO"; bản free chạm → S-19):
  - "PDF report" (tổng + ô thuế + MTD category + theo tháng + nhật ký dặm + danh sách khoản; ghi cách tính xe; footer
    "Generated by Sunday Sort · Not tax advice").
  - "CSV – totals by tax form line".
  - **"MTD summary (CSV)"** — UK: tổng theo 15 HMRC category + cột Disallowable (= 0), **cộng dồn từ đầu năm tới hết kỳ
    chọn**, kỳ Standard/Calendar; dòng đầu ghi kỳ.
  - **"MTD records (CSV)"** — từng khoản theo cột MTDsorted: Date · Description · Merchant / customer name · Amount ·
    Disallowable amount · Income tax category.
  - **"MTD spreadsheet (.xlsx)"** — đúng mẫu MTDsorted (sheet Income, Expenses, Summary tự cộng).
  - **"FreeAgent (CSV)"** — 2 file Expenses + Mileage; lần đầu hỏi "Your name in FreeAgent" (lưu lại; "Must match your
    FreeAgent user name exactly"); van ghi là "Car".
  - "Receipt photos (ZIP)".
- Công tắc "Include personal entries" (mặc định tắt).
- **Khoản Unsorted trước khi xuất MTD** **[Mới]** (Q3): "7 entries in Q2 have no category" · "MTD needs a category for every
  record." · "Sort now" (chính) / "Leave them out" (khoản đó không vào file, ghi rõ số trong file tóm tắt). File không MTD:
  "Export anyway" như bản 1.
- Ghi chú UK: "Sunday Sort isn't MTD software. Import these files into your bridging software or FreeAgent, or send them to
  your accountant."
- "Export" → "Preparing your files…" → share sheet. Lỗi: "Couldn't create the file. Free up some storage and try again."

### F-16 · Sao lưu & khôi phục — S-12 **[Đổi]**

- Thẻ trạng thái: "Nightly backup on · Last: tonight 02:10 · Google Drive / Sunday Sort" (xanh) / "Never backed up" (cam) /
  "Last 3 backups failed" (cam).
- **[Mới] Sao lưu tự động** (miễn phí, Q10, P1-7): "Choose backup folder" → trình chọn thư mục hệ thống (Google Drive / iCloud
  Drive / thư mục máy) → công tắc "Back up every night" (bật sẵn sau khi chọn). Mỗi đêm có thay đổi → ghi 1 file, giữ
  **7 bản mới nhất** ("Keeps your last 7 backups"). Không ghi được → thử lại đêm sau; 3 lần liền → thẻ Home. Nếu không ghi
  ngầm được (P3 thử) → thông báo sáng "Tap to finish last night's backup".
- "Back up now" (share sheet như bản 1) · "Restore from backup" → chọn file (hoặc từ thư mục sao lưu: danh sách 7 bản
  "Tue 10 Nov · 1,204 entries · 318 photos") → "Replace everything on this phone with this backup?" · "This can't be undone."
- "Remind me to back up every 30 days" chỉ hiện khi tắt sao lưu tự động.
- Lỗi như bản 1 + "We can't reach your backup folder. Choose it again."

### F-17 · Thông báo **[Đổi]** — S-20 Notifications **[Mới]**

| Thông báo | Mặc định | Nội dung |
|---|---|---|
| Nhắc Chủ nhật | Bật, Sun 18:00, chỉ khi có Unsorted | "14 to sort · About 3 minutes. Tap to sort your week." |
| Nhắc ghi hằng ngày **[Mới]** (Q22) | **Tắt**; 19:00, ngày theo giờ làm hoặc T2–T7 | "Nothing logged today · Any fuel, parking or payouts to add?" — chỉ khi hôm đó chưa ghi khoản nào |
| Chuyến đang chạy / tự bắt đầu / đã lưu | Bật (Android bắt buộc khi đang ghi) | xem F-12 |
| Báo nghi sót (quên Stop, GPS im, bị chặn) | Bật | xem F-12 |
| Gia hạn Pro **[Mới]** | Bật, 7 ngày trước | "Pro renews on 6 Apr for £24.99 · Manage or cancel in Google Play." |
| Sắp hết dùng thử **[Mới]** | Bật, ngày 6 | "Your Pro trial ends tomorrow · Automatic trips and rules will pause. Your data stays." |
| Sao lưu cần bấm | Khi cần | "Tap to finish last night's backup" |

Không bao giờ nhắc sau mỗi khoản ghi; không thông báo bán hàng. **S-20** trong Settings: công tắc từng loại + giờ.

### F-18 · Pro, dùng thử, mua — S-19 **[Mới]**

**S-19 Sunday Sort Pro** (toàn trang từ Settings; dạng sheet khi chạm tính năng khoá)
- Tiêu đề "Sunday Sort Pro" · phụ đề theo ngữ cảnh ("Automatic trips are a Pro feature" / "You've used this month's 20 free
  photos" / "Tax-year files are a Pro feature").
- 6 lợi ích có icon (như S-01e).
- Giá lớn "£24.99 / year" · "About 48p a week. Renews yearly — we'll remind you 7 days before."
- Nút chính **"Try Pro free for 7 days"** (chỉ khi chưa dùng thử) · "No card needed. Nothing is charged."
- Nút phụ "Subscribe — £24.99/year" · link "Restore purchase".
- Cam kết: "No ads · Your data is never locked or deleted · Cancel anytime in Google Play / App Store".
- Link "Terms" · "Privacy policy".
- **Đang dùng thử:** "Trial · 5 days left" + thanh tiến độ · "Subscribe now" · "Your trial ends on 20 Nov. Nothing is charged."
- **Đã mua:** "Pro is on ✓" · "Renews 6 Apr 2027 · £24.99" · "Manage subscription" (mở trang store) · "Restore purchase".
- **Hết hạn:** "Pro ended on 6 Apr" · "Automatic trips, rules and Pro files are paused. Everything you recorded is still here."
  · "Renew — £24.99/year".
- Lỗi: "Purchase didn't go through. You haven't been charged." · "Couldn't reach Google Play. Check your connection." ·
  khôi phục không thấy → "No purchase found for this account."

### F-19 · Khoá app — S-13

Như bản 1: "App lock" · "Lock after" (Immediately / After 1 minute / After 5 minutes) · S-13 "Sunday Sort is locked" +
"Unlock". **[Mới]** Thẻ NFC và chuyến tự động vẫn bắt đầu/kết thúc chuyến khi app khoá (không mở nội dung).

### F-20 · Widget — S-14 **[Đổi]**

- Nhỏ (Android 2×1 / iOS nhỏ): "−" · "+" · "14 to sort".
- Vừa (Android 4×2 / iOS vừa): "− Expense" · "+ Income" · "Start trip" (hoặc "End trip · 42.3 mi") + "This week: Net
  £1,053.60 · 14 to sort". **[Mới]** Khi tự động bật: dòng "Auto trips on" (chấm xanh) / "Auto trips paused" (cam).
- Theo theme, nền bo góc, tối theo hệ thống. Vẽ 4 widget trên nền màn hình chính Android + iOS, sáng + tối.

### F-21 · Cài đặt — S-15 **[Đổi]**

- **Sunday Sort Pro** (dòng đầu, thẻ nổi): "Free · See Pro" / "Trial · 5 days left" / "Pro · renews 6 Apr".
- **Region & tax:** "Region" (đổi → hỏi + quy đổi tỷ giá như bản 1) · "Currency" · "Tax year" · **"Vehicle costs"**
  **[Mới]** (Mileage rate / Actual costs / Not sure yet) · "Mileage rates" (sửa từng kỳ, "Reset to default"; UK hiện kỳ
  "From 6 Apr 2026: 55p / 25p").
- **Logging:** "Default for new entries" · "Keep adding after save" · "Distance unit".
- **Trips** **[Mới]:** "Automatic trips" → S-07d · "NFC tag" → S-07g · "Work hours" · "Odometer check" (Off / Weekly /
  Monthly, mặc định Monthly — Q27).
- **Sorting** **[Mới]:** "Auto-sort rules" → S-18 · "Recurring entries" → S-17 · "Categories" → S-11.
- **Notifications** → S-20.
- **Security:** "App lock" · "Lock after".
- **Your data:** "Backup & restore" → S-12 · "Export" → S-10 · "Delete all data" (hỏi 2 lần, gõ "DELETE").
- **Appearance:** "Theme".
- **About:** "How Sunday Sort works" · "Privacy policy" · "Not tax advice" (S-16) · "Rate the app" · "Contact" · "Version 2.0.0".

### F-22 · Thông tin & miễn trừ — S-16

Như bản 1, thêm câu: "Sunday Sort isn't MTD software and doesn't send anything to HMRC or the IRS."

---

## 8. Dữ liệu (cho phần code — Claude Design không cần vẽ)

- **Entry**: + `source` (manual/recurring), `auto_sorted_by` (rule_id | recurring_id | null), `ocr_amount_minor`,
  `ocr_merchant`, `ocr_date` (tuỳ chọn).
- **Receipt**: nhiều ảnh / khoản (đã có), + `ocr_text` (tuỳ chọn, xoá được).
- **Category**: + `mtd_category` (UK), `vehicle_running_cost` (bool).
- **Trip**: + `source` (gps/auto/manual/nfc/**gap**), `edited`, `original_started_at`, `original_ended_at`, `original_distance_m`,
  `scope` cho phép `unsorted`, `classified_by` (bluetooth/route/work_hours/user).
- **TripStop** **[Mới]**: trip_id, started_at, ended_at, lat, lng (để chạm tách đoạn).
- **TripSegment** **[Mới]**: trip_id, from_ts, to_ts, distance_m, scope (Personal segment).
- **Rule** **[Mới]**: id, match_text, type, min_minor, max_minor, category_id, scope, enabled, created_at, hits.
- **RuleOffer** **[Mới]**: merchant_key, declined_until.
- **Recurring** **[Mới]**: id, type, amount_minor, note, category_id, scope, freq, day, starts_on, ends_on, paused, next_on.
- **KnownRoute** **[Mới]**: vùng đầu–cuối đã xếp ≥ 3 lần, scope (cho tự gắn chuyến).
- **OdometerReading** **[Mới, Q27]**: id, read_at, value, photo_uri (tuỳ chọn).
- **TripGapDismissal** **[Mới, Q26]**: prev_trip_id, next_trip_id ("Not a trip"). Khoảng trống tính lúc xem, không lưu.
- **ProState** **[Mới]**: trial_started_at, trial_ends_at, entitlement (none/trial/active/expired), expires_at, product_id,
  last_verified_at.
- **Free photo allowance**: tính từ Receipt theo tháng (không cần bảng).
- **Settings**: + vehicle_cost_method, merge_stop_minutes, work_hours, auto_trips, van_bt_device, start_on_charge,
  backup_folder_uri, backup_nightly, backup_fail_count, daily_nudge (on, time, days), freeagent_claimant, mtd_period
  (standard/calendar), nfc_tag_written, **odometer_check** (off/weekly/monthly, mặc định monthly).
- Tuần = T2 00:00 → CN 23:59 giờ máy. Năm thuế UK: ngày 5/4 thuộc năm cũ. Tiền số nguyên.

---

## 9. Dữ liệu mẫu cho mockup

**UK (Dan, tuần 9–15 Nov 2026, £, Mileage rate, Pro đang dùng thử còn 5 ngày):**
| Ngày giờ | Loại | Số tiền | Ghi chú | Danh mục | Phạm vi | Ảnh | Ghi chú mockup |
|---|---|---|---|---|---|---|---|
| Mon 9 Nov 06:12 | Expense | 72.40 | Shell M62 | Fuel (Auto, luật Shell → Fuel) | Work | 1 | OCR "From receipt" |
| Mon 9 Nov 11:30 | Expense | 4.20 | Greggs | (chưa) | Personal | 0 | |
| Mon 9 Nov 14:05 | Expense | 3.50 | RingGo Leeds | Parking, tolls & congestion | Work | 0 | |
| Tue 10 Nov 18:40 | Income | 620.00 | DPD weekly payout | Delivery income | Work | 0 | |
| Wed 11 Nov 07:01 | Expense | 60.00 | Tesco | (chưa) → tách Fuel 45 + Personal 15 | Work | 2 | thẻ Split tại chỗ |
| Thu 12 Nov 16:22 | Expense | 189.99 | Kwik Fit tyres | (chưa) gợi ý Van repairs & servicing | Work | 1 | |
| Fri 13 Nov 19:00 | Income | 620.00 | DPD weekly payout | (chưa) gợi ý Delivery income | Work | 0 | đề nghị luật |
| Sat 14 Nov 09:15 | Expense | 15.00 | EE phone | Phone & data (Recurring) | Work | 0 | |
| Sun 1 Nov | Expense | 289.00 | Van lease | Van lease / finance (Recurring) | Work | 0 | |

- Chuyến: "Tue 10 Nov · 07:02–11:48 · 42.3 mi · Auto · Work (Bluetooth)" · "Tue 10 Nov · 12:20–17:05 · 51.8 mi · Auto ·
  Unsorted" · "Sat 14 Nov · 10:10–10:42 · 9.6 mi · Auto · Personal (outside work hours)" · "Wed 11 Nov · 128.4 mi · NFC ·
  Work · Edited".
- Tuần: In £1,240.00 · Out £186.40 · 14 to sort · 2 trips · 9 auto-sorted · 612 business miles · ảnh free "14 of 20".
- Năm thuế 2026/27 tới nay: Income £18,240.00 · Expenses £4,812.55 · Covered by mileage rate £3,940.20 · 8,412 business mi ·
  1,032 personal mi · ≈ £4,626.60. Ví dụ vượt 10.000 dặm (Dan cả năm ~35.000 mi): "10,000 mi at 55p reached on 14 Aug".
- Pro: "£24.99 / year" · "Renews 6 Apr 2027" · dùng thử "ends on 20 Nov".

**US (Maria, $, Actual costs, Pro):** "Amazon Flex payout $186.50", "Chevron $58.20", "Toll – Harris County $3.75", "Verizon
$65.00 (Recurring)", "Jiffy Lube $79.99"; năm 2026: Income $41,820.00 · Expenses $9,412.30 · 8,412 mi · "Business use 87%" ·
giá "$31.99 / year".

---

## 10. Danh sách màn cho Claude Design (vẽ lại toàn bộ)

| Mã | Màn | Trạng thái cần vẽ | Sáng/Tối |
|---|---|---|---|
| S-01a–f | Onboarding: Welcome, Region, Vehicle costs (+ sheet giải thích), Categories, Free & Pro, Reminder | — | sáng |
| S-02 | Home | có dữ liệu · rỗng · đang chạy chuyến (Auto) · tự động bật chờ · từng thẻ cảnh báo (5 loại; **[Mới]** + Missing trips, Odometer — dùng thẻ cảnh báo có sẵn, không vẽ thêm) · Trial | sáng + tối |
| S-03 | Quick capture | trống · đã gõ + 2 ảnh + ghi chú · máy tính "12.50+4.20" · OCR tự điền · chip "Receipt says" · hết ảnh free · Income | sáng + tối |
| S-04 | Entries | danh sách (nhãn Auto/Recurring) · chọn nhiều · lọc rỗng | sáng |
| S-05 | Entry detail | thường · có OCR + luật · xem ảnh toàn màn | sáng |
| S-06 | Sort | thẻ khoản (Pro Suggested / Free Most used) · Edit tại chỗ · Split tại chỗ · Merge sheet · thẻ chuyến · đề nghị luật · rỗng | sáng + tối |
| S-06a | Sort List view | Pro + Free | sáng |
| S-06c | Week sorted | có auto-sorted + recurring | sáng |
| S-06d | Auto-sorted review | — | sáng |
| S-07 | Miles | có dữ liệu + thanh 10.000 dặm · vuốt Work/Personal · rỗng · quyền bị từ chối · Actual costs · **[Mới]** dòng "Missing trip?" + dòng mốc đồng hồ (ghép từ dòng chuyến có sẵn, không vẽ thêm) | sáng + tối |
| S-07a | Location explainer (2 bước) | — | sáng |
| S-07b | Active trip + sheet End trip | tay · Auto | sáng + tối |
| S-07c | Trip detail | có điểm dừng · sheet điểm dừng · đoạn Personal · sửa giờ + nhãn Edited | sáng + tối |
| S-07d | Automatic trips | Android · iOS · khoá (free) · trạng thái cam | sáng |
| S-07e | Automatic trips setup (4 bước) | — | sáng |
| S-07f | Battery tips (Samsung) | — | sáng |
| S-07g | NFC tag | Android ghi thẻ · thành công · iOS Phím tắt | sáng |
| S-08 | Add trip (manual) | **[Mới]** điền sẵn từ Missing trip / Odometer | sáng |
| S-08b | Odometer check **[Mới]** | lần đầu · khớp · thiếu dặm · thừa dặm (sheet ghép từ ô số + nút ảnh có sẵn, không vẽ thêm) | sáng |
| S-09 | Reports | năm · quý MTD cộng dồn · Mileage rate (nhóm "Covered") · Actual costs · Not sure · tab MTD categories | sáng + tối |
| S-10 | Export | free (thẻ Pro khoá) · Pro đủ 8 loại · cảnh báo Unsorted MTD · ô tên FreeAgent · đang tạo | sáng |
| S-11 | Categories + sheet sửa | có MTD category + Vehicle running cost | sáng |
| S-12 | Backup & restore | chưa chọn thư mục · sao lưu đêm bật · lỗi 3 lần · khôi phục từ danh sách 7 bản | sáng |
| S-13 | Locked | — | sáng + tối |
| S-14 | Widget Android 2×1, 4×2 + iOS nhỏ, vừa | có dòng Auto trips | sáng + tối |
| S-15 | Settings | free · Pro | sáng |
| S-16 | Not tax advice | — | sáng |
| S-17 | Recurring entries + sheet sửa | — | sáng |
| S-18 | Auto-sort rules + sheet sửa | Pro · free khoá | sáng |
| S-19 | Sunday Sort Pro | chưa dùng thử (sheet theo ngữ cảnh) · đang dùng thử · đã mua · hết hạn · lỗi mua | sáng + tối |
| S-20 | Notifications | — | sáng |
| — | Hộp thoại & snackbar: Discard, Delete + Undo, Merge, Change region, Change vehicle method, Delete all data, lỗi quyền camera/vị trí/hoạt động | | sáng |
| — | Thông báo hệ thống: nhắc Chủ nhật, nhắc ghi hằng ngày, chuyến đang chạy, tự bắt đầu, đã lưu, quên Stop, GPS im, bị chặn, gia hạn, sắp hết dùng thử | Android + iOS | — |

**Bàn giao từ Claude Design:** link dự án + export HTML từng màn + file token (màu, chữ, bo góc, khoảng cách) → bỏ vào
`apps/A006-sundaysort/design/` (bản 1 chuyển vào `design/v1/`).

---

## 11. Ngoài phạm vi (cố ý không làm)

- Không tài khoản, không đồng bộ cloud, không server, không kết nối ngân hàng (sao lưu = file vào thư mục người dùng chọn).
- Không tư vấn khoản nào được trừ thuế, không chọn hộ cách tính xe; không nộp thuế / MTD thay ("not MTD software").
- Không Android Auto / CarPlay (dễ bị store từ chối — Q18).
- Không nhiều xe / nhiều sổ / nhiều doanh nghiệp ở bản 2 (một xe, một cách tính xe).
- Không quảng cáo; không gói tháng, không trọn đời; không thông báo bán hàng; không khoá / xoá dữ liệu khi hết Pro.
- Không bản đồ nền (chỉ phác hoạ đường đi) · không gửi ảnh / dữ liệu OCR ra khỏi máy.
- Chỉ tiếng Anh (i18n dựng sẵn).
