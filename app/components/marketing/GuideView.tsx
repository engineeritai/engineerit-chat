"use client";

import Link from "next/link";
import { useLocale } from "@/app/components/LocaleProvider";
import { guideCopy, type GuideStep } from "@/lib/guide";

function FlowSvg({ title }: { title: string }) {
  const nodes = [1, 2, 3, 4, 5, 6, 7];
  return (
    <svg className="guide-svg" viewBox="0 0 728 88" role="img" aria-label={title}>
      <title>{title}</title>
      {nodes.slice(0, -1).map((n, index) => (
        <line
          key={n}
          x1={36 + index * 104 + 22}
          y1={36}
          x2={36 + (index + 1) * 104 - 22}
          y2={36}
          stroke="#c5cedd"
          strokeWidth="2"
        />
      ))}
      {nodes.map((n, index) => {
        const x = 36 + index * 104;
        return (
          <g key={n}>
            <circle cx={x} cy={36} r={18} fill="#1a56ff" />
            <text x={x} y={41} textAnchor="middle" fill="#fff" fontSize="14" fontFamily="inherit">
              {n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function StepArt({ id }: { id: string }) {
  const common = { width: 120, height: 88, viewBox: "0 0 120 88", "aria-hidden": true as const };
  if (id === "signup") {
    return (
      <svg {...common}>
        <rect x="28" y="16" width="64" height="56" rx="12" fill="#eef3ff" />
        <circle cx="60" cy="38" r="10" fill="#1a56ff" />
        <path d="M44 64c2-10 10-14 16-14s14 4 16 14" fill="#1a56ff" />
      </svg>
    );
  }
  if (id === "discipline") {
    return (
      <svg {...common}>
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => (
            <rect
              key={`${row}-${col}`}
              x={26 + col * 24}
              y={16 + row * 20}
              width="18"
              height="14"
              rx="3"
              fill={row === 1 && col === 1 ? "#1a56ff" : "#e6e8ee"}
            />
          ))
        )}
      </svg>
    );
  }
  if (id === "ask") {
    return (
      <svg {...common}>
        <rect x="18" y="18" width="52" height="52" rx="6" fill="#fff" stroke="#c5cedd" />
        <path d="M28 34h32M28 44h24M28 54h18" stroke="#9aa3b2" strokeWidth="2" />
        <rect x="58" y="36" width="44" height="28" rx="10" fill="#1a56ff" />
      </svg>
    );
  }
  if (id === "tools") {
    return (
      <svg {...common}>
        <rect x="22" y="22" width="76" height="14" rx="4" fill="#e6e8ee" />
        <rect x="22" y="40" width="76" height="14" rx="4" fill="#1a56ff" />
        <rect x="22" y="58" width="76" height="14" rx="4" fill="#e6e8ee" />
      </svg>
    );
  }
  if (id === "advisors") {
    return (
      <svg {...common}>
        <circle cx="34" cy="44" r="10" fill="#1a56ff" />
        <circle cx="86" cy="24" r="8" fill="#c5d4ff" />
        <circle cx="86" cy="44" r="8" fill="#1a56ff" />
        <circle cx="86" cy="64" r="8" fill="#c5d4ff" />
        <path d="M44 44h34" stroke="#1a56ff" strokeWidth="2" />
      </svg>
    );
  }
  if (id === "export") {
    return (
      <svg {...common}>
        <rect x="24" y="16" width="40" height="52" rx="4" fill="#fff" stroke="#c5cedd" />
        <path d="M72 40h22M84 30l12 10-12 10" fill="none" stroke="#1a56ff" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="16" y="28" width="22" height="40" rx="4" fill="#e6e8ee" />
      <rect x="46" y="16" width="22" height="52" rx="4" fill="#1a56ff" />
      <rect x="76" y="36" width="22" height="32" rx="4" fill="#c5d4ff" />
    </svg>
  );
}

function FlowLinks({ steps, prefix }: { steps: GuideStep[]; prefix: string }) {
  return (
    <ol className="guide-flow">
      {steps.map((step, index) => (
        <li key={step.id}>
          <a href={`${prefix}#step-${index + 1}`}>
            <span className="guide-flow-no">{index + 1}</span>
            {step.title}
          </a>
          {index < steps.length - 1 ? (
            <span className="guide-flow-arrow" aria-hidden="true">
              →
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export default function GuideView({ mode }: { mode: "how" | "guide" }) {
  const { locale } = useLocale();
  const copy = guideCopy(locale);
  const detailed = mode === "guide";

  return (
    <article className="mkt-section guide-page">
      <h1>{detailed ? copy.guideTitle : copy.howTitle}</h1>
      <p className="mkt-intro">{detailed ? copy.guideLead : copy.howLead}</p>
      <FlowSvg title={copy.flowLabel} />
      <FlowLinks steps={copy.steps} prefix={detailed ? "" : "/guide"} />
      <ol className="guide-steps">
        {copy.steps.map((step, index) => (
          <li key={step.id} id={`step-${index + 1}`} className="mkt-card guide-step">
            <StepArt id={step.id} />
            <div>
              <h2>
                <span className="mkt-step-no">{index + 1}</span>
                {step.title}
              </h2>
              <p>{detailed ? step.body : step.short}</p>
              <Link href={step.href}>{step.hrefLabel}</Link>
            </div>
          </li>
        ))}
      </ol>
      <p className="guide-more">
        {detailed ? (
          <Link className="mkt-btn mkt-btn-secondary" href="/how-it-works">
            {copy.backHow}
          </Link>
        ) : (
          <Link className="mkt-btn mkt-btn-primary" href="/guide">
            {copy.readGuide}
          </Link>
        )}
      </p>
    </article>
  );
}
