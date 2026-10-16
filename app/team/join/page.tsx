"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import NavSidebar from "../../components/NavSidebar";
import { supabase } from "@/lib/supabaseClient";
import { safeNextPath } from "@/lib/safeNext";

export default function JoinTeamPage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [message, setMessage] = useState("Checking your invite…");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    const next = safeNextPath(
      `/team/join?token=${encodeURIComponent(token)}`,
      "/team/join"
    );
    try {
      window.localStorage.setItem("engineerit_post_auth_next", next);
    } catch {
      /* ignore */
    }

    let cancelled = false;
    async function accept() {
      await Promise.resolve();
      if (cancelled) return;
      if (!token) {
        setMessage("");
        setError("This invite link is missing a token.");
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const session = data.session;
      if (!session) {
        setMessage("Sign in or create an account with the invited email, then open this link again.");
        return;
      }

      const res = await fetch("/api/team/accept", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setMessage("");
        setError(json.error || "Could not accept the invite.");
        return;
      }
      try {
        window.localStorage.removeItem("engineerit_post_auth_next");
      } catch {
        /* ignore */
      }
      setMessage("You are on the team. Consultant-tier access stays on while the team subscription is active.");
    }

    void accept();
    return () => {
      cancelled = true;
    };
  }, []);

  function goToAuth(path: "/login" | "/register") {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    const next = safeNextPath(`/team/join?token=${encodeURIComponent(token)}`, "/team/join");
    try {
      window.localStorage.setItem("engineerit_post_auth_next", next);
    } catch {
      /* ignore */
    }
    window.location.href = `${path}?next=${encodeURIComponent(next)}`;
  }

  return (
    <div className="app-shell">
      <NavSidebar
        isMobileOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />
      <div className="main">
        <Header onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)} />
        <div className="page-wrap">
          <h1 className="page-title">Join a team</h1>
          {message && <p style={{ fontSize: 15 }}>{message}</p>}
          {error && <p style={{ color: "#b91c1c", fontSize: 14 }}>{error}</p>}
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button type="button" className="btn" onClick={() => goToAuth("/login")}>
              Sign in
            </button>
            <button
              type="button"
              className="btn"
              style={{ background: "#111827", borderColor: "#111827" }}
              onClick={() => goToAuth("/register")}
            >
              Create account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
