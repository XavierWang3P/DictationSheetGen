import assert from 'assert';
import { launchEdgePage } from './helpers/edgeCdp.js';

const appUrl = new URL('../dist/index.html?__test=1', import.meta.url).href;
const page = await launchEdgePage({
  port: 9279,
  url: new URL('./fixtures/indexeddb-seed.html', import.meta.url).href
});

try {
  await page.evaluate(`(async () => {
    localStorage.setItem('dictation_custom_groups', JSON.stringify(['旧版 localStorage 空分组']));
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase('DictationSheetGenDB');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    const legacyDb = await new Promise((resolve, reject) => {
      const request = indexedDB.open('DictationSheetGenDB', 1);
      request.onupgradeneeded = () => {
        const oldDb = request.result;
        const words = oldDb.createObjectStore('words', { keyPath: 'id' });
        words.createIndex('en', 'en', { unique: false });
        words.createIndex('updatedAt', 'updatedAt', { unique: false });
        const sentences = oldDb.createObjectStore('sentences', { keyPath: 'id' });
        sentences.createIndex('updatedAt', 'updatedAt', { unique: false });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const tx = legacyDb.transaction('words', 'readwrite');
      tx.objectStore('words').put({ id: 'legacy-v1-word', en: 'legacy', zh: '旧数据' });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('旧数据写入中止'));
    });
    legacyDb.close();
  })()`);
  await page.call('Page.navigate', { url: appUrl });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if ((await page.evaluate('location.href')) === appUrl) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  const result = await page.evaluate(`(async () => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const waitFor = async (predicate, timeout = 10000) => {
      const started = performance.now();
      while (!predicate()) {
        if (performance.now() - started > timeout) throw new Error('等待恢复流程超时');
        await delay(25);
      }
    };
    await waitFor(() => window.__appStoreState && window.__appDB && document.getElementById('fileImportInput'));
    const state = window.__appStoreState;
    const db = window.__appDB;
    await waitFor(() => state.library.words.length > 0 && !String(state.library.words[0].id).startsWith('w-default-'));

    // 页面载入时应把夹具预置的 v1 IndexedDB 无损升级到 v2。
    const upgradedDb = await db.open();
    const legacyWordsAfterUpgrade = await db.getAll('words');
    const migrationCheck = {
      version: upgradedDb.version,
      preserved: legacyWordsAfterUpgrade.some((item) => item.id === 'legacy-v1-word'),
      initializedBeforeWrite: await db.isStoreInitialized('words'),
      groups: await db.getLibraryGroups()
    };

    const existing = {
      id: 'shared-library-id',
      en: 'Apple',
      zh: '苹果',
      group: '原有分组',
      customLocalField: 'keep-me'
    };
    const existingSentence = {
      id: 'shared-sentence-id',
      type: 'sentence',
      en: 'This is the old sentence.',
      zh: '这是原句。'
    };
    state.library.words = [existing];
    state.library.sentences = [existingSentence];
    await db.writeStores({ words: [existing], sentences: [existingSentence] }, { replace: true });

    const backup = {
      version: '5.0',
      draft: {
        items: [
          { id: 'duplicate-draft-id', en: 'school', zh: '学校', customDraftField: 'preserved' },
          { id: 'duplicate-draft-id', en: 'teacher', zh: '教师' }
        ],
        settings: {
          title: '恢复测试卷',
          customSettingField: 'preserved-setting',
          fontFamilyZh: '\";color:red\"><img data-restore-xss=\"1\" src=x onerror=\"window.__restoreXss=1\">',
          fontFamilyEn: 'Arial; background:url(javascript:alert(1))'
        }
      },
      library: {
        words: [
          { id: 'duplicate-word', en: 'apple', zh: '苹果', group: '备份分组' },
          { id: 'shared-library-id', en: 'banana', zh: '香蕉', group: '备份分组', customImportedField: 'preserved' },
          { id: 'shared-library-id', en: 'cherry', zh: '樱桃', group: '备份分组' }
        ],
        sentences: [
          { id: 'shared-sentence-id', type: 'sentence', en: 'This is a new sentence.', zh: '这是新句子。' },
          { id: 'shared-sentence-id', type: 'sentence', en: 'This is another sentence.', zh: '这是另一个句子。' }
        ]
      }
    };

    const input = document.getElementById('fileImportInput');
    const file = new File([JSON.stringify(backup)], 'safe-backup.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await waitFor(() => document.querySelector('.restore-review-card'));

    const beforeConfirm = {
      words: state.library.words.map((item) => item.en),
      draftCount: state.draft.items.length,
      hasMergeChoice: document.querySelector('.restore-review-card')?.textContent.includes('合并到现有题库'),
      hasReplaceWarning: document.querySelector('.restore-review-card')?.textContent.includes('覆盖恢复')
    };

    const confirmButton = Array.from(document.querySelectorAll('.restore-review-card button'))
      .find((button) => button.textContent.includes('合并并恢复'));
    confirmButton.click();
    await waitFor(() => !document.querySelector('.restore-review-card'));
    await delay(100);
    const storedWords = await db.getAll('words');
    const storedSentences = await db.getAll('sentences');
    const draftUnknownField = state.draft.items[0]?.customDraftField;
    const restoredDraftIds = state.draft.items.map((item) => String(item.id));
    const restoredWordIds = state.library.words.map((item) => String(item.id));
    const restoredSentenceIds = state.library.sentences.map((item) => String(item.id));
    const restoredFontSettings = {
      zh: state.draft.settings.fontFamilyZh,
      en: state.draft.settings.fontFamilyEn
    };
    const restoreXssCheck = {
      markerCount: document.querySelectorAll('[data-restore-xss]').length,
      handlerRan: window.__restoreXss === 1,
      previewContainsInjectedTag: Boolean(document.querySelector('.preview-stage [data-restore-xss]'))
    };

    const emptyDraftBackup = {
      version: '5.0',
      draft: { items: [] }
    };
    const emptyDraftFile = new File([JSON.stringify(emptyDraftBackup)], 'empty-draft-backup.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { configurable: true, value: [emptyDraftFile] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await waitFor(() => document.querySelector('.restore-review-card'));
    const emptyDraftReviewText = document.querySelector('.restore-review-card')?.textContent || '';
    const emptyDraftConfirm = Array.from(document.querySelectorAll('.restore-review-card button'))
      .find((button) => button.textContent.includes('合并并恢复'));
    emptyDraftConfirm.click();
    await waitFor(() => !document.querySelector('.restore-review-card'));
    const emptyDraftCount = state.draft.items.length;

    const malformedBackup = {
      version: '5.0',
      library: {
        words: [
          { id: 'would-replace', en: 'pear', zh: '梨' },
          null
        ]
      }
    };
    const malformedFile = new File([JSON.stringify(malformedBackup)], 'malformed-backup.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { configurable: true, value: [malformedFile] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await waitFor(() => (document.body.textContent || '').includes('词库第 2 条记录格式无效'));
    const storedAfterMalformed = await db.getAll('words');
    const afterWords = state.library.words.map((item) => ({
      en: item.en,
      group: item.group,
      customLocalField: item.customLocalField,
      customImportedField: item.customImportedField
    }));
    const wordsAfterMalformed = state.library.words.map((item) => item.en);

    // 通过题库面板的真实“导出备份”按钮生成文件，再从顶部入口覆盖恢复。
    const roundTripWord = {
      id: 'roundtrip-word',
      en: 'teacher',
      zh: '教师',
      group: '回环测试',
      customRoundTripField: 'preserved'
    };
    state.library.words = [roundTripWord];
    state.library.groups = ['回环测试', '没有单词的空分组'];
    await db.writeStores({ words: [roundTripWord] }, { replace: true });
    state.draft.items = [{
      id: 'draft-stays',
      type: 'word',
      questionType: 'word',
      en: 'stay',
      zh: '保留当前试卷'
    }];

    let exportedBlob = null;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const originalAnchorClick = HTMLAnchorElement.prototype.click;
    try {
      URL.createObjectURL = (blob) => {
        exportedBlob = blob;
        return 'blob:word-library-test';
      };
      URL.revokeObjectURL = () => {};
      HTMLAnchorElement.prototype.click = () => {};
      document.getElementById('btnLibExport').click();
      await waitFor(() => exportedBlob instanceof Blob);
    } finally {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      HTMLAnchorElement.prototype.click = originalAnchorClick;
    }
    const exportedLibrary = JSON.parse(await exportedBlob.text());

    const temporaryWord = { id: 'temporary-word', en: 'temporary', zh: '临时词' };
    state.library.words = [temporaryWord];
    state.library.groups = ['临时分组'];
    await db.writeStores({ words: [temporaryWord] }, { replace: true });
    const exportedFile = new File([JSON.stringify(exportedLibrary)], 'word-library-export.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { configurable: true, value: [exportedFile] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await waitFor(() => document.querySelector('.restore-review-card'));
    document.querySelector('.restore-mode-group input[value="replace"]').click();
    await waitFor(() => Array.from(document.querySelectorAll('.restore-review-card button'))
      .some((button) => button.textContent.includes('覆盖并恢复')));
    const roundTripConfirm = Array.from(document.querySelectorAll('.restore-review-card button'))
      .find((button) => button.textContent.includes('覆盖并恢复'));
    roundTripConfirm.click();
    await waitFor(() => !document.querySelector('.restore-review-card'));
    const storedAfterRoundTrip = await db.getAll('words');
    const wordsAfterRoundTrip = state.library.words.map((item) => item.en);
    const draftAfterRoundTrip = state.draft.items.map((item) => item.en);
    const roundTripUnknownField = state.library.words[0]?.customRoundTripField;
    const groupsAfterRoundTrip = [...state.library.groups];
    state.ui.activeView = 'paneWordLib';
    await delay(50);
    const renderedGroupsAfterRoundTrip = Array.from(document.querySelectorAll('.group-pill-btn'))
      .map((button) => button.textContent.trim());

    const legacyLibraryValidation = window.__appStorage.validateImportData({
      type: 'wordLibrary',
      version: '4.1',
      words: [{ id: 'legacy-library-word', en: 'pupil', zh: '学生' }],
      groups: ['旧版空分组']
    });
    const invalidGroupsValidation = window.__appStorage.validateImportData({
      type: 'wordLibrary',
      version: '4.1',
      words: [],
      groups: ['有效分组', { name: '非法分组' }]
    });

    const legacyLibraryFile = new File([JSON.stringify({
      type: 'wordLibrary',
      version: '4.1',
      words: [{ id: 'legacy-library-word', en: 'pupil', zh: '学生' }],
      groups: ['旧版空分组']
    })], 'legacy-word-library.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { configurable: true, value: [legacyLibraryFile] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await waitFor(() => document.querySelector('.restore-review-card'));
    document.querySelector('.restore-mode-group input[value="replace"]').click();
    await waitFor(() => Array.from(document.querySelectorAll('.restore-review-card button'))
      .some((button) => button.textContent.includes('覆盖并恢复')));
    const legacyConfirm = Array.from(document.querySelectorAll('.restore-review-card button'))
      .find((button) => button.textContent.includes('覆盖并恢复'));
    legacyConfirm.click();
    await waitFor(() => !document.querySelector('.restore-review-card'));
    await delay(50);
    const legacyRestore = {
      words: state.library.words.map((item) => item.en),
      groups: [...state.library.groups],
      draft: state.draft.items.map((item) => item.en),
      rendered: Array.from(document.querySelectorAll('.group-pill-btn')).map((button) => button.textContent.trim())
    };

    // 空题库覆盖同样是合法用户意图，刷新后也必须保持为空。
    const emptyLibraryBackup = {
      app: 'DictationSheetGen',
      type: 'wordLibrary',
      version: '5.0',
      library: { words: [] }
    };
    const emptyLibraryFile = new File([JSON.stringify(emptyLibraryBackup)], 'empty-library.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { configurable: true, value: [emptyLibraryFile] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await waitFor(() => document.querySelector('.restore-review-card'));
    document.querySelector('.restore-mode-group input[value="replace"]').click();
    await waitFor(() => Array.from(document.querySelectorAll('.restore-review-card button'))
      .some((button) => button.textContent.includes('覆盖并恢复')));
    const emptyLibraryConfirm = Array.from(document.querySelectorAll('.restore-review-card button'))
      .find((button) => button.textContent.includes('覆盖并恢复'));
    emptyLibraryConfirm.click();
    await waitFor(() => !document.querySelector('.restore-review-card'));
    const storedAfterEmptyReplace = await db.getAll('words');

    return {
      migrationCheck,
      beforeConfirm,
      afterWords,
      storedWords: storedWords.map((item) => item.en).sort(),
      storedSentences: storedSentences.map((item) => item.en).sort(),
      restoredDraftIds,
      restoredWordIds,
      restoredSentenceIds,
      restoredFontSettings,
      restoreXssCheck,
      draftUnknownField,
      settingUnknownField: state.draft.settings.customSettingField,
      emptyDraftReviewText,
      emptyDraftCount,
      malformedModalVisible: Boolean(document.querySelector('.restore-review-card')),
      wordsAfterMalformed,
      storedAfterMalformed: storedAfterMalformed.map((item) => item.en).sort(),
      exportedLibrary,
      wordsAfterRoundTrip,
      storedAfterRoundTrip: storedAfterRoundTrip.map((item) => item.en),
      draftAfterRoundTrip,
      roundTripUnknownField,
      groupsAfterRoundTrip,
      renderedGroupsAfterRoundTrip,
      legacyLibraryValidation,
      invalidGroupsValidation,
      legacyRestore,
      emptyLibraryStateCount: state.library.words.length,
      emptyLibraryStoredCount: storedAfterEmptyReplace.length,
      initializedAfterEmptyReplace: await db.isStoreInitialized('words')
    };
  })()`);

  console.log(`RESTORE_SAFETY=${JSON.stringify(result)}`);
  assert.deepEqual(result.beforeConfirm.words, ['Apple'], '确认前不得改变现有题库');
  assert.equal(result.migrationCheck.version, 2, '旧版 IndexedDB 应无损升级到 v2');
  assert.equal(result.migrationCheck.preserved, true, '升级时应保留旧版词库数据');
  assert.equal(result.migrationCheck.initializedBeforeWrite, false, '旧数据库升级不应伪造用户初始化标记');
  assert.deepEqual(result.migrationCheck.groups, ['旧版 localStorage 空分组'], '旧版 localStorage 分组应一次迁移到 IndexedDB');
  assert.equal(result.beforeConfirm.draftCount, 0, '确认前不得替换当前试卷');
  assert.equal(result.beforeConfirm.hasMergeChoice, true);
  assert.equal(result.beforeConfirm.hasReplaceWarning, true);
  assert.deepEqual(result.afterWords.map((item) => item.en), ['Apple', 'banana', 'cherry']);
  assert.equal(result.afterWords[0].customLocalField, 'keep-me', '合并时保留原有未知字段');
  assert.equal(result.afterWords[1].customImportedField, 'preserved', '导入时保留备份未知字段');
  assert.deepEqual(result.storedWords, ['Apple', 'banana', 'cherry']);
  assert.deepEqual(result.storedSentences, [
    'This is a new sentence.',
    'This is another sentence.',
    'This is the old sentence.'
  ].sort(), '句库合并时不得因同 id 覆盖不同内容');
  assert.equal(new Set(result.restoredDraftIds).size, 2, '备份内重复的草稿 id 应自动重建');
  assert.equal(new Set(result.restoredWordIds).size, 3, '词库同 id 的不同内容应全部保留');
  assert.equal(new Set(result.restoredSentenceIds).size, 3, '句库同 id 的不同内容应全部保留');
  assert.equal(result.restoredFontSettings.zh, "'KaiTi', '楷体', STKaiti, serif", '非法中文字体设置应回退为默认值');
  assert.equal(result.restoredFontSettings.en, "'Times New Roman', Times, serif", '非法英文字体设置应回退为默认值');
  assert.deepEqual(result.restoreXssCheck, {
    markerCount: 0,
    handlerRan: false,
    previewContainsInjectedTag: false
  }, '备份设置不得向预览注入 HTML 或事件处理器');
  assert.equal(result.draftUnknownField, 'preserved');
  assert.equal(result.settingUnknownField, 'preserved-setting');
  assert.match(result.emptyDraftReviewText, /备份中的 0 道题/, '恢复确认应明确显示空草稿');
  assert.equal(result.emptyDraftCount, 0, '有效的空草稿应清空当前试卷');
  assert.equal(result.malformedModalVisible, false, '含损坏记录的备份不得进入覆盖确认');
  assert.deepEqual(result.wordsAfterMalformed, ['Apple', 'banana', 'cherry'], '损坏备份不得替换内存题库');
  assert.deepEqual(result.storedAfterMalformed, ['Apple', 'banana', 'cherry'], '损坏备份不得替换 IndexedDB 题库');
  assert.equal(result.exportedLibrary.type, 'wordLibrary');
  assert.equal(result.exportedLibrary.version, '5.0');
  assert.equal(Array.isArray(result.exportedLibrary.library?.words), true, '题库导出应使用可恢复的 v5 library.words 结构');
  assert.equal(Object.hasOwn(result.exportedLibrary, 'words'), false, '新版题库导出不应继续写入歧义顶层 words');
  assert.deepEqual(result.exportedLibrary.library.groups, ['回环测试', '没有单词的空分组']);
  assert.deepEqual(result.wordsAfterRoundTrip, ['teacher'], '题库面板导出的备份应可从顶部入口恢复');
  assert.deepEqual(result.storedAfterRoundTrip, ['teacher'], '题库面板导出的备份应可从顶部入口恢复');
  assert.deepEqual(result.draftAfterRoundTrip, ['stay'], '独立题库备份不得替换当前试卷');
  assert.equal(result.roundTripUnknownField, 'preserved', '题库备份中的未知字段应原样保留');
  assert.deepEqual(result.groupsAfterRoundTrip, ['回环测试', '没有单词的空分组'], '恢复应保留没有单词的自定义分组');
  assert.equal(result.renderedGroupsAfterRoundTrip.some((text) => text.includes('没有单词的空分组')), true, '恢复的空分组应立即同步到题库界面');
  assert.equal(result.legacyLibraryValidation.valid, true, '历史 v4.1 题库备份仍应可识别');
  assert.equal(result.legacyLibraryValidation.hasLibraryWords, true);
  assert.equal(result.legacyLibraryValidation.hasDraftItems, false, '历史题库备份不得误判为试卷草稿');
  assert.deepEqual(result.legacyLibraryValidation.libraryGroups, ['旧版空分组'], '历史 v4.1 题库备份应保留空分组');
  assert.equal(result.invalidGroupsValidation.valid, false, '非法题库分组元数据必须被拒绝');
  assert.deepEqual(result.legacyRestore.words, ['pupil']);
  assert.deepEqual(result.legacyRestore.groups, ['旧版空分组']);
  assert.deepEqual(result.legacyRestore.draft, ['stay'], '历史独立题库备份不得替换当前试卷');
  assert.equal(result.legacyRestore.rendered.some((text) => text.includes('旧版空分组')), true, '历史空分组应立即同步到题库界面');
  assert.equal(result.emptyLibraryStateCount, 0);
  assert.equal(result.emptyLibraryStoredCount, 0);
  assert.equal(result.initializedAfterEmptyReplace, true, '空题库覆盖后应记录用户已初始化');

  await page.call('Page.reload', { ignoreCache: true });
  const afterReload = await page.evaluate(`(async () => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const started = performance.now();
    while (performance.now() - started < 10000) {
      const state = window.__appStoreState;
      const db = window.__appDB;
      if (state && db) {
        const initialized = await db.isStoreInitialized('words');
        const storedWords = await db.getAll('words');
        if (initialized && storedWords.length === 0 && state.library.words.length === 0) {
          return {
            initialized,
            storedCount: storedWords.length,
            stateCount: state.library.words.length
          };
        }
      }
      await delay(25);
    }
    throw new Error('刷新后空题库状态未能稳定恢复');
  })()`);
  assert.deepEqual(afterReload, { initialized: true, storedCount: 0, stateCount: 0 }, '刷新后不得重新注入示例词');
  assert.deepEqual(page.browserErrors, []);
  console.log('RESTORE_SAFETY_TESTS_PASSED');
} finally {
  await page.close();
}

process.exit(0);
