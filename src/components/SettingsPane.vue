<template>
  <div class="settings-pane" data-debug-id="S-004" data-debug-name="试卷排版设置">
    <!-- 【分组一：纸张与版面】 -->
    <section
      class="settings-group"
      id="groupPageSettings"
      data-debug-id="S-001"
      data-debug-name="纸张与版面"
    >
      <div class="group-header">
        <div class="group-title-wrap">
          <AppIcon name="file-text" :size="15" />
          <span class="group-title">纸张与版面</span>
        </div>
      </div>

      <div class="group-body">
        <!-- 纸张规格 (A4 / B4 / 8K / A3) -->
        <div class="form-row">
          <label>纸张规格</label>
          <div class="compact-segmented">
            <input
              type="radio"
              name="paperSize"
              id="sizeA4"
              value="A4"
              :checked="state.draft.settings.paperSize === 'A4'"
              @change="onPaperSizeChange('A4')"
            />
            <label for="sizeA4">A4</label>
            <input
              type="radio"
              name="paperSize"
              id="sizeB4"
              value="B4"
              :checked="state.draft.settings.paperSize === 'B4'"
              @change="onPaperSizeChange('B4')"
            />
            <label for="sizeB4">B4</label>
            <input
              type="radio"
              name="paperSize"
              id="size8K"
              value="8K"
              :checked="state.draft.settings.paperSize === '8K'"
              @change="onPaperSizeChange('8K')"
            />
            <label for="size8K">8K</label>
            <input
              type="radio"
              name="paperSize"
              id="sizeA3"
              value="A3"
              :checked="state.draft.settings.paperSize === 'A3'"
              @change="onPaperSizeChange('A3')"
            />
            <label for="sizeA3">A3</label>
          </div>
        </div>

        <!-- 纸张方向 (纵向 / 横向) -->
        <div class="form-row">
          <label>纸张方向</label>
          <div class="compact-segmented">
            <input
              type="radio"
              name="paperOrient"
              id="orientPortrait"
              value="portrait"
              :checked="state.draft.settings.orientation === 'portrait'"
              @change="onOrientationChange('portrait')"
            />
            <label for="orientPortrait">纵向</label>
            <input
              type="radio"
              name="paperOrient"
              id="orientLandscape"
              value="landscape"
              :checked="state.draft.settings.orientation === 'landscape'"
              @change="onOrientationChange('landscape')"
            />
            <label for="orientLandscape">横向</label>
          </div>
        </div>

        <!-- 横向对半折（左右双页拼版） -->
        <div class="form-row" v-if="state.draft.settings.orientation === 'landscape'">
          <label>版面拼版</label>
          <div class="compact-segmented">
            <input
              type="radio"
              name="splitFold"
              id="foldNormal"
              :value="false"
              :checked="!state.draft.settings.splitFold"
              @change="state.draft.settings.splitFold = false"
            />
            <label for="foldNormal">标准单页</label>
            <input
              type="radio"
              name="splitFold"
              id="foldSplit"
              :value="true"
              :checked="state.draft.settings.splitFold"
              @change="state.draft.settings.splitFold = true"
            />
            <label for="foldSplit">横向对半折（左右双页拼版）</label>
          </div>
        </div>

        <!-- 一页份数 / 多联拼版 (非对半折横向时显示) -->
        <div class="form-row" v-if="!state.draft.settings.splitFold">
          <label>一页联数</label>
          <div class="compact-segmented">
            <input
              type="radio"
              name="copiesPerPage"
              id="copy1"
              :value="1"
              :checked="Number(state.draft.settings.copiesPerPage) === 1"
              @change="onCopiesChange(1)"
            />
            <label for="copy1">1 份 (整页)</label>
            <input
              type="radio"
              name="copiesPerPage"
              id="copy2"
              :value="2"
              :checked="Number(state.draft.settings.copiesPerPage) === 2"
              @change="onCopiesChange(2)"
            />
            <label for="copy2">2 联</label>
            <input
              type="radio"
              name="copiesPerPage"
              id="copy3"
              :value="3"
              :checked="Number(state.draft.settings.copiesPerPage) === 3"
              @change="onCopiesChange(3)"
            />
            <label for="copy3">3 联</label>
            <input
              type="radio"
              name="copiesPerPage"
              id="copy4"
              :value="4"
              :checked="Number(state.draft.settings.copiesPerPage) === 4"
              @change="onCopiesChange(4)"
            />
            <label for="copy4">4 联</label>
            <input
              type="radio"
              name="copiesPerPage"
              id="copy6"
              :value="6"
              :checked="Number(state.draft.settings.copiesPerPage) === 6"
              @change="onCopiesChange(6)"
            />
            <label for="copy6">6 联</label>
          </div>
        </div>

        <!-- 试卷标题 -->
        <div class="form-row">
          <label>试卷主标题</label>
          <n-input
            v-model:value="state.draft.settings.title"
            id="inputSheetTitle"
            size="small"
            placeholder="请输入试卷标题"
            style="flex: 1; max-width: 250px;"
          />
        </div>

        <!-- 考生信息栏 -->
        <div class="form-row" style="align-items:flex-start;">
          <label style="margin-top:2px;">考生信息栏</label>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" id="checkName" v-model="state.draft.settings.showStudentName" /> 姓名
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="checkClass" v-model="state.draft.settings.showStudentClass" /> 班级
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="checkNo" v-model="state.draft.settings.showStudentNo" /> 座号
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="checkDate" v-model="state.draft.settings.showStudentDate" /> 日期
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="checkScore" v-model="state.draft.settings.showStudentScore" /> 得分
            </label>
          </div>
        </div>

        <!-- 教师答案版 -->
        <div class="form-row">
          <label>教师答案版</label>
          <label class="checkbox-label">
            <input type="checkbox" id="checkShowAnswerPage" v-model="state.draft.settings.showAnswerPage" />
            在学生卷后追加教师答案页
          </label>
        </div>

        <!-- 上下页边距 -->
        <div class="form-row">
          <label>上下页边距</label>
          <div class="form-range-wrap">
            <input
              type="range"
              class="form-range"
              id="inputPageMargin"
              min="4"
              max="16"
              step="1"
              v-model.number="state.draft.settings.pageMargin"
            />
            <span class="form-range-val" id="valPageMargin">{{ state.draft.settings.pageMargin }}mm</span>
          </div>
        </div>

        <!-- 左右页边距 -->
        <div class="form-row">
          <label>左右页边距</label>
          <div class="form-range-wrap">
            <input
              type="range"
              class="form-range"
              id="inputPageMarginH"
              min="4"
              max="24"
              step="1"
              v-model.number="state.draft.settings.pageMarginHorizontal"
            />
            <span class="form-range-val" id="valPageMarginH">{{ state.draft.settings.pageMarginHorizontal ?? 12 }}mm</span>
          </div>
        </div>

        <!-- 边距快捷预设 -->
        <div class="form-row">
          <label>边距预设</label>
          <div class="grid-button-group">
            <button
              type="button"
              class="grid-btn"
              :class="{ active: state.draft.settings.pageMarginHorizontal === 6 && state.draft.settings.pageMargin === 6 }"
              @click="setMarginPreset(6, 6)"
            >紧凑 (6mm)</button>
            <button
              type="button"
              class="grid-btn"
              :class="{ active: (state.draft.settings.pageMarginHorizontal === 12 || state.draft.settings.pageMarginHorizontal == null) && state.draft.settings.pageMargin === 8 }"
              @click="setMarginPreset(12, 8)"
            >标准 (12mm)</button>
            <button
              type="button"
              class="grid-btn"
              :class="{ active: state.draft.settings.pageMarginHorizontal === 16 && state.draft.settings.pageMargin === 10 }"
              @click="setMarginPreset(16, 10)"
            >宽松 (16mm)</button>
          </div>
        </div>

        <!-- 练习格样式 -->
        <div class="form-row">
          <label>练习格样式</label>
          <div class="compact-segmented">
            <input
              type="radio"
              name="gridStyle"
              id="gridFour"
              value="four-line"
              :checked="state.draft.settings.gridStyle === 'four-line'"
              @change="state.draft.settings.gridStyle = 'four-line'"
            />
            <label for="gridFour">四线三格</label>
            <input
              type="radio"
              name="gridStyle"
              id="gridSingle"
              value="single-line"
              :checked="state.draft.settings.gridStyle === 'single-line'"
              @change="state.draft.settings.gridStyle = 'single-line'"
            />
            <label for="gridSingle">普通横线</label>
          </div>
        </div>

        <!-- 格子高度 -->
        <div class="form-row">
          <label>格子高度</label>
          <div class="form-range-wrap">
            <input
              type="range"
              class="form-range"
              id="inputGridHeight"
              min="6"
              max="18"
              step="0.5"
              v-model.number="state.draft.settings.gridHeight"
            />
            <span class="form-range-val" id="valGridHeight">{{ state.draft.settings.gridHeight }}mm</span>
          </div>
        </div>

        <!-- 线条粗细 -->
        <div class="form-row">
          <label>线条粗细</label>
          <div class="compact-segmented">
            <input
              type="radio"
              name="gridStroke"
              id="strThin"
              value="0.6"
              :checked="state.draft.settings.gridStroke === 0.6"
              @change="state.draft.settings.gridStroke = 0.6"
            />
            <label for="strThin">细 (0.6)</label>
            <input
              type="radio"
              name="gridStroke"
              id="strMed"
              value="0.85"
              :checked="state.draft.settings.gridStroke === 0.85"
              @change="state.draft.settings.gridStroke = 0.85"
            />
            <label for="strMed">中 (0.85)</label>
            <input
              type="radio"
              name="gridStroke"
              id="strThick"
              value="1.2"
              :checked="state.draft.settings.gridStroke === 1.2"
              @change="state.draft.settings.gridStroke = 1.2"
            />
            <label for="strThick">粗 (1.2)</label>
          </div>
        </div>

        <!-- 线条颜色与封闭竖线 -->
        <div class="form-row">
          <label>线条与封闭</label>
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="display:inline-flex; align-items:center; gap:6px;">
              <input
                type="color"
                id="inputGridColor"
                v-model="state.draft.settings.gridColor"
                style="width:32px; height:24px; border:1px solid #cbd5e1; border-radius:4px; cursor:pointer;"
              />
              <span style="font-size:11px; color:#64748b;" id="textGridColor">{{ state.draft.settings.gridColor }}</span>
            </div>
            <label class="checkbox-label">
              <input
                type="checkbox"
                id="checkVerticalLine"
                v-model="state.draft.settings.showVerticalBorder"
              />
              封闭竖线
            </label>
          </div>
        </div>
      </div>
    </section>

    <!-- 【分组二：字体与间距】 -->
    <section
      class="settings-group"
      id="groupTypography"
      data-debug-id="S-006"
      data-debug-name="字体与间距"
    >
      <div class="group-header">
        <div class="group-title-wrap">
          <AppIcon name="alphabet" :size="15" />
          <span class="group-title">字体与间距</span>
        </div>
      </div>

      <div class="group-body">
        <!-- 中文字体 -->
        <div class="form-row">
          <label>中文字体</label>
          <select class="form-select" id="selectFontZh" v-model="state.draft.settings.fontFamilyZh">
            <option value="'KaiTi', '楷体', STKaiti, serif">楷体</option>
            <option value="'OPPO Sans', 'OPPOSans', sans-serif">OPPO Sans</option>
            <option value="'Noto Sans SC', 'Source Han Sans SC', '思源黑体', sans-serif">思源黑体</option>
            <option value="'SimSun', '宋体', serif">宋体</option>
            <option value="'SimHei', '黑体', sans-serif">黑体</option>
            <option value="'FangSong', '仿宋', serif">仿宋</option>
          </select>
        </div>

        <!-- 英文字体 (句子挖空 / 练习示范) -->
        <div class="form-row">
          <label>英文字体</label>
          <select class="form-select" id="selectFontEn" v-model="state.draft.settings.fontFamilyEn">
            <option value="Arial, sans-serif">Arial</option>
            <option value="'Times New Roman', Times, serif">Times New Roman</option>
            <option value="'Georgia', serif">Georgia</option>
            <option
              v-for="font in EMBEDDED_HANDWRITING_FONTS"
              :key="font.id"
              :value="font.cssFamily"
            >
              {{ font.label }}
            </option>
          </select>
        </div>
        <p class="field-note">
          说明：除“句子挖空”跟随所选英文字体外，填空题、选择题、作文题等常规题型均默认强制使用 Times New Roman 规范印刷体；字母专项固定使用 xumin 字体。
        </p>

        <!-- 字母范字字体 -->
        <div class="form-row font-guide-row">
          <label>字母范字字体</label>
          <select class="form-select" id="selectAlphabetGuideFont" v-model="state.draft.settings.alphabetGuideFont">
            <option
              v-for="font in ALPHABET_GUIDE_FONT_OPTIONS"
              :key="font.id"
              :value="font.cssFamily"
            >
              {{ font.label }}
            </option>
          </select>
          <div class="font-preview-strip" :style="{ fontFamily: state.draft.settings.alphabetGuideFont }">
            Aa Bb Gg Jj Pp Qq Yy
          </div>
        </div>

        <!-- 字间距 (加宽 0.8px 为默认) -->
        <div class="form-row">
          <label>字间距</label>
          <div class="compact-segmented">
            <input
              type="radio"
              name="letterSpacing"
              id="spNormal"
              value="0"
              :checked="state.draft.settings.letterSpacing === '0'"
              @change="state.draft.settings.letterSpacing = '0'"
            />
            <label for="spNormal">正常</label>
            <input
              type="radio"
              name="letterSpacing"
              id="spWide"
              value="0.8px"
              :checked="state.draft.settings.letterSpacing === '0.8px' || !state.draft.settings.letterSpacing"
              @change="state.draft.settings.letterSpacing = '0.8px'"
            />
            <label for="spWide">加宽 (默认)</label>
            <input
              type="radio"
              name="letterSpacing"
              id="spExtra"
              value="1.5px"
              :checked="state.draft.settings.letterSpacing === '1.5px'"
              @change="state.draft.settings.letterSpacing = '1.5px'"
            />
            <label for="spExtra">宽松</label>
          </div>
        </div>

        <!-- 提示字号 (题号/释义) -->
        <div class="form-row">
          <label>提示字号</label>
          <div class="form-range-wrap">
            <input
              type="range"
              class="form-range"
              id="inputPromptFontSize"
              min="7"
              max="20"
              step="0.5"
              :value="state.draft.settings.promptFontSize"
              @input="onPromptFontSizeInput"
            />
            <span class="form-range-val" id="valPromptFontSize">{{ state.draft.settings.promptFontSize }}pt</span>
          </div>
        </div>

        <!-- 行距 (垂直间距) -->
        <div class="form-row">
          <label>垂直行距</label>
          <div class="form-range-wrap">
            <input
              type="range"
              class="form-range"
              id="inputRowGap"
              min="2"
              max="10"
              step="0.5"
              v-model.number="state.draft.settings.rowGap"
            />
            <span class="form-range-val" id="valRowGap">{{ state.draft.settings.rowGap }}mm</span>
          </div>
        </div>

        <!-- 列距 (水平间距) -->
        <div class="form-row">
          <label>水平列距</label>
          <div class="form-range-wrap">
            <input
              type="range"
              class="form-range"
              id="inputColGap"
              min="2"
              max="16"
              step="0.5"
              v-model.number="state.draft.settings.colGap"
            />
            <span class="form-range-val" id="valColGap">{{ state.draft.settings.colGap }}mm</span>
          </div>
        </div>

        <!-- 列距预设 -->
        <div class="form-row">
          <label>列距预设</label>
          <div class="grid-button-group">
            <button
              type="button"
              class="grid-btn"
              :class="{ active: state.draft.settings.colGap === 3 }"
              @click="state.draft.settings.colGap = 3"
            >紧凑 (3mm)</button>
            <button
              type="button"
              class="grid-btn"
              :class="{ active: state.draft.settings.colGap === 6 }"
              @click="state.draft.settings.colGap = 6"
            >标准 (6mm)</button>
            <button
              type="button"
              class="grid-btn"
              :class="{ active: state.draft.settings.colGap === 8 }"
              @click="state.draft.settings.colGap = 8"
            >宽松 (8mm)</button>
          </div>
        </div>

        <!-- 中文释义位置 (单词题) -->
        <div class="form-row" v-if="state.draft.settings.dictMode !== 'cloze'">
          <label>中文释义位置</label>
          <div class="compact-segmented">
            <input
              type="radio"
              name="zhPosition"
              id="zhPosTop"
              value="top"
              :checked="state.draft.settings.zhPosition === 'top'"
              @change="state.draft.settings.zhPosition = 'top'"
            />
            <label for="zhPosTop">格子上方</label>
            <input
              type="radio"
              name="zhPosition"
              id="zhPosLeft"
              value="left"
              :checked="state.draft.settings.zhPosition === 'left'"
              @change="state.draft.settings.zhPosition = 'left'"
            />
            <label for="zhPosLeft">格子左侧</label>
          </div>
        </div>
      </div>
    </section>

    <!-- 【分组三：题型列数】 -->
    <section
      class="settings-group"
      id="groupQuestionColumns"
      data-debug-id="S-003"
      data-debug-name="题型列数"
    >
      <div class="group-header">
        <div class="group-title-wrap">
          <AppIcon name="settings" :size="15" />
          <span class="group-title">题型列数</span>
        </div>
        <button
          type="button"
          class="reset-columns-btn"
          id="btnResetAllColumns"
          title="将所有题型恢复为推荐默认列数"
          @click="restoreDefaultColumns"
        >
          恢复默认
        </button>
      </div>

      <div class="group-body">
        <p class="field-note" style="margin-top: -4px; margin-bottom: 6px;">
          独立配置各题型的每行列数与排版规格，题目将实时按设定自适应流式排布：
        </p>

        <!-- 单词默写 -->
        <div class="column-config-row">
          <span class="column-config-label">单词默写</span>
          <div class="grid-button-group col-btn-group">
            <button
              v-for="c in [1, 2, 3, 4, 5]"
              :key="c"
              type="button"
              class="grid-btn"
              :class="{ active: currentColumns.wordDictation === c }"
              @click="setQTypeColumns('word-dictation', c)"
            >
              {{ c }}列
            </button>
          </div>
        </div>

        <!-- 句子默写 -->
        <div class="column-config-row">
          <span class="column-config-label">句子默写</span>
          <div class="grid-button-group col-btn-group">
            <button
              v-for="c in [1, 2, 3, 4]"
              :key="c"
              type="button"
              class="grid-btn"
              :class="{ active: currentColumns.sentenceDictation === c }"
              @click="setQTypeColumns('sentence-dictation', c)"
            >
              {{ c }}列
            </button>
          </div>
        </div>

        <!-- 句子挖空 -->
        <div class="column-config-row">
          <span class="column-config-label">句子挖空</span>
          <div class="grid-button-group col-btn-group">
            <button
              v-for="c in [1, 2, 3, 4]"
              :key="c"
              type="button"
              class="grid-btn"
              :class="{ active: currentColumns.sentenceCloze === c }"
              @click="setQTypeColumns('sentence-cloze', c)"
            >
              {{ c }}列
            </button>
          </div>
        </div>

        <!-- 选择题 -->
        <div class="column-config-row">
          <span class="column-config-label">选择题</span>
          <div class="grid-button-group col-btn-group">
            <button
              v-for="c in [1, 2, 3, 4]"
              :key="c"
              type="button"
              class="grid-btn"
              :class="{ active: currentColumns.choice === c }"
              @click="setQTypeColumns('choice', c)"
            >
              {{ c }}列
            </button>
          </div>
        </div>

        <!-- 填空题 -->
        <div class="column-config-row">
          <span class="column-config-label">填空题</span>
          <div class="grid-button-group col-btn-group">
            <button
              v-for="c in [1, 2, 3, 4]"
              :key="c"
              type="button"
              class="grid-btn"
              :class="{ active: currentColumns.inlineFill === c }"
              @click="setQTypeColumns('inline-fill', c)"
            >
              {{ c }}列
            </button>
          </div>
        </div>

        <!-- 字母专项细化拆分：字母左右邻居 -->
        <div class="column-config-row">
          <span class="column-config-label">字母左右邻居</span>
          <div class="grid-button-group col-btn-group">
            <button
              type="button"
              class="grid-btn"
              :class="{ active: currentColumns.alphabetNeighbor === 5 }"
              @click="setAlphabetSubColumns('neighbor', 5)"
            >
              5列 (固定)
            </button>
          </div>
        </div>

        <!-- 字母专项细化拆分：大小写转换 -->
        <div class="column-config-row">
          <span class="column-config-label">大小写转换</span>
          <div class="grid-button-group col-btn-group">
            <button
              type="button"
              class="grid-btn"
              :class="{ active: currentColumns.alphabetCase === 4 }"
              @click="setAlphabetSubColumns('case', 4)"
            >
              4列 (左右结构)
            </button>
          </div>
        </div>

        <!-- 字母专项细化拆分：26字母默写 -->
        <div class="column-config-row">
          <span class="column-config-label">26个字母默写</span>
          <div class="grid-button-group col-btn-group">
            <button
              type="button"
              class="grid-btn"
              :class="{ active: currentColumns.alphabet26Rows === 3 }"
              @click="setAlphabet26Rows(3)"
            >
              3行 (3×9)
            </button>
            <button
              type="button"
              class="grid-btn"
              :class="{ active: currentColumns.alphabet26Rows === 4 }"
              @click="setAlphabet26Rows(4)"
            >
              4行 (4×7)
            </button>
          </div>
        </div>

        <!-- 英语作文 -->
        <div class="column-config-row">
          <span class="column-config-label">英语作文</span>
          <div class="grid-button-group col-btn-group">
            <button
              v-for="c in [1, 2]"
              :key="c"
              type="button"
              class="grid-btn"
              :class="{ active: currentColumns.composition === c }"
              @click="setQTypeColumns('english-composition', c)"
            >
              {{ c }}列
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { NInput } from 'naive-ui';
import { state } from '../stores/appStore.js';
import { DEFAULT_LAYOUT_DEFAULTS } from '../question-types/registry.js';
import {
  ALPHABET_GUIDE_FONT_OPTIONS,
  EMBEDDED_HANDWRITING_FONTS
} from '../core/handwritingFonts.js';
import AppIcon from './AppIcon.vue';

function onPaperSizeChange(size) {
  state.draft.settings.paperSize = size;
  if (size === 'A4') {
    state.draft.settings.orientation = 'portrait';
    state.draft.settings.splitFold = false;
  } else if (['B4', '8K', 'A3'].includes(size)) {
    state.draft.settings.orientation = 'landscape';
  }
}

function onOrientationChange(orient) {
  state.draft.settings.orientation = orient;
  if (orient === 'portrait') {
    state.draft.settings.splitFold = false;
  }
}

function setMarginPreset(h, v) {
  state.draft.settings.pageMarginHorizontal = h;
  state.draft.settings.pageMargin = v;
}

function onCopiesChange(count) {
  state.draft.settings.copiesPerPage = count;
  if (state.draft.items.length > 0) {
    state.draft.settings.wordsPerPage = Math.max(state.draft.settings.wordsPerPage || 9, state.draft.items.length);
  }
}

function onPromptFontSizeInput(e) {
  const val = parseFloat(e.target.value);
  state.draft.settings.promptFontSize = val;
}

const currentColumns = computed(() => {
  const d = state.draft.settings.layoutDefaults || DEFAULT_LAYOUT_DEFAULTS;
  
  let neighborCols = 5;
  const neighLayout = state.draft.settings.alphabetNeighborLayout || state.draft.settings.alphabetLayout;
  if (neighLayout === 'bottom-5col') neighborCols = 5;

  let caseCols = 4;
  const caseLayout = state.draft.settings.alphabetCaseLayout || state.draft.settings.alphabetLayout;
  if (caseLayout === 'right-4col') caseCols = 4;

  const alpha26Rows = Number(state.draft.settings.alphabet26Rows) === 4 ? 4 : 3;

  return {
    wordDictation: Number(d.wordDictationColumns) || 3,
    sentenceDictation: Number(d.sentenceDictationColumns) || 1,
    sentenceCloze: d.sentenceClozeColumns === 'auto' ? 2 : Number(d.sentenceClozeColumns) || 2,
    choice: d.choiceColumns === 'auto' ? 2 : Number(d.choiceColumns) || 2,
    inlineFill: d.inlineFillColumns === 'auto' ? 2 : Number(d.inlineFillColumns) || 2,
    composition: Number(d.englishCompositionColumns) || 1,
    alphabetNeighbor: neighborCols,
    alphabetCase: caseCols,
    alphabet26Rows: alpha26Rows,
    alphabet: neighborCols
  };
});

function setQTypeColumns(type, cols) {
  if (!state.draft.settings.layoutDefaults) {
    state.draft.settings.layoutDefaults = { ...DEFAULT_LAYOUT_DEFAULTS };
  }
  if (type === 'word-dictation') {
    state.draft.settings.layoutDefaults.wordDictationColumns = cols;
  } else if (type === 'sentence-dictation') {
    state.draft.settings.layoutDefaults.sentenceDictationColumns = cols;
  } else if (type === 'sentence-cloze') {
    state.draft.settings.layoutDefaults.sentenceClozeColumns = cols;
  } else if (type === 'choice') {
    state.draft.settings.layoutDefaults.choiceColumns = cols;
  } else if (type === 'inline-fill') {
    state.draft.settings.layoutDefaults.inlineFillColumns = cols;
  } else if (type === 'alphabet') {
    setAlphabetSubColumns('neighbor', cols);
    setAlphabetSubColumns('case', cols);
  } else if (type === 'english-composition') {
    state.draft.settings.layoutDefaults.englishCompositionColumns = cols;
  }

  // 同步更新现有该类型题目，使全局实时生效
  state.draft.items.forEach(item => {
    if (item.questionType === type) {
      if (!item.layout) item.layout = {};
      item.layout.columns = cols;
    }
  });
}

function setAlphabetSubColumns(subType, cols) {
  if (subType === 'neighbor') {
    const layoutStyle = 'bottom-5col';
    const gridPosition = 'below';
    state.draft.settings.alphabetNeighborLayout = layoutStyle;
    state.draft.items.forEach(item => {
      const isNeigh = item.questionType === 'alphabet' && (item.subType === 'neighbor' || item.alphabetType === 'neighbor' || item.neighborData || (item.zh && item.zh.includes('邻居')));
      if (isNeigh) {
        if (!item.layout) item.layout = {};
        item.layout.columns = 5;
        item.layout.gridPosition = gridPosition;
        if (item.neighborData) item.neighborData.layoutStyle = layoutStyle;
      }
    });
  } else if (subType === 'case') {
    const layoutStyle = 'right-4col';
    const gridPosition = 'right';
    state.draft.settings.alphabetCaseLayout = layoutStyle;
    state.draft.items.forEach(item => {
      const isCase = item.questionType === 'alphabet' && (item.subType === 'case' || item.alphabetType === 'case' || item.caseData);
      if (isCase) {
        if (!item.layout) item.layout = {};
        item.layout.columns = 4;
        item.layout.gridPosition = gridPosition;
        if (item.caseData) item.caseData.layoutStyle = layoutStyle;
      }
    });
  }
}

function setAlphabet26Rows(rows) {
  state.draft.settings.alphabet26Rows = rows;
  state.draft.items.forEach(item => {
    const isSeq = item.questionType === 'alphabet' && (item.subType === 'sequence' || item.alphabetType === 'sequence' || item.alphaData);
    if (isSeq) {
      if (item.alphaData) item.alphaData.rowMode = rows;
    }
  });
}

function restoreDefaultColumns() {
  state.draft.settings.layoutDefaults = { ...DEFAULT_LAYOUT_DEFAULTS };
  state.draft.settings.alphabetLayout = 'bottom-5col';
  state.draft.settings.alphabetNeighborLayout = 'bottom-5col';
  state.draft.settings.alphabetCaseLayout = 'right-4col';
  state.draft.settings.alphabet26Rows = 3;
  state.draft.items.forEach(item => {
    if (item.layout) {
      delete item.layout.columns;
      delete item.layout.gridPosition;
    }
    if (item.neighborData) item.neighborData.layoutStyle = 'bottom-5col';
    if (item.caseData) item.caseData.layoutStyle = 'right-4col';
    if (item.alphaData) item.alphaData.rowMode = 3;
  });
}
</script>

<style scoped>
.settings-pane {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
}

/* 扁平化分组：顶部小标题 + 底部 1px 浅色分割线，去除嵌套外框和背景 */
.settings-group {
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0 0 18px 0;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--border-light, #e2e7e4);
  box-shadow: none;
  width: 100%;
  box-sizing: border-box;
}

.settings-group:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 4px;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  user-select: none;
  width: 100%;
}

.group-title-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--primary, #2f6659);
}

.group-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-main, #26332f);
  letter-spacing: 0.01em;
}

.reset-columns-btn {
  border: none;
  background: transparent;
  color: var(--primary, #2f6659);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.reset-columns-btn:hover {
  background: var(--primary-light, #e8f0ed);
}

.group-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12.5px;
}

.form-row > label {
  color: var(--text-muted, #68756f);
  font-weight: 500;
  white-space: nowrap;
  font-size: 12.5px;
  flex-shrink: 0;
}

/* 紧凑型分段控制器 (高度 28px，单行不折行) */
.compact-segmented {
  display: inline-flex;
  height: 28px;
  box-sizing: border-box;
  background: var(--bg-app, #f3f5f2);
  border: 1px solid var(--border-light, #e2e7e4);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
  white-space: nowrap;
  flex-wrap: nowrap;
  align-items: center;
  flex-shrink: 0;
}

.compact-segmented input[type="radio"] {
  display: none;
}

.compact-segmented label {
  height: 22px;
  line-height: 22px;
  padding: 0 8px;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text-muted, #68756f);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.compact-segmented input[type="radio"]:checked + label {
  background: #ffffff;
  color: var(--primary, #2f6659);
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* 自适应等宽网格按钮 (高度 28px) */
.grid-button-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: 6px;
  width: 100%;
}

.grid-btn {
  height: 28px;
  line-height: 26px;
  padding: 0 4px;
  font-size: 11.5px;
  font-weight: 500;
  border-radius: 4px;
  border: 1px solid var(--border-color, #c9d3ce);
  background: var(--bg-card, #ffffff);
  color: var(--text-main, #26332f);
  cursor: pointer;
  text-align: center;
  white-space: nowrap;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.grid-btn:hover {
  border-color: var(--primary, #2f6659);
  color: var(--primary, #2f6659);
}

.grid-btn.active {
  background: var(--primary, #2f6659);
  border-color: var(--primary, #2f6659);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(47, 102, 89, 0.2);
}

/* 按题型列数配置单行 */
.column-config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.column-config-label {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-muted, #68756f);
  min-width: 70px;
  flex-shrink: 0;
}

.col-btn-group {
  flex: 1;
  max-width: 260px;
}

/* 范围滑动条容器 */
.form-range-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 250px;
}

.form-range {
  flex: 1;
  height: 5px;
  accent-color: var(--primary, #2f6659);
  cursor: pointer;
}

.form-range-val {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--primary, #2f6659);
  min-width: 44px;
  text-align: right;
  font-family: monospace;
}

/* 复选框组 */
.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  justify-content: flex-end;
  flex: 1;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-main, #26332f);
  cursor: pointer;
  white-space: nowrap;
}

.checkbox-label input[type="checkbox"] {
  accent-color: var(--primary, #2f6659);
  cursor: pointer;
}

/* 下拉选择框 */
.form-select {
  padding: 4px 8px;
  font-size: 12px;
  height: 28px;
  border: 1px solid var(--border-color, #c9d3ce);
  border-radius: 6px;
  background: var(--bg-card, #ffffff);
  color: var(--text-main, #26332f);
  cursor: pointer;
  outline: none;
  flex: 1;
  max-width: 250px;
  box-sizing: border-box;
}

.font-guide-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.font-preview-strip {
  grid-column: 1 / -1;
  min-height: 38px;
  padding: 6px 10px 4px;
  overflow: hidden;
  border: 1px solid var(--border-light, #e2e7e4);
  border-radius: 6px;
  background: linear-gradient(
    to bottom,
    transparent 24%,
    #d9e2df 25%,
    transparent 26%,
    transparent 49%,
    #d9e2df 50%,
    transparent 51%,
    transparent 74%,
    #aabbb5 75%,
    transparent 76%
  );
  color: var(--primary, #2f6659);
  font-size: 22px;
  line-height: 1.15;
  text-align: center;
  white-space: nowrap;
}

.field-note {
  margin: 0;
  font-size: 11px;
  color: var(--text-light, #909b96);
  line-height: 1.5;
}
</style>
