<template>
  <div v-if="isDebugActive" class="debug-overlay-wrap debug-overlay-root active no-print">
    <!-- 悬浮模式指示胶囊 -->
    <div class="debug-toggle-indicator" @click="toggleDebug">
      <AppIcon name="bug" size="14" />
      <span>DEBUG MODE [{{ targetCount }} 节点已定位]</span>
      <span style="opacity:0.7; font-size:10px;">(Ctrl+Alt+D 关闭)</span>
    </div>

    <!-- 悬停/点击调试元信息展示卡 -->
    <div
      v-if="hoverInfo"
      class="debug-inspector-tooltip"
      :style="{ top: tooltipY + 'px', left: tooltipX + 'px' }"
    >
      <div class="debug-tooltip-row">
        <span class="debug-tooltip-label">编号:</span>
        <span class="debug-tooltip-val">{{ hoverInfo.id }}</span>
      </div>
      <div class="debug-tooltip-row">
        <span class="debug-tooltip-label">名称:</span>
        <span style="color:#ffffff; font-weight:600;">{{ hoverInfo.name }}</span>
      </div>
      <div v-if="hoverInfo.component" class="debug-tooltip-row">
        <span class="debug-tooltip-label">组件:</span>
        <span style="color:#a7f3d0;">{{ hoverInfo.component }}</span>
      </div>
      <div v-if="hoverInfo.file" class="debug-tooltip-row">
        <span class="debug-tooltip-label">文件:</span>
        <span style="color:#94a3b8; font-size:10px; word-break:break-all;">{{ hoverInfo.file }}</span>
      </div>
      <button type="button" class="debug-copy-btn" @click.stop="copyInfo">
        <AppIcon :name="copySuccess ? 'check' : 'copy'" :size="13" />
        {{ copySuccess ? '已复制到剪贴板' : '复制组件定位信息' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { isDebugActive } from '../composables/useDebugMode.js';
import AppIcon from './AppIcon.vue';

const targetCount = ref(0);
const hoverInfo = ref(null);
const tooltipX = ref(0);
const tooltipY = ref(0);
const copySuccess = ref(false);

function toggleDebug() {
  isDebugActive.value = !isDebugActive.value;
  if (typeof document !== 'undefined') {
    document.body.classList.toggle('is-debug-mode', isDebugActive.value);
  }
}

function updateTargetCount() {
  if (typeof document !== 'undefined') {
    targetCount.value = document.querySelectorAll('[data-debug-id]').length;
  }
}

function handleMouseMove(e) {
  if (!isDebugActive.value) {
    if (hoverInfo.value) hoverInfo.value = null;
    return;
  }

  const target = e.target.closest('[data-debug-id]');
  if (!target) {
    // 鼠标在 tooltip 内部时不清除
    if (e.target.closest('.debug-inspector-tooltip')) return;
    hoverInfo.value = null;
    return;
  }

  const id = target.getAttribute('data-debug-id');
  const name = target.getAttribute('data-debug-name') || '未命名控件';
  const component = target.getAttribute('data-debug-component') || '';
  const file = target.getAttribute('data-debug-file') || '';

  hoverInfo.value = { id, name, component, file };

  // 计算浮窗坐标，防止溢出屏幕右侧或下侧
  let x = e.clientX + 14;
  let y = e.clientY + 14;
  if (x + 300 > window.innerWidth) x = Math.max(10, e.clientX - 310);
  if (y + 160 > window.innerHeight) y = Math.max(10, e.clientY - 170);

  tooltipX.value = x;
  tooltipY.value = y;
}

function copyInfo() {
  if (!hoverInfo.value) return;
  const text = `【组件定位】编号: ${hoverInfo.value.id} | 名称: ${hoverInfo.value.name} | 组件: ${hoverInfo.value.component} | 文件: ${hoverInfo.value.file}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  }
  copySuccess.value = true;
  setTimeout(() => {
    copySuccess.value = false;
  }, 1800);
}

watch(isDebugActive, (val) => {
  if (val) {
    updateTargetCount();
  } else {
    hoverInfo.value = null;
  }
});

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove);
  updateTargetCount();
});

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', handleMouseMove);
});
</script>
