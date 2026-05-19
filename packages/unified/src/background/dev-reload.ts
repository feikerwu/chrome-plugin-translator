const WS_URL = "ws://localhost:8976";
const RETRY_INTERVAL = 3000;

function connect() {
  try {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("[dev-reload] Connected to dev server");
    };

    ws.onmessage = (event) => {
      if (event.data === "reload") {
        console.log("[dev-reload] Reloading extension...");
        chrome.runtime.reload();
      }
    };

    ws.onclose = () => {
      setTimeout(connect, RETRY_INTERVAL);
    };

    ws.onerror = () => {
      ws.close();
    };
  } catch {
    setTimeout(connect, RETRY_INTERVAL);
  }
}

connect();
