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

// 重复项检测 (基于 en 不区分大小写，或中文释义完全匹配，支持单批次内部自身查重)
export function detectDuplicates(existingItems, newItems) {
  const existingEnMap = new Map();
  const existingZhMap = new Map();

  (existingItems || []).forEach(item => {
    if (!item) return;
    const enKey = (item.en || '').trim().toLowerCase();
    const zhKey = (item.zh || item.translation || '').trim();
    if (enKey) existingEnMap.set(enKey, item);
    if (zhKey) existingZhMap.set(zhKey, item);
  });

  const unique = [];
  const duplicates = [];

  // 当前批次内部已收录的键，用于发现同一批数据内部自身的重复
  const seenEnMap = new Map();
  const seenZhMap = new Map();

  (newItems || []).forEach(item => {
    if (!item || typeof item !== 'object') return;
    const enKey = (item.en || '').trim().toLowerCase();
    const zhKey = (item.zh || item.translation || '').trim();

    let matchedExisting = null;

    if (enKey && existingEnMap.has(enKey)) {
      matchedExisting = existingEnMap.get(enKey);
    } else if (enKey && seenEnMap.has(enKey)) {
      matchedExisting = seenEnMap.get(enKey);
    } else if (!enKey && zhKey && existingZhMap.has(zhKey)) {
      matchedExisting = existingZhMap.get(zhKey);
    } else if (!enKey && zhKey && seenZhMap.has(zhKey)) {
      matchedExisting = seenZhMap.get(zhKey);
    }

    if (matchedExisting) {
      duplicates.push({ newItem: item, existingItem: matchedExisting });
    } else {
      unique.push(item);
      if (enKey) seenEnMap.set(enKey, item);
      if (zhKey) seenZhMap.set(zhKey, item);
    }
  });

  return { unique, duplicates };
}

// 配置文件格式校验与版本迁移
export function validateImportData(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, message: '无效的 JSON 配置文件（必须是顶层对象）' };
  }

  function sanitizeList(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(it => it && typeof it === 'object' && (it.en || it.zh || it.translation));
  }

  // v4 统一全量格式
  if (parsed.draft || parsed.library) {
    const draftItems = sanitizeList(parsed.draft?.items);
    const libraryWords = sanitizeList(parsed.library?.words);
    const librarySentences = sanitizeList(parsed.library?.sentences);
    const draftSettings = (parsed.draft?.settings && typeof parsed.draft.settings === 'object') ? parsed.draft.settings : null;

    if (draftItems.length === 0 && libraryWords.length === 0 && librarySentences.length === 0 && !draftSettings) {
      return { valid: false, message: '配置文件的草稿或词库内容为空' };
    }

    return {
      valid: true,
      version: String(parsed.version || '4.0'),
      draftItems,
      draftSettings,
      libraryWords,
      librarySentences
    };
  }

  // v1 ~ v3 传统格式 ({ words: [...], settings: {...} })
  if (Array.isArray(parsed.words) || (parsed.settings && typeof parsed.settings === 'object')) {
    const draftItems = sanitizeList(parsed.words);
    const draftSettings = (parsed.settings && typeof parsed.settings === 'object') ? parsed.settings : null;

    if (draftItems.length === 0 && !draftSettings) {
      return { valid: false, message: '配置文件的词汇列表与设置项均为空' };
    }

    return {
      valid: true,
      version: String(parsed.version || '3.0'),
      draftItems,
      draftSettings,
      libraryWords: [],
      librarySentences: []
    };
  }

  return { valid: false, message: '未识别的试卷配置数据格式' };
}
