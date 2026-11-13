# Spec 格式

spec 是資料與畫圖之間唯一的交接點。畫圖時只看 spec，不回頭翻原始輸出，這樣才能逐項核對圖上的值。

```yaml
# 來源：<叢集> <日期>，<用了哪些唯讀指令>
title: 看板連線怎麼走：主機 → 入口（Envoy）→ Pod
underlay: podman2 bridge 172.22.0.0/24（主機 172.22.0.254）   # 底部橫條的文字
client:                      # 叢集外的用戶端，可省略
  name: 主機的瀏覽器／curl
  ip: 172.22.0.254
  if: podman2
nodes:
  - name: node-a
    uplink: {name: eth0, ip: 172.22.0.2, mac: "aa:bb:cc:dd:ee:01"}
    extra_ips: ["172.22.0.201（Gateway IP，L2 宣告）", "10.244.1.10（ingress IP）"]
    boxes:                   # 節點內其他元件，可省略
      - label: cilium-envoy
        sub: hostNetwork · pid 1234
        emphasis: true             # 連線終點，用粗框強調
  - name: node-b
    uplink: {name: eth0, ip: 172.22.0.5}
    pods:
      - name: app-5d8f9c7b6-xxxxx
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
volatile: ["1234", "app-5d8f9c7b6-xxxxx", "10.244.4.20", "10.244.1.10", "lxc0123456789ab", "45123"]
volatile_note: ["灰底的值會變動：重啟、重建或每條新連線都不同", "圖中是 <日期> <叢集> 實測，請以自己查到的為準"]
```

## 規則

- `hops` 與 `target` 用 `節點名稱/元件名稱` 指向元件，`client`、`underlay` 指向用戶端與底部橫條。
- 經過 proxy 時拆成兩條 path：proxy 終止了第一條 TCP 連線，再另開第二條。用 `ss`、tcpdump 確認後再拆。
- `steps[].lines` 逐字呈現，固定兩行：第一行是重點，第二行是細節。
- 編號要連續，順序等於封包實際經過的順序；`path` 決定編號的顏色。
- `volatile` 列出每次重啟、重建或每條新連線都會變的值，圖上用灰底標示；只寫會變的那段（例如 PID 寫 `1234`，不寫 `pid 1234`）。
- 任何欄位查不到就省略該鍵，不要填佔位值。

## 給使用者確認時

不必貼整份 YAML。用幾行列出節點、上行介面與 IP、Pod 與 IP、每條連線的起訖、步驟文字，以及標成會變動的值，再列出缺的欄位即可。
