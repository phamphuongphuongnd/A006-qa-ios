# A006-sundaysort — Khảo sát lại (2026-11-13)

> Kết quả khảo sát lại file ý tưởng `Y-tuong-so-thu-chi-tai-xe-van-UK.md` + đánh giá đối thủ + rà code thật.
> Quyết định và kế hoạch làm tiếp: `PLAN-v2.md`.

## 1. Nguồn đã đọc
- Google Play (US, sắp "Most relevant"): **MileIQ 1.000 · Everlance 1.000 · Hurdlr 1.000 · Cash Book (UK) 860** đánh giá.
  Mỗi app: đếm theo chủ đề trên toàn bộ + đọc nguyên văn mọi đánh giá 2023–2026 và mẫu từng nhóm.
- gov.uk (MTD for Income Tax – digital records, ngưỡng), Monzo / FreeAgent (MTD miễn phí), trang các hãng bridging software.
- **Chưa đọc:** 5 luồng Reddit trong file ý tưởng (reddit.com bị chặn với trình duyệt của Claude) → P0 đọc bằng Claude in Chrome.
- **Dùng thử thật 2026-11-16** → §9 (Cash Book trên giả lập; MileIQ, Everlance qua web; Hurdlr chặn ngoài Mỹ/Canada).

## 2. Đối thủ được khen (4–5★) — A006 đã bằng chưa
| Được khen | Ai | A006 |
|---|---|---|
| "Set it and forget it": tự ghi chuyến, không phải nhớ bấm — lời khen số 1 ở cả 3 app dặm | MileIQ, Everlance, Hurdlr | ❌ chỉ bấm tay |
| Tự bắt đầu khi nối Bluetooth xe | Hurdlr, TripLog | ❌ |
| Vuốt trái/phải phân loại chuyến | MileIQ, Everlance | 🟡 vuốt ở Entries, không ở Miles |
| Học tuyến / nơi quen → tự gắn Công việc/Cá nhân | MileIQ, Everlance | ❌ |
| Luật tự gắn danh mục theo nơi bán | Hurdlr | 🟡 gợi ý, vẫn chạm từng khoản |
| Báo cáo sạch gửi kế toán | cả 3 | ✅ |
| Đơn giản, nhanh (Cash Book 300 lời khen) | Cash Book | ✅ |
| Nhiều doanh nghiệp / xe / sổ | Hurdlr, Everlance, Cash Book | ❌ 1 sổ |
| Hỗ trợ chat nhanh trong app | Hurdlr | ❌ chỉ email |

## 3. Đối thủ bị chê (1–3★) — A006 có dính không
| Bị chê (số lời chê / 1.000) | A006 |
|---|---|
| Giá, tăng giá, trừ tiền không báo, khó huỷ (MileIQ 293, Everlance 210, Hurdlr 150) | ✅ không — **phải giữ khi thêm Pro** |
| Quảng cáo dồn dập (lời chê số 1 Cash Book) | ✅ không |
| Tự động âm thầm bỏ sót chuyến (MileIQ 209, Everlance 151, Hurdlr 70) | ✅ hiện không — **sẽ dính nếu tự động làm ẩu** |
| Chuyến ma (đi bộ, ngồi nhà), cắt 1 chuyến thành nhiều ở đèn đỏ / điểm giao, hụt đầu chuyến | ✅ hiện không — rủi ro của tự động |
| Tốn pin; Samsung "deep sleep" tắt app nền | 🟡 chưa kiểm khi chạy nền lâu |
| Bấm tay quên Start (mất cả ngày) / quên Stop (dặm thừa) | ❌ **dính** — chỉ nhắc sau 12 giờ |
| Mất dữ liệu khi đổi / mất máy (lời chê số 2 Cash Book) | ❌ **dính** — chỉ sao lưu tay |
| Khoá / xoá dữ liệu khi hết lượt miễn phí | ✅ không — **phải giữ khi thêm Pro** |
| Thông báo quá nhiều | ✅ 1 nhắc/tuần |
| Không sửa được giờ chuyến | 🟡 chuyến GPS không sửa giờ |
| Xin thêm (Cash Book): khoản lặp lại, máy tính trong ô số tiền, nhắc ghi hằng ngày, nhiều ảnh/khoản (thử thật §9: Cash Book nay đã có máy tính + nhiều ảnh) | ❌ chưa có |

**Kết luận:** người dùng muốn tự động (khen số 1) nhưng tự động sai mà không báo là chê số 1–2. Cần cùng lúc:
không phải nhớ · không sót âm thầm · biết ngay khi app ngừng ghi · sửa/gộp/tách nhanh · không bao giờ mất dữ liệu.

## 4. Mục 8 file ý tưởng
| Việc | Kết quả |
|---|---|
| MTD | Áp dụng từ 6/4/2026 (doanh thu > £50k), 4/2027 > £30k, 4/2028 > £20k. Tài xế van toàn thời gian gần như chắc vượt £30k. Gov.uk: xuất/nhập CSV là "digital link" hợp lệ, cấm copy-paste; mỗi bản ghi cần số tiền, ngày, **danh mục** → khoản Unsorted không gửi được |
| Bridging software | Mỗi hãng mẫu CSV riêng (MTDsorted, QuarterBridge, abridge…), chưa có mẫu chung; CSV A006 chưa thử với hãng nào |
| Vì sao bỏ FreeAgent / Monzo | **Monzo Business miễn phí có sẵn phần mềm MTD** (nộp quý + cuối năm trong app; không cho kế toán cùng làm). **FreeAgent miễn phí** với NatWest/RBS/Mettle (gói thường giới hạn 10 hoá đơn/tháng). Cả hai dựa trên giao dịch ngân hàng |
| Tìm tài xế van thật | Chưa tìm được thảo luận thật (diễn đàn courier UK chỉ ra bài hướng dẫn; Reddit bị chặn) |
| Điều kiện bỏ ý tưởng "3/5 app có đủ 3 thứ" | Không xảy ra |

→ UK: người trên ngưỡng MTD có lựa chọn miễn phí ngay trong ngân hàng. A006 thắng ở: tiền mặt / khoản không qua ngân
hàng + dặm + phân loại Chủ nhật + **xuất đúng mẫu để phần mềm MTD nhập**.

## 5. Rà code so với file ý tưởng (trước bản 2)
**Lệch:** màn Sort không có Gộp; Sửa/Tách mở màn khác (6.1, 6.2, 6.5); gợi ý không dùng ảnh hoá đơn (6.2); ghi chuyến chỉ
bấm tay trong khi Phương muốn tự động (6.3); miễn phí hoàn toàn trái mục 7 (đã đổi — xem PLAN-v2).
**Một phần:** gợi ý chỉ xét số tiền khi ghi chú trùng chữ (`suggest.ts:78`); nhắc tuần chỉ đặt trước 4 tuần
(`notifications.ts:9`); "chống sót âm thầm" chỉ kiểm khi mở lại app (`controller.ts:170`); Personal stop phải bấm trước khi rẽ;
MTD chưa kiểm với hãng thật.
**Chưa làm:** cảnh báo quên Start; vuốt chuyến ở Miles; widget iOS chưa build EAS; TalkBack cần người nghe thật.
**Dễ hiểu sai:** "sửa/gộp/tách trên cùng màn"; "điểm dừng cá nhân"; số tiền là tín hiệu gợi ý riêng; 1 nút ghi nhanh vs 2 nút;
danh mục tự đặt vs dựng sẵn; bảng đối thủ product.md §1 sai vài ô (Hurdlr có AI, Speed Tagging, gộp chuyến; bản free có
Start/Stop + báo cáo) → không quảng bá Start/Stop và xuất file miễn phí là khác biệt.

## 6. Khảo sát nốt K1–K8 (2026-11-13, chiều)
| # | Việc | Kết quả |
|---|---|---|
| K1 | Reddit 5 luồng | ❌ bị chặn cả trình duyệt Claude, WebSearch và Claude in Chrome → Phương mở link, dán nội dung |
| K2 | Thử app đối thủ | ⏳ P0 (trình giả lập, Phương đăng nhập) |
| K3 | Giá UK | MileIQ ≈ £95/năm · Driversnote ≈ £96/năm · TripLog ≈ £51–60/năm · FlashTax (nộp MTD) £39.99/năm · MileClear, PocketReceipt miễn phí. **Chưa app nào bán mua 1 lần** |
| K4 | Đánh giá UK | Play web **không lọc theo nước** (bản GB trùng bản US) → các con số mục 2–3 là toàn cầu. App Store UK chỉ xem được ~10 đánh giá/app |
| K4b | Đối thủ UK thật | App Store UK: **Driversnote 7.658 đánh giá (4,76★)** — lớn nhất, không có trong file ý tưởng · MileIQ 3.958 · TripLog 259 · Everlance 55 · Hurdlr gần như không có |
| K5 | Driversnote (Play, 940 đánh giá, đọc hết 389 lời chê) | Chê #1: **giấu giới hạn 15 chuyến/tháng**, £8–9/tháng, khoá dữ liệu khi ngừng trả; 2 người: "sẽ mua nếu là phí một lần". Tự động: iBeacon chập chờn, hụt 2 dặm đầu, chạy tiếp 30–45 phút sau khi dừng, cả ngày thành 1 chuyến, bắt "luôn cho phép vị trí", tốn pin (47). Người dùng đề xuất: **Bluetooth sẵn của xe làm công tắc, thẻ NFC, Start/Stop từ Android Auto/CarPlay**. Nhắc: chê cả "không báo khi cả tuần không có chuyến" lẫn email "9 ngày chưa ghi" → nhắc trong app, tắt được. Khen: hỗ trợ tận tình, dễ dùng, logbook đúng HMRC |
| K6 | Mẫu CSV MTD | Bridging nhận **tổng theo danh mục HMRC**. Gov.uk: báo cáo quý **cộng dồn từ 6/4** tới hết kỳ (hạn 7/8, 7/11, 7/2, 7/5); có kỳ theo lịch (từ 1/4), chọn trước lần nộp đầu. Chưa tải file mẫu |
| K7 | Tài xế van thật | ❌ codforum.org.uk + Reddit bị chặn; nhóm Facebook cần Phương đăng nhập |
| K8 | Từ khoá UK (Google Trends 12 tháng, tương đối) | "receipt app" 63 · "self assessment app" 17 · "expense tracker" 14 · "mileage tracker" 8 · "courier expenses" ~0; tăng: "best mileage tracker app" +200%, "business expense tracker app" +150% → trang store dẫn bằng **receipt** |

## 7. Lỗi / thiếu mới phát hiện
| # | Việc | Bằng chứng | Mức |
|---|---|---|---|
| X1 | **Mức dặm UK 2026/27 = 55p** cho 10.000 dặm đầu (áp dụng lùi từ 6/4/2026), 25p sau đó. A006 để cứng 45p | gov.uk policy paper 17/6/2026; `src/domain/mileage.ts:26`; chữ "(45p / 25p)" trên app | 🔴 sửa trước store |
| X2 | Mức dặm cố định **đã gồm** xăng, bảo hiểm, sửa xe, MOT, thuế đường; chỉ đỗ xe / cầu đường / congestion tính riêng; chọn rồi giữ cho chiếc xe đó. Báo cáo A006 hiện **cả** tổng các khoản xe **lẫn** tiền theo dặm → dễ khai trùng | gov.uk Simplified expenses: Vehicles; BIM75005 | 🔴 bản 2: cài đặt "Cách tính xe: theo dặm / chi phí thật" |
| X3 | CSV MTD phải cộng dồn từ đầu năm + chọn kỳ chuẩn / theo lịch | gov.uk Send quarterly updates | 🟠 S5 |
| X4 | Đối thủ UK chính là Driversnote + nhiều app UK mới miễn phí | App Store UK | 🟠 product.md v2 §1 |
| X5 | Bật chuyến không chạm máy: thêm thẻ NFC, Android Auto / CarPlay | người dùng Driversnote; luật UK cấm cầm máy khi lái | 🟡 hỏi ở P1 |
| X6 | Nói rõ giới hạn bản miễn phí ngay lúc cài | 149 lời chê Driversnote | 🟠 P1 (onboarding + màn Pro) |

## 8. P0 phần còn lại (2026-11-13, phiên điều phối bản 2)
| # | Việc | Kết quả |
|---|---|---|
| P0-1 | Reddit 5 luồng | **Bỏ** (Phương chốt) — không có nội dung dán |
| P0-2 | Dùng thử 6 app đối thủ | **Bỏ** (Phương chốt): tạo tài khoản Google cần mật khẩu / số điện thoại / CAPTCHA (Claude không được làm), APK ngoài bị cấm, 4/6 app còn bắt đăng ký email. Thay bằng mục 2–3 + K5 |
| P0-3 | Mẫu CSV/Excel MTD | Xem dưới |
| P0-4 | Nhóm Facebook | Khách **không xem được** (tìm nhóm cần đăng nhập, nhóm không được index). Thay: UK Business Forums "Becoming a Delivery Driver / Courier" — tài xế nói **20k dặm/năm (Amazon) tới 100k (courier tự do)** → hầu hết vượt bậc 10.000 dặm sớm: báo cáo phải hiện rõ lúc sang 25p; X2 (theo dặm vs chi phí thật) đáng kể với người chạy nhiều |
| P0-5 | Giá Pro (Q16) | **Chỉ thuê bao năm** (Phương chốt). Giá đặt tạm **£24.99/năm**, Phương chỉnh sau; **US = quy đúng tỷ giá thực** lúc chốt (≈ $32 → bậc gần nhất). Không gói tháng, không trọn đời |

**Mẫu nhập MTD / FreeAgent (P0-3, tải công khai, lưu ngoài repo):**
- **MTDsorted** (bridging, miễn phí 1 nguồn): Excel mẫu Standard + Calendar. Sheet `Income`: Date received · Description ·
  Merchant / customer name · Amount received (without VAT) · Income tax category · CIS deducted. Sheet `Expenses`: Date ·
  Description · Merchant / customer name · Total amount · **Disallowable amount** · Income tax category. Sheet `Summary`
  tự cộng theo danh mục, **cả Standard lẫn Calendar đều cộng dồn từ đầu năm** (Q2 = 6/4→5/10; Calendar 1/4→30/9).
  Người dùng **gõ tổng từ Summary vào MTDsorted** (không upload file).
- **15 danh mục chi HMRC** (trùng trường API quarterly update): Administrative costs · Advertising and marketing · Business
  entertainment · Car, van and travel expenses · Cost of goods · Depreciation · Finance charges · Interest on loans · Bad debts
  · Repairs and maintenance · Other expenses · Payments to subcontractors · Premises running costs · Professional fees · Wages
  and staff costs; thu: Turnover · Other business income. Mỗi danh mục có phần **Disallowable** riêng.
- **BrightBooks** (bridging): template Excel tải sau đăng nhập; nhận **tổng theo danh mục + ngày đầu/cuối kỳ**, cấm đổi cột.
  TaxCalc / Tax Optimiser: nhận .xlsx/.csv theo mẫu riêng. → **Chưa có mẫu CSV chung**; điểm chung = tổng theo 15 danh mục.
- **FreeAgent** — Expenses CSV (tối đa 1.000 dòng, ngày `DD/MM/YYYY`): `claimant_name` (khớp đúng tên user) · `category`
  (tên danh mục FreeAgent hoặc mã kế toán) · `DD/MM/YYYY` · `currency` · `type` (Payment/Refund) · `gross_value` ·
  `description` · `receipt_reference` · `sales_tax_rate`… Mileage CSV: `claimant_name` · `DD/MM/YYYY` · `description` ·
  `mileage` · `vehicle_type` (**chỉ Car / Motorcycle / Bicycle — không có Van**) · `engine_type` · `engine_size` ·
  `reclaim_mileage` (1/0). Không nhập được nếu tài khoản "universal".

→ **Gợi ý S5 (grill ở P1):** (1) map danh mục A006 → 15 danh mục HMRC + cột Disallowable; (2) xuất "MTD summary" cộng dồn
theo kỳ Standard / Calendar (đúng bố cục Summary MTDsorted); (3) xuất sổ chi tiết theo cột MTDsorted (CSV, cân nhắc .xlsx đúng
mẫu → cần thư viện ở P3); (4) FreeAgent: Expenses CSV + Mileage CSV (người dùng nhập tên claimant 1 lần; van → "Car").

## 9. Thử thật 5 app (2026-11-16)
**Cách thử:** giả lập `Medium_Phone_API_37.0` + tài khoản Google VN của Phương. Play VN: **Hurdlr, MileIQ "not available in
your country"**, **Everlance (Early Access) "device isn't compatible"**, Cash Book cài được → Cash Book thử trên giả lập; MileIQ +
Everlance thử **bản web** bằng tài khoản Phương tạo (thiếu giao diện điện thoại + tự ghi chuyến); **Hurdlr web cũng chặn**
("only available in the United States and Canada") → chỉ xem được onboarding; Self Employed (iOS) chỉ xem App Store + website.
Ghi chú thô từng màn: scratchpad phiên (không lưu repo).

**Cash Book** (Android, không tài khoản)
- Mở là dùng: 1 hộp "How to use" + OK, không xin quyền. Home: thẻ "Turn On Backup" (Drive) ghim đầu tới khi bật · lọc
  All/Daily/Weekly/Monthly/Yearly · bảng Date | Cash In | Cash Out + **số dư chạy** mỗi dòng · 2 nút to xanh/đỏ sát đáy ·
  dải tổng · **banner quảng cáo mọi màn** + Play bật sheet khuyến mãi đè app.
- Ghi khoản: ngày ‹ › + giờ · ô số tiền **có nút máy tính** (bàn phím + − × ÷ %, kết quả sống "16.70" trên "12.50+4.20") ·
  Notes có **mic** · Add Bills: Camera / Gallery (**chọn nhiều**) / **PDF** · Add Items (tên, SL, đơn vị, đơn giá) · danh mục
  **ẩn trong menu ⋮**, ô gõ tự do · "Save and continue" để ghi liên tiếp. **Không OCR** (đính ảnh hoá đơn mẫu, số tiền không đổi).
- Chạm khoản → sửa tại chỗ + **Copy** (nhân bản) + Delete → **"Deleted Transactions"** khôi phục được. Nhiều sổ (Accounts),
  chuyển giữa sổ, lịch, ghi chú, vân tay/mật khẩu, gợi ý ghi chú cũ, tự gửi sao kê email, Print, Report → PDF/Excel đi thẳng bảng chia sẻ.
- Giá (Play VN, chỉ để **bỏ quảng cáo**, mọi tính năng miễn phí): **trọn đời 250.000₫** · năm 80.000₫ (thử 5 ngày) · tháng
  8.000₫ (thử 3 ngày) · mỗi gói có bản **"Manual renewal" (không tự gia hạn)** · nút "Cancel Subscription" ngay trang giá ·
  "xem 1 video → bỏ quảng cáo 7 ngày".
- → Sửa §3: "xin thêm máy tính trong ô số tiền, nhiều ảnh/khoản" là đánh giá cũ — **bản hiện tại đã có**.

**MileIQ** (web dashboard, gói Free)
- Sau đăng ký: "You're almost there!" 3 bước (tải app qua QR/SMS → đăng nhập → chuyến đầu). Web không tự ghi.
- Drives: thanh tổng **Distance · Unclassified · Personal · Business** (tiền) · tab có số đếm · "N matching • **0 reported**" ·
  nhóm theo ngày, dòng = mục đích · địa chỉ đi → đến · dặm · giờ · tiền · chọn nhiều · Trash.
- Thêm chuyến tay: hỏi **Business/Personal trước** → mục đích IRS (Customer Visit, Errand/Supplies…; thêm được) → ô địa chỉ
  **autocomplete Google** (địa chỉ UK được) → **tự tính tuyến**: Leeds Station → Bradford Interchange = 10,9 mi, $8.28
  (0,76 $/mi) · tab 2: Distance (sửa) · **Parking · Tolls** · Notes → giá trị dòng = dặm + đỗ xe ($11.78). Panel chi tiết:
  bản đồ tuyến, Report · **Duplicate** · Move to trash.
- Reports: lọc kỳ / loại / xe → thẻ tổng → tên báo cáo, người nộp, khách, dự án, mức, **"Mark drives as reported"** (bật sẵn)
  → gửi **email** (hoặc Concur, kèm bản QuickBooks). Web không tải file thẳng.
- Subscription: **"39 drives left this month"** đầu trang · free **40 chuyến/tháng** · **$139.99/năm** · $13.99/tháng ·
  bán bằng "stay IRS compliant", "average user deducts $6,500".
- Settings: Mileage rates (mi/km, mức IRS 2026, sửa được) · **Auto-classification: Frequent Drives (bật sẵn) + Work Hours
  trong giờ → Business / ngoài giờ → Personal** · Custom purposes · **Named locations** · **Vehicle & odometer (số đồng hồ
  theo từng năm)** · email tuần (thứ Hai) + cuối tháng **bật sẵn**, email quảng cáo cũng **bật sẵn**.

**Everlance** (web dashboard, gói Basic)
- Home: Trips + Transactions overview ("Connect your bank or credit card…") · **"30 free trips left this month"** · chat hỗ trợ
  góc phải mọi màn.
- New Trip: Miles to · bản đồ + **Edit route / Calculate route / Round trip** · mục đích **mặc định Personal** · giờ từ–đến ·
  note, tags, xe, **ảnh**. New Expense / **Revenue**: số tiền to + "Add receipt" · Merchant · ngày · **38 danh mục Mỹ** dài
  (Gasoline… Snacks for Clients (50%), Section 179…) · tags.
- Data exports: **Excel / CSV / PDF**, lọc ngày / mục đích / tags, thêm người nhận, file có hạn tải; loại **Tax report**.
- Settings: Purposes (Self-Employed/Employee + nghề) · **Tax Center** (Revenue, Work Expenses, Mileage Deduction, Taxable
  income) · **Transaction Rules** ("Field contains …" AND … → Purpose + Notes) · Tracker (bật/tắt tự dò, **Auto Classify trips
  as …**) · **Favorite Trips** · **Favorite Places** · Vehicles · **Work Hours (khoá Premium)** · Import History.
- Gói: **Basic** = 30 chuyến tự động/tháng + chuyến/chi phí tay không giới hạn · **Starter $89.99/năm** ($7.50/th): tự động
  không giới hạn, **PDF reports**, Work hours · **Professional $119.99/năm**: + card sync, 1099 tax filing, audit protection ·
  thử 7 ngày · "luôn truy cập dữ liệu" · **gói năm không hoàn tiền**.

**Hurdlr** — chỉ onboarding web: chọn ngành (Driver…) → chọn sàn (Uber, Lyft, **Amazon Flex**, Doordash…, chọn nhiều) →
email + mật khẩu ("Final Step!"); khẩu hiệu "Unlimited Auto Mileage Tracking". Chặn ngoài Mỹ/Canada ngay khi bấm DONE.

**Self Employed: Income & Tax** (iOS, 1 người làm, 4 đánh giá 5★, "Data Not Collected") — chỉ xem store/website
- Pay stub PDF, thu/chi, tips, sổ séc nhiều tài khoản, **khoản lặp lại** (thẻ riêng, ngày 1–31, khoản $0 cho hoá đơn đổi số,
  "biến khoản thành lặp lại 1 chạm"), thuế ước tính quý, nhiều doanh nghiệp, lưu trữ cuối năm, iCloud. Dặm: **GPS chỉ ghi giữa
  Start–Stop ("No continuous location monitoring")**, Apple Watch bắt đầu chuyến, CarPlay. Giao diện tối, kính mờ.
- Giá **$4.99/th · $49.99/năm · trọn đời $149.99**; người cài trước khi có gói giữ miễn phí. Khen: "không bị khoá sau paywall".

**So với A006 bản 2**
| Thấy ở đối thủ | A006 bản 2 |
|---|---|
| Đếm ngược lượt free ngay đầu màn (MileIQ "39 drives left", Everlance "30 free trips left") | ✅ 20 ảnh/tháng hiện đếm ngược |
| Máy tính trong ô số tiền, nhiều ảnh/khoản, ghi liên tiếp (Cash Book) | ✅ Q20, Q21 (ghi liên tiếp: chưa rõ) |
| Nhân bản khoản / chuyến (Cash Book Copy, MileIQ Duplicate) | ✅ Duplicate trong ⋯ |
| Luật theo nơi bán (Everlance Rules), nơi quen / giờ làm (MileIQ, Everlance) | ✅ P1-2, P1-3, P1-10 — A006 hỏi 1 chạm, họ bắt tự đặt luật |
| Đồng hồ dặm (MileIQ: 1 số/năm) | ✅ Q27 mạnh hơn (đối chiếu định kỳ, báo thiếu dặm) |
| Thêm chuyến tay bằng địa chỉ + tự tính tuyến (MileIQ, Everlance) | ✅ Q25 A→B (Pro, S1b) |
| **Đỗ xe / cầu đường gắn ngay vào chuyến** (MileIQ) | ❌ phải ghi khoản riêng |
| **Đánh dấu "đã báo cáo / đã xuất"** (MileIQ) | ❌ |
| **Thùng rác khôi phục khoản đã xoá** (Cash Book, MileIQ Trash) | 🟡 chỉ Undo vài giây |
| **Chuyến hay đi / khứ hồi 1 chạm** (Everlance Favorite Trips, Round trip) | 🟡 có tuyến quen, chưa có "thêm lại chuyến hay đi" |
| Gói trọn đời / gia hạn tay (Cash Book, Self Employed); 2 người dùng Driversnote đòi mua 1 lần (K5) | ❌ Q16 chỉ gói năm |
| Quảng cáo, email quảng cáo bật sẵn, danh mục Mỹ dài 38 mục, mục đích mặc định Personal | ✅ A006 tránh được cả 4 |

## Nguồn
- gov.uk: [Tăng mức dặm 17/6/2026](https://www.gov.uk/government/publications/increase-to-approved-mileage-allowance-payments-amaps-and-self-employed-simplified-mileage-rates) ·
  [Simplified expenses: Vehicles](https://www.gov.uk/simpler-income-tax-simplified-expenses/vehicles-) · [BIM75005](https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim75005) ·
  [Send quarterly updates](https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates)
- [MileIQ UK pricing](https://mileiq.com/en-gb/pricing) · [Driversnote (Play)](https://play.google.com/store/apps/details?id=com.driversnote.driversnote) · [MileClear – so sánh UK](https://mileclear.com/best-mileage-tracker-app-uk) · [FlashTax](https://flashtax.uk/tools/expense-tracker)
- gov.uk: [Create digital records](https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/create-digital-records) ·
  [MTD cho sole trader](https://www.gov.uk/government/publications/extension-of-making-tax-digital-for-income-tax-self-assessment-to-sole-traders-and-landlords/making-tax-digital-for-income-tax-self-assessment-for-sole-traders-and-landlords)
- [Monzo – Free MTD software](https://monzo.com/business-banking/features/making-tax-digital) · [NerdWallet – FreeAgent](https://www.nerdwallet.com/uk/accounting-software/freeagent) ·
  [MTDsorted](https://www.mtdsorted.co.uk/downloads) · [GoFile – bridging](https://gofile.co.uk/knowledgebase/making-tax-digital/income-tax-bridging-software/)
- Google Play: [MileIQ](https://play.google.com/store/apps/details?id=com.mobiledatalabs.mileiq) · [Everlance](https://play.google.com/store/apps/details?id=com.everlance) ·
  [Hurdlr](https://play.google.com/store/apps/details?id=app.hurdlr.com) · [Cash Book](https://play.google.com/store/apps/details?id=cashbook.cashbook)
- P0: [MTDsorted – mẫu sole trader](https://www.mtdsorted.co.uk/downloads/mtd-income-tax-sole-trader-spreadsheet) · [FreeAgent – import expenses](https://support.freeagent.com/hc/en-gb/articles/360007142140) ·
  [FreeAgent – import mileage](https://support.freeagent.com/hc/en-gb/articles/360007144540) · [BrightBooks – template SE](https://brightbookssupport.brightsg.com/hc/en-gb/articles/44698120102929-Importing-MTD-Self-Employed-Quarterly-Returns-Using-Excel-Template) ·
  [UK Business Forums – courier](https://www.ukbusinessforums.co.uk/threads/becoming-a-delivery-driver-courier.415571/) · [TaxMiles lifetime](https://frontdeskreview.com/software/mileage-tracking/taxmiles/) · [Hurdlr giá](https://fitsmallbusiness.com/hurdlr-review/)
