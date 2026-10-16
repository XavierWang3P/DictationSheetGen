import { spawn } from 'child_process';
import { selectPageTarget } from './helpers/edgeCdp.js';
import assert from 'node:assert/strict';

async function testAlphabetAlignment() {
  console.log('=== 开始验证 26 个字母默写最后一格 (补齐格) 像素级对齐特性 ===\n');

  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9284',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1600,1200',
    new URL('../dist/index.html?__test=1', import.meta.url).href
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const res = await fetch('http://127.0.0.1:9284/json');
    const tabs = await res.json();
    const target = selectPageTarget(tabs, new URL('../dist/index.html?__test=1', import.meta.url).href);
    if (!target) throw new Error('未找到目标测试页面');
    const ws = new WebSocket(target.webSocketDebuggerUrl);

    let id = 1;
    function call(method, params = {}) {
      return new Promise((resolve) => {
        const cur = id++;
        const h = (e) => {
          const d = JSON.parse(e.data);
          if (d.id === cur) {
            ws.removeEventListener('message', h);
            resolve(d.result);
          }
        };
        ws.addEventListener('message', h);
        ws.send(JSON.stringify({ id: cur, method, params }));
      });
    }

    await new Promise(r => ws.onopen = r);

    // 等待 DOM 挂载就绪
    for (let i = 0; i < 50; i++) {
      const isReady = await call('Runtime.evaluate', { expression: `!!window.__appStoreState && !!document.getElementById('btnLoadAlphabet26')`, returnByValue: true }).then(r => r?.result?.value).catch(() => false);
      if (isReady) break;
      await new Promise(r => setTimeout(r, 100));
    }

    // ================= 测试 1: 3 行模式 (3x9) 最后一格对齐 =================
    console.log('【验证 1】3 行模式 (3*9) 第 26 格与第 27 格四线格线绝对对齐:');
    const r1 = await call('Runtime.evaluate', {
      expression: `(async () => {
        const state = window.__appStoreState;
        state.draft.settings.dictMode = 'alphabet';
        state.draft.settings.alphabet26Rows = 3;
        state.draft.settings.copiesPerPage = 1;
        document.getElementById('btnLoadAlphabet26')?.click();
        await new Promise(r => setTimeout(r, 400));

        const row = document.querySelector('.alpha-26-grid-row:last-child');
        const cells = Array.from(row.querySelectorAll('.alpha-26-cell'));
        const c26 = cells[cells.length - 2];
        const c27 = cells[cells.length - 1];

        const lines26 = Array.from(c26.querySelectorAll('line')).map(l => l.getBoundingClientRect().top);
        const lines27 = Array.from(c27.querySelectorAll('line')).map(l => l.getBoundingClientRect().top);

        const diffs = lines26.map((top, idx) => Math.abs(top - lines27[idx]));
        const maxDiff = Math.max(...diffs);

        return {
          totalCells: cells.length,
          hasDummy: c27.classList.contains('alpha-dummy-cell'),
          maxDiff,
          diffs
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    const data1 = r1.result?.value;
    console.log('-> 结果:', JSON.stringify(data1, null, 2));
    assert.equal(data1.totalCells, 9, '3 行模式最后一行必须为 9 格');
    assert.ok(data1.hasDummy, '第 9 格必须包含 alpha-dummy-cell 类名');
    assert.ok(data1.maxDiff < 0.5, `格线必须在亚像素级完全对齐 (实际最大误差: ${data1.maxDiff}px)`);
    console.log('-> 判定: ✅ PASS\n');

    // ================= 测试 2: 4 行模式 (4x7) 最后一格与倒数第二格对齐 =================
    console.log('【验证 2】4 行模式 (4*7) 第 26 格与第 27、28 补齐格四线格线绝对对齐:');
    const r2 = await call('Runtime.evaluate', {
      expression: `(async () => {
        const state = window.__appStoreState;
        state.draft.settings.dictMode = 'alphabet';
        state.draft.settings.alphabet26Rows = 4;
        state.draft.settings.copiesPerPage = 1;
        // 更新 items 的 alphaData.rowMode 为 4
        state.draft.items.forEach(it => {
          if (it.alphaData) it.alphaData.rowMode = 4;
        });
        await new Promise(r => setTimeout(r, 400));

        const row = document.querySelector('.alpha-26-grid-row:last-child');
        const cells = Array.from(row.querySelectorAll('.alpha-26-cell'));
        const c26 = cells[4];
        const c27 = cells[5];
        const c28 = cells[6];

        const lines26 = Array.from(c26.querySelectorAll('line')).map(l => l.getBoundingClientRect().top);
        const lines27 = Array.from(c27.querySelectorAll('line')).map(l => l.getBoundingClientRect().top);
        const lines28 = Array.from(c28.querySelectorAll('line')).map(l => l.getBoundingClientRect().top);

        const diffs27 = lines26.map((top, idx) => Math.abs(top - lines27[idx]));
        const diffs28 = lines26.map((top, idx) => Math.abs(top - lines28[idx]));
        const maxDiff = Math.max(...diffs27, ...diffs28);

        return {
          totalCells: cells.length,
          hasDummy27: c27.classList.contains('alpha-dummy-cell'),
          hasDummy28: c28.classList.contains('alpha-dummy-cell'),
          maxDiff,
          diffs27,
          diffs28
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    const data2 = r2.result?.value;
    console.log('-> 结果:', JSON.stringify(data2, null, 2));
    assert.equal(data2.totalCells, 7, '4 行模式每行必须为 7 格');
    assert.ok(data2.hasDummy27 && data2.hasDummy28, '第 6、7 格必须为补齐格');
    assert.ok(data2.maxDiff < 0.5, `4 行模式格线必须完全对齐 (实际最大误差: ${data2.maxDiff}px)`);
    console.log('-> 判定: ✅ PASS\n');

    // ================= 测试 3: Debug 模式下边界与外框对齐 =================
    console.log('【验证 3】Debug 模式下补齐格轮廓与所有题目卡片外框视觉一致:');
    const r3 = await call('Runtime.evaluate', {
      expression: `(async () => {
        document.body.classList.add('is-debug-mode');
        await new Promise(r => setTimeout(r, 200));

        const dummy = document.querySelector('.alpha-dummy-cell');
        const comp = window.getComputedStyle(dummy);
        const hasOutline = comp.outlineStyle !== 'none' && comp.outlineWidth !== '0px';

        document.body.classList.remove('is-debug-mode');
        return {
          hasOutline,
          outline: comp.outline
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    const data3 = r3.result?.value;
    console.log('-> 结果:', JSON.stringify(data3, null, 2));
    assert.ok(data3.hasOutline, 'Debug 模式下补齐格必须具有统一的轮廓高亮');
    console.log('-> 判定: ✅ PASS\n');

    console.log('==================================================');
    console.log('🎉 26 字母默写补齐格像素级对齐自动化测试 100% 通过！');
    console.log('==================================================\n');

    ws.close();
    edge.kill();
    process.exit(0);
  } catch (err) {
    console.error('测试异常:', err);
    edge.kill();
    process.exit(1);
  }
}

testAlphabetAlignment();
