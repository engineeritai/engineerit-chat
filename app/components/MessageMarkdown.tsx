"use client";

import ChatTable from "@/app/components/ChatTable";
import MermaidFigure from "@/app/components/MermaidFigure";
import ScheduleFigure from "@/app/components/ScheduleFigure";
import { parseMessage, tokenizeInline, type Inline, type ListItem } from "@/lib/messageDocument";
import { isOutputDisclaimer, isQuantityTable, outputDisclaimerBody, OUTPUT_POLICY_LABEL, OUTPUT_POLICY_URL } from "@/lib/outputDisclaimer";
import { blockDirection, hasArabicContent, isolatePieces } from "@/lib/shareDirection";

export type MessageLabels = {
  copyTable: string;
  exportExcel: string;
  diagramCopy: string;
  diagramPng: string;
  diagramSvg: string;
};

function listPlain(items: ListItem[]): string {
  return items.map((item) => `${item.text}\n${listPlain(item.children)}`).join("\n");
}

function ListView({ ordered, items, dir }: { ordered: boolean; items: ListItem[]; dir?: "ltr" | "rtl" }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag dir={dir}>
      {items.map((item, index) => {
        const isolate = /[\u0600-\u06FF]/.test(item.text);
        const nestedDir = item.children.length && hasArabicContent(listPlain(item.children)) ? "rtl" : dir;
        return (
          <li key={index} value={ordered ? index + 1 : undefined} dir={isolate || dir === "rtl" ? blockDirection(item.text) : undefined}>
            <InlineText tokens={tokenizeInline(item.text)} isolate={isolate} />
            {item.children.length ? <ListView ordered={item.orderedChildren} items={item.children} dir={nestedDir} /> : null}
          </li>
        );
      })}
    </Tag>
  );
}

function DisclaimerLine({ locale }: { locale: "en" | "ar" }) {
  return (
    <p className="output-disclaimer">
      {outputDisclaimerBody(locale)}{" "}
      <a href={OUTPUT_POLICY_URL[locale]} target="_blank" rel="noreferrer">
        {OUTPUT_POLICY_LABEL}
      </a>
    </p>
  );
}

function Isolated({ text }: { text: string }) {
  const pieces = isolatePieces(text);
  if (pieces.length === 1 && !pieces[0].isolate) return text;
  return pieces.map((piece, index) =>
    piece.isolate ? (
      <bdi key={index} dir="ltr">
        {piece.text}
      </bdi>
    ) : (
      <span key={index}>{piece.text}</span>
    )
  );
}

function InlineText({ tokens, isolate = false }: { tokens: Inline[]; isolate?: boolean }) {
  return (
    <>
      {tokens.map((token, index) => {
        if (token.type === "link") {
          return (
            <a key={index} href={token.href} target="_blank" rel="noreferrer">
              {isolate ? <bdi dir="ltr">{token.text}</bdi> : token.text}
            </a>
          );
        }
        const body = isolate ? <Isolated text={token.text} /> : token.text;
        return token.bold ? <strong key={index}>{body}</strong> : <span key={index}>{body}</span>;
      })}
    </>
  );
}

function flowDir(text: string, docDir: "ltr" | "rtl"): "rtl" | "ltr" | "auto" | undefined {
  const direction = blockDirection(text);
  if (direction === "rtl" || direction === "auto") return direction;
  if (docDir === "rtl") return "ltr";
  return undefined;
}

export default function MessageMarkdown({
  markdown,
  dir,
  locale,
  labels,
  fileBase,
  endDisclaimer = true,
}: {
  markdown: string;
  dir: "ltr" | "rtl";
  locale: "en" | "ar";
  labels: MessageLabels;
  fileBase?: string;
  /** One muted line under a take-off or BOQ table. Share pages use the footer instead. */
  endDisclaimer?: boolean;
}) {
  const blocks = parseMessage(markdown);
  const hasDisclaimer = blocks.some((block) => block.type === "paragraph" && isOutputDisclaimer(block.text, locale));
  const lastQuantityTable = blocks.reduce(
    (found, block, index) => (block.type === "table" && isQuantityTable(block.headers) ? index : found),
    -1
  );
  const diagramLabels = {
    copy: labels.diagramCopy,
    png: labels.diagramPng,
    svg: labels.diagramSvg,
    enlarge: locale === "ar" ? "تكبير" : "Enlarge",
    close: locale === "ar" ? "إغلاق" : "Close",
  };
  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const Tag = `h${Math.min(block.level, 6)}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
          return (
            <Tag key={index} dir={flowDir(block.text, dir)}>
              <InlineText tokens={tokenizeInline(block.text)} isolate={/[\u0600-\u06FF]/.test(block.text)} />
            </Tag>
          );
        }
        if (block.type === "paragraph") {
          if (isOutputDisclaimer(block.text, locale) || isOutputDisclaimer(block.text, locale === "ar" ? "en" : "ar")) {
            return endDisclaimer ? <DisclaimerLine key={index} locale={locale} /> : null;
          }
          const sources = /^\*\*(Sources|المصادر)\*\*$/.test(block.text.trim());
          return (
            <p key={index} dir={flowDir(block.text, dir)} className={sources ? "msg-sources" : undefined}>
              <InlineText tokens={tokenizeInline(block.text)} isolate={/[\u0600-\u06FF]/.test(block.text)} />
            </p>
          );
        }
        if (block.type === "list") {
          const listDir = hasArabicContent(listPlain(block.items)) ? "rtl" : dir === "rtl" ? "ltr" : undefined;
          return <ListView key={index} ordered={block.ordered} items={block.items} dir={listDir} />;
        }
        if (block.type === "table") {
          const note = endDisclaimer && !hasDisclaimer && index === lastQuantityTable ? <DisclaimerLine locale={locale} /> : null;
          const tableText = [...block.headers, ...block.rows.flat()].join("\n");
          const tableDir = hasArabicContent(tableText) ? "rtl" : dir;
          return (
            <div key={index}>
              <ChatTable headers={block.headers} rows={block.rows} dir={tableDir} locale={locale} labels={labels} fileBase={fileBase} />
              {note}
            </div>
          );
        }
        if (block.type === "chart") {
          return <ScheduleFigure key={index} model={block.model} dir={dir} index={block.index} labels={diagramLabels} />;
        }
        if (block.type === "diagram") {
          return <MermaidFigure key={index} code={block.source} dir={dir} index={block.index} labels={diagramLabels} />;
        }
        return (
          <pre key={index} dir={dir === "rtl" ? "ltr" : undefined}>
            <code>{block.text}</code>
          </pre>
        );
      })}
    </>
  );
}
