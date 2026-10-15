<template>
  <div class="question-list-pane" data-debug-id="Q-007" data-debug-name="试卷题目清单面板">
    <n-card size="small" :bordered="false" class="pane-card">
      <template #header>
        <div class="pane-header-title">
          <span class="title-with-icon">
            <AppIcon name="file-text" :size="16" />
            试卷题目
          </span>
        </div>
      </template>

      <template #header-extra>
        <div class="exam-stat-header" id="badgeWordCount" :title="detailedStatusTitle">
          <span class="stat-main-badge">
            已添加 {{ state.draft.items.length }} 题
          </span>
          <span class="stat-divider">·</span>
          <span class="stat-breakdown-text">
            {{ statBreakdownSummary }}
          </span>
        </div>
      </template>

      <!-- 批量列数与快捷操作工具栏 -->
      <div v-if="state.draft.items.length > 0" class="batch-toolbar">
        <div class="batch-col-group">
          <span class="batch-label">批量列数:</span>
          <button type="button" class="batch-btn" title="批量设为每行 1 题" @click="batchSetColumns(1)">1列</button>
          <button type="button" class="batch-btn" title="批量设为每行 2 题" @click="batchSetColumns(2)">2列</button>
          <button type="button" class="batch-btn" title="批量设为每行 3 题" @click="batchSetColumns(3)">3列</button>
          <button type="button" class="batch-btn" title="批量设为每行 4 题" @click="batchSetColumns(4)">4列</button>
          <button type="button" class="batch-btn" title="批量设为每行 5 题" @click="batchSetColumns(5)">5列</button>
          <button type="button" class="batch-btn restore" title="恢复为题型默认列数" @click="batchRestoreDefault()">恢复默认</button>
        </div>

        <div class="batch-actions-right">
          <n-popconfirm
            @positive-click="handleClearAll"
            positive-text="确定"
            negative-text="取消"
          >
            <template #trigger>
              <button type="button" class="batch-btn del" id="btnClearWords" title="清空试卷所有题目">
                <AppIcon name="trash" :size="12" />
                清空
              </button>
            </template>
            确定要清空试卷上的全部题目吗？
          </n-popconfirm>
        </div>
      </div>

      <!-- 紧凑试卷题目列表 -->
      <div
        class="words-list-container compact-list"
        id="wordsListContainer"
        data-debug-id="Q-007-LIST"
        data-debug-name="试卷题目列表"
      >
        <template v-if="state.draft.items.length === 0">
          <div class="empty-list-card">
            <AppIcon name="file-text" :size="28" style="color: var(--text-light); margin-bottom: 6px;" />
            <div class="empty-title">试卷暂无题目</div>
            <div class="empty-subtitle">请在「题目录入」中录入题目，或从「备课资源库」选题加入</div>
            <button type="button" class="empty-action-btn" @click="switchToTab('paneQuick')">
              <AppIcon name="plus" :size="13" />
              前往录入题目
            </button>
          </div>
        </template>

        <template v-else>
          <div
            v-for="(item, index) in state.draft.items"
            :key="item.id || index"
            class="word-item-row compact-exam-row word-chip"
            :class="{
              'has-override-col': Boolean(item.layout?.columns),
              'is-separator-row': item.questionType === 'separator'
            }"
            :data-id="item.id"
            :data-debug-id="'ITEM-' + item.id"
            data-debug-name="试卷题目项"
            title="双击可编辑该题内容"
            @dblclick="openEditModal(index)"
          >
            <!-- 序号与题型前导区 -->
            <div class="row-leading">
              <span class="word-item-index">{{ item.questionType === 'separator' ? '§' : formatIndex(index + 1) }}</span>
              <span class="question-type-pill" :class="item.questionType || 'word-dictation'">
                {{ getQuestionTypeLabel(item.questionType) }}
              </span>
            </div>

            <!-- 主内容区：英文与中文垂直分层 -->
            <div class="word-item-main">
              <div class="word-primary-line" :title="getItemPrimaryText(item)">
                <span v-if="item.questionType === 'separator'" class="word-item-en word-chip-en separator-title-text">
                  {{ item.title ? `【分栏隔断】${item.title}` : '【分栏隔断】全幅视觉分割线' }}
                </span>
                <span v-else-if="item.en" class="word-item-en word-chip-en">
                  <template v-if="item.questionType === 'sentence-cloze' && (item.en.includes('[') || item.en.includes('{'))">
                    <mark class="chip-blank-mark">{{ item.en }}</mark>
                  </template>
                  <template v-else>
                    {{ item.en }}
                  </template>
                </span>
                <span v-else-if="item.alphabetType" class="word-item-en word-chip-en">{{ item.prompt }}</span>
                <span v-else-if="item.stem" class="word-item-en word-chip-en">{{ item.stem }}</span>
                <span v-else-if="item.title || item.instructions" class="word-item-en word-chip-en">{{ item.title || item.instructions }}</span>
                <span v-else class="word-item-en word-chip-en" style="display:none;"></span>
              </div>

              <div class="word-secondary-line" :title="getItemSecondaryText(item)">
                <span v-if="item.questionType === 'separator'" class="word-item-zh separator-sec-text">
                  后续题目每行 {{ item.sectionColumns || 1 }} 题
                </span>
                <span v-else-if="item.zh" class="word-item-zh">{{ item.zh }}</span>
                <span v-else-if="item.options" class="word-item-zh">{{ formatOptionsSummary(item.options) }}</span>
                <span v-else class="word-item-zh" style="display:none;"></span>

                <span v-if="item.layout?.columns" class="col-override-tag">
                  每行{{ item.layout.columns }}题
                </span>
              </div>
            </div>

            <!-- 紧凑 1:1 正方形操作按钮组 (28x28px) -->
            <div class="word-item-actions">
              <!-- 单题布局弹出选择器：使用原生 button 作为直接触发器，解决坐标飘到 (0, 0) 的 Bug -->
              <n-popselect
                :value="item.layout?.columns || 'default'"
                :options="columnOptions"
                trigger="click"
                size="small"
                @update:value="setColumnsFromSelect(item, $event)"
              >
                <button
                  type="button"
                  class="word-item-btn"
                  title="设置该题每行列数（1至5列）"
                  aria-label="设置该题每行列数（1至5列）"
                >
                  <AppIcon name="grid" :size="13" />
                </button>
              </n-popselect>

              <!-- 全题型支持二次编辑（点击或双击整行） -->
              <IconActionButton
                class="word-item-btn"
                label="编辑题目内容"
                icon="edit"
                :icon-size="13"
                @click.stop="openEditModal(index)"
              />

              <IconActionButton
                class="word-item-btn"
                label="复制题目"
                icon="copy"
                :icon-size="13"
                @click.stop="duplicateItem(index)"
              />

              <IconActionButton
                class="word-item-btn"
                label="上移题目"
                icon="arrow-up"
                :icon-size="13"
                :disabled="index === 0"
                @click.stop="moveUp(index)"
              />

              <IconActionButton
                class="word-item-btn"
                label="下移题目"
                icon="arrow-down"
                :icon-size="13"
                :disabled="index === state.draft.items.length - 1"
                @click.stop="moveDown(index)"
              />

              <IconActionButton
                class="word-item-btn del"
                label="删除题目"
                icon="trash"
                :icon-size="13"
                @click.stop="removeItem(index)"
              />
            </div>
          </div>
        </template>
      </div>
    </n-card>

    <!-- 题目内容二次编辑弹窗 -->
    <n-modal
      v-model:show="isEditModalOpen"
      preset="card"
      :title="editModalTitle"
      style="max-width: 520px; width: 94vw;"
      :segmented="{ content: 'soft', footer: 'soft' }"
    >
      <div class="edit-modal-content">
        <!-- 单词默写 -->
        <div v-if="editForm.questionType === 'word-dictation'" class="edit-form-stack">
          <div class="edit-form-item">
            <label class="edit-form-label">英文单词</label>
            <n-input v-model:value="editForm.en" placeholder="如 apple" />
          </div>
          <div class="edit-form-item">
            <label class="edit-form-label">中文释义</label>
            <n-input v-model:value="editForm.zh" placeholder="如 苹果" />
          </div>
          <div class="edit-form-item">
            <label class="edit-form-label">音标（可选）</label>
            <n-input v-model:value="editForm.phonetic" placeholder="如 /ˈæp.əl/" />
          </div>
        </div>

        <!-- 句子听写 / 默写 -->
        <div v-else-if="editForm.questionType === 'sentence-dictation'" class="edit-form-stack">
          <div class="edit-form-item">
            <label class="edit-form-label">英文句子</label>
            <n-input
              v-model:value="editForm.en"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 4 }"
              placeholder="如 This is an apple."
            />
          </div>
          <div class="edit-form-item">
            <label class="edit-form-label">中文翻译</label>
            <n-input
              v-model:value="editForm.zh"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 3 }"
              placeholder="如 这是一个苹果。"
            />
          </div>
        </div>

        <!-- 句子挖空 -->
        <div v-else-if="editForm.questionType === 'sentence-cloze'" class="edit-form-stack">
          <div class="edit-form-item">
            <label class="edit-form-label">英文原句与挖空</label>
            <n-input
              v-model:value="editForm.en"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 4 }"
              placeholder="使用中括号指定挖空，如 I [like] apples."
            />
            <div class="edit-form-help">
              💡 提示：在需要挖空填词的单词前后加上中括号 [ ]，例如 "Ask [your teacher] for help."
            </div>
          </div>
          <div class="edit-form-item">
            <label class="edit-form-label">中文翻译（置于句子上方）</label>
            <n-input
              v-model:value="editForm.zh"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 3 }"
              placeholder="如 向你的老师寻求帮助。"
            />
          </div>
        </div>

        <!-- 字母练习 -->
        <div v-else-if="editForm.questionType === 'alphabet'" class="edit-form-stack">
          <div class="edit-form-item">
            <label class="edit-form-label">题目提示文案</label>
            <n-input v-model:value="editForm.prompt" placeholder="如 _ B _ 或 A 的小写" />
          </div>
          <div v-if="editForm.char" class="edit-form-item">
            <label class="edit-form-label">目标字母</label>
            <n-input v-model:value="editForm.char" placeholder="如 B" />
          </div>
          <div class="edit-form-item">
            <label class="edit-form-label">辅助说明（可选）</label>
            <n-input v-model:value="editForm.zh" placeholder="提示说明" />
          </div>
        </div>

        <!-- 单项选择 -->
        <div v-else-if="editForm.questionType === 'choice'" class="edit-form-stack">
          <div class="edit-form-item">
            <label class="edit-form-label">题干内容</label>
            <n-input
              v-model:value="editForm.stem"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 4 }"
              placeholder="请输入选择题题干"
            />
          </div>
          <div class="edit-form-item">
            <label class="edit-form-label">选项设置</label>
            <div v-for="(opt, oIdx) in editForm.options" :key="oIdx" class="edit-option-row">
              <span class="edit-opt-label">{{ opt.label || String.fromCharCode(65 + oIdx) }}.</span>
              <n-input v-model:value="opt.text" :placeholder="`选项 ${opt.label}`" size="small" />
            </div>
          </div>
        </div>

        <!-- 完形 / 语法填空 -->
        <div v-else-if="editForm.questionType === 'inline-fill'" class="edit-form-stack">
          <div class="edit-form-item">
            <label class="edit-form-label">题干内容</label>
            <n-input
              v-model:value="editForm.stem"
              type="textarea"
              :autosize="{ minRows: 3, maxRows: 5 }"
              placeholder="输入填空题题干"
            />
          </div>
        </div>

        <!-- 英语作文 -->
        <div v-else-if="editForm.questionType === 'english-composition'" class="edit-form-stack">
          <div class="edit-form-item">
            <label class="edit-form-label">作文题目</label>
            <n-input v-model:value="editForm.title" placeholder="如 My Favourite Animal" />
          </div>
          <div class="edit-form-item">
            <label class="edit-form-label">写作要求 / 提示</label>
            <n-input
              v-model:value="editForm.instructions"
              type="textarea"
              :autosize="{ minRows: 3, maxRows: 5 }"
              placeholder="写作要求与提示词"
            />
          </div>
          <div class="edit-form-item">
            <label class="edit-form-label">四线三格行数</label>
            <n-input-number v-model:value="editForm.lineCount" :min="1" :max="20" />
          </div>
        </div>

        <!-- 分栏隔断 -->
        <div v-else-if="editForm.questionType === 'separator'" class="edit-form-stack">
          <div class="edit-form-item">
            <label class="edit-form-label">隔断标题（可选，留空则为纯横线）</label>
            <n-input v-model:value="editForm.title" placeholder="如：Part II 听力与词汇（留空为纯分隔线）" />
          </div>
          <div class="edit-form-item">
            <label class="edit-form-label">后续题目独立分栏（每行题数）</label>
            <n-select v-model:value="editForm.sectionColumns" :options="sectionColumnOptions" />
            <div class="edit-form-help">
              从本隔断开始直至下一个隔断，后续题目将自动采用此分栏列数。
            </div>
          </div>
        </div>

        <!-- 通用每行列数设置（非隔断类型） -->
        <div v-if="editForm.questionType !== 'separator'" class="edit-form-item" style="margin-top: 14px; padding-top: 10px; border-top: 1px dashed var(--border-color);">
          <label class="edit-form-label">该题独立每行列数</label>
          <n-select v-model:value="editForm.columns" :options="columnOptions" size="small" />
        </div>
      </div>

      <template #footer>
        <div class="modal-footer">
          <div class="modal-footer-left">
            <n-button
              v-if="structuredTypes.includes(editForm.questionType)"
              text
              type="primary"
              size="small"
              @click="openInFullStructuredEditor"
            >
              跳转到完整结构化编辑器 ↗
            </n-button>
          </div>
          <div class="modal-footer-right">
            <n-button size="small" @click="isEditModalOpen = false">取消</n-button>
            <n-button size="small" type="primary" @click="saveEditModal">保存修改</n-button>
          </div>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { NCard, NPopconfirm, NPopselect, NModal, NInput, NInputNumber, NButton, NSelect, useMessage } from 'naive-ui';
import { state } from '../stores/appStore.js';
import { computePageLayout } from '../core/layout.js';
import { normalizeQuestion } from '../question-types/registry.js';
import { parseSentenceToSegments } from '../core/tokenizer.js';
import AppIcon from './AppIcon.vue';
import IconActionButton from './IconActionButton.vue';

const message = useMessage();
const structuredTypes = ['choice', 'inline-fill', 'english-composition'];

const layout = computed(() => computePageLayout(state.draft.items, state.draft.settings));

const columnOptions = [
  { label: '继承题型默认', value: 'default' },
  { label: '每行 1 题', value: 1 },
  { label: '每行 2 题', value: 2 },
  { label: '每行 3 题', value: 3 },
  { label: '每行 4 题', value: 4 },
  { label: '每行 5 题', value: 5 }
];

const sectionColumnOptions = [
  { label: '每行 1 题（整行通栏）', value: 1 },
  { label: '每行 2 题（双栏对开）', value: 2 },
  { label: '每行 3 题（三栏排布）', value: 3 },
  { label: '每行 4 题（四栏紧凑）', value: 4 },
  { label: '每行 5 题（五栏极紧凑）', value: 5 }
];

// 编辑弹窗状态
const isEditModalOpen = ref(false);
const editingIndex = ref(-1);
const editForm = ref({
  questionType: 'word-dictation',
  en: '',
  zh: '',
  phonetic: '',
  prompt: '',
  char: '',
  stem: '',
  options: [],
  title: '',
  instructions: '',
  lineCount: 8,
  sectionColumns: 2,
  columns: 'default'
});

const editModalTitle = computed(() => {
  const typeName = getQuestionTypeLabel(editForm.value.questionType);
  return `编辑题目内容 - ${typeName}（第 ${editingIndex.value + 1} 项）`;
});

function openEditModal(index) {
  const item = state.draft.items[index];
  if (!item) return;
  editingIndex.value = index;
  editForm.value = {
    questionType: item.questionType || 'word-dictation',
    en: item.en || '',
    zh: item.zh || '',
    phonetic: item.phonetic || '',
    prompt: item.prompt || '',
    char: item.char || '',
    stem: item.stem || '',
    options: item.options ? JSON.parse(JSON.stringify(item.options)) : [],
    title: item.title || '',
    instructions: item.instructions || '',
    lineCount: item.lineCount || 8,
    sectionColumns: item.sectionColumns || 2,
    columns: item.layout?.columns || 'default'
  };
  isEditModalOpen.value = true;
}

function saveEditModal() {
  const idx = editingIndex.value;
  if (idx < 0 || idx >= state.draft.items.length) return;
  const original = state.draft.items[idx];
  const type = editForm.value.questionType;

  const updated = { ...original };

  if (type === 'word-dictation' || type === 'sentence-dictation') {
    updated.en = (editForm.value.en || '').trim();
    updated.zh = (editForm.value.zh || '').trim();
    if (type === 'word-dictation') updated.phonetic = (editForm.value.phonetic || '').trim();
  } else if (type === 'sentence-cloze') {
    updated.en = (editForm.value.en || '').trim();
    updated.zh = (editForm.value.zh || '').trim();
    updated.segments = parseSentenceToSegments(updated.en);
  } else if (type === 'alphabet') {
    updated.prompt = (editForm.value.prompt || '').trim();
    if (editForm.value.char) updated.char = editForm.value.char.trim();
    if (editForm.value.zh) updated.zh = editForm.value.zh.trim();
  } else if (type === 'choice') {
    updated.stem = (editForm.value.stem || '').trim();
    updated.options = editForm.value.options.map(opt => ({ ...opt, text: (opt.text || '').trim() }));
  } else if (type === 'inline-fill') {
    updated.stem = (editForm.value.stem || '').trim();
  } else if (type === 'english-composition') {
    updated.title = (editForm.value.title || '').trim();
    updated.instructions = (editForm.value.instructions || '').trim();
    updated.lineCount = Number(editForm.value.lineCount) || 8;
  } else if (type === 'separator') {
    updated.title = (editForm.value.title || '').trim();
    updated.sectionColumns = Number(editForm.value.sectionColumns) || 2;
  }

  if (editForm.value.columns === 'default' || !editForm.value.columns) {
    if (updated.layout) delete updated.layout.columns;
  } else {
    if (!updated.layout) updated.layout = {};
    updated.layout.columns = Number(editForm.value.columns);
  }

  state.draft.items[idx] = updated;
  isEditModalOpen.value = false;
  message.success('已保存题目修改并同步预览');
}

function openInFullStructuredEditor() {
  const idx = editingIndex.value;
  isEditModalOpen.value = false;
  state.ui.activeView = 'paneQuick';
  window.__editingQuestionIndex = idx;
  window.dispatchEvent(new CustomEvent('edit-question', { detail: idx }));
}

const statBreakdownSummary = computed(() => {
  const items = state.draft.items || [];
  if (items.length === 0) return '空画布';
  const counts = {};
  items.forEach(it => {
    const t = it.questionType || 'word-dictation';
    counts[t] = (counts[t] || 0) + 1;
  });
  const parts = [];
  if (counts['word-dictation']) parts.push(`单词${counts['word-dictation']}`);
  if (counts['sentence-cloze']) parts.push(`挖空${counts['sentence-cloze']}`);
  if (counts['sentence-dictation']) parts.push(`句子${counts['sentence-dictation']}`);
  if (counts['alphabet']) parts.push(`字母${counts['alphabet']}`);
  if (counts['separator']) parts.push(`隔断${counts['separator']}`);
  if (counts['choice']) parts.push(`选择${counts['choice']}`);
  if (counts['inline-fill']) parts.push(`填空${counts['inline-fill']}`);
  if (counts['english-composition']) parts.push(`作文${counts['english-composition']}`);
  const breakdownStr = parts.slice(0, 3).join(' · ');
  return `${breakdownStr} · 预计${layout.value.totalPages}页`;
});

const detailedStatusTitle = computed(() => {
  return `题目总数: ${state.draft.items.length} 题\n预计页数: ${layout.value.totalPages} 页\n每页份数: ${layout.value.copiesPerPage} 份\n当前纸张: ${state.draft.settings.paperSize || 'A4'}`;
});

function formatIndex(num) {
  return num < 10 ? `0${num}.` : `${num}.`;
}

function getQuestionTypeLabel(type) {
  const map = {
    'word-dictation': '单词',
    'sentence-cloze': '挖空',
    'sentence-dictation': '句子',
    'alphabet': '字母',
    'separator': '隔断',
    'choice': '选择',
    'inline-fill': '填空',
    'english-composition': '作文'
  };
  return map[type] || '试题';
}

function getItemPrimaryText(item) {
  if (item.questionType === 'separator') {
    return item.title ? `【分栏隔断】${item.title}` : '【分栏隔断】全幅视觉分割线';
  }
  if (item.en) return item.en;
  if (item.prompt) return item.prompt;
  if (item.stem) return item.stem;
  if (item.title) return item.title;
  return '未命名试题';
}

function getItemSecondaryText(item) {
  if (item.questionType === 'separator') {
    return `后续题目每行 ${item.sectionColumns || 1} 题`;
  }
  if (item.zh) return item.zh;
  if (item.options) return formatOptionsSummary(item.options);
  return '';
}

function formatOptionsSummary(options) {
  if (!Array.isArray(options)) return '';
  return options.map(o => `${o.label}.${o.text}`).join('   ');
}

function setColumnsFromSelect(item, val) {
  if (!item.layout) item.layout = {};
  if (val === 'default' || !val) {
    delete item.layout.columns;
    message.success('已恢复为题型默认列数');
  } else {
    item.layout.columns = Number(val);
    message.success(`已设为每行 ${val} 题`);
  }
}

function batchSetColumns(cols) {
  let count = 0;
  state.draft.items.forEach(item => {
    if (!item.layout) item.layout = {};
    item.layout.columns = cols;
    count++;
  });
  message.success(`已将全部 ${count} 道题目设为每行 ${cols} 题`);
}

function batchRestoreDefault() {
  state.draft.items.forEach(item => {
    if (item.layout) delete item.layout.columns;
  });
  message.success('已将全部题目恢复为题型默认列数');
}

function moveUp(index) {
  if (index <= 0) return;
  const items = state.draft.items;
  const temp = items[index];
  items[index] = items[index - 1];
  items[index - 1] = temp;
}

function moveDown(index) {
  const items = state.draft.items;
  if (index >= items.length - 1) return;
  const temp = items[index];
  items[index] = items[index + 1];
  items[index + 1] = temp;
}

function duplicateItem(index) {
  const source = state.draft.items[index];
  state.draft.items.splice(index + 1, 0, normalizeQuestion(source));
  message.success('已复制题目');
}

function removeItem(index) {
  state.draft.items.splice(index, 1);
  message.info('已移除题目');
}

function handleClearAll() {
  state.draft.items = [];
  message.success('已清空试卷所有题目');
}

function switchToTab(tabKey) {
  state.ui.activeView = tabKey;
}
</script>

<style scoped>
.question-list-pane {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pane-card {
  background: var(--bg-card);
  border-radius: 8px;
}

.pane-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
}

.exam-stat-header {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--text-muted);
}

.stat-main-badge {
  font-weight: 600;
  color: var(--primary);
  background: var(--primary-light);
  padding: 2px 7px;
  border-radius: 12px;
  border: 1px solid var(--primary-border);
}

.stat-divider {
  color: var(--border-color);
}

.stat-breakdown-text {
  font-size: 11px;
  color: var(--text-muted);
}

.batch-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--bg-app);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  margin-bottom: 10px;
  gap: 6px;
  flex-wrap: wrap;
}

.batch-col-group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.batch-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
}

.batch-btn {
  padding: 3px 6px;
  font-size: 11px;
  font-weight: 500;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s ease;
}

.batch-btn:hover {
  background: var(--primary-light);
  border-color: var(--primary-border);
  color: var(--primary);
}

.batch-btn.restore {
  font-size: 10.5px;
  color: var(--text-muted);
}

.batch-btn.del {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--danger);
  border-color: rgba(197, 82, 74, 0.3);
}

.batch-btn.del:hover {
  background: var(--color-danger-light);
}

/* 紧凑列表容器 */
.words-list-container.compact-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-card);
  overflow: hidden;
}

/* 扁平列表项（无厚重边框、无阴影、单层容器） */
.compact-exam-row {
  display: flex;
  align-items: center;
  padding: 7px 10px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-card);
  gap: 8px;
  transition: background 0.15s ease;
  user-select: none;
}

.compact-exam-row:last-child {
  border-bottom: none;
}

.compact-exam-row:hover {
  background: var(--color-primary-light, #f0f6f4);
}

/* 隔断题目行突出样式 */
.compact-exam-row.is-separator-row {
  background: #f8fafc;
  border-left: 3px solid var(--primary);
  border-bottom: 1px dashed var(--border-color);
}

.compact-exam-row.is-separator-row:hover {
  background: #f1f5f9;
}

.separator-title-text {
  color: var(--primary) !important;
  font-weight: 700 !important;
}

.separator-sec-text {
  color: var(--text-muted);
}

.row-leading {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.word-item-index {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  min-width: 20px;
  text-align: left;
}

.question-type-pill {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 4px;
  background: #e2e8f0;
  color: #475569;
  letter-spacing: 0.02em;
}

.question-type-pill.word-dictation { background: #e0f2fe; color: #0369a1; }
.question-type-pill.sentence-cloze { background: #fef3c7; color: #b45309; }
.question-type-pill.sentence-dictation { background: #f3e8ff; color: #7e22ce; }
.question-type-pill.alphabet { background: #ede9fe; color: #6d28d9; }
.question-type-pill.separator { background: #e2e8f0; color: #334155; font-weight: 700; }
.question-type-pill.choice { background: #dcfce7; color: #15803d; }
.question-type-pill.inline-fill { background: #ffedd5; color: #c2410c; }
.question-type-pill.english-composition { background: #fae8ff; color: #a21caf; }

.word-item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  gap: 2px;
}

.word-primary-line {
  width: 100%;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
  text-align: left;
}

.word-secondary-line {
  width: 100%;
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1.3;
  text-align: left;
}

.chip-blank-mark {
  background: rgba(47, 102, 89, 0.12);
  color: var(--primary);
  border-radius: 2px;
  padding: 0 2px;
  font-weight: 700;
}

.col-override-tag {
  font-size: 9.5px;
  color: var(--primary);
  background: var(--primary-light);
  border-radius: 3px;
  padding: 0 4px;
}

/* 1:1 正方形操作按钮组 (28x28px) */
.word-item-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.word-item-btn {
  width: 28px !important;
  height: 28px !important;
  min-width: 28px !important;
  padding: 0 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 5px !important;
  border: 1px solid var(--border-color) !important;
  background: var(--bg-card) !important;
  color: var(--text-muted) !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.word-item-btn:hover:not(:disabled) {
  background: var(--primary-light) !important;
  border-color: var(--primary-border) !important;
  color: var(--primary) !important;
}

.word-item-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.word-item-btn.del:hover:not(:disabled) {
  background: var(--color-danger-light) !important;
  border-color: rgba(197, 82, 74, 0.4) !important;
  color: var(--danger) !important;
}

/* 空状态卡片 */
.empty-list-card {
  padding: 32px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: var(--bg-card);
}

.empty-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 4px;
}

.empty-subtitle {
  font-size: 11.5px;
  color: var(--text-muted);
  margin-bottom: 14px;
}

.empty-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  background: var(--primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.empty-action-btn:hover {
  background: var(--primary-hover);
}

/* 二次编辑弹窗样式 */
.edit-modal-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-form-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-form-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.edit-form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-main);
}

.edit-form-help {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
}

.edit-option-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.edit-opt-label {
  font-weight: 700;
  font-size: 12px;
  color: var(--primary);
  min-width: 18px;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.modal-footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
