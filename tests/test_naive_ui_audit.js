import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(root, 'src');

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(vue|js|css)$/.test(entry.name) ? [full] : [];
  });
}

const sources = sourceFiles(srcRoot).map((file) => ({ file, text: fs.readFileSync(file, 'utf8') }));
const allSource = sources.map(({ text }) => text).join('\n');
const appIcon = fs.readFileSync(path.join(srcRoot, 'components', 'AppIcon.vue'), 'utf8');
const app = fs.readFileSync(path.join(srcRoot, 'App.vue'), 'utf8');
const settings = fs.readFileSync(path.join(srcRoot, 'components', 'SettingsPane.vue'), 'utf8');
const quickInput = fs.readFileSync(path.join(srcRoot, 'components', 'QuickInputPane.vue'), 'utf8');
const registry = fs.readFileSync(path.join(srcRoot, 'question-types', 'registry.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

assert.equal(/\.n-[\w-]+|class=["'][^"']*\bn-[\w-]+/.test(allSource), false, '源码不得引用 Naive UI 内部 .n-* 类');
assert.equal(/[📥🗑️➕✂️📝⚠️✅❌🔍⚙️💾📄📚🖨️📋]/u.test(allSource), false, '界面源码不得混用系统 emoji');
assert.match(appIcon, /from '@vicons\/ionicons5\/es\//, '图标必须从 Ionicons5 ESM 子路径按需导入');
assert.match(appIcon, /NIcon/, 'Xicons 必须通过 NIcon 统一承载');
assert.equal(/<svg|<path|<line|<polyline/.test(appIcon), false, 'AppIcon 不得继续维护内联 SVG 路径');
assert.equal(pkg.dependencies['@vicons/ionicons5'], '^0.13.0');
assert.match(app, /naiveThemeOverrides as themeOverrides/, 'Naive UI 主题应从独立主题模块加载');
assert.equal(/NDialogProvider|NNotificationProvider|NLoadingBarProvider/.test(app), false, '不得挂载无消费者的 Provider');
assert.equal(/querySelector|querySelectorAll|\.style\.|classList\./.test(settings), false, '设置面板必须由响应式状态驱动 DOM');
assert.equal(/@click="onInputTypeChange/.test(quickInput), false, '题型单选不得重复绑定 click 与 change');
assert.match(registry, /editor: 'GeneralQuestionEditor'/, '结构化题型应由注册表声明通用编辑器');
assert.match(allSource, /aria-label="缩小预览"/, '纯图标按钮需要无障碍名称');
assert.match(allSource, /<n-tooltip/, '纯图标按钮需要可见 Tooltip');

console.log('NAIVE_UI_AUDIT_TESTS_PASSED');
