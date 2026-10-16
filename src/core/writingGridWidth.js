const measurementCache = new Map();
const MAX_CACHE_ENTRIES = 2000;
let browserCanvas = null;
let browserContext = null;

function getBrowserMeasureText(fontFamily, fontSize, fontWeight, letterSpacing) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return null;
  }
  if (!browserContext) {
    browserCanvas = document.createElement('canvas');
    browserContext = browserCanvas.getContext('2d');
  }
  if (!browserContext) return null;
  browserContext.font = `${fontWeight || 400} ${fontSize}px ${fontFamily || "'Times New Roman', Times, serif"}`;
  return (text) => {
    const base = browserContext.measureText(text).width;
    const spacing = Math.max(0, Number(letterSpacing) || 0) * Math.max(0, text.length - 1);
    return base + spacing;
  };
}

function fallbackMeasure(text, fontSize) {
  const size = Math.max(1, Number(fontSize) || 16);
  return Array.from(text || '').reduce((total, char) => {
    if (/\s/.test(char)) return total + size * 0.32;
    if (/[A-ZMW]/.test(char)) return total + size * 0.72;
    if (/[ilI1'’]/.test(char)) return total + size * 0.3;
    return total + size * 0.54;
  }, 0);
}

export function measureAnswerText({
  text = '',
  fontFamily = "'Times New Roman', Times, serif",
  fontSize = 16,
  fontWeight = 400,
  letterSpacing = 0,
  measureText
} = {}) {
  const value = String(text || '');
  if (!value) return 0;
  if (typeof measureText === 'function') {
    return Math.max(0, Number(measureText(value)) || 0);
  }

  const key = `${fontWeight}|${fontSize}|${letterSpacing}|${fontFamily}|${value}`;
  if (measurementCache.has(key)) return measurementCache.get(key);

  const browserMeasure = getBrowserMeasureText(fontFamily, fontSize, fontWeight, letterSpacing);
  const width = browserMeasure
    ? browserMeasure(value)
    : fallbackMeasure(value, fontSize) + (Math.max(0, Number(letterSpacing) || 0) * Math.max(0, value.length - 1));
  if (measurementCache.size >= MAX_CACHE_ENTRIES) {
    measurementCache.delete(measurementCache.keys().next().value);
  }
  measurementCache.set(key, width);
  return width;
}

/**
 * 按答案的实际字体测量宽度计算书写格宽度。
 * 返回值只包含数值，不携带答案文本，避免渲染层误将答案写入学生卷 DOM。
 */
export function calculateWritingGridWidth({
  text = '',
  fontFamily = "'Times New Roman', Times, serif",
  fontSize = 16,
  fontWeight = 400,
  letterSpacing = 0,
  availableWidth = Number.POSITIVE_INFINITY,
  minWidth = 48,
  maxWidth = Number.POSITIVE_INFINITY,
  scale = 1.5,
  measureText
} = {}) {
  const safeMin = Math.max(0, Number(minWidth) || 0);
  const safeAvailable = Number.isFinite(Number(availableWidth)) ? Math.max(0, Number(availableWidth)) : Number.POSITIVE_INFINITY;
  const safeMax = Number.isFinite(Number(maxWidth)) ? Math.max(safeMin, Number(maxWidth)) : Number.POSITIVE_INFINITY;
  const limit = Math.max(0, Math.min(safeAvailable, safeMax));
  const measuredWidth = measureAnswerText({ text, fontFamily, fontSize, fontWeight, letterSpacing, measureText });
  const targetWidth = measuredWidth > 0 ? measuredWidth * Math.max(0, Number(scale) || 1.5) : safeMin;
  const unclamped = Math.max(safeMin, targetWidth);
  const width = Number.isFinite(limit) ? Math.min(unclamped, limit) : unclamped;

  return {
    measuredWidth,
    targetWidth,
    width,
    overflow: targetWidth > limit,
    minWidth: safeMin,
    maxWidth: limit
  };
}

export function clearWritingGridMeasurementCache() {
  measurementCache.clear();
}
