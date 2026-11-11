# Spec 格式

spec 是資料與畫圖之間唯一的交接點。畫圖時只看 spec，不回頭翻原始輸出，這樣才能逐項核對圖上的值。

```yaml
title: Pod-to-Service packet path
underlay: Underlying (routing) network   # 雲裡的文字
nodes:
  - name: node1
    uplink:                  # 節點底部的上行介面
      name: bond0            # 沒有 bond 時填實體網卡，members 留空
      ip: 10.255.255.11
      members: [eth0, eth1]
      hooks: [ingress, egress]     # 介面上的小標籤，可省略
    pods:
      - name: Pod1
        ip: 10.1.1.2
        ifname: eth0               # Pod 內的網卡
        host_if: lxc00aa           # 主機端 veth，查不到就留空
        host_if_hooks: [ingress]
    boxes:                   # 節點內其他元件，可省略
      - label: Kernel routing
        style: solid-orange        # solid-orange | tag-purple | tag-green | plain
paths:
  - color: purple            # purple = 送出方向，green = 接收方向
    hops:
      - node1/Pod1
      - node1/lxc00aa:ingress
      - node1/Kernel routing
      - node1/bond0:egress
      - node1/eth1
callouts:
  - n: 1
    target: node1/Pod1
    color: purple
    lines:
      - "# Access <ServiceIP:Port>"
      - "$ curl 10.224.1.1:80"
  - n: 5
    target: underlay
    bubble: false            # 只畫編號，不畫標註框
```

## 規則

- `hops` 與 `target` 用 `節點名稱/元件名稱` 指向元件，`:ingress`／`:egress` 指向該元件上的小標籤。
- `callouts[].lines` 逐字呈現。
- 編號要連續，順序等於封包實際經過的順序。
- 任何欄位查不到就省略該鍵，不要填佔位值。

## 給使用者確認時

不必貼整份 YAML。用幾行列出節點、上行介面與 IP、Pod 與 IP、路徑起訖，再列出缺的欄位即可。
