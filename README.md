<div align="center">

<img src="packages/frontend/apps/electron/resources/icons/icon.png" alt="StrawNote" width="128" height="128" />

# StrawNote（稻草筆記）

**離線優先的知識筆記。Markdown 與手寫自由混排，資料在你手上。**

[![Release](https://img.shields.io/github/v/release/StrawCoding/StrawNote?include_prereleases)](https://github.com/StrawCoding/StrawNote/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[倉庫](https://github.com/StrawCoding/StrawNote) · [Releases](https://github.com/StrawCoding/StrawNote/releases) · [Issues](https://github.com/StrawCoding/StrawNote/issues) · [自架 Compose](.docker/selfhost/compose.yml)

</div>

---

## 這是什麼

StrawNote 是 StrawCoding 的筆記產品，基於開源專案 [AFFiNE](https://github.com/toeverything/AFFiNE)（含 [BlockSuite](https://github.com/toeverything/BlockSuite)）分支而來。

產品方向：

- **Markdown + 手寫（S Pen 等）** 自由混排
- **離線優先**，本機可完整使用
- **可攜格式**（朝 `.straw` / 文件交換演進）
- 保留上游文件／畫布／資料庫等知識庫能力

上游 AFFiNE 的授權、貢獻者與共用程式碼權利仍適用；**產品品牌、發版、自架映像與後續功能以 StrawNote 為準**。

---

## 品牌與識別

| 項目 | 值 |
| --- | --- |
| 顯示名稱 | **StrawNote**（稻草筆記） |
| Monorepo | `@strawnote/monorepo` |
| App ID | `com.strawcoding.strawnote` |
| Deep link | `strawnote://`（含 canary / beta / internal / dev） |
| Electron productName | `StrawNote` |
| 圖示來源 | `StrawNoteIcon.png` → Electron / 各平台 icon 產物 |
| 開發分支 | `strawnote` |
| 內部套件路徑 | 多數仍為 `@affine/*`（避免一次大規模改 import） |

---

## 版本與預發佈

StrawNote pre-release 採：

```text
0.27.4-pre-12     # 機器／套件版本
0.27.4 pre-12     # 顯示用
```

- Workflow：[`.github/workflows/release.yml`](.github/workflows/release.yml)（`Release Candidates`）
- 可選輸入：`base_version`、`pre_id`
- 規劃腳本：`node scripts/plan-pre-release.mjs --base 0.27.4 --pre-id 12`
- 說明：[docs/contributing/releases.md](docs/contributing/releases.md)
- Channel：`canary`
- Desktop 自動更新：GitHub Releases API（`StrawCoding/StrawNote`）

正式穩定版流程後續再獨立；目前預設走 pre-release。

---

## 功能現況（摘要）

| 能力 | 狀態 |
| --- | --- |
| Web／自架知識庫（文件、畫布、協作基礎） | 可用（繼承 AFFiNE self-host） |
| Desktop（Electron）品牌／deep-link／updater | StrawNote |
| Android / iOS 套件 ID | `com.strawcoding.strawnote` |
| Android S Pen | 畫布（edgeless）預設可編輯；筆尖＝筆刷、側鍵／橡皮擦尖＝擦除；掌托抑制 |
| 「下載 App」按鈕 | 暫連官方 AFFiNE 安裝包，並以 UI 彈窗提示「StrawNote 正在努力開發」 |
| Markdown + 手寫混排 / `.straw` | 產品路線，持續開發中 |

---

## 自架（Self-host）

Compose 與映像：

```bash
cd .docker/selfhost
docker compose up -d
```

- 映像：`ghcr.io/strawcoding/strawnote:stable`
- Compose：[`.docker/selfhost/compose.yml`](.docker/selfhost/compose.yml)

建置／部署細節見 [docs/BUILDING.md](docs/BUILDING.md)、[docs/developing-server.md](docs/developing-server.md)。  
官方套件目錄：[GitHub Packages — strawnote](https://github.com/StrawCoding/StrawNote/pkgs/container/strawnote)

> 容器內 runtime 路徑／環境變數名稱可能仍含 `affine`（上游相容）；對外品牌與映像名為 StrawNote。

---

## 本機開發

需求：Node `>=22.12 <23`、Yarn（倉庫既有 workspace）。

```bash
git clone https://github.com/StrawCoding/StrawNote.git
cd StrawNote
git checkout strawnote

yarn install
yarn dev
```

更多：

- 總覽建置：[docs/BUILDING.md](docs/BUILDING.md)
- Desktop：[docs/building-desktop-client-app.md](docs/building-desktop-client-app.md)
- Server：[docs/developing-server.md](docs/developing-server.md)
- 貢獻：[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)

常用指令：

```bash
yarn lint
yarn test
yarn build
```

---

## 與上游 AFFiNE

| 項目 | 值 |
| --- | --- |
| 上游 | [toeverything/AFFiNE](https://github.com/toeverything/AFFiNE) |
| Upstream remote | `affine` → `https://github.com/toeverything/AFFiNE.git` |
| 上游基準分支 | `canary` |
| 分支起始 commit | `9c6155027` |
| 本倉庫發版／更新端點 | **僅** `StrawCoding/StrawNote`（不以 AFFiNE Releases 為產品更新源） |

同步範例：

```bash
git fetch affine
git merge affine/canary
# 或：git rebase affine/canary
```

也感謝上游生態：BlockSuite、yjs、Electron、React、Vite 等（見上游依賴與 [AFFiNE network](https://github.com/toeverything/AFFiNE/network/dependencies)）。

---

## 貢獻與回報

- Bug／功能：[Issues](https://github.com/StrawCoding/StrawNote/issues)
- 討論：[Discussions](https://github.com/StrawCoding/StrawNote/discussions)
- 貢獻類型：[docs/types-of-contributions.md](docs/types-of-contributions.md)

合併 PR 前請依倉庫 CLA／貢獻文件完成必要簽署（若 workflow 有啟用）。

---

## 授權

- 本倉庫沿用上游 **MIT** 授權，見 [LICENSE](./LICENSE)。
- `packages/backend` 等目錄另有上游定義之授權條款，請一併遵守。
- StrawNote 商標與品牌資產屬 StrawCoding；AFFiNE 商標屬其權利人。

---

<div align="center">
<sub>Based on / branched from <a href="https://github.com/toeverything/AFFiNE">AFFiNE</a> · Maintained by <a href="https://github.com/StrawCoding">StrawCoding</a></sub>
</div>
