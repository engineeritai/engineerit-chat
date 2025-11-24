"use client";

import { useState } from "react";
import Header from "../../components/Header";
import NavSidebar from "../../components/NavSidebar";

export default function TermsPage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  return (
    <div className="app-shell">
      <NavSidebar
        isMobileOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />

      <div className="main">
        <Header onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)} />

        <div className="page-wrap">
          <h1 className="page-title">User Policy & Agreement</h1>
          <p className="page-subtitle">
            This page describes the terms, cancellation / refund policy, and
            liability limitations for using engineerit.ai 
          </p>

          <div className="card" style={{ fontSize: 14, lineHeight: 1.6 }}>
            {/* Existing Terms */}
            <h2 className="section-heading">1. Use of the Service</h2>
            <p>
              engineerit.ai is an AI-assisted engineering tool designed to
              support engineers in analysis, drafting, design, and
              documentation. The outputs are suggestions and drafts only and
              must always be reviewed, verified, and approved by qualified
              engineers and the responsible parties in each project.
            </p>

            <h2 className="section-heading">2. No Engineering Liability</h2>
            <p>
              engineerit.ai, its owners, developers, and partners are not
              responsible or liable for any engineering decision, design choice,
              calculation, or action taken by the user based on the outputs of
              the platform. The user remains fully responsible for checking all
              designs, drawings, calculations, schedules, and documents against
              applicable codes, standards, and regulations.
            </p>

            <h2 className="section-heading">3. Accounts & Subscriptions</h2>
            <p>
              Users may register and select a subscription level: Assistant
              Engineer, Engineer, Professional Engineer, or Consultant Engineer.
              Access to features and limits depends on the selected plan.
            </p>

            <h2 className="section-heading">4. Cancellation & Refund Policy</h2>
            <ul className="plan-features">
              <li>
                Monthly subscriptions can be cancelled at any time. Access will
                continue until the end of the paid billing period. No partial
                refunds are issued.
              </li>
              <li>
                Yearly subscriptions can be cancelled before renewal. Refunds
                for yearly plans, if any, are at the sole discretion of
                engineerit.ai.
              </li>
              <li>
                Promotional or trial plans are generally non-refundable unless
                required by applicable law.
              </li>
            </ul>

            <h2 className="section-heading">5. Data & Privacy</h2>
            <p>
              engineerit.ai may process uploaded files and chat content to
              generate answers and improve the service. Sensitive or
              confidential information should only be uploaded with proper
              authorization.
            </p>

            <h2 className="section-heading">6. Fair Use & Limits</h2>
            <p>
              engineerit.ai may apply fair use limits on the number of requests,
              file sizes, or projects per subscription. Abuse of the service may
              result in suspension or termination.
            </p>

            <h2 className="section-heading">7. Changes to the Terms</h2>
            <p>
              engineerit.ai may update these terms and policies from time to
              time. Continued use of the service after changes are published
              constitutes acceptance of the updated terms.
            </p>

            <h2 className="section-heading">8. Governing Law</h2>
            <p>
              The use of engineerit.ai is subject to applicable laws and
              regulations in the Kingdom of Saudi Arabia and any other relevant
              jurisdiction.
            </p>

            <p style={{ fontSize: 12, color: "#6b7280", marginTop: 12 }}>
              This document is provided as a general user policy template and
              does not constitute legal advice.
            </p>
          </div>

          {/* Attachments Section */}
          <div
            className="card"
            style={{
              marginTop: 20,
              padding: 20,
              fontSize: 14,
              lineHeight: 1.6,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <h2 className="section-heading">Download Full Terms Documents </h2>
            <p>You can download the complete Terms of Use as documents below:</p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <a
                href="/legal/Engineerit_Terms_EN.docx"
                download
                className="btn btn-secondary"
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  textDecoration: "none",
                  fontSize: 14,
                }}
              >
                📄 Download Terms of Use (English)
              </a>

              <a
                href="/legal/Engineerit_Terms_AR.docx"
                download
                className="btn btn-secondary"
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  textDecoration: "none",
                  fontSize: 14,
                }}
              >
                📄 Download Terms of Use (Arabic)
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
