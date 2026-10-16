import { spawn } from 'child_process';
import { selectPageTarget } from './helpers/edgeCdp.js';

async function testClozeFeatures() {
  console.log('=== 开始执行句子挖空专项新功能测试 (v2.2.4) ===\n');

  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9258',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1600,1200',
    `--user-data-dir=${process.env.TEMP}\\DictationSheetGenEdge-${process.pid}`,
    new URL('../dist/index.html?__test=1', import.meta.url).href
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const res = await fetch('http://127.0.0.1:9258/json');
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
      const isReady = await evalExpr(`!!document.getElementById('modeCloze') && !!window.__appStoreState`).catch(() => false);
      if (isReady) break;
      await new Promise(r => setTimeout(r, 100));
    }

    // ================= 验证 1: 句子挖空使用独立自动列数且不影响其他题型 =================
    console.log('【验证 1】句子挖空使用独立自动列数，不改写其他题型默认值:');
    const r1 = await evalExpr(`(async () => {
      // 切换出卷模式至 cloze
      document.getElementById('modeCloze').click();
      await new Promise(r => setTimeout(r, 100));
      const s = window.__appStoreState.draft.settings;
      return {
        dictMode: s.dictMode,
        legacyColumns: s.columns,
        clozeColumns: s.layoutDefaults.sentenceClozeColumns,
        wordColumns: s.layoutDefaults.wordDictationColumns,
        sentenceColumns: s.layoutDefaults.sentenceDictationColumns
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r1, null, 2));
    const pass1 = r1.dictMode === 'cloze' && r1.legacyColumns === 3 && r1.clozeColumns === 'auto' && r1.wordColumns === 3 && r1.sentenceColumns === 1;
    console.log('-> 判定:', pass1 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 验证 2: 题量较多时自动切换为 1页2份 或 1份 =================
    console.log('【验证 2】题目较多超出版面时，自动适配为 1页2份 或 1页1份:');
    const r2 = await evalExpr(`(async () => {
      const textarea = document.getElementById('customWordTextarea');
      
      // 测试 A: 9 句 (适中，应自动设为 2 份)
      document.getElementById('btnLoadDefaultSample').click();
      await new Promise(r => setTimeout(r, 150));
      const state9 = window.__appStoreState.draft.settings;
      const copies9 = state9.copiesPerPage;

      // 测试 B: 16 句 (较多，应自动设为 1 份)
      const sentences16 = Array.from({ length: 16 }, (_, i) => \`Sentence number \${i + 1} has [a target] word | 第 \${i + 1} 句测试翻译\`).join('\\n');
      textarea.value = sentences16;
      document.getElementById('btnParseText').click();
      await new Promise(r => setTimeout(r, 150));
      const state16 = window.__appStoreState.draft.settings;
      const copies16 = state16.copiesPerPage;

      return {
        copies9,
        copies16
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r2, null, 2));
    const pass2 = r2.copies9 === 2 && r2.copies16 === 1;
    console.log('-> 判定:', pass2 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 验证 3: 精简后中文翻译固定在句子上方 =================
    console.log('【验证 3】精简后中文翻译固定在句子上方:');
    const r3 = await evalExpr(`(async () => {
      // 载入默认 9 句
      document.getElementById('btnLoadDefaultSample').click();
      await new Promise(r => setTimeout(r, 150));

      const card = document.querySelector('.cloze-card-inline');
      const layout = card?.querySelector('.cloze-position-layout') || null;
      return {
        className: layout?.className || '',
        firstClass: layout?.children?.[0]?.className || '',
        secondClass: layout?.children?.[1]?.className || '',
        hasChinese: !!layout?.querySelector('.cloze-zh'),
        hasEnglish: !!layout?.querySelector('.cloze-english-column')
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r3, null, 2));
    const pass3 = (
      r3.className.includes('cloze-layout-above') &&
      r3.firstClass.includes('pos-above') &&
      r3.secondClass.includes('cloze-english-column') &&
      r3.hasChinese && r3.hasEnglish
    );
    console.log('-> 判定:', pass3 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 验证 4: 四线三格挖空格长包含半格档位 =================
    console.log('【验证 4】四线三格支持 1格、1.5格、2格、2.5格、3格:');
    const r4 = await evalExpr(`(async () => {
      // 切换为 1 词长
      document.getElementById('blankWidth1Word').click();
      await new Promise(r => setTimeout(r, 100));
      const svg1 = document.querySelector('.cloze-blank-line.cloze-inline-grid');
      const w1 = svg1 ? svg1.style.width : '';

      document.getElementById('blankWidth1Point5Words').click();
      await new Promise(r => setTimeout(r, 100));
      const svg15 = document.querySelector('.cloze-blank-line.cloze-inline-grid');
      const w15 = svg15 ? svg15.style.width : '';

      // 切换为 2 词长
      document.getElementById('blankWidth2Words').click();
      await new Promise(r => setTimeout(r, 100));
      const svg2 = document.querySelector('.cloze-blank-line.cloze-inline-grid');
      const w2 = svg2 ? svg2.style.width : '';

      document.getElementById('blankWidth2Point5Words').click();
      await new Promise(r => setTimeout(r, 100));
      const svg25 = document.querySelector('.cloze-blank-line.cloze-inline-grid');
      const w25 = svg25 ? svg25.style.width : '';

      // 切换为 3 词长
      document.getElementById('blankWidth3Words').click();
      await new Promise(r => setTimeout(r, 100));
      const svg3 = document.querySelector('.cloze-blank-line.cloze-inline-grid');
      const w3 = svg3 ? svg3.style.width : '';

      return {
        w1,
        w15,
        w2,
        w25,
        w3
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r4, null, 2));
    const pass4 = r4.w1 === '62px' && r4.w15 === '85px' && r4.w2 === '108px' && r4.w25 === '130px' && r4.w3 === '152px';
    console.log('-> 判定:', pass4 ? '✅ PASS' : '❌ FAIL', '\n');

    console.log('=== 全部专项测试完成 ===');
    const allPass = pass1 && pass2 && pass3 && pass4;
    console.log('最终测试综述:', allPass ? '🎉 句子挖空 4 大特性 100% 验证通过！' : '❌ 存在未通过项');

    ws.close();
    edge.kill();
    process.exit(allPass ? 0 : 1);
  } catch (err) {
    console.error('测试异常:', err);
    edge.kill();
    process.exit(1);
  }
}

testClozeFeatures();
