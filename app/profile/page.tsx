"use client";

import React, { useEffect, useState, ChangeEvent } from "react";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import { supabase } from "../../lib/supabaseClient";

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
          .maybeSingle();

        if (error) throw error;

        const initialFullName =
          data?.full_name ??
          ((user.user_metadata?.full_name as string | undefined) ??
            user.email?.split("@")[0] ??
            "");

        const row: ProfileRow = {
          full_name: initialFullName,
          avatar_url: data?.avatar_url ?? null,
          subscription_tier: data?.subscription_tier ?? "assistant",
        };

        setProfile(row);
        setFullName(initialFullName);
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
        prev
          ? { ...prev, full_name: fullName }
          : {
              full_name: fullName,
              avatar_url: null,
              subscription_tier: "assistant",
            }
      );
      setInfoMsg("Profile updated successfully.");
    } catch (err) {
      console.error("PROFILE SAVE ERROR:", err);
      setErrorMsg("Could not save profile.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
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
      e.target.value = "";
    }
  }

  async function handleUpgradeClick(
    targetPlan: "plus" | "pro" | "premium" = "pro"
  ) {
    try {
      setErrorMsg(null);
      setInfoMsg(null);

      const { data, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !data.session) {
        setErrorMsg("You must be logged in to upgrade.");
        return;
      }

      const res = await fetch("/api/payments/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({
          planCode: targetPlan,     // plus / pro / premium
          billingCycle: "monthly",  // ممكن نضيف اختيار لاحقاً
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "Could not start checkout.");
        return;
      }

      window.location.href = json.url;
    } catch (err) {
      console.error("UPGRADE CLICK ERROR:", err);
      setErrorMsg("Could not start upgrade process.");
    }
  }

  const currentPlan = profile?.subscription_tier || "assistant";

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
                    (fullName?.trim()[0] || "E").toUpperCase()
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
              only. You can start upgrade to a higher plan from here.
            </p>

            <button
              className="btn"
              type="button"
              style={{ marginTop: 16 }}
              onClick={() => handleUpgradeClick("pro")}
            >
              Upgrade to Professional (Stripe)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
