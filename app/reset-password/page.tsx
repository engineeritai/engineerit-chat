"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [ready, setReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const router = useRouter();

  useEffect(() => {
    let unsub: { data?: { subscription?: { unsubscribe: () => void } } } | null =
      null;

    const init = async () => {
      // If user clicked recovery email link, Supabase may emit PASSWORD_RECOVERY.
      unsub = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          setReady(true);
          setIsLoggedIn(true);
        }
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setIsLoggedIn(true);
        setReady(true);
        return;
      }

      // If not logged in, still allow if recovery session was created from email link
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setReady(true);
      } else {
        setReady(true); // show message (open from email)
      }
    };

    void init();

    return () => {
      try {
        unsub?.data?.subscription?.unsubscribe?.();
      } catch {}
    };
  }, []);

  const handleUpdate = async (e: any) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setSuccessMessage("Password updated successfully. Redirecting...");
      router.push("/profile");
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
          <h1 className="page-title">Reset password</h1>
          <p className="page-subtitle">
            {isLoggedIn
              ? "Set a new password for your account."
              : "If you opened this page from the reset email, you can set a new password now."}
          </p>

          <form className="register-form" onSubmit={handleUpdate}>
            <h2 className="section-heading">New password</h2>

            {!ready && (
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
                Loading…
              </div>
            )}

            <div className="form-row">
              <label>
                New password
                <input
                  type="password"
                  className="input"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                Confirm password
                <input
                  type="password"
                  className="input"
                  required
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </label>
            </div>

            {errorMessage && (
              <div style={{ marginBottom: 12, fontSize: 13, color: "#b91c1c" }}>
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div style={{ marginBottom: 12, fontSize: 13, color: "#15803d" }}>
                {successMessage}
              </div>
            )}

            <button className="btn" disabled={loading}>
              {loading ? "Updating…" : "Update password"}
            </button>

            {!isLoggedIn && (
              <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
                If you don’t have a reset email, go back and use{" "}
                <b>Forgot password</b> in the header login.
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
