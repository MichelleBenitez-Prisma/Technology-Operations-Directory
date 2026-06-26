import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { execute, queryOne } from "./database.js";

export type UserRole = "viewer" | "editor" | "admin";

export type AuthUser = {
  id: number;
  email: string;
  display_name: string;
  role: UserRole;
};

type StoredUser = AuthUser & {
  password_hash: string;
  password_salt: string;
  active: number;
};

const sessionCookieName = "tod_session";
const sessionDays = 7;

export { sessionCookieName };

export function ensureInitialAdmin() {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!email || !password) {
    return;
  }

  const existing = queryOne<{ id: number }>("SELECT id FROM users WHERE email = $email", {
    email
  });

  if (existing) {
    return;
  }

  const passwordRecord = hashPassword(password);

  execute(
    `
    INSERT INTO users (email, display_name, password_hash, password_salt, role)
    VALUES ($email, $displayName, $passwordHash, $passwordSalt, 'admin')
    `,
    {
      email,
      displayName: email,
      passwordHash: passwordRecord.hash,
      passwordSalt: passwordRecord.salt
    }
  );
}

export function authenticateUser(email: string, password: string) {
  const user = queryOne<StoredUser>(
    `
    SELECT id, email, display_name, password_hash, password_salt, role, active
    FROM users
    WHERE email = $email
    `,
    { email: email.trim().toLowerCase() }
  );

  if (!user || user.active !== 1 || !verifyPassword(password, user.password_salt, user.password_hash)) {
    return undefined;
  }

  return toAuthUser(user);
}

export function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000).toISOString();

  execute(
    `
    INSERT INTO user_sessions (user_id, token_hash, expires_at)
    VALUES ($userId, $tokenHash, $expiresAt)
    `,
    { userId, tokenHash, expiresAt }
  );

  return { token, expiresAt };
}

export function findUserBySessionToken(token: string | undefined) {
  if (!token) {
    return undefined;
  }

  return queryOne<AuthUser>(
    `
    SELECT users.id, users.email, users.display_name, users.role
    FROM user_sessions
    JOIN users ON users.id = user_sessions.user_id
    WHERE user_sessions.token_hash = $tokenHash
      AND user_sessions.expires_at > CURRENT_TIMESTAMP
      AND users.active = 1
    `,
    { tokenHash: hashToken(token) }
  );
}

export function deleteSession(token: string | undefined) {
  if (!token) {
    return;
  }

  execute("DELETE FROM user_sessions WHERE token_hash = $tokenHash", {
    tokenHash: hashToken(token)
  });
}

export function logAuditEvent(input: {
  userId?: number;
  action: string;
  entityType: string;
  entityId?: string;
  method: string;
  path: string;
  statusCode: number;
  requestId?: string;
}) {
  execute(
    `
    INSERT INTO audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      method,
      path,
      status_code,
      request_id
    )
    VALUES (
      $userId,
      $action,
      $entityType,
      $entityId,
      $method,
      $path,
      $statusCode,
      $requestId
    )
    `,
    {
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      method: input.method,
      path: input.path,
      statusCode: input.statusCode,
      requestId: input.requestId ?? null
    }
  );
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");

  return {
    salt,
    hash: scryptSync(password, salt, 64).toString("hex")
  };
}

function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actual = Buffer.from(scryptSync(password, salt, 64).toString("hex"), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function toAuthUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    role: user.role
  };
}
