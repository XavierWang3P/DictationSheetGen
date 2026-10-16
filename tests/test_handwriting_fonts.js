import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  createNeighborPracticeGridSvg,
  createCasePracticeGridSvg,
  computePageLayout,
  renderPracticeSheetHtml,
  DEFAULT_SETTINGS
} from '../src/core/layout.js';

const projectRoot = process.cwd();
const fontsCss = fs.readFileSync(path.join(projectRoot, 'src/styles/fonts.css'), 'utf8');
const settingsSource = fs.readFileSync(path.join(projectRoot, 'src/components/SettingsPane.vue'), 'utf8');
const layoutSource = fs.readFileSync(path.join(projectRoot, 'src/core/layout.js'), 'utf8');

const expectedAssets = [
  'shuyao-hengshui.ttf',
  'shuyao-italic.ttf',
  'shuyao-italic-four-line.ttf',
  'xumin-regular.ttf',
  'xumin-linglish.ttf'
];

for (const filename of expectedAssets) {
  assert.ok(fs.existsSync(path.join(projectRoot, 'src/assets/fonts', filename)), `缺少内置字体 ${filename}`);
}

assert.ok((fontsCss.match(/@font-face/g) || []).length >= 7, '两款界面字体和五款书写字体必须全部通过 @font-face 内置');
assert.match(settingsSource, /id="selectAlphabetGuideFont"/, '设置区必须提供独立的字母范字字体选择器');
assert.doesNotMatch(layoutSource, /Century Gothic/, '字母范字不得继续硬编码 Century Gothic');
assert.match(DEFAULT_SETTINGS.alphabetGuideFont, /Shuyao Italic/, '新建字母练习应默认使用规范手写体');

const neighborHtml = createNeighborPracticeGridSvg({
  neighborData: { type: 'both', midChar: 'g', prevChar: 'f', nextChar: 'h' }
}, {
  gridHeightMm: 11,
  alphabetGuideFont: "'Shuyao Italic', cursive"
});

assert.match(neighborHtml, /alphabet-grid-lines/, '格线必须使用独立的可拉伸图层');
assert.match(neighborHtml, /alphabet-guide-layer/, '范字必须使用独立的不变形图层');
assert.match(neighborHtml, /y="66%"/, '范字基线必须落在四线三格的第三条线上');
assert.match(neighborHtml, /font-family="Shuyao Italic, cursive"/, '范字应使用所选内置字体');

const caseHtml = createCasePracticeGridSvg({
  caseData: { dir: 'lower_to_upper', upper: 'Q', lower: 'q' }
}, {
  gridHeightMm: 11,
  alphabetGuideFont: "'Xumin Linglish', cursive"
});
assert.match(caseHtml, /alphabet-guide-layer/, '大小写转换题也必须使用独立范字层');
assert.match(caseHtml, /font-family="Xumin Linglish, cursive"/, '大小写转换题应继承范字字体');

const threeCopyItems = Array.from({ length: 9 }, (_, index) => ({
  id: `alpha-three-copy-${index + 1}`,
  type: 'word',
  questionType: 'alphabet',
  en: '',
  zh: `邻居: ___  ${String.fromCharCode(66 + index)}  ___`,
  prompt: `邻居: ___  ${String.fromCharCode(66 + index)}  ___`,
  neighborData: {
    type: 'both',
    midChar: String.fromCharCode(66 + index),
    prevChar: '',
    nextChar: ''
  }
}));
const threeCopySettings = {
  ...DEFAULT_SETTINGS,
  dictMode: 'alphabet',
  copiesPerPage: 3,
  columns: 3,
  wordsPerPage: 9,
  gridHeight: 12
};
const threeCopyLayout = computePageLayout(threeCopyItems, threeCopySettings);
const threeCopyHtml = renderPracticeSheetHtml(threeCopyLayout, threeCopySettings);
assert.match(threeCopyHtml, /alphabet-grid-shell" style="height:11mm;/, '每页3份的字母专项应使用11mm格高');
assert.match(threeCopyHtml, /font-size="7\.777mm"/, '三联舒窈意大利斜体范字应随11mm格高放大');

console.log('PASS: 手写字体内置、范字字体选择与四线三格基线回归测试通过');
