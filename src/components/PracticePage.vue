<template>
  <div
    class="sheet-page"
    :class="{ landscape: isLandscape }"
    :style="pageStyle"
  >
    <template v-for="(copyIndex) in copiesPerPage" :key="copyIndex">
      <!-- 裁切分割线 -->
      <div
        v-if="copyIndex > 1"
        class="section-cut-divider"
        :class="settings.dividerStyle"
      >
        <span v-if="settings.showCutGuide" class="cut-scissors-tag">沿虚线裁切分发</span>
      </div>

      <!-- 单份练习卷主体 -->
      <div class="sheet-copy-section" :class="copiesPerPage > 1 ? 'multi-copy' : 'single-copy'">
        <!-- 卷头与考生信息 -->
        <div class="sheet-header">
          <h1
            class="sheet-title-text"
            :style="{
              fontSize: effectiveTitleFontSize,
              textAlign: settings.titleAlign || 'center',
              fontFamily: settings.fontFamilyZh
            }"
          >
            {{ settings.title || 'Unit 1 黑体词默写' }}
          </h1>

          <div v-if="hasStudentInfo" class="compact-info">
            <span v-if="settings.showStudentName" class="info-tag-inline">
              姓名<span class="info-line info-line-name"></span>
            </span>
            <span v-if="settings.showStudentClass" class="info-tag-inline">
              班级<span class="info-line info-line-class"></span>
            </span>
            <span v-if="settings.showStudentNo" class="info-tag-inline">
              座号<span class="info-line info-line-no"></span>
            </span>
            <span v-if="settings.showStudentDate" class="info-tag-inline">
              日期<span class="info-line info-line-date"></span>
            </span>
            <span v-if="settings.showStudentScore" class="info-tag-inline">
              得分<span class="info-line info-line-score"></span>
            </span>
          </div>
        </div>

        <!-- 单词 / 句子网格 -->
        <div class="sheet-body-grid" :style="gridStyle">
          <div
            v-for="(item, idx) in chunk"
            :key="item.id || idx"
            class="word-entry-item"
            :class="[
              isLeftLayout ? 'layout-left' : 'layout-top',
              isClozeMode ? 'mode-cloze' : 'mode-writing'
            ]"
          >
            <!-- 模式 1：看中文默写 -->
            <template v-if="!isClozeMode">
              <div
                class="meaning word-prompt-row"
                :style="{
                  fontSize: `${effectivePromptSize}pt`,
                  fontFamily: settings.fontFamilyZh
                }"
              >
                <span class="word-num entry-index">{{ getGlobalIndex(idx) }}.</span>
                <span class="prompt-text">{{ item.zh || '' }}</span>
                <span v-if="item.phonetic" class="prompt-phonetic">[{{ item.phonetic }}]</span>
              </div>

              <div class="grid-container">
                <PracticeGridSvg
                  :height-mm="settings.gridHeight || 12"
                  :stroke="settings.gridStroke || 0.85"
                  :color="settings.gridColor || '#cbd5e1'"
                  :style-type="settings.gridStyle || 'four-line'"
                  :show-vertical="settings.showVerticalBorder"
                />
              </div>
            </template>

            <!-- 模式 2：句子挖空填写 -->
            <template v-else>
              <template v-if="settings.clozeStyle === 'inline'">
                <div
                  class="meaning word-prompt-row cloze-inline-wrap"
                  :style="{
                    fontSize: `${effectivePromptSize}pt`,
                    fontFamily: settings.fontFamilyZh
                  }"
                >
                  <span class="word-num entry-index">{{ getGlobalIndex(idx) }}.</span>
                  <span class="cloze-sentence-content" :style="{ fontFamily: settings.fontFamilyEn }">
                    <template v-for="(seg, sIdx) in item.segments" :key="sIdx">
                      <span v-if="seg.blank" class="cloze-blank-line">
                        <span class="cloze-hidden-text">{{ seg.text }}</span>
                      </span>
                      <span v-else class="cloze-plain-text">{{ seg.text }}</span>
                    </template>
                  </span>
                  <span v-if="item.zh || item.translation" class="cloze-zh-hint" :style="{ fontFamily: settings.fontFamilyZh }">
                    {{ stripOuterBrackets(item.zh || item.translation) }}
                  </span>
                </div>
              </template>

              <template v-else>
                <!-- 句下独立书写格 -->
                <div
                  class="meaning word-prompt-row"
                  :style="{
                    fontSize: `${effectivePromptSize}pt`,
                    fontFamily: settings.fontFamilyZh
                  }"
                >
                  <span class="word-num entry-index">{{ getGlobalIndex(idx) }}.</span>
                  <span :style="{ fontFamily: settings.fontFamilyEn }">
                    <template v-for="(seg, sIdx) in item.segments" :key="sIdx">
                      <span v-if="seg.blank" class="cloze-blank-line">
                        <span class="cloze-hidden-text">{{ seg.text }}</span>
                      </span>
                      <span v-else>{{ seg.text }}</span>
                    </template>
                  </span>
                  <span v-if="item.zh || item.translation" style="margin-left:6px; color:#475569;">
                    {{ stripOuterBrackets(item.zh || item.translation) }}
                  </span>
                </div>
                <div class="grid-container" style="margin-top: 2mm;">
                  <PracticeGridSvg
                    :height-mm="settings.gridHeight || 12"
                    :stroke="settings.gridStroke || 0.85"
                    :color="settings.gridColor || '#cbd5e1'"
                    :style-type="settings.gridStyle || 'four-line'"
                    :show-vertical="settings.showVerticalBorder"
                  />
                </div>
              </template>
            </template>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import PracticeGridSvg from './PracticeGridSvg.vue';
import { stripOuterBrackets } from '../core/layout.js';

const props = defineProps({
  chunk: {
    type: Array,
    default: () => []
  },
  pageIndex: {
    type: Number,
    default: 0
  },
  settings: {
    type: Object,
    required: true
  },
  pageWidthMm: {
    type: Number,
    default: 210
  },
  pageHeightMm: {
    type: Number,
    default: 297
  },
  isLandscape: {
    type: Boolean,
    default: false
  }
});

const copiesPerPage = computed(() => parseInt(props.settings.copiesPerPage, 10) || 3);
const isClozeMode = computed(() => props.settings.dictMode === 'cloze');
const isLeftLayout = computed(() => props.settings.zhPosition === 'left' && !isClozeMode.value);

const hasStudentInfo = computed(() => {
  const s = props.settings;
  return s.showStudentName || s.showStudentClass || s.showStudentNo || s.showStudentDate || s.showStudentScore;
});

const effectiveTitleFontSize = computed(() => {
  const cur = props.settings.titleFontSize || '18pt';
  if (copiesPerPage.value > 1) {
    const num = parseFloat(cur);
    return `${Math.min(18, num)}pt`;
  }
  return cur;
});

const effectivePromptSize = computed(() => {
  return Number(props.settings.promptFontSize) || 14;
});

const pageStyle = computed(() => ({
  width: `${props.pageWidthMm}mm`,
  height: `${props.pageHeightMm}mm`,
  minHeight: `${props.pageHeightMm}mm`,
  maxHeight: `${props.pageHeightMm}mm`,
  fontFamily: props.settings.fontFamilyZh,
  padding: `${props.settings.pageMargin}mm 12mm ${Math.max(5, props.settings.pageMargin - 2)}mm 12mm`
}));

const gridStyle = computed(() => {
  const effectiveRowGap = (copiesPerPage.value > 1 && isClozeMode.value)
    ? Math.min(2.5, props.settings.rowGap || 3.5)
    : (props.settings.rowGap || 3.5);

  return {
    gridTemplateColumns: `repeat(${props.settings.columns || 3}, 1fr)`,
    columnGap: `${props.settings.colGap || 6}mm`,
    rowGap: `${effectiveRowGap}mm`
  };
});

function getGlobalIndex(idx) {
  const wordsPerPage = parseInt(props.settings.wordsPerPage, 10) || 9;
  return props.pageIndex * wordsPerPage + idx + 1;
}
</script>

<style scoped>
.sheet-page {
  background: #ffffff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
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

.info-tag-inline {
  display: inline-flex;
  align-items: flex-end;
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

.word-entry-item.layout-top {
  display: flex;
  flex-direction: column;
}

.word-entry-item.layout-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.word-entry-item.layout-left .meaning {
  flex: 0 0 35%;
  margin-bottom: 0 !important;
}

.word-entry-item.layout-left .grid-container {
  flex: 1;
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

.prompt-text {
  font-weight: 500;
}

.prompt-phonetic {
  font-size: 0.85em;
  color: #64748b;
  margin-left: 4px;
}

.cloze-blank-line {
  display: inline-block;
  border-bottom: 1.5px solid #0f172a;
  min-width: 60px;
  margin: 0 3px;
  vertical-align: baseline;
}

.cloze-hidden-text {
  visibility: hidden;
  font-size: 1em;
}

.cloze-plain-text {
  font-weight: 400;
}

.cloze-zh-hint {
  font-size: 0.85em;
  color: #475569;
  margin-left: 6px;
}
</style>
