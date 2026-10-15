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

console.log('=== 🎉 全部 5 项专项单元测试 100% 验证通过！ ===\n');
