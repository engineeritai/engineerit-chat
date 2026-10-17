import { expect, test } from "@playwright/test";

test("login links to forgot password and the form does not confirm an account", async ({ page }, info) => {
  test.skip(info.project.name !== "phone-390", "mobile screenshots");
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/login?lang=en", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password");

  await page.route("**/auth/v1/recover**", (route) =>
    route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ msg: "User not found" }) })
  );
  await page.goto("/forgot-password?lang=en", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Forgot password" })).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/password-forgot-en.png" });
  await page.locator("input[type='email']").fill("nobody@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByTestId("reset-result")).toHaveText("If an account exists, we sent a link.");
  await expect(page.locator("body")).not.toContainText("User not found");

  await page.goto("/forgot-password?lang=ar", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "نسيت كلمة المرور" })).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/password-forgot-ar.png" });

  await page.goto("/profile?lang=en", { waitUntil: "domcontentloaded" });
  const card = page.getByTestId("change-password");
  await expect(card).toContainText("Change password");
  await expect(card).toContainText("at least 8 characters");
  await card.getByRole("button", { name: "Show" }).first().click();
  await expect(card.locator("input").first()).toHaveAttribute("type", "text");
  await card.screenshot({ path: "/opt/cursor/artifacts/password-profile-en.png" });

  await page.goto("/profile?lang=ar", { waitUntil: "domcontentloaded" });
  const arabic = page.getByTestId("change-password");
  await expect(arabic).toContainText("تغيير كلمة المرور");
  await expect(arabic).toContainText("أرسل رابط الاستعادة إلى بريدي");
  await arabic.screenshot({ path: "/opt/cursor/artifacts/password-profile-ar.png" });

  await page.goto("/reset-password?lang=en", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("This reset link is invalid or has expired.")).toBeVisible();
});
