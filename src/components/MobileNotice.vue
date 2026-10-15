<template>
  <main
    class="mobile-notice-wrapper"
    role="main"
    aria-labelledby="mobile-notice-title"
    aria-describedby="mobile-notice-desc"
  >
    <div class="mobile-notice-card">
      <!-- 电脑设备矢量线性图标 (无Emoji，精致矢量设计) -->
      <div class="mobile-notice-icon-box" aria-hidden="true">
        <svg
          class="mobile-notice-icon"
          viewBox="0 0 56 56"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <!-- 显示器外框 -->
          <rect
            x="5"
            y="7"
            width="46"
            height="32"
            rx="4"
            stroke="#2563eb"
            stroke-width="2.5"
            fill="#eff6ff"
          />
          <!-- 屏幕底框 -->
          <line
            x1="5"
            y1="31"
            x2="51"
            y2="31"
            stroke="#2563eb"
            stroke-width="2"
          />
          <!-- 屏幕内示意线条 -->
          <line
            x1="12"
            y1="16"
            x2="44"
            y2="16"
            stroke="#93c5fd"
            stroke-width="2"
            stroke-linecap="round"
          />
          <line
            x1="12"
            y1="22"
            x2="32"
            y2="22"
            stroke="#93c5fd"
            stroke-width="2"
            stroke-linecap="round"
          />
          <!-- 底座支架与底座 -->
          <path
            d="M23 39L20 48H36L33 39"
            stroke="#2563eb"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle cx="28" cy="35" r="1.5" fill="#2563eb" />
        </svg>
      </div>

      <!-- 严格匹配要求的提示文案 -->
      <h1 id="mobile-notice-title" class="mobile-notice-title">
        当前设备暂不支持
      </h1>

      <p id="mobile-notice-desc" class="mobile-notice-text">
        本网站暂不支持手机端访问，请使用电脑访问。
      </p>

      <!-- 便捷操作：复制链接以便发送到电脑端 -->
      <div class="mobile-notice-actions">
        <button
          type="button"
          class="mobile-copy-btn"
          @click="handleCopyUrl"
          :class="{ 'is-copied': copied }"
          aria-label="复制本站网址，以便发送到电脑端访问"
        >
          <svg
            v-if="!copied"
            class="copy-btn-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <svg
            v-else
            class="copy-btn-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span :aria-live="copied ? 'polite' : 'off'">
            {{ copied ? '已复制电脑访问网址' : '复制网址发送到电脑' }}
          </span>
        </button>
      </div>

      <!-- 补充参数说明 -->
      <div class="mobile-notice-footer" aria-hidden="true">
        <span class="footer-tip">建议桌面显示器分辨率 1280 × 800 及以上</span>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref } from 'vue';

const copied = ref(false);

const handleCopyUrl = async () => {
  const url = window.location.href;
  let ok = false;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch (e) {
      ok = false;
    }
  }
  if (!ok) {
    try {
      const el = document.createElement('textarea');
      el.value = url;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      ok = true;
    } catch (e) {
      ok = false;
    }
  }

  if (ok) {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2500);
  }
};
</script>

<style scoped>
.mobile-notice-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  background: linear-gradient(145deg, #f8fafc 0%, #edf2f7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  overflow-y: auto;
  z-index: 999999;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased;
}

.mobile-notice-card {
  width: 100%;
  max-width: 400px;
  background: #ffffff;
  border-radius: 20px;
  padding: 40px 28px;
  box-sizing: border-box;
  box-shadow: 0 12px 32px -4px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04);
  border: 1px solid #e2e8f0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: auto;
}

.mobile-notice-icon-box {
  width: 76px;
  height: 76px;
  border-radius: 22px;
  background: #eff6ff;
  border: 1px solid #dbeafe;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.mobile-notice-icon {
  width: 46px;
  height: 46px;
}

.mobile-notice-title {
  margin: 0 0 12px 0;
  font-size: 21px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.35;
  letter-spacing: -0.01em;
}

.mobile-notice-text {
  margin: 0 0 28px 0;
  font-size: 15px;
  line-height: 1.65;
  color: #334155;
  word-break: break-word;
}

.mobile-notice-actions {
  width: 100%;
  display: flex;
  justify-content: center;
}

.mobile-copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 22px;
  font-size: 14px;
  font-weight: 500;
  color: #1d4ed8;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.mobile-copy-btn:hover {
  background: #dbeafe;
  border-color: #93c5fd;
  color: #1e40af;
}

.mobile-copy-btn:active {
  transform: scale(0.98);
}

.mobile-copy-btn.is-copied {
  background: #f0fdf4;
  border-color: #86efac;
  color: #15803d;
}

.copy-btn-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.mobile-notice-footer {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid #f1f5f9;
  width: 100%;
}

.footer-tip {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
}

/* 适配超小屏幕手机 (如 iPhone SE / 320px-360px 宽度) */
@media (max-width: 360px) {
  .mobile-notice-wrapper {
    padding: 16px;
  }
  .mobile-notice-card {
    padding: 28px 18px;
  }
  .mobile-notice-icon-box {
    width: 64px;
    height: 64px;
    margin-bottom: 18px;
  }
  .mobile-notice-icon {
    width: 38px;
    height: 38px;
  }
  .mobile-notice-title {
    font-size: 18px;
  }
  .mobile-notice-text {
    font-size: 14px;
    margin-bottom: 22px;
  }
}

/* 适配横屏手机 (高度 <= 500px 时紧凑布局，防止内容截断) */
@media (max-height: 500px) {
  .mobile-notice-wrapper {
    padding: 12px;
  }
  .mobile-notice-card {
    padding: 20px 24px;
    max-width: 480px;
  }
  .mobile-notice-icon-box {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    margin-bottom: 12px;
  }
  .mobile-notice-icon {
    width: 30px;
    height: 30px;
  }
  .mobile-notice-title {
    font-size: 18px;
    margin-bottom: 6px;
  }
  .mobile-notice-text {
    font-size: 14px;
    margin-bottom: 16px;
  }
  .mobile-notice-footer {
    margin-top: 14px;
    padding-top: 10px;
  }
}
</style>
