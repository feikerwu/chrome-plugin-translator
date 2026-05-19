const WS_URL = "ws://localhost:8976";

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

    ws.onclose = () => {};
    ws.onerror = () => { ws.close(); };
  } catch {
    // dev server not running, do nothing
  }
}

connect();
