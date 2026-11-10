---
name: k8s-network-diagram
description: 畫 Kubernetes 網路圖、封包路徑圖、CNI datapath 架構圖時使用。產出扁平 PowerPoint 風格的 16:9 SVG，節點、Pod、網卡、IP 依實際環境（kubectl 輸出、節點上的 ip 指令輸出，或使用者提供的資料）動態帶入。只要使用者想把 K8s 節點、Pod、bond、veth、Service 流量或封包走向畫成圖，即使沒說「架構圖」也應使用。
---

# K8s 網路架構圖

產出一張 16:9、白底、扁平風格的 K8s 網路圖：節點、Pod、網卡、封包路徑、編號標註。

風格與版面是固定的，環境資料是動態的。兩者分開處理，圖才會每次長得一樣、內容卻符合當下環境。

## 流程

1. **取得環境資料。** 使用者已貼上輸出或給了完整數值時直接用；需要自己查叢集時，先讀 `references/data-sources.md`。
2. **整理成 spec。** 欄位與範例在 `references/spec.md`。把 spec 簡短列給使用者確認，缺的欄位用問的。
3. **畫圖。** 動手前讀 `references/layout.md`（座標與排法）與 `references/style.md`（色碼、字級、標註畫法）。從 `assets/example-two-node.html` 複製後改寫，比從零算座標可靠。
4. **自我檢查。** 把 SVG 轉成 PNG 實際看一次（做法在 `references/layout.md` 末段）。
5. **交付。** 預設交付可分享的頁面；使用者指定 SVG 或 PNG 時給檔案。

## 兩條不可違反的規則

- **圖上的值只能來自 spec。** 範例檔裡的 IP、Pod 名稱、網卡名稱都只是示意，不可沿用。查不到的欄位留空並在回覆中列出，因為一張看起來完整但數值是編的網路圖，會在排錯時誤導人。
- **只執行唯讀指令。** 畫圖不該改變叢集狀態。

## 交付時的說明

回覆中用兩三句話說明：哪些欄位是使用者提供、哪些是指令查到、哪些留空；以及任何與使用者描述不同的地方。標註文字照使用者給的字逐字呈現，不改寫、不翻譯。

## 參考檔

| 檔案 | 何時讀 |
|---|---|
| `references/data-sources.md` | 需要自己從叢集或節點查資料時 |
| `references/spec.md` | 整理 spec 時 |
| `references/layout.md` | 動手畫之前；節點數不是 2 時尤其要讀 |
| `references/style.md` | 動手畫之前 |
| `assets/example-two-node.html` | 作為起點複製改寫 |
