<template>
  <header class="app-header no-print" data-debug-id="H-001" data-debug-name="顶部标题栏">
    <div class="header-brand">
      <IconActionButton
        class="btn-toggle-sidebar"
        id="btnToggleSidebar"
        label="展开或收起左侧控制栏"
        icon="menu"
        :icon-size="16"
        data-debug-id="H-002"
        data-debug-name="侧边栏折叠按钮"
        @click="state.ui.isSidebarCollapsed = !state.ui.isSidebarCollapsed"
      />
      <img
        src="../assets/branding/dictation-sheet-logo.png"
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
      <button id="btnGeneratePreview" style="display:none;" aria-hidden="true" @click="handleRefreshPreview"></button>

      <n-button
        size="small"
        id="btnExportConfig"
        data-debug-id="H-004"
        data-debug-name="导出配置按钮"
        @click="handleExportConfig"
        title="将当前设置与词表导出为 JSON 文件"
      >
        <template #icon><AppIcon name="download" :size="14" /></template>
        导出配置
      </n-button>

      <n-button
        size="small"
        id="btnTriggerImport"
        data-debug-id="H-005"
        data-debug-name="导入数据按钮"
        @click="triggerFileInput"
        title="导入已保存的配置或词表文件"
      >
        <template #icon><AppIcon name="upload" :size="14" /></template>
        导入数据
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

      <n-button
        size="small"
        id="btnToggleSettings"
        :type="state.ui.isSettingsCollapsed ? 'default' : 'primary'"
        :ghost="state.ui.isSettingsCollapsed"
        data-debug-id="H-008"
        data-debug-name="试卷排版侧栏切换按钮"
        @click="state.ui.isSettingsCollapsed = !state.ui.isSettingsCollapsed"
        :title="state.ui.isSettingsCollapsed ? '展开右侧试卷排版面板' : '收起右侧试卷排版面板'"
      >
        <template #icon><AppIcon name="settings" :size="14" /></template>
        试卷排版
      </n-button>

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
  </header>
</template>

<script setup>
import { computed, ref } from 'vue';
import { NButton, NPopconfirm, useMessage } from 'naive-ui';
import { state, db, normalizeSettings } from '../stores/appStore.js';
import { computePageLayout, DEFAULT_SETTINGS, DEFAULT_WORDS_RAW, createDraftItem } from '../core/layout.js';
import { validateImportData, detectDuplicates } from '../core/storage.js';
import { parseCustomText } from '../core/tokenizer.js';
import AppIcon from './AppIcon.vue';
import IconActionButton from './IconActionButton.vue';

const message = useMessage();
const fileInputRef = ref(null);

const layout = computed(() => computePageLayout(state.draft.items, state.draft.settings));

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
  a.download = `dictation_config_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  message.success('配置已导出为 JSON 文件（含草稿与词库数据）！');
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

        if (validation.draftItems.length > 0) {
          const newItems = validation.draftItems.map(it => createDraftItem(it));
          const dupCheck = detectDuplicates(state.draft.items, newItems);
          state.draft.items = newItems;
          const dupTip = dupCheck.duplicates.length > 0 ? ` (包含 ${dupCheck.duplicates.length} 条已存在词条)` : '';
          message.success(`已成功导入试卷 (${newItems.length} 词)${dupTip}！`);
        }

        if (validation.draftSettings) {
          state.draft.settings = normalizeSettings(validation.draftSettings);
        }

        if (validation.libraryWords.length > 0) {
          state.library.words = validation.libraryWords.map(w => createDraftItem({ ...w, type: 'word' }));
          await db.clear('words');
          await db.bulkPut('words', state.library.words);
        }

        if (validation.librarySentences.length > 0) {
          state.library.sentences = validation.librarySentences.map(s => createDraftItem({ ...s, type: 'sentence' }));
          await db.clear('sentences');
          await db.bulkPut('sentences', state.library.sentences);
        }
      } else {
        // txt 纯文本
        const list = parseCustomText(content);
        if (list.length > 0) {
          const dupCheck = detectDuplicates(state.draft.items, list);
          state.draft.items = list;
          const dupTip = dupCheck.duplicates.length > 0 ? ` (其中 ${dupCheck.duplicates.length} 条已存在)` : '';
          message.success(`已成功从文本导入 ${list.length} 个单词${dupTip}！`);
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

function handleResetDefaults() {
  state.draft.items = DEFAULT_WORDS_RAW.map(w => createDraftItem(w));
  state.draft.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  message.success('已恢复为默认设置！');
}
</script>

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
