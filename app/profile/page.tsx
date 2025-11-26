"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function ProfilePage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [plan, setPlan] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);

      // ---------------------------
      // 1) Get logged-in user
      // ---------------------------
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("User not found.");
        return;
      }

      const userId = user.id;

      // ---------------------------
      // 2) Check if profile exists
      // ---------------------------
      let { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      // ---------------------------
      // 3) If profile missing → create it
      // ---------------------------
      if (!profile) {
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            full_name: user.email,
            avatar_url: null,
            plan: "assistant",
          })
          .select()
          .single();

        if (insertError) {
          console.error("Insert error:", insertError);
          setError("Failed to create profile");
          return;
        }

        profile = newProfile;
      }

      if (profileError) {
        console.error(profileError);
        setError("Failed to load profile");
        return;
      }

      // ---------------------------
      // 4) Set UI fields
      // ---------------------------
      setFullName(profile.full_name || "");
      setPlan(profile.plan);
      setAvatarUrl(profile.avatar_url);

    } catch (err: any) {
      console.error(err);
      setError("Error loading profile");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------
  // Save profile changes
  // ---------------------------
  async function updateProfile() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        avatar_url: avatarUrl,
      })
      .eq("id", user?.id);

    if (error) {
      console.error(error);
      setError("Failed to update profile");
    }

    setLoading(false);
  }

  if (loading) return <p className="p-6">Loading...</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Profile & Subscription</h1>

      {/* -------- Profile Section -------- */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Profile Details</h2>

        {/* Full Name */}
        <label className="block text-sm font-medium mb-2">Full name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full p-3 border rounded-lg mb-4"
        />

        {/* Avatar Placeholder */}
        <label className="block text-sm font-medium mb-2">Profile photo</label>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              "No image"
            )}
          </div>
        </div>

        <button
          onClick={updateProfile}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Save changes
        </button>
      </div>

      {/* -------- Subscription Section -------- */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Subscription</h2>

        <p className="mb-3">
          <strong>Current plan:</strong> {plan}
        </p>

        <p className="text-gray-600 text-sm mb-4">
          Plan changes are controlled by engineerit.ai billing only.  
          You cannot change the plan directly from this page.
        </p>

        <a
          href="/billing"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
        >
          Upgrade / manage subscription
        </a>
      </div>
    </div>
  );
}
