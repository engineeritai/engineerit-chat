import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { describe } from "node:test";
import { evaluatePromo, priceRenewalWithPromo, promoInsertPayload, buildBatchCodes, type PromoCode } from "../lib/promo";
import { applyPromo, type PromoDb } from "../lib/promoCheckout";
import {
  STUDENT_CODE,
  academicEmailAllowed,
  checkStudentOtp,
  claimAcademicEmail,
  issueStudentOtp,
  reviewStudentDocument,
  studentBatchDraft,
  studentDiscountAllowed,
  verifiedUntilFrom,
} from "../lib/studentVerify";

const NOW = new Date("2026-10-23T12:00:00.000Z");
const OFFER = "Students: 50% off the Engineer plan with a verified university email or a student letter";
const OFFER_AR = "للطلاب: خصم 50% على باقة المهندس مع بريد جامعي مؤكد أو خطاب طالب";

function studentCode(partial: Partial<PromoCode> = {}): PromoCode {
  return {
    id: "student-50",
    code: STUDENT_CODE,
    discountType: "percent",
    percentOff: 50,
    amountOffSar: null,
    freeMonths: null,
    plans: ["engineer"],
    intervals: ["month"],
    cycles: 12,
    startsAt: "2026-10-01T00:00:00.000Z",
    expiresAt: null,
    maxUses: null,
    onePerUser: true,
    audience: "any",
    domains: [],
    singleUse: false,
    active: true,
    restrictedUserId: null,
    requiresStudent: true,
    ...partial,
  };
}

describe("student verification", () => {
  test("rejects an unverified or expired student and a reused academic email", () => {
    assert.equal(studentDiscountAllowed(null, NOW), false);
    assert.equal(studentDiscountAllowed("2026-10-23T12:00:00.000Z", NOW), false);
    assert.equal(studentDiscountAllowed("2026-10-23T12:00:01.000Z", NOW), true);
    const unverified = evaluatePromo(studentCode(), {
      now: NOW,
      userId: "user-1",
      email: "student@ksu.edu.sa",
      planId: "engineer",
      interval: "month",
      listHalalas: 1900,
      uses: 0,
      userUses: 0,
      hasOpenSubscription: false,
      hasPaidBefore: false,
      studentVerified: false,
    });
    assert.equal(unverified.ok, false);
    if (!unverified.ok) assert.equal(unverified.reason, "student_unverified");
    assert.equal(claimAcademicEmail("user-2", "user-1"), "taken");
    assert.equal(claimAcademicEmail("user-1", "user-1"), "ok");
    assert.equal(claimAcademicEmail(null, "user-1"), "ok");
  });

  test("prices 50 percent of Engineer monthly only after verification", () => {
    const facts = {
      now: NOW,
      userId: "user-1",
      email: "person@gmail.com",
      planId: "engineer",
      interval: "month" as const,
      listHalalas: 1900,
      uses: 0,
      userUses: 0,
      hasOpenSubscription: false,
      hasPaidBefore: false,
      studentVerified: true,
    };
    const priced = evaluatePromo(studentCode(), facts);
    assert.equal(priced.ok, true);
    if (!priced.ok) return;
    assert.equal(priced.chargedHalalas, 950);
    assert.equal(priced.discountHalalas, 950);
    assert.equal(priced.cycles, 12);
    const professional = evaluatePromo(studentCode(), { ...facts, planId: "professional", listHalalas: 4100 });
    assert.equal(professional.ok, false);
    if (!professional.ok) assert.equal(professional.reason, "wrong_plan");
    const consultant = evaluatePromo(studentCode(), { ...facts, planId: "consultant", listHalalas: 9900 });
    assert.equal(consultant.ok, false);
    if (!consultant.ok) assert.equal(consultant.reason, "wrong_plan");
    const yearly = evaluatePromo(studentCode(), { ...facts, interval: "year", listHalalas: 19000 });
    assert.equal(yearly.ok, false);
    if (!yearly.ok) assert.equal(yearly.reason, "wrong_interval");
  });

  test("pauses the student discount on renewal until verification is current", () => {
    const paused = priceRenewalWithPromo(19, {
      cyclesRemaining: 12,
      discountType: "percent",
      percentOff: 50,
      amountOffSar: null,
      requiresStudent: true,
      studentVerified: false,
    });
    assert.equal(paused.amountHalalas, 1900);
    assert.equal(paused.cyclesRemainingAfter, 12);
    assert.equal(paused.discounted, false);
    const active = priceRenewalWithPromo(19, {
      cyclesRemaining: 12,
      discountType: "percent",
      percentOff: 50,
      amountOffSar: null,
      requiresStudent: true,
      studentVerified: true,
    });
    assert.equal(active.amountHalalas, 950);
    assert.equal(active.cyclesRemainingAfter, 11);
    assert.equal(active.discounted, true);
  });

  test("expires the one-time code, rate-limits sends, and approves a letter for 12 months", async () => {
    assert.equal(academicEmailAllowed("a@mit.edu"), true);
    assert.equal(academicEmailAllowed("a@student.ksu.edu.sa"), true);
    assert.equal(academicEmailAllowed("a@gmail.com"), false);
    assert.equal(academicEmailAllowed("a@edu.sa.evil.com"), false);
    let sends = 0;
    const blockedDomain = await issueStudentOtp({
      now: NOW,
      email: "a@gmail.com",
      recent: [],
      send: async () => {
        sends += 1;
      },
    });
    assert.equal(blockedDomain.ok, false);
    if (!blockedDomain.ok) assert.equal(blockedDomain.reason, "domain");
    const recent = [0, 1, 2].map((minutes) => ({ createdAt: new Date(NOW.getTime() - minutes * 60_000).toISOString() }));
    const blockedRate = await issueStudentOtp({
      now: NOW,
      email: "a@mit.edu",
      recent,
      send: async () => {
        sends += 1;
      },
    });
    assert.equal(blockedRate.ok, false);
    if (!blockedRate.ok) assert.equal(blockedRate.reason, "rate");
    assert.equal(sends, 0);
    let mailed = "";
    const issued = await issueStudentOtp({
      now: NOW,
      email: "A@MIT.EDU",
      recent: [],
      send: async (message) => {
        mailed = message.code;
        sends += 1;
      },
    });
    assert.equal(issued.ok, true);
    assert.equal(sends, 1);
    if (!issued.ok) return;
    assert.equal(mailed.length, 6);
    assert.equal(
      checkStudentOtp({
        now: NOW,
        expiresAt: issued.otp.expiresAt,
        attempts: 0,
        codeHash: issued.otp.codeHash,
        salt: issued.otp.salt,
        code: mailed,
      }),
      "ok"
    );
    assert.equal(
      checkStudentOtp({
        now: new Date(NOW.getTime() + 10 * 60 * 1000),
        expiresAt: issued.otp.expiresAt,
        attempts: 0,
        codeHash: issued.otp.codeHash,
        salt: issued.otp.salt,
        code: mailed,
      }),
      "expired"
    );
    assert.equal(
      checkStudentOtp({
        now: NOW,
        expiresAt: issued.otp.expiresAt,
        attempts: 5,
        codeHash: issued.otp.codeHash,
        salt: issued.otp.salt,
        code: mailed,
      }),
      "too_many"
    );
    const approved = reviewStudentDocument("approve", NOW);
    assert.equal(approved.status, "approved");
    assert.equal(approved.verifiedUntil, verifiedUntilFrom(NOW));
    assert.equal(approved.verifiedUntil, "2027-10-23T12:00:00.000Z");
    const rejected = reviewStudentDocument("reject", NOW);
    assert.equal(rejected.status, "rejected");
    assert.equal(rejected.verifiedUntil, null);
    const reviewRoute = readFileSync("app/api/admin/students/review/route.ts", "utf8");
    assert.match(reviewRoute, /method: "document"/);
    assert.equal(reviewRoute.includes("academicEmail"), false);
  });

  test("keeps STUDENT50 and student batches on Engineer monthly", () => {
    const batch = buildBatchCodes({ count: 3, prefix: "STU", now: NOW, draft: studentBatchDraft() });
    assert.equal(batch.ok, true);
    if (!batch.ok) return;
    assert.equal(
      batch.rows.every(
        (row) =>
          row.discount_type === "percent" &&
          row.percent_off === 50 &&
          row.plans.length === 1 &&
          row.plans[0] === "engineer" &&
          row.intervals.length === 1 &&
          row.intervals[0] === "month" &&
          row.cycles === 12 &&
          row.requires_student === true &&
          row.domains.length === 0 &&
          row.single_use === true
      ),
      true
    );
    const ordinary = promoInsertPayload({ ...batch.rows[0], requires_student: false });
    assert.equal("requires_student" in ordinary, false);
    const sql = readFileSync("supabase/migrations/20261023180000_student_verification.sql", "utf8");
    const seed = sql.slice(sql.indexOf("'STUDENT50'"), sql.indexOf("where not exists"));
    assert.match(seed, /array\['engineer'\]/);
    assert.match(seed, /array\['month'\]/);
    assert.match(seed, /\n\s+50,/);
    assert.match(seed, /\n\s+12,/);
    assert.doesNotMatch(seed, /professional|consultant/);
    assert.match(sql, /where not exists/);
    for (const table of ["student_email_domains", "student_status", "student_otp_challenges", "student_documents"]) {
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
      assert.match(sql, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`));
      assert.match(sql, new RegExp(`grant select, insert, update, delete on table public\\.${table} to service_role`));
    }
    assert.match(sql, /student_status_academic_email_uidx/);
    assert.match(sql, /'student-documents'/);
    assert.match(sql, /public = false/);
    assert.match(sql, /student_documents_owner_select/);
    assert.doesNotMatch(sql, /\bto anon\b/);
    assert.doesNotMatch(sql, /\bto public\b/);
    const shell = readFileSync("lib/shell.ts", "utf8");
    assert.equal(shell.includes(OFFER), true);
    assert.equal(shell.includes(OFFER_AR), true);
    assert.equal(/[\u064B-\u065F]/.test(OFFER_AR), false);
    assert.match(shell, /Verify student status before this discount applies/);
    assert.match(shell, /أكد صفة الطالب أولا لتطبيق هذا الخصم/);
    assert.match(readFileSync("app/components/CheckoutCode.tsx", "utf8"), /student_unverified/);
    assert.match(readFileSync("app/checkout/[id]/page.tsx", "utf8"), /StudentVerify/);
    assert.match(readFileSync("app/profile/page.tsx", "utf8"), /StudentVerify/);
    assert.match(readFileSync("app/admin/codes/page.tsx", "utf8"), /STUDENT50/);
    assert.match(readFileSync("app/api/admin/codes/batch/route.ts", "utf8"), /studentBatchDraft/);
  });
});

describe("checkout student gate", () => {
  test("stores the half price only when verification is still valid", async () => {
    const checkout = {
      id: "44444444-4444-4444-8444-444444444444",
      userId: "user-1",
      email: "person@gmail.com",
      plan: "engineer",
      interval: "month" as const,
      status: "pending",
      amountHalalas: 1900,
      listHalalas: null,
      promoCodeId: null,
    };
    const writes: number[] = [];
    const db = (until: string | null): PromoDb => ({
      async loadCheckout() {
        return checkout;
      },
      async loadCode() {
        return studentCode();
      },
      async countUses() {
        return 0;
      },
      async countUserUses() {
        return 0;
      },
      async hasOpenSubscription() {
        return false;
      },
      async hasPaidBefore() {
        return false;
      },
      async releaseCheckout() {},
      async reserve() {
        return { ok: true };
      },
      async writeCheckout(_id, patch) {
        writes.push(patch.amountHalalas);
        return true;
      },
      async studentVerifiedUntil() {
        return until;
      },
    });
    const rejected = await applyPromo(db(null), {
      checkoutId: checkout.id,
      rawCode: "student50",
      userId: "user-1",
      clientAmountHalalas: 100,
      now: NOW,
    });
    assert.equal(rejected.ok, false);
    if (!rejected.ok) assert.equal(rejected.reason, "student_unverified");
    assert.equal(writes.length, 0);
    const accepted = await applyPromo(db("2027-10-23T12:00:00.000Z"), {
      checkoutId: checkout.id,
      rawCode: "student50",
      userId: "user-1",
      clientAmountHalalas: 1900,
      now: NOW,
    });
    assert.equal(accepted.ok, true);
    if (!accepted.ok) return;
    assert.equal(accepted.chargedHalalas, 950);
    assert.equal(writes.at(-1), 950);
  });
});
