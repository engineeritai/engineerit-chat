"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import EitMark from "@/app/components/marketing/EitMark";
import SaudiBusinessBadge from "@/app/components/marketing/SaudiBusinessBadge";
import { useLocale } from "@/app/components/LocaleProvider";
import { ENGINEER_TOOLS, type EngineerToolId } from "@/lib/engineerTools";
import { toolLabel } from "@/lib/labels";
import { getMarketingContent } from "@/lib/marketing";

const TILES: { id: EngineerToolId | "advisors"; tone: string }[] = [
  { id: "drawing", tone: "blue" },
  { id: "design", tone: "teal" },
  { id: "itp", tone: "amber" },
  { id: "boq", tone: "violet" },
  { id: "schedule", tone: "cyan" },
  { id: "value", tone: "rose" },
  { id: "dashboard", tone: "ink" },
  { id: "advisors", tone: "blue" },
];

function TileIcon({ id }: { id: EngineerToolId | "advisors" }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  const paths: Record<string, ReactNode> = {
    drawing: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 15.5 10.2 12l2.1 2.4L16 9.5" />
      </>
    ),
    design: (
      <>
        <path d="M12 3 5 6.5v5.2c0 4.2 2.9 7.2 7 8.3 4.1-1.1 7-4.1 7-8.3V6.5L12 3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    itp: (
      <>
        <path d="M8 4h8" />
        <path d="M9 4v2.2A2 2 0 0 0 9.6 7.6L11 9.2V20h2V9.2l1.4-1.6A2 2 0 0 0 15 6.2V4" />
        <path d="M9 14h6" />
      </>
    ),
    boq: (
      <>
        <path d="M7 4h10v16H7z" />
        <path d="M10 8h4M10 12h4M10 16h2" />
      </>
    ),
    schedule: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </>
    ),
    value: (
      <>
        <path d="M12 3v18" />
        <path d="M8 7h6.5a2.5 2.5 0 0 1 0 5H9.5a2.5 2.5 0 0 0 0 5H16" />
      </>
    ),
    dashboard: (
      <>
        <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5" />
        <rect x="13" y="3.5" width="7.5" height="4.5" rx="1.5" />
        <rect x="13" y="10.5" width="7.5" height="10" rx="1.5" />
        <rect x="3.5" y="13.5" width="7.5" height="7" rx="1.5" />
      </>
    ),
    advisors: (
      <>
        <circle cx="9" cy="8" r="2.4" />
        <circle cx="16" cy="9" r="2" />
        <path d="M4.8 18.2c.6-2.4 2.4-3.7 4.2-3.7s3.6 1.3 4.2 3.7" />
        <path d="M14 14.6c1.3-.4 2.6-.2 3.6.8.7.8 1.2 1.8 1.5 2.8" />
      </>
    ),
  };
  return <svg {...common}>{paths[id]}</svg>;
}

export default function ChatShowcase() {
  const { locale } = useLocale();
  const content = getMarketingContent(locale);
  const show = content.hero.showcase;

  return (
    <div className="chat-showcase" aria-labelledby="hero-title">
      <p className="chat-showcase-sub">{show.subline}</p>
      <div className="chat-tiles">
        {TILES.map((tile, index) => {
          const title = tile.id === "advisors" ? show.advisorTitle : toolLabel(locale, tile.id);
          const benefit = tile.id === "advisors" ? show.advisorBenefit : show.benefits[tile.id];
          return (
            <Link
              key={tile.id}
              href={`/chat?tool=${tile.id}`}
              className={`chat-tile chat-tile-${tile.tone}`}
              style={{ animationDelay: `${80 + index * 40}ms` }}
            >
              <span className="chat-tile-icon">
                <TileIcon id={tile.id} />
              </span>
              <span className="chat-tile-title">{title}</span>
              <span className="chat-tile-benefit">{benefit}</span>
            </Link>
          );
        })}
      </div>
      <div className="chat-preview" aria-label={show.previewLabel}>
        <p className="chat-preview-label">{show.previewLabel}</p>
        <div className="chat-preview-user">{show.previewUser}</div>
        <div className="chat-preview-bot">
          <EitMark size={28} title="eit" />
          <table>
            <thead>
              <tr>
                <th>{show.previewHead[0]}</th>
                <th>{show.previewHead[1]}</th>
              </tr>
            </thead>
            <tbody>
              {show.previewRows.map((row) => (
                <tr key={row.item}>
                  <td>{row.item}</td>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="chat-showcase-actions">
        <Link className="mkt-btn mkt-btn-primary chat-showcase-cta" href="/chat">
          <EitMark size={40} tone="inverse" title="eit" />
          {show.cta}
        </Link>
        <Link className="mkt-btn mkt-btn-secondary" href="/pricing">
          {show.plans}
        </Link>
      </div>
      <SaudiBusinessBadge />
    </div>
  );
}
