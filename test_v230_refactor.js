import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function testV230Refactor() {
  console.log('=== 开始执行 v2.3.0 资深架构师重构全维度自动化验收测试 ===\n');

  // 1. 验证文件结构与文档
  console.log('【验证 1】检查模块化 CSS 架构与 Debug 编号映射文档:');
  const requiredCssFiles = [
    'src/styles/variables.css',
    'src/styles/base.css',
    'src/styles/layout.css',
    'src/styles/components.css',
    'src/styles/preview.css',
    'src/styles/debug.css',
    'src/styles/print.css',
    'src/styles/app.css'
  ];
  const allCssExist = requiredCssFiles.every(f => fs.existsSync(path.resolve(f)));
  const debugMapExist = fs.existsSync(path.resolve('docs/debug_map.md'));
  const iconCompExist = fs.existsSync(path.resolve('src/components/AppIcon.vue'));
  const debugOverlayExist = fs.existsSync(path.resolve('src/components/DebugOverlay.vue'));

  const r1 = {
    allCssExist,
    debugMapExist,
    iconCompExist,
    debugOverlayExist
  };
  console.log('-> 结果:', JSON.stringify(r1, null, 2));
  const pass1 = allCssExist && debugMapExist && iconCompExist && debugOverlayExist;
  console.log('-> 判定:', pass1 ? '✅ PASS' : '❌ FAIL', '\n');

  // 启动 Edge 进行真实页面渲染测试
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9260',
    '--disable-gpu',
    'file:///d:/DictationSheetGen/dist/index.html'
  ]);

  let res = null;
  for (let retry = 0; retry < 5; retry++) {
    try {
      await new Promise(r => setTimeout(r, 600));
      res = await fetch('http://127.0.0.1:9260/json');
      if (res.ok) break;
    } catch (e) {}
  }

  if (!res) {
    console.error('无法连接 Edge 端口 9260');
    edge.kill();
    process.exit(1);
  }

  try {
    const tabs = await res.json();
    const target = tabs.find(t => t.url.includes('DictationSheetGen'));
    if (!target) throw new Error('未找到目标页面');

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

    // 等待初始化
    await evalExpr(`new Promise(r => setTimeout(r, 500))`);

    // ================= 测试 2: 界面精简 (无“生成预览”、无“默认9词”、添加到试卷采用追加语义) =================
    console.log('【验证 2】界面精简与追加语义验收:');
    const r2 = await evalExpr(`(() => {
      // 检查可见按钮中是否有“生成预览”
      const allButtons = Array.from(document.querySelectorAll('button')).filter(b => {
        const style = window.getComputedStyle(b);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      const hasVisiblePreviewBtn = allButtons.some(b => b.textContent.includes('生成预览'));
      const hasVisibleSample9Btn = allButtons.some(b => b.textContent.includes('默认9词') || b.textContent.includes('默认 9 词'));

      const parseBtn = document.getElementById('btnParseText');
      const parseBtnText = parseBtn ? parseBtn.textContent.trim() : '';

      // 验证追加语义
      const state = window.__appStoreState;
      const initialCount = state.draft.items.length;

      // 填入两道词并点击添加
      const textarea = document.getElementById('customWordTextarea');
      if (textarea) {
        textarea.value = 'spring 春天\\nsummer 夏天';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (parseBtn) parseBtn.click();

      const afterCount1 = state.draft.items.length;

      // 再次填入一道词并点击添加
      if (textarea) {
        textarea.value = 'autumn 秋天';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (parseBtn) parseBtn.click();

      const afterCount2 = state.draft.items.length;

      return {
        hasVisiblePreviewBtn,
        hasVisibleSample9Btn,
        parseBtnText,
        initialCount,
        afterCount1,
        afterCount2,
        isAppended: (afterCount1 === initialCount + 2) && (afterCount2 === afterCount1 + 1)
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r2, null, 2));
    const pass2 = !r2.hasVisiblePreviewBtn && !r2.hasVisibleSample9Btn && r2.parseBtnText.includes('添加') && r2.isAppended;
    console.log('-> 判定:', pass2 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 测试 3: 统一数量状态标签 (quickStatBadge 风格行内标签) =================
    console.log('【验证 3】统一状态标签 (.quick-stat-badge 格式为“已添加 N 题”):');
    const r3 = await evalExpr(`(() => {
      const badges = Array.from(document.querySelectorAll('.quick-stat-badge'));
      const badgeTexts = badges.map(b => b.textContent.trim());
      
      // 检查是否有 duplicate id="quickStatBadge"
      const duplicateIds = document.querySelectorAll('#quickStatBadge');

      // 检查是否有 Naive UI 的悬浮角标 n-badge-sup 在可见区域显示词数
      const floatingSups = Array.from(document.querySelectorAll('.n-badge-sup')).filter(s => {
        const style = window.getComputedStyle(s);
        const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && s.offsetParent !== null;
        return isVisible;
      });

      return {
        badgeCount: badges.length,
        badgeTexts,
        duplicateIdCount: duplicateIds.length,
        hasFloatingSup: floatingSups.length > 0,
        matchesTextPattern: badgeTexts.some(t => /已添加\\s*\\d+\\s*题/.test(t))
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r3, null, 2));
    const pass3 = r3.badgeCount > 0 && r3.duplicateIdCount <= 1 && !r3.hasFloatingSup && r3.matchesTextPattern;
    console.log('-> 判定:', pass3 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 测试 4: 统一图标风格 (全站线性 SVG 图标，无系统 Emoji) =================
    console.log('【验证 4】统一图标风格 (无系统 Emoji，线性 SVG AppIcon 组件):');
    const r4 = await evalExpr(`(() => {
      const emojiRegex = /[\\u{1F300}-\\u{1F9FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}]/u;
      
      // 扫描主导航 Tab、主要按钮与标题栏文字
      const targets = [
        ...Array.from(document.querySelectorAll('.header-actions button')),
        ...Array.from(document.querySelectorAll('.sidebar-tabs button')),
        ...Array.from(document.querySelectorAll('.quick-input-pane button')),
        ...Array.from(document.querySelectorAll('.word-library-pane button')),
        ...Array.from(document.querySelectorAll('.settings-pane button'))
      ];

      const elementsWithEmoji = targets.filter(el => emojiRegex.test(el.textContent)).map(el => el.textContent.trim());

      // 检查 AppIcon svg 组件
      const appIcons = document.querySelectorAll('.app-icon');
      const ariaHiddenValid = Array.from(appIcons).every(icon => icon.getAttribute('aria-hidden') === 'true');

      return {
        checkedElementsCount: targets.length,
        emojiElementsFound: elementsWithEmoji.length,
        elementsWithEmoji,
        appIconsCount: appIcons.length,
        ariaHiddenValid
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r4, null, 2));
    const pass4 = r4.emojiElementsFound === 0 && r4.appIconsCount > 10 && r4.ariaHiddenValid;
    console.log('-> 判定:', pass4 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 测试 5: 全网页 Debug 模式 (Ctrl + Alt + D 快捷键响应与绝对定位标记) =================
    console.log('【验证 5】全网页 Debug 模式 (快捷键激活、稳定语义编号与信息复制):');
    const r5 = await evalExpr(`(async () => {
      const overlayBefore = document.querySelector('.debug-overlay-root');
      const isDebugBefore = overlayBefore ? overlayBefore.classList.contains('active') : false;

      // 触发 Ctrl + Alt + D
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'd',
        code: 'KeyD',
        ctrlKey: true,
        altKey: true,
        bubbles: true
      }));

      await new Promise(r => setTimeout(r, 150));

      const isDebugActive = document.body.classList.contains('is-debug-mode') || !!document.querySelector('.debug-overlay-root');
      const debugTaggedElements = document.querySelectorAll('[data-debug-id]');
      const sampleIds = Array.from(debugTaggedElements).map(el => el.getAttribute('data-debug-id')).slice(0, 8);

      // 检查是否有 H-001, Q-001, P-001, S-001 等规范编号
      const hasHeaderDebug = Array.from(debugTaggedElements).some(el => el.getAttribute('data-debug-id') === 'H-001');
      const hasQuickDebug = Array.from(debugTaggedElements).some(el => el.getAttribute('data-debug-id') === 'Q-001');
      const hasPreviewDebug = Array.from(debugTaggedElements).some(el => el.getAttribute('data-debug-id') === 'P-001');

      // 再次按快捷键关闭
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'd',
        code: 'KeyD',
        ctrlKey: true,
        altKey: true,
        bubbles: true
      }));

      await new Promise(r => setTimeout(r, 150));

      const isDebugClosed = !document.body.classList.contains('is-debug-mode') && !document.querySelector('.debug-overlay-root');

      return {
        isDebugBefore,
        isDebugActive,
        totalTaggedCount: debugTaggedElements.length,
        sampleIds,
        hasHeaderDebug,
        hasQuickDebug,
        hasPreviewDebug,
        isDebugClosed
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r5, null, 2));
    const pass5 = !r5.isDebugBefore && r5.isDebugActive && r5.totalTaggedCount >= 10 && r5.hasHeaderDebug && r5.hasQuickDebug && r5.hasPreviewDebug && r5.isDebugClosed;
    console.log('-> 判定:', pass5 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 测试 6: 组卷模式 (同一张试卷混排单词默写、句子挖空、整句默写、字母专项) =================
    console.log('【验证 6】组卷模式 (单张试卷混合容纳 4 种题型):');
    const r6 = await evalExpr(`(async () => {
      const state = window.__appStoreState;
      
      // 清空并混排组卷
      state.draft.items = [
        {
          id: 'item-mix-w1',
          type: 'word',
          questionType: 'word-dictation',
          en: 'sunshine',
          zh: '阳光'
        },
        {
          id: 'item-mix-c1',
          type: 'sentence',
          questionType: 'sentence-cloze',
          en: 'The [sun] is rising.',
          zh: '太阳正在升起。',
          segments: [
            { text: 'The ', blank: false },
            { text: 'sun', blank: true },
            { text: ' is rising.', blank: false }
          ]
        },
        {
          id: 'item-mix-s1',
          type: 'sentence',
          questionType: 'sentence-dictation',
          en: 'Practice makes perfect.',
          zh: '熟能生巧。'
        },
        {
          id: 'item-mix-a1',
          type: 'word',
          questionType: 'alphabet',
          alphabetType: 'neighbor',
          en: 'B, D',
          zh: '邻居: ___  C  ___',
          neighborData: {
            midChar: 'C',
            prevChar: 'B',
            nextChar: 'D',
            type: 'both'
          }
        }
      ];

      // 等待 Vue 重新计算 layout 并渲染 preview HTML
      await new Promise(r => setTimeout(r, 250));

      const container = document.getElementById('sheetsStreamContainer');
      const cards = container ? container.querySelectorAll('.word-card') : [];
      
      const cardTypes = Array.from(cards).map(c => {
        if (c.classList.contains('is-cloze-card') || c.classList.contains('type-sentence-cloze')) return 'sentence-cloze';
        if (c.classList.contains('is-sentence-dict-card') || c.classList.contains('type-sentence-dictation')) return 'sentence-dictation';
        if (c.classList.contains('is-neighbor-card') || c.classList.contains('is-alphabet-card') || c.classList.contains('type-alphabet')) return 'alphabet-neighbor';
        return 'word-dictation';
      });

      return {
        totalItems: state.draft.items.length,
        renderedCardCount: cards.length,
        cardTypes,
        hasCloze: cardTypes.includes('sentence-cloze'),
        hasSentenceDict: cardTypes.includes('sentence-dictation'),
        hasAlphabetNeighbor: cardTypes.includes('alphabet-neighbor'),
        hasWordDict: cardTypes.includes('word-dictation')
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r6, null, 2));
    const pass6 = r6.totalItems === 4 && r6.hasCloze && r6.hasSentenceDict && r6.hasAlphabetNeighbor && r6.hasWordDict;
    console.log('-> 判定:', pass6 ? '✅ PASS' : '❌ FAIL', '\n');

    // ================= 测试 7: 导出打印彻底消除末尾空白页 (.is-last-page 样式) =================
    console.log('【验证 7】打印排版末尾空白页消除验证 (.is-last-page 样式):');
    const r7 = await evalExpr(`(() => {
      const pages = Array.from(document.querySelectorAll('.sheet-page'));
      const lastPage = pages[pages.length - 1];
      const hasLastPageClass = lastPage ? lastPage.classList.contains('is-last-page') : false;

      // 检查页面样式规则
      const printRules = Array.from(document.styleSheets).flatMap(s => {
        try {
          return Array.from(s.cssRules || []);
        } catch (e) {
          return [];
        }
      });

      const hasBreakAfterAvoidRule = printRules.some(r => {
        return r.cssText && r.cssText.includes('.is-last-page') && (r.cssText.includes('break-after') || r.cssText.includes('page-break-after'));
      });

      return {
        pageCount: pages.length,
        hasLastPageClass,
        hasBreakAfterAvoidRule
      };
    })()`);
    console.log('-> 结果:', JSON.stringify(r7, null, 2));
    const pass7 = r7.pageCount > 0 && r7.hasLastPageClass && r7.hasBreakAfterAvoidRule;
    console.log('-> 判定:', pass7 ? '✅ PASS' : '❌ FAIL', '\n');

    console.log('=== v2.3.0 资深架构师重构验收测试执行完毕 ===');
    const allPass = pass1 && pass2 && pass3 && pass4 && pass5 && pass6 && pass7;
    console.log('最终测试综述:', allPass ? '🎉 v2.3.0 架构升级 7 大核心维度 100% 验收通过！' : '❌ 存在未通过项，需进一步检查');

    ws.close();
    edge.kill();

    if (!allPass) process.exit(1);
  } catch (err) {
    console.error('测试异常中断:', err);
    edge.kill();
    process.exit(1);
  }
}

testV230Refactor();
