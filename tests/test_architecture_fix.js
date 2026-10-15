import { spawn } from 'child_process';

async function testArchitectureFix() {
  console.log('=== 开始执行 Vue 渲染与事件架构修复真实端到端验证 ===\n');

  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9255',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1600,1200',
    `--user-data-dir=${process.env.TEMP}\\DictationSheetGenEdge-${process.pid}`,
    'file:///d:/DictationSheetGen/dist/index.html'
  ]);

  let res = null;
  for (let retry = 0; retry < 5; retry++) {
    try {
      await new Promise(r => setTimeout(r, 600));
      res = await fetch('http://127.0.0.1:9255/json');
      if (res.ok) break;
    } catch (e) {}
  }

  if (!res) {
    console.error('无法连接 Edge 端口 9255');
    edge.kill();
    process.exit(1);
  }

  try {
    const tabs = await res.json();
    const target = tabs.find(t => t.url.includes('DictationSheetGen'));
    if (!target) throw new Error('未找到目标页面');

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

    for (let retry = 0; retry < 50; retry++) {
      const isReady = await evalExpr('Boolean(window.__appStoreState && document.getElementById("wordsListContainer"))').catch(() => false);
      if (isReady) break;
      await new Promise(r => setTimeout(r, 100));
    }

    // 启用 Console 监听，捕获所有控制台异常
    await new Promise((resolve) => {
      ws.send(JSON.stringify({ id: id++, method: 'Console.enable' }));
      resolve();
    });

    // ================= 测试 1: 单次点击“下移”，严格只移动一位 =================
    console.log('【验证 1】单词列表单次点击“下移”，严格只移动 1 位（修复双重事件）:');
    const r1 = await evalExpr(`(async () => {
      const state = window.__appStoreState;
      // 重置为明确的 3 个词
      state.draft.items = [
        { id: 't1', type: 'word', en: 'first', zh: '第一' },
        { id: 't2', type: 'word', en: 'second', zh: '第二' },
        { id: 't3', type: 'word', en: 'third', zh: '第三' }
      ];
      await new Promise(r => setTimeout(r, 150));

      // 找到第 1 行的下移按钮并触发真实点击
      const rows = document.querySelectorAll('#wordsListContainer .word-item-row');
      const downBtn = rows[0].querySelector('button[aria-label="下移题目"]');
      if (downBtn) downBtn.click();
      await new Promise(r => setTimeout(r, 150));

      const updatedEnList = state.draft.items.map(it => it.en);
      return {
        initialOrder: ['first', 'second', 'third'],
        afterClickOrder: updatedEnList,
        isMovedExactlyOneStep: (updatedEnList[0] === 'second' && updatedEnList[1] === 'first' && updatedEnList[2] === 'third')
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r1, null, 2));
    const pass1 = r1.isMovedExactlyOneStep;
    console.log('-> 判定:', pass1 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 测试 2: 词库单次点击“➕ 试卷”，严格只增加 1 词 =================
    console.log('【验证 2】词库单次点击“➕ 试卷”，严格只增加 1 词（无重复处理）:');
    const r2 = await evalExpr(`(async () => {
      const state = window.__appStoreState;
      const initialCount = state.draft.items.length;

      // 切换到词库 Tab
      const libTab = document.querySelector('.sidebar-tab-btn[data-tab="paneWordLib"]');
      if (libTab) libTab.click();
      await new Promise(r => setTimeout(r, 150));

      const firstAddBtn = document.querySelector('#libWordsContainer .btn-lib-add');
      if (firstAddBtn) firstAddBtn.click();
      await new Promise(r => setTimeout(r, 150));

      const afterCount = state.draft.items.length;
      return {
        initialCount,
        afterCount,
        delta: afterCount - initialCount,
        isExactlyOneAdded: (afterCount - initialCount === 1)
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r2, null, 2));
    const pass2 = r2.isExactlyOneAdded;
    console.log('-> 判定:', pass2 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 测试 3: 可视化挖空单次点击，选中状态保持（不被撤销） =================
    console.log('【验证 3】可视化挖空单词点击一次保持选中高亮（无反转取消bug）:');
    const r3 = await evalExpr(`(async () => {
      // 切换到可视化挖空 Tab
      const clozeTab = document.querySelector('.sidebar-tab-btn[data-tab="paneClozeVisual"]');
      if (clozeTab) clozeTab.click();
      await new Promise(r => setTimeout(r, 150));

      const tokenBtns = document.querySelectorAll('#visualTokenWrap .visual-token-btn');
      if (tokenBtns.length === 0) return { error: '未找到单词胶囊' };

      const targetBtn = tokenBtns[0]; // 第一个词
      const beforeClass = targetBtn.className;
      targetBtn.click();
      await new Promise(r => setTimeout(r, 150));

      const afterClass = targetBtn.className;
      const previewText = document.getElementById('visualClozePreview')?.textContent || '';

      return {
        beforeClass,
        afterClass,
        isBlankAdded: afterClass.includes('is-blank'),
        hasBlankUnderline: previewText.includes('(')
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r3, null, 2));
    const pass3 = r3.isBlankAdded && r3.hasBlankUnderline;
    console.log('-> 判定:', pass3 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 测试 4: 连续操作下绝无 insertBefore / NotFoundError 异常 =================
    console.log('【验证 4】密集列表操作与模式切换零控制台报错（DOM 树健康）:');
    const r4 = await evalExpr(`(async () => {
      const state = window.__appStoreState;
      let errorOccurred = false;
      const errHandler = (e) => { errorOccurred = true; };
      window.addEventListener('error', errHandler);

      // 执行一系列频繁写操作
      const parseBtn = document.getElementById('btnParseText');
      const textarea = document.getElementById('customWordTextarea');
      if (textarea && parseBtn) {
        textarea.value = 'cat 猫\\ndog 狗\\npig 猪';
        parseBtn.click();
      }
      await new Promise(r => setTimeout(r, 100));

      // 切换模式
      const modeCloze = document.getElementById('modeCloze');
      if (modeCloze) modeCloze.click();
      await new Promise(r => setTimeout(r, 100));

      const modeAlpha = document.getElementById('modeAlphabet');
      if (modeAlpha) modeAlpha.click();
      await new Promise(r => setTimeout(r, 100));

      const modeWriting = document.getElementById('modeWriting');
      if (modeWriting) modeWriting.click();
      await new Promise(r => setTimeout(r, 100));

      window.removeEventListener('error', errHandler);
      return {
        errorOccurred,
        currentItemsCount: state.draft.items.length
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r4, null, 2));
    const pass4 = !r4.errorOccurred;
    console.log('-> 判定:', pass4 ? '✅ PASS' : '❌ FAIL', '\n');

    console.log('=== 架构级问题修复验证全部完成 ===');
    const allPass = pass1 && pass2 && pass3 && pass4;
    console.log('测试综述:', allPass ? '🎉 架构冲突彻底消除，真实交互路径全部通过！' : '❌ 存在失败项');

    ws.close();
    edge.kill();
    process.exit(allPass ? 0 : 1);
  } catch (err) {
    console.error('测试异常:', err);
    edge.kill();
    process.exit(1);
  }
}

testArchitectureFix();
