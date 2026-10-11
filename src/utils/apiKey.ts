/**
 * The user's own OpenAI key, kept in this browser only: in session storage
 * by default, so it's gone when the browser closes, or in local storage when
 * they choose to be remembered. It is never part of saved universes or exports.
 */

const STORAGE_NAME = 'parallel-universes-openai-key';
export const API_KEY_HEADER = 'x-openai-key';

const stores = (): Storage[] => {
  const out: Storage[] = [];
  try {
    out.push(sessionStorage, localStorage);
  } catch {
    // Storage blocked; the key can't be kept.
  }
  return out;
};

export interface StoredKey {
  key: string;
  /** Kept after the browser closes. */
  remember: boolean;
}

export const loadApiKey = (): StoredKey | null => {
  for (const store of stores()) {
    try {
      const key = store.getItem(STORAGE_NAME);
      if (key) return { key, remember: store === localStorage };
    } catch {
      // Ignore and try the next one.
    }
  }
  return null;
};

export const saveApiKey = (key: string, remember: boolean) => {
  clearApiKey();
  const store = remember ? localStorage : sessionStorage;
  store.setItem(STORAGE_NAME, key.trim());
};

export const clearApiKey = () =>
  stores().forEach((store) => {
    try {
      store.removeItem(STORAGE_NAME);
    } catch {
      // Nothing to clear.
    }
  });

/** Headers that send the user's key with an AI request, when they have one. */
export const aiHeaders = (): Record<string, string> => {
  const stored = loadApiKey();
  return stored ? { [API_KEY_HEADER]: stored.key } : {};
};

/** Enough of a key to recognise it: "sk-…a1b2". */
export const maskApiKey = (key: string) =>
  key.length > 10 ? `${key.slice(0, 3)}…${key.slice(-4)}` : '…';
