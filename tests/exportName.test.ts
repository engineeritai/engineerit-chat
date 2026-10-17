import assert from "node:assert/strict";
import test from "node:test";
import { contentDisposition, coverSubtitle, downloadName, shortTopic } from "../lib/exportName";
import { asciiToMermaid, parseMessage, topicFrom } from "../lib/messageDocument";
import { buildShareHtml } from "../lib/shareDocument";
import { toWhatsApp } from "../lib/whatsappText";

const urea = `The production of technical grade urea by SABIC involves several key processes.

### Simplified Urea Production Process Diagram

\`\`\`plaintext
+------------------+
|  Ammonia Plant   |
| (Hydrogen & N2)  |
+------------------+
          |
          v
+------------------+
|    Urea Reactor  |
| (CO2 + Ammonia)  |
+------------------+
          |
          v
+------------------+
|  Finished Urea   |
|    Storage       |
+------------------+
\`\`\`

### Workflow Description

#### 1. **Ammonia Production**
- **Hydrogen and Nitrogen Generation:**
  - Ammonia is produced using the Haber process.
  - Natural gas is processed in the steam reforming unit.

### Conclusion
This simplified workflow illustrates the essential process.`;

test("short topic drops the subtitle and stays within a few words", () => {
  assert.equal(shortTopic("Technical Grade Urea Production – SABIC Process Workflow"), "Technical Grade Urea Production");
  assert.equal(shortTopic("Technical Grade Urea Production Process Workflow"), "Technical Grade Urea Production");
  assert.equal(shortTopic("Technical Grade Urea Production (SABIC)"), "Technical Grade Urea Production");
  assert.equal(shortTopic("technical grade urea production"), "Technical Grade Urea Production");
  assert.equal(shortTopic("Simplified Urea Production Process Diagram"), "Urea Production");
  assert.equal(shortTopic("إنتاج اليوريا الفنية – سابك"), "إنتاج اليوريا الفنية");
  assert.equal(coverSubtitle("Technical Grade Urea Production – SABIC Process Workflow", "en"), "SABIC Process Workflow");
  assert.equal(coverSubtitle("Technical Grade Urea Production (SABIC)", "en"), "SABIC");
  const name = downloadName("Technical Grade Urea Production – SABIC Process Workflow", "pdf");
  assert.equal(name, "Technical Grade Urea Production.pdf");
  assert.equal(downloadName("Technical Grade Urea Production", "html"), "Technical Grade Urea Production.html");
  assert.equal(name.includes("engineerit"), false);
  assert.equal(/\d{4}-\d{2}-\d{2}/.test(name), false);
  const arabic = downloadName("إنتاج اليوريا الفنية", "docx");
  assert.equal(arabic, "إنتاج اليوريا الفنية.docx");
  assert.match(contentDisposition("إنتاج اليوريا الفنية", "pdf"), /filename\*=UTF-8''/);
  assert.ok(downloadName("x".repeat(200), "pdf").length <= 84);
});

test("html export renders the urea note instead of a markdown dump", () => {
  const title = topicFrom(urea, "Technical Grade Urea Production – SABIC Process Workflow", "en", "Explain technical grade urea production at SABIC");
  assert.equal(title, "Technical Grade Urea Production");
  const mermaid = asciiToMermaid(urea.match(/```plaintext\n([\s\S]*?)```/)?.[1] || "", "ltr");
  assert.match(mermaid || "", /Ammonia Plant/);
  assert.match(mermaid || "", /-->/);
  const blocks = parseMessage(urea);
  assert.equal(blocks.some((block) => block.type === "code"), false);
  assert.ok(blocks.some((block) => block.type === "diagram"));
  const list = blocks.find((block) => block.type === "list");
  assert.ok(list && list.type === "list" && list.items[0].children.length > 0);
  const html = buildShareHtml({ title, markdown: urea, locale: "en", now: new Date("2026-10-16T23:34:00Z") });
  assert.match(html, /<title>Technical Grade Urea Production<\/title>/);
  assert.match(html, /<h3>/);
  assert.match(html, /<h4>/);
  assert.match(html, /<strong>/);
  assert.match(html, /<ul>/);
  assert.match(html, /<svg/);
  assert.match(html, /engineerit\.ai/);
  assert.match(html, /KSA/);
  assert.doesNotMatch(html, /<pre>[^<]*###/);
  assert.doesNotMatch(html, /Ammonia Plant\s+\|/);
  assert.equal(html.includes("```"), false);
});

test("whatsapp share drops markdown fences and keeps the link", () => {
  const text = toWhatsApp(urea, "https://engineerit.ai/share/urea");
  assert.match(text, /\*Simplified Urea Production Process Diagram\*/);
  assert.match(text, /• Ammonia is produced using the Haber process\./);
  assert.match(text, /Ammonia Plant \(Hydrogen & N2\) → Urea Reactor \(CO2 \+ Ammonia\) → Finished Urea Storage/);
  assert.match(text, /https:\/\/engineerit\.ai\/share\/urea/);
  assert.equal(text.includes("###"), false);
  assert.equal(text.includes("```"), false);
  assert.equal(text.includes("**"), false);
});
