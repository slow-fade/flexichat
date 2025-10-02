const STORAGE_PREFIX = 'orw-';

type BrowserStorage = 'local' | 'session';

type Validator<T> = (value: unknown) => value is T;

type Store<T> = {
  read: () => T;
  write: (value: T) => void;
  clear: () => void;
};

const registeredKeys: Array<{ key: string; storage: BrowserStorage }> = [];

const isBrowser = typeof window !== 'undefined';

const getStorage = (type: BrowserStorage): Storage | undefined => {
  if (!isBrowser) return undefined;
  return type === 'local' ? window.localStorage : window.sessionStorage;
};

const normalizeKey = (key: string) =>
  key.startsWith(STORAGE_PREFIX) ? key : STORAGE_PREFIX + key;

const parseJSON = (value: string | null) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Failed to parse stored JSON value', error);
    return null;
  }
};

const registerKey = (storage: BrowserStorage, key: string) => {
  if (registeredKeys.some(entry => entry.key === key && entry.storage === storage)) {
    return;
  }
  registeredKeys.push({ key, storage });
};

const createStore = <T>(
  storageType: BrowserStorage,
  key: string,
  defaultValue: T,
  validator?: Validator<T>
): Store<T> => {
  const normalizedKey = normalizeKey(key);
  registerKey(storageType, normalizedKey);

  return {
    read: () => {
      const storage = getStorage(storageType);
      if (!storage) return defaultValue;
      const parsed = parseJSON(storage.getItem(normalizedKey));
      if (parsed === null) return defaultValue;
      if (validator && !validator(parsed)) {
        console.warn('Stored value for ' + normalizedKey + ' failed validation. Resetting to default.');
        storage.removeItem(normalizedKey);
        return defaultValue;
      }
      return parsed as T;
    },
    write: value => {
      const storage = getStorage(storageType);
      if (!storage) return;
      storage.setItem(normalizedKey, JSON.stringify(value));
    },
    clear: () => {
      const storage = getStorage(storageType);
      if (!storage) return;
      storage.removeItem(normalizedKey);
    }
  };
};

export const createLocalStore = <T>(key: string, defaultValue: T, validator?: Validator<T>) =>
  createStore('local', key, defaultValue, validator);

export const createSessionStore = <T>(key: string, defaultValue: T, validator?: Validator<T>) =>
  createStore('session', key, defaultValue, validator);

export const clearBrowserState = () => {
  registeredKeys.forEach(({ key, storage }) => {
    const store = getStorage(storage);
    if (!store) return;
    store.removeItem(key);
  });
};

export type { Store };
