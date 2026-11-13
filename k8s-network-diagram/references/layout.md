# 版面

畫布是 `viewBox="0 0 1440 720"`。左側 x=20–900 是圖，右側 x=930–1420 是步驟欄。以下座標都以此為準，`assets/example_gen.py` 是這份版面的實作。

## 整體

| 區塊 | 位置 |
|---|---|
| 圖標題 | 左上，x=20、y=28 |
| 節點 | y=52–470 |
| 用戶端（叢集外，例如主機的瀏覽器） | 左下，x=20–200、y=520–600 |
| underlay（例如 podman2 bridge） | 用戶端右側的橫條，x=230–900、y=540–580 |
| 步驟欄 | x=930–1420、y=52–700 |

用戶端放在 underlay 的**旁邊**，從側邊接進 underlay 的左端，不要掛在 underlay 下方。

## 節點

| 節點數 | 位置 |
|---|---|
| 2 | x=20 寬 430、x=480 寬 420 |
| 3 以上 | 拆成「總覽」加「單一路徑細節」多張圖 |

節點內部：

- 左上：節點名稱（y=78），下面列附加 IP（例如 Gateway IP、ingress IP，y=108、134）。
- 上行介面（eth0）160×44，放在 y=400–444，IP 以粗體放在它左側（text-anchor end）。從它的底部畫一條直線接到 underlay。
- 讓上行介面正好在 underlay 上方。左邊節點的元件因此放在右半欄，左半欄留給附加 IP。
- 其他元件（cilium-envoy、Pod）放在上行介面正上方，y=90–250。
- Pod 框約 210×104，名稱在上，內含白底小框放 Pod IP 與網卡名稱。主機端網卡（lxc）放在 Pod 下方一側，用細線連到 Pod；連線不經過它時照 style.md 畫成虛線框。

## 路徑

- 同一個元件上，兩條連線各走一條直欄（例如紫色 x=300、綠色 x=380），不共用。
- 每一段各自一條 path、各自一個箭頭，不要用一條長線串到底，因為中途會穿過元件框。
- 跨節點的連線在節點底邊與 underlay 之間（y≈505）橫向走，不要穿過 underlay 的文字。
- 路徑之間不交叉，也不穿過文字與編號。

## 步驟編號

放在它說明的元件旁邊，距離元件邊緣約 10px，不壓線、不壓字。指向 underlay 的編號放在 underlay 正下方；指向用戶端的放在用戶端正上方。

## 步驟欄

- 白底、#d4d4d8 1px 框、圓角 8。
- 最上面：「步驟」標題，右邊兩行連線圖例（虛線樣本加說明）。
- 步驟從 y=138 開始，每步間距 70：編號圓圈在左，第一行粗體在 y+18、第二行在 y+44，每步上方一條 #e2e2e5 分隔線。
- 最下方：分隔線，加上兩行註解（見 style.md「會變動的值」）。
- 步驟最多 7 個。超過時拆圖，或把步驟欄改成兩欄。

## 自我檢查

1. 產生 SVG（會變動的值包在 `<tspan class="v">` 裡）。
2. 加灰底：`node scripts/chips.mjs raw.svg final.svg`，它在 Chromium 裡量每個 `tspan.v` 的實際寬度，在後面插入灰底框。
3. 轉 PNG：`node scripts/svg2png.mjs final.svg final.png`，依 viewBox 決定尺寸，1.5 倍解析度。

沒有本機 Node／Playwright 時，用容器執行：

```bash
podman run --rm -v "$PWD:/w:Z" mcr.microsoft.com/playwright:v1.49.1-noble sh -c \
  "cd /tmp && npm i playwright@1.49.1 >/dev/null 2>&1 && cp /w/scripts/*.mjs /tmp/ && \
   node /tmp/chips.mjs /w/raw.svg /w/final.svg && node /tmp/svg2png.mjs /w/final.svg /w/final.png"
```

打開 PNG 看這幾件事：

- 文字沒有超出自己的框，灰底框沒有蓋到相鄰的字
- 虛線沒有穿過文字或編號，路徑之間沒有交叉
- 每個編號都緊鄰它說明的元件
- 每個上行介面都接到 underlay
- 步驟欄的最後一步沒有碰到註解
