export const DB_NAME = 'DictationSheetGenDB';
export const DB_VERSION = 1;

export class StorageDB {
  constructor() {
    this.db = null;
    this.isSupported = (typeof indexedDB !== 'undefined');
  }

  async open() {
    if (!this.isSupported) return null;
    if (this.db) return this.db;

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const dbInstance = event.target.result;
          if (!dbInstance.objectStoreNames.contains('words')) {
            const ws = dbInstance.createObjectStore('words', { keyPath: 'id' });
            ws.createIndex('en', 'en', { unique: false });
            ws.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
          if (!dbInstance.objectStoreNames.contains('sentences')) {
            const ss = dbInstance.createObjectStore('sentences', { keyPath: 'id' });
            ss.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          this.db = event.target.result;
          resolve(this.db);
        };

        request.onerror = (event) => {
          console.warn('IndexedDB 初始化失败，自动降级为内存模式:', event.target.error);
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB 不可用:', err);
        resolve(null);
      }
    });
  }

  async getAll(storeName) {
    const dbInstance = await this.open();
    if (!dbInstance) return [];
    return new Promise((resolve) => {
      try {
        const tx = dbInstance.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  }

  async bulkPut(storeName, items) {
    if (!items || items.length === 0) return true;
    const dbInstance = await this.open();
    if (!dbInstance) return false;
    return new Promise((resolve) => {
      try {
        const tx = dbInstance.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        items.forEach(it => store.put(it));
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  async delete(storeName, id) {
    const dbInstance = await this.open();
    if (!dbInstance) return false;
    return new Promise((resolve) => {
      try {
        const tx = dbInstance.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  async clear(storeName) {
    const dbInstance = await this.open();
    if (!dbInstance) return false;
    return new Promise((resolve) => {
      try {
        const tx = dbInstance.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }
}

// 重复项检测 (基于 en 不区分大小写，或中文释义完全匹配)
export function detectDuplicates(existingItems, newItems) {
  const existingMap = new Map();
  (existingItems || []).forEach(item => {
    if (item.en) existingMap.set(item.en.trim().toLowerCase(), item);
  });

  const unique = [];
  const duplicates = [];

  (newItems || []).forEach(item => {
    const key = (item.en || '').trim().toLowerCase();
    if (key && existingMap.has(key)) {
      duplicates.push({ newItem: item, existingItem: existingMap.get(key) });
    } else {
      unique.push(item);
    }
  });

  return { unique, duplicates };
}

// 配置文件格式校验与版本迁移
export function validateImportData(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, message: '无效的 JSON 配置文件' };
  }

  // v4 统一全量格式
  if (parsed.draft || parsed.library) {
    return {
      valid: true,
      version: parsed.version || '4.0',
      draftItems: Array.isArray(parsed.draft?.items) ? parsed.draft.items : [],
      draftSettings: parsed.draft?.settings || null,
      libraryWords: Array.isArray(parsed.library?.words) ? parsed.library.words : [],
      librarySentences: Array.isArray(parsed.library?.sentences) ? parsed.library.sentences : []
    };
  }

  // v1 ~ v3 传统格式 ({ words: [...], settings: {...} })
  if (Array.isArray(parsed.words) || parsed.settings) {
    return {
      valid: true,
      version: parsed.version || '3.0',
      draftItems: Array.isArray(parsed.words) ? parsed.words : [],
      draftSettings: parsed.settings || null,
      libraryWords: [],
      librarySentences: []
    };
  }

  return { valid: false, message: '未识别的试卷配置数据格式' };
}
