"use client";

type HeaderProps = {
  onToggleSidebar: () => void;
};

export default function Header({ onToggleSidebar }: HeaderProps) {
  // TEMP: hardcoded user + plan until we hook Supabase session
  const fullName = "Engineer User";
  const currentPlanId: "assistant" | "engineer" | "professional" | "consultant" =
    "assistant";

  const planLabels: Record<string, string> = {
    assistant: "Assistant",
    engineer: "Engineer",
    professional: "Pro",
    consultant: "Consultant",
  };

  const planColors: Record<string, string> = {
    assistant: "#2563eb", // blue
    engineer: "#f97316", // orange
    professional: "#0f766e", // teal
    consultant: "#7c3aed", // purple
  };

  const badgeLabel = planLabels[currentPlanId];
  const badgeColor = planColors[currentPlanId];

  function getInitials(name: string) {
    if (!name) return "EN";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0).toUpperCase() +
      parts[parts.length - 1].charAt(0).toUpperCase()
    );
  }

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
            textTransform: "uppercase", // ✅ valid value
          }}
        >
          {badgeLabel}
        </span>

        {/* Avatar (initials) */}
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
