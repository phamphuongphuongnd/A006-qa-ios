# QA-100 — phiên E: Galaxy A13 thật của Phương (R58TC12SRZW)

Máy: SM-A135F, Android 14, 1080×2408, density 420 (vật lý 450), **userspace 32-bit (`armeabi-v7a`)**, cỡ chữ 0.8,
chữ tương phản cao bật, múi giờ Asia/Ho_Chi_Minh. Runner: `qa/tools/run_a13.py` (bọc `run_persona.py` của phiên A,
an toàn cho máy riêng: kiểm app trên cùng trước mỗi lần bấm, không đổi múi giờ, không xoá file của Phương trong Download,
giữ density 420, cài đặt gốc cố định để trả lại). Bằng chứng: `qa-runs/a13/<id>/` (gitignore).

## Bước 0 — dữ liệu thật
- 2026-11-17 11:40: "Back up now" → Drive Phương (A006/SundaySort-REAL-before-QA-2026-11-17.sundaysort) → tải về Download
  → `qa-runs/a13/real-backup/`. Python đọc được: 233 khoản, 266 chuyến (1 chuyến đang chạy, bắt đầu bằng NFC, 0 m),
  8 ảnh, 1154 điểm GPS, autoTrips=true. Chi tiết: `qa-runs/a13/real-backup/REAL-COUNTS.md`.
- Cài đặt máy trước khi thử: `qa-runs/a13/device-settings-before.txt`, quyền app: `perms-before.txt` (vị trí nền, hoạt
  động thể chất, thông báo, Bluetooth, sinh trắc).

## Bản app thử
- APK QA `ece3819` và `1b307cf` **không cài được** lên A13: `INSTALL_FAILED_NO_MATCHING_ABIS` (APK chỉ có arm64-v8a/x86/
  x86_64, A13 cần armeabi-v7a). ⏭ B-59 trên A13 cho tới khi có APK có armeabi-v7a.
- Thử trên bản release đang cài (10:32): bundle JS **giống hệt** ece3819 (sha256 `6c1fa1dd1d4fd173…`, 5 715 400 B).

## Sự cố trong lúc thử
- 11:56 và 12:06:36 máy chủ adb bị khởi động lại (phiên khác) → A13 rời adb hẳn, chỉ quay lại khi rút-cắm cáp. Đã nhắn
  điều phối cấm `adb kill-server`. Runner nay dừng loạt khi mất máy (không chạy tiếp với máy vắng).
- 12:10 Phương chưa cắm lại được ("để sau") → loạt 11 persona dừng ở P001 (lượt 2). Cỡ chữ máy có thể đang 1.0 — trả 0.8
  khi máy về.

## Trả máy cho Phương (2026-11-17 17:22–17:27, Phương dừng thử, mai thử tiếp)
- Cài `sundaysort-qa-538ede9-all.apk` (bản build mới nhất; `dev` chỉ hơn B-71 — chữ hộp đổi vùng).
- Khôi phục `SundaySort-REAL-before-QA-2026-11-17.sundaysort`: xem trước 233 khoản / 266 chuyến / 8 ảnh khớp, 6,6 s.
  Home: Trial, 12 entries to sort, Business miles 6 (giống trước khi thử). Chuyến NFC 0 m kẹt từ 11:39 → app tự đóng
  khi mở lại ("Your trip stopped recording at 11:40 · Saved 0.0 mi").
- `pm grant` lại quyền như `perms-before.txt` (vị trí chính xác + nền, hoạt động thể chất, thông báo, Bluetooth);
  Automatic trips = On; cỡ chữ 0.8, sáng, máy bay tắt, density 420.
- Chưa chạy: P059 (dở do mất adb 14:51), P009, P031, P037, P096; chạy lại P051/P062/P073/P081 (lỗi runner đã sửa);
  B-62, B-63, B-65 + App lock vân tay, camera/OCR, widget, hiệu năng, pin nền.

## 18/11 — trả máy cho Phương thử Bluetooth (09:35–09:40)
- Cài `sundaysort-qa-8cb9c8f-all.apk` (B-56…B-90 + nút chẩn đoán B-88). Khôi phục `SundaySort-REAL-2026-11-18-after-drive`
  (233/266/8 khớp), `pm grant` lại quyền, Automatic trips "Working · last check just now", Van Bluetooth = Not set.
- ⚠ Nhật ký tín hiệu native tối 17/11 (B-88) đã mất: 9 lượt persona sáng 18/11 đều `pm clear` (xoá SharedPreferences
  `sundaysort_trip_detect`) trước khi điều phối báo có nút chẩn đoán. Bài học: trước khi `pm clear` máy thật sau một ca
  chạy xe lỗi → lấy chẩn đoán/nhật ký trước.

## 18/11 09:45 — chẩn đoán sau khi Phương thử Bluetooth (bản 8cb9c8f)
File `qa-runs/a13/diagnostics/SundaySort-trip-diagnostics-2026-11-18-02-44.json` (cũng ở Drive A006/).
- health: registered ✅, quyền vị trí + nền + hoạt động ✅, batteryOptimized false, backgroundRestricted false; Pro = trial.
- settings: autoTrips true, **startOnCharge true**, vanBtDevice set (= "Redmi Buds 4 Lite" 9C:49:52:58:DF:73 — tai nghe
  dùng để thử), merge 20 phút.
- signals (7 dòng, chỉ từ 09:32 — vòng EventLog trước đó đã mất do `pm clear`): still enter (eventAt 08:22) · bt_disconnected
  09:34:52 · boot ×2 09:35 (= 2 lần cài đè APK) · bt_connected 09:41:30 (chưa mở chuyến — có lẽ lúc đó chưa chọn thiết bị) ·
  bt_disconnected 09:42:07 · **bt_connected 09:42:29 → chuyến Auto bắt đầu đúng 09:42:29** (engine vanConnectedAt 09:42:29,
  chuyến running, startedBy auto). ✅ Bluetooth mở chuyến tức thì.
- Lưu ý: ngắt Bluetooth không đóng chuyến (đúng thiết kế P1-1) → chuyến thử tự đóng sau 20 phút đứng yên, < 500 m thì bị bỏ.

**Luật mới (điều phối, 18/11):** trên A13 KHÔNG `pm clear` nữa (dữ liệu thật + nhật ký chuyến) → không chạy persona cần
xoá dữ liệu. Khi Phương cắm lại sau lần chạy xe / thử Bluetooth: lấy file chẩn đoán (Settings → giữ lâu "Version")
TRƯỚC mọi việc khác, tóm tắt cho điều phối. Các mục còn lại chỉ làm khi Phương cho phép.
**Luật mới 2 (điều phối, 18/11 16:00, B-113):** trên A13 KHÔNG chạm theo toạ độ cố định nữa (nghi gây khoản tự lưu £55.30 15:08
và khoản FreshHarvest 2020). Luôn uiautomator dump → tìm đúng chữ/nút → kiểm topResumedActivity → mới bấm. Màn Ghi nhanh dump
hỏng (con trỏ nhấp nháy) → ở màn đó để Phương tự bấm, hoặc ẩn bàn phím/đợi rồi dump lại; không bấm mù.

## Đọc hoá đơn thật (bản 8cb9c8f, App lock tắt, 18/11 11:10–)
| # | Hoá đơn (ảnh Phương gửi) | App đọc được | Kết quả |
|---|---|---|---|
| 1 | Tesco Shrewsbury, TOTAL £55.30, 17/10/22 12:26 | Tesco · £55.30 · ngày để "Now" | cửa hàng ✅ số tiền ✅; ngày cũ > 400 ngày → độ tin cậy 0,3 → không điền (đúng thiết kế, `parseReceipt.ts:328`) |
| 2 | Tesco Bury St Edmunds (giấy cong, chụp nghiêng), TOTAL £27.26, 25/07/97 | Tesco · £0.00 · "Now" | cửa hàng ✅; số tiền ❌ để trống (không điền sai) |
| 4 | (Phương không gửi ảnh — bỏ so) | b4e79ce: Tesco · £0.00 · "Now" | ⏭ không có ảnh gốc để so |
| 5 | Fuelmax Station (Phương xác nhận) | b4e79ce: Fuelmax Station · £199.82 · "Now" | cửa hàng ✅ số tiền ✅ (Phương: "đúng cả") |
| 6 | FreshHarvest Market (Mỹ), Total $21.74, Subtotal $20.32, Tax $1.42 | b4e79ce lần 1: FreshHarvest Market (giữ £9.99 đã gõ); lần 2 (Phương chụp lại): "FneshHarvest Market" · £0.00 | cửa hàng ✅/gần đúng (r→n); số tiền ❌ trống |
| 7 | Speedway (Phương xác nhận), £200.00 | 322acd6: Speedway · chip "Receipt says £200.00 · Use" (giữ £9.99 đã gõ) | cửa hàng ✅ số tiền ✅; chip khi số gõ khác số trên hoá đơn ✅ |
| 3 | Tesco Cradley Heath (in phẳng, rõ), TOTAL: £33.50, 07/05/2026 15:25 | Tesco · £0.00 · Thu 7 May 15:25 | cửa hàng ✅ ngày+giờ ✅; số tiền ❌ để trống → A13-4 |

**Chụp lại trên 322acd6 (11:41–11:47) + file chẩn đoán có `receipts`** →
`qa-runs/a13/diagnostics/SundaySort-trip-diagnostics-2026-11-18-04-49.json` (chỉ trên máy tính; đã xoá khỏi Download
máy và chuyển vào thùng rác Drive). Cả 3 đều cửa hàng ✅, số tiền trống ❌:
- Tesco Cradley: "TOTAL:" cy 0,664 · "E33.50" cy 0,676 · "Cash" cy 0,682 → `closerLabel` bắt "Cash" → bỏ → fallback 0,4.
- Tesco 2022: "TOTAL" cy 0,547 · "E55.30" cy 0,559 · "CASH" cy 0,565 → y hệt (lần ở 8cb9c8f đúng £55.30 vì góc khác).
- FreshHarvest: "Total" cạnh "2174" (mất dấu phẩy của $21,74) → `moneyIn` không nhận.
Quy luật: ảnh nghiêng → số cột phải lệch xuống ~0,6 dòng so với nhãn → `closerLabel` bắt nhãn dòng dưới; "£" hay
đọc thành "E". Đã gửi điều phối (B-102).

**12:07 tạm dừng (Phương "dùng tý thử sau"):** A13 rời cáp lúc camera đang mở cho bài B-89 (mô phỏng Android tắt app
bằng `pm revoke CAMERA` khi đang ở camera — chưa chạy được). Bluetooth trên 322acd6 ⏭ (Phương không có tai nghe lúc
này). Máy để lại: **App lock ĐANG BẬT** (gốc: tắt), nháp Ghi nhanh £9.99 + ảnh Speedway, camera mở; dữ liệu thật,
quyền vị trí/AR/thông báo/BT đủ, Automatic trips On. Còn làm: B-89/B-99 chờ lâu (pm revoke), tắt App lock, bỏ nháp.

**Việc chờ (điều phối, bản sau 08cdb7b — B-105 không điền giá 1 món, B-106 camera riêng expo-camera Android, B-107 End trip
< 500 m bỏ, r03 £0.95):** khi có APK → cài đè giữ dữ liệu → (1) Take photo mở ngay camera SAU, không làm đẹp, 3/3 lần;
(2) chụp 1 chạm → về Ghi nhanh, ảnh + số tiền, thời gian; (3) X / phím Back → về Ghi nhanh không mất nháp; (4) đèn bật/tắt;
(5) Sửa khoản → Add photo → Take photo dùng camera mới; (6) Shrewsbury chụp thẳng không còn £7.00. Lần đầu hỏi quyền camera.
Sau đó: xoá khoản thử, kiểm lại 233/266/8, App lock tắt, Automatic trips bật.
Phương 18/11: B-106 và B-107 Phương KHÔNG yêu cầu (gợi ý của QA). B-107 → Phương chốt: hiện hộp hỏi 2 nút Bỏ/Giữ, không tự bỏ.
B-106 → Phương chốt KHÔNG dùng camera riêng, giữ camera điện thoại (Android + iOS); A13-7 thành hạn chế đã biết (đã báo điều phối).
2ac9e15 cài đè 14:39: nháp FreshHarvest cũ mở lại → £21.74 + "FreshHarvest Market" + "Wed 20 Nov, 11:09" (2019, B-108) →
🟡 A13-9 chip ngày không hiện năm khi khác năm nay (`manual/a13-2ac9e15-draft-fh-2019.png`). Nháp đã bỏ. CAMERA giờ granted
(USER_SET, không còn một lần) — gốc: chưa cấp → trả lại khi xong.
**Việc chờ (điều phối, bản 6abd84e, ~15:20):** cài → file chẩn đoán mục `backup` (B-111: provider, nightly, failCount, lastError,
thử liệt kê thư mục) → End trip chuyến tự động ngắn CHỈ khi có sẵn (B-107 hộp "Only 0.0 km — keep this trip?" Discard/Keep)
→ Save 1 khoản xem Entries cuộn lên (B-109) → xoá khoản. Không kịp trước 17:00 → ⏭.
Cập nhật: điều phối gỡ camera riêng (revert 147d3e2) → bản build kế tiếp dùng camera điện thoại cả Android/iOS; thêm B-112
(chip ngày có năm khi khác năm nay). Kiểm thêm khi cài: Take photo mở camera Samsung (không phải màn camera của app).

## 19/11 08:43 — chẩn đoán chuyến tối 18/11 (bản 19daeae, Phương lái + đã cho cầm máy)
Lúc cắm: chuyến sáng 07:24 đang chạy (11.3 km); Phương tự bấm End trip 08:45 (xác nhận qua popup). Không xoá/sửa chuyến nào.
File: `diagnostics/SundaySort-trip-diagnostics-2026-11-19-01-50.json` (Drive → thùng rác) · `real-backup/SundaySort-REAL-2026-11-19-0852-after-drive.sundaysort`
(233 entries / **269 trips** / 8 photos; tripPoints 2124) · ảnh `manual/a13-1119-miles-top.png`, `a13-1119-trip-1746.png`, `a13-1119-trip-2050.png` (có bản đồ → chỉ trên PC).

| Chuyến | id | Nguồn | Giờ | Quãng (app) | Điểm GPS |
|---|---|---|---|---|---|
| 1 | mwm01sj7gblqsfxj | **auto** (driving enter 17:46:39) | 17:46:32 → 20:50:40 (Phương End) | 11.2 km | 457, acc trung vị 4 m |
| 2 | mwm6ism00swd4fl2 | user (Start tay trong nhà) | 20:50:55 → 21:48:11 | 0.58 km | 76, acc trung vị **21 m** (10–207) |
| 3 | mwmt5yso3wyuzvh1 | user | 19/11 07:24:47 → 08:45:47 | 11.3 km | 447, acc 5.5 m |

**A13-11 🟠 Chuyến tự động không tự tắt khi về nhà (chuyến 1).** Tín hiệu: van BT **ngắt 18:40:52**; driving **exit 18:45:45** → walking →
**still enter 19:00:57** và giữ still tới sáng (không còn sự kiện activity nào). Nhưng chuyến chạy tới 20:50 vì sau 18:50 GPS trong nhà
(acc trung vị 15–30 m) nhảy tạo "chạy" giả: 19:10–19:20 vmax 50 km/h, 19:50–20:00 ~10 km/h, 20:30 vmax 45 km/h → tripStops bị cắt
khúc 18:59–19:14, 19:21–19:45, 19:47–19:50, 20:07–20:29, 20:37–20:45 (mỗi đoạn < mergeStopMinutes 20 nối lại) + `wake` 19:20/19:39/
19:52/20:19/20:33 trùng các đợt nhảy. Thực tế lái xong ~18:45; app thêm ~1.4 km giả sau 18:50 (hav 12.4 km thô; app 11.2 km).
Gợi ý: activity "still" ≥ N phút (hoặc BT van ngắt + still) → kết thúc chuyến tự động bất kể GPS; bỏ điểm acc > ~20–25 m và
bước nhảy tốc độ không khớp activity.
**A13-12 🟠 Start tay trong nhà vẫn cộng quãng (chuyến 2).** Activity "still" suốt 20:50–21:48; 76 điểm acc 10–207 m; vmax giả
55 km/h (21:10) → app cộng 583 m (thô 1.56 km). Gợi ý: khi activity still/không di chuyển, không cộng quãng; lọc acc + tốc độ nhảy.
**A13-13 🟠 Bluetooth van nối nhưng KHÔNG bật chuyến (18/11).** Phương tưởng chuyến 17:46 do Bluetooth bật; thực tế bt_connected "van"
17:35:27 + 17:36:17, còn chuyến startedAt 17:46:32.586 = đúng driving enter eventAt (1794998792587) → start do motion. engine.ts:126–132
lẽ ra đặt startAt = 17:35:27. Nghi: kick(foreground=true) từ broadcast nền bị Android 14 chặn FGS → notifyStartFailed (Phương không
nhớ có thông báo), hoặc JS không được đánh thức / config native chưa đồng bộ sau cài đè 17:24. logcat đã mất. Gợi ý ghi EventLog
kết quả kick/start. Đã báo điều phối.
  **Tái hiện 19/11 09:12 (Phương bật BT xe, app ở nền) — nguyên nhân chắc:** `logcat-1119-bt-start-failed.txt`:
  09:12:52.735 "Background started FGS: Allowed … TripDetectTaskService (uidState RCVR)" → 09:12:52.790 W ActivityManager
  "**Foreground service started from background can not have location/camera/microphone access**: service …TripDetectTaskService"
  → 09:12:55 thông báo `trip-auto-start-failed` "Driving? Tap to record this trip — Your phone didn't let the trip start on its own."
  Hướng sửa (điều phối chọn): BT nối chỉ "sẵn sàng" + lùi giờ start về lúc BT nối khi AR báo driving; hoặc CompanionDeviceManager.
  **Đính chính (điều phối 19/11):** Android CHO PHÉP FGS (SYSTEM_ALLOW_LISTED); dòng W "can not have location" chỉ là cảnh báo.
  Gốc thật: expo-location tự chặn startLocationUpdatesAsync khi không có màn hình (AppForegroundedSingleton.isForegrounded=false
  → ForegroundServiceStartNotAllowedException). Sửa B-124 (4dcaa0b): allowBackgroundLocationStart + nhật ký start_ok/start_failed.
  Phương xem các hướng A–E, chọn B rồi bỏ B sau khi biết B-124 sửa được không cần thông báo cố định.
- **0bf4283 cài đè 10:35:48** — ⚠️ lỗi QA: Phương đã Start chuyến 10:34:32, tôi cài đè khi chuyến đang chạy → GPS dừng 10:35:48,
  thông báo trip-ongoing đăng lại 10:35:55 nhưng LocationTaskService chỉ chạy lại 10:38:44 (app lên foreground) → hụt ~3 phút.
  🟡 sau cập nhật app, chuyến running không tự bật GPS tới khi mở app. Luật thêm: trước khi cài kiểm `dumpsys activity services`
  không có LocationTaskService. **B-126 ✅** Sửa khoản (ô £) + Parking & tolls: bàn phím số 0x2002 có "." ",". Dữ liệu 233/271/8/12
  (+2 chuyến Phương Start), không mất id. Bài Start ngồi nhà: 10:19:53 → tự tắt 10:30:34 (Merge 10 phút Phương đặt), 0.0 km,
  endedAt = lúc đứng yên ✅; chưa bấm Continue trip.
- 10:47:52 chuyến Start 10:34 tự tắt → thông báo "Trip ended at 10:34 · 0.0 km — You hadn't moved for a while, so the trip was
  saved. Still on your way? Tap Continue trip." (1 nút) ✅.
  **A13-14 🟠 Continue trip tắt lại sau 3 giây**: Phương bấm nút 10:48:45 → GPS start + trip-ongoing → 10:48:48 stop + lại "Trip
  ended at 10:34". Nghi: reopenTrip (tripsRepo.ts:104-106) chỉ đánh dấu bằng lastPointAt=now; fix đầu sau Continue được lưu thì
  lastMoveAt (240-245) mất resumedAt → parkedSince toàn bộ điểm = 10:34 → backgroundTask.ts:50 end ngay. Đã báo điều phối.
- **11:07–11:32 (0f08c76 → a3a1f6b)**: Back up now; Phương nhờ xoá 3 chuyến thử 0 km (10:19/10:34/10:52) → đã xoá. 0f08c76 cài
  11:10:56 khi không có chuyến (isForeground=0). **B-127 ✅** 12345678 → £123,456.00 + "Max £999,999.99" (🟡 chữ đen, không vàng).
  **B-128 ✅** Sort → Edit → Amount: ô Amount + Done ở trên bàn phím số. **B-130 ✅** Start 11:16:37 → tự kết thúc 11:27:21 →
  Continue 11:28:52 → vẫn chạy 11:31:03+. **B-129 ✅** (Phương đồng ý) cài đè a3a1f6b 11:31:21 giữa chuyến, không mở app:
  TripDetectTaskService 11:31:25 → LocationTaskService 11:31:27 (PROC_STATE_FGS) → GPS hụt ~6 s; chẩn đoán `restore_ok
  {screen: background}` (`diagnostics/SundaySort-trip-diagnostics-2026-11-19-04-32.json`).
- B-130 tiếp: chuyến Continue 11:28:52 tự kết thúc 11:37:50, thông báo "Trip ended at 11:27" → 🟡 sớm ~1 phút + endedAt trước
  giờ Continue; điều phối: fix cũ (11:27:50) hệ thống giữ được lưu làm đầu đoạn → sửa B-135.
- **8619687 cài 11:39:46** (không có chuyến). **B-131 ✅**: Start 11:40:44 → 11:42:55 dumpsys location đổi Request @+5s → @+30s
  HIGH_ACCURACY (2 phút 11 s), giữ 30 s tới 11:47:59; CPU 0.28%/366 s, 0 wakelock (`perf-trip-still-8619687.json`). Chưa thử nhánh
  drive (> 100 m) + gps_mode trong chẩn đoán.
- **57646f8 cài 11:53:13** (không có chuyến, Back up now trước). **B-135 ✅**: Start 11:54:41 → tự kết thúc 12:05:30 → Phương
  chờ ~5 phút → Continue 12:10:34 → tự kết thúc 12:21:30 (10 phút 56 s sau Continue), "Trip ended at 12:10" ≥ giờ bấm.
- **Drive check (0882755) 13:49–14:15**: Phương đi bộ 2–3 phút → 13:49:54 probe_start + "Checking for a drive…" ✅ → probe_none
  14:02:05 ✅; CPU probe 0.02%/152 s, 0 wakelock (`perf-drive-check-probe.json`). 13:52:00 start_ok {charging} (Phương cắm lại cáp
  máy tính khi đang đi) → **A13-16 🟠** probe_none 14:02:05 dừng LocationTaskService dù chuyến 13:52 đang chạy → GPS chỉ chạy lại
  14:03:11 khi app mở; chuyến bỏ 14:13:58 (< 500 m). `diagnostics/SundaySort-trip-diagnostics-2026-11-19-07-54.json`.
- **A13-15 (chuyến 11:16 user bị xoá)**: backup Drive 11:39 còn, 11:52 mất; Recently deleted có 4 chuyến 0 km (3 của QA + 1) →
  Phương xác nhận "hình như tôi xoá" → không phải lỗi app, đóng.
- **62d6558 cài 14:23:33. B-99 ✅** (vân tay thật, App lock 1 phút): camera mở 2 phút tự đóng → về Ghi nhanh không khoá, nháp còn;
  chụp sau 1:45 → thêm ảnh, không khoá; thư viện 1:23 → thêm ảnh. Camera Samsung ~4 s từ chụp tới màn xem lại (chế độ làm đẹp) —
  không phải lỗi app. Đã Discard nháp, tắt App lock.
- **B-121 ✅ riêng tư**: 3 file chẩn đoán (06-37/07-54/08-42) không có MAC, không tên thiết bị. 🟡 từ a3a1f6b mọi bt_* ghi
  "other device" kể cả van (02-43 còn "van"; 10:01:31 "other device" nhưng start_ok bluetooth cùng giây) → nhãn diagnostics sai, engine
  vẫn khớp. Đã báo điều phối.
- **B-122 ✅** (edecc6d, Phương tự bấm bàn phím Samsung): 1 → £1.00, 7,7 → £7.70, 1250 → £1,250.00, 0,5 → £0.50 (lưu đúng); 12.34 + "5"
  → £12.34 không Max (B-136 ✅); 12345678 → £123,456.00 có Max. Đã xoá 6 khoản thử.
- **B-118 (19/11 ~15:55)**: Phương nhờ so app khác (Everlance nguyên văn, MileIQ, Hurdlr, MileageWise) → viết lại 3 câu (WhenInUse /
  Always + AlwaysAndWhenInUse / Motion: mở bằng "Choose Always Allow", có hậu quả While Using, "walks aren't counted", giữ "stays on
  your phone") → **Phương duyệt**, đã gửi nguyên văn cho điều phối.
- **Tối 19/11 (Phương lái thật, edecc6d, KHÔNG cài APK mới)**: 1) B-140 ở nhà (watcher `watch-1119-evening.log`); 2) B-88 v2 đi bộ;
  3) B-88/B-131/kết thúc khi đỗ; 4) Bluetooth xe; 5) (tuỳ chọn) vuốt tắt app khỏi Recents khi đang chuyến → GPS còn không. Khi về:
  Back up now + chẩn đoán + `logcat -b all -d` NGAY (trước khi buffer xoay) → chấm từng bài theo mốc giờ Phương ghi.
  **Bài 1 B-140 ✅ (15:23–15:37)**: probe_start 15:23:39 → start_ok charging 15:26:50 (cắm cáp khi đang đi) → GPS chuyến còn chạy
  sau mốc probe hết hạn 15:35:39 (watcher fg=1, @+30s lúc 15:36–15:37), không có probe_none sau khi chuyến bắt đầu → 15:37:20
  trip_deleted {auto_short, 0 m} (nhật ký mới ✅). `diagnostics/SundaySort-trip-diagnostics-2026-11-19-08-42.json`.
- **edecc6d cài 15:06:49** (B-139 + B-140 + nhật ký trip_deleted; Back up now trước; không có chuyến). Bài B-140 (đi bộ →
  probe_start → Start → không mở app → GPS chuyến còn sau mốc probe hết hạn) ⏳ Phương để sau.
- **d3459a5 cài 14:59:53. B-138 ✅**: £12.05 + chụp FreshHarvest → bàn phím mở: dòng tên cửa hàng tạm ẩn, chip "Receipt says
  £21.74" không đè chữ; bàn phím đóng: "FreshHarvest Market · From receipt" hiện đủ; ngày 20 Nov 2019 đúng. Nháp đã bỏ.
- **0882755 cài 12:25:58**. B-136 Max: 12345678 → £123,456.00 CÓ "Max…"; 999999.99 → KHÔNG có dòng Max (ngược mô tả "chỉ khi
  chạm trần" — đã báo). **B-136 Split ✅**: sửa Part 1 → Close → "Discard this split?" → Discard → khoản £189.99 nguyên.
  B-131 chẩn đoán ✅ gps_mode drive 12:10:34 → parked 12:12:46. **B-88 Drive check chưa kích hoạt**: Phương chỉ cầm máy đi vài bước;
  ⚠️ không có transition activity nào từ 08:30:03 tới 13:33 (qua ~15 lần cài đè) dù health.registered=true → nhờ điều phối kiểm
  đăng ký lại ActivityTransition sau MY_PACKAGE_REPLACED. `diagnostics/SundaySort-trip-diagnostics-2026-11-19-06-37.json`.
- **A13-14 tái hiện lần 2 (lượt sạch, không cài/đổi cài đặt)**: Start 10:52:01 → tự kết thúc 11:02:46 (Merge 10) "Trip ended at
  10:52 · 0.0 km" ✅ → Continue 11:03:25 → tắt lại 11:03:48.9 (23 s) ❌. Điều phối sửa B-130.
  Phương chốt: chuyến đang chờ Continue mà nối BT / sạc + đi / Start → tạo chuyến mới như hiện tại (không tự nối).
- Đo thụ động 5 phút khi đang có chuyến (Start 10:52), máy đứng yên, cắm cáp (pin luôn 100% → không đo được %):
  CPU app **0.19%** (570 ms/302 s; luồng chính 250 ms, JS 70 ms), 0 wakelock của app; GPS fused HIGH_ACCURACY mỗi 5 s suốt
  thời gian đứng yên → phần hao pin chính là GPS. 🟡 gợi ý: khi activity "still" hạ xuống BALANCED/khoảng thưa hơn tới khi
  di chuyển lại. `perf-trip-still-300s.json`. Đo pin thật cần một ca lái không cắm sạc.
- Quyết định Phương (19/11): B-113 đóng; xoá 2 repo test sau khi phiên con test xong; iOS B-95/96 để Phương kiểm sau (giới hạn đã biết).
- **B-123 ✅** (bcf8827): chuyến giả 09:40:29 → 10:00:47 tự dừng (LocationTaskService stop + hủy trip-ongoing, 20 phút 18 giây);
  không có trong Miles, trips vẫn 269, tripPoints không thêm → < 500 m bị bỏ.
- **dc84207 (B-123..B-126) cài đè 10:05** (Back up now trước): 233/269/8/12, id không đổi ✅; quyền còn; sao lưu đêm bật.
  **B-125 ✅**: dòng Van Bluetooth "Redmi Buds 4 Lite — Looks like headphones or a speaker, not a van…"; màn chọn: cả 4 thiết bị đã
  ghép đều có cảnh báo, Phương xác nhận không cái nào là xe (xe chưa ghép với máy) → đúng. Không đổi lựa chọn.
  **B-126 ✅**: ô số tiền inputType 0x2002, bàn phím số có "." và ",". `real-backup/SundaySort-REAL-2026-11-19-after-dc84207.sundaysort`.
- **bcf8827 (B-123 + B-124) cài đè 19/11 09:34** (Back up now trước): 233/269/8/12, id không đổi ✅; quyền còn ✅.
  **B-124 ✅**: app ở nền, Phương nối lại tai nghe (Van BT) 09:40:29 → signals `bt_connected van` + `start_ok {reason: bluetooth,
  screen: background}` → chuyến running auto, thông báo "Trip running · Started automatically"; dumpsys location: fused
  HIGH_ACCURACY 5 s cho sundaysort (vẫn có W "can not have location" nhưng có quyền vị trí nền nên vẫn nhận vị trí).
  Files `diagnostics/SundaySort-trip-diagnostics-2026-11-19-02-43.json`, `logcat-1119-bcf8827-bt.txt`. Chuyến giả để nguyên →
  kiểm B-123 tự tắt + bỏ (< 500 m) sau ~10:01.
- **805835b (B-123) cài đè 19/11 09:22**: trước/sau cài 233/269/8/12, id entries/trips/tripPoints không đổi ✅; Merge stops 20 min,
  Automatic trips Working, quyền vị trí nền/activity/thông báo/BT còn ✅. Van Bluetooth đang là **Redmi Buds 4 Lite (tai nghe)** →
  lần 09:12 là tai nghe; đã nhắc Phương tự đổi sang BT xe.
**Bluetooth van "chỉ bật chuyến 1 lần":** 18/11 van kết nối 17:35/17:36/17:49/17:50/17:57 (rớt-nối liên tục) — chuyến đã chạy từ
17:46 nên không bật thêm (đúng). Sáng 19/11 **không có bt_connected nào** (van không nối với máy) → BT không thể bật chuyến; chuyến
sáng do Phương Start tay 07:24, driving enter 07:34. 22:53–23:10 có "other device" (B-121 ẩn tên ✅).

**Việc chờ (điều phối, B-122 — Phương chốt "nhập thế nào viết bằng đó"):** khi có APK → cài đè giữ dữ liệu → Phương tự bấm Ghi
nhanh: "1" → £1.00, "7,7" → £7.70, "12.50" → £12.50 (thêm: Sửa khoản, phí đỗ xe) → xoá khoản thử → kiểm 233/266/8/12, sao lưu đêm.
B-113 chốt do chạm toạ độ (không sửa app). Backup folder ghi tài khoản/thư mục → đợt sau (🟡).

## BẢN CUỐI MỚI b843037 (cài đè 16:52, thay ef470b7) — máy trả Phương 16:59
- 5 tab mở được; logcat không FATAL / lỗi ReactNativeJS ✅.
- Sort ở chữ 2.0: nút thẻ xếp icon trên + nhãn dưới, đủ chữ Edit/Split/Merge/Skip ✅; cuộn xuống: nội dung không chui dưới thanh
  trạng thái ✅ (`manual/a13-b843037-sort-font2-top.png`, `-scrolled.png`). Cỡ chữ trả 0.8.
- B-121 chẩn đoán `diagnostics/SundaySort-trip-diagnostics-2026-11-18-09-54.json`: 6 tín hiệu bt, address chỉ "van"; không có MAC,
  không tên thiết bị ✅. backup.probe ok:true, nightly true ✅. Bản Download xoá; Drive → thùng rác.
- Sao lưu 16:58 → `real-backup/SundaySort-REAL-2026-11-18-1658-b843037.sundaysort`: **233/266/8/12**, id không thêm/bớt ✅;
  appLock false, autoTrips true, km, backupNightly true. Quyền CAMERA chưa cấp (như gốc). App mở lại → màn hình chính 16:59.
- 17:00 link lạ: `am start -a VIEW -d sundaysort://abc` → app mở **Home** ("Afternoon, driver") ✅; `sundaysort://abc/xyz?q=1`
  → Home ✅; logcat không lỗi. (Chỉ thử khi app đang chạy: `am kill` không tắt được vì dịch vụ chuyến tự động giữ tiến trình —
  không force-stop để khỏi tắt chuyến tự động.) Máy về màn hình chính.

## BẢN CUỐI ef470b7 (cài đè 16:21, B-56..B-121) — máy trả Phương 16:26
- 5 tab mở được; logcat không FATAL / lỗi ReactNativeJS ✅.
- B-114 v3 Sort ở chữ 2.0: nút + ẩn, hàng Edit/Split/Merge/**Skip** đủ ✅ (`manual/a13-ef470b7-sort-font2.png`). Lưu ý: đổi cỡ chữ
  làm app dựng lại về Home; ở chữ 2.0 tab bar cao hơn → chạm theo đỉnh node (vẫn dưới 2260). Cỡ chữ trả 0.8.
- Sao lưu: "Nightly backup on. Last: today 16:17 · Google Drive" ✅. Back up now → `real-backup/SundaySort-REAL-2026-11-18-1624-ef470b7.sundaysort`:
  **233/266/8/12**, id không thêm/bớt ✅; appLock false, autoTrips true, km, backupNightly true. Bản Download máy xoá; Drive giữ.
- Quyền CAMERA chưa cấp (như gốc). App mở lại rồi về màn hình chính.
- **16:30–16:51 thử cùng Phương các phần chưa chắc (Phương bấm ở Ghi nhanh, không chạm toạ độ):**
  - Tesco Cradley (ảnh màn hình) → **£33.50 + Thu 7 May 15:25 ✅** (trước đây để trống).
  - B-89 chờ lâu ở camera: ⏭ — camera chỉ mở 14 s (16:30:49→16:31:03), Phương bỏ bài làm lại 90 s. Lưu ý: lần này Phương cấp camera
    "khi dùng app" (USER_SET, không ONE_TIME) → Android không tắt app sau 1 phút, nên muốn thử phải chọn "Chỉ lần này".
  - Nháp có ảnh: chụp FreshHarvest → Home → `am kill` (giả lập Android tắt app) → mở lại → nháp khôi phục **£21.74, FreshHarvest
    Market, ảnh, chip "20 Nov 2019, 11:09" ✅** (`manual/a13-ef470b7-draft-restored.png`). X → Discard → tìm "21.74" trong Entries:
    **không có khoản nào ✅** (củng cố B-113: khoản 2020 do chạm nhầm của script).
  - B-109 v3: Entries cuộn xuống tháng 10 → New expense £1.50 → Save → Entries mở ra **TODAY −£1.50 ngay đầu ✅**. Đã xoá.
  - B-107 Bỏ/Giữ: Phương rút–cắm cáp → không có chuyến tự bật (engine.ts:103 cần sạc + thoát "still" = phải di chuyển) → ⏭ chờ
    chuyến ngắn thật.
  - Sao lưu 16:49 → `real-backup/SundaySort-REAL-2026-11-18-1649-ef470b7.sundaysort`: **233/266/8/12**, id không thêm/bớt ✅;
    nightly true. Quyền CAMERA trả về chưa cấp; cỡ chữ 0.8; về màn hình chính 16:51.

## Bản 07f4aac (cài đè 15:55, bản mới nhất lúc đó — B-56..B-116)
- Cài đè giữ dữ liệu ✅. Backup & restore: "Nightly backup on. Last: today 15:34 · Google Drive", không còn "not reachable" ✅.
- Back up now → Drive → kéo về `real-backup/SundaySort-REAL-2026-11-18-1556-07f4aac.sundaysort`: **233 / 266 / 8 / 12**, entries
  và trips không thêm/bớt id nào so với 08:30 ✅; appLock false, autoTrips true, km. Bản Download máy đã xoá; bản Drive giữ.
- Quyền CAMERA vẫn chưa cấp (như gốc). App mở lại 1 lần rồi về màn hình chính (15:58). Không chạm toạ độ (B-113).
- 16:05 thử nhanh: 5 tab mở được, logcat 0 lỗi/cảnh báo ReactNativeJS ✅. Hộp "Did the backup file get saved?" → Yes, saved.
- B-114 Sort ở chữ 2.0: nội dung đủ ✅; 🟡 nút + nổi che "Skip" ở hàng Edit/Split/Merge, Work/Personal cắt mép dưới
  (`manual/a13-07f4aac-sort-font2.png`). Cỡ chữ trả về 0.8.
- 16:12 Phương tự bấm ở Ghi nhanh (không chạm toạ độ): FreshHarvest → Save → khoản **"20 Nov 2019, 11:09"** (Entries "WED 20 NOV
  2019"), "Read from receipt: £21.74 · FreshHarvest Market · 20 Nov" → ngày theo nhãn Date/time ✅, lưu ĐÚNG năm 2019 (không thành
  2020 → củng cố B-113: khoản 2020 trước là do chạm nhầm, không phải lưu thường). Đã xoá.
- B-109 v2: Phương gõ "1" → Save → Entries mở ra "TODAY · No note −£0.01" ngay đầu ✅. (Gõ "1" = £0.01 — kiểu bàn phím tiền
  dịch số; ghi nhận, chưa coi là lỗi.) Đã xoá.
- 16:18 sao lưu kiểm: `real-backup/SundaySort-REAL-2026-11-18-1618-07f4aac.sundaysort` → **233/266/8/12**, id không thêm/bớt ✅,
  backupNightly true. Quyền CAMERA trả về chưa cấp; cỡ chữ 0.8; app mở lại rồi về màn hình chính 16:20.
- B-107 ⏭ (không có chuyến tự động ngắn). Camera Android 7–9 (B-115) ⏭ (A13 là Android 14).

## Bản 3f26b33 (cài đè 15:06, camera điện thoại như cũ) — 18/11 15:07–15:30
| Kiểm | Kết quả |
|---|---|
| Take photo → camera Samsung (không phải màn camera app) | ✅ |
| Shrewsbury thẳng (trước £7.00) | **£55.30 ✅** conf 0.9 |
| Bury cầm tay (trước £0.48) | để trống ✅ (parse £27.26 conf 0.4) — B-105 ✅ |
| FreshHarvest | £21.74 + "FreshHarvest Market" ✅; chip "Sun 25 May 2025, 12:53" có năm (B-112 ✅); 🟡 lấy dòng in cuối 5/25/2025, không lấy "Date/time 11/20/2019" |
| Save → Entries (B-109) | khoản £1.23 hôm nay hiện ngay đầu ✅. 🟡 khoản ngày 2025 lưu xong không thấy ở đầu (nằm tháng 5/2025) |
| Chẩn đoán `backup` (B-111) | provider Google Drive SAF, nightly false, failCount 0, lastAutoBackupAt 16/11, **probe "folder gone"** → thư mục hỏng thật |
| B-107 Discard/Keep | ⏭ không có chuyến tự động ngắn sẵn (không tạo chuyến thật) |
| Thời gian | thu nhỏ 2.1–2.5 s + OCR 1.4–1.7 s |

- **A13-10 🟠** Dữ liệu thật có khoản lạ "FreshHarvest Market −£21.74, **Fri 20 Nov 2020**, 11:09" (Read from receipt … 20 Nov, có ảnh)
  — hoá đơn 11/20/2019; nháp 2ac9e15 hiện "Wed 20 Nov" (=2019); tôi đã Discard nháp lúc 14:41 nhưng khoản vẫn được lưu và năm
  thành 2020. Nghi: (a) ngày không năm bị tính lại khi lưu, (b) đường cứu nháp/ảnh lưu dù đã Discard. Ảnh
  `manual/a13-3f26b33-fh-2020-entry.png`. Đã xoá. Báo điều phối 15:20.
- Dọn: xoá khoản thử (£55.30, £1.23, FreshHarvest 2025, FreshHarvest 2020); file chẩn đoán 08-21 → PC + thùng rác Drive; bản sao lưu
  kiểm số liệu → `real-backup/SundaySort-REAL-2026-11-18-1526-3f26b33.sundaysort` (xoá khỏi Download máy; bản Drive A006 giữ).
- **Số liệu thật ✅** 233 / 266 / 8 / 12, không khoản thừa/thiếu so với 08:30; appLock false, autoTrips true, km.
- Quyền CAMERA trả về chưa cấp (pm revoke + bỏ cờ user-set); vị trí (chính xác + nền), nhận diện hoạt động, thông báo, Bluetooth
  vẫn cấp. App mở lại → "Automatic trips on". Máy về màn hình chính 15:30.
- **Thư mục sao lưu (Phương duyệt trực tiếp 15:32: thư mục A006, bật sao lưu đêm)**: Settings → Backup & restore → Backup folder →
  Drive thuphuong… → Drive của tôi → A006 → Sử dụng thư mục này → app tự bật "Nightly backup on" và sao lưu ngay "Last: today
  15:34 · Google Drive". Chẩn đoán 08-37: `probe ok:true` (4044 ms), nightly true, failCount 0 ✅. Không xoá file sao lưu cũ nào.
  File chẩn đoán 08-37 → PC, xoá khỏi Download máy, thùng rác Drive.
- A13-10: Phương không nhớ có bấm Save / ✓ / chip ngày ở màn FreshHarvest; script QA chỉ bấm BACK + chạm toạ độ mù (X, Photo, Take
  photo) — không loại trừ chạm nhầm. Khoản Tesco £55.30 lưu lúc 15:08 cũng không rõ ai bấm Save → nghi cùng cơ chế.

## Đọc hoá đơn lại — bản 08cdb7b (cài đè 13:35 giữ dữ liệu, 18/11 13:46–)
Trước đó: bỏ nháp £9.99 (ảnh xoá theo), **App lock tắt** (về gốc), camera vẫn "không cấp" (một lần). Chuyến lạ 0.0 km
12:32–13:42 đang chạy (bắt đầu đúng lúc cắm cáp vào máy tính — startOnCharge?) → Phương bảo kết thúc → **"Trip saved ·
0.0 km"** (không bị bỏ dù < 500 m) — nằm trong dữ liệu thật, cần xoá + điều phối xem.
Phương không còn tờ giấy: ảnh gốc lấy lại từ transcript (`qa-runs/a13/receipts-src/`, bản nhỏ ~550×950), mở trên màn
hình máy tính, Phương chụp màn hình bằng camera app (ảnh chụp màn hình có vân moiré → OCR khó hơn giấy thật).
File chẩn đoán `qa-runs/a13/diagnostics/SundaySort-trip-diagnostics-2026-11-18-06-56.json` (đã xoá khỏi Download máy;
bản trên Drive A006 chờ chuyển thùng rác).

| Lần | Hoá đơn | App điền | Đúng? | OK→điền (camera trả + thu nhỏ + OCR) |
|---|---|---|---|---|
| 13:46 | Tesco Cradley £33.50, thẳng | trống (parse £42.00 subtotal, conf 0.4); ngày 7 May 15:25 ✅ | ❌ OCR sót cả cột tiền dưới (33.50/35.00/1.50) | ~? + 2.39 s + 1.40 s |
| 13:52 | Tesco Cradley, nghiêng | **£33.50** + 7 May 15:25 + Tesco | ✅ | 1.06 s + 2.08 s + 1.20 s ≈ **4.3 s** |
| 13:53 | Tesco Shrewsbury £55.30, thẳng | **£7.00 (sai, conf 0.65 → tự điền)**; ngày trống (17/10/22 > 400 ngày, đúng luật) | ❌ A13-6 | ~1 s + 2.25 s + 1.33 s |

| 14:01 | Tesco Shrewsbury, nghiêng | **£7.00 (sai)** | ❌ A13-6 lần 2 | (đọc bị đẩy khỏi bộ nhớ 3 lần) |
| 14:02 | Tesco Bury 1997 (ảnh cầm tay, 27.26) | **£0.48 (sai, conf 0.65)** + "Lesco" | ❌ A13-6 lần 3 (có TOTAL, OCR sót số) | 2.20 s + 1.15 s |
| 14:06–07 | 1 khoản 2 ảnh: Bury (£0.99 conf 0.4, Tesco 0.92) + FreshHarvest | **£21.74 ✅**, tên "Tesco" ❌ | tên lấy từ ảnh Bury (conf 0.92 > "FreshHarvest Market" 0.62); ngày 2019 conf 0.3 → không điền (đúng luật) | 2.16 s + 1.32 s |

File chẩn đoán 2: `qa-runs/a13/diagnostics/SundaySort-trip-diagnostics-2026-11-18-07-12.json`. Ghi chú: 2 ảnh khác hoá đơn trong 1
khoản → gộp theo conf từng trường → số của tờ này + tên của tờ kia (🟡 gợi ý: tên/ngày/số nên lấy cùng 1 ảnh khi ảnh đó có số tổng tin cậy).
"FreshHarvest Market" dòng đầu, chữ to mà chỉ conf 0.62.
**B-102 tổng kết trên A13 (ảnh chụp màn hình):** đúng 3/6 (Cradley nghiêng, FreshHarvest — trước đây trống), trống 1, **sai 3 (A13-6)**.
**B-103 tốc độ ✅ phần app:** OK → số tiền ≈ 4 s (cũ 15–18 s): camera trả ~1 s + thu nhỏ 2.1–2.4 s + OCR 1.0–1.4 s. Ảnh vào OCR 1800×2400.
| 14:20 | Tesco Bury 1997, dọc | **£27.26 ✅** + Tesco | ✅ (lần này đọc được) | — |

**Ảnh trong khoản đã lưu ✅**: lưu khoản £27.26 → Entries → mở khoản → "Receipt photo" → ảnh hiện đủ, đúng chiều dọc
(`manual/a13-08cdb7b-photo-view.png`) → xoá khoản (More → Delete; nằm trong Recently deleted).
**A13-8 🟡** Sau Save, tab Entries giữ vị trí cuộn cũ → mục TODAY + khoản mới nằm trên mép, màn hình bắt đầu từ "THU 12 NOV";
phải kéo xuống mới thấy (`manual/a13-entries-today-2.png`, uiautomator: TODAY bounds y 532→323 = ngoài khung).
**Chuyến 0 km**: Phương duyệt xoá vĩnh viễn (app báo "can't be undone") → đã xoá. Diagnostics: `startedBy auto, source gps,
miles 0` 12:32 → bật lúc cắm cáp USB vào máy tính (startOnCharge = true). 🟡 Gợi ý: chuyến tự động < 500 m người dùng bấm
End trip cũng nên bỏ (hoặc hỏi), và sạc từ máy tính (USB data) không nên tính là "lên xe".
Màn Miles lúc đó có thẻ "Missing trip? About 10.8 km between Mon 19:06 and Wed 12:32" — đúng chuyến chiều 17/11 Phương lái
mà app không bắt (B-88); không bấm Add/Not a trip (để Phương). Thẻ biến mất sau khi xoá chuyến 0 km.
**Backup & restore** hiện "Backup folder, Google Drive — not reachable" (backupFolder trong sao lưu y như sáng 08:29) → 🟡 chưa rõ có từ trước hay do cài đè.
**Số liệu thật sau đợt hoá đơn ✅**: Back up now → Drive A006 → kéo về `real-backup/SundaySort-REAL-2026-11-18-1428-after-receipts.sundaysort`:
entries 233, trips 266, photos 8, categories 12 — trùng bản 08:30; appLock false, autoTrips true, km, startOnCharge true.

Sự cố 14:09: Phương mở app Camera Samsung đúng lúc tôi nhấn giữ "Version" → 2 ảnh lạ trong Thư viện (140901/140905) → Phương
chọn xoá → đã chuyển thùng rác Android (MediaStore is_trashed, tự xoá sau 30 ngày). Luật thêm: nhấn giữ/chạm phải kiểm app trên
cùng ngay trước và chỉ chạm khi Phương không cầm máy.
**Phần chậm còn lại = camera Samsung (A13-7).**

## Việc chờ A13 về (theo điều phối)
- Cài `sundaysort-qa-fbc5be8-all.apk` (có armeabi-v7a — đã kiểm) thay mọi bản trước.
- B-61: gõ "7.5" ở ô số tiền → £7.50. B-62: Export → Back khỏi bảng chia sẻ → "Did you send or save the files?" →
  Not sent → không có nhãn Exported. B-63: quyền vị trí "Approximate" → Start trip → phải hiện "Turn on precise
  location"; xong trả lại Precise. App lock vân tay thật (cần Phương).

## Kiểm lỗi đã sửa (bản 88fde59-all, cài đè 13:37)
- **B-59 ✅** (A13): P001 cài mới (pm clear) với 88fde59 → logcat 0 dòng ReactNativeJS E/W (bản ece3819 lúc 11:58 có
  `[auto-trip] sync/run failed … no such table: settings`). Bằng chứng `qa-runs/a13/P001/logcat.txt`.
- **B-61 ✅** (A13, bàn phím Samsung Honeyboard): Quick capture → gõ "7.5" qua `input text` → £7.50; xoá về £0.00 rồi
  chạm phím thật 7 / ".-" / 5 → £7.50, nút Save bật. Ảnh: `qa-runs/a13/manual/B-61-7.5-keypad.png`.

## Kiểm lỗi đã sửa trên dữ liệu thật (bản 8cb9c8f, 18/11 10:00–10:30, không pm clear)
- **B-73 ✅** Ghi nhanh: mở → bàn phím hiện; Back → ẩn; chạm số tiền → hiện lại (lặp 2 lần). `manual/B-73-*.png`
- **B-84 ✅** Ghi nhanh £4.56 → Photo → Take photo (quyền camera "Chỉ lần này") → camera Samsung mở → `am stack remove`
  task (tiến trình bị tắt hẳn) → mở lại app: vào thẳng Ghi nhanh, nháp £4.56 còn nguyên. Close → "Discard this entry?"
  → Discard (không lưu vào dữ liệu thật). `manual/B-84-*.png` (đã cắt bỏ bong bóng Zalo)
- **B-62 ✅** Reports → Export 4 files (Pro trial: CSV, mileage, PDF, MTD summary; "12 entries … no category" →
  Leave them out) → bảng chia sẻ sau 20,7 s (`SundaySort-export-2026-27.zip`) → Back → "Did you send or save the files?"
  → Not sent → Entries 0 nhãn Exported; chuyến 3,2 km thêm hôm 17/11 vẫn không có Exported. `manual/B-62-a-dialog.png`
- **B-63 ✅** `pm revoke ACCESS_FINE_LOCATION` (còn COARSE = Approximate) → Miles → Start trip → tấm "Turn on precise
  location · Allow precise location · Not now"; Not now → không mở chuyến. Đã `pm grant` lại FINE. `manual/B-63-a-start.png`
- **Widget 4×2 ✅** (SundayWeek id 29 trên màn hình chính Phương): ghi £1.23 → `dumpsys appwidget` RemoteViews đổi
  `@96f87d1 → @551ee76` trong ~2 s; xoá khoản (More → Delete) → đổi tiếp `@1ad7517`, Home Net về £0.00. Không chụp/lật
  màn hình chính (ảnh riêng) → chỉ kiểm qua dumpsys, chưa nhìn bằng mắt nội dung widget.
- **CPU nền 10 phút** (app ở nền, chuyến tự động bật, dữ liệu thật): 90 ms tổng = 0,01%, không wakelock, không
  xin GPS trong lúc đo → B-51 không tái hiện ở bản release. `qa-runs/a13/perf-idle-600s.json`
- **Restore (bản mới)**: "Restore from backup" giờ mở danh sách trong thư mục sao lưu; dữ liệu thật trỏ thư mục Drive
  mà quyền SAF đã mất (do `pm clear` 17/11) → "We can't reach your backup folder. Choose it again." + "Choose a file
  instead" → chọn file được. Hợp lý.
- **Hiệu năng** (bản 8cb9c8f, `qa/tools/a13_perf.py`, số trong `qa-runs/a13/perf-*.json`):
  | Dữ liệu | Mở nguội TotalTime | Chuyển tab (CPU luồng JS) | Cuộn Entries 10 lần vuốt |
  |---|---|---|---|
  | thật 233 khoản | 2,39–2,61 s (5 lần) | 0–40 ms mỗi tab | — |
  | P096 20.011 khoản | 1,97–2,48 s | 0–40 ms (Reports 40) | 592 khung, giật 12%, p50 34 ms · p90 57 · p99 101; RenderThread 360 ms, GPU 350, JS 240 |
  Khôi phục 20.011 khoản qua app: 58,4 s. Khôi phục dữ liệu thật: 21,9 s. Thời gian "thấy marker" ~4 s là do
  uiautomator dump, không phải app.
- Thử Bluetooth của Phương (09:42) → chuyến Auto 0 m bị dừng khi tắt tiến trình ở B-84, không còn trong Miles (< 500 m).

## Kết quả persona
| Persona | Hành vi | Kết quả | Ghi chú |
|---|---|---|---|
| P001 | quick_capture_only, cài mới | ✅ 9 ⏭ 1 (lượt 14:00, 88fde59) | mở nguội TotalTime 3871 ms (pm clear); onboarding ✅; Home/Reports 0 khớp; tour ✅; 3 lần ghi nhanh → to-sort +3, Out +£19.84, In +£120 khớp; 0 JS E/W; PSS 162 MB. Lượt 13:43 có 1 lần ❌ "Save button not found" (màn ghi nhanh £0.00, bàn phím đóng) — không tái hiện ở lượt sau + 4 lần mở tay → ghi là chập chờn runner, theo dõi. Lượt 11:58 (bundle ece3819): B-59 tái hiện |
| P051 | region_switch (dữ liệu US, 61 khoản) | ✅ 9 ❌ 1 (runner) | khôi phục: xem trước 61/0/1 khớp, 6,5 s; Home 33 to sort, Out $21.11, Tax year 2026; Reports income/expenses/personal khớp. Hành trình ❌: runner bấm Change khi ô tỷ giá trống (ô không tự focus trên A13) → app báo lỗi đúng; runner đã sửa, chạy lại sau. Thấy lỗi chữ 🟡 A13-1 |
| P081 | weird_text (font 1.3) | ✅ 9 ❌ 1 (runner) | khôi phục + số khớp; danh sách hiện đúng `=HYPERLINK("htt…`, emoji, "+44 7700 900123"; hành trình ❌: runner chạm trượt khi danh sách đã cuộn ("Add a note" không thấy) → thử tay sau |
| P017 | split_merge_heavy (dark) | ✅ 10 | khôi phục, số, tour, tách 2 phần (Fuel/Phone & data) + Merge, week Out không đổi |
| P062 | kill_mid_save (US, font 2.0, dark) | ✅ 8 ❌ 2 (runner) | khôi phục ❌: "Restore from backup" nằm dưới thanh điều hướng ở font 2.0, runner không cuộn (đã sửa) → verify ❌ theo; hành trình force-stop ngay sau Save ✅ (khoản giữ lại, Out +$6.66) |
| P059 | double_tap_save (2000 khoản, dark) — 18/11, 538ede9 | ✅ 10 | khôi phục 2012 khoản + số khớp; bấm Save 2 lần liền → chỉ +1 khoản, Out +£5.55 |
| P009 | weekly_sorter (2000 khoản) — 18/11 | ✅ 10 | ghi 2 khoản, sắp xếp bằng chip "Most used" tới "Week sorted"; unsorted về đúng số kỳ vọng |
| P031 | year_end_export (font 1.3) — 18/11 | ✅ 9 ❌ 1 (runner) | Export → app hiện đúng hộp "442 entries aren't sorted · Export anyway / Sort first"; runner không bấm Export anyway → chờ bảng chia sẻ hết giờ. Xuất CSV làm tay (cùng B-62) |
| P037 | backup_restore_other_phone (2000 khoản, font 2.0) — 18/11 | ✅ 10 | khởi động nguội giữ số; khôi phục lần 2 cùng file → unsorted + week Out khớp |

## Lỗi
- **A13-6 🟠 Hoá đơn có nhãn TOTAL nhưng OCR sót số tổng → app TỰ ĐIỀN giá một món (£7.00 thay £55.30)** — 08cdb7b, A13,
  Tesco Shrewsbury chụp thẳng, 18/11 13:53. Mong đợi: để trống (thà trống còn hơn sai). Thực tế: £7.00 "From receipt".
  OCR đọc được dòng "TOTAL"/"CASH"/"CHANGE DUE" nhưng cả cột tiền dưới (55.30/60.00/4.70) không ra; chỉ có E7.00 ×2 ở trên.
  Nghi: `src/features/ocr/parseReceipt.ts:270-275` — nhánh "No label at all" vẫn chạy khi đã thấy nhãn TOTAL (totalRows
  không rỗng, lostPointTotal không ra) → chỉ 1 giá trị khác nhau (700) → conf 0.65 ≥ OCR_FILL_CONFIDENCE 0.6
  (`src/domain/receiptSignal.ts:25`). Gợi ý: có totalRows mà không đọc được số → conf < 0.6. Bằng chứng: file chẩn đoán
  06-56, receipts[0].
- **A13-7 🟠 Camera mở bằng CAMERA TRƯỚC (selfie, chế độ làm đẹp) mỗi lần → phải đổi camera, chụp chậm (Phương: "chụp rất
  lâu, ấn 3–4 lần mới được")** — A13, Samsung Camera, 3/3 lần 18/11 13:46/13:52/13:53. logcat: `AttachModeManager:
  Image capture intent` → `initializeCameraId facing=1` → `openCamera cameraId=1` (BeautyPhotoMaker) → Phương đổi
  (`PREPARE_SWITCH_CAMERA 0`) sau 3–14 s → chụp → màn xem lại → OK. expo-image-picker đã gửi CAMERA_FACING=0 /
  LENS_FACING_BACK (`node_modules/expo-image-picker/.../CameraContract.kt:46-48`) nhưng Samsung bỏ qua và dùng hướng camera
  tự nhớ. Gợi ý (điều phối/Phương quyết): camera trong app (CameraX/expo-camera, luôn camera sau, chụp 1 chạm không màn
  xem lại) hoặc ML Kit Document Scanner (camera sau, tự bắt mép + nắn thẳng ảnh nghiêng, tự chụp) — giải cả "nghiêng" lẫn "đơ".
- **A13-5 🟠 Chụp hoá đơn → đọc hoá đơn rất chậm (Phương: "rất đơ")** — bản 322acd6, A13 camera 50 MP, 18/11.
  Camera mở nhanh (Displayed +459–587 ms); nạp ML Kit ~1 s; nhưng từ lúc bấm OK quay về app tới lúc `readReceipt`
  bắt đầu (`at` trong `receipts` = now lúc gọi): 17,6 s / 14,9 s / 17,8 s (3 lần, logcat onTop 11:40:52.5, 11:43:55.5,
  11:46:16.7). OCR còn chạy thêm sau đó (timeout 10 s → null = ô trống). Nguyên nhân nghi ngờ:
  `src/features/entries/photo.tsx:18` `launchCameraAsync({ quality: 0.6 })` → nén lại JPEG 50 MP trên máy yếu; OCR
  (`src/features/ocr/reader.ts:62`) chạy trên ảnh full-res. Phương yêu cầu: ảnh nghiêng vẫn phải đọc được + nhanh.
- **A13-4 🟠 Đọc hoá đơn bỏ trống tổng tiền trên hoá đơn Tesco rõ ràng** — bản 8cb9c8f, camera A13 thật, 18/11 11:16.
  Hoá đơn 3 (in phẳng): "TOTAL: £33.50", trên có "Subtotal: £42.00 / Savings: -£8.50", dưới "Cash £35.00 / CHANGE DUE:
  £1.50". App: Tesco ✅, 07/05 15:25 ✅, số tiền £0.00. Hoá đơn 2 (Tesco 1997, giấy cong) cũng £0.00; hoá đơn 1 (Tesco
  2022) đúng £55.30. Kỳ vọng: £33.50 (TOTAL có nhãn rõ). Nguyên nhân nghi ngờ: `src/features/ocr/parseReceipt.ts:101-122`
  `rowAmounts` — ML Kit tách nhãn "TOTAL:" và "£33.50" thành 2 khối; ảnh hơi nghiêng → số lệch > 1 chiều cao dòng, hoặc
  nhãn "Cash" ngay dưới bị coi là gần "£33.50" hơn (`closerLabel`) → không có ứng viên → nhánh dự phòng
  (`parseReceipt.ts:150-155`) nhiều số khác nhau → độ tin cậy 0,4 → không điền. Chưa xác nhận được vì bản release không ghi
  dòng OCR thô. Đề xuất: thêm dòng OCR thô (chữ + box) vào file chẩn đoán (giữ lâu "Version") để soi; nới `tol` theo độ
  nghiêng ước lượng từ các cặp nhãn–số khác.
- **A13-3 🟠 Mất ảnh hoá đơn + nháp sau khi chụp > ~1 phút (quyền camera "Chỉ lần này")** — bản 8cb9c8f, 18/11.
  **Chẩn đoán sửa lại 11:25** (lúc đầu ghi do App lock — SAI): logcat cả 2 lần đều có `ActivityManager: Killing
  <pid>:com.phiotron.sundaysort (adj 900): one-time permission revoked` (11:05:57.714 và 11:19:34.133) — quyền camera
  cấp "Chỉ lần này", app nằm sau camera > ~1 phút → Android thu hồi quyền và TẮT tiến trình; khởi động lại vì
  `ImagePickerFileProvider` → về Home (lần 1 hiện Unlock chỉ vì tiến trình mới khởi động khi App lock bật). Lần 2
  (App lock tắt, có nháp Tesco + 1 ảnh, bấm "+ Photo"): sau đó New expense trống — nháp và cả 2 ảnh mất. Đây đúng là
  **B-89** (lấy ảnh từ `cache/ImagePicker` theo `cameraStartedAt`, `src/app/capture.tsx:126,257`,
  `src/features/entries/captureDraft.ts:64`) — commit b8db22b **không có trong 8cb9c8f**, có trong b4e79ce → kiểm lại
  trên b4e79ce. B-99 (bọc `withLockSuspended`) vẫn đúng nhưng không phải nguyên nhân chính.
- **App lock ✅ phần còn lại / B-65 ✅**: bật bằng vân tay thật; Recents: thẻ Sunday Sort trắng (chỉ icon)
  `manual/B-65-recents-card.png`; sau 1 phút ở nền, `sundaysort://entries` → chỉ "Unlock Sunday Sort" (cây UI không có
  số tiền; cửa sổ vân tay chặn chụp màn); vân tay → vào thẳng Entries; trong app vẫn chụp màn hình được.
- **A13-2 🟠 Chuyến tự động không bắt đầu khi chạy chậm, dừng nhiều (ca thật 17/11 tối, TC-299)** — Phương chạy xe
  với bản 538ede9, "Automatic trips" bật, đủ quyền (vị trí nền, hoạt động thể chất), pin Unrestricted. Kỳ vọng: trong
  1–5 phút có "Trip started automatically". Thực tế: không chuyến nào ngày 17/11 tối (sao lưu 18/11 08:30, 266 chuyến,
  chuyến mới nhất 16/11). Bằng chứng `qa-runs/a13/real-backup/SundaySort-REAL-2026-11-18-after-drive.sundaysort`
  (s1.engine chỉ giữ trạng thái cuối `still` 08:22 18/11 — không còn lịch sử tối qua; logcat máy không còn tới tối qua).
  Nguyên nhân nghi ngờ: `src/features/trips/auto/engine.ts:74,116` chỉ bắt đầu khi Activity Recognition báo
  `driving` (IN_VEHICLE, mẫu ≥ 75%) — không có dự phòng tốc độ GPS; đi chậm/dừng nhiều Google hay báo still/tilting/
  walking; nếu là **xe máy** Google hay báo ON_BICYCLE → `cycling` không bao giờ mở chuyến. Đang hỏi Phương xe máy hay
  ô tô. Đề xuất: ghi nhật ký tín hiệu AR (vòng 200 dòng) để ca sau đọc được; cân nhắc mở chuyến khi `cycling` kéo dài
  + tốc độ GPS > 15 km/h, hoặc dự phòng GPS.
- **A13-1 🟡 Lỗi chữ ở hộp "Change region?" (US → UK)** — persona P051, bản 88fde59. Bước: Settings → Region →
  United Kingdom → để trống tỷ giá → Change. Kỳ vọng: gợi ý lỗi cùng chiều với ô (1 $ = ? £, "e.g. 0.79"). Thực tế:
  ô ghi "e.g. 0.79" nhưng lỗi "Enter a rate like 1.27" (tỷ giá £→$) → người dùng Mỹ dễ gõ 1.27 làm số tiền tăng 60%.
  Bằng chứng `qa-runs/a13/P051/22-after-switch.png`. Nguyên nhân: `src/i18n/en.ts:558` `rateError` cố định 1.27,
  trong khi `src/app/settings.tsx:440` đổi placeholder theo vùng.
