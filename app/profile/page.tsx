"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

type ProfileRow = {
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: string | null;
};

export default function ProfilePage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr) throw userErr;
        if (!user) {
          setErrorMsg("You are not logged in.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, subscription_tier")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        const row: ProfileRow = {
          full_name: data.full_name,
          avatar_url: data.avatar_url,
          subscription_tier: data.subscription_tier,
        };

        setProfile(row);
        setFullName(row.full_name ?? "");
      } catch (err) {
        console.error("PROFILE LOAD ERROR:", err);
        setErrorMsg("Could not load profile.");
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, []);

  async function handleSaveName() {
    try {
      setSavingName(true);
      setErrorMsg(null);
      setInfoMsg(null);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;
      if (!user) {
        setErrorMsg("You are not logged in.");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);

      if (error) throw error;

      setProfile((prev) =>
        prev ? { ...prev, full_name: fullName } : { full_name: fullName, avatar_url: null, subscription_tier: "assistant" }
      );
      setInfoMsg("Profile updated successfully.");
    } catch (err) {
      console.error("PROFILE SAVE ERROR:", err);
      setErrorMsg("Could not save profile.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleAvatarChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSavingAvatar(true);
      setErrorMsg(null);
      setInfoMsg(null);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;
      if (!user) {
        setErrorMsg("You are not logged in.");
        return;
      }

      const ext = file.name.split(".").pop() ?? "jpg";
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = publicData.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile((prev) =>
        prev ? { ...prev, avatar_url: publicUrl } : prev
      );
      setInfoMsg("Profile photo updated.");
    } catch (err) {
      console.error("AVATAR UPLOAD ERROR:", err);
      setErrorMsg("Could not upload profile photo.");
    } finally {
      setSavingAvatar(false);
      // لإمكانية اختيار نفس الملف مرة أخرى
      e.target.value = "";
    }
  }

  const currentPlan =
    profile?.subscription_tier || "assistant";

  return (
    <div className="app-shell">
      <NavSidebar
        isMobileOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />

      <div className="main">
        <Header
          onToggleSidebar={() =>
            setIsSidebarOpenMobile((v) => !v)
          }
        />

        <div className="page-wrap">
          <h1 className="page-title">Profile &amp; Subscription</h1>

          {errorMsg && (
            <p
              style={{
                color: "#b91c1c",
                marginBottom: 12,
                fontSize: 14,
              }}
            >
              {errorMsg}
            </p>
          )}

          {infoMsg && (
            <p
              style={{
                color: "#16a34a",
                marginBottom: 12,
                fontSize: 14,
              }}
            >
              {infoMsg}
            </p>
          )}

          {loading ? (
            <p>Loading profile…</p>
          ) : (
            <div className="card">
              {/* Profile photo */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "9999px",
                    background: "#e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    fontSize: 28,
                    overflow: "hidden",
                  }}
                >
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    (fullName?.trim()[0] ||
                      "E").toUpperCase()
                  )}
                </div>

                <div>
                  <div style={{ marginBottom: 6 }}>
                    <label
                      style={{
                        display: "inline-block",
                        padding: "6px 12px",
                        borderRadius: 9999,
                        background: "#2563eb",
                        color: "white",
                        cursor: "pointer",
                        fontSize: 14,
                      }}
                    >
                      Choose File
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleAvatarChange}
                        disabled={savingAvatar}
                      />
                    </label>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                    }}
                  >
                    JPG, PNG, or GIF. Max 5 MB.
                  </div>
                </div>
              </div>

              {/* Full name */}
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
                type="button"
                onClick={handleSaveName}
                disabled={savingName}
              >
                {savingName ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}

          {/* Subscription card */}
          <div className="card" style={{ marginTop: 24 }}>
            <h2 className="card-title">Subscription</h2>
            <p style={{ marginBottom: 8 }}>
              Current plan:{" "}
              <strong>
                {currentPlan === "assistant"
                  ? "Assistant (Free)"
                  : currentPlan.charAt(0).toUpperCase() +
                    currentPlan.slice(1)}
              </strong>
            </p>
            <p style={{ fontSize: 14, color: "#6b7280" }}>
              Plan changes are controlled by engineerit.ai billing
              only. You cannot change the plan directly from this
              page without completing the upgrade &amp; payment
              process.
            </p>

            <button
              className="btn"
              type="button"
              style={{ marginTop: 16 }}
              onClick={() => {
                alert(
                  "Upgrade and payment flow will be available soon. Your current plan is read-only for now."
                );
              }}
            >
              Upgrade / manage subscription
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
