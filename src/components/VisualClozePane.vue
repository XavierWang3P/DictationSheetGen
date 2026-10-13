<template>
  <div class="visual-cloze-pane">
    <!-- 句子录入与可视化挖空工作区 -->
    <n-card size="small" :bordered="false" class="pane-card">
      <template #header>
        <span style="font-size:14px; font-weight:700; color:var(--text-main);">✏️ 句子录入与可视化挖空</span>
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
          @input="onSentenceChange"
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
        />
      </div>

      <div style="margin-top: 12px;">
        <label class="item-label" style="display:block; margin-bottom: 6px;">
          💡 点击单词设为挖空 (墨绿色高亮为挖空目标)：
        </label>
        <!-- 单词胶囊列表 (纯 Vue 响应式驱动，单次点击精确切换) -->
        <div class="visual-token-wrap" id="visualTokenWrap">
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
              @click.stop="toggleTokenBlank(tok)"
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
        <!-- 实时预览区 (纯 Vue 响应式计算属性驱动) -->
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
                    style="border-bottom:2px solid var(--primary); color:var(--primary); font-weight:700; padding:0 4px; margin:0 2px;"
                  >
                    ( {{ seg.text.trim() }} )
                  </span>
                  <span v-else>{{ seg.text }}</span>
                </template>
              </div>
              <div v-if="translationText" style="font-size:11.5px; color:#64748b; margin-top:4px;">
                释义：{{ translationText }}
              </div>
              <div v-if="!hasBlank" style="font-size:11px; color:var(--danger); margin-top:3px;">
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
          <span style="font-size:14px; font-weight:700; color:var(--text-main);">📚 本地句库列表</span>
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
                  <strong v-if="seg.blank" style="color:var(--primary); text-decoration:underline;">[{{ seg.text.trim() }}]</strong>
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
                @click.stop="handleAddSentenceToDraft(s)"
              >
                ➕ 试卷
              </button>
              <button
                type="button"
                class="btn-act del btn-sentence-del"
                :data-id="s.id"
                title="从句库中删除"
                @click.stop="handleDeleteSentence(s.id)"
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
import { createDraftItem, autoAdaptCopiesAndCapacity } from '../core/layout.js';

const message = useMessage();

const sentenceText = ref('Ask your teacher for help.');
const translationText = ref('向你的老师求助。');
const tokens = ref(parseSentenceIntoVisualTokens(sentenceText.value));

const wordTokens = computed(() => tokens.value.filter(t => t.isWord));
const segments = computed(() => getVisualSegments(tokens.value));
const hasBlank = computed(() => segments.value.some(s => s.blank));

function onSentenceChange(e) {
  if (e && e.target) {
    sentenceText.value = e.target.value;
  }
  tokens.value = parseSentenceIntoVisualTokens(sentenceText.value);
}

function toggleTokenBlank(tok) {
  tok.isBlank = !tok.isBlank;
}

function handleAddToDraft() {
  if (!hasBlank.value) {
    message.warning('请先点击上方蓝色胶囊单词设置至少一个挖空目标！');
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
  state.draft.settings.dictMode = 'cloze';
  state.draft.settings.columns = 2; // 默认 2 列
  const adapted = autoAdaptCopiesAndCapacity(state.draft.items, state.draft.settings);
  state.draft.settings.copiesPerPage = adapted.copiesPerPage;
  state.draft.settings.wordsPerPage = adapted.wordsPerPage;
  message.success('已加入当前试卷并同步为句子挖空模式！');
}

async function handleSaveToLib() {
  if (!hasBlank.value) {
    message.warning('请先点击上方单词设置至少一个挖空目标！');
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
  message.success('已成功保存至本地句库！');
}

function handleReset() {
  sentenceText.value = '';
  translationText.value = '';
  tokens.value = [];
  message.info('已重置可视化输入区');
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
  state.draft.settings.dictMode = 'cloze';
  state.draft.settings.columns = 2; // 默认 2 列
  const adapted = autoAdaptCopiesAndCapacity(state.draft.items, state.draft.settings);
  state.draft.settings.copiesPerPage = adapted.copiesPerPage;
  state.draft.settings.wordsPerPage = adapted.wordsPerPage;
  message.success('已将该句加入当前试卷！');
}

async function handleDeleteSentence(id) {
  const idx = state.library.sentences.findIndex(s => s.id === id);
  if (idx !== -1) {
    state.library.sentences.splice(idx, 1);
    await db.delete('sentences', id);
    message.info('已从句库移除该句');
  }
}
</script>

<style scoped>
.visual-cloze-pane {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pane-card {
  border-radius: 8px;
  background: #ffffff;
}

.form-desc {
  font-size: 11.5px;
  color: var(--text-muted);
  line-height: 1.45;
  margin: 0 0 10px 0;
}

.form-item-block {
  display: flex;
  flex-direction: column;
}

.item-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-main);
  display: block;
  margin-bottom: 4px;
}

.native-search-input {
  width: 100%;
  padding: 7px 10px;
  font-size: 13px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-main);
  border-radius: 6px;
  outline: none;
  font-family: inherit;
  transition: all 0.15s ease;
}

.native-search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-light);
}

.visual-token-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px;
  background: var(--bg-sidebar);
  border: 1px dashed var(--border-color);
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
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-main);
  user-select: none;
  transition: all 0.15s ease;
}

.visual-token-btn:hover {
  background: var(--primary-light);
  border-color: var(--primary);
  color: var(--primary);
}

.visual-token-btn.is-blank {
  background: var(--primary);
  color: #ffffff;
  border-color: var(--primary);
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(47, 102, 89, 0.35);
}

.visual-cloze-preview {
  padding: 8px 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
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
  color: var(--text-light);
  font-size: 12px;
}

.lib-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  gap: 8px;
}

.lib-item-row:hover {
  border-color: var(--border-color);
  background: var(--bg-sidebar);
}

.sentence-en-display {
  font-size: 12px;
  color: var(--text-main);
  line-height: 1.4;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.sentence-zh-display {
  font-size: 11px;
  color: var(--text-muted);
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
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 11px;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.15s ease;
}

.btn-act:hover {
  background: var(--primary-light);
  color: var(--primary);
  border-color: var(--primary);
}

.btn-act.del:hover {
  background: #faeceb;
  color: var(--danger);
  border-color: var(--danger);
}
</style>
