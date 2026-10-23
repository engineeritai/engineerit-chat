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

export function feedbackTableMissing(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  const message = error.message || "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (/platform_feedback/i.test(message) && /does not exist|schema cache/i.test(message))
  );
}
