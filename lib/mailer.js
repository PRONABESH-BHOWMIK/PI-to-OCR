// lib/mailer.js
// Send transactional emails via Gmail SMTP using an App Password.
//
// Configure in the environment:
//   GMAIL_SMTP_USER  - the Gmail account address (e.g. bd.achilles@gmail.com)
//   GMAIL_SMTP_PASS  - 16-character App Password
//                       (Google account → Security → 2-Step Verification →
//                        App passwords → create one)
//   MAIL_FROM        - sender address shown on the email (defaults to
//                       GMAIL_SMTP_USER)
//
// Gmail allows ~500 sends/day over SMTP - ample for weekly checklist reminders.
// When the credentials are not set, sends are skipped with a warning so the app
// keeps working (reminders just won't send until they are configured).
import nodemailer from 'nodemailer';

const smtpUser = () => process.env.GMAIL_SMTP_USER || '';
const smtpPass = () => process.env.GMAIL_SMTP_PASS || '';
const fromAddress = () => process.env.MAIL_FROM || smtpUser();

export function mailConfigured() {
  return Boolean(smtpUser() && smtpPass());
}

let transporter;
function getTransporter() {
  if (!mailConfigured()) return null;
  transporter = transporter || nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS on 587
    auth: { user: smtpUser(), pass: smtpPass() },
  });
  return transporter;
}

/**
 * Send one email. Returns { sent, skipped?, error?, id? }.
 * Never throws: failures are reported in the result so the cron keeps running.
 */
export async function sendEmail({ to, subject, text, html }) {
  if (!mailConfigured()) {
    console.warn('[mailer] GMAIL_SMTP_USER / GMAIL_SMTP_PASS not set - email skipped');
    return { sent: false, skipped: true };
  }

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (recipients.length === 0) {
    return { sent: false, skipped: true, error: 'no recipients' };
  }

  try {
    const info = await getTransporter().sendMail({
      from: fromAddress(),
      to: recipients,
      subject,
      text,
      html,
    });
    return { sent: true, id: info.messageId };
  } catch (error) {
    console.error('[mailer] send failed:', error.message);
    return { sent: false, error: error.message };
  }
}
