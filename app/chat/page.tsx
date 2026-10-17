"use client";

import React, {
  useEffect,
  useRef,
  useState,
  KeyboardEvent,
  ChangeEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import Link from "next/link";
import MarketingShell from "../components/marketing/MarketingShell";
import ComposerPlus from "../components/ComposerPlus";
import EitMark from "../components/marketing/EitMark";
import { localPlanPreview } from "../components/marketing/AccountState";
import ToolGlyph, { ToolLockIcon } from "../components/ToolGlyph";
import AdvisorGlyph, { AdvisorsMenuGlyph } from "../components/AdvisorGlyph";
import ToolUnlockSheet from "../components/ToolUnlockSheet";
import Sidebar from "../components/Sidebar";
import { DISCIPLINES } from "@/lib/disciplines";
import { supabase } from "@/lib/supabaseClient";
import { useMessages } from "@/lib/useMessages";
import { disciplineLabel, toolLabel } from "@/lib/labels";
import { postDocument, postImage, readApiError } from "@/lib/postAttachment";
import { MAX_UPLOAD_BYTES, UploadError, fileTooLargeMessage } from "@/lib/uploadLimits";
import { canShareChatWithTeam } from "@/lib/historyRetention";
import { useChatHistory, type ChatMessage } from "@/lib/useChatHistory";
import type { HistoryCode } from "@/lib/chatHistoryClient";
import { ENGINEER_TOOLS, type EngineerToolId } from "@/lib/engineerTools";
import { ADVISOR_IDS, hasAdvisorAccess, unlockPlanForAdvisor, type AdvisorId } from "@/lib/advisors";
import { trackProduct } from "@/lib/attribution";
import { featureTier, HEADER_PLAN_ABBREV, PLAN_THEME, type PlanId, type SelfServePlanId } from "@/lib/plans";
import { hasToolAccess, toolRequiredPlan } from "@/lib/toolAccess";
import { resolveEffectivePlan } from "@/lib/effectivePlan";

type Attachment = {
  id: string;
  name: string;
  type: "image" | "file";
  url?: string; // data URL for images, object URL for files. Omitted after reload.
  file?: File;
  mime?: string;
  size?: number;
};

type Message = ChatMessage;

function uuid() {
  return Math.random().toString(36).slice(2);
}

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

/* ============================
   Helpers: RTL + Export/Share
   ============================ */

function isArabicText(text: string) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildHtmlDocument(aiText: string) {
  const rtl = isArabicText(aiText);
  const safe = escapeHtml(aiText);

  return `<!doctype html>
<html lang="${rtl ? "ar" : "en"}" dir="${rtl ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>engineerit.ai</title>
<style>
  *{box-sizing:border-box}
  body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px;color:#111827;background:#fff;}
  .wrap{max-width:980px;margin:0 auto;}
  .card{border:1px solid #e5e7eb;border-radius:16px;padding:18px;background:#fff;}
  pre{white-space:pre-wrap;word-break:break-word;margin:0;font:inherit;line-height:1.6;}
  .footer{margin-top:14px;color:#6b7280;font-size:12px}
</style>
</head>
<body>
  <div class="wrap">
    <div class="card"><pre>${safe}</pre></div>
    <div class="footer">— engineerit.ai</div>
  </div>
</body>
</html>`;
}

function htmlFileFromText(aiText: string) {
  const html = buildHtmlDocument(aiText);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });

  // IMPORTANT: extension for iOS share + WhatsApp compatibility
  const file = new File([blob], "engineerit.ai.html", {
    type: "text/html",
  });

  return { html, blob, file };
}

async function copyAsHtml(aiText: string) {
  const { html } = htmlFileFromText(aiText);
  try {
    // @ts-ignore
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([aiText], { type: "text/plain" }),
      });
      // @ts-ignore
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch {}
  try {
    await navigator.clipboard.writeText(aiText);
    return true;
  } catch {}
  return false;
}

function saveHtml(aiText: string) {
  const { blob } = htmlFileFromText(aiText);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "engineerit.ai.html";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Modern reliable print (avoids popup + blank print)
 * - Creates hidden iframe
 * - Writes HTML
 * - Prints after render tick
 */
function printHtml(aiText: string) {
  const html = buildHtmlDocument(aiText);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => iframe.remove(), 900);
    }
  }, 250);
}

/**
 * ✅ REAL PDF export for Professional/Consultant
 * Downloads a true PDF file from /api/export/pdf (works on Windows + iOS + Android).
 */
async function exportPdf(aiText: string) {
  const res = await fetch("/api/export/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "engineerit.ai",
      content: aiText,
      filename: "engineerit.ai",
    }),
  });

  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "engineerit.ai.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function nativeShareHtml(aiText: string) {
  const { file } = htmlFileFromText(aiText);
  try {
    // @ts-ignore
    if (navigator.share) {
      // @ts-ignore
      if (navigator.canShare?.({ files: [file] })) {
        // @ts-ignore
        await navigator.share({
          title: "engineerit.ai",
          text: "engineerit.ai",
          files: [file],
        });
        return true;
      }
      // @ts-ignore
      await navigator.share({
        title: "engineerit.ai",
        text: aiText.slice(0, 4000),
      });
      return true;
    }
  } catch {}
  return false;
}

function shareToWhatsApp(text: string) {
  const payload = text.slice(0, 8000);
  const wa = `https://wa.me/?text=${encodeURIComponent(payload)}`;
  window.open(wa, "_blank", "noopener,noreferrer");
}

async function exportWordDocx(aiText: string) {
  const res = await fetch("/api/export/docx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: aiText }),
  });
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "engineerit.ai.docx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function exportPptx(aiText: string) {
  const res = await fetch("/api/export/pptx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: aiText }),
  });
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "engineerit.ai.pptx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ============================
   Daily limits (client quick)
   ============================ */

function todayUTCKey() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getLocalCount(key: string) {
  try {
    const v = window.localStorage.getItem(key);
    return v ? Number(v) || 0 : 0;
  } catch {
    return 0;
  }
}

function setLocalCount(key: string, n: number) {
  try {
    window.localStorage.setItem(key, String(n));
  } catch {}
}

function historyNoticeText(
  code: HistoryCode,
  copy: {
    historyLoadFailed: string;
    historySaveFailed: string;
    historyActionFailed: string;
    exportChatFailed: string;
    exportChatLocked: string;
    shareTeamFailed: string;
    shareTeamNeedsLink: string;
  }
) {
  switch (code) {
    case "export_locked":
      return copy.exportChatLocked;
    case "team_unlinked":
      return copy.shareTeamNeedsLink;
    case "unauthorized":
    case "not_found":
      return copy.historyLoadFailed;
    default:
      return copy.historyActionFailed;
  }
}

export default function Page() {
  const [discipline, setDiscipline] = useState("General");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  const [isGuest, setIsGuest] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [planReady, setPlanReady] = useState(false);
  const [planId, setPlanId] = useState<PlanId>("assistant");
  const [advisorPlan, setAdvisorPlan] = useState("guest");
  const { locale, shell: s, m } = useMessages();
  const history = useChatHistory({
    locale,
    discipline,
    draftTitle: s.chat.newConversation,
  });

  const [showMobileTools, setShowMobileTools] = useState(false);

  const [showLanding, setShowLanding] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [advisorsOpen, setAdvisorsOpen] = useState(false);
  const [activeAdvisor, setActiveAdvisor] = useState<AdvisorId | null>(null);
  const [listening, setListening] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const openedThread = useRef(false);
  const homeQuerySent = useRef(false);
  const toolApplied = useRef(false);

  useEffect(() => {
    const openDrawer = () => setIsSidebarOpenMobile(true);
    window.addEventListener("engineerit-open-chat-drawer", openDrawer);
    return () => window.removeEventListener("engineerit-open-chat-drawer", openDrawer);
  }, []);

  const [openShareFor, setOpenShareFor] = useState<string | null>(null);

  // Gate modal (Register / Upgrade)
  const [showGate, setShowGate] = useState(false);
  const [unlockPlan, setUnlockPlan] = useState<SelfServePlanId | null>(null);
  const [gateMode, setGateMode] = useState<"register" | "upgrade">("register");
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const tier = featureTier(planId);
  const isPaidPlan = tier !== "assistant";

  const attachmentsAllowed = isPaidPlan && !isGuest;

  const canExportPdf = tier === "professional" || tier === "consultant";
  const canExportWordPpt = tier === "consultant";
  const canShareBenefits = tier !== "assistant";
  const canShareTeam = canShareChatWithTeam(planId) && !isGuest;
  const canExportChat = canExportPdf && !isGuest;

  useEffect(() => {
    const loadPlan = async () => {
      const preview = localPlanPreview();
      if (preview) {
        setPlanId(preview.plan);
        setIsGuest(false);
        setAdvisorPlan(preview.plan);
        return;
      }
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setPlanId("assistant");
          setIsGuest(true);
          setUserId(null);
          setAdvisorPlan("guest");
          return;
        }

        setIsGuest(false);
        setUserId(user.id);
        const effective = await resolveEffectivePlan(supabase, user.id);
        setPlanId(effective);
        setAdvisorPlan(effective);
      } catch (err) {
        console.error(err);
        setPlanId("assistant");
        setIsGuest(true);
        setUserId(null);
        setAdvisorPlan("guest");
      }
    };

    void loadPlan().finally(() => setPlanReady(true));
  }, []);

  useEffect(() => {
    const speech = window as Window & {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    setMicReady(Boolean(speech.SpeechRecognition || speech.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    if (openedThread.current) return;
    const id = new URLSearchParams(window.location.search).get("c");
    if (!id) return;
    if (!history.threads.some((item) => item.id === id)) return;
    history.selectThread(id);
    openedThread.current = true;
  }, [history]);

  useEffect(() => {
    try {
      const KEY = "engineerit_landing_seen_v1";
      const seen = window.localStorage.getItem(KEY);
      if (!seen) setShowLanding(true);
    } catch {
      setShowLanding(true);
    }
  }, []);

  const handleCloseLanding = () => {
    try {
      const KEY = "engineerit_landing_seen_v1";
      window.localStorage.setItem(KEY, "yes");
    } catch {}
    setShowLanding(false);
  };

  const thread = history.thread;
  const messages: Message[] = thread?.messages ?? [];

  useEffect(() => {
    if (thread?.discipline) setDiscipline(thread.discipline);
    // Resume the saved discipline only when the selected chat changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.id]);

  function onNewChat() {
    history.onNewChat();
  }

  function onSelectThread(id: string) {
    history.selectThread(id);
  }

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!attachmentsAllowed) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadNotice(fileTooLargeMessage(locale));
      e.target.value = "";
      return;
    }
    setUploadNotice(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      const url = reader.result as string;
      setAttachments((prev) => [
        ...prev,
        { id: uuid(), name: file.name, type: "image", url, file },
      ]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!attachmentsAllowed) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadNotice(fileTooLargeMessage(locale));
      e.target.value = "";
      return;
    }
    setUploadNotice(null);

    const url = URL.createObjectURL(file);
    setAttachments((prev) => [
      ...prev,
      { id: uuid(), name: file.name, type: "file", url, file },
    ]);
    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  async function analyzeImage(question: string, imageFile: File): Promise<string> {
    const res = await postImage({
      file: imageFile,
      question: question || s.chat.analyzeImage,
      locale,
      advisorId: activeAdvisor || undefined,
    });
    if (!res.ok) {
      const failure = await readApiError(res);
      throw new UploadError(
        failure.message || s.chat.imageFailed,
        res.status,
        failure.code
      );
    }
    const data = (await res.json()) as { reply: string };
    return data.reply || "";
  }

  async function analyzeDocument(question: string, docFile: File): Promise<string> {
    const res = await postDocument({
      file: docFile,
      question: question || s.chat.analyzeDocument,
      locale,
      advisorId: activeAdvisor || undefined,
    });
    if (!res.ok) {
      const failure = await readApiError(res);
      throw new UploadError(
        failure.message ||
          s.chat.documentFailed,
        res.status,
        failure.code
      );
    }
    const data = (await res.json()) as { reply: string };
    return data.reply || "";
  }

  function insertTemplate(template: string) {
    setInput((prev) => (prev ? `${prev}\n\n${template}` : template));
  }

  function toggleDictation() {
    const speech = window as Window & {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    const Ctor = speech.SpeechRecognition || speech.webkitSpeechRecognition;
    if (!Ctor) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = locale === "ar" ? "ar-SA" : "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (event) => {
      const text = Array.from(event.results)
        .map((row) => row[0]?.transcript || "")
        .join(" ")
        .trim();
      if (text) setInput(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  const handleEngineerToolClick = (toolId: EngineerToolId) => {
    switch (toolId) {
      case "drawing":
      case "design":
      case "itp":
      case "boq":
      case "schedule":
      case "value":
      case "dashboard":
        insertTemplate(s.chat.prompts[toolId]);
        break;
      default:
        break;
    }
  };

  function openRegisterGate(msg?: string) {
    setGateMode("register");
    setLimitNotice(msg || null);
    setShowGate(true);
  }

  function openUpgradeGate(msg?: string) {
    setGateMode("upgrade");
    setLimitNotice(msg || null);
    setShowGate(true);
  }

  function checkDailyLimitOrGate() {
    if (typeof window === "undefined") return { ok: true as const, key: "", cur: 0 };

    const day = todayUTCKey();
    const planKey = isGuest ? "guest" : planId;
    const key = `engineerit_daily_${planKey}_${day}`;
    const cur = getLocalCount(key);

    const max = isGuest ? 1 : planId === "assistant" ? 3 : Number.POSITIVE_INFINITY;
    if (Number.isFinite(max) && cur >= max) {
      const msg =
        isGuest
          ? s.chat.dailyGuest
          : s.chat.dailyPaid;
      if (isGuest) openRegisterGate(msg);
      else if (planId === "assistant") openUpgradeGate(msg);
      return { ok: false as const, key, cur };
    }
    return { ok: true as const, key, cur };
  }

  function incrementLocalDailyCount(key: string, cur: number) {
    if (!key) return;
    setLocalCount(key, cur + 1);
  }

  async function send(preset?: string) {
    const userText = (preset ?? input).trim();
    if (!thread || !thread.owned || (!userText && attachments.length === 0) || sending) return false;

    const check = checkDailyLimitOrGate();
    if (!check.ok) {
      if (preset) setInput(preset);
      return false;
    }
    if (activeAdvisor && !hasAdvisorAccess(planId, activeAdvisor, isGuest)) {
      setUnlockPlan(unlockPlanForAdvisor(activeAdvisor));
      return false;
    }

    const starting = !thread.messages.some((message) => message.role === "user");
    if (starting) trackProduct("chat_started", { plan: isGuest ? "guest" : planId });

    const userAttachments = attachments;
    setInput("");
    setAttachments([]);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userText || s.chat.attachmentOnly,
      attachments: userAttachments.map((item) => ({
        ...item,
        mime: item.file?.type || item.mime,
        size: item.file?.size ?? item.size,
      })),
    };
    history.appendLocal(userMessage, userText);
    const savedUser = history.persistMessages([userMessage]);

    const pushAssistant = async (content: string) => {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content,
      };
      history.appendLocal(assistantMessage);
      await savedUser;
      await history.persistMessages([assistantMessage]);
    };

    setSending(true);

    try {
      const docAttachment = userAttachments.find((a) => a.type === "file" && a.file);
      const imgAttachment = userAttachments.find((a) => a.type === "image" && a.file);

      if (docAttachment) {
        const reply = await analyzeDocument(userText, docAttachment.file!);
        await pushAssistant(reply);
        incrementLocalDailyCount(check.key, check.cur);
      } else if (imgAttachment) {
        const reply = await analyzeImage(userText, imgAttachment.file!);
        await pushAssistant(reply);
        incrementLocalDailyCount(check.key, check.cur);
      } else {
        const payloadMessages = (thread.messages || []).concat({
          id: userMessage.id,
          role: "user" as const,
          content: userText,
        });

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            discipline: disciplineLabel(locale, discipline),
            locale,
            messages: payloadMessages,
            planId: isGuest ? "guest" : planId,
            userId: userId,
            ...(activeAdvisor ? { advisorId: activeAdvisor } : {}),
          }),
        });

        if (res.status === 429) {
          const data = await res.json().catch(() => null);
          const msg =
            data?.error || (isGuest ? s.chat.dailyGuest : s.chat.dailyPaid);
          if (isGuest) openRegisterGate(msg);
          else if (planId === "assistant") openUpgradeGate(msg);

          await pushAssistant(isGuest ? s.chat.dailyGuestReply : s.chat.dailyPaidReply);
          return;
        }

        if (!res.ok) throw new Error(await res.text());

        const data = (await res.json()) as { reply: string };

        await pushAssistant(data.reply || "");

        incrementLocalDailyCount(check.key, check.cur);
      }
    } catch (e) {
      console.error(e);
      const content =
        e instanceof UploadError
          ? e.message
          : s.chat.sorry;
      await pushAssistant(content);
    } finally {
      setSending(false);
    }
    return true;
  }

  useEffect(() => {
    if (!planReady || history.loading || homeQuerySent.current || sending) return;
    if (!thread?.owned) return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q")?.trim();
    if (!q) return;
    if (thread.messages.length > 0) {
      history.onNewChat();
      return;
    }
    homeQuerySent.current = true;
    void send(q).then((started) => {
      if (!started) {
        homeQuerySent.current = false;
        return;
      }
      params.delete("q");
      const rest = params.toString();
      window.history.replaceState(null, "", rest ? `${window.location.pathname}?${rest}` : window.location.pathname);
    });
    // Send the landing question once the plan and an empty thread are ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planReady, history.loading, thread?.id, thread?.owned, thread?.messages.length, sending]);

  useEffect(() => {
    if (!planReady || toolApplied.current) return;
    const params = new URLSearchParams(window.location.search);
    const tool = params.get("tool")?.trim();
    if (!tool) return;
    const engineerTool = ENGINEER_TOOLS.find((item) => item.id === tool);
    if (tool !== "advisors" && !engineerTool) return;
    if (!isGuest && engineerTool && !hasToolAccess(planId, engineerTool.id)) {
      toolApplied.current = true;
      setUnlockPlan(toolRequiredPlan(engineerTool.id));
      params.delete("tool");
      const rest = params.toString();
      window.history.replaceState(null, "", rest ? `${window.location.pathname}?${rest}` : window.location.pathname);
      return;
    }
    const prompt = tool === "advisors" ? s.chat.advisorPrompt : s.chat.prompts[tool as EngineerToolId];
    if (!prompt) return;
    toolApplied.current = true;
    setInput((prev) => (prev ? `${prev}\n\n${prompt}` : prompt));
    params.delete("tool");
    const rest = params.toString();
    window.history.replaceState(null, "", rest ? `${window.location.pathname}?${rest}` : window.location.pathname);
    requestAnimationFrame(() => composerRef.current?.focus());
  }, [planReady, planId, isGuest, s.chat.advisorPrompt, s.chat.prompts]);

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <MarketingShell>
    <div className="app-shell chat-page">
      <Sidebar
        onRefresh={() => history.refresh()}
        discipline={discipline}
        onDisciplineChange={(value) => {
          setDiscipline(value);
          void history.syncDiscipline(value);
        }}
        onNewChat={onNewChat}
        threads={history.threads}
        currentThreadId={history.currentThreadId}
        onSelectThread={onSelectThread}
        isMobileOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
        signedIn={!isGuest}
        historyQuery={history.query}
        onHistoryQuery={history.setQuery}
        historyLoading={history.loading}
        onRenameThread={(id, title) => void history.renameThread(id, title)}
        onPinThread={(id, pinned) => void history.pinThread(id, pinned)}
        onDeleteThread={(id) => void history.deleteThread(id)}
        onShareThread={(id, shared) => void history.shareThread(id, shared)}
        canShareTeam={canShareTeam}
      />

      <div className={"main" + (messages.length === 0 ? " is-start" : "")}>
          {history.notice && (
            <p className="history-banner">
              {history.notice === "failed"
                ? s.chat.historySaveFailed
                : historyNoticeText(history.notice, s.chat)}
            </p>
          )}
          {messages.length === 0 ? (
            <div className="chat-start">
              <EitMark size={48} title="eit" />
              <h1>{s.chat.greeting}</h1>
            </div>
          ) : (
            <div className="conversation">
          {canExportChat && thread?.persisted && messages.length > 0 && (
            <div className="history-export">
              <button type="button" className="msg-action-btn" onClick={() => void history.exportCurrent("pdf")}>
                {s.chat.exportChatPdf}
              </button>
              <button type="button" className="msg-action-btn" onClick={() => void history.exportCurrent("docx")}>
                {s.chat.exportChatWord}
              </button>
            </div>
          )}
            {messages.map((m) => {
              const rtl = isArabicText(m.content);
              const hasAtt = (m.attachments?.length || 0) > 0;

              return (
                <div
                  key={m.id}
                  className={
                    "message-row " +
                    (m.role === "user" ? "message-user" : "message-assistant")
                  }
                >
                  <div className="message-avatar">{m.role === "user" ? s.chat.you : s.chat.ai}</div>

                  <div className="message-bubble">
                    <div className="msg-content" dir={rtl ? "rtl" : "ltr"}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>

                    {/* ✅ Show attachments under the user question */}
                    {hasAtt && (
                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 10,
                        }}
                      >
                        {m.attachments!.map((a) => (
                          <div
                            key={a.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "8px 10px",
                              border: "1px solid #e5e7eb",
                              borderRadius: 10,
                              background: "#fff",
                              maxWidth: 360,
                            }}
                          >
                            <span>{a.type === "image" ? "🖼️" : "📄"}</span>

                            {a.type === "image" && a.url ? (
                              <a
                                href={a.url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: "flex", alignItems: "center", gap: 10 }}
                              >
                                <img
                                  src={a.url}
                                  alt={a.name}
                                  style={{
                                    width: 46,
                                    height: 46,
                                    objectFit: "cover",
                                    borderRadius: 8,
                                    border: "1px solid #e5e7eb",
                                  }}
                                />
                                <span style={{ fontSize: 12, color: "#111827" }}>
                                  {a.name}
                                </span>
                              </a>
                            ) : a.url ? (
                              <a
                                href={a.url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: 12,
                                  color: "#111827",
                                  textDecoration: "underline",
                                }}
                              >
                                {a.name}
                              </a>
                            ) : (
                              <span style={{ fontSize: 12, color: "#111827" }}>{a.name}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {m.role === "assistant" && (
                      <div className="msg-actions">
                        {planId === "assistant" && isGuest ? (
                          <span style={{ fontSize: 12, color: "#6b7280" }}>
                            {s.chat.registerActions}
                          </span>
                        ) : planId === "assistant" && !isGuest ? (
                          <span style={{ fontSize: 12, color: "#6b7280" }}>
                            {s.chat.upgradeActions}
                          </span>
                        ) : (
                          <>
                            {canShareBenefits && (
                              <>
                                <button
                                  type="button"
                                  className="msg-action-btn"
                                  onClick={async () => {
                                    const ok = await copyAsHtml(m.content);
                                    if (!ok) alert(s.chat.copyFailed);
                                  }}
                                  aria-label={s.chat.copy}
                                  title={s.chat.copy}
                                >
                                  📋 {s.chat.copy}
                                </button>

                                <button
                                  type="button"
                                  className="msg-action-btn"
                                  onClick={async () => {
                                    const ok = await nativeShareHtml(m.content);
                                    if (ok) return;
                                    setOpenShareFor((prev) => (prev === m.id ? null : m.id));
                                  }}
                                  aria-label={s.chat.share}
                                  title={s.chat.share}
                                >
                                  🔗 {s.chat.share}
                                </button>

                                {/* ✅ Professional + Consultant */}
                                {canExportPdf && (
                                  <button
                                    type="button"
                                    className="msg-action-btn"
                                    onClick={async () => {
                                      try {
                                        await exportPdf(m.content);
                                      } catch (e) {
                                        console.error(e);
                                        alert(s.chat.pdfFailed);
                                      }
                                    }}
                                    title={s.chat.exportPdf}
                                  >
                                    📄 PDF
                                  </button>
                                )}

                                {/* ✅ Consultant only */}
                                {canExportWordPpt && (
                                  <>
                                    <button
                                      type="button"
                                      className="msg-action-btn"
                                      onClick={async () => {
                                        try {
                                          await exportWordDocx(m.content);
                                        } catch (e) {
                                          console.error(e);
                                          alert(s.chat.wordFailed);
                                        }
                                      }}
                                      title={s.chat.exportWord}
                                    >
                                      📝 Word
                                    </button>

                                    <button
                                      type="button"
                                      className="msg-action-btn"
                                      onClick={async () => {
                                        try {
                                          await exportPptx(m.content);
                                        } catch (e) {
                                          console.error(e);
                                          alert(s.chat.pptFailed);
                                        }
                                      }}
                                      title={s.chat.exportPpt}
                                    >
                                      📊 PPT
                                    </button>
                                  </>
                                )}
                              </>
                            )}

                            {openShareFor === m.id && (
                              <div
                                style={{
                                  marginTop: 6,
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 8,
                                  paddingLeft: 8,
                                }}
                              >
                                <button
                                  type="button"
                                  className="msg-action-btn"
                                  onClick={() => saveHtml(m.content)}
                                >
                                  {s.chat.saveHtml}
                                </button>

                                <button
                                  type="button"
                                  className="msg-action-btn"
                                  onClick={() => printHtml(m.content)}
                                >
                                  {s.chat.print}
                                </button>

                                <button
                                  type="button"
                                  className="msg-action-btn"
                                  onClick={() => shareToWhatsApp(m.content)}
                                >
                                  {s.chat.whatsapp}
                                </button>

                                <button
                                  type="button"
                                  className="msg-action-btn"
                                  onClick={() => setOpenShareFor(null)}
                                >
                                  ✕ {s.chat.closeShare}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          )}

        <div className="composer">
          <div className="composer-box">
            {uploadNotice && (
              <div className="upload-notice" role="alert">
                {uploadNotice}
              </div>
            )}
            {attachments.length > 0 && (
              <div className="attachments">
                {attachments.map((a) => (
                  <div key={a.id} className="attachment-pill">
                    {a.type === "image" ? "🖼️" : "📄"}{" "}
                    <span className="attachment-name">{a.name}</span>
                    <button
                      className="attachment-remove"
                      onClick={() => removeAttachment(a.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {thread && !thread.owned && <p className="history-note">{s.chat.sharedReadOnly}</p>}
            {activeAdvisor ? (
              <div className="advisor-mode-chip">
                <AdvisorGlyph id={activeAdvisor} />
                <span>{m.advisors.items[activeAdvisor].flowLabel}</span>
                <button type="button" aria-label={s.chat.removeAdvisor} onClick={() => setActiveAdvisor(null)}>
                  ✕
                </button>
              </div>
            ) : null}
            <div className="chat-input-row">
              <div className="chat-input-left" style={{ position: "relative" }}>
                <button
                  type="button"
                  className="chat-input-icon-btn is-plus"
                  aria-label={s.chat.addAttachments}
                  aria-expanded={toolsOpen}
                  onClick={() => {
                    setToolsOpen((value) => !value);
                    setAdvisorsOpen(false);
                  }}
                >
                  <ComposerPlus />
                </button>
                {toolsOpen && (
                  <div className="tool-popover plus-menu" role="menu">
                    <p className="plus-menu-label">{s.chat.discipline}</p>
                    <select
                      className="select"
                      value={discipline}
                      aria-label={s.chat.discipline}
                      onChange={(event) => {
                        setDiscipline(event.target.value);
                        void history.syncDiscipline(event.target.value);
                      }}
                    >
                      {DISCIPLINES.map((item) => (
                        <option key={item} value={item}>
                          {disciplineLabel(locale, item)}
                        </option>
                      ))}
                    </select>
                    <p className="plus-menu-label">{s.chat.toolsMenu}</p>
                    {ENGINEER_TOOLS.map((tool) => {
                      const enabled = hasToolAccess(planId, tool.id);
                      const required = toolRequiredPlan(tool.id);
                      const theme = PLAN_THEME[required];
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          className={"tool-row" + (enabled ? "" : " is-locked")}
                          onClick={() => {
                            setToolsOpen(false);
                            if (!enabled) {
                              setUnlockPlan(required);
                              return;
                            }
                            handleEngineerToolClick(tool.id);
                          }}
                        >
                          <ToolGlyph id={tool.id} />
                          <span className="tool-row-label">{toolLabel(locale, tool.id)}</span>
                          {enabled ? null : (
                            <span className="tool-row-meta">
                              <ToolLockIcon />
                              <span
                                className="tool-plan-pill"
                                style={{ background: theme.soft, color: theme.accent }}
                              >
                                {HEADER_PLAN_ABBREV[required]}
                              </span>
                            </span>
                          )}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className="tool-row"
                      aria-expanded={advisorsOpen}
                      onClick={() => setAdvisorsOpen((open) => !open)}
                    >
                      <AdvisorsMenuGlyph />
                      <span className="tool-row-label">{s.chat.advisorsMenu}</span>
                      <span className="advisor-menu-chevron" aria-hidden="true">
                        {advisorsOpen ? "▴" : "▾"}
                      </span>
                    </button>
                    {advisorsOpen ? (
                      <div className="advisor-menu-sub">
                        {ADVISOR_IDS.map((id) => {
                          const enabled = hasAdvisorAccess(planId, id, isGuest);
                          const required = unlockPlanForAdvisor(id);
                          const theme = PLAN_THEME[required];
                          return (
                            <button
                              key={id}
                              type="button"
                              className={"tool-row" + (enabled ? "" : " is-locked")}
                              onClick={() => {
                                setToolsOpen(false);
                                setAdvisorsOpen(false);
                                if (!enabled) {
                                  setUnlockPlan(required);
                                  return;
                                }
                                setActiveAdvisor(id);
                              }}
                            >
                              <AdvisorGlyph id={id} />
                              <span className="tool-row-label">{m.advisors.items[id].flowLabel}</span>
                              {enabled ? null : (
                                <span className="tool-row-meta">
                                  <ToolLockIcon />
                                  <span
                                    className="tool-plan-pill"
                                    style={{ background: theme.soft, color: theme.accent }}
                                  >
                                    {HEADER_PLAN_ABBREV[required]}
                                  </span>
                                </span>
                              )}
                            </button>
                          );
                        })}
                        <Link className="advisor-menu-all" href="/advisors" onClick={() => setToolsOpen(false)}>
                          {s.chat.viewAllAdvisors}
                        </Link>
                      </div>
                    ) : null}
                    <p className="plus-menu-label">{s.chat.addAttachments}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setToolsOpen(false);
                        if (!attachmentsAllowed) {
                          if (isGuest) openRegisterGate(s.chat.attachLocked);
                          else openUpgradeGate(s.chat.attachLocked);
                          return;
                        }
                        document.getElementById("image-upload")?.click();
                      }}
                    >
                      {s.chat.photo}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setToolsOpen(false);
                        if (!attachmentsAllowed) {
                          if (isGuest) openRegisterGate(s.chat.attachLocked);
                          else openUpgradeGate(s.chat.attachLocked);
                          return;
                        }
                        document.getElementById("file-upload")?.click();
                      }}
                    >
                      {s.chat.document}
                    </button>
                  </div>
                )}
              </div>

              <textarea
                ref={composerRef}
                className="textarea"
                placeholder={thread && !thread.owned ? s.chat.sharedReadOnly : s.chat.askPlaceholder}
                value={input}
                disabled={Boolean(thread && !thread.owned)}
                rows={1}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "44px";
                  e.target.style.height = Math.min(e.target.scrollHeight, 180) + "px";
                }}
                onKeyDown={onKeyDown}
              />

              {micReady && (
                <button
                  type="button"
                  className={"mic-btn" + (listening ? " is-live" : "")}
                  aria-label={listening ? s.chat.listening : s.chat.dictate}
                  aria-pressed={listening}
                  onClick={toggleDictation}
                >
                  {listening ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <rect x="7" y="7" width="10" height="10" rx="2" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 19v3" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <rect x="9" y="2" width="6" height="13" rx="3" />
                    </svg>
                  )}
                </button>
              )}

              {input.trim() || attachments.length > 0 || !micReady ? (
                <button
                  type="button"
                  className="chat-input-send-btn"
                  disabled={Boolean(thread && !thread.owned) || sending || (!input.trim() && attachments.length === 0)}
                  onClick={() => void send()}
                  aria-label={s.chat.send}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 19V5" />
                    <path d="m5 12 7-7 7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  className="chat-voice-btn"
                  aria-label={listening ? s.chat.listening : s.chat.dictate}
                  aria-pressed={listening}
                  onClick={toggleDictation}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                    <path d="M2 10v4" />
                    <path d="M6 7v10" />
                    <path d="M10 4v16" />
                    <path d="M14 7v10" />
                    <path d="M18 5v14" />
                    <path d="M22 10v4" />
                  </svg>
                </button>
              )}
            </div>

            <input
              type="file"
              id="image-upload"
              accept="image/*"
              hidden
              onChange={handleImageChange}
              disabled={!attachmentsAllowed}
            />
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.mpp,.dwg,.dxf,.m,.mat,.slx,.sldprt,.sldasm,.step,.stp,.iges,.inp"
              hidden
              onChange={handleFileChange}
              disabled={!attachmentsAllowed}
            />
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="chat-suggestions" role="list">
            {[s.chat.promptA, s.chat.promptB, s.chat.promptC, s.chat.promptD].map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="chat-suggestion"
                role="listitem"
                onClick={() => {
                  setInput(prompt);
                  composerRef.current?.focus();
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}

        {unlockPlan ? <ToolUnlockSheet planId={unlockPlan} onClose={() => setUnlockPlan(null)} /> : null}

        {/* Gate modal */}
        {showGate && (
          <div className="gate-overlay" role="dialog" aria-modal="true">
            <div className="gate-modal">
              <div className="gate-title">
                {gateMode === "register" ? s.chat.registerTitle : s.chat.upgradeTitle}
              </div>

              {limitNotice && <div className="gate-note">{limitNotice}</div>}

              {gateMode === "register" ? (
                <div className="gate-body">
                  <div className="gate-text">{s.chat.registerBody}</div>
                  <div className="gate-actions">
                    <a
                      className="gate-btn"
                      href="/login"
                      onClick={(event) => {
                        event.preventDefault();
                        const next = window.location.pathname + window.location.search;
                        window.location.assign(`/login?next=${encodeURIComponent(next)}`);
                      }}
                    >
                      {s.header.login}
                    </a>
                    <a
                      className="gate-btn gate-btn-primary"
                      href="/register"
                      onClick={(event) => {
                        event.preventDefault();
                        const next = window.location.pathname + window.location.search;
                        window.location.assign(`/register?next=${encodeURIComponent(next)}`);
                      }}
                    >
                      {s.header.register}
                    </a>
                    <button
                      className="gate-btn"
                      type="button"
                      onClick={() => setShowGate(false)}
                    >
                      {s.chat.close}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="gate-body">
                  <div className="gate-text">{s.chat.upgradeBody}</div>
                  <div className="gate-actions">
                    <a className="gate-btn gate-btn-primary" href="/pricing">
                      {s.chat.upgrade}
                    </a>
                    <button
                      className="gate-btn"
                      type="button"
                      onClick={() => setShowGate(false)}
                    >
                      {s.chat.close}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </MarketingShell>
  );
}
