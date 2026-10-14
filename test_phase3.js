import { spawn } from 'child_process';

async function runPhase3Tests() {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9252',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${process.env.TEMP}\\DictationSheetGenEdge-${process.pid}`,
    '--window-size=1600,1400',
    'file:///d:/DictationSheetGen/dist/index.html'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const res = await fetch('http://127.0.0.1:9252/json');
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
    await evalExpr(`window.alert = () => {}; window.confirm = () => true;`);

    console.log('=== 开始执行 Phase 3 词库与可视化挖空自动化测试 ===\n');

    // 1. 测试四工作区 Tab 切换
    const rTabs = await evalExpr(`(() => {
      const tabBtns = document.querySelectorAll('.sidebar-tab-btn');
      const paneQuick = document.getElementById('paneQuick');
      const paneWordLib = document.getElementById('paneWordLib');
      const paneClozeVisual = document.getElementById('paneClozeVisual');
      const paneSettings = document.getElementById('paneSettings');

      // 默认 paneQuick 激活
      const initQuickActive = paneQuick.classList.contains('active') && !paneWordLib.classList.contains('active');

      // 切换到本地词库
      const btnLib = Array.from(tabBtns).find(b => b.getAttribute('data-tab') === 'paneWordLib');
      btnLib.click();
      const libActive = paneWordLib.classList.contains('active') && !paneQuick.classList.contains('active');

      // 切换到可视化挖空
      const btnCloze = Array.from(tabBtns).find(b => b.getAttribute('data-tab') === 'paneClozeVisual');
      btnCloze.click();
      const clozeActive = paneClozeVisual.classList.contains('active') && !paneWordLib.classList.contains('active');

      // 切换到版式设置
      const btnSettings = Array.from(tabBtns).find(b => b.getAttribute('data-tab') === 'paneSettings');
      btnSettings.click();
      const settingsActive = paneSettings.classList.contains('active') && !paneClozeVisual.classList.contains('active');

      // 切回快速录入
      const btnQuick = Array.from(tabBtns).find(b => b.getAttribute('data-tab') === 'paneQuick');
      btnQuick.click();
      const restoredQuickActive = paneQuick.classList.contains('active');

      return {
        tabCount: tabBtns.length,
        initQuickActive,
        libActive,
        clozeActive,
        settingsActive,
        restoredQuickActive
      };
    })()`);

    console.log('【测试 1】工作区 Tab 视图切换:');
    console.log('-> 结果:', JSON.stringify(rTabs, null, 2));
    const passTabs = rTabs.tabCount === 4 && rTabs.initQuickActive && rTabs.libActive && rTabs.clozeActive && rTabs.settingsActive && rTabs.restoredQuickActive;
    console.log('-> 判定:', passTabs ? '✅ PASS' : '❌ FAIL', '\n');

    // 2. 测试本地词库搜索、单个加入试卷与批量加入
    const rLib = await evalExpr(`(async () => {
      // 切换到词库 Tab
      document.querySelector('.sidebar-tab-btn[data-tab="paneWordLib"]').click();
      await new Promise(r => setTimeout(r, 100));

      const initialDraftLen = state.draft.items.length;
      const initialLibLen = state.library.words.length;

      // 搜索 'piano'
      const searchInput = document.getElementById('inputSearchLib');
      searchInput.value = 'piano';
      searchInput.dispatchEvent(new Event('input'));
      await new Promise(r => setTimeout(r, 60));

      const filteredRows = document.querySelectorAll('#libWordsContainer .lib-item-row');
      const hasPiano = filteredRows.length === 1 && filteredRows[0].textContent.includes('piano');

      // 点击单个加入试卷
      const addBtn = filteredRows[0].querySelector('.btn-lib-add');
      if (addBtn) addBtn.click();
      await new Promise(r => setTimeout(r, 60));
      const afterSingleDraftLen = state.draft.items.length;

      // 清空搜索
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
      await new Promise(r => setTimeout(r, 60));

      // 测试全选与批量加入
      const selectAllBtn = document.getElementById('btnLibSelectAll');
      selectAllBtn.click(); // 全选
      await new Promise(r => setTimeout(r, 60));
      const selectedCount = parseInt(document.getElementById('libSelectedCount').textContent, 10);

      const batchAddBtn = document.getElementById('btnLibBatchAddToDraft');
      batchAddBtn.click(); // 批量加入
      await new Promise(r => setTimeout(r, 60));
      const afterBatchDraftLen = state.draft.items.length;

      return {
        initialLibLen,
        initialDraftLen,
        hasPiano,
        afterSingleDraftLen,
        selectedCount,
        afterBatchDraftLen
      };
    })()`);

    console.log('【测试 2】本地词库检索、单词加入与批量加入试卷:');
    console.log('-> 结果:', JSON.stringify(rLib, null, 2));
    const passLib = rLib.initialLibLen > 0 && rLib.hasPiano && (rLib.afterSingleDraftLen === rLib.initialDraftLen + 1) && (rLib.afterBatchDraftLen > rLib.afterSingleDraftLen);
    console.log('-> 判定:', passLib ? '✅ PASS' : '❌ FAIL', '\n');

    // 3. 测试从试卷草稿保存词汇到词库与查重
    const rSaveToLib = await evalExpr(`(async () => {
      // 切回快速录入
      document.querySelector('.sidebar-tab-btn[data-tab="paneQuick"]').click();

      // 在试卷中加入一个新词 'sunflower 向日葵'
      state.draft.items.push({
        id: 'w-test-sunflower',
        en: 'sunflower',
        zh: '向日葵',
        type: 'word'
      });

      const beforeLibCount = state.library.words.length;
      // 点击存入词库
      const btnSave = document.getElementById('btnSaveDraftToLib');
      btnSave.click();
      await new Promise(r => setTimeout(r, 100));

      const afterLibCount = state.library.words.length;
      const hasSunflowerInLib = state.library.words.some(w => w.en === 'sunflower');

      // 再次点击存入词库，应全部查重跳过，数量不变
      btnSave.click();
      await new Promise(r => setTimeout(r, 100));
      const secondLibCount = state.library.words.length;

      return {
        beforeLibCount,
        afterLibCount,
        hasSunflowerInLib,
        secondLibCount,
        isDupPrevented: afterLibCount === secondLibCount
      };
    })()`);

    console.log('【测试 3】草稿词汇保存至词库与查重保护:');
    console.log('-> 结果:', JSON.stringify(rSaveToLib, null, 2));
    const passSaveToLib = (rSaveToLib.afterLibCount === rSaveToLib.beforeLibCount + 1) && rSaveToLib.hasSunflowerInLib && rSaveToLib.isDupPrevented;
    console.log('-> 判定:', passSaveToLib ? '✅ PASS' : '❌ FAIL', '\n');

    // 4. 测试可视化切词挖空与试卷/句库联动
    const rCloze = await evalExpr(`(async () => {
      // 切换到可视化挖空 Tab
      document.querySelector('.sidebar-tab-btn[data-tab="paneClozeVisual"]').click();

      const inputSentence = document.getElementById('inputVisualSentence');
      const inputZh = document.getElementById('inputVisualTranslation');

      inputSentence.value = 'The clever boy can ride a bicycle.';
      inputSentence.dispatchEvent(new Event('input'));
      inputZh.value = '这个聪明的男孩会骑自行车。';
      inputZh.dispatchEvent(new Event('input'));
      await new Promise(r => setTimeout(r, 60));

      // 检查切词胶囊数量
      const tokenBtns = document.querySelectorAll('#visualTokenWrap .visual-token-btn');
      const tokenWords = Array.from(tokenBtns).map(b => b.textContent);

      // 点击 "clever" 和 "bicycle" 胶囊
      const cleverBtn = Array.from(tokenBtns).find(b => b.textContent === 'clever');
      const bicycleBtn = Array.from(tokenBtns).find(b => b.textContent === 'bicycle');
      if (cleverBtn) cleverBtn.click();
      if (bicycleBtn) bicycleBtn.click();
      await new Promise(r => setTimeout(r, 60));

      // 点击后 DOM 重新渲染，重新获取活跃的胶囊元素
      const updatedBtns = document.querySelectorAll('#visualTokenWrap .visual-token-btn');
      const cleverBtnNow = Array.from(updatedBtns).find(b => b.textContent === 'clever');
      const bicycleBtnNow = Array.from(updatedBtns).find(b => b.textContent === 'bicycle');

      const cleverIsBlank = cleverBtnNow ? cleverBtnNow.classList.contains('is-blank') : false;
      const bicycleIsBlank = bicycleBtnNow ? bicycleBtnNow.classList.contains('is-blank') : false;

      // 检查预览区是否含有下划线挖空效果
      const previewText = document.getElementById('visualClozePreview').textContent;
      const previewHasClever = previewText.includes('clever') && previewText.includes('bicycle');

      // 点击保存至句库
      const beforeSentencesCount = state.library.sentences.length;
      document.getElementById('btnSaveVisualToLib').click();
      await new Promise(r => setTimeout(r, 100));
      const afterSentencesCount = state.library.sentences.length;

      // 点击加入当前试卷
      const beforeDraftLen = state.draft.items.length;
      document.getElementById('btnAddVisualToDraft').click();
      const afterDraftLen = state.draft.items.length;
      const lastDraftItem = state.draft.items[state.draft.items.length - 1];

      return {
        tokenCount: tokenBtns.length,
        tokenWords,
        cleverIsBlank,
        bicycleIsBlank,
        previewHasClever,
        beforeSentencesCount,
        afterSentencesCount,
        savedToSentenceLib: afterSentencesCount === beforeSentencesCount + 1,
        addedToDraft: afterDraftLen === beforeDraftLen + 1,
        lastDraftType: lastDraftItem?.type,
        lastDraftEn: lastDraftItem?.en,
        autoSwitchedToCloze: state.draft.settings.dictMode === 'cloze'
      };
    })()`);

    console.log('【测试 4】可视化切词挖空、实时预览、存入句库与加入试卷:');
    console.log('-> 结果:', JSON.stringify(rCloze, null, 2));
    const passCloze = rCloze.tokenCount >= 6 &&
      rCloze.cleverIsBlank &&
      rCloze.bicycleIsBlank &&
      rCloze.previewHasClever &&
      rCloze.savedToSentenceLib &&
      rCloze.addedToDraft &&
      rCloze.lastDraftType === 'sentence' &&
      rCloze.autoSwitchedToCloze;
    console.log('-> 判定:', passCloze ? '✅ PASS' : '❌ FAIL', '\n');

    console.log('=== Phase 3 全部自动化测试执行完毕 ===');
    const allPass = passTabs && passLib && passSaveToLib && passCloze;
    console.log('Phase 3 最终测试综述:', allPass ? '🎉 Phase 3 所有核心功能 100% 验收通过！' : '❌ 部分测试失败');

    edge.kill();
    process.exit(allPass ? 0 : 1);
  } catch (err) {
    console.error('测试异常:', err);
    edge.kill();
    process.exit(1);
  }
}

runPhase3Tests();
