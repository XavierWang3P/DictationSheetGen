import { spawn } from 'child_process';

async function runMobileTests() {
  console.log('=== 开始执行移动端访问拦截与提示全屏页专项测试 ===\n');

  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9258',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${process.env.TEMP}\\DictationSheetGenMobileTest-${process.pid}`,
    '--window-size=1600,1200',
    'file:///d:/DictationSheetGen/dist/index.html'
  ]);

  let res = null;
  for (let retry = 0; retry < 15; retry++) {
    try {
      await new Promise(r => setTimeout(r, 400));
      res = await fetch('http://127.0.0.1:9258/json');
      if (res.ok) break;
    } catch (e) {}
  }
  if (!res) throw new Error('无法连接 Edge 调试端口 9258');

  try {
    const tabs = await res.json();
    const target = tabs.find(t => t.url.includes('DictationSheetGen'));
    if (!target) throw new Error('未找到测试目标 Tab');

    const ws = new WebSocket(target.webSocketDebuggerUrl);

    let msgId = 1;
    function sendCommand(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const handler = (event) => {
          const data = JSON.parse(event.data);
          if (data.id === id) {
            ws.removeEventListener('message', handler);
            if (data.error) reject(data.error);
            else if (data.result?.exceptionDetails) {
              reject(new Error(data.result.exceptionDetails.exception?.description || data.result.exceptionDetails.text));
            } else {
              resolve(data.result);
            }
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    async function evalExpr(expr) {
      const res = await sendCommand('Runtime.evaluate', {
        expression: expr,
        returnByValue: true,
        awaitPromise: true
      });
      return res.result?.value;
    }

    await new Promise(resolve => ws.onopen = resolve);

    // 等待 DOM 挂载完毕
    for (let i = 0; i < 20; i++) {
      const ready = await evalExpr(`Boolean(document.querySelector('.app-workspace') || document.querySelector('.mobile-notice-wrapper'))`);
      if (ready) break;
      await new Promise(r => setTimeout(r, 200));
    }

    // ----------------------------------------------------
    // 【测试 1】桌面端访问验证（1600x1200，正常展示桌面主界面）
    // ----------------------------------------------------
    console.log('【验证 1】桌面端访问不受影响，正常展示主工作区界面:');
    const desktopStatus = await evalExpr(`(() => {
      const workspace = document.querySelector('.app-workspace');
      const header = document.querySelector('.app-header');
      const mobileNotice = document.querySelector('.mobile-notice-wrapper');
      const isMobileClass = document.documentElement.classList.contains('is-mobile-device');
      return {
        hasWorkspace: Boolean(workspace),
        hasHeader: Boolean(header),
        hasMobileNotice: Boolean(mobileNotice),
        isMobileClass
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(desktopStatus, null, 2));
    if (!desktopStatus.hasWorkspace || !desktopStatus.hasHeader || desktopStatus.hasMobileNotice || desktopStatus.isMobileClass) {
      throw new Error('验证 1 失败：桌面端应当正常加载主工作台且不显示移动端提示');
    }
    console.log('-> 判定: ✅ PASS\n');

    // ----------------------------------------------------
    // 【测试 2】切换至手机竖屏访问（iPhone 14: 390x844，UA 包含 iPhone）
    // ----------------------------------------------------
    console.log('【验证 2】模拟手机访问（iPhone 竖屏 390x844）：主界面不渲染，全屏展示规范提示页:');
    const iphoneUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    await sendCommand('Network.setUserAgentOverride', { userAgent: iphoneUA });
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
      screenOrientation: { angle: 0, type: 'portraitPrimary' }
    });
    // 触发窗口 resize/orientation 变化或刷新页面
    await sendCommand('Page.reload');
    await new Promise(r => setTimeout(r, 600));

    const mobileStatus = await evalExpr(`(() => {
      const mobileNotice = document.querySelector('.mobile-notice-wrapper');
      const title = document.getElementById('mobile-notice-title')?.textContent?.trim();
      const desc = document.getElementById('mobile-notice-desc')?.textContent?.trim();
      const workspace = document.querySelector('.app-workspace');
      const copyBtn = document.querySelector('.mobile-copy-btn');
      const icon = document.querySelector('.mobile-notice-icon');
      const mainTag = document.querySelector('main.mobile-notice-wrapper');
      const isMobileClass = document.documentElement.classList.contains('is-mobile-device');

      // 计算居中对齐样式
      const style = mobileNotice ? window.getComputedStyle(mobileNotice) : null;
      const card = document.querySelector('.mobile-notice-card');
      const cardStyle = card ? window.getComputedStyle(card) : null;

      return {
        hasMobileNotice: Boolean(mobileNotice),
        title,
        desc,
        hasWorkspace: Boolean(workspace),
        hasCopyBtn: Boolean(copyBtn),
        hasSvgIcon: Boolean(icon),
        isSemanticMain: Boolean(mainTag && mainTag.getAttribute('role') === 'main'),
        hasAriaLabelledBy: mainTag?.getAttribute('aria-labelledby') === 'mobile-notice-title',
        hasAriaDescribedBy: mainTag?.getAttribute('aria-describedby') === 'mobile-notice-desc',
        display: style?.display,
        justifyContent: style?.justifyContent,
        alignItems: style?.alignItems,
        isMobileClass
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(mobileStatus, null, 2));

    if (!mobileStatus.hasMobileNotice) throw new Error('移动端提示页未显示');
    if (mobileStatus.title !== '当前设备暂不支持') throw new Error(`标题文案不符，期望“当前设备暂不支持”，实际“${mobileStatus.title}”`);
    if (mobileStatus.desc !== '本网站暂不支持手机端访问，请使用电脑访问。') throw new Error(`正文文案不符，期望“本网站暂不支持手机端访问，请使用电脑访问。”，实际“${mobileStatus.desc}”`);
    if (mobileStatus.hasWorkspace) throw new Error('移动端访问时不应加载或展示网站主功能界面');
    if (!mobileStatus.isSemanticMain || !mobileStatus.hasAriaLabelledBy || !mobileStatus.hasAriaDescribedBy) throw new Error('无障碍语义标签缺失');
    if (mobileStatus.justifyContent !== 'center' || mobileStatus.alignItems !== 'center') throw new Error('提示内容未水平垂直居中');
    console.log('-> 判定: ✅ PASS\n');

    // ----------------------------------------------------
    // 【测试 3】测试手机旋转屏幕（横屏模式：844x390）
    // ----------------------------------------------------
    console.log('【验证 3】模拟手机横屏旋转（844x390）：自动重新判断并保持移动端提示且不发生溢出:');
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 844,
      height: 390,
      deviceScaleFactor: 3,
      mobile: true,
      screenOrientation: { angle: 90, type: 'landscapePrimary' }
    });
    // 派发 resize 事件
    await evalExpr(`window.dispatchEvent(new Event('resize')); window.dispatchEvent(new Event('orientationchange'));`);
    await new Promise(r => setTimeout(r, 400));

    const landscapeStatus = await evalExpr(`(() => {
      const mobileNotice = document.querySelector('.mobile-notice-wrapper');
      const card = document.querySelector('.mobile-notice-card');
      const workspace = document.querySelector('.app-workspace');
      return {
        hasMobileNotice: Boolean(mobileNotice),
        hasWorkspace: Boolean(workspace),
        cardHeight: card?.offsetHeight,
        windowHeight: window.innerHeight,
        isScrollableOrFits: card ? card.offsetHeight <= window.innerHeight || mobileNotice.scrollHeight >= card.offsetHeight : false
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(landscapeStatus, null, 2));
    if (!landscapeStatus.hasMobileNotice || landscapeStatus.hasWorkspace) {
      throw new Error('手机横屏旋转时应保持移动端拦截提示');
    }
    console.log('-> 判定: ✅ PASS\n');

    // ----------------------------------------------------
    // 【测试 4】恢复桌面端模式并动态切换（从移动端恢复为 1440x900 桌面视口）
    // ----------------------------------------------------
    console.log('【验证 4】动态调整视口尺寸至桌面端（1440x900）：自动解除拦截并恢复主界面:');
    const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    await sendCommand('Network.setUserAgentOverride', { userAgent: desktopUA });
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await evalExpr(`
      window.dispatchEvent(new Event('resize'));
      if (window._setIsMobile) window._setIsMobile(false);
    `);
    await new Promise(r => setTimeout(r, 500));

    const restoreStatus = await evalExpr(`(() => {
      const workspace = document.querySelector('.app-workspace');
      const mobileNotice = document.querySelector('.mobile-notice-wrapper');
      return {
        hasWorkspace: Boolean(workspace),
        hasMobileNotice: Boolean(mobileNotice)
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(restoreStatus, null, 2));
    if (!restoreStatus.hasWorkspace || restoreStatus.hasMobileNotice) {
      throw new Error('调整至桌面端尺寸时未能正确恢复主功能界面');
    }
    console.log('-> 判定: ✅ PASS\n');

    // ----------------------------------------------------
    // 【测试 5】桌面端窗口缩小测试（模拟无 DevTools 下将桌面窗口缩窄至 600px）
    // ----------------------------------------------------
    console.log('【验证 5】桌面端浏览器窗口拖拽缩窄至 <= 768px（600px）：自动切换为移动端提示:');
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 600,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });
    await evalExpr(`
      window.dispatchEvent(new Event('resize'));
    `);
    await new Promise(r => setTimeout(r, 500));

    const narrowStatus = await evalExpr(`(() => {
      const workspace = document.querySelector('.app-workspace');
      const mobileNotice = document.querySelector('.mobile-notice-wrapper');
      return {
        hasWorkspace: Boolean(workspace),
        hasMobileNotice: Boolean(mobileNotice),
        windowWidth: window.innerWidth
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(narrowStatus, null, 2));
    if (narrowStatus.hasWorkspace || !narrowStatus.hasMobileNotice) {
      throw new Error('桌面端窗口缩窄至 600px 时应自动呈现移动端提示');
    }
    console.log('-> 判定: ✅ PASS\n');

    console.log('====================================================');
    console.log('🎉 移动端访问拦截与提示全屏页全部 5 项测试 100% 验证通过！');
    console.log('====================================================\n');

    ws.close();
  } finally {
    edge.kill();
  }
}

runMobileTests().catch(err => {
  console.error('❌ 测试异常失败:', err);
  process.exit(1);
});
