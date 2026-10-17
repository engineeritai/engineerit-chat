"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  INSTALL_DISMISS_KEY,
  INSTALL_OPEN_EVENT,
  dismissIsActive,
  installPlatform,
  type InstallPlatform,
} from "@/lib/installApp";
import { useMessages } from "@/lib/useMessages";

const dismissListeners = new Set<() => void>();
const installedListeners = new Set<() => void>();
let acceptedInstall = false;

function emit(set: Set<() => void>) {
  set.forEach((listener) => listener());
}

function subscribeDismiss(listener: () => void) {
  dismissListeners.add(listener);
  return () => dismissListeners.delete(listener);
}

function subscribeInstalled(listener: () => void) {
  installedListeners.add(listener);
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", listener);
  return () => {
    installedListeners.delete(listener);
    media.removeEventListener("change", listener);
  };
}

function readDismissed() {
  try {
    return dismissIsActive(localStorage.getItem(INSTALL_DISMISS_KEY));
  } catch {
    return false;
  }
}

function rememberDismiss() {
  try {
    localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
  } catch {
    /* private mode */
  }
  emit(dismissListeners);
}

function markInstalled() {
  acceptedInstall = true;
  emit(installedListeners);
}

type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function standaloneNow() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    nav.standalone === true
  );
}

export function openInstallSheet() {
  window.dispatchEvent(new Event(INSTALL_OPEN_EVENT));
}

function ShareMark() {
  return (
    <svg className="install-share-icon" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 16V4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 8l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10.5V18a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Steps({ template, shareWord }: { template: string; shareWord: string }) {
  if (!template.includes("{share}")) return <p className="install-steps">{template}</p>;
  const [before, after] = template.split("{share}");
  return (
    <p className="install-steps">
      {before}
      <span className="install-share">
        <ShareMark />
        {shareWord}
      </span>
      {after}
    </p>
  );
}

function useInstalled() {
  return useSyncExternalStore(subscribeInstalled, () => acceptedInstall || standaloneNow(), () => false);
}

export function InstallTrigger({
  variant,
  onDone,
}: {
  variant: "sidebar" | "chat" | "pricing";
  onDone?: () => void;
}) {
  const { shell } = useMessages();
  const installed = useInstalled();

  if (installed) return null;
  const label = variant === "pricing" ? shell.install.pricingLine : shell.install.menu;
  const className =
    variant === "chat" ? "chat-side-row" : variant === "pricing" ? "install-pricing" : "app-side-link install-menu";

  return (
    <button
      type="button"
      className={className}
      data-testid={variant === "pricing" ? "install-pricing" : "install-menu"}
      onClick={() => {
        onDone?.();
        openInstallSheet();
      }}
    >
      {label}
    </button>
  );
}

function useMobileWidth() {
  return useSyncExternalStore(
    (listener) => {
      const media = window.matchMedia("(max-width: 1024px)");
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    },
    () => window.matchMedia("(max-width: 1024px)").matches,
    () => false
  );
}

function usePlatform() {
  return useSyncExternalStore(
    () => () => {},
    () =>
      installPlatform(navigator.userAgent, {
        platform: navigator.platform,
        maxTouchPoints: navigator.maxTouchPoints,
      }),
    () => "other" as InstallPlatform
  );
}

export default function InstallApp() {
  const { shell } = useMessages();
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);
  const [sheet, setSheet] = useState(false);
  const platform = usePlatform();
  const installed = useInstalled();
  const dismissed = useSyncExternalStore(subscribeDismiss, readDismissed, () => false);
  const mobile = useMobileWidth();

  useEffect(() => {
    const onPrompt = (event: Event) => {
      const candidate = event as PromptEvent;
      if (typeof candidate.prompt !== "function") return;
      event.preventDefault();
      setPrompt(candidate);
    };
    const onInstalled = () => {
      setPrompt(null);
      setSheet(false);
      markInstalled();
    };
    const onOpen = () => setSheet(true);
    document.documentElement.dataset.installReady = "1";
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(INSTALL_OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(INSTALL_OPEN_EVENT, onOpen);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice.catch(() => ({ outcome: "dismissed" as const }));
    setPrompt(null);
    if (choice.outcome === "accepted") {
      setSheet(false);
      markInstalled();
    }
  }

  const ios = platform === "ios-safari" || platform === "ios-other";
  const showBanner = !installed && !dismissed && (ios || (mobile && Boolean(prompt)));
  const steps =
    platform === "ios-other"
      ? shell.install.iosOther
      : platform === "ios-safari"
        ? shell.install.iosSafari
        : shell.install.browserMenu;

  return (
    <>
      {showBanner ? (
        <div className="install-banner" data-testid="install-banner" role="region" aria-label={shell.install.bannerTitle}>
          <div className="install-banner-copy">
            <strong>{shell.install.bannerTitle}</strong>
            {prompt ? <p>{shell.install.bannerBody}</p> : <Steps template={steps} shareWord={shell.install.share} />}
          </div>
          {prompt ? (
            <button type="button" className="install-banner-go" data-testid="install-go" onClick={() => void install()}>
              {shell.install.install}
            </button>
          ) : null}
          <button type="button" className="install-banner-dismiss" onClick={rememberDismiss} aria-label={shell.install.notNow}>
            ×
          </button>
        </div>
      ) : null}
      {sheet ? (
        <div className="install-sheet-backdrop" onClick={() => setSheet(false)}>
          <div
            className="install-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-sheet-title"
            data-testid="install-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="install-sheet-title">{shell.install.bannerTitle}</h2>
            {prompt ? (
              <>
                <p>{shell.install.bannerBody}</p>
                <button type="button" className="install-banner-go" data-testid="install-go" onClick={() => void install()}>
                  {shell.install.install}
                </button>
              </>
            ) : (
              <Steps template={steps} shareWord={shell.install.share} />
            )}
            <button type="button" className="install-sheet-close" onClick={() => setSheet(false)}>
              {shell.install.close}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
