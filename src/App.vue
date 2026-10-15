<template>
  <!-- 移动端全屏提示页 (当检测到手机访问时，不加载或展示网站主功能界面) -->
  <MobileNotice v-if="isMobile" />

  <!-- 桌面端主功能界面 -->
  <n-config-provider
    v-else
    :locale="zhCN"
    :date-locale="dateZhCN"
    :theme-overrides="themeOverrides"
  >
    <n-message-provider>
      <div class="app-layout">
          <!-- 动态打印尺寸样式注入 -->
          <component :is="'style'">
            @page {
              size: {{ layout.pageWidthMm }}mm {{ layout.pageHeightMm }}mm;
              margin: 0;
            }
            @media print {
              .sheet-page {
                width: {{ layout.pageWidthMm }}mm !important;
                height: {{ layout.pageHeightMm }}mm !important;
                min-height: {{ layout.pageHeightMm }}mm !important;
                max-height: {{ layout.pageHeightMm }}mm !important;
              }
            }
          </component>

          <!-- 顶部工具栏 -->
          <AppHeader />

          <!-- 主工作台 -->
          <div class="app-workspace">
            <SidebarTabs />
            <PreviewViewport />
            <LayoutInspector />
          </div>

          <!-- 应用版本与版权信息仅用于操作界面，打印/PDF 时自动隐藏 -->
          <footer
            class="app-footer no-print"
            data-debug-id="F-001"
            data-debug-name="版本与版权信息"
            data-debug-component="App"
            data-debug-file="src/App.vue"
          >
            <div class="app-footer-left">
              <a
                href="https://github.com/XavierWang3P/DictationSheetGen"
                target="_blank"
                rel="noopener noreferrer"
                class="app-footer-link"
                title="查看 GitHub 项目"
              >
                <AppIcon name="github" :size="13" />
                <span class="app-footer-version">DictationSheet v{{ appVersion }}</span>
              </a>
              <span class="app-footer-divider" aria-hidden="true"></span>
              <span class="app-footer-copy">
                Copyright © 2026
                <a
                  href="https://xavier.wang"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="app-footer-link"
                  title="访问王虾虾博客"
                >
                  王虾虾
                </a>
              </span>
            </div>
            <div class="app-footer-right">
              <n-tooltip trigger="hover">
                <template #trigger>
                  <span class="app-footer-link app-footer-social">
                    <AppIcon name="wechat" :size="13" />
                    微信公众号：鸟之言语
                  </span>
                </template>
                关注微信公众号：鸟之言语
              </n-tooltip>
              <span class="app-footer-divider" aria-hidden="true"></span>
              <a
                href="https://space.bilibili.com/6526939"
                target="_blank"
                rel="noopener noreferrer"
                class="app-footer-link app-footer-social"
                title="访问 XavierWang Bilibili 空间"
              >
                <AppIcon name="bilibili" :size="13" />
                Bilibili：XavierWang
              </a>
            </div>
          </footer>

          <!-- 全网页 Debug 覆盖层 (快捷键: Ctrl+Alt+D / Cmd+Opt+D) -->
          <DebugOverlay />

          <!-- 兼容旧测试脚本与新功能专用隐藏桩按钮 (不干扰实际视觉界面) -->
          <div style="display:none;" aria-hidden="true">
            <button id="btnLoadDefaultSample" @click="handleNineSample"></button>
            <button id="btnLoadSampleNine" @click="handleNineSample"></button>
            <button id="btnLoadSampleG4" @click="handleG4Sample"></button>
            <button id="btnReplaceCustom" @click="handleReplaceCustom"></button>
            <button id="btnLoadAlphabet26" @click="handleAlphabet26Sample"></button>
            <button id="btnLoadAlphabetNeighbors" @click="handleAlphabetNeighborsSample"></button>
            <button id="btnLoadAlphabetCase" @click="handleAlphabetCaseSample"></button>
          </div>
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { NConfigProvider, NMessageProvider, NTooltip, zhCN, dateZhCN } from 'naive-ui';
import packageInfo from '../package.json';
import { state, loadSavedState, loadLibraryFromDB } from './stores/appStore.js';
import { useDebugMode } from './composables/useDebugMode.js';
import {
  computePageLayout,
  createDraftItem,
  DEFAULT_WORDS_RAW,
  DEFAULT_CLOZE_WORDS_RAW
} from './core/layout.js';
import AppHeader from './components/AppHeader.vue';
import AppIcon from './components/AppIcon.vue';
import SidebarTabs from './components/SidebarTabs.vue';
import PreviewViewport from './components/PreviewViewport.vue';
import LayoutInspector from './components/LayoutInspector.vue';
import DebugOverlay from './components/DebugOverlay.vue';
import MobileNotice from './components/MobileNotice.vue';
import { isMobilePhoneDevice } from './core/deviceDetect.js';
import { naiveThemeOverrides as themeOverrides } from './theme/naiveTheme.js';

import {
  generateAlphabetSequenceItems,
  generateLetterNeighborsItems,
  generateCaseConversionItems
} from './core/alphabet.js';

const { registerDebugKeyboardListener, unregisterDebugKeyboardListener } = useDebugMode();
const appVersion = packageInfo.version;

// 移动端状态检测与响应式监听
const isMobile = ref(isMobilePhoneDevice());

// 同步 class 到 document.documentElement，配合 CSS 彻底杜绝界面闪烁
watch(isMobile, (val) => {
  if (typeof document !== 'undefined') {
    if (val) {
      document.documentElement.classList.add('is-mobile-device');
    } else {
      document.documentElement.classList.remove('is-mobile-device');
    }
  }
}, { immediate: true });

const updateMobileStatus = () => {
  const nextVal = isMobilePhoneDevice();
  if (isMobile.value !== nextVal) {
    isMobile.value = nextVal;
  }
};

let mql = null;

const layout = computed(() => computePageLayout(state.draft.items, state.draft.settings));

function handleNineSample() {
  if (state.draft.settings.dictMode === 'cloze') {
    state.draft.items = DEFAULT_CLOZE_WORDS_RAW.map(s => createDraftItem(s));
    state.draft.settings.columns = 2;
    state.draft.settings.copiesPerPage = 2;
    state.draft.settings.wordsPerPage = 9;
  } else {
    state.draft.items = DEFAULT_WORDS_RAW.map(w => createDraftItem(w));
    state.draft.settings.wordsPerPage = 9;
    state.draft.settings.copiesPerPage = 3;
    state.draft.settings.columns = 3;
  }
}

function handleG4Sample() {
  state.draft.items = [
    { en: 'classroom', zh: '教室' },
    { en: 'window', zh: '窗户' },
    { en: 'blackboard', zh: '黑板' },
    { en: 'light', zh: '电灯' },
    { en: 'picture', zh: '图画' },
    { en: 'door', zh: '门' }
  ].map(w => createDraftItem(w));
  state.draft.settings.title = 'Unit 1 My classroom 单词默写';
  state.draft.settings.columns = 1;
  state.draft.settings.copiesPerPage = 1;
  state.draft.settings.wordsPerPage = 10;
  state.draft.settings.gridLinesPerWord = 1;
}

function handleReplaceCustom() {
  document.getElementById('btnParseText')?.click();
}

function handleAlphabet26Sample() {
  state.draft.settings.dictMode = 'alphabet';
  state.draft.settings.title = 'PEP三年级英语 26个英文字母规范书写卷 (大小写)';
  state.draft.settings.columns = 3;
  state.draft.settings.copiesPerPage = 1;
  state.draft.items = generateAlphabetSequenceItems({ caseStyle: 'pair', subMode: 'full' });
}

function handleAlphabetNeighborsSample() {
  state.draft.settings.dictMode = 'alphabet';
  state.draft.settings.title = 'PEP三年级英语 字母左右邻居专项练习卷';
  state.draft.settings.columns = 3;
  state.draft.settings.copiesPerPage = 3;
  state.draft.items = generateLetterNeighborsItems({ count: 9, caseStyle: 'upper', neighborType: 'both' });
}

function handleAlphabetCaseSample() {
  state.draft.settings.dictMode = 'alphabet';
  state.draft.settings.title = 'PEP三年级英语 字母大小写转换专项练习卷';
  state.draft.settings.columns = 3;
  state.draft.settings.copiesPerPage = 3;
  state.draft.items = generateCaseConversionItems({ count: 9, direction: 'random_switch' });
}

onMounted(async () => {
  window.addEventListener('resize', updateMobileStatus, { passive: true });
  window.addEventListener('orientationchange', updateMobileStatus, { passive: true });
  if (window.screen && window.screen.orientation) {
    window.screen.orientation.addEventListener('change', updateMobileStatus);
  }
  if (typeof window.matchMedia === 'function') {
    mql = window.matchMedia('(max-width: 768px)');
    mql.addEventListener?.('change', updateMobileStatus);
  }

  registerDebugKeyboardListener();
  loadSavedState();
  await loadLibraryFromDB();
  window._setG4Sample = handleG4Sample;
  window._setAlphabet26Sample = handleAlphabet26Sample;
  window._setAlphabetNeighborsSample = handleAlphabetNeighborsSample;
  window._setAlphabetCaseSample = handleAlphabetCaseSample;
  window._setIsMobile = (val) => { isMobile.value = val; };
  window._getIsMobile = () => isMobile.value;
});

onUnmounted(() => {
  window.removeEventListener('resize', updateMobileStatus);
  window.removeEventListener('orientationchange', updateMobileStatus);
  if (window.screen && window.screen.orientation) {
    window.screen.orientation.removeEventListener('change', updateMobileStatus);
  }
  mql?.removeEventListener?.('change', updateMobileStatus);
  unregisterDebugKeyboardListener();
});
</script>

<style>
:root {
  --primary: #2f6659;
  --primary-hover: #255247;
  --primary-light: #e8f0ed;
  --primary-border: #b9cec7;

  --text-main: #26332f;
  --text-muted: #68756f;
  --text-light: #909b96;

  --bg-app: #f3f5f2;
  --bg-sidebar: #fafbf9;
  --bg-card: #ffffff;

  --border-color: #c9d3ce;
  --border-light: #e2e7e4;

  --accent: #b7792b;
  --success: #43866f;
  --danger: #c5524a;
  --danger-hover: #a9443e;
}

/* 全局基础重置与排版规范 */
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: var(--text-main);
  background: var(--bg-app);
  -webkit-font-smoothing: antialiased;
}

.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-workspace {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* 打印媒介专精配置 */
@media print {
  .no-print,
  .app-header,
  .sidebar,
  .preview-toolbar {
    display: none !important;
  }

  body,
  .app-layout,
  .app-workspace,
  .preview-viewport,
  .paper-stage {
    background: #ffffff !important;
    padding: 0 !important;
    margin: 0 !important;
    overflow: visible !important;
    height: auto !important;
  }

  .sheets-stream-container {
    transform: none !important;
    gap: 0 !important;
    display: block !important;
  }

  .sheet-page {
    box-shadow: none !important;
    margin: 0 !important;
    page-break-after: always !important;
    break-after: page !important;
  }
}

/* 试卷列表项强保底样式 (彻底根治图一样式丢失) */
.word-item-row,
.word-chip {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 7px 10px !important;
  background: var(--bg-sidebar, #fafbf9) !important;
  border: 1px solid var(--border-light, #e2e7e4) !important;
  border-radius: 6px !important;
  font-size: 12.5px !important;
  margin-bottom: 6px !important;
  box-sizing: border-box !important;
  transition: all 0.15s ease !important;
}

.word-item-row:hover,
.word-chip:hover {
  background: var(--bg-card, #ffffff) !important;
  border-color: var(--primary-border, #b9cec7) !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
}

.word-item-main {
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  text-align: left !important;
  gap: 2px !important;
  flex: 1 1 0% !important;
  min-width: 0 !important;
  overflow: hidden !important;
}

.word-primary-line {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  text-align: left !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.word-item-index {
  color: var(--primary, #2f6659) !important;
  font-weight: 600 !important;
  font-size: 11.5px !important;
  min-width: 20px !important;
  flex-shrink: 0 !important;
}

.word-item-en,
.word-chip-en {
  font-weight: 600 !important;
  color: var(--text-main, #26332f) !important;
  max-width: 100% !important;
  text-align: left !important;
  display: inline-block !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.word-item-zh,
.word-chip-zh {
  color: var(--text-muted, #68756f) !important;
  font-size: 12px !important;
  max-width: 100% !important;
  text-align: left !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.word-item-actions {
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  flex-shrink: 0 !important;
}

.word-item-btn {
  background: var(--bg-app, #f3f5f2) !important;
  border: 1px solid var(--border-color, #c9d3ce) !important;
  border-radius: 4px !important;
  padding: 2px 6px !important;
  font-size: 11px !important;
  line-height: 1.2 !important;
  color: var(--text-muted, #68756f) !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.word-item-btn:hover {
  background: var(--primary-light, #e8f0ed) !important;
  color: var(--primary, #2f6659) !important;
  border-color: var(--primary, #2f6659) !important;
}

.word-item-btn.del:hover {
  background: #faeceb !important;
  color: var(--danger, #c5524a) !important;
  border-color: var(--danger, #c5524a) !important;
}

/* 26个英文字母 3 行 9 列完整四线格专属排版 (满足第5条需求) */
.alphabet-26-sheet-container {
  display: flex;
  flex-direction: column;
  gap: 5mm;
  width: 100%;
  margin-top: 3mm;
}

.alpha-26-grid-row {
  display: flex;
  width: 100%;
  box-sizing: border-box;
}

.alpha-26-cell {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background: #ffffff;
  padding: 0;
  margin: 0;
}

.alphabet-26-section-block {
  display: block;
  width: 100%;
}

.alpha-cell-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px 1mm 2px;
  box-sizing: border-box;
  line-height: 1.2;
}

.alpha-cell-top .entry-index {
  font-weight: 400;
  color: #64748b;
  font-size: 0.9em;
  font-family: 'Times New Roman', Times, serif;
}

.alpha-dummy-cell .dummy-entry-placeholder {
  visibility: hidden !important;
  user-select: none !important;
  pointer-events: none !important;
}

.alpha-cell-top .alpha-dummy-star {
  font-size: 0.8em;
  color: #cbd5e1;
  font-weight: 600;
  margin-left: auto;
}

.alpha-cell-grid {
  width: 100%;
}

.alpha-cell-grid svg {
  display: block;
  width: 100%;
}

/* 字母左右邻居与大小写转换专属排版 (满足第4条需求) */
.neighbor-svg-grid,
.case-svg-grid {
  width: 100%;
  display: block;
}

/* 句子挖空模式排版与中文位置样式 */
.word-card.cloze-card-inline {
  width: 100%;
}

.word-card.cloze-card-inline .meaning.word-prompt-row {
  display: flex !important;
  align-items: baseline !important;
  flex-wrap: nowrap !important;
  min-width: 0;
}

.cloze-content-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.cloze-sentence {
  line-height: 1.65;
  color: #1e293b;
}

.cloze-blank-line {
  display: inline-block;
  border-bottom: 1.5px solid #0f172a;
  min-width: 50px;
  margin: 0 3px;
  vertical-align: baseline;
}

.cloze-blank-line.cloze-inline-grid {
  height: 1.75em;
  vertical-align: middle;
  display: inline-flex;
  align-items: center;
  max-width: 100%;
}

.cloze-blank-line.cloze-inline-grid svg {
  width: 100%;
  height: 100%;
  display: block;
}

.cloze-zh {
  font-size: 0.84em;
  color: #475569;
}

.cloze-zh.pos-below {
  display: block !important;
  margin-top: 2.5px;
  line-height: 1.35;
  color: #475569;
  font-weight: 400;
}

.cloze-zh.pos-above {
  display: block !important;
  margin-bottom: 2.5px;
  line-height: 1.35;
  color: #475569;
  font-weight: 400;
}

.cloze-zh.pos-right {
  display: inline !important;
  margin-left: 6px;
  font-weight: 400;
}
</style>
