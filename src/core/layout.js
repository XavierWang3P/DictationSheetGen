import { generateId, parseSentenceToSegments, segmentsToMarkedText } from './tokenizer.js';

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const DEFAULT_WORDS_RAW = [
  { en: 'beautiful', zh: '美丽的；优美的' },
  { en: 'hard-working', zh: '工作努力的；辛勤的' },
  { en: 'rope', zh: '绳；粗绳' },
  { en: 'clever', zh: '聪明的；聪颖的' },
  { en: 'robot', zh: '机器人' },
  { en: 'piano', zh: '钢琴' },
  { en: 'young', zh: '幼小的；年轻的' },
  { en: 'jump', zh: '跳；跃' },
  { en: 'chess', zh: '国际象棋' }
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
  '8K': { width: 260, height: 370, name: '8K' }
};

export const DEFAULT_SETTINGS = {
  paperSize: 'A4',            // 'A4' | 'B4' | '8K'
  orientation: 'portrait',     // 'portrait' | 'landscape'
  copiesPerPage: 3,           // 1 | 2 | 3 (默认一页 3 份)
  pageMargin: 8,              // mm (4-16)
  dividerStyle: 'dashed',     // 'dashed' | 'solid' | 'none'
  showCutGuide: false,        // 不显示裁剪辅助线
  title: 'Unit 1 黑体词默写',
  titleFontSize: '18pt',      // 滑动调整 (12-32pt)
  titleAlign: 'center',       // 'center'
  showStudentName: true,
  showStudentClass: true,
  showStudentNo: true,
  showStudentDate: true,
  showStudentScore: true,
  columns: 3,                 // 1 | 2 | 3 | 4
  wordsPerPage: 9,            // 容量，默认 9 (3行 x 3列)
  promptFontSize: 14,         // pt (7-20) 提示/题号字号 (默认 14pt)
  zhFontSize: 'md',           // 'sm' | 'md' | 'lg'
  zhPosition: 'top',          // 'top' | 'left'
  colGap: 6,                  // mm (3-12)
  rowGap: 3.5,                // mm (2-10)
  gridStyle: 'four-line',     // 'four-line' | 'single-line'
  gridLinesPerWord: 1,        // 1 行
  gridHeight: 12,             // mm (6-18)
  gridStroke: 0.85,           // 0.6 | 0.85 | 1.2
  gridColor: '#cbd5e1',       // 线条颜色
  showVerticalBorder: true,   // 左右封闭竖线 (默认显示)
  dictMode: 'writing',        // 看中文写英文
  clozeStyle: 'inline',       // 'inline' (句中内嵌填空) | 'below' (句下独立书写格)
  fontFamilyZh: "'KaiTi', '楷体', STKaiti, serif",
  fontFamilyEn: 'Arial, sans-serif',
  letterSpacing: '0',
  showAnswerPage: false
};

export function createDraftItem(data) {
  if (!data) return null;
  const hasBracket = data.en && (data.en.includes('[') || data.en.includes('{'));
  const isSentence = data.type === 'sentence' || (Array.isArray(data.segments) && data.segments.length > 0) || hasBracket;

  if (isSentence) {
    const segments = (Array.isArray(data.segments) && data.segments.length > 0)
      ? data.segments
      : parseSentenceToSegments(data.en || '');
    const enText = data.en || segmentsToMarkedText(segments);
    const zhText = data.zh || data.translation || '';
    return {
      id: data.id || generateId('s'),
      sourceId: data.sourceId || null,
      type: 'sentence',
      en: enText,
      zh: zhText,
      translation: zhText,
      segments,
      overrideZh: data.overrideZh || ''
    };
  } else {
    return {
      id: data.id || generateId('w'),
      sourceId: data.sourceId || null,
      type: 'word',
      en: (data.en || '').trim(),
      zh: (data.zh || '').trim(),
      phonetic: data.phonetic || '',
      overrideZh: data.overrideZh || ''
    };
  }
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
    zh = item.overrideZh || item.zh || item.translation || '';
    mode = (typeof modeOrZh === 'string') ? modeOrZh : 'writing';
    opts = maybeModeOrOpts || {};
    segments = item.segments || null;
  } else {
    en = itemOrEn || '';
    zh = modeOrZh || '';
    mode = maybeModeOrOpts || 'writing';
  }

  if (mode !== 'cloze') {
    const txt = zh || en || '';
    return txt ? `<span class="meaning-text entry-zh-hint">${escapeHtml(txt)}</span>` : '';
  }

  const {
    gridStyle = 'four-line',
    clozeStyle = 'inline',
    strokeWidth = 0.85,
    lineColor = '#cbd5e1'
  } = opts;

  function renderBlankHtml(wordText, trailingPunct = '') {
    const cleanWord = (wordText || '').trim();
    const charLen = cleanWord.length || 6;
    const widthPx = Math.min(88, Math.max(45, Math.round(charLen * 6.5)));
    const punctMargin = trailingPunct ? 'margin-right: 1px;' : 'margin-right: 3px;';

    if (clozeStyle === 'inline' && gridStyle === 'four-line') {
      return `<span class="cloze-blank-line cloze-inline-grid" style="width:${widthPx}px; ${punctMargin}">
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
      return `<span class="cloze-blank-line" style="min-width:${widthPx}px; ${punctMargin}"></span>${trailingPunct}`;
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
    const zhHtml = zh ? `<span class="cloze-zh">(${escapeHtml(zh)})</span>` : '';
    return `<span class="meaning-text cloze-sentence">${formattedEn}</span>${zhHtml}`;
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
      const word = (p1 || p2 || '').trim();
      return renderBlankHtml(word, punct || '');
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

  const zhHtml = zhText ? `<span class="cloze-zh">(${escapeHtml(zhText)})</span>` : '';
  return `<span class="meaning-text cloze-sentence">${formattedEn}</span>${zhHtml}`;
}

// 纯函数：计算多页排版切片
export function computePageLayout(items, settings) {
  const words = Array.isArray(items) ? items : [];
  const s = Object.assign({}, DEFAULT_SETTINGS, settings);
  const curPaperKey = s.paperSize || 'A4';
  const pDim = PAPER_SIZES[curPaperKey] || PAPER_SIZES.A4;
  const isLand = (s.orientation === 'landscape');
  const pageWidthMm = isLand ? pDim.height : pDim.width;
  const pageHeightMm = isLand ? pDim.width : pDim.height;
  const capacity = Math.max(3, parseInt(s.wordsPerPage, 10) || 9);
  const copiesPerPage = Math.max(1, parseInt(s.copiesPerPage, 10) || 3);

  const pageChunks = [];
  for (let i = 0; i < words.length; i += capacity) {
    pageChunks.push({
      pageIndex: Math.floor(i / capacity),
      items: words.slice(i, i + capacity).map((item, offset) => ({
        overallIndex: i + offset + 1,
        item
      }))
    });
  }

  if (pageChunks.length === 0) {
    pageChunks.push({ pageIndex: 0, items: [] });
  }

  return {
    paperDim: pDim,
    isLandscape: isLand,
    pageWidthMm,
    pageHeightMm,
    wordsPerPage: capacity,
    capacity,
    copiesPerPage,
    totalPages: pageChunks.length,
    totalItems: words.length,
    pageChunks
  };
}

// 单联 HTML 生成 (纯函数)
export function renderCopySlipHtml(chunk, pageIdx, copyIdx, s, effectivePromptSize) {
  const copies = Math.max(1, parseInt(s.copiesPerPage, 10) || 1);
  const isCloze = (s.dictMode === 'cloze');
  const isClozeInline = isCloze && (s.clozeStyle !== 'below');

  let cardsHtml = '';
  chunk.items.forEach(({ overallIndex, item }) => {
    const zhMeaningHtml = formatClozePrompt(item, s.dictMode, {
      gridStyle: s.gridStyle,
      clozeStyle: s.clozeStyle || 'inline',
      strokeWidth: s.gridStroke || 0.85,
      lineColor: s.gridColor || '#cbd5e1'
    });

    let practiceGridHtml = '';
    if (!isClozeInline) {
      const effectiveGridHeight = (copies > 1 && isCloze)
        ? Math.min(6.5, s.gridHeight || 12)
        : (s.gridHeight || 12);

      practiceGridHtml = createPracticeGridSvg({
        gridStyle: s.gridStyle,
        gridLines: s.gridLinesPerWord || 1,
        gridHeightMm: effectiveGridHeight,
        strokeWidth: s.gridStroke || 0.85,
        lineColor: s.gridColor || '#cbd5e1',
        showVertical: s.showVerticalBorder
      });
    }

    const cardCls = isClozeInline ? 'cloze-card-inline' : (s.zhPosition === 'left' ? 'meaning-left' : '');

    const safeCardId = escapeHtml(item.id);
    const safeLetterSpacing = escapeHtml(String(s.letterSpacing || '0').replace(/[^0-9a-zA-Z. -]/g, ''));
    const safeFontFamily = escapeHtml(s.fontFamilyZh || "'KaiTi', '楷体', STKaiti, serif");
    const safeTitleAlign = escapeHtml(s.titleAlign || 'center');

    cardsHtml += `
      <div class="word-card word-entry-item ${cardCls}" data-id="${safeCardId}" style="letter-spacing:${safeLetterSpacing};">
        <div class="meaning word-prompt-row" style="font-size:${effectivePromptSize}pt;">
          <span class="word-num entry-index">${overallIndex}.</span>
          ${zhMeaningHtml}
        </div>
        ${!isClozeInline ? `
          <div class="practice-grid entry-grid-wrap">
            ${practiceGridHtml}
          </div>
        ` : ''}
      </div>
    `;
  });

  // 考生信息栏
  let studentInfoHtml = '';
  const showAnyStudentInfo = s.showStudentName || s.showStudentClass || s.showStudentNo || s.showStudentDate || s.showStudentScore;
  if (showAnyStudentInfo) {
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
  const safeTitleAlign = escapeHtml(s.titleAlign || 'center');

  let headerHtml = '';
  if (copies > 1) {
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
  const effectiveRowGap = (copies > 1 && s.dictMode === 'cloze')
    ? Math.min(2.5, s.rowGap || 3.5)
    : (s.rowGap || 3.5);

  const bodyHtml = `
    <div class="sheet-body-grid" style="
      grid-template-columns: repeat(${s.columns}, 1fr);
      column-gap: ${s.colGap}mm;
      row-gap: ${effectiveRowGap}mm;
    ">
      ${cardsHtml}
    </div>
  `;

  const sectionCls = (copies > 1) ? 'multi-copy' : 'single-copy';
  return `
    <div class="sheet-copy-section ${sectionCls}">
      ${headerHtml}
      ${bodyHtml}
    </div>
  `;
}

// 试卷完整 HTML 生成引擎 (纯函数)
export function renderPracticeSheetHtml(layout, settings) {
  if (layout.totalItems === 0) {
    return `
      <div style="background:#ffffff;padding:50px 30px;border-radius:12px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.06);max-width:420px;margin:40px auto;">
        <h3 style="color:#0f172a;margin-bottom:8px;">暂无练习单词</h3>
        <p style="color:#64748b;font-size:13px;line-height:1.6;">请在左侧文本框中输入或粘贴单词，右侧将自动即时排版。</p>
      </div>
    `;
  }

  const s = settings;
  const { copiesPerPage, isLandscape, pageWidthMm, pageHeightMm } = layout;
  const curPromptSize = s.promptFontSize || 14;
  const effectivePromptSize = (copiesPerPage > 1 && s.dictMode === 'cloze')
    ? Math.min(12, curPromptSize)
    : curPromptSize;

  let pagesHtml = '';

  layout.pageChunks.forEach((chunk, pageIdx) => {
    let copySlipsHtml = '';

    for (let c = 0; c < copiesPerPage; c++) {
      if (c > 0) {
        const guideTag = s.showCutGuide ? `<span class="cut-scissors-tag">✂ 沿虚线裁切分发</span>` : '';
        copySlipsHtml += `
          <div class="section-cut-divider ${s.dividerStyle}">
            ${guideTag}
          </div>
        `;
      }
      copySlipsHtml += renderCopySlipHtml(chunk, pageIdx, c, s, effectivePromptSize);
    }

    pagesHtml += `
      <div class="sheet-page ${isLandscape ? 'landscape' : ''}" style="
        width: ${pageWidthMm}mm;
        height: ${pageHeightMm}mm;
        min-height: ${pageHeightMm}mm;
        max-height: ${pageHeightMm}mm;
        font-family: ${s.fontFamilyZh};
        padding: ${s.pageMargin}mm 12mm ${Math.max(5, s.pageMargin - 2)}mm 12mm;
      ">
        ${copySlipsHtml}
      </div>
    `;
  });

  return pagesHtml;
}
