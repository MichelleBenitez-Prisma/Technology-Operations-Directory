import { Router } from "express";

import {
  authenticateUser,
  allowedEmailDomain,
  createPasswordResetToken,
  createSession,
  createUser,
  deleteSession,
  ensureLocalDevelopmentUser,
  findUserByEmail,
  findUserBySessionToken,
  listAuditLogEvents,
  logAuditEvent,
  resetPasswordWithToken,
  sessionCookieName,
  updateUserProfile
} from "../db/authRepository.js";
import { authIsRequired, readCookie } from "../middleware/auth.js";
import { sendPasswordResetEmail } from "../services/emailService.js";

export const authRouter = Router();

authRouter.get("/me", (request, response) => {
  if (!authIsRequired()) {
    const user = ensureLocalDevelopmentUser();

    response.json({
      data: user
    });
    return;
  }

  const user = findUserBySessionToken(readCookie(request.headers.cookie, sessionCookieName));

  if (!user) {
    response.status(401).json({
      error: "Unauthorized",
      message: "Please sign in to continue."
    });
    return;
  }

  response.json({ data: user });
});

authRouter.get("/activity", (request, response) => {
  if (authIsRequired() && !findUserBySessionToken(readCookie(request.headers.cookie, sessionCookieName))) {
    response.status(401).json({
      error: "Unauthorized",
      message: "Please sign in to continue."
    });
    return;
  }

  response.json({
    data: JSON.parse(listAuditLogEvents() ?? "[]")
  });
});

authRouter.put("/me/profile", (request, response) => {
  const user = authIsRequired()
    ? findUserBySessionToken(readCookie(request.headers.cookie, sessionCookieName))
    : ensureLocalDevelopmentUser();

  if (!user) {
    response.status(401).json({
      error: "Unauthorized",
      message: "Please sign in to continue."
    });
    return;
  }

  const input = parseProfileInput(request.body as Record<string, unknown>);
  const updatedUser = updateUserProfile(user.id, input);

  logAuditEvent({
    userId: user.id,
    action: "update_profile",
    entityType: "users",
    entityId: String(user.id),
    method: request.method,
    path: request.originalUrl,
    statusCode: 200,
    requestId: response.locals.requestId as string | undefined
  });

  response.json({ data: updatedUser });
});

authRouter.post("/login", (request, response) => {
  const { email, password, remember } = request.body as {
    email?: string;
    password?: string;
    remember?: boolean;
  };
  const user = email && password ? authenticateUser(email, password) : undefined;
  const domainIsAllowed = email?.trim().toLowerCase().endsWith(`@${allowedEmailDomain}`) ?? false;

  logAuditEvent({
    userId: user?.id,
    action: user ? "login_success" : "login_failure",
    entityType: "auth",
    method: request.method,
    path: request.originalUrl,
    statusCode: user ? 200 : 401,
    requestId: response.locals.requestId as string | undefined
  });

  if (!user) {
    response.status(401).json({
      error: "Unauthorized",
      message: domainIsAllowed
        ? "Email or password is incorrect."
        : `Use your @${allowedEmailDomain} email address to sign in.`
    });
    return;
  }

  const session = createSession(user.id, remember !== false);

  response.cookie(sessionCookieName, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(session.expiresAt)
  });

  response.json({ data: user });
});

authRouter.post("/signup", (request, response) => {
  const input = parseSignupInput(request.body as Record<string, unknown>);
  const user = createUser(input);

  if (!user) {
    response.status(400).json({
      error: "Validation Error",
      message: "A user with this email already exists."
    });
    return;
  }

  logAuditEvent({
    userId: user.id,
    action: "signup",
    entityType: "users",
    entityId: String(user.id),
    method: request.method,
    path: request.originalUrl,
    statusCode: 201,
    requestId: response.locals.requestId as string | undefined
  });

  response.status(201).json({ data: user });
});

authRouter.post("/forgot-password", async (request, response, next) => {
  try {
  const email = String((request.body as { email?: unknown }).email ?? "").trim().toLowerCase();

  if (!email || !email.endsWith(`@${allowedEmailDomain}`)) {
    throwValidationError(`Use your @${allowedEmailDomain} email address.`);
  }

  const user = findUserByEmail(email);
  let emailSent = false;

  if (user) {
    const resetToken = createPasswordResetToken(user.id);
    const resetUrl = buildResetUrl(resetToken.token);
    emailSent = await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
      expiresAt: resetToken.expiresAt
    });
  }

  logAuditEvent({
    userId: user?.id,
    action: emailSent ? "password_reset_email_sent" : "password_reset_requested",
    entityType: "users",
    entityId: user ? String(user.id) : undefined,
    method: request.method,
    path: request.originalUrl,
    statusCode: 200,
    requestId: response.locals.requestId as string | undefined
  });

  response.json({
    data: {
      message: "If this account exists, a password reset email has been sent."
    }
  });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/reset-password", (request, response) => {
  const input = parseResetPasswordInput(request.body as Record<string, unknown>);
  const user = resetPasswordWithToken(input.token, input.password);

  if (!user) {
    response.status(400).json({
      error: "Validation Error",
      message: "Password reset link is invalid or expired."
    });
    return;
  }

  logAuditEvent({
    userId: user.id,
    action: "password_reset_completed",
    entityType: "users",
    entityId: String(user.id),
    method: request.method,
    path: request.originalUrl,
    statusCode: 200,
    requestId: response.locals.requestId as string | undefined
  });

  response.json({
    data: {
      message: "Password updated. You can log in with your new password."
    }
  });
});

authRouter.post("/logout", (request, response) => {
  deleteSession(readCookie(request.headers.cookie, sessionCookieName));
  response.clearCookie(sessionCookieName);
  response.status(204).send();
});

function parseProfileInput(body: Record<string, unknown>) {
  const displayName = String(body.displayName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = nullableText(body.phone);
  const jobTitle = nullableText(body.jobTitle);
  const profileImageData = nullableText(body.profileImageData);

  if (!displayName) {
    throwValidationError("Full name is required.");
  }

  if (!email || !email.endsWith(`@${allowedEmailDomain}`)) {
    throwValidationError(`Use your @${allowedEmailDomain} email address.`);
  }

  if (profileImageData && !profileImageData.startsWith("data:image/")) {
    throwValidationError("Profile picture must be an image file.");
  }

  if (profileImageData && profileImageData.length > 250_000) {
    throwValidationError("Profile picture must be smaller than 250 KB.");
  }

  return {
    displayName,
    email,
    phone,
    jobTitle,
    profileImageData
  };
}

function parseSignupInput(body: Record<string, unknown>) {
  const displayName = String(body.displayName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const phone = nullableText(body.phone);
  const jobTitle = nullableText(body.jobTitle);

  if (!displayName) {
    throwValidationError("Full name is required.");
  }

  if (!email || !email.endsWith(`@${allowedEmailDomain}`)) {
    throwValidationError(`Use your @${allowedEmailDomain} email address.`);
  }

  if (password.length < 8) {
    throwValidationError("Password must be at least 8 characters.");
  }

  return { displayName, email, password, phone, jobTitle };
}

function parseResetPasswordInput(body: Record<string, unknown>) {
  const token = String(body.token ?? "").trim();
  const password = String(body.password ?? "");

  if (!token || token.length < 32) {
    throwValidationError("Password reset link is invalid or expired.");
  }

  if (password.length < 8) {
    throwValidationError("Password must be at least 8 characters.");
  }

  return { token, password };
}

function buildResetUrl(token: string) {
  const baseUrl = process.env.APP_BASE_URL?.trim() || "http://127.0.0.1:3001";
  return `${baseUrl.replace(/\/$/, "")}/#/reset-password?token=${encodeURIComponent(token)}`;
}

function nullableText(value: unknown) {
  const text = String(value ?? "").trim();

  return text ? text : null;
}

function throwValidationError(message: string): never {
  const error = new Error(message);
  error.name = "ValidationError";
  throw error;
}
