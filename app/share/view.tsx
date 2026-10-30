"use client";

import MessageMarkdown from "@/app/components/MessageMarkdown";
import { riyadhStamp } from "@/lib/ksaTime";
import { PAGE_DISCLAIMER_HREF, PAGE_DISCLAIMER_LEAD, PAGE_DISCLAIMER_LINK } from "@/lib/outputDisclaimer";
import { shareDir, shareLanguage } from "@/lib/shareDirection";
import type { ShareRecord } from "@/lib/shareStore";

const labels = {
  en: { copyTable: "Copy table", exportExcel: "Export to Excel", diagramCopy: "Copy as image", diagramPng: "Download PNG", diagramSvg: "Download SVG" },
  ar: { copyTable: "نسخ الجدول", exportExcel: "تصدير إلى إكسل", diagramCopy: "نسخ كصورة", diagramPng: "تنزيل PNG", diagramSvg: "تنزيل SVG" },
};

export default function ShareView({ share }: { share: ShareRecord }) {
  const lang = shareLanguage(`${share.title}\n${share.markdown}`, share.locale);
  const dir = shareDir(`${share.title}\n${share.markdown}`, share.locale);
  const stamp = riyadhStamp(new Date(share.createdAt), lang);
  return (
    <div className="share-page" dir={dir} lang={lang}>
      <header className="share-header">
        <img src="/icon-192.png" alt="eit" width={32} height={32} />
        <h1>{share.title}</h1>
      </header>
      <main className="conversation share-body">
        <article className="message-bubble">
          <div className="msg-content" dir={dir} lang={lang}>
            <MessageMarkdown markdown={share.markdown} dir={dir} locale={lang} labels={labels[lang]} endDisclaimer={false} />
          </div>
        </article>
      </main>
      <footer className="share-footer" dir={dir} lang={lang}>
        <p className="share-footer-policy" dir={dir}>
          {PAGE_DISCLAIMER_LEAD[lang]}
          <a href={PAGE_DISCLAIMER_HREF}>{PAGE_DISCLAIMER_LINK[lang]}</a>
        </p>
        <div className="share-footer-meta">
          <span className="share-footer-brand">
            <img src="/icon-192.png" alt="" width={16} height={16} />
            <span>engineer it · engineerit.ai</span>
          </span>
          <span className="share-footer-stamp">{stamp}</span>
        </div>
      </footer>
    </div>
  );
}

export function ShareExpired() {
  return (
    <div className="share-page" dir="ltr" lang="en">
      <header className="share-header">
        <img src="/icon-192.png" alt="eit" width={32} height={32} />
        <h1>engineer it</h1>
      </header>
      <main className="share-expired">
        <h2>This share link has expired</h2>
        <p>انتهت صلاحية رابط المشاركة.</p>
        <p>
          <a href="https://engineerit.ai">engineerit.ai</a>
        </p>
      </main>
    </div>
  );
}
