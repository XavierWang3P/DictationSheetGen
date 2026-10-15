<template>
  <div class="quick-input-pane" data-debug-id="Q-001" data-debug-name="题目录入区">
    <n-card size="small" :bordered="false" class="pane-card">
      <template #header>
        <div class="pane-header-title">
          <span class="title-with-icon">
            <AppIcon name="edit" :size="16" />
            题目录入与试卷结构
          </span>
          <span class="quick-stat-badge" id="badgeWordCount" @click="switchToTab('paneList')" title="点击切换到试卷题目清单" style="cursor:pointer;">
            已添加 {{ state.draft.items.length }} 题 <AppIcon name="arrow-right" :size="12" />
          </span>
        </div>
      </template>

      <!-- 录入题型切换 (单词默写 / 句子挖空 / 句子默写 / 字母专项 / 选择题 / 填空题 / 英语作文) -->
      <div class="form-row" style="margin-bottom: 12px;">
        <label class="row-label">录入题型</label>
        <div class="segmented-control question-type-segmented" data-debug-id="Q-002" data-debug-name="题型切换器">
          <input
            type="radio"
            name="inputType"
            id="modeWriting"
            value="word-dictation"
            :checked="currentInputType === 'word-dictation'"
            @change="onInputTypeChange('word-dictation')"
          />
          <label for="modeWriting" class="qtype-btn qtype-span-3">单词默写</label>

          <input
            type="radio"
            name="inputType"
            id="modeCloze"
            value="sentence-cloze"
            :checked="currentInputType === 'sentence-cloze'"
            @change="onInputTypeChange('sentence-cloze')"
          />
          <label for="modeCloze" class="qtype-btn qtype-span-3">句子挖空</label>

          <input
            type="radio"
            name="inputType"
            id="typeSentence"
            value="sentence-dictation"
            :checked="currentInputType === 'sentence-dictation'"
            @change="onInputTypeChange('sentence-dictation')"
          />
          <label for="typeSentence" class="qtype-btn qtype-span-3">句子默写</label>

          <input
            type="radio"
            name="inputType"
            id="modeAlphabet"
            value="alphabet"
            :checked="currentInputType === 'alphabet'"
            @change="onInputTypeChange('alphabet')"
          />
          <label for="modeAlphabet" class="qtype-btn qtype-span-3">字母专项</label>

          <input
            type="radio"
            name="inputType"
            id="modeChoice"
            value="choice"
            :checked="currentInputType === 'choice'"
            @change="onInputTypeChange('choice')"
          />
          <label for="modeChoice" class="qtype-btn qtype-span-3">选择题</label>

          <input
            type="radio"
            name="inputType"
            id="modeInlineFill"
            value="inline-fill"
            :checked="currentInputType === 'inline-fill'"
            @change="onInputTypeChange('inline-fill')"
          />
          <label for="modeInlineFill" class="qtype-btn qtype-span-3">填空题</label>

          <input
            type="radio"
            name="inputType"
            id="modeComposition"
            value="english-composition"
            :checked="currentInputType === 'english-composition'"
            @change="onInputTypeChange('english-composition')"
          />
          <label for="modeComposition" class="qtype-btn qtype-span-3">英语作文</label>

          <input
            type="radio"
            name="inputType"
            id="modeSeparator"
            value="separator"
            :checked="currentInputType === 'separator'"
            @change="onInputTypeChange('separator')"
          />
          <label for="modeSeparator" class="qtype-btn qtype-span-3">分栏隔断</label>
        </div>
      </div>

      <!-- 题型 1: 句子挖空 (可视化切词胶囊 + 批量文本混合双模) -->
      <div v-if="currentInputType === 'sentence-cloze'" class="cloze-unified-editor">
        <QuestionEditorShell title="句子挖空题目设置" tip="输入句子后点击下方单词胶囊设空，或在文本中使用 [apple] 标记">
          <div class="form-item-block">
            <label class="item-label">英文句子</label>
            <input
              type="text"
              v-model="visualSentenceText"
              id="inputVisualSentence"
              placeholder="例: Ask your teacher for help."
              class="native-search-input"
              @input="onVisualSentenceInput"
            />
          </div>

          <div class="form-item-block">
            <label class="item-label">中文翻译</label>
            <input
              type="text"
              v-model="visualTranslationText"
              id="inputVisualTranslation"
              placeholder="例: 向你的老师求助。"
              class="native-search-input"
            />
          </div>

          <!-- 可视化单词胶囊 -->
          <div style="margin-top: 4px;">
            <label class="item-label" style="display:block; margin-bottom: 6px;">
              点击单词设为挖空 (高亮绿色为挖空目标)：
            </label>
            <div class="visual-token-wrap" id="visualTokenWrap" data-debug-id="C-003" data-debug-name="可视化切词胶囊区">
              <template v-if="visualWordTokens.length === 0">
                <span class="token-placeholder">请输入上方英文句子以生成可点击单词</span>
              </template>
              <template v-else>
                <button
                  v-for="tok in visualWordTokens"
                  :key="tok.id"
                  type="button"
                  class="visual-token-btn"
                  :class="{ 'is-blank': tok.isBlank }"
                  :data-id="tok.id"
                  @click.stop="toggleVisualTokenBlank(tok)"
                >
                  {{ tok.text }}
                </button>
              </template>
            </div>
          </div>

          <!-- 实时效果预览 -->
          <div style="margin-top: 6px;">
            <label class="item-label" style="display:block; margin-bottom: 6px;">
              默写纸挖空效果预览：
            </label>
            <div class="visual-cloze-preview" id="visualClozePreview">
              <template v-if="visualSegments.length === 0">
                <span class="token-placeholder">暂无预览内容</span>
              </template>
              <template v-else>
                <div style="font-size:13px; color:var(--text-main); line-height:1.6;">
                  <template v-for="(seg, sIdx) in visualSegments" :key="sIdx">
                    <span
                      v-if="seg.blank"
                      style="border-bottom:2px solid var(--primary); color:var(--primary); font-weight:700; padding:0 4px; margin:0 2px;"
                    >
                      ( {{ seg.text.trim() }} )
                    </span>
                    <span v-else>{{ seg.text }}</span>
                  </template>
                </div>
                <div v-if="visualTranslationText" style="font-size:11px; color:var(--text-muted); margin-top:4px;">
                  释义：{{ visualTranslationText }}
                </div>
              </template>
            </div>
          </div>

          <!-- 批量多句粘贴 (可选) -->
          <div style="margin-top: 8px;">
            <label class="item-label" style="display:block; margin-bottom: 4px;">
              批量多句标记粘贴 (可选)：
            </label>
            <textarea
              class="word-textarea"
              id="customWordTextarea"
              v-model="rawText"
              rows="3"
              placeholder="在此批量粘贴多条挖空句子（每行一条，用 [apple] 标记挖空词，用 | 分隔中文翻译）"
              style="width: 100%; border: 1px solid var(--border-color); border-radius: 5px; padding: 6px; font-size: 12px;"
            ></textarea>
          </div>

          <!-- 高级版式选项 (折叠收纳) -->
          <template #advanced>
            <div class="form-row-compact">
              <span class="sub-label">四线格长:</span>
              <div class="segmented-control mini">
                <input type="radio" name="clozeBlankWidth" id="blankWidthAuto" value="auto" :checked="state.draft.settings.clozeBlankWidth === 'auto'" @change="state.draft.settings.clozeBlankWidth = 'auto'" />
                <label for="blankWidthAuto">按词自适应</label>
                <input type="radio" name="clozeBlankWidth" id="blankWidth1Word" value="1word" :checked="state.draft.settings.clozeBlankWidth === '1word'" @change="state.draft.settings.clozeBlankWidth = '1word'" />
                <label for="blankWidth1Word">1格</label>
                <input type="radio" name="clozeBlankWidth" id="blankWidth1Point5Words" value="1.5words" :checked="state.draft.settings.clozeBlankWidth === '1.5words'" @change="state.draft.settings.clozeBlankWidth = '1.5words'" />
                <label for="blankWidth1Point5Words">1.5格</label>
                <input type="radio" name="clozeBlankWidth" id="blankWidth2Words" value="2words" :checked="state.draft.settings.clozeBlankWidth === '2words'" @change="state.draft.settings.clozeBlankWidth = '2words'" />
                <label for="blankWidth2Words">2格</label>
                <input type="radio" name="clozeBlankWidth" id="blankWidth2Point5Words" value="2.5words" :checked="state.draft.settings.clozeBlankWidth === '2.5words'" @change="state.draft.settings.clozeBlankWidth = '2.5words'" />
                <label for="blankWidth2Point5Words">2.5格</label>
                <input type="radio" name="clozeBlankWidth" id="blankWidth3Words" value="3words" :checked="state.draft.settings.clozeBlankWidth === '3words'" @change="state.draft.settings.clozeBlankWidth = '3words'" />
                <label for="blankWidth3Words">3格</label>
              </div>
            </div>
          </template>

          <!-- 操作按钮栏 -->
          <template #actions>
            <n-button
              type="primary"
              size="small"
              id="btnParseText"
              data-debug-id="Q-004"
              data-debug-name="添加到试卷按钮"
              @click="handleAppendVisualCloze"
            >
              <template #icon><AppIcon name="plus" :size="14" /></template>
              添加到试卷
            </n-button>
            <button id="btnAddVisualToDraft" style="display:none;" aria-hidden="true" @click="handleAppendVisualCloze"></button>
            <button id="btnAppendText" style="display:none;" aria-hidden="true" @click="handleAppendVisualCloze"></button>

            <n-button
              size="small"
              id="btnSaveVisualToLib"
              @click="handleSaveVisualClozeToLib"
              title="将该句保存到备课句库"
            >
              <template #icon><AppIcon name="download" :size="14" /></template>
              存入句库
            </n-button>

            <n-button size="small" id="btnClearVisualCloze" @click="handleResetVisualCloze">
              <template #icon><AppIcon name="refresh" :size="14" /></template>
              重置
            </n-button>
          </template>
        </QuestionEditorShell>
      </div>

      <!-- 题型 2: 字母专项快捷生成面板 (仅在选择字母专项时展开) -->
      <div v-else-if="currentInputType === 'alphabet'" class="alphabet-control-card" id="alphabetControlCard">
        <QuestionEditorShell title="三年级英文字母专项设置" tip="支持 26 字母规范书写、前后左右邻居填空与大小写互换练习">
          <div class="alphabet-type-tabs" id="alphabetTypeTabs">
            <button
              type="button"
              class="alpha-type-btn"
              :class="{ active: alphabetActiveType === 'sequence' }"
              id="tabAlphaSeq"
              @click="alphabetActiveType = 'sequence'"
            >
              <AppIcon name="alphabet" :size="13" />
              26个字母默写
            </button>
            <button
              type="button"
              class="alpha-type-btn"
              :class="{ active: alphabetActiveType === 'neighbors' }"
              id="tabAlphaNeighbors"
              @click="alphabetActiveType = 'neighbors'"
            >
              <AppIcon name="refresh" :size="13" />
              字母左右邻居
            </button>
            <button
              type="button"
              class="alpha-type-btn"
              :class="{ active: alphabetActiveType === 'case' }"
              id="tabAlphaCase"
              @click="alphabetActiveType = 'case'"
            >
              <AppIcon name="tag" :size="13" />
              大小写转换
            </button>
          </div>

          <!-- 子面板 1: 26个字母默写 -->
          <div v-if="alphabetActiveType === 'sequence'" class="alpha-sub-config" id="paneAlphaSeq">
            <div class="form-row-compact">
              <span class="sub-label">排版行数:</span>
              <div class="segmented-control mini">
                <input type="radio" id="alphaRows3" :value="3" v-model="alphaSeqConfig.rowMode" />
                <label for="alphaRows3">3 行 (3×9)</label>
                <input type="radio" id="alphaRows4" :value="4" v-model="alphaSeqConfig.rowMode" />
                <label for="alphaRows4">4 行 (4×7)</label>
              </div>
            </div>

            <div class="form-row-compact">
              <span class="sub-label">大小写样式:</span>
              <div class="segmented-control mini">
                <input type="radio" id="alphaCasePair" value="pair" v-model="alphaSeqConfig.caseStyle" />
                <label for="alphaCasePair">大小写 (Aa)</label>
                <input type="radio" id="alphaCaseUpper" value="upper" v-model="alphaSeqConfig.caseStyle" />
                <label for="alphaCaseUpper">大写 (A-Z)</label>
                <input type="radio" id="alphaCaseLower" value="lower" v-model="alphaSeqConfig.caseStyle" />
                <label for="alphaCaseLower">小写 (a-z)</label>
              </div>
            </div>

            <div class="form-row-compact">
              <span class="sub-label">默写形式:</span>
              <div class="segmented-control mini">
                <input type="radio" id="alphaSubFull" value="full" v-model="alphaSeqConfig.subMode" />
                <label for="alphaSubFull">完整四线格 (全默写)</label>
                <input type="radio" id="alphaSubGap" value="gap" v-model="alphaSeqConfig.subMode" />
                <label for="alphaSubGap">字母表接龙填空</label>
                <input type="radio" id="alphaSubShuffle" value="shuffle" v-model="alphaSeqConfig.subMode" />
                <label for="alphaSubShuffle">乱序听写</label>
              </div>
            </div>
          </div>

          <!-- 子面板 2: 字母左右邻居 -->
          <div v-if="alphabetActiveType === 'neighbors'" class="alpha-sub-config" id="paneAlphaNeighbors">
            <div class="form-row-compact">
              <span class="sub-label">排版样式:</span>
              <div class="segmented-control mini">
                <input type="radio" id="neighLayoutBottom" value="bottom-4col" v-model="alphaNeighConfig.layoutStyle" />
                <label for="neighLayoutBottom">下方四线格 (每行4题，推荐)</label>
                <input type="radio" id="neighLayoutBottom5" value="bottom-5col" v-model="alphaNeighConfig.layoutStyle" />
                <label for="neighLayoutBottom5">每行5题</label>
                <input type="radio" id="neighLayoutRight" value="right-2col" v-model="alphaNeighConfig.layoutStyle" />
                <label for="neighLayoutRight">右侧四线格 (每行2题)</label>
              </div>
            </div>

            <div class="form-row-compact">
              <span class="sub-label">题目数量:</span>
              <div class="segmented-control mini">
                <input type="radio" id="neighCount6" :value="6" v-model="alphaNeighConfig.count" />
                <label for="neighCount6">6 题</label>
                <input type="radio" id="neighCount8" :value="8" v-model="alphaNeighConfig.count" />
                <label for="neighCount8">8 题 (推荐)</label>
                <input type="radio" id="neighCount12" :value="12" v-model="alphaNeighConfig.count" />
                <label for="neighCount12">12 题</label>
              </div>
            </div>

            <div class="form-row-compact">
              <span class="sub-label">字母大小写:</span>
              <div class="segmented-control mini">
                <input type="radio" id="neighCaseUpper" value="upper" v-model="alphaNeighConfig.caseStyle" />
                <label for="neighCaseUpper">大写 (B)</label>
                <input type="radio" id="neighCaseLower" value="lower" v-model="alphaNeighConfig.caseStyle" />
                <label for="neighCaseLower">小写 (b)</label>
                <input type="radio" id="neighCaseMix" value="mix" v-model="alphaNeighConfig.caseStyle" />
                <label for="neighCaseMix">混合</label>
              </div>
            </div>
          </div>

          <!-- 子面板 3: 大小写转换 -->
          <div v-if="alphabetActiveType === 'case'" class="alpha-sub-config" id="paneAlphaCase">
            <div class="form-row-compact">
              <span class="sub-label">排版样式:</span>
              <div class="segmented-control mini">
                <input type="radio" id="caseLayoutBottom" value="bottom-4col" v-model="alphaCaseConfig.layoutStyle" />
                <label for="caseLayoutBottom">下方四线格 (每行4题，推荐)</label>
                <input type="radio" id="caseLayoutBottom5" value="bottom-5col" v-model="alphaCaseConfig.layoutStyle" />
                <label for="caseLayoutBottom5">每行5题</label>
                <input type="radio" id="caseLayoutRight" value="right-2col" v-model="alphaCaseConfig.layoutStyle" />
                <label for="caseLayoutRight">右侧四线格 (每行2题)</label>
              </div>
            </div>

            <div class="form-row-compact">
              <span class="sub-label">题目数量:</span>
              <div class="segmented-control mini">
                <input type="radio" id="caseCount6" :value="6" v-model="alphaCaseConfig.count" />
                <label for="caseCount6">6 题</label>
                <input type="radio" id="caseCount8" :value="8" v-model="alphaCaseConfig.count" />
                <label for="caseCount8">8 题 (推荐)</label>
                <input type="radio" id="caseCount10" :value="10" v-model="alphaCaseConfig.count" />
                <label for="caseCount10">10 题</label>
                <input type="radio" id="caseCount12" :value="12" v-model="alphaCaseConfig.count" />
                <label for="caseCount12">12 题</label>
              </div>
            </div>

            <div class="form-row-compact">
              <span class="sub-label">转换形式:</span>
              <div class="segmented-control mini">
                <input type="radio" id="caseToU" value="lower_to_upper" v-model="alphaCaseConfig.direction" />
                <label for="caseToU">看小写写大写</label>
                <input type="radio" id="caseToL" value="upper_to_lower" v-model="alphaCaseConfig.direction" />
                <label for="caseToL">看大写写小写</label>
                <input type="radio" id="caseRand" value="random_switch" v-model="alphaCaseConfig.direction" />
                <label for="caseRand">随机互换</label>
              </div>
            </div>
          </div>

          <template #actions>
            <n-button type="primary" size="small" id="btnGenerateAlphabet" @click="handleGenerateAlphabet">
              <template #icon><AppIcon name="plus" :size="14" /></template>
              生成并添加到试卷
            </n-button>
          </template>
        </QuestionEditorShell>
      </div>

      <!-- 题型 3: 通用结构化编辑器 (选择题 / 填空题 / 英语作文) -->
      <GeneralQuestionEditor
        v-else-if="structuredTypes.includes(currentInputType)"
        :type="currentInputType"
        :editing-item="editingItem"
        @submit="handleStructuredSubmit"
        @cancel="cancelEditing"
        @error="message.error"
      />

      <!-- 题型 4: 分栏隔断组件 (独立分栏规则与区域隔断) -->
      <div v-else-if="currentInputType === 'separator'" class="separator-unified-editor">
        <QuestionEditorShell
          title="分栏隔断设置"
          tip="插入隔断后，试卷被划分为独立区域，该隔断之后的所有题目将遵循此区域专属的每行题数列数规则。"
        >
          <div class="form-row-compact" style="margin-bottom: 12px;">
            <span class="sub-label">隔断标题:</span>
            <input
              type="text"
              class="form-control"
              v-model="separatorForm.title"
              placeholder="例如：Part 2: 重点句子挖空默写（可留空仅显示线条）"
              style="flex: 1; border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 8px; font-size: 12px;"
            />
          </div>

          <div class="form-row-compact" style="margin-bottom: 12px;">
            <span class="sub-label">后续题数列数:</span>
            <div class="segmented-control mini">
              <input type="radio" id="sepColInherit" :value="null" v-model="separatorForm.sectionColumns" />
              <label for="sepColInherit">继承默认</label>
              <input type="radio" id="sepCol1" :value="1" v-model="separatorForm.sectionColumns" />
              <label for="sepCol1">1 列</label>
              <input type="radio" id="sepCol2" :value="2" v-model="separatorForm.sectionColumns" />
              <label for="sepCol2">2 列</label>
              <input type="radio" id="sepCol3" :value="3" v-model="separatorForm.sectionColumns" />
              <label for="sepCol3">3 列</label>
              <input type="radio" id="sepCol4" :value="4" v-model="separatorForm.sectionColumns" />
              <label for="sepCol4">4 列</label>
              <input type="radio" id="sepCol5" :value="5" v-model="separatorForm.sectionColumns" />
              <label for="sepCol5">5 列</label>
            </div>
          </div>

          <template #actions>
            <n-button type="primary" size="small" id="btnAddSeparator" @click="handleAppendSeparator">
              <template #icon><AppIcon name="plus" :size="14" /></template>
              插入分栏隔断到试卷
            </n-button>
          </template>
        </QuestionEditorShell>
      </div>

      <!-- 题型 5: 单词默写与整句默写快速文本录入框 -->
      <div v-else class="text-unified-editor">
        <QuestionEditorShell
          :title="currentInputType === 'word-dictation' ? '单词默写录入' : '句子默写录入'"
          :tip="inputHelperTip"
        >
          <textarea
            class="word-textarea"
            id="customWordTextarea"
            v-model="rawText"
            rows="7"
            :placeholder="inputPlaceholder"
            data-debug-id="Q-003"
            data-debug-name="快速输入文本框"
            style="width: 100%; min-height: 150px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main); border-radius: 6px; padding: 10px; font-size: 13px; line-height: 1.55; font-family: inherit; resize: vertical;"
          ></textarea>

          <template #actions>
            <n-button
              type="primary"
              size="small"
              id="btnParseText"
              data-debug-id="Q-004"
              data-debug-name="添加到试卷按钮"
              @click="handleAppendText"
            >
              <template #icon><AppIcon name="plus" :size="14" /></template>
              添加到试卷
            </n-button>

            <!-- 兼容隐藏桩 -->
            <button id="btnAppendText" style="display:none;" aria-hidden="true" @click="handleAppendText"></button>
            <button id="btnLoadDefaultSample" style="display:none;" aria-hidden="true" @click="handleLoadDefaultCompat"></button>

            <n-button
              size="small"
              id="btnSaveDraftToLib"
              data-debug-id="Q-005"
              data-debug-name="存入词库按钮"
              @click="handleSaveDraftToLib"
              title="将当前试卷词汇保存到本地词库"
            >
              <template #icon><AppIcon name="download" :size="14" /></template>
              存入词库
            </n-button>

            <n-popconfirm
              @positive-click="handleClear"
              positive-text="确定"
              negative-text="取消"
            >
              <template #trigger>
                <n-button
                  size="small"
                  type="error"
                  ghost
                  id="btnClearWords"
                  data-debug-id="Q-006"
                  data-debug-name="清空试卷按钮"
                >
                  <template #icon><AppIcon name="trash" :size="14" /></template>
                  清空试卷
                </n-button>
              </template>
              确定要清空试卷上的全部题目吗？
            </n-popconfirm>
          </template>
        </QuestionEditorShell>
      </div>

      <!-- 底部工作流引导横幅：前往题目列表检查与排版 -->
      <div class="flow-guide-banner" @click="switchToTab('paneList')">
        <div class="banner-info">
          <AppIcon name="file-text" :size="15" />
          <span>试卷已有 <strong>{{ state.draft.items.length }}</strong> 道题目</span>
        </div>
        <button type="button" class="banner-btn">
          查看与调整题目清单 <AppIcon name="arrow-right" :size="14" />
        </button>
      </div>
    </n-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { NCard, NButton, NPopconfirm, useMessage } from 'naive-ui';
import { state, db } from '../stores/appStore.js';
import {
  parseCustomText,
  parseSentenceIntoVisualTokens,
  getVisualSegments,
  segmentsToMarkedText,
  generateId
} from '../core/tokenizer.js';
import {
  DEFAULT_WORDS_RAW,
  DEFAULT_CLOZE_WORDS_RAW,
  createDraftItem,
  autoAdaptCopiesAndCapacity
} from '../core/layout.js';
import { detectDuplicates } from '../core/storage.js';
import {
  generateAlphabetSequenceItems,
  generateLetterNeighborsItems,
  generateCaseConversionItems
} from '../core/alphabet.js';
import { getQuestionTypesByEditor, createQuestion } from '../question-types/registry.js';
import AppIcon from './AppIcon.vue';
import QuestionEditorShell from './QuestionEditorShell.vue';
import GeneralQuestionEditor from './GeneralQuestionEditor.vue';

const message = useMessage();
const rawText = ref('');
const currentInputType = ref('word-dictation');
const structuredTypes = getQuestionTypesByEditor('GeneralQuestionEditor');
const editingIndex = ref(-1);
const editingItem = computed(() => editingIndex.value >= 0 ? state.draft.items[editingIndex.value] : null);

// 可视化挖空交互状态
const visualSentenceText = ref('Ask your teacher for help.');
const visualTranslationText = ref('向你的老师求助。');
const visualTokens = ref(parseSentenceIntoVisualTokens(visualSentenceText.value));

const visualWordTokens = computed(() => visualTokens.value.filter(t => t.isWord));
const visualSegments = computed(() => getVisualSegments(visualTokens.value));
const hasVisualBlank = computed(() => visualSegments.value.some(s => s.blank));

function onVisualSentenceInput(e) {
  if (e?.target) {
    visualSentenceText.value = e.target.value;
  }
  visualTokens.value = parseSentenceIntoVisualTokens(visualSentenceText.value);
}

function toggleVisualTokenBlank(tok) {
  tok.isBlank = !tok.isBlank;
}

function handleAppendVisualCloze() {
  const domTextarea = document.getElementById('customWordTextarea');
  const batchVal = (domTextarea?.value || rawText.value || '').trim();
  if (batchVal) {
    handleAppendText();
    return;
  }
  if (!hasVisualBlank.value) {
    message.warning('请先点击上方胶囊单词设置至少一个挖空目标！');
    return;
  }
  const enMarked = segmentsToMarkedText(visualSegments.value);
  const draftItem = createDraftItem({
    id: generateId('s'),
    type: 'sentence',
    questionType: 'sentence-cloze',
    en: enMarked,
    zh: visualTranslationText.value.trim(),
    translation: visualTranslationText.value.trim(),
    segments: visualSegments.value
  });
  state.draft.items.push(draftItem);
  state.draft.settings.dictMode = 'cloze';
  const adapted = autoAdaptCopiesAndCapacity(state.draft.items, state.draft.settings);
  state.draft.settings.copiesPerPage = adapted.copiesPerPage;
  state.draft.settings.wordsPerPage = adapted.wordsPerPage;
  message.success('已将挖空句子添加到试卷！');
}

async function handleSaveVisualClozeToLib() {
  if (!hasVisualBlank.value) {
    message.warning('请先点击上方单词设置至少一个挖空目标！');
    return;
  }
  const enMarked = segmentsToMarkedText(visualSegments.value);
  const sentenceItem = {
    id: generateId('s'),
    type: 'sentence',
    questionType: 'sentence-cloze',
    en: enMarked,
    zh: visualTranslationText.value.trim(),
    translation: visualTranslationText.value.trim(),
    segments: visualSegments.value,
    updatedAt: Date.now()
  };
  state.library.sentences.unshift(sentenceItem);
  await db.bulkPut('sentences', [sentenceItem]);
  message.success('已成功保存至本地句库！');
}

function handleResetVisualCloze() {
  visualSentenceText.value = '';
  visualTranslationText.value = '';
  visualTokens.value = [];
}

const inputPlaceholder = computed(() => {
  if (currentInputType.value === 'sentence-dictation') {
    return '在此输入或粘贴完整句子（支持每行一条，学生在四线三格中默写整句）。\n示例：\nHow are you? 你好吗？\nThis is my new classroom. 这是我的新教室。';
  }
  return '在此输入或粘贴单词（支持纯中文、英文、或中英对照，每行一条）。\n示例：\napple 苹果\nbanana 香蕉\nclassroom 教室';
});

const inputHelperTip = computed(() => {
  if (currentInputType.value === 'sentence-dictation') {
    return '提示：整句默写模式，中文作为题干，根据句子长度智能分配 1~3 行四线三格供学生书写。';
  }
  return '提示：支持每行一词；支持纯中文、纯英文或“英文 中文”对照；中文为空时仍生成四线格。';
});

function onInputTypeChange(type) {
  currentInputType.value = type;
  if (editingItem.value?.questionType !== type) editingIndex.value = -1;
  if (type === 'sentence-cloze') {
    state.draft.settings.dictMode = 'cloze';
  } else if (type === 'alphabet') {
    state.draft.settings.dictMode = 'alphabet';
  } else if (type === 'sentence-dictation') {
    state.draft.settings.dictMode = 'sentence';
  } else if (structuredTypes.includes(type)) {
    state.draft.settings.dictMode = 'mixed';
  } else {
    state.draft.settings.dictMode = 'writing';
  }
}

function handleAppendText() {
  const domTextarea = document.getElementById('customWordTextarea');
  const text = (domTextarea?.value || rawText.value || '').trim();
  if (!text) {
    message.warning('请先输入或粘贴内容');
    return;
  }
  const mode = (currentInputType.value === 'sentence-cloze' || state.draft.settings.dictMode === 'cloze') ? 'cloze' : (currentInputType.value === 'sentence-dictation' ? 'sentence' : currentInputType.value);
  const items = parseCustomText(text, mode);
  if (items.length === 0) {
    message.warning('未能识别有效题目');
    return;
  }
  const newItems = items.map(it => {
    if (currentInputType.value === 'sentence-dictation') {
      return createDraftItem({ ...it, type: 'sentence', questionType: 'sentence-dictation' });
    }
    if (currentInputType.value === 'sentence-cloze' || state.draft.settings.dictMode === 'cloze') {
      return createDraftItem({ ...it, type: 'sentence', questionType: 'sentence-cloze' });
    }
    return createDraftItem(it, currentInputType.value);
  });
  newItems.forEach(it => state.draft.items.push(it));
  rawText.value = '';
  if (domTextarea) domTextarea.value = '';
  const adapted = autoAdaptCopiesAndCapacity(state.draft.items, state.draft.settings);
  state.draft.settings.copiesPerPage = adapted.copiesPerPage;
  state.draft.settings.wordsPerPage = adapted.wordsPerPage;
  message.success(`已追加 ${newItems.length} 道题目到当前试卷！`);
}

function handleStructuredSubmit(item) {
  if (editingIndex.value >= 0) {
    state.draft.items[editingIndex.value] = item;
    editingIndex.value = -1;
    message.success('题目修改已保存');
  } else {
    state.draft.items.push(item);
    state.draft.settings.wordsPerPage = Math.max(state.draft.settings.wordsPerPage || 9, state.draft.items.length);
    message.success('题目已添加到试卷');
  }
}

function cancelEditing() {
  editingIndex.value = -1;
}

// 字母专项配置
const alphabetActiveType = ref('sequence');
const alphaSeqConfig = ref({ caseStyle: 'pair', subMode: 'full', rowMode: 3 });
const alphaNeighConfig = ref({ count: 8, caseStyle: 'upper', layoutStyle: 'bottom-4col' });
const alphaCaseConfig = ref({ count: 8, direction: 'random_switch', layoutStyle: 'bottom-4col' });

// 分栏隔断设置
const separatorForm = ref({
  title: '二、拓展强化练习',
  sectionColumns: null
});

function handleAppendSeparator() {
  const item = createQuestion('separator', {
    title: separatorForm.value.title.trim(),
    text: separatorForm.value.title.trim(),
    sectionColumns: separatorForm.value.sectionColumns
  });
  state.draft.items.push(item);
  state.draft.settings.wordsPerPage = Math.max(state.draft.settings.wordsPerPage || 9, state.draft.items.length);
  message.success('已插入分栏隔断！后续题目将遵循此区域独立分栏。');
}

function handleGenerateAlphabet() {
  let newItems = [];
  if (alphabetActiveType.value === 'sequence') {
    newItems = generateAlphabetSequenceItems(alphaSeqConfig.value);
    state.draft.settings.alphabet26Rows = Number(alphaSeqConfig.value.rowMode) === 4 ? 4 : 3;
  } else if (alphabetActiveType.value === 'neighbors') {
    newItems = generateLetterNeighborsItems({
      count: alphaNeighConfig.value.count,
      caseStyle: alphaNeighConfig.value.caseStyle,
      neighborType: 'both',
      layoutStyle: alphaNeighConfig.value.layoutStyle
    });
  } else if (alphabetActiveType.value === 'case') {
    newItems = generateCaseConversionItems({
      count: alphaCaseConfig.value.count || 8,
      direction: alphaCaseConfig.value.direction,
      layoutStyle: alphaCaseConfig.value.layoutStyle
    });
  }

  if (newItems.length > 0) {
    newItems.forEach(it => state.draft.items.push(it));
    message.success(`已成功添加 ${newItems.length} 道字母专项题目！`);
  }
}

async function handleSaveDraftToLib() {
  if (state.draft.items.length === 0) {
    message.warning('当前试卷为空，无法存入词库');
    return;
  }
  const res = detectDuplicates(state.library.words, state.draft.items);
  if (res.unique.length === 0) {
    message.info('当前试卷所有题目在本地词库中均已存在，无需重复保存');
    return;
  }
  res.unique.forEach(w => state.library.words.push(w));
  await db.bulkPut('words', res.unique);
  const dupTip = res.duplicates.length > 0 ? `（自动跳过 ${res.duplicates.length} 条重复词条）` : '';
  message.success(`已将 ${res.unique.length} 条题目存入本地词库${dupTip}！`);
}

function handleClear() {
  state.draft.items = [];
  message.success('已清空当前试卷上的全部题目！');
}

function handleLoadDefaultCompat() {
  if (state.draft.settings.dictMode === 'cloze' || currentInputType.value === 'sentence-cloze') {
    state.draft.items = DEFAULT_CLOZE_WORDS_RAW.map(s => createDraftItem(s));
    state.draft.settings.columns = 2;
    const adapted = autoAdaptCopiesAndCapacity(state.draft.items, state.draft.settings);
    state.draft.settings.copiesPerPage = adapted.copiesPerPage;
    state.draft.settings.wordsPerPage = adapted.wordsPerPage;
    message.success('已载入 9 个句子挖空示例！');
  } else {
    const items = DEFAULT_WORDS_RAW.map(w => createDraftItem(w));
    state.draft.items = items;
    state.draft.settings.wordsPerPage = 9;
    state.draft.settings.copiesPerPage = 3;
    state.draft.settings.columns = 3;
    message.success('已载入 9 词示例！');
  }
}

function switchToTab(tabKey) {
  state.ui.activeView = tabKey;
}

onMounted(() => {
  window.addEventListener('edit-question', (e) => {
    const idx = e.detail;
    if (idx >= 0 && idx < state.draft.items.length) {
      editingIndex.value = idx;
      currentInputType.value = state.draft.items[idx].questionType;
    }
  });
});
</script>

<style scoped>
.quick-input-pane {
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
  justify-content: space-between;
  width: 100%;
}

.title-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
}

.quick-stat-badge {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--primary);
  background: var(--primary-light);
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid var(--primary-border);
  transition: all 0.15s ease;
}

.quick-stat-badge:hover {
  background: var(--primary);
  color: white;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.row-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

.segmented-control {
  display: flex;
  flex-wrap: wrap;
  background: var(--bg-app);
  padding: 3px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  gap: 2px;
}

.segmented-control input[type="radio"] {
  display: none;
}

.segmented-control label {
  flex: 1 0 auto;
  text-align: center;
  padding: 5px 8px;
  font-size: 11.5px;
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.segmented-control input[type="radio"]:checked + label {
  background: var(--bg-card);
  color: var(--primary);
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.segmented-control.mini label {
  padding: 3px 6px;
  font-size: 11px;
}

/* 录入题型切换器专用 12 列两行均分布局 (前4题占3/12，后3题占4/12，两行均整齐撑满且按钮尺寸规整一致) */
.question-type-segmented {
  display: grid !important;
  grid-template-columns: repeat(12, 1fr) !important;
  gap: 3px !important;
  padding: 3px !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

.question-type-segmented .qtype-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
  padding: 6px 2px !important;
  font-size: 11.5px !important;
  line-height: 1.2 !important;
  border-radius: 4px !important;
  box-sizing: border-box !important;
  width: 100% !important;
  min-height: 29px !important;
  flex: none !important;
}

.question-type-segmented .qtype-span-3 {
  grid-column: span 3 !important;
}

.question-type-segmented .qtype-span-4 {
  grid-column: span 4 !important;
}

.form-row-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11.5px;
  margin-bottom: 6px;
}

.sub-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
}

.native-search-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 12.5px;
  background: var(--bg-card);
  color: var(--text-main);
  box-sizing: border-box;
}

.form-item-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.item-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-muted);
}

.visual-token-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 8px;
  background: var(--bg-app);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  min-height: 40px;
  align-items: center;
}

.visual-token-btn {
  padding: 3px 8px;
  font-size: 12px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-card);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s ease;
}

.visual-token-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.visual-token-btn.is-blank {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(47, 102, 89, 0.3);
}

.token-placeholder {
  color: var(--text-light);
  font-size: 11.5px;
}

.visual-cloze-preview {
  padding: 8px 10px;
  background: var(--bg-app);
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  min-height: 38px;
}

.alphabet-type-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
}

.alpha-type-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 5px 4px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-card);
  color: var(--text-muted);
  cursor: pointer;
}

.alpha-type-btn.active {
  background: var(--primary-light);
  border-color: var(--primary-border);
  color: var(--primary);
  font-weight: 700;
}

.alpha-sub-config {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 底部引导横幅 */
.flow-guide-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  margin-top: 10px;
  background: var(--primary-light);
  border: 1px solid var(--primary-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.flow-guide-banner:hover {
  background: #d8e8e2;
}

.banner-info {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--primary);
}

.banner-btn {
  background: transparent;
  border: none;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--primary);
  cursor: pointer;
}
</style>
