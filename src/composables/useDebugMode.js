import { ref, onMounted, onBeforeUnmount } from 'vue';

export const isDebugActive = ref(false);

export function useDebugMode() {
  function handleKeyDown(e) {
    // 检查是否按下 Ctrl + Alt + D (Windows/Linux) 或 Cmd + Option + D / Ctrl + Option + D (macOS)
    // 注：macOS 上按住 Option 会使 event.key 输出特殊字符 '∂'，因此必须优先校验 event.code === 'KeyD'
    const isModifier = (e.ctrlKey || e.metaKey) && e.altKey;
    const isKeyD = e.code === 'KeyD' || e.key === 'd' || e.key === 'D' || e.key === '∂';
    if (isModifier && isKeyD) {
      e.preventDefault();
      isDebugActive.value = !isDebugActive.value;
      if (typeof document !== 'undefined') {
        document.body.classList.toggle('is-debug-mode', isDebugActive.value);
      }
    }
  }

  function registerDebugKeyboardListener() {
    window.addEventListener('keydown', handleKeyDown);
  }

  function unregisterDebugKeyboardListener() {
    window.removeEventListener('keydown', handleKeyDown);
    if (typeof document !== 'undefined') {
      document.body.classList.remove('is-debug-mode');
    }
  }

  return {
    isDebugActive,
    registerDebugKeyboardListener,
    unregisterDebugKeyboardListener
  };
}
