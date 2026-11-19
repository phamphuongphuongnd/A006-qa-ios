# QA-100 — phiên G: máy thật thương hiệu qua Firebase Test Lab

Project Firebase `sundaysort-qa-107cd` (gói Spark, tài khoản Phạm Thu Phương), gcloud 593.0.0 tại
`C:\Users\Admin\qa-tools\google-cloud-sdk\` (zip chính thức; MD5 khớp metadata bucket `cloud-sdk-release`, SHA-256
`8fbdc9d6…a53c` — trang cài đặt không công bố SHA-256 cho bản zip Windows). APK `sundaysort-qa-97ceb60-all.apk`
(dev 97ceb60, 4 ABI, ký debug). Robo script: `qa/firebase/make_robo.py` → `robo-{uk,us}-full.json`.
Bằng chứng: `qa-runs/firebase/<model>-<api>/` (ảnh `artifacts/`, `video.mp4`, `logcat`, `actions.json`, `sheet.png`),
số liệu: `qa-runs/firebase/summary.json` (tạo bằng `qa/firebase/collect.py`). Tất cả gitignore.

## Ma trận đã chạy (2026-11-18, kết quả thật, tải về đủ)

| Máy | Android / giao diện hãng | Kết quả | Khởi động | RAM đỉnh | Mạng |
|---|---|---|---|---|---|
| Samsung Galaxy S26 (m1q) | 16 / One UI | ✅ script tới Settings, Robo 226 thao tác / 485 s, 0 crash / 0 ANR | 475 ms | 303 MB | 0 B |
| Google Pixel 11 (cubs) | 17 / Pixel, **dark mode** | ✅ như trên, 226 thao tác / 478 s, 0 crash / 0 ANR | 399 ms | 358 MB | 0 B |
| Samsung Galaxy S9 (starlte) | 10 / One UI (đời cũ) | ✅ 132 thao tác / 484 s, 0 crash / 0 ANR | 1,60 s | 361 MB | 0 B |
| OPPO A38 (OP5759L1) | 14 / ColorOS, 720p | ✅ 64 thao tác / 284 s, 0 crash / 0 ANR | 1,97 s | 196 MB | — |
| Xiaomi 14 (houji) | 15 / **HyperOS 2.0** | ⚠ app cài + mở + vẽ màn chào đúng, 0 crash; **thao tác ⏭**: HyperOS chặn bơm sự kiện (`InputDispatcher: Asynchronous input event injection failed`) — máy Test Lab không bật "USB debugging (Security settings)" | 417 ms | 165 MB | 0 B |
| Máy ảo Small Phone (Arm) | 8.0 (API 26 — thấp nhất Firebase có) | ✅ 198 thao tác, 0 crash / 0 ANR | 644 ms | — | — |
| Máy ảo Medium Phone (Arm) | 14 | ✅ Robo tự do 129 thao tác, 0 crash | 1,17 s | — | — |
| Máy ảo Medium Tablet (Arm) 1600×2560 | 15 | ✅ 164 thao tác, 0 crash; bố cục tablet ổn; script dừng ở "Backup & restore" (nhãn sai trong script) | 915 ms | — | — |
| Máy ảo Medium Phone 16K page size (Arm) | **17 (API 37)** | ✅ **cả đường đi + khôi phục P096**, 171 thao tác, 0 crash / 0 ANR | 750 ms | — | — |

- ⏭ **Android 7.0 (API 24/25):** Firebase không có máy ảo/máy thật nào dưới API 26.
- **Khôi phục P096** — ✅ trên máy ảo Android 17 16K (`MediumPhone_ps16k.arm-37/artifacts/19–30.png`): Settings →
  Backup & restore → Restore from backup → DocumentsUI Downloads → `P096.sundaysort` → xem trước "20,011 entries · 0 trips ·
  1 photo" → "Replace this phone's data" → hộp thoại "Replace everything…" → Restore → xong trong ~3 s (actions.json:
  bấm Restore giây 146, giây 149 đã về Settings) → Home "8,081 entries to sort", Entries, Reports (Income $109,343.35 /
  Expenses $1,199,840.34), Sort/List view/Merge chạy với dữ liệu lớn, 0 crash. Số liệu chưa đối chiếu oracle của persona.
  ⏭ trên 5 máy thật hôm nay: script lúc đó bấm "Backup & restore, Never" (nhãn thật là "Backup & restore") và không cuộn
  → dừng ở Settings. Đã sửa (`make_robo.py`: 2 lần vuốt + nhãn đúng) — dùng cho lượt máy thật ngày mai.
- Đường đi script trên 4 máy thật + máy ảo: Get started → United Kingdom/United States → Continue ×2 → Looks good →
  **Continue free** → Not now → Entries/Sort/Miles/Reports/Home → New expense → gõ 1250 → **Save ("Saved · £12.50
  expense")** → Settings. Sau đó Robo tự khám phá (Settings, Categories, Trips, Pro, Notifications, Export…).
- **Mạng 0 byte gửi/nhận** trong suốt phiên (số đo Test Lab) → khớp "No Sunday Sort servers".
- Robo đã tự bấm "Try Pro free for 7 days" (S26, Pixel 11, S9) và "Subscribe now" ×2 (Pixel 11) — app chưa lên Play,
  máy không có tài khoản thanh toán → không có giao dịch. Robo script dạng có `id/priority/contextDescriptor`,
  WAIT_FOR_ELEMENT, TAKE_SCREENSHOT gây "Infrastructure error" ở Test Lab (5 lượt) → dùng dạng danh sách thao tác đơn giản,
  nên không chặn được nút Pro bằng ELEMENT_IGNORED.

## Lượt 2 — regression APK `19daeae` (2026-11-19, bản QA-100 cuối, gồm B-104 + B-122)

Script `robo-{uk,us}-full.json` thêm bước Settings → Sunday Sort Pro → "Try Pro free for 7 days" → Back (kiểm B-104;
dùng thử nội bộ, không qua store). Bằng chứng: `qa-runs/firebase/r2-19daeae/<model>-<api>/`, số liệu trong
`summary.json` khoá `r2-19daeae/…`.

| Máy | Kết quả | B-104 | Khôi phục P096 | Khởi động | RAM đỉnh | Mạng |
|---|---|---|---|---|---|---|
| Galaxy S26 (A16) | ✅ 254 thao tác, 0 crash/ANR/JS | ✅ "Trial · 7 days left", ends 25 Nov (`18–21.png`) | ⏭ script vuốt quá hàng Backup (vuốt 1 lần đã thấy, lần 2 đẩy qua — `22–23.png`) | 420 ms | 375 MB | 0 B |
| Galaxy Z Fold6 (A14, màn gập — thay Xiaomi) | ✅ 149 thao tác, 0 crash/ANR/JS, **đủ 33 bước** | ✅ (`19–20.png`) | ✅ **máy thật**: Downloads → P096 → xem trước "20,011 entries · 0 trips · 1 photo" → xác nhận → Home "8,081 entries to sort", Reports Income $109,343.35 / Profit −$1,090,496.99 (`24–35.png`) | 821 ms | 410 MB | 0 B |
| Pixel 11 (A17, dark) | ✅ (lần 1 lỗi hạ tầng Test Lab, lần 2 chạy đủ) 171 thao tác, 0 crash/ANR/JS, **đủ 33 bước** | ✅ (`19–20.png`) | ✅ máy thật, số liệu giống Fold6 (`29–33.png`) | 338 ms | 453 MB | 0 B |
| Galaxy S9 (A10) | ✅ 143 thao tác, 0 crash/ANR/JS | ✅ chạy tới bước dùng thử | ⏭ như S26 (vuốt quá) | 1,51 s | 511 MB | 0 B |
| OPPO A38 (A14, ColorOS) | ✅ (lần 1 lỗi hạ tầng Test Lab, lần 2 chạy đủ) 119 thao tác, 0 crash/ANR/JS | ✅ (`20–22.png`) | ⏭ trình chọn file ColorOS gọi thư mục là "Download" (không "s") → script không khớp (`27.png`); tới được Backup & restore → Restore from backup → trình chọn | 2,26 s | 199 MB | — |
| Máy ảo Android 8.0 | ✅ 195 thao tác, 0 crash; "Saved · $1,250.00 expense" | ⏭ nút "Try Pro free" nằm dưới màn 720×1280 (phải cuộn), script dừng | ⏭ | 665 ms | — | — |
| Máy ảo Android 17 16K | ✅ đủ 33 bước, 0 crash | ✅ | ✅ | 1,09 s | — | — |

- **B-104 ✅ đã sửa** trên S26, Fold6, Pixel 11, máy ảo A17: dùng thử mới bắt đầu hiện "Trial · 7 days left",
  thanh tiến độ không âm; Settings "Trial · 7 days left"; Home chip "Trial · 7 days left".
- **B-122 ✅**: gõ 1250 → "£1,250.00"/"$1,250.00", "Saved · £1,250.00 expense"; bàn phím số có dấu "." trên S26, S9,
  máy ảo A8/A17.
- Khôi phục 20.000 khoản: giống hệt nhau trên 2 máy thật + máy ảo (8,081 to sort, Income $109,343.35, Expenses
  $1,199,840.34) → nhất quán giữa thiết bị. Chưa đối chiếu oracle persona P096 (việc của phiên chạy persona).
- RAM đỉnh lượt 2 cao hơn lượt 1 (S9 511 MB so với 361 MB) vì Robo đi nhiều màn hơn / dữ liệu lớn sau khi khôi phục;
  không có OOM / ANR. Ghi để theo dõi, không tính lỗi.

## Lỗi

### 🟡 F-1 — "Trial · 8 days left" ngay sau khi bắt đầu dùng thử 7 ngày — ✅ đã sửa (B-104, xác nhận lượt 2 trên 19daeae)
- Máy: Galaxy S26 (Android 16) ảnh `m1q-36/artifacts/36.png`; Pixel 11 (Android 17) `cubs-37/artifacts/21.png`, `22.png`;
  máy ảo Android 17 16K `MediumPhone_ps16k.arm-37/artifacts/44.png`, `45.png` — tái hiện 3/3 lần bấm.
- Bước: Settings → Sunday Sort Pro → "Try Pro free for 7 days".
- Kỳ vọng: "Trial · 7 days left" (snack "Pro trial started · 7 days", "Your trial ends on 24 Nov" — bắt đầu 17 Nov 21:17).
- Thực tế: nhãn "Trial · 8 days left" (cả 2 máy); thanh tiến độ tính `(7 − 8) / 7` = âm. Tự đúng lại sau ≤ 1 phút.
- Nguyên nhân gốc (đọc code): `usePro()` dùng `useNow(60_000)` — `now` cũ tới 60 s — `src/state/pro.ts:14`; `startTrial`
  ghi `trialStartedAt = Date.now()` mới hơn (`src/db/proRepo.ts:48`) → `Math.ceil((trialEndsAt − now) / DAY_MS)` = 8 ở
  `src/domain/pro.ts:59`; tiến độ `src/app/pro.tsx:191`. Gợi ý: kẹp `daysLeft ≤ TRIAL_DAYS` hoặc dùng
  `max(now, trialStartedAt)`; Home badge cũng dùng chung (`src/app/(tabs)/index.tsx:73`).

### 🟡 F-2 (= B-126) — Pixel 11 thật: ô số tiền mở Gboard chữ (QWERTY) thay vì bàn phím số — tái hiện 2/2 — ✅ đã sửa
- **Kiểm lại 2026-11-19, APK dc84207 (commit sửa 429b02b: `inputMode="decimal"`, `autoCapitalize="none"`,
  `autoCorrect={false}`, `autoComplete="off"`), Pixel 11 thật, script `robo-us-keyboard.json`, matrix-3d94eks0jsst6
  SUCCESS:** New expense → Gboard **bàn phím số** (có "," và ".") (`b126-dc84207/cubs-37/artifacts/8–11.png`); gõ "7,7"
  → "$7.70" → Save → "Saved · $7.70 expense", Entries −$7.70 (`12–14.png`). `dumpsys input_method` (logcat, dòng Robo
  "ADB shell command dumpsys input_method … finished"): ô đang focus `inputType=0x282002` (NUMBER 0x2 | DECIMAL 0x2000 |
  0x80000 | 0x200000), `imeOptions=0x6` (DONE), `mInputShown=true`. Ghi chú: 0x80000/0x200000 là cờ nhóm chữ vẫn còn
  trên ô số nhưng Gboard Pixel 11 nay hiện bàn phím số.
- Máy: Pixel 11 (Android 17, Gboard) — lượt 1 bản 97ceb60 (`number-pad`): `cubs-37/artifacts/12–14.png`; lượt 2 bản
  19daeae (`decimal-pad`, B-122): `r2-19daeae/cubs-37/artifacts/13–14.png` — con trỏ ở ô số tiền ("$1,250.00|") mà
  bàn phím vẫn QWERTY, số chỉ có ở hàng gợi ý.
- Đối chứng cùng lượt: máy ảo Android 17 16K (Gboard) bàn phím số (`r2-19daeae/kb-compare.png`); S26/S9 (Samsung
  Keyboard, logcat `inputType=0x2`), OPPO, Fold6, máy ảo A8/A14/A15 đều bàn phím số.
- Kỳ vọng: bàn phím số như các máy khác. Thực tế: người dùng Pixel phải bấm "?123" mỗi lần nhập tiền (vẫn nhập được).
- Nguyên nhân gốc nghi ngờ: `TextInput` ẩn với `caretHidden` + `contextMenuHidden` + `keyboardType` số
  (`src/app/capture.tsx:480-495`) — trên Gboard của Pixel 11 (bản Gboard/Pixel khác máy ảo) bị bỏ qua kiểu bàn phím.
  Chưa xác định được; chỉ thấy trên đúng 1 mẫu máy thật. Đề xuất thử thêm `inputMode="decimal"` và kiểm trên Pixel thật
  nếu có; Test Lab không cho đọc phiên bản Gboard trong logcat.

### B-126 v2 — mọi ô số (commit c0e9e5b `NUMERIC_INPUT`), APK 0bf4283, Pixel 11 thật — ✅ bàn phím số ở cả 4 ô
- 2026-11-19, `robo-uk-keyboard2.json`, matrix-lkivf2n8lfsaa SUCCESS, ảnh `numeric-0bf4283/cubs-37/artifacts/`.
- `dumpsys input_method` (logcat Robo) từng ô đang focus — tất cả `inputType=0x282002` (NUMBER|DECIMAL), Gboard số:
  | Ô | imeOptions | Ảnh |
  |---|---|---|
  | Ghi nhanh (capture) | 0x6 | `10.png` |
  | Sửa khoản → ô số tiền (`entry/[id].tsx`) | 0x8000006 | `15.png` |
  | Thẻ Sort → Edit → Amount (`SortEntryCard.tsx`) | 0x8000006 | `19.png` |
  | Settings → Mileage rates → ô "First 10,000 mi in a tax year" (`Field`) | 0x4000006 | `22–23.png` |
- ⏭ chưa kiểm: ô tỷ giá đổi vùng (settings.tsx:448), Split các phần, phí đỗ xe (ParkingField) — script không tới.

### 🟠 F-3 — Thẻ Sort → Edit → chạm Amount: thẻ tự cuộn xuống cuối, ô Amount, Note và nút Done ra khỏi tầm nhìn
- Máy: Pixel 11 thật (Android 17), APK 0bf4283 — `numeric-0bf4283/cubs-37/artifacts/17.png` (thẻ), `18.png` (Edit:
  Amount / Note / Date + Done), `19.png` (sau khi chạm Amount: bàn phím số hiện, nhưng thẻ đã cuộn tới "Date · MOST
  USED · Work/Personal" — Amount, Note, "Edit · Done" không thấy).
- Bước: Sort → thẻ khoản → Edit → chạm ô Amount.
- Kỳ vọng: ô đang gõ (Amount) và nút Done vẫn thấy phía trên bàn phím.
- Thực tế: người dùng gõ số tiền mà không thấy số mình gõ; muốn bấm Done phải tự cuộn lên trong thẻ.
- Nguyên nhân gốc (đọc code): khi `keyboardUp && open` thẻ luôn `scrollToEnd()` — `src/features/entries/SortEntryCard.tsx:70-73`
  (useEffect) và `:113-114` (onLayout). Cách này dành cho Split (B-38: thấy "Left to assign" / "Split & sort") nhưng
  `open` cũng đúng với `mode === 'edit'`. Gợi ý: chỉ `scrollToEnd` khi `mode === 'split'`; với 'edit' cuộn tới ô đang
  focus (hoặc không cuộn) + test. Không do c0e9e5b gây ra (chỉ thêm cờ bàn phím); các lượt trước Robo chưa chạm ô này.

### Quan sát chưa thành lỗi (không báo PASS/FAIL)
- Máy ảo Android 8.0: "Photo → Choose from library" mở trình chọn ảnh của Google Play services → "Something went wrong"
  (`SmallPhone.arm-26/artifacts/52.png`). Có thể do ảnh máy ảo thiếu module chọn ảnh; S26/Pixel 11 (trình chọn hệ thống)
  mở bình thường. Cần thử trên máy thật Android 8–10 (S9 trong lượt này không bấm tới nút đó).
- Pixel 11: bấm "Subscribe now" ×2 không thấy phản hồi trong ảnh (`cubs-37/artifacts/21–23.png`) — theo code phải có
  snackbar (`src/features/pro/store.ts:118-120`), có thể đã tắt trước khi Robo chụp. Trên máy ảo tablet, Subscribe hiện
  snackbar đỏ "Couldn't reach Google Play. Check your connection." (`MediumTablet.arm-35/artifacts/39.png`) → có phản hồi.
- OPPO A38 ảnh cuối là màn hình chính: do Test Lab gửi phím HOME khi hết phiên (logcat `KEYCODE_HOME deviceId=-1`),
  không phải app thoát.

## Trạng thái hạn mức / việc còn lại
- 18/11: 5/5 máy thật, ~11 lượt máy ảo (5 bị huỷ do dạng script). 19/11: 5/5 máy thật, 2 máy ảo.
- Nếu cần lượt nữa: script vẫn phụ thuộc chiều cao màn (số lần vuốt tới "Backup & restore") và tên thư mục trong trình
  chọn file (DocumentsUI "Downloads", ColorOS "Download"). Cách chắc hơn: mở thẳng `sundaysort://backup` bằng
  ADB_SHELL_COMMAND (`am start -a android.intent.action.VIEW -d sundaysort://backup`) — chưa thử trên Test Lab.
- Chưa có máy thật Android 8–9 (thấp nhất trên Test Lab là Galaxy S9 / Android 10 trong danh sách đã chọn) để kiểm
  "Choose from library" (quan sát trên máy ảo A8).
