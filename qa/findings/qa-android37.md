# QA-100 — phiên A `qa-android37` (Android 16/API 37, emulator-5554)

APK: `C:\Users\Admin\qa-tools\apk\sundaysort-qa-ece3819.apk` (release, code `dev`). Máy: AVD `Medium_Phone_API_37.0`
(Google Play image, 1080×2400 @420). Hồ sơ: `api37_phone` = mặc định · `api37_320dp` = `wm density 540` ·
`api37_tablet` = `wm size 1600x2560` + `wm density 320`. Runner: `qa/tools/run_persona.py`. Bằng chứng:
`qa-runs/android37/<id>/` (gitignore) — `result.json`, ảnh từng màn, `logcat.txt`, `meminfo.txt`.

## Cách runner kiểm số (oracle)
Python đọc `backup.json` trong file persona, tự tính (không lấy từ app): số khoản/chuyến/ảnh (màn xem trước khi khôi
phục), "N entries to sort" (categoryId null), tuần này In/Out (scope work, thứ Hai 00:00 giờ máy), Reports năm thuế:
Income, Expenses (trừ nhóm chi phí xe khi dùng mileage rate; persona có chuyến thì chỉ kiểm ≥ phần không tính dặm),
"Personal entries are excluded". Lệch giờ múi lấy từ chính máy (`TZ=<zone> date -d @ts +%z`).

## Ghi chú môi trường (không phải lỗi app)
- AVD API 37 Play image: `cmd time_zone_detector suggest_manual_time_zone` và `cmd time_detector suggest_manual_time`
  bị SecurityException (shell thiếu `SUGGEST_MANUAL_TIME_AND_ZONE`). Dùng: `service call alarm 3 s16 <zone>` (múi giờ),
  `settings put global auto_time 0` + `service call alarm 2 i64 <ms>` (giờ máy).
- Host chạy 6 emulator cùng lúc → CPU 100%, `uiautomator dump` 3–28 s, có lúc "Process system isn't responding" và
  uiautomator tự crash ("Timeout while connecting UiAutomation"). Runner: dump có timeout + thử lại, chỉ tính FATAL
  có `Process: com.phiotron.sundaysort`; ❌ do chờ UI ghi `kind=ui_timeout` và phải tái hiện tay trước khi gọi là lỗi app.
- Màn Quick capture có con trỏ nhấp nháy → không dump được; runner tìm nút Save theo dải màu trên ảnh chụp.
- Bàn phím số kiểu máy tính tiền (`calc.ts`): runner gõ số tiền theo xu ("12.34" → `1234`).

## Lỗi tìm được

### A37-1 🟡 Bàn phím số khi nhập tiền hiện phím "." nhưng app bỏ qua → gõ "7.5" thành £0.75, "120" thành £1.20
- **Persona:** P001 (UK, api37_phone). Tái hiện tay trên emulator-5554.
- **Bước:** Home → Expense → gõ `7` `.` `5` trên bàn phím số hệ thống → Save.
- **Kỳ vọng:** hoặc £7.50, hoặc bàn phím không có phím "." (người dùng hiểu ngay đây là kiểu máy tính tiền).
- **Thực tế:** £0.75 (dấu "." bị `sanitizeExpr` bỏ, chữ số dồn theo kiểu máy tính tiền). Số lớn trên màn có hiện £0.75
  nên người cẩn thận sẽ thấy; người gõ nhanh "120" cho khoản thu £120 sẽ lưu £1.20.
- **Bằng chứng:** `qa-runs/android37/P001/18-after-capture.png` (Out £13.09 = 12.34 + 0.75; In £1.20).
- **Nguyên nhân nghi:** `src/features/ocr/calc.ts:47` (`sanitizeExpr` chỉ giữ chữ số + toán tử) với
  `keyboardType="number-pad"` ở `src/app/capture.tsx:334` — Gboard number-pad vẫn có phím "," ".".

### A37-2 🟡 Xuất CSV rồi huỷ bảng chia sẻ → khoản vẫn bị đánh dấu "Exported on …"
- **Persona:** tay trên P010 (US). **Bước:** Settings → Export → CSV – all entries → Export 1 file → bảng chia sẻ hiện
  → Back (không chọn app nào) → mở một khoản trong kỳ.
- **Kỳ vọng:** chưa gửi file đi thì chưa "Exported" (hoặc chấp nhận giới hạn Android nhưng nói rõ là "file created").
- **Thực tế:** chi tiết khoản hiện "Exported on Tue 17 Nov"; Miles/Entries hiện nhãn Exported.
- **Nguyên nhân nghi:** `src/features/reports/ExportPanel.tsx:168` gọi `markExported` **trước** `Sharing.shareAsync`
  (dòng 174); Android không báo người dùng có chọn đích hay không.

### A37-3 🟡 Home "Recent" chỉ ghi thứ + giờ ("Sun 10:23") kể cả khoản từ nhiều tuần trước
- **Persona:** P010 (khoản mới nhất ngày Chủ nhật 25/10, hôm nay 17/11). Home → Recent: "Phone bill · Sun 10:23".
  Entries cùng khoản: "SUN 25 OCT".
- **Kỳ vọng:** khoản ngoài tuần này có ngày ("25 Oct 10:23").
- **Nguyên nhân nghi:** `src/features/entries/EntryRow.tsx:61` dùng `weekdayTime` (`src/features/entries/format.ts:47`).

### A37-4 🟡 Chữ 200% + 320dp: thẻ "N entries in this period aren't sorted yet" ở Reports bẻ chữ thành cột 1 từ
- **Persona:** P004 (US, `api37_320dp` = `wm density 540`, font_scale 2, 2.011 khoản).
- **Bước:** khôi phục → Reports (Year).
- **Kỳ vọng:** câu cảnh báo xuống dòng bình thường, nút "Sort now" xuống hàng dưới khi hẹp.
- **Thực tế:** chữ dồn vào cột hẹp giữa huy hiệu "99" và nút "Sort now": "ent / ries / in / this / per / iod …"; huy hiệu
  40×40 cắt "99+".
- **Bằng chứng:** `qa-runs/android37/P004/09-reports.png` (lượt đầu: ảnh `09-verify_numbers-timeout.png`).
- **Nguyên nhân nghi:** `src/app/(tabs)/reports.tsx:277-287` — hàng `flexDirection: 'row'` (huy hiệu cố định 40 px +
  `Txt flex: 1` + `Button`) không có `flexWrap`/minWidth như cách sửa B-34 ở Home.

### A37-5 🟡 Chữ 200% + 320dp: số tiền Income / Expenses / Profit ở Reports bị cắt mất bên phải
- **Persona:** P004. Reports → Year: màn hiện "Income $2,053,74", "Expenses $3,126,8", "Profit −$1,073,09" — phần
  còn lại tràn ra ngoài thẻ (cây a11y có đủ "$2,053,740.86" và khớp số tự tính).
- **Bằng chứng:** `qa-runs/android37/P004/09-reports.png`.
- **Nguyên nhân nghi:** `src/app/(tabs)/reports.tsx:515-525` `Row` — nhãn + `Txt v="amount" size={20}` cùng hàng,
  không `flexShrink`/`adjustsFontSizeToFit`/xuống dòng.

### A37-6 🟡 Home ghi "2004 entries to sort" không có dấu phân cách nghìn (chỗ khác ghi "2,011 entries")
- **Persona:** P004 (US, 2.011 khoản, 2.004 chưa phân loại). Home → thẻ "to sort".
- **Kỳ vọng:** "2,004 entries to sort" như hộp xác nhận khôi phục ("2,011 entries") và Reports.
- **Nguyên nhân nghi:** `src/i18n/en.ts:113` `toSort: '{count} entries to sort'` nhận số thô; nơi khác format trước khi
  truyền vào.

### A37-7 🟠 Chế độ tối: mọi nút `variant="sun"` chữ trùng màu nền (vàng trên vàng) — "Sort first", "End trip"…
- **APK:** 5ce0626 (lỗi có từ `809a2d9`, không phải hồi quy). **Persona:** P035 (UK, dark) + tái hiện tay.
- **Bước:** máy để chế độ tối → (1) Reports → Export → Export 1 file khi có khoản chưa sort → hộp "460 entries aren't
  sorted": nút phải chỉ là viên vàng trống (cây a11y: "Sort first"); (2) bắt đầu chuyến → Home: thẻ TRIP RUNNING, nút
  "End trip" trống chữ.
- **Kỳ vọng:** chữ tối trên nền vàng như theme sáng.
- **Bằng chứng:** `qa-runs/android37/P035/22-journey-year_end_export-timeout.png`,
  `qa-runs/android37/A37-7-export-sortfirst-dark.png`, `qa-runs/android37/A37-7-home-endtrip-dark.png`.
- **Nguyên nhân:** `src/ui/Button.tsx:17` `sun: { bg: 'sun', fg: 'primary' }`; theme tối `src/theme/tokens.ts:74,77`
  `primary` = `sun` = `#F5B841`. Cùng biến thể (theo mã): `backup.tsx:372,374`, `pro.tsx:196,250`, `rules.tsx:103`,
  `trip/[id].tsx:481,517`, `RuleOfferCard.tsx:28`, `ocr/ui.tsx:230`, `ExportPanel.tsx:409,413`, `(tabs)/index.tsx:256`.

### A37-8 🟡 Kiểm lại B-78 trên 5ce0626 (P004, 320dp + chữ 200%): Income/Expenses đã xuống dòng ✅, còn 2 chỗ
- **Profit** vẫn cắt: "−$1,073,09…" (`src/app/(tabs)/reports.tsx:314-318` — `adjustsFontSizeToFit numberOfLines={1}` nhưng
  `Txt` không có `flexShrink: 1` nên Android không co chữ).
- **"By tax form line"**: nhãn bẻ từng âm tiết ("Uns / orte / d ex / pen / ses"), số "$2,053,565…" cắt, huy hiệu
  "Sched…" tràn khỏi thẻ (`reports.tsx:494-` `LineRow`: nhãn `flex: 1` + số không co/không xuống dòng).
- **Bằng chứng:** `qa-runs/android37/B78-P004-reports-5ce0626.png`, `qa-runs/android37/B78-P004-taxlines-5ce0626.png`.

### A37-9 🟡 Chữ 200% + 320dp: "Expenses by category" cắt tên danh mục còn "…", "Eq..", "Ph.."; % tràn dưới nút "+"
- **APK:** 5ce0626. **Persona:** P025 (UK, 320dp, font 2). Reports → Year → cuộn tới "Expenses by category".
- **Kỳ vọng:** tên danh mục đọc được (xuống dòng khi hẹp, số tiền/% sang dòng dưới).
- **Bằng chứng:** `qa-runs/android37/A37-9-P025-expenses-by-category.png`.
- **Nguyên nhân nghi:** `src/features/reports/charts.tsx:39-49` — một hàng: tên `numberOfLines={1}` `flex: 1` + số tiền + %
  `minWidth: 44` không co → ở 200% tên còn 1–2 ký tự.

## Kiểm lại lỗi đã sửa (trên máy)
| Lỗi | Bản | Kết quả | Bằng chứng |
|---|---|---|---|
| B-61 dấu "." | 5ce0626 | ✅ "7.5" → £7.50 | P001, P004 journey |
| B-122 gõ sao hiểu vậy | 19daeae | ✅ "12.34"/"7.5"/"120" → £12.34/£7.50/£120.00 | P001 (19daeae) |
| B-62 hỏi sau bảng chia sẻ | 5ce0626, 19daeae | ✅ "Not sent" → không "Exported" | P033, P035 |
| B-70 chạm đúp Save | 5ce0626 | ✅ chỉ +1 khoản | P058, P059, P060 |
| B-77 Recent ghi ngày (A37-3) | 5ce0626 | ✅ "24 Oct 17:23" | P010 |
| B-79 dấu phẩy nghìn (A37-6) | 5ce0626 | ✅ "2,004 entries to sort" | P004 |
| B-90 nút sun ở theme tối (A37-7) | 19daeae | ✅ "Sort first", "End trip", "Sort now" đọc rõ | P035/22-unsorted-warning.png, recheck-19daeae/B90-home-endtrip-dark.png |
| B-78/B-110 Reports 320dp + 200% (A37-4/5/8/9) | 19daeae | ❌ còn: "By tax form line" bẻ chữ từng âm tiết ("Uns/orte/d ex/pen/ses"), huy hiệu "Sched…" cắt, "100.0%" và Mileage "0 mi" cắt, Profit xuống dòng giữa số "−$1,073,178 / .08". Income/Expenses và thẻ "entries aren't sorted" đã ổn | recheck-19daeae/B110-reports-1..8.png |

- **B-110 v2 (a3a1f6b, 19/11)** — P004 (2.011 khoản) chụp Reports từ trên xuống: 320dp + chữ 200% ✅ (thẻ "1620 entries … aren't
  sorted yet" xuống dòng, huy hiệu "99+" đủ, Income/Expenses/Profit một dòng không cắt, danh mục tên rồi số + %, "By tax form line"
  nhãn rồi số không bẻ âm tiết, nhãn "Schedule C" dưới tiêu đề, Mileage "0 mi" đủ); phone thường chữ 1.3 ✅ giữ bố cục 1 hàng cũ.
  Ảnh: `qa-runs/android37/recheck-a3a1f6b/320dp-font2-00..12.png`, `phone-font1.3-00..05.png`.

### A37-10 🟡 Reports: "1620 entries in this period aren't sorted yet" thiếu dấu phẩy nghìn (như B-79 ở Home)
- **APK:** a3a1f6b. **Persona:** P004. Thẻ cảnh báo đầu Reports, cả chữ 1.3 lẫn 2.0.
- **Nguyên nhân nghi:** `src/app/(tabs)/reports.tsx:285` truyền `report.unsortedCount` thô vào `t('reports.unsortedWarn', { count })`
  (`src/i18n/en.ts:452`) — chưa dùng `formatCount` như B-79.

### Kiểm lại trên 62d6558 (19/11, emulator-5554, phone 1080×2400, P004 khôi phục, chế độ tối)
Ảnh + text dump: `qa-runs/android37/recheck-62d6558/`.
| Lỗi | Kết quả | Bằng chứng |
|---|---|---|
| B-132 dấu phẩy nghìn | ✅ Reports "1,620 entries in this period aren't sorted yet"; hộp thoại Export "1,620 entries aren't sorted"; Home "2,004 entries to sort"; năm vẫn "Tax year 2026" (không thành 2,026). Sort (tuần này 10 khoản "0 of 10") và Miles (P004 không có chuyến) không có số ≥ 1.000 để kiểm | b132-reports-0, b90-export-sortfirst, b132-home-0, b132-sort*, b132-miles |
| B-90 nút sun, theme tối | ✅ chữ tối trên nền vàng, đọc rõ: "Sort first" (Export), "End trip" + "Add miles" (Home, chuyến đang chạy), "Try Pro free for 7 days" (Pro), "See Pro" (Auto-sort rules), "Choose backup folder", "Choose folder again" (thư mục sao lưu bị xoá + đồng hồ +4 ngày), "Save" (màn kết thúc chuyến) | b90-*.png, b90-home-endtrip.png, b137-end.png |
| B-90 — chưa chụp được | ⏭ "Subscribe now" + "Always" (gợi ý rule) chỉ hiện khi đang Pro/dùng thử → phải bấm Try free (không được bấm). ⏭ "Back up now" màu vàng chỉ hiện khi lỗi sao lưu không phải do thư mục (vd. hết chỗ); cả 3 dùng chung `Button variant="sun"` với các nút đã ✅ | — |
| B-137 bản đồ khi GPS chậm | ✅ Start trip lúc máy chưa có vị trí (sau reboot, `last location=null`) → "Finding GPS…" + hình vẽ dự phòng (b137-00s) → có fix → bản đồ OpenFreeMap hiện ở 10/30/60 s (b137-10s/30s/60s; lần 2: b137-repro-12s/30s/60s/80s); End trip → Save / Discard trip ổn. Lưu ý: emulator tự phát lại điểm geo cuối của phiên trước ~4 s sau khi app xin GPS, nên "Finding GPS…" chỉ kéo dài < 10 s chứ không đủ 18 s | b137-*.png |

### A37-11 🟡 (nghi, chỉ thấy 1/3 lần, emulator) Chuyến GPS ghi 0.0 mi dù nhận đủ fix khi điểm đầu tiên ở rất xa
- **APK:** 62d6558. **Cách tái hiện (lần 1):** reboot emulator (geo cuối của emulator là từ phiên chạy trước) → Start trip → 18 s sau
  gửi `adb emu geo fix -74.006 40.7128+i·0.0016 10 8 58` mỗi 6 s (10 điểm, rồi thêm 12 điểm) → `dumpsys location` cho thấy fused
  nhận đủ ~30 fix ở NY, task `sundaysort.trip-gps` chạy mỗi 5 s, nhưng màn chuyến đứng **0.0 mi**, chấm trên bản đồ không di chuyển
  suốt 5 phút; lưu "Trip saved · 0.0 mi" (b137-60s, b137-more-fixes, b137-end).
- **Đối chứng:** chuyến ngay sau (GPS đã ấm, điểm gửi liền) 1.9 mi ✅; lần dựng lại theo đúng kịch bản (reboot → 18 s) 1.8 mi ✅
  (b137-repro-*). Khác biệt: lần 1 điểm geo phát lại là điểm cuối của phiên trước (có thể ở thành phố khác, vd. London từ persona UK).
- **Nguyên nhân nghi:** `src/domain/mileage.ts:131-138` `walkTrack` lấy fix đầu làm mốc; mọi fix sau có `d/dt > MAX_SPEED_MPS`
  (56 m/s) bị coi là glitch và **giữ nguyên mốc** → nếu fix đầu sai xa (hàng nghìn km) thì cả chuyến bị loại tới khi `dt` đủ lớn.
  Fix sai vài km sẽ tự hồi sau ~d/56 giây nhưng cộng luôn quãng "nhảy" đó vào. Trên máy thật ít gặp (fix cũ hơn `startedAt` đã bị
  lọc ở `backgroundTask.ts:60`), nên chỉ ghi 🟡 để dev xem có nên đổi mốc khi nhiều fix liên tiếp cùng "glitch".

## Kết quả persona (`qa-runs/android37/summary.json`)
- 60 persona API 37: **56 đạt** (mọi bước ✅/⏭), **2 ❌ do runner** (P083, P084 weird_text: trình đọc XML bỏ qua
  `content-desc` bọc nháy đơn khi ghi chú có dấu `"` — app lưu ghi chú nguyên văn, đã kiểm lại ở P085 sau khi sửa runner: 10/10 ✅),
  **2 không chạy** (P097, P100 — Phương 19/11 bảo không cần chạy hết; kiểu "lịch sử lớn" đã có P096 20.011 khoản ✅).
- Bản: 44 persona trên 5ce0626, 14 trên 19daeae (`apk` trong từng result.json).
- ⏭: khôi phục ở P001/P046/P047/P050 (persona không có khoản); App lock P087–P089 (emulator chưa đặt khoá màn hình + vân tay —
  không tự đổi cài đặt bảo mật; App lock đã được phiên E thử trên A13 thật).
- Số đo (median, emulator `-gpu host`, host bận): mở nguội 2,3 s (max 11,8 s khi host quá tải); khôi phục 5,4 s (2.011 khoản),
  max 16,5 s; PSS 200 MB (max 324 MB, 20.011 khoản).
- Hạ tầng (không phải lỗi app): swiftshader làm dump 15–60 s; host 6 emulator → "System UI isn't responding"; nhảy giờ máy
  vài tuần làm System UI treo → runner tự bấm Wait và reboot sau persona đổi giờ.
