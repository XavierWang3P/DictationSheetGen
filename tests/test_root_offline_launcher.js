import assert from 'node:assert/strict';
import { launchEdgePage } from './helpers/edgeCdp.js';

const page = await launchEdgePage({
  port: 9298,
  url: new URL('../index.html', import.meta.url).href
});

try {
  const result = await page.evaluate(`(async () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if (document.querySelector('.app-workspace')) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return {
      url: location.href,
      hasWorkspace: !!document.querySelector('.app-workspace'),
      title: document.title
    };
  })()`);

  assert.match(result.url, /\/dist\/index\.html$/, '双击根目录 index.html 应进入 dist/index.html');
  assert.equal(result.hasWorkspace, true, '离线启动页应成功挂载应用工作区');
  assert.equal(page.browserErrors.length, 0, `浏览器不应出现脚本错误：${page.browserErrors.join('; ')}`);
  console.log(`ROOT_OFFLINE_LAUNCHER=${JSON.stringify(result)}`);
} finally {
  await page.close();
}
