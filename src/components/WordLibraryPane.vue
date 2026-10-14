<template>
  <div class="word-library-pane" data-debug-id="L-001" data-debug-name="本地词库区">
    <n-card size="small" :bordered="false" class="pane-card">
      <template #header>
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
          <span style="font-size:14px; font-weight:700; color:var(--text-main); display:inline-flex; align-items:center; gap:6px;">
            <AppIcon name="book" :size="16" />
            本地离线词汇库
          </span>
          <span class="quick-stat-badge" id="libStatBadge">共 {{ state.library.words.length }} 词</span>
        </div>
      </template>

      <p class="form-desc">
        独立离线词汇库，存储于浏览器 IndexedDB。支持按年级/单元分组管理，从词库加入试卷后修改释义不影响词库。
      </p>

      <!-- 词库单元 / 分组管理栏 -->
      <div class="lib-group-section" id="libGroupSection" data-debug-id="L-002" data-debug-name="词库分组导航">
        <div class="lib-group-header">
          <div style="display:flex; align-items:center; gap:5px;">
            <span style="font-size:12px; font-weight:600; color:var(--text-main); display:inline-flex; align-items:center; gap:4px;">
              <AppIcon name="tag" :size="13" />
              词库分组 / 单元
            </span>
            <span style="font-size:11px; color:var(--text-light);">({{ groupStats.length }} 组)</span>
          </div>

          <div style="display:flex; gap:6px;">
            <button
              type="button"
              class="lib-group-action-btn"
              id="btnNewGroup"
              @click="openNewGroupModal"
              title="新建单词分组，如 X年级UnitX"
            >
              <AppIcon name="plus" :size="12" />
              新建组
            </button>
            <button
              type="button"
              class="lib-group-action-btn"
              id="btnPresetUnits"
              @click="showPresetModal = true"
              title="载入人教PEP小学英语经典单元词库"
            >
              <AppIcon name="book" :size="12" />
              课标单元
            </button>
          </div>
        </div>

        <!-- 分组胶囊横向滚动选择列表 -->
        <div class="group-pills-bar" id="groupPillsBar">
          <button
            type="button"
            class="group-pill-btn"
            :class="{ active: activeGroup === 'all' }"
            id="pillGroupAll"
            @click="activeGroup = 'all'"
          >
            全部 ({{ state.library.words.length }})
          </button>
          <div
            v-for="grp in groupStats"
            :key="grp.name"
            class="group-pill-btn"
            :class="{ active: activeGroup === grp.name }"
            :id="'pillGroup_' + cleanId(grp.name)"
            role="button"
            tabindex="0"
            @click="activeGroup = grp.name"
            @keydown.enter.space.prevent="activeGroup = grp.name"
          >
            <span>{{ grp.name }} ({{ grp.count }})</span>
            <IconActionButton
              v-if="grp.name !== '通用词汇'"
              class="pill-del-icon"
              :id="'btnDelPill_' + cleanId(grp.name)"
              label="删除此分组"
              icon="x"
              :icon-size="10"
              @click.stop="promptDeleteGroup(grp.name)"
            />
          </div>
        </div>
      </div>

      <!-- 搜索框 -->
      <div style="margin-bottom: 10px;">
        <input
          type="text"
          v-model="searchQuery"
          id="inputSearchLib"
          data-debug-id="L-003"
          data-debug-name="词库搜索输入框"
          placeholder="搜索词库 (英文、中文或单元分组)..."
          class="native-search-input"
        />
      </div>

      <!-- 操作工具栏 -->
      <div class="toolbar-row">
        <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
          <n-button size="small" id="btnLibSelectAll" @click="handleToggleSelectAll">
            {{ isAllSelected ? '取消全选' : '全选 / 反选' }}
          </n-button>
          <n-button
            type="primary"
            size="small"
            id="btnLibBatchAddToDraft"
            data-debug-id="L-004"
            data-debug-name="词库批量加入试卷按钮"
            @click="handleBatchAdd"
          >
            <template #icon><AppIcon name="plus" :size="14" /></template>
            批量加入试卷
          </n-button>
          <n-button
            v-if="selectedIds.size > 0"
            size="small"
            id="btnBatchSetGroup"
            @click="openBatchSetGroupModal"
            title="为已选中的单词统一设置/移动分组"
          >
            <template #icon><AppIcon name="tag" :size="14" /></template>
            设为分组
          </n-button>
        </div>

        <div style="display:flex; gap:6px; align-items:center;">
          <n-button
            size="small"
            type="primary"
            ghost
            id="btnLibImport"
            data-debug-id="L-005"
            data-debug-name="词库导入按钮"
            @click="openImportModal"
            title="从 Excel / CSV / 剪贴板批量导入单词到词库"
          >
            <template #icon><AppIcon name="upload" :size="14" /></template>
            导入
          </n-button>
          <n-button
            size="small"
            id="btnLibExport"
            data-debug-id="L-006"
            data-debug-name="词库导出按钮"
            @click="handleExportLib"
          >
            <template #icon><AppIcon name="download" :size="14" /></template>
            导出
          </n-button>
          <n-popconfirm
            @positive-click="handleClearLib"
            positive-text="确定"
            negative-text="取消"
          >
            <template #trigger>
              <n-button size="small" type="error" ghost id="btnLibClear">
                <template #icon><AppIcon name="trash" :size="14" /></template>
                清空
              </n-button>
            </template>
            确定要清空本地词库中的所有词汇吗？当前试卷中的内容不受影响。
          </n-popconfirm>
        </div>
      </div>

      <!-- 选中状态信息 -->
      <div id="libSelectedInfo" class="selected-info-text">
        当前展示 <strong>{{ filteredWords.length }}</strong> 词 · 已选中 <strong id="libSelectedCount" style="color:var(--primary);">{{ selectedIds.size }}</strong> 词
        <span v-if="activeGroup !== 'all'" style="margin-left:6px; color:var(--primary); font-weight:500;">
          [当前单元: {{ activeGroup }}]
          <button
            v-if="activeGroup !== '通用词汇'"
            type="button"
            class="btn-delete-group-inline"
            id="btnDeleteCurrentGroup"
            @click="promptDeleteGroup(activeGroup)"
            title="删除当前分组"
          >
            <AppIcon name="trash" :size="12" />
            删除该组
          </button>
        </span>
      </div>

      <!-- 词库条目列表 (由 Vue 响应式 v-for 驱动，无 innerHTML 干扰) -->
      <div
        class="words-list-container"
        id="libWordsContainer"
        data-debug-id="L-007"
        data-debug-name="词库条目列表"
      >
        <template v-if="filteredWords.length === 0">
          <div class="empty-list-tip">
            {{ searchQuery ? '未检索到符合条件的词汇' : (activeGroup !== 'all' ? `「${activeGroup}」分组暂无单词，可勾选单词后设置分组移入` : '本地词库为空，可从左侧试卷保存或点击下方导入') }}
            <div style="margin-top:10px; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;" v-if="!searchQuery">
              <n-button size="small" type="primary" ghost @click="openImportModal" id="btnEmptyTipImport">
                <template #icon><AppIcon name="upload" :size="14" /></template>
                批量导入单词 (支持 Excel / 剪贴板 / CSV)
              </n-button>
              <n-button
                v-if="activeGroup !== 'all' && activeGroup !== '通用词汇'"
                size="small"
                type="error"
                ghost
                @click="promptDeleteGroup(activeGroup)"
                id="btnDeleteEmptyGroup"
              >
                <template #icon><AppIcon name="trash" :size="14" /></template>
                删除此空分组
              </n-button>
            </div>
          </div>
        </template>

        <template v-else>
          <div
            v-for="w in filteredWords"
            :key="w.id"
            class="lib-item-row"
            :data-id="w.id"
          >
            <input
              type="checkbox"
              class="lib-item-check"
              :data-id="w.id"
              :checked="selectedIds.has(w.id)"
              @change.stop="toggleItemSelect(w.id)"
              style="cursor:pointer;"
            />

            <div class="lib-item-text">
              <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <strong style="color:var(--text-main); font-size:12.5px;">{{ w.en }}</strong>
                <span v-if="w.phonetic" style="color:var(--accent); font-size:11px;">[{{ w.phonetic }}]</span>
                <span
                  class="word-group-tag"
                  :title="'点击更改分组（当前：' + (w.group || '通用词汇') + '）'"
                  @click.stop="openEditSingleGroup(w)"
                >
                  <AppIcon name="tag" :size="11" />
                  {{ w.group || '通用词汇' }}
                </span>
              </div>
              <div style="color:var(--text-muted); font-size:11.5px; margin-top:2px;">
                {{ w.zh || '' }}
              </div>
            </div>

            <div class="lib-item-actions">
              <button
                type="button"
                class="btn-lib-add btn-act"
                :data-id="w.id"
                title="添加到当前试卷"
                @click.stop="handleAddSingle(w)"
              >
                <AppIcon name="plus" :size="11" />
                试卷
              </button>
              <IconActionButton
                class="btn-lib-del btn-act del"
                :data-id="w.id"
                label="从词库中删除"
                icon="trash"
                :icon-size="11"
                @click.stop="handleDelete(w.id)"
              />
            </div>
          </div>
        </template>
      </div>
    </n-card>

    <!-- 弹窗 1: 新建词库分组 -->
    <n-modal
      v-model:show="showNewGroupModal"
      preset="card"
      title="新建词库分组"
      style="width: 380px; max-width: 92vw;"
    >
      <div style="display:flex; flex-direction:column; gap:12px;">
        <p style="font-size:12px; color:var(--text-muted); margin:0;">
          请输入分组名称，例如：<code>三年级上册 Unit 2</code> 或 <code>期末高频易错词</code>。
        </p>
        <input
          type="text"
          v-model="newGroupName"
          id="inputNewGroupName"
          placeholder="请输入分组名称，如：三年级Unit 2"
          class="native-search-input"
          @keyup.enter="handleCreateGroup"
        />
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <n-button size="small" @click="showNewGroupModal = false">取消</n-button>
          <n-button type="primary" size="small" id="btnConfirmNewGroup" @click="handleCreateGroup">确定创建</n-button>
        </div>
      </div>
    </n-modal>

    <!-- 弹窗 2: 批量设置分组 -->
    <n-modal
      v-model:show="showBatchGroupModal"
      preset="card"
      :title="`批量设置分组 (已选 ${selectedIds.size} 词)`"
      style="width: 400px; max-width: 92vw;"
    >
      <div style="display:flex; flex-direction:column; gap:12px;">
        <p style="font-size:12px; color:var(--text-muted); margin:0;">
          将已勾选的 {{ selectedIds.size }} 个单词统一移入指定分组：
        </p>

        <div>
          <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">选择已有分组：</label>
          <div style="display:flex; gap:6px; flex-wrap:wrap; max-height:100px; overflow-y:auto;">
            <button
              v-for="g in allGroups"
              :key="g"
              type="button"
              class="group-select-chip"
              :class="{ selected: batchTargetGroup === g }"
              @click="batchTargetGroup = g; batchCustomGroup = ''"
            >
              {{ g }}
            </button>
          </div>
        </div>

        <div>
          <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">或输入新分组名称：</label>
          <input
            type="text"
            v-model="batchCustomGroup"
            id="inputBatchCustomGroup"
            placeholder="例如：三年级Unit 3"
            class="native-search-input"
            @focus="batchTargetGroup = ''"
          />
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:4px;">
          <n-button size="small" @click="showBatchGroupModal = false">取消</n-button>
          <n-button type="primary" size="small" id="btnConfirmBatchGroup" @click="handleApplyBatchGroup">应用分组</n-button>
        </div>
      </div>
    </n-modal>

    <!-- 弹窗 3: 单个单词修改分组 -->
    <n-modal
      v-model:show="showEditSingleModal"
      preset="card"
      :title="`修改「${editingWord?.en || ''}」的分组`"
      style="width: 380px; max-width: 92vw;"
    >
      <div style="display:flex; flex-direction:column; gap:12px;">
        <p style="font-size:12px; color:var(--text-muted); margin:0;">
          选择已有分组或输入新分组：
        </p>

        <div v-if="allGroups.length > 0">
          <div style="display:flex; gap:6px; flex-wrap:wrap; max-height:100px; overflow-y:auto; margin-bottom:8px;">
            <button
              v-for="g in allGroups"
              :key="g"
              type="button"
              class="group-select-chip"
              :class="{ selected: editingTargetGroup === g }"
              @click="editingTargetGroup = g"
            >
              {{ g }}
            </button>
          </div>
        </div>

        <input
          type="text"
          v-model="editingTargetGroup"
          id="inputSingleGroup"
          placeholder="输入分组名称，如：四年级Unit 1"
          class="native-search-input"
          @keyup.enter="handleSaveSingleGroup"
        />

        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <n-button size="small" @click="showEditSingleModal = false">取消</n-button>
          <n-button type="primary" size="small" id="btnConfirmSingleGroup" @click="handleSaveSingleGroup">保存</n-button>
        </div>
      </div>
    </n-modal>

    <!-- 弹窗 4: 课标教材经典单元词库预设 -->
    <n-modal
      v-model:show="showPresetModal"
      preset="card"
      title="载入课标教材经典单元词库"
      style="width: 440px; max-width: 95vw;"
    >
      <div style="display:flex; flex-direction:column; gap:12px;">
        <p style="font-size:12px; color:var(--text-muted); margin:0;">
          一键载入小学人教PEP英语核心单元词汇，自动按年级与单元归类：
        </p>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <div
            v-for="preset in PRESET_UNIT_LIBRARIES"
            :key="preset.name"
            class="preset-unit-card"
          >
            <div style="flex:1;">
              <strong style="color:var(--text-main); font-size:13px; display:block;">{{ preset.name }}</strong>
              <span style="font-size:11px; color:var(--text-muted);">{{ preset.description }} ({{ preset.words.length }} 词)</span>
            </div>
            <button
              type="button"
              class="lib-group-action-btn"
              :id="'btnImportUnit_' + cleanId(preset.name)"
              @click="handleImportPresetUnit(preset)"
            >
              <AppIcon name="plus" :size="12" />
              导入词库
            </button>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; margin-top:4px;">
          <n-button size="small" @click="showPresetModal = false">关闭</n-button>
        </div>
      </div>
    </n-modal>

    <!-- 弹窗 5: 批量导入词库 (Excel / CSV / 剪贴板 / 文本) -->
    <n-modal
      v-model:show="showImportModal"
      preset="card"
      title="批量导入单词库 (支持 Excel / 剪贴板 / CSV)"
      style="width: 540px; max-width: 95vw;"
    >
      <div class="import-modal-content">
        <!-- 格式说明与模板下载卡片 -->
        <div class="import-tips-banner">
          <div style="font-size:12px; font-weight:700; color:var(--primary); margin-bottom:4px; display:flex; align-items:center; gap:4px;">
            <AppIcon name="tag" :size="13" />
            支持的表格格式规范（可含表头，系统将自动识别）：
          </div>
          <div style="font-size:11.5px; color:var(--text-main); line-height:1.6;">
            • <strong>3 列格式（强烈推荐）</strong>：<code>[年级与单元] [英文单词] [中文释义]</code>，将自动按每行的年级和单元自动建组归类！<br/>
            • <strong>2 列格式</strong>：<code>[英文单词] [中文释义]</code>，将统一归入下方所选的默认单元分组中。
          </div>
          <div style="display:flex; gap:8px; margin-top:8px;">
            <button
              type="button"
              class="lib-group-action-btn"
              id="btnDownloadExcelTpl"
              @click="handleDownloadExcelTemplate"
              title="下载带有示例的 Excel 模版文件 (.xlsx)"
            >
              <AppIcon name="download" :size="12" />
              下载 Excel 模板 (.xlsx)
            </button>
            <button
              type="button"
              class="lib-group-action-btn"
              id="btnDownloadCsvTpl"
              @click="handleDownloadCsvTemplate"
              title="下载通用 CSV 格式模板 (.csv)"
            >
              <AppIcon name="download" :size="12" />
              下载 CSV 模板 (.csv)
            </button>
          </div>
        </div>

        <!-- 导入模式切换 (文件上传 vs 复制粘贴) -->
        <div style="display:flex; gap:8px; margin-top:12px; margin-bottom:10px;">
          <button
            type="button"
            class="tab-switch-pill"
            :class="{ active: importActiveTab === 'file' }"
            id="tabImportFile"
            @click="importActiveTab = 'file'"
          >
            <AppIcon name="upload" :size="13" />
            上传 Excel / CSV 文件
          </button>
          <button
            type="button"
            class="tab-switch-pill"
            :class="{ active: importActiveTab === 'paste' }"
            id="tabImportPaste"
            @click="importActiveTab = 'paste'"
          >
            <AppIcon name="edit" :size="13" />
            从 Excel 直接复制粘贴
          </button>
        </div>

        <!-- A: 文件上传区域 -->
        <div v-if="importActiveTab === 'file'" class="file-upload-box" @click="triggerImportFileInput">
          <input
            type="file"
            ref="importFileRef"
            id="fileLibImportInput"
            accept=".xlsx,.xls,.csv,.txt,.json"
            style="display:none;"
            @change="handleFileSelected"
          />
          <div style="font-size:24px; margin-bottom:6px; color:var(--primary);">
            <AppIcon name="upload" :size="28" />
          </div>
          <div style="font-size:13px; font-weight:600; color:var(--primary);">
            {{ importFileName || '点击选择 Excel / CSV 文件，或将文件拖至此处' }}
          </div>
          <div style="font-size:11px; color:var(--text-light); margin-top:4px;">
            支持 .xlsx, .xls, .csv, .txt 或 .json 备份文件
          </div>
        </div>

        <!-- B: 剪贴板文本粘贴区域 -->
        <div v-else>
          <textarea
            v-model="importPastedText"
            id="textareaPasteExcel"
            class="native-search-input"
            rows="6"
            placeholder="请在此处按 Ctrl + V 粘贴从 Excel 或 WPS 选中的单元格。例如：&#10;三年级上册 Unit 1	ruler	尺子&#10;三年级上册 Unit 1	pencil	铅笔&#10;四年级上册 Unit 1	window	窗户"
            style="width:100%; height:130px; font-size:12px; line-height:1.5; font-family:monospace; resize:vertical;"
            @input="handlePasteInput"
          ></textarea>
        </div>

        <!-- 默认归属单元设置 (针对两列无单元的表格) -->
        <div style="margin-top:10px;">
          <label style="font-size:11.5px; font-weight:600; color:var(--text-muted); display:block; margin-bottom:4px;">
            若表格未标注年级单元，默认归入单元分组：
          </label>
          <div style="display:flex; gap:6px;">
            <select
              v-model="importDefaultGroup"
              class="native-search-input"
              id="selectImportDefaultGroup"
              style="width:160px; font-size:12px; padding:4px 8px;"
              @change="recalcParsedWords"
            >
              <option value="通用词汇">通用词汇</option>
              <option v-for="g in allGroups" :key="g" :value="g">{{ g }}</option>
            </select>
            <input
              type="text"
              v-model="importCustomGroup"
              id="inputImportCustomGroup"
              placeholder="或输入新建单元（如：三年级Unit 3）"
              class="native-search-input"
              style="flex:1; font-size:12px;"
              @input="onImportCustomGroupInput"
            />
          </div>
        </div>

        <!-- 即时解析结果预览卡片 -->
        <div v-if="importParsedWords.length > 0" class="import-preview-box" id="importPreviewBox">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-size:12px; font-weight:700; color:var(--text-main);">
              成功解析 <strong>{{ importParsedWords.length }}</strong> 词 · 涵盖 <strong>{{ importDistinctGroups.length }}</strong> 个单元
            </span>
            <span style="font-size:11px; color:var(--accent);" v-if="importDupCount > 0">
              ({{ importDupCount }} 条与现有词库重复，将自动去重)
            </span>
          </div>

          <!-- 预览前 4 条数据展示 -->
          <div class="import-preview-table-wrap">
            <table class="import-preview-table">
              <thead>
                <tr>
                  <th style="width:28px;">#</th>
                  <th>单元分组</th>
                  <th>英文单词</th>
                  <th>中文释义</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(w, idx) in importParsedWords.slice(0, 4)" :key="idx">
                  <td>{{ idx + 1 }}</td>
                  <td><span class="preview-group-badge">{{ w.group }}</span></td>
                  <td><strong>{{ w.en }}</strong></td>
                  <td>{{ w.zh || '-' }}</td>
                </tr>
              </tbody>
            </table>
            <div v-if="importParsedWords.length > 4" style="text-align:center; font-size:11px; color:var(--text-muted); padding:4px 0;">
              ... 还有剩余 {{ importParsedWords.length - 4 }} 个词汇即将导入 ...
            </div>
          </div>
        </div>

        <!-- 底部控制按钮 -->
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:14px;">
          <n-button size="small" @click="showImportModal = false">取消</n-button>
          <n-button
            type="primary"
            size="small"
            id="btnConfirmImportLib"
            :disabled="importParsedWords.length === 0"
            @click="handleConfirmImport"
          >
            确认导入词库 ({{ importParsedWords.length }} 词)
          </n-button>
        </div>
      </div>
    </n-modal>

    <!-- 弹窗 6: 删除/解散分组 -->
    <n-modal
      v-model:show="showDeleteGroupModal"
      preset="card"
      title="删除词库分组"
      style="width: 440px; max-width: 90vw;"
    >
      <div>
        <p style="font-size:13px; color:var(--text-main); margin-bottom:12px; line-height:1.5;">
          确定要删除分组 <strong>「{{ groupToDelete }}」</strong> 吗？<br/>
          该分组下当前共有 <strong style="color:var(--primary);">{{ groupWordsCount }}</strong> 个单词。
        </p>

        <div style="background:var(--bg-sidebar); border:1px solid var(--border-color); border-radius:6px; padding:10px 12px; margin-bottom:14px;">
          <div style="font-size:12px; font-weight:600; margin-bottom:8px; color:var(--text-main);">
            请选择对组内 {{ groupWordsCount }} 个单词的处理方式：
          </div>

          <label style="display:flex; align-items:flex-start; gap:8px; margin-bottom:10px; cursor:pointer; font-size:12px;">
            <input type="radio" v-model="deleteGroupAction" value="dissolve" name="delGroupOpt" id="radioDelGroupDissolve" style="margin-top:2px;" />
            <div>
              <strong>仅解散该分组（推荐）</strong>
              <div style="color:var(--text-muted); font-size:11px; margin-top:2px;">
                保留组内单词，将它们移入「通用词汇」，单词不会从词库丢失。
              </div>
            </div>
          </label>

          <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer; font-size:12px;">
            <input type="radio" v-model="deleteGroupAction" value="deleteAll" name="delGroupOpt" id="radioDelGroupDeleteAll" style="margin-top:2px;" />
            <div>
              <strong style="color:var(--danger);">彻底删除分组及组内全部单词</strong>
              <div style="color:var(--text-muted); font-size:11px; margin-top:2px;">
                将这 {{ groupWordsCount }} 个单词同时从词库中彻底移除（不可恢复）。
              </div>
            </div>
          </label>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <n-button size="small" @click="showDeleteGroupModal = false">取消</n-button>
          <n-button
            type="error"
            size="small"
            id="btnConfirmDeleteGroup"
            @click="handleConfirmDeleteGroup"
          >
            确认删除
          </n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { NCard, NButton, NPopconfirm, NModal, NInput, useMessage } from 'naive-ui';
import { state, db } from '../stores/appStore.js';
import { createDraftItem, PRESET_UNIT_LIBRARIES } from '../core/layout.js';
import { detectDuplicates } from '../core/storage.js';
import AppIcon from './AppIcon.vue';
import IconActionButton from './IconActionButton.vue';
import {
  parseExcelOrCsvFile,
  parsePastedExcelText,
  downloadExcelTemplate,
  downloadCsvTemplate
} from '../core/excelParser.js';

const message = useMessage();
const searchQuery = ref('');
const selectedIds = ref(new Set());
const activeGroup = ref('all');

// 批量导入弹窗状态
const showImportModal = ref(false);
const importActiveTab = ref('file'); // 'file' or 'paste'
const importDefaultGroup = ref('通用词汇');
const importCustomGroup = ref('');
const importPastedText = ref('');
const importParsedWords = ref([]);
const importFileName = ref('');
const importFileRef = ref(null);
const importLoading = ref(false);

const importDistinctGroups = computed(() => {
  return [...new Set(importParsedWords.value.map(w => w.group || '通用词汇'))];
});

const importDupCount = computed(() => {
  if (importParsedWords.value.length === 0) return 0;
  const dupCheck = detectDuplicates(state.library.words, importParsedWords.value);
  return dupCheck.duplicates.length;
});

// 弹窗状态
const showNewGroupModal = ref(false);
const newGroupName = ref('');

const showBatchGroupModal = ref(false);
const batchTargetGroup = ref('');
const batchCustomGroup = ref('');

const showEditSingleModal = ref(false);
const editingWord = ref(null);
const editingTargetGroup = ref('');

const showPresetModal = ref(false);

// 删除分组状态
const showDeleteGroupModal = ref(false);
const groupToDelete = ref('');
const groupWordsCount = ref(0);
const deleteGroupAction = ref('dissolve'); // 'dissolve' or 'deleteAll'

function getSavedCustomGroups() {
  try {
    const raw = localStorage.getItem('dictation_custom_groups');
    if (raw) return new Set(JSON.parse(raw));
  } catch (e) {}
  return new Set();
}

function saveCustomGroups() {
  try {
    localStorage.setItem('dictation_custom_groups', JSON.stringify(Array.from(customGroups.value)));
  } catch (e) {}
}

const customGroups = ref(getSavedCustomGroups());

function cleanId(str) {
  return (str || '').replace(/\s+/g, '_');
}

// 所有已知的分组名称列表 (去重)
const allGroups = computed(() => {
  const set = new Set();
  state.library.words.forEach(w => {
    const g = (w.group || '通用词汇').trim();
    if (g) set.add(g);
  });
  customGroups.value.forEach(g => {
    if (g) set.add(g);
  });
  return Array.from(set);
});

// 每个分组的词汇数量统计
const groupStats = computed(() => {
  const map = new Map();
  // 1. 已有单词的分组计数
  state.library.words.forEach(w => {
    const g = (w.group || '通用词汇').trim();
    map.set(g, (map.get(g) || 0) + 1);
  });
  // 2. 用户自定义新建但尚未添加词的分组 (count = 0)
  customGroups.value.forEach(g => {
    if (!map.has(g)) {
      map.set(g, 0);
    }
  });
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
});

// 根据分组和搜索关键词过滤后的单词列表
const filteredWords = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  const grp = activeGroup.value;
  return state.library.words.filter(w => {
    const wGrp = (w.group || '通用词汇').trim();
    if (grp !== 'all' && wGrp !== grp) return false;
    if (!q) return true;
    const enMatch = (w.en || '').toLowerCase().includes(q);
    const zhMatch = (w.zh || '').toLowerCase().includes(q);
    const grpMatch = wGrp.toLowerCase().includes(q);
    return enMatch || zhMatch || grpMatch;
  });
});

const isAllSelected = computed(() => {
  if (filteredWords.value.length === 0) return false;
  return filteredWords.value.every(w => selectedIds.value.has(w.id));
});

function toggleItemSelect(id) {
  const newSet = new Set(selectedIds.value);
  if (newSet.has(id)) {
    newSet.delete(id);
  } else {
    newSet.add(id);
  }
  selectedIds.value = newSet;
}

function handleToggleSelectAll() {
  const list = filteredWords.value;
  const allSel = list.length > 0 && list.every(w => selectedIds.value.has(w.id));
  const newSet = new Set(selectedIds.value);
  if (allSel) {
    list.forEach(w => newSet.delete(w.id));
  } else {
    list.forEach(w => newSet.add(w.id));
  }
  selectedIds.value = newSet;
}

function openNewGroupModal() {
  newGroupName.value = '';
  showNewGroupModal.value = true;
}

function handleCreateGroup() {
  const name = newGroupName.value.trim();
  if (!name) {
    message.warning('请输入有效的分组名称，如「三年级Unit 2」');
    return;
  }
  const nextSet = new Set(customGroups.value);
  nextSet.add(name);
  customGroups.value = nextSet;
  saveCustomGroups();
  activeGroup.value = name;
  newGroupName.value = '';
  showNewGroupModal.value = false;
  message.success(`已创建并切换至新分组「${name}」！勾选单词后点击“设为分组”即可归入`);
}

function promptDeleteGroup(groupName) {
  if (!groupName || groupName === 'all' || groupName === '通用词汇') {
    message.warning('系统内置默认分组不可删除');
    return;
  }
  groupToDelete.value = groupName;
  const count = state.library.words.filter(w => (w.group || '通用词汇').trim() === groupName).length;
  groupWordsCount.value = count;
  deleteGroupAction.value = 'dissolve';

  if (count === 0) {
    doDeleteEmptyGroup(groupName);
  } else {
    showDeleteGroupModal.value = true;
  }
}

function doDeleteEmptyGroup(grp) {
  customGroups.value.delete(grp);
  customGroups.value = new Set(customGroups.value);
  saveCustomGroups();
  if (activeGroup.value === grp) {
    activeGroup.value = 'all';
  }
  message.success(`已删除空分组「${grp}」！`);
}

async function handleConfirmDeleteGroup() {
  const grp = groupToDelete.value;
  if (!grp) return;

  if (deleteGroupAction.value === 'deleteAll') {
    const wordsToDelete = state.library.words.filter(w => (w.group || '通用词汇').trim() === grp);
    state.library.words = state.library.words.filter(w => (w.group || '通用词汇').trim() !== grp);

    const newSelected = new Set(selectedIds.value);
    wordsToDelete.forEach(w => newSelected.delete(w.id));
    selectedIds.value = newSelected;

    if (db && typeof db.delete === 'function') {
      for (const w of wordsToDelete) {
        await db.delete('words', w.id);
      }
    }
    message.success(`已彻底删除分组「${grp}」及内部 ${wordsToDelete.length} 个单词！`);
  } else {
    const updated = [];
    state.library.words.forEach(w => {
      if ((w.group || '通用词汇').trim() === grp) {
        w.group = '通用词汇';
        w.updatedAt = Date.now();
        updated.push(w);
      }
    });
    if (db && typeof db.bulkPut === 'function' && updated.length > 0) {
      await db.bulkPut('words', updated);
    }
    message.success(`已解散分组「${grp}」，内部 ${updated.length} 个单词已保留并转入「通用词汇」！`);
  }

  customGroups.value.delete(grp);
  customGroups.value = new Set(customGroups.value);
  saveCustomGroups();

  if (activeGroup.value === grp) {
    activeGroup.value = 'all';
  }
  showDeleteGroupModal.value = false;
}

function openBatchSetGroupModal() {
  if (selectedIds.value.size === 0) {
    message.warning('请先勾选需要设置分组的单词');
    return;
  }
  batchTargetGroup.value = activeGroup.value !== 'all' ? activeGroup.value : (allGroups.value[0] || '通用词汇');
  batchCustomGroup.value = '';
  showBatchGroupModal.value = true;
}

async function handleApplyBatchGroup() {
  const target = (batchCustomGroup.value.trim() || batchTargetGroup.value || '').trim();
  if (!target) {
    message.warning('请选择或输入目标分组名称');
    return;
  }
  const ids = selectedIds.value;
  const updated = [];
  state.library.words.forEach(w => {
    if (ids.has(w.id)) {
      w.group = target;
      w.updatedAt = Date.now();
      updated.push(w);
    }
  });
  await db.bulkPut('words', updated);
  showBatchGroupModal.value = false;
  batchCustomGroup.value = '';
  message.success(`已将选中的 ${updated.length} 个单词归入「${target}」分组！`);
}

function openEditSingleGroup(w) {
  editingWord.value = w;
  editingTargetGroup.value = w.group || '通用词汇';
  showEditSingleModal.value = true;
}

async function handleSaveSingleGroup() {
  if (!editingWord.value) return;
  const target = editingTargetGroup.value.trim();
  if (!target) {
    message.warning('分组名称不能为空');
    return;
  }
  editingWord.value.group = target;
  editingWord.value.updatedAt = Date.now();
  await db.bulkPut('words', [editingWord.value]);
  showEditSingleModal.value = false;
  message.success(`已将「${editingWord.value.en}」移入「${target}」！`);
}

async function handleImportPresetUnit(preset) {
  const dupCheck = detectDuplicates(state.library.words, preset.words);
  if (dupCheck.unique.length === 0) {
    message.info(`「${preset.name}」中的全部单词已存在于词库中`);
    activeGroup.value = preset.name;
    showPresetModal.value = false;
    return;
  }
  const newWords = dupCheck.unique.map(w => ({
    id: `w-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    en: w.en,
    zh: w.zh,
    phonetic: w.phonetic || '',
    group: preset.name,
    updatedAt: Date.now()
  }));
  state.library.words.push(...newWords);
  await db.bulkPut('words', newWords);
  activeGroup.value = preset.name;
  showPresetModal.value = false;
  message.success(`已成功载入「${preset.name}」(${newWords.length} 词)！`);
}

function handleAddSingle(w) {
  const item = createDraftItem({
    en: w.en,
    zh: w.zh,
    phonetic: w.phonetic,
    group: w.group,
    sourceId: w.id
  });
  state.draft.items.push(item);
  message.success(`已将「${w.en}」加入当前试卷！`);
}

function handleBatchAdd() {
  if (selectedIds.value.size === 0) {
    message.warning('请先勾选需要加入试卷的单词');
    return;
  }
  const selectedItems = state.library.words.filter(w => selectedIds.value.has(w.id));
  const newDraftItems = selectedItems.map(w => createDraftItem({
    en: w.en,
    zh: w.zh,
    phonetic: w.phonetic,
    group: w.group,
    sourceId: w.id
  }));
  state.draft.items = state.draft.items.concat(newDraftItems);
  selectedIds.value = new Set();
  message.success(`已成功将 ${newDraftItems.length} 个词汇批量加入试卷！`);
}

async function handleDelete(id) {
  const idx = state.library.words.findIndex(w => w.id === id);
  if (idx !== -1) {
    const wordEn = state.library.words[idx].en;
    state.library.words.splice(idx, 1);
    if (selectedIds.value.has(id)) {
      const newSet = new Set(selectedIds.value);
      newSet.delete(id);
      selectedIds.value = newSet;
    }
    await db.delete('words', id);
    message.info(`已从词库移除「${wordEn}」`);
  }
}

function handleExportLib() {
  const data = {
    app: 'DictationSheetGen',
    type: 'wordLibrary',
    version: '4.1',
    exportedAt: new Date().toISOString(),
    count: state.library.words.length,
    groups: allGroups.value,
    words: state.library.words
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `word_library_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  message.success('本地词库已导出为独立 JSON 文件（含分组标签）！');
}

async function handleClearLib() {
  state.library.words = [];
  selectedIds.value = new Set();
  activeGroup.value = 'all';
  customGroups.value = new Set();
  saveCustomGroups();
  await db.clear('words');
  message.info('本地词库已清空');
}

// 批量导入处理函数
function openImportModal() {
  showImportModal.value = true;
  importActiveTab.value = 'file';
  importDefaultGroup.value = '通用词汇';
  importCustomGroup.value = '';
  importPastedText.value = '';
  importParsedWords.value = [];
  importFileName.value = '';
  if (importFileRef.value) {
    importFileRef.value.value = '';
  }
}

function triggerImportFileInput() {
  if (importFileRef.value) {
    importFileRef.value.click();
  }
}

async function handleFileSelected(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  importFileName.value = file.name;
  importLoading.value = true;
  try {
    const defaultGrp = (importCustomGroup.value.trim() || importDefaultGroup.value || '通用词汇').trim();
    const words = await parseExcelOrCsvFile(file, defaultGrp);
    importParsedWords.value = words;
    if (words.length === 0) {
      message.warning('未能从该文件中解析到有效单词，请检查表格内容');
    } else {
      message.success(`成功读取 ${words.length} 个单词！`);
    }
  } catch (err) {
    console.error('File parse error:', err);
    message.error('文件解析失败：' + (err.message || '格式不支持'));
  } finally {
    importLoading.value = false;
  }
}

function handlePasteInput() {
  const defaultGrp = (importCustomGroup.value.trim() || importDefaultGroup.value || '通用词汇').trim();
  const words = parsePastedExcelText(importPastedText.value, defaultGrp);
  importParsedWords.value = words;
}

function recalcParsedWords() {
  const defaultGrp = (importCustomGroup.value.trim() || importDefaultGroup.value || '通用词汇').trim();
  if (importActiveTab.value === 'paste') {
    handlePasteInput();
  } else if (importParsedWords.value.length > 0) {
    importParsedWords.value = importParsedWords.value.map(w => ({
      ...w,
      group: w.hasExplicitGroup ? w.group : defaultGrp
    }));
  }
}

function onImportCustomGroupInput() {
  if (importCustomGroup.value.trim()) {
    importDefaultGroup.value = importCustomGroup.value.trim();
  }
  recalcParsedWords();
}

async function handleConfirmImport() {
  if (importParsedWords.value.length === 0) return;

  const dupCheck = detectDuplicates(state.library.words, importParsedWords.value);
  const wordsToAdd = dupCheck.unique;

  if (wordsToAdd.length === 0) {
    message.warning('所导入的单词全部与现有词库重复，未添加新词');
    showImportModal.value = false;
    return;
  }

  // 追加到本地词库
  state.library.words = [...state.library.words, ...wordsToAdd];

  // 记录新分组
  wordsToAdd.forEach(w => {
    if (w.group && w.group !== '通用词汇') {
      customGroups.value.add(w.group);
    }
  });
  saveCustomGroups();

  if (db && typeof db.bulkPut === 'function') {
    await db.bulkPut('words', wordsToAdd);
  }

  const dupMsg = dupCheck.duplicates.length > 0 ? ` (自动跳过 ${dupCheck.duplicates.length} 个重复词)` : '';
  message.success(`成功导入 ${wordsToAdd.length} 个单词！${dupMsg}`);

  showImportModal.value = false;

  // 若本次导入为单一单元，自动切至该单元便于查看
  const newGroups = [...new Set(wordsToAdd.map(w => w.group).filter(Boolean))];
  if (newGroups.length === 1 && activeGroup.value !== 'all') {
    activeGroup.value = newGroups[0];
  }
}

function handleDownloadExcelTemplate() {
  downloadExcelTemplate();
  message.success('已开始下载中小学英语默写词库导入模板 (.xlsx)');
}

function handleDownloadCsvTemplate() {
  downloadCsvTemplate();
  message.success('已开始下载中小学英语默写词库导入模板 (.csv)');
}
</script>

<style scoped>
.word-library-pane {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pane-card {
  border-radius: 8px;
  background: #ffffff;
}

.form-desc {
  font-size: 11.5px;
  color: var(--text-muted);
  line-height: 1.45;
  margin: 0 0 10px 0;
}

/* 分组导航区域 */
.lib-group-section {
  margin-bottom: 10px;
  background: var(--bg-sidebar);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  padding: 8px 10px;
}

.lib-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.lib-group-action-btn {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 11px;
  padding: 2px 7px;
  color: var(--primary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.lib-group-action-btn:hover {
  background: var(--primary-light);
  border-color: var(--primary);
}

.group-pills-bar {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: thin;
}

.group-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: #ffffff;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.group-pill-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.group-pill-btn.active {
  background: var(--primary);
  color: #ffffff;
  border-color: var(--primary);
  font-weight: 600;
}

.pill-del-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  font-size: 12px;
  line-height: 1;
  border-radius: 50%;
  color: var(--text-light);
  margin-left: 2px;
  transition: all 0.15s ease;
}

.pill-del-icon:hover {
  background: #faeceb;
  color: var(--danger);
  font-weight: bold;
}

.group-pill-btn.active .pill-del-icon {
  color: rgba(255, 255, 255, 0.7);
}

.group-pill-btn.active .pill-del-icon:hover {
  background: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

.btn-delete-group-inline {
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--danger);
  font-size: 10.5px;
  padding: 1px 6px;
  cursor: pointer;
  margin-left: 6px;
  transition: all 0.15s ease;
}

.btn-delete-group-inline:hover {
  background: #faeceb;
  border-color: var(--danger);
}

.native-search-input {
  width: 100%;
  padding: 7px 10px;
  font-size: 13px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-main);
  border-radius: 6px;
  outline: none;
  font-family: inherit;
  transition: all 0.15s ease;
}

.native-search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-light);
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 6px;
}

.selected-info-text {
  font-size: 11.5px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.words-list-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 400px;
  overflow-y: auto;
}

.empty-list-tip {
  text-align: center;
  padding: 30px;
  color: var(--text-light);
  font-size: 12px;
}

.lib-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  font-size: 12px;
  gap: 8px;
  transition: all 0.15s ease;
}

.lib-item-row:hover {
  border-color: var(--primary-border, var(--border-color));
  background: var(--bg-sidebar);
}

.lib-item-text {
  flex: 1;
  min-width: 0;
  margin-left: 4px;
}

.word-group-tag {
  display: inline-block;
  font-size: 10.5px;
  color: var(--primary);
  background: var(--primary-light);
  border: 1px solid var(--primary-border);
  border-radius: 4px;
  padding: 1px 5px;
  cursor: pointer;
  line-height: 1.25;
  transition: all 0.15s ease;
}

.word-group-tag:hover {
  background: var(--primary);
  color: #ffffff;
}

.lib-item-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.btn-act {
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 11px;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.15s ease;
}

.btn-act:hover {
  background: var(--primary-light);
  color: var(--primary);
  border-color: var(--primary);
}

.btn-act.del:hover {
  background: #faeceb;
  color: var(--danger);
  border-color: var(--danger);
}

.group-select-chip {
  background: var(--bg-sidebar);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  font-size: 11px;
  padding: 3px 8px;
  cursor: pointer;
  color: var(--text-main);
  transition: all 0.15s ease;
}

.group-select-chip:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.group-select-chip.selected {
  background: var(--primary);
  color: #ffffff;
  border-color: var(--primary);
}

.preset-unit-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: var(--bg-sidebar);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  gap: 8px;
}

/* 批量导入弹窗相关样式 */
.import-modal-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.import-tips-banner {
  background: var(--bg-sidebar);
  border: 1px dashed var(--primary-border);
  border-radius: 8px;
  padding: 10px 12px;
}

.tab-switch-pill {
  flex: 1;
  padding: 7px 12px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: #ffffff;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
  font-weight: 500;
  text-align: center;
}

.tab-switch-pill:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.tab-switch-pill.active {
  background: var(--primary-light);
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 700;
}

.file-upload-box {
  border: 2px dashed var(--primary-border);
  background: var(--bg-sidebar);
  border-radius: 8px;
  padding: 24px 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.file-upload-box:hover {
  background: var(--primary-light);
  border-color: var(--primary);
}

.import-preview-box {
  background: var(--bg-sidebar);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  padding: 10px 12px;
  margin-top: 6px;
}

.import-preview-table-wrap {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: #ffffff;
  overflow: hidden;
}

.import-preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11.5px;
  text-align: left;
}

.import-preview-table th {
  background: var(--bg-sidebar);
  padding: 6px 8px;
  font-weight: 600;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-light);
}

.import-preview-table td {
  padding: 5px 8px;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-main);
}

.preview-group-badge {
  display: inline-block;
  background: var(--primary-light);
  color: var(--primary);
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 10.5px;
  font-weight: 600;
}
</style>
