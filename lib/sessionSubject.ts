/**
 * Daily limits and plan checks follow the signed-in user.
 * A user id in the request body is not a session.
 */
export function subjectFromSession(sessionUserId: string | null | undefined): string | null {
  const id = sessionUserId?.trim();
  if (!id || id === "guest") return null;
  return id;
}
