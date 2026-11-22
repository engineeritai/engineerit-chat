import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  ASSISTANT_DAILY_REPLIES,
  GUEST_DAILY_REPLIES,
  assistantHistoryDays,
  assistantLimitNotice,
  assistantLimitReply,
  dailyLimitError,
  dailyReplyCap,
  freeAccountAllowance,
  guestAllowance,
  guestLimitNotice,
  guideSignupBody,
  tryChatAnswer,
} from "../lib/dailyLimits";
import { guideCopy } from "../lib/guide";
import { featuresForLocale } from "../lib/labels";
import { getMarketingContent } from "../lib/marketing";
import { PLANS, PLAN_AMOUNTS_SAR } from "../lib/plans";
import { authPath } from "../lib/registerLink";
import { shellCopy } from "../lib/shell";
import { translate } from "../lib/i18n";

const PAID = ["engineer", "professional", "consultant", "team", "enterprise"] as const;

describe("daily reply caps", () => {
  it("gives a free account more replies than a guest, and leaves paid plans uncapped", () => {
    assert.equal(GUEST_DAILY_REPLIES, 3);
    assert.equal(ASSISTANT_DAILY_REPLIES, 15);
    assert.ok(ASSISTANT_DAILY_REPLIES > GUEST_DAILY_REPLIES);
    assert.equal(dailyReplyCap("guest"), GUEST_DAILY_REPLIES);
    assert.equal(dailyReplyCap("assistant"), ASSISTANT_DAILY_REPLIES);
    assert.equal(dailyReplyCap("free"), ASSISTANT_DAILY_REPLIES);
    assert.equal(assistantHistoryDays(), 3);
    for (const plan of PAID) {
      assert.equal(Number.isFinite(dailyReplyCap(plan)), false);
    }
    assert.equal(PLAN_AMOUNTS_SAR.engineer.month, 19);
    assert.equal(PLAN_AMOUNTS_SAR.professional.month, 41);
    assert.equal(PLAN_AMOUNTS_SAR.consultant.month, 99);
    assert.equal(PLAN_AMOUNTS_SAR.team.month, 449);
  });

  it("uses the same cap in the chat API, the chat page, and advisor chat", () => {
    for (const file of ["app/api/chat/route.ts", "app/chat/page.tsx", "app/components/AdvisorChat.tsx"]) {
      const source = readFileSync(file, "utf8");
      assert.match(source, /dailyReplyCap/);
      assert.equal(source.includes('plan === "guest" ? 1'), false);
      assert.equal(source.includes('=== "assistant" ? 3'), false);
    }
    assert.equal(dailyLimitError("en", "guest"), guestLimitNotice("en"));
    assert.equal(dailyLimitError("ar", "assistant"), assistantLimitNotice("ar"));
  });
});

describe("free-account promise", () => {
  it("states the same free allowance on the pricing Free column and in the FAQ", () => {
    const assistant = PLANS.find((plan) => plan.id === "assistant");
    assert.ok(assistant);
    for (const locale of ["en", "ar"] as const) {
      const allowance = freeAccountAllowance(locale);
      const features = featuresForLocale(locale, assistant, "month");
      assert.equal(features[0], allowance);
      const answer = getMarketingContent(locale).faq.items[0].answer;
      assert.equal(answer, tryChatAnswer(locale));
      assert.equal(answer.includes(allowance), true);
      assert.equal(answer.includes(guestAllowance(locale)), true);
      assert.equal(guideCopy(locale).steps[0].body, guideSignupBody(locale));
      assert.equal(guideSignupBody(locale).includes(allowance), true);
    }
  });

  it("promises only the free allowance in the guest and register prompts", () => {
    for (const locale of ["en", "ar"] as const) {
      const chat = shellCopy[locale].chat;
      const allowance = freeAccountAllowance(locale);
      assert.equal(chat.registerBody, allowance);
      assert.equal(chat.registerActions, allowance);
      assert.equal(chat.dailyGuest, guestLimitNotice(locale));
      assert.equal(chat.dailyGuestReply.includes(allowance), true);
      assert.equal(chat.dailyPaid, assistantLimitNotice(locale));
      assert.equal(chat.dailyPaidReply, assistantLimitReply(locale));
      assert.equal(chat.registerTitle, chat.registerCta);
      assert.equal(shellCopy[locale].auth.registerLeadBefore.includes(allowance), true);
      assert.equal(/copy|share|attach/i.test(chat.registerActions), false);
      assert.equal(/copy|share|attach/i.test(chat.registerBody), false);
      assert.equal(chat.registerActions.includes("نسخ"), false);
      assert.equal(chat.registerActions.includes("مشاركة"), false);
      assert.equal(chat.registerActions.includes("إرفاق"), false);
    }
    assert.equal(shellCopy.en.chat.registerCta, "Create a free account");
    assert.equal(shellCopy.ar.chat.registerCta, "أنشئ حسابا مجانيا");
    assert.equal(translate("en").gating.registerCta, shellCopy.en.chat.registerCta);
    assert.equal(translate("ar").gating.registerCta, shellCopy.ar.chat.registerCta);
    assert.match(shellCopy.en.chat.dailyPaidReply, /SAR 19/);
    assert.match(shellCopy.en.chat.dailyPaidReply, /no daily reply cap/);
    assert.match(shellCopy.en.chat.attachGuest, /SAR 19/);
    assert.equal(shellCopy.en.chat.attachGuest.includes(freeAccountAllowance("en")), true);
    assert.equal(/register to copy/i.test(shellCopy.en.chat.registerActions), false);
  });
});

describe("register links keep language and campaign params", () => {
  it("puts lang and the PR #87 utm params on /register and drops everything else", () => {
    const href = authPath("/register", {
      locale: "ar",
      search: "?lang=en&utm_source=linkedin&utm_medium=social&utm_campaign=contractors_2610&utm_term=drop-me&next=/secret",
      next: "/chat?lang=ar&utm_source=linkedin&utm_campaign=contractors_2610",
    });
    const params = new URLSearchParams(href.slice(href.indexOf("?")));
    assert.equal(href.startsWith("/register?"), true);
    assert.equal(params.get("lang"), "ar");
    assert.equal(params.get("utm_source"), "linkedin");
    assert.equal(params.get("utm_medium"), "social");
    assert.equal(params.get("utm_campaign"), "contractors_2610");
    assert.equal(params.get("utm_term"), null);
    assert.equal(params.get("next"), "/chat?lang=ar&utm_source=linkedin&utm_campaign=contractors_2610");
  });

  it("keeps source aliases that contain a dot and refuses markup", () => {
    const href = authPath("/login", {
      locale: "en",
      search: "?utm_source=linkedin.com&utm_campaign=<script>",
      next: "https://evil.example",
    });
    const params = new URLSearchParams(href.slice(href.indexOf("?")));
    assert.equal(href.startsWith("/login?"), true);
    assert.equal(params.get("lang"), "en");
    assert.equal(params.get("utm_source"), "linkedin.com");
    assert.equal(params.get("utm_campaign"), null);
    assert.equal(params.get("next"), null);
  });
});
