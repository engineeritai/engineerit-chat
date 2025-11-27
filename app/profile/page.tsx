"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import supabase from "../../lib/supabaseClient";

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: string | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // تحميل البروفايل عند فتح الصفحة
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setErrorMsg(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(userError);
        setErrorMsg("Could not load profile.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("PROFILE LOAD ERROR:", error);
        setErrorMsg("Could not load profile.");
        setLoading(false);
        return;
      }

      const p = data as ProfileRow;
      setProfile(p);
      setFullName(p.full_name ?? "");
      setLoading(false);
    };

    loadProfile();
  }, []);

  // حفظ الاسم
  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSavingName(true);
    setErrorMsg(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(userError);
      setErrorMsg("Could not save name.");
      setSavingName(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user.id);

    if (error) {
      console.error("NAME SAVE ERROR:", error);
      setErrorMsg("Could not save name.");
    } else {
      setProfile((prev) =>
        prev ? { ...prev, full_name: fullName } : prev
      );
    }

    setSavingName(false);
  };

  // رفع صورة البروفايل
  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setErrorMsg(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(userError);
      setErrorMsg("Could not upload profile photo.");
      setUploadingAvatar(false);
      return;
    }

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          upsert: true,
          cacheControl: "3600",
          contentType: file.type,
        });

      if (uploadError || !uploadData) {
        console.error("AVATAR UPLOAD ERROR:", uploadError);
        setErrorMsg("Could not upload profile photo.");
        setUploadingAvatar(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(uploadData.path);

      const publicUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) {
        console.error("AVATAR URL SAVE ERROR:", updateError);
        setErrorMsg("Could not upload profile photo.");
      } else {
        setProfile((prev) =>
          prev ? { ...prev, avatar_url: publicUrl } : prev
        );
      }
    } catch (err) {
      console.error("AVATAR UNKNOWN ERROR:", err);
      setErrorMsg("Could not upload profile photo.");
    }

    setUploadingAvatar(false);
  };

  const currentPlan = profile?.plan ?? "assistant";
  const planLabelMap: Record<string, string> = {
    assistant: "Assistant (Free)",
    engineer: "Engineer",
    professional: "Professional",
    consultant: "Consultant",
  };
  const currentPlanLabel = planLabelMap[currentPlan] ?? currentPlan;

  const initials =
    profile?.full_name?.trim()?.charAt(0).toUpperCase() ?? "E";

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f7fb]">
      <Header />
      <div className="flex flex-1">
        <NavSidebar />

        <main className="flex-1 px-6 py-10">
          <h1 className="text-3xl font-semibold text-gray-900 mb-6">
            Profile &amp; Subscription
          </h1>

          {errorMsg && (
            <p className="text-red-600 mb-4">{errorMsg}</p>
          )}

          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="max-w-3xl space-y-8">
              {/* Profile card */}
              <section className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-6 mb-6">
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-3xl font-semibold text-gray-700 overflow-hidden">
                    {profile?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatar_url}
                        alt="Profile avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <div>
                    <label className="inline-block">
                      <span className="sr-only">Choose profile photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        disabled={uploadingAvatar}
                        className="hidden"
                        id="avatar-input"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          document
                            .getElementById("avatar-input")
                            ?.click()
                        }
                        className="px-4 py-2 rounded-full bg-[#2563eb] text-white font-medium text-sm hover:bg-[#1d4ed8] disabled:opacity-60"
                        disabled={uploadingAvatar}
                      >
                        {uploadingAvatar ? "Uploading..." : "Choose File"}
                      </button>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG, or GIF. Max 5 MB.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveName} className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                    placeholder="Your full name"
                  />
                  <button
                    type="submit"
                    disabled={savingName}
                    className="mt-2 inline-flex px-5 py-2 rounded-full bg-[#2563eb] text-white text-sm font-medium hover:bg-[#1d4ed8] disabled:opacity-60"
                  >
                    {savingName ? "Saving..." : "Save changes"}
                  </button>
                </form>
              </section>

              {/* Subscription card */}
              <section className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Subscription
                </h2>
                <p className="text-sm text-gray-700 mb-4">
                  Current plan:{" "}
                  <span className="font-semibold">{currentPlanLabel}</span>
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Plan changes are controlled by engineerit.ai billing
                  only. You cannot change the plan directly from this
                  page without completing the upgrade &amp; payment
                  process.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    alert(
                      "Upgrade and payment flow will be available soon. Your current plan is read-only for now."
                    )
                  }
                  className="inline-flex px-5 py-2 rounded-full bg-[#2563eb] text-white text-sm font-medium hover:bg-[#1d4ed8]"
                >
                  Upgrade / manage subscription
                </button>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
