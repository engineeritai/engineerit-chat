import { aggregatePageViews, type PageViewRow } from "@/lib/visitAggregate";
import { riyadhStart } from "@/lib/adminStats";

/** Fixed clock so the sample does not change between screenshots. */
export const EXAMPLE_NOW = new Date("2026-11-24T12:00:00.000Z");

const PAGES = ["/", "/pricing", "/chat", "/advisors", "/register", "/faq", "/how-it-works", "/guide", "/legal/privacy", "/login"];
const REFS = [null, "www.google.com", "linkedin.com", "t.co", "l.facebook.com", null] as const;
const SOURCES = [null, "linkedin", "x", "email", null] as const;

export function examplePageViews(): PageViewRow[] {
  const rows: PageViewRow[] = [];
  for (let day = 0; day < 30; day += 1) {
    const views = 6 + (day % 7);
    const uniqueSpan = 3 + (day % 4);
    const start = riyadhStart(EXAMPLE_NOW, day).getTime();
    for (let index = 0; index < views; index += 1) {
      rows.push({
        created_at: new Date(start + (8 + (index % 10)) * 60 * 60 * 1000).toISOString(),
        path: PAGES[(day + index) % PAGES.length] || "/",
        referrer_host: REFS[(day + index) % REFS.length] ?? null,
        utm_source: SOURCES[(day + index) % SOURCES.length] ?? null,
        utm_medium: (day + index) % 5 === 0 ? "social" : null,
        utm_campaign: (day + index) % 5 === 0 ? "launch-post" : null,
        device_class: index % 3 === 0 ? "mobile" : "desktop",
        language: index % 4 === 0 ? "ar" : "en",
        visitor_id: `sample-${day}-${index % uniqueSpan}`,
      });
    }
  }
  return rows;
}

/** Sample admin payload. The page shows it only off the production host, with an example banner. */
export function exampleAdminStats() {
  const visits = aggregatePageViews(examplePageViews(), EXAMPLE_NOW, { days7: 6, days30: 19 });
  return {
    example: true as const,
    timezone: "Asia/Riyadh",
    signups: { today: 2, days7: 11 },
    attribution: {
      confirmedToday: 1,
      confirmed7: 6,
      unconfirmed7: 2,
      excludedTest: 1,
      today: { linkedin: 1, x: 0, email: 0, unknown: 0, not_recorded: 0 },
      days7: { linkedin: 3, x: 2, email: 1, unknown: 0, not_recorded: 0 },
      methods: { utm: 4, referrer: 2, none: 0, not_recorded: 0 },
      visits: null,
      conversion: null,
    },
    chats: { today: 5, days7: 29 },
    subscriptions: [
      { plan: "engineer", count: 4 },
      { plan: "team", count: 2 },
    ],
    payments7d: {
      count: 2,
      amountSar: 398,
      byPlan: [{ plan: "engineer", count: 2 }],
    },
    feedback: {
      count: 3,
      averageRating: 4.3,
      latest: [
        {
          rating: 5,
          liked: "Example note, not a real customer.",
          improve: null,
          createdAt: "2026-11-24T09:00:00.000Z",
        },
      ],
    },
    visits,
  };
}
