"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LanguageToggle from "./LanguageToggle";
import { planById } from "@/lib/labels";
import { useMessages } from "@/lib/useMessages";
import { supabase } from "@/lib/supabaseClient";
import { PLAN_COLORS, PLAN_LABELS, type PlanId } from "@/lib/plans";
import { resolveEffectivePlan } from "@/lib/effectivePlan";

type HeaderProps = {
  onToggleSidebar: () => void;
};

type AuthPanelMode = "login" | "forgot";

export default function Header({ onToggleSidebar }: HeaderProps) {
  const [fullName, setFullName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [planId, setPlanId] = useState<PlanId>("assistant");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const [authPanelMode, setAuthPanelMode] = useState<AuthPanelMode>("login");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // forgot password
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);

  // cooldown to avoid rate limit (UI-side only)
  const [forgotCooldown, setForgotCooldown] = useState(0);

  // reset password (logged-in)
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPass1, setResetPass1] = useState("");
  const [resetPass2, setResetPass2] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const router = useRouter();
  const { locale, shell: s } = useMessages();
  const planName = (id: PlanId) => planById(locale, id).name;

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  function getInitials(name: string | null, fallbackEmail: string | null) {
    const base = name || fallbackEmail || "U";
    const parts = base.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0).toUpperCase() +
      parts[parts.length - 1].charAt(0).toUpperCase()
    );
  }

  // close popups on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) {
        setIsLoginOpen(false);
        setIsMenuOpen(false);
        setResetOpen(false);
        setAuthPanelMode("login");
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // cooldown timer
  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const t = window.setInterval(() => {
      setForgotCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [forgotCooldown]);

  // load user/profile
  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoggedIn(false);
        setFullName(null);
        setEmail(null);
        setAvatarUrl(null);
        setPlanId("assistant");
        return;
      }

      setIsLoggedIn(true);
      setEmail(user.email || null);

      let currentPlan: PlanId = "assistant";
      let name =
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        user.email?.split("@")[0] ??
        "";
      let avatar: string | null =
        (user.user_metadata?.avatar_url as string | undefined) ??
        (user.user_metadata?.picture as string | undefined) ??
        null;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (token) {
        await fetch("/api/team/claim", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && profile) {
        if (profile.full_name) name = profile.full_name;
        if (profile.avatar_url) avatar = profile.avatar_url;
      }

      currentPlan = await resolveEffectivePlan(supabase, user.id);

      setFullName(name || null);
      setAvatarUrl(avatar);
      setPlanId(currentPlan);
    };

    void load();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    setIsLoggedIn(false);
    setFullName(null);
    setEmail(null);
    setAvatarUrl(null);
    setPlanId("assistant");
    router.push("/");
  };

  const goTo = (path: string) => {
    setIsMenuOpen(false);
    setResetOpen(false);
    router.push(path);
  };

  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        setLoginError(error.message);
        setLoginLoading(false);
        return;
      }

      if (!data.user) {
        setLoginError(s.header.unableSignIn);
        setLoginLoading(false);
        return;
      }

      setIsLoggedIn(true);
      setEmail(data.user.email || null);

      let currentPlan: PlanId = "assistant";
      let name =
        (data.user.user_metadata?.full_name as string | undefined) ??
        (data.user.user_metadata?.name as string | undefined) ??
        data.user.email?.split("@")[0] ??
        "";
      let avatar: string | null =
        (data.user.user_metadata?.avatar_url as string | undefined) ??
        (data.user.user_metadata?.picture as string | undefined) ??
        null;

      if (data.session?.access_token) {
        await fetch("/api/team/claim", {
          method: "POST",
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        }).catch(() => null);
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!profileError && profile) {
        if (profile.full_name) name = profile.full_name;
        if (profile.avatar_url) avatar = profile.avatar_url;
      }

      currentPlan = await resolveEffectivePlan(supabase, data.user.id);

      setFullName(name || null);
      setAvatarUrl(avatar);
      setPlanId(currentPlan);

      setIsLoginOpen(false);
      setAuthPanelMode("login");
      setLoginEmail("");
      setLoginPassword("");
      setForgotMsg(null);

      let nextPath = "/profile";
      try {
        const stored = window.localStorage.getItem("engineerit_post_auth_next");
        if (stored) {
          window.localStorage.removeItem("engineerit_post_auth_next");
          nextPath = stored.startsWith("/") && !stored.startsWith("//") ? stored : "/profile";
        }
      } catch {
        /* ignore */
      }
      router.push(nextPath);
    } catch (err) {
      console.error(err);
      setLoginError(s.header.genericError);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoginError(null);
    setForgotMsg(null);

    if (forgotCooldown > 0) return;

    if (!loginEmail || !loginEmail.includes("@")) {
      setForgotMsg(s.header.enterEmail);
      return;
    }

    setForgotLoading(true);
    try {
      // ✅ FIX: always use production reset page
      const redirectTo = "https://engineerit.ai/reset-password";

      const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
        redirectTo,
      });

      // start cooldown regardless (prevents spam clicks)
      setForgotCooldown(60);

      if (error) {
        setForgotMsg(error.message);
        setForgotLoading(false);
        return;
      }

      setForgotMsg(s.header.resetSent);
    } catch (err) {
      console.error(err);
      setForgotMsg(s.header.genericError);
      setForgotCooldown(60);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordLoggedIn = async () => {
    setResetMsg(null);

    if (!resetPass1 || resetPass1.length < 6) {
      setResetMsg(s.header.passwordShort);
      return;
    }
    if (resetPass1 !== resetPass2) {
      setResetMsg(s.header.passwordMismatch);
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: resetPass1,
      });

      if (error) {
        setResetMsg(error.message);
        setResetLoading(false);
        return;
      }

      setResetMsg(s.header.passwordUpdated);
      setResetPass1("");
      setResetPass2("");
    } catch (err) {
      console.error(err);
      setResetMsg(s.header.genericError);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <header className="header">
      {/* LEFT: menu + logo */}
      <div className="header-left">
        {/* IMPORTANT: three lines button must always be inside header */}
        <button
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label={s.header.openMenu}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>

        <div className="brand" aria-label="engineerit">
          <span className="word">
            <span className="engineer">engineer</span>
            <span className="it">it</span>
          </span>
        </div>
      </div>

      {/* RIGHT */}
      <div
        className="header-right"
        ref={dropdownRef}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "relative",
        }}
      >
        <LanguageToggle />
        {/* NOT LOGGED IN */}
        {!isLoggedIn && (
          <>
            <button
              type="button"
              onClick={() => {
                setIsLoginOpen((v) => !v);
                setIsMenuOpen(false);
                setResetOpen(false);
                setAuthPanelMode("login");
                setLoginError(null);
                setForgotMsg(null);
              }}
              style={{
                padding: "6px 14px",
                backgroundColor: "#2563eb",
                color: "white",
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              {s.header.login}
            </button>

            {isLoginOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "110%",
                  right: 0,
                  minWidth: 280,
                  backgroundColor: "white",
                  borderRadius: 16,
                  boxShadow: "0 10px 25px rgba(15, 23, 42, 0.18)",
                  padding: 10,
                  zIndex: 90,
                  border: "1px solid rgba(148,163,184,0.3)",
                }}
              >
                {authPanelMode === "login" ? (
                  <form onSubmit={handleInlineLogin}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        marginBottom: 8,
                        color: "#111827",
                      }}
                    >
                      {s.header.signInTitle}
                    </div>

                    <div style={{ marginBottom: 6 }}>
                      <input
                        type="email"
                        required
                        placeholder={s.header.email}
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          borderRadius: 8,
                          border: "1px solid #d1d5db",
                          fontSize: 13,
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: 6 }}>
                      <input
                        type="password"
                        required
                        placeholder={s.header.password}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          borderRadius: 8,
                          border: "1px solid #d1d5db",
                          fontSize: 13,
                        }}
                      />
                    </div>

                    {loginError && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#b91c1c",
                          marginBottom: 4,
                        }}
                      >
                        {loginError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loginLoading}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: 999,
                        border: "none",
                        backgroundColor: "#2563eb",
                        color: "white",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {loginLoading ? s.header.signingIn : s.header.signIn}
                    </button>

                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setAuthPanelMode("forgot");
                          setLoginError(null);
                          setForgotMsg(null);
                        }}
                        style={{
                          border: "none",
                          background: "none",
                          padding: 0,
                          margin: 0,
                          color: "#2563eb",
                          cursor: "pointer",
                          textDecoration: "underline",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {s.header.forgot}
                      </button>
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 11,
                        color: "#6b7280",
                        textAlign: "center",
                      }}
                    >
                      {s.header.noAccount}{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setIsLoginOpen(false);
                          router.push("/register");
                        }}
                        style={{
                          border: "none",
                          background: "none",
                          padding: 0,
                          margin: 0,
                          color: "#2563eb",
                          cursor: "pointer",
                          textDecoration: "underline",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {s.header.register}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        marginBottom: 8,
                        color: "#111827",
                      }}
                    >
                      {s.header.resetTitle}
                    </div>

                    <div style={{ marginBottom: 6 }}>
                      <input
                        type="email"
                        required
                        placeholder={s.header.yourEmail}
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          borderRadius: 8,
                          border: "1px solid #d1d5db",
                          fontSize: 13,
                        }}
                      />
                    </div>

                    {forgotMsg && (
                      <div
                        style={{
                          fontSize: 12,
                          color: forgotMsg === s.header.resetSent
                            ? "#15803d"
                            : "#b91c1c",
                          marginBottom: 6,
                        }}
                      >
                        {forgotMsg}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={forgotLoading || forgotCooldown > 0}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: 999,
                        border: "none",
                        backgroundColor: "#2563eb",
                        color: "white",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        opacity: forgotLoading || forgotCooldown > 0 ? 0.7 : 1,
                      }}
                    >
                      {forgotLoading
                        ? s.header.sending
                        : forgotCooldown > 0
                        ? s.header.tryAgain.replace("{seconds}", String(forgotCooldown))
                        : s.header.sendReset}
                    </button>

                    <div style={{ marginTop: 8, textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthPanelMode("login");
                          setForgotMsg(null);
                        }}
                        style={{
                          border: "none",
                          background: "none",
                          padding: 0,
                          margin: 0,
                          color: "#6b7280",
                          cursor: "pointer",
                          textDecoration: "underline",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {s.header.backToLogin}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* LOGGED IN */}
        {isLoggedIn && (
          <>
            <span
              style={{
                backgroundColor: PLAN_COLORS[planId],
                color: "white",
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {planName(planId)}
            </span>

            <button
              type="button"
              onClick={() => {
                setIsMenuOpen((v) => !v);
                setIsLoginOpen(false);
              }}
              style={{
                width: 36,
                height: 24,
                borderRadius: "9999px",
                backgroundColor: avatarUrl ? "transparent" : "#cfd0d4ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: 13,
                color: "#374151",
                border: "none",
                cursor: "pointer",
                overflow: "hidden",
              }}
              aria-label={s.header.accountMenu}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={s.header.profileAlt}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                getInitials(fullName, email)
              )}
            </button>

            {isMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "110%",
                  right: 0,
                  minWidth: 240,
                  backgroundColor: "white",
                  borderRadius: 16,
                  boxShadow: "0 10px 25px rgba(15, 23, 42, 0.18)",
                  padding: 8,
                  zIndex: 90,
                  border: "1px solid rgba(148,163,184,0.3)",
                }}
              >
                <div
                  style={{
                    padding: "6px 10px 8px",
                    borderBottom: "1px solid rgba(226,232,240,0.9)",
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#111827",
                    }}
                  >
                    {fullName || email}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#6b7280",
                      marginTop: 2,
                    }}
                  >
                    {planName(planId)} {s.header.planSuffix}
                  </div>
                </div>

                <button type="button" onClick={() => goTo("/profile")} style={menuItemStyle}>
                  {s.header.myProfile}
                </button>

                <button type="button" onClick={() => goTo("/register")} style={menuItemStyle}>
                  {s.header.plansRegistration}
                </button>

                <button type="button" onClick={() => goTo("/pricing")} style={menuItemStyle}>
                  Pricing
                </button>

                <button type="button" onClick={() => goTo("/account/team")} style={menuItemStyle}>
                  Team
                </button>

                <button type="button" onClick={() => goTo("/subscription")} style={menuItemStyle}>
                  {s.header.subscribe}
                </button>

                <div
                  style={{
                    borderTop: "1px solid rgba(226,232,240,0.9)",
                    margin: "6px 0",
                  }}
                />

                <button
                  type="button"
                  onClick={() => {
                    setResetOpen((v) => !v);
                    setResetMsg(null);
                  }}
                  style={menuItemStyle}
                >
                  {s.header.resetPassword}
                </button>

                {resetOpen && (
                  <div
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid rgba(226,232,240,0.9)",
                      margin: "6px 0",
                      background: "#f9fafb",
                    }}
                  >
                    <input
                      type="password"
                      placeholder={s.header.newPassword}
                      value={resetPass1}
                      onChange={(e) => setResetPass1(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: 8,
                        border: "1px solid #d1d5db",
                        fontSize: 13,
                        marginBottom: 6,
                      }}
                    />
                    <input
                      type="password"
                      placeholder={s.header.confirmPassword}
                      value={resetPass2}
                      onChange={(e) => setResetPass2(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: 8,
                        border: "1px solid #d1d5db",
                        fontSize: 13,
                        marginBottom: 6,
                      }}
                    />

                    {resetMsg && (
                      <div
                        style={{
                          fontSize: 12,
                          marginBottom: 6,
                          color: resetMsg.includes("success")
                            ? "#15803d"
                            : "#b91c1c",
                        }}
                      >
                        {resetMsg}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleResetPasswordLoggedIn}
                      disabled={resetLoading}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: 999,
                        border: "none",
                        backgroundColor: "#2563eb",
                        color: "white",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {resetLoading ? s.header.updating : s.header.updatePassword}
                    </button>

                    <button
                      type="button"
                      onClick={() => setResetOpen(false)}
                      style={{
                        marginTop: 6,
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: 999,
                        border: "1px solid #e5e7eb",
                        backgroundColor: "white",
                        color: "#374151",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {s.chat.close}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    ...menuItemStyle,
                    color: "#b91c1c",
                    fontWeight: 600,
                  }}
                >
                  {s.header.logout}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </header>
  );
}

const menuItemStyle: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  padding: "6px 10px",
  fontSize: 13,
  background: "none",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  color: "#111827",
};
