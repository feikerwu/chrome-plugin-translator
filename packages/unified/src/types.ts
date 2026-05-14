export interface TranslatorConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface TranslateResponse {
  translations: string[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export type TranslateMode = "bilingual" | "chinese-only";

export interface TwitterBlockerConfig {
  enabled: boolean;
  blockTweetImages: boolean;
  blockAvatars: boolean;
  blockCards: boolean;
}

export const DEFAULT_TWITTER_CONFIG: TwitterBlockerConfig = {
  enabled: true,
  blockTweetImages: true,
  blockAvatars: false,
  blockCards: true,
};

export type MessageAction =
  // translator
  | { type: "TRANSLATE_PAGE"; mode?: TranslateMode }
  | { type: "RESTORE_PAGE" }
  | { type: "TRANSLATE_BATCH"; paragraphs: string[] }
  | { type: "GET_TRANSLATOR_CONFIG" }
  | { type: "SAVE_CACHE"; url: string; entries: { original: string; translation: string }[] }
  | { type: "GET_CACHE"; url: string }
  | { type: "CLEAR_CACHE" }
  | { type: "GET_CACHE_SIZE" }
  // twitter blocker
  | { type: "GET_TWITTER_CONFIG" }
  | { type: "SAVE_TWITTER_CONFIG"; config: TwitterBlockerConfig }
  | { type: "TOGGLE_TWITTER" }
  | { type: "TWITTER_CONFIG_UPDATED"; config: TwitterBlockerConfig };
