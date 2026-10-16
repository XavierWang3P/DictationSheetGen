import assert from 'assert';
import { launchEdgePage } from './helpers/edgeCdp.js';

const page = await launchEdgePage({
  port: 9281,
  url: new URL('../dist/index.html', import.meta.url).href
});

try {
  const result = await page.evaluate(`(async () => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const waitFor = async (predicate, timeout = 10000) => {
      const started = performance.now();
      while (!predicate()) {
        if (performance.now() - started > timeout) throw new Error('等待正式页面状态超时');
        await delay(25);
      }
    };

    await waitFor(() => document.getElementById('btnParseText'));
    const textarea = document.getElementById('customWordTextarea');
    textarea.value = 'apple 苹果\\nbanana 香蕉';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('btnParseText').click();
    await waitFor(() => document.querySelectorAll('.word-card').length >= 2);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    return {
      hasStoreGlobal: Object.prototype.hasOwnProperty.call(window, '__appStoreState'),
      hasSampleStub: Boolean(document.getElementById('btnLoadDefaultSample')),
      hasLegacyClozeStub: Boolean(document.querySelector('[data-tab="paneClozeVisual"]')),
      hasVisibleTabs: document.querySelectorAll('.sidebar-tab-btn:not([aria-hidden="true"])').length,
      cardCount: document.querySelectorAll('.word-card').length,
      badgeText: document.getElementById('badgeWordCount')?.textContent || ''
    };
  })()`);

  console.log(`PRODUCTION_ISOLATION=${JSON.stringify(result)}`);
  console.log(`BROWSER_ERRORS=${JSON.stringify(page.browserErrors)}`);
  assert.equal(result.hasStoreGlobal, false, '正式页面不应暴露全局状态');
  assert.equal(result.hasSampleStub, false, '正式页面不应渲染隐藏测试按钮');
  assert.equal(result.hasLegacyClozeStub, false, '正式页面不应渲染旧版隐藏标签');
  assert.equal(result.hasVisibleTabs, 3, '正式页面应保留三个可见工作区标签');
  assert.ok(result.cardCount >= 2, '正式页面真实录入应生成预览题目');
  assert.match(result.badgeText, /2/, '题目计数应随真实录入更新');
  assert.deepEqual(page.browserErrors, [], '正式页面不应产生浏览器错误');
} finally {
  await page.close();
}
