import { useEffect, useState } from "react";
import type { TranslatorConfig, MessageAction, TranslateMode } from "../types";

export default function Popup() {
  const [config, setConfig] = useState<TranslatorConfig | null>(null);
  const [status, setStatus] = useState<string>("");
  const [cacheSize, setCacheSize] = useState<number>(0);

  useEffect(() => {
    chrome.runtime.sendMessage(
      { type: "GET_CONFIG" } as MessageAction,
      (response) => {
        if (response?.data) setConfig(response.data);
      }
    );
    chrome.runtime.sendMessage(
      { type: "GET_CACHE_SIZE" } as MessageAction,
      (response) => {
        if (response?.data !== undefined) setCacheSize(response.data);
      }
    );
  }, []);

  const handleTranslate = async (mode: TranslateMode) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    setStatus("注入脚本中...");

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
    } catch {
      // content script may already be injected
    }

    setStatus("翻译中...");

    chrome.tabs.sendMessage(tab.id, { type: "TRANSLATE_PAGE", mode } as MessageAction, () => {
      if (chrome.runtime.lastError) {
        setStatus(`错误: ${chrome.runtime.lastError.message}`);
      } else {
        setStatus("已发送翻译请求");
        setTimeout(() => window.close(), 500);
      }
    });
  };

  const handleRestore = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    chrome.tabs.sendMessage(tab.id, { type: "RESTORE_PAGE" } as MessageAction, () => {
      if (chrome.runtime.lastError) {
        setStatus(`错误: ${chrome.runtime.lastError.message}`);
      } else {
        setTimeout(() => window.close(), 300);
      }
    });
  };

  const handleClearCache = () => {
    chrome.runtime.sendMessage({ type: "CLEAR_CACHE" } as MessageAction, () => {
      setCacheSize(0);
      setStatus("缓存已清除");
    });
  };

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const isConfigured = config?.apiKey && config?.baseUrl;

  return (
    <div style={{ width: 280, padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ margin: "0 0 12px", fontSize: 16, color: "#1a1a2e" }}>
        AI 翻译助手
      </h2>

      <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
        {config ? (
          <>
            <div>模型: {config.model || "未设置"}</div>
            <div>API: {config.apiKey ? "已配置" : "未配置"}</div>
            <div>缓存: {cacheSize} 个页面</div>
          </>
        ) : (
          <div>加载中...</div>
        )}
      </div>

      {status && (
        <div style={{ fontSize: 12, color: "#4a90d9", marginBottom: 8 }}>
          {status}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <button
          onClick={() => handleTranslate("bilingual")}
          disabled={!isConfigured}
          style={{
            flex: 1,
            padding: "10px 0",
            backgroundColor: isConfigured ? "#4a90d9" : "#ccc",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            cursor: isConfigured ? "pointer" : "not-allowed",
          }}
        >
          双语翻译
        </button>
        <button
          onClick={() => handleTranslate("chinese-only")}
          disabled={!isConfigured}
          style={{
            flex: 1,
            padding: "10px 0",
            backgroundColor: isConfigured ? "#2ecc71" : "#ccc",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            cursor: isConfigured ? "pointer" : "not-allowed",
          }}
        >
          仅中文
        </button>
      </div>

      <button
        onClick={handleRestore}
        style={{
          width: "100%",
          padding: "10px 0",
          backgroundColor: "#f0f0f0",
          color: "#333",
          border: "1px solid #ddd",
          borderRadius: 6,
          fontSize: 14,
          cursor: "pointer",
          marginBottom: 8,
        }}
      >
        还原页面
      </button>

      <button
        onClick={handleClearCache}
        disabled={cacheSize === 0}
        style={{
          width: "100%",
          padding: "10px 0",
          backgroundColor: cacheSize > 0 ? "#e74c3c" : "#ccc",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontSize: 14,
          cursor: cacheSize > 0 ? "pointer" : "not-allowed",
          marginBottom: 8,
        }}
      >
        清除缓存 ({cacheSize})
      </button>

      <button
        onClick={openOptions}
        style={{
          width: "100%",
          padding: "8px 0",
          backgroundColor: "transparent",
          color: "#4a90d9",
          border: "none",
          fontSize: 12,
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        设置
      </button>
    </div>
  );
}
