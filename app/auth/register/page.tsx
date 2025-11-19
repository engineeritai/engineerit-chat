"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getURL } from "@/lib/getURL";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${getURL()}/auth/confirmed`,
        },
      });

      if (error) throw error;

      setMessage(
        "تم تسجيلك بنجاح. الرجاء فتح البريد الإلكتروني وتأكيده، بعد ذلك يمكنك تسجيل الدخول."
      );
    } catch (err: any) {
      setMessage(err.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617]">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-white mb-2 text-center">
          engineerit.ai
        </h1>
        <p className="text-sm text-gray-400 mb-6 text-center">
          Create a new account
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white text-black font-semibold py-2 text-sm disabled:opacity-60"
          >
            {loading ? "Please wait..." : "Register"}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-xs text-center text-gray-300">
            {message}
          </p>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/auth/login"
            className="text-xs text-gray-400 hover:text-gray-200"
          >
            Already have an account? Login →
          </Link>
        </div>
      </div>
    </div>
  );
}
