import { createServer } from "http";

export function startMockAPI(port = 8399) {
  const server = createServer((req, res) => {
    if (req.method === "POST" && req.url === "/v1/chat/completions") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith("Bearer test-key")) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "unauthorized" }));
          return;
        }

        const parsed = JSON.parse(body);
        const userMsg = parsed.messages?.find((m) => m.role === "user")?.content || "";

        // Count paragraphs by [N] markers
        const matches = userMsg.match(/\[\d+\]/g) || [];
        const count = matches.length;

        const translations = Array.from({ length: count }, (_, i) => `翻译段落${i + 1}`);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: translations.join("|||"),
                  role: "assistant",
                },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 100,
              completion_tokens: 50,
              total_tokens: 150,
            },
          })
        );
      });
      return;
    }

    res.writeHead(404);
    res.end("not found");
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`[mock-api] Running on http://localhost:${port}`);
      resolve(server);
    });
  });
}
