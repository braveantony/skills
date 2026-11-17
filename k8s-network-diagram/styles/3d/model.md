# 3D 模型

> 範例模型的 Blender 腳本沒有保存下來。拓撲和範例相同時（定義見 `SKILL.md`「3D 互動頁」第 2 步）直接用 `styles/3d/assets/scene-glb.txt`；不同時要照下面的規格從頭寫 bpy 腳本（建議連錨點 JSON 一起輸出），完成後把腳本放進 `styles/3d/scripts/`，讓下一次可以重現。

模型用 Blender（bpy 腳本）建立，匯出成 glTF binary，再轉成 base64 文字檔 `scene-glb.txt` 給網頁載入。網頁不在乎模型怎麼建，只依賴下面這份規格：物件名稱、材質名稱、座標系與錨點。拓撲相同、只換模型時，照這份規格建模，`index.html` 的程式邏輯能沿用，但這些要照新模型重抄：`D.anchors`、`D.p1`／`D.p2`、`D.target`、`D.camdir`、`BOXES`、`CABLES`、`NODES`；`D.p1`／`D.p2` 的頂點數變了，`STEPS[].seg` 的索引要跟著改；錨點、標籤鍵或 `BOXES` 改名時要一起改的地方，見下方「改名時要一起改的地方」。取景點和膠囊高度是程式算的，不用改。拓撲不同時，除了資料區（含 `ANCH`、`label()`、`STEPS`），`LABEL_BOX`、`prio()` 這些資料區以外寫死的地方也要改，兩份清單都在 `page.md`。

`styles/3d/assets/scene-glb.txt` 是範例：主機 → podman2 交換器 → tkha-control-plane-2（hostNetwork 的 cilium-envoy Pod）與 tkha-worker-2（koupa Pod，有自己的 netns）。

## 座標

- glTF 是 Y 軸朝上。Blender 是 Z 軸朝上，匯出時轉換：(x, y, z) → (x, z, −y)。
- 網頁裡所有座標（`D.anchors`、`D.p1`、`heavyBoxes` 等）都是 glTF 座標。
- 範例的尺度：節點約 17×10、高 3.6；Pod 框約 6×2.4、高 2.6。網頁的取景與避讓距離都以這個尺度調過。

## 物件（網格）與材質

| 物件 | 網格名稱 | 材質 | 外觀 |
|---|---|---|---|
| 節點 | `node_wall*`、`node_rail*`、`node_post*`、`cp_floor`、`wk_floor` | 牆是半透明 | 半透明的盒子，加上地板 |
| Pod 框 | `post*`、`rail*`、`pfloor*` | `floor` | 開放的框架加地板 |
| Pod 的 netns | `wall*`（外牆）、`wall_in*`（內牆） | `netns_out`（藍）、`netns_in`（淡藍） | 只有自己有 netns 的 Pod 才有（koupa）；hostNetwork 的 Pod（Envoy）沒有牆 |
| container | `ctr*`、`ctr_lid*` | **`container`**、**`container_top`** | 方塊加蓋子。網頁會依材質名稱改成琥珀色，所以材質名稱不能改 |
| 網卡 | `cp_eth0_*`、`wk_eth0_*`、`koupa_eth0_*`（`plate`、`rim`、`port`） | 板子是綠色系，框是深色 | 直立的板子、外框和接口 |
| lxc | `lxc_base`、`lxc_plate`、`lxc_rim`、`lxc_port` | | 放在底座上的小網卡 |
| 交換器 | `switch` | 深色 | 扁平方塊 |
| 主機 | `host`、`screen`、`screen_frame`、`tabbar` | | 底座加螢幕，不畫品牌 |
| 實體網路線 | `cab_*`、`veth*` | 深色 | 細圓柱 |
| 連線 ①② | `path1*`、`path2*`（圓柱）、`Cone*`（箭頭）、`Sphere*`（轉角） | 紫、綠 | 粗管、每段一個箭頭；Envoy 的起點是較大的球 |

## 錨點（`D.anchors`）

網頁用錨點擺標籤、步驟圓圈和取景。範例的錨點已經寫在 `index.html` 的 `D.anchors` 裡，skill 沒有另外附 JSON 檔。重新建模時，建議讓 bpy 腳本輸出錨點 JSON，再貼進 `D`。每個錨點都要在 `ANCHOR_ON` 寫明它應該落在哪個方塊、節點、連線，或哪個網格（寫成 `mesh:<網格名稱>`，結尾加 `*` 表示前綴，例如 `mesh:ctr*`），量測會檢查（方塊、節點、網格容許 0.4；連線是離折線 0.7 以內）。量測只看錨點落在哪裡，錨點在方塊裡是否指對東西（例如圓圈指的是 container，而不是 Pod 的角落），要看截圖確認；能用網格名稱的就用網格名稱，範圍比方塊小。

| 錨點 | 用途 |
|---|---|
| `cp_eth0`、`wk_eth0`、`koupa_eth0`、`lxc` | 網卡標籤；步驟 2、6 的圓圈 |
| `cp_top`、`wk_top` | 節點名稱 |
| `envoy_top`、`koupa_top` | Pod 名稱（在 Pod 框正上方） |
| `koupa_ctr` | 步驟 7 的圓圈（`ANCHOR_ON` 指向 container 網格 `ctr001`） |
| `envoy_ctr`、`envoy_floor`、`switch` | 範例沒有用到，Blender 腳本照樣匯出；`envoy_ctr` 指向 `ctr`，其餘指向所在方塊 |
| `switch_top` | 交換器標籤 |
| `host_top`、`host_front` | 步驟 1 的圓圈、主機標籤 |
| `p1_mid`、`p2_mid` | 連線膠囊的預設位置 |
| `p1_end`、`p2_start` | 連線 ① 的終點、連線 ② 的起點（Envoy） |

錨點與網格名稱的前綴代表「哪個節點、哪個 Pod」：`cp_` 是有 Envoy 的節點，`wk_` 是有應用 Pod 的節點，`envoy_`、`koupa_` 是兩個 Pod。拓撲不同時照同樣的規則命名，例如：
- 單一節點（Envoy 和 Pod 在同一個節點）：只有 `cp_eth0`、`cp_top`，不要建 `wk_*`；Pod 的錨點用 Pod 的短名稱當前綴（例如 `koupa_top`、`koupa_eth0`）。
- 多一個節點或 Pod：加一組新前綴（例如 `wk2_`、`api_`），並在 `ANCH` 加上對應的鍵。

改名時要一起改的地方：

| 改了什麼 | 要一起改 |
|---|---|
| 錨點名稱（`D.anchors` 的鍵，含前綴） | `ANCH` 的值、`STEPS[].at`、`ANCHOR_ON` 的鍵、`pill()` 用的 `A.p1_mid`／`A.p2_mid` |
| 標籤鍵（例如 `envoy`、`cpnode`） | `label()` 的第一個參數、`ANCH` 的鍵、`STEPS[].rel`、`LABEL_BOX` 的鍵、`prio()`；`prio()` 靠鍵名結尾是 `node` 判斷節點名稱，節點的標籤鍵要以 `node` 結尾 |
| `BOXES` 的名稱 | `LABEL_BOX` 的值、`ANCHOR_ON` 的值 |

頁面載入時會檢查 `ANCH`、`label()` 的鍵、`STEPS[].at`／`rel`／`seg`、`LABEL_BOX` 指到的東西是否存在，有錯就丟出 `data check: ...`，量測會顯示在 `ERR` 那一行。

另外還有：`D.p1`、`D.p2`（連線的折線頂點）、`D.target`（預設注視點）、`D.camdir`（預設鏡頭方向，範例是 `[0.8, 2.0, 1.0]`）。

## 網頁裡的障礙物座標

`index.html` 的 `BOXES`、`CABLES`、`NODES` 是**手寫的世界座標**，從模型的網格範圍（min／max）抄過來；`heavyBoxes`、`heavySegs`、`lightSegs` 是程式從它們推導出來的（`heavySegs` 另外併入 `D.p1`、`D.p2`），不要直接改。換模型時一定要一起更新，否則文字會壓到新模型。不要手算：先跑一次 `run-overlap.sh`，`model.json` 的 `bounds` 會列出每個網格實際的世界座標（min／max），照它抄；`problems` 會列出還對不上的地方。取景點直接從 `NODES`、`BOXES` 算，不用另外改。障礙物寫成三個有名稱的物件：`BOXES`（模型方塊 → `heavyBoxes`）、`CABLES`（實體網路線與 veth 的折線 → `heavySegs`）、`NODES`（節點外框 → `lightSegs`）。網頁把它們設成 `window.OBST` 給 `scripts/overlap.mjs` 量測，只有一份，不要在量測腳本另外抄。量測時會拿它們和實際載入的模型比對（見 `verify.md`「模型座標」），所以網格名稱要照上表：`node_*` 對 `NODES`，`cab*`、`veth*` 對 `CABLES`，`path*`、`Cone*`、`Sphere*` 對 `D.p1`／`D.p2`；名稱結尾是 `_floor` 的網格（範例的 `cp_floor`、`wk_floor`）不檢查；其餘都算實心物件，要落在某個 `BOXES` 裡，例如 Pod 地板 `pfloor*` 名稱不符合 `*_floor`，要包含在 Pod 的方塊裡。

- `BOXES`（→ `heavyBoxes`）：網卡、lxc、交換器、主機、主機螢幕、兩個 Pod 框。
- `heavySegs`：`D.p1`、`D.p2`，加上實體網路線與 veth 的折線。
- `lightSegs`：兩個節點外框的 12 條邊。

可以用下面的指令列出每個網格的範圍：

```bash
python3 -I - <<'EOF'
import base64, json, struct
b = base64.b64decode(open('scene-glb.txt').read().strip())
n = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + n])
for node in j['nodes']:
    if 'mesh' in node:
        a = j['accessors'][j['meshes'][node['mesh']]['primitives'][0]['attributes']['POSITION']]
        print(node['name'], node.get('translation'), a['min'], a['max'])
EOF
```

這段印出的 `translation` 是 `None`（沒有平移）的網格，min／max 就是世界座標；有平移或旋轉的網格（例如圓柱、箭頭）要自己算端點。所以抄座標的首選是 `model.json` 的 `bounds`（見上方「網頁裡的障礙物座標」），這段只在還沒有網頁可以量的時候用。

注意名稱寫法：這段印的是 glTF 原名（例如 `ctr.001`），three.js 載入後會去掉點（`ctr001`）。`ANCHOR_ON` 的 `mesh:` 和量測輸出都用 three.js 的名稱，以 `model.json` 的 `bounds` 為準。

## 用 Blender 建模

- 環境：Blender 5.x，透過 MCP 伺服器 `mcp-for-blender` 遠端執行 bpy（建議設 `DISABLE_TELEMETRY=true`）。沒有顯示器時，用 `xvfb-run -a -s "-screen 0 1920x1080x24" blender --python enable.py` 啟動，外掛監聽 9876 埠。`enable.py` 是「啟用 MCP 外掛並開始監聽」的啟動腳本，**這個 skill 沒有附**，要依所用外掛的說明自行準備；沒有 Blender 環境時先問使用者。
- 腳本用 `exec(open(f).read(), {"__name__": "__main__"})` 執行，方便反覆修改。
- 匯出：

  ```python
  bpy.ops.export_scene.gltf(filepath=..., use_selection=True, export_apply=True)
  ```

  接著轉成網頁用的文字檔：

  ```bash
  base64 -w0 scene.glb > scene-glb.txt
  ```

- 材質用 Principled BSDF，金屬度設 0。網頁載入時也會強制金屬度 0、粗糙度至少 0.6。
- 設計方向（使用者選定）：
  - Pod 用開放框架（看得到裡面的 container）；
  - 節點用半透明盒子；
  - 整體是等角視角的扁平風格。
