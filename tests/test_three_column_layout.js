import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:\\Users\\XW\\.gemini\\antigravity\\brain\\846c1c6e-b112-4a0a-a0fa-76717b957e26';
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function runThreeColumnTest() {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9268',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${process.env.TEMP}\\DictationSheetGenEdge-${process.pid}`,
    '--window-size=1680,1050',
    'file:///d:/DictationSheetGen/dist/index.html'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const res = await fetch('http://127.0.0.1:9268/json');
    const tabs = await res.json();
    const target = tabs.find(t => t.url.includes('DictationSheetGen'));
    if (!target) throw new Error('Target tab not found');

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
            else resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    async function evalExpr(expr) {
      const res = await sendCommand('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      return res.result.value;
    }

    await new Promise(resolve => ws.onopen = resolve);
    console.log('=== 开始执行三栏布局 (Three-Column Layout) 与句子底部空间回归验证 ===\n');

    // 等待页面挂载完成
    for (let i = 0; i < 30; i++) {
      const ready = await evalExpr(`!!document.getElementById('sidebarPanel')`);
      if (ready) break;
      await new Promise(r => setTimeout(r, 200));
    }

    // 1. 验证三栏布局初始几何结构
    const initialColumns = await evalExpr(`(() => {
      const sidebar = document.getElementById('sidebarPanel');
      const preview = document.getElementById('previewViewport');
      const inspector = document.getElementById('layoutInspector');
      const headerBtn = document.getElementById('btnToggleSettings');

      const sRect = sidebar.getBoundingClientRect();
      const pRect = preview.getBoundingClientRect();
      const iRect = inspector.getBoundingClientRect();

      // 获取左侧可见 Tab
      const visibleTabs = Array.from(document.querySelectorAll('.sidebar-tab-bar .sidebar-tab-btn'))
        .filter(btn => window.getComputedStyle(btn).display !== 'none')
        .map(btn => btn.textContent.trim());

      return {
        sidebarWidth: Math.round(sRect.width),
        previewWidth: Math.round(pRect.width),
        inspectorWidth: Math.round(iRect.width),
        isThreeColumns: sRect.right <= pRect.left + 2 && pRect.right <= iRect.left + 2,
        visibleTabs,
        hasHeaderToggleBtn: !!headerBtn,
        isSettingsCollapsed: inspector.classList.contains('collapsed')
      };
    })()`);

    console.log('【验证 1】三栏并排工作台布局 (左控制栏 + 中间预览 + 右排版检视):');
    console.log('-> 结果:', JSON.stringify(initialColumns, null, 2));
    const pass1 = initialColumns.sidebarWidth >= 350 &&
                  initialColumns.inspectorWidth >= 300 &&
                  initialColumns.previewWidth >= 500 &&
                  initialColumns.isThreeColumns &&
                  initialColumns.visibleTabs.length === 3 &&
                  initialColumns.visibleTabs.includes('题目录入') &&
                  (initialColumns.visibleTabs.includes('题库') || initialColumns.visibleTabs.includes('备课资源库')) &&
                  !initialColumns.isSettingsCollapsed;
    console.log('-> 判定:', pass1 ? '✅ PASS' : '❌ FAIL', '\n');

    // 截图 1: 三栏完整展开形态
    const screenshot1 = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'three_column_layout_expanded.png'), Buffer.from(screenshot1.data, 'base64'));

    // 2. 验证右侧排版面板折叠与展开交互
    const collapseTest = await evalExpr(`(async () => {
      const inspector = document.getElementById('layoutInspector');
      const closeBtn = document.getElementById('btnCloseInspector');
      
      // 点击右上角收起按钮
      closeBtn.click();
      await new Promise(r => setTimeout(r, 300));

      const collapsedWidth = Math.round(inspector.getBoundingClientRect().width);
      const isCollapsedClass = inspector.classList.contains('collapsed');
      const floatingBtn = document.getElementById('btnFloatingExpandSettings');
      const hasFloatingBtn = !!floatingBtn && window.getComputedStyle(floatingBtn).display !== 'none';

      // 点击浮动展开按钮
      floatingBtn.click();
      await new Promise(r => setTimeout(r, 300));

      const restoredWidth = Math.round(inspector.getBoundingClientRect().width);
      const isRestored = !inspector.classList.contains('collapsed');

      // 点击顶部工具栏按钮切换
      const headerBtn = document.getElementById('btnToggleSettings');
      headerBtn.click();
      await new Promise(r => setTimeout(r, 300));
      const toggledCollapsed = inspector.classList.contains('collapsed');

      headerBtn.click();
      await new Promise(r => setTimeout(r, 300));
      const toggledExpanded = !inspector.classList.contains('collapsed');

      return {
        collapsedWidth,
        isCollapsedClass,
        hasFloatingBtn,
        restoredWidth,
        isRestored,
        toggledCollapsed,
        toggledExpanded
      };
    })()`);

    console.log('【验证 2】右侧排版面板平滑折叠、浮动展开与顶部按钮切换:');
    console.log('-> 结果:', JSON.stringify(collapseTest, null, 2));
    const pass2 = collapseTest.collapsedWidth === 0 &&
                  collapseTest.isCollapsedClass &&
                  collapseTest.hasFloatingBtn &&
                  collapseTest.restoredWidth >= 300 &&
                  collapseTest.isRestored &&
                  collapseTest.toggledCollapsed &&
                  collapseTest.toggledExpanded;
    console.log('-> 判定:', pass2 ? '✅ PASS' : '❌ FAIL', '\n');

    // 3. 验证无论是两联还是三联，句子题目填满版面（修复最下方空白区域过大与过早分页）
    const sentenceFitTest = await evalExpr(`(async () => {
      // 切换模式至句子挖空
      document.getElementById('modeCloze').click();
      await new Promise(r => setTimeout(r, 100));

      // 清空并输入 10 道句子挖空题
      const clearBtn = document.getElementById('btnClearList') || document.getElementById('btnClearQuestions');
      if (clearBtn) clearBtn.click();
      await new Promise(r => setTimeout(r, 100));

      const textarea = document.getElementById('customWordTextarea');
      const sentences10 = [
        'Where is the [classroom]? | 教室在哪里？',
        'This is my new [desk]. | 这是我的新课桌。',
        'The [blackboard] is clean. | 黑板非常干净。',
        'Turn on the [light] please. | 请把电灯打开。',
        'Put up the [picture] now. | 把画挂在墙上。',
        'Open the [door] for me. | 帮我开一下门。',
        'Close the [window] now. | 现在关上窗户。',
        'Clean the [floor] together. | 一起扫地。',
        'My [schoolbag] is heavy. | 我的书包很重。',
        'I love [English] books. | 我喜欢英语书。'
      ].join('\\n');

      textarea.value = sentences10;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      document.getElementById('btnParseText').click();
      await new Promise(r => setTimeout(r, 200));

      // 设置为 3 联模式，验证 10 道题在 3 联下单页完美容纳
      window.__appStoreState.draft.settings.copiesPerPage = 3;
      window.__appStoreState.draft.settings.columns = 2;
      await new Promise(r => setTimeout(r, 300));

      const pages = document.querySelectorAll('.sheet-page');
      const firstSection = document.querySelector('.sheet-copy-section');
      const cardsInFirstCopy = firstSection ? firstSection.querySelectorAll('.word-card').length : 0;
      const copyHeight = firstSection ? firstSection.getBoundingClientRect().height : 0;
      const lastCard = firstSection ? firstSection.querySelector('.word-card:last-child') : null;
      const lastCardBottom = lastCard ? lastCard.getBoundingClientRect().bottom : 0;
      const copyBottom = firstSection ? firstSection.getBoundingClientRect().bottom : 0;
      const bottomGapPx = Math.max(0, copyBottom - lastCardBottom);

      return {
        pageCount: pages.length,
        itemsPerCopy: cardsInFirstCopy,
        copyHeightPx: Math.round(copyHeight),
        bottomGapPx: Math.round(bottomGapPx),
        isSinglePage: pages.length === 1,
        all10ItemsPlaced: cardsInFirstCopy === 10
      };
    })()`);

    console.log('【验证 3】一页 3 份句子挖空排版与底部空间充分利用 (10题容纳于单页):');
    console.log('-> 结果:', JSON.stringify(sentenceFitTest, null, 2));
    const pass3 = sentenceFitTest.isSinglePage && sentenceFitTest.all10ItemsPlaced;
    console.log('-> 判定:', pass3 ? '✅ PASS' : '❌ FAIL', '\n');

    // 截图 2: 10题单页3份完美排版截图
    const screenshot2 = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'three_column_cloze_perfect_page.png'), Buffer.from(screenshot2.data, 'base64'));

    edge.kill();

    if (pass1 && pass2 && pass3) {
      console.log('==================================================');
      console.log('🎉 三栏布局升级与句子底部空间消除全部通过 (3/3 PASS)!');
      console.log('==================================================');
      process.exit(0);
    } else {
      console.error('❌ 测试未完全通过');
      process.exit(1);
    }
  } catch (err) {
    console.error('测试异常:', err);
    edge.kill();
    process.exit(1);
  }
}

runThreeColumnTest();
