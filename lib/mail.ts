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