<template>
  <div class="visual-cloze-pane">
    <!-- 句子录入与可视化挖空工作区 -->
    <n-card size="small" :bordered="false" class="pane-card">
      <template #header>
        <span style="font-size:14px; font-weight:700; color:#0f172a;">✏️ 句子录入与可视化挖空</span>
      </template>

      <p class="form-desc">
        输入完整英文句子与中文释义，点击下方对应单词即可将其一键设为挖空或取消挖空。
      </p>

      <div class="form-item-block">
        <label class="item-label">英文句子</label>
        <input
          type="text"
          v-model="sentenceText"
          id="inputVisualSentence"
          placeholder="例: Ask your teacher for help."
          class="native-search-input"
          @input="onSentenceInput"
        />
      </div>

      <div class="form-item-block" style="margin-top: 8px;">
        <label class="item-label">中文翻译</label>
        <input
          type="text"
          v-model="translationText"
          id="inputVisualTranslation"
          placeholder="例: 向你的老师求助。"
          class="native-search-input"
          @input="onTranslationInput"
        />
      </div>

      <div style="margin-top: 12px;">
        <label class="item-label" style="display:block; margin-bottom: 6px;">
          💡 点击单词设为挖空 (蓝色高亮为挖空目标)：
        </label>
        <div class="visual-token-wrap" id="visualTokenWrap" @click="handleTokenWrapClick">
          <template v-if="wordTokens.length === 0">
            <span style="color:#94a3b8; font-size:12px;">请输入完整英文句子以生成可点击单词</span>
          </template>
          <template v-else>
            <button
              v-for="tok in wordTokens"
              :key="tok.id"
              type="button"
              class="visual-token-btn"
              :class="{ 'is-blank': tok.isBlank }"
              :data-id="tok.id"
              @click="toggleTokenBlank(tok)"
            >
              {{ tok.text }}
            </button>
          </template>
        </div>
      </div>

      <div style="margin-top: 14px;">
        <label class="item-label" style="display:block; margin-bottom: 6px;">
          👀 默写纸挖空预览效果：
        </label>
        <div class="visual-cloze-preview" id="visualClozePreview">
          <template v-if="segments.length === 0">
            <span style="color:#94a3b8; font-size:12px;">暂无预览内容</span>
          </template>
          <template v-else>
            <div style="width:100%;">
              <div style="font-size:13.5px; color:#1e293b; line-height:1.6;">
                <template v-for="(seg, sIdx) in segments" :key="sIdx">
                  <span
                    v-if="seg.blank"
                    style="border-bottom:2px solid #0284c7; color:#0284c7; font-weight:700; padding:0 4px; margin:0 2px;"
                  >
                    ( {{ seg.text.trim() }} )
                  </span>
                  <span v-else>{{ seg.text }}</span>
                </template>
              </div>
              <div v-if="translationText" style="font-size:11.5px; color:#64748b; margin-top:4px;">
                释义：{{ translationText }}
              </div>
              <div v-if="!hasBlank" style="font-size:11px; color:#e11d48; margin-top:3px;">
                ⚠️ 提示：尚未选择挖空单词，请点击上方单词胶囊
              </div>
            </div>
          </template>
        </div>
      </div>

      <div class="action-btn-row" style="margin-top: 14px;">
        <n-button type="primary" size="small" id="btnAddVisualToDraft" style="flex:1;" @click="handleAddToDraft">
          ➕ 加入当前试卷
        </n-button>
        <n-button size="small" id="btnSaveVisualToLib" @click="handleSaveToLib">
          💾 保存至句库
        </n-button>
        <n-button size="small" id="btnClearVisualCloze" @click="handleReset">
          重置
        </n-button>
      </div>
    </n-card>

    <!-- 本地句库列表 -->
    <n-card size="small" :bordered="false" class="pane-card" style="margin-top: 12px;">
      <template #header>
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
          <span style="font-size:14px; font-weight:700; color:#0f172a;">📚 本地句库列表</span>
          <n-badge :value="`共 ${state.library.sentences.length} 句`" type="info" id="libSentenceBadge" />
        </div>
      </template>

      <div class="words-list-container" id="libSentencesContainer" style="max-height: 260px;">
        <template v-if="state.library.sentences.length === 0">
          <div class="empty-list-tip">
            本地句库为空，可将上方编辑的挖空句子「保存至句库」
          </div>
        </template>
        <template v-else>
          <div
            v-for="s in state.library.sentences"
            :key="s.id"
            class="lib-item-row"
            :data-id="s.id"
          >
            <div style="flex:1; overflow:hidden; padding-right:6px;">
              <div class="sentence-en-display">
                <template v-for="(seg, idx) in s.segments" :key="idx">
                  <strong v-if="seg.blank" style="color:#0284c7; text-decoration:underline;">[{{ seg.text.trim() }}]</strong>
                  <span v-else>{{ seg.text }}</span>
                </template>
              </div>
              <div class="sentence-zh-display">
                {{ s.zh || s.translation || '' }}
              </div>
            </div>

            <div class="lib-item-actions">
              <button
                type="button"
                class="btn-act btn-sentence-add"
                :data-id="s.id"
                title="加入当前试卷"
                @click="handleAddSentenceToDraft(s)"
              >
                ➕ 试卷
              </button>
              <button
                type="button"
                class="btn-act del btn-sentence-del"
                :data-id="s.id"
                title="从句库中删除"
                @click="handleDeleteSentence(s.id)"
              >
                ✕
              </button>
            </div>
          </div>
        </template>
      </div>
    </n-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { NCard, NBadge, NButton, useMessage } from 'naive-ui';
import { state, db } from '../stores/appStore.js';
import {
  parseSentenceIntoVisualTokens,
  getVisualSegments,
  segmentsToMarkedText,
  generateId
} from '../core/tokenizer.js';
import { computePageLayout, renderPracticeSheetHtml, createDraftItem, escapeHtml } from '../core/layout.js';

const message = useMessage();
const sentenceText = ref('Ask your teacher for help.');
const translationText = ref('向你的老师求助。');
const tokens = ref(parseSentenceIntoVisualTokens(sentenceText.value));

const wordTokens = computed(() => tokens.value.filter(t => t.isWord));
const segments = computed(() => getVisualSegments(tokens.value));
const hasBlank = computed(() => segments.value.some(s => s.blank));

function syncSheetDom() {
  const container = document.getElementById('sheetsStreamContainer');
  if (container) {
    const layout = computePageLayout(state.draft.items, state.draft.settings);
    container.innerHTML = renderPracticeSheetHtml(layout, state.draft.settings);
  }
}

function renderTokensHtml(tokList) {
  const words = (tokList || []).filter(t => t.isWord);
  if (words.length === 0) {
    return '<span style="color:#94a3b8; font-size:12px;">请输入完整英文句子以生成可点击单词</span>';
  }
  return words.map(tok => {
    return `<button type="button" class="visual-token-btn ${tok.isBlank ? 'is-blank' : ''}" data-id="${tok.id}">${escapeHtml(tok.text)}</button>`;
  }).join('');
}

function renderPreviewHtml(tokList, translation) {
  const segs = getVisualSegments(tokList);
  if (!segs || segs.length === 0) {
    return '<span style="color:#94a3b8; font-size:12px;">暂无预览内容</span>';
  }
  const segHtml = segs.map(seg => {
    if (seg.blank) {
      return `<span style="border-bottom:2px solid #0284c7; color:#0284c7; font-weight:700; padding:0 4px; margin:0 2px;">( ${escapeHtml(seg.text.trim())} )</span>`;
    }
    return `<span>${escapeHtml(seg.text)}</span>`;
  }).join('');

  return `<div style="width:100%;">
    <div style="font-size:13.5px; color:#1e293b; line-height:1.6;">${segHtml}</div>
    ${translation ? `<div style="font-size:11.5px; color:#64748b; margin-top:4px;">释义：${escapeHtml(translation)}</div>` : ''}
  </div>`;
}

function syncVisualDom() {
  const wrap = document.getElementById('visualTokenWrap');
  if (wrap) {
    wrap.innerHTML = renderTokensHtml(tokens.value);
  }
  const preview = document.getElementById('visualClozePreview');
  if (preview) {
    preview.innerHTML = renderPreviewHtml(tokens.value, translationText.value);
  }
}

function onSentenceInput(e) {
  sentenceText.value = e.target.value;
  tokens.value = parseSentenceIntoVisualTokens(sentenceText.value);
  syncVisualDom();
}

function onTranslationInput(e) {
  translationText.value = e.target.value;
  syncVisualDom();
}

function toggleTokenBlank(tok, e) {
  tok.isBlank = !tok.isBlank;
  if (e?.currentTarget) {
    e.currentTarget.classList.toggle('is-blank', tok.isBlank);
  }
  const preview = document.getElementById('visualClozePreview');
  if (preview) {
    preview.innerHTML = renderPreviewHtml(tokens.value, translationText.value);
  }
}

function handleTokenWrapClick(e) {
  const btn = e.target.closest('.visual-token-btn');
  if (!btn) return;
  const word = btn.textContent.trim();
  const id = btn.getAttribute('data-id');
  const tok = tokens.value.find(t => t.id === id || (t.isWord && t.text === word));
  if (tok) {
    tok.isBlank = !tok.isBlank;
    btn.classList.toggle('is-blank', tok.isBlank);
    const preview = document.getElementById('visualClozePreview');
    if (preview) {
      preview.innerHTML = renderPreviewHtml(tokens.value, translationText.value);
    }
  }
}

function handleAddToDraft() {
  if (!hasBlank.value) {
    if (message) message.warning('请先点击上方蓝色胶囊单词设置至少一个挖空目标！');
    return;
  }
  const enMarked = segmentsToMarkedText(segments.value);
  const draftItem = createDraftItem({
    id: generateId('s'),
    type: 'sentence',
    en: enMarked,
    zh: translationText.value.trim(),
    translation: translationText.value.trim(),
    segments: segments.value
  });
  state.draft.items.push(draftItem);
  if (state.draft.settings.dictMode !== 'cloze') {
    state.draft.settings.dictMode = 'cloze';
  }
  syncSheetDom();
  if (message) message.success('已加入当前试卷并同步为句子挖空模式！');
}

async function handleSaveToLib() {
  if (!hasBlank.value) {
    if (message) message.warning('请先点击上方单词设置至少一个挖空目标！');
    return;
  }
  const enMarked = segmentsToMarkedText(segments.value);
  const sentenceItem = {
    id: generateId('s'),
    type: 'sentence',
    en: enMarked,
    zh: translationText.value.trim(),
    translation: translationText.value.trim(),
    segments: segments.value,
    updatedAt: Date.now()
  };
  state.library.sentences.unshift(sentenceItem);
  await db.bulkPut('sentences', [sentenceItem]);
  if (message) message.success('已成功保存至本地句库！');
}

function handleReset() {
  sentenceText.value = '';
  translationText.value = '';
  tokens.value = [];
  syncVisualDom();
  if (message) message.info('已重置可视化输入区');
}

function handleAddSentenceToDraft(s) {
  const draftItem = createDraftItem({
    type: 'sentence',
    en: s.en,
    zh: s.zh || s.translation || '',
    translation: s.zh || s.translation || '',
    segments: s.segments,
    sourceId: s.id
  });
  state.draft.items.push(draftItem);
  if (state.draft.settings.dictMode !== 'cloze') {
    state.draft.settings.dictMode = 'cloze';
  }
  syncSheetDom();
  if (message) message.success('已加入当前试卷并同步为挖空模式！');
}

async function handleDeleteSentence(id) {
  const idx = state.library.sentences.findIndex(s => s.id === id);
  if (idx !== -1) {
    state.library.sentences.splice(idx, 1);
    await db.delete('sentences', id);
    if (message) message.info('已从句库移除该句子');
  }
}
</script>

<style scoped>
.visual-cloze-pane {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.native-search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 10px;
  font-size: 13px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s;
}

.native-search-input:focus {
  border-color: #0284c7;
}

.pane-card {
  border-radius: 8px;
  background: #ffffff;
}

.form-desc {
  font-size: 11.5px;
  color: #64748b;
  line-height: 1.45;
  margin: 0 0 10px 0;
}

.item-label {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  display: block;
  margin-bottom: 4px;
}

.visual-token-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 6px;
  min-height: 48px;
  align-items: center;
}

.visual-token-btn {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 13px;
  font-family: Arial, sans-serif;
  cursor: pointer;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #1e293b;
  user-select: none;
  transition: all 0.15s ease;
}

.visual-token-btn:hover {
  background: #eff6ff;
  border-color: #0284c7;
  color: #0284c7;
}

.visual-token-btn.is-blank {
  background: #0284c7;
  color: #ffffff;
  border-color: #0284c7;
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(2, 132, 199, 0.35);
}

.visual-cloze-preview {
  padding: 8px 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  min-height: 42px;
  display: flex;
  align-items: center;
}

.action-btn-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.words-list-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
}

.empty-list-tip {
  text-align: center;
  padding: 24px;
  color: #94a3b8;
  font-size: 12px;
}

.lib-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  gap: 8px;
}

.lib-item-row:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.sentence-en-display {
  font-size: 12px;
  color: #0f172a;
  line-height: 1.4;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.sentence-zh-display {
  font-size: 11px;
  color: #64748b;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.lib-item-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.btn-act {
  background: transparent;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 11px;
  cursor: pointer;
  color: #475569;
  transition: all 0.15s ease;
}

.btn-act:hover {
  background: #eff6ff;
  color: #0284c7;
  border-color: #0284c7;
}

.btn-act.del:hover {
  background: #fff1f2;
  color: #e11d48;
  border-color: #e11d48;
}
</style>
