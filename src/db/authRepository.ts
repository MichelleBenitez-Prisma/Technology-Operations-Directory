import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { execute, queryOne } from "./database.js";

export type UserRole = "viewer" | "editor" | "admin";

export type AuthUser = {
  id: number;
  email: string;
  display_name: string;
  phone: string | null;
  job_title: string | null;
  profile_image_data: string | null;
  role: UserRole;
};

type StoredUser = AuthUser & {
  password_hash: string;
  password_salt: string;
  active: number;
};

const sessionCookieName = "tod_session";
const rememberedSessionDays = 30;
const sessionOnlyDays = 1;
const allowedEmailDomain = "poweredbyprisma.com";
const localDevelopmentEmail = "local@poweredbyprisma.com";

export { allowedEmailDomain, sessionCookieName };

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

export function ensureLocalDevelopmentUser() {
  const existing = queryOne<AuthUser>(
    `
    SELECT id, email, display_name, phone, job_title, profile_image_data, role
    FROM users
    WHERE email = $email
    `,
    { email: localDevelopmentEmail }
  );

  if (existing) {
    return existing;
  }

  const passwordRecord = hashPassword(randomBytes(16).toString("hex"));

  execute(
    `
    INSERT INTO users (
      email,
      display_name,
      password_hash,
      password_salt,
      phone,
      job_title,
      role
    )
    VALUES (
      $email,
      'Local development',
      $passwordHash,
      $passwordSalt,
      NULL,
      'Technology Operations',
      'admin'
    )
    `,
    {
      email: localDevelopmentEmail,
      passwordHash: passwordRecord.hash,
      passwordSalt: passwordRecord.salt
    }
  );

  return findUserByEmail(localDevelopmentEmail);
}

export function authenticateUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!isAllowedEmail(normalizedEmail)) {
    return undefined;
  }

  const user = queryOne<StoredUser>(
    `
    SELECT id, email, display_name, phone, job_title, profile_image_data, password_hash, password_salt, role, active
    FROM users
    WHERE email = $email
    `,
    { email: normalizedEmail }
  );

  if (!user || user.active !== 1 || !verifyPassword(password, user.password_salt, user.password_hash)) {
    return undefined;
  }

  return toAuthUser(user);
}

export function createUser(input: {
  displayName: string;
  email: string;
  password: string;
  phone?: string | null;
  jobTitle?: string | null;
}) {
  const email = input.email.trim().toLowerCase();

  if (findUserByEmail(email)) {
    return undefined;
  }

  const passwordRecord = hashPassword(input.password);

  execute(
    `
    INSERT INTO users (
      email,
      display_name,
      password_hash,
      password_salt,
      phone,
      job_title,
      role
    )
    VALUES (
      $email,
      $displayName,
      $passwordHash,
      $passwordSalt,
      $phone,
      $jobTitle,
      'viewer'
    )
    `,
    {
      email,
      displayName: input.displayName,
      passwordHash: passwordRecord.hash,
      passwordSalt: passwordRecord.salt,
      phone: input.phone ?? null,
      jobTitle: input.jobTitle ?? null
    }
  );

  return findUserByEmail(email);
}

export function resetUserPassword(email: string, password: string) {
  const user = findUserByEmail(email);

  if (!user) {
    return undefined;
  }

  const passwordRecord = hashPassword(password);

  execute(
    `
    UPDATE users
    SET password_hash = $passwordHash,
        password_salt = $passwordSalt,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $userId
    `,
    {
      userId: user.id,
      passwordHash: passwordRecord.hash,
      passwordSalt: passwordRecord.salt
    }
  );

  return findUserByEmail(email);
}

export function isAllowedEmail(email: string) {
  return email.trim().toLowerCase().endsWith(`@${allowedEmailDomain}`);
}

export function createSession(userId: number, remember = true) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const days = remember ? rememberedSessionDays : sessionOnlyDays;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

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
    SELECT users.id, users.email, users.display_name, users.phone, users.job_title, users.profile_image_data, users.role
    FROM user_sessions
    JOIN users ON users.id = user_sessions.user_id
    WHERE user_sessions.token_hash = $tokenHash
      AND user_sessions.expires_at > CURRENT_TIMESTAMP
      AND users.active = 1
    `,
    { tokenHash: hashToken(token) }
  );
}

export function findUserByEmail(email: string) {
  return queryOne<AuthUser>(
    `
    SELECT id, email, display_name, phone, job_title, profile_image_data, role
    FROM users
    WHERE email = $email
      AND active = 1
    `,
    { email: email.trim().toLowerCase() }
  );
}

export function updateUserProfile(
  userId: number,
  input: {
    displayName: string;
    email: string;
    phone?: string | null;
    jobTitle?: string | null;
    profileImageData?: string | null;
  }
) {
  execute(
    `
    UPDATE users
    SET display_name = $displayName,
        email = $email,
        phone = $phone,
        job_title = $jobTitle,
        profile_image_data = $profileImageData,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $userId
    `,
    {
      userId,
      displayName: input.displayName,
      email: input.email.trim().toLowerCase(),
      phone: input.phone ?? null,
      jobTitle: input.jobTitle ?? null,
      profileImageData: input.profileImageData ?? null
    }
  );

  return findUserByEmail(input.email);
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
    phone: user.phone,
    job_title: user.job_title,
    profile_image_data: user.profile_image_data,
    role: user.role
  };
}
