# 資料來源

依序嘗試，前一種夠用就不必往下。全部是唯讀指令。

## 1. 使用者提供的資料

貼上的指令輸出、設定檔、或直接列出的數值。這是最可靠的來源，優先採用。

## 2. 自行查詢（需有能連到叢集的 shell）

### 通用（任何 CNI）

| 要取得的資料 | 指令 |
|---|---|
| 節點名稱、InternalIP | `kubectl get nodes -o wide` |
| Pod 名稱、Pod IP、所在節點 | `kubectl get pods -A -o wide` |
| Service 的 ClusterIP 與 port | `kubectl get svc -A` |
| 節點上的介面與 IP | 在節點上 `ip -br addr` |
| bond 與成員網卡 | 在節點上 `ip -br link`，成員的 master 欄位會指向 bond |

範圍大時先縮小：用 `-n <namespace>` 或 `--field-selector spec.nodeName=<node>` 只查要畫的部分。

### Cilium

Cilium agent 的 API 只回答自己那個節點的資料，所以每個要畫的節點都要進到該節點上的 cilium Pod 各查一次。

**步驟 1：找出每個節點上的 cilium Pod**

```bash
kubectl get pods -n kube-system -l k8s-app=cilium --no-headers \
  -o custom-columns=:.metadata.name,:.spec.nodeName
```

輸出是「cilium Pod 名稱　節點名稱」兩欄。這是 Cilium repo 中 `contrib/k8s/k8s-get-cilium-pod.sh` 所用的查法。

**步驟 2：列出該節點每個 Pod 的主機端網卡**

```bash
kubectl -n kube-system exec <cilium-pod> -- cilium-dbg endpoint list \
  -o jsonpath='{range [*]}{@.status.external-identifiers.k8s-namespace}{"/"}{@.status.external-identifiers.k8s-pod-name}{"\t"}{@.status.networking.interface-name}{"\t"}{@.status.networking.container-interface-name}{"\t"}{@.status.networking.addressing[*].ipv4}{"\n"}{end}'
```

每列依序是：`namespace/pod`、主機端網卡（例如 `lxc…`）、Pod 內網卡（例如 `eth0`）、Pod IPv4。對應到 spec 的 `host_if`、`ifname`、`ip`。

欄位出處是 `api/v1/models/endpoint_networking.go`：

| JSON 鍵 | 意義 |
|---|---|
| `interface-name` | 主機 netns 中的網卡名稱 |
| `interface-index` | 主機 netns 中的網卡 index |
| `container-interface-name` | 容器 netns 中的網卡名稱 |
| `mac` / `host-mac` | 兩端的 MAC |
| `addressing` | 指派給此 endpoint 的 IPv4／IPv6 |

jsonpath 沒輸出時，改用 `-o json` 看完整結構再取值：

```bash
kubectl -n kube-system exec <cilium-pod> -- cilium-dbg endpoint list -o json
kubectl -n kube-system exec <cilium-pod> -- cilium-dbg endpoint get <id>
```

沒有對應 Pod 名稱的列（例如 host 與 health endpoint）不是要畫的 Pod，略過即可。

**步驟 3：需要時再查的項目**

| 要取得的資料 | 指令（在 cilium Pod 內執行） |
|---|---|
| Service 與後端（畫 Service 負載平衡時） | `cilium-dbg service list` |
| BPF 中實際的負載平衡表 | `cilium-dbg bpf lb list` |
| agent 狀態與目前設定（確認 datapath 模式） | `cilium-dbg status`、`cilium-dbg config` |
| 不進 agent、從叢集層看 endpoint | `kubectl get cep -A` |

**指令名稱**：`cilium-dbg` 是 agent 內的除錯 CLI。較舊的版本沒有這個名稱，出現 command not found 時把 `cilium-dbg` 換成 `cilium` 再試。

### 其他 CNI

在節點上用 `ip -br link` 看 veth，再以 Pod 內 `eth0` 的 peer index 對應主機端網卡。查不出來就留空，不要猜名稱。

## 3. 詢問使用者

沒有輸出也連不到叢集時，問這幾件事：

- 要畫幾個節點？
- 每個節點的上行介面名稱、IP，以及是否為 bond（成員網卡是哪些）？
- 要畫哪些 Pod（名稱、IP、所在節點）？
- 要標示哪一條封包路徑，從哪到哪？
- 每個步驟的標註文字？

## 查不到時

留空並記下來，交付時列給使用者。不要用看起來合理的值補上。
