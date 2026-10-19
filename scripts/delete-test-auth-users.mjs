/**
 * Dry-run by default. Deletes only throwaway auth users.
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Delete: CONFIRM_DELETE_TEST_ACCOUNTS=yes node scripts/delete-test-auth-users.mjs
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const confirm = process.env.CONFIRM_DELETE_TEST_ACCOUNTS === "yes";
const pattern = /maxxspace|eit-pw-|team449-check|\+test@/i;

if (!url || url.includes("example.supabase.co") || !key || key.length < 20) {
  console.error("Refusing: production Supabase credentials are not configured in this environment.");
  process.exit(1);
}

const matches = [];
for (let page = 1; page <= 50; page += 1) {
  const response = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=200`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  if (!response.ok) {
    console.error("Could not list users", response.status);
    process.exit(1);
  }
  const body = await response.json();
  const users = body.users || [];
  for (const user of users) {
    if (pattern.test(user.email || "")) matches.push({ id: user.id, email: user.email, created_at: user.created_at });
  }
  if (users.length < 200) break;
}

console.log(`${confirm ? "Deleting" : "Would delete"} ${matches.length} test users`);
for (const user of matches) console.log(`${user.created_at}\t${user.email}`);
if (!confirm) {
  console.log("Dry run only. Re-run with CONFIRM_DELETE_TEST_ACCOUNTS=yes to delete these users.");
  process.exit(0);
}

let deleted = 0;
for (const user of matches) {
  const response = await fetch(`${url}/auth/v1/admin/users/${user.id}`, {
    method: "DELETE",
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  if (!response.ok) {
    console.error("Failed", user.email, response.status);
    continue;
  }
  deleted += 1;
}
console.log(`Deleted ${deleted} of ${matches.length}`);
