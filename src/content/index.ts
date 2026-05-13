import type { MessageAction, TranslateResponse, TranslateMode } from "../shared/types";

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
const TOAST_ID = "ai-translator-toast";
const FLOAT_ID = "ai-translator-float";
let isTranslated = false;

function getTranslatableElements(): HTMLElement[] {
  const blockSelectors = "p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, figcaption, dt, dd";
  const elements = document.querySelectorAll<HTMLElement>(blockSelectors);
  return Array.from(elements).filter((el) => {
    const text = el.innerText.trim();
    if (!text || text.length < 2) return false;
    if (el.closest(`.${TRANSLATED_CLASS}`)) return false;
    if (el.hasAttribute(ORIGINAL_ATTR)) return false;
    if (el.querySelector(blockSelectors)) return false;
    const englishRatio = (text.match(/[a-zA-Z]/g)?.length ?? 0) / text.length;
    return englishRatio > 0.5;
  });
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

function showToast(usage: TranslateResponse["usage"], fromCache = false) {
  const existing = document.getElementById(TOAST_ID);
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = TOAST_ID;
  toast.innerHTML = fromCache
    ? `<div style="font-weight:bold;">从缓存恢复翻译 ✓</div>`
    : `
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
  }, 3000);
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
  document.querySelectorAll(`[${ORIGINAL_ATTR}]`).forEach((el) => {
    const original = el.getAttribute(ORIGINAL_ATTR);
    if (original) el.textContent = original;
    el.removeAttribute(ORIGINAL_ATTR);
  });
  isTranslated = false;
  updateFloatButton();
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
        const entries: { original: string; translation: string }[] = response.data.entries;
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
                showToast({ promptTokens: 0, completionTokens: 0, totalTokens: 0 }, true);
          updateFloatButton();
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
    showError("未找到可翻译的英文内容");
    return;
  }

  const texts = elements.map((el) => el.innerText.trim());

  const result = await new Promise<TranslateResponse | null>((resolve) => {
    chrome.runtime.sendMessage(
      { type: "TRANSLATE_BATCH", paragraphs: texts } as MessageAction,
      (response) => {
        if (response?.error) {
          showError(response.error);
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
  showToast(result.usage);
  updateFloatButton();
  chrome.runtime.sendMessage({
    type: "SAVE_CACHE",
    url: location.href,
    entries: allEntries,
  } as MessageAction);
}

function updateFloatButton() {
  const btn = document.getElementById(FLOAT_ID) as HTMLElement | null;
  if (!btn) return;
  const mainBtn = btn.querySelector("[data-role=main]") as HTMLElement | null;
  if (mainBtn) {
    mainBtn.textContent = isTranslated ? "还原" : "译";
  }
}

function createFloatButton() {
  if (document.getElementById(FLOAT_ID)) return;

  const container = document.createElement("div");
  container.id = FLOAT_ID;
  Object.assign(container.style, {
    position: "fixed",
    bottom: "80px",
    right: "20px",
    zIndex: "2147483646",
    fontFamily: "system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "6px",
  });

  let menuVisible = false;
  const menu = document.createElement("div");
  Object.assign(menu.style, {
    display: "none",
    flexDirection: "column",
    gap: "4px",
    alignItems: "flex-end",
  });

  const btnStyle = {
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontFamily: "system-ui, sans-serif",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    transition: "transform 0.15s",
  };

  const bilingualBtn = document.createElement("button");
  bilingualBtn.textContent = "双语翻译";
  Object.assign(bilingualBtn.style, {
    ...btnStyle,
    padding: "8px 14px",
    backgroundColor: "#4a90d9",
    color: "#fff",
  });
  bilingualBtn.addEventListener("click", () => {
    toggleMenu();
    translatePage("bilingual");
  });

  const chineseBtn = document.createElement("button");
  chineseBtn.textContent = "仅中文";
  Object.assign(chineseBtn.style, {
    ...btnStyle,
    padding: "8px 14px",
    backgroundColor: "#2ecc71",
    color: "#fff",
  });
  chineseBtn.addEventListener("click", () => {
    toggleMenu();
    translatePage("chinese-only");
  });

  menu.appendChild(bilingualBtn);
  menu.appendChild(chineseBtn);

  const mainBtn = document.createElement("button");
  mainBtn.setAttribute("data-role", "main");
  mainBtn.textContent = "译";
  Object.assign(mainBtn.style, {
    ...btnStyle,
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "#1a1a2e",
    color: "#fff",
    fontSize: "18px",
    padding: "0",
  });

  mainBtn.addEventListener("click", () => {
    if (isTranslated) {
      restorePage();
      return;
    }
    toggleMenu();
  });

  function toggleMenu() {
    menuVisible = !menuVisible;
    menu.style.display = menuVisible ? "flex" : "none";
  }

  // 拖拽支持
  let startY = 0;
  let startBottom = 0;

  mainBtn.addEventListener("mousedown", (e) => {
    startY = e.clientY;
    startBottom = parseInt(container.style.bottom);

    const onMove = (ev: MouseEvent) => {
      const dy = startY - ev.clientY;
      container.style.bottom = `${startBottom + dy}px`;
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  container.appendChild(menu);
  container.appendChild(mainBtn);
  document.body.appendChild(container);
}

createFloatButton();

chrome.runtime.onMessage.addListener((message: MessageAction, _sender, sendResponse) => {
  if (message.type === "TRANSLATE_PAGE") {
    translatePage(message.mode ?? "bilingual");
    sendResponse({ ok: true });
  } else if (message.type === "RESTORE_PAGE") {
    restorePage();
    sendResponse({ ok: true });
  }
});
