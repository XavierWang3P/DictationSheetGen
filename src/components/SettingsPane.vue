<template>
  <div class="settings-pane" data-debug-id="S-001" data-debug-name="试卷设置区">
    <!-- 模块 2：标题与考生信息 (已上移) -->
    <section class="settings-group" id="groupTitleInfo" data-debug-id="S-002" data-debug-name="试卷标题设置框">
      <div class="group-header">
        <span class="group-title" style="display:inline-flex; align-items:center; gap:5px;">
          <AppIcon name="edit" :size="14" />
          标题与考生信息
        </span>
      </div>

      <div class="form-row">
        <label>试卷标题</label>
        <n-input
          v-model:value="state.draft.settings.title"
          id="inputSheetTitle"
          size="small"
          placeholder="请输入试卷标题"
        />
      </div>

      <div class="form-row">
        <label>标题字号</label>
        <div class="form-range-wrap">
          <input
            type="range"
            class="form-range"
            id="inputTitleFontSize"
            min="12"
            max="32"
            step="1"
            :value="titleFontSizeNum"
            @input="onTitleFontSizeInput"
          />
          <span class="form-range-val" id="valTitleFontSize">{{ state.draft.settings.titleFontSize }}</span>
        </div>
      </div>

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

      <div class="form-row">
        <label>教师答案版</label>
        <label class="checkbox-label">
          <input type="checkbox" id="checkShowAnswerPage" v-model="state.draft.settings.showAnswerPage" />
          在学生卷后追加教师答案页
        </label>
      </div>
    </section>

    <!-- 模块 3：页面设置 (默认折叠) -->
    <section
      class="settings-group collapsible"
      :class="{ collapsed: isPageCollapsed }"
      id="groupPageSettings"
      data-debug-id="S-003"
      data-debug-name="页面规格与份数设置"
    >
      <button type="button" class="group-header" @click="toggleGroup('page')" :aria-expanded="!isPageCollapsed">
        <span class="group-title" style="display:inline-flex; align-items:center; gap:5px;">
          <AppIcon name="file-text" :size="14" />
          页面设置
        </span>
        <AppIcon class="collapse-arrow" name="arrow-down" :size="14" />
      </button>
      <div class="group-body">
        <div class="form-row">
          <label>纸张规格</label>
          <div class="segmented-control">
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
          </div>
        </div>

        <div class="form-row">
          <label>纸张方向</label>
          <div class="segmented-control">
            <input
              type="radio"
              name="paperOrient"
              id="orientPortrait"
              value="portrait"
              :checked="state.draft.settings.orientation === 'portrait'"
              @change="state.draft.settings.orientation = 'portrait'"
            />
            <label for="orientPortrait">纵向</label>
            <input
              type="radio"
              name="paperOrient"
              id="orientLandscape"
              value="landscape"
              :checked="state.draft.settings.orientation === 'landscape'"
              @change="state.draft.settings.orientation = 'landscape'"
            />
            <label for="orientLandscape">横向</label>
          </div>
        </div>

        <div class="form-row">
          <label>一页份数</label>
          <div class="segmented-control">
            <input
              type="radio"
              name="copiesPerPage"
              id="copy1"
              value="1"
              :checked="state.draft.settings.copiesPerPage === 1"
              @change="onCopiesChange(1)"
            />
            <label for="copy1">1 份 (全页)</label>
            <input
              type="radio"
              name="copiesPerPage"
              id="copy2"
              value="2"
              :checked="state.draft.settings.copiesPerPage === 2"
              @change="onCopiesChange(2)"
            />
            <label for="copy2">2 份 (对半)</label>
            <input
              type="radio"
              name="copiesPerPage"
              id="copy3"
              value="3"
              :checked="state.draft.settings.copiesPerPage === 3"
              @change="onCopiesChange(3)"
            />
            <label for="copy3">3 份 (推荐)</label>
          </div>
        </div>

        <div class="form-row">
          <label>排版检测助手</label>
          <label class="checkbox-label">
            <input type="checkbox" id="checkAutoOptimizeCopies" v-model="state.draft.settings.autoOptimizeCopies" />
            当单联题目溢出至第二页时智能提示
          </label>
        </div>

        <div class="form-row">
          <label>上下页边距 (mm)</label>
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

        <div class="form-row">
          <label>左右页边距 (mm)</label>
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

        <div class="form-row preset-btn-row">
          <span class="sub-label">边距预设:</span>
          <div class="preset-pill-group">
            <button
              type="button"
              class="preset-pill-btn"
              :class="{ active: state.draft.settings.pageMarginHorizontal === 6 && state.draft.settings.pageMargin === 6 }"
              @click="setMarginPreset(6, 6)"
            >紧凑 (6mm)</button>
            <button
              type="button"
              class="preset-pill-btn"
              :class="{ active: (state.draft.settings.pageMarginHorizontal === 12 || state.draft.settings.pageMarginHorizontal == null) && state.draft.settings.pageMargin === 8 }"
              @click="setMarginPreset(12, 8)"
            >标准 (12mm)</button>
            <button
              type="button"
              class="preset-pill-btn"
              :class="{ active: state.draft.settings.pageMarginHorizontal === 16 && state.draft.settings.pageMargin === 10 }"
              @click="setMarginPreset(16, 10)"
            >宽松 (16mm)</button>
          </div>
        </div>
      </div>
    </section>

    <!-- 模块 4：题目区域排版 (默认展开) -->
    <section
      class="settings-group collapsible"
      :class="{ collapsed: isWordCollapsed }"
      id="groupWordArea"
      data-debug-id="S-004"
      data-debug-name="题目排列与容量设置"
    >
      <button type="button" class="group-header" @click="toggleGroup('word')" :aria-expanded="!isWordCollapsed">
        <span class="group-title" style="display:inline-flex; align-items:center; gap:5px;">
          <AppIcon name="settings" :size="14" />
          题目区域排版
        </span>
        <AppIcon class="collapse-arrow" name="arrow-down" :size="14" />
      </button>
      <div class="group-body">
        <div class="form-row layout-default-row">
          <label for="wordDictationColumns">单词默写默认</label>
          <select id="wordDictationColumns" class="form-select" v-model.number="state.draft.settings.layoutDefaults.wordDictationColumns">
            <option :value="1">每行1题</option>
            <option :value="2">每行2题</option>
            <option :value="3">每行3题（推荐）</option>
            <option :value="4">每行4题</option>
            <option :value="5">每行5题</option>
          </select>
        </div>

        <div class="form-row layout-default-row">
          <label for="sentenceDictationColumns">句子默写默认</label>
          <select id="sentenceDictationColumns" class="form-select" v-model.number="state.draft.settings.layoutDefaults.sentenceDictationColumns">
            <option :value="1">每行1题（推荐）</option>
            <option :value="2">每行2题</option>
            <option :value="3">每行3题</option>
            <option :value="4">每行4题</option>
            <option :value="5">每行5题</option>
          </select>
        </div>

        <div class="form-row layout-default-row">
          <label for="sentenceClozeColumns">句子挖空默认</label>
          <select id="sentenceClozeColumns" class="form-select" v-model="state.draft.settings.layoutDefaults.sentenceClozeColumns">
            <option value="auto">自动选择每行1题至2题</option>
            <option :value="1">每行1题</option>
            <option :value="2">每行2题</option>
            <option :value="3">每行3题</option>
            <option :value="4">每行4题</option>
            <option :value="5">每行5题</option>
          </select>
        </div>

        <div class="form-row layout-default-row">
          <label for="choiceColumns">选择题默认</label>
          <select id="choiceColumns" class="form-select" v-model="state.draft.settings.layoutDefaults.choiceColumns">
            <option value="auto">自动选择每行1题至2题</option>
            <option :value="1">每行1题</option>
            <option :value="2">每行2题</option>
            <option :value="3">每行3题</option>
            <option :value="4">每行4题</option>
            <option :value="5">每行5题</option>
          </select>
        </div>

        <div class="form-row layout-default-row">
          <label for="inlineFillColumns">填空题默认</label>
          <select id="inlineFillColumns" class="form-select" v-model="state.draft.settings.layoutDefaults.inlineFillColumns">
            <option value="auto">自动选择每行1题至2题</option>
            <option :value="1">每行1题</option>
            <option :value="2">每行2题</option>
            <option :value="3">每行3题</option>
            <option :value="4">每行4题</option>
            <option :value="5">每行5题</option>
          </select>
        </div>

        <div class="form-row layout-default-row">
          <label for="englishCompositionColumns">英语作文默认</label>
          <select id="englishCompositionColumns" class="form-select" v-model.number="state.draft.settings.layoutDefaults.englishCompositionColumns">
            <option :value="1">每行1题（推荐，保持完整书写行宽）</option>
            <option :value="2">每行2题（不建议）</option>
            <option :value="3">每行3题（不建议）</option>
            <option :value="4">每行4题（不建议）</option>
            <option :value="5">每行5题（不建议）</option>
          </select>
        </div>

        <div class="form-row layout-default-row">
          <label for="alphabetLayout">字母邻居与转换默认</label>
          <select id="alphabetLayout" class="form-select" v-model="state.draft.settings.alphabetLayout">
            <option value="bottom-4col">下方四线格（每行4题，推荐）</option>
            <option value="bottom-5col">下方四线格（每行5题）</option>
            <option value="right-2col">右侧四线格（每行2题）</option>
          </select>
        </div>

        <div class="form-row layout-default-row">
          <label for="alphabet26Rows">26个字母默写默认</label>
          <select id="alphabet26Rows" class="form-select" v-model.number="state.draft.settings.alphabet26Rows">
            <option :value="3">3 行 (3×9，含1个★占位格)</option>
            <option :value="4">4 行 (4×7，含2个★占位格，单格更宽)</option>
          </select>
        </div>

        <div class="form-row">
          <label>每页词数容量</label>
          <div class="form-range-wrap">
            <input
              type="range"
              class="form-range"
              id="wordsPerPageInput"
              min="3"
              max="25"
              step="1"
              v-model.number="state.draft.settings.wordsPerPage"
            />
            <span class="form-range-val" id="valWordsPerPage">{{ state.draft.settings.wordsPerPage }} 题</span>
          </div>
        </div>

        <div class="form-row">
          <label>提示字号 (题号/释义)</label>
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

        <div v-if="state.draft.settings.dictMode !== 'cloze'" class="form-row">
          <label>中文释义位置</label>
          <div class="segmented-control">
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

        <!-- 句子挖空专属设置 (四线格长) -->
        <template v-if="state.draft.settings.dictMode === 'cloze'">
          <div class="form-row">
            <label>四线格挖空长度</label>
            <div class="segmented-control mini cloze-width-control">
              <input
                type="radio"
                name="settingsClozeBlankWidth"
                id="setBlankWidthAuto"
                value="auto"
                :checked="state.draft.settings.clozeBlankWidth === 'auto'"
                @change="state.draft.settings.clozeBlankWidth = 'auto'"
              />
              <label for="setBlankWidthAuto">按答案宽度150%（默认）</label>
              <input
                type="radio"
                name="settingsClozeBlankWidth"
                id="setBlankWidth1Word"
                value="1word"
                :checked="state.draft.settings.clozeBlankWidth === '1word'"
                @change="state.draft.settings.clozeBlankWidth = '1word'"
              />
              <label for="setBlankWidth1Word">1格</label>
              <input
                type="radio"
                name="settingsClozeBlankWidth"
                id="setBlankWidth1Point5Words"
                value="1.5words"
                :checked="state.draft.settings.clozeBlankWidth === '1.5words'"
                @change="state.draft.settings.clozeBlankWidth = '1.5words'"
              />
              <label for="setBlankWidth1Point5Words">1.5格</label>
              <input
                type="radio"
                name="settingsClozeBlankWidth"
                id="setBlankWidth2Words"
                value="2words"
                :checked="state.draft.settings.clozeBlankWidth === '2words'"
                @change="state.draft.settings.clozeBlankWidth = '2words'"
              />
              <label for="setBlankWidth2Words">2格</label>
              <input
                type="radio"
                name="settingsClozeBlankWidth"
                id="setBlankWidth2Point5Words"
                value="2.5words"
                :checked="state.draft.settings.clozeBlankWidth === '2.5words'"
                @change="state.draft.settings.clozeBlankWidth = '2.5words'"
              />
              <label for="setBlankWidth2Point5Words">2.5格</label>
              <input
                type="radio"
                name="settingsClozeBlankWidth"
                id="setBlankWidth3Words"
                value="3words"
                :checked="state.draft.settings.clozeBlankWidth === '3words'"
                @change="state.draft.settings.clozeBlankWidth = '3words'"
              />
              <label for="setBlankWidth3Words">3格</label>
            </div>
          </div>
        </template>

        <div class="form-row">
          <label>水平间距 (列距)</label>
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

        <div class="form-row preset-btn-row">
          <span class="sub-label">列距预设:</span>
          <div class="preset-pill-group">
            <button
              type="button"
              class="preset-pill-btn"
              :class="{ active: state.draft.settings.colGap === 3 }"
              @click="state.draft.settings.colGap = 3"
            >紧凑 (3mm)</button>
            <button
              type="button"
              class="preset-pill-btn"
              :class="{ active: state.draft.settings.colGap === 6 }"
              @click="state.draft.settings.colGap = 6"
            >标准 (6mm)</button>
            <button
              type="button"
              class="preset-pill-btn"
              :class="{ active: state.draft.settings.colGap === 8 }"
              @click="state.draft.settings.colGap = 8"
            >宽松 (8mm)</button>
          </div>
        </div>

        <div class="form-row">
          <label>垂直间距 (行距)</label>
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
      </div>
    </section>

    <!-- 模块 5：四线三格专用设置 (默认展开) -->
    <section
      class="settings-group collapsible"
      :class="{ collapsed: isGridCollapsed }"
      id="groupGrid"
      data-debug-id="S-005"
      data-debug-name="四线三格样式设置"
    >
      <button type="button" class="group-header" @click="toggleGroup('grid')" :aria-expanded="!isGridCollapsed">
        <span class="group-title" style="display:inline-flex; align-items:center; gap:5px;">
          <AppIcon name="tag" :size="14" />
          四线三格设置
        </span>
        <AppIcon class="collapse-arrow" name="arrow-down" :size="14" />
      </button>
      <div class="group-body">
        <div class="form-row">
          <label>练习格样式</label>
          <div class="segmented-control">
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

        <div class="form-row">
          <label>格子高度 (mm)</label>
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

        <div class="form-row">
          <label>线条粗细</label>
          <div class="segmented-control">
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

        <div class="form-row">
          <label>线条颜色</label>
          <div style="display:flex; align-items:center; gap:8px;">
            <input
              type="color"
              id="inputGridColor"
              v-model="state.draft.settings.gridColor"
              style="width:36px; height:26px; border:1px solid #cbd5e1; border-radius:4px; cursor:pointer;"
            />
            <span style="font-size:11.5px; color:#64748b;" id="textGridColor">{{ state.draft.settings.gridColor }}</span>
          </div>
        </div>

        <div class="form-row">
          <label>左右闭合竖线</label>
          <label class="checkbox-label">
            <input
              type="checkbox"
              id="checkVerticalLine"
              v-model="state.draft.settings.showVerticalBorder"
            />
            显示独立卡片封闭竖线
          </label>
        </div>
      </div>
    </section>

    <!-- 模块 6：字体与模式设置 (默认折叠) -->
    <section
      class="settings-group collapsible"
      :class="{ collapsed: isTypoCollapsed }"
      id="groupTypography"
      data-debug-id="S-006"
      data-debug-name="字体与间距设置"
    >
      <button type="button" class="group-header" @click="toggleGroup('typo')" :aria-expanded="!isTypoCollapsed">
        <span class="group-title" style="display:inline-flex; align-items:center; gap:5px;">
          <AppIcon name="alphabet" :size="14" />
          字体与间距设置
        </span>
        <AppIcon class="collapse-arrow" name="arrow-down" :size="14" />
      </button>
      <div class="group-body">
        <div class="form-row">
          <label>中文字体</label>
          <select class="form-select" id="selectFontZh" v-model="state.draft.settings.fontFamilyZh">
            <option value="'KaiTi', '楷体', STKaiti, serif">楷体 (标准范字)</option>
            <option value="'SimSun', '宋体', serif">宋体</option>
            <option value="'SimHei', '黑体', sans-serif">黑体</option>
            <option value="'FangSong', '仿宋', serif">仿宋</option>
          </select>
        </div>

        <div class="form-row">
          <label>英文字体</label>
          <select class="form-select" id="selectFontEn" v-model="state.draft.settings.fontFamilyEn">
            <option value="Arial, sans-serif">Arial (清晰无衬线)</option>
            <option value="'Times New Roman', serif">Times New Roman (衬线)</option>
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
          <p class="field-help">仅控制字母专项格内范字；“★四线三格”字体已内置，但因字形自带格线，不与网站格线重复叠加。</p>
        </div>

        <div class="form-row">
          <label>字间距</label>
          <div class="segmented-control">
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
              :checked="state.draft.settings.letterSpacing === '0.8px'"
              @change="state.draft.settings.letterSpacing = '0.8px'"
            />
            <label for="spWide">加宽</label>
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
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { NInput } from 'naive-ui';
import { state } from '../stores/appStore.js';
import {
  ALPHABET_GUIDE_FONT_OPTIONS,
  EMBEDDED_HANDWRITING_FONTS
} from '../core/handwritingFonts.js';
import AppIcon from './AppIcon.vue';

const isPageCollapsed = ref(true);
const isWordCollapsed = ref(false);
const isGridCollapsed = ref(false);
const isTypoCollapsed = ref(true);

const titleFontSizeNum = computed(() => parseFloat(state.draft.settings.titleFontSize) || 18);

function toggleGroup(groupName) {
  if (groupName === 'page') {
    isPageCollapsed.value = !isPageCollapsed.value;
  } else if (groupName === 'word') {
    isWordCollapsed.value = !isWordCollapsed.value;
  } else if (groupName === 'grid') {
    isGridCollapsed.value = !isGridCollapsed.value;
  } else if (groupName === 'typo') {
    isTypoCollapsed.value = !isTypoCollapsed.value;
  }
}

function onPaperSizeChange(size) {
  state.draft.settings.paperSize = size;
}

function onTitleFontSizeInput(e) {
  const val = parseFloat(e.target.value);
  state.draft.settings.titleFontSize = `${val}pt`;
}

function onPromptFontSizeInput(e) {
  const val = parseFloat(e.target.value);
  state.draft.settings.promptFontSize = val;
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
</script>

<style scoped>
.settings-pane {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.settings-group {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 14px;
  box-shadow: 0 1px 3px rgba(38, 51, 47, 0.04);
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  user-select: none;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
}

.settings-group.collapsible .group-header {
  cursor: pointer;
  margin-bottom: 0;
}

.settings-group.collapsible:not(.collapsed) .group-header {
  margin-bottom: 12px;
}

.group-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-main);
}

.collapse-arrow {
  color: var(--text-light);
  transition: transform 0.2s ease;
  transform: rotate(180deg);
}

.settings-group.collapsed .collapse-arrow {
  transform: rotate(-90deg);
}

.settings-group.collapsed .group-body {
  display: none;
}

.group-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  gap: 12px;
}

.form-row label {
  color: var(--text-muted);
  font-weight: 500;
  white-space: nowrap;
}

.segmented-control {
  display: flex;
  background: var(--bg-app);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
  border: 1px solid var(--border-light);
}

.segmented-control input[type="radio"] {
  display: none;
}

.segmented-control label {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
  user-select: none;
  white-space: nowrap;
}

.segmented-control input[type="radio"]:checked + label {
  background: var(--bg-card);
  color: var(--primary);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.cloze-width-control {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.form-range-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  max-width: 220px;
}

.form-range {
  flex: 1;
  height: 5px;
  accent-color: var(--primary);
  cursor: pointer;
}

.form-range-val {
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
  min-width: 42px;
  text-align: right;
  font-family: monospace;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  color: var(--text-main);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  accent-color: var(--primary);
  cursor: pointer;
}

.form-select {
  padding: 5px 10px;
  font-size: 12.5px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text-main);
  cursor: pointer;
  outline: none;
}

.font-guide-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
}

.font-guide-row .form-select {
  min-width: 0;
  width: 100%;
}

.font-preview-strip,
.font-guide-row .field-help {
  grid-column: 1 / -1;
}

.font-preview-strip {
  min-height: 40px;
  padding: 7px 10px 4px;
  overflow: hidden;
  border: 1px solid var(--border-light);
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
  color: var(--primary);
  font-size: 24px;
  line-height: 1.15;
  text-align: center;
  white-space: nowrap;
}

.font-guide-row .field-help {
  margin: 0;
  color: var(--text-light);
  font-size: 11px;
  line-height: 1.45;
}

.preset-btn-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: -4px;
}

.preset-pill-group {
  display: inline-flex;
  gap: 6px;
}

.preset-pill-btn {
  padding: 2px 8px;
  font-size: 11px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-pill-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.preset-pill-btn.active {
  background: var(--primary-light);
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 600;
}
</style>
