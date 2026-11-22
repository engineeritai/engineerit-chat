"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readPendingCheckout } from "@/lib/checkoutClient";
import {
  clearGooglePending,
  googleCallbackError,
  googleLandingPath,
  loadGooglePending,
  oauthMetadataPatch,
  shouldStampGoogleSignup,
} from "@/lib/googleAuth";
import { currentAcquisition, trackOAuthSignup } from "@/lib/attribution";
import { supabase } from "@/lib/supabaseClient";
import { useMessages } from "@/lib/useMessages";
import type { Session } from "@supabase/supabase-js";

function storedNext() {
  try {
    return window.localStorage.getItem("engineerit_post_auth_next");
  } catch {
    return null;
  }
}

function clearStoredNext() {
  try {
    window.localStorage.removeItem("engineerit_post_auth_next");
  } catch {
    /* ignore */
  }
}

export default function GoogleCallbackPage() {
  const router = useRouter();
  const { shell: s, locale } = useMessages();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancel = false;
    let finished = false;
    let blocked = googleCallbackError(window.location.search, window.location.hash);
    let timer = 0;
    if (blocked) {
      setFailed(true);
      return () => {
        cancel = true;
      };
    }

    const fail = () => {
      if (finished || cancel) return;
      blocked = true;
      setFailed(true);
    };

    const finish = async (session: Session) => {
      if (blocked || cancel || finished || !session.access_token || !session.user) return;
      finished = true;
      window.clearTimeout(timer);
      const pending = loadGooglePending();
      const checkout = readPendingCheckout() || pending?.pending || null;
      const user = session.user;
      const fresh = shouldStampGoogleSignup(user, Date.now());
      const patch = oauthMetadataPatch({
        existing: user.user_metadata,
        fresh,
        acquisition: pending?.acquisition || currentAcquisition(),
        termsAcceptedAt: pending?.termsAcceptedAt,
        pending: checkout,
      });
      let metadata = user.user_metadata;
      let token = session.access_token;
      if (Object.keys(patch).length > 0) {
        const updated = await supabase.auth.updateUser({ data: patch }).catch(() => null);
        if (updated?.data.user?.user_metadata) metadata = updated.data.user.user_metadata;
        const latest = await supabase.auth.getSession();
        if (latest.data.session?.access_token) token = latest.data.session.access_token;
      }
      try {
        trackOAuthSignup({
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          email_confirmed_at: user.email_confirmed_at,
          confirmed_at: user.confirmed_at,
          user_metadata: metadata,
          app_metadata: user.app_metadata,
          identities: user.identities,
        });
      } catch {
        /* The account still continues. The seen list stops a second event on the next load. */
      }
      await fetch("/api/profile/ensure", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
      clearGooglePending();
      const next = googleLandingPath({
        queryNext: new URLSearchParams(window.location.search).get("next"),
        storedNext: storedNext(),
        pendingNext: pending?.next,
        hasCheckout: Boolean(checkout),
      });
      clearStoredNext();
      if (!cancel) router.replace(next);
    };

    void (async () => {
      const search = window.location.search;
      const hash = window.location.hash;
      const params = new URLSearchParams(search);
      if (googleCallbackError(search, hash)) {
        fail();
        return;
      }
      const code = params.get("code") || "";
      const existing = await supabase.auth.getSession();
      if (existing.data.session) {
        await finish(existing.data.session);
        return;
      }
      if (code) {
        const exchanged = await supabase.auth.exchangeCodeForSession(code);
        if (exchanged.data.session) await finish(exchanged.data.session);
        // A second exchange of the same code fails. The auth listener still finishes the session.
      }
    })();

    const { data: auth } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session || (event !== "SIGNED_IN" && event !== "INITIAL_SESSION")) return;
      void finish(session);
    });

    timer = window.setTimeout(() => {
      fail();
    }, 4000);

    return () => {
      cancel = true;
      window.clearTimeout(timer);
      auth.subscription.unsubscribe();
    };
  }, [router]);

  const arabic = locale === "ar";

  return (
    <div className="auth-callback" dir={arabic ? "rtl" : "ltr"}>
      <div className="auth-callback-card">
        <h1>{failed ? s.auth.googleFailed : s.auth.googleWorking}</h1>
        {failed ? (
          <div className="auth-callback-actions">
            <Link href={`/login?lang=${locale}`} className="btn auth-follow">
              {s.auth.signIn}
            </Link>
            <Link href={`/register?lang=${locale}`} className="btn btn-quiet auth-follow">
              {s.auth.create}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
