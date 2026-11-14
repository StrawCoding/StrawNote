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
