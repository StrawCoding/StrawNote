# 0.28.0.21

- 修復啟動白屏：Web、手機網頁與 Android 的分頁標題元件改在工作區服務範圍內掛載，避免啟動時發生 `NotificationCountService not found`；保留文件標題與未讀通知數。

---

# 0.28.0.20

- Android／原生預設雲端改回 **AFFiNE Cloud**（`https://app.affine.pro`）；私人自架 `affine.wastebase.xyz` 不再內建，僅在設定手動新增伺服器

---

# 0.28.0.19

- 公開／分享頁底部品牌：文案改為「StrawNote GitHub」、連結統一 `https://github.com/StrawCoding/StrawNote`（`STRAWNOTE_GITHUB_URL`）

---

# 0.28.0.18

- 產品「官方網站」連結改為 GitHub Pages 官網 `https://strawcoding.github.io/StrawNoteWeb/`（StrawNoteWeb 行銷站上線）

---

# 0.28.0.18

- 品牌：分頁標題全域同步 `DocumentTitle`（Web／Mobile）；favicon／apple-touch 自 `StrawNoteIcon.png` 重產；onboarding 標誌改稻草圖；修 en／hi／nb 殘留 AFFiNE 文案；新增 `scripts/audit-affine-user-branding.sh`

---

# 0.28.0.17

- 無界墨水工具列即時顯示（含遺漏的 helper 檔，修 v0.28.0.16 建置）

---

# 0.28.0.16

- 修復無界墨水工具列**延遲出現**：切到無界即顯示 StylusInkToolbar，不再等 GfxController 就緒才掛載（Gfx 就緒後再同步工具）

---

# 0.28.0.15

- Edgeless 橡皮擦預設**不刪除畫布上的筆記卡片**（`affine:note`／MD 區塊），仍可擦除筆畫、形狀、框架等畫布元件

---

# 0.28.0.14

- 修復 Edgeless／畫布 S Pen **斷觸**：描線中不再重複 `setTool(Brush)` 重開筆開筆畫；僅在橡皮擦提示離開時才還原畫筆
- 插畫 mode：**手指不再誤觸編輯文字**（標題與區塊 `pointer-events: none`）；關閉 fingerPanOnly 時手指可在 brush 描線，仍不會進文字編

---

# 0.28.0.13

- Android 無界（Edgeless）：掛載與插畫相同的 `StylusInkToolbar`（筆／橡皮／手掌＋色票／線寬），同步 Gfx 工具並隱藏原生底部 BlockSuite 工具列；修正唯讀邏輯（無界不再被鍵盤工具列旗標誤鎖、插畫維持可編輯）

---

# 0.28.0.12

- Android：有新版本時彈出更新提示，按鈕「下次提醒／忽略／前往更新」（對照 Play／`app-update.json`）

---

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
