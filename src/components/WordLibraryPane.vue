<template>
  <div class="word-library-pane">
    <n-card size="small" :bordered="false" class="pane-card">
      <template #header>
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
          <span style="font-size:14px; font-weight:700; color:var(--text-main);">📚 本地离线词汇库</span>
          <n-badge :value="`共 ${state.library.words.length} 词`" type="success" id="libStatBadge" />
        </div>
      </template>

      <p class="form-desc">
        独立离线词汇库，存储于浏览器 IndexedDB。从词库加入试卷后修改释义不会污染词库原始内容。
      </p>

      <div style="margin-bottom: 10px;">
        <input
          type="text"
          v-model="searchQuery"
          id="inputSearchLib"
          placeholder="🔍 搜索词库 (英文或中文)..."
          class="native-search-input"
          @input="onSearchInput"
        />
      </div>

      <div class="toolbar-row">
        <div style="display:flex; gap:6px;">
          <n-button size="small" id="btnLibSelectAll" @click="handleToggleSelectAll">
            {{ isAllSelected ? '取消全选' : '全选 / 反选' }}
          </n-button>
          <n-button type="primary" size="small" id="btnLibBatchAddToDraft" @click="handleBatchAdd">
            ➕ 批量加入试卷
          </n-button>
        </div>

        <div style="display:flex; gap:6px;">
          <n-button size="small" id="btnLibExport" @click="handleExportLib">
            导出
          </n-button>
          <n-popconfirm @positive-click="handleClearLib">
            <template #trigger>
              <n-button size="small" type="error" ghost id="btnLibClear">
                清空
              </n-button>
            </template>
            确定要清空本地词库中的所有词汇吗？当前试卷中的内容不受影响。
          </n-popconfirm>
        </div>
      </div>

      <div id="libSelectedInfo" class="selected-info-text">
        已选中 <strong id="libSelectedCount" style="color:var(--primary);">{{ selectedIds.size }}</strong> 个单词
      </div>

      <!-- 词库条目列表 -->
      <div
        class="words-list-container"
        id="libWordsContainer"
        @click="handleContainerClick"
        @change="handleContainerChange"
      >
        <template v-if="filteredWords.length === 0">
          <div class="empty-list-tip">
            {{ searchQuery ? '未检索到符合条件的词汇' : '本地词库为空，可从左侧试卷保存或点击导入' }}
          </div>
        </template>

        <template v-else>
          <div
            v-for="w in filteredWords"
            :key="w.id"
            class="lib-item-row"
            :data-id="w.id"
          >
            <input
              type="checkbox"
              class="lib-item-check"
              :data-id="w.id"
              :checked="selectedIds.has(w.id)"
              @change="toggleItemSelect(w.id)"
              style="cursor:pointer;"
            />

            <div class="lib-item-text">
              <strong style="color:var(--text-main); font-size:12.5px;">{{ w.en }}</strong>
              <span v-if="w.phonetic" style="color:var(--accent); font-size:11px; margin-left:4px;">[{{ w.phonetic }}]</span>
              <span style="color:var(--text-muted); font-size:11.5px; margin-left:6px;">{{ w.zh || '' }}</span>
            </div>

            <div class="lib-item-actions">
              <button
                type="button"
                class="btn-lib-add btn-act"
                :data-id="w.id"
                title="添加到当前试卷"
                @click="handleAddSingle(w)"
              >
                ➕ 试卷
              </button>
              <button
                type="button"
                class="btn-lib-del btn-act del"
                :data-id="w.id"
                title="从词库中删除"
                @click="handleDelete(w.id)"
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
import { NCard, NBadge, NButton, NPopconfirm, useMessage } from 'naive-ui';
import { state, db } from '../stores/appStore.js';
import { computePageLayout, renderPracticeSheetHtml, createDraftItem, escapeHtml } from '../core/layout.js';

const message = useMessage();
const searchQuery = ref('');
const selectedIds = ref(new Set());

const filteredWords = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return state.library.words;
  return state.library.words.filter(w => {
    const enMatch = (w.en || '').toLowerCase().includes(q);
    const zhMatch = (w.zh || '').toLowerCase().includes(q);
    return enMatch || zhMatch;
  });
});

const isAllSelected = computed(() => {
  if (filteredWords.value.length === 0) return false;
  return filteredWords.value.every(w => selectedIds.value.has(w.id));
});

function syncSheetDom() {
  const container = document.getElementById('sheetsStreamContainer');
  if (container) {
    const layout = computePageLayout(state.draft.items, state.draft.settings);
    container.innerHTML = renderPracticeSheetHtml(layout, state.draft.settings);
  }
}

function renderLibRowsHtml(list) {
  if (!list || list.length === 0) {
    return `<div class="empty-list-tip">${searchQuery.value ? '未检索到符合条件的词汇' : '本地词库为空'}</div>`;
  }
  return list.map(w => {
    return `<div class="lib-item-row" data-id="${w.id}">
      <input
        type="checkbox"
        class="lib-item-check"
        data-id="${w.id}"
        ${selectedIds.value.has(w.id) ? 'checked' : ''}
        style="cursor:pointer;"
      />
      <div class="lib-item-text">
        <strong style="color:#0f172a; font-size:12.5px;">${escapeHtml(w.en)}</strong>
        ${w.phonetic ? `<span style="color:#0284c7; font-size:11px; margin-left:4px;">[${escapeHtml(w.phonetic)}]</span>` : ''}
        <span style="color:#64748b; font-size:11.5px; margin-left:6px;">${escapeHtml(w.zh || '')}</span>
      </div>
      <div class="lib-item-actions">
        <button
          type="button"
          class="btn-lib-add btn-act"
          data-id="${w.id}"
          title="添加到当前试卷"
        >
          ➕ 试卷
        </button>
        <button
          type="button"
          class="btn-lib-del btn-act del"
          data-id="${w.id}"
          title="从词库中删除"
        >
          ✕
        </button>
      </div>
    </div>`;
  }).join('');
}

function onSearchInput(e) {
  searchQuery.value = e.target.value;
  const listEl = document.getElementById('libWordsContainer');
  if (listEl) {
    listEl.innerHTML = renderLibRowsHtml(filteredWords.value);
  }
}

function toggleItemSelect(id) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id);
  } else {
    selectedIds.value.add(id);
  }
  const cntEl = document.getElementById('libSelectedCount');
  if (cntEl) cntEl.textContent = String(selectedIds.value.size);
}

function handleToggleSelectAll() {
  const list = filteredWords.value;
  const allSel = list.length > 0 && list.every(w => selectedIds.value.has(w.id));
  if (allSel) {
    list.forEach(w => selectedIds.value.delete(w.id));
  } else {
    list.forEach(w => selectedIds.value.add(w.id));
  }
  const cntEl = document.getElementById('libSelectedCount');
  if (cntEl) cntEl.textContent = String(selectedIds.value.size);
  document.querySelectorAll('#libWordsContainer .lib-item-check').forEach(ck => {
    const id = ck.getAttribute('data-id');
    ck.checked = selectedIds.value.has(id);
  });
}

function handleContainerClick(e) {
  const target = e.target;
  const btnAdd = target.closest('.btn-lib-add');
  const btnDel = target.closest('.btn-lib-del');
  if (btnAdd) {
    const id = btnAdd.getAttribute('data-id');
    const w = state.library.words.find(it => it.id === id);
    if (w) handleAddSingle(w);
  } else if (btnDel) {
    const id = btnDel.getAttribute('data-id');
    if (id) handleDelete(id);
  }
}

function handleContainerChange(e) {
  const ck = e.target.closest('.lib-item-check');
  if (ck) {
    const id = ck.getAttribute('data-id');
    if (ck.checked) {
      selectedIds.value.add(id);
    } else {
      selectedIds.value.delete(id);
    }
    const cntEl = document.getElementById('libSelectedCount');
    if (cntEl) cntEl.textContent = String(selectedIds.value.size);
  }
}

function handleAddSingle(w) {
  const item = createDraftItem({
    en: w.en,
    zh: w.zh,
    phonetic: w.phonetic,
    sourceId: w.id
  });
  state.draft.items.push(item);
  syncSheetDom();
  if (message) message.success(`已将「${w.en}」加入当前试卷！`);
}

function handleBatchAdd() {
  if (selectedIds.value.size === 0) {
    if (message) message.warning('请先勾选需要加入试卷的单词');
    return;
  }
  const selectedItems = state.library.words.filter(w => selectedIds.value.has(w.id));
  const newDraftItems = selectedItems.map(w => createDraftItem({
    en: w.en,
    zh: w.zh,
    phonetic: w.phonetic,
    sourceId: w.id
  }));
  state.draft.items = state.draft.items.concat(newDraftItems);
  selectedIds.value.clear();
  syncSheetDom();
  const cntEl = document.getElementById('libSelectedCount');
  if (cntEl) cntEl.textContent = '0';
  document.querySelectorAll('#libWordsContainer .lib-item-check').forEach(ck => ck.checked = false);
  if (message) message.success(`已成功将 ${newDraftItems.length} 个词汇批量加入试卷！`);
}

async function handleDelete(id) {
  const idx = state.library.words.findIndex(w => w.id === id);
  if (idx !== -1) {
    const wordEn = state.library.words[idx].en;
    state.library.words.splice(idx, 1);
    selectedIds.value.delete(id);
    await db.delete('words', id);
    message.info(`已从词库移除「${wordEn}」`);
  }
}

function handleExportLib() {
  const data = {
    app: 'DictationSheetGen',
    type: 'wordLibrary',
    version: '4.0',
    exportedAt: new Date().toISOString(),
    wordsCount: state.library.words.length,
    words: state.library.words
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dictation_words_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  message.success('本地词库已成功导出为 JSON 文件！');
}

async function handleClearLib() {
  state.library.words = [];
  selectedIds.value.clear();
  await db.clear('words');
  message.info('本地词库已清空');
}
</script>

<style scoped>
.word-library-pane {
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

.native-search-input:focus {
  border-color: #0284c7;
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 6px;
}

.selected-info-text {
  font-size: 11.5px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.words-list-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 480px;
  overflow-y: auto;
}

.empty-list-tip {
  text-align: center;
  padding: 30px;
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
  font-size: 12px;
  gap: 8px;
}

.lib-item-row:hover {
  border-color: var(--border-color);
  background: var(--bg-sidebar);
}

.lib-item-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-left: 4px;
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
