import assert from 'node:assert/strict';
import {
  DEFAULT_LAYOUT_DEFAULTS,
  getQuestionTypeDefinition,
  normalizeLayoutDefaults,
  normalizeQuestion,
  resolveQuestionColumns,
  shouldUseFullRow
} from './src/question-types/registry.js';
import { calculateWritingGridWidth } from './src/core/writingGridWidth.js';
import {
  DEFAULT_SETTINGS,
  computePageLayout,
  formatClozePrompt,
  renderPracticeSheetHtml
} from './src/core/layout.js';

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test('题型默认布局彼此独立', () => {
  assert.deepEqual(DEFAULT_LAYOUT_DEFAULTS, {
    wordDictationColumns: 3,
    sentenceDictationColumns: 1,
    sentenceClozeColumns: 'auto',
    choiceColumns: 'auto',
    inlineFillColumns: 'auto',
    englishCompositionColumns: 1
  });
  const changed = normalizeLayoutDefaults({ wordDictationColumns: 4 });
  assert.equal(changed.wordDictationColumns, 4);
  assert.equal(changed.sentenceDictationColumns, 1);
  assert.equal(changed.sentenceClozeColumns, 'auto');
});

test('旧全局列数只在可推断时迁移且单题覆盖优先', () => {
  const migrated = normalizeLayoutDefaults(null, { columns: 2 });
  assert.equal(migrated.wordDictationColumns, 2);
  assert.equal(migrated.sentenceDictationColumns, 2);
  assert.equal(migrated.sentenceClozeColumns, 2);

  const word = normalizeQuestion({ questionType: 'word-dictation', en: 'apple', zh: '苹果' });
  const sentence = normalizeQuestion({
    questionType: 'sentence-dictation',
    en: 'This is my classroom.',
    zh: '这是我的教室。',
    layout: { columns: 2 }
  });
  assert.equal(resolveQuestionColumns(word, { ...DEFAULT_SETTINGS, layoutDefaults: migrated }), 2);
  assert.equal(resolveQuestionColumns(sentence, { ...DEFAULT_SETTINGS, layoutDefaults: migrated }), 2);
});

test('长句即使指定双列也会跨整行', () => {
  const item = normalizeQuestion({
    questionType: 'sentence-dictation',
    en: 'This is a deliberately long sentence that needs enough room for a child to write clearly and comfortably.',
    layout: { columns: 2 }
  });
  assert.equal(shouldUseFullRow(item, { ...DEFAULT_SETTINGS, layoutDefaults: DEFAULT_LAYOUT_DEFAULTS }, 160), true);
});

test('句中挖空严格响应四种中文位置设置', () => {
  const item = {
    en: 'Please [open the door].',
    zh: '请打开门。'
  };
  const render = (position) => formatClozePrompt(item, 'cloze', {
    gridStyle: 'four-line',
    clozeStyle: 'inline',
    clozeZhPosition: position,
    availableWidth: 260
  });

  const below = render('below');
  const above = render('above');
  const right = render('right');
  const hidden = render('hide');

  assert.match(below, /cloze-layout-below/);
  assert.ok(below.indexOf('cloze-english-column') < below.indexOf('pos-below'));
  assert.match(above, /cloze-layout-above/);
  assert.ok(above.indexOf('pos-above') < above.indexOf('cloze-english-column'));
  assert.match(right, /cloze-layout-right/);
  assert.ok(right.indexOf('cloze-english-column') < right.indexOf('pos-right'));
  assert.match(hidden, /cloze-layout-hide/);
  assert.doesNotMatch(hidden, /请打开门/);
});

test('150%书写格宽度使用实际测量结果并正确限幅', () => {
  const measured = calculateWritingGridWidth({
    text: 'apple',
    fontFamily: 'Arial',
    fontSize: 16,
    availableWidth: 300,
    minWidth: 48,
    maxWidth: 240,
    measureText: () => 50
  });
  assert.equal(measured.measuredWidth, 50);
  assert.equal(measured.targetWidth, 75);
  assert.equal(measured.width, 75);

  const phrase = calculateWritingGridWidth({
    text: 'go to school by bus',
    fontFamily: 'Arial',
    fontSize: 16,
    availableWidth: 140,
    minWidth: 48,
    maxWidth: 140,
    measureText: () => 180
  });
  assert.equal(phrase.width, 140);
  assert.equal(phrase.overflow, true);

  const longWord = calculateWritingGridWidth({
    text: 'environment', fontFamily: 'Arial', fontSize: 16,
    availableWidth: 220, minWidth: 48, maxWidth: 220, measureText: () => 100
  });
  assert.equal(longWord.width, 150);
  assert.equal(longWord.overflow, false);

  const extremelyLong = calculateWritingGridWidth({
    text: 'antidisestablishmentarianism', fontFamily: 'Arial', fontSize: 16,
    availableWidth: 100, minWidth: 48, maxWidth: 100, measureText: () => 500
  });
  assert.equal(extremelyLong.width, 100);
  assert.equal(extremelyLong.overflow, true);

  const empty = calculateWritingGridWidth({
    text: '',
    fontFamily: 'Arial',
    fontSize: 16,
    availableWidth: 200,
    minWidth: 48,
    maxWidth: 180,
    measureText: () => 0
  });
  assert.equal(empty.width, 48);
});

test('通用题型注册、规范化与校验', () => {
  for (const type of ['word-dictation', 'sentence-cloze', 'sentence-dictation', 'alphabet', 'choice', 'inline-fill', 'english-composition']) {
    const definition = getQuestionTypeDefinition(type);
    assert.ok(definition);
    for (const key of ['label', 'createDefault', 'normalize', 'validate', 'estimateHeight', 'defaultLayout', 'migrate']) {
      assert.ok(definition[key], `${type}.${key} 缺失`);
    }
  }

  const choice = normalizeQuestion({
    questionType: 'choice',
    stem: 'Choose the correct answer.',
    labelStyle: 'true-false',
    options: [{ id: 'o1', text: 'True' }, { id: 'o2', text: 'False' }, { id: 'o3', text: 'Invalid' }],
    answers: ['o2', 'o3']
  });
  assert.equal(choice.options.length, 2);
  assert.deepEqual(choice.answers, ['o2']);

  const numericChoice = normalizeQuestion({ ...choice, labelStyle: 'numeric' });
  assert.deepEqual(numericChoice.options.map((option) => option.text), choice.options.map((option) => option.text));
  assert.deepEqual(numericChoice.answers, choice.answers);

  const fill = normalizeQuestion({
    questionType: 'inline-fill',
    stemSegments: [{ type: 'text', text: 'I ' }, { type: 'blank', blankId: 'b1' }, { type: 'text', text: ' English.' }],
    blanks: [{ id: 'b1', answer: 'like', lineStyle: 'four-line', widthMode: 'auto' }]
  });
  assert.equal(fill.blanks[0].id, 'b1');

  const composition = normalizeQuestion({ questionType: 'english-composition', title: 'My Day', lineCount: 1 });
  assert.ok(composition.lineCount >= 3);
});

test('超长作文仅按完整书写行拆分页', () => {
  const composition = normalizeQuestion({ questionType: 'english-composition', title: 'A Long Story', lineCount: 40, lineHeight: 11 });
  const settings = { ...DEFAULT_SETTINGS, copiesPerPage: 1, wordsPerPage: 50, layoutDefaults: DEFAULT_LAYOUT_DEFAULTS };
  const layout = computePageLayout([composition], settings);
  const fragments = layout.pageChunks.flatMap((page) => page.items).filter((entry) => entry.item.questionType === 'english-composition');
  assert.ok(fragments.length > 1);
  assert.equal(fragments.reduce((sum, entry) => sum + entry.item.compositionFragment.lineCount, 0), 40);
  assert.ok(fragments.every((entry) => Number.isInteger(entry.item.compositionFragment.lineCount) && entry.item.compositionFragment.lineCount > 0));
});

test('学生卷不包含答案且新增题型参与分页渲染', () => {
  const items = [
    normalizeQuestion({
      questionType: 'choice',
      stem: 'Which one is a fruit?',
      options: [{ id: 'a', text: 'Apple' }, { id: 'b', text: 'Desk' }],
      answers: ['a']
    }),
    normalizeQuestion({
      questionType: 'inline-fill',
      stemSegments: [{ type: 'text', text: 'I like ' }, { type: 'blank', blankId: 'secret-blank' }, { type: 'text', text: '.' }],
      blanks: [{ id: 'secret-blank', answer: 'bananas', lineStyle: 'four-line', widthMode: 'auto' }]
    }),
    normalizeQuestion({
      questionType: 'english-composition',
      title: 'My School',
      instructions: 'Write about your school.',
      lineCount: 6
    })
  ];
  const settings = { ...DEFAULT_SETTINGS, layoutDefaults: DEFAULT_LAYOUT_DEFAULTS, showAnswerPage: false, copiesPerPage: 1 };
  const layout = computePageLayout(items, settings);
  const html = renderPracticeSheetHtml(layout, settings);
  assert.equal(layout.totalItems, 3);
  assert.match(html, /type-choice/);
  assert.match(html, /type-inline-fill/);
  assert.match(html, /type-english-composition/);
  assert.doesNotMatch(html, /data-answer|bananas/);
});

console.log('QUESTION_TYPE_V240_TESTS_PASSED');
