export interface BlockerConfig {
  enabled: boolean;
  blockTweetImages: boolean;
  blockAvatars: boolean;
  blockCards: boolean;
}

export type MessageAction =
  | { type: "GET_CONFIG" }
  | { type: "SAVE_CONFIG"; config: BlockerConfig }
  | { type: "TOGGLE" }
  | { type: "CONFIG_UPDATED"; config: BlockerConfig };

export const DEFAULT_CONFIG: BlockerConfig = {
  enabled: true,
  blockTweetImages: true,
  blockAvatars: false,
  blockCards: true,
};
