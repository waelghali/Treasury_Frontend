// frontend/src/utils/safeStorage.js

/**
 * Storage Shield Utility with In-Memory Fallback
 * Guarantees that access to localStorage / sessionStorage never crashes in 
 * Private Browsing, Strict Incognito, or restricted iframe environments.
 */

const memoryLocalStorage = {};
const memorySessionStorage = {};

const createSafeStorage = (storageType, memoryStore) => {
  const getStorage = () => {
    try {
      if (typeof window === 'undefined') return null;
      return window[storageType];
    } catch {
      return null;
    }
  };

  return {
    getItem: (key) => {
      try {
        const storage = getStorage();
        if (storage) return storage.getItem(key);
        return memoryStore[key] || null;
      } catch {
        return memoryStore[key] || null;
      }
    },

    setItem: (key, value) => {
      const valStr = String(value);
      try {
        const storage = getStorage();
        if (storage) {
          storage.setItem(key, valStr);
        } else {
          memoryStore[key] = valStr;
        }
      } catch {
        memoryStore[key] = valStr;
      }
    },

    removeItem: (key) => {
      try {
        const storage = getStorage();
        if (storage) {
          storage.removeItem(key);
        }
        delete memoryStore[key];
      } catch {
        delete memoryStore[key];
      }
    },

    getJSON: (key, fallback = null) => {
      try {
        const storage = getStorage();
        const raw = storage ? storage.getItem(key) : memoryStore[key];
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },

    setJSON: (key, value) => {
      try {
        const serialized = JSON.stringify(value);
        const storage = getStorage();
        if (storage) {
          storage.setItem(key, serialized);
        } else {
          memoryStore[key] = serialized;
        }
      } catch {
        // Fallback or ignore serialization errors
      }
    }
  };
};

export const safeLocalStorage = createSafeStorage('localStorage', memoryLocalStorage);
export const safeSessionStorage = createSafeStorage('sessionStorage', memorySessionStorage);
