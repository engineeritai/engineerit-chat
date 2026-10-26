import { getAccessToken } from "@/lib/accessToken";

/** Session token for an export request. A signed-in trial is capped only when this is sent. */
export async function exportRequestHeaders(locale?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (locale === "en" || locale === "ar") headers["x-locale"] = locale;
  const token = await getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function exportDeniedError(res: Response, fallback: string): Promise<Error> {
  const data = (await res.json().catch(() => null)) as { error?: string; code?: string } | null;
  if (data?.code === "export_limit" && typeof data.error === "string" && data.error) {
    const error = new Error(data.error) as Error & { code?: string };
    error.code = "export_limit";
    return error;
  }
  if (res.status === 401 && typeof data?.error === "string" && data.error) return new Error(data.error);
  return new Error(fallback);
}

export function isExportLimitError(error: unknown): error is Error {
  return error instanceof Error && (error as { code?: string }).code === "export_limit";
}
