import { getStorageItem, setStorageItem } from "@chrome-plugins/shared";
import type { TranslatorConfig } from "./types";

const STORAGE_KEY = "translator_config";

const DEFAULT_CONFIG: TranslatorConfig = {
  baseUrl: "http://localhost:8317/v1",
  apiKey: "",
  model: "codex-mini",
};

export async function getConfig(): Promise<TranslatorConfig> {
  return getStorageItem(STORAGE_KEY, DEFAULT_CONFIG);
}

export async function saveConfig(config: TranslatorConfig): Promise<void> {
  await setStorageItem(STORAGE_KEY, config);
}
