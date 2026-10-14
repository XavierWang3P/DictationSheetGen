import { spawn } from 'child_process';

async function testWordGrouping() {
  console.log('=== 开始执行词库分组/单元管理新功能测试 (v2.2.5) ===\n');

  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9259',
    '--disable-gpu',
    '--window-size=1600,1400',
    'file:///d:/DictationSheetGen/dist/index.html'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const res = await fetch('http://127.0.0.1:9259/json');
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

    // 切换到本地词库 Tab
    console.log('切换到“本地词库”标签页...');
    await evalExpr(`(async () => {
      const libTabBtn = document.querySelector('.sidebar-tab-btn[data-tab="paneWordLib"]');
      if (libTabBtn) libTabBtn.click();
      await new Promise(r => setTimeout(r, 150));
    })()`);

    // ================= 验证 1: 默认词库显示分组标签栏，默认存在五年级单元分组 =================
    console.log('【验证 1】默认词库显示分组标签栏，默认存在五年级单元分组:');
    const r1 = await evalExpr(`(async () => {
      const pillsBar = document.getElementById('groupPillsBar');
      const allPill = document.getElementById('pillGroupAll');
      const pills = Array.from(document.querySelectorAll('.group-pill-btn'));
      const pillTexts = pills.map(p => p.textContent.trim());
      const words = window.__appStoreState.library.words;
      const groups = [...new Set(words.map(w => w.group || '通用词汇'))];

      return {
        hasPillsBar: !!pillsBar,
        hasAllPill: !!allPill,
        pillTexts,
        groupsCount: groups.length,
        firstGroup: groups[0]
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r1, null, 2));
    const pass1 = r1.hasPillsBar && r1.pillTexts.some(t => t.includes('全部')) && r1.groupsCount > 0;
    console.log('-> 判定:', pass1 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 验证 2: 预设课标单元一键导入 =================
    console.log('【验证 2】点击“课标单元”并导入“三年级上册 Unit 1”:');
    const r2 = await evalExpr(`(async () => {
      const btnPreset = document.getElementById('btnPresetUnits');
      btnPreset.click();
      await new Promise(r => setTimeout(r, 250));

      // 找到三年级上册 Unit 1 导入按钮
      const btnG3 = document.getElementById('btnImportUnit_三年级上册_Unit_1');
      if (btnG3) {
        btnG3.click();
      }
      await new Promise(r => setTimeout(r, 350));

      const words = window.__appStoreState.library.words;
      const g3Words = words.filter(w => w.group === '三年级上册 Unit 1');
      return {
        foundBtn: !!btnG3,
        totalWords: words.length,
        g3Count: g3Words.length
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r2, null, 2));
    const pass2 = r2.foundBtn && r2.g3Count >= 8;
    console.log('-> 判定:', pass2 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 验证 3: 点击单元标签过滤列表 =================
    console.log('【验证 3】点击“三年级上册 Unit 1”胶囊标签过滤单词列表:');
    const r3 = await evalExpr(`(async () => {
      const g3Pill = document.getElementById('pillGroup_三年级上册_Unit_1');
      if (g3Pill) g3Pill.click();
      await new Promise(r => setTimeout(r, 200));

      const rows = Array.from(document.querySelectorAll('#libWordsContainer .lib-item-row'));
      const rowTexts = rows.map(r => r.querySelector('.lib-item-text strong')?.textContent);
      const activePill = document.querySelector('.group-pill-btn.active');
      const infoText = document.getElementById('libSelectedInfo')?.textContent;
      return {
        hasG3Pill: !!g3Pill,
        renderedRowCount: rows.length,
        rowTexts,
        activePillText: activePill ? activePill.textContent.trim() : null,
        infoText
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r3, null, 2));
    const pass3 = r3.hasG3Pill && r3.renderedRowCount === r2.g3Count && r3.activePillText.includes('三年级上册 Unit 1');
    console.log('-> 判定:', pass3 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 验证 4: 批量修改所选单词的分组 =================
    console.log('【验证 4】全选当前过滤出的单词并批量修改组别:');
    const r4 = await evalExpr(`(async () => {
      // 点击全选
      const btnSelectAll = document.getElementById('btnLibSelectAll');
      btnSelectAll.click();
      await new Promise(r => setTimeout(r, 100));

      // 点击批量分组按钮
      const btnBatch = document.getElementById('btnBatchSetGroup');
      btnBatch.click();
      await new Promise(r => setTimeout(r, 250));

      // 输入新组名
      const inputBatch = document.getElementById('inputBatchCustomGroup');
      inputBatch.value = '三年级第一单元月考';
      inputBatch.dispatchEvent(new Event('input', { bubbles: true }));

      // 点击确认批量设置
      const btnConfirm = document.getElementById('btnConfirmBatchGroup');
      btnConfirm.click();
      await new Promise(r => setTimeout(r, 350));

      const words = window.__appStoreState.library.words;
      const targetWords = words.filter(w => w.group === '三年级第一单元月考');

      return {
        targetWordsCount: targetWords.length
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r4, null, 2));
    const pass4 = r4.targetWordsCount === r2.g3Count;
    console.log('-> 判定:', pass4 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 验证 5: 单个单词点击分组标签直接修改 =================
    console.log('【验证 5】单卡片点击分组标签直接修改单个单词的分组:');
    const r5 = await evalExpr(`(async () => {
      // 切换到全部
      document.getElementById('pillGroupAll').click();
      await new Promise(r => setTimeout(r, 200));

      // 找到第一个单词卡片的分组标签
      const tag = document.querySelector('.word-group-tag');
      tag.click();
      await new Promise(r => setTimeout(r, 250));

      const input = document.getElementById('inputSingleGroup');
      input.value = '特别重点词汇';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      const btnConfirm = document.getElementById('btnConfirmSingleGroup');
      btnConfirm.click();
      await new Promise(r => setTimeout(r, 350));

      const words = window.__appStoreState.library.words;
      const specialWords = words.filter(w => w.group === '特别重点词汇');

      return {
        specialWordsCount: specialWords.length
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r5, null, 2));
    const pass5 = r5.specialWordsCount === 1;
    console.log('-> 判定:', pass5 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 验证 6: 新建分组功能 =================
    console.log('【验证 6】点击“➕ 新建组”创建自定义分组:');
    const r6 = await evalExpr(`(async () => {
      const btnNew = document.getElementById('btnNewGroup');
      btnNew.click();
      await new Promise(r => setTimeout(r, 250));

      const inputNew = document.getElementById('inputNewGroupName');
      inputNew.value = '六年级Unit 5';
      inputNew.dispatchEvent(new Event('input', { bubbles: true }));

      const btnConfirm = document.getElementById('btnConfirmNewGroup');
      btnConfirm.click();
      await new Promise(r => setTimeout(r, 350));

      const pills = Array.from(document.querySelectorAll('.group-pill-btn'));
      const hasNewPill = pills.some(p => p.textContent.includes('六年级Unit 5'));
      const activePill = document.querySelector('.group-pill-btn.active');

      return {
        hasNewPill,
        activePillText: activePill ? activePill.textContent.trim() : null
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r6, null, 2));
    const pass6 = r6.hasNewPill && r6.activePillText.includes('六年级Unit 5');
    console.log('-> 判定:', pass6 ? '✅ PASS' : '❌ FAIL', '\n');

    // 总结
    const allPass = pass1 && pass2 && pass3 && pass4 && pass5 && pass6;
    console.log('==================================================');
    console.log(allPass ? '🎉 词库分组/单元管理新功能测试全部通过 (6/6 PASS)!' : '❌ 有测试项未通过');
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

testWordGrouping();
