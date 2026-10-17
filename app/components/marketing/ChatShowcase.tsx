"use client";

import Link from "next/link";
import EitMark from "@/app/components/marketing/EitMark";
import SaudiBusinessBadge from "@/app/components/marketing/SaudiBusinessBadge";
import ToolGlyph from "@/app/components/ToolGlyph";
import { useLocale } from "@/app/components/LocaleProvider";
import type { EngineerToolId } from "@/lib/engineerTools";
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
  if (id !== "advisors") return <ToolGlyph id={id} />;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="2.4" />
      <circle cx="16" cy="9" r="2" />
      <path d="M4.8 18.2c.6-2.4 2.4-3.7 4.2-3.7s3.6 1.3 4.2 3.7" />
      <path d="M14 14.6c1.3-.4 2.6-.2 3.6.8.7.8 1.2 1.8 1.5 2.8" />
    </svg>
  );
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
          <EitMark size={28} tone="inverse" title="eit" />
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
