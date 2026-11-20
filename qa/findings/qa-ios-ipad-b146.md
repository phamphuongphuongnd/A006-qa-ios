# [A006-sundaysort] QA iOS — B-146 iPad, B-147 SE XXXL, bản free (2026-11-20)

- **Bản:** dev `049dff0` + kịch bản nhánh `ios-ipad-run` (`3291068`). Không sửa code app.
- **Run:** [44672153434](https://github.com/phamphuongphuongnd/A006-qa-ios/actions/runs/44672153434) trên A006-qa-ios (Public, Phương duyệt). Simulator iOS 26.5, Maestro 2.12.1.
- **Bằng chứng:**
  - Đầy đủ: `qa-runs/ios/44672153434/` (gitignore).
  - Ảnh chính: `qa/findings/ios-ipad-b146/`.
  - Đo lề cột: `python -I qa/ios/ipad_column.py <shots>`.

| persona | máy | cỡ chữ | chạy được |
|---|---|---|---|
| P001-ipad | iPad Pro 13" (M5) | large, UK, light | 01, 04–09, 18, 20–22. Hết giờ 25′ giữa bước 23, nên **23 và 24 không chạy** |
| P002-ipad | iPad Pro 13" (M5) | XXXL, US, dark | **0 bước**: simulator chết sau khi P001 bị ngắt (`DeviceUnreachableException`), lỗi hạ tầng |
| P052 | iPhone SE 3 | XXXL, US | 01, 04–07, 20–23 |
| P052-xxl | iPhone SE 3 | XXL, US | 01, 04–07, 20–23 |
| P091 | iPhone SE 3 | AX-L, UK | 01, 04–07, 20–23 |
| P077 | iPhone 16 Pro Max | XXXL, UK, dark | 01, 04–07, 20–23 |

## Kết quả từng mục

### B-146 — iPad 13" dọc (chỉ có P001-ipad: sáng, chữ chuẩn)

| Mục | KQ | Bằng chứng |
|---|---|---|
| Onboarding qua bước 01 | ✅ | 01a–01g. Sheet "What's the difference?" rộng 640, ở giữa: `01c2` |
| Mọi màn nằm trong cột ~640 | ✅ | `ipad_column.py`: mọi màn thường "flat margins". Vệt chỉ ở bàn phím, page sheet hệ thống và tay nắm góc phải dưới |
| Page sheet (detail, split, add trip) | ✅ | Khung page sheet là của iOS (~950 pt), nội dung trong cột 640: `05a`, `07a`, `08a` |
| Quick add (fullScreenModal) + bàn phím iPad | ✅ | `04a`: ô ghi chú, Photo/Work/Note và Save nằm trong cột, trên bàn phím. Lưu được (`04b`) |
| Menu ⋯ ở entry detail mở ngay dưới nút | ❌ **BUG** | `05b`: menu lệch lên trên và sang trái, đè lên tiêu đề và số tiền, không nằm dưới nút. Xem **B-150** |
| Sheet / Dialog / Snackbar ở giữa | ✅ | Sheet Export / New rule / Recurring rộng 640 (`21a`, `22b`, `22e`). Dialog Delete rộng ~480, ở giữa (`18a`). Snackbar rộng ~616, ở giữa (`04b`) |
| Trip map | ⏭ **chưa kiểm** | Bước 24 không chạy (hết giờ). Bước 08 (thêm chuyến tay) qua |
| Sort Edit/Split trên iPad | ⏭ chưa kiểm | Bước 23 iPad không chạy. Bước 06/07 (sort + split) qua |
| iPad dark + chữ to (P002-ipad) | ⏭ chưa kiểm | Simulator chết |

Ghi chú nhỏ (không phải bug): ở màn Split (page sheet), thanh dưới "Left to assign / Split" có nền trắng rộng bằng cột 640, nên trông như một dải trắng trên nền page sheet (`07a`).

### B-147 — iPhone SE XXXL và hồi quy

| Mục | KQ | Bằng chứng |
|---|---|---|
| SE XXXL: Sort cuộn được tới chip danh mục | ✅ | `P052_23b_chips`: Fuel, Vehicle repairs, More… và Edit/Split/Merge/Skip đều thấy |
| SE XXXL: Edit, đang gõ số vẫn tới nút Done | ✅ | `P052_23d`, `P091_23d`: Done ở trên bàn phím |
| SE XXXL: Split, đang gõ số vẫn tới nút "Split & sort" | ❌ **BUG** | `P052_23h`: nút ở y 447–503 pt, nằm dưới bàn phím số (mép trên ~431 pt). Màn không tự cuộn tới nút, và bàn phím số iOS không có phím Return. Xem **B-151** |
| SE AX-L (P091) | ❌ cùng B-151 | `P091_23h`: "Left to assign" bị cắt, nút Split & sort dưới bàn phím |
| Pro Max XXXL (P077) | ✅ | `P077_23h`: "Split & sort" nằm trên bàn phím. 01, 04–07 qua |
| SE XXL (P052-xxl) | ⚠️ **nghi bug** | `06a`: Sort vẫn ở bố cục cũ (không cuộn). Vùng cuộn trong thẻ chỉ ~95 pt, nhãn bị cắt "E… / Mer… / S…". Bấm chip Fuel lại mở Edit (`06_after_fuel_tap`). Xem **B-152** |

### Bản free (PRO_PAUSED)

| Mục | KQ | Bằng chứng |
|---|---|---|
| Không có chữ PRO/Pro/Trial/Upgrade/Subscribe (Home + 6 trang Settings) | ✅ | Đúng trên 5 persona (P001-ipad, P052, P052-xxl, P091, P077), ảnh 20a–20c |
| Automatic trips không có "Start when charging" | ✅ | Ảnh iPad chụp trọn trang (`20d`): không có. Kịch bản báo fail vì regex khớp nhầm "Not charging", là pin trên thanh trạng thái iOS |
| Export có 2 nhóm | ✅ | US: "Raw data" + "For your accountant". UK: "Raw data" + "For your accountant & MTD" (`21a`, `P052_21b`) |
| Xuất PDF/MTD/xlsx | ✅ phần lớn | P052 (US): ra share sheet. P001-ipad (UK, 4–5 file): ra zip 39 KB trong popover share (ảnh step-035). P077 (UK, 120 bản ghi, 5 file): sau 60 s vẫn "Preparing your files…" (PDF qua WebKit trên GPU phần mềm). Chưa đủ để gọi là bug, cần chạy lại với hạn dài hơn |
| Rules (trước bị khoá Pro) | ✅ | Thêm luật được, và bản ghi mới tự xếp "Saved · Fuel (auto-sorted)" (`P077_22h`). Qua trên P052, P052-xxl, P077, P001-ipad |
| Recurring entries (trước bị khoá Pro) | ✅ | Tạo được trên P052, P052-xxl, P077, P001-ipad (22d–22g) |

## Bug cho phiên sửa (mã đề xuất — B-149 đã dùng cho "Merge stops"; phiên điều phối cấp chính thức)

**B-150 — iPad: menu ⋯ ở entry detail lệch khỏi nút (B-146 chưa đạt).**
- `src/app/entry/[id].tsx:99-104` đo vị trí nút bằng `measureInWindow`.
- Menu được vẽ trong `<Modal transparent>` phủ toàn màn hình.
- Trong page sheet (`presentation: 'modal'`), toạ độ đo được tính theo gốc của sheet, không theo màn hình. Nên menu lệch đúng bằng gốc sheet: khoảng 42 pt lên trên và khoảng 48 pt sang trái.
- Số đo khớp:
  - nút ở x 783–829 px, y 66–112 px;
  - menu có mép phải ở 780 px, mép trên ở 76 px.
- Trên iPhone cũng lệch lên khoảng 60 pt: menu che chính nút ⋯ (`P077_05b`), giống trước B-146.
- Hướng sửa (gợi ý): vẽ menu là View tuyệt đối bên trong sheet thay vì Modal. Hoặc đo cả gốc của sheet rồi cộng bù.

**B-151 — iPhone SE XXXL / AX-L: ở Split trên thẻ Sort, nút "Split & sort" bị bàn phím số che.**
- Bố cục cuộn iOS (`sortScrolls`) cho thẻ cao cố định: `cardHeight = 360 × min(fs, 1.6)`, tức khoảng 486 pt ở XXXL và 576 pt ở AX-L. Phần màn còn lại trên bàn phím số chỉ khoảng 410 pt.
- Khi bàn phím mở:
  - `sort.tsx:57-61` cuộn màn tới **đầu** thẻ;
  - `SortEntryCard.keepFormInView` cuộn bên trong thẻ tới **dòng đang gõ** (`focusY`), không phải tới cuối.
- Kết quả: "Left to assign" và "Split & sort" ở đáy thẻ nằm dưới bàn phím.
- Người dùng phải chạm ra ngoài để đóng bàn phím, hoặc kéo ở lề 16 pt để cuộn màn ngoài. Chưa kiểm được việc kéo tay có lộ nút không.
- Hướng sửa (gợi ý): khi bàn phím mở trong bố cục cuộn, cho thẻ cao bằng phần còn thấy; hoặc cuộn màn ngoài tới `cardY + cardHeight − viewport`.

**B-152 (nghi) — iPhone SE XXL: Sort chưa vào bố cục cuộn.**
- 667/1.235 ≈ 540 ≥ `SORT_SCROLL_BELOW` (520), nên vẫn là bố cục ép. Thẻ chỉ còn vùng cuộn khoảng 95 pt; hàng hành động bị cắt chữ "E… / Mer… / S…".
- Maestro bấm "Fuel" thì mở Edit. Có thể chip nằm sát hoặc dưới hàng hành động cố định.
- Chưa phải hồi quy do B-147 (trước B-147 cũng thế), nhưng đây đúng là triệu chứng của B-147 ở một cỡ chữ thấp hơn.
- Hướng sửa (gợi ý): trên iOS hạ ngưỡng, hoặc dùng bố cục cuộn từ XXL.

## Lỗi kịch bản (không phải lỗi app), sửa trước lần chạy sau

| Bước | Lỗi | Cách sửa |
|---|---|---|
| 20 | `[Cc]harging` khớp "Not charging" của thanh trạng thái iOS | dùng regex `(?i).*when charging.*` |
| 21 iPad, 09 iPad | Popover share trên iPad không có trong cây Maestro | trên iPad bỏ chờ share, hoặc chờ thứ khác |
| 21 P091 | Ở AX-L có thẻ cảnh báo MTD nên "Raw data" ở dưới màn | `scrollUntilVisible` trước `assertVisible` |
| 21 P077 | 60 s chưa đủ cho 5 file (PDF) | 120 s |
| 22 P091 | Bấm "Sort as" ở AX-L chưa mở danh sách (ảnh step-027) | cuộn hoặc bấm đúng ô "Pick a category" |
| 23 | Thẻ đầu hàng là bản ghi fixture, không phải bản ghi vừa nhập, nên `AMOUNT − 2` không khớp. Nút bị bàn phím che nhưng Maestro vẫn coi là "visible", nên bấm trúng phím số | dùng tổng của thẻ hiện ra. Thêm bước đóng bàn phím rồi so ảnh |
| 23 xxl | "Split" ở trên, `scrollUntilVisible` lại cuộn xuống | cuộn lên |
| iPad | 25′/persona không đủ cho 12 bước | tăng lên 40′, hoặc chia đôi danh sách bước |

Đang chờ: chạy lại iPad 23 + 24 (trip map) và P002-ipad (dark, XXXL) sau khi sửa kịch bản. Cần Phương duyệt trước khi push hoặc chạy.

## Chuẩn bị chạy lại (commit trên `ios-ipad-run`, CHƯA push/chạy)

Đã sửa kịch bản theo bảng trên:
- **Bước 20:** regex `when charging`.
- **Bước 09 và 21:** trên iPad chờ và đóng "dismiss popup"; hạn chờ 90 s (09) và 150 s (21). Bước 21 cuộn tới "Raw data" trước khi kiểm.
- **Bước 22:** cuộn ô chọn danh mục vào giữa màn rồi mới bấm, bấm lại nếu màn không đổi.
- **Bước 23:** không còn gõ số phải cộng cho khớp. Chỉ focus ô số (bàn phím bật) rồi bấm Done / "Split & sort". Nút bị che thì cú bấm rơi vào bàn phím, bước fail, và đó là bằng chứng của B-151. Tìm Edit/Split theo cả hai chiều cuộn.
- **Bước 24:** chọn chuyến mới nhất, không lọc "GPS".
- **`run-lane.sh`:**
  - persona bị ngắt vì hết giờ (mã 142) thì khởi động lại simulator và cài lại driver;
  - persona mà không bước nào qua, kèm lỗi `DeviceUnreachable`, thì được chạy lại một lần.
- **Workflow:** làn iPad có hạn 2700 s/persona (`IPAD_PERSONA_TIMEOUT`).
- **`collect_result.py`:** đã biết các bước 20–24.

Khi điều phối báo `ios-fixes` và `b154-mileage-money` đã vào dev:
1. Ghép dev vào `ios-ipad-run`.
2. Hỏi Phương bằng popup. Repo A006-qa-ios nay là **Private**, macOS tính ×10 phút, chỉ còn khoảng 30 phút/tháng, nên phải hỏi có tạm Public không.
3. Push lên `qa-public` rồi chạy.

Gộp luôn phần dở của phiên QA-100 iOS, gồm bản sửa kịch bản ở `053535f` (đã có sẵn trong nhánh này):
- 02: bấm Restore cuối;
- 09: Export ở chữ AX-L;
- 19: Notifications;
- P026: lần trước bấm "Get started" một lần mà không sang màn tiếp.

```
gh workflow run qa-ios.yml -R phamphuongphuongnd/A006-qa-ios --ref ios-ipad-run   -f personas="P052,P091,P052-xxl,P077,P026" -f ipad_personas="P001-ipad,P002-ipad"   -f flows="02,04,05,06,07,09,19,20,21,22,23" -f ipad_flows="04,05,06,07,09,20,21,22,23,24" -f test_budget_min=170
```

Ước tính khoảng 2 giờ 40 phút: build ~15′, iPhone 5 × ~16′, iPad 2 × ~30′. Lần chạy này phủ:
- B-150: ảnh 05b trên iPad và iPhone;
- B-151: bước 23 trên SE XXXL và AX-L;
- B-152: bước 06/23 trên SE XXL;
- iPad: trip map (24), Sort Edit/Split (23), persona dark + chữ to (P002-ipad);
- P077: export 5 file (21);
- P091: bước 09 AX-L và các bước 21, 22;
- 02 Restore: P052 (fixture 131 khoản);
- 19 Notifications: cả 5 iPhone;
- P026: onboarding 01 trên Pro Max.
