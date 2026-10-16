import { computed, reactive, watch } from 'vue';
import {
  DEFAULT_WORDS_RAW,
  DEFAULT_CLOZE_WORDS_RAW,
  DEFAULT_SETTINGS,
  createDraftItem,
  migrateDraftItem,
  computePageLayout
} from '../core/layout.js';
import { StorageDB, detectDuplicates, validateImportData } from '../core/storage.js';
import { normalizeLayoutDefaults } from '../question-types/registry.js';
import { resolveAlphabetGuideFont } from '../core/handwritingFonts.js';
import { exposeBrowserTestApi, isBrowserTestMode } from '../testing/browserTestBridge.js';

const STORAGE_KEY = 'dictation_sheet_generator_v3';
const LIBRARY_GROUPS_KEY = 'dictation_custom_groups';

function loadSavedLibraryGroups() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LIBRARY_GROUPS_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((group) => typeof group === 'string').map((group) => group.trim()).filter(Boolean))];
  } catch {
    return [];
  }
}

export const db = new StorageDB();

function normalizeFontFamily(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  // 保留旧版 Arial 等常见系统字体，同时拒绝能跳出 CSS 声明或 HTML 属性的字符。
  return trimmed.length > 0
    && trimmed.length <= 160
    && /^[\p{L}\p{N}\s'",.\-]+$/u.test(trimmed)
    ? trimmed
    : fallback;
}

export function normalizeSettings(settings = {}) {
  const source = settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {};
  const normalizedGuideFont = resolveAlphabetGuideFont(source.alphabetGuideFont).cssFamily;
  const gridStroke = Number(source.gridStroke);
  return {
    ...DEFAULT_SETTINGS,
    ...source,
    fontFamilyZh: normalizeFontFamily(source.fontFamilyZh, DEFAULT_SETTINGS.fontFamilyZh),
    fontFamilyEn: normalizeFontFamily(source.fontFamilyEn, DEFAULT_SETTINGS.fontFamilyEn),
    alphabetGuideFont: normalizedGuideFont,
    dividerStyle: ['dashed', 'solid', 'none'].includes(source.dividerStyle)
      ? source.dividerStyle
      : DEFAULT_SETTINGS.dividerStyle,
    titleAlign: ['left', 'center', 'right'].includes(source.titleAlign)
      ? source.titleAlign
      : DEFAULT_SETTINGS.titleAlign,
    gridColor: typeof source.gridColor === 'string' && /^#[0-9a-f]{3,8}$/i.test(source.gridColor)
      ? source.gridColor
      : DEFAULT_SETTINGS.gridColor,
    gridStroke: Number.isFinite(gridStroke) && gridStroke >= 0.4 && gridStroke <= 2
      ? gridStroke
      : DEFAULT_SETTINGS.gridStroke,
    layoutDefaults: normalizeLayoutDefaults(source.layoutDefaults, source)
  };
}

export const state = reactive({
  library: {
    groups: loadSavedLibraryGroups(),
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
    settings: normalizeSettings()
  },
  ui: {
    activeView: 'paneQuick',
    zoom: 0.85,
    isZoomFit: true,
    isSidebarCollapsed: false,
    isSettingsCollapsed: false
  }
});

// 兼容性代理 (让测试脚本直接读写 state.words 和 state.settings)
if (isBrowserTestMode) {
  Object.defineProperty(state, 'words', {
    get() { return this.draft.items; },
    set(val) {
      this.draft.items = (val || []).map(it => migrateDraftItem(it, this.draft.settings?.dictMode));
    }
  });

  Object.defineProperty(state, 'settings', {
    get() { return this.draft.settings; },
    set(val) {
      this.draft.settings = normalizeSettings(val);
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

  Object.defineProperty(state, 'isSettingsCollapsed', {
    get() { return this.ui.isSettingsCollapsed; },
    set(v) { this.ui.isSettingsCollapsed = v; }
  });
}

// 挂载全局对象以保证现有自动化测试工具无缝调用
exposeBrowserTestApi({
  state,
  __appState: state,
  __appStoreState: state,
  __appDB: db,
  __appStorage: {
    db,
    detectDuplicates,
    validateImportData
  }
});

// 所有界面共享同一份分页派生结果，避免每次编辑在多个组件中重复完整计算。
export const pageLayout = computed(() => computePageLayout(state.draft.items, state.draft.settings));

// 本地草稿与设置存储
export function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const fallbackMode = data.draft?.settings?.dictMode || data.settings?.dictMode || 'word-dictation';
      if (data.draft) {
        if (Array.isArray(data.draft.items)) {
          state.draft.items = data.draft.items.map(it => migrateDraftItem(it, fallbackMode));
        }
        if (data.draft.settings) {
          state.draft.settings = normalizeSettings(data.draft.settings);
        }
      } else if (Array.isArray(data.words)) {
        state.draft.items = data.words.map(it => migrateDraftItem(it, fallbackMode));
        if (data.settings) {
          state.draft.settings = normalizeSettings(data.settings);
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
      version: '5.0',
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

watch(
  () => state.library.groups,
  (groups) => {
    try {
      localStorage.setItem(LIBRARY_GROUPS_KEY, JSON.stringify(groups));
    } catch (error) {
      console.warn('保存题库分组失败:', error);
    }
  },
  { deep: true }
);

// IndexedDB 词库与句库初始化
export async function loadLibraryFromDB() {
  try {
    const storedGroups = await db.getLibraryGroups();
    if (storedGroups !== null) {
      state.library.groups = [...new Set(storedGroups.filter((group) => typeof group === 'string').map((group) => group.trim()).filter(Boolean))];
    } else {
      // v1/v2 早期版本只把自定义分组放在 localStorage。首次升级时写入
      // IndexedDB；以后 IndexedDB 才是事实来源，localStorage 仅保留兼容镜像。
      const migrated = await db.writeStores({}, { groups: state.library.groups });
      if (!migrated) console.warn('迁移题库分组到 IndexedDB 失败，将在下次启动时重试');
    }

    const words = await db.getAll('words');
    const sentences = await db.getAll('sentences');

    if (words && words.length > 0) {
      state.library.words = words.map(w => ({
        ...w,
        group: w.group || '通用词汇'
      }));
    } else if (await db.isStoreInitialized('words')) {
      // 用户已主动清空或用空备份覆盖，必须保持空库，不能再次注入示例词。
      state.library.words = [];
    } else {
      // 仅首次初始化时写入示例词库。
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
    } else if (await db.isStoreInitialized('sentences')) {
      state.library.sentences = [];
    } else {
      // 仅首次初始化时写入示例句库。
      const defaultSentences = DEFAULT_CLOZE_WORDS_RAW.map(s => createDraftItem(s));
      state.library.sentences = defaultSentences;
      await db.bulkPut('sentences', defaultSentences);
    }
  } catch (e) {
    console.warn('加载词库句库失败:', e);
  }
}
