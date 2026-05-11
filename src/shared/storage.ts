import type { TranslatorConfig } from "./types";

const STORAGE_KEY = "translator_config";

const DEFAULT_CONFIG: TranslatorConfig = {
  baseUrl: "http://localhost:8317/v1",
  apiKey: "",
  model: "codex-mini",
};

export async function getConfig(): Promise<TranslatorConfig> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as TranslatorConfig | undefined) ?? DEFAULT_CONFIG;
}

export async function saveConfig(config: TranslatorConfig): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: config });
}
