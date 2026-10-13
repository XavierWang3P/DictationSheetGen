# DictationSheetGen v1.3.0 (原生单文件离线历史备份版本)

本目录为项目在迁移至 Vue.js + Naive UI 之前的原生单文件版本完整备份。

## 文件说明
- `index.html`：包含 HTML、CSS 与原生 JS 的自包含离线单文件应用，双击即可在任何现代浏览器中运行。
- `test_acceptance.js`：原生版本的 7 大核心标准 CDP 自动化验收测试。
- `test_phase2.js`：IndexedDB 存储层与迁移机制测试。
- `test_phase3.js`：工作区 Tab 视图、词库与可视化挖空测试。

## 特性保留
- 零依赖、零构建、双击直接运行；
- 完整包含看中文默写与句子挖空两种模式；
- 完整包含 IndexedDB 本地词库与句子切词胶囊可视化挖空系统。
