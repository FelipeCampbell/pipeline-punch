/**
 * Persists and reads auth credentials from ~/.config/fintoc/auth.json.
 *
 * Stores two tokens:
 * - signedToken: Rails signed cookie value (for Cookie header)
 * - rawToken: plain session token (for X-Session-Token header, used by dispatcher)
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, existsSync, unlinkSync } from "node:fs";

const CONFIG_DIR = join(homedir(), ".config", "fintoc");
const AUTH_FILE = join(CONFIG_DIR, "auth.json");

export interface AuthData {
  signedToken: string;
  rawToken: string;
  email: string;
  apiHost: string;
  createdAt: string;
}

function ensureDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export async function save(data: AuthData): Promise<void> {
  ensureDir();
  await Bun.write(AUTH_FILE, JSON.stringify(data, null, 2));
}

export async function load(): Promise<AuthData | null> {
  const file = Bun.file(AUTH_FILE);
  if (!(await file.exists())) return null;
  try {
    return (await file.json()) as AuthData;
  } catch {
    return null;
  }
}

export function clear(): void {
  if (existsSync(AUTH_FILE)) {
    unlinkSync(AUTH_FILE);
  }
}

/**
 * Get the raw session token for X-Session-Token header (used by dispatcher/client).
 */
export async function getSessionToken(): Promise<string | null> {
  const data = await load();
  return data?.rawToken || null;
}
