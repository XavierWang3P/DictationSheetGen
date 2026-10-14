import { spawn } from 'child_process';

async function testPopconfirmI18n() {
  console.log('=== 开始验证 Naive UI 提示框按钮完全中文化 ===\n');

  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9260',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${process.env.TEMP}\\DictationSheetGenEdge-${process.pid}`,
    '--window-size=1600,1400',
    'file:///d:/DictationSheetGen/dist/index.html'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const res = await fetch('http://127.0.0.1:9260/json');
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

    // 1. 测试清空试卷确认框
    console.log('【验证 1】检查“清空试卷”提示框按钮文本:');
    const r1 = await evalExpr(`(async () => {
      const btn = document.getElementById('btnClearWords');
      btn.click();
      await new Promise(r => setTimeout(r, 250));

      const popAction = document.querySelector('.n-popconfirm__action');
      const btns = popAction ? Array.from(popAction.querySelectorAll('button')).map(b => b.textContent.trim()) : [];
      return {
        hasPopAction: !!popAction,
        buttons: btns
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r1, null, 2));
    const pass1 = r1.buttons.includes('取消') && (r1.buttons.includes('确定') || r1.buttons.includes('确认'));
    console.log('-> 判定:', pass1 ? '✅ PASS' : '❌ FAIL', '\n');

    // 2. 测试顶部“恢复默认”确认框
    console.log('【验证 2】检查顶部工具栏“恢复默认”提示框按钮文本:');
    const r2 = await evalExpr(`(async () => {
      // 点击遮罩或页面关闭前一个
      document.body.click();
      await new Promise(r => setTimeout(r, 100));

      const btn = document.getElementById('btnResetDefaults');
      btn.click();
      await new Promise(r => setTimeout(r, 250));

      const popAction = document.querySelector('.n-popconfirm__action');
      const btns = popAction ? Array.from(popAction.querySelectorAll('button')).map(b => b.textContent.trim()) : [];
      return {
        hasPopAction: !!popAction,
        buttons: btns
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r2, null, 2));
    const pass2 = r2.buttons.includes('取消') && (r2.buttons.includes('确定') || r2.buttons.includes('确认'));
    console.log('-> 判定:', pass2 ? '✅ PASS' : '❌ FAIL', '\n');

    const allPass = pass1 && pass2;
    console.log('==================================================');
    console.log(allPass ? '🎉 提示框按钮完全中文化验证通过 (Cancel/Confirm -> 取消/确定)!' : '❌ 验证未通过');
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

testPopconfirmI18n();
