<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <div class="app-layout">
          <!-- 动态打印样式注入 -->
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
          </div>

          <!-- 兼容旧测试脚本与新功能专用隐藏桩按钮 -->
          <div style="display:none;">
            <button id="btnLoadSampleG4" @click="handleG4Sample"></button>
            <button id="btnLoadSampleNine" @click="handleNineSample"></button>
            <button id="btnReplaceCustom" @click="handleReplaceCustom"></button>
            <button id="btnLoadAlphabet26" @click="handleAlphabet26Sample"></button>
            <button id="btnLoadAlphabetNeighbors" @click="handleAlphabetNeighborsSample"></button>
            <button id="btnLoadAlphabetCase" @click="handleAlphabetCaseSample"></button>
          </div>
        </div>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { NConfigProvider, NMessageProvider, NDialogProvider } from 'naive-ui';
import { state, loadSavedState, loadLibraryFromDB } from './stores/appStore.js';
import { computePageLayout, createDraftItem } from './core/layout.js';
import AppHeader from './components/AppHeader.vue';
import SidebarTabs from './components/SidebarTabs.vue';
import PreviewViewport from './components/PreviewViewport.vue';

import {
  generateAlphabetSequenceItems,
  generateLetterNeighborsItems,
  generateCaseConversionItems
} from './core/alphabet.js';

const layout = computed(() => computePageLayout(state.draft.items, state.draft.settings));

const themeOverrides = {
  common: {
    primaryColor: '#2f6659',
    primaryColorHover: '#255247',
    primaryColorPressed: '#1d3e36',
    primaryColorSuppl: '#e8f0ed',

    infoColor: '#2f6659',
    infoColorHover: '#255247',
    infoColorPressed: '#1d3e36',
    infoColorSuppl: '#e8f0ed',

    successColor: '#43866f',
    successColorHover: '#38705d',
    successColorPressed: '#2c594a',
    successColorSuppl: '#eaf3f0',

    warningColor: '#b7792b',
    warningColorHover: '#9c6623',
    warningColorPressed: '#7d521a',
    warningColorSuppl: '#faefe0',

    errorColor: '#c5524a',
    errorColorHover: '#a9443e',
    errorColorPressed: '#8c352f',
    errorColorSuppl: '#faeceb',

    textColorBase: '#26332f',
    textColor1: '#26332f',
    textColor2: '#68756f',
    textColor3: '#909b96',

    bodyColor: '#f3f5f2',
    cardColor: '#ffffff',
    borderColor: '#c9d3ce',
    dividerColor: '#e2e7e4',
    borderRadius: '6px'
  },
  Button: {
    textColorPrimary: '#ffffff',
    colorGhostPrimary: 'transparent',
    textColorGhostPrimary: '#2f6659',
    borderGhostPrimary: '1px solid #2f6659',
    textColorGhostHoverPrimary: '#255247',
    borderGhostHoverPrimary: '1px solid #255247'
  },
  Badge: {
    colorInfo: '#e8f0ed',
    textColorInfo: '#2f6659',
    colorSuccess: '#eaf3f0',
    textColorSuccess: '#43866f'
  }
};

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

function handleNineSample() {
  document.getElementById('btnLoadDefaultSample')?.click();
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
  loadSavedState();
  await loadLibraryFromDB();
  window._setG4Sample = handleG4Sample;
  window._setAlphabet26Sample = handleAlphabet26Sample;
  window._setAlphabetNeighborsSample = handleAlphabetNeighborsSample;
  window._setAlphabetCaseSample = handleAlphabetCaseSample;
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
  align-items: center !important;
  gap: 8px !important;
  flex: 1 !important;
  min-width: 0 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
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
  flex-shrink: 0 !important;
}

.word-item-zh,
.word-chip-zh {
  color: var(--text-muted, #68756f) !important;
  font-size: 12px !important;
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

.alpha-cell-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px 2px 2px;
  font-size: 8pt;
  line-height: 1.2;
}

.alpha-cell-top .entry-index {
  font-weight: normal;
  color: #94a3b8;
  font-size: 7.5pt;
}

.alpha-cell-top .alpha-cell-hint {
  font-size: 7.5pt;
  color: var(--primary, #2f6659);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  align-items: flex-start !important;
  flex-wrap: nowrap !important;
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
  height: 9.5mm;
  vertical-align: bottom;
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
