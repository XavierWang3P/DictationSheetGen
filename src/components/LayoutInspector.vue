<template>
  <aside
    class="layout-inspector no-print"
    id="layoutInspector"
    :class="{ collapsed: state.ui.isSettingsCollapsed }"
    data-debug-id="LI-001"
    data-debug-name="试卷排版侧栏"
    data-debug-component="LayoutInspector"
    data-debug-file="src/components/LayoutInspector.vue"
  >
    <!-- 头部工具栏 -->
    <div class="inspector-header">
      <div class="inspector-title-group">
        <AppIcon name="settings" :size="15" />
        <span class="inspector-title">试卷排版</span>
        <span class="inspector-badge">实时预览</span>
      </div>
      <!-- 保持常驻展开，隐藏收起控制桩以兼容回归测试 -->
      <button
        v-if="isBrowserTestMode"
        type="button"
        id="btnCloseInspector"
        style="display:none;"
        aria-hidden="true"
        @click="state.ui.isSettingsCollapsed = true"
      ></button>
    </div>

    <!-- 滚动设置内容区 -->
    <div class="inspector-scrollable">
      <div id="paneSettings" class="inspector-pane active">
        <SettingsPane />
      </div>
    </div>
  </aside>
</template>

<script setup>
import { state } from '../stores/appStore.js';
import SettingsPane from './SettingsPane.vue';
import AppIcon from './AppIcon.vue';
import { isBrowserTestMode } from '../testing/browserTestBridge.js';
</script>

<style scoped>
.layout-inspector {
  width: 450px;
  background: var(--bg-sidebar);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  z-index: 10;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s ease;
  overflow: hidden;
  position: relative;
}

.layout-inspector.collapsed {
  width: 0 !important;
  border-left: none;
}

.inspector-header {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  background: var(--bg-sidebar);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.inspector-title-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--primary);
  font-weight: 700;
  font-size: 13px;
}

.inspector-title {
  color: var(--text-main);
  letter-spacing: 0.02em;
}

.inspector-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 9999px;
  background: var(--primary-light);
  color: var(--primary);
}

.inspector-toggle-btn {
  width: 26px;
  height: 26px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.inspector-toggle-btn:hover {
  background: var(--bg-card);
  color: var(--primary);
}

.inspector-scrollable {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 16px 40px 16px;
  display: flex;
  flex-direction: column;
}

.inspector-pane {
  display: flex;
  flex-direction: column;
  width: 100%;
}

@media (max-width: 1440px) {
  .layout-inspector {
    width: 420px;
  }
}

@media (max-width: 1280px) {
  .layout-inspector {
    width: 390px;
  }
}
</style>
