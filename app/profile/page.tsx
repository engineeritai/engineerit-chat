"use client";

import { useEffect, useState, ChangeEvent } from "react";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import { supabase } from "@/lib/supabaseClient";

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export default function ProfilePage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Subscription level (for now from metadata / default)
  const [planLabel, setPlanLabel] = useState("Visitor");

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setStatusMsg(null);
      setStatusError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setStatusError("You are not logged in. Please sign in first.");
        setLoading(false);
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email ?? null);

      const metaName =
        (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.name;
      const metaPlan = (user.user_metadata as any)?.plan_id;

      if (metaPlan === "assistant") setPlanLabel("Assistant Engineer");
      else if (metaPlan === "engineer") setPlanLabel("Engineer");
      else if (metaPlan === "professional") setPlanLabel("Professional Engineer");
      else if (metaPlan === "consultant") setPlanLabel("Consultant Engineer");

      // Load from profiles table
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single<ProfileRow>();

      if (error && error.code !== "PGRST116") {
        console.error(error);
        setStatusError("Could not load your profile.");
      }

      if (data) {
        setFullName(data.full_name || metaName || "");
        if (data.avatar_url) setPhotoPreview(data.avatar_url);
      } else {
        // No row yet – use metadata as initial
        setFullName(metaName || "");
      }

      setLoading(false);
    }

    void loadProfile();
  }, []);

  function getInitials(name: string | null | undefined, email?: string | null) {
    const src = name && name.trim().length > 0 ? name : email || "";
    if (!src) return "EN";
    const parts = src.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0).toUpperCase() +
      parts[parts.length - 1].charAt(0).toUpperCase()
    );
  }

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    setStatusMsg(null);
    setStatusError(null);

    try {
      let avatarUrl: string | null = photoPreview || null;

      // If a new file is selected, upload to Storage
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `${userId}/${Date.now()}.${ext || "jpg"}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, photoFile, {
            upsert: true,
          });

        if (uploadError) {
          console.error(uploadError);
          throw new Error("Failed to upload profile photo.");
        }

        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(uploadData.path);

        avatarUrl = publicUrlData.publicUrl;
        setPhotoPreview(avatarUrl);
      }

      const { error: upsertError } = await supabase.from("profiles").upsert(
        {
          id: userId,
          full_name: fullName,
          avatar_url: avatarUrl,
        },
        { onConflict: "id" }
      );

      if (upsertError) {
        console.error(upsertError);
        throw new Error("Failed to save profile.");
      }

      setStatusMsg("Profile saved successfully.");
      setPhotoFile(null);
    } catch (err: any) {
      setStatusError(
        err?.message || "Something went wrong while saving your profile."
      );
    } finally {
      setSaving(false);
    }
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
            Manage your engineerit.ai account details and activity.
          </p>

          {loading ? (
            <p style={{ fontSize: 14 }}>Loading your profile…</p>
          ) : (
            <>
              {/* Top summary card */}
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
                      borderRadius: "999px",
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
                      getInitials(fullName, userEmail)
                    )}
                  </div>

                  {/* Name + email + plan */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>
                      {fullName || "Your name"}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: "#6b7280",
                        marginBottom: 8,
                      }}
                    >
                      {userEmail ?? "No email"}
                    </div>

                    <span
                      style={{
                        backgroundColor: "#2563eb",
                        color: "white",
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {planLabel}
                    </span>
                  </div>
                </div>
              </section>

              <div className="profile-grid">
                {/* Personal info */}
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
                      Email address
                      <input
                        className="input"
                        type="email"
                        value={userEmail ?? ""}
                        disabled
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

                  {statusMsg && (
                    <p
                      style={{
                        fontSize: 13,
                        color: "#047857",
                        marginBottom: 8,
                      }}
                    >
                      {statusMsg}
                    </p>
                  )}
                  {statusError && (
                    <p
                      style={{
                        fontSize: 13,
                        color: "#b91c1c",
                        marginBottom: 8,
                      }}
                    >
                      {statusError}
                    </p>
                  )}

                  <button className="btn" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </section>

                {/* Activity placeholder */}
                <section className="card">
                  <h2 className="section-heading">Activity</h2>
                  <p className="page-subtitle" style={{ marginBottom: 10 }}>
                    Soon you will see:
                  </p>
                  <ul className="plan-features">
                    <li>Previous chat histories</li>
                    <li>Generated Word / Excel / PowerPoint files</li>
                    <li>
                      Engineering drawings and projects processed in
                      engineerit.ai
                    </li>
                  </ul>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      marginTop: 8,
                    }}
                  >
                    (Integration with real storage and history will be added in
                    the Engineer / Pro plans.)
                  </p>
                </section>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
