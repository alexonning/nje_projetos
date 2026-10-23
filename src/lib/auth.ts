import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { pool } from "@/lib/db";

export const ADMIN_ROLE = "Administrador";
export const SESSION_COOKIE = "nexo_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string | null;
  jobTitle: string;
  phone: string;
  accessRole: string;
  status: "Ativo" | "Inativo";
  initials: string;
  color: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailAttemptHash(email: string): string {
  return createHash("sha256").update(normalizeEmail(email)).digest("hex");
}

export function isSameOriginMutation(request: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) return true;

  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim();
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  let requestOrigin = requestUrl.origin;
  if (host) {
    try {
      requestOrigin = new URL(`${forwardedProtocol || requestUrl.protocol.slice(0, -1)}://${host}`).origin;
    } catch {
      return false;
    }
  }

  const origin = request.headers.get("origin");
  if (origin) return origin === requestOrigin;
  const referer = request.headers.get("referer");
  if (!referer) return false;
  try {
    return new URL(referer).origin === requestOrigin;
  } catch {
    return false;
  }
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;

  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.job_title, u.phone, u.access_role, u.status, u.initials, u.color
     FROM nexo.workspace_sessions s
     JOIN nexo.workspace_users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now() AND u.status = 'Ativo'
     LIMIT 1`,
    [hashToken(token)],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    jobTitle: row.job_title,
    phone: row.phone,
    accessRole: row.access_role,
    status: row.status,
    initials: row.initials,
    color: row.color,
  };
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await pool.query("DELETE FROM nexo.workspace_sessions WHERE expires_at <= now()");
  await pool.query(
    "INSERT INTO nexo.workspace_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
    [hashToken(token), userId, expiresAt],
  );
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function revokeCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  try {
    if (token && /^[A-Za-z0-9_-]{40,60}$/.test(token)) {
      await pool.query("DELETE FROM nexo.workspace_sessions WHERE token_hash = $1", [hashToken(token)]);
    }
  } finally {
    cookieStore.delete(SESSION_COOKIE);
  }
}

export async function isLoginLocked(emailHash: string): Promise<boolean> {
  const result = await pool.query(
    "SELECT locked_until > now() AS locked FROM nexo.workspace_auth_attempts WHERE email_hash = $1",
    [emailHash],
  );
  return result.rows[0]?.locked === true;
}

export async function recordLoginFailure(emailHash: string): Promise<boolean> {
  const result = await pool.query(
    `INSERT INTO nexo.workspace_auth_attempts AS attempt_state (email_hash, failed_attempts, window_started_at)
     VALUES ($1, 1, now())
     ON CONFLICT (email_hash) DO UPDATE SET
       failed_attempts = CASE
         WHEN attempt_state.window_started_at < now() - interval '15 minutes' THEN 1
         ELSE attempt_state.failed_attempts + 1
       END,
       window_started_at = CASE
         WHEN attempt_state.window_started_at < now() - interval '15 minutes' THEN now()
         ELSE attempt_state.window_started_at
       END,
       locked_until = CASE
         WHEN (CASE
           WHEN attempt_state.window_started_at < now() - interval '15 minutes' THEN 1
           ELSE attempt_state.failed_attempts + 1
         END) >= 5 THEN now() + interval '15 minutes'
         ELSE NULL
       END,
       updated_at = now()
     RETURNING locked_until > now() AS locked`,
    [emailHash],
  );
  return result.rows[0]?.locked === true;
}

export async function clearLoginFailures(emailHash: string): Promise<void> {
  await pool.query("DELETE FROM nexo.workspace_auth_attempts WHERE email_hash = $1", [emailHash]);
}
