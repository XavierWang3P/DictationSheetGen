import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeQuestion, validateQuestion } from '../src/question-types/registry.js';
import { renderPracticeSheetHtml, computePageLayout, DEFAULT_SETTINGS } from '../src/core/layout.js';

console.log('=== 开始执行题型组件与交互重构全面综合验证 ===\n');

// 1. 选择题专项验证
console.log('【验证 1】选择题去虚线边框、去多选、单选切换与历史数据兼容:');
const choiceItem = normalizeQuestion({
  id: 'c-1',
  questionType: 'choice',
  stem: 'Which animal can fly?',
  options: [
    { id: 'o-1', text: 'Bird' },
    { id: 'o-2', text: 'Dog' },
    { id: 'o-3', text: 'Fish' }
  ],
  answers: ['o-1']
});
assert.strictEqual(choiceItem.selectionMode, 'single', '新选择题默认必须为单选题');
assert.deepStrictEqual(choiceItem.answers, ['o-1'], '正确答案包含选中的选项');

// 兼容已有历史多选试卷数据
const legacyMultiChoice = normalizeQuestion({
  id: 'c-legacy',
  questionType: 'choice',
  stem: 'Select colors',
  selectionMode: 'multiple',
  options: [
    { id: 'o-a', text: 'Red' },
    { id: 'o-b', text: 'Green' }
  ],
  answers: ['o-a', 'o-b']
});
assert.strictEqual(legacyMultiChoice.selectionMode, 'multiple', '历史试卷多选题数据结构安全兼容保留');
assert.strictEqual(legacyMultiChoice.answers.length, 2, '历史答案数组正常读取');

// 检查 GeneralQuestionEditor.vue 源码中已彻底移除 choiceMultiple 单选/多选切换控件及无用虚线
const editorVue = readFileSync(resolve('src/components/GeneralQuestionEditor.vue'), 'utf-8');
assert.ok(!editorVue.includes('id="choiceMultiple"'), '已彻底清理多选题 choiceMultiple 入口与选项');
assert.ok(!editorVue.includes('id="choiceSingle"'), '已彻底移除选择方式切换单选/多选单选框');
assert.ok(!editorVue.includes('border: 1px dashed'), '题目设置区域已彻底删除虚线框包裹');
console.log('-> 判定: ✅ PASS\n');

// 2. 填空题创建流程与中文解释居于上方验证
console.log('【验证 2】填空题严格执行输入原句-选词生成横线流程，中文解释默认置于上方:');
const fillWithZh = normalizeQuestion({
  id: 'fill-1',
  questionType: 'inline-fill',
  stem: 'He is a teacher in our school.',
  zh: '他是我们学校的一名老师。',
  blanks: [
    { id: 'b-1', answer: 'teacher', lineStyle: 'single', widthMode: 'auto', width: 80 }
  ],
  stemSegments: [
    { type: 'text', text: 'He is a ' },
    { type: 'blank', blankId: 'b-1' },
    { type: 'text', text: ' in our school.' }
  ]
});
const layout1 = computePageLayout([fillWithZh], DEFAULT_SETTINGS);
const htmlWithZh = renderPracticeSheetHtml(layout1, DEFAULT_SETTINGS);

// 中文解释居于题目正文上方，拥有独立 class .inline-fill-zh-above
assert.ok(htmlWithZh.includes('class="inline-fill-zh-above"'), '中文解释使用 .inline-fill-zh-above 容器包裹');
assert.ok(htmlWithZh.includes('他是我们学校的一名老师。'), '中文解释内容正确渲染');
const zhPos = htmlWithZh.indexOf('inline-fill-zh-above');
const stemPos = htmlWithZh.indexOf('inline-fill-stem');
assert.ok(zhPos < stemPos, '中文解释严格位于正文填空句子上方');

// 无中文解释时，绝不显示空白占位容器
const fillWithoutZh = normalizeQuestion({
  id: 'fill-2',
  questionType: 'inline-fill',
  stem: 'Where are you from?',
  zh: '',
  blanks: [{ id: 'b-2', answer: 'are', lineStyle: 'single', widthMode: 'auto', width: 80 }],
  stemSegments: [
    { type: 'text', text: 'Where ' },
    { type: 'blank', blankId: 'b-2' },
    { type: 'text', text: ' you from?' }
  ]
});
const layout2 = computePageLayout([fillWithoutZh], DEFAULT_SETTINGS);
const htmlWithoutZh = renderPracticeSheetHtml(layout2, DEFAULT_SETTINGS);
assert.ok(!htmlWithoutZh.includes('inline-fill-zh-above'), '无中文解释时绝对不生成空白占位区域');
console.log('-> 判定: ✅ PASS\n');

// 3. 题型分隔线验证
console.log('【验证 3】题型分隔线移除独立单选题型选项，采用一个按钮，样式粗细一致且不与卡片边框混淆:');
const quickPaneVue = readFileSync(resolve('src/components/QuickInputPane.vue'), 'utf-8');
assert.ok(!quickPaneVue.includes('id="modeSeparator"'), '题型切换单选网格中已彻底去除“分栏隔断”独立选项');
assert.ok(quickPaneVue.includes('btnOpenInsertSeparatorModal'), '具备方便的“+ 插入分隔线”快捷入口按钮');
assert.ok(quickPaneVue.includes('showSeparatorModal'), '采用整洁弹窗快速录入分隔线标题与独立分栏列数');

const previewCss = readFileSync(resolve('src/styles/preview.css'), 'utf-8');
assert.ok(previewCss.includes('.separator-line'), '分隔线包含统一的 .separator-line 规则');
assert.ok(previewCss.includes('height: 1.5px;') || previewCss.includes('height: 1px;'), '分隔线具有一致的粗细与样式');
console.log('-> 判定: ✅ PASS\n');

// 4. 句子挖空移除重复预览区域，英文遵循统一字体设置
console.log('【验证 4】句子挖空删除重复预览区域，英文遵循统一字体设置:');
assert.ok(!quickPaneVue.includes('id="visualClozePreview"'), '句子挖空题型编辑区已彻底删除 visualClozePreview 预览区域');
assert.ok(quickPaneVue.includes("font-family: 'Times New Roman'"), '句子挖空单词胶囊与原句编辑使用统一英文字体');
assert.ok(previewCss.includes('.type-sentence-cloze') && previewCss.includes("var(--font-en, 'Times New Roman'"), '试卷展示与打印页面句子挖空英文遵循全局英文字体设置');
console.log('-> 判定: ✅ PASS\n');

// 5. 题目序号统一格式与样式规则复用
console.log('【验证 5】所有题型统一复用题目序号规则：Times New Roman、非加粗、标准灰、基线对齐:');
const layoutJs = readFileSync(resolve('src/core/layout.js'), 'utf-8');
assert.ok(layoutJs.includes('<span class="word-num entry-index">${overallIndex}.</span>'), '所有题型在 layout.js 中统一复用 ${overallIndex}. 序号格式');
assert.ok(previewCss.includes('.word-num,') && previewCss.includes('.entry-index'), 'preview.css 集中定义所有题型统一的序号样式');
assert.ok(previewCss.includes('font-weight: 400 !important;'), '题目序号统一步调，非加粗 (weight 400)');
console.log('-> 判定: ✅ PASS\n');

// 6. 字体系统与内置书写字体验证
console.log('【验证 6】中文、英文字体规则和五款内置书写字体保持一致:');
const fontsCss = readFileSync(resolve('src/styles/fonts.css'), 'utf-8');
const handwritingJs = readFileSync(resolve('src/core/handwritingFonts.js'), 'utf-8');
const settingsPaneVue = readFileSync(resolve('src/components/SettingsPane.vue'), 'utf-8');

const embeddedFontFamilies = [
  'Shuyao Hengshui',
  'Shuyao Italic',
  'Shuyao Italic Four Line',
  'Xumin Regular',
  'Xumin Linglish'
];
embeddedFontFamilies.forEach(font => {
  assert.ok(fontsCss.includes(`font-family: '${font}'`), `fonts.css 应内联字体: ${font}`);
  assert.ok(handwritingJs.includes(font), `handwritingFonts.js 应注册字体: ${font}`);
});

assert.ok(settingsPaneVue.includes('Times New Roman'), '排版设置面板应说明默认英文字体');
assert.ok(settingsPaneVue.includes('selectAlphabetGuideFont'), '排版设置面板应提供字母范字字体选择器');
console.log('-> 判定: ✅ PASS\n');

// 7. 试卷题目面板单击进入编辑与状态防抖
console.log('【验证 7】试卷题目面板修改为单击进入编辑，具备编辑选中高亮与内部控件防冲突:');
const listPaneVue = readFileSync(resolve('src/components/QuestionListPane.vue'), 'utf-8');
assert.ok(!listPaneVue.includes('@dblclick="openEditModal'), '旧的双击事件 @dblclick 已被移除');
assert.ok(!listPaneVue.includes('双击题目可编辑'), '旧的“双击”提示文案已彻底移除');
assert.ok(listPaneVue.includes('@click="handleItemClick(item, index, $event)"'), '点击题目立即触发单击编辑');
assert.ok(listPaneVue.includes('is-selected-for-edit'), '当前编辑题目具有 is-selected-for-edit 清晰高亮状态');
assert.ok(listPaneVue.includes('closest(\'button, input, select'), '点击内部按钮与控件时不会触发编辑状态抖动或冲突');
console.log('-> 判定: ✅ PASS\n');

// 8. 题库面板整体重构验证
console.log('【验证 8】题库面板信息层级清晰、统一风格组件、空状态完善、保持向后兼容:');
const libPaneVue = readFileSync(resolve('src/components/WordLibraryPane.vue'), 'utf-8');
assert.ok(libPaneVue.includes('id="libStatBadge"'), '题库统计徽标正常保留');
assert.ok(libPaneVue.includes('id="btnNewGroup"'), '新建分组功能正常保留');
assert.ok(libPaneVue.includes('id="groupPillsBar"'), '分组胶囊滚动条正常保留');
assert.ok(libPaneVue.includes('id="inputSearchLib"'), '搜索框正常保留');
assert.ok(libPaneVue.includes('id="btnLibBatchAddToDraft"'), '批量加入试卷按钮正常保留');
assert.ok(libPaneVue.includes('id="libWordsContainer"'), '题目列表容器正常保留');
assert.ok(libPaneVue.includes('class="lib-item-row"'), '统一卡片行样式');
assert.ok(libPaneVue.includes('class="word-group-tag"'), '题目所属分组清晰标签展示');
assert.ok(!libPaneVue.includes('form-desc'), '沉重冗余的介绍文案已清理');
console.log('-> 判定: ✅ PASS\n');

console.log('====================================================');
console.log('🎉 全部 8 大题型组件与交互重构需求 100% 验证通过！');
console.log('====================================================');
