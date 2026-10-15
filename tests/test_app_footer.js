import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appVue = fs.readFileSync(path.join(projectRoot, 'src/App.vue'), 'utf8');
const layoutCss = fs.readFileSync(path.join(projectRoot, 'src/styles/layout.css'), 'utf8');
const printCss = fs.readFileSync(path.join(projectRoot, 'src/styles/print.css'), 'utf8');
const packageInfo = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const changelog = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');

assert.match(appVue, /import packageInfo from '\.\.\/package\.json';/, '版本号应直接读取 package.json');
assert.match(appVue, /DictationSheet v\{\{ appVersion \}\}/, '页面底部应显示应用版本号与项目链接');
assert.match(appVue, /Copyright © 2026/, '页面底部应显示版权信息');
assert.match(appVue, /https:\/\/xavier\.wang/, '页面底部应包含博客链接');
assert.match(appVue, /微信公众号：鸟之言语/, '页面底部应包含微信公众号');
assert.match(appVue, /https:\/\/space\.bilibili\.com\/6526939/, '页面底部应包含B站链接');
assert.match(appVue, /class="app-footer no-print"/, '页脚应标记为不打印');
assert.match(appVue, /data-debug-id="F-001"/, '页脚应支持 Debug 定位');
assert.match(layoutCss, /\.app-footer\s*\{/, '应包含页脚布局样式');
assert.match(printCss, /\.no-print,/, '打印样式应隐藏 no-print 元素');
assert.ok(changelog.includes(`v${packageInfo.version}`), 'CHANGELOG 应记录当前版本页脚');

console.log(`✓ 页面底部版本号与版权信息测试通过（v${packageInfo.version}）`);
