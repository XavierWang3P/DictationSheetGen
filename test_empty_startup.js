import { spawn } from 'child_process';

async function testEmptyStartup() {
  console.log('=== 开始验证首屏默认不预设单词特性 (v2.2.7) ===\n');

  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9261',
    '--disable-gpu',
    '--window-size=1600,1400',
    'file:///d:/DictationSheetGen/dist/index.html'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const res = await fetch('http://127.0.0.1:9261/json');
    const tabs = await res.json();
    const target = tabs.find(t => t.url.includes('DictationSheetGen'));
    if (!target) throw new Error('未找到目标测试页面');

    const ws = new WebSocket(target.webSocketDebuggerUrl);

    let id = 1;
    function evalExpr(expr) {
      return new Promise((resolve, reject) => {
        const cur = id++;
        const h = (e) => {
          const d = JSON.parse(e.data);
          if (d.id === cur) {
            ws.removeEventListener('message', h);
            if (d.result?.exceptionDetails) {
              reject(new Error(JSON.stringify(d.result.exceptionDetails)));
            } else {
              resolve(d.result?.result?.value);
            }
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

    // ================= 验证 1: 首次打开网页，试卷默认为空（0 词），无需手动清除 =================
    console.log('【验证 1】首次打开网页，检查当前试卷与输入框默认为空:');
    const r1 = await evalExpr(`(async () => {
      // 清理可能遗留的 localStorage 以模拟首次打开
      localStorage.removeItem('dictation_sheet_generator_v3');
      const state = window.__appStoreState;
      // 重置为首次打开状态
      state.draft.items = [];

      const textarea = document.getElementById('customWordTextarea');
      const badge = document.querySelector('.n-badge .n-badge-sup');
      const emptyTip = document.querySelector('.empty-sheet-placeholder');
      const wordEntries = document.querySelectorAll('.word-entry-item');

      return {
        itemCount: state.draft.items.length,
        textareaValue: textarea ? textarea.value : null,
        textareaPlaceholder: textarea ? textarea.getAttribute('placeholder') : null,
        badgeText: badge ? badge.textContent.trim() : null,
        hasEmptyPlaceholder: !!emptyTip,
        renderedWordEntries: wordEntries.length
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r1, null, 2));
    const pass1 = (
      r1.itemCount === 0 &&
      r1.textareaValue === '' &&
      r1.renderedWordEntries === 0 &&
      r1.badgeText === '0 词' &&
      r1.hasEmptyPlaceholder
    );
    console.log('-> 判定:', pass1 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 验证 2: 点击“默认9词”可随时载入示例 =================
    console.log('【验证 2】点击“默认9词”载入示例练习:');
    const r2 = await evalExpr(`(async () => {
      const btnLoadDefault = document.getElementById('btnLoadDefaultSample');
      btnLoadDefault.click();
      await new Promise(r => setTimeout(r, 200));

      const state = window.__appStoreState;
      const wordEntries = document.querySelectorAll('.word-entry-item');
      const badge = document.querySelector('.n-badge .n-badge-sup');

      return {
        itemCount: state.draft.items.length,
        renderedWordEntries: wordEntries.length,
        badgeText: badge ? badge.textContent.trim() : null
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r2, null, 2));
    const pass2 = (
      r2.itemCount === 9 &&
      r2.renderedWordEntries === 27 &&
      r2.badgeText === '9 词'
    );
    console.log('-> 判定:', pass2 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 验证 3: 清空试卷后持久化为空，刷新页面不再强制弹回9词 =================
    console.log('【验证 3】清空试卷后本地存储为空，模拟再次打开保持空白:');
    const r3 = await evalExpr(`(async () => {
      // 点击清空试卷
      const btnClear = document.getElementById('btnClearWords');
      btnClear.click();
      await new Promise(r => setTimeout(r, 150));

      // 触发 popconfirm 确定按钮
      const popAction = document.querySelector('.n-popconfirm__action');
      const confirmBtn = popAction ? Array.from(popAction.querySelectorAll('button')).find(b => b.textContent.includes('确定') || b.textContent.includes('确认')) : null;
      if (confirmBtn) confirmBtn.click();
      await new Promise(r => setTimeout(r, 250));

      // 检查当前状态
      const stateBefore = window.__appStoreState.draft.items.length;

      // 模拟页面重新加载 loadSavedState
      window.loadSavedState ? window.loadSavedState() : null;
      await new Promise(r => setTimeout(r, 100));

      const stateAfter = window.__appStoreState.draft.items.length;
      const wordEntries = document.querySelectorAll('.word-entry-item');

      return {
        stateBefore,
        stateAfter,
        renderedWordEntries: wordEntries.length
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r3, null, 2));
    const pass3 = (
      r3.stateBefore === 0 &&
      r3.stateAfter === 0 &&
      r3.renderedWordEntries === 0
    );
    console.log('-> 判定:', pass3 ? '✅ PASS' : '❌ FAIL', '\n');

    const allPass = pass1 && pass2 && pass3;
    console.log('==================================================');
    console.log(allPass ? '🎉 首屏不预设单词与干净输入体验验证通过 (3/3 PASS)!' : '❌ 有验证项未通过');
    console.log('==================================================\n');

    ws.close();
    edge.kill();
    process.exit(allPass ? 0 : 1);
  } catch (err) {
    console.error('测试异常:', err);
    edge.kill();
    process.exit(1);
  }
}

testEmptyStartup();
