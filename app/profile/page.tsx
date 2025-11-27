"use client";

import { useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import { createClient } from "../../lib/supabaseClient"; // 👈 مسار بسيط نسبي

type ProfileRow = {
  full_name: string | null;
  avatar_url: string | null;
  plan: string | null;
};

export default function ProfilePage() {
  const supabase = createClient();

  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [plan, setPlan] = useState<string>("assistant");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // تحميل بيانات البروفايل
  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, plan")
          .eq("id", user.id)
          .single<ProfileRow>();

        if (error && error.code !== "PGRST116") throw error;

        if (data) {
          setFullName(data.full_name ?? "");
          setAvatarUrl(data.avatar_url ?? null);
          setPlan(data.plan ?? "assistant");
        } else {
          // لا يوجد صف، أنشئ واحدًا مبدئيًا
          const { error: insertError } = await supabase.from("profiles").insert({
            id: user.id,
            full_name: "",
            avatar_url: null,
            plan: "assistant",
          });

          if (insertError) throw insertError;

          setFullName("");
          setAvatarUrl(null);
          setPlan("assistant");
        }
      } catch (err) {
        console.error("LOAD PROFILE ERROR:", err);
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // حفظ الاسم
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);

      if (error) throw error;

      alert("Profile updated successfully.");
    } catch (err) {
      console.error("SAVE PROFILE ERROR:", err);
      alert("There was a problem saving your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // اختيار الصورة
  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  // رفع الصورة وتحديث avatar_url
  async function handleAvatarChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
    } catch (err) {
      console.error("AVATAR UPLOAD ERROR:", err);
      alert("There was a problem uploading your photo. Please try again.");
    } finally {
      // إعادة تعيين المدخل حتى يمكن اختيار نفس الملف مرة أخرى لو أراد
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // زر الاشتراك (مقفول حالياً)
  function handleManageSubscription() {
    alert(
      "Upgrade and payment flow will be available soon. Your current plan is read-only for now.",
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
          <h1 className="page-title">Profile & Subscription</h1>

          {loading ? (
            <p>Loading profile…</p>
          ) : (
            <>
              {/* بطاقة البروفايل */}
              <form className="card" onSubmit={handleSaveProfile}>
                <h2 className="section-title">Profile</h2>

                {/* الصورة + الاسم */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    marginBottom: 20,
                  }}
                >
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "999px",
                      border: "none",
                      cursor: "pointer",
                      overflow: "hidden",
                      background: "#e5e7eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                    }}
                    title="Change photo"
                  >
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
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
                      "👤"
                    )}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleAvatarChange}
                  />

                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    Click the circle to upload your photo.
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
                    />
                  </label>
                </div>

                <button className="btn" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </form>

              {/* بطاقة الاشتراك */}
              <div className="card">
                <h2 className="section-title">Subscription</h2>
                <p style={{ marginBottom: 8 }}>
                  Current plan:{" "}
                  <strong style={{ textTransform: "capitalize" }}>
                    {plan === "assistant"
                      ? "Assistant (Free)"
                      : plan ?? "Assistant (Free)"}
                  </strong>
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "#6b7280",
                    marginBottom: 16,
                    maxWidth: 640,
                  }}
                >
                  Plan changes are controlled by engineerit.ai billing only. You
                  cannot change the plan directly from this page without
                  completing the upgrade & payment process.
                </p>
                <button
                  type="button"
                  className="btn"
                  onClick={handleManageSubscription}
                >
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
