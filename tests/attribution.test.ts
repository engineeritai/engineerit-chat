import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  ACQUISITION_TTL_MS,
  VISIT_GAP_MS,
  acquisitionFromReferrer,
  acquisitionMetadata,
  allowAnalytics,
  allowAnalyticsUrl,
  cleanUtm,
  memoryFromLegacy,
  nextAttribution,
  planConfirmedSignup,
  shouldTrackSubmittedSignup,
  unknownAcquisition,
  type Acquisition,
  type AttributionMemory,
} from "../lib/acquisition";
import { trackConfirmedSignup, trackProduct } from "../lib/attribution";

const NOW = Date.parse("2026-11-06T12:00:00.000Z");
const CREATED = "2026-11-06T11:50:00.000Z";
const CONFIRMED = "2026-11-06T11:58:00.000Z";

function linkedinMemory(now = NOW): AttributionMemory {
  const captured = nextAttribution({
    memory: null,
    search: "?utm_source=linkedin&utm_medium=social&utm_campaign=launch-post",
    referrer: "",
    pathname: "/",
    now,
  });
  assert.ok(captured.memory);
  return captured.memory;
}

describe("acquisition whitelist", () => {
  it("keeps LinkedIn, X, and email tags and drops markup, mailboxes, and the rest of the query", () => {
    const captured = nextAttribution({
      memory: null,
      search: "?utm_source=LinkedIn&utm_medium=social&utm_campaign=launch-post&email=hidden.person@example.com&next=/chat",
      referrer: "https://www.linkedin.com/in/private-name?session=secret-token",
      pathname: "/",
      now: NOW,
    });
    assert.equal(captured.acquisition.source, "linkedin");
    assert.equal(captured.acquisition.medium, "social");
    assert.equal(captured.acquisition.campaign, "launch-post");
    assert.equal(captured.acquisition.via, "utm");
    assert.equal(captured.emitVisit, true);
    const stored = JSON.stringify(captured.memory);
    assert.equal(stored.includes("hidden.person"), false);
    assert.equal(stored.includes("@"), false);
    assert.equal(stored.includes("private-name"), false);
    assert.equal(stored.includes("secret"), false);
    assert.equal(stored.includes("?"), false);
    assert.equal(stored.includes("next="), false);

    const hostile = nextAttribution({
      memory: null,
      search: "?utm_source=%3Cscript%3Ealert(1)%3C%2Fscript%3E&utm_campaign=%22%3E%3Cimg%20onerror%3Dalert(1)%3E",
      referrer: "",
      pathname: "/",
      now: NOW,
    });
    assert.equal(hostile.emitVisit, false);
    assert.equal(hostile.acquisition.source, "unknown");
    assert.equal(JSON.stringify(hostile.memory || {}).includes("script"), false);
    assert.equal(JSON.stringify(hostile.memory || {}).includes("onerror"), false);
    assert.equal(cleanUtm("<script>"), "");
    assert.equal(cleanUtm("owner@example.com"), "");
  });

  it("maps twitter to X and classifies a referrer by host only", () => {
    const tagged = nextAttribution({
      memory: null,
      search: "?utm_source=twitter&utm_medium=social&utm_campaign=launch-x",
      referrer: "",
      pathname: "/register",
      now: NOW,
    });
    assert.equal(tagged.acquisition.source, "x");
    assert.equal(tagged.acquisition.campaign, "launch-x");

    const linkedin = acquisitionFromReferrer("https://www.linkedin.com/feed/update?trk=secret-token", NOW);
    const x = acquisitionFromReferrer("https://t.co/abc123secret", NOW);
    const mail = acquisitionFromReferrer("https://mail.google.com/mail/u/0/#inbox?auth=secret", NOW);
    const lookalike = acquisitionFromReferrer("https://linkedin.com.evil.com/linkedin", NOW);
    assert.equal(linkedin?.source, "linkedin");
    assert.equal(linkedin?.via, "referrer");
    assert.equal(x?.source, "x");
    assert.equal(mail?.source, "email");
    assert.equal(lookalike, null);
    for (const value of [linkedin, x, mail]) {
      const stored = JSON.stringify(value);
      assert.equal(stored.includes("secret"), false);
      assert.equal(stored.includes("abc123"), false);
      assert.equal(stored.includes("inbox"), false);
    }
  });

  it("preserves the first tagged visit through the confirmation mailbox", () => {
    const first = nextAttribution({
      memory: null,
      search: "?utm_source=linkedin&utm_medium=social&utm_campaign=launch-post",
      referrer: "https://www.linkedin.com/",
      pathname: "/",
      now: NOW,
    });
    const confirmation = nextAttribution({
      memory: first.memory,
      search: "",
      referrer: "https://mail.google.com/mail/u/0/#inbox?secret=1",
      pathname: "/auth/confirmed",
      now: NOW + 60_000,
    });
    assert.equal(confirmation.acquisition.source, "linkedin");
    assert.equal(confirmation.acquisition.campaign, "launch-post");
    assert.equal(confirmation.acquisition.via, "utm");
    assert.equal(confirmation.emitVisit, false);
    assert.equal(JSON.stringify(confirmation.memory).includes("inbox"), false);
    assert.equal(JSON.stringify(confirmation.memory).includes("secret"), false);

    const laterTag = nextAttribution({
      memory: confirmation.memory,
      search: "?utm_source=x&utm_campaign=launch-x",
      referrer: "https://mail.google.com/mail/u/0/",
      pathname: "/",
      now: NOW + 120_000,
    });
    assert.equal(laterTag.acquisition.source, "x");
    assert.equal(laterTag.acquisition.campaign, "launch-x");
    assert.equal(laterTag.emitVisit, true);
  });

  it("does not let a mailbox referrer or a weak tag replace an empty confirmation", () => {
    const confirmation = nextAttribution({
      memory: null,
      search: "",
      referrer: "https://mail.google.com/mail/u/0/?secret=1",
      pathname: "/auth/confirmed",
      now: NOW,
    });
    assert.equal(confirmation.acquisition.source, "unknown");
    assert.equal(confirmation.emitVisit, false);
    assert.equal(confirmation.memory, null);

    const homepage = nextAttribution({
      memory: null,
      search: "",
      referrer: "https://mail.google.com/mail/u/0/",
      pathname: "/",
      now: NOW,
    });
    assert.equal(homepage.acquisition.source, "email");
    assert.equal(homepage.acquisition.via, "referrer");
    assert.equal(homepage.emitVisit, true);

    const kept = nextAttribution({
      memory: linkedinMemory(),
      search: "?utm_medium=social",
      referrer: "https://t.co/secret",
      pathname: "/",
      now: NOW + 1000,
    });
    assert.equal(kept.acquisition.source, "linkedin");
    assert.equal(kept.acquisition.campaign, "launch-post");
  });

  it("emits one visit for a source until the gap passes, and reads an older tab value", () => {
    const first = nextAttribution({
      memory: null,
      search: "?utm_source=email&utm_medium=email&utm_campaign=november",
      referrer: "",
      pathname: "/",
      now: NOW,
    });
    const repeat = nextAttribution({
      memory: first.memory,
      search: "?utm_source=email&utm_medium=email&utm_campaign=november",
      referrer: "",
      pathname: "/pricing",
      now: NOW + 60_000,
    });
    assert.equal(repeat.emitVisit, false);
    const again = nextAttribution({
      memory: repeat.memory,
      search: "?utm_source=email&utm_campaign=november",
      referrer: "",
      pathname: "/",
      now: NOW + VISIT_GAP_MS + 1,
    });
    assert.equal(again.emitVisit, true);

    const legacy = memoryFromLegacy({ utm_source: "  LinkedIn ", utm_campaign: "launch-post" }, NOW);
    assert.equal(legacy?.source, "linkedin");
    assert.equal(legacy?.campaign, "launch-post");
    assert.equal(legacy?.via, "utm");
    const expired = memoryFromLegacy({ source: "x", via: "utm", campaign: "launch-x", expiresAt: NOW - 1 }, NOW);
    assert.equal(expired, null);
    const dropped = nextAttribution({
      memory: { source: "x", via: "utm", campaign: "launch-x", expiresAt: NOW - 1 },
      search: "",
      referrer: "",
      pathname: "/",
      now: NOW,
    });
    assert.equal(dropped.acquisition.source, "unknown");
    assert.equal(dropped.emitVisit, false);
    assert.ok((legacy?.expiresAt || 0) - NOW <= ACQUISITION_TTL_MS);
  });

  it("writes only the whitelisted account fields", () => {
    const meta = acquisitionMetadata({
      source: "linkedin",
      medium: "social",
      campaign: "hidden.person@example.com",
      via: "utm",
      email: "hidden.person@example.com",
      search: "?email=hidden.person@example.com",
    });
    assert.deepEqual(meta, { acq_source: "linkedin", acq_via: "utm", acq_medium: "social" });
    assert.equal(JSON.stringify(meta).includes("@"), false);
  });
});

describe("successful signup event", () => {
  const local = unknownAcquisition(NOW);

  it("counts a confirmed account once and ignores login, recovery, and an unconfirmed form", () => {
    assert.equal(shouldTrackSubmittedSignup(true), false);
    assert.equal(shouldTrackSubmittedSignup(undefined), false);
    assert.equal(shouldTrackSubmittedSignup(false), true);

    const sent: string[] = [];
    const sink = (name: string) => sent.push(name);
    const user = {
      created_at: CREATED,
      email_confirmed_at: CONFIRMED,
      user_metadata: {
        acq_source: "linkedin",
        acq_medium: "social",
        acq_campaign: "launch-post",
        acq_via: "utm",
        email: "hidden.person@example.com",
      },
    };
    const first = trackConfirmedSignup(user, { nowMs: NOW, seen: [], allow: true, sink, local });
    assert.equal(first.track, true);
    assert.deepEqual(sent, ["register_completed"]);
    const second = trackConfirmedSignup(user, {
      nowMs: NOW,
      seen: first.track ? first.seen : [],
      allow: true,
      sink,
      local,
    });
    assert.equal(second.track, false);
    assert.deepEqual(sent, ["register_completed"]);

    const login = planConfirmedSignup({
      user: { created_at: "2024-01-01T00:00:00.000Z", email_confirmed_at: "2024-01-01T00:10:00.000Z" },
      nowMs: NOW,
      seen: [],
      local,
    });
    assert.equal(login.track, false);
    const unconfirmed = planConfirmedSignup({
      user: { created_at: CREATED, email_confirmed_at: null, user_metadata: { acq_source: "email" } },
      nowMs: NOW,
      seen: [],
      local,
    });
    assert.equal(unconfirmed.track, false);
  });

  it("uses the account tag on another device and keeps mail out of the event", () => {
    const sent: Array<{ name: string; props: Record<string, unknown> }> = [];
    trackConfirmedSignup(
      {
        created_at: CREATED,
        email_confirmed_at: CONFIRMED,
        user_metadata: { acq_source: "email", acq_medium: "email", acq_via: "utm", acq_campaign: "november" },
      },
      {
        nowMs: NOW,
        seen: [],
        allow: true,
        local: {
          source: "linkedin",
          medium: "social",
          via: "referrer",
          expiresAt: NOW + 1000,
        } satisfies Acquisition,
        sink: (name, props) => sent.push({ name, props }),
      }
    );
    assert.equal(sent[0]?.props.source, "email");
    assert.equal(sent[0]?.props.via, "utm");
    assert.equal(sent[0]?.props.campaign, "november");
    assert.equal(JSON.stringify(sent).includes("@"), false);

    const blocked: unknown[] = [];
    trackProduct("register_completed", { email: "hidden.person@example.com", plan: "engineer", source: "<script>" }, {
      allow: false,
      acquisition: { source: "x", via: "utm", medium: "social", expiresAt: NOW + 1000 },
      sink: (name, props) => blocked.push({ name, props }),
    });
    assert.deepEqual(blocked, []);

    const preview: unknown[] = [];
    trackProduct("chat_started", { plan: "guest", note: "hidden.person@example.com" }, {
      allow: true,
      acquisition: unknownAcquisition(NOW),
      sink: (name, props) => preview.push({ name, props }),
    });
    assert.deepEqual(preview, [{ name: "chat_started", props: { plan: "guest" } }]);
  });

  it("sends analytics only for the production host and a human browser", () => {
    assert.equal(allowAnalytics({ hostname: "engineerit.ai", webdriver: false }), true);
    assert.equal(allowAnalytics({ hostname: "www.engineerit.ai", webdriver: false }), true);
    assert.equal(allowAnalytics({ hostname: "engineerit.ai", webdriver: true }), false);
    assert.equal(allowAnalytics({ hostname: "localhost", webdriver: false }), false);
    assert.equal(allowAnalyticsUrl("https://engineerit-chat-git-preview.vercel.app/register"), false);
    assert.equal(allowAnalyticsUrl("https://engineerit.ai/register?utm_source=linkedin&email=hidden.person@example.com"), true);
    assert.equal(allowAnalyticsUrl("http://127.0.0.1:3000/"), false);
  });

  it("keeps the signup event off the login page and off an unconfirmed registration", () => {
    const register = readFileSync("app/register/page.tsx", "utf8");
    const login = readFileSync("app/login/page.tsx", "utf8");
    const confirmed = readFileSync("app/auth/confirmed/page.tsx", "utf8");
    const analytics = readFileSync("app/components/ProductAnalytics.tsx", "utf8");
    assert.match(register, /shouldTrackSubmittedSignup\(data\.needsConfirmation\)/);
    assert.match(register, /readAcquisitionPayload\(\)/);
    assert.doesNotMatch(register, /trackProduct\("register_completed"\)/);
    assert.doesNotMatch(login, /register_completed|trackProduct|trackConfirmedSignup/);
    assert.match(confirmed, /trackConfirmedSignup\(\{/);
    assert.doesNotMatch(confirmed.slice(confirmed.indexOf("trackConfirmedSignup")), /email:/);
    assert.match(analytics, /beforeSend/);
    assert.match(analytics, /allowAnalyticsUrl/);
    assert.doesNotMatch(readFileSync("app/components/HubSpot.tsx", "utf8"), /acq_source|campaign_visit/);
  });
});
