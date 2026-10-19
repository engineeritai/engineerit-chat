import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const blockedAuth = async () => {
  console.error("[mail-sink] blocked a browser auth email. Use /api/auth/signup, /api/auth/recover, or /api/auth/resend.");
  return { data: { user: null, session: null }, error: { message: "signup-blocked" } };
};
supabase.auth.signUp = blockedAuth as unknown as typeof supabase.auth.signUp;
supabase.auth.resetPasswordForEmail = blockedAuth as unknown as typeof supabase.auth.resetPasswordForEmail;
supabase.auth.resend = blockedAuth as unknown as typeof supabase.auth.resend;
