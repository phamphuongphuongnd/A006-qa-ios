# QA-100 — phiên D `qa-special` (kiểm chuyên đề T4: hiệu năng · bảo mật · mạng · bất thường & đồng thời)

APK: `C:\Users\Admin\qa-tools\apk\sundaysort-qa-ece3819.apk` (release, code `dev`).
Máy ảo: `qa_special_api37` (emulator-5556) — AVD mới cùng system image `android-37.0 google_apis_playstore x86_64` với
`Medium_Phone_API_37.0` (cấu hình chép `config.ini`, data 6 GB, RAM 4 GB, 4 nhân, GPU swiftshader). Lý do không dùng `-read-only`:
emulator-5554 chạy AVD đó **không** `-read-only` → emulator từ chối instance thứ 2 ("run all emulators with -read-only").
Bằng chứng: `qa-runs/special/` (gitignore). Kịch bản đo: `qa-runs/special/*.py` (dùng `qa/tools/adbui.py`).
Dữ liệu: P004 (2.011 khoản) · P096 (20.011 khoản, 5 năm 2021–2026) · file độc sinh từ P085 bằng `qa-runs/special/mkbackup.py`.
Công cụ phụ: `qa-runs/special/recv/qa-recv.apk` — app "QA Receiver" tự dựng (nhận Share, lưu file vào thư mục riêng, debuggable,
ký bằng `~/.android/debug.keystore` có sẵn) để kéo file CSV/PDF xuất thật về máy tính đọc.

Ký hiệu: ✅ kiểm thật, đạt · ❌ kiểm thật, lỗi · ⏭ chưa kiểm được + lý do.

## Kết quả

### 1. Hiệu năng (emulator x86_64, GPU phần mềm swiftshader → số khung hình chỉ để so sánh tương đối)
| Mục | Kết quả | |
|---|---|---|
| `am start -W` TotalTime, trung vị 5 lần — 0 khoản | nguội 2.366 ms · ấm (Back rồi mở) 686 ms · nóng (Home rồi mở) 170 ms | ✅ |
| — 2.011 khoản (P004) | nguội 1.903 · ấm 353 · nóng 128 ms | ✅ |
| — 20.011 khoản (P096) | nguội 1.855 · ấm 326 · nóng 120 ms | ✅ |
| Nguội tới khi Home có chữ (dump UI, sai số ~0,7 s), 20k | trung vị 4,64 s; CPU luồng JS 15 s đầu 510 ms | ✅ |
| Khôi phục 20.011 khoản | 22 s, JS 12,3 s CPU, PSS sau 221 MB, không ANR | ✅ |
| Entries mở lần đầu / lần 2 (20k) | JS 220 ms / 30 ms | ✅ |
| Cuộn Entries 20 lần vuốt (20k) | JS 5.880 ms (~290 ms/lần vuốt), khung p50 44 ms / p90 73 ms (GPU phần mềm) | ✅ (đo tương đối) |
| Reports mở lần đầu (20k) / đổi 6 năm thuế | JS 350 ms / 60–350 ms mỗi năm | ✅ |
| Reports khoảng Custom dài (1970→2026, 20k) | **JS ~95 s** — xem SPE-1 | ❌ |
| Xuất CSV 5 năm (17.561 dòng, 2,1 MB) | 17 s tới bảng chia sẻ (gồm hộp "Export anyway"), JS 2,3 s, không ANR | ✅ |
| Xuất PDF (Pro) 20k: 1 quý / 1 năm / 2 năm / 5 năm | 22 s / 37 s ✅ · 2 năm > 12 phút, 5 năm > 25 phút không xong — SPE-6 | ❌ |
| `dumpsys meminfo` lớn nhất (thao tác thường, 20k) | PSS 221–227 MB (Native 96 MB, Java 20 MB) | ✅ |
| Nghỉ nền 10 phút (20k) | 2.030 ms CPU, **toàn bộ trong phút đầu** (chuyển nền), 9 phút sau 0 ms; PSS 227→219 MB | ✅ (B-51 chỉ ghi số) |

### 2. Bảo mật
| Mục | Kết quả | |
|---|---|---|
| 34 deep link lạ (đường dẫn không có, entry/split/trip id giả, chuỗi 5.000 ký tự, `' OR 1=1--`, `%00%0A`, `..%2F`, RTL override, `/////`, `exp+sundaysort://`, `dev/probe`, `dev/ocr`, `dev/gallery`, `locked`, `onboarding`, `backup?run=1`, tham số NaN cho export/auto-sorted/entries/capture/pro) | không crash, không lộ dữ liệu; id giả → "This entry/trip no longer exists"; `dev/*` về Home (release); `onboarding` bị `Stack.Protected` chặn. (Dòng "crash" ở `backup?run=1` trong log là của công cụ `uiautomator`, không phải app) | ✅ |
| `reports?from=&to=` khoảng ngày lạ | **treo app** — SPE-1 | ❌ |
| App lock + deep link/widget/thông báo; Recents khi App lock (B-65) | ⏭ App lock cần khoá màn hình máy (đặt PIN = đổi bảo mật hệ thống, phiên D không tự làm) — **đã giao phiên B (API 26) và E (A13)**. Thông báo chuyến có `vis=PRIVATE` (màn khoá không lộ nội dung) ✅ | ⏭ |
| Ảnh Recents | hiện rõ số tiền — SPE-3 | ❌ (🟡) |
| File sao lưu độc — từ chối đúng (28 file): 0 byte, không phải zip, zip không manifest, cụt, JSON hỏng, `format` khác, `tables` là mảng, version 99, zip-slip `receipts/../x.jpg` / `receipts/../../../../data/...` / `receipts//sdcard/..`, tên ảnh `a b$;\`x\`.jpg`, hàng receipt `filePath: ../../databases/x.db`, `counts.entries` sai, `counts.photos` sai, amount âm, entry không phải object, `type: refund`, categoryId không tồn tại (FK), trùng id | thông báo đúng ("This isn't a Sunday Sort backup file." / "This backup is damaged…" / "…from a newer version…" / "Couldn't restore this backup. Nothing was changed."), dữ liệu 20k nguyên vẹn (vân tay tổng Income/Expenses 5 năm không đổi), không crash | ✅ |
| File hợp lệ nhưng lạ: amount 1e15 / 2^53+2, `occurredAt` 8.64e15+1 / năm 0, currency `XXX<script>` | khôi phục được, 11 màn không crash (UI giới hạn 99.999.999 minor nhưng file thì không — ghi chú trong SPE-4) | ✅ |
| `settings` sai kiểu trong file | màn crash/treo — SPE-4 | ❌ (🟡) |
| `proState` trong file | **mở khoá Pro** — SPE-2 | ❌ (🟠) |
| Zip bomb 200 MB (manifest / ảnh) | không crash, "Nothing was changed", nhưng PSS > 1 GB — SPE-5 | 🟡 |
| CSV/FreeAgent/MTD records/totals xuất thật (kéo về qua QA Receiver) với `=HYPERLINK`, `+cmd`, `-2+3`, `@SUM`, `\t=`, `\r=`, `\n=`, tên hạng mục độc, tên FreeAgent `=1+1` | mọi ô đầu `= + - @ \t \r` có `'` phía trước; XLSX: chuỗi độc là sharedString (text), 35 công thức chỉ dùng tên hạng mục HMRC cố định; PDF in đúng chữ (đã escape HTML, không lặp mã) | ✅ |
| `RNWidgetImageProvider` (exported) qua `adb shell content read/query/insert/delete` | tên cũ không token, token giả, `..%2F..%2Fdatabases`, `../../`, `%2E%2E%2F`, gốc → "Image not found"; query rỗng; insert/delete không làm gì; FileSystem/Sharing provider → Permission Denial | ✅ |
| `run-as com.phiotron.sundaysort` | "package not debuggable" | ✅ |
| logcat bản release (số tiền, ghi chú, toạ độ) | ghi cả phiên 15:21→17:24 (437 nghìn dòng, 50 tiến trình app): 0 ghi chú, 0 toạ độ, 0 số tiền (15 dòng "$" là `$lambda$0`) — `logcat-scan.txt` | ✅ |

### 3. Mạng
| Mục | Kết quả | |
|---|---|---|
| Bản đồ chuyến (OpenFreeMap) khi chế độ máy bay (lần đầu, chưa có cache) | 1 s ô trống → 3 s hiện bản phác hoạ (fallback); logcat `Mbgl … loading style failed: Unable to resolve host`; Back được, không crash | ✅ |
| EDGE (`adb emu network speed edge` + `delay edge`: 57,8 KB/s, 80–400 ms — đã kiểm `network status`) | bản đồ thật hiện sau ~3 s, không treo | ✅ |
| Trễ 2 s (`network delay 2000`) | bản đồ hiện, không treo (đã có cache ô) | ✅ |
| Mất mạng giữa chừng (máy bay bật ở giây 3) | màn giữ nguyên, Back được, không crash | ✅ |
| Màn Pro khi không mạng | hiện đủ, nút "Subscribe now" mờ (không bấm được), "Restore purchase" bấm không crash (12 s chưa thấy thông báo — chưa kết luận) — **không bấm mua / dùng thử** | ✅ |
| Sao lưu thư mục khi mất mạng | ⏭ thư mục Google Drive cần tài khoản Google trên emulator (không có, không tự tạo); thư mục trên máy không phụ thuộc mạng — sao lưu đêm vào `This phone / qa-nightly` chạy được (mục 4) | ⏭ |

### 4. Bất thường & đồng thời
| Mục | Kết quả | |
|---|---|---|
| `am force-stop` ngay sau bấm Save (trễ 0 / 30 / 80 / 150 / 300 / 600 / 1000 ms) | 7/7 khoản lưu đúng 1 lần, không trùng id, không hàng hỏng; đếm khớp (đọc DB thật qua "Back up now" → QA Receiver) | ✅ |
| `force-stop` giữa khôi phục 20.011 khoản (sau 4 / 10 / 16 s) | 4 s, 10 s: dữ liệu cũ nguyên (2.018 khoản); 16 s: trọn bản mới (20.011) — luôn "tất cả hoặc không" | ✅ |
| `force-stop` giữa xuất CSV+PDF 5 năm (1 s, 3 s) | mở lại bình thường | ✅ |
| Xoay màn khi modal nhập đang mở | app khoá dọc → không đổi, số đang gõ giữ nguyên | ✅ |
| Chế độ tối (`cmd uimode night yes`) khi modal mở | đổi màu, giữ số đang gõ | ✅ |
| Cỡ chữ 1.3 / `wm density 480` khi modal mở | **mất khoản đang nhập, về Home** — SPE-7 | ❌ (🟡) |
| Deep link `trip/start` ngay sau đổi cấu hình | **crash** — SPE-8 | ❌ (🟡) |
| Thu hồi quyền vị trí khi chuyến chạy nền: chỉ FINE (+BG) | tiến trình bị hệ thống giết rồi dậy lại, chuyến vẫn "RECORDING", sau 60 s "Weak GPS signal" (còn COARSE) — chuyến lưu phần đã ghi | ✅ (chấp nhận) |
| — FINE + COARSE + BG | Home: "Your trip stopped recording at 16:39 · Saved 0.2 mi up to that point · Add missing miles"; trip/active "No trip running" | ✅ |
| Đầy bộ nhớ (`fallocate` tới còn ~1 MB trống) | lưu khoản OK (2 khoản, đã xác minh trong DB); "Back up now" → "Couldn't create the file. Free up some storage and try again."; mở nguội OK; không crash. Chụp ảnh khoản khi đầy: ⏭ (luồng camera) | ✅ |
| Đổi giờ qua 31/12 (US, app đang mở) | khoản 23:59 vào 2026, khoản 00:00 vào 2027; Home chuyển "Tax year 2027" ở lần vẽ kế (tức thời lúc 00:00 còn ghi 2026 tới khi có thay đổi) | ✅ |
| Đổi giờ qua 5/4 → 6/4 (UK) | "Tax year 2025/26" → "2026/27", tuần "30 Mar – 5 Apr" → "6–12 Apr" | ✅ |
| Lùi giờ về trước ngày bắt đầu dùng thử | Pro → "Pro ended on 6 Apr" (chống chỉnh giờ hoạt động) | ✅ |
| Đổi múi giờ khi chuyến đang chạy (Tokyo → LA → London) | không crash, chuyến lưu đúng; danh sách Miles hiện đúng giờ địa phương. Ghi chú: runtime JS nhận đổi múi giờ không đều — 1 lần màn "Trip saved" ghi giờ LA vài giây sau khi đã sang London, 1 lần Backup ghi "09:53" (London) trong khi máy đã về Bangkok > 1 phút; mở lại app thì đúng. Không lập lỗi riêng (hiếm, tự hết) | ✅ (ghi chú) |
| Đồng thời: chuyến chạy nền (`geo fix` 2 s/lần) + thêm 4 khoản + sửa khoản + ép job sao lưu đêm (`cmd jobscheduler run -f`, giờ đặt 05:30 hôm sau) + widget Quick add trên màn hình chính | `[nightly] done 'written'` → `qa-nightly/SundaySort-backup-2026-11-18-0530.sundaysort` hợp lệ (43 khoản, có khoản thêm trước khi chạy, chuyến đang chạy lưu `running`); widget RemoteViews đổi; chuyến lưu 0,9 mi; không crash. (Ép job khi app ở tiền cảnh: expo-background-task bỏ qua "App is in the foreground" — đúng thiết kế) | ✅ |

## Lỗi tìm được

### SPE-1 🟠 Deep link `sundaysort://reports?from=&to=` với khoảng ngày lạ làm app treo (luồng JS 100%, vòng lặp vô hạn / hàng phút)
- **Máy/dữ liệu:** emulator-5556 API 37, APK `ece3819`, P096 (20.011 khoản).
- **Bước:** `adb shell am start -a android.intent.action.VIEW -d 'sundaysort://reports?from=-99999999999999999&to=0' com.phiotron.sundaysort`
  (link `BROWSABLE` → bất kỳ trang web / app / thẻ NFC nào cũng mở được).
- **Kỳ vọng:** link sai bị bỏ qua (về Reports năm hiện tại). **Thực tế:** app đứng — luồng `mqt_v_js` ~100% liên tục, mọi deep link
  / điều hướng sau đó không chạy, RAM tăng đều (PSS 186 → 222 MB trong 30 s) cho tới khi người dùng buộc dừng app. Không ANR dialog
  (luồng chính vẫn rảnh) nên người dùng chỉ thấy app "đơ".
  - `from=-99999999999999999&to=0`: **không dứt** (đo 160 s, vẫn 100%, RAM tăng).
  - `from=0&to=99999999999999999`, `from=1&to=8640000000000001`, `from=1&to=8639000000000000`: màn ghi "1 Jan 1970 – NaN undefined NaN"
    / "– 5 Jan 275729", JS bận ~190 s rồi mới xong.
  - Khoảng hợp lệ dài **chọn được ngay trong app**: 1970→2026 (56 năm, 20k khoản) JS bận **~95 s** (`from=0&to=1795000000000`).
- **Bằng chứng:** `qa-runs/special/dl-isolate.jsonl`, `dl-duration.txt`, `deeplink-runs.jsonl`, ảnh `dl-*.png`.
- **Nguyên nhân gốc nghi ngờ:**
  - `src/features/reports/series.ts:29-31` `monthlySeries` — `for (let i = 0; ; i++)` chỉ dừng khi `start >= period.end` hoặc `start > now`;
    `period.start` ngoài phạm vi Date (±8.64e15) → `new Date(...)` Invalid → `start = NaN` → cả 2 điều kiện luôn false → vòng lặp vô hạn,
    `buckets` phình tới OOM. Khoảng dài hợp lệ: mỗi tháng 1 bucket + `buckets.find` cho từng khoản (O(khoản × tháng)) + vẽ từng tháng.
  - `src/app/(tabs)/reports.tsx:52-55` `linkedPeriod` chỉ kiểm `isFinite` và `end > start`, không chặn biên (năm 2000…nay+1) hay độ dài.
  - `src/app/(tabs)/reports.tsx:543` ô "From" của Custom không có `minimumDate` → người dùng tự chọn được khoảng hàng chục năm.
- **Gợi ý sửa (SPE-1):** chặn `linkedPeriod` (và Custom) trong khoảng hợp lý, vd. start ≥ 2000-01-01, end ≤ nay + 1 năm, độ dài ≤ 10 năm; `monthlySeries`
  thêm `if (!Number.isFinite(start)) break` + trần số bucket.

### SPE-2 🟠 File sao lưu tự chế mở khoá Pro vĩnh viễn ("Trial · 26708 days left") — không cần mua
- **Bước:** máy chưa từng dùng thử / mua (người dùng free — hoặc cài lại app sau khi hết dùng thử) → Settings → Backup & restore → Restore from
  backup → chọn file `.sundaysort` có `tables.proState = [{id:'pro', trialStartedAt: <now-1h>, trialEndsAt: 4102444800000 (năm 2100),
  entitlement:'none', …}]` → Replace → Restore. File tạo bằng `qa-runs/special/mkbackup.py` (`evil/pro-trial-2100.sundaysort`), chỉ cần sửa
  1 dòng JSON trong zip — dễ chia sẻ trên mạng thành "file Pro miễn phí".
- **Kỳ vọng:** dữ liệu Pro (quyền lợi) không lấy từ file người dùng sửa được; dùng thử tối đa 7 ngày. **Thực tế:** Settings "Sunday Sort Pro ·
  Trial · 26708 days left"; Export mở khoá PDF, MTD, .xlsx, FreeAgent, ZIP ảnh (đã xuất thật PDF + .xlsx). Biến thể `entitlement:'active',
  expiresAt: 2100` (file `pro-active-2100`) theo mã cũng được nhận nhưng tự hết sau lần kiểm store 12 h (chưa thử máy: máy đã có hàng pro_state).
- **Bằng chứng:** `qa-runs/special/evil-runs.jsonl` (dòng `pro-trial-2100`), lệnh kiểm Settings ngay sau đó; xuất PDF `injpdf-*.pdf`.
- **Nguyên nhân gốc:** `src/features/backup/dataStore.ts:127` — khôi phục chép `proState` của file khi máy chưa có hàng `pro_state`;
  `src/features/backup/pack.ts:257` `proState: (r) => isStr(r.id)` không kiểm gì thêm; dùng thử chỉ lưu trên máy (`src/domain/pro.ts:55-59`
  tin `trialEndsAt`), và `src/features/pro/store.ts:168-171` không bao giờ kiểm store cho máy chưa từng có `entitlement` active/expired
  → người dùng free không có hàng `pro_state` nào để chặn.
- **Gợi ý sửa:** khi khôi phục chỉ nhận `trialStartedAt` (để giữ "đã dùng thử") và tự tính `trialEndsAt = min(file, trialStartedAt + 7 ngày)`,
  bỏ qua `trialStartedAt > now`; không bao giờ nhận `entitlement:'active'` từ file (store sẽ tự xác nhận khi bấm Restore purchase).

### SPE-3 🟡 Ảnh đa nhiệm (Recents) hiện rõ số tiền — kể cả khi bật App lock (không có FLAG_SECURE / che màn khi rời app)
- **Bước:** mở Reports (20k khoản) → nút đa nhiệm (`input keyevent KEYCODE_APP_SWITCH`).
- **Thực tế:** thẻ Recents hiện Income $109,343.35 / Expenses / Profit đầy đủ (`qa-runs/special/recents-reports.png`).
  `dumpsys window` không có cửa sổ secure; cả repo không dùng `FLAG_SECURE` / `expo-screen-capture` / `setRecentsScreenshotEnabled`.
- **Với App lock bật:** ⏭ chưa kiểm trên máy — App lock đòi khoá màn hình máy ("Set up a screen lock on your phone first."), đặt PIN cho máy là
  thay đổi bảo mật hệ thống nên phiên D không tự làm. Theo mã: `src/services/data.tsx:48-56` `LockGate` chỉ khoá lúc **quay lại** (`active`),
  không che màn lúc vào nền → ảnh Recents được chụp khi nội dung còn hiện → người cầm máy mở đa nhiệm vẫn thấy số tiền dù app đang khoá.
- **Gợi ý:** khi `appLock` bật: che màn lúc `AppState` → `inactive/background` (vẽ lớp khoá ngay) hoặc `setRecentsScreenshotEnabled(false)` (API 33+)
  / `FLAG_SECURE` (chặn cả chụp màn — cân nhắc vì người dùng có thể muốn chụp báo cáo).

### SPE-4 🟡 Khôi phục file có `settings` sai kiểu → màn chính crash / treo lâu dài (tới khi khôi phục file khác)
- **Bước:** Restore các file `qa-runs/special/evil/settings-*.sundaysort` (P085 + 1 khoá settings đổi kiểu), rồi mở từng màn
  (`qa-runs/special/settings_run.py`, kết quả `settings-runs.jsonl`, `settings-run.out`).
- **Thực tế (app tự lưu các giá trị này, nên lỗi lặp lại mỗi lần mở):**
  | Khoá trong file | Màn hỏng |
  |---|---|
  | `region: "ZZ"` | **Miles** crash app (`TypeError: Cannot convert undefined value to object` ở `MilesScreen`); **Reports** luồng JS 100% không vẽ (lần đầu: màn "Restoring…" kẹt 657 s vì tab Reports đang gắn); Settings mở được |
  | `mileageRates: "x"` | **Miles** + **Reports** crash app |
  | `notify / alertSnoozedUntil / exportLog: null` | **Notifications** crash (`Cannot read property 'tripAuto' of null`) |
  | `dailyNudge: 5`, `lockAfterMs: "soon"`, `onboarded: false` | không crash (`onboarded:false` → về màn chào, dữ liệu còn) |
  Có lúc **Settings** cũng crash (sau `mileageRates:"x"`: `TypeError … at SettingsScreen`) → người dùng không vào được "Backup & restore"
  để sửa; chỉ gỡ được bằng route `sundaysort://backup` (người dùng thường không biết) hoặc Xoá dữ liệu app (mất hết).
- **Kỳ vọng:** file sao lưu có giá trị lạ → giá trị đó bị bỏ, dùng mặc định (như JSON hỏng). **Nguyên nhân gốc:**
  `src/features/backup/pack.ts` ROW_CHECKS `settings: isStr(key) && isStr(value)` (không kiểm nội dung); `src/db/settingsRepo.ts:117-127`
  `getSettings` chỉ `JSON.parse`, không kiểm kiểu/giá trị (`region` ∉ {UK, US}, `mileageRates` không phải object…);
  nơi dùng: `src/app/(tabs)/miles.tsx:126`, `src/features/reports/useReport.ts:29`, `src/app/settings.tsx:160` (`settings.mileageRates[region]`
  → undefined → `ratePeriods(undefined)` `src/domain/mileage.ts:199`), `src/app/notifications.tsx` (`notify.tripAuto`).
  Treo Reports khi region lạ: chưa tìm ra vòng lặp chính xác (không có lỗi JS nào trong logcat).
- **Gợi ý:** kiểm/chuẩn hoá từng khoá trong `getSettings` (enum region, object có shape, số hữu hạn) — sai thì dùng mặc định; ROW_CHECKS chỉ
  nhận khoá biết và giá trị đúng kiểu. Ai cũng chỉ gặp khi file bị sửa/hỏng (app không tự ghi giá trị lạ) → 🟡.
- **Cùng nhóm (không crash):** `entries.amountMinor` = 1e15 hoặc 2^53+2 vẫn được nhận (UI giới hạn `MAX_MINOR` 99.999.999 ở
  `src/domain/money.ts:4`); tổng > 2^53 mất chính xác → nên thêm `amountMinor <= MAX_MINOR` vào ROW_CHECKS `entries` (`pack.ts`).

### SPE-5 🟡 Khôi phục file "zip bomb" / file lớn: không crash, dữ liệu giữ nguyên, nhưng RAM vọt > 1 GB (máy RAM thấp dễ bị hệ thống giết)
- **Bước:** Restore `evil/bomb-json-200mb` (backup.json có 1 ghi chú 200 MB chữ "A", file nén 207 KB) và `evil/bomb-photo-200mb`
  (1 ảnh 200 MB số 0, file nén 207 KB).
- **Thực tế:** bomb-json: màn xem trước hiện sau ~13 s (PSS 116 → 720 MB và **giữ 720 MB** khi đứng ở màn xem trước); bấm Restore → PSS
  1.055 MB → Java `OutOfMemoryError` (cấp 209.715.216 byte) được bắt → "Couldn't restore this backup. Nothing was changed." bomb-photo: qua bước
  xem trước, bấm Restore → PSS 109 → 1.133 MB trong 55 s → OOM được bắt → cùng thông báo. App không crash, dữ liệu cũ nguyên vẹn ✅.
  Trên emulator 3 GB thì sống; máy 2 GB (vd. Android Go / A13 khi nhiều app) dễ bị LMK giết giữa chừng — vẫn an toàn vì transaction, nhưng
  người dùng chỉ thấy app tắt.
- **Bằng chứng:** `qa-runs/special/bomb-runs.jsonl`, `bomb-json-restore.txt`, `evil-shots/bomb-photo-200mb-bomb.png`.
- **Nguyên nhân gốc:** `src/features/backup/pack.ts` `readZip` → `unzipSync(bytes, …)` giải nén **toàn bộ** manifest + mọi ảnh vào RAM
  (không kiểm `originalSize`), `src/app/backup.tsx` (`restoreUri`) đọc cả file bằng `new File(...).bytes()`; `restoreFromBackup`
  (`backupFile.ts`) ghi từng ảnh bằng `writeSync(bytes)` (chép sang Java byte[]).
- **Liên quan dữ liệu thật:** cùng cơ chế, một bản sao lưu hợp lệ nhiều ảnh (Pro không giới hạn ảnh, 5 năm × vài chục ảnh/tháng = vài trăm MB)
  cũng phải nằm trọn trong RAM khi khôi phục — chưa dựng file thật cỡ đó để thử (⏭, cần ~300 MB ảnh).
- **Gợi ý:** `unzipSync` với `filter` kiểm `f.originalSize` (vd. manifest ≤ 50 MB, mỗi ảnh ≤ 20 MB, tổng ≤ dung lượng trống) → báo "damaged";
  khôi phục ảnh theo luồng (từng ảnh) thay vì giữ cả Map ảnh.

### SPE-6 🟠 Xuất PDF khoảng dài (≥ 2 năm / ~8.000 khoản) treo vô hạn ở "Preparing your files…", WebView ngốn ~2,9 GB RAM, cả máy ì
- **Máy/dữ liệu:** emulator-5556 API 37 RAM 3 GB, P096 (20.011 khoản), Pro (bật bằng SPE-2 để thử).
- **Bước:** `sundaysort://reports?from=<đầu kỳ>&to=<cuối kỳ>` (= Reports → Custom) → Export → chỉ chọn "PDF report" → Export.
- **Thực tế:**
  | Kỳ | Kết quả |
  |---|---|
  | 1 quý 2023 | 22 s tới bảng chia sẻ, PDF 239 KB ✅ |
  | năm 2023 (~4.000 khoản) | 37 s, PDF 567 KB ✅ |
  | 2022–2023 (~8.000 khoản) | **> 12 phút chưa xong**; tiến trình `webview:sandboxed_process0` RSS **2,87 → 2,96 GB** (71% RAM máy), `kswapd0` 77% CPU, `screencap`/`uiautomator` của máy hết thời gian chờ |
  | 2021–2026 (17.561 khoản) | **> 25 phút** vẫn "Preparing your files… PDF report", luồng JS/luồng chính rảnh (lời gọi in không bao giờ trả về, không báo lỗi) |
  Nút Cancel vẫn bấm được. Không ANR, không crash app.
- **Bằng chứng:** `qa-runs/special/pdf20k-stuck-25min.png`, `pdf2y-stuck-12min.png`, `pdf20k-watch.txt`, `export-runs.jsonl`, `logcat-session.txt`
  (sandboxed_process0 :3 sinh 15:48:04, không kết thúc).
- **Nguyên nhân gốc nghi ngờ:** `src/features/reports/exportDocs.ts:188-190` bảng "Entries" in **mọi** khoản của kỳ vào 1 trang HTML; `buildExport.ts:243`
  `Print.printToFileAsync({ html })` dựng cả tài liệu trong WebView (bộ nhớ theo số dòng) và không có giới hạn thời gian.
- **Gợi ý:** PDF chỉ in tối đa N dòng khoản (vd. 1.500) + dòng "Full list in the CSV", hoặc chia nhiều file/kỳ; thêm timeout (vd. 120 s) → báo lỗi
  "Too many entries for one PDF — pick a shorter period" thay vì quay mãi.

### SPE-7 🟡 Đổi cỡ chữ / cỡ hiển thị khi app đang mở → app dựng lại từ đầu, mất khoản đang nhập dở (modal đóng, về Home)
- **Bước:** `sundaysort://capture` → gõ `4321` ($43.21) → `adb shell settings put system font_scale 1.3` (hoặc `wm density 480`; tương đương người dùng
  đổi Font size / Display size trong Cài đặt rồi quay lại app).
- **Kỳ vọng:** như chế độ tối (giữ nguyên màn và số đang gõ — đã thử ✅). **Thực tế:** cùng tiến trình (pid không đổi) nhưng Activity dựng lại → về Home,
  modal nhập + $43.21 mất. Deep link đi tới đúng lúc đó cũng bị "nuốt" (entries/reports/capture/trip-toggle mở ra Home).
- **Bằng chứng:** `qa-runs/special/cfg-strip.png` (ảnh 3: sau font 1.3 → Home), `cfg-strip2.png` (tối giữ số / density mất), `config-change.txt`.
- **Nguyên nhân gốc:** manifest release `MainActivity android:configChanges=0x80002fb4` (aapt2 dump) — có `uiMode`, `orientation`, `screenSize`…
  nhưng **không có `fontScale` (0x40000000) và `density` (0x1000)** → Android huỷ/dựng lại Activity, React Native gắn lại cây từ đầu.
  Cấu hình đến từ mặc định Expo (`app.json` không khai thêm).
- **Gợi ý:** thêm `fontScale|density` vào `configChanges` qua config plugin (RN tự xử lý đổi cỡ chữ khi nhận `onConfigurationChanged`), hoặc lưu nháp
  khoản đang nhập (như form khác) để dựng lại không mất.

### SPE-8 🟡 Deep link `sundaysort://trip/start` tới ngay khi Activity đang dựng lại → app crash ("Sunday Sort keeps stopping")
- **Bước:** app đang mở ở Home →
  `adb shell "settings put system font_scale 1.3; settings put system font_scale 1.0; am start -a android.intent.action.VIEW -d sundaysort://trip/start com.phiotron.sundaysort"`
  (lần đầu gặp tự nhiên: ngay sau `wm density reset` rồi mở trip/start bằng link — ca NFC / Shortcuts / widget gặp lúc máy đổi cấu hình).
- **Thực tế:** 2/2 lần chạy liền (độ trễ 0 s) và 1/2 lần (độ trễ 1 s) crash: `Error: Attempted to navigate before mounting the Root Layout component.
  Ensure the Root Layout component is rendering a Slot…` → `JavascriptException` FATAL → hộp "Sunday Sort keeps stopping". Mở nguội / mở ấm bình thường
  bằng trip/start: 9/9 lần không crash. Link khác (entries, reports, capture, trip/toggle) cùng thời điểm: không crash (nhưng bị nuốt — SPE-7).
- **Bằng chứng:** `qa-runs/special/tripstart-crash.txt`, `tripstart-keeps-stopping.png`, `revoke-trip.txt` (lần đầu).
- **Nguyên nhân gốc nghi ngờ:** `src/app/trip/start.tsx:5` render `<Redirect href="/trip/active?start=1" />` ngay lần vẽ đầu; khi Activity dựng lại, link
  ban đầu được xử lý trước khi Root Layout (`src/app/_layout.tsx`, `Navigator` sau `Stack.Protected`/migration) gắn navigator → expo-router ném lỗi.
- **Gợi ý:** trong `trip/start` chờ `useRootNavigationState()?.key` rồi `router.replace(...)` trong effect (hoặc xử lý `trip/start` trong
  `+native-intent.tsx` như `trip/toggle`); sửa SPE-7 cũng làm biến mất điều kiện kích hoạt.

### SPE-9 🟡 2 máy dùng chung 1 thư mục sao lưu đêm: máy này xoá bản sao lưu của máy kia; danh sách khôi phục trộn 2 máy
- **Bước (mô phỏng, hạn mức 1 giả lập):** đặt sẵn vào `Download/qa-shared` 7 bản đêm "của máy B" (`SundaySort-backup-2026-11-11-0200` … `-17-0200`,
  dữ liệu P002 131 khoản) + `SundaySort-backups.json` của B → trên máy A (emulator-5556, P096 20.011 khoản, APK `5ce0626`) Backup & restore →
  Choose backup folder → `qa-shared` → Allow (app chạy sao lưu đêm ngay).
- **Thực tế:** A ghi `SundaySort-backup-2026-11-18-0934.sundaysort` và **xoá `…-11-11-0200` của máy B** (giữ "7 bản mới nhất" tính chung cả 2 máy);
  index gộp. "Restore from backup" trên A liệt kê 7 bản: 1 của A (20,011 entries) + 6 của B (131 entries), không ghi máy nào — người dùng
  có thể khôi phục nhầm dữ liệu máy kia (thay toàn bộ dữ liệu). Theo mã: hai máy chạy sao lưu cùng phút sẽ trùng tên file → `port.put` ghi đè
  bản của máy kia (chưa thử được: cần 2 máy thật cùng lúc).
- **Bằng chứng:** `qa-runs/special/shared-folder.txt` (ls + index trước/sau), `shared-restore-list.png`.
- **Nguyên nhân gốc:** `src/features/backup/nightly.ts:23-25` tên file chỉ có ngày-giờ (không có mã máy); `filesToPrune` (`nightly.ts:39-44`)
  tính 7 bản mới nhất trên **mọi** file trong thư mục; `listFolderBackups` không phân biệt máy.
- **Gợi ý:** thêm mã máy ngắn vào tên (`SundaySort-backup-2026-11-18-0934-<id4>.sundaysort`) + vào index; chỉ tỉa file của chính máy; danh sách
  khôi phục ghi "This phone / Other phone" và hỏi xác nhận khi chọn bản của máy khác.

## Kiểm lại trên APK `5ce0626` (2026-11-18, emulator-5556 `-gpu host`)
| Lỗi | Bước | Kết quả | |
|---|---|---|---|
| SPE-1 (B-67) | 6 deep link `reports?from=&to=` (âm cực lớn, 1e17, 8.639e15, 1970→2026, 2021→2027, chữ) | link sai/quá dài → bỏ qua, Reports năm hiện tại, JS 0–20 ms/8 s, điều hướng tiếp được; link 5 năm hợp lệ vẫn mở Custom "1 Jan 2021 – …" (`regress-spe1.json`) | ✅ |
| SPE-2 (B-68) | `pm clear` → onboarding → khôi phục `pro-trial-2100` / `pro-active-2100` | "Trial · 7 days left" (không còn 26708); file active 2100 → "Pro ended on 18 Nov", PDF lại khoá PRO (`regress-spe2.json`) | ✅ |
| SPE-4 (B-80) | khôi phục `settings-region-ZZ`, `-mileageRates-str`, `-notify-null`, đi 11 màn (Home…Notifications…Pro) | không crash, không treo, không lỗi JS (`regress-spe4.out`) | ✅ |
| SPE-5 (B-81) bomb ảnh 200 MB | khôi phục → Restore | báo "This backup is damaged and can't be restored." ✅ nhưng PSS vẫn leo 114 → **522 MB** trước khi từ chối (trước: 1.133 MB) | 🟡 (xem REG-1) |
| SPE-5 (B-81) bomb manifest 200 MB | chọn file | **không thông báo, không màn xem trước**, JS bận ~9 s, PSS **giữ ~515 MB** suốt 2 phút (`bomb-json-5ce0626.txt`, `bomb-json-5ce0626-frames.png`) | ❌ REG-1 |
| SPE-5 (B-87) khôi phục P096 20k theo luồng | đo PSS mỗi ~3 s | 14,5 s (trước 22 s), PSS đỉnh **225 MB** (trước: 221 MB sau khôi phục; đỉnh cũ không đo) (`restore-p096-5ce0626.txt`) | ✅ |
| SPE-6 (B-76) PDF 2 năm / 5 năm, 20k | Reports Custom → Export PDF | 2 năm: 24 s, 382 KB, "Showing the first 2,000 of 7,017 entries. The full list is in the CSV export."; 5 năm: 23 s, 386 KB, "…of 17,561 entries…" | ✅ |
| Hiệu năng GPU host, 20k | `perf_start` / `perf_ttc` / `perf_ops` | nguội TotalTime trung vị 1.452 ms · ấm 438 · nóng 223; tới khi có Home 4,06 s (JS 560 ms); Entries mở lần đầu JS 270 ms; 20 lần vuốt JS 6.650 ms, **khung giật 6,6 %** (p50 25 / p90 32 / p99 150 ms — swiftshader trước 54 %); Reports mở lần đầu JS 290 ms; PSS 192 MB | ✅ |
| Monkey (bản `ece3819`) 3 seed × 3.000 | `monkey -p … --throttle 100` seed 1101 / 2202 / 3303 (3303 chạy lại với app-switch 0 %) | 0 crash / 0 ANR của app; DB sau monkey: 47 khoản, 0 hàng hỏng, 0 trùng id, 0 hạng mục mồ côi. Lần đầu seed 3303 dừng ở sự kiện 1.770 vì **launcher** (`nexuslauncher`) NPE khi monkey lọt ra ngoài — không phải app; monkey cũng đã bật nhầm dịch vụ trợ năng Voice Access của máy ảo → đã tắt lại | ✅ |
| logcat release cả phiên (437 nghìn dòng, 50 tiến trình app) | quét số tiền / ghi chú (23+ ghi chú fixture) / toạ độ | 0 ghi chú, 0 toạ độ; 15 dòng "$" đều là `$lambda$0` trong stack trace (`logcat-scan.txt`) | ✅ |

### REG-1 🟡 (B-81 chưa trọn) Chọn file "zip bomb" manifest 200 MB → im lặng (không báo lỗi), RAM giữ ~515 MB; bomb ảnh vẫn đẩy RAM lên ~522 MB
- **Bước:** APK `5ce0626` → Backup & restore → Restore from backup → (Choose a file instead) → `bomb-json-200mb.sundaysort`.
- **Kỳ vọng (B-81):** "This backup is damaged…" ngay, không giải nén quá 64 MB. **Thực tế:** quay về màn trước, không snackbar (chụp liên tục 14 khung
  ~60 s), JS bận 9 s, PSS 516 MB và **giữ nguyên** 2 phút sau. Bomb ảnh: báo "damaged" đúng nhưng PSS lên 522 MB trước đó.
- **Nguyên nhân gốc nghi ngờ:** `src/features/backup/streamRestore.ts:33-35` `fail()` chỉ ghi lỗi; các `ondata` (dòng ~41-44 manifest, 68-71 ảnh)
  `return fail('damaged')` nhưng **không `f.terminate()`** → fflate vẫn giải nén hết mục 200 MB trong lần `push` hiện tại (khối nén 1 MB ≈ tới ~1 GB
  giải nén). Đường xem trước không hiện lỗi: cần xem `inspectBackupFile` trả gì khi `failed` mà manifest đã nhận một phần (`app/backup.tsx:164-167`).
- **Gợi ý:** gọi `f.terminate()` (và ngừng `push`) ngay khi vượt trần; đẩy khối nhỏ hơn (64 KB); bảo đảm `inspectBackupFile` luôn trả `{ok:false,'damaged'}`.

## Kiểm lại trên APK `bcc8c7a` (2026-11-18, emulator-5556 `-gpu host`) — B-91 (REG-1), B-92 (SPE-9)
| Lỗi | Bước | Kết quả | |
|---|---|---|---|
| REG-1 (B-91) bom manifest 200 MB | chọn file, chụp liên tục trên máy + lấy mẫu PSS | "This backup is damaged and can't be restored." **< 1 s** sau khi chọn; PSS 116 → đỉnh **117 MB** (trước: im lặng, 515 MB giữ 2 phút) | ✅ |
| REG-1 (B-91) bom ảnh 200 MB | như trên | bị từ chối **ngay ở bước chọn file** (không còn qua màn xem trước), "…damaged…" < 1 s, PSS đỉnh **118 MB** (trước 522 MB / bản đầu 1.133 MB) | ✅ |
| Hồi quy khôi phục hợp lệ (nạp 64 KB/lần) | P024 (2.011 khoản, 12 chuyến), P096 (20.011) | đều thành công; P096 2 lần 17,5 / 16,6 s, PSS đỉnh 247 / 244 MB (5ce0626: 14,5 s, 225 MB) | ✅ |
| SPE-9 (B-92) 2 máy chung thư mục | `Download/qa-shared2`: 7 bản máy B `…-0200-bbbbbb` (11–17/11, P002) + 1 bản cũ không mã `2026-11-10-0200` + index B → máy A chọn thư mục (ghi `…-11-18-0959-ax5dt9`) → 9 đêm 19–27/11 (đặt giờ 05:30, thêm 1 khoản/đêm, ép job khi app ở nền) | 9/9 đêm `[nightly] done 'written'`; cuối cùng thư mục: **7 bản B còn nguyên** + đúng 7 bản A (21–27/11); A chỉ tỉa bản của mình (18-0959, 19, 20) và bản cũ không mã (10/11) đúng thiết kế. "Restore from backup": bản A ghi "20,0xx entries", bản B ghi "131 entries · 1 photo · **another phone**" (`shared-folder-bcc8c7a.txt`, `shared2-restore-list*.png`). Trùng tên cùng phút: không còn (tên có mã máy) — chưa thử 2 máy thật cùng lúc | ✅ |

Giả lập: giờ máy / auto_time / múi giờ / font / density / chế độ tối / máy bay / mạng emu / trợ năng đã trả về như đầu phiên; file đẩy lên đã xoá; emulator-5556 đã tắt.
