"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const router = useRouter();

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (!data.session) {
        setErrorMessage("Unable to sign in. Please try again.");
        setLoading(false);
        return;
      }

      setSuccessMessage("Logged in. Redirecting to your profile...");
      setTimeout(() => {
        router.push("/profile");
      }, 1000);
    } catch (err) {
      console.error(err);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <NavSidebar
        isMobileOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />

      <div className="main">
        <Header onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)} />

        <div className="page-wrap">
          <h1 className="page-title">Sign in</h1>
          <p className="page-subtitle">
            Use your engineerit.ai account to access your chats and documents.
          </p>

          <form className="register-form" onSubmit={handleSubmit}>
            <h2 className="section-heading">Welcome back</h2>

            <div className="form-row">
              <label>
                Email address
                <input
                  type="email"
                  className="input"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                Password
                <input
                  type="password"
                  className="input"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            </div>

            {errorMessage && (
              <div
                style={{
                  marginBottom: 12,
                  fontSize: 13,
                  color: "#b91c1c",
                }}
              >
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div
                style={{
                  marginBottom: 12,
                  fontSize: 13,
                  color: "#15803d",
                }}
              >
                {successMessage}
              </div>
            )}

            <button className="btn" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <p
              style={{
                marginTop: 12,
                fontSize: 13,
                color: "#4b5563",
              }}
            >
              Don&apos;t have an account?{" "}
              <Link href="/register" className="link">
                Create one here
              </Link>
              .
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
