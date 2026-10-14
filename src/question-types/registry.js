import { generateId, parseSentenceToSegments } from '../core/tokenizer.js';
import { calculateWritingGridWidth } from '../core/writingGridWidth.js';

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
  return COLUMN_RULES[key]?.includes(value);
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
    if (validColumnValue(key, source[key])) result[key] = source[key];
  });
  return result;
}

function baseQuestion(data, type) {
  const id = data?.id || generateId(type.replace(/[^a-z]/g, '').slice(0, 8) || 'item');
  return {
    id,
    sourceId: data?.sourceId || null,
    questionType: type,
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
  return normalizeLegacyText(data, 'alphabet');
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
    : Math.min(6, Math.max(2, Number(data.optionCount) || data.options?.length || 4));
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
    optionLayout: ['auto', 'single', 'double', 'inline'].includes(data.optionLayout) ? data.optionLayout : 'auto',
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
    continuationMode: data.continuationMode === 'repeat' ? 'repeat' : 'label',
    compositionFragment: data.compositionFragment ? { ...data.compositionFragment } : null
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
      return ['above', 'below'].includes(context.settings.clozeZhPosition) ? 22 : 16;
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
    estimateHeight: (item, context) => 9 + Math.ceil(item.options.length / (resolveQuestionColumns(item, context.settings) === 2 ? 2 : 1)) * 6,
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
  }
};

export function inferQuestionType(data, fallbackMode = 'writing') {
  if (data?.questionType && questionTypeRegistry[data.questionType]) return data.questionType;
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
  if (type === 'word-dictation') return defaults.wordDictationColumns;
  if (type === 'sentence-dictation') return defaults.sentenceDictationColumns;
  if (type === 'english-composition') return defaults.englishCompositionColumns || 1;
  if (type === 'alphabet') return Math.min(5, Math.max(1, Number(settings.columns) || 3));

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
  const text = type === 'choice'
    ? `${item.stem || ''} ${item.options?.map?.((option) => option.text).join(' ') || ''}`
    : type === 'inline-fill'
      ? `${item.stem || ''} ${item.blanks?.map?.((blank) => blank.answer).join(' ') || ''}`
      : (item.answer || item.en || '');
  const gapMm = Number(settings.colGap) || 6;
  const cellWidthPx = Math.max(1, ((availableWidthMm - gapMm * (columns - 1)) / columns) * 3.7795275591);
  const measurement = calculateWritingGridWidth({
    text,
    fontFamily: settings.fontFamilyEn || 'Arial, sans-serif',
    fontSize: (Number(settings.promptFontSize) || 14) * 1.333333,
    letterSpacing: parseFloat(settings.letterSpacing) || 0,
    availableWidth: cellWidthPx,
    minWidth: 48,
    maxWidth: cellWidthPx
  });
  return measurement.overflow;
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
