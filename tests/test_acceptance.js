import { spawn } from 'child_process';

async function runTests() {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9250',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${process.env.TEMP}\\DictationSheetGenEdge-${process.pid}`,
    '--window-size=1600,1400',
    'file:///d:/DictationSheetGen/dist/index.html'
  ]);

  let res = null;
  for (let retry = 0; retry < 10; retry++) {
    try {
      await new Promise(r => setTimeout(r, 400));
      res = await fetch('http://127.0.0.1:9250/json');
      if (res.ok) break;
    } catch (e) {}
  }
  if (!res) throw new Error('无法连接 Edge 调试端口 9250');

  try {
    const tabs = await res.json();
    const target = tabs.find(t => t.url.includes('DictationSheetGen'));
    if (!target) throw new Error('Target tab not found');

    const ws = new WebSocket(target.webSocketDebuggerUrl);

    let msgId = 1;
    function evalExpr(expr) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const handler = (event) => {
          const data = JSON.parse(event.data);
          if (data.id === id) {
            ws.removeEventListener('message', handler);
            if (data.error) reject(data.error);
            else if (data.result?.exceptionDetails) reject(new Error(data.result.exceptionDetails.exception?.description || data.result.exceptionDetails.text));
            else resolve(data.result.result.value);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({
          id,
          method: 'Runtime.evaluate',
          params: { expression: expr, returnByValue: true, awaitPromise: true }
        }));
      });
    }

    await new Promise(resolve => ws.onopen = resolve);

    // 禁用原生弹窗
    await evalExpr(`window.alert = () => {}; window.confirm = () => true;`);

    console.log('=== 开始执行自动化测试套件 ===\n');

    // 等待 DOM 挂载就绪
    let isReady = false;
    for (let i = 0; i < 100; i++) {
      isReady = await evalExpr(`!!document.getElementById('btnLoadDefaultSample') && !!window.state`).catch(() => false);
      if (isReady) break;
      await new Promise(r => setTimeout(r, 100));
    }
    if (!isReady) throw new Error('页面挂载超时，未找到 btnLoadDefaultSample 或 window.state');

    // 清理可能污染的本地存储，确保以纯净默认设置开始
    await evalExpr(`localStorage.clear(); if (window.state) { window.state.settings = {}; }`);

    // 载入默认9词以供排版参数验收
    await evalExpr(`document.getElementById('btnLoadDefaultSample').click();`);
    await new Promise(r => setTimeout(r, 150));

    // 验收 1: 默认参数与初始状态验证 (用户指定参数对象)
    const r1 = await evalExpr(`(() => {
      const s = state.settings;
      const pages = document.querySelectorAll('.sheet-page');
      const items = document.querySelectorAll('.word-entry-item');
      const firstTitle = document.querySelector('.sheet-title-text');
      const firstPrompt = document.querySelector('.meaning.word-prompt-row');

      return {
        paperSize: s.paperSize,
        orientation: s.orientation,
        splitFold: s.splitFold,
        copiesPerPage: s.copiesPerPage,
        pageMargin: s.pageMargin,
        dividerStyle: s.dividerStyle,
        showCutGuide: s.showCutGuide,
        title: s.title,
        titleFontSize: s.titleFontSize,
        titleAlign: s.titleAlign,
        columns: s.columns,
        wordsPerPage: s.wordsPerPage,
        promptFontSize: s.promptFontSize,
        letterSpacing: s.letterSpacing,
        gridHeight: s.gridHeight,
        gridStroke: s.gridStroke,
        gridColor: s.gridColor,
        showVerticalBorder: s.showVerticalBorder,
        dictMode: s.dictMode,
        totalPages: pages.length,
        totalItems: items.length,
        titleStyleFontSize: firstTitle ? firstTitle.style.fontSize : '',
        promptStyleFontSize: firstPrompt ? firstPrompt.style.fontSize : ''
      };
    })()`);
    console.log('【验收 1】默认参数对象精确匹配:');
    console.log('-> 结果:', JSON.stringify(r1, null, 2));
    const pass1 = (
      r1.paperSize === 'A4' &&
      r1.orientation === 'portrait' &&
      r1.splitFold === false &&
      r1.copiesPerPage === 3 &&
      r1.pageMargin === 8 &&
      r1.dividerStyle === 'dashed' &&
      r1.showCutGuide === false &&
      r1.title === 'Unit 1 黑体词默写' &&
      r1.titleFontSize === '18pt' &&
      r1.titleAlign === 'center' &&
      r1.columns === 3 &&
      r1.wordsPerPage === 9 &&
      r1.promptFontSize === 14 &&
      r1.letterSpacing === '0.8px' &&
      r1.gridHeight === 12 &&
      r1.gridStroke === 0.85 &&
      r1.gridColor === '#cbd5e1' &&
      r1.showVerticalBorder === true &&
      r1.dictMode === 'writing' &&
      r1.totalPages === 1 &&
      r1.totalItems === 27 &&
      r1.titleStyleFontSize === '18pt' &&
      r1.promptStyleFontSize === '14pt'
    );
    console.log('-> 判定:', pass1 ? '✅ PASS' : '❌ FAIL', '\n');

    // 验收 2: 标题字号固定为18pt且移除调节滑块、教师答案版开关与提示字号滑动调整
    const r2 = await evalExpr(`(async () => {
      const waitForRender = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const cutGuide = document.getElementById('checkShowCutGuide');
      const titleAlign = document.querySelector('input[name="titleAlign"]');
      const gridLines = document.querySelector('input[name="gridLinesPerWord"]');
      const answerPage = document.getElementById('checkShowAnswerPage');
      const dictMode = document.getElementById('modeDictation');
      const dividerStyle = document.querySelector('input[name="dividerStyle"]');
      const titleRadios = document.querySelectorAll('input[type="radio"][name="titleFontSize"]');
      const titleSlider = document.getElementById('inputTitleFontSize');
      const promptSlider = document.getElementById('inputPromptFontSize');

      // 测试滑动调整提示字号
      let promptSliderTested = false;
      if (promptSlider) {
        promptSlider.value = 16;
        promptSlider.dispatchEvent(new Event('input'));
        await waitForRender();
        const afterPrompt = document.querySelector('.meaning.word-prompt-row');
        promptSliderTested = (afterPrompt && afterPrompt.style.fontSize === '16pt');
        // 恢复 14pt
        promptSlider.value = 14;
        promptSlider.dispatchEvent(new Event('input'));
        await waitForRender();
      }

      return {
        hasCutGuideSwitch: !!cutGuide,
        hasTitleAlignSwitch: !!titleAlign,
        hasGridLinesSwitch: !!gridLines,
        hasAnswerPageSwitch: !!answerPage,
        answerPageDefaultOff: !!answerPage && !answerPage.checked,
        hasDictModeSwitch: !!dictMode,
        hasDividerStyleSwitch: !!dividerStyle,
        hasTitleRadios: titleRadios.length > 0,
        hasTitleSlider: !!titleSlider,
        promptSliderTested
      };
    })()`);
    console.log('【验收 2】标题字号滑块移除、教师答案版开关与字号交互验证:');
    console.log('-> 结果:', JSON.stringify(r2, null, 2));
    const pass2 = (
      !r2.hasCutGuideSwitch &&
      !r2.hasTitleAlignSwitch &&
      !r2.hasGridLinesSwitch &&
      r2.hasAnswerPageSwitch &&
      r2.answerPageDefaultOff &&
      !r2.hasDictModeSwitch &&
      !r2.hasDividerStyleSwitch &&
      !r2.hasTitleRadios &&
      !r2.hasTitleSlider &&
      r2.promptSliderTested
    );
    console.log('-> 判定:', pass2 ? '✅ PASS' : '❌ FAIL', '\n');

    // 验收 3: 排版设置三大扁平化分组（纸张与版面、字体与间距、按题型列数配置）与挖空预览模块删除验证
    const r3 = await evalExpr(`(async () => {
      const gPage = document.getElementById('groupPageSettings');
      const gTypo = document.getElementById('groupTypography');
      const gCol = document.getElementById('groupQuestionColumns');
      const clozePreview = document.querySelector('.cloze-blank-preview, .cloze-preview-box, #clozePreview');

      const isPageBeforeTypo = !!(gPage && gTypo && (gPage.compareDocumentPosition(gTypo) & Node.DOCUMENT_POSITION_FOLLOWING));
      const isTypoBeforeCol = !!(gTypo && gCol && (gTypo.compareDocumentPosition(gCol) & Node.DOCUMENT_POSITION_FOLLOWING));

      return {
        hasGroupPage: !!gPage,
        hasGroupTypo: !!gTypo,
        hasGroupCol: !!gCol,
        isPageBeforeTypo,
        isTypoBeforeCol,
        hasClozePreview: !!clozePreview
      };
    })()`);
    console.log('【验收 3】三大扁平化一级分组结构与挖空预览模块移除验证:');
    console.log('-> 结果:', JSON.stringify(r3, null, 2));
    const pass3 = (
      r3.hasGroupPage &&
      r3.hasGroupTypo &&
      r3.hasGroupCol &&
      r3.isPageBeforeTypo &&
      r3.isTypoBeforeCol &&
      !r3.hasClozePreview
    );
    console.log('-> 判定:', pass3 ? '✅ PASS' : '❌ FAIL', '\n');

    // 验收 4: 纸张规格智能横竖向默认值与横向对半折拼版
    const r4 = await evalExpr(`(async () => {
      const waitForRender = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const initialPage = document.querySelector('.sheet-page');
      const initialStyleWidth = initialPage.style.width;
      const initialStyleHeight = initialPage.style.height;

      // 切换到 B4 -> 智能切换为横向 (364mm x 257mm)
      document.getElementById('sizeB4').click();
      await waitForRender();
      const b4Page = document.querySelector('.sheet-page');
      const b4StyleWidth = b4Page.style.width;
      const b4StyleHeight = b4Page.style.height;
      const b4Orient = state.settings.orientation;

      // 切换到 8K -> 智能切换为横向 (370mm x 260mm)
      document.getElementById('size8K').click();
      await waitForRender();
      const k8Page = document.querySelector('.sheet-page');
      const k8StyleWidth = k8Page.style.width;
      const k8StyleHeight = k8Page.style.height;
      const k8Orient = state.settings.orientation;

      // 切换到 A3 -> 智能切换为横向 (420mm x 297mm) 并测试对半折
      document.getElementById('sizeA3').click();
      await waitForRender();
      const a3Page = document.querySelector('.sheet-page');
      const a3StyleWidth = a3Page.style.width;
      const a3StyleHeight = a3Page.style.height;
      const a3Orient = state.settings.orientation;

      // 切换对半折
      const foldSplitBtn = document.getElementById('foldSplit');
      if (foldSplitBtn) {
        foldSplitBtn.click();
        await waitForRender();
      }
      const isSplitFoldActive = state.settings.splitFold;
      const hasSplitContainer = !!document.querySelector('.sheet-page.is-split-fold, .split-fold-container');

      // 切回 A4 -> 智能恢复为纵向 (210mm x 297mm)
      document.getElementById('sizeA4').click();
      await waitForRender();
      const a4Page = document.querySelector('.sheet-page');
      const a4StyleWidth = a4Page.style.width;
      const a4StyleHeight = a4Page.style.height;
      const a4Orient = state.settings.orientation;

      return {
        initialA4: { width: initialStyleWidth, height: initialStyleHeight },
        b4: { width: b4StyleWidth, height: b4StyleHeight, orient: b4Orient },
        k8: { width: k8StyleWidth, height: k8StyleHeight, orient: k8Orient },
        a3: { width: a3StyleWidth, height: a3StyleHeight, orient: a3Orient },
        isSplitFoldActive,
        hasSplitContainer,
        restoredA4: { width: a4StyleWidth, height: a4StyleHeight, orient: a4Orient }
      };
    })()`);
    console.log('【验收 4】纸张规格智能横竖向默认值与横向对半折拼版:');
    console.log('-> 结果:', JSON.stringify(r4, null, 2));
    const pass4 = (
      r4.initialA4.width === '210mm' && r4.initialA4.height === '297mm' &&
      r4.b4.width === '364mm' && r4.b4.height === '257mm' && r4.b4.orient === 'landscape' &&
      r4.k8.width === '370mm' && r4.k8.height === '260mm' && r4.k8.orient === 'landscape' &&
      r4.a3.width === '420mm' && r4.a3.height === '297mm' && r4.a3.orient === 'landscape' &&
      r4.isSplitFoldActive === true &&
      r4.hasSplitContainer &&
      r4.restoredA4.width === '210mm' && r4.restoredA4.height === '297mm' && r4.restoredA4.orient === 'portrait'
    );
    console.log('-> 判定:', pass4 ? '✅ PASS' : '❌ FAIL', '\n');

    // 验收 5: 智能多格式词汇录入与多页排版
    const r5 = await evalExpr(`(async () => {
      const state = window.__appStoreState;
      if (state) state.draft.items = [];
      const textarea = document.getElementById('customWordTextarea');
      textarea.value = "apple 苹果\\nbanana /bəˈnɑːnə/ 香蕉\\nclassroom 教室";
      document.getElementById('btnParseText').click();
      await new Promise(r => setTimeout(r, 60));

      const chips = document.querySelectorAll('.word-chip');
      const allCards = document.querySelectorAll('.word-entry-item');
      const pages = document.querySelectorAll('.sheet-page');

      return {
        chipCount: chips.length,
        chip1En: chips[0]?.querySelector('.word-chip-en')?.textContent,
        chip2En: chips[1]?.querySelector('.word-chip-en')?.textContent,
        totalItemsInPage: allCards.length,
        totalPages: pages.length
      };
    })()`);
    console.log('【验收 5】智能文本解析与多格式支持:');
    console.log('-> 结果:', JSON.stringify(r5, null, 2));
    const pass5 = (
      r5.chipCount === 3 &&
      r5.chip1En === 'apple' &&
      r5.chip2En === 'banana' &&
      r5.totalItemsInPage === 9 // 3份 x 3词 = 9
    );
    console.log('-> 判定:', pass5 ? '✅ PASS' : '❌ FAIL', '\n');

    // 验收 6: 恢复默认并检查无页脚、无分联徽标、独立四线格与规范虚线裁剪分割线
    const r6 = await evalExpr(`(() => {
      document.getElementById('btnLoadDefaultSample').click();
      const copyBadges = document.querySelectorAll('.sheet-copy-badge');
      const footers = document.querySelectorAll('.sheet-footer');
      const svgLine = document.querySelector('.four-line-svg line');
      const verticalLines = document.querySelectorAll('.four-line-svg line[x1="0"][x2="0"]');
      const dashedDividers = document.querySelectorAll('.section-cut-divider.dashed');

      return {
        copyBadgeCount: copyBadges.length,
        footerCount: footers.length,
        hasSvgLines: !!svgLine,
        verticalBorderCount: verticalLines.length,
        dashedDividerCount: dashedDividers.length
      };
    })()`);
    console.log('【验收 6】无页脚、无徽标、独立封闭四线三格与自动虚线裁剪分隔线:');
    console.log('-> 结果:', JSON.stringify(r6, null, 2));
    const pass6 = (
      r6.copyBadgeCount === 0 &&
      r6.footerCount === 0 &&
      r6.hasSvgLines &&
      r6.verticalBorderCount > 0 &&
      r6.dashedDividerCount === 2
    );
    console.log('-> 判定:', pass6 ? '✅ PASS' : '❌ FAIL', '\n');

    // 验收 7: 考生信息大幅调宽、题号不加粗、句子中间挖空填写模式全功能验证
    const r7 = await evalExpr(`(async () => {
      // 1. 验证考生信息填入区域大幅调宽
      const nameLine = document.querySelector('.compact-info .info-line-name');
      const classLine = document.querySelector('.compact-info .info-line-class');
      const noLine = document.querySelector('.compact-info .info-line-no');
      const nameWidth = nameLine ? parseInt(window.getComputedStyle(nameLine).minWidth, 10) : 0;
      const classWidth = classLine ? parseInt(window.getComputedStyle(classLine).minWidth, 10) : 0;
      const noWidth = noLine ? parseInt(window.getComputedStyle(noLine).minWidth, 10) : 0;

      // 2. 验证题号 entry-index 不加粗
      const wordNum = document.querySelector('.word-num.entry-index');
      const wordNumWeight = wordNum ? window.getComputedStyle(wordNum).fontWeight : '';
      const isWordNumNotBold = (wordNumWeight === '400' || wordNumWeight === 'normal');

      // 3. 切换至挖空填写模式并显式载入挖空示例 (避免无提示暴力自动覆盖)
      document.getElementById('modeCloze').click();
      document.getElementById('btnLoadDefaultSample').click();
      await new Promise(r => setTimeout(r, 60));
      const modeAfterClick = state.settings.dictMode;

      // 检查默认挖空示例第 1 项是否在句子中间挖空
      const firstCardPrompt = document.querySelector('.meaning.word-prompt-row');
      const hasBlankLineInMiddle = firstCardPrompt ? !!firstCardPrompt.querySelector('.cloze-blank-line') : false;
      const firstCardText = firstCardPrompt ? firstCardPrompt.textContent : '';
      const isMiddleBlank = firstCardText.includes('ask') && firstCardText.includes('for help');

      // 4. 测试自定义输入标记 [word] 中间挖空
      if (state) state.draft.items = [];
      const textarea = document.getElementById('customWordTextarea');
      textarea.value = "ask [your teacher] for help | 向你的老师求助\\nShe [likes] apples.";
      document.getElementById('btnParseText').click();
      await new Promise(r => setTimeout(r, 60));

      const customCards = document.querySelectorAll('.word-entry-item');
      const card1Html = customCards[0]?.querySelector('.meaning')?.innerHTML || '';
      const card2Html = customCards[1]?.querySelector('.meaning')?.innerHTML || '';

      const card1HasBlank = card1Html.includes('ask') && card1Html.includes('cloze-blank-line') && card1Html.includes('for help');
      const card2HasBlank = card2Html.includes('She') && card2Html.includes('cloze-blank-line') && card2Html.includes('apples');

      // 恢复模式为 writing
      document.getElementById('modeWriting').click();
      document.getElementById('btnLoadDefaultSample').click();
      await new Promise(r => setTimeout(r, 60));

      return {
        nameWidth,
        classWidth,
        noWidth,
        isWordNumNotBold,
        modeAfterClick,
        hasBlankLineInMiddle,
        isMiddleBlank,
        card1HasBlank,
        card2HasBlank
      };
    })()`);
    console.log('【验收 7】考生栏调宽、题号不加粗、句子中间挖空填写模式全功能:');
    console.log('-> 结果:', JSON.stringify(r7, null, 2));
    const pass7 = (
      r7.nameWidth >= 100 &&
      r7.classWidth >= 85 &&
      r7.noWidth >= 50 &&
      r7.isWordNumNotBold &&
      r7.modeAfterClick === 'cloze' &&
      r7.hasBlankLineInMiddle &&
      r7.isMiddleBlank &&
      r7.card1HasBlank &&
      r7.card2HasBlank
    );
    console.log('-> 判定:', pass7 ? '✅ PASS' : '❌ FAIL', '\n');

    console.log('=== 全部测试执行完毕 ===');
    const allPass = pass1 && pass2 && pass3 && pass4 && pass5 && pass6 && pass7;
    console.log('最终测试综述:', allPass ? '🎉 全部 7 大核心标准 100% 完美通过！' : '部分失败');

    try { spawn('taskkill', ['/pid', edge.pid, '/f', '/t']); } catch (e) {}
    edge.kill();
    process.exit(allPass ? 0 : 1);
  } catch (err) {
    console.error('测试异常:', err);
    try { spawn('taskkill', ['/pid', edge.pid, '/f', '/t']); } catch (e) {}
    edge.kill();
    process.exit(1);
  }
}

runTests();
