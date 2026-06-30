import nodemailer from "nodemailer";

type PasswordResetEmailInput = {
  to: string;
  resetUrl: string;
  expiresAt: string;
};

export async function sendPasswordResetEmail(input: PasswordResetEmailInput) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM ?? "Technology Operations Directory <no-reply@poweredbyprisma.com>";

  if (!host || !user || !pass) {
    console.warn("Password reset email not sent because SMTP is not configured.");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });

  await transporter.sendMail({
    from,
    to: input.to,
    subject: "Technology Operations Directory password reset",
    text: [
      "A password reset was requested for your Technology Operations Directory account.",
      "",
      "Open this link to set a new password:",
      input.resetUrl,
      "",
      `This link expires at ${input.expiresAt}.`,
      "If you did not request this reset, ignore this email."
    ].join("\n")
  });

  return true;
}
