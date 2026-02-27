#!/usr/bin/env bun
/**
 * CLI entry point.
 *
 * Usage:
 *   fintoc login
 *   fintoc logout
 *   fintoc whoami
 *   fintoc <resource> <action> [id] [--flags]
 */

// Load .env from project root before anything else
import "./src/cli/config.ts";

import { login, logout, whoami } from "./src/cli/commands.ts";
import { getSessionToken } from "./src/cli/store.ts";
import { parseCommand } from "./src/parser.ts";
import { dispatch } from "./src/dispatcher.ts";
import { routes } from "./src/routes.ts";

const args = process.argv.slice(2);
const command = args[0];

// ── Help ──────────────────────────────────────────────────────────────────────

function printHelp() {
  // Collect unique resource names
  const resources = [...new Set(Object.keys(routes).map((k) => k.split(".")[0]!))];

  console.log(`
fintoc — Fintoc CLI

  login                        Log in with email and password
  logout                       Log out and expire current session
  whoami                       Show current login status
  <resource> <action> [id]     Run an API command
  <resource> help              Show actions for a resource
  help                         Show this message

Resources:
  ${resources.join(", ")}

Examples:
  fintoc login
  fintoc user show
  fintoc transfers list --mode live --limit 10
  fintoc accounts list --mode live
`);
}

function printResourceHelp(resource: string) {
  const matching = Object.entries(routes).filter(([key]) =>
    key.startsWith(`${resource}.`),
  );

  if (matching.length === 0) {
    console.error(`Unknown resource: "${resource}". Run "fintoc help" for available commands.`);
    process.exit(1);
  }

  console.log(`\n  ${resource}\n`);
  for (const [key, route] of matching) {
    const action = key.split(".")[1]!;
    const cmd = `fintoc ${resource} ${action}`.padEnd(45);
    console.log(`  ${cmd} ${route.description ?? ""}`);
  }
  console.log();
}

// No args or explicit help (strip trailing punctuation like "help!")
const cleanCommand = command?.replace(/[!?]+$/, "");

if (!cleanCommand || cleanCommand === "help" || cleanCommand === "--help" || cleanCommand === "-h") {
  printHelp();
  process.exit(0);
}

// `fintoc <resource> help`
if (args[1] === "help" || args[1] === "--help") {
  printResourceHelp(command);
  process.exit(0);
}

// ── Auth commands ─────────────────────────────────────────────────────────────

if (command === "login") {
  await login();
  process.exit(0);
}

if (command === "logout") {
  await logout();
  process.exit(0);
}

if (command === "whoami") {
  await whoami();
  process.exit(0);
}

// ── API dispatch ──────────────────────────────────────────────────────────────

const token = await getSessionToken();
if (!token) {
  console.error('Not logged in. Run "fintoc login" first.');
  process.exit(1);
}

const commandStr = `fintoc ${args.join(" ")}`;
const parsed = parseCommand(commandStr);
const result = await dispatch(parsed, token);

if (result.success) {
  console.log(result.text);
} else {
  console.error(result.text || result.error);
  process.exit(1);
}
