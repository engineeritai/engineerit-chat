import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import JSZip from "jszip";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// تحويل XML إلى نص عادي بسيط
function xmlToPlain(xml: string): string {
  return xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// استخراج نص من ملفات Office: DOCX / PPTX / XLSX
async function extractOfficeText(buffer: Buffer, filename: string): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const lower = filename.toLowerCase();
  const texts: string[] = [];

  if (lower.endsWith(".docx")) {
    const mainDoc = zip.file("word/document.xml");
    if (mainDoc) {
      const xml = await mainDoc.async("text");
      texts.push(xmlToPlain(xml));
    }

    // لو عندك عناوين إضافية (headers/footers) ممكن تضيفها هنا لاحقاً
  } else if (lower.endsWith(".pptx")) {
    // نقرأ جميع الشرائح ppt/slides/slideX.xml
    const files = Object.keys(zip.files).filter(
      (n) => n.startsWith("ppt/slides/slide") && n.endsWith(".xml")
    );
    for (const name of files.sort()) {
      const f = zip.file(name);
      if (f) {
        const xml = await f.async("text");
        texts.push(xmlToPlain(xml));
      }
    }
  } else if (lower.endsWith(".xlsx")) {
    // نقرأ sharedStrings (النصوص الموجودة في الجداول)
    const shared = zip.file("xl/sharedStrings.xml");
    if (shared) {
      const xml = await shared.async("text");
      texts.push(xmlToPlain(xml));
    }
  }

  const result = texts.join("\n\n").trim();
  if (!result) {
    throw new Error("No office text extracted");
  }
  return result;
}

// تلخيص نص جاهز (أيًا كان مصدره)
async function summarizeFromText(text: string, question: string): Promise<string> {
  if (!text.trim()) {
    return `
I couldn't extract readable text from this document. It may be a scanned/image-based file.
Please upload it as a PDF/image or paste the important text directly.`;
  }

  const maxChars = 20000;
  const truncated = text.slice(0, maxChars);

  const prompt = `
You are an engineering document summarizer.

User request:
${question}

Below is the extracted content of a document:
---
${truncated}
---

Provide:
- Title
- Short context
- Bullet points for key findings
- Important numbers/dates/names
- Key recommendations
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a precise engineering document summarizer.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  });

  return (
    completion.choices[0]?.message?.content ||
    "I couldn't generate a summary for this document."
  );
}

// المسار الحالي اللي شغّال ممتاز مع PDF: upload + input_file
async function summarizeViaUpload(
  buffer: Buffer,
  filename: string,
  question: string
): Promise<string> {
  const uploaded = await client.files.create({
    file: await toFile(buffer, filename),
    purpose: "user_data",
  });

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              question +
              "\n\nPlease answer in clear markdown with:\n" +
              "- Title\n" +
              "- Short context\n" +
              "- Bullet points for key findings\n" +
              "- Important numbers/dates/names\n" +
              "- Key recommendations.",
          },
          {
            type: "input_file",
            file_id: uploaded.id,
          },
        ],
      },
    ],
  });

  const anyResponse = response as any;
  return (
    anyResponse.output_text ??
    anyResponse.output?.[0]?.content?.[0]?.text ??
    "I couldn't generate a summary for this document."
  );
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const questionField = formData.get("question");

    const question =
      (typeof questionField === "string" && questionField.trim().length > 0
        ? questionField
        : "Summarize this engineering document with headings, bullet points, important numbers/dates, and key recommendations.");

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const lowerName = file.name.toLowerCase();

    let reply: string;

    if (
      lowerName.endsWith(".docx") ||
      lowerName.endsWith(".pptx") ||
      lowerName.endsWith(".xlsx")
    ) {
      // 🔹 ملفات Word / PowerPoint / Excel → نفك الضغط ونستخرج النص
      try {
        const officeText = await extractOfficeText(buffer, lowerName);
        reply = await summarizeFromText(officeText, question);
      } catch (err) {
        console.error(
          "OFFICE extraction failed, falling back to upload/raw:",
          err
        );
        // لو فشل JSZip لأي سبب، نجرب upload مثل باقي الأنواع
        try {
          reply = await summarizeViaUpload(buffer, file.name, question);
        } catch (err2) {
          console.error("Upload also failed, falling back to raw text:", err2);
          const raw = buffer.toString("utf8").replace(/\0/g, " ");
          reply = await summarizeFromText(raw, question);
        }
      }
    } else if (lowerName.endsWith(".pdf")) {
      // 🔹 PDF → نحافظ على المسار اللي كان شغّال عندك
      try {
        reply = await summarizeViaUpload(buffer, file.name, question);
      } catch (err) {
        console.error("PDF upload failed, falling back to raw:", err);
        const raw = buffer.toString("utf8").replace(/\0/g, " ");
        reply = await summarizeFromText(raw, question);
      }
    } else {
      // 🔹 أي نوع آخر → نحاول upload ثم ننزل إلى raw text
      try {
        reply = await summarizeViaUpload(buffer, file.name, question);
      } catch (err) {
        console.error("Generic upload failed, falling back to raw:", err);
        const raw = buffer.toString("utf8").replace(/\0/g, " ");
        reply = await summarizeFromText(raw, question);
      }
    }

    return NextResponse.json({ reply }, { status: 200 });
  } catch (err) {
    console.error("DOCUMENT API ERROR:", err);
    return NextResponse.json(
      {
        error:
          "Document processing failed. Please try again, or convert the file to a standard PDF/Text and upload again.",
      },
      { status: 500 }
    );
  }
}
