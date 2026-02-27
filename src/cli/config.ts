/**
 * CLI configuration.
 *
 * Bun auto-loads .env from cwd, but the CLI may be invoked from
 * anywhere via an alias. We explicitly load the .env from the
 * project root (where cli.ts lives) to guarantee env vars are present.
 */

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Resolve the project root: this file is at src/cli/config.ts → ../../
const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const envPath = join(PROJECT_ROOT, ".env");

// Bun.file().text() is sync-capable but let's just use dotenv-style:
// Bun supports loading .env explicitly via its API or we parse it ourselves.
const envFile = Bun.file(envPath);
if (await envFile.exists()) {
  const text = await envFile.text();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    // Only set if not already in env (don't override explicit env vars)
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// Auth0 custom domain: Rails expects JWT issuer to be https://auth.fintoc.com/
// The raw tenant domain fintoc.us.auth0.com produces a different issuer,
// so we always use the custom domain for the CLI token requests.
const auth0Domain = process.env.AUTH0_DOMAIN ?? "auth.fintoc.com";
const resolvedAuth0Domain =
  auth0Domain === "fintoc.us.auth0.com" ? "auth.fintoc.com" : auth0Domain;

export const config = {
  auth0: {
    domain: resolvedAuth0Domain,
    clientId: process.env.AUTH0_CLIENT_ID ?? "",
    connection: process.env.AUTH0_CONNECTION ?? "username-password-local",
  },
  api: {
    host: process.env.API_HOST ?? "http://api.localhost:3000",
  },
} as const;
