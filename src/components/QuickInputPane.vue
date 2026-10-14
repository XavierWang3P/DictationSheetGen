<template>
  <div class="quick-input-pane" data-debug-id="Q-001" data-debug-name="快速输入区">
    <n-card size="small" :bordered="false" class="pane-card">
      <template #header>
        <div class="pane-header-title">
          <span class="title-with-icon">
            <AppIcon name="edit" :size="16" />
            题目录入与试卷结构
          </span>
          <span class="quick-stat-badge" id="badgeWordCount">
            已添加 {{ state.draft.items.length }} 题
          </span>
        </div>
      </template>

      <!-- 录入题型切换 (单词默写 / 句子挖空 / 句子默写 / 字母专项) -->
      <div class="form-row" style="margin-bottom: 12px;">
        <label class="row-label">录入题型</label>
        <div class="segmented-control" data-debug-id="Q-002" data-debug-name="题型切换器">
          <input
            type="radio"
            name="inputType"
            id="modeWriting"
            value="word-dictation"
            :checked="currentInputType === 'word-dictation'"
            @change="onInputTypeChange('word-dictation')"
          />
          <label for="modeWriting">单词默写</label>

          <input
            type="radio"
            name="inputType"
            id="modeCloze"
            value="sentence-cloze"
            :checked="currentInputType === 'sentence-cloze'"
            @change="onInputTypeChange('sentence-cloze')"
          />
          <label for="modeCloze">句子挖空</label>

          <input
            type="radio"
            name="inputType"
            id="typeSentence"
            value="sentence-dictation"
            :checked="currentInputType === 'sentence-dictation'"
            @change="onInputTypeChange('sentence-dictation')"
          />
          <label for="typeSentence">句子默写</label>

          <input
            type="radio"
            name="inputType"
            id="modeAlphabet"
            value="alphabet"
            :checked="currentInputType === 'alphabet'"
            @change="onInputTypeChange('alphabet')"
          />
          <label for="modeAlphabet">字母专项</label>

          <input type="radio" name="inputType" id="modeChoice" value="choice" :checked="currentInputType === 'choice'" @change="onInputTypeChange('choice')" />
          <label for="modeChoice">选择题</label>

          <input type="radio" name="inputType" id="modeInlineFill" value="inline-fill" :checked="currentInputType === 'inline-fill'" @change="onInputTypeChange('inline-fill')" />
          <label for="modeInlineFill">填空题</label>

          <input type="radio" name="inputType" id="modeComposition" value="english-composition" :checked="currentInputType === 'english-composition'" @change="onInputTypeChange('english-composition')" />
          <label for="modeComposition">英语作文</label>
        </div>
      </div>

      <!-- 字母专项快捷生成面板 (仅在选择字母专项时展开) -->
      <div v-if="currentInputType === 'alphabet'" class="alphabet-control-card" id="alphabetControlCard">
        <div class="alphabet-type-tabs" id="alphabetTypeTabs">
          <button
            type="button"
            class="alpha-type-btn"
            :class="{ active: alphabetActiveType === 'sequence' }"
            id="tabAlphaSeq"
            @click="alphabetActiveType = 'sequence'"
          >
            <AppIcon name="alphabet" :size="13" />
            26个字母默写
          </button>
          <button
            type="button"
            class="alpha-type-btn"
            :class="{ active: alphabetActiveType === 'neighbors' }"
            id="tabAlphaNeighbors"
            @click="alphabetActiveType = 'neighbors'"
          >
            <AppIcon name="refresh" :size="13" />
            字母左右邻居
          </button>
          <button
            type="button"
            class="alpha-type-btn"
            :class="{ active: alphabetActiveType === 'case' }"
            id="tabAlphaCase"
            @click="alphabetActiveType = 'case'"
          >
            <AppIcon name="tag" :size="13" />
            大小写转换
          </button>
        </div>

        <!-- 子面板 1: 26个字母默写 -->
        <div v-if="alphabetActiveType === 'sequence'" class="alpha-sub-config" id="paneAlphaSeq">
          <div class="form-row-compact">
            <span class="sub-label">大小写样式:</span>
            <div class="segmented-control mini">
              <input type="radio" id="alphaCasePair" value="pair" v-model="alphaSeqConfig.caseStyle" />
              <label for="alphaCasePair">大小写 (Aa)</label>
              <input type="radio" id="alphaCaseUpper" value="upper" v-model="alphaSeqConfig.caseStyle" />
              <label for="alphaCaseUpper">大写 (A-Z)</label>
              <input type="radio" id="alphaCaseLower" value="lower" v-model="alphaSeqConfig.caseStyle" />
              <label for="alphaCaseLower">小写 (a-z)</label>
            </div>
          </div>

          <div class="form-row-compact">
            <span class="sub-label">默写形式:</span>
            <div class="segmented-control mini">
              <input type="radio" id="alphaSubFull" value="full" v-model="alphaSeqConfig.subMode" />
              <label for="alphaSubFull">3行完整四线格 (全默写)</label>
              <input type="radio" id="alphaSubGap" value="gap" v-model="alphaSeqConfig.subMode" />
              <label for="alphaSubGap">字母表接龙填空</label>
              <input type="radio" id="alphaSubShuffle" value="shuffle" v-model="alphaSeqConfig.subMode" />
              <label for="alphaSubShuffle">乱序听写</label>
            </div>
          </div>

          <div class="info-tip-row">
            试卷将生成 3 行完整四线三格，每行 9 个独立书写格（按字母表规范排版）。
          </div>
        </div>

        <!-- 子面板 2: 字母左右邻居 -->
        <div v-if="alphabetActiveType === 'neighbors'" class="alpha-sub-config" id="paneAlphaNeighbors">
          <div class="form-row-compact">
            <span class="sub-label">题目数量:</span>
            <div class="segmented-control mini">
              <input type="radio" id="neighCount6" :value="6" v-model="alphaNeighConfig.count" />
              <label for="neighCount6">6 题</label>
              <input type="radio" id="neighCount9" :value="9" v-model="alphaNeighConfig.count" />
              <label for="neighCount9">9 题 (推荐)</label>
              <input type="radio" id="neighCount12" :value="12" v-model="alphaNeighConfig.count" />
              <label for="neighCount12">12 题</label>
            </div>
          </div>

          <div class="form-row-compact">
            <span class="sub-label">字母大小写:</span>
            <div class="segmented-control mini">
              <input type="radio" id="neighCaseUpper" value="upper" v-model="alphaNeighConfig.caseStyle" />
              <label for="neighCaseUpper">大写 (B)</label>
              <input type="radio" id="neighCaseLower" value="lower" v-model="alphaNeighConfig.caseStyle" />
              <label for="neighCaseLower">小写 (b)</label>
              <input type="radio" id="neighCaseMix" value="mix" v-model="alphaNeighConfig.caseStyle" />
              <label for="neighCaseMix">混合</label>
            </div>
          </div>

          <div class="form-row-compact">
            <span class="sub-label">邻居形式:</span>
            <div class="segmented-control mini">
              <input type="radio" id="neighTypeBoth" value="both" v-model="alphaNeighConfig.neighborType" />
              <label for="neighTypeBoth">左右两邻 (___ B ___)</label>
              <input type="radio" id="neighTypeMiddle" value="middle" v-model="alphaNeighConfig.neighborType" />
              <label for="neighTypeMiddle">中间填空 (A ___ C)</label>
              <input type="radio" id="neighTypeRandom" value="random" v-model="alphaNeighConfig.neighborType" />
              <label for="neighTypeRandom">随机题型</label>
            </div>
          </div>
        </div>

        <!-- 子面板 3: 大小写形式转换 -->
        <div v-if="alphabetActiveType === 'case'" class="alpha-sub-config" id="paneAlphaCase">
          <div class="form-row-compact">
            <span class="sub-label">题目数量:</span>
            <div class="segmented-control mini">
              <input type="radio" id="caseCount6" :value="6" v-model="alphaCaseConfig.count" />
              <label for="caseCount6">6 题</label>
              <input type="radio" id="caseCount9" :value="9" v-model="alphaCaseConfig.count" />
              <label for="caseCount9">9 题 (推荐)</label>
              <input type="radio" id="caseCount12" :value="12" v-model="alphaCaseConfig.count" />
              <label for="caseCount12">12 题</label>
            </div>
          </div>

          <div class="form-row-compact">
            <span class="sub-label">转换方向:</span>
            <div class="segmented-control mini">
              <input type="radio" id="caseDirUpperToLower" value="upper_to_lower" v-model="alphaCaseConfig.direction" />
              <label for="caseDirUpperToLower">大写 ➔ 小写</label>
              <input type="radio" id="caseDirLowerToUpper" value="lower_to_upper" v-model="alphaCaseConfig.direction" />
              <label for="caseDirLowerToUpper">小写 ➔ 大写</label>
              <input type="radio" id="caseDirRandom" value="random_switch" v-model="alphaCaseConfig.direction" />
              <label for="caseDirRandom">随机互换</label>
            </div>
          </div>
        </div>

        <!-- 经典推荐模板 -->
        <div style="margin-top: 4px;">
          <span style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:4px;">经典推荐模板：</span>
          <div class="alpha-presets-wrap">
            <button
              v-for="p in ALPHABET_PRESETS"
              :key="p.key"
              type="button"
              class="preset-chip-btn"
              :id="'btnPreset_' + p.key"
              @click="handleLoadAlphabetPreset(p.key)"
            >
              {{ p.title.replace('三年级英语 ', '') }}
            </button>
          </div>
        </div>

        <!-- 操作按钮栏 -->
        <div class="alpha-action-row" style="margin-top: 6px;">
          <n-button type="primary" size="small" id="btnGenerateAlphabetSheet" style="flex:1;" @click="handleGenerateAlphabet(true)">
            <template #icon><AppIcon name="plus" :size="14" /></template>
            添加到试卷
          </n-button>
        </div>
      </div>

      <!-- 句子挖空专属排版微调参数 (仅句子挖空时显示) -->
      <div v-if="currentInputType === 'sentence-cloze'" class="cloze-settings-card">
        <div class="form-row" id="rowClozeStyle" style="margin-bottom: 8px;">
          <label class="row-label">挖空形式</label>
          <div class="segmented-control mini">
            <input
              type="radio"
              name="clozeStyle"
              id="clozeInline"
              value="inline"
              :checked="state.draft.settings.clozeStyle === 'inline'"
              @change="state.draft.settings.clozeStyle = 'inline'"
            />
            <label for="clozeInline">句中内嵌填空 (推荐)</label>
            <input
              type="radio"
              name="clozeStyle"
              id="clozeBelow"
              value="below"
              :checked="state.draft.settings.clozeStyle === 'below'"
              @change="state.draft.settings.clozeStyle = 'below'"
            />
            <label for="clozeBelow">句下独立书写格</label>
          </div>
        </div>

        <div class="form-row" id="rowClozeZhPos" style="margin-bottom: 8px;">
          <label class="row-label">中文位置</label>
          <div class="segmented-control mini">
            <input
              type="radio"
              name="clozeZhPos"
              id="clozeZhBelow"
              value="below"
              :checked="state.draft.settings.clozeZhPosition === 'below'"
              @change="state.draft.settings.clozeZhPosition = 'below'"
            />
            <label for="clozeZhBelow">句下独立行</label>
            <input
              type="radio"
              name="clozeZhPos"
              id="clozeZhRight"
              value="right"
              :checked="state.draft.settings.clozeZhPosition === 'right'"
              @change="state.draft.settings.clozeZhPosition = 'right'"
            />
            <label for="clozeZhRight">紧随句末</label>
            <input
              type="radio"
              name="clozeZhPos"
              id="clozeZhAbove"
              value="above"
              :checked="state.draft.settings.clozeZhPosition === 'above'"
              @change="state.draft.settings.clozeZhPosition = 'above'"
            />
            <label for="clozeZhAbove">句子上方</label>
            <input
              type="radio"
              name="clozeZhPos"
              id="clozeZhHide"
              value="hide"
              :checked="state.draft.settings.clozeZhPosition === 'hide'"
              @change="state.draft.settings.clozeZhPosition = 'hide'"
            />
            <label for="clozeZhHide">隐藏中文</label>
          </div>
        </div>

        <div class="form-row" id="rowClozeBlankWidth" style="margin-bottom: 8px;">
          <label class="row-label">四线格长</label>
          <div class="segmented-control mini">
            <input
              type="radio"
              name="clozeBlankWidth"
              id="blankWidthAuto"
              value="auto"
              :checked="state.draft.settings.clozeBlankWidth === 'auto'"
              @change="state.draft.settings.clozeBlankWidth = 'auto'"
            />
            <label for="blankWidthAuto">按词自适应</label>
            <input
              type="radio"
              name="clozeBlankWidth"
              id="blankWidth1Word"
              value="1word"
              :checked="state.draft.settings.clozeBlankWidth === '1word'"
              @change="state.draft.settings.clozeBlankWidth = '1word'"
            />
            <label for="blankWidth1Word">1 词长</label>
            <input
              type="radio"
              name="clozeBlankWidth"
              id="blankWidth2Words"
              value="2words"
              :checked="state.draft.settings.clozeBlankWidth === '2words'"
              @change="state.draft.settings.clozeBlankWidth = '2words'"
            />
            <label for="blankWidth2Words">2 词长</label>
            <input
              type="radio"
              name="clozeBlankWidth"
              id="blankWidth3Words"
              value="3words"
              :checked="state.draft.settings.clozeBlankWidth === '3words'"
              @change="state.draft.settings.clozeBlankWidth = '3words'"
            />
            <label for="blankWidth3Words">3 词长</label>
          </div>
        </div>
      </div>

      <GeneralQuestionEditor
        v-if="structuredTypes.includes(currentInputType)"
        :type="currentInputType"
        :editing-item="editingItem"
        @submit="handleStructuredSubmit"
        @cancel="cancelEditing"
        @error="message.error"
      />

      <!-- 快速文本录入框 (单词/句子挖空/句子默写模式) -->
      <template v-if="currentInputType !== 'alphabet' && !structuredTypes.includes(currentInputType)">
        <p class="form-desc" id="formDescWords">
          {{ inputHelperTip }}
        </p>

        <textarea
          class="word-textarea"
          id="customWordTextarea"
          v-model="rawText"
          rows="7"
          :placeholder="inputPlaceholder"
          data-debug-id="Q-003"
          data-debug-name="快速输入文本框"
          style="width: 100%; min-height: 160px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main); border-radius: 6px; padding: 10px; font-size: 13px; line-height: 1.55; font-family: inherit; margin-bottom: 10px; resize: vertical;"
        ></textarea>

        <div class="action-btn-row">
          <n-button
            type="primary"
            size="small"
            id="btnParseText"
            data-debug-id="Q-004"
            data-debug-name="添加到试卷按钮"
            @click="handleAppendText"
          >
            <template #icon><AppIcon name="plus" :size="14" /></template>
            添加到试卷
          </n-button>

          <!-- 兼容旧测试脚本隐藏桩 (保持 append 语义，不干扰用户) -->
          <button id="btnAppendText" style="display:none;" aria-hidden="true" @click="handleAppendText"></button>
          <button id="btnLoadDefaultSample" style="display:none;" aria-hidden="true" @click="handleLoadDefaultCompat"></button>

          <n-button
            size="small"
            id="btnSaveDraftToLib"
            data-debug-id="Q-005"
            data-debug-name="存入词库按钮"
            @click="handleSaveDraftToLib"
            title="将当前试卷词汇保存到本地词库"
          >
            <template #icon><AppIcon name="download" :size="14" /></template>
            存入词库
          </n-button>

          <n-popconfirm
            @positive-click="handleClear"
            positive-text="确定"
            negative-text="取消"
          >
            <template #trigger>
              <n-button
                size="small"
                type="error"
                ghost
                id="btnClearWords"
                data-debug-id="Q-006"
                data-debug-name="清空试卷按钮"
              >
                <template #icon><AppIcon name="trash" :size="14" /></template>
                清空试卷
              </n-button>
            </template>
            确定要清空试卷上的全部题目吗？
          </n-popconfirm>
        </div>
      </template>

      <!-- 试卷题目列表 (Vue 响应式 v-for 驱动，带题型标识与稳定 debug-id) -->
      <div
        class="words-list-container"
        id="wordsListContainer"
        data-debug-id="Q-007"
        data-debug-name="试卷题目列表"
      >
        <template v-if="state.draft.items.length === 0">
          <div class="empty-list-tip">
            暂无题目，请在上方输入框添加题目或从词库中选题
          </div>
        </template>

        <template v-else>
          <div
            v-for="(item, index) in state.draft.items"
            :key="item.id || index"
            class="word-item-row word-chip question-card"
            :data-id="item.id"
            :data-debug-id="'ITEM-' + item.id"
            data-debug-name="试卷题目项"
          >
            <div class="word-item-main">
              <span class="word-item-index">{{ index + 1 }}.</span>
              <span class="question-type-tag" :class="item.questionType || 'word-dictation'">
                {{ getQuestionTypeLabel(item.questionType) }}
              </span>

              <span v-if="item.en" class="word-item-en word-chip-en">
                <template v-if="item.questionType === 'sentence-cloze' && (item.en.includes('[') || item.en.includes('{'))">
                  <mark class="chip-blank-mark">{{ item.en }}</mark>
                </template>
                <template v-else>
                  {{ item.en }}
                </template>
              </span>
              <span v-else-if="item.alphabetType" class="word-item-en word-chip-en">
                {{ item.prompt }}
              </span>
              <span v-else-if="item.stem" class="word-item-en word-chip-en">{{ item.stem }}</span>
              <span v-else-if="item.title || item.instructions" class="word-item-en word-chip-en">{{ item.title || item.instructions }}</span>
              <span v-else class="word-chip-en" style="display:none;"></span>

              <span v-if="item.zh" class="word-item-zh word-chip-zh">{{ item.zh }}</span>
              <span v-else class="word-chip-zh" style="display:none;"></span>
            </div>

            <div class="word-item-actions">
              <select class="item-layout-select" :value="item.layout?.columns || ''" @change="setItemColumns(item, $event.target.value)" title="单题布局覆盖">
                <option value="">继承题型默认</option>
                <option v-for="option in layoutOptionsFor(item)" :key="option" :value="option">每行{{ option }}题</option>
              </select>
              <button v-if="structuredTypes.includes(item.questionType)" type="button" class="word-item-btn" title="编辑" @click.stop="editItem(index)">编辑</button>
              <button type="button" class="word-item-btn" title="复制" @click.stop="duplicateItem(index)">复制</button>
              <IconActionButton class="word-item-btn" label="上移题目" icon="arrow-up" :icon-size="12" @click.stop="moveUp(index)" />
              <IconActionButton class="word-item-btn" label="下移题目" icon="arrow-down" :icon-size="12" @click.stop="moveDown(index)" />
              <IconActionButton class="word-item-btn del" label="删除题目" icon="trash" :icon-size="12" @click.stop="removeItem(index)" />
            </div>
          </div>
        </template>
      </div>
    </n-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { NCard, NButton, NPopconfirm, useMessage } from 'naive-ui';
import { state, db } from '../stores/appStore.js';
import { parseCustomText, generateId } from '../core/tokenizer.js';
import {
  DEFAULT_WORDS_RAW,
  DEFAULT_CLOZE_WORDS_RAW,
  createDraftItem,
  autoAdaptCopiesAndCapacity
} from '../core/layout.js';
import { detectDuplicates } from '../core/storage.js';
import {
  generateAlphabetSequenceItems,
  generateLetterNeighborsItems,
  generateCaseConversionItems,
  ALPHABET_PRESETS
} from '../core/alphabet.js';
import AppIcon from './AppIcon.vue';
import IconActionButton from './IconActionButton.vue';
import GeneralQuestionEditor from './GeneralQuestionEditor.vue';
import { getQuestionTypesByEditor, normalizeQuestion } from '../question-types/registry.js';

const message = useMessage();
const rawText = ref('');
const currentInputType = ref('word-dictation');
const structuredTypes = getQuestionTypesByEditor('GeneralQuestionEditor');
const editingIndex = ref(-1);
const editingItem = computed(() => editingIndex.value >= 0 ? state.draft.items[editingIndex.value] : null);

const inputPlaceholder = computed(() => {
  if (currentInputType.value === 'sentence-cloze') {
    return '在此输入或粘贴挖空句子（支持每行一条）。\n示例：\nI have an [apple]. 我有一个苹果。\nShe likes to [read] books. 她喜欢看书。';
  }
  if (currentInputType.value === 'sentence-dictation') {
    return '在此输入或粘贴完整句子（支持每行一条，学生在四线三格中默写整句）。\n示例：\nHow are you? 你好吗？\nThis is my new classroom. 这是我的新教室。';
  }
  return '在此输入或粘贴单词（支持纯中文、英文、或中英对照，每行一条）。\n示例：\napple 苹果\nbanana 香蕉\nclassroom 教室';
});

const inputHelperTip = computed(() => {
  if (currentInputType.value === 'sentence-cloze') {
    return '提示：用 [ ] 标出挖空词，学生在四线三格中填写该词；支持中英对照或纯英文。';
  }
  if (currentInputType.value === 'sentence-dictation') {
    return '提示：整句默写模式，中文作为题干，根据句子长度智能分配 1~3 行四线三格供学生书写。';
  }
  return '提示：支持每行一词；支持纯中文、纯英文或“英文 中文”对照；中文为空时仍生成四线格。';
});

function getQuestionTypeLabel(type) {
  switch (type) {
    case 'sentence-cloze':
      return '挖空';
    case 'sentence-dictation':
      return '句默';
    case 'alphabet':
      return '字母';
    case 'choice':
      return '选择';
    case 'inline-fill':
      return '填空';
    case 'english-composition':
      return '作文';
    case 'word-dictation':
    default:
      return '单词';
  }
}

function onInputTypeChange(type) {
  currentInputType.value = type;
  if (editingItem.value?.questionType !== type) editingIndex.value = -1;
  if (type === 'sentence-cloze') {
    state.draft.settings.dictMode = 'cloze';
  } else if (type === 'alphabet') {
    state.draft.settings.dictMode = 'alphabet';
  } else if (type === 'sentence-dictation') {
    state.draft.settings.dictMode = 'sentence';
  } else if (structuredTypes.includes(type)) {
    state.draft.settings.dictMode = 'mixed';
  } else {
    state.draft.settings.dictMode = 'writing';
  }
}

function handleStructuredSubmit(item) {
  if (editingIndex.value >= 0) {
    state.draft.items.splice(editingIndex.value, 1, item);
    editingIndex.value = -1;
    message.success('题目修改已保存');
  } else {
    state.draft.items.push(item);
    message.success('题目已添加到试卷');
  }
}

function editItem(index) {
  editingIndex.value = index;
  currentInputType.value = state.draft.items[index].questionType;
}

function cancelEditing() {
  editingIndex.value = -1;
}

function duplicateItem(index) {
  const source = JSON.parse(JSON.stringify(state.draft.items[index]));
  source.id = generateId('item');
  if (Array.isArray(source.options)) {
    const idMap = new Map();
    source.options = source.options.map((option) => {
      const id = generateId('option');
      idMap.set(option.id, id);
      return { ...option, id };
    });
    source.answers = (source.answers || []).map((id) => idMap.get(id)).filter(Boolean);
  }
  if (Array.isArray(source.blanks)) {
    const idMap = new Map();
    source.blanks = source.blanks.map((blank) => {
      const id = generateId('blank');
      idMap.set(blank.id, id);
      return { ...blank, id };
    });
    source.stemSegments = (source.stemSegments || []).map((segment) => segment.type === 'blank'
      ? { ...segment, blankId: idMap.get(segment.blankId) }
      : segment);
  }
  state.draft.items.splice(index + 1, 0, normalizeQuestion(source));
  message.success('已复制题目');
}

function layoutOptionsFor(item) {
  if (item.questionType === 'word-dictation') return [2, 3, 4];
  if (item.questionType === 'english-composition') return [1];
  if (item.questionType === 'alphabet') return [1, 2, 3, 4];
  return [1, 2];
}

function setItemColumns(item, value) {
  if (!item.layout) item.layout = {};
  if (!value) delete item.layout.columns;
  else item.layout.columns = Number(value);
}

// 字母专项配置
const alphabetActiveType = ref('sequence');
const alphaSeqConfig = ref({
  caseStyle: 'pair',
  subMode: 'full',
  gapCount: 13
});
const alphaNeighConfig = ref({
  count: 9,
  caseStyle: 'upper',
  neighborType: 'both'
});
const alphaCaseConfig = ref({
  count: 9,
  direction: 'upper_to_lower'
});

function handleGenerateAlphabet(isAppend = true) {
  let newItems = [];
  let defaultTitle = '';
  let defaultCols = 3;
  let defaultCopies = 3;
  let defaultWordsPerPage = 9;

  if (alphabetActiveType.value === 'sequence') {
    newItems = generateAlphabetSequenceItems(alphaSeqConfig.value);
    const subLabel = alphaSeqConfig.value.subMode === 'gap' ? '接龙填空' : (alphaSeqConfig.value.subMode === 'shuffle' ? '随机听写' : '规范书写');
    defaultTitle = `三年级英语 26个英文字母${subLabel}卷`;
    defaultCols = 3;
    defaultCopies = 1;
    defaultWordsPerPage = 26;
  } else if (alphabetActiveType.value === 'neighbors') {
    newItems = generateLetterNeighborsItems(alphaNeighConfig.value);
    defaultTitle = '三年级英语 字母左右邻居专项练习卷';
    defaultCols = 3;
    defaultCopies = 3;
    defaultWordsPerPage = alphaNeighConfig.value.count || 9;
  } else if (alphabetActiveType.value === 'case') {
    newItems = generateCaseConversionItems(alphaCaseConfig.value);
    defaultTitle = '三年级英语 字母大小写转换专项练习卷';
    defaultCols = 3;
    defaultCopies = 3;
    defaultWordsPerPage = alphaCaseConfig.value.count || 9;
  }

  if (isAppend) {
    state.draft.items.push(...newItems);
    message.success(`已添加 ${newItems.length} 道字母题至当前试卷！`);
  } else {
    state.draft.items = newItems;
    state.draft.settings.dictMode = 'alphabet';
    state.draft.settings.title = defaultTitle;
    state.draft.settings.columns = defaultCols;
    state.draft.settings.copiesPerPage = defaultCopies;
    state.draft.settings.wordsPerPage = defaultWordsPerPage;
    message.success(`已生成 ${newItems.length} 道字母练习题并应用版式！`);
  }
}

function handleLoadAlphabetPreset(presetKey) {
  const preset = ALPHABET_PRESETS.find(p => p.key === presetKey);
  if (!preset) return;
  state.draft.settings.dictMode = 'alphabet';
  state.draft.settings.title = preset.settings.title;
  state.draft.settings.columns = preset.settings.columns;
  state.draft.settings.copiesPerPage = preset.settings.copiesPerPage;
  state.draft.settings.wordsPerPage = preset.settings.wordsPerPage || 9;
  state.draft.items = preset.getItems();
  message.success(`已载入「${preset.title}」！`);
}

// 添加到试卷 (追加语义)
function handleAppendText() {
  const textarea = document.getElementById('customWordTextarea');
  const text = (textarea ? textarea.value : '') || rawText.value;
  if (!text || !text.trim()) {
    message.warning('请输入题目内容后再点击添加');
    return;
  }

  const parsed = parseCustomText(text, currentInputType.value === 'sentence-cloze' ? 'cloze' : 'writing');
  if (parsed.length === 0) {
    message.warning('未识别到有效内容，请检查输入格式');
    return;
  }

  const newItems = parsed.map(it => {
    if (currentInputType.value === 'sentence-dictation') {
      return createDraftItem({ ...it, type: 'sentence', questionType: 'sentence-dictation' });
    }
    if (currentInputType.value === 'sentence-cloze') {
      return createDraftItem({ ...it, type: 'sentence', questionType: 'sentence-cloze' });
    }
    return createDraftItem(it, currentInputType.value);
  });

  state.draft.items.push(...newItems);
  rawText.value = '';
  if (textarea) textarea.value = '';

  const adapted = autoAdaptCopiesAndCapacity(state.draft.items, state.draft.settings);
  state.draft.settings.copiesPerPage = adapted.copiesPerPage;
  state.draft.settings.wordsPerPage = adapted.wordsPerPage;
  message.success(`已成功添加 ${newItems.length} 道题目到试卷！`);
}

// 兼容旧测试脚本
function handleLoadDefaultCompat() {
  if (state.draft.settings.dictMode === 'cloze') {
    state.draft.items = DEFAULT_CLOZE_WORDS_RAW.map(s => createDraftItem(s));
    state.draft.settings.columns = 2;
    const adapted = autoAdaptCopiesAndCapacity(state.draft.items, state.draft.settings);
    state.draft.settings.copiesPerPage = adapted.copiesPerPage;
    state.draft.settings.wordsPerPage = adapted.wordsPerPage;
    message.success('已载入 9 个句子挖空示例！');
  } else {
    const items = DEFAULT_WORDS_RAW.map(w => createDraftItem(w));
    state.draft.items = items;
    state.draft.settings.wordsPerPage = 9;
    state.draft.settings.copiesPerPage = 3;
    state.draft.settings.columns = 3;
    message.success('已载入 9 词示例！');
  }
}

async function handleSaveDraftToLib() {
  if (state.draft.items.length === 0) {
    message.warning('当前试卷暂无题目可保存');
    return;
  }
  const dupCheck = detectDuplicates(state.library.words, state.draft.items);
  if (dupCheck.unique.length === 0) {
    message.info(`试卷中的 ${state.draft.items.length} 个单词均已存在于词库中`);
    return;
  }
  let targetGroup = '通用词汇';
  if (state.draft.settings.title && state.draft.settings.title.trim()) {
    targetGroup = state.draft.settings.title.replace(/单词默写|默写纸|练习卷|专项卷/g, '').trim() || '通用词汇';
  }

  const newWords = dupCheck.unique.map(it => ({
    id: it.id || generateId('w'),
    en: it.en,
    zh: it.zh,
    phonetic: it.phonetic || '',
    group: it.group || targetGroup,
    updatedAt: Date.now()
  }));
  state.library.words = state.library.words.concat(newWords);
  await db.bulkPut('words', newWords);
  const dupTip = dupCheck.duplicates.length > 0 ? ` (${dupCheck.duplicates.length} 条已存在跳过)` : '';
  message.success(`已成功将 ${newWords.length} 个新词保存到本地词库「${targetGroup}」${dupTip}！`);
}

function handleClear() {
  state.draft.items = [];
  rawText.value = '';
  message.info('已清空试卷题目');
}

function moveUp(index) {
  if (index > 0) {
    const temp = state.draft.items[index];
    state.draft.items[index] = state.draft.items[index - 1];
    state.draft.items[index - 1] = temp;
  }
}

function moveDown(index) {
  if (index < state.draft.items.length - 1) {
    const temp = state.draft.items[index];
    state.draft.items[index] = state.draft.items[index + 1];
    state.draft.items[index + 1] = temp;
  }
}

function removeItem(index) {
  state.draft.items.splice(index, 1);
}
</script>

<style scoped>
.quick-input-pane {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pane-card {
  border-radius: 8px;
  background: #ffffff;
}

.pane-header-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.title-with-icon {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.row-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}

.form-desc {
  font-size: 11.5px;
  color: var(--text-muted);
  line-height: 1.45;
  margin: 0 0 8px 0;
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
  padding: 4px 9px;
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

.cloze-settings-card {
  background: var(--bg-sidebar);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 10px;
}

.action-btn-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.words-list-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 420px;
  overflow-y: auto;
}

.empty-list-tip {
  text-align: center;
  padding: 24px;
  color: var(--text-light);
  font-size: 12px;
}

.word-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--bg-sidebar);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  font-size: 12.5px;
  transition: all 0.15s ease;
}

.word-item-row:hover {
  background: var(--bg-card);
  border-color: var(--border-color);
}

.word-item-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.word-item-index {
  color: var(--text-light);
  font-size: 11.5px;
  min-width: 18px;
}

.word-item-en {
  font-weight: 600;
  color: var(--text-main);
}

.chip-blank-mark {
  background: var(--primary-light);
  color: var(--primary);
  border-radius: 3px;
  padding: 0 4px;
}

.word-item-zh {
  color: var(--text-muted);
  font-size: 12px;
}

.word-item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.item-layout-select {
  max-width: 112px;
  height: 25px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: white;
  color: var(--text-muted);
  font-size: 10.5px;
}

.form-row > .segmented-control {
  flex-wrap: wrap;
}

.word-item-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 2px 5px;
  font-size: 11px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.word-item-btn:hover {
  background: var(--primary-light);
  color: var(--primary);
  border-color: var(--primary);
}

.word-item-btn.del:hover {
  background: #faeceb;
  color: var(--danger);
  border-color: var(--danger);
}

.alphabet-control-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.alphabet-type-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-app);
  padding: 3px;
  border-radius: 6px;
  border: 1px solid var(--border-light);
}

.alpha-type-btn {
  flex: 1;
  padding: 5px 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.alpha-type-btn:hover {
  color: var(--primary);
  background: var(--bg-card);
}

.alpha-type-btn.active {
  color: var(--primary);
  background: var(--bg-card);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.alpha-sub-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
}

.form-row-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sub-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
}

.segmented-control.mini label {
  padding: 2px 7px;
  font-size: 11px;
}

.alpha-presets-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-chip-btn {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-main);
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-chip-btn:hover {
  background: var(--primary-light);
  border-color: var(--primary);
  color: var(--primary);
}

.alpha-action-row {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.info-tip-row {
  font-size: 11px;
  color: var(--primary);
  margin-top: 2px;
  font-weight: 500;
}
</style>
