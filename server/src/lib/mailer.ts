import nodemailer from "nodemailer";

const DEFAULT_FROM = "StockSense <no-reply@stocksense.local>";
const DEFAULT_SMTP_PORT = 587;

function logToConsole(msg: { to: string; subject: string; text: string }): void {
  console.log(
    [
      "",
      "==================== EMAIL (StockSense) ====================",
      `To:      ${msg.to}`,
      `Subject: ${msg.subject}`,
      "",
      msg.text,
      "============================================================",
      "",
    ].join("\n"),
  );
}

export async function sendMail(msg: { to: string; subject: string; text: string }): Promise<void> {
  logToConsole(msg);

  const host = process.env.SMTP_HOST;
  if (!host) return;

  try {
    const port = Number(process.env.SMTP_PORT) || DEFAULT_SMTP_PORT;
    const user = process.env.SMTP_USER;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass: process.env.SMTP_PASS ?? "" } : undefined,
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || DEFAULT_FROM,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
    });
  } catch (err) {
    console.warn(`[mailer] Could not send email to ${msg.to}:`, err instanceof Error ? err.message : err);
  }
}
