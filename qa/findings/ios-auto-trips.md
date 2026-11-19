# B-95 + B-96 — Chuyến tự động trên iOS · phiên H · 2026-11-18

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
- **B-96 — dự phòng không cần app chạy** (`auto/backstop.ts`, `backstopPlan.ts`): iOS không có báo thức mở app, và app
  ngừng chạy đúng lúc ghi bị hỏng (bị tắt, mất quyền vị trí) → ngoài hẹn giờ, 2 thông báo "Still on a trip?" / "Trip isn't
  recording" được **hẹn sẵn bằng thông báo cục bộ** (cùng identifier với engine → không trùng), tính như `engine.step`
  (+90 s): Still = lần di chuyển cuối + 45 phút (chuyến tay, không đang lái); Silent = điểm GPS cuối + 10 phút khi CoreMotion
  đang "driving". Hẹn lại khi có điểm GPS mới (`TRIP_TASK`, ~1 lần/phút), sau mỗi lượt engine, huỷ khi hết chuyến/tạm dừng/
  tắt "missed trip" trong cài đặt. Engine thấy thông báo dự phòng đã hiện thì không gửi lại. Silent cần quyền Motion (như Android).
- **Đoạn đầu chuyến:** iOS biết muộn vài trăm mét → nếu lần thức là "rời chỗ đỗ" thì chèn điểm đầu tại chỗ đỗ, giờ = giờ bắt
  đầu (`seedStartPoint`, không đổi `lastPointAt`) → quãng đường gồm cả đoạn trước khi GPS chạy.
- **Màn Automatic trips / Home / thông báo:** `iosNote` nói đúng cách iPhone dò; thẻ cam iOS: thiếu quyền (Motion, Location
  "Always") → Finish setup; Background App Refresh tắt / Low Power Mode → "may miss drives" + nút Open Settings. Máy không có
  chip chuyển động (simulator) → "can't recognise driving", không hiện "Working". Thẻ Home + thông báo "paused" iOS không nói
  "battery saving" nữa, mở `/trip/setup`. "Share trip diagnostics" có thêm `transitions` (iOS) — nhật ký không chứa toạ độ.
- Test: `iosAutoTrips.test.ts` (đổi tín hiệu, lùi giờ, kết thúc, đèn đỏ/hầm, chuyến biết muộn, điểm đầu), `iosNative.test.ts`.
  jest 908/908 · tsc · lint xanh.

## Build
- EAS `ios-simulator-preview` từ commit 55db0eb (toàn bộ Swift B-95; B-96 chỉ đổi JS) → **xanh**:
  https://expo.dev/accounts/phamthuphuong/projects/sundaysort/builds/ab575790-4e80-4cde-83dc-18e8e287dc08
- Gói JS iOS của bản cuối (B-96) kiểm bằng `npx expo export --platform ios` → OK.
- Simulator không có chip chuyển động → màn Automatic trips hiện "can't recognise driving" (đúng); không thử được dò lái trên simulator.

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

8. B-96: thông báo hẹn sẵn có hiện đúng giờ khi app bị vuốt tắt giữa chuyến tay; bấm "End trip" trên thông báo kết thúc
   đúng giờ dừng; không hiện sai khi chỉ dừng đèn đỏ / kẹt xe (Silent chỉ hẹn khi CoreMotion "driving" — kẹt xe đứng im
   > 10 phút mà GPS bỏ điểm đứng yên có thể báo nhầm "Trip isn't recording", giống Android).

## Giới hạn đã biết
- Lần thức chỉ bằng đổi vị trí (không rời vùng) → đoạn trước điểm GPS đầu không tính; khoảng trống giữa 2 chuyến hiện "Missing trip?" (Q26).
- Không có Bluetooth xe / cắm sạc trên iOS (`isCharging` luôn false để "Start when charging" không bật chuyến ở nhà).
- Precise Location tắt: engine vẫn bật chuyến nhưng GPS thô → 0 mi (như MOD-1); health iOS chưa báo riêng.

## Thử trên Appetize (iPhone 14 Pro ảo, iOS 17.2) · 2026-11-18
Bản build simulator `55db0eb` (chưa có B-96). Gói Appetize miễn phí: mỗi phiên tối đa 3 phút, hết giờ thì hình đứng (không phải lỗi app).
- ✅ Onboarding UK chạy; màn Automatic trips: "This phone can't recognise driving. Use Start trip or an NFC tag." + `iosNote` hiển thị đúng, không có "Working".
- ✅ Start trip → màn xin quyền của app → iOS "While Using" → thông báo → iOS hỏi "Always" → màn ghi chuyến (RECORDING, Finding GPS).
- 🔴 **Mới — End trip treo màn hình trên iOS** (lặp 3/3 lần, chuyến tay 0 mi): sau khi bấm End trip chỉ còn chữ "0.0", tấm
  "kết thúc chuyến" không hiện, nút thu nhỏ không bấm được → phải tắt app. Nhật ký iOS:
  `[Presentation] Attempt to present <RCTFabricModalHostViewController> on <ExpoRootViewController> (from <RNSScreen>) while a presentation is in progress.`
  Nguyên nhân (đọc code `src/app/trip/active.tsx`): `{gpsDialog}{shortDialog}{endSheet}` nằm ở 2 nhánh render khác vị trí
  (đang có chuyến: con thứ 4–6; hết chuyến: con thứ 3–5) → khi `ended` có trước lúc `trip` về undefined, Sheet (RN `Modal`)
  được mở ở nhánh 1 rồi bị gỡ + mở lại ở nhánh 2 → iOS từ chối mở Modal khi Modal cũ đang đóng. Android không bị (Modal = Dialog).
  Cùng kiểu rủi ro: B-107 "Keep" (Dialog đang mờ dần đóng thì mở Sheet ngay). Còn có trên `dev` hiện tại.
- 🟠 **Mới — câu xin quyền vị trí iOS sai từ khi có chuyến tự động** (`app.json`): "records your route only while a trip you
  started is running" và "Recording stops when you end the trip" — nhưng bật chuyến tự động thì app theo dõi đổi vị trí /
  vùng 150 m ở nền cả khi không có chuyến. Apple 5.1.1 yêu cầu câu mục đích đúng → cần sửa trước khi nộp App Store.

## Kiểm bản sửa B-117 / B-118 qua lượt iOS 4g (GitHub Actions 44274943533, dev 4e4b030) · 2026-11-19
Đọc artifact `qa-ios-5` (ảnh + `commands.json` bước `16_end_trip`), iOS 26.5:
- **B-117 ✅** P052 (iPhone SE): Start trip → End trip → tấm "Trip saved · 0.0 mi" hiện ngay (`P052_16b_end_sheet.jpg`) → Save
  → Home + thông báo "Trip saved · 0.0 mi" (`P052_16c_after_save.jpg`). P091 (SE, chữ `accessibility-large`): tấm cũng hiện,
  không treo (`P091_16b_end_sheet.jpg`); bước ❌ chỉ vì kịch bản `tapOn "Save"` không cuộn — nút Save nằm dưới mép, tấm có
  ScrollView nên cuộn tới được (lỗi kịch bản, không phải app). 🟡 gợi ý: ở chữ rất to trên máy nhỏ, Save nên ghim đáy tấm
  (`Sheet` có sẵn `footer`). P016: bước 16 không chạy (hết giờ persona); P041 không có kết quả (driver).
- **B-118 ⏭** chưa thấy: hộp xin quyền hệ thống không nằm trong ảnh/cây màn hình của lượt này → kiểm trên Appetize bản cuối
  hoặc iPhone thật.

## B-118 — câu xin quyền trong cấu hình iOS cuối · 2026-11-19
Kiểm bằng `npx expo config --type introspect` (Info.plist mà prebuild/EAS sinh ra từ dev 45e0b4e; iOS hiện nguyên văn câu này trong hộp xin quyền):
- ✅ `NSLocationWhenInUseUsageDescription` = "Sunday Sort records the route of your trips to work out your mileage. Your routes stay on your phone."
- ✅ `NSLocationAlwaysAndWhenInUseUsageDescription` = câu mới (Automatic trips + rời chỗ đỗ) — không còn "only while a trip you started is running".
- ✅ `NSMotionUsageDescription` đúng; `UIBackgroundModes` = fetch, processing, location.
- 🟡 Còn câu mặc định của thư viện (iOS 15+ không hiện, nhưng người duyệt App Store đọc được trong Info.plist):
  `NSLocationAlwaysUsageDescription` = "Allow $(PRODUCT_NAME) to access your location" (chỉ iOS ≤ 10) → nên đặt `locationAlwaysPermission`
  trong plugin expo-location bằng câu Always mới; `NSLocationTemporaryUsageDescriptionDictionary` (app không gọi xin vị trí chính xác tạm thời → không hiện);
  `NSLocalNetworkUsageDescription` "Expo Dev Launcher…" do `expo-dev-client` nằm trong dependencies (không hiện ở bản release).
- ⏭ Hình hộp xin quyền thật: xem lại trên Appetize bản cuối (không bắt buộc — chuỗi đã đúng).
- Lỗ hổng test iOS còn lại không cần iPhone: `16_end_trip` chỉ đặt 1 điểm GPS → chuyến 0.0 mi; chưa thử chuyến **có quãng đường** trên iOS
  (Maestro `travel` chạy tuyến giả trên simulator: ghi GPS nền, quãng đường, điểm đầu chỗ đỗ, thức khi rời vùng 150 m). CoreMotion không có trên simulator → dò lái tự động vẫn cần iPhone thật.
