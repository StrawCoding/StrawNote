# StrawNote — Google Play release（SMB 雙軌）

Package: `com.strawcoding.strawnote`

## 版本規範 a.b.c.d

|         |                                                         |
| ------- | ------------------------------------------------------- |
| `d = 0` | 正式版 → Play **production**（例 `v0.28.0.0`）          |
| `d ≠ 0` | 測試版（同舊 pre）→ Play **internal**（例 `v0.28.0.1`） |

## 雙軌規則（對齊 StrawMoneyBook）

| Tag 例                             | Workflow                                                                          | Play track   |
| ---------------------------------- | --------------------------------------------------------------------------------- | ------------ |
| `v0.28.0.1`（`d≠0`）               | [`play-internal-release.yml`](../.github/workflows/play-internal-release.yml)     | `internal`   |
| `v0.28.0.0`（以 `.0` 結尾＝`d=0`） | [`play-production-release.yml`](../.github/workflows/play-production-release.yml) | `production` |

- 打 `v*` 後 CI 建置成功即：**建立 GitHub Release（附更新說明）** → 上傳 Play。
- **每次發版必填** 根目錄 [`release-notes.pending.md`](../release-notes.pending.md)（`---` 前的條目會進 Release body）；缺檔或空白 → tag workflow 失敗。
- **未打正式 `d=0` tag 不上公開商店**。
- AAB 上傳成功 ≠ 立刻可見：internal 仍須 opt-in  
  https://play.google.com/apps/internaltest/com.strawcoding.strawnote
- `workflow_dispatch`：internal 可補傳；production 要求 `version_name` 以 `.0` 結尾（dispatch 不建 GitHub Release，仍建議先寫 notes）。

### VERSION_CODE（CI）

`a*10000000 + b*100000 + c*1000 + d`  
例：`0.28.0.0` → `2800000`，`0.28.0.1` → `2800001`。

## 現況（2026-11-14）

- **接手正式版**：`v0.28.0.0` / `versionCode=2800000` — **StrawNote 接手版本**
- **開發線**：`0.28.0.9` — 插畫 Web 可滑動＋Android S Pen 可畫；發版必附 GitHub Release notes
- 前一測試線：`0.27.12` 插畫工具列／S Pen；`0.27.11` 頁面插畫；`0.27.10` 鎖定
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
VERSION_NAME=0.28.0.0 VERSION_CODE=2800000 \
  ./gradlew :app:bundleCanaryRelease --no-daemon

cd ../
AAB_PATH="$(find App/app/build/outputs/bundle -name '*.aab' | sort | tail -1)" \
  fastlane android production
# 測試軌（d≠0）：fastlane android internal_testing
```

## Fastlane lanes

- `fastlane android internal_testing` — track=`PLAY_INTERNAL_TRACK`（預設 `internal`）
- `fastlane android production` — track=`PLAY_PRODUCTION_TRACK`（預設 `production`）

## Play Console（人工前置）

1. SA 對此 package 有 releases 權限（已驗證）。
2. Internal 測試員名單 + opt-in。
3. 隱私權／分級等商店資訊齊全後，`d=0` tag 才會成功上 production。
4. 未明示正式版時只打 `d≠0` tag → 只上 internal。

## Cloud sync hang (2026-11-13)

Root cause: client ≥0.27.5 uses `space:join-batch`; self-host stable 0.27.4 only has `space:join`.

Mitigations:

1. Server shim on `affine.wastebase.xyz` (`AFFiNE/patches/apply-join-batch-shim.py`)
2. Client fallback in `@affine/nbstore` (timeout → legacy join)
3. Native default cloud = `https://affine.wastebase.xyz` (Selfhosted)
