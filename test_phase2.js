import { spawn } from 'child_process';

async function testPhase2() {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9253',
    '--disable-gpu',
    'file:///d:/DictationSheetGen/dist/index.html'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  try {
    const res = await fetch('http://127.0.0.1:9253/json');
    const tabs = await res.json();
    const target = tabs.find(t => t.url.includes('DictationSheetGen'));
    const ws = new WebSocket(target.webSocketDebuggerUrl);

    let id = 1;
    function evalExpr(expr) {
      return new Promise((resolve) => {
        const cur = id++;
        const h = (e) => {
          const d = JSON.parse(e.data);
          if (d.id === cur) {
            ws.removeEventListener('message', h);
            resolve(d.result.result.value);
          }
        };
        ws.addEventListener('message', h);
        ws.send(JSON.stringify({
          id: cur,
          method: 'Runtime.evaluate',
          params: { expression: expr, awaitPromise: true, returnByValue: true }
        }));
      });
    }

    await new Promise(r => ws.onopen = r);

    const result = await evalExpr(`(async () => {
      const storage = window.__appStorage;
      const db = storage.db;
      const opened = await db.open();

      // 1. IndexedDB 读写验证
      const testWord = { id: 'w-test-p2', type: 'word', en: 'watermelon', zh: '西瓜', updatedAt: Date.now() };
      await db.bulkPut('words', [testWord]);
      const allWords = await db.getAll('words');
      const retrieved = allWords.find(w => w.id === 'w-test-p2');

      // 2. 格式校验验证
      const v4Val = storage.validateImportData({ version: '4.0', draft: { items: [testWord] } });
      const v3Val = storage.validateImportData({ words: [testWord] });
      const invVal = storage.validateImportData('invalid content');

      // 3. 重复项检测验证
      const dup = storage.detectDuplicates(
        [{ en: 'Apple' }, { en: 'Banana' }],
        [{ en: 'apple' }, { en: 'Orange' }]
      );

      return {
        dbOpened: !!opened,
        savedAndRetrieved: retrieved?.en === 'watermelon',
        v4Valid: v4Val.valid && v4Val.version === '4.0',
        v3Valid: v3Val.valid && v3Val.version === '3.0',
        invalidRejected: !invVal.valid,
        duplicateDetected: dup.duplicates.length === 1 && dup.duplicates[0].newItem.en === 'apple',
        uniquePassed: dup.unique.length === 1 && dup.unique[0].en === 'Orange'
      };
    })()`);

    console.log('=== Phase 2 存储层迁移特性验收 ===');
    console.log(JSON.stringify(result, null, 2));

    const allPassed = (
      result.dbOpened &&
      result.savedAndRetrieved &&
      result.v4Valid &&
      result.v3Valid &&
      result.invalidRejected &&
      result.duplicateDetected &&
      result.uniquePassed
    );

    console.log('-> 验收结论:', allPassed ? '🎉 全部通过！' : '❌ 未通过');
    edge.kill();
    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error('测试异常:', err);
    edge.kill();
    process.exit(1);
  }
}

testPhase2();
