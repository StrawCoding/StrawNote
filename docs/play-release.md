# StrawNote — Google Play internal release

Package: `com.strawcoding.strawnote`  
Default track: `internal`（內部測試）

## 現況（2026-11-13）

- **最新 internal**：`versionName=0.27.10` / `versionCode=6`
  - 含：無邊框／插畫模式可鎖定元件（Android 選取工具列啟用 Lock/Unlock；刪除／剪下／橡皮擦跳過已鎖定）
- 前一版：`0.27.9` / code5（S Pen palm rejection、插畫 mode header、筆穩定度設定）
- 歷史：`0.27.8`/code4 平板相容＋sync；`0.27.5`/code1 平板被過濾；`0.27.6`–`0.27.7` 過渡版
- AAB：`canaryRelease` signed with upload keystore；native 以 `.cargo/config.toml` `max-page-size=16384` 建置
- 驗收：`packages/frontend/apps/android/scripts/check-16k-elf.sh <aab>`（本版 PASS）
- GitHub Secrets 已設定（`ANDROID_*` + `PLAY_SERVICE_ACCOUNT_JSON`）
- Upload key SHA-1：`C8:5E:D4:32:81:5C:C3:4C:83:2A:98:23:ED:87:86:01:A6:0D:89:A0`
- 測試員 opt-in：https://play.google.com/apps/internaltest/com.strawcoding.strawnote

上傳成功 ≠ 測試員立刻看得到：需 Console 內部測試名單 + opt-in  
https://play.google.com/apps/internaltest/com.strawcoding.strawnote

## 本機／伺服器密鑰（勿進 git）

| 檔案            | 路徑                                                                |
| --------------- | ------------------------------------------------------------------- |
| Upload keystore | `/mnt/data/Data/serviceApps/StrawNote/secrets/strawnote-upload.jks` |
| Env             | `/mnt/data/Data/serviceApps/StrawNote/secrets/keystore.env`         |
| Play SA         | 沿用 `strawmoneybook@….iam.gserviceaccount.com` JSON                |

`packages/frontend/apps/android/App/key.properties` 與 `local.properties` 已 gitignore。

## 一鍵上傳（本機）

```bash
cd /mnt/data/code/project/StrawCoding/StrawNote
set -a && source /mnt/data/Data/serviceApps/StrawNote/secrets/keystore.env && set +a

# Host C 編譯請用 clang（GCC 15 會踩 sqlite .base64）
export CC=/usr/bin/clang CXX=/usr/bin/clang++
export ANDROID_NDK_HOME=/opt/android-sdk/ndk/27.0.12077973

# 1) Web + native assets
yarn affine @affine/android build
yarn workspace @affine/android cap sync

# 2) Signed AAB（canaryRelease）
cd packages/frontend/apps/android/App
VERSION_NAME=0.27.5 VERSION_CODE=<下一版整數> \
  ./gradlew :app:bundleCanaryRelease --no-daemon

# 3) Fastlane → Play internal
cd ../
AAB_PATH="$(find App/app/build/outputs/bundle -name '*.aab' | sort | tail -1)" \
  fastlane android internal_testing
```

## GitHub Actions

Workflow：`.github/workflows/play-internal-release.yml`  
Trigger：`v*` tag（例 `v0.27.5`）或 `workflow_dispatch`

Required Secrets：

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEY_ALIAS` / `ANDROID_KEY_PASSWORD`
- `PLAY_SERVICE_ACCOUNT_JSON`
- `ANDROID_PACKAGE_NAME`=`com.strawcoding.strawnote`

## Play Console（人工）

1. App 已存在且 SA 可 edits（已驗證）。
2. 內部測試員名單 + opt-in 連結。
3. 隱私權政策 URL、內容分級、目標對象等商店資訊需在 Console 補齊後才能推正式版／production。
4. 未明示正式版時只打 `internal`，不上 production。

## Cloud sync hang (2026-11-13)

Root cause: client ≥0.27.5 uses `space:join-batch`; self-host stable 0.27.4 only has `space:join`.

Mitigations:

1. Server shim on `affine.wastebase.xyz` (`AFFiNE/patches/apply-join-batch-shim.py`)
2. Client fallback in `@affine/nbstore` (timeout → legacy join)
3. Native default cloud = `https://affine.wastebase.xyz` (Selfhosted)
