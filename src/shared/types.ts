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

export type MessageAction =
  | { type: "TRANSLATE_PAGE" }
  | { type: "RESTORE_PAGE" }
  | { type: "TRANSLATE_BATCH"; paragraphs: string[] }
  | { type: "GET_CONFIG" }
  | { type: "TRANSLATION_COMPLETE"; usage: TranslateResponse["usage"] };
