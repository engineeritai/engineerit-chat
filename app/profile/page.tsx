"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import { supabase } from "@/lib/supabaseClient";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

export default function ProfilePage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  const [fullName, setFullName] = useState("Engineer User");
  const [email, setEmail] = useState("you@example.com");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [planId, setPlanId] = useState<PlanId>("assistant");

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const router = useRouter();

  const planLabels: Record<PlanId, string> = {
    assistant: "Assistant Engineer (Free)",
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

  const planDescriptions: Record<PlanId, string> = {
    assistant:
      "Default free plan. Basic chat access and limited engineering assistance.",
    engineer:
      "Advanced engineer-focused tools, document analysis, and priority responses. Will be activated after official launch.",
    professional:
      "Extended tools for senior engineers, team collaboration, and advanced reporting. Coming soon.",
    consultant:
      "High-end tier for consulting engineers with advanced features and extended limits. Coming soon.",
  };

  const currentPlanLabel = planLabels[planId];
  const currentPlanColor = planBadgeColors[planId];
  const currentPlanDescription = planDescriptions[planId];

  function getInitials(name: string) {
    if (!name) return "EN";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0).toUpperCase() +
      parts[parts.length - 1].charAt(0).toUpperCase()
    );
  }

  // تحميل بيانات المستخدم + البروفايل من Supabase أو localStorage
  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const { data: sessionData } = await supabase.auth.getSession();

        if (!sessionData?.session) {
          router.replace("/auth/login");
          return;
        }

        const user = sessionData.session.user;

        if (!user) {
          router.replace("/auth/login");
          return;
        }

        setUserId(user.id);
        setEmail(user.email ?? "");

        let loadedFromDb = false;

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Profile load error:", profileError);
        } else if (profileData) {
          loadedFromDb = true;
          setFullName(profileData.full_name || "Engineer User");
          if (profileData.plan) {
            setPlanId(profileData.plan as PlanId);
          }
          if (profileData.avatar_url) {
            setPhotoPreview(profileData.avatar_url);
          }
        }

        // لو ما قدرنا نحمل من DB، نحاول من localStorage كنسخة احتياطية
        if (!loadedFromDb) {
          try {
            const cached = window.localStorage.getItem("engineerit_profile");
            if (cached) {
              const parsed = JSON.parse(cached) as {
                fullName?: string;
                email?: string;
                avatarUrl?: string;
                planId?: PlanId;
              };
              if (parsed.fullName) setFullName(parsed.fullName);
              if (parsed.email) setEmail(parsed.email);
              if (parsed.avatarUrl) setPhotoPreview(parsed.avatarUrl);
              if (parsed.planId) setPlanId(parsed.planId);
            }
          } catch (err) {
            console.error("Failed to read cached profile:", err);
          }
        }
      } catch (err) {
        console.error("Profile loading error:", err);
        setErrorMessage("Could not load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, [router]);

  // رفع الصورة → نخزنها كـ data URL في الذاكرة، ثم نحفظها في Supabase + localStorage عند الحفظ
  const handlePhotoUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPhotoPreview(result);
    };
    reader.readAsDataURL(file);
  };

  // حفظ البيانات في جدول profiles + تخزين نسخة في localStorage
  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const payload = {
        id: userId,
        full_name: fullName,
        email: email,
        plan: planId,
        avatar_url: photoPreview ?? null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(payload);

      if (error) {
        console.error("Profile upsert error:", error);
        setErrorMessage("Could not save changes. Please try again.");
      } else {
        setMessage("Profile updated.");

        // نخزن نسخة في localStorage لاستخدامها في الهيدر والتحميل السريع
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
          console.error("Failed to cache profile:", err);
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
            Update your personal information and review your current plan in
            engineerit.ai.
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

              {/* Name + email + plan badge */}
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
                  Email address
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
              </div>

              {/* Subscription selector (pre-launch) */}
              <div className="form-row">
                <label>
                  Subscription (pre-launch)
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
                    <option value="assistant">
                      Assistant Engineer (Free default)
                    </option>
                    <option value="engineer">
                      Engineer (will be activated after launch)
                    </option>
                    <option value="professional" disabled>
                      Professional Engineer (coming soon)
                    </option>
                    <option value="consultant" disabled>
                      Consultant Engineer (coming soon)
                    </option>
                  </select>
                </label>
                <p
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginTop: 4,
                    marginBottom: 0,
                  }}
                >
                  Plan changes will be fully controlled by the subscription
                  system after official launch.
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

            {/* Current Subscription Details */}
            <section className="card">
              <h2 className="section-heading">Current subscription</h2>

              <p className="page-subtitle" style={{ marginBottom: 8 }}>
                This reflects your current plan stored in engineerit.ai profile.
              </p>

              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  {currentPlanLabel}
                </div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  {currentPlanDescription}
                </div>
              </div>

              <ul className="plan-features">
                {planId === "assistant" && (
                  <>
                    <li>Basic AI chat access</li>
                    <li>Limited engineering assistance</li>
                    <li>Single-user usage</li>
                  </>
                )}
                {planId === "engineer" && (
                  <>
                    <li>Engineer tools bar inside chat</li>
                    <li>Document analysis for engineering files</li>
                    <li>Priority responses and extended limits</li>
                  </>
                )}
                {planId === "professional" && (
                  <>
                    <li>Advanced reporting and templates</li>
                    <li>Team and project-level features</li>
                    <li>Higher limits and priority support</li>
                  </>
                )}
                {planId === "consultant" && (
                  <>
                    <li>Full access to all features</li>
                    <li>Consulting-focused workflows</li>
                    <li>Maximum limits and premium support</li>
                  </>
                )}
              </ul>

              <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
                Detailed billing and subscription management will be enabled
                approximately two weeks after the official launch.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
