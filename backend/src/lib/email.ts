import { createTransport } from "nodemailer";

const EMAIL_USER = process.env.EMAIL_USER || "hkrobin49@gmail.com";
const EMAIL_PASS = process.env.EMAIL_PASS || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "My Life OS <hkrobin49@gmail.com>";

let transporter: ReturnType<typeof createTransport> | null = null;

function getTransporter() {
  if (!transporter && EMAIL_PASS) {
    transporter = createTransport({
      service: "gmail",
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });
  }
  return transporter;
}

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions) {
  const t = getTransporter();
  if (!t) {
    throw new Error("Email not configured. Set EMAIL_PASS env var.");
  }

  const info = await t.sendMail({
    from: EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });

  return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}

export async function sendReminderEmail(to: string, message: string, scheduledAt: string) {
  const t = getTransporter();
  if (!t) return { skipped: true, reason: "email_not_configured" };

  const info = await t.sendMail({
    from: EMAIL_FROM,
    to,
    subject: "My Life OS — Reminder",
    text: `Reminder: ${message}\nScheduled: ${new Date(scheduledAt).toLocaleString()}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
        <h2 style="color: #0f172a; margin: 0 0 12px 0; font-size: 20px;">My Life OS — Reminder</h2>
        <p style="color: #334155; line-height: 1.6; margin: 0 0 16px 0;">${message}</p>
        <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px; font-size: 14px; color: #64748b; margin-bottom: 20px;">
          <strong>Scheduled for:</strong> ${new Date(scheduledAt).toLocaleString()}
        </div>
        <div style="text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}" style="background: #0891b2; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Open My Life OS</a>
        </div>
      </div>
    `,
  });

  return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}

export { EMAIL_USER, EMAIL_FROM };
