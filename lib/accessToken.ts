import { supabase } from "@/lib/supabaseClient";

/** Browser session token. The server verifies it; it is not a plan id. */
export async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}
