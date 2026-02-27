/**
 * Command parser for CLI strings.
 *
 * Parses strings like:
 *   "fintoc transfers list --mode live --limit 10"
 *   "fintoc transfers show abc123 --mode live"
 *   "fintoc transfer-intents create --counterparty.name Foo --counterparty.account_number 123"
 */

export interface ParsedCommand {
  resource: string;
  action: string;
  id?: string;
  flags: Record<string, unknown>;
}

/**
 * Expand dot-notation keys into nested objects.
 * { "counterparty.name": "Foo", "counterparty.account_number": "123" }
 * becomes
 * { counterparty: { name: "Foo", account_number: "123" } }
 */
function expandDotNotation(flat: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".");
    let current: Record<string, unknown> = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      if (
        !(part in current) ||
        typeof current[part] !== "object" ||
        current[part] === null
      ) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    const lastPart = parts[parts.length - 1]!;

    // Try to parse JSON values for arrays/objects
    let parsed: unknown = value;
    if (value.startsWith("[") || value.startsWith("{")) {
      try {
        parsed = JSON.parse(value);
      } catch {
        // keep as string
      }
    }
    // Try to parse numbers
    else if (/^\d+$/.test(value)) {
      parsed = Number(value);
    }

    current[lastPart] = parsed;
  }

  return result;
}

/**
 * Tokenize a command string, respecting quoted strings.
 */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuote: string | null = null;

  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;

    if (inQuote) {
      if (char === inQuote) {
        inQuote = null;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = char;
    } else if (char === " " || char === "\t") {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

export function parseCommand(command: string): ParsedCommand {
  const tokens = tokenize(command.trim());

  // Skip the leading "fintoc" if present
  let startIndex = 0;
  if (tokens[0]?.toLowerCase() === "fintoc") {
    startIndex = 1;
  }

  const resource = tokens[startIndex] || "";
  const action = tokens[startIndex + 1] || "";

  // Parse flags and positional args
  let id: string | undefined;
  const flatFlags: Record<string, string> = {};

  let i = startIndex + 2;
  while (i < tokens.length) {
    const token = tokens[i]!;

    if (token.startsWith("--")) {
      const flagName = token.slice(2);

      // Check if next token is a value (not another flag)
      if (i + 1 < tokens.length && !tokens[i + 1]!.startsWith("--")) {
        flatFlags[flagName] = tokens[i + 1]!;
        i += 2;
      } else {
        // Boolean flag
        flatFlags[flagName] = "true";
        i += 1;
      }
    } else {
      // Positional argument — treat as ID
      if (!id) {
        id = token;
      }
      i += 1;
    }
  }

  const flags = expandDotNotation(flatFlags);

  return { resource, action, id, flags };
}
