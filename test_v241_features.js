import assert from 'node:assert/strict';
import { generateLetterNeighborsItems, generateCaseConversionItems } from './src/core/alphabet.js';
import { parseSentenceToSegments } from './src/core/tokenizer.js';
import { computePageLayout, renderCopySlipHtml, DEFAULT_SETTINGS } from './src/core/layout.js';
import { normalizeQuestion, getQuestionTypeDefinition } from './src/question-types/registry.js';

console.log('=== 开始执行 v2.4.1 八大问题与版式功能专项测试 ===\n');

// 1. 验证字母邻居出题格式与默认排版 (4列, 单行精简提示 _ X _)
console.log('【验证 1】字母邻居出题与单行紧凑防溢出格式:');
const neighbors = generateLetterNeighborsItems({ count: 4, type: 'both', rowLayout: 'bottom-4col' });
assert.equal(neighbors.length, 4);
assert.equal(neighbors[0].layout.columns, 4);
assert.match(neighbors[0].prompt, /^邻居:\s+_\s+[A-Za-z]\s+_$/);
assert.ok(neighbors[0].neighborData.midChar);
console.log('-> 邻居样例:', neighbors[0].prompt, '列数:', neighbors[0].layout.columns);
console.log('-> 判定: ✅ PASS\n');

// 2. 验证字母大小写转换出题格式 (4列, 严格文案 "X 的大写/小写")
console.log('【验证 2】大小写转换出题文案精简与默认 4 列:');
const caseItems = generateCaseConversionItems({ count: 4, direction: 'lower_to_upper', rowLayout: 'bottom-4col' });
assert.equal(caseItems.length, 4);
assert.equal(caseItems[0].layout.columns, 4);
assert.match(caseItems[0].prompt, /^[a-z]\s+的大写$/);
const upperToLow = generateCaseConversionItems({ count: 4, direction: 'upper_to_lower', rowLayout: 'bottom-4col' });
assert.match(upperToLow[0].prompt, /^[A-Z]\s+的小写$/);
console.log('-> 大小写样例:', caseItems[0].prompt, upperToLow[0].prompt);
console.log('-> 判定: ✅ PASS\n');

// 3. 验证句子挖空句末标点剥离 Bug (末尾标点 .,!?; 不被四线格吞掉)
console.log('【验证 3】句子挖空句末标点剥离与独立渲染:');
const segs1 = parseSentenceToSegments('Ask [your teacher] for help.');
assert.deepEqual(segs1, [
  { text: 'Ask ', blank: false },
  { text: 'your teacher', blank: true },
  { text: ' for help.', blank: false }
]);
// 最后一个单词挖空，且句号在括号内 [help.]
const segs2 = parseSentenceToSegments('Please ask for [help.]');
assert.deepEqual(segs2, [
  { text: 'Please ask for ', blank: false },
  { text: 'help', blank: true },
  { text: '.', blank: false }
]);
// 最后一个单词挖空，且句号在括号外 [help].
const segs3 = parseSentenceToSegments('Please ask for [help].');
assert.deepEqual(segs3, [
  { text: 'Please ask for ', blank: false },
  { text: 'help', blank: true },
  { text: '.', blank: false }
]);
console.log('-> 标点剥离片段测试全部通过');
console.log('-> 判定: ✅ PASS\n');

// 4. 验证分栏隔断 (Separator) 注册与独立分栏继承规则
console.log('【验证 4】分栏隔断注册与独立分区继承:');
const sepDef = getQuestionTypeDefinition('separator');
assert.ok(sepDef);
assert.ok(sepDef.label);

const mixedItems = [
  normalizeQuestion({ en: 'apple', zh: '苹果', questionType: 'word-dictation' }),
  normalizeQuestion({ en: 'banana', zh: '香蕉', questionType: 'word-dictation' }),
  normalizeQuestion({ questionType: 'separator', title: 'Part II 句子理解', sectionColumns: 1 }),
  normalizeQuestion({ en: 'This is a pencil.', zh: '这是一支铅笔。', questionType: 'sentence-dictation' }),
  normalizeQuestion({ en: 'That is an eraser.', zh: '那是块橡皮。', questionType: 'sentence-dictation' }),
  normalizeQuestion({ questionType: 'separator', title: 'Part III 字母书写', sectionColumns: 4 }),
  normalizeQuestion({ prompt: '_ B _', questionType: 'alphabet' })
];

const layoutRes = computePageLayout(mixedItems, { ...DEFAULT_SETTINGS, copiesPerPage: 1 });
assert.ok(layoutRes.pageChunks.length >= 1);
const chunkItems = layoutRes.pageChunks[0].items;

// 验证题号：隔断本身不占用题号，但后续题目正常按序自增
const sep1 = chunkItems.find(it => it.item.questionType === 'separator');
assert.equal(sep1.displayIndex, null);

const afterSepItem = chunkItems.find(it => it.item.en === 'This is a pencil.');
assert.equal(afterSepItem.displayIndex, 3);

// 验证继承的列数：Part II 应该为 1 列 (gridSpan = 60)
assert.equal(afterSepItem.gridSpan, 60);

// 渲染 HTML 验证包含隔断条
const renderedSlip = renderCopySlipHtml(layoutRes.pageChunks[0], 0, 0, DEFAULT_SETTINGS, 14, 1);
assert.match(renderedSlip, /class="separator-bar"/);
assert.match(renderedSlip, /Part II 句子理解/);
assert.match(renderedSlip, /Part III 字母书写/);
console.log('-> 分栏隔断布局与题号编排通过');
console.log('-> 判定: ✅ PASS\n');

// 5. 验证水平边距可调 (pageMarginHorizontal)
console.log('【验证 5】全局页面水平边距 (pageMarginHorizontal) 配置生效:');
assert.equal(DEFAULT_SETTINGS.pageMarginHorizontal, 12);
const tightMarginLayout = computePageLayout(mixedItems, { ...DEFAULT_SETTINGS, pageMarginHorizontal: 6 });
assert.ok(tightMarginLayout);
console.log('-> 水平边距生效');
console.log('-> 判定: ✅ PASS\n');

// 6. 验证句子挖空、句子默写严格生效列数设置（如每行2题），不被内部强制跨整行
console.log('【验证 6】句子挖空与句子默写每行列数设置生效测试:');
const clozeAndSentences = [
  normalizeQuestion({ en: 'Ask [your teacher] for help.', zh: '向你的老师求助。', questionType: 'sentence-cloze' }),
  normalizeQuestion({ en: 'You [need to] talk [to each] other.', zh: '向你的老师求助。', questionType: 'sentence-cloze' }),
  normalizeQuestion({ prompt: '这是一支铅笔。', en: 'This is a pencil.', questionType: 'sentence-dictation' }),
  normalizeQuestion({ prompt: '那是一只钢笔。', en: 'That is a pen.', questionType: 'sentence-dictation' })
];

const col2Layout = computePageLayout(clozeAndSentences, {
  ...DEFAULT_SETTINGS,
  copiesPerPage: 1,
  layoutDefaults: {
    ...DEFAULT_SETTINGS.layoutDefaults,
    sentenceClozeColumns: 2,
    sentenceDictationColumns: 2
  }
});

const p0Items = col2Layout.pageChunks[0].items;
assert.equal(p0Items[0].gridSpan, 30, '句子挖空设为2列时每题必须为 span: 30 (50% 宽度)');
assert.equal(p0Items[0].isFullWidth, false, '句子挖空设为2列时不应被标记为 isFullWidth');
assert.equal(p0Items[1].gridSpan, 30);
assert.equal(p0Items[2].gridSpan, 30, '句子默写设为2列时每题必须为 span: 30');
assert.equal(p0Items[2].isFullWidth, false);
console.log('-> 句子挖空与默写 2 列设置生效 (span=30)');
console.log('-> 判定: ✅ PASS\n');

// 7. 验证版面高度充足时完整容纳全部题目（消除留白与机械分页）
console.log('【验证 7】充足版面高度时自动完整容纳题目，不留大片空白:');
const fullSheet12Items = [
  normalizeQuestion({ en: 'Ask [your teacher] for help.', zh: '向你的老师求助。', questionType: 'sentence-cloze' }),
  normalizeQuestion({ en: 'You [need to] talk [to each] other.', zh: '向你的老师求助。', questionType: 'sentence-cloze' }),
  normalizeQuestion({ en: 'how are you', zh: '你好吗', questionType: 'word-dictation' }),
  normalizeQuestion({ en: 'piano', zh: '钢琴', questionType: 'word-dictation' }),
  normalizeQuestion({ en: 'rope', zh: '绳；粗绳', questionType: 'word-dictation' }),
  normalizeQuestion({ en: 'chess', zh: '国际象棋', questionType: 'word-dictation' }),
  normalizeQuestion({ en: 'jump', zh: '跳；跃', questionType: 'word-dictation' }),
  normalizeQuestion({ en: 'robot', zh: '机器人', questionType: 'word-dictation' }),
  normalizeQuestion({ en: 'young', zh: '幼小的；年轻的', questionType: 'word-dictation' }),
  normalizeQuestion({ en: 'word10', zh: '第十词', questionType: 'word-dictation' }),
  normalizeQuestion({ en: 'word11', zh: '第十一词', questionType: 'word-dictation' }),
  normalizeQuestion({ en: 'word12', zh: '第十二词', questionType: 'word-dictation' })
];

const sheetRes = computePageLayout(fullSheet12Items, {
  ...DEFAULT_SETTINGS,
  copiesPerPage: 2,
  pageMargin: 4,
  wordsPerPage: 9,
  layoutDefaults: {
    ...DEFAULT_SETTINGS.layoutDefaults,
    wordDictationColumns: 3,
    sentenceClozeColumns: 2,
    sentenceDictationColumns: 2
  }
});

assert.equal(sheetRes.totalPages, 1, '12 题在高度充足时必须容纳在单页内，不得人为截断到第二页留出大片空白');
assert.equal(sheetRes.pageChunks[0].items.length, 12, '第一页必须完整包含全部 12 道题目');
console.log('-> 12题一页2份排版无空白、无截断、单页完整');
console.log('-> 判定: ✅ PASS\n');

console.log('=== 🎉 全部 7 项专项单元测试 100% 验证通过！ ===\n');
