import assert from 'node:assert/strict';
import { generateAlphabetSequenceItems, generateLetterNeighborsItems, generateCaseConversionItems } from '../src/core/alphabet.js';
import { computePageLayout, renderCopySlipHtml, renderPracticeSheetHtml, DEFAULT_SETTINGS } from '../src/core/layout.js';
import { normalizeQuestion } from '../src/question-types/registry.js';

console.log('=== 开始执行字母全默写与混合题型新特性自动化验证 ===\n');

// 1. 验证题号遵循全局设定（前置题号继承）
console.log('【验证 1】题号遵循全局设定（前置题目题号连续顺延）:');
const preWords = [
  normalizeQuestion({ en: 'pen', zh: '钢笔' }),
  normalizeQuestion({ en: 'book', zh: '书' }),
  normalizeQuestion({ en: 'bag', zh: '书包' })
];
const seqItems = generateAlphabetSequenceItems({ caseStyle: 'pair' });
const mixedPre = [...preWords, ...seqItems];
const res1 = computePageLayout(mixedPre, { ...DEFAULT_SETTINGS, copiesPerPage: 1 });
const page0Items = res1.pageChunks[0].items;

assert.equal(page0Items[0].overallIndex, 1);
assert.equal(page0Items[1].overallIndex, 2);
assert.equal(page0Items[2].overallIndex, 3);
// 字母全默写第一个字母 A 应顺延为第 4 题
assert.equal(page0Items[3].overallIndex, 4);
assert.equal(page0Items[28].overallIndex, 29);
console.log('-> 题号顺延验证通过: 单词题 1~3, 字母题 4~29');
console.log('-> 判定: ✅ PASS\n');

// 2. 验证题号遵循全局字号与样式
console.log('【验证 2】字母格序号字号遵循全局 promptFontSize 与不加粗样式:');
const slipHtml1 = renderCopySlipHtml(res1.pageChunks[0], 0, 0, { ...DEFAULT_SETTINGS, promptFontSize: 16 }, 16);
assert.match(slipHtml1, /class="alpha-cell-top" style="font-size:16pt;"/);
assert.match(slipHtml1, /<span class="word-num entry-index">4\.<\/span>/);
console.log('-> promptFontSize:16pt 成功穿透至 alpha-cell-top');
console.log('-> 判定: ✅ PASS\n');

// 3. 验证字母全默写、左右邻居、大小写转换同页并存与各自独立分列
console.log('【验证 3】全默写 + 左右邻居 + 大小写转换同页并存与独立分列规则:');
const neighItems = generateLetterNeighborsItems({ count: 5 });
const caseItems = generateCaseConversionItems({ count: 4 });
const allMixed = [...seqItems, ...neighItems, ...caseItems]; // 26 + 5 + 4 = 35 items
const res2 = computePageLayout(allMixed, { ...DEFAULT_SETTINGS, copiesPerPage: 1 });
assert.equal(res2.totalPages, 1, '在 A4 充足高度下应合并排入单页');
assert.equal(res2.pageChunks[0].items.length, 35);

const mixedSlipHtml = renderCopySlipHtml(res2.pageChunks[0], 0, 0, DEFAULT_SETTINGS, 14);
assert.match(mixedSlipHtml, /class="alphabet-26-section-block"/);
assert.match(mixedSlipHtml, /class="alpha-26-grid-row"/);
assert.match(mixedSlipHtml, /is-neighbor-card/);
assert.match(mixedSlipHtml, /is-case-card/);
assert.match(mixedSlipHtml, /grid-column:\s*span\s*12/); // 5 列 (60/5)
assert.match(mixedSlipHtml, /grid-column:\s*span\s*15/); // 4 列 (60/4)
console.log('-> 同页并存且 26 字母为 3x9 网格、左右邻居为 span 12 (5列)、大小写为 span 15 (4列)');
console.log('-> 判定: ✅ PASS\n');

// 4. 验证多联拼版 (copiesPerPage = 2 / 3) 对 26 字母生效
console.log('【验证 4】26 字母全默写遵循全局 copiesPerPage 联数设定:');
const res3 = computePageLayout(seqItems, { ...DEFAULT_SETTINGS, copiesPerPage: 2 });
assert.equal(res3.copiesPerPage, 2);
const sheetHtml3 = renderPracticeSheetHtml(res3, { ...DEFAULT_SETTINGS, copiesPerPage: 2 });
const slipMatches = sheetHtml3.match(/sheet-copy-section/g);
assert.equal(slipMatches.length, 2, '页面应渲染 2 份试卷');
console.log('-> copiesPerPage: 2 成功输出 2 联字母全默写试卷');
console.log('-> 判定: ✅ PASS\n');

console.log('========================================');
console.log('🎉 字母全默写序号、混合同页并存与多联特性全部验证通过！');
console.log('========================================');
