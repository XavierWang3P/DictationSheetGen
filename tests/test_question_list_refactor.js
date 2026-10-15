import { spawn } from 'child_process';
import assert from 'assert';

async function runTests() {
  console.log('=== 开始执行 Q-007 与 ITEM-* 题目列表重构专项端到端测试 ===\n');

  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9270',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${process.env.TEMP}\\DictationSheetGenEdge-${process.pid}`,
    '--window-size=1600,1400',
    'file:///d:/DictationSheetGen/dist/index.html'
  ]);

  await new Promise(r => setTimeout(r, 3500));

  try {
    const res = await fetch('http://127.0.0.1:9270/json');
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
            else if (data.result.exceptionDetails) {
              reject(new Error(data.result.exceptionDetails.exception?.description || data.result.exceptionDetails.text));
            } else {
              resolve(data.result.result.value);
            }
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

    for (let retry = 0; retry < 30; retry++) {
      if (await evalExpr('Boolean(window.__appStoreState || window.state)')) break;
      await new Promise(r => setTimeout(r, 100));
    }

    // ================= 1. 验证 Q-007 面板清理：移除批量列数，清空按钮迁移至顶部标题栏最右侧 =================
    console.log('【验证 1】检查 Q-007 面板清理：移除批量列数工具栏，清空按钮移至顶部标题栏最右侧:');
    const r1 = await evalExpr(`(async () => {
      const appState = window.state || window.__appStoreState;
      appState.ui.activeView = 'paneList';
      document.getElementById('btnLoadDefaultSample').click();
      await new Promise(r => setTimeout(r, 200));

      const batchToolbar = document.querySelector('.batch-toolbar');
      const batchBtn = document.querySelector('.batch-btn');
      const clearBtn = document.getElementById('btnClearExamItems') || document.querySelector('[data-debug-id="Q-007"] .header-ghost-clear-btn');
      const headerActions = document.querySelector('.pane-header-actions');
      const hintTag = document.querySelector('.header-hint-tag');

      const isClearInHeader = headerActions && headerActions.contains(clearBtn);
      const isGhost = clearBtn && clearBtn.classList.contains('header-ghost-clear-btn');

      return {
        hasBatchToolbar: !!batchToolbar,
        hasBatchBtn: !!batchBtn,
        hasClearBtn: !!clearBtn,
        isClearInHeader: !!isClearInHeader,
        isGhostBtn: !!isGhost,
        hasHintTag: !!hintTag
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r1, null, 2));
    assert.strictEqual(r1.hasBatchToolbar, false, '批量列数工具栏已被彻底移除');
    assert.strictEqual(r1.hasBatchBtn, false, '批量列数按钮已被移除');
    assert.strictEqual(r1.hasClearBtn, true, '清空按钮存在');
    assert.strictEqual(r1.isClearInHeader, true, '清空按钮位于顶部标题栏右侧区域');
    assert.strictEqual(r1.isGhostBtn, true, '清空按钮采用幽灵文字图标按钮样式');
    assert.strictEqual(r1.hasHintTag, false, '题目列表头部带有 header-hint-tag 样式的冗长提示已被彻底移除');
    console.log('-> 判定: ✅ PASS\n');

    // ================= 2. 验证 ITEM-* 题目列表项操作按钮精简与 24x24 规范化 =================
    console.log('【验证 2】检查 ITEM-* 列表项：移除单题列数切换控件，仅保留 24x24 紧凑等高图标按钮:');
    const r2 = await evalExpr(`(() => {
      const rows = document.querySelectorAll('#wordsListContainer .compact-exam-row');
      if (rows.length === 0) return { error: 'No rows found' };

      const firstRow = rows[0];
      const colSelector = firstRow.querySelector('.n-popselect');
      const actionGroup = firstRow.querySelector('.word-item-actions');
      const buttons = firstRow.querySelectorAll('.word-item-btn');

      const btnStyles = Array.from(buttons).map(b => {
        const computed = window.getComputedStyle(b);
        return {
          title: b.getAttribute('title') || b.getAttribute('aria-label') || '',
          width: computed.width,
          height: computed.height
        };
      });

      const actionGroupStyle = window.getComputedStyle(actionGroup);

      return {
        rowCount: rows.length,
        hasColSelector: !!colSelector,
        buttonCount: buttons.length,
        buttons: btnStyles,
        actionGroupOpacity: parseFloat(actionGroupStyle.opacity),
        rowTitle: firstRow.getAttribute('title') || ''
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r2, null, 2));
    assert.strictEqual(r2.hasColSelector, false, '列表项上的单题列数切换控件已被移除');
    assert.strictEqual(r2.buttonCount, 3, '列表项仅保留上移、下移、删除 3 个核心操作');
    assert.ok(r2.buttons.every(b => b.width === '24px' && b.height === '24px'), '所有操作按钮统一固定为 24px × 24px');
    assert.ok(r2.actionGroupOpacity <= 0.25, '操作按钮组默认处于半透明低权重状态');
    assert.ok(r2.rowTitle.includes('双击'), '题目行带有双击可编辑的 title 属性');
    console.log('-> 判定: ✅ PASS\n');

    // ================= 3. 验证双击题目进入二次编辑 & 句子挖空可视化单词点选 =================
    console.log('【验证 3】验证双击句子挖空题进入编辑，自动解析单词芯片并支持快捷点选挖空:');
    const r3 = await evalExpr(`(async () => {
      const appState = window.state || window.__appStoreState;
      // 1. 添加一道句子挖空题
      appState.draft.items = [{
        id: 'test-cloze-1',
        questionType: 'sentence-cloze',
        en: 'Ask [your teacher] for help.',
        zh: '向你的老师寻求帮助。',
        segments: [
          { text: 'Ask ', blank: false },
          { text: 'your teacher', blank: true },
          { text: ' for help.', blank: false }
        ]
      }];
      await new Promise(r => setTimeout(r, 200));

      const clozeRow = document.querySelector('.compact-exam-row[data-debug-id="ITEM-test-cloze-1"]');
      if (!clozeRow) return { error: 'Cloze row not found' };

      // 2. 双击该行
      clozeRow.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, 300));

      // 3. 检查弹窗是否打开，且单词芯片是否已解析
      const modal = document.querySelector('.n-modal');
      const chipContainer = document.querySelector('#modalClozeChips');
      const chips = chipContainer ? Array.from(chipContainer.querySelectorAll('.cloze-chip-btn')) : [];
      const chipData = chips.map(c => ({
        text: c.textContent.replace('挖空', '').trim(),
        isBlank: c.classList.contains('is-blank')
      }));

      // 4. 点击第 1 个单词 'Ask' 设为挖空
      if (chips[0]) {
        chips[0].click();
      }
      await new Promise(r => setTimeout(r, 100));

      // 5. 再次读取芯片状态
      const chipsAfterClick = Array.from(chipContainer.querySelectorAll('.cloze-chip-btn')).map(c => ({
        text: c.textContent.replace('挖空', '').trim(),
        isBlank: c.classList.contains('is-blank')
      }));

      // 6. 点击保存修改按钮
      const saveBtn = Array.from(document.querySelectorAll('.modal-footer button')).find(b => b.textContent.includes('保存修改'));
      if (saveBtn) saveBtn.click();
      await new Promise(r => setTimeout(r, 300));

      // 7. 检查更新后的试卷数据
      const updatedItem = appState.draft.items[0];

      return {
        modalOpened: !!modal,
        chipsInitial: chipData,
        chipsAfterToggleAsk: chipsAfterClick,
        savedEn: updatedItem.en,
        savedSegments: (updatedItem.segments || []).map(s => ({ text: s.text, blank: s.blank }))
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r3, null, 2));
    assert.strictEqual(r3.modalOpened, true, '双击题目成功触发二次编辑弹窗');
    assert.deepStrictEqual(
      r3.chipsInitial.map(c => c.text),
      ['Ask', 'your', 'teacher', 'for', 'help'],
      '英文原句被成功解析为纯净单词芯片（已剥离标点）'
    );
    assert.strictEqual(r3.chipsInitial[1].isBlank, true, '原先挖空的 your 为高亮挖空状态');
    assert.strictEqual(r3.chipsInitial[2].isBlank, true, '原先挖空的 teacher 为高亮挖空状态');
    assert.ok(r3.savedEn.includes('[Ask') && r3.savedEn.includes(']'), '保存后原题英文自动更新为带挖空括号的标记文本');
    const segList = Array.isArray(r3.savedSegments) ? r3.savedSegments : Object.values(r3.savedSegments);
    assert.ok(segList.some(s => s.blank && s.text.includes('Ask')), '保存后 segments 包含 Ask 挖空项');
    console.log('-> 判定: ✅ PASS\n');

    console.log('=== 全部 3 大核心重构验收测试 100% 完美通过！ ===');
  } finally {
    edge.kill();
  }
}

runTests().catch(err => {
  console.error('测试异常:', err);
  process.exit(1);
});
