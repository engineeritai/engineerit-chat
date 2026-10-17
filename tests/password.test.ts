import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyResetError, passwordProblem, passwordStrength } from "../lib/password";
import { shellCopy } from "../lib/shell";

describe("password reset copy", () => {
  it("keeps the public reset message from confirming an account", () => {
    assert.equal(classifyResetError("User not found"), "sent");
    assert.equal(classifyResetError("Unable to validate email address: invalid format"), "sent");
    assert.equal(classifyResetError("Email rate limit exceeded"), "later");
    assert.equal(classifyResetError("redirect_to is not allowed"), "failed");
    assert.match(shellCopy.en.password.ifExists, /If an account exists/);
    assert.doesNotMatch(shellCopy.en.password.ifExists, /sent to your email/i);
    assert.match(shellCopy.ar.password.ifExists, /إذا كان هناك حساب/);
    assert.equal(shellCopy.en.password.sendReset, "Send reset link to my email");
    assert.equal(shellCopy.en.header.forgot, "Forgot password?");
    assert.equal(shellCopy.ar.header.forgot, "نسيت كلمة المرور؟");
  });

  it("requires 8 characters and treats a letter plus a number as strong", () => {
    assert.equal(passwordStrength(""), "empty");
    assert.equal(passwordStrength("short"), "short");
    assert.equal(passwordStrength("longenough"), "ok");
    assert.equal(passwordStrength("engineer1"), "strong");
    assert.equal(passwordProblem("short", "short"), "short");
    assert.equal(passwordProblem("engineer1", "engineer2"), "mismatch");
    assert.equal(passwordProblem("engineer1", "engineer1"), null);
  });
});
