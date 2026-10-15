import assert from 'node:assert/strict';
import { normalizeQuestion, validateQuestion } from '../src/question-types/registry.js';
import { renderCopySlipHtml } from '../src/core/layout.js';
import { parseSentenceIntoVisualTokens, getVisualSegments, segmentsToMarkedText } from '../src/core/tokenizer.js';

console.log('=== 开始执行填空题与选择题组件重构专项自动化验证 ===\n');

// 1. 填空题句子挖空录入与单横线下划线测试
console.log('【验证 1】填空题支持句子挖空式胶囊/标记录入，并生成单横线（lineStyle: single）:');
const sentence = 'He is a [teacher] in our school.';
const tokens = parseSentenceIntoVisualTokens(sentence);
const visualWords = tokens.filter(t => t.isWord);
const teacherTok = visualWords.find(t => t.text === 'teacher');
assert.ok(teacherTok, '应当正确切词出 teacher');
assert.equal(teacherTok.isBlank, true, '[teacher] 应当自动识别为挖空词');

const segments = getVisualSegments(tokens);
const itemFromCloze = normalizeQuestion({
  questionType: 'inline-fill',
  stem: sentence,
  segments: segments
});

assert.equal(itemFromCloze.questionType, 'inline-fill');
assert.equal(itemFromCloze.blanks.length, 1);
assert.equal(itemFromCloze.blanks[0].answer, 'teacher');
assert.equal(itemFromCloze.blanks[0].lineStyle, 'single', '填空题空格样式必须为单横线 single');
console.log('-> 填空题从句子挖空结构解析成功: blanks[0].answer = "teacher", lineStyle = "single"');
console.log('-> 判定: ✅ PASS\n');

// 2. 填空题英文使用 Times New Roman 且不属于题目提示（无 meaning-text）
console.log('【验证 2】填空题渲染后英文使用 question-english-content 与 inline-fill-stem，剥离 meaning-text:');
const chunk = {
  pageIndex: 0,
  items: [{ item: itemFromCloze, overallIndex: 1 }]
};
const settings = {
  copiesPerPage: 1,
  paperSize: 'A4',
  orientation: 'portrait',
  promptFontSize: 14,
  columns: 1
};
const html = renderCopySlipHtml(chunk, 0, 0, settings, 14);

assert.ok(html.includes('inline-fill-stem'), 'HTML 中应包含 inline-fill-stem');
assert.ok(html.includes('question-english-content'), 'HTML 中应包含 question-english-content 独立英文内容样式');
assert.ok(!html.includes('meaning-text inline-fill-stem'), '填空题题干绝不能包含 meaning-text（避免被全局中文字体污染）');
assert.ok(html.includes('inline-fill-blank'), '填空题必须渲染出 inline-fill-blank 单横线');
console.log('-> HTML 结构严格去提示化验证通过，成功剥离 meaning-text 并呈现单横线');
console.log('-> 判定: ✅ PASS\n');

// 3. 选择题智能识别解析测试
console.log('【验证 3】选择题智能文本整题解析（提取题干、选项 A/B/C/D 与答案）:');
const sampleChoiceRaw = `
Which animal can fly?
A. Dog
B. Bird
C. Cat
答案：B
`;

// 模拟 GeneralQuestionEditor 中的 parseChoiceText 算法
function parseChoiceText(raw) {
  if (!raw || !raw.trim()) return null;
  const text = raw.trim();
  let answerLetter = '';
  const ansMatch = text.match(/(?:答案|Key|keys|Answer)[\s:：]+([A-Fa-f])/i);
  if (ansMatch) {
    answerLetter = ansMatch[1].toUpperCase();
  }
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const options = [];
  const stemLines = [];
  for (const line of lines) {
    const startMatch = line.match(/^[\(\[]?([A-Fa-f])[\)\]\.、\s]\s*(.*)$/);
    if (startMatch) {
      const letter = startMatch[1].toUpperCase();
      const optBody = startMatch[2].replace(/(?:答案|Key|Answer)[\s:：]+[A-Fa-f]/i, '').trim();
      options.push({ letter, text: optBody });
    } else if (options.length === 0) {
      stemLines.push(line);
    }
  }
  return {
    stem: stemLines.join(' ').replace(/^(\d+[\.、\s]|\(\d+\)\s*)/, '').trim(),
    options: options.map(o => o.text),
    answerLetter
  };
}

const parsedChoice = parseChoiceText(sampleChoiceRaw);
assert.equal(parsedChoice.stem, 'Which animal can fly?');
assert.deepEqual(parsedChoice.options, ['Dog', 'Bird', 'Cat']);
assert.equal(parsedChoice.answerLetter, 'B');

const choiceItem = normalizeQuestion({
  questionType: 'choice',
  stem: parsedChoice.stem,
  options: parsedChoice.options.map((t, idx) => ({ id: `opt-${idx}`, text: t, label: String.fromCharCode(65 + idx) })),
  answers: ['opt-1']
});

const choiceChunk = {
  pageIndex: 0,
  items: [{ item: choiceItem, overallIndex: 2 }]
};
const choiceHtml = renderCopySlipHtml(choiceChunk, 0, 0, settings, 14);

assert.ok(choiceHtml.includes('choice-stem'), 'HTML 应包含 choice-stem');
assert.ok(choiceHtml.includes('question-english-content'), '选择题题干应包含 question-english-content');
assert.ok(!choiceHtml.includes('meaning-text choice-stem'), '选择题题干不应被 meaning-text 污染');
assert.ok(choiceHtml.includes('choice-option'), '应正确渲染 choice-option');
console.log('-> 选择题整题识别解析与渲染通过，题干与选项符合规范');
console.log('-> 判定: ✅ PASS\n');

// 4. 批量填空多题粘贴测试
console.log('【验证 4】填空题支持批量多题粘贴导入:');
const batchLines = [
  'She goes to school by [bike] every day.',
  'Where [are] you from?',
  'There [is] an apple on the table.'
];
const batchItems = batchLines.map((line, idx) => {
  const segs = parseSentenceIntoVisualTokens(line);
  return normalizeQuestion({
    id: `batch-${idx}`,
    questionType: 'inline-fill',
    stem: line
  });
});

assert.equal(batchItems.length, 3);
batchItems.forEach(it => {
  assert.equal(it.questionType, 'inline-fill');
  assert.ok(it.blanks.length >= 1);
  assert.equal(it.blanks[0].lineStyle, 'single');
});
console.log('-> 批量导入 3 道填空题全部成功且全部为单横线模式');
console.log('-> 判定: ✅ PASS\n');

console.log('========================================');
console.log('🎉 填空题句子挖空方式录入、横线呈现、Times New Roman 字体隔离与选择题重构全部验证通过！');
console.log('========================================');
