import { generateId, parseSentenceToSegments } from '../core/tokenizer.js';
import { calculateWritingGridWidth, measureAnswerText } from '../core/writingGridWidth.js';

export const DEFAULT_LAYOUT_DEFAULTS = Object.freeze({
  wordDictationColumns: 3,
  sentenceDictationColumns: 1,
  sentenceClozeColumns: 'auto',
  choiceColumns: 'auto',
  inlineFillColumns: 'auto',
  englishCompositionColumns: 1
});

const COLUMN_RULES = {
  wordDictationColumns: [1, 2, 3, 4, 5],
  sentenceDictationColumns: [1, 2, 3, 4, 5],
  sentenceClozeColumns: ['auto', 1, 2, 3, 4, 5],
  choiceColumns: ['auto', 1, 2, 3, 4, 5],
  inlineFillColumns: ['auto', 1, 2, 3, 4, 5],
  englishCompositionColumns: [1, 2, 3, 4, 5]
};

function cloneDefault(value) {
  return JSON.parse(JSON.stringify(value));
}

function validColumnValue(key, value) {
  if (value === 'auto') return COLUMN_RULES[key]?.includes('auto');
  const num = Number(value);
  if ([1, 2, 3, 4, 5].includes(num)) return COLUMN_RULES[key]?.includes(num);
  return false;
}

export function normalizeLayoutDefaults(layoutDefaults, legacySettings = {}) {
  const source = layoutDefaults && typeof layoutDefaults === 'object' ? layoutDefaults : {};
  const legacyColumns = Number(legacySettings?.columns);
  const fromLegacy = !layoutDefaults && Number.isFinite(legacyColumns);
  const result = { ...DEFAULT_LAYOUT_DEFAULTS };

  if (fromLegacy) {
    if ([2, 3, 4].includes(legacyColumns)) result.wordDictationColumns = legacyColumns;
    if ([1, 2].includes(legacyColumns)) {
      result.sentenceDictationColumns = legacyColumns;
      result.sentenceClozeColumns = legacyColumns;
    }
  }

  Object.keys(DEFAULT_LAYOUT_DEFAULTS).forEach((key) => {
    const val = source[key];
    if (val === 'auto' && COLUMN_RULES[key]?.includes('auto')) {
      result[key] = 'auto';
    } else {
      const num = Number(val);
      if ([1, 2, 3, 4, 5].includes(num) && COLUMN_RULES[key]?.includes(num)) {
        result[key] = num;
      }
    }
  });
  return result;
}

function baseQuestion(data, type) {
  const id = data?.id || generateId(type.replace(/[^a-z]/g, '').slice(0, 8) || 'item');
  return {
    id,
    sourceId: data?.sourceId || null,
    questionType: type,
    subType: data?.subType || data?.alphabetType || null,
    layout: data?.layout && typeof data.layout === 'object'
      ? { ...data.layout }
      : {},
    overrideZh: data?.overrideZh || ''
  };
}

function normalizeLegacyText(data, type) {
  const base = baseQuestion(data, type);
  const en = String(data?.en || '').trim();
  const zh = String(data?.zh || data?.translation || '').trim();
  return {
    ...base,
    subType: data?.subType || data?.alphabetType || null,
    type: data?.type || (type.startsWith('sentence') ? 'sentence' : 'word'),
    en,
    zh,
    prompt: data?.prompt || zh || en,
    answer: data?.answer || en,
    translation: zh,
    phonetic: data?.phonetic || '',
    segments: Array.isArray(data?.segments) ? data.segments.map((segment) => ({ ...segment })) : [],
    layoutHint: data?.layoutHint || (type.startsWith('sentence') ? 'auto' : 'auto'),
    alphaData: data?.alphaData || null,
    neighborData: data?.neighborData || null,
    caseData: data?.caseData || null
  };
}

function normalizeWord(data) {
  return normalizeLegacyText(data, 'word-dictation');
}

function normalizeSentenceDictation(data) {
  return normalizeLegacyText(data, 'sentence-dictation');
}

function normalizeCloze(data) {
  const item = normalizeLegacyText(data, 'sentence-cloze');
  if (item.segments.length === 0 && item.en) item.segments = parseSentenceToSegments(item.en);
  return item;
}

function normalizeAlphabet(data) {
  const base = normalizeLegacyText(data, 'alphabet');
  let subType = data?.subType || data?.alphabetType;
  if (!subType) {
    if (data?.neighborData || data?.id?.startsWith('neighbor') || (data?.zh && data?.zh.includes('邻居'))) {
      subType = 'neighbor';
    } else if (data?.caseData || data?.id?.startsWith('case')) {
      subType = 'case';
    } else {
      subType = 'sequence';
    }
  }
  return {
    ...base,
    subType,
    alphabetType: subType,
    alphaData: data?.alphaData || null,
    neighborData: data?.neighborData || null,
    caseData: data?.caseData || null
  };
}

function optionLabel(index, style) {
  if (style === 'numeric') return String(index + 1);
  if (style === 'true-false') return index === 0 ? 'T' : 'F';
  return String.fromCharCode(65 + index);
}

function normalizeChoice(data = {}) {
  const base = baseQuestion(data, 'choice');
  const labelStyle = ['alpha-upper', 'numeric', 'true-false'].includes(data.labelStyle) ? data.labelStyle : 'alpha-upper';
  const targetCount = labelStyle === 'true-false'
    ? 2
    : Math.min(6, Math.max(2, Number(data.optionCount) || data.options?.length || 3));
  const sourceOptions = Array.isArray(data.options) ? data.options : [];
  const options = Array.from({ length: targetCount }, (_, index) => {
    const source = sourceOptions[index] || {};
    const fallbackText = labelStyle === 'true-false' ? (index === 0 ? 'True' : 'False') : '';
    return {
      id: source.id || generateId('option'),
      text: String(source.text ?? fallbackText),
      label: optionLabel(index, labelStyle)
    };
  });
  const validIds = new Set(options.map((option) => option.id));
  let answers = (Array.isArray(data.answers) ? data.answers : []).filter((id) => validIds.has(id));
  const selectionMode = data.selectionMode === 'multiple' ? 'multiple' : 'single';
  if (selectionMode === 'single' && answers.length > 1) answers = answers.slice(0, 1);
  return {
    ...base,
    stem: String(data.stem || ''),
    selectionMode,
    labelStyle,
    optionLayout: ['auto', 'single', 'double', 'three', 'inline'].includes(data.optionLayout) ? data.optionLayout : 'auto',
    options,
    answers
  };
}

function normalizeInlineFill(data = {}) {
  const base = baseQuestion(data, 'inline-fill');
  let blanks = Array.isArray(data.blanks) ? data.blanks : [];
  if (blanks.length === 0) blanks = [{ id: generateId('blank'), answer: '', lineStyle: 'single', widthMode: 'auto' }];
  blanks = blanks.map((blank) => ({
    id: blank?.id || generateId('blank'),
    answer: String(blank?.answer || ''),
    lineStyle: blank?.lineStyle === 'four-line' ? 'four-line' : 'single',
    widthMode: blank?.widthMode === 'manual' ? 'manual' : 'auto',
    width: Math.min(360, Math.max(40, Number(blank?.width) || 96))
  }));
  const blankIds = new Set(blanks.map((blank) => blank.id));
  let stemSegments = Array.isArray(data.stemSegments)
    ? data.stemSegments.filter((segment) => segment && (segment.type === 'text' || (segment.type === 'blank' && blankIds.has(segment.blankId)))).map((segment) => ({ ...segment }))
    : [];
  if (stemSegments.length === 0) {
    stemSegments = [{ type: 'text', text: String(data.stem || '') }];
    blanks.forEach((blank) => stemSegments.push({ type: 'blank', blankId: blank.id }));
  }
  return {
    ...base,
    stem: String(data.stem || ''),
    autoNumber: data.autoNumber !== false,
    stemSegments,
    blanks
  };
}

function normalizeComposition(data = {}) {
  const base = baseQuestion(data, 'english-composition');
  return {
    ...base,
    title: String(data.title || ''),
    instructions: String(data.instructions || ''),
    writingStyle: data.writingStyle === 'four-line' ? 'four-line' : 'single-line',
    lineCount: Math.min(40, Math.max(3, Number(data.lineCount) || 10)),
    lineHeight: Math.min(18, Math.max(8, Number(data.lineHeight) || 11)),
    showTitleArea: data.showTitleArea !== false,
    compositionFragment: data.compositionFragment ? { ...data.compositionFragment } : null
  };
}

export function normalizeSeparator(data = {}) {
  const base = baseQuestion(data, 'separator');
  const title = typeof data.title === 'string' ? data.title : (typeof data.text === 'string' ? data.text : '');
  const sectionColumns = [1, 2, 3, 4, 5].includes(Number(data.sectionColumns)) ? Number(data.sectionColumns) : null;
  return {
    ...base,
    questionType: 'separator',
    type: 'separator',
    title: title.trim(),
    text: title.trim(),
    sectionColumns,
    isFullWidth: true,
    layoutHint: 'full-width'
  };
}

function basicValidation(item, fields = []) {
  const errors = fields.filter((field) => !String(item?.[field] || '').trim()).map((field) => `${field} 不能为空`);
  return { valid: errors.length === 0, errors };
}

const delegateRenderer = (name) => (item, context) => context?.[name]?.(item, context) || '';

export const questionTypeRegistry = {
  'word-dictation': {
    label: '单词默写',
    editor: 'QuickTextEditor',
    createDefault: () => normalizeWord({}),
    normalize: normalizeWord,
    validate: (item) => basicValidation(item, ['prompt']),
    estimateHeight: (item, context) => {
      const measured = calculateWritingGridWidth({
        text: item.answer || item.en,
        fontFamily: context.fontFamilyEn,
        fontSize: context.fontSizePx,
        availableWidth: context.availableWidthPx,
        minWidth: 48,
        maxWidth: context.availableWidthPx
      });
      const lines = Math.max(1, Math.min(4, Math.ceil((measured.targetWidth || 1) / Math.max(1, context.availableWidthPx))));
      return 6 + lines * (context.effectiveGridHeight + 1.2);
    },
    defaultLayout: { columns: 3 },
    migrate: normalizeWord,
    renderPreview: delegateRenderer('renderWordDictation'),
    renderPrint: delegateRenderer('renderWordDictation')
  },
  'sentence-dictation': {
    label: '句子默写',
    editor: 'QuickTextEditor',
    createDefault: () => normalizeSentenceDictation({}),
    normalize: normalizeSentenceDictation,
    validate: (item) => basicValidation(item, ['prompt']),
    estimateHeight: (item, context) => {
      const measured = calculateWritingGridWidth({
        text: item.answer || item.en,
        fontFamily: context.fontFamilyEn,
        fontSize: context.fontSizePx,
        availableWidth: context.availableWidthPx,
        minWidth: 48,
        maxWidth: context.availableWidthPx
      });
      const lines = Math.max(1, Math.min(4, Math.ceil((measured.targetWidth || 1) / Math.max(1, context.availableWidthPx))));
      return 6 + lines * (context.effectiveGridHeight + 1.8);
    },
    defaultLayout: { columns: 1 },
    migrate: normalizeSentenceDictation,
    renderPreview: delegateRenderer('renderSentenceDictation'),
    renderPrint: delegateRenderer('renderSentenceDictation')
  },
  'sentence-cloze': {
    label: '句子挖空',
    editor: 'ClozeEditor',
    createDefault: () => normalizeCloze({}),
    normalize: normalizeCloze,
    validate: (item) => basicValidation(item, ['en']),
    estimateHeight: (item, context) => {
      if (context.settings.clozeStyle === 'below') return 10 + context.effectiveGridHeight;
      const isMulti = (context.copies > 1);
      const zh = item.overrideZh || item.zh || item.translation || '';
      const pos = context.settings.clozeZhPosition || 'above';
      const zhHeight = (zh && ['above', 'below'].includes(pos)) ? (isMulti ? 4.2 : 5.0) : 0;

      // 评估英文句面宽度与折行
      const cleanEn = (item.en || '').replace(/\[([^\]]+)\]/g, '____');
      const fontSize = isMulti
        ? Math.min(12, Number(context.settings.promptFontSize) || 14) * 1.333333
        : (context.fontSizePx || 18.67);
      const measured = calculateWritingGridWidth({
        text: cleanEn,
        fontFamily: context.fontFamilyEn || 'Arial, sans-serif',
        fontSize,
        availableWidth: context.availableWidthPx || 340,
        minWidth: 48,
        maxWidth: context.availableWidthPx || 340,
        scale: 1.0
      });
      const lines = Math.max(1, Math.min(3, Math.ceil((measured.targetWidth || 1) / Math.max(1, context.availableWidthPx || 340))));
      const enBaseHeight = isMulti ? 7.8 : 9.0;
      const enExtraHeight = (lines - 1) * (isMulti ? 6.5 : 7.5);
      const spacing = zhHeight > 0 ? 1.5 : 0;
      return zhHeight + enBaseHeight + enExtraHeight + spacing;
    },
    defaultLayout: { columns: 'auto' },
    migrate: normalizeCloze,
    renderPreview: delegateRenderer('renderSentenceCloze'),
    renderPrint: delegateRenderer('renderSentenceCloze')
  },
  alphabet: {
    label: '字母专项',
    editor: 'AlphabetEditor',
    createDefault: () => normalizeAlphabet({}),
    normalize: normalizeAlphabet,
    validate: () => ({ valid: true, errors: [] }),
    estimateHeight: (item, context) => context.copies > 1 ? 14 : 18,
    defaultLayout: { columns: 3 },
    migrate: normalizeAlphabet,
    renderPreview: delegateRenderer('renderAlphabet'),
    renderPrint: delegateRenderer('renderAlphabet')
  },
  choice: {
    label: '选择题',
    editor: 'GeneralQuestionEditor',
    editorVariant: 'choice',
    createDefault: () => normalizeChoice({}),
    normalize: normalizeChoice,
    validate: (item) => {
      const errors = [];
      if (!item.stem.trim()) errors.push('题干不能为空');
      if (item.options.length < 2 || item.options.length > 6) errors.push('选项数量必须为2至6个');
      return { valid: errors.length === 0, errors };
    },
    estimateHeight: (item, context) => {
      const maxOptLen = Math.max(0, ...item.options.map((o) => (o.text || '').length));
      const cols = (item.options.length === 3 && maxOptLen <= 14) ? 3 : (resolveQuestionColumns(item, context.settings) === 2 ? 2 : 1);
      return 9 + Math.ceil(item.options.length / cols) * 6;
    },
    defaultLayout: { columns: 'auto' },
    migrate: normalizeChoice,
    renderPreview: delegateRenderer('renderChoice'),
    renderPrint: delegateRenderer('renderChoice')
  },
  'inline-fill': {
    label: '填空题',
    editor: 'GeneralQuestionEditor',
    editorVariant: 'inline-fill',
    createDefault: () => normalizeInlineFill({}),
    normalize: normalizeInlineFill,
    validate: (item) => basicValidation(item, ['stem']),
    estimateHeight: (item) => 11 + Math.max(0, item.blanks.length - 1) * 3,
    defaultLayout: { columns: 'auto' },
    migrate: normalizeInlineFill,
    renderPreview: delegateRenderer('renderInlineFill'),
    renderPrint: delegateRenderer('renderInlineFill')
  },
  'english-composition': {
    label: '英语作文',
    editor: 'GeneralQuestionEditor',
    editorVariant: 'english-composition',
    createDefault: () => normalizeComposition({}),
    normalize: normalizeComposition,
    validate: (item) => item.lineCount >= 3 ? { valid: true, errors: [] } : { valid: false, errors: ['作文行数不得少于3行'] },
    estimateHeight: (item) => 14 + (item.compositionFragment?.lineCount || item.lineCount) * (item.lineHeight + 1.2),
    defaultLayout: { columns: 1 },
    migrate: normalizeComposition,
    renderPreview: delegateRenderer('renderComposition'),
    renderPrint: delegateRenderer('renderComposition')
  },
  separator: {
    label: '分栏隔断',
    editor: 'QuickTextEditor',
    createDefault: () => normalizeSeparator({ title: '分栏隔断' }),
    normalize: normalizeSeparator,
    validate: () => ({ valid: true, errors: [] }),
    estimateHeight: (item) => (item.title ? 10 : 5),
    defaultLayout: { columns: 1 },
    migrate: normalizeSeparator,
    renderPreview: delegateRenderer('renderSeparator'),
    renderPrint: delegateRenderer('renderSeparator')
  }
};

export function inferQuestionType(data, fallbackMode = 'writing') {
  if (data?.questionType && questionTypeRegistry[data.questionType]) return data.questionType;
  if (data?.questionType === 'separator' || data?.type === 'separator' || data?.questionType === 'section-break' || data?.type === 'section-break') return 'separator';
  if (data?.alphaData || data?.neighborData || data?.caseData || data?.type === 'alphabet' || fallbackMode === 'alphabet') return 'alphabet';
  if (data?.type === 'choice') return 'choice';
  if (data?.type === 'inline-fill') return 'inline-fill';
  if (data?.type === 'english-composition') return 'english-composition';
  if (data?.type === 'sentence-dictation' || fallbackMode === 'sentence-dictation' || fallbackMode === 'sentence') return 'sentence-dictation';
  const en = String(data?.en || '');
  if (data?.type === 'sentence' || data?.segments?.some?.((segment) => segment.blank) || en.includes('[') || en.includes('{') || fallbackMode === 'cloze') return 'sentence-cloze';
  return 'word-dictation';
}

export function normalizeQuestion(data, fallbackMode = 'writing') {
  if (!data) return null;
  const type = inferQuestionType(data, fallbackMode);
  return questionTypeRegistry[type].normalize(data);
}

export function getQuestionTypeDefinition(type) {
  return questionTypeRegistry[type] || null;
}

export function getQuestionTypesByEditor(editor) {
  return Object.entries(questionTypeRegistry)
    .filter(([, definition]) => definition.editor === editor)
    .map(([type]) => type);
}

export function createQuestion(type, overrides = {}) {
  const definition = getQuestionTypeDefinition(type);
  if (!definition) throw new Error(`未知题型: ${type}`);
  return definition.normalize({ ...cloneDefault(definition.createDefault()), ...overrides, questionType: type });
}

export function validateQuestion(item) {
  const definition = getQuestionTypeDefinition(item?.questionType);
  return definition ? definition.validate(item) : { valid: false, errors: ['未知题型'] };
}

export function resolveQuestionColumns(item, settings = {}) {
  const override = Number(item?.layout?.columns);
  if ([1, 2, 3, 4, 5].includes(override)) return override;
  const defaults = normalizeLayoutDefaults(settings.layoutDefaults, settings);
  const type = item?.questionType || 'word-dictation';
  if (type === 'separator') return 1;
  if (type === 'word-dictation') return defaults.wordDictationColumns;
  if (type === 'sentence-dictation') return defaults.sentenceDictationColumns;
  if (type === 'english-composition') return defaults.englishCompositionColumns || 1;
  if (type === 'alphabet') {
    const subType = item?.subType || item?.alphabetType || (item?.neighborData ? 'neighbor' : (item?.caseData ? 'case' : 'sequence'));
    if (subType === 'neighbor') {
      if (item?.neighborData?.layoutStyle === 'bottom-5col') return 5;
      if (item?.neighborData?.layoutStyle === 'bottom-4col') return 4;
      if (item?.neighborData?.layoutStyle === 'right-2col') return 2;
      if (settings.alphabetLayout === 'bottom-5col') return 5;
      if (settings.alphabetLayout === 'bottom-4col') return 4;
      if (settings.alphabetLayout === 'right-2col') return 2;
      return 4;
    }
    if (subType === 'case') {
      if (item?.caseData?.layoutStyle === 'bottom-5col') return 5;
      if (item?.caseData?.layoutStyle === 'bottom-4col') return 4;
      if (item?.caseData?.layoutStyle === 'right-2col') return 2;
      if (settings.alphabetLayout === 'bottom-5col') return 5;
      if (settings.alphabetLayout === 'bottom-4col') return 4;
      if (settings.alphabetLayout === 'right-2col') return 2;
      return 4;
    }
    return 1;
  }

  let value = 'auto';
  if (type === 'sentence-cloze') value = defaults.sentenceClozeColumns;
  if (type === 'choice') value = defaults.choiceColumns;
  if (type === 'inline-fill') value = defaults.inlineFillColumns;
  if (value !== 'auto') return Number(value);

  if (type === 'sentence-cloze') {
    const text = item.en || '';
    const blanks = item.segments?.filter?.((segment) => segment.blank).length || 0;
    return text.length > 42 || blanks > 2 ? 1 : 2;
  }
  if (type === 'choice') {
    const longest = Math.max(0, ...item.options.map((option) => option.text.length));
    return item.stem.length > 52 || longest > 24 || item.options.length > 4 ? 1 : 2;
  }
  if (type === 'inline-fill') return item.stem.length > 52 || item.blanks.length > 2 ? 1 : 2;
  return 1;
}

export function shouldUseFullRow(item, settings = {}, availableWidthMm = 180) {
  const type = item?.questionType || 'word-dictation';
  const columns = resolveQuestionColumns(item, settings);
  if (columns <= 1 || type === 'english-composition') return true;
  if (!['sentence-dictation', 'sentence-cloze', 'choice', 'inline-fill'].includes(type)) return false;

  const gapMm = Number(settings.colGap) || 6;
  const cellWidthPx = Math.max(1, ((availableWidthMm - gapMm * (columns - 1)) / columns) * 3.7795275591);

  if (type === 'sentence-dictation') {
    const text = item.answer || item.en || '';
    const measured = measureAnswerText({
      text,
      fontFamily: settings.fontFamilyEn || 'Arial, sans-serif',
      fontSize: (Number(settings.promptFontSize) || 14) * 1.333333,
      letterSpacing: parseFloat(settings.letterSpacing) || 0
    });
    // 普通句子 (如 15~35 字符) measured ~150-280px，在 2 列 (cellWidth ~340px) 下从容容纳；
    // 只有超长句 (如 70+ 字符测试用例) measured ~700-900px > cellWidthPx * 1.35 时才自动跨整行
    return measured > cellWidthPx * 1.35 || text.length > 60;
  }

  if (type === 'sentence-cloze') {
    const text = item.en || '';
    // 句子挖空题干具有文字自适应换行，书写格仅限于挖空词本身
    // 仅在题干超过超长篇幅 (如 70 字符) 时才强制跨整行
    return text.length > 70;
  }

  if (type === 'choice') {
    const stem = item.stem || '';
    const longest = Math.max(0, ...(item.options || []).map((o) => (o.text || '').length));
    return stem.length > 60 || longest > 28;
  }

  if (type === 'inline-fill') {
    const stem = item.stem || '';
    return stem.length > 60 || (item.blanks || []).length > 3;
  }

  return false;
}

export function estimateQuestionHeight(item, context) {
  const definition = getQuestionTypeDefinition(item?.questionType);
  return definition ? definition.estimateHeight(item, context) : 16;
}

export function renderQuestion(item, context, target = 'print') {
  const definition = getQuestionTypeDefinition(item?.questionType);
  if (!definition) return '';
  return target === 'preview'
    ? definition.renderPreview(item, context)
    : definition.renderPrint(item, context);
}
