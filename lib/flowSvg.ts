/** A left-to-right flowchart. Each rank is a column; siblings stack in that column. */

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function labelLines(label: string, maxChars: number): string[] {
  const chars = [...label];
  if (chars.length <= maxChars) return [label];
  const words = label.split(/\s+/).filter(Boolean);
  if (words.length < 2) {
    const mid = Math.ceil(chars.length / 2);
    return [chars.slice(0, mid).join(""), `${chars.slice(mid, mid + maxChars - 1).join("")}…`];
  }
  let first = "";
  let index = 0;
  while (index < words.length - 1 && [...`${first} ${words[index]}`.trim()].length <= maxChars) {
    first = `${first} ${words[index]}`.trim();
    index += 1;
  }
  if (!first) {
    first = words[0];
    index = 1;
  }
  let second = words.slice(index).join(" ");
  if ([...second].length > maxChars) second = `${[...second].slice(0, maxChars - 1).join("")}…`;
  return [first, second];
}

export function flowSvg(source: string, dir: "ltr" | "rtl"): string | null {
  const nodes = new Map<string, string>();
  const edges: [string, string][] = [];
  const nodeRe = /(\w+)\s*\[\s*(?:"([^"]+)"|([^\]]+))\s*\]/g;
  const edgeRe = /(\w+)\s*-->+\s*(\w+)/g;
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line || /^flowchart\b/i.test(line)) continue;
    for (const match of line.matchAll(nodeRe)) nodes.set(match[1], (match[2] || match[3] || match[1]).replace(/<br\s*\/?>/gi, " ").trim());
    for (const match of line.matchAll(edgeRe)) edges.push([match[1], match[2]]);
  }
  if (nodes.size < 1) return null;
  for (const [from, to] of edges) {
    if (!nodes.has(from)) nodes.set(from, from);
    if (!nodes.has(to)) nodes.set(to, to);
  }

  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  for (const [from, to] of edges) {
    const next = children.get(from) || [];
    if (!next.includes(to)) next.push(to);
    children.set(from, next);
    const prev = parents.get(to) || [];
    if (!prev.includes(from)) prev.push(from);
    parents.set(to, prev);
  }

  const color = new Map<string, number>();
  const forward = new Map<string, string[]>();
  const back: [string, string][] = [];
  const visit = (id: string) => {
    color.set(id, 1);
    for (const to of children.get(id) || []) {
      const state = color.get(to) || 0;
      if (state === 1) {
        back.push([id, to]);
        continue;
      }
      const list = forward.get(id) || [];
      if (!list.includes(to)) list.push(to);
      forward.set(id, list);
      if (state === 0) visit(to);
    }
    color.set(id, 2);
  };
  for (const id of nodes.keys()) if (!color.get(id)) visit(id);

  const rank = new Map<string, number>();
  const ranking = new Set<string>();
  const depth = (id: string): number => {
    const known = rank.get(id);
    if (known != null) return known;
    if (ranking.has(id)) return 0;
    ranking.add(id);
    let best = 0;
    for (const parent of parents.get(id) || []) {
      if (!forward.get(parent)?.includes(id)) continue;
      best = Math.max(best, depth(parent) + 1);
    }
    ranking.delete(id);
    rank.set(id, best);
    return best;
  };
  for (const id of nodes.keys()) depth(id);

  const byRank = new Map<number, string[]>();
  for (const id of nodes.keys()) {
    const row = rank.get(id) || 0;
    const list = byRank.get(row) || [];
    list.push(id);
    byRank.set(row, list);
  }
  const columns = [...byRank.keys()].sort((a, b) => a - b).map((row) => byRank.get(row) || []);
  const colCount = Math.max(1, columns.length);
  const maxRows = Math.max(1, ...columns.map((column) => column.length));
  const gapX = 40;
  const gapY = 12;
  const pad = 16;
  const boxW = 156;
  const boxH = 52;
  const width = pad * 2 + colCount * boxW + Math.max(0, colCount - 1) * gapX;
  const contentH = maxRows * boxH + Math.max(0, maxRows - 1) * gapY;
  const height = pad * 2 + contentH;
  const rtl = dir === "rtl" || /flowchart\s+RL/i.test(source);
  const boxes = new Map<string, { x: number; y: number; label: string }>();
  columns.forEach((ids, colIndex) => {
    const visualCol = rtl ? colCount - 1 - colIndex : colIndex;
    const colH = ids.length * boxH + Math.max(0, ids.length - 1) * gapY;
    const originY = pad + (contentH - colH) / 2;
    ids.forEach((id, rowIndex) => {
      boxes.set(id, {
        x: pad + visualCol * (boxW + gapX),
        y: originY + rowIndex * (boxH + gapY),
        label: nodes.get(id) || id,
      });
    });
  });

  const arrow = (from: string, to: string, dashed = false) => {
    const a = boxes.get(from);
    const b = boxes.get(to);
    if (!a || !b) return "";
    const forward = rtl ? -1 : 1;
    const x1 = forward > 0 ? a.x + boxW : a.x;
    const y1 = a.y + boxH / 2;
    const x2 = forward > 0 ? b.x : b.x + boxW;
    const y2 = b.y + boxH / 2;
    const tip = x2 - forward * 2;
    const dash = dashed ? ' stroke-dasharray="4 3"' : "";
    if (Math.abs(y1 - y2) < 2) {
      return `<line data-edge="${from}-${to}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${tip.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#1a56ff" stroke-width="2"${dash} marker-end="url(#arrow)"/>`;
    }
    const mid = (x1 + tip) / 2;
    return `<path data-edge="${from}-${to}" d="M ${x1.toFixed(1)} ${y1.toFixed(1)} H ${mid.toFixed(1)} V ${y2.toFixed(1)} H ${tip.toFixed(1)}" fill="none" stroke="#1a56ff" stroke-width="2"${dash} marker-end="url(#arrow)"/>`;
  };

  const arrows = [
    ...[...forward.entries()].flatMap(([from, tos]) => tos.map((to) => arrow(from, to))),
    ...back.map(([from, to]) => arrow(from, to, true)),
  ].join("");
  const maxChars = Math.max(8, Math.floor((boxW - 16) / 7));
  const shapes = [...boxes.entries()].map(([id, box]) => {
    const lines = labelLines(box.label, maxChars);
    const text = lines.map((line, index) => `<tspan x="${(box.x + boxW / 2).toFixed(1)}" dy="${index === 0 ? 0 : 15}">${escapeXml(line)}</tspan>`).join("");
    const textY = box.y + (lines.length === 1 ? 32 : 24);
    return `<rect data-node="${id}" x="${box.x.toFixed(1)}" y="${box.y.toFixed(1)}" width="${boxW}" height="${boxH}" rx="12" fill="#e7eeff" stroke="#1a56ff" stroke-width="1.5"/>
<text x="${(box.x + boxW / 2).toFixed(1)}" y="${textY}" text-anchor="middle" font-size="13" font-family="${dir === "rtl" ? "Noto Sans Arabic" : "Inter, 'Noto Sans Arabic', 'Segoe UI', sans-serif"}" fill="#0f172a"${dir === "rtl" ? ' direction="rtl"' : ""}>${text}</text>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" width="${width}" height="${height}" data-font="13" data-nodes="${nodes.size}" style="display:block;width:${width}px;max-width:none;height:${height}px">
<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#1a56ff"/></marker></defs>
${arrows}${shapes}
</svg>`;
}

