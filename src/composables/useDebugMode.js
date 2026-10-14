import { ref, onMounted, onBeforeUnmount } from 'vue';

export const isDebugActive = ref(false);

export function useDebugMode() {
  function handleKeyDown(e) {
    // 检查是否按下 Ctrl + Alt + D (Windows/Linux) 或 Cmd + Option + D (macOS)
    const isModifier = (e.ctrlKey || e.metaKey) && e.altKey;
    if (isModifier && (e.key === 'd' || e.key === 'D')) {
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
