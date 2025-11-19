"use client";

import Link from "next/link";
import { FormEvent } from "react";

export default function RegisterPage() {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: اربط بالنظام الحقيقي لاحقاً (API / Supabase / AuthProvider ...)
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
      <div className="w-full max-w-md px-6">
        {/* Logo / Brand */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-3xl font-semibold tracking-tight"
          >
            engineerit.ai
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-xl font-semibold mb-1">Create your account</h1>
          <p className="text-sm text-gray-500 mb-6">
            One secure login for all engineerit.ai tools.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Full name
              </label>
              <input
                type="text"
                name="name"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 rounded-lg bg-black text-white text-sm font-medium py-2.5 hover:bg-gray-900 transition"
            >
              Register
            </button>
          </form>

          <p className="mt-4 text-sm text-gray-500">
            Already have an account?
            <Link
              href="/auth/login"
              className="ml-1 text-blue-600 hover:underline"
            >
              Login →
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
