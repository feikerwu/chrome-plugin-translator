export interface TranslatorConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface TranslateRequest {
  paragraphs: string[];
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

export type MessageAction =
  | { type: "TRANSLATE_PAGE"; mode?: TranslateMode }
  | { type: "RESTORE_PAGE" }
  | { type: "TRANSLATE_BATCH"; paragraphs: string[] }
  | { type: "GET_CONFIG" }
  | { type: "TRANSLATION_COMPLETE"; usage: TranslateResponse["usage"] }
  | { type: "SAVE_CACHE"; url: string; entries: { original: string; translation: string }[] }
  | { type: "GET_CACHE"; url: string }
  | { type: "CLEAR_CACHE" }
  | { type: "GET_CACHE_SIZE" };
