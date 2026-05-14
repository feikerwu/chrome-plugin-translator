import { useEffect, useState } from "react";
import type { TranslatorConfig, TwitterBlockerConfig, MessageAction, TranslateMode } from "../types";
import { DEFAULT_TWITTER_CONFIG } from "../types";

type Tab = "translator" | "twitter";

export default function Popup() {
  const [tab, setTab] = useState<Tab>("translator");
  const [translatorConfig, setTranslatorConfig] = useState<TranslatorConfig | null>(null);
  const [twitterConfig, setTwitterConfig] = useState<TwitterBlockerConfig>(DEFAULT_TWITTER_CONFIG);
  const [cacheSize, setCacheSize] = useState(0);
  const [status, setStatus] = useState("");

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_TRANSLATOR_CONFIG" } as MessageAction, (r) => {
      if (r?.data) setTranslatorConfig(r.data);
    });
    chrome.runtime.sendMessage({ type: "GET_TWITTER_CONFIG" } as MessageAction, (r) => {
      if (r?.data) setTwitterConfig(r.data);
    });
    chrome.runtime.sendMessage({ type: "GET_CACHE_SIZE" } as MessageAction, (r) => {
      if (r?.data !== undefined) setCacheSize(r.data);
    });
  }, []);

  // --- Translator handlers ---
  const handleTranslate = async (mode: TranslateMode) => {
    const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!t?.id) return;
    setStatus("注入脚本中...");
    try {
      await chrome.scripting.executeScript({ target: { tabId: t.id }, files: ["content-translator.js"] });
    } catch { /* already injected */ }
    setStatus("翻译中...");
    chrome.tabs.sendMessage(t.id, { type: "TRANSLATE_PAGE", mode } as MessageAction, () => {
      if (chrome.runtime.lastError) {
        setStatus(`错误: ${chrome.runtime.lastError.message}`);
      } else {
        setStatus("已发送翻译请求");
        setTimeout(() => window.close(), 500);
      }
    });
  };

  const handleRestore = async () => {
    const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!t?.id) return;
    chrome.tabs.sendMessage(t.id, { type: "RESTORE_PAGE" } as MessageAction, () => {
      if (chrome.runtime.lastError) setStatus(`错误: ${chrome.runtime.lastError.message}`);
      else setTimeout(() => window.close(), 300);
    });
  };

  const handleClearCache = () => {
    chrome.runtime.sendMessage({ type: "CLEAR_CACHE" } as MessageAction, () => {
      setCacheSize(0);
      setStatus("缓存已清除");
    });
  };

  // --- Twitter handlers ---
  const updateTwitterConfig = (partial: Partial<TwitterBlockerConfig>) => {
    const updated = { ...twitterConfig, ...partial };
    setTwitterConfig(updated);
    chrome.runtime.sendMessage({ type: "SAVE_TWITTER_CONFIG", config: updated } as MessageAction);
  };

  const isConfigured = translatorConfig?.apiKey && translatorConfig?.baseUrl;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "8px 0",
    backgroundColor: active ? "#1a1a2e" : "#f0f0f0",
    color: active ? "#fff" : "#666",
    border: "none",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "system-ui, sans-serif",
    borderRadius: active ? "6px 6px 0 0" : "6px 6px 0 0",
    fontWeight: active ? 600 : 400,
  });

  const checkboxStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#333",
    marginBottom: 6,
    cursor: "pointer",
  };

  return (
    <div style={{ width: 280, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex" }}>
        <button style={tabStyle(tab === "translator")} onClick={() => setTab("translator")}>
          翻译
        </button>
        <button style={tabStyle(tab === "twitter")} onClick={() => setTab("twitter")}>
          Twitter 屏蔽
        </button>
      </div>

      <div style={{ padding: 12 }}>
        {tab === "translator" && (
          <>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
              {translatorConfig ? (
                <>
                  <div>模型: {translatorConfig.model || "未设置"}</div>
                  <div>API: {translatorConfig.apiKey ? "已配置" : "未配置"}</div>
                  <div>缓存: {cacheSize} 个页面</div>
                </>
              ) : (
                <div>加载中...</div>
              )}
            </div>

            {status && (
              <div style={{ fontSize: 12, color: "#4a90d9", marginBottom: 8 }}>{status}</div>
            )}

            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <button
                onClick={() => handleTranslate("bilingual")}
                disabled={!isConfigured}
                style={{
                  flex: 1, padding: "9px 0",
                  backgroundColor: isConfigured ? "#4a90d9" : "#ccc",
                  color: "#fff", border: "none", borderRadius: 6,
                  fontSize: 13, cursor: isConfigured ? "pointer" : "not-allowed",
                }}
              >
                双语翻译
              </button>
              <button
                onClick={() => handleTranslate("chinese-only")}
                disabled={!isConfigured}
                style={{
                  flex: 1, padding: "9px 0",
                  backgroundColor: isConfigured ? "#2ecc71" : "#ccc",
                  color: "#fff", border: "none", borderRadius: 6,
                  fontSize: 13, cursor: isConfigured ? "pointer" : "not-allowed",
                }}
              >
                仅中文
              </button>
            </div>

            <button onClick={handleRestore} style={{
              width: "100%", padding: "9px 0", backgroundColor: "#f0f0f0",
              color: "#333", border: "1px solid #ddd", borderRadius: 6,
              fontSize: 13, cursor: "pointer", marginBottom: 8,
            }}>
              还原页面
            </button>

            <button onClick={handleClearCache} disabled={cacheSize === 0} style={{
              width: "100%", padding: "9px 0",
              backgroundColor: cacheSize > 0 ? "#e74c3c" : "#ccc",
              color: "#fff", border: "none", borderRadius: 6,
              fontSize: 13, cursor: cacheSize > 0 ? "pointer" : "not-allowed", marginBottom: 8,
            }}>
              清除缓存 ({cacheSize})
            </button>

            <button onClick={() => chrome.runtime.openOptionsPage()} style={{
              width: "100%", padding: "6px 0", backgroundColor: "transparent",
              color: "#4a90d9", border: "none", fontSize: 12,
              cursor: "pointer", textDecoration: "underline",
            }}>
              设置
            </button>
          </>
        )}

        {tab === "twitter" && (
          <>
            <button
              onClick={() => updateTwitterConfig({ enabled: !twitterConfig.enabled })}
              style={{
                width: "100%", padding: "10px 0",
                backgroundColor: twitterConfig.enabled ? "#e74c3c" : "#2ecc71",
                color: "#fff", border: "none", borderRadius: 6,
                fontSize: 14, cursor: "pointer", marginBottom: 12,
              }}
            >
              {twitterConfig.enabled ? "已开启 - 点击关闭" : "已关闭 - 点击开启"}
            </button>

            <div style={{ borderTop: "1px solid #eee", paddingTop: 10 }}>
              <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>屏蔽选项</div>
              <label style={checkboxStyle}>
                <input type="checkbox" checked={twitterConfig.blockTweetImages}
                  onChange={(e) => updateTwitterConfig({ blockTweetImages: e.target.checked })} />
                推文图片/视频
              </label>
              <label style={checkboxStyle}>
                <input type="checkbox" checked={twitterConfig.blockAvatars}
                  onChange={(e) => updateTwitterConfig({ blockAvatars: e.target.checked })} />
                用户头像
              </label>
              <label style={checkboxStyle}>
                <input type="checkbox" checked={twitterConfig.blockCards}
                  onChange={(e) => updateTwitterConfig({ blockCards: e.target.checked })} />
                链接预览卡片图片
              </label>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
