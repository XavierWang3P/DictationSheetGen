import { spawn } from 'child_process';

async function runCanvasGridSentenceFixesTest() {
  console.log('=== 开始执行画布渲染、四线三格高度联动与句子题目防遮挡专项测试 ===\n');

  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9266',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${process.env.TEMP}\\DictationSheetGenEdge-${process.pid}`,
    '--window-size=1600,1200',
    'file:///d:/DictationSheetGen/dist/index.html'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const res = await fetch('http://127.0.0.1:9266/json');
    const tabs = await res.json();
    const target = tabs.find(t => t.url.includes('DictationSheetGen'));
    if (!target) throw new Error('未找到目标测试页面');

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
            else resolve(data.result?.result?.value);
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

    // 等待应用初始化
    for (let i = 0; i < 50; i++) {
      const isReady = await evalExpr(`!!window.__appStoreState && !!document.querySelector('.preview-canvas-container')`).catch(() => false);
      if (isReady) break;
      await new Promise(r => setTimeout(r, 100));
    }

    // =========================================================================
    // 【验证 1】句子挖空与默写提示格式统一：去除中文提示外侧括号
    // =========================================================================
    console.log('【验证 1】句子挖空与默写提示格式统一（中文提示外侧无括号）：');
    const r1 = await evalExpr(`(async () => {
      const store = window.__appStoreState;
      // 设置句子挖空与句子默写题目，中文带不同形式的括号
      store.words = [
        {
          id: 's_cloze_1',
          questionType: 'sentence-cloze',
          type: 'sentence',
          en: 'Where are [the scissors]?',
          zh: '（剪刀在哪里？）',
          segments: [
            { text: 'Where are ', blank: false },
            { text: 'the scissors', blank: true },
            { text: '?', blank: false }
          ]
        },
        {
          id: 's_dict_1',
          questionType: 'sentence-dictation',
          type: 'sentence',
          en: 'Where are the scissors?',
          zh: '(剪刀在哪里？)'
        }
      ];
      store.draft.settings.dictMode = 'mixed';
      store.draft.settings.columns = 1;

      await new Promise(r => setTimeout(r, 400));

      const clozeZhEls = Array.from(document.querySelectorAll('.cloze-zh'));
      const dictZhEls = Array.from(document.querySelectorAll('.sentence-dict-prompt, .entry-zh-hint'));

      const clozeTexts = clozeZhEls.map(el => el.textContent.trim());
      const dictTexts = dictZhEls.map(el => el.textContent.trim());

      const hasBracket = (str) => /^[（(].*[）)]$/.test(str) || str.startsWith('（') || str.startsWith('(') || str.endsWith('）') || str.endsWith(')');

      // 切换到教师答案模式验证
      store.draft.settings._teacherMode = true;
      await new Promise(r => setTimeout(r, 300));
      const teacherClozeZh = Array.from(document.querySelectorAll('.teacher-question-zh')).map(el => el.textContent.trim());
      const teacherDictZh = Array.from(document.querySelectorAll('.teacher-question-text')).map(el => el.textContent.trim());
      store.draft.settings._teacherMode = false;
      await new Promise(r => setTimeout(r, 200));

      return {
        clozeCount: clozeZhEls.length,
        clozeTexts,
        dictCount: dictZhEls.length,
        dictTexts,
        clozeHasNoOuterBrackets: clozeTexts.length > 0 && clozeTexts.every(t => !hasBracket(t)),
        dictHasNoOuterBrackets: dictTexts.length > 0 && dictTexts.every(t => !hasBracket(t)),
        teacherClozeClean: teacherClozeZh.every(t => !hasBracket(t)),
        teacherDictClean: teacherDictZh.every(t => !hasBracket(t)),
        sampleCloze: clozeTexts[0],
        sampleDict: dictTexts[0]
      };
    })()`);

    console.log('-> 结果:', JSON.stringify(r1, null, 2));
    if (!r1.clozeHasNoOuterBrackets || !r1.dictHasNoOuterBrackets || !r1.teacherClozeClean || !r1.teacherDictClean) {
      throw new Error('验证 1 失败：中文提示仍含有外侧括号！');
    }
    console.log('-> 判定: ✅ PASS\n');

    // =========================================================================
    // 【验证 2】四线三格高度全局统一与排版面板联动
    // =========================================================================
    console.log('【验证 2】四线三格高度全局统一与排版面板联动：');
    const r2 = await evalExpr(`(async () => {
      const store = window.__appStoreState;

      // 1. 设置基准高度 10mm 与 行间距 3mm
      store.draft.settings.gridHeight = 10;
      store.draft.settings.rowGap = 3;
      store.draft.settings.copiesPerPage = 1;
      await new Promise(r => setTimeout(r, 300));

      const getSectionCssVar = () => {
        const section = document.querySelector('.sheet-copy-section');
        if (!section) return {};
        const style = section.getAttribute('style') || '';
        const ghMatch = style.match(/--grid-height:\\s*([0-9.]+)mm/);
        const rgMatch = style.match(/--row-gap:\\s*([0-9.]+)mm/);
        return {
          gridHeight: ghMatch ? parseFloat(ghMatch[1]) : null,
          rowGap: rgMatch ? parseFloat(rgMatch[1]) : null
        };
      };

      const getGridDimensions = () => {
        const svg = document.querySelector('.four-line-svg');
        const clozeInline = document.querySelector('.cloze-inline-grid');
        return {
          svgHeightStyle: svg ? svg.style.height : null,
          clozeInlineStyleHeight: clozeInline ? clozeInline.style.height : null
        };
      };

      const baseCss = getSectionCssVar();
      const baseDim = getGridDimensions();

      // 2. 调整高度至 16mm 与 行间距 6mm
      store.draft.settings.gridHeight = 16;
      store.draft.settings.rowGap = 6;
      await new Promise(r => setTimeout(r, 300));

      const scaledCss = getSectionCssVar();
      const scaledDim = getGridDimensions();

      // 3. 验证 2 份与 3 份模式下随 slider 联动调节，不再被写死锁死
      store.draft.settings.copiesPerPage = 2;
      store.draft.settings.gridHeight = 12;
      await new Promise(r => setTimeout(r, 300));
      const copy2Small = getSectionCssVar();

      store.draft.settings.gridHeight = 15;
      await new Promise(r => setTimeout(r, 300));
      const copy2Large = getSectionCssVar();

      return {
        baseCss,
        scaledCss,
        baseDim,
        scaledDim,
        copy2Small,
        copy2Large,
        // 验证放大设置后数值增加
        gridHeightScalesUp: scaledCss.gridHeight > baseCss.gridHeight,
        rowGapScalesUp: scaledCss.rowGap > baseCss.rowGap,
        multiCopyScalesUp: copy2Large.gridHeight > copy2Small.gridHeight,
        svgHeightMatches: scaledDim.svgHeightStyle === '16mm',
        clozeInlineMatches: scaledDim.clozeInlineStyleHeight === '16mm'
      };
    })()`);

    console.log('-> 结果:', JSON.stringify(r2, null, 2));
    if (!r2.gridHeightScalesUp || !r2.rowGapScalesUp || !r2.multiCopyScalesUp || !r2.svgHeightMatches) {
      throw new Error('验证 2 失败：四线三格高度或行间距未与排版面板联动！');
    }
    console.log('-> 判定: ✅ PASS\n');

    // =========================================================================
    // 【验证 3】句子类题目列表防遮挡修复（超长文本容器 min-width: 0 与按钮防挤压）
    // =========================================================================
    console.log('【验证 3】句子类题目列表防遮挡修复：');
    const r3 = await evalExpr(`(async () => {
      const store = window.__appStoreState;

      // 切换至试卷题目 Tab (paneList)
      store.ui.activeView = 'paneList';
      await new Promise(r => setTimeout(r, 400));

      // 放入一条极长句子的题目
      const superLongEn = "This is an extraordinarily long English sentence designed specifically to test text-wrapping, flex-child containment, and layout stability inside the question manager list pane without overflowing horizontally or clipping the operation buttons.";
      const superLongZh = "这是一个专门用于测试文本自动折行、弹性子元素尺寸收敛以及题目管理列表内布局稳定性的超长中文句子，绝不能横向溢出容器或者遮挡右侧操作按钮。";

      store.words = [
        ...store.draft.items,
        {
          id: 'long_sentence_test',
          questionType: 'sentence-dictation',
          type: 'sentence',
          en: superLongEn,
          zh: superLongZh
        }
      ];

      await new Promise(r => setTimeout(r, 400));

      const listContainer = document.querySelector('.words-list-container.compact-list');
      const rows = Array.from(document.querySelectorAll('.compact-exam-row'));
      const lastRow = rows[rows.length - 1];

      if (!lastRow) {
        return { error: '未找到列表项' };
      }

      const mainEl = lastRow.querySelector('.word-item-main');
      const actionsEl = lastRow.querySelector('.word-item-actions');
      const enEl = lastRow.querySelector('.word-item-en');
      const zhEl = lastRow.querySelector('.word-item-zh');

      const containerRect = listContainer.getBoundingClientRect();
      const rowRect = lastRow.getBoundingClientRect();
      const actionsRect = actionsEl ? actionsEl.getBoundingClientRect() : null;

      const mainStyle = window.getComputedStyle(mainEl);
      const enStyle = window.getComputedStyle(enEl);
      const zhStyle = window.getComputedStyle(zhEl);

      // 验证操作按钮在容器可见边界内，未被推到视口外
      const actionsInsideContainer = actionsRect && (actionsRect.right <= containerRect.right + 2);
      const rowInsideContainer = rowRect.right <= containerRect.right + 5;

      return {
        hasList: !!listContainer,
        mainMinWidth: mainStyle.minWidth,
        enWordBreak: enStyle.wordBreak,
        enOverflowWrap: enStyle.overflowWrap,
        zhWordBreak: zhStyle.wordBreak,
        containerWidth: containerRect.width,
        rowWidth: rowRect.width,
        actionsInsideContainer,
        rowInsideContainer
      };
    })()`);

    console.log('-> 结果:', JSON.stringify(r3, null, 2));
    if (!r3.actionsInsideContainer || !r3.rowInsideContainer || r3.mainMinWidth !== '0px' || r3.containerWidth <= 0) {
      throw new Error('验证 3 失败：超长句子容器布局未修复或操作按钮被遮挡挤出！');
    }
    console.log('-> 判定: ✅ PASS\n');

    console.log('==================================================');
    console.log('🎉 全部 3 项专项验收测试 100% 成功通过！');
    console.log('==================================================');

  } finally {
    edge.kill();
  }
}

runCanvasGridSentenceFixesTest().catch(err => {
  console.error('测试异常:', err);
  process.exit(1);
});
