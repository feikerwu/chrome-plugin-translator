import { spawn } from "child_process";
import { createServer } from "http";
import { WebSocketServer } from "ws";

const pkg = process.argv[2] || "unified";
const WS_PORT = 8976;

// WebSocket server to notify extension of rebuilds
const server = createServer();
const wss = new WebSocketServer({ server });
const clients = new Set();

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log(`[dev] Extension connected (${clients.size} client(s))`);
  ws.on("close", () => clients.delete(ws));
});

server.listen(WS_PORT, () => {
  console.log(`[dev] Reload server on ws://localhost:${WS_PORT}`);
});

function notifyReload() {
  for (const ws of clients) {
    ws.send("reload");
  }
  if (clients.size > 0) {
    console.log(`[dev] Notified ${clients.size} client(s) to reload`);
  }
}

// Run vite build --watch
const vite = spawn(
  "npx",
  ["vite", "build", "--watch"],
  {
    cwd: `packages/${pkg}`,
    stdio: ["inherit", "pipe", "pipe"],
    shell: true,
  }
);

vite.stdout.on("data", (data) => {
  const text = data.toString();
  process.stdout.write(text);
  if (text.includes("built in")) {
    notifyReload();
  }
});

vite.stderr.on("data", (data) => {
  process.stderr.write(data);
});

vite.on("close", (code) => {
  console.log(`[dev] Vite exited with code ${code}`);
  process.exit(code);
});

process.on("SIGINT", () => {
  vite.kill();
  server.close();
  process.exit(0);
});
