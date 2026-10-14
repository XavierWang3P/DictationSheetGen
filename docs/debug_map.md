# DictationSheetGen - 全局组件与操作控件 Debug 编号映射表

本系统支持通过快捷键呼出 **全网页 Debug 模式**：
- **Windows / Linux**：`Ctrl + Alt + D`
- **macOS**：`Command + Option + D`
- 再次按下快捷键即可关闭。

开启后，界面所有主要区域和操作控件均覆盖显示唯一的稳定编号，悬停或点击即可复制编号及元信息提供给 AI Agent 快速精准定位。

---

## 核心组件与控件编号列表

| 编号 (Debug ID) | 语义名称 | 对应 Vue 组件 | 源码路径 |
| :--- | :--- | :--- | :--- |
| **H-001** | 顶部主导航与工具栏 | `AppHeader.vue` | `src/components/AppHeader.vue` |
| **H-002** | 侧边栏展开/折叠按钮 | `AppHeader.vue` | `src/components/AppHeader.vue` |
| **H-004** | 导出配置 JSON 按钮 | `AppHeader.vue` | `src/components/AppHeader.vue` |
| **H-005** | 导入数据/配置按钮 | `AppHeader.vue` | `src/components/AppHeader.vue` |
| **H-006** | 恢复默认出厂设置按钮 | `AppHeader.vue` | `src/components/AppHeader.vue` |
| **H-007** | 打印 / 导出 PDF 按钮 | `AppHeader.vue` | `src/components/AppHeader.vue` |
| **T-001** | 侧边栏工作区导航 Tab 栏（题目录入/试卷题目/备课资源库/试卷排版） | `SidebarTabs.vue` | `src/components/SidebarTabs.vue` |
| **Q-001** | 统一题目录入面板 | `QuickInputPane.vue` | `src/components/QuickInputPane.vue` |
| **Q-002** | 题型选择器（全题型） | `QuickInputPane.vue` | `src/components/QuickInputPane.vue` |
| **Q-003** | 题目快速录入文本框 | `QuickInputPane.vue` | `src/components/QuickInputPane.vue` |
| **Q-004** | ➕ 添加到试卷按钮 | `QuickInputPane.vue` | `src/components/QuickInputPane.vue` |
| **Q-005** | 存入本地词库按钮 | `QuickInputPane.vue` | `src/components/QuickInputPane.vue` |
| **Q-006** | 清空试卷按钮 | `QuickInputPane.vue` | `src/components/QuickInputPane.vue` |
| **Q-007** | 试卷题目清单与紧凑列表面板 | `QuestionListPane.vue` | `src/components/QuestionListPane.vue` |
| **Q-008** | 选择题、填空题与英语作文结构化编辑器 | `GeneralQuestionEditor.vue` | `src/components/GeneralQuestionEditor.vue` |
| **L-001** | 本地离线词库面板 | `WordLibraryPane.vue` | `src/components/WordLibraryPane.vue` |
| **L-002** | 年级/单元分组胶囊栏 | `WordLibraryPane.vue` | `src/components/WordLibraryPane.vue` |
| **L-003** | 词库英汉搜索输入框 | `WordLibraryPane.vue` | `src/components/WordLibraryPane.vue` |
| **L-004** | 词库全选 / 反选按钮 | `WordLibraryPane.vue` | `src/components/WordLibraryPane.vue` |
| **L-005** | 词库批量加入试卷按钮 | `WordLibraryPane.vue` | `src/components/WordLibraryPane.vue` |
| **L-006** | 批量导入（Excel/CSV/剪贴板） | `WordLibraryPane.vue` | `src/components/WordLibraryPane.vue` |
| **L-007** | 本地词库条目列表容器 | `WordLibraryPane.vue` | `src/components/WordLibraryPane.vue` |
| **C-001** | 可视化选词挖空面板 | `VisualClozePane.vue` | `src/components/VisualClozePane.vue` |
| **C-002** | 英文句子输入框 | `VisualClozePane.vue` | `src/components/VisualClozePane.vue` |
| **C-003** | 中文翻译输入框 | `VisualClozePane.vue` | `src/components/VisualClozePane.vue` |
| **C-004** | 可视化单词胶囊选择区 | `VisualClozePane.vue` | `src/components/VisualClozePane.vue` |
| **C-005** | 挖空题加入当前试卷按钮 | `VisualClozePane.vue` | `src/components/VisualClozePane.vue` |
| **S-001** | 版式设置面板 | `SettingsPane.vue` | `src/components/SettingsPane.vue` |
| **S-002** | 试卷标题与考生信息设置区 | `SettingsPane.vue` | `src/components/SettingsPane.vue` |
| **S-003** | 纸张规格与方向设置区 | `SettingsPane.vue` | `src/components/SettingsPane.vue` |
| **S-004** | 一页多联与裁切虚线设置区 | `SettingsPane.vue` | `src/components/SettingsPane.vue` |
| **S-005** | 每页容量与分栏列数设置区 | `SettingsPane.vue` | `src/components/SettingsPane.vue` |
| **S-006** | 四线三格高度与间距设置区 | `SettingsPane.vue` | `src/components/SettingsPane.vue` |
| **S-007** | 中英文字体与字间距设置区 | `SettingsPane.vue` | `src/components/SettingsPane.vue` |
| **P-001** | 试卷排版与打印预览视口 | `PreviewViewport.vue` | `src/components/PreviewViewport.vue` |
| **P-002** | 缩放比例与适合宽度工具栏 | `PreviewViewport.vue` | `src/components/PreviewViewport.vue` |
| **P-003** | 纸张渲染流水线容器 | `PreviewViewport.vue` | `src/components/PreviewViewport.vue` |
| **F-001** | 页面底部版本与版权信息 | `App.vue` | `src/App.vue` |
| **ITEM-{id}** | 动态题目卡片（依题目唯一ID） | `QuickInputPane.vue` / 试卷 | 动态生成 |

---

## 规则说明

1. 编号全局唯一且稳定，不随数组下标、页面刷新或题目增减而变动。
2. Debug 标记不阻碍鼠标与触摸操作（`pointer-events: none`）。
3. 打印模式及导出 PDF 中自动隐藏，完全不污染试卷印刷成果。
