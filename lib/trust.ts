/** Public trust and contact details already used on the site. */
export const CONTACT_EMAIL = "info@engineerit.ai";

export const SAUDI_BUSINESS_AUTH_NO = "0000204877";

export const SAUDI_BUSINESS_VERIFY_URL =
  "https://eauthenticate.saudibusiness.gov.sa/inquiry";

export function pilotMailto(subject: string, body?: string) {
  const query = [`subject=${encodeURIComponent(subject)}`];
  if (body) query.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${CONTACT_EMAIL}?${query.join("&")}`;
}
