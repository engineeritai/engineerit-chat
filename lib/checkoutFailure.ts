export type CheckoutFailureKind = "cancelled" | "failed" | "mismatch";

export function checkoutFailureKind(status: string | null | undefined, reason?: string | null): CheckoutFailureKind {
  if (reason === "amount_mismatch" || reason === "currency_mismatch") return "mismatch";
  const value = (status || "").toLowerCase();
  if (value === "canceled" || value === "cancelled" || value === "voided" || value === "expired") return "cancelled";
  return "failed";
}
