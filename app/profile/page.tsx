"use client";

import { useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import { createClient } from "@/utils/supabase/client";

type Profile = {
  full_name: string | null;
  avatar_url: string | null;
  plan: string | null;
};

export default function ProfilePage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [plan, setPlan] = useState<string>("assistant");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  // تحميل البروفايل
  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("AUTH ERROR", userError);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, plan")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("PROFILE LOAD ERROR", error);
          setLoading(false);
          return;
        }

        const prof: Profile = {
          full_name: data?.full_name ?? "",
          avatar_url: data?.avatar_url ?? null,
          plan: data?.plan ?? "assistant",
        };

        setProfile(prof);
        setFullName(prof.full_name || "");
        setPlan((prof.plan as string) || "assistant");
        setAvatarUrl(prof.avatar_url || null);
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, [supabase]);

  // حفظ الاسم فقط (الخطة read-only الآن)
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
        })
        .eq("id", user.id);

      if (error) {
        console.error("PROFILE UPDATE ERROR", error);
        alert("There was a problem saving your profile. Please try again.");
        return;
      }

      setProfile((old) =>
        old ? { ...old, full_name: fullName.trim() || null } : old,
      );
      alert("Profile updated.");
    } finally {
      setSaving(false);
    }
  }

  // رفع صورة البروفايل
  async function handleAvatarChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("AUTH ERROR (avatar)", userError);
        return;
      }

      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("AVATAR UPLOAD ERROR", uploadError);
        alert("Error uploading image. Please try again.");
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // حفظ الرابط في جدول profiles
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) {
        console.error("AVATAR URL UPDATE ERROR", updateError);
        alert("Image uploaded but profile was not updated.");
        return;
      }

      setAvatarUrl(publicUrl);
      setProfile((old) =>
        old ? { ...old, avatar_url: publicUrl } : old,
      );
    } finally {
      setUploadingAvatar(false);
      // إعادة تعيين قيمة input حتى يسمح برفع نفس الملف مرة أخرى إن أراد
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleUpgradeClick() {
    alert(
      "Upgrade and payment flow will be available soon. Your current plan is read-only for now.",
    );
  }

  if (loading) {
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
            <p>Loading profile…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
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
            <p>Could not load profile.</p>
          </div>
        </div>
      </div>
    );
  }

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "EI";

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
          <h1 className="page-title">Profile & Subscription</h1>

          <form className="card" onSubmit={handleSaveProfile}>
            {/* Avatar + name */}
            <div className="form-row" style={{ marginBottom: 24 }}>
              <label style={{ display: "block", marginBottom: 8 }}>
                Photo
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "999px",
                    overflow: "hidden",
                    background: "#e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    fontSize: 20,
                  }}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    initials
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar
                      ? "Uploading…"
                      : "Upload photo"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleAvatarChange}
                  />
                  <p
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      marginTop: 4,
                    }}
                  >
                    JPG, PNG, أو WEBP. حجم مناسب للصورة الشخصية.
                  </p>
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
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                />
              </label>
            </div>

            <button className="btn" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>

          {/* Subscription card */}
          <div className="card" style={{ marginTop: 24 }}>
            <h2 className="card-title">Subscription</h2>
            <p style={{ marginBottom: 8 }}>
              Current plan:{" "}
              <strong>
                {plan === "assistant"
                  ? "Assistant (Free)"
                  : plan.charAt(0).toUpperCase() +
                    plan.slice(1)}
              </strong>
            </p>
            <p
              style={{
                fontSize: 14,
                color: "#6b7280",
                marginBottom: 16,
              }}
            >
              Plan changes are controlled by engineerit.ai
              billing only. You cannot change the plan directly
              from this page without completing the upgrade &
              payment process.
            </p>
            <button
              type="button"
              className="btn"
              onClick={handleUpgradeClick}
            >
              Upgrade / manage subscription
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
