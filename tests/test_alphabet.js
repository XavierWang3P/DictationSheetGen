import { spawn } from 'child_process';

async function testAlphabet() {
  console.log('=== 开始执行三年级字母默写模式专项自动化测试 ===\n');

  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9254',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${process.env.TEMP}\\DictationSheetGenEdge-${process.pid}`,
    'file:///d:/DictationSheetGen/dist/index.html'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const res = await fetch('http://127.0.0.1:9254/json');
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

    // 等待 DOM 挂载就绪
    for (let i = 0; i < 50; i++) {
      const isReady = await evalExpr(`!!document.getElementById('modeAlphabet') && !!window.__appStoreState`).catch(() => false);
      if (isReady) break;
      await new Promise(r => setTimeout(r, 100));
    }

    // ================= 测试 1: 模式切换与字母控制卡片展示 =================
    console.log('【测试 1】出卷模式切换为「🔤 三年级字母专项」:');
    const r1 = await evalExpr(`(async () => {
      const radioAlpha = document.getElementById('modeAlphabet');
      if (radioAlpha) radioAlpha.click();
      await new Promise(r => setTimeout(r, 150));
      const card = document.getElementById('alphabetControlCard');
      const tabs = document.getElementById('alphabetTypeTabs');
      return {
        hasAlphaRadio: !!radioAlpha,
        cardVisible: !!card,
        hasTabs: !!tabs
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r1, null, 2));
    const pass1 = r1.hasAlphaRadio && r1.cardVisible && r1.hasTabs;
    console.log('-> 判定:', pass1 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 测试 2: 26 个字母默写生成与试卷渲染 =================
    console.log('【测试 2】26 个英文字母全默写生成:');
    const r2 = await evalExpr(`(async () => {
      document.getElementById('btnLoadAlphabet26')?.click();
      await new Promise(r => setTimeout(r, 200));
      const appState = window.__appStoreState;
      const cards = document.querySelectorAll('#sheetsStreamContainer .word-card');
      const firstCard = cards[0];
      const lastCard = cards[cards.length - 1];
      return {
        dictMode: appState ? appState.draft.settings.dictMode : null,
        itemCount: appState ? appState.draft.items.length : 0,
        renderedCardCount: cards.length,
        title: appState ? appState.draft.settings.title : null,
        firstCardText: firstCard ? firstCard.textContent.trim().replace(/\\s+/g, ' ') : '',
        lastCardText: lastCard ? lastCard.textContent.trim().replace(/\\s+/g, ' ') : ''
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r2, null, 2));
    const pass2 = r2.dictMode === 'alphabet' && r2.itemCount === 26 && r2.renderedCardCount === 26 && r2.title.includes('26个英文字母');
    console.log('-> 判定:', pass2 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 测试 3: 字母左右邻居默写生成 =================
    console.log('【测试 3】字母左右邻居默写专项生成:');
    const r3 = await evalExpr(`(async () => {
      document.getElementById('btnLoadAlphabetNeighbors')?.click();
      await new Promise(r => setTimeout(r, 200));
      const appState = window.__appStoreState;
      const cards = document.querySelectorAll('#sheetsStreamContainer .word-card');
      const firstItem = appState ? appState.draft.items[0] : null;
      return {
        itemCount: appState ? appState.draft.items.length : 0,
        title: appState ? appState.draft.settings.title : null,
        firstItemZh: firstItem ? firstItem.zh : '',
        firstItemEn: firstItem ? firstItem.en : '',
        renderedCardCount: cards.length
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r3, null, 2));
    const pass3 = r3.itemCount === 9 && r3.title.includes('字母左右邻居') && r3.firstItemZh.includes('邻居');
    console.log('-> 判定:', pass3 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 测试 4: 字母大小写转换默写生成 =================
    console.log('【测试 4】字母大小写转换专项生成:');
    const r4 = await evalExpr(`(async () => {
      document.getElementById('btnLoadAlphabetCase')?.click();
      await new Promise(r => setTimeout(r, 200));
      const appState = window.__appStoreState;
      const cards = document.querySelectorAll('#sheetsStreamContainer .word-card');
      const firstItem = appState ? appState.draft.items[0] : null;
      return {
        itemCount: appState ? appState.draft.items.length : 0,
        title: appState ? appState.draft.settings.title : null,
        firstItemZh: firstItem ? firstItem.zh : '',
        renderedCardCount: cards.length
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r4, null, 2));
    const pass4 = r4.itemCount === 9 && r4.title.includes('大小写转换') && (r4.firstItemZh.includes('小写') || r4.firstItemZh.includes('大写'));
    console.log('-> 判定:', pass4 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 测试 5: 界面交互子 Tab 与预设点击联动 =================
    console.log('【测试 5】子题型 Tab 切换与预设模板联动:');
    const r5 = await evalExpr(`(async () => {
      // 切换到大小写子面板
      const tabCase = document.getElementById('tabAlphaCase');
      if (tabCase) tabCase.click();
      await new Promise(r => setTimeout(r, 100));
      const paneCase = document.getElementById('paneAlphaCase');

      // 切换到邻居子面板
      const tabNeighbors = document.getElementById('tabAlphaNeighbors');
      if (tabNeighbors) tabNeighbors.click();
      await new Promise(r => setTimeout(r, 100));
      const paneNeighbors = document.getElementById('paneAlphaNeighbors');

      // 快速预设按钮点击
      const btnPreset = document.getElementById('btnPreset_alpha_neighbors_9');
      if (btnPreset) btnPreset.click();
      await new Promise(r => setTimeout(r, 200));

      const appState = window.__appStoreState;
      return {
        hasPaneCase: !!paneCase,
        hasPaneNeighbors: !!paneNeighbors,
        afterPresetItemCount: appState ? appState.draft.items.length : 0,
        afterPresetTitle: appState ? appState.draft.settings.title : ''
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r5, null, 2));
    const pass5 = r5.hasPaneCase && r5.hasPaneNeighbors && r5.afterPresetItemCount === 9;
    console.log('-> 判定:', pass5 ? '✅ PASS' : '❌ FAIL', '\n');

    console.log('=== 三年级字母专项全部测试执行完毕 ===');
    const allPass = pass1 && pass2 && pass3 && pass4 && pass5;
    console.log('最终测试综述:', allPass ? '🎉 三年级字母默写模式 5 大核心功能 100% 验收通过！' : '❌ 存在未通过项，需进一步检查');

    ws.close();
    edge.kill();
    process.exit(allPass ? 0 : 1);
  } catch (err) {
    console.error('测试异常:', err);
    edge.kill();
    process.exit(1);
  }
}

testAlphabet();
