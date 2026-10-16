import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const indexPath = path.resolve('dist/index.html');
const html = await readFile(indexPath, 'utf8');
const classicHtml = html.replace(
  /<script\s+type="module"(?:\s+crossorigin)?\s+src="([^"]+)"\s*><\/script>/,
  '<script defer src="$1"></script>'
).replace(/\s+crossorigin(?=[\s>])/g, '');

if (classicHtml === html) {
  throw new Error('未找到 Vite 生成的模块入口，无法生成 file:// 兼容版本');
}

await writeFile(indexPath, classicHtml, 'utf8');
