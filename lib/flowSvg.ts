/** A small brand flowchart for linear mermaid graphs inside a static HTML file. */
export function flowSvg(source: string, dir: "ltr" | "rtl"): string | null {
  const nodes = new Map<string, string>();
  const edges: [string, string][] = [];
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line || /^flowchart\b/i.test(line)) continue;
    const node = /(\w+)\s*\[\s*(?:"([^"]+)"|([^\]]+))\s*\]/.exec(line);
    if (node) nodes.set(node[1], (node[2] || node[3] || node[1]).replace(/<br\s*\/?>/gi, " ").trim());
    const edge = /(\w+)\s*-->+\s*(\w+)/.exec(line);
    if (edge) edges.push([edge[1], edge[2]]);
  }
  if (nodes.size < 1) return null;
  const order: string[] = [];
  const seen = new Set<string>();
  const push = (id: string) => {
    if (seen.has(id) || !nodes.has(id)) return;
    seen.add(id);
    order.push(id);
  };
  for (const [from, to] of edges) {
    push(from);
    push(to);
  }
  for (const id of nodes.keys()) push(id);
  const vertical = !/flowchart\s+(LR|RL)/i.test(source);
  const rtl = dir === "rtl" || /flowchart\s+RL/i.test(source);
  const boxW = 280;
  const boxH = 54;
  const gap = 36;
  const width = vertical ? 360 : order.length * (boxW + gap) + 40;
  const height = vertical ? order.length * (boxH + gap) + 24 : 120;
  const boxes = order.map((id, index) => {
    const x = vertical ? (width - boxW) / 2 : (rtl ? order.length - 1 - index : index) * (boxW + gap) + 20;
    const y = vertical ? 16 + index * (boxH + gap) : 28;
    const label = nodes.get(id) || id;
    return { id, x, y, label };
  });
  const byId = new Map(boxes.map((box) => [box.id, box]));
  const arrows = edges
    .map(([from, to]) => {
      const a = byId.get(from);
      const b = byId.get(to);
      if (!a || !b) return "";
      if (vertical) {
        const x = a.x + boxW / 2;
        return `<line x1="${x}" y1="${a.y + boxH}" x2="${x}" y2="${b.y - 8}" stroke="#1a56ff" stroke-width="2" marker-end="url(#arrow)"/>`;
      }
      const y = a.y + boxH / 2;
      const x1 = a.x < b.x ? a.x + boxW : a.x;
      const x2 = a.x < b.x ? b.x : b.x + boxW;
      return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#1a56ff" stroke-width="2" marker-end="url(#arrow)"/>`;
    })
    .join("");
  const shapes = boxes
    .map((box) => {
      const text = box.label.length > 42 ? `${box.label.slice(0, 41)}…` : box.label;
      return `<rect x="${box.x}" y="${box.y}" width="${boxW}" height="${boxH}" rx="12" fill="#e7eeff" stroke="#1a56ff" stroke-width="1.5"/>
<text x="${box.x + boxW / 2}" y="${box.y + 32}" text-anchor="middle" font-size="14" font-family="${dir === "rtl" ? "Noto Sans Arabic" : "Inter, 'Noto Sans Arabic', 'Segoe UI', sans-serif"}" fill="#0f172a"${dir === "rtl" ? ' direction="rtl"' : ""}>${escapeXml(text)}</text>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" width="100%">
<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#1a56ff"/></marker></defs>
${arrows}${shapes}
</svg>`;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
