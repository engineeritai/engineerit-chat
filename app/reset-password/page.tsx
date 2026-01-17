"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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
  const searchParams = useSearchParams();

  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const code = useMemo(() => searchParams?.get("code") || "", [searchParams]);

  // 1) Accept both Supabase styles:
  // - PKCE: ?code=...
  // - Implicit: #access_token=...&refresh_token=...&type=recovery
  useEffect(() => {
    const run = async () => {
      try {
        setStatus("Preparing your reset session…");

        // A) PKCE flow
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

        // B) Hash token flow
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

        setStatus("Invalid or expired reset link. Please request a new one.");
        setReady(true);
      } catch (e) {
        console.error(e);
        setStatus("Something went wrong. Please request a new reset link.");
        setReady(true);
      }
    };

    void run();
  }, [code]);

  const onSave = async () => {
    setMsg(null);

    if (!p1 || p1.length < 6) {
      setMsg("Password must be at least 6 characters.");
      return;
    }
    if (p1 !== p2) {
      setMsg("Passwords do not match.");
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

      setMsg("Password updated successfully. Redirecting…");
      setTimeout(() => router.push("/"), 800);
    } catch (e) {
      console.error(e);
      setMsg("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-wrap" style={{ maxWidth: 520 }}>
      <div className="card" style={{ padding: 18 }}>
        <div className="page-title" style={{ fontSize: 22, marginBottom: 6 }}>
          Reset password
        </div>
        <div className="page-subtitle" style={{ marginBottom: 14 }}>
          Set a new password for your engineerit.ai account.
        </div>

        {!ready ? (
          <div style={{ color: "#6b7280", fontSize: 14 }}>
            {status || "Loading…"}
          </div>
        ) : status ? (
          <div style={{ color: "#b91c1c", fontSize: 14 }}>{status}</div>
        ) : (
          <>
            <div className="form-row">
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                New password
              </label>
              <input
                className="input"
                type="password"
                value={p1}
                onChange={(e) => setP1(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>

            <div className="form-row">
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                Confirm password
              </label>
              <input
                className="input"
                type="password"
                value={p2}
                onChange={(e) => setP2(e.target.value)}
                placeholder="Repeat the new password"
              />
            </div>

            {msg && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: msg.includes("successfully") ? "#15803d" : "#b91c1c",
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
              {saving ? "Saving…" : "Update password"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
