import { streamAgent } from "./openai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Bun.serve({
  port: 8080,
  routes: {
    "/cli": {
      POST: async (req) => {
        const body = await req.json();
        return Response.json({ endpoint: "cli", data: body }, { headers: corsHeaders });
      },
    },
    "/chat": {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async (req) => {
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
              controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
            };

            streamAgent(message, { threadId }, (event) => {
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
    return new Response("Not Found", { status: 404 });
  },
});

console.log("Server running on http://localhost:8080");
