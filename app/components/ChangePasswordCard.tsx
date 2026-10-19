"use client";

import { useState } from "react";
import PasswordField from "@/app/components/PasswordField";
import { supabase } from "@/lib/supabaseClient";
import { changePassword, requestAuthEmail } from "@/lib/authEmailClient";
import { passwordProblem, passwordStrength } from "@/lib/password";
import { useMessages } from "@/lib/useMessages";

export default function ChangePasswordCard() {
  const { shell: s } = useMessages();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<"save" | "reset" | "">("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const strength = passwordStrength(next);
  const strengthLabel =
    strength === "short" ? s.password.strengthShort : strength === "strong" ? s.password.strengthStrong : strength === "ok" ? s.password.strengthOk : "";

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    const problem = passwordProblem(next, confirm);
    if (problem === "short") {
      setError(s.password.tooShort);
      return;
    }
    if (problem === "mismatch") {
      setError(s.password.mismatch);
      return;
    }
    setBusy("save");
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (userError || !email) {
        setError(s.profile.notLoggedIn);
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: current });
      if (signInError) {
        setError(s.password.currentWrong);
        return;
      }
      const { error: updateError } = await changePassword(next);
      if (updateError) {
        setError(s.password.generic);
        return;
      }
      setCurrent("");
      setNext("");
      setConfirm("");
      setInfo(s.password.updated);
    } catch {
      setError(s.password.generic);
    } finally {
      setBusy("");
    }
  }

  async function sendReset() {
    setError(null);
    setInfo(null);
    setBusy("reset");
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (userError || !email) {
        setError(s.profile.notLoggedIn);
        return;
      }
      const { status, data } = await requestAuthEmail("reset", { email });
      if (status === 429 || (!data.ok && status >= 400)) {
        setError(status === 429 ? s.password.tryLater : s.password.generic);
        return;
      }
      setInfo(s.password.resetSentYou);
    } catch {
      setError(s.password.generic);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="card" style={{ marginTop: 24 }} data-testid="change-password">
      <h2 className="card-title">{s.password.changeTitle}</h2>
      <p className="page-subtitle">{s.password.changeLead}</p>
      <form onSubmit={(event) => void save(event)}>
        <PasswordField
          label={s.password.current}
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
          showLabel={s.password.show}
          hideLabel={s.password.hide}
        />
        <PasswordField
          label={s.password.newPassword}
          value={next}
          onChange={setNext}
          autoComplete="new-password"
          showLabel={s.password.show}
          hideLabel={s.password.hide}
          hint={strengthLabel ? `${s.password.hint} ${strengthLabel}` : s.password.hint}
        />
        <PasswordField
          label={s.password.confirm}
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          showLabel={s.password.show}
          hideLabel={s.password.hide}
        />
        {error ? <p className="form-note is-bad">{error}</p> : null}
        {info ? <p className="form-note is-ok">{info}</p> : null}
        <div className="password-actions">
          <button className="btn" type="submit" disabled={busy !== ""}>
            {busy === "save" ? s.password.updating : s.password.update}
          </button>
          <button className="btn btn-quiet" type="button" disabled={busy !== ""} onClick={() => void sendReset()}>
            {busy === "reset" ? s.password.sending : s.password.sendReset}
          </button>
        </div>
      </form>
    </div>
  );
}
