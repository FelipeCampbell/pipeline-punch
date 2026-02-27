/**
 * Dispatcher: takes a parsed command + token, resolves the route,
 * and makes the API call.
 */

import type { ParsedCommand } from "./parser.ts";
import { routes, routeKey, getAvailableCommands, getGroupedCommands, renderHelpText, renderResourceHelpText } from "./routes.ts";
import { apiRequest } from "./client.ts";
import type { RouteDefinition } from "./routes.ts";

export interface DispatchResult {
  success: boolean;
  status?: number;
  data?: unknown;
  text?: string;
  error?: string;
  headers?: Record<string, string>;
}

/**
 * Separate flags into query params and body based on route definition and HTTP method.
 */
function splitFlags(
  flags: Record<string, unknown>,
  route: RouteDefinition
): { query: Record<string, unknown>; body: Record<string, unknown> } {
  // If flagsIn is explicitly set, all flags go there
  if (route.flagsIn === "query") {
    return { query: flags, body: {} };
  }
  if (route.flagsIn === "body") {
    return { query: {}, body: flags };
  }

  // If queryFlags is specified, those go in query, rest in body
  if (route.queryFlags && route.queryFlags.length > 0) {
    const query: Record<string, unknown> = {};
    const body: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(flags)) {
      if (route.queryFlags.includes(key)) {
        query[key] = value;
      } else {
        body[key] = value;
      }
    }
    return { query, body };
  }

  // Default: GET/DELETE -> query, POST/PUT/PATCH -> body
  if (route.method === "GET" || route.method === "DELETE") {
    return { query: flags, body: {} };
  }
  return { query: {}, body: flags };
}

/**
 * Replace :id in path template with the actual ID value.
 */
function resolvePath(pathTemplate: string, id?: string): string {
  if (!pathTemplate.includes(":id")) return pathTemplate;

  if (!id) {
    throw new Error(
      `This command requires an ID argument. Usage: fintoc <resource> <action> <id> [--flags]`
    );
  }

  return pathTemplate.replace(":id", encodeURIComponent(id));
}

/**
 * Format any data as CLI-friendly text output.
 */
function formatAsText(data: unknown): string {
  if (data === undefined || data === null) return "";
  if (typeof data === "string") return data;
  return JSON.stringify(data, null, 2);
}

export async function dispatch(
  command: ParsedCommand,
  token: string
): Promise<DispatchResult> {
  // Handle help command (matches: "help", "help!", "", or any resource with action "help")
  const normalizedResource = command.resource.replace(/[!?]+$/, "");
  if (
    normalizedResource === "help" ||
    normalizedResource === "" ||
    command.action === "help"
  ) {
    const grouped = getGroupedCommands();

    // If asking for help on a specific resource (e.g. "fintoc transfers help")
    if (normalizedResource !== "help" && normalizedResource !== "" && command.action === "help") {
      const resourceCommands = grouped[normalizedResource];
      if (resourceCommands) {
        const text = renderResourceHelpText(normalizedResource, resourceCommands);
        return { success: true, text, data: text };
      }
      const errMsg = `Unknown resource: "${normalizedResource}". Run "fintoc help" for all available commands.`;
      return { success: false, error: errMsg, text: errMsg };
    }

    const text = renderHelpText();
    return { success: true, text, data: text };
  }

  const key = routeKey(command.resource, command.action);
  const route = routes[key];

  if (!route) {
    const errMsg = `Unknown command: "${command.resource} ${command.action}". Run "fintoc help" for available commands.`;
    return {
      success: false,
      error: errMsg,
      text: errMsg,
    };
  }

  try {
    // Apply defaults for common flags when not explicitly provided
    const description = route.description ?? "";
    if (!command.flags.mode && description.includes("--mode")) {
      command.flags.mode = "test";
    }
    if (!command.flags.limit && description.includes("--limit")) {
      command.flags.limit = 10;
    }

    const path = resolvePath(route.path, command.id);
    const { query, body } = splitFlags(command.flags, route);

    // Extract current_organization_id from flags and add to query if present
    // (Rails injects this on every request via interceptor in the dashboard)
    if (command.flags.current_organization_id) {
      query.current_organization_id = command.flags.current_organization_id;
      delete body.current_organization_id;
    }

    const result = await apiRequest({
      method: route.method,
      path,
      token,
      query: Object.keys(query).length > 0 ? query : undefined,
      body: Object.keys(body).length > 0 ? body : undefined,
      responseType: route.responseType,
    });

    const success = result.status >= 200 && result.status < 300;
    return {
      success,
      status: result.status,
      data: result.data,
      text: formatAsText(result.data),
      headers: result.headers,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      success: false,
      error: message,
      text: `Error: ${message}`,
    };
  }
}
