const TEXT_MAX = 2000;

export function cleanFeedbackText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\u0000/g, "").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, TEXT_MAX);
}

export function parsePlatformFeedback(body: unknown):
  | { ok: true; rating: number; liked: string | null; improve: string | null }
  | { ok: false; error: "rating" } {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const rating = typeof record.rating === "number" ? record.rating : Number(record.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: "rating" };
  return {
    ok: true,
    rating,
    liked: cleanFeedbackText(record.liked),
    improve: cleanFeedbackText(record.improve),
  };
}

export type FeedbackSuggestion = {
  rating: number;
  liked: string | null;
  improve: string | null;
  createdAt: string;
};

export function summarizePlatformFeedback(
  ratings: number[],
  latestRows: Array<{ rating: number | string | null; liked: string | null; improve: string | null; created_at: string }>
) {
  const valid = ratings.filter((rating) => Number.isInteger(rating) && rating >= 1 && rating <= 5);
  const averageRating =
    valid.length === 0
      ? null
      : Math.round((valid.reduce((sum, rating) => sum + rating, 0) / valid.length) * 10) / 10;
  const latest: FeedbackSuggestion[] = [];
  for (const row of latestRows) {
    const liked = cleanFeedbackText(row.liked);
    const improve = cleanFeedbackText(row.improve);
    if (!liked && !improve) continue;
    const rating = typeof row.rating === "number" ? row.rating : Number(row.rating);
    latest.push({
      rating: Number.isInteger(rating) ? rating : 0,
      liked,
      improve,
      createdAt: row.created_at,
    });
    if (latest.length === 8) break;
  }
  return { count: valid.length, averageRating, latest };
}

/** True when platform_feedback is absent because the lifecycle migration has not been applied. */
export function feedbackTableMissing(error: unknown) {
  if (!error || (typeof error !== "object" && typeof error !== "string")) return false;
  const record = typeof error === "object" ? (error as { code?: string; message?: string; details?: string; hint?: string }) : {};
  const text = [
    record.code,
    record.message,
    record.details,
    record.hint,
    error instanceof Error ? error.message : "",
    typeof error === "string" ? error : "",
  ]
    .filter(Boolean)
    .join(" ");
  if (record.code === "42P01" || record.code === "PGRST205") return true;
  return /platform_feedback/i.test(text) && /does not exist|schema cache|could not find the table/i.test(text);
}

export function presentFeedback(value: unknown):
  | { ready: false }
  | { ready: true; count: number; averageRating: number | null; latest: FeedbackSuggestion[] } {
  if (value == null || typeof value !== "object") return { ready: false };
  const record = value as { count?: unknown; averageRating?: unknown; latest?: unknown };
  const count = typeof record.count === "number" ? record.count : Number(record.count);
  if (!Number.isFinite(count) || count < 0) return { ready: false };
  const averageRating =
    typeof record.averageRating === "number" && Number.isFinite(record.averageRating) ? record.averageRating : null;
  const latest = Array.isArray(record.latest)
    ? record.latest.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as { rating?: unknown; liked?: unknown; improve?: unknown; createdAt?: unknown };
        const rating = typeof row.rating === "number" ? row.rating : Number(row.rating);
        return [
          {
            rating: Number.isFinite(rating) ? rating : 0,
            liked: cleanFeedbackText(row.liked),
            improve: cleanFeedbackText(row.improve),
            createdAt: typeof row.createdAt === "string" ? row.createdAt : "",
          },
        ];
      })
    : [];
  return { ready: true, count, averageRating, latest };
}
