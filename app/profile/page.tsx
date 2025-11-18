"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import { supabase } from "@/lib/supabaseClient";

export default function ProfilePage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  const [fullName, setFullName] = useState("Engineer User");
  const [email, setEmail] = useState("you@example.com");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [planId, setPlanId] = useState<
    "assistant" | "engineer" | "professional" | "consultant"
  >("assistant");

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const router = useRouter();

  const planLabels: Record<string, string> = {
    assistant: "Assistant Engineer",
    engineer: "Engineer",
    professional: "Professional Engineer",
    consultant: "Consultant Engineer",
  };

  const planBadgeColors: Record<string, string> = {
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

  // Handle image upload (local preview only for now)
  const handlePhotoUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file)); // instant display (not yet stored in Supabase)
  };

  // 🔹 Load user + profile from Supabase on first render
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
        // Not logged in → go to register
        router.push("/register");
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");

      // Load profile row
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("profile load error:", profileError);
      } else if (profileData) {
        setFullName(profileData.full_name || "Engineer User");
        if (profileData.plan) {
          setPlanId(profileData.plan);
        }
        if (profileData.avatar_url) {
          setPhotoPreview(profileData.avatar_url);
        }
      }

      setLoading(false);
    };

    loadProfile();
  }, [router]);

  // 🔹 Save changes (update profiles table only for now)
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
          // avatar_url: will be wired when we connect Storage
          plan: planId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        console.error("profile update error:", error);
        setErrorMessage("Could not save changes. Please try again.");
      } else {
        setMessage("Profile updated.");
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
            Update your personal information and review your activity in
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
              </div>

              {/* Plan selector (optional, mostly for debugging now) */}
              <div className="form-row">
                <label>
                  Subscription
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
                    <option value="professional" disabled>
                      Professional Engineer (coming soon)
                    </option>
                    <option value="consultant" disabled>
                      Consultant Engineer (coming soon)
                    </option>
                  </select>
                </label>
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

            {/* Activity */}
            <section className="card">
              <h2 className="section-heading">Activity</h2>
              <p className="page-subtitle" style={{ marginBottom: 10 }}>
                Here you will be able to access:
              </p>

              <ul className="plan-features">
                <li>Previous chat histories</li>
                <li>Generated Word / Excel / PowerPoint files</li>
                <li>Engineering drawings processed in engineerit.ai</li>
              </ul>

              <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
                (Integration with actual storage coming soon.)
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
