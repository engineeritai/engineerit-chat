import { readFile } from "fs/promises";
import path from "path";

const PLACEHOLDER = path.join(
  process.cwd(),
  "public/.well-known/apple-developer-merchantid-domain-association"
);

/** Env wins when set. Otherwise the placeholder file the owner replaces is served. */
export async function readApplePayDomainAssociation(env: Record<string, string | undefined> = process.env) {
  const fromEnv = env["APPLE_PAY_DOMAIN_ASSOCIATION"];
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv;
  return readFile(PLACEHOLDER, "utf8");
}
