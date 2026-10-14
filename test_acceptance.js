import { spawn } from 'child_process';

async function runTests() {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9250',
    '--disable-gpu',
    '--window-size=1600,1400',
    'file:///d:/DictationSheetGen/dist/index.html'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const res = await fetch('http://127.0.0.1:9250/json');
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

    // 验收 2: 删除开关验证 (裁剪辅助线、标题对齐、每个单词练习行数、听写参考答案单、听写模式、份数分隔线、标题字号单选) & 滑动调整
    const r2 = await evalExpr(`(() => {
      const cutGuide = document.getElementById('checkShowCutGuide');
      const titleAlign = document.querySelector('input[name="titleAlign"]');
      const gridLines = document.querySelector('input[name="gridLinesPerWord"]');
      const answerPage = document.getElementById('checkShowAnswerPage');
      const dictMode = document.getElementById('modeDictation');
      const dividerStyle = document.querySelector('input[name="dividerStyle"]');
      const titleRadios = document.querySelectorAll('input[type="radio"][name="titleFontSize"]');
      const titleSlider = document.getElementById('inputTitleFontSize');
      const promptSlider = document.getElementById('inputPromptFontSize');

      // 测试滑动调整标题字号与提示字号
      let titleSliderTested = false;
      let promptSliderTested = false;
      if (titleSlider) {
        titleSlider.value = 22;
        titleSlider.dispatchEvent(new Event('input'));
        const afterTitle = document.querySelector('.sheet-title-text');
        titleSliderTested = (afterTitle && afterTitle.style.fontSize === '22pt');
        // 恢复 18pt
        titleSlider.value = 18;
        titleSlider.dispatchEvent(new Event('input'));
      }
      if (promptSlider) {
        promptSlider.value = 16;
        promptSlider.dispatchEvent(new Event('input'));
        const afterPrompt = document.querySelector('.meaning.word-prompt-row');
        promptSliderTested = (afterPrompt && afterPrompt.style.fontSize === '16pt');
        // 恢复 14pt
        promptSlider.value = 14;
        promptSlider.dispatchEvent(new Event('input'));
      }

      return {
        hasCutGuideSwitch: !!cutGuide,
        hasTitleAlignSwitch: !!titleAlign,
        hasGridLinesSwitch: !!gridLines,
        hasAnswerPageSwitch: !!answerPage,
        hasDictModeSwitch: !!dictMode,
        hasDividerStyleSwitch: !!dividerStyle,
        hasTitleRadios: titleRadios.length > 0,
        hasTitleSlider: !!titleSlider && titleSlider.type === 'range',
        titleSliderTested,
        promptSliderTested
      };
    })()`);
    console.log('【验收 2】指定冗余开关已彻底删除 & 滑动调节标题/提示字号交互验证:');
    console.log('-> 结果:', JSON.stringify(r2, null, 2));
    const pass2 = (
      !r2.hasCutGuideSwitch &&
      !r2.hasTitleAlignSwitch &&
      !r2.hasGridLinesSwitch &&
      !r2.hasAnswerPageSwitch &&
      !r2.hasDictModeSwitch &&
      !r2.hasDividerStyleSwitch &&
      !r2.hasTitleRadios &&
      r2.hasTitleSlider &&
      r2.titleSliderTested &&
      r2.promptSliderTested
    );
    console.log('-> 判定:', pass2 ? '✅ PASS' : '❌ FAIL', '\n');

    // 验收 3: 面板折叠与顺序验证 (页面设置默认折叠、标题上移至页面设置之前、其余高级面板默认折叠与交互展开)
    const r3 = await evalExpr(`(() => {
      const gTitle = document.getElementById('groupTitleInfo');
      const gPage = document.getElementById('groupPageSettings');
      const gWord = document.getElementById('groupWordArea');
      const gGrid = document.getElementById('groupGrid');
      const gTypo = document.getElementById('groupTypography');

      const isTitleBeforePage = !!(gTitle && gPage && (gTitle.compareDocumentPosition(gPage) & Node.DOCUMENT_POSITION_FOLLOWING));
      const isPageCollapsed = gPage ? gPage.classList.contains('collapsed') : false;
      const isWordCollapsed = gWord ? gWord.classList.contains('collapsed') : false;
      const isGridCollapsed = gGrid ? gGrid.classList.contains('collapsed') : false;
      const isTypoCollapsed = gTypo ? gTypo.classList.contains('collapsed') : false;

      // 测试页面设置点击头部展开与再次折叠
      gPage.querySelector('.group-header').click();
      const afterClickPage = gPage.classList.contains('collapsed');
      gPage.querySelector('.group-header').click(); // 恢复折叠
      const afterRestorePage = gPage.classList.contains('collapsed');

      // 测试单词区域点击头部展开与再次折叠
      gWord.querySelector('.group-header').click();
      const afterClickWord = gWord.classList.contains('collapsed');
      gWord.querySelector('.group-header').click(); // 恢复折叠
      const afterRestoreWord = gWord.classList.contains('collapsed');

      return {
        isTitleBeforePage,
        isPageCollapsed,
        isWordCollapsed,
        isGridCollapsed,
        isTypoCollapsed,
        pageExpandWorks: !afterClickPage && afterRestorePage,
        wordExpandWorks: !afterClickWord && afterRestoreWord
      };
    })()`);
    console.log('【验收 3】标题信息上移、页面设置及高级面板默认折叠与交互展开:');
    console.log('-> 结果:', JSON.stringify(r3, null, 2));
    const pass3 = (
      r3.isTitleBeforePage &&
      r3.isPageCollapsed &&
      r3.isWordCollapsed &&
      r3.isGridCollapsed &&
      r3.isTypoCollapsed &&
      r3.pageExpandWorks &&
      r3.wordExpandWorks
    );
    console.log('-> 判定:', pass3 ? '✅ PASS' : '❌ FAIL', '\n');

    // 验收 4: 纸张大小支持 A4 (默认)、B4、8K 及动态尺寸切换
    const r4 = await evalExpr(`(() => {
      const initialPage = document.querySelector('.sheet-page');
      const initialStyleWidth = initialPage.style.width;
      const initialStyleHeight = initialPage.style.height;

      // 切换到 B4
      document.getElementById('sizeB4').click();
      const b4Page = document.querySelector('.sheet-page');
      const b4StyleWidth = b4Page.style.width;
      const b4StyleHeight = b4Page.style.height;

      // 切换到 8K
      document.getElementById('size8K').click();
      const k8Page = document.querySelector('.sheet-page');
      const k8StyleWidth = k8Page.style.width;
      const k8StyleHeight = k8Page.style.height;

      // 切回 A4
      document.getElementById('sizeA4').click();
      const a4Page = document.querySelector('.sheet-page');
      const a4StyleWidth = a4Page.style.width;
      const a4StyleHeight = a4Page.style.height;

      return {
        initialA4: { width: initialStyleWidth, height: initialStyleHeight },
        b4: { width: b4StyleWidth, height: b4StyleHeight },
        k8: { width: k8StyleWidth, height: k8StyleHeight },
        restoredA4: { width: a4StyleWidth, height: a4StyleHeight }
      };
    })()`);
    console.log('【验收 4】纸张规格 A4、B4、8K 动态切换:');
    console.log('-> 结果:', JSON.stringify(r4, null, 2));
    const pass4 = (
      r4.initialA4.width === '210mm' && r4.initialA4.height === '297mm' &&
      r4.b4.width === '257mm' && r4.b4.height === '364mm' &&
      r4.k8.width === '260mm' && r4.k8.height === '370mm' &&
      r4.restoredA4.width === '210mm' && r4.restoredA4.height === '297mm'
    );
    console.log('-> 判定:', pass4 ? '✅ PASS' : '❌ FAIL', '\n');

    // 验收 5: 智能多格式词汇录入与多页排版
    const r5 = await evalExpr(`(async () => {
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

    edge.kill();
    process.exit(allPass ? 0 : 1);
  } catch (err) {
    console.error('测试异常:', err);
    edge.kill();
    process.exit(1);
  }
}

runTests();
