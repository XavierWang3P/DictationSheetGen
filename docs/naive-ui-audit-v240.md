# Naive UI / Xicons 全站审计（v2.4.0）

审计日期：2026-10-14  
项目版本：`2.4.0`  
实际依赖：`naive-ui@2.45.3`、`vue@3.5.44`、`@vicons/ionicons5@0.13.0`

## 依据与边界

- Naive UI 官方仓库说明组件可 tree-shake、主题通过 JS `themeOverrides` 定制，并推荐 Xicons：<https://github.com/tusen-ai/naive-ui>
- Naive UI v2 迁移说明确认输入类组件采用 `v-model:value`、Modal 采用 `v-model:show`，Message/LoadingBar 等上下文 API 由对应 Provider 提供：<https://github.com/tusen-ai/naive-ui/blob/main/vue3.md>
- 官方 Form 示例使用 `NForm :model/:rules`、`NFormItem label/path`，并按输入/失焦设置校验触发：<https://github.com/tusen-ai/naive-ui/blob/main/src/form/demos/enUS/async.demo.vue>
- Xicons 官方仓库提供 Vue 3 图标包，并支持从具体组件路径按需导入：<https://github.com/07akioni/xicons>
- Celeris Web 仅作为 Vue 3/Vite/TypeScript、模块边界与规范工具链参考：<https://github.com/kirklin/celeris-web>
- vue3-dynamic-form 仅作为 schema、控件注册及编辑/渲染分离参考：<https://github.com/yayaluoya/vue3-dynamic-form>

“官方要求/推荐”只用于上面可从官方资料直接确认的 API、主题、Provider、tree-shaking 与 Xicons 结论；响应式 DOM、事件单一来源、键盘和无障碍属于 Vue/Web 通用实践；纸张 DOM、打印 CSS、离线单文件和数据兼容属于本项目设计约束。

## 修改前审计表

| 等级 | 文件/组件 | 当前问题 | 文档依据 | 建议修改 | 风险 |
|---|---|---|---|---|---|
| P0 | 全站 | 未发现数据损坏、无法启动或答案泄露问题 | 本地回归基线 | 无 | — |
| P1 | `src/App.vue` | 伪造 `.n-badge/.n-badge-sup` 测试 DOM | 项目禁止内部类；组件封装通用原则 | 删除并改查稳定业务 ID | 低 |
| P1 | `AppIcon.vue` 与纸张 HTML | 手写 SVG、emoji 混用 | Naive UI 推荐 Xicons | 统一 Ionicons5 + NIcon | 低 |
| P1 | `QuickInputPane.vue`、`SettingsPane.vue` | radio 同时绑定 click/change | Vue 事件单一来源 | 仅保留 change | 低 |
| P2 | `SettingsPane.vue` | 响应式更新后直接写 DOM 样式 | Vue 状态驱动原则 | 只更新 store | 中低 |
| P2 | `GeneralQuestionEditor.vue` | 缺少统一 Form 标签和反馈 | Naive UI Form 示例 | 接入 NForm/NFormItem/NInput/NButton | 中 |
| P2 | 图标按钮 | 缺少统一 Tooltip/aria-label | Web 无障碍与项目验收 | 建立 IconActionButton | 中低 |
| P2 | Provider 层 | NDialogProvider 无消费者 | Provider 按实际上下文 API 使用 | 移除；不空加 Notification/Loading | 低 |
| P3 | 旧设置/词库原生控件 | 全量组件化改造回归面过大 | 项目范围约束 | 暂不重写 | 中高 |
| P3 | DataTable/暗色模式 | 当前收益不足，打印风险增加 | 项目范围约束 | 不引入 | 中 |

## 已实施

- `src/theme/naiveTheme.js`：Naive UI 控件主题集中到 `themeOverrides`；纸张、Debug 与分页变量仍保留在项目 CSS。
- `src/components/AppIcon.vue`：移除自维护 SVG path，统一使用 Ionicons5 Outline 系列，经 `NIcon` 渲染；从 `@vicons/ionicons5/es/*` 精确导入。
- `src/components/IconActionButton.vue`：统一纯图标按钮的 Tooltip、`aria-label` 与装饰图标隐藏语义。
- `GeneralQuestionEditor.vue`：接入 `NForm/NFormItem/NInput/NButton`，业务校验仍由题型注册表最终把关。
- `question-types/registry.js`：三个结构化题型声明 `GeneralQuestionEditor` 与各自 variant；数据结构未改变。
- 清除 `.n-*` 源码依赖、打印 emoji、重复事件、设置面板直接写样式和无消费者 Provider。

## Xicons 映射

主系列为 Ionicons5 Outline。当前映射包括 Add、Remove、Book、Bug、Checkmark、Chevron Up/Down、Close、Cloud Upload、Copy、Create、Document Text、Download、Eye、Help Circle、Menu、Pricetag、Print、Refresh、Search、Settings、Text、Trash。所有图标继承当前文字颜色；工具栏使用 14–16px；打印样式强制隐藏 `.app-icon`。

## 参考项目取舍

| 能力 | Celeris Web | Dynamic Form | 本项目决定 |
|---|---|---|---|
| script setup / 模块边界 | 可直接参考 | 使用 TS 组件边界 | 保留现有 script setup；新增主题与通用图标按钮模块 |
| TypeScript / Pinia | 适合大型模板 | 主工程使用 TS/Pinia | 本轮不迁移、不替换 store |
| 自动导入 / 组件自动注册 | 模板核心能力 | 非必要 | 不采用，显式导入更利于单文件体积审计 |
| 主题与 tokens | 可适配 | 编辑/渲染共享配置可参考 | 采用独立 themeOverrides 模块 |
| schema / 控件注册 | 非核心 | 可参考 | 适配到既有 questionTypeRegistry，不改数据格式 |
| 拖拽 / Ace / router | 不适合本工具 | 会引入 vuedraggable、Ace、router 等 | 不安装完整动态表单库 |
| monorepo / i18n / UnoCSS / admin routing | 适合多包管理端 | 与当前目标无直接收益 | 不采用 |

vue3-dynamic-form 当前主工程声明 Vue `^3.4.29`、Naive UI `^2.39.0`，另含 Pinia、Vue Router、Ace 与 vuedraggable；发布描述版本为 `0.1.3`、ISC。其架构思想有参考价值，但直接依赖不符合本项目轻量离线单文件约束。

## 体积与验证

- 修改前 `dist/index.html`：964,218 bytes；gzip 301.06 kB。
- 修改后 `dist/index.html`：1,009,488 bytes；gzip 313.34 kB。
- 增量：45,270 bytes（约 4.70%）；gzip 增量 12.28 kB（约 4.08%）。
- 不使用 CDN，单文件仍可完全离线运行。

最终验证结果以本轮 `npm run test:all`、浏览器交互与 PDF 页数回归输出为准。
