import { useEffect, useState } from "react";
import type { TranslatorConfig } from "../types";
import { getTranslatorConfig, saveTranslatorConfig } from "../config";

export default function Options() {
  const [config, setConfig] = useState<TranslatorConfig>({ baseUrl: "", apiKey: "", model: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getTranslatorConfig().then(setConfig);
  }, []);

  const handleSave = async () => {
    await saveTranslatorConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", border: "1px solid #ddd",
    borderRadius: 6, fontSize: 14, boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600, color: "#333",
  };

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 20, color: "#1a1a2e", marginBottom: 24 }}>AI 工具箱 - 翻译设置</h1>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Base URL</label>
        <input style={inputStyle} type="text" value={config.baseUrl}
          onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
          placeholder="http://localhost:8317/v1" />
        <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
          CLIProxyAPI 地址，默认 http://localhost:8317/v1
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>API Key</label>
        <input style={inputStyle} type="password" value={config.apiKey}
          onChange={(e) => setConfig({ ...config, apiKey: e.target.value })} placeholder="sk-..." />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>模型</label>
        <input style={inputStyle} type="text" value={config.model}
          onChange={(e) => setConfig({ ...config, model: e.target.value })} placeholder="codex-mini" />
        <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
          例如: codex-mini, claude-sonnet-4-6, gemini-2.5-pro
        </div>
      </div>

      <button onClick={handleSave} style={{
        padding: "10px 24px", backgroundColor: "#4a90d9", color: "#fff",
        border: "none", borderRadius: 6, fontSize: 14, cursor: "pointer",
      }}>
        {saved ? "已保存 ✓" : "保存设置"}
      </button>
    </div>
  );
}
