import { randomUUID } from "node:crypto";

import type { RequestHandler } from "express";

import {
  findUserBySessionToken,
  logAuditEvent,
  sessionCookieName,
  type AuthUser
} from "../db/authRepository.js";

const roleRank = {
  viewer: 1,
  editor: 2,
  admin: 3
} as const;

export function authIsRequired() {
  return process.env.AUTH_REQUIRED === "true" && process.env.NODE_ENV !== "test";
}

export const requestContext: RequestHandler = (request, response, next) => {
  response.locals.requestId = randomUUID();
  response.setHeader("X-Request-Id", response.locals.requestId);
  next();
};

export const requireAuth: RequestHandler = (request, response, next) => {
  if (!authIsRequired()) {
    next();
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

  response.locals.authUser = user;
  next();
};

export const requireApiRole: RequestHandler = (request, response, next) => {
  if (!authIsRequired() || request.method === "GET" || request.method === "HEAD") {
    next();
    return;
  }

  const user = response.locals.authUser as AuthUser | undefined;
  const requiredRole = request.method === "DELETE" ? "admin" : "editor";

  if (!user || roleRank[user.role] < roleRank[requiredRole]) {
    response.status(403).json({
      error: "Forbidden",
      message: `${requiredRole} access is required for this action.`
    });
    return;
  }

  next();
};

export const auditMutations: RequestHandler = (request, response, next) => {
  response.on("finish", () => {
    if (!authIsRequired() || !["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
      return;
    }

    if (request.path.startsWith("/auth")) {
      return;
    }

    if (response.statusCode < 200 || response.statusCode >= 400) {
      return;
    }

    const user = response.locals.authUser as AuthUser | undefined;

    logAuditEvent({
      userId: user?.id,
      action: actionForMethod(request.method),
      entityType: entityTypeFromPath(request.path),
      entityId: typeof request.params.id === "string" ? request.params.id : undefined,
      method: request.method,
      path: request.originalUrl,
      statusCode: response.statusCode,
      requestId: response.locals.requestId as string | undefined
    });
  });

  next();
};

export function readCookie(header: string | undefined, name: string) {
  return header
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function actionForMethod(method: string) {
  if (method === "POST") {
    return "create_or_archive";
  }

  if (method === "DELETE") {
    return "delete";
  }

  return "update";
}

function entityTypeFromPath(path: string) {
  return path.split("/").filter(Boolean)[0] ?? "unknown";
}
