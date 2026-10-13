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
    primaryColor: '#0284c7',
    primaryColorHover: '#0369a1',
    primaryColorPressed: '#0c4a6e',
    primaryColorSuppl: '#38bdf8',
    borderRadius: '6px'
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
/* 全局基础重置与排版规范 */
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #1e293b;
  background: #f1f5f9;
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
