"use client";

import LanguageToggle from "@/app/components/LanguageToggle";
import { useLocale } from "@/app/components/LocaleProvider";

export default function PaymentFailedPage() {
  const { locale } = useLocale();
  const arabic = locale === "ar";

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="flex justify-center">
          <LanguageToggle />
        </div>
        <h1 className="text-2xl font-semibold">
          {arabic ? "لم يكتمل الدفع" : "Payment not completed"}
        </h1>
        <p className="text-sm text-gray-600">
          {arabic
            ? "أُلغي الدفع أو تعذرت معالجته."
            : "Your payment was cancelled or could not be processed."}
        </p>
        <p className="text-sm text-gray-600">
          {arabic ? "يمكنك المحاولة مرة أخرى أو اختيار طريقة دفع أخرى." : "You can try again or choose another payment method."}
        </p>
        <div className="mt-4">
          <a
            href="/subscription"
            className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            {arabic ? "العودة إلى الاشتراكات" : "Back to subscriptions"}
          </a>
        </div>
      </div>
    </div>
  );
}
