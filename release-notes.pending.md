# 0.28.0.11

- 修復 online／雲端同步：StrawNote `a.b.c.d` 四段版本被伺服器 semver 判為無效（UNSUPPORTED_CLIENT_VERSION），導致「實時同步連線失敗」。協議端改送 `a.b.c`，後端／自架映像亦正規化四段版本

---

# 0.28.0.10

- 修復 online／雲端同步：self-host CORS 允許私網 `http://192.168.x.x:18080`（yarn:dev LAN）Origin；dev proxy 剝除 Origin，避免 WebSocket 被擋導致雲端失敗

---

# 0.28.0.9

- 修復插畫 mode：**Web 可滑動**（brush 層改 `touch-action: pan-y`，不再整頁鎖死）；**Android S Pen 可畫**（不再把 WebView 誤報的 stylus bit 當擦除、原生端停用 web 側鍵雙橋以免工具卡在橡皮擦）

---

# 0.28.0.8

- 內部測試累積更新（請改裝此版）：插畫 S Pen 不誤滑、橡皮擦滑動、icon／色票工具列、與 Edgeless 共用 S Pen 模組、**Web 側鍵可用**（0.28.0.3–0.28.0.7）

---

# 0.28.0.7

- Web 修復 S Pen 側鍵：新增 `retainStylusButtonBridge`，以 PointerEvent（hover／筆管）合成 `strawnote:spen-button`（不再只靠 Android Capacitor）；插畫同步用 `stylusToolIntent` 處理筆管／橡皮擦尖

---

# 0.28.0.6

- 插畫／Edgeless 共用 S Pen 與墨水模組：`SpenEraserSession`、色票／線寬／`StylusInkToolbar`、palm／fingerPan 規則統一；行為以單元測試＋插畫 e2e 守門，Edgeless 仍用 BlockSuite 工具列但側鍵／prefs 同源

---

# 0.28.0.5

- 插畫 mode：S Pen 畫筆不再被誤判成頁面滑動（brush/eraser `touch-action: none`＋書寫時鎖 viewport）；橡皮擦手指滑動擦除不受 palm-reject 擋下；顏色改預設色票＋「＋」新增 HEX／取色；工具列改 Pen／Eraser／Hand icon，線寬改粗細條

---

# 0.28.0.4

- 插畫 mode：橡皮擦可用手指滑動擦除（不再被 fingerPanOnly 擋下）；筆工具列改 viewport `fixed`＋portal，釘在螢幕底部而非文件最底

---

# 0.28.0.3

- Branding：載入／登入不再短暫出現 AFFiNE 圖示或字樣——`Logo1Icon` 改 StrawNote 標、替換 `affine-text-logo`／安裝 GIF、embed tooltip 與 import 文案；自架 rebuild 同步覆蓋 `app-icon-*.ico` 並把 open-in-app 圖示改指 `/StrawNoteIcon.png`

---

# 0.28.0.2

- Dev：預設 `AFFINE_DEV_PORT` 改為 `18080`（避開本機 1Panel SFTPGo 佔用的 `:8080`）；`yarn dev` / Electron / Playwright / 文件同步改指新 port

---
