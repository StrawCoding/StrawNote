# StrawNote — Google Play release（SMB 雙軌）

Package: `com.strawcoding.strawnote`

## 雙軌規則（對齊 StrawMoneyBook）

| Tag 例                    | Workflow                                                                          | Play track   |
| ------------------------- | --------------------------------------------------------------------------------- | ------------ |
| `v0.27.11`（非 `*.0`）    | [`play-internal-release.yml`](../.github/workflows/play-internal-release.yml)     | `internal`   |
| `v0.28.0`（以 `.0` 結尾） | [`play-production-release.yml`](../.github/workflows/play-production-release.yml) | `production` |

- 打 `v*` 後 CI 建置成功即自動上傳（無需 GitHub Environment 人工 Approve）。
- **未打 `*.0` 不上公開商店**；預設測試軌＝internal。
- AAB 上傳成功 ≠ 使用者立刻看得到：internal 仍須 Console 名單 + opt-in  
  https://play.google.com/apps/internaltest/com.strawcoding.strawnote
- `workflow_dispatch`：internal 可補傳任意版號；production 要求 `version_name` 以 `.0` 結尾。

### VERSION_CODE（CI）

未手動指定時由 `VERSION_NAME` 推導：`major*1000000 + minor*1000 + patch`  
例：`0.27.11` → `27011`，`0.28.0` → `28000`。須對 Play 嚴格遞增；本機手動上傳請用更大整數或與 CI 公式一致。

## 現況（2026-11-14）

- **最新 internal**：`versionName=0.27.11` / `versionCode=7`（本機遞增；之後 CI tag 改走公式碼）
  - 含：插畫模式頁面內手寫
- 歷史：`0.27.10`/code6 鎖定；`0.27.9` S Pen；`0.27.8` 平板＋sync
- AAB：`canaryRelease` + upload keystore；native `max-page-size=16384`
- Secrets：`ANDROID_*` + `PLAY_SERVICE_ACCOUNT_JSON` + `ANDROID_PACKAGE_NAME`
- Upload key SHA-1：`C8:5E:D4:32:81:5C:C3:4C:83:2A:98:23:ED:87:86:01:A6:0D:89:A0`

## 本機／伺服器密鑰（勿進 git）

| 檔案            | 路徑                                                                |
| --------------- | ------------------------------------------------------------------- |
| Upload keystore | `/mnt/data/Data/serviceApps/StrawNote/secrets/strawnote-upload.jks` |
| Env             | `/mnt/data/Data/serviceApps/StrawNote/secrets/keystore.env`         |
| Play SA         | 沿用 `strawmoneybook@….iam.gserviceaccount.com` JSON                |

`packages/frontend/apps/android/App/key.properties` 與 `local.properties` 已 gitignore。

## 本機上傳

```bash
cd /mnt/data/code/project/StrawCoding/StrawNote
set -a && source /mnt/data/Data/serviceApps/StrawNote/secrets/keystore.env && set +a
export CC=/usr/bin/clang CXX=/usr/bin/clang++
export ANDROID_NDK_HOME=/opt/android-sdk/ndk/27.0.12077973

yarn affine @affine/android build
yarn workspace @affine/android cap sync

cd packages/frontend/apps/android/App
VERSION_NAME=0.27.12 VERSION_CODE=27012 \
  ./gradlew :app:bundleCanaryRelease --no-daemon

cd ../
AAB_PATH="$(find App/app/build/outputs/bundle -name '*.aab' | sort | tail -1)" \
  fastlane android internal_testing
# 正式軌：
# AAB_PATH=... fastlane android production
```

## Fastlane lanes

- `fastlane android internal_testing` — track=`PLAY_INTERNAL_TRACK`（預設 `internal`）
- `fastlane android production` — track=`PLAY_PRODUCTION_TRACK`（預設 `production`）

## Play Console（人工前置）

1. SA 對此 package 有 releases 權限（已驗證）。
2. Internal 測試員名單 + opt-in。
3. 隱私權／分級等商店資訊齊全後，`*.0` tag 才會成功上 production。
4. 未明示正式版時只打非 `*.0` tag → 只上 internal。

## Cloud sync hang (2026-11-13)

Root cause: client ≥0.27.5 uses `space:join-batch`; self-host stable 0.27.4 only has `space:join`.

Mitigations:

1. Server shim on `affine.wastebase.xyz` (`AFFiNE/patches/apply-join-batch-shim.py`)
2. Client fallback in `@affine/nbstore` (timeout → legacy join)
3. Native default cloud = `https://affine.wastebase.xyz` (Selfhosted)
