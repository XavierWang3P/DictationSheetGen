<template>
  <div class="quick-input-pane">
    <n-card size="small" :bordered="false" class="pane-card">
      <template #header>
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
          <span style="font-size:14px; font-weight:700; color:var(--text-main);">📝 单词输入与当前试卷</span>
          <n-badge :value="`${state.draft.items.length} 词`" type="info" id="badgeWordCount" />
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
        </div>
      </div>

      <!-- 挖空形式选择 (仅挖空模式显示) -->
      <div v-if="state.draft.settings.dictMode === 'cloze'" class="form-row" id="rowClozeStyle" style="margin-bottom: 12px;">
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

      <p class="form-desc" id="formDescWords">
        支持每行一词；支持纯中文；支持“word | 中文”、“word - 中文”或空格分隔；中文为空时仍生成默写格。
      </p>

      <textarea
        class="word-textarea"
        id="customWordTextarea"
        v-model="rawText"
        rows="4"
        placeholder="美丽的；优美的&#10;工作努力的；辛勤的&#10;绳；粗绳&#10;聪明的；聪颖的&#10;机器人&#10;钢琴&#10;幼小的；年轻的&#10;跳；跃&#10;国际象棋"
        style="width: 100%; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main); border-radius: 6px; padding: 8px; font-size: 13px; font-family: inherit; margin-bottom: 10px; resize: vertical;"
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

      <!-- 试卷单词列表 -->
      <div class="words-list-container" id="wordsListContainer" @click="handleListClick">
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
              <button type="button" class="word-item-btn" title="上移" @click="moveUp(index)">▲</button>
              <button type="button" class="word-item-btn" title="下移" @click="moveDown(index)">▼</button>
              <button type="button" class="word-item-btn del" title="删除" @click="removeItem(index)">✕</button>
            </div>
          </div>
        </template>
      </div>
    </n-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { NCard, NBadge, NButton, NPopconfirm, useMessage } from 'naive-ui';
import { state, db } from '../stores/appStore.js';
import { parseCustomText, generateId } from '../core/tokenizer.js';
import {
  DEFAULT_WORDS_RAW,
  DEFAULT_CLOZE_WORDS_RAW,
  createDraftItem,
  computePageLayout,
  renderPracticeSheetHtml,
  escapeHtml
} from '../core/layout.js';
import { detectDuplicates } from '../core/storage.js';

const message = useMessage();
const rawText = ref('');

function renderChipsHtml(items) {
  if (!items || items.length === 0) {
    return '<div class="empty-list-tip">暂无单词，请在上方输入框粘贴或载入默认词表</div>';
  }
  return items.map((item, index) => {
    let enHtml = '';
    if (item.en) {
      if (state.draft.settings.dictMode === 'cloze' && (item.en.includes('[') || item.en.includes('{'))) {
        enHtml = `<mark class="chip-blank-mark">${escapeHtml(item.en)}</mark>`;
      } else {
        enHtml = escapeHtml(item.en);
      }
    }
    return `<div class="word-item-row word-chip" data-id="${item.id}">
      <div class="word-item-main">
        <span class="word-item-index">${index + 1}.</span>
        ${item.en ? `<span class="word-item-en word-chip-en">${enHtml}</span>` : '<span class="word-chip-en" style="display:none;"></span>'}
        ${item.zh ? `<span class="word-item-zh word-chip-zh">${escapeHtml(item.zh)}</span>` : '<span class="word-chip-zh" style="display:none;"></span>'}
      </div>
      <div class="word-item-actions">
        <button type="button" class="word-item-btn" title="上移">▲</button>
        <button type="button" class="word-item-btn" title="下移">▼</button>
        <button type="button" class="word-item-btn del" title="删除">✕</button>
      </div>
    </div>`;
  }).join('');
}

function syncDom() {
  const container = document.getElementById('sheetsStreamContainer');
  if (container) {
    const layout = computePageLayout(state.draft.items, state.draft.settings);
    container.innerHTML = renderPracticeSheetHtml(layout, state.draft.settings);
  }
  const listEl = document.getElementById('wordsListContainer');
  if (listEl) {
    listEl.innerHTML = renderChipsHtml(state.draft.items);
  }
}

function handleListClick(e) {
  const target = e.target;
  const row = target.closest('.word-item-row');
  if (!row) return;
  const id = row.getAttribute('data-id');
  const index = state.draft.items.findIndex(it => it.id === id);
  if (index === -1) return;
  if (target.classList.contains('del') || target.textContent === '✕') {
    removeItem(index);
  } else if (target.title === '上移' || target.textContent === '▲') {
    moveUp(index);
  } else if (target.title === '下移' || target.textContent === '▼') {
    moveDown(index);
  }
}

function onModeChange(mode) {
  state.draft.settings.dictMode = mode;
  syncDom();
}

function onClozeStyleChange(style) {
  state.draft.settings.clozeStyle = style;
  syncDom();
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
  syncDom();
  message.success(`已成功载入 ${list.length} 个单词！`);
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
  syncDom();
  message.success(`已追加 ${list.length} 个单词！`);
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
    message.success('已载入 9 个句子挖空示例！');
  } else {
    state.draft.items = DEFAULT_WORDS_RAW.map(w => createDraftItem(w));
    message.success('已载入默认 9 词与推荐设置！');
  }
  syncDom();
}

function handleClear() {
  state.draft.items = [];
  rawText.value = '';
  syncDom();
  message.info('已清空试卷词汇表');
}

function moveUp(index) {
  if (index > 0) {
    const temp = state.draft.items[index];
    state.draft.items[index] = state.draft.items[index - 1];
    state.draft.items[index - 1] = temp;
    syncDom();
  }
}

function moveDown(index) {
  if (index < state.draft.items.length - 1) {
    const temp = state.draft.items[index];
    state.draft.items[index] = state.draft.items[index + 1];
    state.draft.items[index + 1] = temp;
    syncDom();
  }
}

function removeItem(index) {
  state.draft.items.splice(index, 1);
  syncDom();
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
</style>
