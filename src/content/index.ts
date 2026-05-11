import type { MessageAction, TranslateResponse } from "../shared/types";

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
const TOAST_ID = "ai-translator-toast";
const BATCH_SIZE = 8;
const MAX_CONCURRENT = 3;

let isTranslated = false;

function getTranslatableElements(): HTMLElement[] {
  const blockSelectors = "p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, figcaption, dt, dd";
  const elements = document.querySelectorAll<HTMLElement>(blockSelectors);
  return Array.from(elements).filter((el) => {
    const text = el.innerText.trim();
    if (!text || text.length < 2) return false;
    if (el.closest(`.${TRANSLATED_CLASS}`)) return false;
    if (el.querySelector(blockSelectors)) return false;
    const englishRatio = (text.match(/[a-zA-Z]/g)?.length ?? 0) / text.length;
    return englishRatio > 0.5;
  });
}

function insertTranslation(element: HTMLElement, translation: string) {
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

function showToast(usage: TranslateResponse["usage"]) {
  const existing = document.getElementById(TOAST_ID);
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = TOAST_ID;
  toast.innerHTML = `
    <div style="font-weight:bold;margin-bottom:4px;">翻译完成 ✓</div>
    <div>Prompt: ${usage.promptTokens} tokens</div>
    <div>Completion: ${usage.completionTokens} tokens</div>
    <div style="border-top:1px solid rgba(0,0,0,0.1);margin-top:4px;padding-top:4px;font-weight:bold;">
      总计: ${usage.totalTokens} tokens
    </div>
  `;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    backgroundColor: "#1a1a2e",
    color: "#e0e0e0",
    padding: "12px 16px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    zIndex: "2147483647",
    fontSize: "13px",
    lineHeight: "1.5",
    fontFamily: "system-ui, sans-serif",
    transition: "opacity 0.3s",
  });
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

function showError(message: string) {
  const existing = document.getElementById(TOAST_ID);
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = TOAST_ID;
  toast.textContent = `翻译失败: ${message}`;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    backgroundColor: "#8b0000",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    zIndex: "2147483647",
    fontSize: "13px",
    fontFamily: "system-ui, sans-serif",
    transition: "opacity 0.3s",
  });
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

function restorePage() {
  document.querySelectorAll(`.${TRANSLATED_CLASS}`).forEach((el) => el.remove());
  isTranslated = false;
}

async function translatePage() {
  if (isTranslated) {
    restorePage();
    return;
  }

  const elements = getTranslatableElements();
  if (elements.length === 0) {
    showError("未找到可翻译的英文内容");
    return;
  }

  const totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  const batches: { elements: HTMLElement[]; texts: string[] }[] = [];

  for (let i = 0; i < elements.length; i += BATCH_SIZE) {
    const batch = elements.slice(i, i + BATCH_SIZE);
    batches.push({
      elements: batch,
      texts: batch.map((el) => el.innerText.trim()),
    });
  }

  let hasError = false;

  async function processBatch(batch: (typeof batches)[0]) {
    return new Promise<void>((resolve) => {
      chrome.runtime.sendMessage(
        { type: "TRANSLATE_BATCH", paragraphs: batch.texts } as MessageAction,
        (response) => {
          if (response?.error) {
            hasError = true;
            showError(response.error);
            resolve();
            return;
          }
          const result: TranslateResponse = response.data;
          result.translations.forEach((translation, idx) => {
            if (translation && batch.elements[idx]) {
              insertTranslation(batch.elements[idx], translation);
            }
          });
          totalUsage.promptTokens += result.usage.promptTokens;
          totalUsage.completionTokens += result.usage.completionTokens;
          totalUsage.totalTokens += result.usage.totalTokens;
          resolve();
        }
      );
    });
  }

  for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
    if (hasError) break;
    const concurrent = batches.slice(i, i + MAX_CONCURRENT);
    await Promise.all(concurrent.map(processBatch));
  }

  if (!hasError) {
    isTranslated = true;
    showToast(totalUsage);
  }
}

chrome.runtime.onMessage.addListener((message: MessageAction, _sender, sendResponse) => {
  if (message.type === "TRANSLATE_PAGE") {
    translatePage();
    sendResponse({ ok: true });
  } else if (message.type === "RESTORE_PAGE") {
    restorePage();
    sendResponse({ ok: true });
  }
});
