import { reactive, watch } from 'vue';
import {
  DEFAULT_WORDS_RAW,
  DEFAULT_CLOZE_WORDS_RAW,
  DEFAULT_SETTINGS,
  createDraftItem
} from '../core/layout.js';
import { StorageDB, detectDuplicates, validateImportData } from '../core/storage.js';

const STORAGE_KEY = 'dictation_sheet_generator_v3';

export const db = new StorageDB();

export const state = reactive({
  library: {
    words: DEFAULT_WORDS_RAW.map((w, i) => ({
      id: `w-default-${i + 1}`,
      en: w.en,
      zh: w.zh,
      group: w.group || '五年级上册 Unit 1',
      updatedAt: Date.now()
    })),
    sentences: DEFAULT_CLOZE_WORDS_RAW.map((s, i) => ({
      id: `s-default-${i + 1}`,
      type: 'sentence',
      en: s.en,
      zh: s.zh,
      translation: s.zh,
      rawText: s.en
    }))
  },
  draft: {
    items: [],
    settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
  },
  ui: {
    activeView: 'paneQuick',
    zoom: 0.85,
    isZoomFit: true,
    isSidebarCollapsed: false
  }
});

if (typeof window !== 'undefined') {
  window.__appStoreState = state;
}

// 兼容性代理 (让测试脚本直接读写 state.words 和 state.settings)
Object.defineProperty(state, 'words', {
  get() { return this.draft.items; },
  set(val) {
    this.draft.items = (val || []).map(it => createDraftItem(it));
  }
});

Object.defineProperty(state, 'settings', {
  get() { return this.draft.settings; },
  set(val) {
    this.draft.settings = Object.assign({}, DEFAULT_SETTINGS, val);
  }
});

Object.defineProperty(state, 'zoom', {
  get() { return this.ui.zoom; },
  set(v) { this.ui.zoom = v; }
});

Object.defineProperty(state, 'isZoomFit', {
  get() { return this.ui.isZoomFit; },
  set(v) { this.ui.isZoomFit = v; }
});

Object.defineProperty(state, 'isSidebarCollapsed', {
  get() { return this.ui.isSidebarCollapsed; },
  set(v) { this.ui.isSidebarCollapsed = v; }
});

// 挂载全局对象以保证现有自动化测试工具无缝调用
if (typeof window !== 'undefined') {
  window.state = state;
  window.__appState = state;
  window.__appDB = db;
  window.__appStorage = {
    db,
    detectDuplicates,
    validateImportData
  };
}

// 本地草稿与设置存储
export function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.draft) {
        if (Array.isArray(data.draft.items)) {
          state.draft.items = data.draft.items.map(it => createDraftItem(it));
        }
        if (data.draft.settings) {
          state.draft.settings = Object.assign({}, DEFAULT_SETTINGS, data.draft.settings);
        }
      } else if (Array.isArray(data.words)) {
        state.draft.items = data.words.map(it => createDraftItem(it));
        if (data.settings) {
          state.draft.settings = Object.assign({}, DEFAULT_SETTINGS, data.settings);
        }
      }
    }
  } catch (e) {
    console.warn('读取本地配置失败:', e);
  }
}

export function saveState() {
  try {
    const payload = {
      version: '4.0',
      savedAt: Date.now(),
      draft: {
        items: state.draft.items,
        settings: state.draft.settings
      },
      words: state.draft.items,
      settings: state.draft.settings
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('存储本地配置失败:', e);
  }
}

let saveTimer = null;
function debouncedSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 200);
}

// 深度监听 draft 变动自动保存
watch(
  () => [state.draft.items, state.draft.settings],
  () => debouncedSave(),
  { deep: true }
);

// IndexedDB 词库与句库初始化
export async function loadLibraryFromDB() {
  try {
    const words = await db.getAll('words');
    const sentences = await db.getAll('sentences');

    if (words && words.length > 0) {
      state.library.words = words.map(w => ({
        ...w,
        group: w.group || '通用词汇'
      }));
    } else {
      // 预设默认推荐词库
      const defaultWords = DEFAULT_WORDS_RAW.map(w => ({
        id: `w-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        en: w.en,
        zh: w.zh,
        group: w.group || '五年级上册 Unit 1',
        updatedAt: Date.now()
      }));
      state.library.words = defaultWords;
      await db.bulkPut('words', defaultWords);
    }

    if (sentences && sentences.length > 0) {
      state.library.sentences = sentences;
    } else {
      // 预设默认推荐句库
      const defaultSentences = DEFAULT_CLOZE_WORDS_RAW.map(s => createDraftItem(s));
      state.library.sentences = defaultSentences;
      await db.bulkPut('sentences', defaultSentences);
    }
  } catch (e) {
    console.warn('加载词库句库失败:', e);
  }
}
