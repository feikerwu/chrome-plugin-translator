import { getConfig } from "../shared/storage";
import { translateBatch } from "../shared/api";
import { getPageCache, setPageCache, clearCache, getCacheSize } from "../shared/cache";
import type { MessageAction } from "../shared/types";

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "toggle-translate" && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "TRANSLATE_PAGE" } as MessageAction);
  }
});

chrome.runtime.onMessage.addListener((message: MessageAction, _sender, sendResponse) => {
  if (message.type === "TRANSLATE_BATCH") {
    (async () => {
      try {
        const config = await getConfig();
        if (!config.apiKey) {
          sendResponse({ error: "API Key 未配置，请在插件设置中配置" });
          return;
        }
        const result = await translateBatch(config, message.paragraphs);
        sendResponse({ data: result });
      } catch (err) {
        sendResponse({ error: (err as Error).message });
      }
    })();
    return true;
  }

  if (message.type === "GET_CONFIG") {
    getConfig().then((config) => sendResponse({ data: config }));
    return true;
  }

  if (message.type === "SAVE_CACHE") {
    setPageCache(message.url, message.entries).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "GET_CACHE") {
    getPageCache(message.url).then((cache) => sendResponse({ data: cache }));
    return true;
  }

  if (message.type === "CLEAR_CACHE") {
    clearCache().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "GET_CACHE_SIZE") {
    getCacheSize().then((size) => sendResponse({ data: size }));
    return true;
  }
});
