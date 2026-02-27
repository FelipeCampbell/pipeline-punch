Bun.serve({
  port: 3000,
  routes: {
    "/cli": {
      POST: async (req) => {
        const body = await req.json();
        return Response.json({ endpoint: "cli", data: body });
      },
    },
    "/chat": {
      POST: async (req) => {
        const body = await req.json();
        return Response.json({ endpoint: "chat", data: body });
      },
    },
  },
  fetch(req) {
    return new Response("Not Found", { status: 404 });
  },
});

console.log("Server running on http://localhost:3000");
