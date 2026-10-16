"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useMessages } from "@/lib/useMessages";
import LanguageToggle from "@/app/components/LanguageToggle";

function parseHashParams(hash: string) {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  const p = new URLSearchParams(h);
  const access_token = p.get("access_token") || "";
  const refresh_token = p.get("refresh_token") || "";
  const type = p.get("type") || "";
  return { access_token, refresh_token, type };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const { shell: s } = useMessages();

  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // IMPORTANT: do all URL reading inside useEffect (client only)
  useEffect(() => {
    const run = async () => {
      try {
        setStatus(s.header.sending);

        // A) PKCE flow: ?code=...
        const code =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("code") || ""
            : "";

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setStatus(error.message);
            setReady(true);
            return;
          }
          // clean URL
          window.history.replaceState({}, "", "/reset-password");
          setStatus(null);
          setReady(true);
          return;
        }

        // B) Hash token flow: #access_token=...&refresh_token=...&type=recovery
        const { access_token, refresh_token } = parseHashParams(
          typeof window !== "undefined" ? window.location.hash : ""
        );

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) {
            setStatus(error.message);
            setReady(true);
            return;
          }
          // clean hash
          window.history.replaceState({}, "", "/reset-password");
          setStatus(null);
          setReady(true);
          return;
        }

        setStatus(s.header.genericError);
        setReady(true);
      } catch (e) {
        console.error(e);
        setStatus(s.header.genericError);
        setReady(true);
      }
    };

    void run();
  }, []);

  const onSave = async () => {
    setMsg(null);

    if (!p1 || p1.length < 6) {
      setMsg(s.header.passwordShort);
      return;
    }
    if (p1 !== p2) {
      setMsg(s.header.passwordMismatch);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: p1 });
      if (error) {
        setMsg(error.message);
        setSaving(false);
        return;
      }

      setMsg(s.header.passwordUpdated);
      setTimeout(() => router.push("/"), 800);
    } catch (e) {
      console.error(e);
      setMsg(s.header.genericError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-wrap" style={{ maxWidth: 520 }}>
      <div className="card" style={{ padding: 18 }}>
        <LanguageToggle />
        <div className="page-title" style={{ fontSize: 22, marginBottom: 6 }}>
          {s.header.resetPassword}
        </div>
        <div className="page-subtitle" style={{ marginBottom: 14 }}>
          {s.header.resetTitle}
        </div>

        {!ready ? (
          <div style={{ color: "#6b7280", fontSize: 14 }}>
            {status || s.profile.loading}
          </div>
        ) : status ? (
          <div style={{ color: "#b91c1c", fontSize: 14 }}>{status}</div>
        ) : (
          <>
            <div className="form-row">
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                {s.header.newPassword}
              </label>
              <input
                className="input"
                type="password"
                value={p1}
                onChange={(e) => setP1(e.target.value)}
                placeholder={s.header.passwordShort}
              />
            </div>

            <div className="form-row">
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                {s.header.confirmPassword}
              </label>
              <input
                className="input"
                type="password"
                value={p2}
                onChange={(e) => setP2(e.target.value)}
                placeholder={s.header.confirmPassword}
              />
            </div>

            {msg && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: msg === s.header.passwordUpdated ? "#15803d" : "#b91c1c",
                }}
              >
                {msg}
              </div>
            )}

            <button
              type="button"
              className="btn w-full"
              onClick={onSave}
              disabled={saving}
              style={{ marginTop: 12 }}
            >
              {saving ? s.header.updating : s.header.updatePassword}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
