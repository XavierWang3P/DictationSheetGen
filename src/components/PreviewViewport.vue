<template>
  <main class="preview-viewport" id="previewViewport" data-debug-id="P-001" data-debug-name="试卷预览视口">
    <!-- 浮动缩放与状态栏 -->
    <div class="preview-toolbar" data-debug-id="P-003" data-debug-name="预览缩放与控制栏">
      <span class="preview-mode-tag" id="previewModeTag">
        <AppIcon name="file-text" :size="14" />
        {{ layout.paperDim.name }} {{ layout.isLandscape ? '横向' : '纵向' }} ·
        {{ modeLabel }} · {{ copyLabel }} · 共 {{ renderedPageCount }} 页
      </span>

      <div class="zoom-group">
        <n-button-group size="small">
          <n-tooltip :show-arrow="false" placement="top">
            <template #trigger>
              <n-button id="btnZoomOut" aria-label="缩小预览" @click="handleZoomOut">
                <template #icon><AppIcon name="minus" :size="15" /></template>
              </n-button>
            </template>
            缩小预览
          </n-tooltip>
          <n-button dashed style="cursor: default;" id="zoomValText">{{ Math.round(state.ui.zoom * 100) }}%</n-button>
          <n-tooltip :show-arrow="false" placement="top">
            <template #trigger>
              <n-button id="btnZoomIn" aria-label="放大预览" @click="handleZoomIn">
                <template #icon><AppIcon name="plus" :size="15" /></template>
              </n-button>
            </template>
            放大预览
          </n-tooltip>
        </n-button-group>

        <n-button size="small" id="btnZoomFit" :type="state.ui.isZoomFit ? 'primary' : 'default'" @click="handleZoomFit">
          适合宽度
        </n-button>
        <n-button size="small" id="btnZoom100" @click="handleZoom100">
          100%
        </n-button>
      </div>
    </div>

    <!-- 当右侧排版面板折叠时，提供常驻浮动展开入口 -->
    <button
      v-if="state.ui.isSettingsCollapsed"
      type="button"
      class="btn-expand-inspector-floating no-print"
      id="btnFloatingExpandSettings"
      @click="state.ui.isSettingsCollapsed = false"
      title="展开右侧试卷排版面板"
      aria-label="展开试卷排版"
    >
      <AppIcon name="settings" :size="14" />
      <span>排版</span>
    </button>

    <!-- 排版检测助手横幅 (当一页多份题目溢出到第二页时提示) -->
    <div
      v-if="overflowDetected"
      class="layout-assistant-banner no-print"
      id="layoutAssistantBanner"
      data-debug-id="P-004"
      data-debug-name="排版检测助手提示条"
    >
      <div class="assistant-content">
        <AppIcon name="alert-circle" :size="16" class="assistant-icon" />
        <span class="assistant-text">
          <strong>排版助手提示：</strong>当前每联 {{ state.draft.items.length }} 题超出一联空间，已溢出到第 {{ layout.totalPages || layout.pages?.length || 1 }} 页。建议减少每页份数以保证裁切为单页。
        </span>
      </div>
      <div class="assistant-actions">
        <button
          v-if="state.draft.settings.copiesPerPage === 3"
          type="button"
          class="assistant-btn"
          id="btnSwitchTo2Copies"
          @click="switchToCopies(2)"
        >
          切换为一页 2 份
        </button>
        <button
          type="button"
          class="assistant-btn"
          id="btnSwitchTo1Copy"
          @click="switchToCopies(1)"
        >
          切换为全页 1 份
        </button>
        <button
          type="button"
          class="assistant-btn primary"
          id="btnAutoFitCopies"
          @click="autoFitCopies"
        >
          ⚡ 一键自动适配单页
        </button>
      </div>
    </div>

    <!-- 纸张展示容器 -->
    <div class="paper-stage" id="paperStage" ref="stageRef" data-debug-id="P-002" data-debug-name="试卷纸张渲染舞台">
      <div
        class="sheets-stream-container"
        id="sheetsStreamContainer"
        :style="{ transform: `scale(${state.ui.zoom})` }"
        v-html="sheetHtml"
      ></div>
    </div>
  </main>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { NButtonGroup, NButton, NTooltip } from 'naive-ui';
import { state } from '../stores/appStore.js';
import { computePageLayout, renderPracticeSheetHtml, PAPER_SIZES } from '../core/layout.js';
import AppIcon from './AppIcon.vue';

const stageRef = ref(null);

const layout = computed(() => computePageLayout(state.draft.items, state.draft.settings));
const sheetHtml = computed(() => renderPracticeSheetHtml(layout.value, state.draft.settings));
const renderedPageCount = computed(() => layout.value.totalPages * (state.draft.settings.showAnswerPage ? 2 : 1));

const overflowDetected = computed(() => {
  if (state.draft.settings.autoOptimizeCopies === false) return false;
  const copies = Number(state.draft.settings.copiesPerPage) || 1;
  const total = layout.value?.totalPages || layout.value?.pages?.length || 1;
  return copies > 1 && total > 1;
});

function switchToCopies(count) {
  state.draft.settings.copiesPerPage = count;
  if (state.draft.items.length > 0) {
    state.draft.settings.wordsPerPage = Math.max(state.draft.settings.wordsPerPage || 9, state.draft.items.length);
  }
}

function autoFitCopies() {
  const currentCopies = Number(state.draft.settings.copiesPerPage) || 1;
  if (state.draft.items.length > 0) {
    state.draft.settings.wordsPerPage = Math.max(state.draft.settings.wordsPerPage || 9, state.draft.items.length);
  }
  if (currentCopies === 3) {
    const test2 = computePageLayout(state.draft.items, { ...state.draft.settings, copiesPerPage: 2 });
    const total2 = test2.totalPages || test2.pages?.length || 1;
    if (total2 === 1) {
      state.draft.settings.copiesPerPage = 2;
      return;
    }
  }
  state.draft.settings.copiesPerPage = 1;
}

const modeLabel = computed(() => {
  if (state.draft.settings.dictMode === 'alphabet') return '三年级字母专项';
  if (state.draft.settings.dictMode === 'cloze') return '句子挖空填写';
  if (state.draft.settings.dictMode === 'sentence') return '句子默写';
  return '看中文默写';
});

const copyLabel = computed(() => {
  const c = layout.value.copiesPerPage;
  return c === 1 ? '全页 1 份' : (c === 2 ? '一页 2 份' : '一页 3 份');
});

function updateZoomFit() {
  if (!state.ui.isZoomFit || !stageRef.value) return;
  const stageW = stageRef.value.clientWidth - 48;
  const isLand = (state.draft.settings.orientation === 'landscape');
  const pDim = PAPER_SIZES[state.draft.settings.paperSize || 'A4'] || PAPER_SIZES.A4;
  const pageWidthMm = isLand ? pDim.height : pDim.width;
  const pageWidthPx = pageWidthMm * 3.7795;
  let scale = (stageW / pageWidthPx) * 0.95;
  if (scale > 1.25) scale = 1.25;
  if (scale < 0.25) scale = 0.25;
  state.ui.zoom = Math.round(scale * 100) / 100;
}

function handleZoomIn() {
  state.ui.isZoomFit = false;
  state.ui.zoom = Math.min(1.8, Math.round((state.ui.zoom + 0.1) * 10) / 10);
}

function handleZoomOut() {
  state.ui.isZoomFit = false;
  state.ui.zoom = Math.max(0.3, Math.round((state.ui.zoom - 0.1) * 10) / 10);
}

function handleZoomFit() {
  state.ui.isZoomFit = true;
  updateZoomFit();
}

function handleZoom100() {
  state.ui.isZoomFit = false;
  state.ui.zoom = 1.0;
}

watch(
  () => [
    state.draft.settings.paperSize,
    state.draft.settings.orientation,
    state.ui.isSidebarCollapsed,
    state.ui.isSettingsCollapsed
  ],
  () => {
    if (state.ui.isZoomFit) {
      setTimeout(updateZoomFit, 260);
    }
  }
);

onMounted(() => {
  window.addEventListener('resize', updateZoomFit);
  setTimeout(updateZoomFit, 200);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateZoomFit);
});
</script>

<style scoped>
.preview-viewport {
  flex: 1;
  background: var(--bg-app);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.preview-toolbar {
  height: 48px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
  z-index: 10;
}

.preview-mode-tag {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.zoom-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.paper-stage {
  flex: 1;
  overflow: auto;
  padding: 30px 20px 80px 20px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  box-sizing: border-box;
}

.sheets-stream-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  transform-origin: top center;
  transition: transform 0.15s ease-out;
}

.btn-expand-inspector-floating {
  position: absolute;
  right: 0;
  top: 64px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-right: none;
  border-radius: 6px 0 0 6px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
  box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  z-index: 20;
  transition: all 0.2s ease;
}

.btn-expand-inspector-floating:hover {
  background: var(--primary-light);
  color: var(--primary-hover);
  padding-right: 14px;
}
</style>
