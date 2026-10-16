import assert from 'assert';
import { launchEdgePage } from './helpers/edgeCdp.js';

const page = await launchEdgePage({
  port: 9278,
  url: new URL('../dist/index.html?__test=1', import.meta.url).href
});

try {
  const metrics = await page.evaluate(`(async () => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const waitFor = async (predicate, timeout = 15000) => {
      const started = performance.now();
      while (!predicate()) {
        if (performance.now() - started > timeout) throw new Error('等待页面状态超时');
        await delay(25);
      }
    };
    await waitFor(() => window.__appStoreState && document.getElementById('btnParseText'));
    await document.fonts.load('16px "OPPO Sans"', '中文字体测试');
    await document.fonts.ready;

    const nav = performance.getEntriesByType('navigation')[0];
    const appReadyMs = performance.now();
    const state = window.__appStoreState;
    state.draft.items = [];

    document.getElementById('modeWriting').click();
    await delay(50);
    const textarea = document.getElementById('customWordTextarea');
    const rows = Array.from({ length: 200 }, (_, index) =>
      'word' + String(index + 1).padStart(3, '0') + ' 词义' + String(index + 1)
    );
    textarea.value = rows.join('\\n');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    const addStarted = performance.now();
    document.getElementById('btnParseText').click();
    await waitFor(() => state.draft.items.length === 200);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const addAndRenderMs = performance.now() - addStarted;

    document.querySelector('.sidebar-tab-btn[data-tab="paneList"]').click();
    await waitFor(() => document.querySelectorAll('.compact-exam-row').length === 200);
    const beforeFirstId = state.draft.items[0].id;
    const sortStarted = performance.now();
    document.querySelector('.compact-exam-row [aria-label="下移题目"]').click();
    await waitFor(() => state.draft.items[1]?.id === beforeFirstId);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const sortAndRenderMs = performance.now() - sortStarted;

    const wordColumnRow = Array.from(document.querySelectorAll('.column-config-row'))
      .find((row) => row.textContent.includes('单词默写'));
    const fiveColumnButton = Array.from(wordColumnRow?.querySelectorAll('button') || [])
      .find((button) => button.textContent.trim().startsWith('5'));
    const settingStarted = performance.now();
    fiveColumnButton.click();
    await waitFor(() => state.draft.settings.layoutDefaults.wordDictationColumns === 5);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const settingAndRenderMs = performance.now() - settingStarted;

    return {
      domInteractiveMs: nav?.domInteractive || 0,
      domContentLoadedMs: nav?.domContentLoadedEventEnd || 0,
      loadEventMs: nav?.loadEventEnd || performance.now(),
      appReadyMs,
      addAndRenderMs,
      sortAndRenderMs,
      settingAndRenderMs,
      itemCount: state.draft.items.length,
      pageCount: document.querySelectorAll('.sheet-page').length,
      cardCount: document.querySelectorAll('.word-card').length,
      oppoSansAvailable: document.fonts.check('16px "OPPO Sans"'),
      externalResourceCount: performance.getEntriesByType('resource').filter((entry) => /^(https?:)?\\/\\//.test(entry.name)).length
    };
  })()`);

  console.log(`PERFORMANCE_METRICS=${JSON.stringify(metrics)}`);
  console.log(`BROWSER_ERRORS=${JSON.stringify(page.browserErrors)}`);
  assert.equal(metrics.itemCount, 200, '真实录入路径应添加 200 道题');
  assert.ok(metrics.pageCount > 0, '大题量场景应生成预览页');
  assert.equal(metrics.externalResourceCount, 0, '离线页不应请求外部网络资源');
  assert.deepEqual(page.browserErrors, [], '性能流程中不应出现浏览器错误');
} finally {
  await page.close();
}
