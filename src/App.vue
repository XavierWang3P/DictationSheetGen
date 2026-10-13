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

          <!-- 兼容旧测试脚本专用隐藏桩按钮 -->
          <div style="display:none;">
            <button id="btnLoadSampleG4" @click="handleG4Sample"></button>
            <button id="btnLoadSampleNine" @click="handleNineSample"></button>
            <button id="btnReplaceCustom" @click="handleReplaceCustom"></button>
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

onMounted(async () => {
  loadSavedState();
  await loadLibraryFromDB();
  window._setG4Sample = handleG4Sample;
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
</style>
