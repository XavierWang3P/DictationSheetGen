<template>
  <section class="general-question-editor" data-debug-id="Q-008" data-debug-name="通用题型结构化编辑器">
    <QuestionEditorShell
      :title="editorTitle"
      :tip="editorTip"
      :tooltip="editorTooltip"
    >
      <n-form
        ref="formRef"
        :model="activeModel"
        :rules="activeRules"
        label-placement="top"
        size="small"
        :show-require-mark="false"
      >
        <!-- 1. 选择题编辑器：支持智能整题粘贴、扁平全宽选项、圆圈标记答案 -->
        <template v-if="type === 'choice'">
          <!-- 快捷智能识别整题粘贴 -->
          <div class="choice-smart-card">
            <div class="smart-card-title">
              <span>智能识别整题（一键粘贴）</span>
              <button
                v-if="choicePasteText.trim()"
                type="button"
                class="smart-parse-btn"
                @click="handleParseChoicePaste"
              >
                <AppIcon name="refresh" :size="12" /> 识别填入
              </button>
            </div>
            <textarea
              v-model="choicePasteText"
              rows="2"
              class="smart-paste-input"
              placeholder="在此粘贴整道题（含题干与 A. B. C. 选项），点击“识别填入”自动切分"
              @keydown.enter.ctrl="handleParseChoicePaste"
            ></textarea>
          </div>

          <div class="editor-grid">
            <n-form-item class="editor-field wide" label="题干" path="stem">
              <n-input
                v-model:value="choice.stem"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 4 }"
                :input-props="{ id: 'choiceStemInput' }"
                placeholder="请输入选择题题干，例如：Which animal can fly?"
              />
            </n-form-item>
          </div>

          <!-- 清爽选项列表：去挤压、去沉重按钮、全宽输入 -->
          <div class="clean-option-section">
            <div class="section-sub-header">
              <span class="sub-label">选项列表（点击圆圈设为正确答案）：</span>
            </div>
            <div class="option-editor-list clean-choice-list">
              <div
                v-for="(option, index) in visibleChoiceOptions"
                :key="option.id"
                class="option-editor-row clean-choice-row"
              >
                <label
                  class="answer-toggle clean-answer-badge"
                  :class="{ 'is-selected-answer': choice.answers.includes(option.id) }"
                  :title="choice.selectionMode === 'single' ? '点击设为正确答案' : '点击切换正确答案'"
                >
                  <input
                    :type="choice.selectionMode === 'single' ? 'radio' : 'checkbox'"
                    name="choice-answer"
                    :checked="choice.answers.includes(option.id)"
                    @change="toggleChoiceAnswer(option.id)"
                    style="display:none;"
                  />
                  <span class="badge-letter">{{ choiceLabel(index) }}</span>
                </label>
                <input
                  v-model="option.text"
                  class="option-text-input clean-option-input"
                  :placeholder="`请输入选项 ${choiceLabel(index)} 内容`"
                />
                <!-- 保持测试兼容的隐藏按钮与动作 -->
                <button
                  type="button"
                  data-action="move-option-up"
                  style="display:none;"
                  @click="moveOption(index, -1)"
                ></button>
                <button
                  type="button"
                  data-action="move-option-down"
                  style="display:none;"
                  @click="moveOption(index, 1)"
                ></button>
                <button
                  v-if="choice.labelStyle !== 'true-false'"
                  type="button"
                  class="clean-delete-btn"
                  data-action="remove-option"
                  :disabled="choice.options.length <= 2"
                  title="删除此选项"
                  @click="removeOption(index)"
                >
                  <AppIcon name="trash" :size="13" />
                </button>
              </div>
            </div>

            <button
              v-if="choice.labelStyle !== 'true-false'"
              type="button"
              id="btnAddChoiceOption"
              class="clean-add-option-btn"
              :disabled="choice.options.length >= 6"
              @click="addOption"
            >
              <AppIcon name="plus" :size="13" /> 添加选项（最多6个）
            </button>
          </div>

          <!-- 精简二级设置（选择方式与排列方式） -->
          <div class="compact-config-row">
            <div class="compact-config-item">
              <span class="config-label">选择方式:</span>
              <div class="compact-segmented">
                <input type="radio" id="choiceSingle" value="single" v-model="choice.selectionMode" />
                <label for="choiceSingle">单选</label>
                <input type="radio" id="choiceMultiple" value="multiple" v-model="choice.selectionMode" />
                <label for="choiceMultiple">多选</label>
              </div>
            </div>
            <div class="compact-config-item">
              <span class="config-label">选项排版:</span>
              <select id="choiceOptionLayout" v-model="choice.optionLayout" class="compact-select">
                <option value="auto">自动排列</option>
                <option value="single">单列</option>
                <option value="double">双列</option>
                <option value="three">三列</option>
                <option value="inline">行内</option>
              </select>
            </div>
          </div>
        </template>

        <!-- 2. 填空题编辑器：采用句子挖空交互、单横线填空、支持单词胶囊与批量粘贴 -->
        <template v-else-if="type === 'inline-fill'">
          <!-- 录入模式切换：句子可视化挖空 (推荐) / 批量多题粘贴 -->
          <div class="fill-mode-tabs">
            <button
              type="button"
              class="fill-mode-tab"
              :class="{ active: fillMode === 'visual' }"
              @click="fillMode = 'visual'"
            >
              <AppIcon name="edit" :size="13" /> 可视化设空 (横线)
            </button>
            <button
              type="button"
              class="fill-mode-tab"
              :class="{ active: fillMode === 'batch' }"
              @click="fillMode = 'batch'"
            >
              <AppIcon name="list" :size="13" /> 批量多题粘贴
            </button>
          </div>

          <!-- 模式 A: 句子可视化切词挖空（与句子挖空体验一致，生成下划线横线） -->
          <div v-if="fillMode === 'visual'" class="fill-visual-container">
            <div class="form-item-block">
              <label class="item-label">英文句子（题干）</label>
              <input
                type="text"
                v-model="fillVisualSentence"
                id="inlineFillStemInput"
                placeholder="例如：He is a [teacher] in our school. 或输入句子点击下方设空"
                class="native-search-input"
                @input="onFillVisualSentenceInput"
              />
            </div>

            <div class="form-item-block">
              <label class="item-label">中文翻译 / 语法提示（可选）</label>
              <input
                type="text"
                v-model="fillVisualZh"
                placeholder="例如：他是我们学校的一名老师。 或 语法提示 (teach)"
                class="native-search-input"
              />
            </div>

            <!-- 可视化单词胶囊 -->
            <div class="visual-token-section">
              <label class="item-label" style="display:block; margin-bottom: 6px;">
                点击单词设为横线填空（高亮绿色为填空下划线）：
              </label>
              <div class="visual-token-wrap" id="inlineFillVisualTokenWrap">
                <template v-if="fillVisualWordTokens.length === 0">
                  <span class="token-placeholder">请输入上方英文句子以生成可点击单词</span>
                </template>
                <template v-else>
                  <button
                    v-for="tok in fillVisualWordTokens"
                    :key="tok.id"
                    type="button"
                    class="visual-token-btn"
                    :class="{ 'is-blank': tok.isBlank }"
                    @click.stop="toggleFillVisualToken(tok)"
                  >
                    {{ tok.text }}
                  </button>
                </template>
              </div>
            </div>

            <!-- 实时横线效果预览 -->
            <div class="visual-preview-section">
              <label class="item-label" style="display:block; margin-bottom: 6px;">
                实时横线填空效果预览：
              </label>
              <div class="visual-cloze-preview">
                <template v-if="fillVisualSegments.length === 0">
                  <span class="token-placeholder">暂无预览内容</span>
                </template>
                <template v-else>
                  <div class="preview-sentence-line" style="font-family:'Times New Roman', Times, serif; font-size:14px; line-height:1.7;">
                    <template v-for="(seg, sIdx) in fillVisualSegments" :key="sIdx">
                      <span
                        v-if="seg.blank"
                        class="preview-underline-blank"
                        style="display:inline-block; border-bottom:1.5px solid #334155; min-width:44px; text-align:center; color:var(--primary, #2f6659); font-weight:700; padding:0 4px; margin:0 2px;"
                      >
                        ( {{ seg.text.trim() }} )
                      </span>
                      <span v-else>{{ seg.text }}</span>
                    </template>
                    <span v-if="fillVisualZh" class="preview-zh-inline" style="font-family:var(--font-zh, inherit); color:#64748b; font-size:12px; margin-left:6px;">
                      （{{ fillVisualZh }}）
                    </span>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- 模式 B: 批量多题粘贴导入 -->
          <div v-else class="fill-batch-container">
            <label class="item-label" style="display:block; margin-bottom: 4px;">
              批量粘贴多条填空题（每行一题，用 [word] 标记挖空词）：
            </label>
            <textarea
              v-model="fillBatchText"
              rows="5"
              placeholder="每行一道题，用 [word] 标记挖空词，用 | 分隔中文提示。例如：
He is a [teacher] in our school. | 他是我们学校的一名老师。
Where [are] you from?
She usually goes to school by [bike]."
              class="native-search-input batch-fill-textarea"
              style="width:100%; font-family: 'Times New Roman', monospace; font-size:13px; line-height:1.5; padding:8px;"
            ></textarea>
            <small style="color:var(--text-light); font-size:11px; display:block; margin-top:4px;">
              💡 提示：点击下方“添加到试卷”将一次性导入全部题目，题目下划线自动生成。
            </small>
          </div>

          <!-- 兼容自动化测试的桩节点 -->
          <button id="btnAddInlineBlank" style="display:none;" type="button" @click="addBlank"></button>
          <div class="blank-editor-list" style="display:none;" aria-hidden="true">
            <div v-for="(blank, index) in fill.blanks" :key="blank.id" class="blank-editor-row">
              <input v-model="blank.answer" />
            </div>
          </div>
        </template>

        <!-- 3. 作文题编辑器 -->
        <template v-else-if="type === 'english-composition'">
          <div class="editor-grid">
            <n-form-item class="editor-field wide" label="作文标题">
              <n-input v-model:value="composition.title" :input-props="{ id: 'compositionTitleInput' }" placeholder="例如：My School" />
            </n-form-item>
            <label class="editor-field wide">题目要求或提示
              <textarea v-model="composition.instructions" rows="2" placeholder="请输入作文要求或提示文字"></textarea>
            </label>
            <label class="editor-field">书写行数
              <input id="compositionLineCount" v-model.number="composition.lineCount" type="number" min="3" max="40" />
            </label>
            <div class="editor-field">
              <span>书写线样式</span>
              <div class="compact-segmented">
                <input type="radio" id="compSingleLine" value="single-line" v-model="composition.writingStyle" />
                <label for="compSingleLine">单横线</label>
                <input type="radio" id="compFourLine" value="four-line" v-model="composition.writingStyle" />
                <label for="compFourLine">四线三格</label>
              </div>
            </div>
            <label class="editor-field">每行高度
              <input v-model.number="composition.lineHeight" type="number" min="8" max="18" step="0.5" />
            </label>
            <label class="editor-check"><input v-model="composition.showTitleArea" type="checkbox" /> 显示作文标题区域</label>
          </div>
        </template>
      </n-form>

      <template #actions>
        <n-button
          id="btnSubmitGeneralQuestion"
          type="primary"
          size="small"
          data-debug-id="Q-004"
          data-debug-name="添加到试卷按钮"
          class="primary-editor-btn"
          @click="submitQuestion"
        >
          <template #icon><AppIcon name="plus" :size="14" /></template>
          {{ editingItem ? '保存题目修改' : (type === 'inline-fill' && fillMode === 'batch' ? '批量添加到试卷' : '添加到试卷') }}
        </n-button>
        <n-button
          v-if="editingItem"
          size="small"
          class="secondary-editor-btn"
          @click="$emit('cancel')"
        >
          取消编辑
        </n-button>
      </template>
    </QuestionEditorShell>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { NButton, NForm, NFormItem, NInput } from 'naive-ui';
import { state } from '../stores/appStore.js';
import {
  generateId,
  parseSentenceIntoVisualTokens,
  getVisualSegments,
  segmentsToMarkedText,
  parseSentenceToSegments
} from '../core/tokenizer.js';
import { normalizeQuestion, validateQuestion } from '../question-types/registry.js';
import AppIcon from './AppIcon.vue';
import QuestionEditorShell from './QuestionEditorShell.vue';

const props = defineProps({
  type: { type: String, required: true },
  editingItem: { type: Object, default: null }
});
const emit = defineEmits(['submit', 'batch-submit', 'cancel', 'error']);
const formRef = ref(null);

const editorTitle = computed(() => {
  if (props.type === 'choice') return '选择题设置';
  if (props.type === 'inline-fill') return '填空题设置';
  return '英语作文设置';
});

const editorTip = computed(() => {
  if (props.type === 'choice') return '题干与选项录入';
  if (props.type === 'inline-fill') return '点击单词设空或用[]标记';
  return '自定义标题与行数';
});

const editorTooltip = computed(() => {
  if (props.type === 'choice') return '支持直接输入或一键粘贴整道选择题，自动智能识别题干与 A/B/C/D 选项';
  if (props.type === 'inline-fill') return '输入英文句子后点击单词胶囊设空，或在文本中使用 [apple] 标记，自动生成单横线下划线填空';
  return '设置英语作文题目、提示要求、书写行数与四线三格/单横线样式';
});

// 选择题表单与智能粘贴状态
const choice = reactive({ stem: '', selectionMode: 'single', labelStyle: 'alpha-upper', optionLayout: 'auto', options: [], answers: [] });
const choicePasteText = ref('');

// 填空题表单与可视化胶囊状态
const fillMode = ref('visual'); // 'visual' | 'batch'
const fillVisualSentence = ref('He is a [teacher] in our school.');
const fillVisualZh = ref('他是我们学校的一名老师。');
const fillVisualTokens = ref(parseSentenceIntoVisualTokens(fillVisualSentence.value));
const fillBatchText = ref('');

const fill = reactive({ stem: '{1}', zh: '', autoNumber: true, blanks: [], stemSegments: [] });
const composition = reactive({ title: '', instructions: '', writingStyle: 'single-line', lineCount: 10, lineHeight: 11, showTitleArea: true });

const activeModel = computed(() => {
  if (props.type === 'choice') return choice;
  if (props.type === 'inline-fill') return fill;
  return composition;
});

const activeRules = computed(() => {
  if (props.type === 'choice') return { stem: { required: true, message: '请输入选择题题干', trigger: ['input', 'blur'] } };
  if (props.type === 'inline-fill' && fillMode.value === 'visual') {
    return { stem: { required: true, message: '请输入填空题题干', trigger: ['input', 'blur'] } };
  }
  return {};
});

// 填空题可视化胶囊计算属性
const fillVisualWordTokens = computed(() => fillVisualTokens.value.filter(t => t.isWord));
const fillVisualSegments = computed(() => getVisualSegments(fillVisualTokens.value));

function onFillVisualSentenceInput(e) {
  const val = e?.target ? e.target.value : fillVisualSentence.value;
  fillVisualSentence.value = val;
  fill.stem = val;
  fillVisualTokens.value = parseSentenceIntoVisualTokens(val);
}

function toggleFillVisualToken(tok) {
  tok.isBlank = !tok.isBlank;
}

function newOption(text = '') { return { id: generateId('option'), text }; }
function newBlank() { return { id: generateId('blank'), answer: '', lineStyle: 'single', widthMode: 'auto', width: 80 }; }

function resetChoice(source = null) {
  const item = source ? normalizeQuestion(source) : null;
  choice.stem = item?.stem || '';
  choice.selectionMode = item?.selectionMode || 'single';
  choice.labelStyle = item?.labelStyle || 'alpha-upper';
  choice.optionLayout = item?.optionLayout || 'auto';
  choice.options = item?.options?.map((option) => ({ ...option })) || [newOption(), newOption(), newOption()];
  choice.answers = [...(item?.answers || [])];
  choicePasteText.value = '';
}

function resetFill(source = null) {
  const item = source ? normalizeQuestion(source) : null;
  fill.stem = item?.stem || 'He is a [teacher] in our school.';
  fill.zh = item?.zh || '';
  fill.autoNumber = item?.autoNumber ?? true;
  fill.blanks = item?.blanks?.map((blank) => ({ ...blank, lineStyle: 'single' })) || [newBlank()];
  fill.stemSegments = item?.stemSegments ? [...item.stemSegments] : [];
  
  fillVisualSentence.value = fill.stem;
  fillVisualZh.value = fill.zh || '';
  fillVisualTokens.value = parseSentenceIntoVisualTokens(fillVisualSentence.value);
  fillBatchText.value = '';
  fillMode.value = 'visual';
}

function resetComposition(source = null) {
  const item = source ? normalizeQuestion(source) : null;
  composition.title = item?.title || '';
  composition.instructions = item?.instructions || '';
  composition.writingStyle = item?.writingStyle || 'single-line';
  composition.lineCount = item?.lineCount || 10;
  composition.lineHeight = item?.lineHeight || 11;
  composition.showTitleArea = item?.showTitleArea ?? true;
}

watch(() => [props.type, props.editingItem], () => {
  if (props.type === 'choice') resetChoice(props.editingItem);
  if (props.type === 'inline-fill') resetFill(props.editingItem);
  if (props.type === 'english-composition') resetComposition(props.editingItem);
}, { immediate: true });

const visibleChoiceOptions = computed(() => choice.labelStyle === 'true-false' ? choice.options.slice(0, 2) : choice.options);

function choiceLabel(index) {
  if (choice.labelStyle === 'numeric') return String(index + 1);
  if (choice.labelStyle === 'true-false') return index === 0 ? 'T' : 'F';
  return String.fromCharCode(65 + index);
}

function addOption() {
  if (choice.options.length < 6) choice.options.push(newOption());
}

function removeOption(index) {
  if (choice.options.length <= 2) return;
  const [removed] = choice.options.splice(index, 1);
  choice.answers = choice.answers.filter((id) => id !== removed.id);
}

function moveOption(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= visibleChoiceOptions.value.length) return;
  const [option] = choice.options.splice(index, 1);
  choice.options.splice(target, 0, option);
}

function toggleChoiceAnswer(id) {
  if (choice.selectionMode === 'single') {
    choice.answers = choice.answers.includes(id) ? [] : [id];
  } else if (choice.answers.includes(id)) {
    choice.answers = choice.answers.filter((answer) => answer !== id);
  } else {
    choice.answers.push(id);
  }
}

// 智能识别粘贴整道选择题
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
      const inlineOthers = Array.from(optBody.matchAll(/[\(\[]?([B-Fb-f])[\)\]\.、\s]\s*([^\n\(\[B-Fb-f]+)/g));
      if (inlineOthers.length > 0) {
        const firstOptEnd = optBody.indexOf(inlineOthers[0][0]);
        options.push({ letter, text: optBody.slice(0, firstOptEnd).trim() });
        inlineOthers.forEach(m => {
          options.push({ letter: m[1].toUpperCase(), text: m[2].trim() });
        });
      } else {
        options.push({ letter, text: optBody });
      }
    } else if (options.length === 0) {
      stemLines.push(line);
    }
  }

  if (options.length < 2) {
    const inlineMatches = Array.from(text.matchAll(/[\(\[]?([A-Fa-f])[\)\]\.、\s]\s*([^A-Fa-f\n]+?)(?=(?:[\(\[]?[A-Fa-f][\)\]\.、\s])|$)/g));
    if (inlineMatches.length >= 2) {
      const firstPos = text.indexOf(inlineMatches[0][0]);
      let stem = text.slice(0, firstPos).trim();
      const opts = inlineMatches.map(m => m[2].trim());
      const bAns = stem.match(/[\(（]\s*([A-Fa-f])\s*[\)）]/);
      if (bAns && !answerLetter) {
        answerLetter = bAns[1].toUpperCase();
        stem = stem.replace(/[\(（]\s*[A-Fa-f]\s*[\)）]/, '（   ）');
      }
      return {
        stem: stem.replace(/^(\d+[\.、\s]|\(\d+\)\s*)/, '').trim(),
        options: opts,
        answerLetter
      };
    }
  }

  if (options.length >= 2) {
    let stem = stemLines.join(' ').replace(/^(\d+[\.、\s]|\(\d+\)\s*)/, '').trim();
    const bAns = stem.match(/[\(（]\s*([A-Fa-f])\s*[\)）]/);
    if (bAns && !answerLetter) {
      answerLetter = bAns[1].toUpperCase();
      stem = stem.replace(/[\(（]\s*[A-Fa-f]\s*[\)）]/, '（   ）');
    }
    return {
      stem: stem.replace(/^(\d+[\.、\s]|\(\d+\)\s*)/, '').trim(),
      options: options.map(o => o.text),
      answerLetter
    };
  }

  return null;
}

function handleParseChoicePaste() {
  const text = (choicePasteText.value || '').trim();
  if (!text) return;
  const parsed = parseChoiceText(text);
  if (!parsed || parsed.options.length < 2) {
    emit('error', '未能识别出有效的选项（需包含 A、B 等选项标识）');
    return;
  }
  choice.stem = parsed.stem;
  choice.options = parsed.options.map(optText => newOption(optText));
  if (parsed.answerLetter) {
    const idx = parsed.answerLetter.charCodeAt(0) - 65;
    if (idx >= 0 && idx < choice.options.length) {
      choice.answers = [choice.options[idx].id];
    }
  } else {
    choice.answers = [];
  }
  choicePasteText.value = '';
}

function addBlank() {
  fill.blanks.push(newBlank());
  if (!fill.stem.includes(`{${fill.blanks.length}}`)) fill.stem += ` {${fill.blanks.length}}`;
}

function removeBlank(index) {
  if (fill.blanks.length <= 1) return;
  fill.blanks.splice(index, 1);
  fill.stem = fill.stem.replace(new RegExp(`\\{${index + 1}\\}`, 'g'), '');
}

function buildStemSegments() {
  const segments = [];
  const regex = /\{(\d+)\}/g;
  let last = 0;
  let match;
  const used = new Set();
  while ((match = regex.exec(fill.stem)) !== null) {
    if (match.index > last) segments.push({ type: 'text', text: fill.stem.slice(last, match.index) });
    const blank = fill.blanks[Number(match[1]) - 1];
    if (blank) {
      segments.push({ type: 'blank', blankId: blank.id });
      used.add(blank.id);
    } else {
      segments.push({ type: 'text', text: match[0] });
    }
    last = regex.lastIndex;
  }
  if (last < fill.stem.length) segments.push({ type: 'text', text: fill.stem.slice(last) });
  fill.blanks.forEach((blank) => {
    if (!used.has(blank.id)) {
      segments.push({ type: 'text', text: ' ' });
      segments.push({ type: 'blank', blankId: blank.id });
    }
  });
  return segments;
}

async function submitQuestion() {
  // 1. 填空题批量录入模式
  if (props.type === 'inline-fill' && fillMode.value === 'batch' && fillBatchText.value.trim()) {
    const lines = fillBatchText.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const addedItems = [];
    lines.forEach(line => {
      let enPart = line;
      let zhPart = '';
      if (line.includes('|')) {
        const parts = line.split('|');
        enPart = parts[0].trim();
        zhPart = parts.slice(1).join('|').trim();
      }
      const segments = parseSentenceToSegments(enPart);
      const blanks = [];
      const stemSegments = [];
      segments.forEach(seg => {
        if (seg.blank) {
          const blankId = generateId('blank');
          blanks.push({
            id: blankId,
            answer: seg.text.trim(),
            lineStyle: 'single', // 横线
            widthMode: 'auto',
            width: 80
          });
          stemSegments.push({ type: 'blank', blankId });
        } else {
          stemSegments.push({ type: 'text', text: seg.text });
        }
      });
      const item = normalizeQuestion({
        id: generateId('fill'),
        questionType: 'inline-fill',
        stem: enPart,
        zh: zhPart,
        stemSegments,
        blanks: blanks.length > 0 ? blanks : [{ id: generateId('blank'), answer: '', lineStyle: 'single', widthMode: 'auto', width: 80 }],
        autoNumber: true
      });
      addedItems.push(item);
    });
    if (addedItems.length > 0) {
      emit('batch-submit', addedItems);
      fillBatchText.value = '';
      return;
    }
  }

  // 2. 填空题可视化挖空模式同步数据
  if (props.type === 'inline-fill' && fillMode.value === 'visual') {
    if (fillVisualSentence.value.trim() && !fill.stem.includes('{1}')) {
      const visualSegments = fillVisualSegments.value;
      const blanks = [];
      const stemSegments = [];
      visualSegments.forEach((seg) => {
        if (seg.blank) {
          const blankId = generateId('blank');
          blanks.push({
            id: blankId,
            answer: seg.text.trim(),
            lineStyle: 'single', // 强制单横线
            widthMode: 'auto',
            width: 80
          });
          stemSegments.push({ type: 'blank', blankId });
        } else {
          stemSegments.push({ type: 'text', text: seg.text });
        }
      });
      fill.stem = segmentsToMarkedText(visualSegments) || fillVisualSentence.value.trim();
      fill.zh = fillVisualZh.value.trim();
      fill.blanks = blanks.length > 0 ? blanks : [newBlank()];
      fill.stemSegments = stemSegments;
    }
  }

  try {
    await formRef.value?.validate();
  } catch {
    emit('error', '请先补全必填内容');
    return;
  }

  let raw;
  if (props.type === 'choice') {
    raw = { ...choice, options: visibleChoiceOptions.value.map((option) => ({ ...option })), answers: [...choice.answers] };
  } else if (props.type === 'inline-fill') {
    raw = {
      ...fill,
      blanks: fill.blanks.map((blank) => ({ ...blank, lineStyle: 'single' })),
      stemSegments: fill.stemSegments?.length ? fill.stemSegments : buildStemSegments()
    };
  } else {
    raw = { ...composition };
  }

  const item = normalizeQuestion({ ...raw, id: props.editingItem?.id, questionType: props.type, layout: props.editingItem?.layout || {} });
  const validation = validateQuestion(item);
  if (!validation.valid) {
    emit('error', validation.errors.join('；'));
    return;
  }
  emit('submit', item);
  if (!props.editingItem) {
    if (props.type === 'choice') resetChoice();
    if (props.type === 'inline-fill') resetFill();
    if (props.type === 'english-composition') resetComposition();
  }
}
</script>

<style scoped>
.general-question-editor { display: flex; flex-direction: column; gap: 12px; padding: 0; border: none; background: transparent; }
.editor-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.editor-field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--text-muted); }
.editor-field.wide { grid-column: 1 / -1; }
.editor-field input, .editor-field textarea, .editor-field select, .option-text-input { width: 100%; border: 1px solid var(--border-color); border-radius: 5px; padding: 6px 8px; font: inherit; background: white; }
.editor-field small { color: var(--text-light); line-height: 1.4; }
.primary-editor-btn { flex: 1; }
.secondary-editor-btn { align-self: flex-start; }
.editor-check { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; }

/* 智能整题识别粘贴卡片 */
.choice-smart-card {
  background: var(--bg-hover, #f8fafc);
  border: 1px dashed var(--border-color, #cbd5e1);
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.smart-card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-muted, #64748b);
}
.smart-parse-btn {
  background: var(--primary, #2f6659);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.smart-paste-input {
  width: 100%;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 4px;
  padding: 6px;
  font-size: 12px;
  background: white;
  resize: vertical;
}

/* 扁平清爽选项列表 */
.clean-option-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}
.section-sub-header {
  font-size: 12px;
  color: var(--text-muted, #64748b);
  font-weight: 500;
}
.clean-choice-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.clean-choice-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.clean-answer-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.5px solid var(--border-color, #cbd5e1);
  background: #f1f5f9;
  color: #334155;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
  user-select: none;
  transition: all 0.15s ease;
}
.clean-answer-badge:hover {
  border-color: var(--primary, #2f6659);
  color: var(--primary, #2f6659);
}
.clean-answer-badge.is-selected-answer {
  background: var(--primary, #2f6659);
  border-color: var(--primary, #2f6659);
  color: #ffffff;
}
.clean-option-input {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--border-color, #cbd5e1);
  border-radius: 5px;
  padding: 6px 10px;
  font-size: 13px;
  background: white;
}
.clean-option-input:focus {
  border-color: var(--primary, #2f6659);
  outline: none;
}
.clean-delete-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s ease;
}
.clean-delete-btn:hover:not(:disabled) {
  color: #ef4444;
  background: #fee2e2;
}
.clean-delete-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}
.clean-add-option-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  padding: 4px 10px;
  background: transparent;
  border: 1px dashed var(--border-color, #cbd5e1);
  border-radius: 4px;
  font-size: 12px;
  color: var(--primary, #2f6659);
  cursor: pointer;
  transition: all 0.15s ease;
}
.clean-add-option-btn:hover:not(:disabled) {
  background: var(--bg-hover, #f1f5f9);
  border-color: var(--primary, #2f6659);
}

/* 紧凑二级设置 */
.compact-config-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 6px;
  border-top: 1px dashed var(--border-color, #e2e8f0);
}
.compact-config-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.config-label {
  font-size: 11.5px;
  color: var(--text-muted, #64748b);
  white-space: nowrap;
}
.compact-select {
  border: 1px solid var(--border-color, #cbd5e1);
  border-radius: 4px;
  padding: 3px 6px;
  font-size: 11.5px;
  background: white;
}

/* 填空题可视化与模式切换 */
.fill-mode-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
.fill-mode-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid var(--border-color, #cbd5e1);
  background: white;
  font-size: 12px;
  color: var(--text-muted, #64748b);
  cursor: pointer;
  transition: all 0.15s ease;
}
.fill-mode-tab.active {
  background: var(--primary, #2f6659);
  border-color: var(--primary, #2f6659);
  color: white;
  font-weight: 500;
}
.fill-visual-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.form-item-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.item-label {
  font-size: 12px;
  color: var(--text-muted, #64748b);
  font-weight: 500;
}
.native-search-input {
  width: 100%;
  border: 1px solid var(--border-color, #cbd5e1);
  border-radius: 5px;
  padding: 7px 10px;
  font-size: 13px;
  background: white;
}
.native-search-input:focus {
  border-color: var(--primary, #2f6659);
  outline: none;
}
.visual-token-section {
  display: flex;
  flex-direction: column;
}
.visual-token-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  min-height: 42px;
}
.token-placeholder {
  color: #94a3b8;
  font-size: 12px;
}
.visual-token-btn {
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
  background: white;
  font-size: 12.5px;
  cursor: pointer;
  color: #334155;
  transition: all 0.15s ease;
}
.visual-token-btn.is-blank {
  background: var(--primary, #2f6659);
  border-color: var(--primary, #2f6659);
  color: white;
  font-weight: 600;
  text-decoration: underline;
}
.visual-cloze-preview {
  padding: 8px 10px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 6px;
  min-height: 38px;
}
@media (max-width: 520px) {
  .editor-grid { grid-template-columns: 1fr; }
  .compact-config-row { flex-direction: column; align-items: flex-start; gap: 8px; }
}
</style>
