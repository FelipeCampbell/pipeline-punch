import { streamAgent } from "./openai";
import { parseCommand } from "./src/parser.ts";
import { dispatch } from "./src/dispatcher.ts";

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
        return withCors(Response.json(result, { status }));
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

        const { message, threadId } = (await req.json()) as { message: string; threadId?: string };

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

            streamAgent(message, { threadId, token }, (event) => {
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
