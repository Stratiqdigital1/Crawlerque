import nodemailer from "nodemailer";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
if (
  !process.env.SMTP_HOST ||
  !process.env.SMTP_USER ||
  !process.env.SMTP_PASS ||
  !process.env.SMTP_FROM
) {
  throw new Error(
    "SMTP configuration is incomplete. Check SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM."
  );
}

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const result = await transporter.sendMail({
  from: process.env.SMTP_FROM,
  to,
  subject,
  html,
});

console.log("Email sent successfully:", {
  messageId: result.messageId,
  to,
});
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  await sendEmail({
    to,
    subject: "Reset your Crawler Que password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0B1929;">Reset your password</h2>
        <p style="color: #444; font-size: 15px; line-height: 1.6;">
          We received a request to reset the password for your Crawler Que account.
          Click the button below to choose a new password. This link expires in 1 hour.
        </p>
        <a href="${resetLink}"
           style="display: inline-block; margin: 20px 0; padding: 12px 24px;
                  background-color: #00D4AA; color: #071526; font-weight: bold;
                  text-decoration: none; border-radius: 8px;">
          Reset Password
        </a>
        <p style="color: #888; font-size: 13px; line-height: 1.6;">
          If you didn't request this, you can safely ignore this email — your
          password will not be changed.
        </p>
        <p style="color: #888; font-size: 13px;">
          Or copy this link: <br />
          <span style="word-break: break-all;">${resetLink}</span>
        </p>
      </div>
    `,
  });
}

type SubscriptionEmailKind =
  | "trial"
  | "purchase"
  | "renewal"
  | "payment";

type SubscriptionEmailParams = {
  kind: SubscriptionEmailKind;
  to: string;
  name?: string | null;
  planName: string;
  monthlyAudits: number;
  dashboardUrl: string;
  amountPaid?: number | null;
  currency?: string | null;
  billingInterval?: string | null;
  invoiceNumber?: string | null;
  nextBillingDate?: Date | null;
  hostedInvoiceUrl?: string | null;
  invoicePdfUrl?: string | null;
};

function escapeEmailHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return replacements[character] || character;
  });
}

function formatEmailMoney(
  amount?: number | null,
  currency?: string | null
) {
  if (amount === null || amount === undefined) {
    return null;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency || "usd").toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `$${(amount / 100).toFixed(2)}`;
  }
}

function formatEmailDate(date?: Date | null) {
  if (!date) return null;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
  }).format(date);
}

export async function sendSubscriptionEmail({
  kind,
  to,
  name,
  planName,
  monthlyAudits,
  dashboardUrl,
  amountPaid,
  currency,
  billingInterval,
  invoiceNumber,
  nextBillingDate,
  hostedInvoiceUrl,
  invoicePdfUrl,
}: SubscriptionEmailParams) {
  const firstName =
    name?.trim().split(/\s+/)[0] || "there";

  const formattedAmount = formatEmailMoney(
    amountPaid,
    currency
  );

  const formattedNextBillingDate =
    formatEmailDate(nextBillingDate);

  const subject =
    kind === "trial"
      ? "Welcome to Crawler Que — your free trial is active"
      : kind === "purchase"
        ? `Welcome to Crawler Que — your ${planName} plan is active`
        : kind === "renewal"
          ? `Crawler Que subscription renewed — ${planName}`
          : `Crawler Que payment received — ${planName}`;

  const heading =
    kind === "trial"
      ? "Your free trial has started"
      : kind === "purchase"
        ? "Welcome to Crawler Que"
        : kind === "renewal"
          ? "Your subscription has been renewed"
          : "Your payment was successful";

  const introduction =
    kind === "trial"
      ? `Your Crawler Que ${escapeEmailHtml(
          planName
        )} plan is now active. You can start running website audits from your dashboard.`
      : kind === "purchase"
        ? `Your payment was successful and your ${escapeEmailHtml(
            planName
          )} plan is now active.`
        : kind === "renewal"
          ? `We successfully received your latest subscription payment. Your ${escapeEmailHtml(
              planName
            )} plan remains active.`
          : `We successfully received your payment for the ${escapeEmailHtml(
              planName
            )} plan.`;

  await sendEmail({
    to,
    subject,
    html: `
      <div style="
        margin:0;
        padding:32px 16px;
        background:#f3f6f8;
        font-family:Arial,Helvetica,sans-serif;
      ">
        <div style="
          max-width:600px;
          margin:0 auto;
          overflow:hidden;
          background:#ffffff;
          border:1px solid #dfe6eb;
          border-radius:16px;
        ">

          <div style="
            padding:28px 32px;
            background:#0B1929;
          ">
            <div style="
              color:#ffffff;
              font-size:24px;
              font-weight:700;
            ">
              Crawler Que
            </div>

            <div style="
              margin-top:6px;
              color:#a8b7c3;
              font-size:14px;
            ">
              AI Website Growth Intelligence
            </div>
          </div>

          <div style="padding:32px;">
            <p style="
              margin:0 0 8px;
              color:#00A987;
              font-size:13px;
              font-weight:700;
              letter-spacing:0.08em;
              text-transform:uppercase;
            ">
              ${
                kind === "trial"
                  ? "Trial activated"
                  : "Payment confirmed"
              }
            </p>

            <h1 style="
              margin:0;
              color:#0B1929;
              font-size:27px;
              line-height:1.3;
            ">
              ${heading}
            </h1>

            <p style="
              margin:16px 0 0;
              color:#465563;
              font-size:15px;
              line-height:1.7;
            ">
              Hi ${escapeEmailHtml(firstName)},
            </p>

            <p style="
              margin:10px 0 0;
              color:#465563;
              font-size:15px;
              line-height:1.7;
            ">
              ${introduction}
            </p>

            <div style="
              margin:24px 0;
              padding:20px;
              background:#f7f9fa;
              border:1px solid #e0e6ea;
              border-radius:12px;
            ">
              <table style="
                width:100%;
                border-collapse:collapse;
                font-size:14px;
              ">
                <tr>
                  <td style="
                    padding:8px 0;
                    color:#6c7984;
                  ">
                    Plan
                  </td>

                  <td style="
                    padding:8px 0;
                    color:#0B1929;
                    font-weight:700;
                    text-align:right;
                  ">
                    ${escapeEmailHtml(planName)}
                  </td>
                </tr>

                <tr>
                  <td style="
                    padding:8px 0;
                    color:#6c7984;
                  ">
                    Status
                  </td>

                  <td style="
                    padding:8px 0;
                    color:#0B1929;
                    font-weight:700;
                    text-align:right;
                  ">
                    ${
                      kind === "trial"
                        ? "Trial active"
                        : "Active"
                    }
                  </td>
                </tr>

                <tr>
                  <td style="
                    padding:8px 0;
                    color:#6c7984;
                  ">
                    Audit allowance
                  </td>

                  <td style="
                    padding:8px 0;
                    color:#0B1929;
                    font-weight:700;
                    text-align:right;
                  ">
                    ${monthlyAudits} audits
                  </td>
                </tr>

                ${
                  formattedAmount
                    ? `
                      <tr>
                        <td style="
                          padding:8px 0;
                          color:#6c7984;
                        ">
                          Amount paid
                        </td>

                        <td style="
                          padding:8px 0;
                          color:#0B1929;
                          font-weight:700;
                          text-align:right;
                        ">
                          ${escapeEmailHtml(formattedAmount)}
                          ${
                            billingInterval
                              ? `/ ${escapeEmailHtml(
                                  billingInterval
                                )}`
                              : ""
                          }
                        </td>
                      </tr>
                    `
                    : ""
                }

                ${
                  invoiceNumber
                    ? `
                      <tr>
                        <td style="
                          padding:8px 0;
                          color:#6c7984;
                        ">
                          Invoice
                        </td>

                        <td style="
                          padding:8px 0;
                          color:#0B1929;
                          font-weight:700;
                          text-align:right;
                        ">
                          ${escapeEmailHtml(invoiceNumber)}
                        </td>
                      </tr>
                    `
                    : ""
                }

                ${
                  formattedNextBillingDate
                    ? `
                      <tr>
                        <td style="
                          padding:8px 0;
                          color:#6c7984;
                        ">
                          ${
                            kind === "trial"
                              ? "Trial ends"
                              : "Next billing date"
                          }
                        </td>

                        <td style="
                          padding:8px 0;
                          color:#0B1929;
                          font-weight:700;
                          text-align:right;
                        ">
                          ${escapeEmailHtml(
                            formattedNextBillingDate
                          )}
                        </td>
                      </tr>
                    `
                    : ""
                }
              </table>
            </div>

            <div style="margin-top:24px;">
              <a
                href="${escapeEmailHtml(dashboardUrl)}"
                style="
                  display:inline-block;
                  padding:13px 22px;
                  background:#00D4AA;
                  color:#071526;
                  border-radius:8px;
                  font-size:14px;
                  font-weight:700;
                  text-decoration:none;
                "
              >
                Open dashboard
              </a>

              ${
                hostedInvoiceUrl
                  ? `
                    <a
                      href="${escapeEmailHtml(
                        hostedInvoiceUrl
                      )}"
                      style="
                        display:inline-block;
                        margin-left:8px;
                        padding:12px 19px;
                        color:#0B1929;
                        border:1px solid #cbd5dc;
                        border-radius:8px;
                        font-size:14px;
                        font-weight:700;
                        text-decoration:none;
                      "
                    >
                      View invoice
                    </a>
                  `
                  : ""
              }
            </div>

            ${
              invoicePdfUrl
                ? `
                  <p style="
                    margin:18px 0 0;
                    font-size:14px;
                  ">
                    <a
                      href="${escapeEmailHtml(invoicePdfUrl)}"
                      style="
                        color:#087f70;
                        font-weight:700;
                      "
                    >
                      Download invoice PDF
                    </a>
                  </p>
                `
                : ""
            }

            <p style="
              margin:30px 0 0;
              color:#6b7884;
              font-size:13px;
              line-height:1.7;
            ">
              Questions about your account, audits, or billing?
              Contact
              <a
                href="mailto:info@crawlerque.com"
                style="color:#087f70;"
              >
                info@crawlerque.com
              </a>.
            </p>
          </div>
        </div>
      </div>
    `,
  });
}

type TrialExpiryReminderEmailParams = {
  to: string;
  name?: string | null;
  trialEndsAt: Date;
  upgradeUrl: string;
};

function escapeTrialReminderHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return replacements[character] || character;
  });
}

function formatTrialReminderDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

export async function sendTrialExpiryReminderEmail({
  to,
  name,
  trialEndsAt,
  upgradeUrl,
}: TrialExpiryReminderEmailParams) {
  const firstName =
    name?.trim().split(/\s+/)[0] || "there";

  const formattedTrialEnd =
    formatTrialReminderDate(trialEndsAt);

  await sendEmail({
    to,
    subject:
      "Your Crawler Que trial ends tomorrow — choose your plan",
    html: `
      <div style="
        margin:0;
        padding:32px 16px;
        background:#f3f6f8;
        font-family:Arial,Helvetica,sans-serif;
      ">
        <div style="
          max-width:620px;
          margin:0 auto;
          overflow:hidden;
          background:#ffffff;
          border:1px solid #dfe6eb;
          border-radius:16px;
        ">

          <div style="
            padding:28px 32px;
            background:#0B1929;
          ">
            <div style="
              color:#ffffff;
              font-size:24px;
              font-weight:700;
            ">
              Crawler Que
            </div>

            <div style="
              margin-top:6px;
              color:#a8b7c3;
              font-size:14px;
            ">
              AI Website Growth Intelligence
            </div>
          </div>

          <div style="padding:32px;">
            <p style="
              margin:0 0 8px;
              color:#00A987;
              font-size:13px;
              font-weight:700;
              letter-spacing:0.08em;
              text-transform:uppercase;
            ">
              Trial ending soon
            </p>

            <h1 style="
              margin:0;
              color:#0B1929;
              font-size:28px;
              line-height:1.3;
            ">
              Keep your website growth intelligence active
            </h1>

            <p style="
              margin:18px 0 0;
              color:#465563;
              font-size:15px;
              line-height:1.7;
            ">
              Hi ${escapeTrialReminderHtml(firstName)},
            </p>

            <p style="
              margin:10px 0 0;
              color:#465563;
              font-size:15px;
              line-height:1.7;
            ">
              Your Crawler Que free trial ends on
              <strong style="color:#0B1929;">
                ${escapeTrialReminderHtml(formattedTrialEnd)}
              </strong>.
              Choose a plan now to continue running complete website audits,
              accessing AI visibility insights, and generating professional
              growth reports.
            </p>

            <div style="
              margin:26px 0 0;
              padding:20px;
              border:1px solid #dfe6eb;
              border-radius:12px;
              background:#f8fafb;
            ">
              <table style="
                width:100%;
                border-collapse:collapse;
              ">
                <tr>
                  <td style="vertical-align:top;">
                    <div style="
                      color:#0B1929;
                      font-size:18px;
                      font-weight:700;
                    ">
                      Starter
                    </div>

                    <div style="
                      margin-top:4px;
                      color:#00A987;
                      font-size:20px;
                      font-weight:700;
                    ">
                      $30/month
                    </div>
                  </td>

                  <td style="
                    text-align:right;
                    color:#465563;
                    font-size:14px;
                    line-height:1.7;
                  ">
                    7 full audits<br />
                    All 8 audit modules<br />
                    Branded PDF export<br />
                    1 user seat
                  </td>
                </tr>
              </table>
            </div>

            <div style="
              margin:14px 0 0;
              padding:20px;
              border:2px solid #00D4AA;
              border-radius:12px;
              background:#f1fffb;
            ">
              <div style="
                display:inline-block;
                margin-bottom:12px;
                padding:5px 10px;
                border-radius:20px;
                background:#00D4AA;
                color:#071526;
                font-size:11px;
                font-weight:700;
                letter-spacing:0.06em;
                text-transform:uppercase;
              ">
                Most popular
              </div>

              <table style="
                width:100%;
                border-collapse:collapse;
              ">
                <tr>
                  <td style="vertical-align:top;">
                    <div style="
                      color:#0B1929;
                      font-size:18px;
                      font-weight:700;
                    ">
                      Agency
                    </div>

                    <div style="
                      margin-top:4px;
                      color:#00A987;
                      font-size:20px;
                      font-weight:700;
                    ">
                      $99/month
                    </div>
                  </td>

                  <td style="
                    text-align:right;
                    color:#465563;
                    font-size:14px;
                    line-height:1.7;
                  ">
                    40 full audits<br />
                    White-label PDF reports<br />
                    Comparison reports<br />
                    3 user seats
                  </td>
                </tr>
              </table>
            </div>

            <div style="
              margin:14px 0 0;
              padding:20px;
              border:1px solid #dfe6eb;
              border-radius:12px;
              background:#f8fafb;
            ">
              <table style="
                width:100%;
                border-collapse:collapse;
              ">
                <tr>
                  <td style="vertical-align:top;">
                    <div style="
                      color:#0B1929;
                      font-size:18px;
                      font-weight:700;
                    ">
                      Enterprise
                    </div>

                    <div style="
                      margin-top:4px;
                      color:#00A987;
                      font-size:20px;
                      font-weight:700;
                    ">
                      $299/month
                    </div>
                  </td>

                  <td style="
                    text-align:right;
                    color:#465563;
                    font-size:14px;
                    line-height:1.7;
                  ">
                    150 full audits<br />
                    White-label PDF reports<br />
                    Unlimited report history<br />
                    10 user seats
                  </td>
                </tr>
              </table>
            </div>

            <div style="
              margin-top:28px;
              text-align:center;
            ">
              <a
                href="${escapeTrialReminderHtml(upgradeUrl)}"
                style="
                  display:inline-block;
                  padding:14px 28px;
                  background:#00D4AA;
                  color:#071526;
                  border-radius:8px;
                  font-size:15px;
                  font-weight:700;
                  text-decoration:none;
                "
              >
                Choose your plan
              </a>
            </div>

            <p style="
              margin:24px 0 0;
              color:#6b7884;
              font-size:13px;
              line-height:1.7;
              text-align:center;
            ">
              Upgrade before your trial expires to keep using
              Crawler Que's complete website growth intelligence tools.
            </p>

            <p style="
              margin:26px 0 0;
              padding-top:20px;
              border-top:1px solid #e3e8ec;
              color:#6b7884;
              font-size:13px;
              line-height:1.7;
            ">
              Questions about plans or billing? Contact
              <a
                href="mailto:info@crawlerque.com"
                style="color:#087f70;"
              >
                info@crawlerque.com
              </a>.
            </p>
          </div>
        </div>
      </div>
    `,
  });
}