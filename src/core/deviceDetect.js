/**
 * 设备检测模块：移动端 / 手机访问识别
 *
 * 判定依据：
 * 1. 经典手机 User Agent（iPhone, iPod, Android Mobile 等）
 * 2. 触摸设备小屏特征（物理短边 <= 500px）
 * 3. 视口宽度响应式断点（<= 768px，适配桌面端缩小窗口测试及开发者工具模拟）
 */

export function isMobilePhoneDevice(customEnv = {}) {
  const win = customEnv.window || (typeof window !== 'undefined' ? window : null);
  const nav = customEnv.navigator || (typeof navigator !== 'undefined' ? navigator : null);

  if (!win || !nav) return false;

  const ua = nav.userAgent || nav.vendor || win.opera || '';

  // 1. 经典移动手机 UA 检测（严格区分手机与平板：Android 手机包含 Mobile，平板不包含）
  const isMobileUA = /Android.*Mobile|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i.test(ua);

  // 2. 视口与屏幕尺寸
  const width = win.innerWidth || (win.document?.documentElement?.clientWidth) || (win.document?.body?.clientWidth) || 0;
  const height = win.innerHeight || (win.document?.documentElement?.clientHeight) || (win.document?.body?.clientHeight) || 0;
  const screenWidth = win.screen?.width || width;
  const screenHeight = win.screen?.height || height;
  const minDim = Math.min(width, height);
  const minScreenDim = Math.min(screenWidth, screenHeight);

  // 手机端 UA 命中：无论横屏竖屏，均认定为手机设备
  if (isMobileUA) {
    return true;
  }

  // 触摸小屏设备判定（如折叠屏外屏、隐藏 UA 的手机浏览器）
  const isTouchDevice = (nav.maxTouchPoints && nav.maxTouchPoints > 1) || ('ontouchstart' in win);
  if (isTouchDevice && (minDim <= 500 || minScreenDim <= 500)) {
    return true;
  }

  // 视口自适应判断（适配桌面端缩放窗口测试、DevTools 模拟器等，行业标准 768px 断点）
  if (width > 0 && width <= 768) {
    return true;
  }

  return false;
}
