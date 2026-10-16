import { spawn } from 'child_process';
import { selectPageTarget } from './helpers/edgeCdp.js';

async function testDeleteGroup() {
  console.log('=== 开始验证词库分组删除功能 (v2.2.9) ===\n');

  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9266',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${process.env.TEMP}\\DictationSheetGenEdge-${process.pid}`,
    '--window-size=1600,1400',
    new URL('../dist/index.html?__test=1', import.meta.url).href
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const res = await fetch('http://127.0.0.1:9266/json');
    const tabs = await res.json();
    const target = selectPageTarget(tabs, new URL('../dist/index.html?__test=1', import.meta.url).href);
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
      const isReady = await evalExpr(`!!window.__appStoreState && document.querySelectorAll('.n-tabs-tab').length > 0`).catch(() => false);
      if (isReady) break;
      await new Promise(r => setTimeout(r, 100));
    }

    // ================= 步骤 1: 切换到单词库并新建一个空分组 (复现用户截图) =================
    console.log('【验证 1】切换到单词库，新建空分组「四年级上册 Unit 2」:');
    const r1 = await evalExpr(`(async () => {
      // 切换到词库
      const navTabs = document.querySelectorAll('.n-tabs-tab');
      for (const t of navTabs) {
        if (t.textContent.includes('词库') || t.textContent.includes('单词库')) {
          t.click();
          break;
        }
      }
      await new Promise(r => setTimeout(r, 300));

      const btnNewGroup = document.getElementById('btnNewGroup');
      btnNewGroup.click();
      await new Promise(r => setTimeout(r, 300));

      const input = document.getElementById('inputNewGroupName');
      input.value = '四年级上册 Unit 2';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      const btnConfirm = document.getElementById('btnConfirmNewGroup');
      btnConfirm.click();
      await new Promise(r => setTimeout(r, 300));

      const pill = document.getElementById('pillGroup_四年级上册_Unit_2');
      const delIcon = document.getElementById('btnDelPill_四年级上册_Unit_2');
      const btnDelCurrent = document.getElementById('btnDeleteCurrentGroup');
      const btnDelEmpty = document.getElementById('btnDeleteEmptyGroup');

      return {
        hasPill: !!pill,
        pillText: pill ? pill.textContent.trim() : null,
        hasDelIcon: !!delIcon,
        hasBtnDelCurrent: !!btnDelCurrent,
        hasBtnDelEmpty: !!btnDelEmpty
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r1, null, 2));
    const pass1 = (
      r1.hasPill &&
      r1.pillText.includes('四年级上册 Unit 2 (0)') &&
      !r1.hasDelIcon &&
      r1.hasBtnDelCurrent &&
      r1.hasBtnDelEmpty
    );
    console.log('-> 判定:', pass1 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 步骤 2: 点击「🗑️ 删除此空分组」一键删除空分组 =================
    console.log('【验证 2】在空状态卡片中点击「🗑️ 删除此空分组」，验证该组立即移除:');
    const r2 = await evalExpr(`(async () => {
      const btnDelEmpty = document.getElementById('btnDeleteEmptyGroup');
      btnDelEmpty.click();
      await new Promise(r => setTimeout(r, 300));

      const pill = document.getElementById('pillGroup_四年级上册_Unit_2');
      const groupPills = Array.from(document.querySelectorAll('#groupPillsBar .group-pill-btn'))
        .map(p => p.textContent.trim());

      const activePill = document.querySelector('#groupPillsBar .group-pill-btn.active');

      return {
        hasPill: !!pill,
        groupPills,
        activePillText: activePill ? activePill.textContent.trim() : null
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r2, null, 2));
    const pass2 = (
      !r2.hasPill &&
      !r2.groupPills.some(p => p.includes('四年级上册 Unit 2')) &&
      r2.activePillText && r2.activePillText.includes('全部')
    );
    console.log('-> 判定:', pass2 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 步骤 3: 测试包含单词的分组删除 - 方案 A: 仅解散分组 (保留词汇) =================
    console.log('【验证 3】测试删除包含单词的分组，选择「仅解散该分组（保留单词）」:');
    const r3 = await evalExpr(`(async () => {
      const state = window.__appStoreState;
      // 添加两个属于「三年级测试组」的单词
      state.library.words.push(
        { id: 'w-test-1', en: 'cat', zh: '猫', group: '三年级测试组' },
        { id: 'w-test-2', en: 'dog', zh: '狗', group: '三年级测试组' }
      );
      await new Promise(r => setTimeout(r, 300));

      const pillBefore = document.getElementById('pillGroup_三年级测试组');
      if (!pillBefore) return { success: false, reason: '未找到分组筛选按钮' };
      pillBefore.click();
      await new Promise(r => setTimeout(r, 200));

      const btnDelCurrent = document.getElementById('btnDeleteCurrentGroup');
      if (!btnDelCurrent) return { success: false, reason: '未找到删除当前分组按钮' };
      btnDelCurrent.click();
      await new Promise(r => setTimeout(r, 300));

      const modalTitle = document.querySelector('.n-modal .n-card-header__main');
      const radioDissolve = document.getElementById('radioDelGroupDissolve');
      const btnConfirmDel = document.getElementById('btnConfirmDeleteGroup');

      // 保持默认的 dissolve（仅解散分组）
      btnConfirmDel.click();
      await new Promise(r => setTimeout(r, 400));

      const pill = document.getElementById('pillGroup_三年级测试组');
      const catWord = state.library.words.find(w => w.en === 'cat');
      const dogWord = state.library.words.find(w => w.en === 'dog');

      return {
        success: true,
        modalOpened: modalTitle && modalTitle.textContent.includes('删除词库分组'),
        hasPillAfter: !!pill,
        catGroup: catWord ? catWord.group : null,
        dogGroup: dogWord ? dogWord.group : null
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r3, null, 2));
    const pass3 = (
      r3.success &&
      r3.modalOpened &&
      !r3.hasPillAfter &&
      r3.catGroup === '通用词汇' &&
      r3.dogGroup === '通用词汇'
    );
    console.log('-> 判定:', pass3 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 步骤 4: 测试包含单词的分组删除 - 方案 B: 彻底删除分组及内部单词 =================
    console.log('【验证 4】测试删除包含单词的分组，选择「彻底删除分组及组内全部单词」:');
    const r4 = await evalExpr(`(async () => {
      const state = window.__appStoreState;
      // 添加两个属于「待删除组」的单词
      state.library.words.push(
        { id: 'w-del-1', en: 'deleteMe1', zh: '删我1', group: '待删除组' },
        { id: 'w-del-2', en: 'deleteMe2', zh: '删我2', group: '待删除组' }
      );
      await new Promise(r => setTimeout(r, 300));

      const pill = document.getElementById('pillGroup_待删除组');
      pill.click();
      await new Promise(r => setTimeout(r, 200));

      // 点击 info 行上的「🗑️ 删除该组」
      const btnDelCurrent = document.getElementById('btnDeleteCurrentGroup');
      btnDelCurrent.click();
      await new Promise(r => setTimeout(r, 300));

      // 选择第二项：彻底删除
      const radioDeleteAll = document.getElementById('radioDelGroupDeleteAll');
      radioDeleteAll.click();
      await new Promise(r => setTimeout(r, 100));

      const btnConfirmDel = document.getElementById('btnConfirmDeleteGroup');
      btnConfirmDel.click();
      await new Promise(r => setTimeout(r, 400));

      const pillAfter = document.getElementById('pillGroup_待删除组');
      const word1 = state.library.words.find(w => w.en === 'deleteMe1');
      const word2 = state.library.words.find(w => w.en === 'deleteMe2');

      return {
        hasPillAfter: !!pillAfter,
        hasWord1: !!word1,
        hasWord2: !!word2
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r4, null, 2));
    const pass4 = (
      !r4.hasPillAfter &&
      !r4.hasWord1 &&
      !r4.hasWord2
    );
    console.log('-> 判定:', pass4 ? '✅ PASS' : '❌ FAIL', '\n');

    console.log('=== 测试汇总 ===');
    const allPassed = pass1 && pass2 && pass3 && pass4;
    if (allPassed) {
      console.log('🎉 所有 4 项词库分组删除功能验证全部通过！');
    } else {
      console.error('❌ 部分测试未通过，请检查日志');
    }

    ws.close();
    edge.kill();
    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error('测试异常:', err);
    edge.kill();
    process.exit(1);
  }
}

testDeleteGroup();
