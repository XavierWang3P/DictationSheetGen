export const DB_NAME = 'DictationSheetGenDB';
export const DB_VERSION = 2;

const DATA_STORES = ['words', 'sentences'];
const META_STORE = 'meta';
const initializedKey = (storeName) => `initialized:${storeName}`;
const LIBRARY_GROUPS_META_KEY = 'library:groups';

// Vue 响应式 Proxy 不能直接写入 IndexedDB；题库备份本身是 JSON 数据，
// 因此在存储边界统一转换为可克隆的普通对象，避免启动后快速操作时静默失败。
function toStorableValue(value) {
  return JSON.parse(JSON.stringify(value));
}

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
          if (!dbInstance.objectStoreNames.contains(META_STORE)) {
            dbInstance.createObjectStore(META_STORE, { keyPath: 'key' });
          }
        };

        request.onsuccess = (event) => {
          this.db = event.target.result;
          this.db.onversionchange = () => {
            this.db?.close();
            this.db = null;
          };
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
    if (!DATA_STORES.includes(storeName) || !Array.isArray(items)) return false;
    const dbInstance = await this.open();
    if (!dbInstance) return false;
    return new Promise((resolve) => {
      try {
        const tx = dbInstance.transaction([storeName, META_STORE], 'readwrite');
        const store = tx.objectStore(storeName);
        items.forEach(it => store.put(toStorableValue(it)));
        tx.objectStore(META_STORE).put({ key: initializedKey(storeName), value: true });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  async writeStores(collections, { replace = false, groups } = {}) {
    const entries = Object.entries(collections || {});
    if (entries.some(([storeName, items]) => !DATA_STORES.includes(storeName) || !Array.isArray(items))) {
      return false;
    }
    const hasGroups = groups !== undefined;
    if (hasGroups && !Array.isArray(groups)) return false;
    if (entries.length === 0 && !hasGroups) return true;

    const dbInstance = await this.open();
    if (!dbInstance) return false;

    return new Promise((resolve) => {
      let tx;
      try {
        const transactionStores = [...new Set([...entries.map(([storeName]) => storeName), META_STORE])];
        tx = dbInstance.transaction(transactionStores, 'readwrite');
        const metaStore = tx.objectStore(META_STORE);
        entries.forEach(([storeName, items]) => {
          const store = tx.objectStore(storeName);
          if (replace) store.clear();
          items.forEach((item) => store.put(toStorableValue(item)));
          metaStore.put({ key: initializedKey(storeName), value: true });
        });
        if (hasGroups) {
          metaStore.put({ key: LIBRARY_GROUPS_META_KEY, value: toStorableValue(groups) });
        }
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch (error) {
        try { tx?.abort(); } catch {}
        resolve(false);
      }
    });
  }

  async delete(storeName, id) {
    if (!DATA_STORES.includes(storeName)) return false;
    const dbInstance = await this.open();
    if (!dbInstance) return false;
    return new Promise((resolve) => {
      try {
        const tx = dbInstance.transaction([storeName, META_STORE], 'readwrite');
        const store = tx.objectStore(storeName);
        store.delete(id);
        tx.objectStore(META_STORE).put({ key: initializedKey(storeName), value: true });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  async clear(storeName) {
    if (!DATA_STORES.includes(storeName)) return false;
    const dbInstance = await this.open();
    if (!dbInstance) return false;
    return new Promise((resolve) => {
      try {
        const tx = dbInstance.transaction([storeName, META_STORE], 'readwrite');
        const store = tx.objectStore(storeName);
        store.clear();
        tx.objectStore(META_STORE).put({ key: initializedKey(storeName), value: true });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  async isStoreInitialized(storeName) {
    if (!DATA_STORES.includes(storeName)) return false;
    const dbInstance = await this.open();
    if (!dbInstance) return false;
    return new Promise((resolve) => {
      try {
        const tx = dbInstance.transaction(META_STORE, 'readonly');
        const request = tx.objectStore(META_STORE).get(initializedKey(storeName));
        request.onsuccess = () => resolve(request.result?.value === true);
        request.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  async getLibraryGroups() {
    const dbInstance = await this.open();
    if (!dbInstance) return null;
    return new Promise((resolve) => {
      try {
        const tx = dbInstance.transaction(META_STORE, 'readonly');
        const request = tx.objectStore(META_STORE).get(LIBRARY_GROUPS_META_KEY);
        request.onsuccess = () => {
          const value = request.result?.value;
          resolve(Array.isArray(value) ? value : null);
        };
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
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

// IndexedDB 以 id 为主键。恢复备份时，同 id 的不同内容不能覆盖现有记录，
// 同一备份内的重复 id 也必须重新编号，确保刷新前后的内存与数据库一致。
export function ensureUniqueItemIds(existingItems, newItems, prefix = 'restored-item') {
  const usedIds = new Set(
    (existingItems || [])
      .map((item) => item?.id)
      .filter((id) => typeof id === 'string' || typeof id === 'number')
      .map(String)
  );
  let sequence = 0;

  const createId = () => {
    let candidate;
    do {
      sequence += 1;
      const randomPart = globalThis.crypto?.randomUUID?.().slice(0, 8)
        || Math.random().toString(36).slice(2, 10);
      candidate = `${prefix}-${Date.now().toString(36)}-${sequence.toString(36)}-${randomPart}`;
    } while (usedIds.has(candidate));
    return candidate;
  };

  return (newItems || []).map((item) => {
    if (!item || typeof item !== 'object') return item;
    const originalId = item.id;
    const key = (typeof originalId === 'string' || typeof originalId === 'number')
      ? String(originalId)
      : '';
    const id = key && !usedIds.has(key) ? originalId : createId();
    usedIds.add(String(id));
    return id === originalId ? item : { ...item, id };
  });
}

// 配置文件格式校验与版本迁移
export function validateImportData(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, message: '无效的 JSON 配置文件（必须是顶层对象）' };
  }

  const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

  function isValidItem(it) {
    return isObject(it) && (
      it.questionType || it.en || it.zh || it.translation || it.stem || it.title || it.instructions
    );
  }

  function readCollection(container, key, label) {
    if (!isObject(container) || !hasOwn(container, key)) return { present: false, items: [] };
    const items = container[key];
    if (!Array.isArray(items)) return { error: `${label}必须是数组` };
    const malformedIndex = items.findIndex((item) => !isValidItem(item));
    if (malformedIndex >= 0) return { error: `${label}第 ${malformedIndex + 1} 条记录格式无效` };
    return { present: true, items };
  }

  function readGroups(container, key = 'groups') {
    if (!isObject(container) || !hasOwn(container, key)) return { present: false, items: [] };
    const groups = container[key];
    if (!Array.isArray(groups)) return { error: '题库分组必须是数组' };
    if (groups.length > 1000) return { error: '题库分组数量过多' };
    const invalidIndex = groups.findIndex((group) => typeof group !== 'string' || !group.trim() || group.trim().length > 100);
    if (invalidIndex >= 0) return { error: `题库分组第 ${invalidIndex + 1} 项格式无效` };
    return {
      present: true,
      items: [...new Set(groups.map((group) => group.trim()))]
    };
  }

  // v4 统一全量格式
  if (hasOwn(parsed, 'draft') || hasOwn(parsed, 'library')) {
    if (hasOwn(parsed, 'draft') && !isObject(parsed.draft)) {
      return { valid: false, message: '配置文件的草稿必须是对象' };
    }
    if (hasOwn(parsed, 'library') && !isObject(parsed.library)) {
      return { valid: false, message: '配置文件的题库必须是对象' };
    }

    const draft = readCollection(parsed.draft, 'items', '草稿题目');
    const words = readCollection(parsed.library, 'words', '词库');
    const sentences = readCollection(parsed.library, 'sentences', '句库');
    const nestedGroups = readGroups(parsed.library);
    const topLevelGroups = parsed.type === 'wordLibrary' && !nestedGroups.present
      ? readGroups(parsed)
      : { present: false, items: [] };
    const groups = nestedGroups.present ? nestedGroups : topLevelGroups;
    const collectionError = draft.error || words.error || sentences.error || nestedGroups.error || topLevelGroups.error;
    if (collectionError) return { valid: false, message: collectionError };

    const hasDraftSettings = isObject(parsed.draft) && hasOwn(parsed.draft, 'settings');
    if (hasDraftSettings && !isObject(parsed.draft.settings)) {
      return { valid: false, message: '配置文件的卷面设置必须是对象' };
    }
    const draftSettings = hasDraftSettings ? parsed.draft.settings : null;

    if (!draft.present && !words.present && !sentences.present && !groups.present && !draftSettings) {
      return { valid: false, message: '配置文件的草稿或词库内容为空' };
    }

    return {
      valid: true,
      version: String(parsed.version || '5.0'),
      draftItems: draft.items,
      draftSettings,
      libraryWords: words.items,
      librarySentences: sentences.items,
      libraryGroups: groups.items,
      hasDraftItems: draft.present,
      hasLibraryWords: words.present,
      hasLibrarySentences: sentences.present,
      hasLibraryGroups: groups.present
    };
  }

  // 历史题库独立备份格式（v4.1）：只恢复本地题库，不得误当作当前试卷。
  if (parsed.type === 'wordLibrary') {
    const words = readCollection(parsed, 'words', '词库');
    const groups = readGroups(parsed);
    if (words.error || groups.error) return { valid: false, message: words.error || groups.error };
    if (!words.present) return { valid: false, message: '题库备份缺少词库列表' };

    return {
      valid: true,
      version: String(parsed.version || '4.1'),
      draftItems: [],
      draftSettings: null,
      libraryWords: words.items,
      librarySentences: [],
      libraryGroups: groups.items,
      hasDraftItems: false,
      hasLibraryWords: true,
      hasLibrarySentences: false,
      hasLibraryGroups: groups.present
    };
  }

  // v1 ~ v3 传统格式 ({ words: [...], settings: {...} })
  if (hasOwn(parsed, 'words') || hasOwn(parsed, 'settings')) {
    const words = readCollection(parsed, 'words', '词汇列表');
    if (words.error) return { valid: false, message: words.error };
    if (hasOwn(parsed, 'settings') && !isObject(parsed.settings)) {
      return { valid: false, message: '配置文件的设置项必须是对象' };
    }
    const draftSettings = hasOwn(parsed, 'settings') ? parsed.settings : null;

    if (!words.present && !draftSettings) {
      return { valid: false, message: '配置文件的词汇列表与设置项均为空' };
    }

    return {
      valid: true,
      version: String(parsed.version || '3.0'),
      draftItems: words.items,
      draftSettings,
      libraryWords: [],
      librarySentences: [],
      libraryGroups: [],
      hasDraftItems: words.present,
      hasLibraryWords: false,
      hasLibrarySentences: false,
      hasLibraryGroups: false
    };
  }

  return { valid: false, message: '未识别的试卷配置数据格式' };
}
