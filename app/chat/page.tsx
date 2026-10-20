"use client";

import React, {
  useEffect,
  useRef,
  useState,
  KeyboardEvent,
  ChangeEvent,
} from "react";
import Link from "next/link";
import MessageMarkdown from "../components/MessageMarkdown";
import { collectDiagramPngs, copyRichElement } from "../components/copyRich";
import { publishAndShare, publishShare, shareToWhatsApp } from "@/lib/chatActions";
import { deliverBlob, saveWasToasted } from "@/lib/saveFile";
import { showToast } from "@/lib/toast";
import { toWhatsApp } from "@/lib/whatsappText";
import { downloadName } from "@/lib/exportName";
import { exportMeta } from "@/lib/messageDocument";
import { buildShareHtml } from "@/lib/shareDocument";
import { actionItemsAr, actionItemsEn, chartCaseAr, chartCaseEn, sampleAr, sampleEn } from "@/lib/richSamples";
import MarketingShell from "../components/marketing/MarketingShell";
import ComposerPlus from "../components/ComposerPlus";
import EitMark from "../components/marketing/EitMark";
import { DaySeparator, MessageTime, useMessageTimeZone } from "../components/MessageTime";
import { ensureGanttMarkdown, hydroReplyAr, hydroReplyEn, stageGateReplyAr, stageGateReplyEn } from "@/lib/diagramReply";
import { formatDaySeparator, isoOnDay } from "@/lib/messageTime";
import { applyComposerHeight, resetComposerHeight } from "@/lib/fitComposer";
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

function buildHtmlDocument(aiText: string, title: string, locale: "en" | "ar" = "en") {
  const lang = locale === "ar" || isArabicText(aiText) ? "ar" : "en";
  return buildShareHtml({ title, markdown: aiText, locale: lang });
}

function htmlFileFromText(aiText: string, title = "Report", locale: "en" | "ar" = "en") {
  const html = buildHtmlDocument(aiText, title, locale);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const file = new File([blob], downloadName(title, "html"), { type: "text/html" });
  return { html, blob, file };
}

async function copyAsHtml(aiText: string, title = "Report", locale: "en" | "ar" = "en") {
  const { html } = htmlFileFromText(aiText, title, locale);
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

function saveHtml(aiText: string, title = "Report", locale: "en" | "ar" = "en") {
  const { blob } = htmlFileFromText(aiText, title, locale);
  void deliverBlob(blob, downloadName(title, "html")).catch(() => {
    /* deliverBlob already confirms or reports the failure */
  });
}

/**
 * Modern reliable print (avoids popup + blank print)
 * - Creates hidden iframe
 * - Writes HTML
 * - Prints after render tick
 */
function printHtml(aiText: string, title = "Report", locale: "en" | "ar" = "en") {
  const html = buildHtmlDocument(aiText, title, locale);

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
async function exportPdf(aiText: string, extra?: { title?: string; subtitle?: string; locale?: string; diagrams?: { index: number; pngBase64: string }[] }) {
  const res = await fetch("/api/export/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: extra?.title || "engineerit.ai",
      subtitle: extra?.subtitle,
      content: aiText,
      filename: extra?.title || "Report",
      locale: extra?.locale,
      diagrams: extra?.diagrams,
    }),
  });

  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  await deliverBlob(blob, downloadName(extra?.title || "Report", "pdf"));
}


async function exportWordDocx(aiText: string, extra?: { title?: string; subtitle?: string; locale?: string; diagrams?: { index: number; pngBase64: string }[] }) {
  const res = await fetch("/api/export/docx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: aiText, title: extra?.title, subtitle: extra?.subtitle, locale: extra?.locale, diagrams: extra?.diagrams }),
  });
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  await deliverBlob(blob, downloadName(extra?.title || "Report", "docx"));
}

async function exportPptx(aiText: string, extra?: { title?: string; subtitle?: string; locale?: string; diagrams?: { index: number; pngBase64: string }[] }) {
  const res = await fetch("/api/export/pptx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: aiText, title: extra?.title, subtitle: extra?.subtitle, locale: extra?.locale, diagrams: extra?.diagrams }),
  });
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  await deliverBlob(blob, downloadName(extra?.title || "Report", "pptx"));
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
  const timeZone = useMessageTimeZone();
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
  const conversationRef = useRef<HTMLDivElement>(null);
  const pinBottom = useRef(true);
  const [fixture, setFixture] = useState<Message[] | null>(null);

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

  useEffect(() => {
    const onResize = () => {
      const el = composerRef.current;
      if (el) applyComposerHeight(el);
    };
    window.visualViewport?.addEventListener("resize", onResize);
    window.addEventListener("resize", onResize);
    return () => {
      window.visualViewport?.removeEventListener("resize", onResize);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const handleCloseLanding = () => {
    try {
      const KEY = "engineerit_landing_seen_v1";
      window.localStorage.setItem(KEY, "yes");
    } catch {}
    setShowLanding(false);
  };

  const thread = history.thread;
  const messages: Message[] = fixture ?? thread?.messages ?? [];

  useEffect(() => {
    const kind = new URLSearchParams(window.location.search).get("fixture");
    const kinds = new Set(["en", "ar", "charts-en", "charts-ar", "actions-en", "actions-ar", "scurve-en", "scurve-ar", "flow-en", "flow-ar", "gate-en", "gate-ar", "gantt-en", "gantt-ar"]);
    if (!kind || !kinds.has(kind)) return;
    const scurveEn = `Based on the provided weekly progress data, here's how the S-Curve would look:\n\n## Weekly Progress Data\n\n| Week | Cumulative Progress (%) |\n| --- | --- |\n| Wk1 | 10% |\n| Wk2 | 25% |\n| Wk3 | 67% |\n| Wk4 | 89% |\n| Wk5 | 100% |\n\n## S-Curve Chart\n\nThe curve starts slowly, accelerates in week 3, and reaches 100% in week 5.`;
    const scurveAr = `بناءً على نسب التقدم الأسبوعية، هذا منحنى التقدم:\n\n## بيانات التقدم\n\n| الأسبوع | التقدم التراكمي |\n| --- | --- |\n| أسبوع 1 | 10٪ |\n| أسبوع 2 | 25٪ |\n| أسبوع 3 | 67٪ |\n| أسبوع 4 | 89٪ |\n| أسبوع 5 | 100٪ |\n\n## منحنى التقدم\n\nيبدأ المنحنى ببطء، يتسارع في الأسبوع 3، ويصل إلى 100٪ في الأسبوع 5.`;
    if (kind === "gate-en" || kind === "gate-ar") {
      const ar = kind === "gate-ar";
      setFixture([
        {
          id: "fixture-user-1",
          role: "user",
          content: ar ? "اشرح سير عمل بوابات المرحلة للمشروع" : "Explain the project stage-gate workflow",
          attachments: [],
          createdAt: isoOnDay(-1, 16, 32),
        },
        {
          id: "fixture-ai-1",
          role: "assistant",
          content: ar
            ? "سير العمل يمر بست بوابات، من تحديد الفرصة حتى التشغيل والإغلاق."
            : "The workflow passes six gates, from the opportunity through start-up and close-out.",
          attachments: [],
          createdAt: isoOnDay(-1, 16, 40),
        },
        {
          id: "fixture-user-2",
          role: "user",
          content: ar ? "ضعه في مخطط" : "Put it in diagram",
          attachments: [],
          createdAt: isoOnDay(0, 16, 20),
        },
        {
          id: "fixture-ai",
          role: "assistant",
          content: ar ? stageGateReplyAr : stageGateReplyEn,
          attachments: [],
          createdAt: isoOnDay(0, 16, 32),
        },
      ]);
      return;
    }
    const shutdownEn = `Here is the shutdown plan.\n\n## Preparation:\n\n## Shutdown:\n\n## Post-Shutdown:`;
    const shutdownAr = `هذه خطة الإيقاف.\n\n## التحضير:\n\n## الإيقاف:\n\n## ما بعد الإيقاف:`;
    const content =
      kind === "gantt-en"
        ? ensureGanttMarkdown(shutdownEn, "make Gantt chart for plant shutdown", "2026-10-16")
        : kind === "gantt-ar"
          ? ensureGanttMarkdown(shutdownAr, "اعمل مخطط جانت لإيقاف المحطة", "2026-10-16")
        : kind === "flow-en"
        ? hydroReplyEn
        : kind === "flow-ar"
          ? hydroReplyAr
          : kind === "ar"
            ? sampleAr
            : kind === "actions-ar"
              ? actionItemsAr
              : kind === "actions-en"
                ? actionItemsEn
                : kind === "charts-ar"
                  ? chartCaseAr
                  : kind === "charts-en"
                    ? chartCaseEn
                    : kind === "scurve-ar"
                      ? scurveAr
                      : kind === "scurve-en"
                        ? scurveEn
                        : sampleEn;
    const prompt =
      kind === "flow-en"
        ? "Draw a process diagram of a hydrocracker plant"
        : kind === "flow-ar"
          ? "ارسم مخطط عملية وحدة التكسير الهيدروجيني"
          : kind === "scurve-en" || kind === "scurve-ar"
            ? "Wk1 10%, Wk2 25%, Wk3 67%, Wk4 89%, Wk5 100%. Make now the chart of S-Curve"
            : kind === "charts-ar"
              ? "اعرض منحنى التقدم المخطط مقابل الفعلي لمشروع طريق مدته 12 شهراً وعلّق على الاتجاه."
              : kind === "charts-en"
                ? "Show a chart of planned vs actual progress (S-curve) for a 12-month road project and comment on the trend."
                : kind === "actions-ar"
                  ? "حوّل ملاحظات اجتماع الموقع إلى جدول بنود عمل."
                  : kind === "actions-en"
                    ? "Turn the site meeting notes into an action items table."
                    : kind === "ar"
                      ? "اعرض الجدول الزمني والمقارنة."
                      : "Show the schedule and the comparison table.";
    setFixture([
      {
        id: "fixture-user",
        role: "user",
        content: prompt,
        attachments: [],
        createdAt: isoOnDay(-1, 16, 32),
      },
      { id: "fixture-ai", role: "assistant", content, attachments: [], createdAt: isoOnDay(0, 16, 32) },
    ]);
  }, []);

  useEffect(() => {
    const el = conversationRef.current;
    if (!el) return;
    const onScroll = () => {
      pinBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [messages.length]);

  useEffect(() => {
    const el = conversationRef.current;
    if (!el || !pinBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

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
    resetComposerHeight(composerRef.current);
    setAttachments([]);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      createdAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
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
            <div className="conversation" ref={conversationRef}>
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
            {messages.map((m, index) => {
              const rtl = isArabicText(m.content);
              const dayLabel = formatDaySeparator(m.createdAt, locale, new Date(), timeZone);
              const previous = messages[index - 1];
              const previousDay = previous
                ? formatDaySeparator(previous.createdAt, locale, new Date(), timeZone)
                : null;
              const hasAtt = (m.attachments?.length || 0) > 0;
              const meta = exportMeta(
                m.content,
                thread?.title,
                locale,
                messages.find((item) => item.role === "user")?.content
              );
              const topic = meta.title;

              return (
                <div key={m.id}>
                  {dayLabel && dayLabel !== previousDay ? <DaySeparator label={dayLabel} /> : null}
                <div
                  className={
                    "message-row " +
                    (m.role === "user" ? "message-user" : "message-assistant")
                  }
                >
                  {m.role === "user" ? (
                    <div className="message-avatar">{s.chat.you}</div>
                  ) : (
                    <div className="message-avatar message-avatar-mark">
                      <EitMark size={32} plate="circle" title="eit" />
                    </div>
                  )}

                  <div className="message-bubble">
                    <MessageTime iso={m.createdAt} locale={locale} zone={timeZone} />
                    <div className="msg-content" dir={rtl ? "rtl" : "ltr"} data-message-id={m.id}>
                      <MessageMarkdown
                        markdown={m.content}
                        dir={rtl ? "rtl" : "ltr"}
                        locale={locale}
                        fileBase={topic}
                        labels={{
                          copyTable: s.chat.copyTable,
                          exportExcel: s.chat.exportExcel,
                          diagramCopy: s.chat.diagramCopy,
                          diagramPng: s.chat.diagramPng,
                          diagramSvg: s.chat.diagramSvg,
                        }}
                      />
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
                                    const root = document.querySelector<HTMLElement>(`[data-message-id="${m.id}"]`);
                                    if (!root) showToast(s.chat.copyFailed, "err");
                                    else await copyRichElement(root, m.content);
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
                                    const title = topic;
                                    const { url, shared } = await publishAndShare({ title, markdown: m.content, locale });
                                    if (!url) {
                                      showToast(s.chat.shareFailed, "err");
                                      return;
                                    }
                                    if (shared) return;
                                    try {
                                      await navigator.clipboard.writeText(toWhatsApp(m.content, url));
                                    } catch {
                                      /* the menu still offers WhatsApp */
                                    }
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
                                        const root = document.querySelector<HTMLElement>(`[data-message-id="${m.id}"]`);
                                        const diagrams = root ? await collectDiagramPngs(root) : [];
                                        await exportPdf(m.content, { title: meta.source || topic, subtitle: meta.subtitle, locale, diagrams });
                                      } catch (e) {
                                        console.error(e);
                                        if (!saveWasToasted(e)) showToast(s.chat.pdfFailed, "err");
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
                                          const root = document.querySelector<HTMLElement>(`[data-message-id="${m.id}"]`);
                                          const diagrams = root ? await collectDiagramPngs(root) : [];
                                          await exportWordDocx(m.content, { title: meta.source || topic, subtitle: meta.subtitle, locale, diagrams });
                                        } catch (e) {
                                          console.error(e);
                                          if (!saveWasToasted(e)) showToast(s.chat.wordFailed, "err");
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
                                          const root = document.querySelector<HTMLElement>(`[data-message-id="${m.id}"]`);
                                          const diagrams = root ? await collectDiagramPngs(root) : [];
                                          await exportPptx(m.content, { title: meta.source || topic, subtitle: meta.subtitle, locale, diagrams });
                                        } catch (e) {
                                          console.error(e);
                                          if (!saveWasToasted(e)) showToast(s.chat.pptFailed, "err");
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
                                  onClick={() => saveHtml(m.content, topic, locale)}
                                >
                                  {s.chat.saveHtml}
                                </button>

                                <button
                                  type="button"
                                  className="msg-action-btn"
                                  onClick={() => printHtml(m.content, topic, locale)}
                                >
                                  {s.chat.print}
                                </button>

                                <button
                                  type="button"
                                  className="msg-action-btn"
                                  onClick={async () => {
                                    const url = await publishShare({ title: topic, markdown: m.content, locale });
                                    if (!url) {
                                      showToast(s.chat.shareFailed, "err");
                                      return;
                                    }
                                    shareToWhatsApp(m.content, url);
                                  }}
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
                  applyComposerHeight(e.target);
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
