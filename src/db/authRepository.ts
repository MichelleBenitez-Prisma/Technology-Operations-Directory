import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { execute, queryOne } from "./database.js";

export type UserRole = "viewer" | "editor" | "admin";
export type EditableUserRole = "editor" | "admin";
export type UserPermission =
  | "view_dashboard"
  | "view_reports"
  | "edit_records"
  | "archive_records"
  | "delete_records"
  | "manage_server_settings"
  | "manage_users"
  | "manage_dashboard_access"
  | "manage_alerts"
  | "manage_plugins"
  | "manage_teams"
  | "manage_playlists"
  | "manage_directory_resources";

export type AuthUser = {
  id: number;
  email: string;
  display_name: string;
  phone: string | null;
  job_title: string | null;
  profile_image_data: string | null;
  role: UserRole;
  permissions: UserPermission[];
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
    return withPermissions(existing);
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

  const user = queryOne<Omit<AuthUser, "permissions">>(
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

  return user ? withPermissions(user) : undefined;
}

export function findUserByEmail(email: string) {
  const user = queryOne<Omit<AuthUser, "permissions">>(
    `
    SELECT id, email, display_name, phone, job_title, profile_image_data, role
    FROM users
    WHERE email = $email
      AND active = 1
    `,
    { email: email.trim().toLowerCase() }
  );

  return user ? withPermissions(user) : undefined;
}

export function listUsersForAccessReview() {
  const data = queryOne<{ data: string }>(
    `
    SELECT json_group_array(json_object(
      'id', id,
      'email', email,
      'display_name', display_name,
      'phone', phone,
      'job_title', job_title,
      'profile_image_data', profile_image_data,
      'role', role
    )) AS data
    FROM (
      SELECT id, email, display_name, phone, job_title, profile_image_data, role
      FROM users
      WHERE active = 1
      ORDER BY display_name COLLATE NOCASE, email COLLATE NOCASE
    )
    `
  )?.data;

  return (JSON.parse(data ?? "[]") as Array<Omit<AuthUser, "permissions">>).map(withPermissions);
}

export function updateUserRole(userId: number, role: EditableUserRole) {
  execute(
    `
    UPDATE users
    SET role = $role,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $userId
      AND active = 1
    `,
    { userId, role }
  );

  const user = queryOne<Omit<AuthUser, "permissions">>(
    `
    SELECT id, email, display_name, phone, job_title, profile_image_data, role
    FROM users
    WHERE id = $userId
      AND active = 1
    `,
    { userId }
  );

  return user ? withPermissions(user) : undefined;
}

export function removeEditorUser(userId: number) {
  const user = queryOne<Omit<AuthUser, "permissions">>(
    `
    SELECT id, email, display_name, phone, job_title, profile_image_data, role
    FROM users
    WHERE id = $userId
      AND active = 1
    `,
    { userId }
  );

  if (!user || user.role !== "editor") {
    return undefined;
  }

  execute(
    `
    UPDATE users
    SET active = 0,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $userId
    `,
    { userId }
  );

  execute("DELETE FROM user_sessions WHERE user_id = $userId", { userId });

  return withPermissions(user);
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

export function createPasswordResetToken(userId: number) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  execute(
    `
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES ($userId, $tokenHash, $expiresAt)
    `,
    { userId, tokenHash, expiresAt }
  );

  return { token, expiresAt };
}

export function resetPasswordWithToken(token: string, password: string) {
  const tokenHash = hashToken(token);
  const resetRecord = queryOne<{ id: number; user_id: number }>(
    `
    SELECT id, user_id
    FROM password_reset_tokens
    WHERE token_hash = $tokenHash
      AND used_at IS NULL
      AND expires_at > CURRENT_TIMESTAMP
    `,
    { tokenHash }
  );

  if (!resetRecord) {
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
      userId: resetRecord.user_id,
      passwordHash: passwordRecord.hash,
      passwordSalt: passwordRecord.salt
    }
  );

  execute(
    `
    UPDATE password_reset_tokens
    SET used_at = CURRENT_TIMESTAMP
    WHERE id = $id
    `,
    { id: resetRecord.id }
  );

  return findUserByEmail(
    queryOne<{ email: string }>("SELECT email FROM users WHERE id = $userId", {
      userId: resetRecord.user_id
    })?.email ?? ""
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
  changeSummary?: string;
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
      request_id,
      change_summary
    )
    VALUES (
      $userId,
      $action,
      $entityType,
      $entityId,
      $method,
      $path,
      $statusCode,
      $requestId,
      $changeSummary
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
      requestId: input.requestId ?? null,
      changeSummary: input.changeSummary ?? null
    }
  );
}

export function listAuditLogEvents(limit = 100) {
  return queryOne<{ data: string }>(
    `
    SELECT json_group_array(json_object(
      'id', id,
      'action', action,
      'entity_type', entity_type,
      'entity_id', entity_id,
      'method', method,
      'path', path,
      'status_code', status_code,
      'request_id', request_id,
      'change_summary', change_summary,
      'created_at', created_at,
      'user_display_name', user_display_name,
      'user_email', user_email
    )) AS data
    FROM (
      SELECT audit_logs.*, users.display_name AS user_display_name, users.email AS user_email
      FROM audit_logs
      LEFT JOIN users ON users.id = audit_logs.user_id
      ORDER BY audit_logs.created_at DESC, audit_logs.id DESC
      LIMIT $limit
    )
    `,
    { limit }
  )?.data;
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
  return withPermissions({
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    phone: user.phone,
    job_title: user.job_title,
    profile_image_data: user.profile_image_data,
    role: user.role
  });
}

function withPermissions(user: Omit<AuthUser, "permissions">): AuthUser {
  return {
    ...user,
    permissions: permissionsForRole(user.role)
  };
}

export function permissionsForRole(role: UserRole): UserPermission[] {
  if (role === "admin") {
    return [
      "view_dashboard",
      "view_reports",
      "edit_records",
      "archive_records",
      "delete_records",
      "manage_server_settings",
      "manage_users",
      "manage_dashboard_access",
      "manage_alerts",
      "manage_plugins",
      "manage_teams",
      "manage_playlists",
      "manage_directory_resources"
    ];
  }

  if (role === "editor") {
    return [
      "view_dashboard",
      "view_reports",
      "edit_records",
      "archive_records",
      "manage_dashboard_access",
      "manage_alerts",
      "manage_plugins",
      "manage_teams",
      "manage_playlists",
      "manage_directory_resources"
    ];
  }

  return ["view_dashboard", "view_reports"];
}
