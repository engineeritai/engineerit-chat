"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

type Profile = {
  id: string;
  full_name: string | null;
  plan: PlanId;
};

const PLAN_LABELS: Record<PlanId, string> = {
  assistant: "Assistant (Free)",
  engineer: "Engineer",
  professional: "Professional",
  consultant: "Consultant",
};

export default function ProfilePage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push("/login");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, plan")
          .eq("id", user.id)
          .maybeSingle();

        if (error || !data) {
          console.error("Failed to load profile", error);
          return;
        }

        setProfile({
          id: data.id,
          full_name: data.full_name,
          plan: (data.plan || "assistant") as PlanId,
        });
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [router]);

  async function handleSaveBasic() {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: profile.full_name })
        .eq("id", profile.id);

      if (error) {
        console.error(error);
        alert("Could not save profile changes.");
      } else {
        alert("Profile updated.");
      }
    } finally {
      setSaving(false);
    }
  }

  function handleUpgradeClick() {
    // لاحقاً نربطها مع صفحة الدفع
    // الآن إمّا نحوله إلى /pricing أو رسالة
    // router.push("/pricing");
    alert(
      "Upgrade and payment flow will be available soon. Your current plan is read-only for now."
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
          <Header onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)} />
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
          <Header onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)} />
          <div className="page-wrap">
            <p>Could not load profile.</p>
          </div>
        </div>
      </div>
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

          <div className="card" style={{ maxWidth: 600 }}>
            <div className="form-row">
              <label>
                Full name
                <input
                  className="input"
                  type="text"
                  value={profile.full_name || ""}
                  onChange={(e) =>
                    setProfile((prev) =>
                      prev ? { ...prev, full_name: e.target.value } : prev
                    )
                  }
                />
              </label>
            </div>

            <button
              className="btn"
              type="button"
              disabled={saving}
              onClick={handleSaveBasic}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>

          <div className="card" style={{ maxWidth: 600, marginTop: 24 }}>
            <h2 style={{ marginBottom: 12 }}>Subscription</h2>
            <p style={{ fontSize: 14, marginBottom: 8 }}>
              Current plan:
              <strong style={{ marginLeft: 6 }}>
                {PLAN_LABELS[profile.plan]}
              </strong>
            </p>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
              Plan changes are controlled by engineerit.ai billing only. You
              cannot change the plan directly from this page without completing
              the upgrade & payment process.
            </p>

            <button
              type="button"
              className="btn"
              onClick={handleUpgradeClick}
              style={{ backgroundColor: "#2563eb" }}
            >
              Upgrade / manage subscription
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
