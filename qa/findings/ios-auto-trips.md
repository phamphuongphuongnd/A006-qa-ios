# B-95 (+ một phần B-96) — Chuyến tự động trên iOS · phiên H · 2026-11-18

Nhánh `ios-auto-trips` (worktree `apps/A006-wt/ios-auto-trips`, từ `dev` 99ecae0). Chưa push.

## Đã làm
- **Đánh thức app nền** (`modules/trip-detect/ios/TripWatcher.swift`): `startMonitoringSignificantLocationChanges`
  (~500 m+, không bật GPS) + **vùng 150 m quanh chỗ đỗ cuối** (điểm cuối chuyến GPS gần nhất, `watchDeparture`) → rời chỗ
  đỗ là iOS đánh thức / mở lại app sớm hơn. `TripDetectAppDelegate` bật lại theo dõi ngay trong `didFinishLaunching` để nhận
  sự kiện khi iOS mở lại app đã tắt. `UIBackgroundModes location` đã có sẵn (`isIosBackgroundLocationEnabled` trong app.json).
  GPS của chuyến vẫn là `TRIP_TASK` của expo-location (nó tự đặt `allowsBackgroundLocationUpdates`).
- **Khi thức** (đổi vị trí / rời chỗ đỗ / hẹn giờ / mở app / CoreMotion trực tiếp khi app đang chạy): đọc lịch sử CoreMotion
  từ lần đọc trước (tối đa 6 giờ) → ghi bản chụp thô `kind: 'motion'` (hoạt động + độ tin cậy + giờ thật) vào vòng nhật ký
  bền `TripEventLog` (file Application Support, 1.000 dòng, không ghi đè khi máy còn khoá sau khởi động) → `getRecentEvents`.
- **JS dùng chung engine Android:** `src/features/trips/auto/motion.ts` đổi bản chụp → `exit`/`enter` (giờ thật, bỏ độ tin
  cậy thấp, lái xe "tin cậy thấp" ngay trước lái xe chắc chắn thì tính từ đó, bỏ chuyến đã xong > 5 phút trước khi máy biết —
  để Q26 "Missing trip?" lo). `native.readSignals` trên iOS đọc lùi 6 giờ rồi đổi; Android không đổi gì.
- **JS chạy khi app tắt:** iOS mở lại cả app (gồm JS) khi có sự kiện vị trí → `backgroundTask.ts` chạy 1 lượt engine lúc nạp
  bundle ở nền + nghe `onSignal` (sự kiện tới trước khi JS nghe thì giữ lại, gửi khi JS bắt đầu nghe). Giữ app thêm ~25 s
  (`beginBackgroundTask`) cho JS khởi động + bật GPS. `processAutoSignals` chạy thêm 1 lượt nếu có tín hiệu tới giữa lượt
  (cũng có lợi cho Android, không đổi luật dò).
- **Kết thúc chuyến / "Still on a trip?" / "Trip isn't recording" (B-96):** `scheduleWake` trên iOS = hẹn giờ (đồng hồ thật)
  chạy được vì khi có chuyến `TRIP_TASK` giữ app chạy nền. Luật giữ nguyên (`mergeStopMinutes`, `MIN_AUTO_TRIP_M` 500 m).
- **Đoạn đầu chuyến:** iOS biết muộn vài trăm mét → nếu lần thức là "rời chỗ đỗ" thì chèn điểm đầu tại chỗ đỗ, giờ = giờ bắt
  đầu (`seedStartPoint`, không đổi `lastPointAt`) → quãng đường gồm cả đoạn trước khi GPS chạy.
- **Màn Automatic trips / Home / thông báo:** `iosNote` nói đúng cách iPhone dò; thẻ cam iOS: thiếu quyền (Motion, Location
  "Always") → Finish setup; Background App Refresh tắt / Low Power Mode → "may miss drives" + nút Open Settings. Máy không có
  chip chuyển động (simulator) → "can't recognise driving", không hiện "Working". Thẻ Home + thông báo "paused" iOS không nói
  "battery saving" nữa, mở `/trip/setup`. "Share trip diagnostics" có thêm `transitions` (iOS) — nhật ký không chứa toạ độ.
- Test: `iosAutoTrips.test.ts` (đổi tín hiệu, lùi giờ, kết thúc, đèn đỏ/hầm, chuyến biết muộn, điểm đầu), `iosNative.test.ts`.
  jest 908/908 · tsc · lint xanh.

## CHƯA thử trên máy thật (không có Apple Developer + iPhone — TC-340)
Cần chạy xe thật trên iPhone, ghi "Share trip diagnostics" sau mỗi lượt:
1. iOS có thật mở lại app (đã vuốt tắt) khi đổi vị trí / rời vùng 150 m không; JS có kịp bật chuyến trong ~25 s không.
2. `queryActivityStarting` có trả dữ liệu khi máy đang **khoá màn hình** không (nếu lỗi → nhật ký có `wake` `motion_error`).
3. `startLocationUpdatesAsync` gọi từ nền (quyền "Always") có chạy không → nếu không, sẽ thấy thông báo "Driving? Tap to record".
4. Hẹn giờ thức (DispatchSource đồng hồ thật) có nổ đúng khi xe đứng yên lâu, màn tắt không. Dự phòng đã có: mỗi lô vị trí
   của `TRIP_TASK` (iOS, chuyến tự động) mà đã đứng yên ≥ thời gian gộp thì engine chạy trước → kết thúc chuyến cũ tại lúc dừng
   trước khi điểm của lượt lái mới nhập vào. Còn hở: CoreMotion báo "driving" sớm hơn lô GPS đầu của lượt lái mới → hai chuyến
   có thể bị gộp. Nếu gặp → cần luật engine "lái lại sau khi đứng yên ≥ merge → tách chuyến" (đụng cả Android, hỏi trước).
5. Độ trễ thực tế: rời chỗ đỗ → chuyến bắt đầu; độ tin cậy CoreMotion "automotive" ở UK (đèn đỏ, kẹt xe, xe buýt).
6. Background App Refresh tắt có làm iOS không mở lại app cho sự kiện vị trí không (hiện chỉ báo "may miss drives").
7. Quyền: luồng S-07e trên iOS xin "Always" (iOS có thể chỉ cho "While Using" rồi hỏi lại sau) → trạng thái đổi đúng không.

## Giới hạn đã biết
- Lần thức chỉ bằng đổi vị trí (không rời vùng) → đoạn trước điểm GPS đầu không tính; khoảng trống giữa 2 chuyến hiện "Missing trip?" (Q26).
- Không có Bluetooth xe / cắm sạc trên iOS (`isCharging` luôn false để "Start when charging" không bật chuyến ở nhà).
- Precise Location tắt: engine vẫn bật chuyến nhưng GPS thô → 0 mi (như MOD-1); health iOS chưa báo riêng.
