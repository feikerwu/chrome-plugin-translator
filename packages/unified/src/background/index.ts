import { LRUCache } from "@chrome-plugins/shared";
import { getTranslatorConfig, getTwitterConfig, saveTwitterConfig } from "../config";
import { translateBatch } from "../api";
import type { MessageAction } from "../types";

const cache = new LRUCache<{ original: string; translation: string }[]>("translator");

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "toggle-translate" && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "TRANSLATE_PAGE" } as MessageAction);
  }
});

chrome.runtime.onMessage.addListener((message: MessageAction, _sender, sendResponse) => {
  // --- Translator ---
  if (message.type === "TRANSLATE_BATCH") {
    (async () => {
      try {
        const config = await getTranslatorConfig();
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

  if (message.type === "GET_TRANSLATOR_CONFIG") {
    getTranslatorConfig().then((config) => sendResponse({ data: config }));
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

  // --- Twitter Blocker ---
  if (message.type === "GET_TWITTER_CONFIG") {
    getTwitterConfig().then((config) => sendResponse({ data: config }));
    return true;
  }

  if (message.type === "SAVE_TWITTER_CONFIG") {
    saveTwitterConfig(message.config).then(() => {
      sendResponse({ ok: true });
      notifyTwitterTabs(message.config);
    });
    return true;
  }

  if (message.type === "TOGGLE_TWITTER") {
    getTwitterConfig().then(async (config) => {
      const updated = { ...config, enabled: !config.enabled };
      await saveTwitterConfig(updated);
      sendResponse({ data: updated });
      notifyTwitterTabs(updated);
    });
    return true;
  }
});

function notifyTwitterTabs(config: unknown) {
  chrome.tabs.query({ url: ["https://x.com/*", "https://twitter.com/*"] }, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: "TWITTER_CONFIG_UPDATED",
          config,
        } as MessageAction);
      }
    }
  });
}
