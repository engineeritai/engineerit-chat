"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type HeaderProps = {
  onToggleSidebar: () => void;
};

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

export default function Header({ onToggleSidebar }: HeaderProps) {
  const [fullName, setFullName] = useState("Engineer User");
  const [planId, setPlanId] = useState<PlanId>("assistant");

  const planLabels: Record<PlanId, string> = {
    assistant: "Assistant",
    engineer: "Engineer",
    professional: "Pro",
    consultant: "Consultant",
  };

  const planColors: Record<PlanId, string> = {
    assistant: "#2563eb", // blue
    engineer: "#f97316", // orange
    professional: "#0f766e", // teal
    consultant: "#7c3aed", // purple
  };

  const badgeLabel = planLabels[planId];
  const badgeColor = planColors[planId];

  function getInitials(name: string) {
    if (!name) return "EN";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0).toUpperCase() +
      parts[parts.length - 1].charAt(0).toUpperCase()
    );
  }

  // Load current user + profile from Supabase
  useEffect(() => {
    const loadHeaderUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        // not logged in → keep defaults
        return;
      }

      // Load profile row for plan + full name
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, plan")
        .eq("id", user.id)
        .maybeSingle();

      if (!profileError && profile) {
        if (profile.full_name) setFullName(profile.full_name);
        if (profile.plan) setPlanId(profile.plan as PlanId);
      } else if (user.user_metadata?.full_name) {
        // fallback to auth metadata if profile missing
        setFullName(user.user_metadata.full_name);
      }
    };

    loadHeaderUser();
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        {/* mobile menu button */}
        <button
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Open menu"
        >
          <span />
          <span />
          <span />
        </button>

        {/* engineerit logo */}
        <div className="brand" aria-label="engineerit">
          <span className="word">
            <span className="engineer">engineer</span>
            <span className="it">it</span>
          </span>
        </div>
      </div>

      {/* RIGHT SIDE: subscription badge + avatar */}
      <div
        className="header-right"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {/* Subscription badge */}
        <span
          style={{
            backgroundColor: badgeColor,
            color: "white",
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.2,
          }}
        >
          {badgeLabel}
        </span>

        {/* Avatar (initials from user name) */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "9999px",
            backgroundColor: "#e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 600,
            fontSize: 13,
            color: "#374151",
          }}
        >
          {getInitials(fullName)}
        </div>
      </div>
    </header>
  );
}
