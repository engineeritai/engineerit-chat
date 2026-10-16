"use client";

import { useState } from "react";
import { getMarketingContent, type Locale } from "@/lib/marketing";
import { CONTACT_EMAIL, pilotMailto } from "@/lib/trust";

export default function PilotRequestForm({
  locale = "en",
  subject = "Team pilot request — engineerit.ai",
}: {
  locale?: Locale;
  subject?: string;
}) {
  const content = getMarketingContent(locale);
  const [opened, setOpened] = useState(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const company = String(data.get("company") || "").trim();
    const message = String(data.get("message") || "").trim();
    const body = [
      `Name: ${name}`,
      `Work email: ${email}`,
      `Company: ${company}`,
      "",
      message || "We would like to request a team pilot.",
    ].join("\n");

    window.location.href = pilotMailto(subject, body);
    setOpened(true);
  }

  return (
    <form className="mkt-form" onSubmit={onSubmit} id="request-pilot">
      <h3>{content.teams.formTitle}</h3>
      <p className="mkt-muted">{content.teams.formNote}</p>

      <label>
        {content.teams.name}
        <input className="input" name="name" type="text" required autoComplete="name" />
      </label>
      <label>
        {content.teams.email}
        <input className="input" name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        {content.teams.company}
        <input className="input" name="company" type="text" required autoComplete="organization" />
      </label>
      <label>
        {content.teams.message}
        <textarea
          className="textarea"
          name="message"
          rows={4}
          placeholder={content.teams.messagePlaceholder}
        />
      </label>

      <button className="mkt-btn mkt-btn-primary" type="submit">
        {content.teams.submit}
      </button>

      {opened && (
        <p className="mkt-note">
          {content.teams.opened} {CONTACT_EMAIL}
        </p>
      )}

      <p className="mkt-muted">
        <a href={pilotMailto(subject)}>{content.teams.mailtoFallback}</a>
      </p>
    </form>
  );
}
