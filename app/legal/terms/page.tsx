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
          <h1 className="page-title">User Policy &amp; Agreement</h1>
          <p className="page-subtitle">
            This page describes the Terms &amp; Conditions, Privacy Policy, and
            cancellation / refund policy, and the liability limitations for
            using <strong>engineerit.ai</strong>.
          </p>

          <div className="card" style={{ fontSize: 14, lineHeight: 1.6 }}>
            {/* Intro / Legal Entity */}
            <p style={{ marginBottom: 16 }}>
              <strong>engineerit.ai</strong> (<q>engineerit.ai</q>, <q>we</q>,{" "}
              <q>our</q>, or <q>us</q>) is an AI-assisted engineering platform
              operated online. By creating an account or using the services on{" "}
              <strong>engineerit.ai</strong>, you agree to the following terms,
              policies, and limitations.
            </p>

            {/* 1. Use of the Service */}
            <h2 className="section-heading">1. Use of the Service</h2>
            <p>
              <strong>engineerit.ai</strong> is an AI-assisted engineering tool
              designed to support engineers in analysis, drafting, design, and
              documentation. The outputs are suggestions and drafts only and
              must always be reviewed, verified, and approved by qualified
              engineers and the responsible parties in each project.
            </p>

            {/* 2. No Engineering Liability */}
            <h2 className="section-heading">2. No Engineering Liability</h2>
            <p>
              <strong>engineerit.ai</strong>, its owners, developers, and
              partners are not responsible or liable for any engineering
              decision, design choice, calculation, or action taken by the user
              based on the outputs of the platform. The user remains fully
              responsible for checking all designs, drawings, calculations,
              schedules, and documents against applicable codes, standards, and
              regulations.
            </p>

            {/* 3. Accounts & Subscriptions */}
            <h2 className="section-heading">3. Accounts &amp; Subscriptions</h2>
            <p>
              Users may register and select a subscription level: Assistant
              Engineer, Engineer, Professional Engineer, or Consultant Engineer.
              Access to features and usage limits depends on the selected plan.
              We may change plan features or pricing from time to time; any such
              changes will be reflected on our pricing page.
            </p>

            {/* 4. Cancellation & Refund Policy (anchor for /legal/refund) */}
            <h2 id="refund" className="section-heading">
              4. Cancellation &amp; Refund Policy
            </h2>
            <ul className="plan-features">
              <li>
                Monthly subscriptions can be cancelled at any time. Access will
                continue until the end of the paid billing period. No partial
                refunds are issued for unused days in a billing cycle, unless
                required by applicable law.
              </li>
              <li>
                Yearly subscriptions can be cancelled before the next renewal
                date. Refunds for yearly plans, if any, are at the sole
                discretion of <strong>engineerit.ai</strong> and may be subject
                to administrative and usage deductions.
              </li>
              <li>
                Promotional, discounted, or trial plans are generally
                non-refundable unless explicitly stated otherwise or required by
                applicable law.
              </li>
            </ul>

            {/* 5. Data & Privacy (anchor for /legal/privacy) */}
            <h2 id="privacy" className="section-heading">
              5. Data &amp; Privacy
            </h2>
            <p>
              <strong>engineerit.ai</strong> may process uploaded files,
              messages, and usage data to generate answers, improve the service,
              maintain security, and comply with legal obligations. Sensitive or
              confidential information should only be uploaded with proper
              authorization from the data owner.
            </p>
            <p>
              We do not sell personal data to third parties. Limited data may be
              shared with trusted service providers (such as hosting, analytics,
              and payment processors) strictly for operating the platform and
              only under appropriate data protection safeguards.
            </p>
            <p>
              By using the service, you consent to the collection and processing
              of data as described in this section. For any privacy questions or
              requests (such as access, correction, or deletion where
              applicable), you can contact us at{" "}
              <a href="mailto:info@engineerit.ai">info@engineerit.ai</a>.
            </p>

            {/* 6. Fair Use & Limits */}
            <h2 className="section-heading">6. Fair Use &amp; Limits</h2>
            <p>
              <strong>engineerit.ai</strong> may apply fair use limits on the
              number of requests, file sizes, or projects per subscription.
              Automated abuse, reselling access, or using the service in a way
              that degrades performance for other users may result in warning,
              temporary suspension, or termination of the account.
            </p>

            {/* 7. Changes */}
            <h2 className="section-heading">7. Changes to the Terms</h2>
            <p>
              <strong>engineerit.ai</strong> may update these terms and policies
              from time to time. Continued use of the service after changes are
              published on the website constitutes acceptance of the updated
              terms. The latest version will always be available on this page.
            </p>

            {/* 8. Governing Law */}
            <h2 className="section-heading">8. Governing Law</h2>
            <p>
              The use of <strong>engineerit.ai</strong> is subject to applicable
              laws and regulations in the Kingdom of Saudi Arabia and any other
              relevant jurisdiction, subject to conflict-of-law principles.
            </p>

            <p style={{ fontSize: 12, color: "#6b7280", marginTop: 12 }}>
              This document is provided as a general user policy template for{" "}
              <strong>engineerit.ai</strong> and does not constitute legal
              advice.
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
            <h2 className="section-heading">Download Full Terms Documents</h2>
            <p>
              You can download the complete Terms of Use documents below (English &amp;
              Arabic):
            </p>

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
