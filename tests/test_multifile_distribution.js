import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const deployScript = fs.readFileSync(path.join(root, 'scripts', 'deploy.ps1'), 'utf8');

for (const directory of ['css', 'js', 'fonts', 'img']) {
  const fullPath = path.join(dist, directory);
  assert.equal(fs.statSync(fullPath).isDirectory(), true, `dist/${directory} 必须存在`);
  assert.ok(fs.readdirSync(fullPath).length > 0, `dist/${directory} 不得为空`);
}

assert.match(html, /<script defer src="\.\/js\/[^"?]+\.js"><\/script>/, '入口脚本必须使用相对路径的经典脚本');
assert.match(html, /<link rel="stylesheet"[^>]+href="\.\/css\/[^"?]+\.css">/, '样式必须输出到 css 目录');
assert.match(html, /<link rel="icon"[^>]+href="\.\/img\/[^"?]+\.png"/, '图标必须输出到 img 目录');
assert.equal(/<script[^>]+type="module"/.test(html), false, 'file:// 版本不得依赖 ES 模块脚本');
assert.equal(/\scrossorigin(?:\s|>)/.test(html), false, 'file:// 入口不得为本地资源添加 crossorigin');
assert.equal(/(?:src|href)="https?:\/\//.test(html), false, '离线入口不得引用网络资源');
assert.equal(/data:(?:image|font)\//.test(html), false, '图片与字体不得继续内联到 HTML');
assert.equal(pkg.dependencies?.['vite-plugin-singlefile'], undefined, '不得继续依赖单文件构建插件');

const referencedAssets = [...html.matchAll(/(?:src|href)="(\.\/[^"#?]+)"/g)].map((match) => match[1]);
assert.ok(referencedAssets.length >= 3, '入口页至少应引用脚本、样式和图标');

for (const reference of referencedAssets) {
  const absolutePath = path.resolve(dist, reference);
  assert.ok(absolutePath.startsWith(`${dist}${path.sep}`), `资源路径不得越出 dist：${reference}`);
  assert.equal(fs.existsSync(absolutePath), true, `资源必须存在：${reference}`);
}

const cssFile = fs.readdirSync(path.join(dist, 'css')).find((name) => name.endsWith('.css'));
const css = fs.readFileSync(path.join(dist, 'css', cssFile), 'utf8');
assert.match(css, /\.\.\/fonts\//, '字体引用必须指向独立的 fonts 目录');

assert.match(deployScript, /\.dictation-releases/, '部署应使用不可变版本目录');
assert.match(deployScript, /\.dictation-deploy\.lock/, '部署应使用并发锁');
assert.match(deployScript, /renameat2/, '首次从真实目录迁移时应使用原子目录交换');
assert.match(deployScript, /mv -Tf -- \"\$candidate_link\" \"\$target\"/, '后续版本应以原子 symlink rename 激活');
assert.match(deployScript, /release\.sha256/, '激活前应核对完整构建哈希');
assert.match(deployScript, /release_safe_to_remove/, '回滚未完成时不得删除可能仍在线的版本目录');
assert.match(deployScript, /Retaining candidate release because it may still be live/, '回滚失败时应保留当前候选版本并报告原因');
assert.ok(
  deployScript.indexOf('curl --fail') < deployScript.lastIndexOf("'activation=none'"),
  '公网校验成功后才能结束可回滚状态'
);

console.log('MULTIFILE_DISTRIBUTION_TESTS_PASSED');
