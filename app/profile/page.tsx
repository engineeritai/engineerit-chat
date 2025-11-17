"use client";

import { useState } from "react";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";

export default function ProfilePage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  // Local profile data (temporary – replace with real user info later)
  const [fullName, setFullName] = useState("Engineer User");
  const [email, setEmail] = useState("you@example.com");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // TEMP subscription level (we'll connect to real data later)
  const currentPlanId = "assistant"; // "assistant" | "engineer" | "professional" | "consultant"

  const planLabels = {
    assistant: "Assistant Engineer",
    engineer: "Engineer",
    professional: "Professional Engineer",
    consultant: "Consultant Engineer",
  } as const;

  const planBadgeColors = {
    assistant: "#2563eb", // blue
    engineer: "#f97316", // orange
    professional: "#0f766e", // teal
    consultant: "#7c3aed", // purple
  } as const;

  const currentPlanLabel =
    planLabels[currentPlanId as keyof typeof planLabels] ||
    "Assistant Engineer";
  const currentPlanColor =
    planBadgeColors[currentPlanId as keyof typeof planBadgeColors] ||
    "#2563eb";

  function getInitials(name: string) {
    if (!name) return "EN";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0).toUpperCase() +
      parts[parts.length - 1].charAt(0).toUpperCase()
    );
  }

  // Handle image upload
  const handlePhotoUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotoPreview(url); // show immediately
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
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">
            Update your personal information and review your activity in
            engineerit.ai.
          </p>

          {/* Top section (Avatar + Plan Badge) */}
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
                  borderRadius: "9999px",
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
                  getInitials(fullName)
                )}
              </div>

              {/* Name + email + plan */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  {fullName || "Your Name"}
                </div>
                <div
                  style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}
                >
                  {email}
                </div>

                <span
                  style={{
                    backgroundColor: currentPlanColor,
                    color: "white",
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {currentPlanLabel}
                </span>
              </div>
            </div>
          </section>

          {/* Main sections */}
          <div className="profile-grid">
            {/* Personal Info */}
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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

              <button className="btn">Save changes</button>
            </section>

            {/* Activity */}
            <section className="card">
              <h2 className="section-heading">Activity</h2>
              <p className="page-subtitle" style={{ marginBottom: 10 }}>
                Here you will be able to access:
              </p>

              <ul className="plan-features">
                <li>Previous chat histories</li>
                <li>Generated Word / Excel / PowerPoint files</li>
                <li>Engineering drawings processed in engineerit.ai</li>
              </ul>

              <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
                (Integration with actual storage coming soon.)
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
