<template>
  <aside
    class="sidebar no-print"
    id="sidebarPanel"
    :class="{ collapsed: state.ui.isSidebarCollapsed }"
  >
    <!-- 顶部工作区 Tab 切换栏 -->
    <div
      class="sidebar-tab-bar"
      id="sidebarTabBar"
      data-debug-id="T-001"
      data-debug-name="侧边栏工作区标签页"
    >
      <button
        v-for="t in tabs"
        :key="t.key"
        type="button"
        class="sidebar-tab-btn"
        :class="{ active: state.ui.activeView === t.key }"
        :data-tab="t.key"
        @click="onTabClick(t.key)"
      >
        <AppIcon :name="t.icon" :size="13" />
        {{ t.label }}
      </button>

      <!-- 兼容旧测试脚本隐藏桩 (可视化挖空合并至题目录入，保留无障碍桩支持历史自动化脚本) -->
      <button
        type="button"
        class="sidebar-tab-btn"
        data-tab="paneClozeVisual"
        style="display:none;"
        aria-hidden="true"
        @click="onTabClick('paneClozeVisual')"
      >
        可视化挖空
      </button>

      <!-- 兼容旧测试脚本隐藏桩 (试卷排版已升级为右侧独立检视面板，保留无障碍桩支持历史自动化脚本) -->
      <button
        type="button"
        class="sidebar-tab-btn"
        data-tab="paneSettings"
        style="display:none;"
        aria-hidden="true"
        @click="onTabClick('paneSettings')"
      >
        试卷排版
      </button>
    </div>

    <!-- 侧栏可滚动内容区 -->
    <div class="sidebar-scrollable">
      <div id="paneQuick" class="sidebar-tab-pane" :class="{ active: state.ui.activeView === 'paneQuick' }">
        <QuickInputPane />
      </div>

      <div id="paneList" class="sidebar-tab-pane" :class="{ active: state.ui.activeView === 'paneList' }">
        <QuestionListPane />
      </div>

      <div id="paneWordLib" class="sidebar-tab-pane" :class="{ active: state.ui.activeView === 'paneWordLib' }">
        <WordLibraryPane />
      </div>

      <div id="paneClozeVisual" class="sidebar-tab-pane" :class="{ active: state.ui.activeView === 'paneClozeVisual' }">
        <VisualClozePane />
      </div>
    </div>
  </aside>
</template>

<script setup>
import { state } from '../stores/appStore.js';
import QuickInputPane from './QuickInputPane.vue';
import QuestionListPane from './QuestionListPane.vue';
import WordLibraryPane from './WordLibraryPane.vue';
import VisualClozePane from './VisualClozePane.vue';
import AppIcon from './AppIcon.vue';

const tabs = [
  { key: 'paneQuick', label: '题目录入', icon: 'edit' },
  { key: 'paneList', label: '试卷题目', icon: 'file-text' },
  { key: 'paneWordLib', label: '备课资源库', icon: 'book' }
];

function onTabClick(key) {
  state.ui.activeView = key;
  if (key === 'paneSettings') {
    state.ui.isSettingsCollapsed = false;
  }
  ['paneQuick', 'paneList', 'paneWordLib', 'paneClozeVisual'].forEach(k => {
    const pane = document.getElementById(k);
    if (pane) {
      pane.classList.toggle('active', k === key);
    }
  });
  const paneSettings = document.getElementById('paneSettings');
  if (paneSettings) {
    paneSettings.classList.toggle('active', key === 'paneSettings' || !state.ui.isSettingsCollapsed);
  }
}
</script>

<style scoped>
.sidebar {
  width: 400px;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  z-index: 10;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s ease;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 0 !important;
  border-right: none;
}

.sidebar-tab-bar {
  display: flex;
  background: var(--bg-sidebar);
  border-bottom: 1px solid var(--border-color);
  padding: 6px 12px 0 12px;
  gap: 4px;
  flex-shrink: 0;
  overflow-x: auto;
}

.sidebar-tab-btn {
  flex: 1;
  min-width: 75px;
  padding: 7px 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  text-align: center;
  border-radius: 4px 4px 0 0;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.sidebar-tab-btn:hover {
  color: var(--primary);
  background: var(--bg-card);
}

.sidebar-tab-btn.active {
  color: var(--primary);
  background: var(--bg-card);
  border-bottom: 2px solid var(--primary);
  font-weight: 700;
  box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.04);
}

.sidebar-scrollable {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 14px 16px 40px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sidebar-tab-pane {
  display: none;
  flex-direction: column;
  gap: 14px;
}

.sidebar-tab-pane.active {
  display: flex;
}
</style>
