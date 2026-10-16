import assert from 'node:assert/strict';
import { launchEdgePage } from './helpers/edgeCdp.js';

const appUrl = new URL('../dist/index.html?__test=1', import.meta.url).href;
const page = await launchEdgePage({ port: 9282, url: appUrl });

try {
  const result = await page.evaluate(`(async () => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const waitFor = async (predicate, timeout = 10000) => {
      const started = performance.now();
      while (!predicate()) {
        if (performance.now() - started > timeout) throw new Error('等待题库失败注入测试超时');
        await delay(25);
      }
    };
    await waitFor(() => window.__appStoreState && window.__appDB && document.getElementById('btnSaveDraftToLib'));
    const state = window.__appStoreState;
    const db = window.__appDB;
    await waitFor(() => state.library.words.length > 0 &&
      state.library.sentences.length > 0 &&
      !String(state.library.words[0].id).startsWith('w-default-'));
    const initializationStarted = performance.now();
    while (!(await db.isStoreInitialized('words')) || !(await db.isStoreInitialized('sentences'))) {
      if (performance.now() - initializationStarted > 10000) throw new Error('等待题库初始化完成超时');
      await delay(25);
    }

    const originalBulkPut = db.bulkPut.bind(db);
    const originalDelete = db.delete.bind(db);
    const originalClear = db.clear.bind(db);
    const originalWriteStores = db.writeStores.bind(db);
    const baselineWord = { id: 'failure-word', en: 'baseline', zh: '基准词', type: 'word', questionType: 'word-dictation' };
    const baselineSentence = {
      id: 'failure-sentence',
      en: 'A [test] sentence.',
      zh: '基准句',
      type: 'sentence',
      questionType: 'sentence-cloze',
      segments: [{ text: 'A ', blank: false }, { text: 'test', blank: true }, { text: ' sentence.', blank: false }]
    };
    await db.writeStores({ words: [baselineWord], sentences: [baselineSentence] }, { replace: true });
    state.library.words = [baselineWord];
    state.library.sentences = [baselineSentence];

    db.bulkPut = async () => false;

    state.ui.activeView = 'paneQuick';
    state.draft.items = [{ id: 'failure-new-word', en: 'should-not-save', zh: '不应保存', type: 'word', questionType: 'word-dictation' }];
    document.getElementById('btnSaveDraftToLib').click();
    await delay(100);
    const quickWordUnchanged = state.library.words.length === 1 && !state.library.words.some((word) => word.en === 'should-not-save');

    document.getElementById('modeCloze').click();
    await delay(50);
    const quickSentenceInput = document.querySelector('#paneQuick #inputVisualSentence');
    quickSentenceInput.value = 'Please save this sentence.';
    quickSentenceInput.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(50);
    document.querySelector('#paneQuick .visual-token-btn')?.click();
    document.querySelector('#paneQuick #btnSaveVisualToLib')?.click();
    await delay(100);
    const quickSentenceUnchanged = state.library.sentences.length === 1;

    state.ui.activeView = 'paneClozeVisual';
    const visualInput = document.querySelector('#paneClozeVisual #inputVisualSentence');
    visualInput.value = 'Another sentence for storage.';
    visualInput.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(50);
    document.querySelector('#paneClozeVisual .visual-token-btn')?.click();
    document.querySelector('#paneClozeVisual #btnSaveVisualToLib')?.click();
    await delay(100);
    const visualSentenceUnchanged = state.library.sentences.length === 1;

    db.delete = async () => false;
    document.querySelector('#paneClozeVisual .btn-sentence-del')?.click();
    await delay(100);
    const visualDeleteUnchanged = state.library.sentences.length === 1 && state.library.sentences[0].id === 'failure-sentence';

    state.ui.activeView = 'paneWordLib';
    document.querySelector('#paneWordLib .btn-lib-del')?.click();
    await delay(100);
    const wordDeleteUnchanged = state.library.words.length === 1 && state.library.words[0].id === 'failure-word';

    db.writeStores = async () => false;
    document.querySelector('#paneWordLib #btnLibClear')?.click();
    await waitFor(() => Array.from(document.querySelectorAll('button')).some((button) => button.textContent.trim() === '清空题库'));
    Array.from(document.querySelectorAll('button')).find((button) => button.textContent.trim() === '清空题库')?.click();
    await delay(100);
    const clearUnchanged = state.library.words.length === 1 && state.library.words[0].id === 'failure-word';

    db.bulkPut = originalBulkPut;
    db.delete = originalDelete;
    db.clear = originalClear;
    db.writeStores = originalWriteStores;

    // localStorage 只是兼容镜像。即使浏览器拒绝写入，分组仍须先成功落到 IndexedDB。
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'dictation_custom_groups') throw new DOMException('quota test', 'QuotaExceededError');
      return originalSetItem.call(this, key, value);
    };
    document.getElementById('btnNewGroup').click();
    await waitFor(() => document.getElementById('inputNewGroupName'));
    const groupInput = document.getElementById('inputNewGroupName');
    groupInput.value = '仅 IndexedDB 分组';
    groupInput.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('btnConfirmNewGroup').click();
    await waitFor(() => state.library.groups.includes('仅 IndexedDB 分组'));
    await delay(50);
    Storage.prototype.setItem = originalSetItem;
    const groupsAfterLocalStorageFailure = await db.getLibraryGroups();

    // 题库写入失败时，新建分组也不得只出现在界面或 localStorage 镜像中。
    db.writeStores = async () => false;
    document.getElementById('btnNewGroup').click();
    await waitFor(() => document.getElementById('inputNewGroupName'));
    groupInput.value = '不应出现的分组';
    groupInput.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('btnConfirmNewGroup').click();
    await delay(100);
    const failedGroupUnchanged = !state.library.groups.includes('不应出现的分组');
    db.writeStores = originalWriteStores;

    const storedWordsAfterFailures = await db.getAll('words');
    const storedSentencesAfterFailures = await db.getAll('sentences');

    // 空句库与空词库一样是用户有效状态，刷新后不得重新注入示例句。
    await db.writeStores({ sentences: [] }, { replace: true });
    state.library.sentences = [];

    return {
      quickWordUnchanged,
      quickSentenceUnchanged,
      visualSentenceUnchanged,
      visualDeleteUnchanged,
      wordDeleteUnchanged,
      clearUnchanged,
      groupsAfterLocalStorageFailure,
      failedGroupUnchanged,
      storedWordIds: storedWordsAfterFailures.map((item) => item.id),
      storedSentenceIds: storedSentencesAfterFailures.map((item) => item.id),
      sawFailureMessage: Array.from(document.querySelectorAll('.n-message')).some((node) => node.textContent.includes('失败'))
    };
  })()`);

  assert.equal(result.quickWordUnchanged, true, '快速录入保存词库失败时不得修改内存词库');
  assert.equal(result.quickSentenceUnchanged, true, '快速录入保存句库失败时不得修改内存句库');
  assert.equal(result.visualSentenceUnchanged, true, '可视化挖空保存失败时不得修改内存句库');
  assert.equal(result.visualDeleteUnchanged, true, '句库删除失败时不得先删除界面记录');
  assert.equal(result.wordDeleteUnchanged, true, '词库删除失败时不得先删除界面记录');
  assert.equal(result.clearUnchanged, true, '词库清空失败时不得清空界面记录');
  assert.deepEqual(result.groupsAfterLocalStorageFailure, ['仅 IndexedDB 分组'], 'localStorage 写入失败时分组仍须保存到 IndexedDB');
  assert.equal(result.failedGroupUnchanged, true, 'IndexedDB 写入失败时不得产生仅存在于界面的分组');
  assert.deepEqual(result.storedWordIds, ['failure-word']);
  assert.deepEqual(result.storedSentenceIds, ['failure-sentence']);
  assert.equal(result.sawFailureMessage, true, '持久化失败时应向用户显示明确错误信息');

  await page.call('Page.reload', { ignoreCache: true });
  const afterReload = await page.evaluate(`(async () => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const started = performance.now();
    while (performance.now() - started < 10000) {
      const state = window.__appStoreState;
      const db = window.__appDB;
      if (state && db) {
        const storedGroups = await db.getLibraryGroups();
        const sentences = await db.getAll('sentences');
        if (storedGroups?.includes('仅 IndexedDB 分组') && sentences.length === 0 && state.library.sentences.length === 0) {
          return { groups: storedGroups, sentenceCount: sentences.length, stateSentenceCount: state.library.sentences.length };
        }
      }
      await delay(25);
    }
    throw new Error('刷新后题库分组或空句库状态未恢复');
  })()`);
  assert.deepEqual(afterReload.groups, ['仅 IndexedDB 分组']);
  assert.equal(afterReload.sentenceCount, 0);
  assert.equal(afterReload.stateSentenceCount, 0, '刷新后不得重新注入示例句');
  assert.deepEqual(page.browserErrors, []);
  console.log(`LIBRARY_PERSISTENCE_FAILURES=${JSON.stringify(result)}`);
  console.log('LIBRARY_PERSISTENCE_FAILURE_TESTS_PASSED');
} finally {
  await page.close();
}
