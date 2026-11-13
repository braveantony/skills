"""Example generator: One Light diagram, step numbers on the drawing, step text in a right-hand panel.

Usage: python3 example_gen.py raw.svg
Then:  node scripts/chips.mjs raw.svg final.svg   (grey chips behind volatile values)
       node scripts/svg2png.mjs final.svg final.png

Every value below is an EXAMPLE from one cluster. Replace them all from your spec.yaml;
also move the coordinates in the SVG template when the nodes/components differ.
"""
import sys
from pathlib import Path

OUT_FILE = Path(sys.argv[1] if len(sys.argv) > 1 else "raw.svg")
C = dict(bg="#fafafa", panel="#f0f0f1", surface="#e5e5e6", text="#383a42", strong="#232324",
         muted="#a0a1a7", line="#696c77", p="#a626a4", g="#50a14f", gt="#3f8f3e")
W, H = 1440, 720

STEPS = [  # (n, conn, line1, line2) — text verbatim from spec.yaml
    (1, "p", "curl http://172.22.0.201/events", "172.22.0.254:45123 → 172.22.0.201:80"),
    (2, "p", "誰有 172.22.0.201？", "control-plane-2 回 ARP（L2 宣告）"),
    (3, "p", "eBPF 把封包直接交給 Envoy", "（目的地址不改，lo 上抓不到）"),
    (4, "p", "連線 ① 在這裡結束", "閒置 300 秒切斷、入口紀錄都在這裡"),
    (5, "g", "Envoy 另開連線 ②", "10.244.1.237:38767 → 10.244.4.230:8080"),
    (6, "g", "路由 10.244.4.0/24 via 172.22.0.5", "eBPF 直接送進 Pod（不經 lxc）"),
    (7, "g", "App 在 8080 收到", "看到的來源是 Envoy，不是瀏覽器"),
]
# marker positions on the drawing
MARK = {1: (110, 498), 2: (560, 604), 3: (276, 372), 4: (226, 215),
        5: (406, 300), 6: (862, 422), 7: (648, 140)}


def marker(n, k, x, y):
    return (f'<circle class="nc {k}r" cx="{x}" cy="{y}" r="14"/>'
            f'<text x="{x}" y="{y}" class="num {k}n">{n}</text>')


style = f"""
text {{ font-family: Calibri, Carlito, "Segoe UI", Arial, "Noto Sans CJK TC", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif; fill: {C['text']}; }}
.frame {{ fill: none; stroke: {C['line']}; stroke-width: 2; }}
.box {{ fill: {C['panel']}; stroke: {C['line']}; stroke-width: 1.5; }}
.env {{ fill: {C['panel']}; stroke: {C['strong']}; stroke-width: 2; }}
.ln {{ fill: none; stroke: {C['line']}; stroke-width: 1.5; }}
.ttl {{ font-size: 22px; font-weight: 700; fill: {C['strong']}; dominant-baseline: central; }}
.nn {{ font-size: 20px; font-weight: 700; fill: {C['strong']}; dominant-baseline: central; }}
.lbl {{ font-size: 20px; text-anchor: middle; dominant-baseline: central; fill: {C['strong']}; }}
.sm {{ font-size: 18px; text-anchor: middle; dominant-baseline: central; }}
.tag {{ font-size: 15px; text-anchor: middle; dominant-baseline: central; }}
.xip {{ font-size: 17px; dominant-baseline: central; }}
.ip {{ font-size: 20px; font-weight: 700; dominant-baseline: central; fill: {C['strong']}; }}
.num {{ font-size: 16px; font-weight: 700; text-anchor: middle; dominant-baseline: central; }}
.nc {{ fill: #ffffff; stroke-width: 2.5; }}
.pr {{ stroke: {C['p']}; }} .gr {{ stroke: {C['g']}; }}
.pn {{ fill: {C['p']}; }} .gn {{ fill: {C['gt']}; }}
.pp {{ fill: none; stroke: {C['p']}; stroke-width: 3; stroke-dasharray: 8 6; }}
.gp {{ fill: none; stroke: {C['g']}; stroke-width: 3; stroke-dasharray: 8 6; }}
.off {{ fill: none; stroke: {C['muted']}; stroke-width: 1.5; stroke-dasharray: 5 4; }}
.mt {{ fill: #8a8b92; }}
.br {{ fill: {C['surface']}; stroke: {C['line']}; stroke-width: 1.5; }}
.side {{ fill: #ffffff; stroke: #d4d4d8; stroke-width: 1; }}
.sh {{ font-size: 18px; font-weight: 700; fill: {C['strong']}; dominant-baseline: central; }}
.lg {{ font-size: 15px; dominant-baseline: central; }}
.s1 {{ font-size: 17px; font-weight: 700; fill: {C['strong']}; dominant-baseline: central; }}
.s2 {{ font-size: 16px; fill: #50525c; dominant-baseline: central; }}
.sep {{ stroke: #e2e2e5; stroke-width: 1; }}
.chip {{ fill: #e1e1e5; }}
.fn {{ font-size: 15px; fill: #50525c; dominant-baseline: central; }}
"""

s = [f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-labelledby="t d">
<title id="t">看板連線怎麼走：主機 → 入口（Envoy）→ koupa Pod</title>
<desc id="d">主機的瀏覽器經 podman2 bridge 連到 tkha-control-plane-2 上的 cilium-envoy（連線 ①）；Envoy 另開連線 ② 經同一座 bridge 到 tkha-worker-2 上的 koupa Pod，不經過 lxc 網卡。右側依序列出步驟 1 到 7。</desc>
<defs><style>{style}</style>
<marker id="ap" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="{C['p']}"/></marker>
<marker id="ag" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="{C['g']}"/></marker>
</defs>
<rect width="{W}" height="{H}" fill="{C['bg']}"/>
<text x="20" y="28" class="ttl">看板連線怎麼走：主機 → 入口（Envoy）→ koupa Pod</text>

<!-- node frames -->
<rect class="frame" x="20" y="52" width="430" height="418"/>
<rect class="frame" x="480" y="52" width="420" height="418"/>
<text x="36" y="78" class="nn">tkha-control-plane-2</text>
<text x="496" y="78" class="nn">tkha-worker-2</text>
<text x="36" y="108" class="xip">172.22.0.201（Gateway IP，L2 宣告）</text>
<text x="36" y="134" class="xip">10.244.1.237（ingress IP）</text>

<!-- bridge + attachments -->
<line class="ln" x1="340" y1="444" x2="340" y2="540"/>
<line class="ln" x1="760" y1="444" x2="760" y2="540"/>
<rect class="br" x="230" y="540" width="670" height="40" rx="6"/>
<text x="565" y="560" class="sm" style="fill:{C['strong']}">podman2 bridge 172.22.0.0/24（主機 172.22.0.254）</text>

<!-- client -->
<rect class="box" x="20" y="520" width="180" height="80"/>
<text x="110" y="546" class="lbl" style="font-size:18px">主機的瀏覽器／curl</text>
<text x="110" y="576" class="tag">172.22.0.254 · podman2</text>

<!-- control-plane-2 -->
<rect class="env" x="250" y="180" width="180" height="70"/>
<text x="340" y="203" class="lbl">cilium-envoy</text>
<text x="340" y="230" class="tag">hostNetwork · pid 564</text>
<rect class="box" x="260" y="400" width="160" height="44"/>
<text x="340" y="422" class="lbl">eth0</text>
<text x="250" y="422" class="ip" text-anchor="end">172.22.0.2</text>

<!-- worker-2 -->
<rect class="box" x="670" y="90" width="210" height="104"/>
<text x="775" y="108" class="sm" style="font-size:17px">koupa-7f64658cd-tb9wt</text>
<rect class="box" x="700" y="124" width="150" height="60" style="fill:#ffffff"/>
<text x="775" y="143" class="sm">10.244.4.230</text>
<text x="775" y="166" class="sm">eth0</text>
<line class="ln" x1="830" y1="194" x2="830" y2="250"/>
<rect class="off" x="754" y="250" width="142" height="46"/>
<text x="830" y="273" class="tag mt">lxcc16555cb6fee</text>
<text x="830" y="314" class="tag mt">連線 ② 不經過</text>
<rect class="box" x="680" y="400" width="160" height="44"/>
<text x="760" y="422" class="lbl">eth0</text>
<text x="670" y="422" class="ip" text-anchor="end">172.22.0.5</text>

<!-- connection 1 (purple) -->
<path class="pp" d="M200 560 H223" marker-end="url(#ap)"/>
<path class="pp" d="M300 540 V451" marker-end="url(#ap)"/>
<path class="pp" d="M300 400 V257" marker-end="url(#ap)"/>
<!-- connection 2 (green) -->
<path class="gp" d="M380 250 V393" marker-end="url(#ag)"/>
<path class="gp" d="M380 444 V505 H720 V451" marker-end="url(#ag)"/>
<path class="gp" d="M720 400 V201" marker-end="url(#ag)"/>
''']

for n, k, *_ in STEPS:
    s.append(marker(n, k, *MARK[n]))

# right-hand step panel (layout.md "步驟欄")
px, py, pw, ph = 930, 52, 490, 648
s.append(f'<rect class="side" x="{px}" y="{py}" width="{pw}" height="{ph}" rx="8"/>')
s.append(f'<text x="{px + 24}" y="{py + 28}" class="sh">步驟</text>')
s.append(f'<path class="pp" d="M{px + 110} {py + 28} H{px + 146}"/><text x="{px + 154}" y="{py + 28}" class="lg">連線 ①：瀏覽器 ↔ Envoy</text>')
s.append(f'<path class="gp" d="M{px + 110} {py + 54} H{px + 146}"/><text x="{px + 154}" y="{py + 54}" class="lg">連線 ②：Envoy ↔ Pod</text>')
y0, step = py + 86, 70
for i, (n, k, l1, l2) in enumerate(STEPS):
    y = y0 + i * step
    s.append(f'<line class="sep" x1="{px + 16}" y1="{y - 12}" x2="{px + pw - 16}" y2="{y - 12}"/>')
    s.append(marker(n, k, px + 38, y + 18))
    s.append(f'<text x="{px + 66}" y="{y + 18}" class="s1">{l1}</text>')
    s.append(f'<text x="{px + 66}" y="{y + 44}" class="s2">{l2}</text>')

s.append(f'<line class="sep" x1="{px + 16}" y1="{py + ph - 70}" x2="{px + pw - 16}" y2="{py + ph - 70}"/>')
s.append(f'<text x="{px + 24}" y="{py + ph - 48}" class="fn"><tspan class="v">灰底</tspan>\u2009的值會變動：重啟、重建或每條新連線都不同</text>')
s.append(f'<text x="{px + 24}" y="{py + ph - 24}" class="fn">圖中是 2026-11-12 tkha 實測，請以自己查到的為準</text>')
s.append("</svg>\n")
import re
VOL = ["564", "koupa-7f64658cd-tb9wt", "10.244.4.230", "10.244.1.237", "lxcc16555cb6fee", "45123", "38767"]
def mark(m):
    head, body = m.group(1), m.group(2)
    if 'class="s1"' in head or 'class="s2"' in head:  # step list: no chips
        return m.group(0)
    for v in VOL:
        body = body.replace(v, f'\u2009<tspan class="v">{v}</tspan>\u2009')
    return head + body + "</text>"
svg = re.sub(r'(<text\b[^>]*>)(.*?)</text>', mark, "\n".join(s))
OUT_FILE.write_text(svg, encoding="utf-8")
print("wrote", OUT_FILE)
