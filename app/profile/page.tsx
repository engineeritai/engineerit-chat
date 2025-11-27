"use client";

import { useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import { createClient } from "@supabase/supabase-js";

type ProfileRow = {
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: string | null;
};

// أنشئ عميل Supabase للـ client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

const PLAN_LABELS: Record<string, string> = {
  assistant: "Assistant (Free)",
  engineer: "Engineer",
  professional: "Professional",
  consultant: "Consultant",
};

export default function ProfilePage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [plan, setPlan] = useState<string>("assistant");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!supabase) {
      console.error("Supabase client is not configured");
      setErrorMsg("Configuration error. Please contact support.");
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) {
          throw new Error("User not found");
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, subscription_tier")
          .eq("id", user.id)
          .single<ProfileRow>();

        if (error) throw error;

        if (data) {
          setFullName(data.full_name ?? "");
          setAvatarUrl(data.avatar_url ?? null);
          setPlan((data.subscription_tier ?? "assistant").toLowerCase());
        }
      } catch (err: any) {
        console.error("loadProfile error:", err);
        setErrorMsg("Could not load profile.");
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    if (!supabase) return;
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("User not found");

      const updates = {
        id: user.id,
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl,
        subscription_tier: plan,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(updates);
      if (error) throw error;

      setSuccessMsg("Profile updated successfully.");
    } catch (err: any) {
      console.error("saveProfile error:", err);
      setErrorMsg("Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!supabase) return;

    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setUploadingAvatar(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("User not found");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      setAvatarUrl(publicUrl);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setSuccessMsg("Profile photo updated.");
    } catch (err: any) {
      console.error("avatar upload error:", err);
      setErrorMsg("Could not upload profile photo.");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const currentPlanLabel =
    PLAN_LABELS[plan] ?? `Current: ${plan || "assistant"}`;

  const handleUpgradeClick = () => {
    alert(
      "Upgrade and payment flow will be available soon. Your current plan is read-only for now.",
    );
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
          <h1 className="page-title">Profile &amp; Subscription</h1>

          {loading ? (
            <p className="page-subtitle">Loading your profile…</p>
          ) : (
            <>
              {errorMsg && (
                <p style={{ color: "#b91c1c", fontSize: 13, marginBottom: 12 }}>
                  {errorMsg}
                </p>
              )}
              {successMsg && (
                <p style={{ color: "#16a34a", fontSize: 13, marginBottom: 12 }}>
                  {successMsg}
                </p>
              )}

              {/* بطاقة البروفايل */}
              <div className="card" style={{ marginBottom: 24 }}>
                <div
                  className="form-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "9999px",
                      overflow: "hidden",
                      background: "#e5e7eb",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 32,
                      fontWeight: 600,
                      color: "#4b5563",
                    }}
                  >
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      (fullName || "E").charAt(0).toUpperCase()
                    )}
                  </div>

                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
                      Profile photo
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      disabled={uploadingAvatar}
                    />
                    <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                      JPG, PNG, or GIF. Max 5 MB.
                    </p>
                  </div>
                </div>

                <div className="form-row">
                  <label>
                    Full name
                    <input
                      className="input"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </label>
                </div>

                <button
                  className="btn"
                  onClick={handleSaveProfile}
                  disabled={saving || uploadingAvatar}
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>

              {/* بطاقة الاشتراك */}
              <div className="card">
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    marginBottom: 12,
                  }}
                >
                  Subscription
                </h2>
                <p style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 500 }}>Current plan: </span>
                  {currentPlanLabel}
                </p>
                <p
                  style={{
                    fontSize: 14,
                    color: "#6b7280",
                    marginBottom: 16,
                    maxWidth: 640,
                  }}
                >
                  Plan changes are controlled by engineerit.ai billing only. You
                  cannot change the plan directly from this page without
                  completing the upgrade &amp; payment process.
                </p>
                <button className="btn" type="button" onClick={handleUpgradeClick}>
                  Upgrade / manage subscription
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
