<template>
  <div class="question-editor-shell">
    <div v-if="$slots.header || title" class="editor-shell-header">
      <slot name="header">
        <span class="editor-shell-title">{{ title }}</span>
        <span v-if="tip" class="editor-shell-tip">{{ tip }}</span>
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
defineProps({
  title: {
    type: String,
    default: ''
  },
  tip: {
    type: String,
    default: ''
  }
});
</script>

<style scoped>
.question-editor-shell {
  background: var(--bg-card);
  border: 1px solid var(--editor-border-color, var(--border-color));
  border-radius: var(--editor-radius, 8px);
  padding: var(--editor-padding, 12px 14px);
  display: flex;
  flex-direction: column;
  gap: var(--editor-section-gap, 12px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.editor-shell-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 24px;
}

.editor-shell-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-main);
}

.editor-shell-tip {
  font-size: 11.5px;
  color: var(--text-muted);
}

.editor-shell-body {
  display: flex;
  flex-direction: column;
  gap: var(--editor-field-gap, 10px);
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
  gap: var(--editor-field-gap, 8px);
}

.editor-shell-actions {
  display: flex;
  align-items: center;
  gap: var(--editor-action-gap, 8px);
  padding-top: 6px;
  border-top: 1px dashed var(--border-color);
  flex-wrap: wrap;
}
</style>
