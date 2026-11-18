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

## Lỗi

### 🟡 F-1 — "Trial · 8 days left" ngay sau khi bắt đầu dùng thử 7 ngày
- Máy: Galaxy S26 (Android 16) ảnh `m1q-36/artifacts/36.png`; Pixel 11 (Android 17) `cubs-37/artifacts/21.png`, `22.png`;
  máy ảo Android 17 16K `MediumPhone_ps16k.arm-37/artifacts/44.png`, `45.png` — tái hiện 3/3 lần bấm.
- Bước: Settings → Sunday Sort Pro → "Try Pro free for 7 days".
- Kỳ vọng: "Trial · 7 days left" (snack "Pro trial started · 7 days", "Your trial ends on 24 Nov" — bắt đầu 17 Nov 21:17).
- Thực tế: nhãn "Trial · 8 days left" (cả 2 máy); thanh tiến độ tính `(7 − 8) / 7` = âm. Tự đúng lại sau ≤ 1 phút.
- Nguyên nhân gốc (đọc code): `usePro()` dùng `useNow(60_000)` — `now` cũ tới 60 s — `src/state/pro.ts:14`; `startTrial`
  ghi `trialStartedAt = Date.now()` mới hơn (`src/db/proRepo.ts:48`) → `Math.ceil((trialEndsAt − now) / DAY_MS)` = 8 ở
  `src/domain/pro.ts:59`; tiến độ `src/app/pro.tsx:191`. Gợi ý: kẹp `daysLeft ≤ TRIAL_DAYS` hoặc dùng
  `max(now, trialStartedAt)`; Home badge cũng dùng chung (`src/app/(tabs)/index.tsx:73`).

### Quan sát chưa thành lỗi (không báo PASS/FAIL)
- (F-2 cũ, hạ xuống quan sát) Pixel 11 thật / Android 17: ô số tiền mở Gboard **QWERTY** (`cubs-37/artifacts/12–14.png`,
  con trỏ đang ở "$12.50|"). Nhưng máy ảo Android 17 16K cùng Gboard hiện **bàn phím số**
  (`MediumPhone_ps16k.arm-37/zoom-kb.png`), S26/S9 (logcat `inputType=0x2`), OPPO, Android 8/14/15 cũng bàn phím số →
  nghi do cấu hình Gboard riêng của máy Test Lab, chưa đủ chứng cứ là lỗi app (`src/app/capture.tsx:485`
  `keyboardType="number-pad"`). Ngày mai chạy lại Pixel 11 để xem có lặp lại không.
- Máy ảo Android 8.0: "Photo → Choose from library" mở trình chọn ảnh của Google Play services → "Something went wrong"
  (`SmallPhone.arm-26/artifacts/52.png`). Có thể do ảnh máy ảo thiếu module chọn ảnh; S26/Pixel 11 (trình chọn hệ thống)
  mở bình thường. Cần thử trên máy thật Android 8–10 (S9 trong lượt này không bấm tới nút đó).
- Pixel 11: bấm "Subscribe now" ×2 không thấy phản hồi trong ảnh (`cubs-37/artifacts/21–23.png`) — theo code phải có
  snackbar (`src/features/pro/store.ts:118-120`), có thể đã tắt trước khi Robo chụp. Trên máy ảo tablet, Subscribe hiện
  snackbar đỏ "Couldn't reach Google Play. Check your connection." (`MediumTablet.arm-35/artifacts/39.png`) → có phản hồi.
- OPPO A38 ảnh cuối là màn hình chính: do Test Lab gửi phím HOME khi hết phiên (logcat `KEYCODE_HOME deviceId=-1`),
  không phải app thoát.

## Còn lại cho ngày mai (hạn mức Spark: 5 máy thật + 10 máy ảo / ngày)
- Lượt regression trên APK mới nhất (theo `C:\Users\Admin\qa-tools\apk\LATEST.txt`), 5 máy thật: S26, Pixel 11, S9,
  OPPO A38 + 1 máy khác (vd. Galaxy Z Fold6 màn gập hoặc Galaxy A16) thay Xiaomi (HyperOS chặn thao tác).
- Khôi phục P096 trên máy thật bằng `robo-{uk,us}-full.json` mới (đã chạy được trên máy ảo Android 17).
- Xem lại bàn phím số tiền trên Pixel 11 thật; Android 8 "Choose from library" trên máy thật nếu có (S9 = Android 10).
- Hạn mức hôm nay: 5/5 máy thật đã dùng; máy ảo đã gửi 11 lượt (5 lượt bị huỷ vì lỗi hạ tầng do dạng script) — hết.
