---
name: k8s-network-diagram
description: 畫 Kubernetes 網路圖、封包路徑圖、CNI datapath 架構圖時使用。兩種風格：平面圖（明亮的 One Light SVG，左側節點、Pod、網卡與連線，右側步驟欄）與 3D 互動頁（可旋轉的 three.js 頁面，封包沿連線移動、逐步播放、全螢幕、手機版）。節點、Pod、網卡、IP 依實際環境（kubectl 輸出、節點上的 ip／ss／tcpdump 輸出，或使用者提供的資料）動態帶入，會變動的值用灰底標示。只要使用者想把 K8s 節點、Pod、bond、veth、Service、Gateway／Envoy 流量或封包走向畫成圖，或說「3D 動畫圖」「互動網頁」「可以轉的網路圖」，即使沒說「架構圖」也應使用。英文說法如 network diagram、packet flow、packet path、datapath diagram、three.js／3D network view 也適用。
---

# K8s 網路圖

把一條 K8s 網路路徑畫出來：節點、Pod、網卡、連線，以及一步一步的封包走向。

環境資料與風格分開處理：同一份 spec 可以畫成不同風格，數值和步驟文字都一樣，只有呈現方式不同。

## 風格

| 風格 | 產出 | 什麼時候用 | 資料夾 |
|---|---|---|---|
| **平面圖** | 1440×720 的 SVG／PNG：左側圖、右側步驟欄，One Light 配色 | 預設。文件、投影片、README 用的靜態圖 | `styles/flat/` |
| **3D 互動頁** | 單檔 HTML（可發布成 Artifact）：可旋轉的 3D 場景、步驟 1–7 播放、全螢幕、手機版 | 使用者要「3D」「動畫」「互動網頁」「可以轉的圖」時 | `styles/3d/` |

使用者沒指定時，畫平面圖。**使用者只要 3D 頁時，也要先做平面圖**：3D 頁沿用同一份 spec 與步驟文字，而且它的「平面圖」分頁直接顯示平面圖的 `final.png`。

## 共用流程

1. **取得環境資料。** 使用者已貼上輸出或給了完整數值時直接用；需要自己查叢集時，先讀 `references/data-sources.md`。
2. **整理成 spec。** 欄位與範例在 `references/spec.md`。缺的欄位先逐一問，一次只問一個，等回答後再問下一個；都補齊後，才把 spec 簡短列給使用者確認，這是單獨的一個問題。同時列出哪些值會變動（PID、Pod IP、Pod 名稱、來源埠等）。
3. **讀共通原則。** `references/principles.md`：淺色主題、只放環境資訊、灰底、用詞、字不擋圖、審閱與回報方式。兩種風格都要遵守。
4. **依風格產出**（見下方）。
5. **交付並說明。** 回覆中說明：
   - 哪些欄位是使用者提供、哪些是指令查到、哪些留空；
   - 哪些值標成會變動；
   - 驗證結果與還沒處理的地方（含原因）；
   - 任何和使用者描述不同的地方。

   步驟文字照使用者給的字逐字呈現，不改寫、不翻譯。如果使用者的字和 `references/principles.md` 的用詞規定衝突（例如寫了「ingress IP」），先指出並問使用者，不要自行改寫。

## 平面圖（`styles/flat/`）

1. 動手前讀 `styles/flat/layout.md`（座標與排法）與 `styles/flat/style.md`（色碼、字級、標記畫法）。
2. 以 `styles/flat/assets/example_gen.py` 為起點改寫：它把版面寫成程式，One Light 配色、灰底、步驟欄都已處理好，比從零算座標可靠。
3. 用 `styles/flat/scripts/chips.mjs` 依實際字寬替會變動的值畫灰底，再用 `styles/flat/scripts/svg2png.mjs` 轉成 PNG，實際打開來看（做法在 `layout.md` 末段）。
4. 預設交付 SVG 與 PNG。使用者只要 3D 頁時，平面圖只當 3D 頁的 `final.png` 用，不另外交付，在回覆中提一句「平面圖分頁也已放入」即可。

## 3D 互動頁（`styles/3d/`）

1. 先讀 `styles/3d/requirements.md`（3D 專屬的要求：預設總覽要看得到所有文字、手機清單、全螢幕、自動播放等）。
2. **確認拓撲。** 連線的折線、箭頭和每個元件的位置都是建模時做進模型的，所以「拓撲相同」要**同時**符合：
   - 元件相同：主機 → 交換器 → 2 個節點；一個節點上是 hostNetwork 的 Envoy，另一個節點上是一個有 netns 的 Pod（主機端有 lxc）；
   - 封包經過的元件與順序相同：連線 ① 是「主機 → 交換器 → 節點 A 的 eth0 → Envoy」，連線 ② 是「Envoy → 節點 A 的 eth0 → 交換器 → 節點 B 的 eth0 → eBPF 直接送進 Pod 的 eth0（不經過 lxc）」；
   - 步驟數是 7，每一步指的元件和範例相同。

   只要有一項不同就是拓撲不同，例如 Envoy 和 Pod 在同一個節點、封包會經過 lxc、多一個 Pod 或節點、沒有 proxy。名稱、IP、網卡名稱、PID 不同不算。
   - 拓撲相同、只有數值不同：直接用 `styles/3d/assets/scene-glb.txt`，只改網頁。
   - 拓撲相同、但換了一份重建的模型：這些要照新模型重抄：`D.anchors`、`D.p1`／`D.p2`、`D.target`、`D.camdir`、`BOXES`、`CABLES`、`NODES`；`D.p1`／`D.p2` 的頂點數變了，`STEPS[].seg` 的索引要跟著改；錨點、標籤鍵或 `BOXES` 改名時要一起改的地方，見 `styles/3d/model.md`「改名時要一起改的地方」。取景點和膠囊高度從它們算，不用另外改。量測的 `model` 檢查會拿障礙物、連線、錨點（依 `ANCHOR_ON`）、預設注視點 `D.target` 和實際載入的模型比對。不在檢查內的有：鏡頭方向 `D.camdir`、`STEPS[].seg` 的索引、每一步的 `at`／`rel` 是否指對元件，要看總覽和步驟截圖確認。
   - 拓撲不同：**目前沒有現成的建模腳本**，要照 `styles/3d/model.md` 的規格從頭用 bpy 建模，網頁裡寫死的部分也要一起改（見 `styles/3d/page.md`「資料區以外寫死的地方」）；連線不是兩條時，量測腳本也要改（同一節最後一段）。動手前先和使用者確認是否值得，或改用平面圖。
3. 以 `styles/3d/assets/index.html` 為起點改網頁：資料區（錨點、路徑、步驟、標籤、障礙物座標、手機清單），以及 `<title>`、`<h1>`（含 `<small>` 副標）、eyebrow、圖例、平面圖的 alt、頁尾日期。完整清單與現行參數在 `styles/3d/page.md`。
4. 驗證：照 `styles/3d/verify.md`，執行 `sh <skill>/styles/3d/scripts/run-overlap.sh <放 index.html 和 scene-glb.txt 的資料夾>`，最後一行要是 `RESULT PASS` 才算過（包含哪些檢查見 `verify.md`「通過標準」；不要只看 `failing 0`），接著看併圖和截圖。
5. 發布成 Artifact：`index.html`、`scene-glb.txt`，以及同一份 spec 產出的平面圖 `final.png`（「平面圖」分頁用）。`.glb` 不是可發布的檔案類型，所以模型用 base64 文字檔。不要發布量測留下的 `test.html`、`.overlap.mjs` 和輸出資料夾（預設 `out/`）。

## 參考檔

| 檔案 | 何時讀 |
|---|---|
| `references/data-sources.md` | 需要自己從叢集或節點查資料時 |
| `references/spec.md` | 整理 spec 時 |
| `references/principles.md` | 每次都讀；兩種風格共用的規則 |
| `styles/flat/layout.md`、`style.md` | 畫平面圖之前；節點數不是 2 時尤其要讀 `layout.md` |
| `styles/flat/assets/example_gen.py` | 平面圖的產圖程式範本 |
| `styles/flat/assets/example-step-panel.svg`／`.png` | 平面圖成品的參考 |
| `styles/flat/scripts/chips.mjs`、`svg2png.mjs` | 加灰底、轉 PNG |
| `styles/3d/requirements.md` | 做 3D 頁之前 |
| `styles/3d/page.md` | 改 3D 頁時：版面、自動擺放、取景、動畫、全螢幕、手機的現行設定 |
| `styles/3d/model.md` | 準備或修改 3D 模型時 |
| `styles/3d/verify.md` | 驗證、審閱時（含 Codex／Gemini 的指令與踩過的坑） |
| `styles/3d/assets/index.html`、`scene-glb.txt` | 3D 頁範本與範例模型 |
| `styles/3d/assets/example-*.png` | 3D 成品參考：桌面總覽、桌面步驟 4、手機整頁 |
| `styles/3d/scripts/run-overlap.sh`、`overlap.mjs` | 34 個狀態的截圖、重疊量測、模型座標比對、圓圈與標籤消失、頁面錯誤、手機清單檢查與併圖 |
