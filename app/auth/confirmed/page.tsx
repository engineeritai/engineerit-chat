// app/auth/confirmed/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function EmailConfirmedPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/auth/login");
    }, 4000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617]">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-black/70 p-8 text-center">
        <h1 className="text-2xl font-semibold text-white mb-2">
          Email confirmed ✅
        </h1>
        <p className="text-sm text-gray-300 mb-4">
          تم تأكيد بريدك الإلكتروني بنجاح.
        </p>
        <p className="text-xs text-gray-400">
          سيتم تحويلك تلقائياً إلى صفحة تسجيل الدخول خلال ثوانٍ...
        </p>
      </div>
    </div>
  );
}
