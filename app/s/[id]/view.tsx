"use client";

import MessageMarkdown from "@/app/components/MessageMarkdown";
import { riyadhStamp } from "@/lib/ksaTime";
import type { ShareRecord } from "@/lib/shareStore";

const labels = {
  en: { copyTable: "Copy table", exportExcel: "Export to Excel", diagramCopy: "Copy as image", diagramPng: "Download PNG", diagramSvg: "Download SVG" },
  ar: { copyTable: "نسخ الجدول", exportExcel: "تصدير إلى إكسل", diagramCopy: "نسخ كصورة", diagramPng: "تنزيل PNG", diagramSvg: "تنزيل SVG" },
};

export default function ShareView({ share }: { share: ShareRecord }) {
  const dir = share.locale === "ar" ? "rtl" : "ltr";
  const stamp = riyadhStamp(new Date(share.createdAt), share.locale);
  return (
    <div className="share-page" dir={dir} lang={share.locale}>
      <header className="share-header">
        <img src="/icon-192.png" alt="eit" width={32} height={32} />
        <h1>{share.title}</h1>
      </header>
      <main className="conversation share-body">
        <article className="message-bubble">
          <div className="msg-content" dir={dir}>
            <MessageMarkdown markdown={share.markdown} dir={dir} locale={share.locale} labels={labels[share.locale]} />
          </div>
        </article>
      </main>
      <footer className="share-footer">
        <span>
          <img src="/icon-192.png" alt="" width={16} height={16} /> engineer it · engineerit.ai
        </span>
        <span>{stamp}</span>
      </footer>
    </div>
  );
}
