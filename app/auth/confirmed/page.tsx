"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useLocale } from "@/app/components/LocaleProvider";

export default function EmailConfirmedPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const arabic = locale === "ar";

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
          {arabic ? "تم تأكيد البريد" : "Email confirmed"}
        </h1>
        <p className="text-sm text-gray-300 mb-4">
          {arabic
            ? "تم تأكيد بريدك الإلكتروني."
            : "Your email address is confirmed."}
        </p>
        <p className="text-xs text-gray-400">
          {arabic
            ? "سيتم تحويلك إلى صفحة الدخول خلال ثوانٍ."
            : "You will be redirected to the sign-in page in a few seconds."}
        </p>
      </div>
    </div>
  );
}
