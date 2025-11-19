// app/profile/page.tsx
"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: string | null;
};

const SUBSCRIPTION_LEVELS = ["free", "plus", "pro", "premium"];

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    setMessage(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Please login first.");
      setLoading(false);
      router.push("/auth/login");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, subscription_tier")
      .eq("id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (!data) {
      // create empty profile row
      const { error: insertError } = await supabase
        .from("profiles")
        .insert({ id: user.id });

      if (insertError) {
        setMessage(insertError.message);
        setLoading(false);
        return;
      }

      setProfile({
        full_name: user.email ?? "",
        avatar_url: null,
        subscription_tier: "free",
      });
    } else {
      setProfile({
        full_name: data.full_name,
        avatar_url: data.avatar_url,
        subscription_tier: data.subscription_tier ?? "free",
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Not logged in.");
      return;
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      setMessage(uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      setMessage(updateError.message);
      return;
    }

    setProfile((prev) =>
      prev ? { ...prev, avatar_url: publicUrl } : prev
    );
    setMessage("Profile image updated.");
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Not logged in.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        subscription_tier: profile.subscription_tier,
      })
      .eq("id", user.id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Profile saved.");
    }

    setSaving(false);
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <p className="text-sm text-gray-300">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex justify-center py-10">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-black/70 p-8">
        <h1 className="text-xl font-semibold text-white mb-4">
          Account profile
        </h1>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/10 overflow-hidden flex items-center justify-center text-sm text-gray-300">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                "No image"
              )}
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                Profile picture
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="text-xs text-gray-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Full name
            </label>
            <input
              type="text"
              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
              value={profile.full_name ?? ""}
              onChange={(e) =>
                setProfile((prev) =>
                  prev
                    ? { ...prev, full_name: e.target.value }
                    : prev
                )
              }
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Subscription level
            </label>
            <select
              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
              value={profile.subscription_tier ?? "free"}
              onChange={(e) =>
                setProfile((prev) =>
                  prev
                    ? { ...prev, subscription_tier: e.target.value }
                    : prev
                )
              }
            >
              {SUBSCRIPTION_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-white text-black font-semibold py-2 text-sm disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save profile"}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-xs text-gray-300">{message}</p>
        )}
      </div>
    </div>
  );
}
