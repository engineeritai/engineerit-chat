import { isTestRecipient } from "@/lib/mailPolicy";
import { supabase } from "@/lib/supabaseClient";

export async function requestAuthEmail(
  action: "signup" | "reset" | "resend",
  body: {
    email: string;
    password?: string;
    fullName?: string;
    captchaToken?: string;
    pending?: { planId: string; interval: string; extraSeats: number };
  }
) {
  const path = action === "reset" ? "recover" : action;
  const response = await fetch(`/api/auth/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    sent?: boolean;
    error?: string;
    needsConfirmation?: boolean;
    code?: string;
  };
  return { status: response.status, data };
}

/** Password updates send Supabase's "password changed" notice. Skip that outside production and for test inboxes. */
export async function changePassword(password: string) {
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email || "";
  if (isTestRecipient(email) || process.env.NODE_ENV !== "production") {
    return { error: null as { message: string } | null, skipped: true };
  }
  const updated = await supabase.auth.updateUser({ password });
  return { error: updated.error, skipped: false };
}
