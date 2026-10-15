import { spawn } from 'child_process';

async function testExcelImport() {
  console.log('=== 开始验证 Excel / 剪贴板表格批量导入特性 (v2.2.8) ===\n');

  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9265',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${process.env.TEMP}\\DictationSheetGenEdge-${process.pid}`,
    '--window-size=1600,1400',
    'file:///d:/DictationSheetGen/dist/index.html'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const res = await fetch('http://127.0.0.1:9265/json');
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

    // 等待 DOM 挂载就绪
    for (let i = 0; i < 50; i++) {
      const isReady = await evalExpr(`!!window.__appStoreState && document.querySelectorAll('.n-tabs-tab').length > 0`).catch(() => false);
      if (isReady) break;
      await new Promise(r => setTimeout(r, 100));
    }

    // ================= 步骤 1: 切换到单词库并打开批量导入弹窗 =================
    console.log('【验证 1】切换到单词库，点击「📥 导入」打开 Excel / 表格导入弹窗:');
    const r1 = await evalExpr(`(async () => {
      // 切换到单词库标签
      const navTabs = document.querySelectorAll('.n-tabs-tab');
      for (const t of navTabs) {
        if (t.textContent.includes('词库') || t.textContent.includes('单词库')) {
          t.click();
          break;
        }
      }
      await new Promise(r => setTimeout(r, 300));

      const btnImport = document.getElementById('btnLibImport');
      if (!btnImport) return { success: false, reason: '未找到 #btnLibImport 按钮' };
      btnImport.click();
      await new Promise(r => setTimeout(r, 400));

      const modalTitle = document.querySelector('.n-modal .n-card-header__main');
      const btnExcelTpl = document.getElementById('btnDownloadExcelTpl');
      const btnCsvTpl = document.getElementById('btnDownloadCsvTpl');
      const tabPaste = document.getElementById('tabImportPaste');

      return {
        success: true,
        modalTitle: modalTitle ? modalTitle.textContent.trim() : null,
        hasExcelTplBtn: !!btnExcelTpl,
        hasCsvTplBtn: !!btnCsvTpl,
        hasTabPaste: !!tabPaste
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r1, null, 2));
    const pass1 = (
      r1.success &&
      r1.modalTitle &&
      r1.modalTitle.includes('批量导入单词库') &&
      r1.hasExcelTplBtn &&
      r1.hasCsvTplBtn &&
      r1.hasTabPaste
    );
    console.log('-> 判定:', pass1 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 步骤 2: 模拟从 Excel 复制 3 列数据并粘贴解析 =================
    console.log('【验证 2】模拟从 Excel / WPS 复制 3 列表格 [年级单元, 英文, 中文] 并粘贴:');
    const r2 = await evalExpr(`(async () => {
      // 切换至粘贴模式
      const tabPaste = document.getElementById('tabImportPaste');
      tabPaste.click();
      await new Promise(r => setTimeout(r, 200));

      const textarea = document.getElementById('textareaPasteExcel');
      // 构造类似 Excel 复制出的 Tab 分隔文本
      const excelClipboardData = [
        "年级与单元\\t英文单词\\t中文释义",
        "三年级上册 Unit 1\\truler\\t尺子",
        "三年级上册 Unit 1\\tpencil\\t铅笔",
        "四年级上册 Unit 2\\tclassroom\\t教室",
        "四年级上册 Unit 2\\tblackboard\\t黑板"
      ].join('\\n');

      textarea.value = excelClipboardData;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 300));

      const previewBox = document.getElementById('importPreviewBox');
      const previewRows = document.querySelectorAll('.import-preview-table tbody tr');
      const btnConfirm = document.getElementById('btnConfirmImportLib');

      const sampleRows = Array.from(previewRows).map(tr => {
        const tds = tr.querySelectorAll('td');
        return {
          group: tds[1] ? tds[1].textContent.trim() : '',
          en: tds[2] ? tds[2].textContent.trim() : '',
          zh: tds[3] ? tds[3].textContent.trim() : ''
        };
      });

      return {
        hasPreviewBox: !!previewBox,
        rowCount: sampleRows.length,
        sampleRows,
        btnConfirmText: btnConfirm ? btnConfirm.textContent.trim() : null,
        btnConfirmDisabled: btnConfirm ? btnConfirm.disabled : true
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r2, null, 2));
    const pass2 = (
      r2.hasPreviewBox &&
      r2.rowCount === 4 &&
      r2.sampleRows[0].en === 'ruler' &&
      r2.sampleRows[0].group === '三年级上册 Unit 1' &&
      r2.sampleRows[2].en === 'classroom' &&
      r2.sampleRows[2].group === '四年级上册 Unit 2' &&
      !r2.btnConfirmDisabled
    );
    console.log('-> 判定:', pass2 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 步骤 3: 确认导入并检查词库状态与分组标签 =================
    console.log('【验证 3】点击「确认导入词库」，验证单词已存入库且分组胶囊已自动生成:');
    const r3 = await evalExpr(`(async () => {
      const btnConfirm = document.getElementById('btnConfirmImportLib');
      btnConfirm.click();
      await new Promise(r => setTimeout(r, 400));

      const state = window.__appStoreState;
      const groupPills = Array.from(document.querySelectorAll('#groupPillsBar .group-pill-btn'))
        .map(p => p.textContent.trim());

      const importedEnList = state.library.words.map(w => w.en);

      return {
        totalLibCount: state.library.words.length,
        importedEnList,
        groupPills
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r3, null, 2));
    const pass3 = (
      r3.importedEnList.includes('ruler') &&
      r3.importedEnList.includes('pencil') &&
      r3.importedEnList.includes('classroom') &&
      r3.importedEnList.includes('blackboard') &&
      r3.groupPills.some(p => p.includes('三年级上册 Unit 1')) &&
      r3.groupPills.some(p => p.includes('四年级上册 Unit 2'))
    );
    console.log('-> 判定:', pass3 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 步骤 4: 验证 2 列格式并使用自定义单元输入 =================
    console.log('【验证 4】验证两列格式 [英文, 中文]，并新建归属单元分组:');
    const r4 = await evalExpr(`(async () => {
      const btnImport = document.getElementById('btnLibImport');
      btnImport.click();
      await new Promise(r => setTimeout(r, 400));

      const tabPaste = document.getElementById('tabImportPaste');
      tabPaste.click();
      await new Promise(r => setTimeout(r, 200));

      // 输入自定义单元名称
      const inputCustomGroup = document.getElementById('inputImportCustomGroup');
      inputCustomGroup.value = '五年级上册 Unit 3';
      inputCustomGroup.dispatchEvent(new Event('input', { bubbles: true }));

      const textarea = document.getElementById('textareaPasteExcel');
      textarea.value = "sandwich\\t三明治\\nsalad\\t沙拉\\nice cream\\t冰淇淋";
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 300));

      const btnConfirm = document.getElementById('btnConfirmImportLib');
      btnConfirm.click();
      await new Promise(r => setTimeout(r, 400));

      const state = window.__appStoreState;
      const groupPills = Array.from(document.querySelectorAll('#groupPillsBar .group-pill-btn'))
        .map(p => p.textContent.trim());

      const sandwichItem = state.library.words.find(w => w.en === 'sandwich');

      return {
        sandwichGroup: sandwichItem ? sandwichItem.group : null,
        groupPills
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r4, null, 2));
    const pass4 = (
      r4.sandwichGroup === '五年级上册 Unit 3' &&
      r4.groupPills.some(p => p.includes('五年级上册 Unit 3'))
    );
    console.log('-> 判定:', pass4 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 步骤 5: 验证智能查重过滤 =================
    console.log('【验证 5】再次粘贴已有单词，验证自动识别重复词数:');
    const r5 = await evalExpr(`(async () => {
      const btnImport = document.getElementById('btnLibImport');
      btnImport.click();
      await new Promise(r => setTimeout(r, 400));

      const tabPaste = document.getElementById('tabImportPaste');
      tabPaste.click();
      await new Promise(r => setTimeout(r, 200));

      const textarea = document.getElementById('textareaPasteExcel');
      // 包含重复词 ruler, sandwich，以及新词 tea
      textarea.value = "三年级上册 Unit 1\\truler\\t尺子\\n五年级上册 Unit 3\\tsandwich\\t三明治\\n五年级上册 Unit 3\\ttea\\t茶";
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 300));

      const previewBox = document.getElementById('importPreviewBox');
      const dupText = previewBox ? previewBox.textContent : '';

      return {
        dupTextMatch: dupText.includes('重复')
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r5, null, 2));
    const pass5 = r5.dupTextMatch;
    console.log('-> 判定:', pass5 ? '✅ PASS' : '❌ FAIL', '\n');

    console.log('=== 测试汇总 ===');
    const allPassed = pass1 && pass2 && pass3 && pass4 && pass5;
    if (allPassed) {
      console.log('🎉 所有 5 项 Excel / 剪贴板表格导入验证全部通过！');
    } else {
      console.error('❌ 部分测试未通过，请检查日志');
    }

    ws.close();
    edge.kill();
    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error('测试异常:', err);
    edge.kill();
    process.exit(1);
  }
}

testExcelImport();
