import { getStorageItem, setStorageItem } from "@chrome-plugins/shared";
import type { BlockerConfig } from "./types";
import { DEFAULT_CONFIG } from "./types";

const STORAGE_KEY = "twitter_image_blocker_config";

export async function getConfig(): Promise<BlockerConfig> {
  return getStorageItem(STORAGE_KEY, DEFAULT_CONFIG);
}

export async function saveConfig(config: BlockerConfig): Promise<void> {
  await setStorageItem(STORAGE_KEY, config);
}
