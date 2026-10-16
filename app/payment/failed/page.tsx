"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PaymentFailedPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/pricing?payment=failed");
  }, [router]);
  return null;
}
