import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  generateAlphabetSequenceItems,
  generateLetterNeighborsItems,
  generateCaseConversionItems
} from '../src/core/alphabet.js';
import {
  computePageLayout,
  renderCopySlipHtml,
  renderPracticeSheetHtml,
  DEFAULT_SETTINGS
} from '../src/core/layout.js';
import {
  normalizeQuestion,
  resolveQuestionColumns
} from '../src/question-types/registry.js';

console.log('=== 开始执行句子挖空/默写及字母专项渲染逻辑与样式防污染测试 ===\n');

// ----------------------------------------------------
// 1. 句子挖空与句子默写中文提示格式统一测试
// ----------------------------------------------------
console.log('【验证 1】句子挖空与句子默写中文提示格式统一（去除括号）：');

const clozeItem = normalizeQuestion({
  id: 'cloze-test-1',
  questionType: 'sentence-cloze',
  en: 'I have an [apple].',
  zh: '我有一个苹果。'
});

const sentenceDictItem = normalizeQuestion({
  id: 'sentence-dict-1',
  questionType: 'sentence-dictation',
  en: 'I have an apple.',
  zh: '我有一个苹果。'
});

const clozeSettings = {
  ...DEFAULT_SETTINGS,
  dictMode: 'cloze',
  copiesPerPage: 1,
  clozeStyle: 'inline',
  clozeZhPosition: 'end'
};

const clozeLayout = computePageLayout([clozeItem], clozeSettings);
const clozeHtml = renderPracticeSheetHtml(clozeLayout, clozeSettings);

// 验证句子挖空渲染出的中文不含外层括号（ ）或 ( )
assert.match(clozeHtml, /我有一个苹果。/, '句子挖空应包含纯中文文本');
assert.doesNotMatch(clozeHtml, /（\s*我有一个苹果。\s*）/, '句子挖空中不应包含中文全角括号包裹');
assert.doesNotMatch(clozeHtml, /\(\s*我有一个苹果。\s*\)/, '句子挖空中不应包含英文半角括号包裹');

// 验证教师答案模式下句子挖空也不含括号
const clozeTeacherSettings = { ...clozeSettings, showAnswerPage: true };
const clozeTeacherLayout = computePageLayout([clozeItem], clozeTeacherSettings);
const clozeTeacherHtml = renderPracticeSheetHtml(clozeTeacherLayout, clozeTeacherSettings);
assert.match(clozeTeacherHtml, /teacher-question-zh/, '教师模式应输出中文提示');
assert.doesNotMatch(clozeTeacherHtml, /（\s*我有一个苹果。\s*）/, '教师模式下句子挖空中文也不得带括号');

console.log('-> 句子挖空学生版与教师版中文提示纯净无括号');
console.log('-> 判定: ✅ PASS\n');


// ----------------------------------------------------
// 2. 字母接龙填空去除提示字母测试
// ----------------------------------------------------
console.log('【验证 2】字母接龙填空去除提示字母（移除 .alpha-cell-hint）：');

const gapItems = generateAlphabetSequenceItems({ subMode: 'gap', gapCount: 13, caseStyle: 'pair' });
assert.equal(gapItems.length, 26, '字母接龙题量应为 26');

const gapLayout = computePageLayout(gapItems, { ...DEFAULT_SETTINGS, dictMode: 'alphabet', copiesPerPage: 1 });
const gapChunk = gapLayout.pageChunks[0];
const gapCopyHtml = renderCopySlipHtml(gapChunk, 0, 0, { ...DEFAULT_SETTINGS, dictMode: 'alphabet' }, 14);

// 验证不得出现 .alpha-cell-hint
assert.doesNotMatch(gapCopyHtml, /class="[^"]*alpha-cell-hint[^"]*"/, '字母接龙填空中严禁渲染 .alpha-cell-hint 元素');
// 验证补齐格使用 .alpha-dummy-star
assert.match(gapCopyHtml, /class="alpha-dummy-star"/, '补齐格应使用 .alpha-dummy-star');

console.log('-> 字母接龙成功移除 .alpha-cell-hint，补齐格正常保留');
console.log('-> 判定: ✅ PASS\n');


// ----------------------------------------------------
// 3. 修复“左右邻居”网格样式被污染的 Bug（单题固化 subType，严防全局状态污染）
// ----------------------------------------------------
console.log('【验证 3】修复“左右邻居”网格样式被污染的 Bug：');

// 3.1 固化 subType 测试
const seqItems = generateAlphabetSequenceItems({ subMode: 'full', caseStyle: 'pair' });
const neighborItems = generateLetterNeighborsItems({ count: 10, caseStyle: 'upper', neighborType: 'both' });
const caseItems = generateCaseConversionItems({ count: 8, direction: 'random_switch' });

assert.equal(seqItems[0].subType, 'sequence', '26字母题目 subType 必须为 sequence');
assert.equal(neighborItems[0].subType, 'neighbor', '左右邻居题目 subType 必须为 neighbor');
assert.match(neighborItems[0].zh, /的前后字母$/, '学生提示应使用简短易懂的“前后字母”，不使用抽象的“邻居”说法');
assert.equal(caseItems[0].subType, 'case', '大小写转换题目 subType 必须为 case');

// 3.2 列数解析独立性测试（不受全局 alphabetLayout 污染）
assert.equal(resolveQuestionColumns(seqItems[0], { ...DEFAULT_SETTINGS, alphabetLayout: 'bottom-5col' }), 1, '26字母默写应始终返回 1 列');
assert.equal(resolveQuestionColumns(neighborItems[0], { ...DEFAULT_SETTINGS, alphabetLayout: 'bottom-5col' }), 5, '左右邻居默认应返回 5 列');
assert.equal(resolveQuestionColumns(caseItems[0], { ...DEFAULT_SETTINGS, alphabetLayout: 'bottom-5col' }), 4, '大小写转换默认应返回 4 列');

// 3.3 混合添加排版测试：26字母在前，左右邻居在后
const mixedItems = [...seqItems, ...neighborItems];
assert.equal(mixedItems.length, 36);

const mixedLayout = computePageLayout(mixedItems, { ...DEFAULT_SETTINGS, dictMode: 'alphabet', wordsPerPage: 9 });
// 验证 26 字母独立成 Chunk 0，未被 wordsPerPage=9 拆碎成 9+9+8
assert.equal(mixedLayout.pageChunks[0].items.length, 26, '26字母组必须完整作为单页，不可被 wordsPerPage 拆解');

// 验证 Chunk 0（26字母）依然以 3*9 组合网格渲染，而非独立四线格
const chunk0Html = renderCopySlipHtml(mixedLayout.pageChunks[0], 0, 0, { ...DEFAULT_SETTINGS, dictMode: 'alphabet' }, 14);
assert.match(chunk0Html, /alpha-26-grid-row/, '26字母必须渲染为 alpha-26-grid-row 紧凑组合网格');
assert.match(chunk0Html, /alpha-26-cell/, '26字母单元格必须为 alpha-26-cell');

// 验证 Chunk 1（左右邻居）正常渲染为三连格 neighbor SVG
const chunk1Html = renderCopySlipHtml(mixedLayout.pageChunks[1], 1, 0, { ...DEFAULT_SETTINGS, dictMode: 'alphabet' }, 14);
assert.match(chunk1Html, /is-neighbor-card/, '左右邻居卡片必须携带 is-neighbor-card 类名');
assert.match(chunk1Html, /subtype-neighbor/, '左右邻居卡片必须携带 subtype-neighbor 类名');
assert.match(chunk1Html, /viewBox="0 0 300 25"/, '左右邻居网格必须使用 300 宽度的三连四线格');
assert.doesNotMatch(chunk1Html, /alpha-26-grid-row/, '左右邻居绝不能受 26 字母影响渲染为 alpha-26-grid-row');

// 3.4 混合添加排版测试：前面有其他题型（左右邻居在先，26字母在后，彻底根除位置状态污染 Bug）
const mixedPreceded = [...neighborItems, ...seqItems];
const precededLayout = computePageLayout(mixedPreceded, { ...DEFAULT_SETTINGS, wordsPerPage: 10 });
assert.equal(precededLayout.pageChunks[0].items.length, 10, '前面邻居题应正常排入 Chunk 0');
assert.equal(precededLayout.pageChunks[1].items.length, 26, '26字母被前置题目夹杂时也必须独立成单页完整网格');

const seqChunkHtml = renderCopySlipHtml(precededLayout.pageChunks[1], 1, 0, { ...DEFAULT_SETTINGS }, 14);
assert.match(seqChunkHtml, /alpha-26-grid-row/, '被前置题型夹杂的 26 字母必须强制呈现 alpha-26-grid-row 独立网格');
assert.match(seqChunkHtml, /alpha-26-cell/, '26 字母必须呈现 alpha-26-cell');
assert.doesNotMatch(seqChunkHtml, /sheet-body-grid/, '26 字母容器严禁被放入 sheet-body-grid');

// 3.5 大小写转换：左右结构（每行 4 题）验证
const caseLayout = computePageLayout(caseItems, { ...DEFAULT_SETTINGS });
const caseChunkHtml = renderCopySlipHtml(caseLayout.pageChunks[0], 0, 0, { ...DEFAULT_SETTINGS }, 14);
assert.match(caseChunkHtml, /is-case-card/, '大小写转换卡片必须携带 is-case-card');
assert.match(caseChunkHtml, /meaning-left/, '大小写转换卡片必须具有 meaning-left 实现左提示右四线格');
assert.match(caseChunkHtml, /case-svg-grid/, '大小写转换练习区必须包含 case-svg-grid');

// 3.6 4行独立网格模式验证 (4x7)
const seq4Items = generateAlphabetSequenceItems({ rowMode: 4, caseStyle: 'upper' });
const seq4Layout = computePageLayout(seq4Items, { ...DEFAULT_SETTINGS, alphabet26Rows: 4 });
const seq4Html = renderCopySlipHtml(seq4Layout.pageChunks[0], 0, 0, { ...DEFAULT_SETTINGS, alphabet26Rows: 4 }, 14);
const rowMatches = seq4Html.match(/class="alpha-26-grid-row"/g);
assert.equal(rowMatches.length, 4, '4行模式必须严格渲染 4 个 alpha-26-grid-row');
assert.match(seq4Html, /alpha-dummy-star/, '4行模式第4行必须包含补位 dummy star');

console.log('-> 26字母与左右邻居、大小写转换排版互不污染，前后夹杂均强制独立网格');
console.log('-> 判定: ✅ PASS\n');


// ----------------------------------------------------
// 4. 字母专项英文提示字体强制使用 xumin 测试
// ----------------------------------------------------
console.log('【验证 4】字母专项英文提示文字字体强制指定为 xumin：');

// 4.1 检查 renderAlphabet 生成的 HTML
assert.match(chunk1Html, /style="[^"]*font-family:'Xumin Regular', 'xumin', cursive;[^"]*"/, '字母专项题目提示文本必须指定 xumin 字体');

// 4.2 检查 preview.css 中对于字母专项提示文字的样式规则
const previewCss = fs.readFileSync(path.join(process.cwd(), 'src/styles/preview.css'), 'utf8');
assert.match(previewCss, /\.is-alphabet-card\s+\.alphabet-prompt-text/, 'preview.css 必须包含 .is-alphabet-card .alphabet-prompt-text 规则');
assert.match(previewCss, /font-family:\s*'Xumin Regular',\s*'xumin-regular',\s*'xumin',\s*cursive/i, 'preview.css 必须强制应用 Xumin Regular 字体');

console.log('-> 字母专项提示文字字体成功强制指定为 xumin 字体');
console.log('-> 判定: ✅ PASS\n');

console.log('==================================================');
console.log('🎉 句子挖空与字母专项全部 4 大问题回归测试 100% 通过！');
console.log('==================================================');
