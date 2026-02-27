import { runAgent } from "./openai";

Bun.serve({
  port: 8080,
  routes: {
    "/cli": {
      POST: async (req) => {
        const body = await req.json();
        return Response.json({ endpoint: "cli", data: body });
      },
    },
    "/chat": {
      POST: async (req) => {
        const { message, threadId } = await req.json();

        if (!message || typeof message !== "string") {
          return Response.json(
            { error: "Missing 'message' field in request body" },
            { status: 400 }
          );
        }

        const result = await runAgent(message, { threadId });
        return Response.json({
          reply: result.reply,
          threadId: result.threadId,
        });
      },
    },
  },
  fetch(req) {
    return new Response("Not Found", { status: 404 });
  },
});

console.log("Server running on http://localhost:8080");
