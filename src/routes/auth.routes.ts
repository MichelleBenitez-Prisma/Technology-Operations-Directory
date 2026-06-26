import { Router } from "express";

import {
  authenticateUser,
  createSession,
  deleteSession,
  findUserBySessionToken,
  logAuditEvent,
  sessionCookieName
} from "../db/authRepository.js";
import { authIsRequired, readCookie } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.get("/me", (request, response) => {
  if (!authIsRequired()) {
    response.json({
      data: {
        id: 0,
        email: "local@example.com",
        display_name: "Local development",
        role: "admin"
      }
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

authRouter.post("/login", (request, response) => {
  const { email, password } = request.body as { email?: string; password?: string };
  const user = email && password ? authenticateUser(email, password) : undefined;

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
      message: "Email or password is incorrect."
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
