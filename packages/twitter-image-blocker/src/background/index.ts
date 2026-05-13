import { getConfig, saveConfig } from "../config";
import type { MessageAction } from "../types";

chrome.runtime.onMessage.addListener((message: MessageAction, _sender, sendResponse) => {
  if (message.type === "GET_CONFIG") {
    getConfig().then((config) => sendResponse({ data: config }));
    return true;
  }

  if (message.type === "SAVE_CONFIG") {
    saveConfig(message.config).then(() => {
      sendResponse({ ok: true });
      chrome.tabs.query({ url: ["https://x.com/*", "https://twitter.com/*"] }, (tabs) => {
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              type: "CONFIG_UPDATED",
              config: message.config,
            } as MessageAction);
          }
        }
      });
    });
    return true;
  }

  if (message.type === "TOGGLE") {
    getConfig().then(async (config) => {
      const updated = { ...config, enabled: !config.enabled };
      await saveConfig(updated);
      sendResponse({ data: updated });
      chrome.tabs.query({ url: ["https://x.com/*", "https://twitter.com/*"] }, (tabs) => {
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              type: "CONFIG_UPDATED",
              config: updated,
            } as MessageAction);
          }
        }
      });
    });
    return true;
  }
});
