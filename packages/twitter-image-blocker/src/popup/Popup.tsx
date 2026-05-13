import { useEffect, useState } from "react";
import type { BlockerConfig, MessageAction } from "../types";
import { DEFAULT_CONFIG } from "../types";

export default function Popup() {
  const [config, setConfig] = useState<BlockerConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_CONFIG" } as MessageAction, (response) => {
      if (response?.data) setConfig(response.data);
      setLoaded(true);
    });
  }, []);

  const updateConfig = (partial: Partial<BlockerConfig>) => {
    const updated = { ...config, ...partial };
    setConfig(updated);
    chrome.runtime.sendMessage({ type: "SAVE_CONFIG", config: updated } as MessageAction);
  };

  const toggle = () => updateConfig({ enabled: !config.enabled });

  if (!loaded) return <div style={{ width: 240, padding: 16 }}>加载中...</div>;

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
    <div style={{ width: 240, padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ margin: "0 0 12px", fontSize: 16, color: "#1a1a2e" }}>
        Twitter 图片屏蔽
      </h2>

      <button
        onClick={toggle}
        style={{
          width: "100%",
          padding: "10px 0",
          backgroundColor: config.enabled ? "#e74c3c" : "#2ecc71",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontSize: 14,
          cursor: "pointer",
          marginBottom: 12,
        }}
      >
        {config.enabled ? "已开启 - 点击关闭" : "已关闭 - 点击开启"}
      </button>

      <div style={{ borderTop: "1px solid #eee", paddingTop: 10 }}>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>屏蔽选项</div>

        <label style={checkboxStyle}>
          <input
            type="checkbox"
            checked={config.blockTweetImages}
            onChange={(e) => updateConfig({ blockTweetImages: e.target.checked })}
          />
          推文图片/视频
        </label>

        <label style={checkboxStyle}>
          <input
            type="checkbox"
            checked={config.blockAvatars}
            onChange={(e) => updateConfig({ blockAvatars: e.target.checked })}
          />
          用户头像
        </label>

        <label style={checkboxStyle}>
          <input
            type="checkbox"
            checked={config.blockCards}
            onChange={(e) => updateConfig({ blockCards: e.target.checked })}
          />
          链接预览卡片图片
        </label>
      </div>
    </div>
  );
}
