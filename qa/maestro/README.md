# Kịch bản Maestro QA-100 (Android + iOS)

- Mỗi persona = 1 lần `maestro test qa/maestro` (thư mục) với các giá trị `-e` do `qa/ios/persona_env.py` in ra:
  `PID REGION REGION_LABEL OTHER_REGION_LABEL AMOUNT NOTE FIXTURE DO_REGION_SWITCH DO_KILL DO_WIPE`.
- Thứ tự bước ở `config.yaml` (`continueOnFailure: true`): mỗi bước tự khởi động lại app, bước hỏng không che bước sau.
- `02_restore` chỉ chạy trên iOS (bộ chọn tệp của iOS, file đặt sẵn vào Files › On My iPhone). `12/13/14` chỉ chạy
  khi cờ `DO_*` = `true`. Không bước nào bấm See Pro / dùng thử / Subscribe.
- `extra/widget_ios.yaml`: thử thêm widget lên màn hình chính simulator (chạy 1 lần cuối làn iPhone nhỏ).
- Chạy tay (Android, ví dụ): `maestro --device emulator-5554 test qa/maestro -e PID=P001 -e REGION=UK
  -e REGION_LABEL="United Kingdom" -e OTHER_REGION_LABEL="United States" -e AMOUNT=12 -e NOTE="QA-P001 Shell"
  -e FIXTURE=none -e DO_REGION_SWITCH=false -e DO_KILL=false -e DO_WIPE=false`
- iOS trên GitHub Actions: `.github/workflows/qa-ios.yml` → artifact `qa-ios-<run>` (ảnh, `app.log`, crash, `result.json`).
