<template>
  <section class="general-question-editor" data-debug-id="Q-008" data-debug-name="通用题型结构化编辑器">
    <n-form
      ref="formRef"
      :model="activeModel"
      :rules="activeRules"
      label-placement="top"
      size="small"
      :show-require-mark="false"
    >
    <template v-if="type === 'choice'">
      <div class="editor-grid">
        <n-form-item class="editor-field wide" label="题干" path="stem">
          <n-input v-model:value="choice.stem" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" :input-props="{ id: 'choiceStemInput' }" placeholder="请输入选择题题干" />
        </n-form-item>
        <label class="editor-field">选择方式
          <select id="choiceSelectionMode" v-model="choice.selectionMode">
            <option value="single">单选</option>
            <option value="multiple">多选</option>
          </select>
        </label>
        <label class="editor-field">选项编号
          <select id="choiceLabelStyle" v-model="choice.labelStyle">
            <option value="alpha-upper">A B C D E F</option>
            <option value="numeric">1 2 3 4 5 6</option>
            <option value="true-false">T F</option>
          </select>
        </label>
        <label class="editor-field">选项排列
          <select id="choiceOptionLayout" v-model="choice.optionLayout">
            <option value="auto">自动排列</option>
            <option value="single">单列</option>
            <option value="double">双列</option>
            <option value="inline">行内排列</option>
          </select>
        </label>
      </div>

      <div class="option-editor-list">
        <div v-for="(option, index) in visibleChoiceOptions" :key="option.id" class="option-editor-row">
          <label class="answer-toggle" :title="choice.selectionMode === 'single' ? '设为正确答案' : '切换正确答案'">
            <input
              :type="choice.selectionMode === 'single' ? 'radio' : 'checkbox'"
              name="choice-answer"
              :checked="choice.answers.includes(option.id)"
              @change="toggleChoiceAnswer(option.id)"
            />
            {{ choiceLabel(index) }}
          </label>
          <input v-model="option.text" class="option-text-input" :placeholder="`选项 ${choiceLabel(index)}`" />
          <n-button size="tiny" data-action="move-option-up" @click="moveOption(index, -1)" :disabled="index === 0">上移</n-button>
          <n-button size="tiny" data-action="move-option-down" @click="moveOption(index, 1)" :disabled="index === visibleChoiceOptions.length - 1">下移</n-button>
          <n-button v-if="choice.labelStyle !== 'true-false'" size="tiny" type="error" ghost data-action="remove-option" @click="removeOption(index)" :disabled="choice.options.length <= 2">删除</n-button>
        </div>
      </div>
      <n-button v-if="choice.labelStyle !== 'true-false'" id="btnAddChoiceOption" size="small" class="secondary-editor-btn" @click="addOption" :disabled="choice.options.length >= 6">
        <template #icon><AppIcon name="plus" :size="14" /></template>
        添加选项（最多6个）
      </n-button>
    </template>

    <template v-else-if="type === 'inline-fill'">
      <div class="editor-grid">
        <n-form-item class="editor-field wide" label="题干模板" path="stem">
          <div class="field-stack">
            <n-input v-model:value="fill.stem" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" :input-props="{ id: 'inlineFillStemInput' }" placeholder="例如：I {1} English and she {2} Chinese." />
            <small>使用 {1}、{2} 标记空格位置；未写入题干的空格会追加到末尾。</small>
          </div>
        </n-form-item>
        <label class="editor-field">题号
          <select v-model="fill.autoNumber">
            <option :value="true">自动编号</option>
            <option :value="false">不编号</option>
          </select>
        </label>
      </div>

      <div class="blank-editor-list">
        <div v-for="(blank, index) in fill.blanks" :key="blank.id" class="blank-editor-row">
          <strong>空 {{ index + 1 }}</strong>
          <input v-model="blank.answer" placeholder="预设答案（不会显示在学生卷）" />
          <select v-model="blank.lineStyle">
            <option value="single">单横线</option>
            <option value="four-line">四线三格</option>
          </select>
          <select v-model="blank.widthMode">
            <option value="auto">按答案宽度150%</option>
            <option value="manual">手动宽度</option>
          </select>
          <input v-if="blank.widthMode === 'manual'" v-model.number="blank.width" type="number" min="40" max="360" title="宽度（像素）" />
          <n-button size="tiny" type="error" ghost data-action="remove-blank" @click="removeBlank(index)" :disabled="fill.blanks.length <= 1">删除</n-button>
        </div>
      </div>
      <n-button id="btnAddInlineBlank" size="small" class="secondary-editor-btn" @click="addBlank">
        <template #icon><AppIcon name="plus" :size="14" /></template>
        添加行内空格
      </n-button>
    </template>

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
        <label class="editor-field">书写线样式
          <select v-model="composition.writingStyle">
            <option value="single-line">单横线</option>
            <option value="four-line">四线三格</option>
          </select>
        </label>
        <label class="editor-field">每行高度
          <input v-model.number="composition.lineHeight" type="number" min="8" max="18" step="0.5" />
        </label>
        <label class="editor-field">续页标题
          <select v-model="composition.continuationMode">
            <option value="label">显示“续写”</option>
            <option value="repeat">重复作文标题</option>
          </select>
        </label>
        <label class="editor-check"><input v-model="composition.showTitleArea" type="checkbox" /> 显示作文标题区域</label>
      </div>
    </template>

    <div class="editor-actions">
      <n-button id="btnSubmitGeneralQuestion" type="primary" class="primary-editor-btn" @click="submitQuestion">{{ editingItem ? '保存题目修改' : '添加到试卷' }}</n-button>
      <n-button v-if="editingItem" class="secondary-editor-btn" @click="$emit('cancel')">取消编辑</n-button>
    </div>
    </n-form>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { NButton, NForm, NFormItem, NInput } from 'naive-ui';
import { generateId } from '../core/tokenizer.js';
import { normalizeQuestion, validateQuestion } from '../question-types/registry.js';
import AppIcon from './AppIcon.vue';

const props = defineProps({
  type: { type: String, required: true },
  editingItem: { type: Object, default: null }
});
const emit = defineEmits(['submit', 'cancel', 'error']);
const formRef = ref(null);

const choice = reactive({ stem: '', selectionMode: 'single', labelStyle: 'alpha-upper', optionLayout: 'auto', options: [], answers: [] });
const fill = reactive({ stem: '请在横线上填写答案：{1}', autoNumber: true, blanks: [] });
const composition = reactive({ title: '', instructions: '', writingStyle: 'single-line', lineCount: 10, lineHeight: 11, showTitleArea: true, continuationMode: 'label' });
const activeModel = computed(() => {
  if (props.type === 'choice') return choice;
  if (props.type === 'inline-fill') return fill;
  return composition;
});
const activeRules = computed(() => {
  if (props.type === 'choice') return { stem: { required: true, message: '请输入选择题题干', trigger: ['input', 'blur'] } };
  if (props.type === 'inline-fill') return { stem: { required: true, message: '请输入填空题题干', trigger: ['input', 'blur'] } };
  return {};
});

function newOption(text = '') { return { id: generateId('option'), text }; }
function newBlank() { return { id: generateId('blank'), answer: '', lineStyle: 'single', widthMode: 'auto', width: 96 }; }

function resetChoice(source = null) {
  const item = source ? normalizeQuestion(source) : null;
  choice.stem = item?.stem || '';
  choice.selectionMode = item?.selectionMode || 'single';
  choice.labelStyle = item?.labelStyle || 'alpha-upper';
  choice.optionLayout = item?.optionLayout || 'auto';
  choice.options = item?.options?.map((option) => ({ ...option })) || [newOption(), newOption(), newOption(), newOption()];
  choice.answers = [...(item?.answers || [])];
}

function resetFill(source = null) {
  const item = source ? normalizeQuestion(source) : null;
  fill.stem = item?.stem || '请在横线上填写答案：{1}';
  fill.autoNumber = item?.autoNumber ?? true;
  fill.blanks = item?.blanks?.map((blank) => ({ ...blank })) || [newBlank()];
}

function resetComposition(source = null) {
  const item = source ? normalizeQuestion(source) : null;
  composition.title = item?.title || '';
  composition.instructions = item?.instructions || '';
  composition.writingStyle = item?.writingStyle || 'single-line';
  composition.lineCount = item?.lineCount || 10;
  composition.lineHeight = item?.lineHeight || 11;
  composition.showTitleArea = item?.showTitleArea ?? true;
  composition.continuationMode = item?.continuationMode || 'label';
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
  if (choice.selectionMode === 'single') choice.answers = [id];
  else if (choice.answers.includes(id)) choice.answers = choice.answers.filter((answer) => answer !== id);
  else choice.answers.push(id);
}

function addBlank() {
  fill.blanks.push(newBlank());
  if (!fill.stem.includes(`{${fill.blanks.length}}`)) fill.stem += ` {${fill.blanks.length}}`;
}

function removeBlank(index) {
  if (fill.blanks.length <= 1) return;
  const blank = fill.blanks[index];
  if (blank.answer && !window.confirm('该空格已有答案，删除后答案也会移除。确定继续吗？')) return;
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
    raw = { ...fill, blanks: fill.blanks.map((blank) => ({ ...blank })), stemSegments: buildStemSegments() };
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
.general-question-editor { display: flex; flex-direction: column; gap: 10px; padding: 10px; border: 1px solid var(--border-light); border-radius: 7px; background: var(--bg-app); }
.editor-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.editor-field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--text-muted); }
.editor-field.wide { grid-column: 1 / -1; }
.editor-field input, .editor-field textarea, .editor-field select, .option-text-input, .blank-editor-row input, .blank-editor-row select { width: 100%; border: 1px solid var(--border-color); border-radius: 5px; padding: 6px 8px; font: inherit; background: white; }
.editor-field small { color: var(--text-light); line-height: 1.4; }
.field-stack { display: flex; flex-direction: column; gap: 4px; width: 100%; }
.option-editor-list, .blank-editor-list { display: flex; flex-direction: column; gap: 6px; }
.option-editor-row, .blank-editor-row { display: grid; grid-template-columns: auto minmax(80px, 1fr) auto auto auto; gap: 5px; align-items: center; font-size: 11.5px; }
.blank-editor-row { grid-template-columns: auto minmax(90px, 1fr) auto auto minmax(54px, 70px) auto; }
.answer-toggle { display: inline-flex; align-items: center; gap: 3px; font-weight: 700; }
.editor-actions { display: flex; gap: 8px; }
.primary-editor-btn { flex: 1; }
.secondary-editor-btn { align-self: flex-start; }
.editor-check { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; }
@media (max-width: 520px) { .editor-grid { grid-template-columns: 1fr; } .option-editor-row, .blank-editor-row { grid-template-columns: 1fr; } }
</style>
