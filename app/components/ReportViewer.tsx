"use client";

import { useEffect, useId, useRef, useState } from "react";
import ShareView from "@/app/share/view";
import {
  intentLinks,
  nextTrapIndex,
  prefersMobileShare,
  sharePayload,
  type ReportViewerLabels,
  type ViewerDownload,
} from "@/lib/reportViewer";
import type { ShareRecord } from "@/lib/shareStore";
import { showToast } from "@/lib/toast";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function ShareArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v11" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M7 9l5-5 5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function CloseMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export default function ReportViewer({
  title,
  markdown,
  locale,
  labels,
  downloads,
  canShare,
  createdAt,
  defaultMenu,
  onClose,
  onDownload,
  onPreviewPdf,
  onPublish,
}: {
  title: string;
  markdown: string;
  locale: "en" | "ar";
  labels: ReportViewerLabels;
  downloads: ViewerDownload[];
  canShare: boolean;
  createdAt: string;
  defaultMenu?: "download";
  onClose: () => void;
  onDownload: (format: ViewerDownload) => Promise<void> | void;
  onPreviewPdf: () => Promise<Blob>;
  onPublish: () => Promise<string | null>;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const pdfUrlRef = useRef<string | null>(null);
  const [tab, setTab] = useState<"html" | "pdf">("html");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(defaultMenu === "download");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canPreviewPdf = downloads.includes("pdf");
  const dir = locale === "ar" ? "rtl" : "ltr";

  const share: ShareRecord = {
    id: "preview",
    title,
    markdown,
    locale,
    description: title,
    createdAt,
  };

  useEffect(() => {
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    return () => {
      restoreRef.current?.focus?.();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (downloadOpen || shareOpen) {
          setDownloadOpen(false);
          setShareOpen(false);
          return;
        }
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.hasAttribute("disabled"));
      if (!items.length) return;
      const next = nextTrapIndex(items.indexOf(document.activeElement as HTMLElement), items.length, event.shiftKey);
      event.preventDefault();
      items[next]?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [downloadOpen, onClose, shareOpen]);

  async function publishOrReuse() {
    if (shareUrl) return shareUrl;
    const url = await onPublish();
    if (url) setShareUrl(url);
    return url;
  }

  async function shareReport() {
    setDownloadOpen(false);
    const url = await publishOrReuse();
    if (!url) {
      showToast(labels.shareFailed, "err");
      return;
    }
    const payload = sharePayload(title, url, locale);
    const mobile = prefersMobileShare({
      width: window.innerWidth,
      canShare: typeof navigator.share === "function",
    });
    if (mobile) {
      try {
        await navigator.share({ title: payload.title, text: payload.text, url: payload.url });
        setShareOpen(false);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    if (await copyText(url)) showToast(labels.copied);
    setShareOpen(true);
  }

  async function choose(format: ViewerDownload) {
    setDownloadOpen(false);
    setBusy(true);
    try {
      await onDownload(format);
    } finally {
      setBusy(false);
    }
  }

  async function openPdfTab() {
    setDownloadOpen(false);
    setShareOpen(false);
    setTab("pdf");
    if (pdfUrl || preparing) return;
    setPreparing(true);
    try {
      const blob = await onPreviewPdf();
      const url = URL.createObjectURL(blob);
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = url;
      setPdfUrl(url);
    } catch {
      showToast(labels.pdfFailed, "err");
      setTab("html");
    } finally {
      setPreparing(false);
    }
  }

  const links = shareUrl ? intentLinks(title, shareUrl, locale) : null;
  const formatLabel: Record<ViewerDownload, string> = {
    pdf: labels.pdf,
    docx: labels.word,
    pptx: labels.powerPoint,
    xlsx: labels.excel,
  };

  return (
    <div
      className="report-viewer"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      dir={dir}
      lang={locale}
      tabIndex={-1}
      ref={panelRef}
    >
      <header className="report-viewer-bar">
        <button type="button" className="report-viewer-icon" onClick={onClose} aria-label={labels.close}>
          <CloseMark />
        </button>
        <h2 id={titleId} className="report-viewer-title">
          {title}
        </h2>
        <div className="report-viewer-actions">
          {canShare ? (
            <button type="button" className="report-viewer-textbtn" onClick={() => void shareReport()} aria-expanded={shareOpen} aria-haspopup="menu">
              <ShareArrow />
              <span>{labels.share}</span>
            </button>
          ) : null}
          {downloads.length > 0 ? (
            <button
              type="button"
              className="report-viewer-textbtn"
              aria-expanded={downloadOpen}
              aria-haspopup="menu"
              onClick={() => {
                setShareOpen(false);
                setDownloadOpen((open) => !open);
              }}
            >
              <span>{labels.download}</span>
            </button>
          ) : null}
          {shareOpen && links ? (
            <div className="report-viewer-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (!shareUrl) return;
                  void copyText(shareUrl).then((ok) => {
                    if (ok) showToast(labels.copied);
                  });
                }}
              >
                {labels.copyLink}
              </button>
              <a role="menuitem" href={links.whatsapp} target="_blank" rel="noreferrer">
                {labels.whatsapp}
              </a>
              <a role="menuitem" href={links.linkedin} target="_blank" rel="noreferrer">
                {labels.linkedIn}
              </a>
              <a role="menuitem" href={links.email}>
                {labels.email}
              </a>
            </div>
          ) : null}
          {downloadOpen ? (
            <div className="report-viewer-menu" role="menu">
              {downloads.map((format) => (
                <button key={format} type="button" role="menuitem" disabled={busy} onClick={() => void choose(format)}>
                  {formatLabel[format]}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>
      {canPreviewPdf ? (
        <div className="report-viewer-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "html"} onClick={() => setTab("html")}>
            {labels.report}
          </button>
          <button type="button" role="tab" aria-selected={tab === "pdf"} onClick={() => void openPdfTab()}>
            {labels.pdfPreview}
          </button>
        </div>
      ) : null}
      <div className="report-viewer-body">
        {tab === "pdf" ? (
          pdfUrl ? (
            <iframe className="report-viewer-frame" title={labels.pdfPreview} src={pdfUrl} />
          ) : (
            <p className="report-viewer-status" role="status">
              {labels.preparing}
            </p>
          )
        ) : (
          <ShareView share={share} />
        )}
      </div>
    </div>
  );
}
