/**
 * Dashboard session management against fintoc-rails.
 *
 * create  -> POST /internal/v1/dashboard/sessions  { jwt }
 * expire  -> POST /internal/v1/dashboard/sessions/expire
 * validate -> POST /internal/v1/dashboard/sessions/validate
 * activate -> POST /internal/v1/dashboard/sessions/activate  { code }
 *
 * The backend returns the session token as a Rails signed cookie.
 * For CLI usage we store the signed cookie value and replay it via
 * the Cookie header on subsequent requests.
 */

import { config } from "./config.ts";

/**
 * Build the Cookie header value from a signed session token.
 */
export function sessionCookieHeader(signedToken: string): string {
  return `session_token=${signedToken}`;
}

/**
 * Ensure the user record exists in Rails.
 * POST /internal/v1/user  { jwt, name, last_name }
 */
export async function ensureUser(jwt: string): Promise<void> {
  const res = await fetch(`${config.api.host}/internal/v1/user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jwt, name: "CLI", last_name: "User" }),
  });

  // 409 = already exists, 500 = may fail for existing users with Sorbet type issues
  // Both are fine — createSession resolves the user from the JWT sub claim
  if (!res.ok && res.status !== 409 && res.status !== 500) {
    const text = await res.text();
    throw new Error(`Failed to create/find user: ${res.status} ${text}`);
  }
}

/**
 * Create a dashboard session.
 * Returns the signed cookie value for session_token.
 */
export async function createSession(jwt: string): Promise<string> {
  const res = await fetch(
    `${config.api.host}/internal/v1/dashboard/sessions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jwt }),
      redirect: "manual",
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create session: ${res.status} ${text}`);
  }

  // Extract signed session_token from Set-Cookie header
  const setCookies = res.headers.getSetCookie?.() ?? [];

  for (const cookie of setCookies) {
    const match = cookie.match(/session_token=([^;]+)/);
    if (match?.[1]) return match[1];
  }

  throw new Error(
    "Session created but could not extract session_token from Set-Cookie header.",
  );
}

/**
 * Expire (logout) the current session.
 */
export async function expireSession(signedToken: string): Promise<void> {
  const res = await fetch(
    `${config.api.host}/internal/v1/dashboard/sessions/expire`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookieHeader(signedToken),
      },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to expire session: ${res.status} ${text}`);
  }
}

/**
 * Validate that the current session is active.
 * Returns { active: true } or { active: false, mfaStatus } for created sessions.
 */
export async function validateSession(
  signedToken: string,
): Promise<{ active: boolean; mfaStatus?: string }> {
  const res = await fetch(
    `${config.api.host}/internal/v1/dashboard/sessions/validate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookieHeader(signedToken),
      },
    },
  );

  if (res.status === 204) return { active: true };

  // 403 with mfa status means session exists but is not activated
  if (res.status === 403) {
    try {
      const body = (await res.json()) as {
        error?: { mfa?: { status?: string } };
      };
      return {
        active: false,
        mfaStatus: body.error?.mfa?.status,
      };
    } catch {
      return { active: false };
    }
  }

  return { active: false };
}

/**
 * Activate a created session with an MFA OTP code.
 */
export async function activateSession(
  signedToken: string,
  code: string,
): Promise<void> {
  const res = await fetch(
    `${config.api.host}/internal/v1/dashboard/sessions/activate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookieHeader(signedToken),
      },
      body: JSON.stringify({ code, should_trust_device: false }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MFA activation failed: ${res.status} ${text}`);
  }
}

/**
 * Get the raw (unsigned) session token from the server.
 * This is the token value that X-Session-Token header expects.
 * Only works with active sessions.
 */
export async function getRawToken(signedToken: string): Promise<string | null> {
  const res = await fetch(
    `${config.api.host}/internal/v1/dashboard/sessions/raw_token`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookieHeader(signedToken),
      },
    },
  );

  if (!res.ok) return null;
  const data = (await res.json()) as { token?: string };
  return data.token ?? null;
}
