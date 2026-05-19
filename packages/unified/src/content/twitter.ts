interface TwitterBlockerConfig {
  enabled: boolean;
  blockTweetImages: boolean;
  blockAvatars: boolean;
  blockCards: boolean;
}

const DEFAULT_CONFIG: TwitterBlockerConfig = {
  enabled: true,
  blockTweetImages: true,
  blockAvatars: false,
  blockCards: true,
};

const STYLE_ID = "twitter-image-blocker-style";

let currentConfig: TwitterBlockerConfig = DEFAULT_CONFIG;

function buildCSS(config: TwitterBlockerConfig): string {
  if (!config.enabled) return "";

  const rules: string[] = [];

  if (config.blockTweetImages) {
    rules.push(`
      [data-testid="tweetPhoto"] {
        display: none !important;
      }
      [data-testid="tweetPhoto"] img,
      [data-testid="tweetPhoto"] video {
        display: none !important;
      }
      article img[src*="pbs.twimg.com/media"],
      article img[src*="pbs.twimg.com/ext_tw_video_thumb"],
      article img[src*="pbs.twimg.com/amplify_video_thumb"],
      article img[src*="pbs.twimg.com/tweet_video_thumb"] {
        display: none !important;
      }
      [data-testid="videoPlayer"] {
        display: none !important;
      }
      [data-testid="previewInterstitial"] {
        display: none !important;
      }
      article [aria-label*="Image"],
      article [aria-label*="image"],
      article [aria-label*="Photo"],
      article [aria-label*="photo"] {
        display: none !important;
      }
      article a[href*="/photo/"] > div {
        display: none !important;
      }
    `);
  }

  if (config.blockAvatars) {
    rules.push(`
      [data-testid="UserAvatar"] img,
      img[src*="profile_images"],
      [data-testid="UserAvatar-Container"] img {
        display: none !important;
      }
    `);
  }

  if (config.blockCards) {
    rules.push(`
      [data-testid="card.wrapper"] img,
      [data-testid="card.layoutLarge.media"],
      [data-testid="card.layoutSmall.media"],
      [data-testid="card.wrapper"] [data-testid*="media"] {
        display: none !important;
      }
    `);
  }

  if (rules.length === 0) return "";

  return rules.join("\n");
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

function loadConfig() {
  try {
    chrome.runtime.sendMessage({ type: "GET_TWITTER_CONFIG" }, (response) => {
      if (chrome.runtime.lastError) {
        setTimeout(loadConfig, 500);
        return;
      }
      applyStyles(response?.data ?? DEFAULT_CONFIG);
    });
  } catch {
    setTimeout(loadConfig, 500);
  }
}

loadConfig();

chrome.runtime.onMessage.addListener((message: { type: string; config?: TwitterBlockerConfig }, _sender, sendResponse) => {
  if (message.type === "TWITTER_CONFIG_UPDATED" && message.config) {
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
