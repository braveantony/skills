# Spec 格式

spec 是資料與畫圖之間唯一的交接點。畫圖時只看 spec，不回頭翻原始輸出，這樣才能逐項核對圖上的值。

```yaml
# 來源：<叢集> <日期>，<用了哪些唯讀指令>
eyebrow: Koupa 酷杯 · 階段 01 · tkha 實測   # 3D 頁頁首的小字，可省略；省略時只寫「<叢集> 實測」
title: 看板連線怎麼走：主機 → 入口（Envoy）→ Pod
subtitle: 主機 → Envoy（control-plane-2）→ koupa Pod（worker-2）   # 3D 頁標題下的一行，可省略
underlay: podman2 bridge 172.22.0.0/24（主機 172.22.0.254）   # 底部橫條的文字
client:                      # 叢集外的用戶端，可省略
  name: 主機的瀏覽器／curl
  ip: 172.22.0.254
  if: podman2
nodes:
  - name: node-a
    uplink: {name: eth0, ip: 172.22.0.2, mac: "aa:bb:cc:dd:ee:01"}   # 上行是 bond 時填 bond 名稱，例如 bond0；成員網卡不畫
    extra_ips: ["172.22.0.201（Gateway IP，L2 宣告）"]
    boxes:                   # 節點內其他元件，可省略
      - label: cilium-envoy
        ns: kube-system            # namespace，3D 頁的標籤會顯示
        sub: hostNetwork · pid 1234
        emphasis: true             # 連線終點，用粗框強調
  - name: node-b
    uplink: {name: eth0, ip: 172.22.0.5}
    pods:
      - name: app-5d8f9c7b6-xxxxx
        ns: app
        ip: 10.244.4.20
        ifname: eth0               # Pod 內的網卡
        host_if: lxc0123456789ab   # 主機端網卡，查不到就留空
        bypassed: true             # 連線不經過它（例如 eBPF 直接送進 Pod）
paths:                       # 一條 TCP 連線一條 path
  - id: 1                    # 1 = 紫色，2 = 綠色
    name: 連線 ①：瀏覽器 ↔ Envoy
    hops: [client, underlay, node-a/eth0, node-a/cilium-envoy]
  - id: 2
    name: 連線 ②：Envoy ↔ Pod
    hops: [node-a/cilium-envoy, node-a/eth0, underlay, node-b/eth0, node-b/app-5d8f9c7b6-xxxxx]
steps:
  - n: 1
    path: 1
    target: client
    lines: ["curl http://172.22.0.201/events", "172.22.0.254:45123 → 172.22.0.201:80"]
  - n: 2
    path: 1
    target: underlay
    lines: ["誰有 172.22.0.201？", "node-a 回 ARP（L2 宣告）"]
volatile: ["1234", "xxxxx", "10.244.4.20", "lxc0123456789ab", "45123"]
volatile_note: ["灰底的值會變動：重啟、重建或每條新連線都不同", "圖中是 <日期> <叢集> 實測，請以自己查到的為準"]
```

## 規則

- 上面的 `steps` 只示意格式（`node-a` 等是假名稱）。完整的 7 步實例在 `styles/flat/assets/example_gen.py` 與 `styles/3d/assets/index.html` 的 `STEPS`，兩份逐字相同；使用者說「步驟和範例相同」時，以那兩份為準。
- `hops` 與 `target` 用 `節點名稱/元件名稱` 指向元件，`client`、`underlay` 指向用戶端與底部橫條。
- `target` 只決定**平面圖**的編號放在哪個元件旁。3D 頁的圓圈位置是 `STEPS[].at`（模型的錨點），兩者不必相同：例如步驟 2（ARP）在平面圖放在 underlay 下方，在 3D 頁放在回 ARP 的那張 eth0（`cp_eth0`），因為回 ARP 的是那張網卡。
- 經過 proxy 時拆成兩條 path：proxy 終止了第一條 TCP 連線，再另開第二條。用 `ss`、tcpdump 確認後再拆。
- `steps[].lines` 逐字呈現，固定兩行：第一行是重點，第二行是細節。
- 編號要連續，順序等於封包實際經過的順序；`path` 決定編號的顏色。
- `volatile` 列出每次重啟、重建或每條新連線都會變的值，圖上用灰底標示；只寫會變的那段（例如 PID 寫 `1234`，不寫 `pid 1234`；Pod 名稱只寫雜湊後綴 `xxxxx`，`app-5d8f9c7b6-` 這段不加灰底）。
- `volatile_note` 的第一行依 `references/principles.md` 第 4 條選：看的是「圖上實際加灰底的值」，不是 `volatile` 清單，因為步驟文字不加灰底，裡面的來源埠不算。這個範例的圖上有 PID（`pid 1234`），所以用「每條新連線都不同」那句；如果圖上只有 Pod 名稱、Pod IP、lxc 名稱，就用「重啟或重建後會不同」。
- `ns` 只顯示在 3D 頁的標籤和手機清單上；平面圖不顯示，因為節點框裡的空間要留給名稱、IP 和網卡。
- 任何欄位查不到就省略該鍵，不要填佔位值。

## 給使用者確認時

不必貼整份 YAML。用幾行列出節點、上行介面與 IP、Pod 與 IP、每條連線的起訖、步驟文字，以及標成會變動的值，缺的欄位要在列出 spec 之前逐一問完，一次只問一個；列出 spec 時只問「這樣對嗎」這一個問題。
