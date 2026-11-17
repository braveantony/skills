# 驗證與審閱

## 自動量測

```bash
sh <skill>/styles/3d/scripts/run-overlap.sh <放 index.html 和 scene-glb.txt 的資料夾> [輸出資料夾名稱]
```

主機上要有 `podman`（跑 Playwright 容器）和 `python3`（彙總結果），第一次執行會下載容器映像檔。

第二個參數只能是資料夾名稱（不能有 `/`，也不能以 `.` 開頭），輸出放在 `<資料夾>/<名稱>/`。腳本會在那個資料夾留下 `test.html`、`.overlap.mjs` 和輸出資料夾（預設 `out/`），發布時不要一起傳上去。下面的路徑都以預設的 `out/` 為例。

- 先把 `index.html` 包上和 Artifact 平台相同的外殼（含 `[hidden]{display:none!important}`），存成 `test.html`。
- 再用 `mcr.microsoft.com/playwright:v1.49.1-noble` 容器、swiftshader 軟體繪圖執行 `overlap.mjs`。
- 最後印出各項結果，最後一行是總結 `RESULT PASS` 或 `RESULT FAIL`：
  - `states N | failing N | leader crossings N`，有問題的狀態列在下面；
  - `parts ok` 或 `parts FAIL`：手機清單的檢查；
  - `model ok` 或 `model FAIL`：頁面上的座標和實際載入的模型是否一致；
  - `marker hidden ... | rel labels missing ... | overview labels missing ...`：每一步的圓圈和相關標籤、桌面總覽的標籤有沒有消失；
  - `page errors N`：頁面自己丟出的 JavaScript 錯誤（含 timer、事件處理、render loop 裡的），不是 0 就是 `RESULT FAIL`；
  - 最後 `RESULT PASS` 時 exit code 是 0，`RESULT FAIL` 時是 1。
  - 量測沒跑完（常見是 `index.html` 的語法錯誤，頁面根本跑不起來），頁面載入時的資料檢查失敗（`ERR data check: ...`，例如 `STEPS[].rel`、`LABEL_BOX` 指向不存在的鍵），或量測直接呼叫的函式（例如 `go()`）丟出錯誤時，最後一行是 `RESULT ERROR`，exit code 是 3，往上找**第一行** `ERR` 看原因；後面的 `ERR page.evaluate: ...`（例如 `scene is not defined`）通常是它引起的連鎖錯誤。`ERR npm install ... failed` 代表容器裡裝不了 Playwright（多半是沒有網路），和頁面無關。參數錯誤或資料夾裡沒有 `index.html` 時 exit code 是 2。`model.json` 的 `meshes` 是 0，代表 `scene-glb.txt` 沒載入。
- 資料夾裡沒有 `final.png` 時，開頭和 `RESULT` 前一行都會印 `WARN`：量測照跑、不算進 `RESULT`，但發布後「平面圖」分頁會破圖。
- 輸出資料夾裡有：每個狀態的截圖、`overlap.json`、`parts.json`、`model.json`、`checks.json`、手機整頁截圖 `phone-full.png`，手機橫放 `phone-land-<N>.png`、按「回到全圖」之後的 `phone-reset.png`，以及每組併成一張的 `sheet-desk.png`、`sheet-deskfull.png`（2 欄）、`sheet-phone.png`、`sheet-phonefull.png`（4 欄）。併圖用容器裡的 Chromium，不需要 PIL。

**34 個狀態**（範例的數字。步驟數、障礙物都從頁面讀，`overlap.mjs` 不用改）：
- 桌面 1440×900、手機 390×844，各分一般和全螢幕：總覽 + 每一步，7 步時共 32 個；
- 手機橫放（封包路徑段數最多的一步，範例是步驟 6）；
- 手機按「回到全圖」之後。

**通過標準**：最後一行是 `RESULT PASS`。它代表以下全部符合，不要只看 `failing 0`：
1. `failing 0`，也就是每個狀態的 `text` 和 `ui` 都是空的；
2. 每一步的圓圈都沒有消失（`marker hidden 0`），鏡頭停下後相關標籤都在（`rel labels missing 0`），桌面總覽（一般與全螢幕）的標籤全部都在（`overview labels missing 0`），頁面沒有丟出錯誤（`page errors 0`）；
3. `parts ok`；
4. `model ok`。這一項不過時，其他項目的 0 都不可信，因為量測用的是頁面上的舊座標。

- `text`：
  - 文字蓋到連線、實體網路線與 veth、節點外框線、網卡、交換器、主機、Pod、container；
  - 文字疊文字；
  - 文字被畫面邊緣切掉；
  - 引線穿過其他文字或不屬於自己的模型；
  - 目前這一步整段路線上的封包光暈碰到文字。

  步驟圓圈用圓形判斷，其他用矩形。
- `ui`：工具列、說明列、提示文字蓋到圖案或文字。
- `crossings`：引線跨過連線的次數。可以不是 0，但要低（範例約 45 次／34 個狀態）。

量測用的障礙物都從頁面的 `window.OBST` 讀：`boxes`（模型方塊）、`cables`（實體網路線與 veth 的折線）、`nodes`（節點外框），加上 `D.p1`、`D.p2`（連線）。`crossings` 只算連線，不算網路線和外框。

自動檢查的內容：
- **模型座標**（`model.json`）：模型載入後，逐一算出每個網格的實際範圍，和 `window.OBST`（`boxes`、`cables`、`nodes`、`anchorsOn`）比對。容許誤差：方塊和節點 0.1，網路線網格的中心離折線 0.2，連線網格的中心離 `D.p1`／`D.p2` 0.3，錨點 0.4（對連線是 0.7）：
  - 每個實心物件都要落在某個 `boxes` 裡，每個 `boxes` 也要和它裡面網格的範圍一致；
  - `node_*` 對 `nodes`；
  - `cab*`、`veth*` 要在 `cables` 的折線上，反過來 `cables` 每一段沿線取 5 個點（5%、25%、50%、75%、95%），都要落在網路線網格裡，畫得比模型長或短都會抓到；
  - 連線的圓柱、箭頭、轉角要在 `D.p1`、`D.p2` 上，反過來 `D.p1`、`D.p2` 每一段也用同樣的 5 個點檢查，都要落在連線網格裡；
  - 每個錨點都要列在 `ANCHOR_ON`，並落在它指定的方塊、節點或網格上（指定的名稱不存在時，訊息是 `unknown target`）（容許 0.4），或離指定的連線 0.7 以內。這只檢查位置，錨點是否指對東西要看截圖；
  - 預設注視點 `D.target` 要在模型範圍內。

  換了模型卻沒重抄座標，這裡會是 `FAIL`，並列出對不上的物件（`problems`）。`bounds` 列出每個網格實際的世界座標，重抄座標時照它抄。**不在檢查內**的有：鏡頭方向 `D.camdir`（看總覽截圖）、`STEPS[].seg` 的索引是否對到該走的那幾段、每一步的 `at`／`rel` 是否指對元件（看步驟截圖，封包要從該步的起點走到終點，圓圈要在講的元件上）。
- **圓圈有沒有消失**（`marker hidden`）：換步驟後 3.6 秒內，從第 300ms 起每 100ms 檢查一次目前這一步的圓圈。
- **相關標籤**（`rel labels missing`）：鏡頭停下時，`STEPS[i].rel` 的每個標籤都要顯示（標籤元素有 `data-key`）。
- **手機清單**（`parts.json`）：390px 寬時 `#parts` 要顯示、1440px 寬時要隱藏；標籤裡每個粗體名稱、`<code>`、灰底值、小膠囊（例如 hostNetwork），以及第二行的文字（namespace、Gateway IP、「node」）都要出現在清單裡，`missing` 列出缺的。

**`overlap.json` 的 `shown`** 是每個狀態當下顯示的文字，標籤消失時可以從這裡看是哪一個。名稱的寫法是：
- `marker N`：步驟 N 的圓圈；
- `pill ①`、`pill ②`：連線膠囊。膠囊放不下時會隱藏，不在必查項目內（見 `requirements.md` 第 6 條）；
- `label "..."`：標籤，引號裡是標籤文字的前 22 個字，例如 `label "eth0 172.22.0.2Gateway"`。和 `index.html` 的 `label(key, html, ...)` 對照：`html` 去掉標籤後的開頭文字就是它。

桌面總覽的標籤是否全部出現已經自動檢查（`checks.json` 的 `overviewMissing`，以 `ANCH` 的鍵為準，範例 10 個）。`marker` 和 `pill` 放不下時允許隱藏，所以 `shown` 的總數不固定：範例的 `desk-overview` 是 19 項，`deskfull-overview` 少了步驟 5 的圓圈，是 18 項。

**時間上的坑**：
- 每次鏡頭會動（換步驟、轉橫放、轉回直放、按「回到全圖」）之後都等 3.6 秒再量（`overlap.mjs` 的 `SETTLE`），否則會量到鏡頭動畫途中的畫面。
- 字型載入後尺寸會變，頁面開啟後至少等 4 秒。

## 目視檢查

量測只涵蓋測過的狀態和 `window.OBST` 列出的障礙物，最後一定要看截圖。先看 4 張 `sheet-*.png`、`phone-full.png`、`phone-land-<N>.png`、`phone-reset.png`，有疑問再打開單張，逐張看：
- 標籤是不是在它指的東西旁邊，引線有沒有讓人看錯對象；
- 取景：主角夠不夠大、有沒有偏到一邊；
- 封包、箭頭、container 是不是看得清楚。

給使用者看圖的方式見 `references/principles.md` 第 13 條。

## 請 Codex 和 Gemini 審閱

使用者要求「請 Codex 和 Gemini 審」時，兩邊同時跑，只審閱、不改檔。

下面的 `codex`（模型 `gpt-6.1-terra`）和 `agy`（Gemini）是這位使用者機器上的 CLI 與模型名稱。執行前先用 `command -v codex agy` 確認；找不到指令，或模型回 `model_not_found` 時，先問使用者要用哪個指令或模型（一次只問一個），不要自行換成別的。

```bash
# 0 = 總覽，1–7 = 步驟；步驟數不同時改這裡
IMGS=$(for t in desk phone; do for n in 0 1 2 3 4 5 6 7; do printf -- "-i out/$t-$n.png "; done; done)
(timeout 1500 codex exec -m gpt-6.1-terra -s read-only --skip-git-repo-check -C "$PWD" $IMGS \
   -- "$(cat review.md)" < /dev/null > review_codex.md 2> review_codex.err) &
(timeout 1500 agy -p "$(cat review.md)
工作目錄是 $PWD，請直接讀取 index.html、out/overlap.json 與 out/ 底下的 PNG 截圖。" \
   --add-dir "$PWD" --mode plan < /dev/null > review_gemini.md 2> review_gemini.err) &
wait
```

**踩過的坑**：
- `codex exec` 在背景執行時，如果沒有接 `< /dev/null`，會停在「Reading additional input from stdin...」一直等。
- 不要用 `pkill -f '<和本次指令相同的字串>'` 清舊程序：它會比對到你自己的 shell，連同新的任務一起砍掉（exit 144）。先用 `pgrep -af` 看清楚，再用 PID 結束。
- 背景任務完成時會收到通知。不要用 sleep 輪詢。

**審閱提示（`review.md`）要包含**：
- 使用者的硬性要求（`references/principles.md` 與 `styles/3d/requirements.md` 的重點）；
- 上一輪之後改了什麼；
- 「前幾輪已經修過，不要預設它們是對的」；
- 截圖與 `overlap.json` 的位置，並說明量測涵蓋什麼、請對照截圖、不要只信量測；
- 要審的重點；
- 回報格式：每一項附檔名或行號、問題、具體改法；最後給 1–10 分，用兩三句總結；
- 用繁體中文；已經沒問題的地方不要硬找問題。

**整理給使用者時**：
- 先列兩邊的分數，以及兩邊都確認的事；
- 依「建議改」「不建議改」分組。每一項都先自己對照程式或截圖確認，標明「屬實」或說明為什麼不同意；
- 審閱者違反使用者要求的建議（例如「允許文字壓節點外框」「縮小對封包光暈的避讓」），放進「不建議改」並說明原因；
- 最後只問一個問題：要不要照這些改。

## 修改後

改完先跑 `run-overlap.sh`，全部通過、截圖也看過，才發布。發布後回報：
- 版本號；
- 改了什麼；
- 驗證結果（含數字）；
- 還沒處理的地方和原因。
