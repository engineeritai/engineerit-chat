export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const result = await extractText(pdf, { mergePages: true });
  const text = result.text;
  if (Array.isArray(text)) return text.join("\n");
  return typeof text === "string" ? text : "";
}
