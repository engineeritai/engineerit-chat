// app/api/document/route.ts

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import JSZip from "jszip";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Simple XML → plain text
function xmlToPlain(xml: string): string {
  return xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Extract text from Office files: DOCX / PPTX / XLSX
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
    // headers/footers يمكن إضافتها لاحقًا إذا احتجنا
  } else if (lower.endsWith(".pptx")) {
    // read all slides ppt/slides/slideX.xml
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
    // sharedStrings → النصوص الموجودة داخل الجداول
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

// Summarize from already-extracted plain text
async function summarizeFromText(text: string, question: string): Promise<string> {
  if (!text.trim()) {
    return `
I couldn't extract readable text from this document.  
It may be a scanned/image-based file or a pure binary file.

Please try:
- Uploading a clearer PDF or image, **or**
- Copy/pasting the important text directly into the chat.`;
  }

  const maxChars = 20000;
  const truncated = text.slice(0, maxChars);

  const prompt = `
You are an engineering document summarizer for engineerit.ai.

User request:
${question}

Below is the extracted content of a document:
---
${truncated}
---

Please respond **bilingually (Arabic and English)** where useful.

Provide, in clear Markdown:

1) Title / عنوان مناسب
2) Short context / سياق مختصر
3) Bullet points for key findings / أهم النتائج بنقاط
4) Important numbers, dates, names / الأرقام والتواريخ والأسماء المهمة
5) Key engineering recommendations / التوصيات الهندسية الرئيسية
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a precise engineering document summarizer. You handle technical reports, drawings, specs, codes, and project documents in Arabic and English.",
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

// Using file upload + responses API (good for PDF/any complex file)
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
              "1) Title / عنوان\n" +
              "2) Short context\n" +
              "3) Bullet points for key findings\n" +
              "4) Important numbers/dates/names\n" +
              "5) Key recommendations.",
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
      typeof questionField === "string" && questionField.trim().length > 0
        ? questionField
        : "Summarize this engineering document (Arabic + English) with headings, bullet points, important numbers/dates, and key recommendations.";

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Basic size guard (e.g. 20 MB) to avoid crazy huge files
    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          error:
            "File is too large. Please upload a smaller document (max ~20 MB) or split it into parts.",
        },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const lowerName = file.name.toLowerCase();

    let reply: string;

    // ─────────────────────────────────────
    // 1) Office formats: DOCX / PPTX / XLSX
    // ─────────────────────────────────────
    if (
      lowerName.endsWith(".docx") ||
      lowerName.endsWith(".pptx") ||
      lowerName.endsWith(".xlsx")
    ) {
      try {
        const officeText = await extractOfficeText(buffer, lowerName);
        reply = await summarizeFromText(officeText, question);
      } catch (err) {
        console.error(
          "OFFICE extraction failed, falling back to upload/raw:",
          err
        );
        try {
          reply = await summarizeViaUpload(buffer, file.name, question);
        } catch (err2) {
          console.error("Upload also failed, falling back to raw text:", err2);
          const raw = buffer.toString("utf8").replace(/\0/g, " ");
          reply = await summarizeFromText(raw, question);
        }
      }

      // ─────────────────────────────────────
      // 2) PDF (keep the path that was working well)
      // ─────────────────────────────────────
    } else if (lowerName.endsWith(".pdf")) {
      try {
        reply = await summarizeViaUpload(buffer, file.name, question);
      } catch (err) {
        console.error("PDF upload failed, falling back to raw:", err);
        const raw = buffer.toString("utf8").replace(/\0/g, " ");
        reply = await summarizeFromText(raw, question);
      }

      // ─────────────────────────────────────
      // 3) Engineering / binary formats (MS Project, AutoCAD, FEA, etc.)
      //    We treat them via upload first; if that fails, we last-resort to raw text.
      // ─────────────────────────────────────
    } else if (
      lowerName.endsWith(".mpp") || // MS Project
      lowerName.endsWith(".dwg") ||
      lowerName.endsWith(".dxf") || // AutoCAD
      lowerName.endsWith(".m") || // Matlab scripts
      lowerName.endsWith(".slx") || // Simulink
      lowerName.endsWith(".sldprt") ||
      lowerName.endsWith(".sldasm") || // SolidWorks
      lowerName.endsWith(".inp") || // Abaqus
      lowerName.endsWith(".cdb") || // ANSYS DB
      lowerName.endsWith(".fem") ||
      lowerName.endsWith(".nas")
    ) {
      try {
        reply = await summarizeViaUpload(buffer, file.name, question);
      } catch (err) {
        console.error(
          "Engineering/binary upload failed, falling back to raw:",
          err
        );
        const raw = buffer.toString("utf8").replace(/\0/g, " ");
        reply = await summarizeFromText(raw, question);
      }

      // ─────────────────────────────────────
      // 4) Any other type → generic path
      // ─────────────────────────────────────
    } else {
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
