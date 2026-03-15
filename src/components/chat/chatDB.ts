// IndexedDB storage layer for chat conversations

export interface Msg {
  role: 'user' | 'bot';
  content: string;
  time: string;
  quote?: string;
  error?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Msg[];
  updatedAt: number;
}

const DB_NAME = 'lighthouse-chat';
const DB_VERSION = 1;
const STORE_NAME = 'conversations';
const MAX_CONVERSATIONS = 50;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadConversations(): Promise<Conversation[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('updatedAt');
      const req = index.openCursor(null, 'prev'); // newest first
      const results: Conversation[] = [];
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor && results.length < MAX_CONVERSATIONS) {
          results.push(cursor.value as Conversation);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveConversation(conv: Conversation): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(conv);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

export async function deleteConversation(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

export async function clearAllConversations(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

// Migrate from localStorage if data exists
export async function migrateFromLocalStorage(): Promise<void> {
  const LEGACY_KEY = 'lh-chat-conversations';
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const convs: Conversation[] = JSON.parse(raw);
    if (!Array.isArray(convs) || convs.length === 0) return;
    for (const conv of convs) {
      await saveConversation(conv);
    }
    localStorage.removeItem(LEGACY_KEY);
  } catch {}
}
