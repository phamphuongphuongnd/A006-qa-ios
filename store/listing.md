# Sunday Sort — nội dung store (BẢN NHÁP, chờ Phương duyệt)

> Soạn 2026-11-18 (QA-100 → Bước 6.2) từ `product.md` §0/§6, `PLAN-v2.md` P6 (K8: tiêu đề / mô tả ngắn dẫn bằng "receipt",
> kèm "mileage", "self assessment"), `docs/privacy.html`. **Chưa nộp, chưa đăng gì.** Chỗ ghi ❓ = Phương quyết.
> Giá £24.99/năm là giá tạm (product.md §6).

## Google Play

**Tên app (≤ 30):** `Sunday Sort: Driver Expenses` (28)

**Mô tả ngắn (≤ 80):** `Receipt & mileage log for van drivers. Ready for Self Assessment & Schedule C.` (78)

**Mô tả đầy đủ (≤ 4000):**

```
Log a receipt in 10 seconds. Sort the whole week on Sunday. Have your tax-year totals ready when it's time.

Sunday Sort is a simple expense and mileage log for self-employed van drivers, couriers and multi-drop drivers in the UK
(Self Assessment) and the US (Schedule C).

LOG IN SECONDS, NO CATEGORY NEEDED
• Income or expense, the amount, a photo of the receipt if you like, one line of note — done.
• A built-in calculator in the amount box.
• Several photos per entry.

SORT THE WEEK ON SUNDAY
• One card at a time: pick the category, split a shared receipt, merge duplicates, all on one screen.
• Work or personal in one tap.

MILEAGE WITHOUT GAPS
• Start / Stop trips with GPS, or tap an NFC sticker in the van.
• Add trips by hand, or check against your odometer.
• Sunday Sort tells you when it stops recording — and spots a trip that looks missing — so nothing slips through quietly.

READY FOR YOUR TAX RETURN
• UK: SA103 boxes, tax year 6 April – 5 April, simplified mileage rates.
• US: Schedule C lines, calendar year, IRS mileage rate.
• Reports in the app, CSV export of all entries and your mileage log.

PRIVATE BY DESIGN
• No account. No bank connection. No ads.
• Your entries, receipts and trips stay on your phone. Back up to a file or a folder you choose.
• App lock with fingerprint or face.

SUNDAY SORT PRO (yearly subscription, 7-day free trial in the app — no card needed to try)
• Automatic trips: recorded when your phone notices you are driving (motion sensor, your van's Bluetooth, or the car
  charger).
• Read receipts on the phone: amount, shop and date filled in for you.
• Auto-sort rules for the shops you use every week, and recurring entries.
• Unlimited receipt photos (free: 20 a month).
• Tax-year PDF, totals by tax box, MTD-ready CSV / Excel files for bridging software, FreeAgent file, ZIP of receipts.
When Pro ends, nothing is locked away or deleted: your data, photos and raw CSV export stay yours.

Sunday Sort does not give tax advice and does not file your return. It is not MTD software: it prepares files you or your
accountant import into MTD software.
```

**Danh mục:** Finance · **Tag/keyword gợi ý:** receipt, mileage tracker, expense tracker, self assessment, van driver,
courier, HMRC, Schedule C, mileage log, bookkeeping.
**Liên hệ / privacy URL:** ❓ trang công khai cho `docs/privacy.html` (BUGS: "Đăng bản privacy mới lên trang công khai — chờ Phương").

### Data safety (Google Play) — đề xuất trả lời, ❓ Phương xác nhận
| Câu hỏi | Đề xuất | Căn cứ |
|---|---|---|
| App thu thập / chia sẻ dữ liệu người dùng? | Có, tối thiểu (xem dưới) — phần lớn dữ liệu **không rời máy** | product.md §0 |
| Vị trí | **Không thu thập về server.** GPS chuyến chỉ lưu trên máy. ❓ Ô bản đồ (OpenFreeMap) tải theo vùng đang xem → lộ vùng gần đúng cho máy chủ bản đồ; A → B gửi địa chỉ đã gõ tới openrouteservice. Đề xuất khai "Approximate location — shared — app functionality, processed ephemerally" cho 2 dịch vụ này. | Q25, privacy.html |
| Ảnh / tệp | Không thu thập (ảnh hoá đơn ở trên máy; sao lưu vào thư mục người dùng chọn) | |
| Thông tin tài chính | Không thu thập (sổ thu chi ở trên máy; mua Pro qua Google Play Billing — Google xử lý) | |
| Mã hoá khi truyền | Có (HTTPS cho bản đồ / openrouteservice) | |
| Xoá dữ liệu | Người dùng xoá trong app (Settings → Delete all data); không có tài khoản | |
| Quyền | Vị trí (cả nền) cho chuyến, nhận diện hoạt động (Pro tự động), camera, thông báo, Bluetooth (van), NFC | manifest |

## App Store (iOS)
- **Tên:** `Sunday Sort: Driver Expenses` · **Phụ đề (≤ 30):** `Receipts & mileage for drivers` (30)
- **Mô tả:** như Google Play (bỏ dòng "Google Play"). **Keywords (≤ 100 ký tự):**
  `receipt,mileage,expenses,self assessment,hmrc,van,courier,schedule c,log,tax,bookkeeping,driver` ❓ kiểm số ký tự khi nộp.
- **App Privacy:** như Data safety; ❓ "Coarse Location — not linked to you — App Functionality" cho bản đồ / A → B.

## Ảnh store (chưa làm)
- 4–8 ảnh dọc 1080×1920 (Android) + 6.7"/6.5" (iOS): Ghi nhanh · Sort Chủ nhật · Miles + bản đồ · Báo cáo theo ô thuế ·
  Xuất file · Pro. Chụp từ bản release trên máy với dữ liệu mẫu (persona P004 UK, P041 US) — không dùng dữ liệu thật của Phương.

## Chưa làm, cần Phương (theo luật xưởng)
- Tạo khoá ký → tag `v1.0.0` → AAB + iOS (WORKFLOW §5 — Phương tự tạo khoá).
- Đăng privacy policy công khai, chốt giá, tài khoản Play Console / App Store Connect, closed testing ≥ 12 tester × 14 ngày.
