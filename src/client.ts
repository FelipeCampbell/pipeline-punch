/**
 * HTTP client for forwarding requests to the Rails API.
 *
 * Takes the Bearer token from the incoming request and forwards it
 * as a session_token cookie to Rails.
 */

const API_HOST =
  process.env.API_HOST || "http://api.localhost:3000";

export interface ApiRequestOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  token: string;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  responseType?: "json" | "arraybuffer";
}

function buildQueryString(params: Record<string, unknown>): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        parts.push(`${encodeURIComponent(key)}[]=${encodeURIComponent(String(item))}`);
      }
    } else if (typeof value === "object") {
      // For nested objects like metadata, serialize as metadata[key]=value
      for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
        parts.push(
          `${encodeURIComponent(key)}[${encodeURIComponent(subKey)}]=${encodeURIComponent(String(subValue))}`
        );
      }
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }

  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

export async function apiRequest(options: ApiRequestOptions): Promise<{
  status: number;
  data: unknown;
  headers: Record<string, string>;
}> {
  const { method, path, token, query, body, headers: extraHeaders, responseType } = options;

  const url = `${API_HOST}${path}${query ? buildQueryString(query) : ""}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    // Forward the plain session token via custom header
    "X-Session-Token": token,
    ...extraHeaders,
  };

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body && method !== "GET") {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  // Extract response headers we care about
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  let data: unknown;
  if (responseType === "arraybuffer") {
    data = Buffer.from(await response.arrayBuffer()).toString("base64");
  } else {
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return {
    status: response.status,
    data,
    headers: responseHeaders,
  };
}
