"use client";

import { useState } from "react";

export default function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  showLabel,
  hideLabel,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  showLabel: string;
  hideLabel: string;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="form-row">
      <label>
        {label}
        <span className="password-field">
          <input
            className="input"
            type={visible ? "text" : "password"}
            value={value}
            autoComplete={autoComplete}
            onChange={(event) => onChange(event.target.value)}
          />
          <button
            type="button"
            className="password-toggle"
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? hideLabel : showLabel}
          </button>
        </span>
      </label>
      {hint ? <p className="password-hint">{hint}</p> : null}
    </div>
  );
}
