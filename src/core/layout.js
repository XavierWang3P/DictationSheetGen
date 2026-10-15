import { calculateWritingGridWidth } from './writingGridWidth.js';
import {
  DEFAULT_ALPHABET_GUIDE_FONT,
  resolveAlphabetGuideFont
} from './handwritingFonts.js';
import {
  DEFAULT_LAYOUT_DEFAULTS,
  estimateQuestionHeight,
  normalizeLayoutDefaults,
  normalizeQuestion,
  renderQuestion,
  resolveQuestionColumns,
  shouldUseFullRow
} from '../question-types/registry.js';

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function stripOuterBrackets(str) {
  if (!str) return '';
  let s = String(str).trim();
  while ((s.startsWith('（') && s.endsWith('）')) || (s.startsWith('(') && s.endsWith(')'))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export function getEffectiveGridHeight(s, copies = 1) {
  const baseH = Number(s?.gridHeight) || 12;
  if (copies > 1) {
    return Math.round((baseH * (11 / 12)) * 100) / 100;
  }
  return baseH;
}

export function getEffectiveRowGap(s, copies = 1, teacherMode = false) {
  const baseGap = Number(s?.rowGap) || 3.5;
  if (teacherMode) {
    return Math.round((baseGap * (1.2 / 3.5)) * 100) / 100;
  }
  if (copies >= 3) {
    return Math.round((baseGap * (2.0 / 3.5)) * 100) / 100;
  }
  if (copies === 2) {
    return Math.round((baseGap * (2.5 / 3.5)) * 100) / 100;
  }
  return baseGap;
}

export const DEFAULT_WORDS_RAW = [
  { en: 'beautiful', zh: '美丽的；优美的', group: '五年级上册 Unit 1' },
  { en: 'hard-working', zh: '工作努力的；辛勤的', group: '五年级上册 Unit 1' },
  { en: 'rope', zh: '绳；粗绳', group: '五年级上册 Unit 1' },
  { en: 'clever', zh: '聪明的；聪颖的', group: '五年级上册 Unit 1' },
  { en: 'robot', zh: '机器人', group: '五年级上册 Unit 1' },
  { en: 'piano', zh: '钢琴', group: '五年级上册 Unit 1' },
  { en: 'young', zh: '幼小的；年轻的', group: '五年级上册 Unit 1' },
  { en: 'jump', zh: '跳；跃', group: '五年级上册 Unit 1' },
  { en: 'chess', zh: '国际象棋', group: '五年级上册 Unit 1' }
];

// 小学各年级经典课标单元词库预设
export const PRESET_UNIT_LIBRARIES = [
  {
    name: '三年级上册 Unit 1',
    description: 'PEP三年级英语上册 Unit 1 Hello 文具与文具盒核心词',
    words: [
      { en: 'ruler', zh: '尺子', group: '三年级上册 Unit 1' },
      { en: 'eraser', zh: '橡皮', group: '三年级上册 Unit 1' },
      { en: 'pencil', zh: '铅笔', group: '三年级上册 Unit 1' },
      { en: 'crayon', zh: '蜡笔', group: '三年级上册 Unit 1' },
      { en: 'book', zh: '书', group: '三年级上册 Unit 1' },
      { en: 'bag', zh: '书包', group: '三年级上册 Unit 1' },
      { en: 'pen', zh: '钢笔', group: '三年级上册 Unit 1' },
      { en: 'pencil box', zh: '文具盒', group: '三年级上册 Unit 1' }
    ]
  },
  {
    name: '四年级上册 Unit 1',
    description: 'PEP四年级英语上册 Unit 1 My classroom 教室与设施核心词',
    words: [
      { en: 'classroom', zh: '教室', group: '四年级上册 Unit 1' },
      { en: 'window', zh: '窗户', group: '四年级上册 Unit 1' },
      { en: 'blackboard', zh: '黑板', group: '四年级上册 Unit 1' },
      { en: 'light', zh: '电灯', group: '四年级上册 Unit 1' },
      { en: 'picture', zh: '图画', group: '四年级上册 Unit 1' },
      { en: 'door', zh: '门', group: '四年级上册 Unit 1' },
      { en: 'computer', zh: '计算机', group: '四年级上册 Unit 1' },
      { en: 'fan', zh: '风扇', group: '四年级上册 Unit 1' },
      { en: 'wall', zh: '墙壁', group: '四年级上册 Unit 1' }
    ]
  },
  {
    name: '五年级上册 Unit 1',
    description: 'PEP五年级英语上册 Unit 1 What is he like 人物外貌与性格核心词',
    words: [
      { en: 'beautiful', zh: '美丽的；优美的', group: '五年级上册 Unit 1' },
      { en: 'hard-working', zh: '工作努力的；辛勤的', group: '五年级上册 Unit 1' },
      { en: 'rope', zh: '绳；粗绳', group: '五年级上册 Unit 1' },
      { en: 'clever', zh: '聪明的；聪颖的', group: '五年级上册 Unit 1' },
      { en: 'robot', zh: '机器人', group: '五年级上册 Unit 1' },
      { en: 'piano', zh: '钢琴', group: '五年级上册 Unit 1' },
      { en: 'young', zh: '幼小的；年轻的', group: '五年级上册 Unit 1' },
      { en: 'jump', zh: '跳；跃', group: '五年级上册 Unit 1' },
      { en: 'chess', zh: '国际象棋', group: '五年级上册 Unit 1' }
    ]
  }
];

export const DEFAULT_CLOZE_WORDS_RAW = [
  { en: 'ask [your teacher] for help', zh: '向你的老师求助' },
  { en: 'Where is [the library]?', zh: '图书馆在哪里？' },
  { en: 'I go to school [by bus].', zh: '我乘公共汽车去上学。' },
  { en: 'What would you like [to eat]?', zh: '你想吃什么？' },
  { en: 'She is [reading a book] now.', zh: '她正在看书。' },
  { en: 'There are [many flowers] in the park.', zh: '公园里有许多花。' },
  { en: 'Turn left [at the traffic lights].', zh: '在交通灯处左转。' },
  { en: 'My mother is [a doctor].', zh: '我的妈妈是一名医生。' },
  { en: 'We have [an English class] today.', zh: '我们今天有一节英语课。' }
];

export const PAPER_SIZES = {
  A4: { width: 210, height: 297, name: 'A4' },
  B4: { width: 257, height: 364, name: 'B4' },
  '8K': { width: 260, height: 370, name: '8K' },
  A3: { width: 297, height: 420, name: 'A3' }
};

export const DEFAULT_SETTINGS = {
  paperSize: 'A4',            // 'A4' | 'B4' | '8K' | 'A3'
  orientation: 'portrait',     // 'portrait' | 'landscape'
  splitFold: false,           // 大型纸张横向对半折（左右双页拼版）
  copiesPerPage: 3,           // 1 | 2 | 3 (默认一页 3 份)
  pageMargin: 8,              // mm (4-16)
  pageMarginHorizontal: 12,   // mm (4-24)
  dividerStyle: 'dashed',     // 'dashed' | 'solid' | 'none'
  showCutGuide: false,        // 不显示裁剪辅助线
  title: 'Unit 1 黑体词默写',
  titleFontSize: '18pt',      // 固定 18pt
  titleAlign: 'center',       // 'center'
  showStudentName: true,
  showStudentClass: true,
  showStudentNo: true,
  showStudentDate: true,
  showStudentScore: true,
  columns: 3,                 // 旧版全局列数，仅用于兼容旧数据与字母题
  layoutDefaults: { ...DEFAULT_LAYOUT_DEFAULTS },
  wordsPerPage: 9,            // 容量，默认 9 (3行 x 3列)
  promptFontSize: 14,         // pt (7-20) 提示/题号字号 (默认 14pt)
  zhFontSize: 'md',           // 'sm' | 'md' | 'lg'
  zhPosition: 'top',          // 'top' | 'left'
  colGap: 6,                  // mm (2-16)
  rowGap: 3.5,                // mm (2-10)
  gridStyle: 'four-line',     // 'four-line' | 'single-line'
  gridLinesPerWord: 1,        // 1 行
  gridHeight: 12,             // mm (6-18)
  gridStroke: 0.85,           // 0.6 | 0.85 | 1.2
  gridColor: '#cbd5e1',       // 线条颜色
  showVerticalBorder: true,   // 左右封闭竖线 (默认显示)
  dictMode: 'writing',        // 看中文写英文
  clozeStyle: 'inline',       // 'inline' (句中内嵌填空)
  clozeZhPosition: 'above',   // 'above' (固定在句子上方)
  clozeBlankWidth: 'auto',    // 默认按答案实际字体宽度的 150% 计算
  fontFamilyZh: "'KaiTi', '楷体', STKaiti, serif",
  fontFamilyEn: 'Arial, sans-serif',
  alphabetGuideFont: DEFAULT_ALPHABET_GUIDE_FONT,
  alphabetLayout: 'bottom-5col', // 字母左右邻居默认每行5题
  alphabetNeighborLayout: 'bottom-5col',
  alphabetCaseLayout: 'right-4col',
  alphabet26Rows: 3,
  autoOptimizeCopies: true,
  letterSpacing: '0.8px',
  showAnswerPage: false
};

export function migrateDraftItem(data, fallbackMode = 'writing') {
  return normalizeQuestion(data, fallbackMode);
}

export function createDraftItem(data, defaultType = null) {
  if (!data) return null;
  return migrateDraftItem(data, defaultType);
}

// SVG 练习格绘制 (纯函数)
export function createPracticeGridSvg(options = {}) {
  const {
    gridStyle = 'four-line',
    gridLines = 1,
    gridHeightMm = 9.2,
    strokeWidth = 0.85,
    lineColor = '#cbd5e1',
    showVertical = false
  } = options;

  let svgsHtml = '';

  if (gridStyle === 'single-line') {
    for (let i = 0; i < gridLines; i++) {
      const marginBot = (i < gridLines - 1) ? '1.5mm' : '0';
      svgsHtml += `
        <svg class="single-line-svg" viewBox="0 0 100 12" style="height:${gridHeightMm * 0.7}mm; margin-bottom:${marginBot};" preserveAspectRatio="none">
          ${showVertical ? `
            <line x1="0" y1="1" x2="0" y2="11" stroke="${lineColor}" stroke-width="${strokeWidth}" />
            <line x1="100" y1="1" x2="100" y2="11" stroke="${lineColor}" stroke-width="${strokeWidth}" />
          ` : ''}
          <line x1="0" y1="10" x2="100" y2="10" stroke="#94a3b8" stroke-width="${strokeWidth}" />
        </svg>
      `;
    }
    return svgsHtml;
  }

  // 规范四线三格 (中格加高比例)
  for (let i = 0; i < gridLines; i++) {
    const marginBot = (i < gridLines - 1) ? '1.8mm' : '0';
    svgsHtml += `
      <svg class="four-line-svg" viewBox="0 0 100 25" style="height:${gridHeightMm}mm; margin-bottom:${marginBot};" preserveAspectRatio="none">
        ${showVertical ? `
          <line x1="0" y1="2.0" x2="0" y2="23.0" stroke="${lineColor}" stroke-width="${strokeWidth}" />
          <line x1="100" y1="2.0" x2="100" y2="23.0" stroke="${lineColor}" stroke-width="${strokeWidth}" />
        ` : ''}
        <line x1="0" y1="2.0" x2="100" y2="2.0" stroke="${lineColor}" stroke-width="${strokeWidth}" />
        <line x1="0" y1="8.5" x2="100" y2="8.5" stroke="${lineColor}" stroke-width="${strokeWidth}" />
        <line x1="0" y1="16.5" x2="100" y2="16.5" stroke="#94a3b8" stroke-width="${strokeWidth * 1.1}" />
        <line x1="0" y1="23.0" x2="100" y2="23.0" stroke="${lineColor}" stroke-width="${strokeWidth}" />
      </svg>
    `;
  }

  return svgsHtml;
}

function createAlphabetGridShell({
  viewBoxWidth,
  gridHeightMm,
  lineMarkup,
  guides = [],
  alphabetGuideFont = DEFAULT_ALPHABET_GUIDE_FONT,
  extraClass = ''
}) {
  const font = resolveAlphabetGuideFont(alphabetGuideFont);
  const fontSizeMm = Math.max(3.8, Number(gridHeightMm || 11) * font.guideScale);
  const guideMarkup = guides
    .filter(guide => guide?.text)
    .map(guide => `
      <text
        class="alphabet-guide-text"
        x="${guide.xPercent}%"
        y="66%"
        font-size="${fontSizeMm.toFixed(3)}mm"
        font-weight="400"
        text-anchor="middle"
        fill="#2f6659"
        font-family="${escapeHtml(font.cssFamily)}"
      >${escapeHtml(guide.text)}</text>
    `)
    .join('');

  const shellCls = `alphabet-grid-shell ${extraClass}`.trim();
  return `
    <div class="${shellCls}" style="height:${gridHeightMm}mm;">
      <svg class="four-line-svg alphabet-grid-lines" viewBox="0 0 ${viewBoxWidth} 25" preserveAspectRatio="none" aria-hidden="true">
        ${lineMarkup}
      </svg>
      <svg class="alphabet-guide-layer" width="100%" height="100%" aria-hidden="true" font-family="${escapeHtml(font.cssFamily)}" style="font-family:${escapeHtml(font.cssFamily)};">
        ${guideMarkup}
      </svg>
    </div>
  `;
}

function createSingleAlphabetGridSvg({
  gridHeightMm = 11,
  strokeWidth = 0.85,
  lineColor = '#cbd5e1',
  guideText = '',
  alphabetGuideFont = DEFAULT_ALPHABET_GUIDE_FONT
} = {}) {
  const lineMarkup = `
    <line x1="0" y1="2.0" x2="100" y2="2.0" stroke="${lineColor}" stroke-width="${strokeWidth}" />
    <line x1="0" y1="8.5" x2="100" y2="8.5" stroke="${lineColor}" stroke-width="${strokeWidth}" />
    <line x1="0" y1="16.5" x2="100" y2="16.5" stroke="#94a3b8" stroke-width="${strokeWidth * 1.1}" />
    <line x1="0" y1="23.0" x2="100" y2="23.0" stroke="${lineColor}" stroke-width="${strokeWidth}" />
    <line x1="0" y1="2.0" x2="0" y2="23.0" stroke="${lineColor}" stroke-width="${strokeWidth}" />
    <line x1="100" y1="2.0" x2="100" y2="23.0" stroke="${lineColor}" stroke-width="${strokeWidth}" />
  `;

  return createAlphabetGridShell({
    viewBoxWidth: 100,
    gridHeightMm,
    lineMarkup,
    alphabetGuideFont,
    guides: [{ xPercent: 50, text: guideText }]
  });
}

// 字母左右邻居三联书写格 (四线三格 + 中间印已知字母)
export function createNeighborPracticeGridSvg(item, options = {}) {
  const {
    gridHeightMm = 11,
    strokeWidth = 0.85,
    lineColor = '#cbd5e1',
    alphabetGuideFont = DEFAULT_ALPHABET_GUIDE_FONT
  } = options;
  const nData = item.neighborData || {};
  const type = nData.type || 'both';
  const midChar = nData.midChar || '';
  const prevChar = nData.prevChar || '';
  const nextChar = nData.nextChar || '';

  let slot1Text = '';
  let slot2Text = '';
  let slot3Text = '';

  if (type === 'both') {
    slot2Text = midChar;
  } else if (type === 'middle') {
    slot1Text = prevChar;
    slot3Text = nextChar;
  } else if (type === 'pre') {
    slot2Text = midChar;
  } else if (type === 'post') {
    slot1Text = midChar;
  }

  const lineMarkup = `
      <line x1="0" y1="2.0" x2="300" y2="2.0" stroke="${lineColor}" stroke-width="${strokeWidth}" />
      <line x1="0" y1="8.5" x2="300" y2="8.5" stroke="${lineColor}" stroke-width="${strokeWidth}" />
      <line x1="0" y1="16.5" x2="300" y2="16.5" stroke="#94a3b8" stroke-width="${strokeWidth * 1.1}" />
      <line x1="0" y1="23.0" x2="300" y2="23.0" stroke="${lineColor}" stroke-width="${strokeWidth}" />
      
      <line x1="0" y1="2.0" x2="0" y2="23.0" stroke="${lineColor}" stroke-width="${strokeWidth}" />
      <line x1="100" y1="2.0" x2="100" y2="23.0" stroke="${lineColor}" stroke-width="${strokeWidth}" />
      <line x1="200" y1="2.0" x2="200" y2="23.0" stroke="${lineColor}" stroke-width="${strokeWidth}" />
      <line x1="300" y1="2.0" x2="300" y2="23.0" stroke="${lineColor}" stroke-width="${strokeWidth}" />
  `;

  return createAlphabetGridShell({
    viewBoxWidth: 300,
    gridHeightMm,
    lineMarkup,
    alphabetGuideFont,
    guides: [
      { xPercent: 16.667, text: slot1Text },
      { xPercent: 50, text: slot2Text },
      { xPercent: 83.333, text: slot3Text }
    ]
  });
}

// 字母大小写转换书写格 (四线三格在右侧，紧凑 100 宽度)
export function createCasePracticeGridSvg(item, options = {}) {
  const {
    gridHeightMm = 11,
    strokeWidth = 0.85,
    lineColor = '#cbd5e1',
    alphabetGuideFont = DEFAULT_ALPHABET_GUIDE_FONT
  } = options;
  const cData = item?.caseData || {};
  const dir = cData.dir || 'upper_to_lower';
  const u = cData.upper || '';
  const l = cData.lower || '';
  const targetChar = (dir === 'lower_to_upper') ? u : l;

  const lineMarkup = `
    <line x1="0" y1="2.0" x2="100" y2="2.0" stroke="${lineColor}" stroke-width="${strokeWidth}" />
    <line x1="0" y1="8.5" x2="100" y2="8.5" stroke="${lineColor}" stroke-width="${strokeWidth}" />
    <line x1="0" y1="16.5" x2="100" y2="16.5" stroke="#94a3b8" stroke-width="${strokeWidth * 1.1}" />
    <line x1="0" y1="23.0" x2="100" y2="23.0" stroke="${lineColor}" stroke-width="${strokeWidth}" />
    <line x1="0" y1="2.0" x2="0" y2="23.0" stroke="${lineColor}" stroke-width="${strokeWidth}" />
    <line x1="100" y1="2.0" x2="100" y2="23.0" stroke="${lineColor}" stroke-width="${strokeWidth}" />
  `;
  const guideText = options.isTeacher ? (cData.targetChar || targetChar) : '';
  return createAlphabetGridShell({
    viewBoxWidth: 100,
    gridHeightMm,
    lineMarkup,
    alphabetGuideFont,
    extraClass: 'case-svg-grid',
    guides: guideText ? [{ xPercent: 50, text: guideText }] : []
  });
}

// 句子挖空与提示格式化 (纯函数)
export function formatClozePrompt(itemOrEn, modeOrZh, maybeModeOrOpts, options = {}) {
  let en = '';
  let zh = '';
  let mode = 'writing';
  let opts = options;
  let segments = null;

  if (typeof itemOrEn === 'object' && itemOrEn !== null) {
    const item = itemOrEn;
    en = item.en || '';
    zh = stripOuterBrackets(item.overrideZh || item.zh || item.translation || '');
    mode = (typeof modeOrZh === 'string') ? modeOrZh : 'writing';
    opts = maybeModeOrOpts || {};
    segments = item.segments || null;
  } else {
    en = itemOrEn || '';
    zh = stripOuterBrackets(modeOrZh || '');
    mode = maybeModeOrOpts || 'writing';
  }

  if (mode !== 'cloze') {
    const txt = zh || en || '';
    return txt ? `<span class="meaning-text entry-zh-hint">${escapeHtml(txt)}</span>` : '';
  }

  const {
    gridStyle = 'four-line',
    clozeStyle = 'inline',
    clozeZhPosition = 'above',
    clozeBlankWidth = 'auto',
    strokeWidth = 0.85,
    lineColor = '#cbd5e1',
    fontFamily = 'Arial, sans-serif',
    fontSize = 18,
    letterSpacing = 0,
    availableWidth = 280,
    gridHeightMm = null
  } = opts;

  function renderBlankHtml(wordText, trailingPunct = '') {
    let cleanWord = (wordText || '').trim();
    let customWidth = null;

    // 支持行内标记宽度，如 [word:1word]、[word:1.5words]、[word:100px] 等
    const widthMatch = cleanWord.match(/:(1word|1\.5words|2words|2\.5words|3words|\d+(?:\.\d+)?px|\d+(?:\.\d+)?)$/i);
    if (widthMatch) {
      const tag = widthMatch[1].toLowerCase();
      cleanWord = cleanWord.substring(0, widthMatch.index).trim();
      if (tag === '1word' || tag === '1') customWidth = 62;
      else if (tag === '1.5words') customWidth = 85;
      else if (tag === '2words' || tag === '2') customWidth = 108;
      else if (tag === '2.5words') customWidth = 130;
      else if (tag === '3words' || tag === '3') customWidth = 152;
      else if (tag.endsWith('px')) customWidth = parseFloat(tag);
      else if (!isNaN(parseFloat(tag))) customWidth = parseFloat(tag);
    }

    let widthPx;
    if (customWidth && customWidth > 0) {
      widthPx = customWidth;
    } else if (typeof clozeBlankWidth === 'number' && clozeBlankWidth > 0) {
      widthPx = clozeBlankWidth;
    } else if (clozeBlankWidth === '1word') {
      widthPx = 62; // 1 词长 (约 16mm)
    } else if (clozeBlankWidth === '1.5words') {
      widthPx = 85;
    } else if (clozeBlankWidth === '2words') {
      widthPx = 108; // 2 词长 (约 28mm，推荐)
    } else if (clozeBlankWidth === '2.5words') {
      widthPx = 130;
    } else if (clozeBlankWidth === '3words') {
      widthPx = 152; // 3 词长 (约 40mm)
    } else {
      const measurement = calculateWritingGridWidth({
        text: cleanWord,
        fontFamily,
        fontSize,
        letterSpacing,
        availableWidth,
        minWidth: 48,
        maxWidth: availableWidth,
        scale: 1.5
      });
      widthPx = Math.round(measurement.width);
    }

    const punctMargin = trailingPunct ? 'margin-right: 1px;' : 'margin-right: 3px;';

    if (clozeStyle === 'inline' && gridStyle === 'four-line') {
      const heightStyle = gridHeightMm ? `height:${gridHeightMm}mm;` : 'height:var(--grid-height, 1.75em);';
      return `<span class="cloze-blank-line cloze-inline-grid" style="width:${widthPx}px; ${heightStyle} ${punctMargin}">
        <svg viewBox="0 0 100 25" preserveAspectRatio="none">
          <line x1="0" y1="2.0" x2="100" y2="2.0" stroke="${lineColor}" stroke-width="${strokeWidth}" />
          <line x1="0" y1="8.5" x2="100" y2="8.5" stroke="${lineColor}" stroke-width="${strokeWidth}" />
          <line x1="0" y1="16.5" x2="100" y2="16.5" stroke="#94a3b8" stroke-width="${strokeWidth * 1.1}" />
          <line x1="0" y1="23.0" x2="100" y2="23.0" stroke="${lineColor}" stroke-width="${strokeWidth}" />
          <line x1="0" y1="2.0" x2="0" y2="23.0" stroke="${lineColor}" stroke-width="${strokeWidth}" />
          <line x1="100" y1="2.0" x2="100" y2="23.0" stroke="${lineColor}" stroke-width="${strokeWidth}" />
        </svg>
      </span>${trailingPunct}`;
    } else {
      return `<span class="cloze-blank-line" style="min-width:${widthPx}px; width:${widthPx}px; ${punctMargin}"></span>${trailingPunct}`;
    }
  }

  function assembleClozeHtml(formattedEn, rawZh) {
    const zhText = stripOuterBrackets(rawZh);
    if (clozeStyle === 'inline') {
      const englishHtml = `<span class="meaning-text cloze-sentence cloze-english-column">${formattedEn}</span>`;
      if (!zhText || clozeZhPosition === 'hide') {
        return `<div class="cloze-position-layout cloze-layout-hide">${englishHtml}</div>`;
      }
      const chineseHtml = `<span class="cloze-zh pos-${clozeZhPosition}">${escapeHtml(zhText)}</span>`;
      if (clozeZhPosition === 'above') {
        return `<div class="cloze-position-layout cloze-layout-above">${chineseHtml}${englishHtml}</div>`;
      }
      if (clozeZhPosition === 'right') {
        return `<div class="cloze-position-layout cloze-layout-right">${englishHtml}${chineseHtml}</div>`;
      }
      return `<div class="cloze-position-layout cloze-layout-below">${englishHtml}${chineseHtml}</div>`;
    }
    let zhHtml = '';
    if (zhText && clozeZhPosition !== 'hide') {
      zhHtml = `<span class="cloze-zh pos-${clozeZhPosition}">${escapeHtml(zhText)}</span>`;
    }

    if (clozeZhPosition === 'below') {
      return `<div class="cloze-content-wrap"><span class="meaning-text cloze-sentence">${formattedEn}</span>${zhHtml}</div>`;
    } else if (clozeZhPosition === 'above') {
      return `<div class="cloze-content-wrap">${zhHtml}<span class="meaning-text cloze-sentence">${formattedEn}</span></div>`;
    } else {
      // 'right' or 'hide'
      return `<span class="meaning-text cloze-sentence">${formattedEn}</span>${zhHtml}`;
    }
  }

  if (segments && segments.length > 0) {
    let formattedEn = '';
    segments.forEach(seg => {
      if (seg.blank) {
        let punct = '';
        let cleanText = seg.text;
        const pMatch = seg.text.match(/([.,!?;:'"”]+)$/);
        if (pMatch) {
          punct = pMatch[1];
          cleanText = seg.text.slice(0, -punct.length);
        }
        formattedEn += renderBlankHtml(cleanText, punct);
      } else {
        formattedEn += escapeHtml(seg.text);
      }
    });
    return assembleClozeHtml(formattedEn, zh);
  }

  const sentence = (en || '').trim();
  const zhText = (zh || '').trim();
  if (!sentence) {
    return zhText ? `<span class="meaning-text entry-zh-hint">${escapeHtml(zhText)}</span>` : '';
  }

  let formattedEn = '';
  const bracketPunctRegex = /(\[([^\]]+)\]|\{([^}]+)\})([.,!?;:'"”]*)?/g;
  if (sentence.search(/\[([^\]]+)\]|\{([^}]+)\}/) !== -1) {
    formattedEn = escapeHtml(sentence).replace(bracketPunctRegex, (match, fullBracket, p1, p2, punct) => {
      let word = (p1 || p2 || '').trim();
      let allPunct = punct || '';
      const innerPunct = word.match(/([.,!?;:'"”]+)$/);
      if (innerPunct) {
        allPunct = innerPunct[1] + allPunct;
        word = word.slice(0, -innerPunct[1].length).trim();
      }
      return renderBlankHtml(word, allPunct);
    });
  } else if (sentence.includes('___') || sentence.includes('——')) {
    formattedEn = escapeHtml(sentence).replace(/(_{2,}|——+)([.,!?;:'"”]*)?/g, (match, line, punct) => {
      return renderBlankHtml('blank', punct || '');
    });
  } else {
    const words = sentence.split(/\s+/);
    if (words.length >= 3) {
      const blankStart = 1;
      const blankCount = (words.length >= 5) ? 2 : 1;
      const before = words.slice(0, blankStart).map(escapeHtml).join(' ');
      let targetWords = words.slice(blankStart, blankStart + blankCount).join(' ');
      let after = words.slice(blankStart + blankCount).map(escapeHtml).join(' ');

      let punct = '';
      const punctMatch = targetWords.match(/([.,!?;:'"”]+)$/);
      if (punctMatch) {
        punct = punctMatch[1];
        targetWords = targetWords.slice(0, -punct.length);
      }

      formattedEn = `${before} ${renderBlankHtml(targetWords, punct)} ${after}`;
    } else {
      formattedEn = renderBlankHtml(sentence, '');
    }
  }

  return assembleClozeHtml(formattedEn, zhText);
}

/**
 * 智能版面自适应：当题目数量较多超出版面承载范围时，自动切换 1页2份 或 1页1份
 * @param {Array} items 当前题目列表
 * @param {Object} settings 当前版式配置
 * @returns {Object} 适配后的配置片段 { copiesPerPage, wordsPerPage }
 */
export function autoAdaptCopiesAndCapacity(items, settings) {
  const count = Array.isArray(items) ? items.length : 0;
  const currentSettings = settings || {};
  if (count === 0) return { copiesPerPage: currentSettings.copiesPerPage || 3, wordsPerPage: currentSettings.wordsPerPage || 9 };

  const mode = currentSettings.dictMode || 'writing';
  let targetCopies = 3;
  let targetCapacity = 9;

  if (mode === 'cloze') {
    // 句子挖空题型 (默认2列排版)
    // 1 页 3 份：每份约 85-95mm，扣除标题考生栏，精准舒适容纳 10 句 (5行 x 2列)
    // 1 页 2 份：每份约 135-145mm，最多容纳 14 句 (7行 x 2列)
    // 1 页 1 份：整页约 270mm，容纳 15 句以上 (整页舒展排版)
    if (count <= 10) {
      targetCopies = 3;
      targetCapacity = Math.max(10, count);
    } else if (count <= 14) {
      targetCopies = 2;
      targetCapacity = Math.max(14, count);
    } else {
      targetCopies = 1;
      targetCapacity = Math.max(20, count);
    }
  } else if (mode === 'alphabet') {
    if (count === 26) {
      targetCopies = 1;
      targetCapacity = 26;
    } else {
      targetCopies = (count > 9) ? 2 : 3;
      targetCapacity = count;
    }
  } else {
    // 普通单词默写题型 (默认3列排版)
    if (count <= 9) {
      targetCopies = 3;
      targetCapacity = 9;
    } else if (count <= 18) {
      targetCopies = 2;
      targetCapacity = count;
    } else {
      targetCopies = 1;
      targetCapacity = Math.max(25, count);
    }
  }

  return {
    copiesPerPage: targetCopies,
    wordsPerPage: targetCapacity
  };
}

export function estimateQuestionHeightMm(item, s, copies = 3) {
  const effectiveGridH = getEffectiveGridHeight(s, copies);
  const availableWidthMm = Number(s._availableItemWidthMm) || 180;
  return estimateQuestionHeight(item, {
    copies,
    settings: s,
    effectiveGridHeight: effectiveGridH,
    fontFamilyEn: s.fontFamilyEn || 'Arial, sans-serif',
    fontSizePx: (Number(s.promptFontSize) || 14) * 1.333333,
    availableWidthPx: availableWidthMm * 3.7795275591
  });
}

/**
 * 拼版规整网格计算 (支持 2联、3联、4联、6联规整铺开)
 * @param {number|string} copies 联数 (份数)
 * @param {boolean} isLandscape 纸张是否横向
 * @returns {{ rows: number, cols: number }}
 */
export function getImpositionGrid(copies, isLandscape) {
  const c = Math.max(1, parseInt(copies, 10) || 1);
  if (c === 1) return { rows: 1, cols: 1 };
  if (c === 2) {
    // 2 联：横向大纸默认左右铺开 (1行2列)；纵向默认上下铺开 (2行1列)
    return isLandscape ? { rows: 1, cols: 2 } : { rows: 2, cols: 1 };
  }
  if (c === 3) {
    // 3 联：横向默认左右 3 列 (1行3列)；纵向默认上下 3 行 (3行1列)
    return isLandscape ? { rows: 1, cols: 3 } : { rows: 3, cols: 1 };
  }
  if (c === 4) {
    // 4 联：2行2列四宫格
    return { rows: 2, cols: 2 };
  }
  if (c === 6) {
    // 6 联：横向 2行3列；纵向 3行2列
    return isLandscape ? { rows: 2, cols: 3 } : { rows: 3, cols: 2 };
  }
  return isLandscape ? { rows: 1, cols: c } : { rows: c, cols: 1 };
}

// 纯函数：计算多页排版切片 (支持混合题型智能高度与自然分页)
export function computePageLayout(items, settings) {
  const rawWords = Array.isArray(items) ? items : [];
  const s = Object.assign({}, DEFAULT_SETTINGS, settings);
  s.layoutDefaults = normalizeLayoutDefaults(settings?.layoutDefaults, settings || {});
  const curPaperKey = s.paperSize || 'A4';
  const pDim = PAPER_SIZES[curPaperKey] || PAPER_SIZES.A4;
  const isLand = (s.orientation === 'landscape');
  const isSplitFold = Boolean(s.splitFold && isLand);
  const pageWidthMm = isLand ? pDim.height : pDim.width;
  const pageHeightMm = isLand ? pDim.width : pDim.height;
  const copiesPerPage = isSplitFold ? 1 : Math.max(1, parseInt(s.copiesPerPage, 10) || 3);
  const { rows: impRows, cols: impCols } = isSplitFold
    ? { rows: 1, cols: 2 }
    : getImpositionGrid(copiesPerPage, isLand);

  // 迁移所有题目为规范格式
  const migratedItems = rawWords.map(w => migrateDraftItem(w, s.dictMode));

  // 计算每份试卷的最大可用物理高度与宽度 (mm)
  const pageMargin = Number(s.pageMargin || 8);
  const pageMarginHorizontal = Number(s.pageMarginHorizontal ?? 12);
  const foldSeamMm = isSplitFold ? 16 : 0;
  const netPageHeightMm = pageHeightMm - (pageMargin * 2);
  const netPageWidthMm = pageWidthMm - (pageMarginHorizontal * 2);

  const dividerHeightMm = (!isSplitFold && impRows > 1) ? (impRows - 1) * 2.5 : 0;
  const dividerWidthMm = (!isSplitFold && impCols > 1) ? (impCols - 1) * 2.5 : 0;

  const copyHeightMm = isSplitFold
    ? netPageHeightMm
    : (netPageHeightMm - dividerHeightMm) / impRows;
  const copyWidthMm = isSplitFold
    ? Math.max(40, (netPageWidthMm - foldSeamMm) / 2)
    : Math.max(40, (netPageWidthMm - dividerWidthMm) / impCols);

  const isMiniCopy = (copiesPerPage >= 4) || (copyHeightMm < 110);
  const headerHeightMm = isSplitFold ? 16 : (isMiniCopy ? 11 : ((copiesPerPage > 1) ? 14 : 22));
  const copyPaddingMm = isSplitFold ? 4 : (isMiniCopy ? 2 : ((copiesPerPage > 1) ? 3 : 8));
  const maxAvailableHeightMm = Math.max(25, copyHeightMm - headerHeightMm - copyPaddingMm + 1.5);

  const effectiveRowGap = (!isSplitFold && copiesPerPage > 1)
    ? getEffectiveRowGap(s, copiesPerPage, !!s._teacherMode)
    : (Number(s.rowGap) || 3.5);

  const gridUnits = 60;
  const contentWidthMm = copyWidthMm;

  // 严格基于 subType/alphaData 识别字母全默写题目
  const isSeqItem = (it) => Boolean(it && (it.subType === 'sequence' || it.alphabetType === 'sequence' || it.alphaData));

  // 若整份试卷仅由 26 个字母全默写构成，直接返回单页完整排版（遵循设定的联数与单联尺寸）
  if (migratedItems.length === 26 && migratedItems.every(isSeqItem)) {
    return {
      paperDim: pDim,
      isLandscape: isLand,
      isSplitFold: Boolean(s.splitFold && isLand),
      impRows,
      impCols,
      copyWidthMm,
      copyHeightMm,
      pageWidthMm,
      pageHeightMm,
      wordsPerPage: 26,
      capacity: 26,
      copiesPerPage,
      totalPages: 1,
      pageCount: 1,
      totalItems: 26,
      gridUnits,
      contentWidthMm,
      layoutDefaults: s.layoutDefaults,
      pageChunks: [{ pageIndex: 0, items: migratedItems.map((item, i) => ({ overallIndex: i + 1, item, isFullWidth: true, gridSpan: 60 })), isAlpha26: true }],
      pages: [{ pageIndex: 0, items: migratedItems.map((item, i) => ({ overallIndex: i + 1, item, isFullWidth: true, gridSpan: 60 })), isAlpha26: true }]
    };
  }

  // 将题目流切分为“普通流式区段”与“26 字母全默写独立区段”
  const segments = [];
  let curIndex = 0;
  while (curIndex < migratedItems.length) {
    if (
      curIndex <= migratedItems.length - 26 &&
      migratedItems.slice(curIndex, curIndex + 26).every(isSeqItem)
    ) {
      segments.push({
        type: 'sequence26',
        items: migratedItems.slice(curIndex, curIndex + 26)
      });
      curIndex += 26;
    } else if (isSeqItem(migratedItems[curIndex])) {
      const seqItems = [];
      while (curIndex < migratedItems.length && isSeqItem(migratedItems[curIndex])) {
        seqItems.push(migratedItems[curIndex]);
        curIndex++;
      }
      segments.push({
        type: 'sequence26',
        items: seqItems
      });
    } else {
      const flowItems = [];
      while (curIndex < migratedItems.length) {
        if (isSeqItem(migratedItems[curIndex])) {
          break;
        }
        flowItems.push(migratedItems[curIndex]);
        curIndex++;
      }
      if (flowItems.length > 0) {
        segments.push({
          type: 'flow',
          items: flowItems
        });
      }
    }
  }

  const pageChunks = [];
  let displaySeq = 0;
  let activeSectionColumns = null;
  const userCapacity = Math.max(3, parseInt(s.wordsPerPage, 10) || 9);

  // 测算所有题目是否可在单页完整容纳（若可容纳，则优先单页并存排版）
  const canFitAllInSinglePage = (() => {
    let testUsed = 0;
    let testOccupied = 0;
    let testRowMax = 0;
    let secCols = null;

    for (const seg of segments) {
      if (seg.type === 'sequence26') {
        const rowMode = (seg.items[0]?.alphaData?.rowMode === 4 || s.alphabet26Rows === 4) ? 4 : 3;
        const alphaBaseH = getEffectiveGridHeight(s, copiesPerPage);
        const effGridH = (rowMode === 4)
          ? ((copiesPerPage > 1) ? Math.round(alphaBaseH * (9.5 / 11) * 10) / 10 : Math.round(alphaBaseH * (14 / 12) * 10) / 10)
          : ((copiesPerPage > 1) ? alphaBaseH : Math.round(alphaBaseH * (18 / 12) * 10) / 10);
        const pSize = Number(s.promptFontSize) || 14;
        const topHMm = Math.max(5.5, pSize * 0.45);
        const rHeightMm = effGridH + topHMm;
        const blockHMm = (rHeightMm * rowMode) + ((rowMode - 1) * effectiveRowGap * 1.5) + effectiveRowGap + 2;

        if (testOccupied > 0) {
          testUsed += testRowMax + effectiveRowGap;
          testOccupied = 0;
          testRowMax = 0;
        }
        testUsed += blockHMm + effectiveRowGap;
        if (testUsed > maxAvailableHeightMm) return false;
      } else if (seg.type === 'flow') {
        for (const item of seg.items) {
          if (item.questionType === 'separator' && item.sectionColumns) {
            secCols = Number(item.sectionColumns);
          }
          const isSep = item.questionType === 'separator';
          const isComp = item.questionType === 'english-composition';
          const isExplicitFull = item.layoutHint === 'full-width';
          let cols = 1;
          if (isSep || isComp || isExplicitFull) {
            cols = 1;
          } else {
            const override = Number(item?.layout?.columns);
            if ([1, 2, 3, 4, 5].includes(override)) {
              cols = override;
            } else if (secCols) {
              cols = secCols;
            } else {
              cols = resolveQuestionColumns(item, s);
            }
          }
          const isFull = (cols <= 1) || isSep || isComp || isExplicitFull || shouldUseFullRow(item, s, contentWidthMm);
          const span = isFull ? gridUnits : Math.max(1, Math.round(gridUnits / cols));
          const itemW = isFull ? contentWidthMm : Math.max(30, (contentWidthMm - (cols - 1) * (s.colGap || 6)) / cols);
          const itemH = estimateQuestionHeightMm(item, { ...s, _availableItemWidthMm: itemW }, copiesPerPage);

          if (testOccupied > 0 && testOccupied + span > gridUnits) {
            testUsed += testRowMax + effectiveRowGap;
            testOccupied = 0;
            testRowMax = 0;
          }
          testOccupied += span;
          testRowMax = Math.max(testRowMax, itemH);
          if (testUsed + testRowMax > maxAvailableHeightMm) return false;
          if (testOccupied >= gridUnits) {
            testUsed += testRowMax + effectiveRowGap;
            testOccupied = 0;
            testRowMax = 0;
          }
        }
      }
    }
    return true;
  })();

  let currentPageItems = [];
  let currentUsedHeightMm = 0;
  let currentGridOccupied = 0;
  let currentRowMaxHeightMm = 0;

  function simulatePlacement(span, itemHeightMm) {
    let used = currentUsedHeightMm;
    let occupied = currentGridOccupied;
    let rowMax = currentRowMaxHeightMm;
    if (occupied > 0 && occupied + span > gridUnits) {
      used += rowMax + effectiveRowGap;
      occupied = 0;
      rowMax = 0;
    }
    occupied += span;
    rowMax = Math.max(rowMax, itemHeightMm);
    const total = used + rowMax;
    let nextUsed = used;
    let nextOccupied = occupied;
    let nextRowMax = rowMax;
    if (occupied >= gridUnits) {
      nextUsed = used + rowMax + effectiveRowGap;
      nextOccupied = 0;
      nextRowMax = 0;
    }
    return {
      used: nextUsed,
      occupied: nextOccupied,
      rowMax: nextRowMax,
      total
    };
  }

  for (const segment of segments) {
    if (segment.type === 'sequence26') {
      const rowMode = (segment.items[0]?.alphaData?.rowMode === 4 || s.alphabet26Rows === 4) ? 4 : 3;
      const alphaBaseH = getEffectiveGridHeight(s, copiesPerPage);
      const effGridH = (rowMode === 4)
        ? ((copiesPerPage > 1) ? Math.round(alphaBaseH * (9.5 / 11) * 10) / 10 : Math.round(alphaBaseH * (14 / 12) * 10) / 10)
        : ((copiesPerPage > 1) ? alphaBaseH : Math.round(alphaBaseH * (18 / 12) * 10) / 10);
      const pSize = Number(s.promptFontSize) || 14;
      const topHMm = Math.max(5.5, pSize * 0.45);
      const rHeightMm = effGridH + topHMm;
      const seqBlockHeightMm = (rHeightMm * rowMode) + ((rowMode - 1) * effectiveRowGap * 1.5) + effectiveRowGap + 2;

      let usedBefore = currentUsedHeightMm + (currentGridOccupied > 0 ? (currentRowMaxHeightMm + effectiveRowGap) : 0);
      if (currentPageItems.length > 0 && (usedBefore + seqBlockHeightMm > maxAvailableHeightMm)) {
        pageChunks.push({
          pageIndex: pageChunks.length,
          items: currentPageItems
        });
        currentPageItems = [];
        currentUsedHeightMm = 0;
        currentGridOccupied = 0;
        currentRowMaxHeightMm = 0;
      } else if (currentGridOccupied > 0) {
        currentUsedHeightMm += currentRowMaxHeightMm + effectiveRowGap;
        currentGridOccupied = 0;
        currentRowMaxHeightMm = 0;
      }

      const seqChunkItems = segment.items.map((item) => {
        const isSep = item.questionType === 'separator';
        const displayIndex = isSep ? null : ++displaySeq;
        return {
          overallIndex: displayIndex ?? (displaySeq + 1),
          displayIndex,
          item,
          isFullWidth: true,
          gridSpan: gridUnits
        };
      });
      currentPageItems.push(...seqChunkItems);
      currentUsedHeightMm += seqBlockHeightMm + effectiveRowGap;
      currentGridOccupied = 0;
      currentRowMaxHeightMm = 0;
    } else if (segment.type === 'flow') {
      const expandedItems = [];
      segment.items.forEach((item, idx) => {
        const isSep = item.questionType === 'separator';
        const displayIndex = isSep ? null : ++displaySeq;
        if (item.questionType !== 'english-composition') {
          expandedItems.push({ item, originalIndex: idx, displayIndex });
          return;
        }
        const perLineMm = item.lineHeight + 1.2;
        const maxLinesPerPage = Math.max(3, Math.floor((maxAvailableHeightMm - 14) / perLineMm));
        if (item.lineCount <= maxLinesPerPage) {
          expandedItems.push({ item, originalIndex: idx, displayIndex });
          return;
        }
        let remaining = item.lineCount;
        let startLine = 1;
        let part = 1;
        while (remaining > 0) {
          const fragmentLineCount = Math.min(maxLinesPerPage, remaining);
          expandedItems.push({
            originalIndex: idx,
            displayIndex,
            item: migrateDraftItem({
              ...item,
              id: `${item.id}-part-${part}`,
              compositionFragment: {
                sourceId: item.id,
                part,
                startLine,
                lineCount: fragmentLineCount,
                isContinuation: part > 1
              }
            })
          });
          remaining -= fragmentLineCount;
          startLine += fragmentLineCount;
          part += 1;
        }
      });

      expandedItems.forEach(({ item, originalIndex, displayIndex }) => {
        if (item.questionType === 'separator') {
          if (item.sectionColumns) {
            activeSectionColumns = Number(item.sectionColumns);
          }
        }

        const isSep = item.questionType === 'separator';
        const isComposition = item.questionType === 'english-composition';
        const isExplicitFullWidth = item.layoutHint === 'full-width';

        let requestedColumns = 1;
        if (isSep || isComposition || isExplicitFullWidth) {
          requestedColumns = 1;
        } else {
          const override = Number(item?.layout?.columns);
          if ([1, 2, 3, 4, 5].includes(override)) {
            requestedColumns = override;
          } else if (activeSectionColumns) {
            requestedColumns = activeSectionColumns;
          } else {
            requestedColumns = resolveQuestionColumns(item, s);
          }
        }

        const isFullWidth = (requestedColumns <= 1) || isSep || isComposition || isExplicitFullWidth || shouldUseFullRow(item, s, contentWidthMm);
        const gridSpan = isFullWidth ? gridUnits : Math.max(1, Math.round(gridUnits / requestedColumns));
        const availableItemWidthMm = isFullWidth
          ? contentWidthMm
          : Math.max(30, (contentWidthMm - (requestedColumns - 1) * (s.colGap || 6)) / requestedColumns);
        const itemHeightMm = estimateQuestionHeightMm(item, { ...s, _availableItemWidthMm: availableItemWidthMm }, copiesPerPage);
        let placement = simulatePlacement(gridSpan, itemHeightMm);
        const exceedsHeight = currentPageItems.length > 0 && placement.total > maxAvailableHeightMm;
        const exceedsCapacity = !canFitAllInSinglePage && (currentPageItems.length >= userCapacity);

        if (exceedsHeight || exceedsCapacity) {
          pageChunks.push({ pageIndex: pageChunks.length, items: currentPageItems });
          currentPageItems = [];
          currentUsedHeightMm = 0;
          currentGridOccupied = 0;
          currentRowMaxHeightMm = 0;
          placement = simulatePlacement(gridSpan, itemHeightMm);
        }

        currentPageItems.push({
          overallIndex: displayIndex ?? (originalIndex + 1),
          displayIndex,
          item,
          isFullWidth,
          gridSpan,
          resolvedColumns: isFullWidth ? 1 : requestedColumns,
          availableWidthMm: availableItemWidthMm,
          estimatedHeightMm: itemHeightMm
        });
        currentUsedHeightMm = placement.used;
        currentGridOccupied = placement.occupied;
        currentRowMaxHeightMm = placement.rowMax;
      });
    }
  }

  if (currentPageItems.length > 0) {
    pageChunks.push({
      pageIndex: pageChunks.length,
      items: currentPageItems
    });
  }

  const isSeqEntry = (entry) => {
    const it = entry?.item;
    return Boolean(it && (it.subType === 'sequence' || it.alphabetType === 'sequence' || it.alphaData));
  };
  pageChunks.forEach((chunk, pIdx) => {
    chunk.pageIndex = pIdx;
    if (chunk.items.length === 26 && chunk.items.every(isSeqEntry)) {
      chunk.isAlpha26 = true;
    }
  });

  if (pageChunks.length === 0) {
    pageChunks.push({
      pageIndex: 0,
      items: []
    });
  }

  const physicalPages = isSplitFold ? Math.max(1, Math.ceil(pageChunks.length / 2)) : pageChunks.length;

  return {
    paperDim: pDim,
    isLandscape: isLand,
    isSplitFold,
    impRows,
    impCols,
    copyWidthMm,
    copyHeightMm,
    pageWidthMm,
    pageHeightMm,
    wordsPerPage: userCapacity,
    capacity: userCapacity,
    copiesPerPage,
    totalPages: physicalPages,
    pageCount: physicalPages,
    totalHalfPages: pageChunks.length,
    totalItems: migratedItems.length,
    gridUnits,
    contentWidthMm,
    layoutDefaults: s.layoutDefaults,
    pageChunks,
    pages: pageChunks
  };
}

function createInlineGridHtml(widthPx, s, answerText = '', gridHeightMm = null) {
  const teacherAnswer = answerText
    ? `<span class="teacher-inline-answer">${escapeHtml(answerText)}</span>`
    : '';
  const heightStyle = gridHeightMm ? `height:${gridHeightMm}mm;` : 'height:var(--grid-height, 1.75em);';
  return `<span class="cloze-blank-line cloze-inline-grid" style="width:${Math.round(widthPx)}px; ${heightStyle}">
    <svg viewBox="0 0 100 25" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" y1="2.0" x2="100" y2="2.0" stroke="${s.gridColor || '#cbd5e1'}" stroke-width="${s.gridStroke || 0.85}" />
      <line x1="0" y1="8.5" x2="100" y2="8.5" stroke="${s.gridColor || '#cbd5e1'}" stroke-width="${s.gridStroke || 0.85}" />
      <line x1="0" y1="16.5" x2="100" y2="16.5" stroke="#94a3b8" stroke-width="${(s.gridStroke || 0.85) * 1.1}" />
      <line x1="0" y1="23.0" x2="100" y2="23.0" stroke="${s.gridColor || '#cbd5e1'}" stroke-width="${s.gridStroke || 0.85}" />
      <line x1="0" y1="2.0" x2="0" y2="23.0" stroke="${s.gridColor || '#cbd5e1'}" stroke-width="${s.gridStroke || 0.85}" />
      <line x1="100" y1="2.0" x2="100" y2="23.0" stroke="${s.gridColor || '#cbd5e1'}" stroke-width="${s.gridStroke || 0.85}" />
    </svg>${teacherAnswer}
  </span>`;
}

function createTeacherQuestionAnswerHtml(questionHtml, answerText) {
  const answerHtml = answerText
    ? `<span class="teacher-answer-text"><span class="teacher-answer-label">答案：</span><span class="teacher-answer-value">${escapeHtml(answerText)}</span></span>`
    : '';
  return `<div class="teacher-question-answer"><div class="teacher-question-text">${questionHtml}</div>${answerHtml}</div>`;
}

function makeQuestionRenderContext(s, copies, effectivePromptSize, entry, teacherMode) {
  const effectiveGridHeight = getEffectiveGridHeight(s, copies);
  const availableWidthPx = Math.max(48, (entry.availableWidthMm || 180) * 3.7795275591);
  const fontSizePx = (Number(effectivePromptSize) || 14) * 1.333333;
  const standardEnglishFont = "'Times New Roman', Times, serif";
  const measurementOptions = {
    fontFamily: standardEnglishFont,
    fontSize: fontSizePx,
    letterSpacing: parseFloat(s.letterSpacing) || 0,
    availableWidth: availableWidthPx,
    minWidth: 48,
    maxWidth: availableWidthPx,
    scale: 1.5
  };

  return {
    settings: s,
    copies,
    effectiveGridHeight,
    effectivePromptSize,
    availableWidthPx,
    teacherMode,
    renderWordDictation(item) {
      const promptText = stripOuterBrackets(item.overrideZh || item.zh || ((item.prompt && item.prompt !== (item.answer || item.en)) ? item.prompt : '听写'));
      if (teacherMode) {
        return {
          promptHtml: createTeacherQuestionAnswerHtml(escapeHtml(promptText), item.answer || item.en || ''),
          practiceHtml: '',
          classes: ['is-word-card', 'is-teacher-answer-card']
        };
      }
      const measurement = calculateWritingGridWidth({ ...measurementOptions, text: item.answer || item.en || '' });
      const lines = Math.max(1, Math.min(4, Math.ceil(measurement.targetWidth / Math.max(1, availableWidthPx))));
      return {
        promptHtml: `<span class="meaning-text entry-zh-hint">${escapeHtml(promptText)}</span>`,
        practiceHtml: `<div class="adaptive-writing-grid word-dictation-grid">${createPracticeGridSvg({ gridStyle: s.gridStyle, gridLines: lines, gridHeightMm: effectiveGridHeight, strokeWidth: s.gridStroke || 0.85, lineColor: s.gridColor || '#cbd5e1', showVertical: s.showVerticalBorder })}</div>`,
        classes: ['is-word-card']
      };
    },
    renderSentenceDictation(item) {
      const promptText = stripOuterBrackets(item.overrideZh || item.zh || ((item.prompt && item.prompt !== (item.answer || item.en)) ? item.prompt : '请写出英文句子'));
      if (teacherMode) {
        return {
          promptHtml: createTeacherQuestionAnswerHtml(escapeHtml(promptText), item.answer || item.en || ''),
          practiceHtml: '',
          classes: ['is-sentence-dict-card', 'is-teacher-answer-card']
        };
      }
      const measurement = calculateWritingGridWidth({ ...measurementOptions, text: item.answer || item.en || '' });
      const lines = Math.max(1, Math.min(4, Math.ceil(measurement.targetWidth / Math.max(1, availableWidthPx))));
      return {
        promptHtml: `<span class="meaning-text entry-zh-hint sentence-dict-prompt">${escapeHtml(promptText)}</span>`,
        practiceHtml: createPracticeGridSvg({ gridStyle: s.gridStyle, gridLines: lines, gridHeightMm: effectiveGridHeight, strokeWidth: s.gridStroke || 0.85, lineColor: s.gridColor || '#cbd5e1', showVertical: s.showVerticalBorder }),
        classes: ['is-sentence-dict-card']
      };
    },
    renderSentenceCloze(item) {
      const zhText = stripOuterBrackets(item.overrideZh || item.zh || item.translation || '');
      if (teacherMode) {
        const questionText = (item.en || '').replace(/\[[^\]]+\]|\{[^}]+\}/g, '_____');
        const questionHtml = `<span class="teacher-question-english">${escapeHtml(questionText)}</span>${zhText ? `<span class="teacher-question-zh"> ${escapeHtml(zhText)}</span>` : ''}`;
        return {
          promptHtml: createTeacherQuestionAnswerHtml(questionHtml, (item.en || '').replace(/[\[\]{}]/g, '')),
          practiceHtml: '',
          classes: ['is-cloze-card', 'is-teacher-answer-card']
        };
      }
      const clozeHtml = formatClozePrompt(item, 'cloze', {
        gridStyle: s.gridStyle,
        clozeStyle: s.clozeStyle || 'inline',
        clozeZhPosition: s.clozeZhPosition || 'above',
        clozeBlankWidth: s.clozeBlankWidth || 'auto',
        strokeWidth: s.gridStroke || 0.85,
        lineColor: s.gridColor || '#cbd5e1',
        fontFamily: s.fontFamilyEn || 'Arial, sans-serif',
        fontSize: fontSizePx,
        letterSpacing: parseFloat(s.letterSpacing) || 0,
        availableWidth: Math.max(48, availableWidthPx * 0.72),
        gridHeightMm: effectiveGridHeight
      });
      const isInline = (s.clozeStyle || 'inline') !== 'below';
      return {
        promptHtml: clozeHtml,
        practiceHtml: isInline ? '' : createPracticeGridSvg({ gridStyle: s.gridStyle, gridLines: s.gridLinesPerWord || 1, gridHeightMm: effectiveGridHeight, strokeWidth: s.gridStroke || 0.85, lineColor: s.gridColor || '#cbd5e1', showVertical: s.showVerticalBorder }),
        classes: ['is-cloze-card', isInline ? 'cloze-card-inline' : '']
      };
    },
    renderAlphabet(item) {
      const subType = item.subType || item.alphabetType || (item.neighborData ? 'neighbor' : (item.caseData ? 'case' : 'sequence'));
      const promptText = item.prompt || item.zh || item.en;
      if (teacherMode) {
        return {
          promptHtml: createTeacherQuestionAnswerHtml(`<span class="alphabet-prompt-text" style="font-family:'Xumin Regular', 'xumin', cursive;">${escapeHtml(promptText)}</span>`, item.answer || item.en || ''),
          practiceHtml: '',
          classes: ['is-alphabet-card', `subtype-${subType}`, 'is-teacher-answer-card']
        };
      }
      let gridHtml = '';
      if (subType === 'neighbor' || item.neighborData || item.id?.startsWith('neighbor') || (item.zh && item.zh.includes('邻居'))) {
        gridHtml = createNeighborPracticeGridSvg(item, { gridHeightMm: effectiveGridHeight, strokeWidth: s.gridStroke || 0.85, lineColor: s.gridColor || '#cbd5e1', alphabetGuideFont: s.alphabetGuideFont });
      } else if (subType === 'case' || item.caseData || item.id?.startsWith('case')) {
        gridHtml = createCasePracticeGridSvg(item, { gridHeightMm: effectiveGridHeight, strokeWidth: s.gridStroke || 0.85, lineColor: s.gridColor || '#cbd5e1', alphabetGuideFont: s.alphabetGuideFont, isTeacher: !!s._teacherMode });
      } else if (subType === 'sequence' || item.alphaData) {
        const aData = item.alphaData || {};
        const guideChar = aData.targetEn || item.en || '';
        gridHtml = createSingleAlphabetGridSvg({
          gridHeightMm: effectiveGridHeight,
          strokeWidth: s.gridStroke || 0.85,
          lineColor: s.gridColor || '#cbd5e1',
          guideText: s._teacherMode ? guideChar : '',
          alphabetGuideFont: s.alphabetGuideFont
        });
      } else {
        gridHtml = createPracticeGridSvg({ gridStyle: s.gridStyle, gridLines: s.gridLinesPerWord || 1, gridHeightMm: effectiveGridHeight, strokeWidth: s.gridStroke || 0.85, lineColor: s.gridColor || '#cbd5e1', showVertical: s.showVerticalBorder });
      }
      const isHorizontalGrid = (subType === 'case') || ((subType !== 'sequence') && (
        (item.layout?.gridPosition === 'right') ||
        (item.caseData?.layoutStyle === 'right-2col') ||
        (item.caseData?.layoutStyle === 'right-4col') ||
        (item.neighborData?.layoutStyle === 'right-2col') ||
        (!item.layout?.gridPosition && s.alphabetLayout === 'right-2col' && item.layout?.gridPosition !== 'below')
      ));
      return {
        promptHtml: `<span class="meaning-text entry-zh-hint alphabet-prompt-text" style="font-family:'Xumin Regular', 'xumin', cursive;">${escapeHtml(promptText)}</span>`,
        practiceHtml: gridHtml,
        classes: ['is-alphabet-card', `subtype-${subType}`, isHorizontalGrid ? 'meaning-left' : '']
      };
    },
    renderChoice(item) {
      const maxOptLen = Math.max(0, ...item.options.map((option) => (option.text || '').length));
      let optionLayout = item.optionLayout;
      if (optionLayout === 'auto') {
        if (item.options.length === 3) {
          // ABC 三个选项，字数较少时无论单行排 1 题还是 2 题，均在 1 行内分 3 列显示
          optionLayout = maxOptLen <= 18 ? 'three' : 'single';
        } else if (item.options.length === 4) {
          optionLayout = maxOptLen > 14 ? 'single' : 'double';
        } else if (item.options.length === 2) {
          optionLayout = maxOptLen <= 18 ? 'double' : 'single';
        } else {
          optionLayout = maxOptLen > 16 ? 'single' : 'double';
        }
      } else if (optionLayout === 'inline' && item.options.length === 3) {
        optionLayout = 'three';
      }

      // 去除题干开头可能已有的空括号，统一在题号后呈现标准填写答案括号
      const cleanStem = (item.stem || '').replace(/^\s*[\(（]\s*[\)）]\s*/, '').trim();
      const bracketHtml = '<span class="choice-bracket">（&nbsp;&nbsp;&nbsp;）</span>';

      if (teacherMode) {
        const answerText = item.options
          .filter((option) => item.answers.includes(option.id))
          .map((option) => `${option.label}. ${option.text}`)
          .join('；');
        const answerLabels = item.options
          .filter((option) => item.answers.includes(option.id))
          .map((option) => option.label)
          .join('');
        const teacherBracketHtml = answerLabels
          ? `<span class="choice-bracket teacher-bracket">（ <strong style="color:var(--primary, #2f6659);">${escapeHtml(answerLabels)}</strong> ）</span>`
          : '<span class="choice-bracket">（&nbsp;&nbsp;&nbsp;）</span>';
        return {
          promptHtml: createTeacherQuestionAnswerHtml(`<span class="teacher-question-english">${teacherBracketHtml}${escapeHtml(cleanStem)}</span>`, answerText),
          practiceHtml: '',
          classes: ['is-choice-card', 'is-teacher-answer-card']
        };
      }
      const options = item.options.map((option) => {
        return `<span class="choice-option"><span class="choice-label">${escapeHtml(option.label)}.</span><span>${escapeHtml(option.text)}</span></span>`;
      }).join('');
      return {
        promptHtml: `${bracketHtml}<span class="choice-stem question-english-content">${escapeHtml(cleanStem)}</span>`,
        practiceHtml: `<div class="choice-options layout-${optionLayout}">${options}</div>`,
        classes: ['is-choice-card']
      };
    },
    renderInlineFill(item) {
      const blankMap = new Map(item.blanks.map((blank) => [blank.id, blank]));
      if (teacherMode) {
        const questionSegments = item.stemSegments.map((segment) => segment.type === 'text'
          ? escapeHtml(segment.text)
          : '<span class="teacher-inline-blank">______</span>').join('');
        const answerText = item.blanks.map((blank, index) => `${index + 1}. ${blank.answer || '未设置'}`).join('；');
        return {
          promptHtml: createTeacherQuestionAnswerHtml(`<span class="teacher-question-english">${questionSegments}</span>`, answerText),
          practiceHtml: '',
          classes: ['is-inline-fill-card', 'is-teacher-answer-card']
        };
      }
      const segments = item.stemSegments.map((segment) => {
        if (segment.type === 'text') return escapeHtml(segment.text);
        const blank = blankMap.get(segment.blankId);
        if (!blank) return '';
        const measurement = blank.widthMode === 'manual'
          ? { width: Math.min(availableWidthPx, blank.width) }
          : calculateWritingGridWidth({ ...measurementOptions, text: blank.answer || '' });
        if (blank.lineStyle === 'four-line') return createInlineGridHtml(measurement.width, s, '', effectiveGridHeight);
        return `<span class="inline-fill-blank" style="width:${Math.round(measurement.width)}px;"></span>`;
      }).join('');
      const zhHtml = item.zh ? `<span class="inline-fill-zh-hint" style="margin-left:6px;">（${escapeHtml(item.zh)}）</span>` : '';
      return { promptHtml: `<span class="inline-fill-stem question-english-content">${segments}</span>${zhHtml}`, practiceHtml: '', classes: ['is-inline-fill-card'] };
    },
    renderComposition(item) {
      const fragment = item.compositionFragment;
      const lineCount = fragment?.lineCount || item.lineCount;
      const continuation = item.title;
      const heading = item.showTitleArea ? `<div class="composition-heading"><strong>${escapeHtml(continuation || '英语作文')}</strong>${fragment ? `<span class="composition-part">第 ${fragment.part} 页</span>` : ''}</div>` : '';
      const instructions = !fragment?.isContinuation && item.instructions ? `<div class="composition-instructions">${escapeHtml(item.instructions)}</div>` : '';
      if (teacherMode) {
        return {
          promptHtml: createTeacherQuestionAnswerHtml(`<span class="teacher-question-english">${heading}${instructions}</span>`, '开放性作答'),
          practiceHtml: '',
          classes: ['is-composition-card', 'is-teacher-answer-card']
        };
      }
      return {
        promptHtml: `${heading}${instructions}`,
        practiceHtml: `<div class="composition-lines">${createPracticeGridSvg({ gridStyle: item.writingStyle === 'four-line' ? 'four-line' : 'single-line', gridLines: lineCount, gridHeightMm: item.lineHeight, strokeWidth: s.gridStroke || 0.85, lineColor: s.gridColor || '#cbd5e1', showVertical: item.writingStyle === 'four-line' && s.showVerticalBorder })}</div>`,
        classes: ['is-composition-card']
      };
    },
    renderSeparator(item) {
      const title = (item.title || item.text || '').trim();
      const colText = item.sectionColumns ? `<span class="separator-col-note">（本区每行 ${item.sectionColumns} 题）</span>` : '';
      return {
        promptHtml: `
          <div class="separator-bar">
            <span class="separator-line"></span>
            ${title ? `<span class="separator-title">${escapeHtml(title)}${colText}</span>` : ''}
            <span class="separator-line"></span>
          </div>
        `,
        practiceHtml: '',
        classes: ['is-separator-card', 'is-full-width']
      };
    }
  };
}

// 渲染 26 字母全默写网格行 (3行或4行，末尾补齐★)
export function renderAlpha26GridRows(seqItems, s, copies, effectivePromptSize) {
  const rowMode = (seqItems[0]?.item?.alphaData?.rowMode === 4 || seqItems[0]?.alphaData?.rowMode === 4 || s.alphabet26Rows === 4) ? 4 : 3;
  const alphaBaseH = getEffectiveGridHeight(s, copies);
  const effectiveGridHeight = (rowMode === 4)
    ? ((copies > 1) ? Math.round(alphaBaseH * (9.5 / 11) * 10) / 10 : Math.round(alphaBaseH * (14 / 12) * 10) / 10)
    : ((copies > 1) ? alphaBaseH : Math.round(alphaBaseH * (18 / 12) * 10) / 10);

  const rows = (rowMode === 4)
    ? [
        seqItems.slice(0, 7),
        seqItems.slice(7, 14),
        seqItems.slice(14, 21),
        seqItems.slice(21, 26)
      ]
    : [
        seqItems.slice(0, 9),
        seqItems.slice(9, 18),
        seqItems.slice(18, 26)
      ];

  let alpha26RowsHtml = '';
  rows.forEach((rowItems, rIdx) => {
    let cellsHtml = '';
    rowItems.forEach((entry) => {
      const item = entry.item || entry;
      const overallIndex = entry.overallIndex || '';
      const safeCardId = escapeHtml(item.id);
      const aData = item.alphaData || {};
      const guideChar = aData.targetEn || item.en || '';
      const cellLabel = (aData.caseStyle === 'upper')
        ? (aData.upper || '')
        : (aData.caseStyle === 'lower' ? (aData.lower || '') : `${aData.upper || ''}${aData.lower || ''}`);

      cellsHtml += `
        <div class="word-card alpha-26-cell" data-id="${safeCardId}" data-debug-id="ITEM-${safeCardId}" data-debug-name="字母格 #${overallIndex} (${escapeHtml(cellLabel)})" data-debug-component="PracticeGridSvg" data-debug-file="src/core/layout.js">
          <div class="alpha-cell-top" style="font-size:${effectivePromptSize}pt;">
            <span class="word-num entry-index">${overallIndex ? `${overallIndex}.` : ''}</span>
          </div>
          <div class="alpha-cell-grid">
            ${createSingleAlphabetGridSvg({
              gridHeightMm: effectiveGridHeight,
              strokeWidth: s.gridStroke || 0.85,
              lineColor: s.gridColor || '#cbd5e1',
              guideText: s._teacherMode ? guideChar : '',
              alphabetGuideFont: s.alphabetGuideFont
            })}
          </div>
        </div>
      `;
    });

    if (rowMode === 4 && rIdx === 3) {
      for (let d = 0; d < 2; d++) {
        cellsHtml += `
          <div class="alpha-26-cell alpha-dummy-cell">
            <div class="alpha-cell-top" style="font-size:${effectivePromptSize}pt;">
              <span class="alpha-dummy-star">★</span>
            </div>
            <div class="alpha-cell-grid">
              ${createSingleAlphabetGridSvg({
                gridHeightMm: effectiveGridHeight,
                strokeWidth: s.gridStroke || 0.85,
                lineColor: s.gridColor || '#cbd5e1',
                alphabetGuideFont: s.alphabetGuideFont
              })}
            </div>
          </div>
        `;
      }
    } else if (rowMode === 3 && rIdx === 2) {
      cellsHtml += `
        <div class="alpha-26-cell alpha-dummy-cell">
          <div class="alpha-cell-top" style="font-size:${effectivePromptSize}pt;">
            <span class="alpha-dummy-star">★</span>
          </div>
          <div class="alpha-cell-grid">
            ${createSingleAlphabetGridSvg({
              gridHeightMm: effectiveGridHeight,
              strokeWidth: s.gridStroke || 0.85,
              lineColor: s.gridColor || '#cbd5e1',
              alphabetGuideFont: s.alphabetGuideFont
            })}
          </div>
        </div>
      `;
    }

    alpha26RowsHtml += `
      <div class="alpha-26-grid-row">
        ${cellsHtml}
      </div>
    `;
  });
  return alpha26RowsHtml;
}

// 单联 HTML 生成 (纯函数，支持混合题型精准渲染)
export function renderCopySlipHtml(chunk, pageIdx, copyIdx, s, effectivePromptSize) {
  const copies = Math.max(1, parseInt(s.copiesPerPage, 10) || 1);
  const effectiveRowGap = getEffectiveRowGap(s, copies, !!s._teacherMode);
  const isSeqEntry = (entry) => {
    const it = entry?.item;
    return Boolean(it && (it.subType === 'sequence' || it.alphabetType === 'sequence' || it.alphaData));
  };
  const isAlpha26Only = chunk.isAlpha26 || (chunk.items.length === 26 && chunk.items.every(isSeqEntry));

  let cardsHtml = '';
  let alpha26RowsHtml = '';

  if (isAlpha26Only) {
    alpha26RowsHtml = renderAlpha26GridRows(chunk.items, s, copies, effectivePromptSize);
  } else {
    let idx = 0;
    while (idx < chunk.items.length) {
      const entry = chunk.items[idx];
      if (isSeqEntry(entry)) {
        const seqGroup = [];
        while (idx < chunk.items.length && isSeqEntry(chunk.items[idx])) {
          seqGroup.push(chunk.items[idx]);
          idx++;
        }
        const blockHtml = renderAlpha26GridRows(seqGroup, s, copies, effectivePromptSize);
        cardsHtml += `
          <div class="alphabet-26-section-block" style="grid-column: 1 / -1; width: 100%;">
            <div class="alphabet-26-sheet-container" style="gap: ${effectiveRowGap * 1.5}mm; margin-top: 1mm; margin-bottom: 2mm;">
              ${blockHtml}
            </div>
          </div>
        `;
        continue;
      }

      const { overallIndex, item, isFullWidth, gridSpan = 12 } = entry;
      const qType = item.questionType || 'word-dictation';
      const safeCardId = escapeHtml(item.id);
      const safeLetterSpacing = escapeHtml(String(s.letterSpacing || '0').replace(/[^0-9a-zA-Z. -]/g, ''));
      const renderContext = makeQuestionRenderContext(s, copies, effectivePromptSize, entry, !!s._teacherMode);
      const rendered = renderQuestion(item, renderContext, 'print') || {};
      const zhMeaningHtml = rendered.promptHtml || '';
      const practiceGridHtml = rendered.practiceHtml || '';

      const isAlphabet = qType === 'alphabet';
      const subType = isAlphabet ? (item.subType || item.alphabetType || (item.neighborData ? 'neighbor' : (item.caseData ? 'case' : 'sequence'))) : (item.subType || '');
      const isNeighbor = isAlphabet && (subType === 'neighbor' || Boolean(item.neighborData) || (item.zh && item.zh.includes('邻居')));
      const isCase = isAlphabet && (subType === 'case' || Boolean(item.caseData));
      const isSequence = isAlphabet && (subType === 'sequence' || Boolean(item.alphaData));

      const isAlphabetHorizontal = (isNeighbor || isCase || isAlphabet) &&
        (subType !== 'sequence') &&
        (isCase || item.layout?.gridPosition === 'right' || item.caseData?.layoutStyle === 'right-4col' || item.caseData?.layoutStyle === 'right-2col' || item.neighborData?.layoutStyle === 'right-2col' || (!item.layout?.gridPosition && s.alphabetLayout === 'right-2col' && item.layout?.gridPosition !== 'below'));

      const cardClasses = [
        'word-card',
        'word-entry-item',
        `type-${qType}`,
        subType ? `subtype-${subType}` : '',
        ...(rendered.classes || []),
        isNeighbor ? 'is-neighbor-card' : '',
        isCase ? 'is-case-card' : '',
        isSequence ? 'is-sequence-card' : '',
        ((s.zhPosition === 'left' && qType === 'word-dictation') || isAlphabetHorizontal) ? 'meaning-left' : '',
        isFullWidth ? 'is-full-width' : ''
      ].filter(Boolean).join(' ');

      if (qType === 'separator') {
        cardsHtml += `
          <div class="${cardClasses}" data-id="${safeCardId}" data-debug-id="ITEM-${safeCardId}" data-debug-name="分栏隔断" data-debug-component="Separator" data-debug-file="src/core/layout.js" style="grid-column: 1 / -1;">
            ${zhMeaningHtml}
          </div>
        `;
        idx++;
        continue;
      }

      const cardPromptSize = effectivePromptSize;

      cardsHtml += `
        <div class="${cardClasses}" data-id="${safeCardId}" data-debug-id="ITEM-${safeCardId}" data-debug-name="题目 #${overallIndex} (${qType})" data-debug-component="PracticeGrid" data-debug-file="src/core/layout.js" style="letter-spacing:${safeLetterSpacing};grid-column:span ${gridSpan};">
          <div class="meaning word-prompt-row" style="font-size:${cardPromptSize}pt;">
            ${overallIndex ? `<span class="word-num entry-index">${overallIndex}.</span>` : ''}
            ${zhMeaningHtml}
          </div>
          ${practiceGridHtml ? `
            <div class="practice-grid entry-grid-wrap">
              ${practiceGridHtml}
            </div>
          ` : ''}
        </div>
      `;
      idx++;
    }
  }

  // 考生信息栏
  let studentInfoHtml = '';
  const showAnyStudentInfo = s.showStudentName || s.showStudentClass || s.showStudentNo || s.showStudentDate || s.showStudentScore;
  if (!s._teacherMode && showAnyStudentInfo) {
    const infoItems = [];
    if (s.showStudentName) infoItems.push(`<span class="info-item">姓名：<span class="info-line info-line-name"></span></span>`);
    if (s.showStudentClass) infoItems.push(`<span class="info-item">班级：<span class="info-line info-line-class"></span></span>`);
    if (s.showStudentNo) infoItems.push(`<span class="info-item">座号：<span class="info-line info-line-no"></span></span>`);
    if (s.showStudentDate) infoItems.push(`<span class="info-item">日期：<span class="info-line info-line-date"></span></span>`);
    if (s.showStudentScore) infoItems.push(`<span class="info-item">得分：<span class="info-line info-line-score"></span></span>`);

    const compactCls = (copies > 1) ? 'compact-info' : '';
    studentInfoHtml = `
      <div class="sheet-student-info ${compactCls}">
        ${infoItems.join('')}
      </div>
    `;
  }

  // 标题
  const rawTitleSize = s.titleFontSize || '18pt';
  const titleSize = (typeof rawTitleSize === 'number' || !String(rawTitleSize).endsWith('pt')) ? `${rawTitleSize}pt` : rawTitleSize;
  const safeTitleSize = escapeHtml(String(titleSize).replace(/[^0-9a-zA-Z.]/g, ''));
  const safeFontFamily = escapeHtml(s.fontFamilyZh || "'KaiTi', '楷体', STKaiti, serif");
  const safeFontFamilyEn = escapeHtml(s.fontFamilyEn || 'Arial, sans-serif');
  const safeTitleAlign = escapeHtml(s.titleAlign || 'center');

  let headerHtml = '';
  if (s.isContinuationHalf) {
    headerHtml = `
      <div class="sheet-header sheet-header-compact sheet-header-continuation">
        <div class="sheet-header-top-row">
          <h2 class="sheet-title-text" style="font-size:12pt; text-align:${safeTitleAlign}; width:100%; font-family:${safeFontFamily};">
            ${escapeHtml(s.title || '英语练习')}
          </h2>
        </div>
      </div>
    `;
  } else if (copies > 1) {
    headerHtml = `
      <div class="sheet-header sheet-header-compact">
        <div class="sheet-header-top-row">
          <h2 class="sheet-title-text" style="font-size:${safeTitleSize}; text-align:${safeTitleAlign}; width:100%; font-family:${safeFontFamily};">
            ${escapeHtml(s.title || 'Unit 1 黑体词默写')}
          </h2>
        </div>
        ${studentInfoHtml}
      </div>
    `;
  } else {
    headerHtml = `
      <div class="sheet-header">
        <h1 class="sheet-title-text" style="font-size:${safeTitleSize}; text-align:${safeTitleAlign}; font-family:${safeFontFamily};">
          ${escapeHtml(s.title || 'Unit 1 黑体词默写')}
        </h1>
        ${studentInfoHtml}
      </div>
    `;
  }

  // 网格主体
  const effectiveGridHeight = getEffectiveGridHeight(s, copies);
  const effectiveColGap = s._teacherMode ? Math.min(4, s.colGap || 6) : s.colGap;

  const bodyHtml = isAlpha26Only ? `
    <div class="alphabet-26-sheet-container" style="gap: ${effectiveRowGap * 1.5}mm;">
      ${alpha26RowsHtml}
    </div>
  ` : `
    <div class="sheet-body-grid" style="
      grid-template-columns: repeat(60, minmax(0, 1fr));
      column-gap: 0;
      row-gap: ${effectiveRowGap}mm;
      --col-gap: ${effectiveColGap}mm;
    ">
      ${cardsHtml}
    </div>
  `;

  const sectionCls = `${(copies > 1) ? 'multi-copy' : 'single-copy'}${s._teacherMode ? ' teacher-answer-copy' : ''}`;
  return `
    <div class="sheet-copy-section ${sectionCls}" style="--font-en:${safeFontFamilyEn}; --grid-height:${effectiveGridHeight}mm; --row-gap:${effectiveRowGap}mm;">
      ${headerHtml}
      ${bodyHtml}
    </div>
  `;
}

// 试卷完整 HTML 生成引擎 (纯函数)
export function renderPracticeSheetHtml(layout, settings) {
  if (layout.totalItems === 0) {
    return `
      <div class="empty-sheet-placeholder no-print" style="background:#ffffff;padding:48px 32px;border-radius:12px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.06);max-width:440px;margin:60px auto;border:1px solid #e2e8f0;">
        <h3 style="color:#2f6659;margin:0 0 8px 0;font-size:16px;font-weight:700;">试卷等待输入中</h3>
        <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">请在左侧选择题型并点击“添加”，右侧将即时排版生成规范默写纸；支持单词默写、句子挖空与句子默写混合出卷。</p>
      </div>
    `;
  }

  const s = Object.assign({}, DEFAULT_SETTINGS, settings);
  s.layoutDefaults = normalizeLayoutDefaults(settings?.layoutDefaults, settings || {});
  const { copiesPerPage, isLandscape, pageWidthMm, pageHeightMm } = layout;
  const curPromptSize = Number(s.promptFontSize) || 14;
  const safePageFontEn = escapeHtml(s.fontFamilyEn || 'Arial, sans-serif');
  const effectivePromptSize = curPromptSize;

  let pagesHtml = '';
  const pageSets = [{ teacherMode: false, className: 'student-sheet-page' }];
  if (s.showAnswerPage) pageSets.push({ teacherMode: true, className: 'teacher-answer-page' });

  if (layout.isSplitFold) {
    pageSets.forEach((pageSet, setIndex) => {
      const chunks = layout.pageChunks;
      const physicalSheetCount = Math.max(1, Math.ceil(chunks.length / 2));
      for (let sIdx = 0; sIdx < physicalSheetCount; sIdx++) {
        const leftChunk = chunks[sIdx * 2];
        const rightChunk = chunks[sIdx * 2 + 1];
        const isLastPage = (setIndex === pageSets.length - 1) && (sIdx === physicalSheetCount - 1);
        const renderSettingsLeft = {
          ...s,
          _teacherMode: pageSet.teacherMode,
          title: pageSet.teacherMode ? `${s.title || '英语练习'}（教师答案）` : s.title,
          isContinuationHalf: false
        };
        const renderSettingsRight = {
          ...s,
          _teacherMode: pageSet.teacherMode,
          title: pageSet.teacherMode ? `${s.title || '英语练习'}（教师答案·续）` : `${s.title || '英语练习'}（续）`,
          isContinuationHalf: true,
          showStudentName: false,
          showStudentClass: false,
          showStudentNo: false,
          showStudentDate: false,
          showStudentScore: false
        };

        const leftHtml = renderCopySlipHtml(leftChunk, sIdx * 2, 0, renderSettingsLeft, effectivePromptSize);
        const rightHtml = rightChunk
          ? renderCopySlipHtml(rightChunk, sIdx * 2 + 1, 0, renderSettingsRight, effectivePromptSize)
          : '<div class="split-half-empty"><span class="empty-note">（以下空白）</span></div>';

        pagesHtml += `
          <div class="sheet-page landscape is-split-fold ${pageSet.className} ${isLastPage ? 'is-last-page' : ''}" style="
            width: ${pageWidthMm}mm;
            height: ${pageHeightMm}mm;
            min-height: ${pageHeightMm}mm;
            max-height: ${pageHeightMm}mm;
            font-family: ${s.fontFamilyZh};
            --font-zh: ${s.fontFamilyZh};
            --font-en: ${safePageFontEn};
            padding: ${Number(s.pageMargin || 8)}mm ${Number(s.pageMarginHorizontal ?? 12)}mm;
          ">
            <div class="split-fold-container">
              <div class="split-half-pane split-half-left">
                ${leftHtml}
                <div class="half-page-footer">第 ${sIdx * 2 + 1} 页</div>
              </div>
              <div class="split-fold-seam">
                <span class="fold-seam-line"></span>
                <span class="fold-seam-label">对折线</span>
                <span class="fold-seam-line"></span>
              </div>
              <div class="split-half-pane split-half-right">
                ${rightHtml}
                <div class="half-page-footer">第 ${sIdx * 2 + 2} 页</div>
              </div>
            </div>
          </div>`;
      }
    });
    return pagesHtml;
  }

  pageSets.forEach((pageSet, setIndex) => {
    layout.pageChunks.forEach((chunk, pageIdx) => {
      const isLastPage = setIndex === pageSets.length - 1 && pageIdx === layout.pageChunks.length - 1;
      const renderSettings = {
        ...s,
        _teacherMode: pageSet.teacherMode,
        title: pageSet.teacherMode ? `${s.title || '英语练习'}（教师答案）` : s.title
      };

      const impGrid = getImpositionGrid(copiesPerPage, isLandscape);
      const impRows = impGrid.rows;
      const impCols = impGrid.cols;
      let innerHtml = '';

      if (copiesPerPage === 1) {
        innerHtml = renderCopySlipHtml(chunk, pageIdx, 0, renderSettings, effectivePromptSize);
      } else if (impCols === 1 && impRows > 1) {
        let copySlipsHtml = '';
        for (let c = 0; c < copiesPerPage; c++) {
          if (c > 0) {
            const guideTag = s.showCutGuide ? `<span class="cut-scissors-tag">沿虚线裁切分发</span>` : '';
            copySlipsHtml += `<div class="section-cut-divider ${s.dividerStyle}">${guideTag}</div>`;
          }
          copySlipsHtml += renderCopySlipHtml(chunk, pageIdx, c, renderSettings, effectivePromptSize);
        }
        innerHtml = copySlipsHtml;
      } else if (impCols > 1 && impRows === 1) {
        let copySlipsHtml = '';
        for (let c = 0; c < impCols; c++) {
          if (c > 0) {
            const guideTag = s.showCutGuide ? `<span class="cut-scissors-tag">沿虚线裁切分发</span>` : '';
            copySlipsHtml += `<div class="section-cut-divider vertical ${s.dividerStyle}">${guideTag}</div>`;
          }
          copySlipsHtml += renderCopySlipHtml(chunk, pageIdx, c, renderSettings, effectivePromptSize);
        }
        innerHtml = `<div class="sheet-imposition-row">${copySlipsHtml}</div>`;
      } else {
        let rowsHtml = '';
        for (let r = 0; r < impRows; r++) {
          if (r > 0) {
            const guideTag = s.showCutGuide ? `<span class="cut-scissors-tag">沿虚线裁切分发</span>` : '';
            rowsHtml += `<div class="section-cut-divider horizontal ${s.dividerStyle}">${guideTag}</div>`;
          }
          let colsHtml = '';
          for (let c = 0; c < impCols; c++) {
            if (c > 0) {
              const guideTag = s.showCutGuide ? `<span class="cut-scissors-tag">沿虚线裁切分发</span>` : '';
              colsHtml += `<div class="section-cut-divider vertical ${s.dividerStyle}">${guideTag}</div>`;
            }
            const copyIdx = r * impCols + c;
            colsHtml += renderCopySlipHtml(chunk, pageIdx, copyIdx, renderSettings, effectivePromptSize);
          }
          rowsHtml += `<div class="imposition-row">${colsHtml}</div>`;
        }
        innerHtml = `<div class="sheet-imposition-grid">${rowsHtml}</div>`;
      }

      pagesHtml += `
        <div class="sheet-page ${isLandscape ? 'landscape' : ''} ${pageSet.className} ${isLastPage ? 'is-last-page' : ''} ${copiesPerPage > 1 ? 'is-multi-up' : ''}" style="
          width: ${pageWidthMm}mm;
          height: ${pageHeightMm}mm;
          min-height: ${pageHeightMm}mm;
          max-height: ${pageHeightMm}mm;
          font-family: ${s.fontFamilyZh};
          --font-zh: ${s.fontFamilyZh};
          --font-en: ${safePageFontEn};
          padding: ${Number(s.pageMargin || 8)}mm ${Number(s.pageMarginHorizontal ?? 12)}mm ${Math.max(4, Number(s.pageMargin || 8) - 2)}mm ${Number(s.pageMarginHorizontal ?? 12)}mm;
        ">${innerHtml}</div>`;
    });
  });

  return pagesHtml;
}
