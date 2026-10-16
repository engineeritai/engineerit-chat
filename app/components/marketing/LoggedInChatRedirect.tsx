"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/** Sends an already signed-in visitor from the marketing homepage straight to chat. */
export default function LoggedInChatRedirect() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled && data.session) {
          router.replace("/chat");
        }
      })
      .catch(() => {});

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) router.replace("/chat");
      }
    );

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
