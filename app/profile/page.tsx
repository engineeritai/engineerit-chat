"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import { supabase } from "@/lib/supabaseClient";
import SubscribeButton from "../components/SubscribeButton";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

export default function ProfilePage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  const [fullName, setFullName] = useState("Engineer User");
  const [email, setEmail] = useState("you@example.com");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [planId, setPlanId] = useState<PlanId>("assistant");
  const [billingCountry, setBillingCountry] = useState<string>("");
  const [billingCurrency, setBillingCurrency] = useState<string>("SAR");
  const [planStartedAt, setPlanStartedAt] = useState<string | null>(null);
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const router = useRouter();

  const planLabels: Record<PlanId, string> = {
    assistant: "Assistant Engineer",
    engineer: "Engineer",
    professional: "Professional Engineer",
    consultant: "Consultant Engineer",
  };

  const planBadgeColors: Record<PlanId, string> = {
    assistant: "#2563eb",
    engineer: "#f97316",
    professional: "#0f766e",
    consultant: "#7c3aed",
  };

  const currentPlanLabel = planLabels[planId];
  const currentPlanColor = planBadgeColors[planId];

  function getInitials(name: string) {
    if (!name) return "EN";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0).toUpperCase() +
      parts[parts.length - 1].charAt(0).toUpperCase()
    );
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
  };

  // Load user + profile from Supabase on first render
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setErrorMessage(null);

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("getUser error:", error);
        setErrorMessage("Could not load user. Please try again.");
        setLoading(false);
        return;
      }

      if (!user) {
        router.push("/register");
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          "full_name, avatar_url, plan, billing_country, billing_currency, plan_started_at, plan_expires_at"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("profile load error:", profileError);
      } else if (profileData) {
        setFullName(profileData.full_name || "Engineer User");
        if (profileData.avatar_url) {
          setPhotoPreview(profileData.avatar_url);
        }

        if (profileData.plan) {
          setPlanId(profileData.plan as PlanId);
        }

        if (profileData.billing_country) {
          setBillingCountry(profileData.billing_country);
        }

        if (profileData.billing_currency) {
          setBillingCurrency(profileData.billing_currency);
        } else {
          setBillingCurrency("SAR");
        }

        if (profileData.plan_started_at) {
          setPlanStartedAt(profileData.plan_started_at);
        }
        if (profileData.plan_expires_at) {
          setPlanExpiresAt(profileData.plan_expires_at);
        }
      }

      setLoading(false);
    };

    void loadProfile();
  }, [router]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          avatar_url: photoPreview,
          plan: planId,
          billing_country: billingCountry || null,
          billing_currency: billingCurrency || "SAR",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        console.error("profile update error:", error);
        setErrorMessage("Could not save changes. Please try again.");
      } else {
        setMessage("Profile updated.");

        // Cache in localStorage for the Header
        try {
          window.localStorage.setItem(
            "engineerit_profile",
            JSON.stringify({
              fullName,
              email,
              avatarUrl: photoPreview,
              planId,
            })
          );
        } catch (err) {
          console.error("Failed to cache profile locally:", err);
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Unexpected error while saving.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="app-shell">
        <NavSidebar
          isMobileOpen={isSidebarOpenMobile}
          onCloseMobile={() => setIsSidebarOpenMobile(false)}
        />
        <div className="main">
          <Header onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)} />
          <div className="page-wrap">
            <p className="page-subtitle">Loading your profile…</p>
          </div>
        </div>
      </div>
    );
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
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">
            Update your personal information and review your plan and activity
            in engineerit.ai.
          </p>

          {/* Top section (Avatar + Plan Badge) */}
          <section className="card" style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 16,
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "9999px",
                  overflow: "hidden",
                  backgroundColor: "#e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                  fontSize: 20,
                  color: "#374151",
                }}
              >
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreview}
                    alt="Profile"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  getInitials(fullName)
                )}
              </div>

              {/* Name + email + plan */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  {fullName || "Your Name"}
                </div>
                <div
                  style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}
                >
                  {email}
                </div>

                <span
                  style={{
                    backgroundColor: currentPlanColor,
                    color: "white",
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {currentPlanLabel}
                </span>
              </div>

              {/* Plan timing (optional, read-only for now) */}
              <div style={{ minWidth: 200, fontSize: 12, color: "#6b7280" }}>
                {planStartedAt && (
                  <div>
                    <strong>Plan started:</strong>{" "}
                    {new Date(planStartedAt).toLocaleDateString()}
                  </div>
                )}
                {planExpiresAt && (
                  <div>
                    <strong>Plan renews:</strong>{" "}
                    {new Date(planExpiresAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Main sections */}
          <div className="profile-grid">
            {/* Personal Info */}
            <section className="card">
              <h2 className="section-heading">Personal information</h2>

              <div className="form-row">
                <label>
                  Full name
                  <input
                    className="input"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Email address (from login)
                  <input
                    className="input"
                    type="email"
                    value={email}
                    readOnly
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Profile photo
                  <input
                    className="input"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                  />
                </label>
                <p
                  style={{
                    fontSize: 11,
                    color: "#6b7280",
                    marginTop: 4,
                    marginBottom: 0,
                  }}
                >
                  (Image is stored for your account and used in the header.)
                </p>
              </div>

              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginTop: 16,
                  marginBottom: 8,
                }}
              >
                Billing details (for future subscriptions)
              </h3>

              <div className="form-row">
                <label>
                  Billing country / region
                  <input
                    className="input"
                    type="text"
                    placeholder="e.g. Saudi Arabia"
                    value={billingCountry}
                    onChange={(e) => setBillingCountry(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Billing currency
                  <input
                    className="input"
                    type="text"
                    value={billingCurrency}
                    onChange={(e) => setBillingCurrency(e.target.value)}
                  />
                </label>
                <p
                  style={{
                    fontSize: 11,
                    color: "#6b7280",
                    marginTop: 4,
                    marginBottom: 0,
                  }}
                >
                  Default is SAR. In the future this will be used to localize
                  your pricing.
                </p>
              </div>

              {errorMessage && (
                <p
                  style={{
                    color: "#b91c1c",
                    fontSize: 13,
                    marginTop: 8,
                    marginBottom: 0,
                  }}
                >
                  {errorMessage}
                </p>
              )}
              {message && (
                <p
                  style={{
                    color: "#15803d",
                    fontSize: 13,
                    marginTop: 8,
                    marginBottom: 0,
                  }}
                >
                  {message}
                </p>
              )}

              <button className="btn" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </section>

            {/* Activity / Plan info */}
            <section className="card">
              <h2 className="section-heading">Plan & activity</h2>
              <p className="page-subtitle" style={{ marginBottom: 10 }}>
                Your current plan controls which engineer tools and limits are
                available in the main chat.
              </p>

              <div className="form-row">
                <label>
                  Subscription plan
                  <select
                    className="input"
                    value={planId}
                    onChange={(e) =>
                      setPlanId(
                        e.target.value as
                          | "assistant"
                          | "engineer"
                          | "professional"
                          | "consultant"
                      )
                    }
                  >
                    <option value="assistant">Assistant Engineer</option>
                    <option value="engineer">Engineer</option>
                    <option value="professional">
                      Professional Engineer
                    </option>
                    <option value="consultant">Consultant Engineer</option>
                  </select>
                </label>
                <p
                  style={{
                    fontSize: 11,
                    color: "#6b7280",
                    marginTop: 4,
                    marginBottom: 0,
                  }}
                >
                  In production, this will be controlled by your paid
                  subscription and cannot be changed manually.
                </p>
              </div>

              {/* Upgrade buttons */}
              <div className="form-row" style={{ marginTop: 12 }}>
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  Upgrade your plan
                </h3>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {userId && planId === "assistant" && (
                    <>
                      <SubscribeButton
                        planId="engineer"
                        label="Upgrade to Engineer"
                        userId={userId}
                      />
                      <SubscribeButton
                        planId="professional"
                        label="Upgrade to Professional"
                        userId={userId}
                      />
                      <SubscribeButton
                        planId="consultant"
                        label="Upgrade to Consultant"
                        userId={userId}
                      />
                    </>
                  )}

                  {userId && planId === "engineer" && (
                    <>
                      <SubscribeButton
                        planId="professional"
                        label="Upgrade to Professional"
                        userId={userId}
                      />
                      <SubscribeButton
                        planId="consultant"
                        label="Upgrade to Consultant"
                        userId={userId}
                      />
                    </>
                  )}

                  {userId && planId === "professional" && (
                    <SubscribeButton
                      planId="consultant"
                      label="Upgrade to Consultant"
                      userId={userId}
                    />
                  )}
                  {/* If already consultant, no upgrade buttons */}
                </div>
              </div>
              {/* END upgrade block */}

              <hr
                style={{
                  border: 0,
                  borderTop: "1px solid #e5e7eb",
                  margin: "12px 0",
                }}
              />

              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                Coming soon
              </h3>

              <ul className="plan-features">
                <li>View previous chat histories per project/thread</li>
                <li>
                  Access generated files (Word, Excel, PowerPoint, PDFs, etc.)
                </li>
                <li>Track engineering drawings processed by engineerit.ai</li>
                <li>
                  Manage invoices and subscription status for each plan level
                </li>
              </ul>

              <p
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  marginTop: 8,
                }}
              >
                These features will be connected to Supabase storage and
                subscription logic as we finalize the production setup.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
