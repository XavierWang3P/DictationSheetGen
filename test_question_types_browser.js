import { spawn } from 'child_process';

async function run() {
  console.log('=== 开始执行 v2.4.0 题型注册、布局、打印与PDF浏览器验收 ===\n');
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9262',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${process.env.TEMP}\\DictationSheetGenEdge-${process.pid}`,
    '--window-size=1800,1500',
    'file:///d:/DictationSheetGen/dist/index.html'
  ]);

  let response = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      response = await fetch('http://127.0.0.1:9262/json');
      if (response.ok) break;
    } catch {}
  }
  if (!response?.ok) throw new Error('无法连接 Edge 调试端口 9262');

  try {
    const tabs = await response.json();
    const target = tabs.find((tab) => tab.url.includes('DictationSheetGen'));
    if (!target) throw new Error('未找到 DictationSheetGen 页面');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve) => { ws.onopen = resolve; });

    let id = 1;
    const pending = new Map();
    const browserErrors = [];
    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error || data.result?.exceptionDetails) reject(new Error(JSON.stringify(data.error || data.result.exceptionDetails)));
        else resolve(data.result);
        return;
      }
      if (data.method === 'Runtime.exceptionThrown') browserErrors.push(data.params?.exceptionDetails?.text || 'Runtime exception');
      if (data.method === 'Runtime.consoleAPICalled' && data.params?.type === 'error') browserErrors.push('console.error');
    });

    function call(method, params = {}) {
      return new Promise((resolve, reject) => {
        const current = id++;
        pending.set(current, { resolve, reject });
        ws.send(JSON.stringify({ id: current, method, params }));
      });
    }

    async function evaluate(expression) {
      const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      return result.result?.value;
    }

    await call('Runtime.enable');
    await call('Page.enable');

    const editorFlow = await evaluate(`(async () => {
      const delay = ms => new Promise(r => setTimeout(r, ms));
      const setValue = (selector, value) => {
        const el = document.querySelector(selector);
        if (!el) return false;
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      };
      const state = window.__appStoreState;
      state.draft.items = [];

      document.getElementById('modeChoice').click();
      await delay(80);
      const initialOptions = document.querySelectorAll('.option-editor-row').length;
      setValue('#choiceStemInput', 'Choose the correct word.');
      setValue('#choiceLabelStyle', 'numeric');
      const afterStyleOptions = document.querySelectorAll('.option-editor-row').length;
      document.querySelectorAll('.option-text-input').forEach((input, index) => {
        input.value = ['apple', 'desk', 'window', 'door'][index] || '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      const lastRow = document.querySelectorAll('.option-editor-row')[3];
      lastRow?.querySelector('.answer-toggle input')?.click();
      lastRow?.querySelector('[data-action="remove-option"]')?.click();
      document.getElementById('btnAddChoiceOption')?.click();
      await delay(30);
      document.getElementById('btnSubmitGeneralQuestion').click();
      await delay(80);
      const choiceItem = state.draft.items[0];

      document.getElementById('modeInlineFill').click();
      await delay(50);
      document.getElementById('btnAddInlineBlank').click();
      setValue('#inlineFillStemInput', 'I {1} English and she {2} Chinese.');
      const blankRows = document.querySelectorAll('.blank-editor-row');
      if (blankRows[0]) {
        blankRows[0].querySelector('input').value = 'like';
        blankRows[0].querySelector('input').dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (blankRows[1]) {
        blankRows[1].querySelector('input').value = 'speaks';
        blankRows[1].querySelector('input').dispatchEvent(new Event('input', { bubbles: true }));
      }
      document.getElementById('btnSubmitGeneralQuestion').click();
      await delay(80);

      document.getElementById('modeComposition').click();
      await delay(50);
      setValue('#compositionTitleInput', 'My Weekend');
      setValue('#compositionLineCount', '8');
      document.getElementById('btnSubmitGeneralQuestion').click();
      await delay(80);

      return {
        initialOptions,
        afterStyleOptions,
        choiceOptionsAfterEdit: choiceItem?.options?.length || 0,
        removedAnswerPruned: (choiceItem?.answers?.length || 0) === 0,
        addedTypes: state.draft.items.map(item => item.questionType),
        inlineBlankCount: state.draft.items[1]?.blanks?.length || 0,
        compositionLineCount: state.draft.items[2]?.lineCount || 0
      };
    })()`);

    const fixture = [
      { id: 'word-short', questionType: 'word-dictation', en: 'apple', zh: '苹果' },
      { id: 'sentence-long', questionType: 'sentence-dictation', en: 'This is a deliberately long sentence that needs enough room for children to write clearly and comfortably.', zh: '这是一个需要充足书写空间的长句。', layout: { columns: 2 } },
      { id: 's-mv7qz8pn-5ylfj', questionType: 'sentence-cloze', en: 'Ask [your teacher] for [some useful advice].', zh: '向你的老师寻求一些有用的建议。', layout: { columns: 2 } },
      { id: 'choice-one', questionType: 'choice', stem: 'Which one is a fruit?', selectionMode: 'single', labelStyle: 'alpha-upper', optionLayout: 'auto', options: [{ id: 'oa', text: 'Apple' }, { id: 'ob', text: 'Desk' }, { id: 'oc', text: 'Window' }], answers: ['oa'] },
      { id: 'fill-one', questionType: 'inline-fill', stem: 'I {1} English and she {2} Chinese.', stemSegments: [{ type: 'text', text: 'I ' }, { type: 'blank', blankId: 'b1' }, { type: 'text', text: ' English and she ' }, { type: 'blank', blankId: 'b2' }, { type: 'text', text: ' Chinese.' }], blanks: [{ id: 'b1', answer: 'like', lineStyle: 'four-line', widthMode: 'auto' }, { id: 'b2', answer: 'speaks', lineStyle: 'single', widthMode: 'auto' }] },
      { id: 'composition-one', questionType: 'english-composition', title: 'My School', instructions: 'Write at least five sentences about your school.', writingStyle: 'four-line', lineCount: 12, lineHeight: 11, showTitleArea: true }
    ];

    await evaluate(`(async () => {
      const state = window.__appStoreState;
      state.draft.items = ${JSON.stringify(fixture)};
      Object.assign(state.draft.settings, {
        paperSize: 'A4', orientation: 'portrait', copiesPerPage: 1, wordsPerPage: 30,
        showAnswerPage: false, clozeStyle: 'inline', clozeZhPosition: 'below', clozeBlankWidth: 'auto',
        fontFamilyEn: 'Arial, sans-serif', promptFontSize: 14,
        layoutDefaults: { wordDictationColumns: 3, sentenceDictationColumns: 1, sentenceClozeColumns: 'auto', choiceColumns: 'auto', inlineFillColumns: 'auto', englishCompositionColumns: 1 }
      });
      await new Promise(r => setTimeout(r, 400));
      return true;
    })()`);

    const screen = await evaluate(`(() => {
      const card = id => document.querySelector('.student-sheet-page [data-id="' + id + '"]');
      const word = card('word-short');
      const sentence = card('sentence-long');
      const cloze = card('s-mv7qz8pn-5ylfj');
      const positionLayout = cloze?.querySelector('.cloze-position-layout') || null;
      const firstClozeGrid = cloze?.querySelector('.cloze-inline-grid') || null;
      const wordGrid = word?.querySelector('.adaptive-writing-grid');
      const wordGridContainer = wordGrid?.parentElement || null;
      const studentHtml = document.querySelector('.student-sheet-page')?.innerHTML || '';
      return {
        pageCount: document.querySelectorAll('.sheet-page').length,
        lastPageCount: document.querySelectorAll('.sheet-page.is-last-page').length,
        wordSpan: word?.style.gridColumn || '',
        sentenceSpan: sentence?.style.gridColumn || '',
        wordGridWidth: wordGrid ? parseFloat(getComputedStyle(wordGrid).width) : 0,
        wordGridContainerWidth: wordGridContainer ? parseFloat(getComputedStyle(wordGridContainer).width) : 0,
        wordGridUsesFullWidth: wordGrid?.classList.contains('word-dictation-grid') || false,
        clozeCardFound: !!cloze,
        clozeHtml: cloze?.innerHTML?.slice(0, 240) || '',
        clozePositionClass: positionLayout?.className || '',
        clozeFirstChildClass: positionLayout?.children?.[0]?.className || '',
        clozeSecondChildClass: positionLayout?.children?.[1]?.className || '',
        clozeGridCount: cloze?.querySelectorAll('.cloze-inline-grid').length || 0,
        clozeLayoutDirection: positionLayout ? getComputedStyle(positionLayout).flexDirection : '',
        clozeBlankVerticalAlign: firstClozeGrid ? getComputedStyle(firstClozeGrid).verticalAlign : '',
        choiceOptions: document.querySelectorAll('.type-choice .choice-option').length,
        fillBlanks: document.querySelectorAll('.type-inline-fill .cloze-inline-grid, .type-inline-fill .inline-fill-blank').length,
        compositionLines: document.querySelectorAll('.type-english-composition .four-line-svg').length,
        hasTeacherPage: !!document.querySelector('.teacher-answer-page'),
        leaksChoiceAnswer: !!document.querySelector('.student-sheet-page .choice-option.is-correct'),
        leaksFillAnswer: studentHtml.includes('bananas') || studentHtml.includes('speaks') || studentHtml.includes('like</'),
        pageOverflow: Array.from(document.querySelectorAll('.sheet-page')).some(page => page.scrollWidth > page.clientWidth + 1 || page.scrollHeight > page.clientHeight + 1)
      };
    })()`);

    const printA4 = await call('Page.printToPDF', { printBackground: true, preferCSSPageSize: true });
    const pdfA4 = Buffer.from(printA4.data, 'base64').toString('latin1');
    const pdfA4Pages = (pdfA4.match(/\/Type\s*\/Page\b/g) || []).length;

    await evaluate(`(async () => {
      const s = window.__appStoreState.draft.settings;
      s.paperSize = 'B4'; s.orientation = 'landscape'; s.copiesPerPage = 2; s.showAnswerPage = true;
      await new Promise(r => setTimeout(r, 400));
    })()`);
    const answerMode = await evaluate(`(() => ({
      domPages: document.querySelectorAll('.sheet-page').length,
      studentPages: document.querySelectorAll('.student-sheet-page').length,
      teacherPages: document.querySelectorAll('.teacher-answer-page').length,
      lastPageCount: document.querySelectorAll('.sheet-page.is-last-page').length,
      correctChoiceVisible: !!document.querySelector('.teacher-answer-page .choice-option.is-correct'),
      fillAnswerVisible: (document.querySelector('.teacher-answer-page')?.textContent || '').includes('speaks'),
      pageOverflow: Array.from(document.querySelectorAll('.sheet-page')).some(page => page.scrollWidth > page.clientWidth + 1 || page.scrollHeight > page.clientHeight + 1)
    }))()`);
    const printB4 = await call('Page.printToPDF', { printBackground: true, preferCSSPageSize: true });
    const pdfB4 = Buffer.from(printB4.data, 'base64').toString('latin1');
    const pdfB4Pages = (pdfB4.match(/\/Type\s*\/Page\b/g) || []).length;

    const checks = {
      structuredEditorFlow: editorFlow.initialOptions === 4 && editorFlow.afterStyleOptions === 4 && editorFlow.choiceOptionsAfterEdit === 4 && editorFlow.removedAnswerPruned && editorFlow.inlineBlankCount === 2 && editorFlow.compositionLineCount === 8 && editorFlow.addedTypes.join(',') === 'choice,inline-fill,english-composition',
      allQuestionTypesRendered: screen.choiceOptions === 3 && screen.fillBlanks === 2 && screen.compositionLines === 12,
      perTypeLayout: screen.wordSpan.includes('4') && screen.sentenceSpan.includes('12'),
      clozeAlignment: screen.clozePositionClass.includes('cloze-layout-below') && screen.clozeFirstChildClass.includes('cloze-english-column') && screen.clozeSecondChildClass.includes('pos-below') && screen.clozeLayoutDirection === 'column' && screen.clozeGridCount === 2 && screen.clozeBlankVerticalAlign === 'middle',
      fullWidthWordGrid: screen.wordGridUsesFullWidth && Math.abs(screen.wordGridWidth - screen.wordGridContainerWidth) <= 1,
      noStudentAnswerLeak: !screen.leaksChoiceAnswer && !screen.leaksFillAnswer,
      a4PdfMatchesPreview: pdfA4Pages === screen.pageCount,
      answerVersion: answerMode.studentPages > 0 && answerMode.teacherPages === answerMode.studentPages && answerMode.correctChoiceVisible && answerMode.fillAnswerVisible,
      b4PdfMatchesPreview: pdfB4Pages === answerMode.domPages,
      oneLastPageOnly: screen.lastPageCount === 1 && answerMode.lastPageCount === 1,
      noOverflow: !screen.pageOverflow && !answerMode.pageOverflow,
      noBrowserErrors: browserErrors.length === 0
    };

    console.log('结构化编辑器流程:', JSON.stringify(editorFlow, null, 2));
    console.log('A4渲染细节:', JSON.stringify(screen, null, 2));
    console.log('A4纵向/1份/学生卷:', JSON.stringify({ domPages: screen.pageCount, pdfPages: pdfA4Pages }, null, 2));
    console.log('B4横向/2份/含教师答案:', JSON.stringify({ domPages: answerMode.domPages, studentPages: answerMode.studentPages, teacherPages: answerMode.teacherPages, pdfPages: pdfB4Pages }, null, 2));
    console.log('验收结果:', JSON.stringify(checks, null, 2));
    const passed = Object.values(checks).every(Boolean);
    console.log(passed ? 'QUESTION_TYPE_BROWSER_TESTS_PASSED' : 'QUESTION_TYPE_BROWSER_TESTS_FAILED');
    ws.close();
    edge.kill();
    process.exit(passed ? 0 : 1);
  } catch (error) {
    edge.kill();
    throw error;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
