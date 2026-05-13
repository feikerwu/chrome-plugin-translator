import { LRUCache } from "@chrome-plugins/shared";
import { getConfig } from "../config";
import { translateBatch } from "../api";
import type { MessageAction } from "../types";

const cache = new LRUCache<{ original: string; translation: string }[]>("translator");

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
    cache.set(message.url, message.entries).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "GET_CACHE") {
    cache.get(message.url).then((data) => sendResponse({ data }));
    return true;
  }

  if (message.type === "CLEAR_CACHE") {
    cache.clear().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "GET_CACHE_SIZE") {
    cache.size().then((size) => sendResponse({ data: size }));
    return true;
  }
});
