<template>
  <div class="quick-input-pane">
    <n-card size="small" :bordered="false" class="pane-card">
      <template #header>
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
          <span style="font-size:14px; font-weight:700; color:var(--text-main);">📝 单词输入与当前试卷</span>
          <n-badge :value="badgeText" type="info" id="badgeWordCount" />
        </div>
      </template>

      <!-- 出卷模式选择 -->
      <div class="form-row" style="margin-bottom: 12px;">
        <label class="row-label">出卷模式</label>
        <div class="segmented-control">
          <input
            type="radio"
            name="dictMode"
            id="modeWriting"
            value="writing"
            :checked="state.draft.settings.dictMode === 'writing'"
            @click="onModeChange('writing')"
            @change="onModeChange('writing')"
          />
          <label for="modeWriting">看中文默写</label>
          <input
            type="radio"
            name="dictMode"
            id="modeCloze"
            value="cloze"
            :checked="state.draft.settings.dictMode === 'cloze'"
            @click="onModeChange('cloze')"
            @change="onModeChange('cloze')"
          />
          <label for="modeCloze">✏️ 句子挖空填写</label>
          <input
            type="radio"
            name="dictMode"
            id="modeAlphabet"
            value="alphabet"
            :checked="state.draft.settings.dictMode === 'alphabet'"
            @click="onModeChange('alphabet')"
            @change="onModeChange('alphabet')"
          />
          <label for="modeAlphabet">🔤 三年级字母专项</label>
        </div>
      </div>

      <!-- 三年级字母专项设置块 (仅字母模式显示) -->
      <div v-if="state.draft.settings.dictMode === 'alphabet'" class="alphabet-control-card" id="alphabetControlCard">
        <div class="alphabet-type-tabs" id="alphabetTypeTabs">
          <button
            type="button"
            class="alpha-type-btn"
            :class="{ active: alphabetActiveType === 'sequence' }"
            id="tabAlphaSeq"
            @click="alphabetActiveType = 'sequence'"
          >
            🔤 26个字母默写
          </button>
          <button
            type="button"
            class="alpha-type-btn"
            :class="{ active: alphabetActiveType === 'neighbors' }"
            id="tabAlphaNeighbors"
            @click="alphabetActiveType = 'neighbors'"
          >
            ↔️ 字母左右邻居
          </button>
          <button
            type="button"
            class="alpha-type-btn"
            :class="{ active: alphabetActiveType === 'case' }"
            id="tabAlphaCase"
            @click="alphabetActiveType = 'case'"
          >
            🔠 大小写形式转换
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

          <div style="font-size:11px; color:var(--primary); margin-top:2px; font-weight:500;">
            ℹ️ 试卷将生成 3 行完整四线三格，每行 9 个独立书写格（按字母表规范排版）。
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

        <!-- 经典精品推荐模板 -->
        <div style="margin-top: 4px;">
          <span style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:4px;">💡 经典推荐模板：</span>
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
          <n-button type="primary" size="small" id="btnGenerateAlphabetSheet" style="flex:1;" @click="handleGenerateAlphabet(false)">
            ⚡ 载入 / 重新随机出卷
          </n-button>
          <n-button size="small" id="btnAppendAlphabetSheet" @click="handleGenerateAlphabet(true)">
            ➕ 追加到试卷
          </n-button>
        </div>
      </div>

      <!-- 挖空形式选择 (仅挖空模式显示) -->
      <div v-if="state.draft.settings.dictMode === 'cloze'" class="form-row" id="rowClozeStyle" style="margin-bottom: 10px;">
        <label class="row-label">挖空形式</label>
        <div class="segmented-control">
          <input
            type="radio"
            name="clozeStyle"
            id="clozeInline"
            value="inline"
            :checked="state.draft.settings.clozeStyle === 'inline'"
            @change="onClozeStyleChange('inline')"
          />
          <label for="clozeInline">句中内嵌填空 (推荐)</label>
          <input
            type="radio"
            name="clozeStyle"
            id="clozeBelow"
            value="below"
            :checked="state.draft.settings.clozeStyle === 'below'"
            @change="onClozeStyleChange('below')"
          />
          <label for="clozeBelow">句下独立书写格</label>
        </div>
      </div>

      <!-- 中文提示位置 (仅挖空模式显示) -->
      <div v-if="state.draft.settings.dictMode === 'cloze'" class="form-row" id="rowClozeZhPos" style="margin-bottom: 10px;">
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
          <label for="clozeZhBelow">句下独立行 (推荐)</label>
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

      <!-- 四线三格挖空长度 (仅挖空模式显示) -->
      <div v-if="state.draft.settings.dictMode === 'cloze'" class="form-row" id="rowClozeBlankWidth" style="margin-bottom: 12px;">
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
          <label for="blankWidth1Word">1 词长 (60px)</label>
          <input
            type="radio"
            name="clozeBlankWidth"
            id="blankWidth2Words"
            value="2words"
            :checked="state.draft.settings.clozeBlankWidth === '2words'"
            @change="state.draft.settings.clozeBlankWidth = '2words'"
          />
          <label for="blankWidth2Words">2 词长 (105px 推荐)</label>
          <input
            type="radio"
            name="clozeBlankWidth"
            id="blankWidth3Words"
            value="3words"
            :checked="state.draft.settings.clozeBlankWidth === '3words'"
            @change="state.draft.settings.clozeBlankWidth = '3words'"
          />
          <label for="blankWidth3Words">3 词长 (150px)</label>
        </div>
      </div>

      <!-- 普通单词/句子模式下的录入区域 (字母模式下隐藏，界面更精简) -->
      <template v-if="state.draft.settings.dictMode !== 'alphabet'">
        <p class="form-desc" id="formDescWords">
          支持每行一词；支持纯中文；支持“word | 中文”、“word - 中文”或空格分隔；中文为空时仍生成默写格。
        </p>

        <textarea
          class="word-textarea"
          id="customWordTextarea"
          v-model="rawText"
          rows="8"
          placeholder="美丽的；优美的&#10;工作努力的；辛勤的&#10;绳；粗绳&#10;聪明的；聪颖的&#10;机器人&#10;钢琴&#10;幼小的；年轻的&#10;跳；跃&#10;国际象棋"
          style="width: 100%; min-height: 180px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main); border-radius: 6px; padding: 10px; font-size: 13px; line-height: 1.55; font-family: inherit; margin-bottom: 10px; resize: vertical;"
        ></textarea>

        <div class="action-btn-row">
          <n-button type="primary" size="small" id="btnParseText" @click="handleParseText">
            载入/替换试卷
          </n-button>
          <n-button size="small" id="btnAppendText" @click="handleAppendText">
            追加
          </n-button>
          <n-button size="small" id="btnSaveDraftToLib" @click="handleSaveDraftToLib" title="将当前试卷词汇保存到本地词库">
            📥 存入词库
          </n-button>
          <n-button size="small" id="btnLoadDefaultSample" @click="handleLoadDefault">
            默认9词
          </n-button>
          <n-popconfirm @positive-click="handleClear">
            <template #trigger>
              <n-button size="small" type="error" ghost id="btnClearWords">
                清空试卷
              </n-button>
            </template>
            确定要清空试卷上的全部词汇吗？
          </n-popconfirm>
        </div>
      </template>

      <!-- 试卷单词列表 (完全由 Vue 响应式 v-for 驱动，禁止 innerHTML 暴力重写) -->
      <div class="words-list-container" id="wordsListContainer">
        <template v-if="state.draft.items.length === 0">
          <div class="empty-list-tip">
            暂无单词，请在上方输入框粘贴或载入默认词表
          </div>
        </template>

        <template v-else>
          <div
            v-for="(item, index) in state.draft.items"
            :key="item.id || index"
            class="word-item-row word-chip"
            :data-id="item.id"
          >
            <div class="word-item-main">
              <span class="word-item-index">{{ index + 1 }}.</span>
              <span v-if="item.en" class="word-item-en word-chip-en">
                <template v-if="state.draft.settings.dictMode === 'cloze' && (item.en.includes('[') || item.en.includes('{'))">
                  <mark class="chip-blank-mark">{{ item.en }}</mark>
                </template>
                <template v-else>
                  {{ item.en }}
                </template>
              </span>
              <span v-else class="word-chip-en" style="display:none;"></span>

              <span v-if="item.zh" class="word-item-zh word-chip-zh">{{ item.zh }}</span>
              <span v-else class="word-chip-zh" style="display:none;"></span>
            </div>

            <div class="word-item-actions">
              <button type="button" class="word-item-btn" title="上移" @click.stop="moveUp(index)">▲</button>
              <button type="button" class="word-item-btn" title="下移" @click.stop="moveDown(index)">▼</button>
              <button type="button" class="word-item-btn del" title="删除" @click.stop="removeItem(index)">✕</button>
            </div>
          </div>
        </template>
      </div>
    </n-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { NCard, NBadge, NButton, NPopconfirm, useMessage } from 'naive-ui';
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

const message = useMessage();
const rawText = ref('');

const badgeText = computed(() => {
  const count = state.draft.items.length;
  return state.draft.settings.dictMode === 'alphabet' ? `${count} 题` : `${count} 词`;
});

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

function handleGenerateAlphabet(isAppend = false) {
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
    message.success(`已追加 ${newItems.length} 道字母题至当前试卷！`);
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

function onModeChange(mode) {
  state.draft.settings.dictMode = mode;
  if (mode === 'cloze') {
    state.draft.settings.columns = 2; // 句子挖空模式默认切换为 2 列
    const adapted = autoAdaptCopiesAndCapacity(state.draft.items, state.draft.settings);
    state.draft.settings.copiesPerPage = adapted.copiesPerPage;
    state.draft.settings.wordsPerPage = adapted.wordsPerPage;
  }
  if (mode === 'alphabet' && state.draft.items.length === 0) {
    handleGenerateAlphabet(false);
  }
}

function onClozeStyleChange(style) {
  state.draft.settings.clozeStyle = style;
}

function handleParseText() {
  const textarea = document.getElementById('customWordTextarea');
  const text = (textarea ? textarea.value : '') || rawText.value;
  const list = parseCustomText(text, state.draft.settings.dictMode);
  if (list.length === 0) {
    message.warning('未识别到有效词汇，请按提示输入');
    return;
  }
  state.draft.items = list;
  const adapted = autoAdaptCopiesAndCapacity(list, state.draft.settings);
  const oldCopies = state.draft.settings.copiesPerPage;
  state.draft.settings.copiesPerPage = adapted.copiesPerPage;
  state.draft.settings.wordsPerPage = adapted.wordsPerPage;
  if (state.draft.settings.dictMode === 'cloze') {
    const tip = adapted.copiesPerPage !== oldCopies ? `（已自动优化为 1 页 ${adapted.copiesPerPage} 份）` : '';
    message.success(`已成功载入 ${list.length} 个句子${tip}！`);
  } else {
    message.success(`已成功载入 ${list.length} 个单词！`);
  }
}

function handleAppendText() {
  const textarea = document.getElementById('customWordTextarea');
  const text = (textarea ? textarea.value : '') || rawText.value;
  const list = parseCustomText(text, state.draft.settings.dictMode);
  if (list.length === 0) {
    message.warning('未识别到有效词汇，请按提示输入');
    return;
  }
  state.draft.items = state.draft.items.concat(list);
  const adapted = autoAdaptCopiesAndCapacity(state.draft.items, state.draft.settings);
  state.draft.settings.copiesPerPage = adapted.copiesPerPage;
  state.draft.settings.wordsPerPage = adapted.wordsPerPage;
  message.success(`已追加 ${list.length} 个条目！`);
}

async function handleSaveDraftToLib() {
  if (state.draft.items.length === 0) {
    message.warning('当前试卷暂无词汇可保存');
    return;
  }
  const dupCheck = detectDuplicates(state.library.words, state.draft.items);
  if (dupCheck.unique.length === 0) {
    message.info(`试卷中的 ${state.draft.items.length} 个单词均已存在于词库中`);
    return;
  }
  const newWords = dupCheck.unique.map(it => ({
    id: it.id || generateId('w'),
    en: it.en,
    zh: it.zh,
    phonetic: it.phonetic || '',
    updatedAt: Date.now()
  }));
  state.library.words = state.library.words.concat(newWords);
  await db.bulkPut('words', newWords);
  const dupTip = dupCheck.duplicates.length > 0 ? ` (${dupCheck.duplicates.length} 条已存在跳过)` : '';
  message.success(`已成功将 ${newWords.length} 个新词保存到本地词库${dupTip}！`);
}

function handleLoadDefault() {
  if (state.draft.settings.dictMode === 'cloze') {
    state.draft.items = DEFAULT_CLOZE_WORDS_RAW.map(s => createDraftItem(s));
    state.draft.settings.columns = 2; // 默认 2 列
    const adapted = autoAdaptCopiesAndCapacity(state.draft.items, state.draft.settings);
    state.draft.settings.copiesPerPage = adapted.copiesPerPage;
    state.draft.settings.wordsPerPage = adapted.wordsPerPage;
    message.success('已载入 9 个句子挖空示例（已设为 2 列与 1页2份）！');
  } else {
    state.draft.items = DEFAULT_WORDS_RAW.map(w => createDraftItem(w));
    state.draft.settings.wordsPerPage = 9;
    state.draft.settings.copiesPerPage = 3;
    state.draft.settings.columns = 3;
    message.success('已载入默认 9 词与推荐设置！');
  }
}

function handleClear() {
  state.draft.items = [];
  rawText.value = '';
  message.info('已清空试卷词汇表');
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
  max-height: 400px;
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
  gap: 4px;
  flex-shrink: 0;
}

.word-item-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 11px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
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
  padding: 5px 4px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  text-align: center;
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
</style>
