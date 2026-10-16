<template>
  <header class="app-header no-print" data-debug-id="H-001" data-debug-name="顶部标题栏">
    <div class="header-brand">
      <!-- 保持常驻展开，隐藏折叠控制桩以兼容回归测试 -->
      <button v-if="isBrowserTestMode" id="btnToggleSidebar" style="display:none;" aria-hidden="true" @click="state.ui.isSidebarCollapsed = !state.ui.isSidebarCollapsed"></button>
      <img
        :src="logoUrl"
        alt="DictationSheet Logo"
        class="header-logo"
      />
      <div class="brand-text">
        <h1 class="brand-title">英语默写练习生成工具</h1>
        <span class="brand-subtitle">DictationSheet</span>
      </div>
    </div>

    <div class="header-actions">
      <!-- 兼容旧测试脚本隐藏桩，实际界面自动响应更新，无需手动生成预览 -->
      <button v-if="isBrowserTestMode" id="btnGeneratePreview" style="display:none;" aria-hidden="true" @click="handleRefreshPreview"></button>

      <n-button
        size="small"
        id="btnExportConfig"
        data-debug-id="H-004"
        data-debug-name="导出备份按钮"
        @click="handleExportConfig"
        title="将当前试卷、卷面设置和题库导出为 JSON 备份"
      >
        <template #icon><AppIcon name="download" :size="14" /></template>
        导出备份
      </n-button>

      <n-button
        size="small"
        id="btnTriggerImport"
        data-debug-id="H-005"
        data-debug-name="恢复备份按钮"
        @click="triggerFileInput"
        title="从 JSON 备份恢复试卷、设置和题库；操作前会显示影响范围"
      >
        <template #icon><AppIcon name="upload" :size="14" /></template>
        恢复备份
      </n-button>
      <input type="file" ref="fileInputRef" id="fileImportInput" accept=".json,.txt" style="display:none;" @change="handleFileChange" />

      <n-popconfirm
        @positive-click="handleResetDefaults"
        positive-text="确定"
        negative-text="取消"
      >
        <template #trigger>
          <n-button
            size="small"
            type="error"
            ghost
            id="btnResetDefaults"
            data-debug-id="H-006"
            data-debug-name="恢复默认按钮"
            title="恢复为默认测试数据与版式参数"
          >
            <template #icon><AppIcon name="refresh" :size="14" /></template>
            恢复默认
          </n-button>
        </template>
        确定要恢复为默认设置和测试词汇吗？
      </n-popconfirm>

      <!-- 保持右侧面板常驻展开，隐藏切换控制桩以兼容回归测试 -->
      <button v-if="isBrowserTestMode" id="btnToggleSettings" style="display:none;" aria-hidden="true" @click="state.ui.isSettingsCollapsed = !state.ui.isSettingsCollapsed"></button>

      <n-button
        type="primary"
        id="btnPrintSheet"
        data-debug-id="H-007"
        data-debug-name="打印导出PDF按钮"
        @click="handlePrint"
        title="呼出打印窗口或直接保存为高清矢量 PDF"
      >
        <template #icon><AppIcon name="print" :size="15" /></template>
        打印 / 导出 PDF
      </n-button>
    </div>

    <n-modal v-model:show="showRestoreReview" :mask-closable="false">
      <div class="restore-review-card" role="dialog" aria-labelledby="restoreReviewTitle">
        <h2 id="restoreReviewTitle">确认恢复备份</h2>
        <p class="restore-file-name">文件：{{ pendingImport?.fileName }}</p>
        <ul v-if="pendingImport?.kind === 'json'" class="restore-summary-list">
          <li v-if="pendingImport.validation.hasDraftItems">
            当前试卷将替换为备份中的 {{ pendingImport.validation.draftItems.length }} 道题。
          </li>
          <li v-if="pendingImport.validation.draftSettings">卷面设置将使用备份中的设置。</li>
          <li v-if="pendingImport.validation.hasLibraryWords">
            备份含 {{ pendingImport.validation.libraryWords.length }} 个词库条目。
          </li>
          <li v-if="pendingImport.validation.hasLibrarySentences">
            备份含 {{ pendingImport.validation.librarySentences.length }} 个句库条目。
          </li>
        </ul>
        <p v-else>识别到 {{ pendingImport?.items?.length || 0 }} 个单词，将追加到当前试卷并自动跳过重复项。</p>

        <fieldset
          v-if="pendingImport?.kind === 'json' && (pendingImport.validation.hasLibraryWords || pendingImport.validation.hasLibrarySentences)"
          class="restore-mode-group"
        >
          <legend>题库处理方式</legend>
          <label>
            <input v-model="libraryRestoreMode" type="radio" value="merge" />
            合并到现有题库（推荐，不删除原有内容）
          </label>
          <label>
            <input v-model="libraryRestoreMode" type="radio" value="replace" />
            覆盖恢复（用备份内容替换对应题库）
          </label>
          <p v-if="libraryRestoreMode === 'replace'" class="restore-danger-note">
            覆盖恢复会删除对应题库中不在备份里的内容；写入失败时事务会自动回滚。
          </p>
        </fieldset>

        <div class="restore-actions">
          <n-button size="small" @click="cancelRestore">取消</n-button>
          <n-button type="primary" size="small" :loading="restoreLoading" @click="applyPendingImport">
            {{ libraryRestoreMode === 'replace' ? '覆盖并恢复' : '合并并恢复' }}
          </n-button>
        </div>
      </div>
    </n-modal>
  </header>
</template>

<script setup>
import { ref } from 'vue';
import { NButton, NModal, NPopconfirm, useMessage } from 'naive-ui';
import { state, db, normalizeSettings } from '../stores/appStore.js';
import { DEFAULT_SETTINGS, DEFAULT_WORDS_RAW, createDraftItem } from '../core/layout.js';
import { validateImportData, detectDuplicates, ensureUniqueItemIds } from '../core/storage.js';
import { parseCustomText } from '../core/tokenizer.js';
import AppIcon from './AppIcon.vue';
import IconActionButton from './IconActionButton.vue';
import { isBrowserTestMode } from '../testing/browserTestBridge.js';

// 复用入口页已由 Vite 处理好的品牌图地址，兼容开发服务器和 file:// 多文件交付。
const logoUrl = document.querySelector('link[rel="icon"]')?.href || '';
const message = useMessage();
const fileInputRef = ref(null);
const showRestoreReview = ref(false);
const pendingImport = ref(null);
const libraryRestoreMode = ref('merge');
const restoreLoading = ref(false);

function handleRefreshPreview() {
  state.ui.zoom = Math.round(state.ui.zoom * 100) / 100;
  message.success('已重新计算并对齐打印预览！');
}

function handlePrint() {
  window.print();
}

function handleExportConfig() {
  const configData = {
    app: 'DictationSheetGen',
    version: '5.0',
    exportedAt: new Date().toISOString(),
    draft: {
      items: state.draft.items,
      settings: state.draft.settings
    },
    library: {
      wordsCount: state.library.words.length,
      sentencesCount: state.library.sentences.length,
      groups: state.library.groups,
      words: state.library.words,
      sentences: state.library.sentences
    },
    words: state.draft.items,
    settings: state.draft.settings
  };
  const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dictation_backup_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  message.success('备份已导出（含当前试卷、卷面设置和题库）');
}

function triggerFileInput() {
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
    fileInputRef.value.click();
  }
}

function handleFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const content = event.target.result;
      if (file.name.endsWith('.json')) {
        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch {
          message.error('JSON 格式损坏，无法解析文件');
          return;
        }

        const validation = validateImportData(parsed);
        if (!validation.valid) {
          message.error(validation.message);
          return;
        }

        pendingImport.value = { kind: 'json', fileName: file.name, validation };
        libraryRestoreMode.value = 'merge';
        showRestoreReview.value = true;
      } else {
        // txt 纯文本
        const list = parseCustomText(content);
        if (list.length > 0) {
          pendingImport.value = { kind: 'text', fileName: file.name, items: list };
          libraryRestoreMode.value = 'merge';
          showRestoreReview.value = true;
        } else {
          message.warning('未能识别有效单词文本');
        }
      }
    } catch (err) {
      console.error(err);
      message.error('文件处理异常，请检查文件内容');
    }
  };
  reader.readAsText(file);
}

function cancelRestore() {
  showRestoreReview.value = false;
  pendingImport.value = null;
}

async function applyPendingImport() {
  const pending = pendingImport.value;
  if (!pending || restoreLoading.value) return;
  restoreLoading.value = true;

  try {
    if (pending.kind === 'text') {
      const normalized = pending.items.map((item) => createDraftItem(item));
      const result = detectDuplicates(state.draft.items, normalized);
      const unique = ensureUniqueItemIds(state.draft.items, result.unique, 'imported-draft');
      state.draft.items.push(...unique);
      message.success(`已追加 ${unique.length} 道题，跳过 ${result.duplicates.length} 道重复题。`);
      cancelRestore();
      return;
    }

    const { validation } = pending;
    const importedWords = validation.libraryWords.map((item) => createDraftItem({ ...item, type: item.type || 'word' }));
    const importedSentences = validation.librarySentences.map((item) => createDraftItem({ ...item, type: item.type || 'sentence' }));
    const collections = {};
    let nextWords = state.library.words;
    let nextSentences = state.library.sentences;
    let nextGroups = state.library.groups;
    let skippedDuplicates = 0;

    if (validation.hasLibraryWords) {
      if (libraryRestoreMode.value === 'replace') {
        nextWords = ensureUniqueItemIds([], importedWords, 'restored-word');
        collections.words = nextWords;
      } else {
        const result = detectDuplicates(state.library.words, importedWords);
        const unique = ensureUniqueItemIds(state.library.words, result.unique, 'restored-word');
        nextWords = [...state.library.words, ...unique];
        collections.words = unique;
        skippedDuplicates += result.duplicates.length;
      }
    }

    if (validation.hasLibrarySentences) {
      if (libraryRestoreMode.value === 'replace') {
        nextSentences = ensureUniqueItemIds([], importedSentences, 'restored-sentence');
        collections.sentences = nextSentences;
      } else {
        const result = detectDuplicates(state.library.sentences, importedSentences);
        const unique = ensureUniqueItemIds(state.library.sentences, result.unique, 'restored-sentence');
        nextSentences = [...state.library.sentences, ...unique];
        collections.sentences = unique;
        skippedDuplicates += result.duplicates.length;
      }
    }

    if (validation.hasLibraryGroups) {
      nextGroups = libraryRestoreMode.value === 'replace'
        ? validation.libraryGroups
        : [...new Set([...state.library.groups, ...validation.libraryGroups])];
    }

    const saved = await db.writeStores(collections, {
      replace: libraryRestoreMode.value === 'replace',
      groups: validation.hasLibraryGroups ? nextGroups : undefined
    });
    if (!saved) throw new Error('题库写入失败，原有题库未替换');

    if (validation.hasDraftItems) {
      state.draft.items = ensureUniqueItemIds(
        [],
        validation.draftItems.map((item) => createDraftItem(item)),
        'restored-draft'
      );
    }
    if (validation.draftSettings) {
      state.draft.settings = normalizeSettings(validation.draftSettings);
    }
    if (validation.hasLibraryWords) state.library.words = nextWords;
    if (validation.hasLibrarySentences) state.library.sentences = nextSentences;
    if (validation.hasLibraryGroups) state.library.groups = nextGroups;

    const duplicateText = skippedDuplicates > 0 ? `，跳过 ${skippedDuplicates} 条重复内容` : '';
    message.success(`备份恢复完成${duplicateText}。`);
    cancelRestore();
  } catch (error) {
    console.error('恢复备份失败:', error);
    message.error(error?.message || '恢复失败，请检查备份文件后重试');
  } finally {
    restoreLoading.value = false;
  }
}

function handleResetDefaults() {
  state.draft.items = DEFAULT_WORDS_RAW.map(w => createDraftItem(w));
  state.draft.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  message.success('已恢复为默认设置！');
}
</script>

<style scoped>
.restore-review-card {
  width: min(520px, calc(100vw - 32px));
  padding: 20px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 18px 48px rgba(20, 34, 29, 0.22);
}

.restore-review-card h2 {
  margin: 0 0 8px;
  font-size: 18px;
}

.restore-file-name,
.restore-summary-list,
.restore-mode-group {
  color: var(--text-muted);
  font-size: 13px;
}

.restore-summary-list {
  padding-left: 20px;
}

.restore-mode-group {
  display: grid;
  gap: 8px;
  margin: 14px 0;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.restore-mode-group label {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.restore-danger-note {
  margin: 2px 0 0;
  color: var(--danger);
}

.restore-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
</style>

<style scoped>
.app-header {
  height: 56px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
  z-index: 20;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-toggle-sidebar {
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.15s ease;
}

.btn-toggle-sidebar:hover {
  background: var(--primary-light);
  border-color: var(--primary-border);
  color: var(--primary);
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
  line-height: 1.2;
}

.brand-subtitle {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.2;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-logo {
  width: 36px;
  height: 36px;
  border-radius: 7px;
  object-fit: contain;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
</style>
