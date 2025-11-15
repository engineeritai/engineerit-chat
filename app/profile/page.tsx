"use client";

import { useState } from "react";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";

export default function ProfilePage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

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

          <div className="profile-grid">
            <section className="card">
              <h2 className="section-heading">Personal information</h2>
              <div className="form-row">
                <label>
                  Full name
                  <input
                    className="input"
                    type="text"
                    placeholder="Your full name"
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Email address
                  <input
                    className="input"
                    type="email"
                    placeholder="you@example.com"
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Profile photo (URL or upload)
                  <input
                    className="input"
                    type="text"
                    placeholder="Photo URL (for now)"
                  />
                </label>
              </div>
              <button className="btn">Save changes</button>
            </section>

            <section className="card">
              <h2 className="section-heading">Activity</h2>
              <p className="page-subtitle" style={{ marginBottom: 10 }}>
                Here you will be able to access:
              </p>
              <ul className="plan-features">
                <li>Previous chat histories</li>
                <li>Generated Word / Excel / PowerPoint files</li>
                <li>
                  Engineering drawings and projects processed in engineerit.ai
                </li>
              </ul>
              <p
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  marginTop: 8,
                }}
              >
                (Integration with real data and storage can be added later.)
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
