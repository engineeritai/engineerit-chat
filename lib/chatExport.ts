import { contentDisposition, shortTopic } from "@/lib/exportName";
import type { Locale } from "@/lib/i18n";
import type { StoredMessage } from "@/lib/historyDb";
import { prepareReport } from "@/lib/reportModel";
import { buildReportDocx } from "@/lib/reportDocx";
import { buildReportPdf } from "@/lib/reportPdf";

function transcript(messages: StoredMessage[], locale: Locale) {
  const you = locale === "ar" ? "أنت" : "You";
  const assistant = locale === "ar" ? "المساعد" : "Assistant";
  const attachment = locale === "ar" ? "مرفق" : "Attachment";
  return messages
    .map((message) => {
      const who = message.role === "user" ? you : assistant;
      const files = message.attachments.map((file) => `${attachment}: ${file.name}`).join("\n");
      return `## ${who}\n\n${message.content || ""}${files ? `\n\n${files}` : ""}`;
    })
    .join("\n\n");
}

export async function buildChatPdf(args: { title: string; messages: StoredMessage[]; locale: Locale }): Promise<Uint8Array> {
  const report = await prepareReport({
    title: args.title,
    markdown: transcript(args.messages, args.locale),
    locale: args.locale,
  });
  return buildReportPdf(report);
}

export async function buildChatDocx(args: { title: string; messages: StoredMessage[]; locale: Locale }): Promise<Uint8Array> {
  const report = await prepareReport({
    title: args.title,
    markdown: transcript(args.messages, args.locale),
    locale: args.locale,
  });
  return buildReportDocx(report);
}

export function exportFilename(title: string, extension: "pdf" | "docx") {
  return contentDisposition(shortTopic(title, "Report"), extension);
}
