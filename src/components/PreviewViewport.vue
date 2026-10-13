<template>
  <main class="preview-viewport" id="previewViewport">
    <!-- 浮动缩放与状态栏 -->
    <div class="preview-toolbar">
      <span class="preview-mode-tag" id="previewModeTag">
        📄 {{ layout.paperDim.name }} {{ layout.isLandscape ? '横向' : '纵向' }} ·
        {{ modeLabel }} · {{ copyLabel }} · 共 {{ layout.totalPages }} 页
      </span>

      <div class="zoom-group">
        <n-button-group size="small">
          <n-button id="btnZoomOut" @click="handleZoomOut" title="缩小预览">-</n-button>
          <n-button dashed style="cursor: default;" id="zoomValText">{{ Math.round(state.ui.zoom * 100) }}%</n-button>
          <n-button id="btnZoomIn" @click="handleZoomIn" title="放大预览">+</n-button>
        </n-button-group>

        <n-button size="small" id="btnZoomFit" :type="state.ui.isZoomFit ? 'primary' : 'default'" @click="handleZoomFit">
          适合宽度
        </n-button>
        <n-button size="small" id="btnZoom100" @click="handleZoom100">
          100%
        </n-button>
      </div>
    </div>

    <!-- 纸张展示容器 -->
    <div class="paper-stage" id="paperStage" ref="stageRef">
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
import { NButtonGroup, NButton } from 'naive-ui';
import { state } from '../stores/appStore.js';
import { computePageLayout, renderPracticeSheetHtml, PAPER_SIZES } from '../core/layout.js';

const stageRef = ref(null);

const layout = computed(() => computePageLayout(state.draft.items, state.draft.settings));
const sheetHtml = computed(() => renderPracticeSheetHtml(layout.value, state.draft.settings));

const modeLabel = computed(() => {
  if (state.draft.settings.dictMode === 'alphabet') return '三年级字母默写';
  if (state.draft.settings.dictMode === 'cloze') return '句子挖空填写';
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
  () => [state.draft.settings.paperSize, state.draft.settings.orientation, state.ui.isSidebarCollapsed],
  () => {
    if (state.ui.isZoomFit) {
      setTimeout(updateZoomFit, 200);
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

<style>
/* 试卷真实比例排版样式 */
.sheet-page {
  background: #ffffff;
  box-shadow: 0 4px 20px rgba(38, 51, 47, 0.08);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  page-break-after: always;
}

.sheet-copy-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
}

.sheet-copy-section.single-copy {
  padding: 6mm 0;
}

.sheet-copy-section.multi-copy {
  padding: 2mm 0;
}

.sheet-header {
  margin-bottom: 2mm;
  flex-shrink: 0;
}

.sheet-title-text {
  margin: 0 0 2mm 0;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: 0.5px;
  line-height: 1.25;
}

.compact-info {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  font-size: 10.5pt;
  color: #334155;
  margin-bottom: 2mm;
  flex-wrap: wrap;
}

.info-item {
  display: inline-flex;
  align-items: flex-end;
  font-size: 10.5pt;
  color: #334155;
}

.info-line {
  display: inline-block;
  border-bottom: 1.2px solid #334155;
  margin-left: 4px;
}

.info-line-name {
  min-width: 105px;
}

.info-line-class {
  min-width: 90px;
}

.info-line-no {
  min-width: 55px;
}

.info-line-date {
  min-width: 75px;
}

.info-line-score {
  min-width: 45px;
}

.section-cut-divider {
  width: 100%;
  position: relative;
  margin: 1.5mm 0;
  flex-shrink: 0;
}

.section-cut-divider.dashed {
  border-top: 1px dashed #94a3b8;
}

.section-cut-divider.solid {
  border-top: 1px solid #94a3b8;
}

.section-cut-divider.none {
  border-top: none;
}

.cut-scissors-tag {
  position: absolute;
  top: -9px;
  right: 12mm;
  background: #ffffff;
  padding: 0 6px;
  font-size: 9.5px;
  color: #64748b;
  line-height: 16px;
}

.sheet-body-grid {
  display: grid;
  flex: 1;
  align-content: start;
}

.word-entry-item {
  box-sizing: border-box;
}

.meaning {
  color: #1e293b;
  line-height: 1.35;
  margin-bottom: 1.2mm;
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
}

.word-num {
  font-weight: 400; /* 题号保持不加粗 */
  margin-right: 4px;
  color: #334155;
}

.entry-zh-hint {
  font-weight: 500;
}

.cloze-blank-line {
  display: inline-block;
  border-bottom: 1.5px solid #0f172a;
  min-width: 60px;
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
  font-size: 0.85em;
  color: #475569;
  margin-left: 6px;
}

.four-line-svg {
  width: 100%;
  display: block;
}

.single-line-svg {
  width: 100%;
  display: block;
}
</style>

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
</style>
