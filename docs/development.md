# 开发者指南与架构说明 (Developer Guide)

本文档面向参与 DictationSheet 项目开发与维护的工程人员，记录项目的代码架构、各组件职责、排版算法及自动化测试体系。

---

## 目录结构与模块划分

```text
DictationSheetGen/
├── dist/
│   └── index.html                 # 离线单文件打包产物（零外部网络依赖）
├── docs/
│   ├── debug_map.md               # 全网组件 Debug 语义编号映射表
│   ├── development.md             # 开发者指南（本文档）
│   ├── naive-ui-audit-v240.md     # Naive UI 组件库审计与规范记录
│   └── screenshots/               # 界面预览截图资源
├── src/
│   ├── assets/
│   │   └── branding/              # 品牌 Logo 与 Favicon 资源
│   ├── core/                      # 纯逻辑层（无 UI 依赖，可独立单测）
│   │   ├── alphabet.js            # 字母专项生成（26字母、左右邻居、大小写转换）
│   │   ├── handwritingFonts.js    # 内置手写体与基线对齐
│   │   ├── layout.js              # 60格排版预算、四线格矢量绘制与多联分页计算
│   │   ├── storage.js             # IndexedDB 封装、数据校验与查重
│   │   └── tokenizer.js           # 智能分词、可视化挖空切词胶囊转换
│   ├── question-types/            # 题型注册与规范化机制
│   │   └── registry.js            # 统一题型注册表、列数规则（1~5列）、数据规范化
│   ├── styles/                    # 模块化 CSS 架构
│   │   ├── variables.css          # 全局 CSS 变量与设计令牌（含 --editor-*）
│   │   ├── base.css               # 基础重置样式与排版基准
│   │   ├── layout.css             # 左右分栏与底部 Footer 布局
│   │   ├── components.css         # 通用组件样式（按钮、表单、微调控件）
│   │   ├── preview.css            # 纸张舞台与缩放视图
│   │   ├── debug.css              # 全网页 Debug 模式角标
│   │   ├── print.css              # 打印媒体查询与末尾空白页规避
│   │   └── app.css                # 聚合入口
│   ├── stores/
│   │   └── appStore.js            # 全局响应式状态（草稿、词库、排版参数）
│   ├── components/                # Vue 视图组件
│   │   ├── AppHeader.vue          # 顶部品牌导航栏、Logo 与打印导出入口
│   │   ├── AppIcon.vue            # 统一线性 SVG 图标封装
│   │   ├── DebugOverlay.vue       # Debug 模式绝对定位浮层 (Ctrl+Alt+D)
│   │   ├── GeneralQuestionEditor.vue # 选择/填空/作文等通用题型编辑器
│   │   ├── PracticeGridSvg.vue    # 四线三格矢量格线渲染组件
│   │   ├── PreviewViewport.vue    # 纸张舞台视口与缩放缩放控制
│   │   ├── QuestionEditorShell.vue # 统一题型录入外壳（原生 details 详情收纳）
│   │   ├── QuestionListPane.vue   # 紧凑试卷题目清单（1~5列 Popselect 与批量工具栏）
│   │   ├── QuickInputPane.vue     # 题目录入中心（混合切词挖空与各题型入口）
│   │   ├── SettingsPane.vue       # 试卷版式设置（纸张、分栏默认值、四线格参数）
│   │   ├── SidebarTabs.vue        # 教师出题流四步工作区导航
│   │   ├── VisualClozePane.vue    # 可视化挖空兼容层
│   │   └── WordLibraryPane.vue    # 备课资源库（单元分组、搜索、Excel 导入）
│   ├── App.vue                    # 应用根组件、双栏框架与底部版权信息
│   └── main.js                    # 应用启动入口
├── test_acceptance.js             # 基础验收测试套件（7 大标准）
├── test_alphabet.js               # 英文字母专项测试
├── test_app_footer.js             # 底部版权与社交渠道测试
├── test_architecture_fix.js       # 事件独立性与 DOM 树健康测试
├── test_cloze_features.js         # 句子挖空布局与中文位置测试
├── test_delete_group.js           # 词库分组删除与解散测试
├── test_empty_startup.js          # 首屏干净画布测试
├── test_excel_import.js           # 表格与剪贴板导入测试
├── test_handwriting_fonts.js      # 手写字体度量与四线格基线测试
├── test_handwriting_fonts_browser.js # 浏览器端手写体渲染测试
├── test_naive_ui_audit.js         # Naive UI 组件库规范审计测试
├── test_phase2.js                 # 存储层迁移与导入校验测试
├── test_phase3.js                 # 词库与可视化挖空测试
├── test_popconfirm_i18n.js        # 确认气泡国际化测试
├── test_question_types_v240.js    # 题型注册与多列排版单测
├── test_question_types_browser.js # 真实浏览器多题型与双面打印测试
├── test_v230_refactor.js          # 架构升级核心维度回归测试
├── test_word_grouping.js          # 单元词汇分组与筛选测试
├── package.json                   # 项目依赖与自动化脚本
└── vite.config.js                 # Vite 单文件内联打包配置
```

---

## 核心排版引擎原理

### 1. 60 单元整除网格系统
为满足各题型支持每行 1、2、3、4、5 题的灵活布局，底层 CSS Grid 采用最小公倍数 60 进行划分：
- 1 列：`grid-column: span 60` (100% 宽度)
- 2 列：`grid-column: span 30` (50% 宽度)
- 3 列：`grid-column: span 20` (33.33% 宽度)
- 4 列：`grid-column: span 15` (25% 宽度)
- 5 列：`grid-column: span 12` (20% 宽度)

当检测到某道题目内容超宽或包含长英文句子时，排版引擎自动应用整行跨列规则，避免无限缩小字号导致打印模糊。

### 2. 物理毫米级高度预算算法 (`computePageLayout`)
试卷按页面可用物理高度（扣除页边距、标题区、考生信息区、多联裁切分隔线等）进行预算分配。每种题型通过 `estimateQuestionHeightMm` 实时预估高度，确保：
- 超出容量时精准分页；
- 打印与 PDF 导出最后一页自动附加 `.is-last-page`，消除空页；
- 试卷预览渲染树与教师答案版使用同一套分页逻辑。

---

## 自动化测试体系

项目内置涵盖纯逻辑单元测试与无头浏览器（Microsoft Edge Headless）端到端测试的完整测试流水线：

```bash
# 执行全部 18 套自动化测试套件
npm run test:all
```

| 测试脚本 | 覆盖范围与验证目标 |
| :--- | :--- |
| `test_naive_ui_audit.js` | Naive UI 国际化、组件规范与无私有 CSS 依赖审计 |
| `test_handwriting_fonts.js` | 离线手写字体度量、字符 cap-height/x-height 基线对齐 |
| `test_handwriting_fonts_browser.js` | 浏览器内字形完整性、无压扁横向拉伸验证 |
| `test_question_types_v240.js` | 题型注册表验证、1~5 列分栏自适应与长句跨列 |
| `test_question_types_browser.js` | 多题型混合组卷、学生卷/答案版双面渲染与 PDF 对齐 |
| `test_app_footer.js` | 底部版权信息、版本号与社交媒体渠道图标与链接 |
| `test_acceptance.js` | 7 大核心标准验收（纸张规格、四线格矢量属性、追加语义） |
| `test_phase2.js` | IndexedDB 存储适配、数据格式向前兼容与校验 |
| `test_phase3.js` | 工作区切换、词库搜索及批量加卷 |
| `test_alphabet.js` | 字母顺序、邻居、大小写转换出题算法 |
| `test_architecture_fix.js` | 事件解耦、下移防抖与列表 DOM 树健壮性 |
| `test_cloze_features.js` | 句子挖空 4 种中文位置（句下/句末/句上/隐藏）与空格宽度 |
| `test_word_grouping.js` | 单元分组标签过滤、批量修改组别与自定义分组 |
| `test_popconfirm_i18n.js` | 确认框无中文以外的语言混入 |
| `test_empty_startup.js` | 首屏零脏数据启动与空白画布体验 |
| `test_excel_import.js` | Excel/WPS/CSV 粘贴与文件上传智能识别 |
| `test_delete_group.js` | 词库分组解散与级联删除安全性 |
| `test_v230_refactor.js` | 全站 Debug 模式、零 Emoji 线性图标、PDF 消除空白页 |

---

## 离线单文件打包机制

通过 `vite-plugin-singlefile` 插件，Vite 在执行 `npm run build` 时将所有脚本、样式表、手写字体文件以及 Base64 矢量资源内联为单一的 `dist/index.html`。该文件大小约为 1.5 MB，可在任何无网络环境的双击即用。
