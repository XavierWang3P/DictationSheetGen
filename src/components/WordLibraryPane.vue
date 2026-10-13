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

      <!-- 词库条目列表 (由 Vue 响应式 v-for 驱动，无 innerHTML 干扰) -->
      <div class="words-list-container" id="libWordsContainer">
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
              @change.stop="toggleItemSelect(w.id)"
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
                @click.stop="handleAddSingle(w)"
              >
                ➕ 试卷
              </button>
              <button
                type="button"
                class="btn-lib-del btn-act del"
                :data-id="w.id"
                title="从词库中删除"
                @click.stop="handleDelete(w.id)"
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
import { createDraftItem } from '../core/layout.js';

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

function toggleItemSelect(id) {
  const newSet = new Set(selectedIds.value);
  if (newSet.has(id)) {
    newSet.delete(id);
  } else {
    newSet.add(id);
  }
  selectedIds.value = newSet;
}

function handleToggleSelectAll() {
  const list = filteredWords.value;
  const allSel = list.length > 0 && list.every(w => selectedIds.value.has(w.id));
  const newSet = new Set(selectedIds.value);
  if (allSel) {
    list.forEach(w => newSet.delete(w.id));
  } else {
    list.forEach(w => newSet.add(w.id));
  }
  selectedIds.value = newSet;
}

function handleAddSingle(w) {
  const item = createDraftItem({
    en: w.en,
    zh: w.zh,
    phonetic: w.phonetic,
    sourceId: w.id
  });
  state.draft.items.push(item);
  message.success(`已将「${w.en}」加入当前试卷！`);
}

function handleBatchAdd() {
  if (selectedIds.value.size === 0) {
    message.warning('请先勾选需要加入试卷的单词');
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
  selectedIds.value = new Set();
  message.success(`已成功将 ${newDraftItems.length} 个词汇批量加入试卷！`);
}

async function handleDelete(id) {
  const idx = state.library.words.findIndex(w => w.id === id);
  if (idx !== -1) {
    const wordEn = state.library.words[idx].en;
    state.library.words.splice(idx, 1);
    if (selectedIds.value.has(id)) {
      const newSet = new Set(selectedIds.value);
      newSet.delete(id);
      selectedIds.value = newSet;
    }
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
    count: state.library.words.length,
    words: state.library.words
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `word_library_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  message.success('本地词库已导出为独立 JSON 文件！');
}

async function handleClearLib() {
  state.library.words = [];
  selectedIds.value = new Set();
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

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
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
  max-height: 400px;
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
