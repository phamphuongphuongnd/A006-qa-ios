# Sunday Sort — nội dung store (BẢN NHÁP, chờ Phương duyệt)

> Soạn 2026-11-18 (QA-100 → Bước 6.2) từ `product.md` §0/§7, `PLAN-v2.md` P6 (K8: tiêu đề / mô tả ngắn dẫn bằng "receipt",
> kèm "mileage", "self assessment"), `docs/privacy.html`. **Chưa nộp, chưa đăng gì.** Chỗ ghi ❓ = Phương quyết.
> **Bản đầu (Phương chốt 2026-11-19, product.md mục ★):** mọi tính năng mở cho mọi người, không bán gì (Pro tạm tắt,
> `PRO_PAUSED`), không quảng cáo. Câu chữ store **không** dùng "free", "free forever", "no ads", "no account"; điểm nhấn
> cách chạy chỉ là **"works offline"** + **"we never see your data"** (không hứa "data never leaves your phone" — có sao lưu
> hệ thống, product.md §11).

## Google Play

**Tên app (≤ 30):** `Sunday Sort: Driver Expenses` (28)

**Mô tả ngắn (≤ 80):** `Receipt & mileage log for van drivers. Ready for Self Assessment & Schedule C.` (78)

**Mô tả đầy đủ (≤ 4000):** (2.540 ký tự kể cả xuống dòng, đếm lại 2026-11-19; "FreeAgent" là tên phần mềm, không phải chữ "free")

```
Log a receipt in 10 seconds. Sort the whole week on Sunday. Have your tax-year totals and files ready when it's time.

Sunday Sort is a simple money and mileage log for self-employed van drivers, couriers and multi-drop drivers in the UK
(Self Assessment, MTD) and the US (Schedule C). It works offline, and we never see your data.

LOG IN SECONDS, NO CATEGORY NEEDED
• Income or expense, the amount, a photo of the receipt if you like, one line of note — done.
• Receipt reading on the phone: amount, shop and date filled in for you.
• A built-in calculator in the amount box, and several photos per entry.
• Recurring entries for the van lease, phone bill or insurance — added for you on the right day.

SORT THE WEEK ON SUNDAY
• One card at a time: pick the category, split a shared receipt, merge duplicates, all on one screen.
• Suggested categories, and "Accept all suggestions" in the list view.
• Auto-sort rules for the shops you use every week: "Always sort Shell as Fuel".
• Work or personal in one tap.

MILEAGE WITHOUT GAPS
• Automatic trips: recorded when your phone notices you are driving (motion sensor or your van's Bluetooth). Your
  delivery stops are joined into one shift trip.
• Start / Stop trips by hand, or tap an NFC sticker in the van.
• Add trips by odometer, by distance, or from A to B with the driving distance worked out.
• Trip map with your route and stops.
• Sunday Sort tells you when it stops recording, spots a trip that looks missing and checks against your odometer — so
  nothing slips through quietly.

READY FOR YOUR TAX RETURN
• UK: SA103 boxes and HMRC categories, tax year 6 April – 5 April, simplified mileage rates.
• US: Schedule C lines, calendar year, IRS mileage rate.
• Mileage rate or actual costs for the van — your totals follow your choice.
• Files for you or your accountant: tax-year PDF report, totals by tax form line, MTD summary, MTD records and MTD
  spreadsheet for bridging software, FreeAgent file, CSV of all entries, CSV mileage log, ZIP of receipt photos.

YOUR DATA STAYS YOURS
• Works offline. No bank connection.
• We never see your data: entries, receipts and trips are kept in the app on your phone.
• Nightly backup to a folder you choose (Google Drive, iCloud Drive or the phone), keeping your last 7 backups.
• App lock with fingerprint or face. Home screen widget for a quick entry.

Sunday Sort does not give tax advice and does not file your return. It is not MTD software: it prepares files you or your
accountant import into MTD software.
```

> Mô tả không nhắc giá, dùng thử, "Pro", "subscription". Nếu Phương muốn bỏ "No bank connection" (gần nghĩa "no account")
> thì xoá cả cụm, không thay bằng chữ khác. ❓ "Home screen widget": Android có; iOS widget chưa thử Appetize (APP.md) —
> giữ vì tính năng đã có trong bản build.

**Danh mục:** Finance · **Tag/keyword gợi ý:** receipt, mileage tracker, expense tracker, self assessment, van driver,
courier, HMRC, MTD, Schedule C, mileage log, bookkeeping.
**Liên hệ / privacy URL:** ❓ trang công khai cho `docs/privacy.html` (BUGS: "Đăng bản privacy mới lên trang công khai — chờ Phương").

### Khai báo Play Console (bản đầu)
| Ô | Trả lời | Ghi chú |
|---|---|---|
| Giá | Miễn phí tải (ô "Free" của Play Console — chỉ là ô khai, không đưa vào câu chữ store) | Đổi thành trả phí sau này không được → bản sau thu phí bằng mua trong app |
| Contains ads | **No** | |
| In-app purchases | **Không có** — không tạo sản phẩm / gói thuê bao nào trong Play Console ở bản đầu | App không mở kết nối Google Play Billing (`PRO_PAUSED`). ❓ Thư viện `expo-iap` vẫn trong build → manifest gộp có thể còn quyền `com.android.vending.BILLING`; Play có thể hỏi — trả lời: không bán gì ở bản này |
| Target audience | 18+ (người tự kinh doanh) | Không hướng tới trẻ em |
| News app / COVID / Government | No | |

### Data safety (Google Play) — đề xuất trả lời, ❓ Phương xác nhận
| Câu hỏi | Đề xuất | Căn cứ |
|---|---|---|
| App thu thập / chia sẻ dữ liệu người dùng? | Có, tối thiểu (xem dưới) — sổ thu chi, ảnh, chuyến lưu trong app, **không gửi về máy chủ của mình** (không có máy chủ) | product.md §0, §11 |
| Vị trí | **Không thu thập về server.** GPS chuyến chỉ lưu trên máy. ❓ Ô bản đồ (OpenFreeMap) tải theo vùng đang xem → lộ vùng gần đúng cho máy chủ bản đồ; A → B gửi địa chỉ đã gõ tới openrouteservice. Đề xuất khai "Approximate location — shared — app functionality, processed ephemerally" cho 2 dịch vụ này. | Q25, privacy.html |
| Ảnh / tệp | Không thu thập (ảnh hoá đơn ở trên máy, đọc hoá đơn chạy trên máy; sao lưu vào thư mục người dùng chọn) | |
| Thông tin tài chính | Không thu thập (sổ thu chi ở trên máy; bản đầu không bán gì, không thanh toán) | |
| Mã hoá khi truyền | Có (HTTPS cho bản đồ / openrouteservice) | |
| Xoá dữ liệu | Người dùng xoá trong app (Settings → Delete all data); không có tài khoản để xoá | |
| Quyền | Vị trí (cả nền) cho chuyến, nhận diện hoạt động (chuyến tự động), camera, thông báo, Bluetooth (van), NFC | manifest |

## App Store (iOS)
- **Tên:** `Sunday Sort: Driver Expenses` (28) · **Phụ đề (≤ 30):** `Receipts & mileage for drivers` (30)
- **Mô tả:** như Google Play. **Keywords (≤ 100 ký tự):**
  `receipt,mileage,expenses,self assessment,hmrc,mtd,van,courier,schedule c,log,tax,bookkeeping,driver` (99)
- **Giá:** bậc giá 0, không In-App Purchase nào trong App Store Connect ở bản đầu.
- **App Privacy:** như Data safety; ❓ "Coarse Location — not linked to you — App Functionality" cho bản đồ / A → B.

## Ảnh store (chưa làm)
- 4–8 ảnh dọc 1080×1920 (Android) + 6.7"/6.5" (iOS): Ghi nhanh · Sort Chủ nhật · Chuyến tự động + bản đồ · Báo cáo theo ô
  thuế · Xuất file (MTD / FreeAgent / PDF) · Khoản lặp lại / luật. Chụp từ bản release (`PRO_PAUSED`) trên máy với dữ liệu
  mẫu (persona P004 UK, P041 US) — không dùng dữ liệu thật của Phương; không ảnh nào có chữ "PRO" / "Trial".

## Chưa làm, cần Phương (theo luật xưởng)
- Tạo khoá ký → tag `v1.0.0` → AAB + iOS (WORKFLOW §5 — Phương tự tạo khoá).
- Đăng privacy policy công khai, tài khoản Play Console / App Store Connect, closed testing ≥ 12 tester × 14 ngày.
