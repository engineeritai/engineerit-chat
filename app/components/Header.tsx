"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type HeaderProps = {
  onToggleSidebar: () => void;
};

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

const PLAN_LABELS: Record<PlanId, string> = {
  assistant: "Assistant",
  engineer: "Engineer",
  professional: "Professional",
  consultant: "Consultant",
};

const PLAN_COLORS: Record<PlanId, string> = {
  assistant: "#2563eb",
  engineer: "#f97316",
  professional: "#0f766e",
  consultant: "#7c3aed",
};

export default function Header({ onToggleSidebar }: HeaderProps) {
  const [fullName, setFullName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [planId, setPlanId] = useState<PlanId>("assistant");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const router = useRouter();

  function getInitials(name: string | null, fallbackEmail: string | null) {
    const base = name || fallbackEmail || "U";
    const parts = base.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0).toUpperCase() +
      parts[parts.length - 1].charAt(0).toUpperCase()
    );
  }

  // تحميل بيانات المستخدم والبروفايل من Supabase فقط
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

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, subscription_tier")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && profile) {
        if (profile.full_name) name = profile.full_name;
        if (profile.avatar_url) avatar = profile.avatar_url;
        if (
          profile.subscription_tier &&
          ["assistant", "engineer", "professional", "consultant"].includes(
            profile.subscription_tier
          )
        ) {
          currentPlan = profile.subscription_tier as PlanId;
        }
      }

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
        setLoginError("Unable to sign in. Please try again.");
        setLoginLoading(false);
        return;
      }

      // بعد تسجيل الدخول، حمّل البروفايل بنفس المنطق
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

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, subscription_tier")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!profileError && profile) {
        if (profile.full_name) name = profile.full_name;
        if (profile.avatar_url) avatar = profile.avatar_url;
        if (
          profile.subscription_tier &&
          ["assistant", "engineer", "professional", "consultant"].includes(
            profile.subscription_tier
          )
        ) {
          currentPlan = profile.subscription_tier as PlanId;
        }
      }

      setFullName(name || null);
      setAvatarUrl(avatar);
      setPlanId(currentPlan);

      setIsLoginOpen(false);
      setLoginEmail("");
      setLoginPassword("");
      router.push("/profile");
    } catch (err) {
      console.error(err);
      setLoginError("Something went wrong. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <header className="header">
      {/* LEFT: menu + logo */}
      <div className="header-left">
        <button
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Open menu"
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
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "relative",
        }}
      >
        {/* NOT LOGGED IN */}
        {!isLoggedIn && (
          <>
            <button
              onClick={() => {
                setIsLoginOpen((v) => !v);
                setIsMenuOpen(false);
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
              Login
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
                  zIndex: 50,
                  border: "1px solid rgba(148,163,184,0.3)",
                }}
              >
                <form onSubmit={handleInlineLogin}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 8,
                      color: "#111827",
                    }}
                  >
                    Sign in to engineerit.ai
                  </div>

                  {/* Email */}
                  <div style={{ marginBottom: 6 }}>
                    <input
                      type="email"
                      required
                      placeholder="Email"
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

                  {/* Password */}
                  <div style={{ marginBottom: 6 }}>
                    <input
                      type="password"
                      required
                      placeholder="Password"
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
                    {loginLoading ? "Signing in…" : "Sign in"}
                  </button>

                  {/* Register link */}
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 11,
                      color: "#6b7280",
                      textAlign: "center",
                    }}
                  >
                    Don&apos;t have an account?{" "}
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
                      Register
                    </button>
                  </div>
                </form>
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
              {PLAN_LABELS[planId]}
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
              aria-label="Account menu"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Profile"
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
                  minWidth: 220,
                  backgroundColor: "white",
                  borderRadius: 16,
                  boxShadow: "0 10px 25px rgba(15, 23, 42, 0.18)",
                  padding: 8,
                  zIndex: 50,
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
                    {PLAN_LABELS[planId]} plan
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => goTo("/profile")}
                  style={menuItemStyle}
                >
                  My Profile
                </button>

                <button
                  type="button"
                  onClick={() => goTo("/register")}
                  style={menuItemStyle}
                >
                  Plans &amp; Registration
                </button>

                <button
                  type="button"
                  onClick={() => goTo("/subscription")}
                  style={menuItemStyle}
                >
                  Subscribe / Upgrade
                </button>

                <div
                  style={{
                    borderTop: "1px solid rgba(226,232,240,0.9)",
                    margin: "4px 0",
                  }}
                />

                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    ...menuItemStyle,
                    color: "#b91c1c",
                    fontWeight: 600,
                  }}
                >
                  Sign out
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
