import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const testsDirectory = path.resolve('tests');
const testFiles = (await readdir(testsDirectory))
  .filter((name) => /^test_.*\.js$/.test(name))
  .sort((a, b) => a.localeCompare(b, 'en'));

console.log(`发现 ${testFiles.length} 个测试文件，开始顺序执行。`);

for (const [index, fileName] of testFiles.entries()) {
  console.log(`\n[${index + 1}/${testFiles.length}] ${fileName}`);
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(testsDirectory, fileName)], {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) {
    console.error(`测试失败：${fileName}（退出码 ${exitCode}）`);
    process.exit(exitCode);
  }
}

console.log(`\n全部 ${testFiles.length} 个测试文件通过。`);
