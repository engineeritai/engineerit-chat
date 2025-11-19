"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getURL } from "@/lib/getURL";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${getURL()}/auth/confirmed`,
        },
      });

      if (error) throw error;

      setMessage(
        "تم تسجيلك بنجاح. الرجاء فتح البريد الإلكتروني وتأكيده، بعد ذلك يمكنك تسجيل الدخول."
      );
    } catch (err: any) {
      setMessage(err.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#020617",
    padding: "16px",
  };

  const cardStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: "420px",
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 18px 45px rgba(0,0,0,0.6)",
    color: "#fff",
    fontFamily: "inherit",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "24px",
    fontWeight: 600,
    marginBottom: "4px",
    textAlign: "center",
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "#9ca3af",
    marginBottom: "20px",
    textAlign: "center",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "13px",
    color: "#e5e7eb",
    marginBottom: "4px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.16)",
    backgroundColor: "rgba(15,23,42,0.85)",
    color: "#f9fafb",
    fontSize: "13px",
    padding: "8px 10px",
    outline: "none",
    boxSizing: "border-box",
  };

  const buttonStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: "10px",
    border: "none",
    backgroundColor: "#ffffff",
    color: "#000000",
    fontWeight: 600,
    fontSize: "13px",
    padding: "9px 10px",
    cursor: "pointer",
    opacity: loading ? 0.7 : 1,
  };

  const smallTextStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "#d1d5db",
    marginTop: "12px",
    textAlign: "center",
  };

  const linkStyle: React.CSSProperties = {
    color: "#9ca3af",
    textDecoration: "none",
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>engineerit.ai</h1>
        <p style={subtitleStyle}>Create a new account</p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              required
              style={inputStyle}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              required
              style={inputStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? "Please wait..." : "Register"}
          </button>
        </form>

        {message && (
          <p style={{ ...smallTextStyle, marginTop: "10px" }}>{message}</p>
        )}

        <p style={smallTextStyle}>
          Already have an account?{" "}
          <Link href="/auth/login" style={linkStyle}>
            Login →
          </Link>
        </p>
      </div>
    </div>
  );
}
