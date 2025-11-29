// app/payment/success/page.tsx
import { Suspense } from "react";
import PaymentSuccessClient from "./PaymentSuccessClient";

export const runtime = "nodejs";

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-4">
            <h1 className="text-3xl font-semibold">Payment successful</h1>
            <p className="text-sm text-gray-700">
              Finishing your subscription, please wait…
            </p>
          </div>
        </div>
      }
    >
      <PaymentSuccessClient />
    </Suspense>
  );
}
