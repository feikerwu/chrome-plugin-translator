import { getStorageItem, setStorageItem } from "@chrome-plugins/shared";
import type { TranslatorConfig, TwitterBlockerConfig } from "./types";
import { DEFAULT_TWITTER_CONFIG } from "./types";

const TRANSLATOR_KEY = "translator_config";
const TWITTER_KEY = "twitter_image_blocker_config";

const DEFAULT_TRANSLATOR: TranslatorConfig = {
  baseUrl: "http://localhost:8317/v1",
  apiKey: "",
  model: "codex-mini",
};

export async function getTranslatorConfig(): Promise<TranslatorConfig> {
  return getStorageItem(TRANSLATOR_KEY, DEFAULT_TRANSLATOR);
}

export async function saveTranslatorConfig(config: TranslatorConfig): Promise<void> {
  await setStorageItem(TRANSLATOR_KEY, config);
}

export async function getTwitterConfig(): Promise<TwitterBlockerConfig> {
  return getStorageItem(TWITTER_KEY, DEFAULT_TWITTER_CONFIG);
}

export async function saveTwitterConfig(config: TwitterBlockerConfig): Promise<void> {
  await setStorageItem(TWITTER_KEY, config);
}
