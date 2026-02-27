import { streamAgent } from "./openai";
import { parseCommand } from "./src/parser.ts";
import { dispatch } from "./src/dispatcher.ts";
import { getAuth0Token } from "./src/cli/auth0.ts";
import {
  ensureUser,
  createSession,
  validateSession,
  activateSession,
  getRawToken,
} from "./src/cli/session.ts";

const PORT = Number(process.env.PORT) || 4000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function withCors(response: Response): Response {
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

Bun.serve({
  port: PORT,
  routes: {
    "/cli": {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async (req) => {
        // Extract Bearer token from Authorization header
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return withCors(
            Response.json(
              { error: "Missing or invalid Authorization header. Expected: Bearer <token>" },
              { status: 401 }
            )
          );
        }
        const token = authHeader.slice(7);

        // Parse the command from the request body
        let command: string;
        try {
          const body = await req.json();
          command = (body as { command: string }).command;
        } catch {
          return withCors(
            Response.json(
              { error: 'Invalid JSON body. Expected: { "command": "fintoc <resource> <action> [--flags]" }' },
              { status: 400 }
            )
          );
        }

        if (!command || typeof command !== "string") {
          return withCors(
            Response.json(
              { error: 'Missing "command" field. Expected: { "command": "fintoc <resource> <action> [--flags]" }' },
              { status: 400 }
            )
          );
        }

        // Parse and dispatch the command
        const parsed = parseCommand(command);
        const result = await dispatch(parsed, token);

        const status = result.status || (result.success ? 200 : 400);
        return withCors(Response.json({ output: result.text }, { status }));
      },
    },
    "/login": {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async (req) => {
        let body: { email?: string; password?: string; mfa_code?: string };
        try {
          body = (await req.json()) as typeof body;
        } catch {
          return withCors(
            Response.json(
              { error: 'Invalid JSON body. Expected: { "email": "...", "password": "..." }' },
              { status: 400 }
            )
          );
        }

        const { email, password, mfa_code } = body;
        if (!email || !password) {
          return withCors(
            Response.json(
              { error: 'Missing "email" or "password" field' },
              { status: 400 }
            )
          );
        }

        // Step 1: Auth0 token
        let jwt: string;
        try {
          jwt = await getAuth0Token(email, password);
        } catch (err) {
          return withCors(
            Response.json(
              { error: err instanceof Error ? err.message : "Auth0 authentication failed" },
              { status: 401 }
            )
          );
        }

        // Step 2: Ensure user exists
        try {
          await ensureUser(jwt);
        } catch {
          // Non-fatal — user may already exist
        }

        // Step 3: Create session
        let signedToken: string;
        try {
          signedToken = await createSession(jwt);
        } catch (err) {
          return withCors(
            Response.json(
              { error: err instanceof Error ? err.message : "Session creation failed" },
              { status: 500 }
            )
          );
        }

        // Step 4: Check MFA
        const validation = await validateSession(signedToken);
        if (!validation.active && validation.mfaStatus) {
          if (!mfa_code) {
            return withCors(
              Response.json(
                { mfa_required: true, mfa_status: validation.mfaStatus },
                { status: 403 }
              )
            );
          }

          try {
            await activateSession(signedToken, mfa_code);
          } catch (err) {
            return withCors(
              Response.json(
                { error: err instanceof Error ? err.message : "MFA activation failed" },
                { status: 401 }
              )
            );
          }
        }

        // Step 5: Get raw token for Bearer auth
        const rawToken = await getRawToken(signedToken);
        if (!rawToken) {
          return withCors(
            Response.json(
              { error: "Session created but could not retrieve token" },
              { status: 500 }
            )
          );
        }

        return withCors(
          Response.json({ token: rawToken, email })
        );
      },
    },
    "/chat": {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async (req) => {
        // Extract Bearer token from Authorization header (same as /cli)
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return withCors(
            Response.json(
              { error: "Missing or invalid Authorization header. Expected: Bearer <token>" },
              { status: 401 }
            )
          );
        }
        const token = authHeader.slice(7);

        const { message, threadId, context } = (await req.json()) as {
          message: string;
          threadId?: string;
          context?: {
            mode?: "live" | "test";
            currentPage?: string;
            pageName?: string | null;
            user?: { email?: string; name?: string; role?: string };
            organization?: { id?: string; name?: string; country?: string };
          };
        };

        if (!message || typeof message !== "string") {
          return Response.json(
            { error: "Missing 'message' field in request body" },
            { status: 400, headers: corsHeaders }
          );
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            const send = (event: string, data: string) => {
              // JSON-encode data so newlines in markdown don't break SSE framing.
              // text_delta data is raw text, so we JSON-encode it.
              // tool_call, tool_result, done, error are already JSON strings,
              // so we send them as-is (they're valid single-line JSON).
              const encoded = event === "text_delta" ? JSON.stringify(data) : data;
              controller.enqueue(encoder.encode(`event: ${event}\ndata: ${encoded}\n\n`));
            };

            streamAgent(message, { threadId, token, context }, (event) => {
              send(event.type, event.data);
            })
              .catch((err) => {
                send("error", JSON.stringify({ message: String(err) }));
              })
              .finally(() => {
                controller.close();
              });
          },
        });

        return new Response(stream, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
  fetch(req) {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    return withCors(new Response("Not Found", { status: 404 }));
  },
});

console.log(`Server running on http://localhost:${PORT}`);
