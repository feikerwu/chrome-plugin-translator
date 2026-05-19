import { showToast, createFloatButton, updateFloatButtonLabel } from "@chrome-plugins/shared";
import type { MessageAction, TranslateResponse, TranslateMode } from "../types";

if (window.__AI_TRANSLATOR_LOADED__) {
  throw new Error("already loaded");
}
(window as any).__AI_TRANSLATOR_LOADED__ = true;

declare global {
  interface Window {
    __AI_TRANSLATOR_LOADED__?: boolean;
  }
}

const TRANSLATED_CLASS = "ai-translator-translated";
const ORIGINAL_ATTR = "data-ai-original";
const FLOAT_ID = "ai-translator-float";

let isTranslated = false;

function getTranslatableElements(): HTMLElement[] {
  const blockSelectors = "p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, figcaption, dt, dd, article, section, div, span, pre, code, em, strong, a, label, summary, details, caption";
  const leafSelectors = "p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, figcaption, dt, dd, pre, code";

  const candidates = document.querySelectorAll<HTMLElement>(blockSelectors);
  const results: HTMLElement[] = [];
  const seen = new WeakSet<Node>();

  for (const el of candidates) {
    const text = el.innerText.trim();
    if (!text || text.length < 2) continue;
    if (el.closest(`.${TRANSLATED_CLASS}`)) continue;
    if (el.hasAttribute(ORIGINAL_ATTR)) continue;
    if (seen.has(el)) continue;

    const hasLeafChild = el.querySelector(leafSelectors);
    if (hasLeafChild) continue;

    const englishChars = text.match(/[a-zA-Z]/g)?.length ?? 0;
    if (englishChars < 3) continue;
    const ratio = englishChars / text.replace(/\s/g, "").length;
    if (ratio < 0.3) continue;

    results.push(el);
    seen.add(el);
  }

  return results;
}

function insertTranslation(element: HTMLElement, translation: string, mode: TranslateMode) {
  if (mode === "chinese-only") {
    element.setAttribute(ORIGINAL_ATTR, element.textContent || "");
    element.textContent = translation;
  } else {
    const translatedEl = document.createElement(element.tagName.toLowerCase());
    translatedEl.className = TRANSLATED_CLASS;
    translatedEl.textContent = translation;
    Object.assign(translatedEl.style, {
      backgroundColor: "rgba(255, 248, 220, 0.8)",
      padding: "4px 8px",
      borderRadius: "4px",
      marginTop: "4px",
      fontSize: "0.95em",
      lineHeight: "1.6",
      color: "#333",
    });
    element.after(translatedEl);
  }
}

function restorePage() {
  document.querySelectorAll(`.${TRANSLATED_CLASS}`).forEach((el) => el.remove());
  document.querySelectorAll(`[${ORIGINAL_ATTR}]`).forEach((el) => {
    const original = el.getAttribute(ORIGINAL_ATTR);
    if (original) el.textContent = original;
    el.removeAttribute(ORIGINAL_ATTR);
  });
  isTranslated = false;
  updateFloatButtonLabel(FLOAT_ID, "译");
}

function restoreFromCache(mode: TranslateMode): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "GET_CACHE", url: location.href } as MessageAction,
      (response) => {
        if (chrome.runtime.lastError || !response?.data) {
          resolve(false);
          return;
        }
        const entries: { original: string; translation: string }[] = response.data;
        const elements = getTranslatableElements();
        let restored = 0;

        for (const el of elements) {
          const text = el.innerText.trim();
          const match = entries.find((e) => e.original === text);
          if (match) {
            insertTranslation(el, match.translation, mode);
            restored++;
          }
        }

        if (restored > 0) {
          isTranslated = true;
          showToast(`<div style="font-weight:bold;">从缓存恢复翻译 ✓</div>`);
          updateFloatButtonLabel(FLOAT_ID, "还原");
          resolve(true);
        } else {
          resolve(false);
        }
      }
    );
  });
}

async function translatePage(mode: TranslateMode = "bilingual") {
  if (isTranslated) {
    restorePage();
    return;
  }

  const cached = await restoreFromCache(mode);
  if (cached) return;

  const elements = getTranslatableElements();
  if (elements.length === 0) {
    showToast("未找到可翻译的英文内容", { type: "error" });
    return;
  }

  const texts = elements.map((el) => el.innerText.trim());

  const result = await new Promise<TranslateResponse | null>((resolve) => {
    chrome.runtime.sendMessage(
      { type: "TRANSLATE_BATCH", paragraphs: texts } as MessageAction,
      (response) => {
        if (response?.error) {
          showToast(`翻译失败: ${response.error}`, { type: "error", duration: 5000 });
          resolve(null);
        } else {
          resolve(response.data);
        }
      }
    );
  });

  if (!result) return;

  const allEntries: { original: string; translation: string }[] = [];
  result.translations.forEach((translation, idx) => {
    if (translation && elements[idx]) {
      insertTranslation(elements[idx], translation, mode);
      allEntries.push({ original: texts[idx], translation });
    }
  });

  isTranslated = true;
  updateFloatButtonLabel(FLOAT_ID, "还原");

  showToast(`
    <div style="font-weight:bold;margin-bottom:4px;">翻译完成 ✓</div>
    <div>Prompt: ${result.usage.promptTokens} tokens</div>
    <div>Completion: ${result.usage.completionTokens} tokens</div>
    <div style="border-top:1px solid rgba(0,0,0,0.1);margin-top:4px;padding-top:4px;font-weight:bold;">
      总计: ${result.usage.totalTokens} tokens
    </div>
  `);

  chrome.runtime.sendMessage({
    type: "SAVE_CACHE",
    url: location.href,
    entries: allEntries,
  } as MessageAction);
}

createFloatButton({
  id: FLOAT_ID,
  label: "译",
  menuItems: [
    { label: "双语翻译", color: "#4a90d9", onClick: () => translatePage("bilingual") },
    { label: "仅中文", color: "#2ecc71", onClick: () => translatePage("chinese-only") },
  ],
  onMainClick: () => {
    if (isTranslated) restorePage();
  },
});

chrome.runtime.onMessage.addListener((message: MessageAction, _sender, sendResponse) => {
  if (message.type === "TRANSLATE_PAGE") {
    translatePage(message.mode ?? "bilingual");
    sendResponse({ ok: true });
  } else if (message.type === "RESTORE_PAGE") {
    restorePage();
    sendResponse({ ok: true });
  }
});
