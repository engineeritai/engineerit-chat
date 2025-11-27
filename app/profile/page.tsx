"use client";

import { useEffect, useState, useRef, ChangeEvent } from "react";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type ProfileRow = {
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: string | null;
};

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [fullName, setFullName] = useState("");
  const [plan, setPlan] = useState("assistant");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const supabase = createClientComponentClient();

  // تحميل بيانات البروفايل
  useEffect(() => {
    async function loadProfile() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, subscription_tier")
        .eq("id", user.id)
        .single<ProfileRow>();

      if (!error && data) {
        setFullName(data.full_name || "");
        setAvatarUrl(data.avatar_url || null);
        setPlan(data.subscription_tier || "assistant");
      }

      setLoading(false);
    }

    loadProfile();
  }, [supabase]);

  // حفظ الاسم فقط
  async function handleSaveName() {
    setSavingName(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSavingName(false);
      return;
    }

    await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setSavingName(false);
    alert("Profile updated");
  }

  // رفع الصورة
  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    try {
      setUploadingAvatar(true);

      // مسار الملف داخل البكِت
      const filePath = `${user.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error(uploadError);
        alert("Error uploading avatar");
        return;
      }

      // الحصول على الرابط العام
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // حفظ الرابط في جدول profiles
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        console.error(updateError);
        alert("Error saving avatar url");
        return;
      }

      setAvatarUrl(publicUrl);
    } finally {
      setUploadingAvatar(false);
      // حتى نسمح برفع نفس الملف مرة أخرى لو أراد
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading profile...
      </div>
    );
  }

  const planLabelMap: Record<string, string> = {
    assistant: "Assistant (Free)",
    engineer: "Engineer",
    professional: "Professional",
    consultant: "Consultant",
  };

  const planLabel = planLabelMap[plan] || plan;

  return (
    <div className="app-shell">
      <NavSidebar />

      <div className="main">
        <Header />

        <div className="page-wrap">
          <h1 className="page-title">Profile & Subscription</h1>

          <div className="grid gap-8 max-w-3xl">
            {/* بطاقة البروفايل (الاسم + الصورة) */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Profile</h2>

              <div className="flex items-center gap-6 mb-6">
                {/* صورة البروفايل */}
                <div className="relative">
                  <div className="h-20 w-20 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-xl font-semibold">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>
                        {fullName
                          ? fullName
                              .split(" ")
                              .map((p) => p[0])
                              .join("")
                              .slice(0, 2)
                          : "EI"}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="mt-3 text-xs px-3 py-1 rounded-full border border-gray-300 hover:bg-gray-100"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? "Uploading..." : "Change photo"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>

                {/* الاسم */}
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">
                    Full name
                  </label>
                  <input
                    className="input w-full"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                  />
                  <button
                    type="button"
                    className="btn mt-3"
                    onClick={handleSaveName}
                    disabled={savingName}
                  >
                    {savingName ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            </div>

            {/* بطاقة الاشتراك */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Subscription</h2>

              <p className="mb-2 text-sm">
                Current plan: <strong>{planLabel}</strong>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Plan changes are controlled by engineerit.ai billing only. You
                cannot change the plan directly from this page without
                completing the upgrade & payment process.
              </p>

              <button
                type="button"
                className="btn"
                onClick={() =>
                  alert(
                    "Upgrade and payment flow will be available soon. Your current plan is read-only for now."
                  )
                }
              >
                Upgrade / manage subscription
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
