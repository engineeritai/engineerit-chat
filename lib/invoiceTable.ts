export function statusPillClass(status: string | null | undefined) {
  const value = (status || "").trim().toLowerCase();
  if (value === "active") return "status-pill is-active";
  if (value === "expired") return "status-pill is-expired";
  return "status-pill";
}

export function usdApproxLine(usd: string) {
  return `≈ ${usd}`;
}
