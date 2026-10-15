<template>
  <div class="question-editor-shell">
    <div v-if="$slots.header || title" class="editor-shell-header">
      <slot name="header">
        <div class="editor-shell-title-wrap">
          <span class="editor-shell-title">{{ title }}</span>
          <span v-if="displayTip" class="editor-shell-tip" :title="fullTip">{{ displayTip }}</span>
          <n-tooltip v-if="tooltipText" trigger="hover" placement="top">
            <template #trigger>
              <span class="editor-shell-tip-icon" role="button" aria-label="帮助提示">?</span>
            </template>
            <span>{{ tooltipText }}</span>
          </n-tooltip>
        </div>
      </slot>
    </div>

    <div class="editor-shell-body">
      <slot></slot>
    </div>

    <div v-if="$slots.advanced" class="editor-shell-advanced">
      <details class="editor-shell-details">
        <summary class="editor-shell-summary">
          <span>高级选项（分栏与版面微调）</span>
        </summary>
        <div class="editor-shell-advanced-body">
          <slot name="advanced"></slot>
        </div>
      </details>
    </div>

    <div v-if="$slots.actions" class="editor-shell-actions">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { NTooltip } from 'naive-ui';

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  tip: {
    type: String,
    default: ''
  },
  tooltip: {
    type: String,
    default: ''
  }
});

const displayTip = computed(() => {
  if (!props.tip) return '';
  if (props.tip.length <= 12) return props.tip;
  return props.tip.slice(0, 12);
});

const tooltipText = computed(() => {
  if (props.tooltip) return props.tooltip;
  if (props.tip && props.tip.length > 12) return props.tip;
  return '';
});

const fullTip = computed(() => props.tooltip || props.tip);
</script>

<style scoped>
.question-editor-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: transparent;
  border: none;
  box-shadow: none;
  border-radius: 0;
  padding: 0;
}

.editor-shell-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 22px;
  gap: 6px;
}

.editor-shell-title-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
  overflow: hidden;
}

.editor-shell-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap !important;
  flex-shrink: 0;
  line-height: 1.3;
}

.editor-shell-tip {
  font-size: 11.5px;
  color: var(--text-muted);
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  max-width: 140px;
  flex-shrink: 1;
  line-height: 1.3;
}

.editor-shell-tip-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--bg-app);
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 600;
  cursor: help;
  user-select: none;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.editor-shell-tip-icon:hover {
  color: var(--primary);
  border-color: var(--primary);
  background: var(--primary-light);
}

.editor-shell-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.editor-shell-advanced {
  border-top: 1px dashed var(--border-color);
  padding-top: 6px;
}

.editor-shell-details {
  font-size: 12px;
}

.editor-shell-summary {
  cursor: pointer;
  color: var(--text-muted);
  font-weight: 600;
  user-select: none;
  padding: 4px 0;
  transition: color 0.15s ease;
}

.editor-shell-summary:hover {
  color: var(--primary);
}

.editor-shell-advanced-body {
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.editor-shell-actions {
  display: flex !important;
  align-items: center;
  flex-wrap: nowrap !important;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--border-color);
  width: 100%;
  box-sizing: border-box;
}

.editor-shell-actions :deep(button) {
  white-space: nowrap !important;
  font-size: 12px;
  padding: 0 8px !important;
  flex: 0 0 auto;
  box-sizing: border-box;
}

.editor-shell-actions :deep(button *) {
  white-space: nowrap !important;
}

.editor-shell-actions :deep([data-debug-id="Q-004"]),
.editor-shell-actions :deep(.primary-action-btn),
.editor-shell-actions :deep(.primary-editor-btn) {
  flex: 1 1 auto !important;
  min-width: 0;
  white-space: nowrap !important;
  padding: 0 10px !important;
}
</style>
