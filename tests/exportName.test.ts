import assert from "node:assert/strict";
import test from "node:test";
import { contentDisposition, coverSubtitle, downloadName, REPORT_LABEL, shortTopic } from "../lib/exportName";
import { answerTitle, asciiToMermaid, nearestUserPrompt, parseMessage, plainTopic, shareRecordTitle, topicFrom } from "../lib/messageDocument";
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
  assert.equal(coverSubtitle("Feed pump installation", "en"), REPORT_LABEL.en);
  assert.equal(coverSubtitle("", "ar"), REPORT_LABEL.ar);
  assert.equal(coverSubtitle("Engineering report", "en"), REPORT_LABEL.en);
  assert.equal(coverSubtitle("تقرير هندسي", "ar"), REPORT_LABEL.ar);
  assert.equal(shortTopic("Engineering report", REPORT_LABEL.en), REPORT_LABEL.en);
  assert.equal(REPORT_LABEL.en, "Report · Engineered with engineer it");
  assert.equal(REPORT_LABEL.ar, "تقرير · بإعداد engineer it");
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
  assert.match(html, /<h3[\s>]/);
  assert.match(html, /<h4[\s>]/);
  assert.match(html, /<strong>/);
  assert.match(html, /<ul[\s>]/);
  assert.match(html, /<svg/);
  assert.match(html, /engineerit\.ai/);
  assert.match(html, /KSA/);
  assert.doesNotMatch(html, /<pre>[^<]*###/);
  assert.doesNotMatch(html, /Ammonia Plant\s+\|/);
  assert.equal(html.includes("```"), false);
});

test("each answer is titled from its own heading, then its question, then the chat", () => {
  const water = "## **Water distribution network**\n\nGIS and AutoCAD share one model.\n\n```mermaid\nflowchart LR\nA-->B\n```";
  assert.equal(
    answerTitle({ markdown: water, prompt: "Explain GIS for water", chatTitle: "Factory roadmap" }),
    "Water distribution network"
  );
  assert.equal(
    answerTitle({
      markdown: "### Only a small heading\n\nNo section title here.",
      prompt: "How do I **size** a feed pump for the boiler house?",
      chatTitle: "Factory roadmap",
    }),
    "How do I size a feed pump for the boiler house?"
  );
  assert.equal(
    answerTitle({ markdown: "A short note with no heading.", chatTitle: "Factory roadmap" }),
    "Factory roadmap"
  );
  assert.equal(
    answerTitle({ markdown: "A short note.", chatTitle: "New chat", locale: "en" }),
    "Report · Engineered with engineer it"
  );
  const long = `## ${"North water main ".repeat(8)}`;
  const clipped = answerTitle({ markdown: long, chatTitle: "Factory roadmap" });
  assert.ok(clipped.length <= 70);
  assert.equal(clipped.endsWith(" "), false);
  assert.match(clipped, /North water main/);
  assert.equal(clipped.includes("Factory"), false);
  const arabic = "## شبكات توزيع المياه\n\nتستخدم نظم المعلومات الجغرافية مع أوتوكاد.";
  assert.equal(answerTitle({ markdown: arabic, chatTitle: "Factory roadmap", locale: "en" }), "شبكات توزيع المياه");
  const messages = [
    { role: "user", content: "Create a factory roadmap" },
    { role: "assistant", content: "## Factory roadmap" },
    { role: "user", content: "Now explain the water network" },
    { role: "assistant", content: water },
  ];
  assert.equal(nearestUserPrompt(messages, 3), "Now explain the water network");
  assert.equal(nearestUserPrompt(messages, 1), "Create a factory roadmap");
  assert.equal(shareRecordTitle("Water distribution network", water, "en"), "Water distribution network");
  assert.equal(shareRecordTitle("New chat", water, "en"), "Water distribution network");
  const shared = toWhatsApp(water, "https://engineerit.ai/share/water");
  assert.match(shared, /\*Water distribution network\*/);
  assert.match(shared, /https:\/\/engineerit\.ai\/share\/water/);
  assert.match(shared, /may contain errors/);
});

test("request verbs drop out of titles and noun headings stay as written", () => {
  assert.equal(plainTopic("Create Turnaround package for CDU plant"), "Turnaround Package for CDU Plant");
  assert.equal(plainTopic("please create a turnaround package for the CDU plant"), "Turnaround Package for the CDU Plant");
  assert.equal(plainTopic("Can you prepare the isolation plan?"), "Isolation Plan");
  assert.equal(plainTopic("Could you give me a pump datasheet"), "Pump Datasheet");
  assert.equal(plainTopic("I need the feed pump curve"), "Feed Pump Curve");
  assert.equal(plainTopic("Help me calculate the nozzle load"), "Nozzle Load");
  assert.equal(plainTopic("Water distribution network"), "Water distribution network");
  assert.equal(plainTopic("Factory roadmap"), "Factory roadmap");
  assert.equal(plainTopic("The water distribution network"), "The water distribution network");
  assert.equal(plainTopic("How do I size a feed pump for the boiler house?"), "How do I size a feed pump for the boiler house?");
  const long = plainTopic(`Create ${"north water main ".repeat(8)}`);
  assert.ok(long.length <= 60);
  assert.match(long, /North Water Main/);
  assert.equal(plainTopic("اعمل حصر الكميات للوحدة", "ar"), "حصر الكميات للوحدة");
  assert.equal(plainTopic("أنشئ جدول الإيقاف الشامل", "ar"), "جدول الإيقاف الشامل");
  assert.equal(plainTopic("انشئ مخطط التدفق", "ar"), "مخطط التدفق");
  assert.equal(plainTopic("من فضلك اكتب تقرير الفحص", "ar"), "تقرير الفحص");
  assert.equal(plainTopic("لو سمحت جهز خطة العزل", "ar"), "خطة العزل");
  assert.equal(plainTopic("أريد أعد دراسة المضخة", "ar"), "دراسة المضخة");
  assert.equal(plainTopic("ممكن اشرح شبكة المياه", "ar"), "شبكة المياه");
  assert.equal(plainTopic("احسب حمل الفوهة", "ar"), "حمل الفوهة");
  assert.equal(plainTopic("شبكات توزيع المياه", "ar"), "شبكات توزيع المياه");
  assert.equal(
    answerTitle({ markdown: "No heading here.", prompt: "Create Turnaround package for CDU plant", chatTitle: "New chat" }),
    "Turnaround Package for CDU Plant"
  );
  assert.equal(shareRecordTitle("Create Turnaround package for CDU plant", "No heading here.", "en"), "Turnaround Package for CDU Plant");
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
