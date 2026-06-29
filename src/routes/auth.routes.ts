import { Router } from "express";

import {
  authenticateUser,
  allowedEmailDomain,
  createSession,
  deleteSession,
  ensureLocalDevelopmentUser,
  findUserBySessionToken,
  logAuditEvent,
  sessionCookieName,
  updateUserProfile
} from "../db/authRepository.js";
import { authIsRequired, readCookie } from "../middleware/auth.js";

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
  const { email, password } = request.body as { email?: string; password?: string };
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

  const session = createSession(user.id);

  response.cookie(sessionCookieName, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(session.expiresAt)
  });

  response.json({ data: user });
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

function nullableText(value: unknown) {
  const text = String(value ?? "").trim();

  return text ? text : null;
}

function throwValidationError(message: string): never {
  const error = new Error(message);
  error.name = "ValidationError";
  throw error;
}
