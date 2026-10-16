export function isAdminEmail(
  email: string | null | undefined,
  raw: string | undefined = process.env.ADMIN_EMAILS
) {
  if (!email) return false;
  const list = (raw || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}
