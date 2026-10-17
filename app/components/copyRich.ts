"use client";

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function svgElementToPng(svg: SVGSVGElement, scale = 3.125): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("svg"));
      img.src = url;
    });
    const width = svg.viewBox.baseVal.width || svg.clientWidth || 800;
    const height = svg.viewBox.baseVal.height || svg.clientHeight || 400;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function paintExportStyles(root: HTMLElement, dir: string) {
  root.setAttribute("dir", dir);
  root.style.fontFamily = dir === "rtl" ? "Arial, sans-serif" : "Calibri, sans-serif";
  root.style.color = "#0f172a";
  root.querySelectorAll("h1,h2,h3").forEach((node) => {
    const el = node as HTMLElement;
    el.style.color = "#1a56ff";
    el.style.fontWeight = "700";
    el.style.direction = dir;
  });
  root.querySelectorAll("ul,ol").forEach((node) => {
    const el = node as HTMLElement;
    el.style.direction = dir;
    el.style.paddingInlineStart = "1.2em";
  });
  root.querySelectorAll("table").forEach((table) => {
    table.setAttribute("dir", dir);
    table.style.borderCollapse = "collapse";
    table.style.width = "100%";
    table.querySelectorAll("th,td").forEach((cell) => {
      const el = cell as HTMLElement;
      el.style.border = "1px solid #d0d7e2";
      el.style.padding = "6px 8px";
      el.style.textAlign = dir === "rtl" ? "right" : "left";
      el.style.direction = dir;
    });
    table.querySelectorAll("th").forEach((cell) => {
      const el = cell as HTMLElement;
      el.style.background = "#e7eeff";
      el.style.fontWeight = "700";
    });
  });
  root.querySelectorAll("img").forEach((img) => {
    img.style.maxWidth = "100%";
    img.style.height = "auto";
  });
}

export async function clipboardPayload(root: HTMLElement, plain: string): Promise<{ html: string; text: string }> {
  const dir = root.getAttribute("dir") || "ltr";
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("button, .chat-table-tools, .diagram-tools, .chat-table-pin, .chat-table-fade").forEach((node) => node.remove());
  const live = [...root.querySelectorAll("svg")];
  const copied = [...clone.querySelectorAll("svg")];
  for (let i = 0; i < live.length; i++) {
    try {
      const png = await svgElementToPng(live[i] as SVGSVGElement, 1.25);
      const img = document.createElement("img");
      img.src = png;
      img.alt = live[i].closest("figure")?.querySelector("figcaption")?.textContent || "chart";
      copied[i]?.replaceWith(img);
    } catch {
      copied[i]?.remove();
    }
  }
  paintExportStyles(clone, dir);
  const html = `<!DOCTYPE html><html><body><!--StartFragment--><div dir="${dir}">${clone.innerHTML}</div><!--EndFragment--></body></html>`;
  const text = plain.trim() || clone.innerText.trim();
  return { html, text };
}

export async function copyRichElement(root: HTMLElement, plain: string): Promise<boolean> {
  try {
    const payload = await clipboardPayload(root, plain);
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([payload.html], { type: "text/html" }),
          "text/plain": new Blob([payload.text], { type: "text/plain" }),
        }),
      ]);
      return true;
    }
    await navigator.clipboard.writeText(payload.text);
    return true;
  } catch {
    return false;
  }
}

export async function collectDiagramPngs(root: HTMLElement): Promise<{ index: number; pngBase64: string }[]> {
  const nodes = [...root.querySelectorAll<HTMLElement>("[data-diagram-index]")];
  const images: { index: number; pngBase64: string }[] = [];
  for (const node of nodes) {
    const svg = node.querySelector("svg");
    if (!svg) continue;
    try {
      const png = await svgElementToPng(svg, 3.125);
      const base64 = png.split(",")[1];
      if (base64) images.push({ index: Number(node.dataset.diagramIndex), pngBase64: base64 });
    } catch {
      /* the server still draws schedules it can parse */
    }
  }
  return images;
}

export function downloadTextFile(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadSvgPng(svg: SVGSVGElement, filename: string) {
  const png = await svgElementToPng(svg, 3.125);
  const link = document.createElement("a");
  link.href = png;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function tableMatrix(table: HTMLTableElement): { headers: string[]; rows: string[][] } {
  const headers = [...table.querySelectorAll("thead th")].map((cell) => cell.textContent?.trim() || "");
  const rows = [...table.querySelectorAll("tbody tr")].map((row) =>
    [...row.querySelectorAll("td")].map((cell) => cell.textContent?.trim() || "")
  );
  return { headers, rows };
}

export async function copyTable(headers: string[], rows: string[][], dir: "ltr" | "rtl"): Promise<boolean> {
  const tsv = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join("\n");
  const html = `<table dir="${esc(dir)}"><thead><tr>${headers.map((cell) => `<th>${esc(cell)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([tsv], { type: "text/plain" }),
      }),
    ]);
    return true;
  } catch {
    try {
      await navigator.clipboard.writeText(tsv);
      return true;
    } catch {
      return false;
    }
  }
}
