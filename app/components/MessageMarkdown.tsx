"use client";

import ChatTable from "@/app/components/ChatTable";
import MermaidFigure from "@/app/components/MermaidFigure";
import ScheduleFigure from "@/app/components/ScheduleFigure";
import { parseMessage, tokenizeInline, type Inline, type ListItem } from "@/lib/messageDocument";
import { isOutputDisclaimer, outputDisclaimerBody, OUTPUT_POLICY_URL } from "@/lib/outputDisclaimer";

export type MessageLabels = {
  copyTable: string;
  exportExcel: string;
  diagramCopy: string;
  diagramPng: string;
  diagramSvg: string;
};

function ListView({ ordered, items }: { ordered: boolean; items: ListItem[] }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag>
      {items.map((item, index) => (
        <li key={index} value={ordered ? index + 1 : undefined}>
          <InlineText tokens={tokenizeInline(item.text)} />
          {item.children.length ? <ListView ordered={item.orderedChildren} items={item.children} /> : null}
        </li>
      ))}
    </Tag>
  );
}

function InlineText({ tokens }: { tokens: Inline[] }) {
  return (
    <>
      {tokens.map((token, index) => {
        if (token.type === "link") {
          return (
            <a key={index} href={token.href} target="_blank" rel="noreferrer">
              {token.text}
            </a>
          );
        }
        return token.bold ? <strong key={index}>{token.text}</strong> : <span key={index}>{token.text}</span>;
      })}
    </>
  );
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
  /** Chat take-off and BOQ replies end with one muted line. Share pages use the footer instead. */
  endDisclaimer?: boolean;
}) {
  const blocks = parseMessage(markdown);
  const showEndNote =
    endDisclaimer &&
    blocks.some(
      (block) => block.type === "table" || (block.type === "paragraph" && isOutputDisclaimer(block.text, locale))
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
            <Tag key={index}>
              <InlineText tokens={tokenizeInline(block.text)} />
            </Tag>
          );
        }
        if (block.type === "paragraph") {
          if (isOutputDisclaimer(block.text, locale)) return null;
          const sources = /^\*\*(Sources|المصادر)\*\*$/.test(block.text.trim());
          return (
            <p key={index} className={sources ? "msg-sources" : undefined}>
              <InlineText tokens={tokenizeInline(block.text)} />
            </p>
          );
        }
        if (block.type === "list") {
          return <ListView key={index} ordered={block.ordered} items={block.items} />;
        }
        if (block.type === "table") {
          return (
            <ChatTable key={index} headers={block.headers} rows={block.rows} dir={dir} locale={locale} labels={labels} fileBase={fileBase} />
          );
        }
        if (block.type === "chart") {
          return <ScheduleFigure key={index} model={block.model} dir={dir} index={block.index} labels={diagramLabels} />;
        }
        if (block.type === "diagram") {
          return <MermaidFigure key={index} code={block.source} dir={dir} index={block.index} labels={diagramLabels} />;
        }
        return (
          <pre key={index}>
            <code>{block.text}</code>
          </pre>
        );
      })}
      {showEndNote ? (
        <p className="output-disclaimer">
          {outputDisclaimerBody(locale)}{" "}
          <a href={OUTPUT_POLICY_URL[locale]} target="_blank" rel="noreferrer">
            {OUTPUT_POLICY_URL[locale]}
          </a>
        </p>
      ) : null}
    </>
  );
}
