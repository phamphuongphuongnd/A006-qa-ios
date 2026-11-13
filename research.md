# A006-sundaysort — Khảo sát lại (2026-11-13)

> Kết quả khảo sát lại file ý tưởng `Y-tuong-so-thu-chi-tai-xe-van-UK.md` + đánh giá đối thủ + rà code thật.
> Quyết định và kế hoạch làm tiếp: `PLAN-v2.md`.

## 1. Nguồn đã đọc
- Google Play (US, sắp "Most relevant"): **MileIQ 1.000 · Everlance 1.000 · Hurdlr 1.000 · Cash Book (UK) 860** đánh giá.
  Mỗi app: đếm theo chủ đề trên toàn bộ + đọc nguyên văn mọi đánh giá 2023–2026 và mẫu từng nhóm.
- gov.uk (MTD for Income Tax – digital records, ngưỡng), Monzo / FreeAgent (MTD miễn phí), trang các hãng bridging software.
- **Chưa đọc:** 5 luồng Reddit trong file ý tưởng (reddit.com bị chặn với trình duyệt của Claude) → P0 đọc bằng Claude in Chrome.
- **Chưa dùng thử app đối thủ** → P0 trên trình giả lập `Medium_Phone_API_37.0` (Phương đăng nhập Google / đăng ký app).

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
| Xin thêm (Cash Book): khoản lặp lại, máy tính trong ô số tiền, nhắc ghi hằng ngày, nhiều ảnh/khoản | ❌ chưa có |

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
