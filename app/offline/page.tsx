import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="page-wrap" style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <h1 className="page-title">engineerit.ai</h1>
        <p className="page-subtitle">You are offline. Chat, checkout, and sign-in need a connection.</p>
        <p className="page-subtitle" dir="rtl">
          أنت غير متصل. المحادثة والدفع وتسجيل الدخول تحتاج إلى شبكة.
        </p>
        <Link className="mkt-btn mkt-btn-primary" href="/chat">
          Try again
        </Link>
      </div>
    </main>
  );
}
