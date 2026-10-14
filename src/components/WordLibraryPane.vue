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
        独立离线词汇库，存储于浏览器 IndexedDB。支持按年级/单元分组管理，从词库加入试卷后修改释义不影响词库。
      </p>

      <!-- 词库单元 / 分组管理栏 -->
      <div class="lib-group-section" id="libGroupSection">
        <div class="lib-group-header">
          <div style="display:flex; align-items:center; gap:5px;">
            <span style="font-size:12px; font-weight:600; color:var(--text-main);">🏷️ 词库分组 / 单元</span>
            <span style="font-size:11px; color:var(--text-light);">({{ groupStats.length }} 组)</span>
          </div>

          <div style="display:flex; gap:6px;">
            <button
              type="button"
              class="lib-group-action-btn"
              id="btnNewGroup"
              @click="openNewGroupModal"
              title="新建单词分组，如 X年级UnitX"
            >
              ➕ 新建组
            </button>
            <button
              type="button"
              class="lib-group-action-btn"
              id="btnPresetUnits"
              @click="showPresetModal = true"
              title="载入人教PEP小学英语经典单元词库"
            >
              📚 课标单元
            </button>
          </div>
        </div>

        <!-- 分组胶囊横向滚动选择列表 -->
        <div class="group-pills-bar" id="groupPillsBar">
          <button
            type="button"
            class="group-pill-btn"
            :class="{ active: activeGroup === 'all' }"
            id="pillGroupAll"
            @click="activeGroup = 'all'"
          >
            全部 ({{ state.library.words.length }})
          </button>
          <button
            v-for="grp in groupStats"
            :key="grp.name"
            type="button"
            class="group-pill-btn"
            :class="{ active: activeGroup === grp.name }"
            :id="'pillGroup_' + cleanId(grp.name)"
            @click="activeGroup = grp.name"
          >
            {{ grp.name }} ({{ grp.count }})
          </button>
        </div>
      </div>

      <!-- 搜索框 -->
      <div style="margin-bottom: 10px;">
        <input
          type="text"
          v-model="searchQuery"
          id="inputSearchLib"
          placeholder="🔍 搜索词库 (英文、中文或单元分组)..."
          class="native-search-input"
        />
      </div>

      <!-- 操作工具栏 -->
      <div class="toolbar-row">
        <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
          <n-button size="small" id="btnLibSelectAll" @click="handleToggleSelectAll">
            {{ isAllSelected ? '取消全选' : '全选 / 反选' }}
          </n-button>
          <n-button type="primary" size="small" id="btnLibBatchAddToDraft" @click="handleBatchAdd">
            ➕ 批量加入试卷
          </n-button>
          <n-button
            v-if="selectedIds.size > 0"
            size="small"
            id="btnBatchSetGroup"
            @click="openBatchSetGroupModal"
            title="为已选中的单词统一设置/移动分组"
          >
            🏷️ 设为分组
          </n-button>
        </div>

        <div style="display:flex; gap:6px; align-items:center;">
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

      <!-- 选中状态信息 -->
      <div id="libSelectedInfo" class="selected-info-text">
        当前展示 <strong>{{ filteredWords.length }}</strong> 词 · 已选中 <strong id="libSelectedCount" style="color:var(--primary);">{{ selectedIds.size }}</strong> 词
        <span v-if="activeGroup !== 'all'" style="margin-left:6px; color:var(--primary); font-weight:500;">
          [当前单元: {{ activeGroup }}]
        </span>
      </div>

      <!-- 词库条目列表 (由 Vue 响应式 v-for 驱动，无 innerHTML 干扰) -->
      <div class="words-list-container" id="libWordsContainer">
        <template v-if="filteredWords.length === 0">
          <div class="empty-list-tip">
            {{ searchQuery ? '未检索到符合条件的词汇' : (activeGroup !== 'all' ? `「${activeGroup}」分组暂无单词，可勾选单词后设置分组移入` : '本地词库为空，可从左侧试卷保存或点击导入') }}
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
              <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <strong style="color:var(--text-main); font-size:12.5px;">{{ w.en }}</strong>
                <span v-if="w.phonetic" style="color:var(--accent); font-size:11px;">[{{ w.phonetic }}]</span>
                <span
                  class="word-group-tag"
                  :title="'点击更改分组（当前：' + (w.group || '通用词汇') + '）'"
                  @click.stop="openEditSingleGroup(w)"
                >
                  🏷️ {{ w.group || '通用词汇' }}
                </span>
              </div>
              <div style="color:var(--text-muted); font-size:11.5px; margin-top:2px;">
                {{ w.zh || '' }}
              </div>
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

    <!-- 弹窗 1: 新建词库分组 -->
    <n-modal
      v-model:show="showNewGroupModal"
      preset="card"
      title="➕ 新建词库分组"
      style="width: 380px; max-width: 92vw;"
    >
      <div style="display:flex; flex-direction:column; gap:12px;">
        <p style="font-size:12px; color:var(--text-muted); margin:0;">
          请输入分组名称，例如：<code>三年级上册 Unit 2</code> 或 <code>期末高频易错词</code>。
        </p>
        <input
          type="text"
          v-model="newGroupName"
          id="inputNewGroupName"
          placeholder="请输入分组名称，如：三年级Unit 2"
          class="native-search-input"
          @keyup.enter="handleCreateGroup"
        />
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <n-button size="small" @click="showNewGroupModal = false">取消</n-button>
          <n-button type="primary" size="small" id="btnConfirmNewGroup" @click="handleCreateGroup">确定创建</n-button>
        </div>
      </div>
    </n-modal>

    <!-- 弹窗 2: 批量设置分组 -->
    <n-modal
      v-model:show="showBatchGroupModal"
      preset="card"
      :title="`🏷️ 批量设置分组 (已选 ${selectedIds.size} 词)`"
      style="width: 400px; max-width: 92vw;"
    >
      <div style="display:flex; flex-direction:column; gap:12px;">
        <p style="font-size:12px; color:var(--text-muted); margin:0;">
          将已勾选的 {{ selectedIds.size }} 个单词统一移入指定分组：
        </p>

        <div>
          <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">选择已有分组：</label>
          <div style="display:flex; gap:6px; flex-wrap:wrap; max-height:100px; overflow-y:auto;">
            <button
              v-for="g in allGroups"
              :key="g"
              type="button"
              class="group-select-chip"
              :class="{ selected: batchTargetGroup === g }"
              @click="batchTargetGroup = g; batchCustomGroup = ''"
            >
              {{ g }}
            </button>
          </div>
        </div>

        <div>
          <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">或输入新分组名称：</label>
          <input
            type="text"
            v-model="batchCustomGroup"
            id="inputBatchCustomGroup"
            placeholder="例如：三年级Unit 3"
            class="native-search-input"
            @focus="batchTargetGroup = ''"
          />
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:4px;">
          <n-button size="small" @click="showBatchGroupModal = false">取消</n-button>
          <n-button type="primary" size="small" id="btnConfirmBatchGroup" @click="handleApplyBatchGroup">应用分组</n-button>
        </div>
      </div>
    </n-modal>

    <!-- 弹窗 3: 单个单词修改分组 -->
    <n-modal
      v-model:show="showEditSingleModal"
      preset="card"
      :title="`✏️ 修改「${editingWord?.en || ''}」的分组`"
      style="width: 380px; max-width: 92vw;"
    >
      <div style="display:flex; flex-direction:column; gap:12px;">
        <p style="font-size:12px; color:var(--text-muted); margin:0;">
          选择已有分组或输入新分组：
        </p>

        <div v-if="allGroups.length > 0">
          <div style="display:flex; gap:6px; flex-wrap:wrap; max-height:100px; overflow-y:auto; margin-bottom:8px;">
            <button
              v-for="g in allGroups"
              :key="g"
              type="button"
              class="group-select-chip"
              :class="{ selected: editingTargetGroup === g }"
              @click="editingTargetGroup = g"
            >
              {{ g }}
            </button>
          </div>
        </div>

        <input
          type="text"
          v-model="editingTargetGroup"
          id="inputSingleGroup"
          placeholder="输入分组名称，如：四年级Unit 1"
          class="native-search-input"
          @keyup.enter="handleSaveSingleGroup"
        />

        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <n-button size="small" @click="showEditSingleModal = false">取消</n-button>
          <n-button type="primary" size="small" id="btnConfirmSingleGroup" @click="handleSaveSingleGroup">保存</n-button>
        </div>
      </div>
    </n-modal>

    <!-- 弹窗 4: 课标教材经典单元词库预设 -->
    <n-modal
      v-model:show="showPresetModal"
      preset="card"
      title="📚 载入课标教材经典单元词库"
      style="width: 440px; max-width: 95vw;"
    >
      <div style="display:flex; flex-direction:column; gap:12px;">
        <p style="font-size:12px; color:var(--text-muted); margin:0;">
          一键载入小学人教PEP英语核心单元词汇，自动按年级与单元归类：
        </p>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <div
            v-for="preset in PRESET_UNIT_LIBRARIES"
            :key="preset.name"
            class="preset-unit-card"
          >
            <div style="flex:1;">
              <strong style="color:var(--text-main); font-size:13px; display:block;">{{ preset.name }}</strong>
              <span style="font-size:11px; color:var(--text-muted);">{{ preset.description }} ({{ preset.words.length }} 词)</span>
            </div>
            <button
              type="button"
              class="lib-group-action-btn"
              :id="'btnImportUnit_' + cleanId(preset.name)"
              @click="handleImportPresetUnit(preset)"
            >
              ➕ 导入词库
            </button>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; margin-top:4px;">
          <n-button size="small" @click="showPresetModal = false">关闭</n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { NCard, NBadge, NButton, NPopconfirm, NModal, NInput, useMessage } from 'naive-ui';
import { state, db } from '../stores/appStore.js';
import { createDraftItem, PRESET_UNIT_LIBRARIES } from '../core/layout.js';
import { detectDuplicates } from '../core/storage.js';

const message = useMessage();
const searchQuery = ref('');
const selectedIds = ref(new Set());
const activeGroup = ref('all');

// 弹窗状态
const showNewGroupModal = ref(false);
const newGroupName = ref('');

const showBatchGroupModal = ref(false);
const batchTargetGroup = ref('');
const batchCustomGroup = ref('');

const showEditSingleModal = ref(false);
const editingWord = ref(null);
const editingTargetGroup = ref('');

const showPresetModal = ref(false);
const customGroups = ref(new Set());

function cleanId(str) {
  return (str || '').replace(/\s+/g, '_');
}

// 所有已知的分组名称列表 (去重)
const allGroups = computed(() => {
  const set = new Set();
  state.library.words.forEach(w => {
    const g = (w.group || '通用词汇').trim();
    if (g) set.add(g);
  });
  customGroups.value.forEach(g => {
    if (g) set.add(g);
  });
  if (activeGroup.value && activeGroup.value !== 'all') {
    set.add(activeGroup.value);
  }
  return Array.from(set);
});

// 每个分组的词汇数量统计
const groupStats = computed(() => {
  const map = new Map();
  // 1. 已有单词的分组计数
  state.library.words.forEach(w => {
    const g = (w.group || '通用词汇').trim();
    map.set(g, (map.get(g) || 0) + 1);
  });
  // 2. 用户自定义新建但尚未添加词的分组 (count = 0)
  customGroups.value.forEach(g => {
    if (!map.has(g)) {
      map.set(g, 0);
    }
  });
  // 3. 当前激活选中的分组如果不在统计中也纳入
  if (activeGroup.value && activeGroup.value !== 'all' && !map.has(activeGroup.value)) {
    map.set(activeGroup.value, 0);
  }
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
});

// 根据分组和搜索关键词过滤后的单词列表
const filteredWords = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  const grp = activeGroup.value;
  return state.library.words.filter(w => {
    const wGrp = (w.group || '通用词汇').trim();
    if (grp !== 'all' && wGrp !== grp) return false;
    if (!q) return true;
    const enMatch = (w.en || '').toLowerCase().includes(q);
    const zhMatch = (w.zh || '').toLowerCase().includes(q);
    const grpMatch = wGrp.toLowerCase().includes(q);
    return enMatch || zhMatch || grpMatch;
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

function openNewGroupModal() {
  newGroupName.value = '';
  showNewGroupModal.value = true;
}

function handleCreateGroup() {
  const name = newGroupName.value.trim();
  if (!name) {
    message.warning('请输入有效的分组名称，如「三年级Unit 2」');
    return;
  }
  const nextSet = new Set(customGroups.value);
  nextSet.add(name);
  customGroups.value = nextSet;
  activeGroup.value = name;
  newGroupName.value = '';
  showNewGroupModal.value = false;
  message.success(`已创建并切换至新分组「${name}」！勾选单词后点击“设为分组”即可归入`);
}

function openBatchSetGroupModal() {
  if (selectedIds.value.size === 0) {
    message.warning('请先勾选需要设置分组的单词');
    return;
  }
  batchTargetGroup.value = activeGroup.value !== 'all' ? activeGroup.value : (allGroups.value[0] || '通用词汇');
  batchCustomGroup.value = '';
  showBatchGroupModal.value = true;
}

async function handleApplyBatchGroup() {
  const target = (batchCustomGroup.value.trim() || batchTargetGroup.value || '').trim();
  if (!target) {
    message.warning('请选择或输入目标分组名称');
    return;
  }
  const ids = selectedIds.value;
  const updated = [];
  state.library.words.forEach(w => {
    if (ids.has(w.id)) {
      w.group = target;
      w.updatedAt = Date.now();
      updated.push(w);
    }
  });
  await db.bulkPut('words', updated);
  showBatchGroupModal.value = false;
  batchCustomGroup.value = '';
  message.success(`已将选中的 ${updated.length} 个单词归入「${target}」分组！`);
}

function openEditSingleGroup(w) {
  editingWord.value = w;
  editingTargetGroup.value = w.group || '通用词汇';
  showEditSingleModal.value = true;
}

async function handleSaveSingleGroup() {
  if (!editingWord.value) return;
  const target = editingTargetGroup.value.trim();
  if (!target) {
    message.warning('分组名称不能为空');
    return;
  }
  editingWord.value.group = target;
  editingWord.value.updatedAt = Date.now();
  await db.bulkPut('words', [editingWord.value]);
  showEditSingleModal.value = false;
  message.success(`已将「${editingWord.value.en}」移入「${target}」！`);
}

async function handleImportPresetUnit(preset) {
  const dupCheck = detectDuplicates(state.library.words, preset.words);
  if (dupCheck.unique.length === 0) {
    message.info(`「${preset.name}」中的全部单词已存在于词库中`);
    activeGroup.value = preset.name;
    showPresetModal.value = false;
    return;
  }
  const newWords = dupCheck.unique.map(w => ({
    id: `w-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    en: w.en,
    zh: w.zh,
    phonetic: w.phonetic || '',
    group: preset.name,
    updatedAt: Date.now()
  }));
  state.library.words.push(...newWords);
  await db.bulkPut('words', newWords);
  activeGroup.value = preset.name;
  showPresetModal.value = false;
  message.success(`已成功载入「${preset.name}」(${newWords.length} 词)！`);
}

function handleAddSingle(w) {
  const item = createDraftItem({
    en: w.en,
    zh: w.zh,
    phonetic: w.phonetic,
    group: w.group,
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
    group: w.group,
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
    version: '4.1',
    exportedAt: new Date().toISOString(),
    count: state.library.words.length,
    groups: allGroups.value,
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
  message.success('本地词库已导出为独立 JSON 文件（含分组标签）！');
}

async function handleClearLib() {
  state.library.words = [];
  selectedIds.value = new Set();
  activeGroup.value = 'all';
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

/* 分组导航区域 */
.lib-group-section {
  margin-bottom: 10px;
  background: var(--bg-sidebar);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  padding: 8px 10px;
}

.lib-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.lib-group-action-btn {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 11px;
  padding: 2px 7px;
  color: var(--primary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.lib-group-action-btn:hover {
  background: var(--primary-light);
  border-color: var(--primary);
}

.group-pills-bar {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: thin;
}

.group-pill-btn {
  white-space: nowrap;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: #ffffff;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.group-pill-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.group-pill-btn.active {
  background: var(--primary);
  color: #ffffff;
  border-color: var(--primary);
  font-weight: 600;
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
  padding: 7px 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  font-size: 12px;
  gap: 8px;
  transition: all 0.15s ease;
}

.lib-item-row:hover {
  border-color: var(--primary-border, var(--border-color));
  background: var(--bg-sidebar);
}

.lib-item-text {
  flex: 1;
  min-width: 0;
  margin-left: 4px;
}

.word-group-tag {
  display: inline-block;
  font-size: 10.5px;
  color: var(--primary);
  background: var(--primary-light);
  border: 1px solid var(--primary-border);
  border-radius: 4px;
  padding: 1px 5px;
  cursor: pointer;
  line-height: 1.25;
  transition: all 0.15s ease;
}

.word-group-tag:hover {
  background: var(--primary);
  color: #ffffff;
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

.group-select-chip {
  background: var(--bg-sidebar);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  font-size: 11px;
  padding: 3px 8px;
  cursor: pointer;
  color: var(--text-main);
  transition: all 0.15s ease;
}

.group-select-chip:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.group-select-chip.selected {
  background: var(--primary);
  color: #ffffff;
  border-color: var(--primary);
}

.preset-unit-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: var(--bg-sidebar);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  gap: 8px;
}
</style>
