export const STORAGE_KEYS = {
  chats: 'orw-chats',
  presets: 'orw-presets',
  activeChatId: 'orw-active-chat',
  activePresetId: 'orw-active-preset'
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
