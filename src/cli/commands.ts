/**
 * CLI command handlers: login, logout, whoami.
 */

import { getAuth0Token } from "./auth0.ts";
import {
  ensureUser,
  createSession,
  validateSession,
  expireSession,
  activateSession,
  getRawToken,
} from "./session.ts";
import { save, load, clear } from "./store.ts";
import { config } from "./config.ts";

export async function login(): Promise<void> {
  // Check if already logged in with a valid session
  const existing = await load();
  if (existing) {
    const validation = await validateSession(existing.signedToken).catch(
      () => ({ active: false }),
    );
    if (validation.active) {
      console.log(`Already logged in as ${existing.email}`);
      console.log('Run "fintoc logout" first to switch accounts.');
      return;
    }
    console.log("Previous session expired. Logging in again...\n");
  }

  // Prompt for credentials
  const email = globalThis.prompt("Email: ");
  if (!email) {
    console.error("Email is required.");
    process.exit(1);
  }

  const pwd = globalThis.prompt("Password: ");
  if (!pwd) {
    console.error("Password is required.");
    process.exit(1);
  }

  // Step 1: Get JWT from Auth0
  process.stdout.write("Authenticating with Auth0... ");
  let jwt: string;
  try {
    jwt = await getAuth0Token(email, pwd);
    console.log("ok");
  } catch (err) {
    console.log("failed");
    console.error(err instanceof Error ? err.message : "Unknown error");
    process.exit(1);
  }

  // Step 2: Ensure user exists in Rails
  process.stdout.write("Finding user... ");
  try {
    await ensureUser(jwt);
    console.log("ok");
  } catch (err) {
    console.log("failed");
    console.error(err instanceof Error ? err.message : "Unknown error");
    process.exit(1);
  }

  // Step 3: Create dashboard session
  process.stdout.write("Creating session... ");
  let signedToken: string;
  try {
    signedToken = await createSession(jwt);
    console.log("ok");
  } catch (err) {
    console.log("failed");
    console.error(err instanceof Error ? err.message : "Unknown error");
    process.exit(1);
  }

  // Step 4: Check if MFA is needed
  const validation = await validateSession(signedToken);
  if (!validation.active && validation.mfaStatus) {
    console.log(`\nMFA is required (status: ${validation.mfaStatus})`);
    const code = globalThis.prompt("MFA Code: ");
    if (!code) {
      console.error("MFA code is required.");
      process.exit(1);
    }

    process.stdout.write("Activating session... ");
    try {
      await activateSession(signedToken, code);
      console.log("ok");
    } catch (err) {
      console.log("failed");
      console.error(err instanceof Error ? err.message : "Unknown error");
      process.exit(1);
    }
  }

  // Step 5: Get raw token for X-Session-Token header (used by dispatcher)
  const rawToken = await getRawToken(signedToken);

  // Step 6: Persist credentials
  await save({
    signedToken,
    rawToken: rawToken ?? "",
    email,
    apiHost: config.api.host,
    createdAt: new Date().toISOString(),
  });

  console.log(`\nLogged in as ${email}`);
  console.log("Credentials saved to ~/.config/fintoc/auth.json");
}

export async function logout(): Promise<void> {
  const auth = await load();
  if (!auth) {
    console.log("Not logged in.");
    return;
  }

  process.stdout.write("Expiring session... ");
  try {
    await expireSession(auth.signedToken);
    console.log("ok");
  } catch {
    console.log("failed (session may have already expired)");
  }

  clear();
  console.log("Logged out. Credentials removed.");
}

export async function whoami(): Promise<void> {
  const auth = await load();
  if (!auth) {
    console.log('Not logged in. Run "fintoc login".');
    return;
  }

  const validation = await validateSession(auth.signedToken).catch(
    () => ({ active: false }),
  );

  console.log(`Email:   ${auth.email}`);
  console.log(`API:     ${auth.apiHost}`);
  console.log(`Session: ${validation.active ? "active" : "expired"}`);
  console.log(`Since:   ${auth.createdAt}`);
}
