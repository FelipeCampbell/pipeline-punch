/**
 * Auth0 Resource Owner Password Grant.
 *
 * Same flow the e2e tests and dashboard email/password login use:
 *   POST https://{domain}/oauth/token  { grant_type: "password", ... }
 */

import { config } from "./config.ts";

interface Auth0TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface Auth0ErrorResponse {
  error: string;
  error_description: string;
}

export async function getAuth0Token(
  email: string,
  password: string,
): Promise<string> {
  const url = `https://${config.auth0.domain}/oauth/token`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "password",
      client_id: config.auth0.clientId,
      username: email,
      password,
      audience: config.api.host,
      scope: "openid profile email",
      connection: config.auth0.connection,
    }),
  });

  if (!res.ok) {
    const err = (await res.json()) as Auth0ErrorResponse;
    throw new Error(
      `Auth0 login failed: ${err.error_description ?? err.error}`,
    );
  }

  const data = (await res.json()) as Auth0TokenResponse;
  return data.access_token;
}
