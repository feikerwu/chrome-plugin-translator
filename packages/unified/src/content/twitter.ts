import type { TwitterBlockerConfig, MessageAction } from "../types";
import { DEFAULT_TWITTER_CONFIG } from "../types";

const STYLE_ID = "twitter-image-blocker-style";

let currentConfig: TwitterBlockerConfig = DEFAULT_TWITTER_CONFIG;

function buildCSS(config: TwitterBlockerConfig): string {
  if (!config.enabled) return "";

  const rules: string[] = [];

  if (config.blockTweetImages) {
    rules.push(`
      [data-testid="tweetPhoto"],
      [data-testid="tweetPhoto"] img,
      article img[src*="pbs.twimg.com/media"],
      [data-testid="videoPlayer"],
      [data-testid="previewInterstitial"]
    `);
  }

  if (config.blockAvatars) {
    rules.push(`
      [data-testid="UserAvatar"] img,
      img[src*="profile_images"]
    `);
  }

  if (config.blockCards) {
    rules.push(`
      [data-testid="card.wrapper"] img,
      [data-testid="card.layoutLarge.media"] img,
      [data-testid="card.layoutSmall.media"] img
    `);
  }

  if (rules.length === 0) return "";

  return `${rules.join(",\n")} {
    visibility: hidden !important;
    min-height: 0 !important;
    max-height: 48px !important;
    overflow: hidden !important;
  }

  ${config.blockTweetImages ? `
    [data-testid="tweetPhoto"] {
      position: relative !important;
    }
    [data-testid="tweetPhoto"]::after {
      content: "图片已屏蔽";
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f0f0f0;
      color: #999;
      font-size: 14px;
      visibility: visible !important;
      max-height: none !important;
    }
  ` : ""}`;
}

function applyStyles(config: TwitterBlockerConfig) {
  currentConfig = config;
  let styleEl = document.getElementById(STYLE_ID);
  const css = buildCSS(config);

  if (!css) {
    if (styleEl) styleEl.remove();
    return;
  }

  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    (document.head || document.documentElement).appendChild(styleEl);
  }

  styleEl.textContent = css;
}

chrome.runtime.sendMessage({ type: "GET_TWITTER_CONFIG" } as MessageAction, (response) => {
  if (response?.data) {
    applyStyles(response.data);
  } else {
    applyStyles(DEFAULT_TWITTER_CONFIG);
  }
});

chrome.runtime.onMessage.addListener((message: MessageAction, _sender, sendResponse) => {
  if (message.type === "TWITTER_CONFIG_UPDATED") {
    applyStyles(message.config);
    sendResponse({ ok: true });
  }
});

const observer = new MutationObserver(() => {
  if (!document.getElementById(STYLE_ID) && currentConfig.enabled) {
    applyStyles(currentConfig);
  }
});

observer.observe(document.documentElement, { childList: true, subtree: true });
