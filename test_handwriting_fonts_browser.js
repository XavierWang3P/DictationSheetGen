import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9261;

async function waitForEndpoint(url, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      // Edge is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Edge 调试端口启动超时');
}

async function run() {
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dictation-font-edge-'));
  const edge = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    `--user-data-dir=${profileDir}`,
    '--window-size=1440,1000',
    'file:///d:/DictationSheetGen/dist/index.html'
  ]);

  try {
    const tabs = await waitForEndpoint(`http://127.0.0.1:${port}/json`);
    const target = tabs.find(tab => tab.url.includes('DictationSheetGen'));
    assert.ok(target, '未找到构建后的本地页面');

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(resolve => { ws.onopen = resolve; });

    let nextId = 1;
    function command(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = nextId++;
        const listener = event => {
          const message = JSON.parse(event.data);
          if (message.id !== id) return;
          ws.removeEventListener('message', listener);
          if (message.error) reject(new Error(message.error.message));
          else resolve(message.result);
        };
        ws.addEventListener('message', listener);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await command('Runtime.enable');
    await command('Page.enable');
    const evaluation = await command('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        document.getElementById('btnLoadAlphabetNeighbors')?.click();
        await new Promise(resolve => setTimeout(resolve, 150));
        const appState = window.__appStoreState;
        const letters = ['Q', 'j', 'g', 'p', 'A', 'b', 'y', 'G', 'f'];
        appState.draft.items = appState.draft.items.slice(0, 9).map((item, index) => ({
          ...item,
          zh: '邻居: ___  ' + letters[index] + '  ___',
          prompt: '邻居: ___  ' + letters[index] + '  ___',
          neighborData: {
            ...(item.neighborData || {}),
            type: 'both',
            midChar: letters[index],
            prevChar: '',
            nextChar: ''
          }
        }));
        Object.assign(appState.draft.settings, {
          title: '英文手写体四线三格基线测试',
          copiesPerPage: 3,
          columns: 3,
          wordsPerPage: 9,
          gridHeight: 12,
          alphabetGuideFont: 'Shuyao Italic, cursive'
        });
        await Promise.all([
          document.fonts.load('24px "Shuyao Hengshui"'),
          document.fonts.load('24px "Shuyao Italic"'),
          document.fonts.load('24px "Shuyao Italic Four Line"'),
          document.fonts.load('24px "Xumin Regular"'),
          document.fonts.load('24px "Xumin Linglish"')
        ]);
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        const guides = [...document.querySelectorAll('.alphabet-guide-text')];
        const first = guides[0];
        return {
          fontStatus: document.fonts.status,
          allFontsReady: [
            'Shuyao Hengshui',
            'Shuyao Italic',
            'Shuyao Italic Four Line',
            'Xumin Regular',
            'Xumin Linglish'
          ].every(name => document.fonts.check('24px "' + name + '"')),
          guideCount: guides.length,
          texts: guides.map(node => node.textContent.trim()),
          yValues: guides.map(node => node.getAttribute('y')),
          fontSizes: guides.map(node => node.getAttribute('font-size')),
          gridHeights: [...document.querySelectorAll('.alphabet-grid-shell')].map(node => node.style.height),
          pageCount: document.querySelectorAll('.sheet-page').length,
          fontFamily: first ? getComputedStyle(first).fontFamily : '',
          bbox: first ? (() => {
            const box = first.getBBox();
            return { x: box.x, y: box.y, width: box.width, height: box.height };
          })() : null,
          linePreserveAspectRatio: document.querySelector('.alphabet-grid-lines')?.getAttribute('preserveAspectRatio'),
          guideHasViewBox: document.querySelector('.alphabet-guide-layer')?.hasAttribute('viewBox') ?? true,
          errors: window.__browserErrors || []
        };
      })()`
    });

    if (evaluation.exceptionDetails) throw new Error(evaluation.exceptionDetails.text);
    const result = evaluation.result.value;
    assert.equal(result.fontStatus, 'loaded');
    assert.equal(result.allFontsReady, true, '五个内置字体都应能由浏览器加载');
    assert.equal(result.guideCount, 27);
    assert.deepEqual(result.texts.slice(0, 9), ['Q', 'j', 'g', 'p', 'A', 'b', 'y', 'G', 'f']);
    assert.ok(result.yValues.every(value => value === '66%'), '所有范字必须共享第三线基线');
    assert.ok(result.fontSizes.every(value => value === '7.777mm'), '每页3份时范字必须按11mm格高放大');
    assert.ok(result.gridHeights.every(value => value === '11mm'), '每页3份时字母格必须保持11mm');
    assert.equal(result.pageCount, 1, '9道字母题每页3份仍应保持单页');
    assert.match(result.fontFamily, /Shuyao Italic/);
    assert.ok(result.bbox.width > 0 && result.bbox.height > 0, '范字必须使用真实字体形成可见字形');
    assert.equal(result.linePreserveAspectRatio, 'none');
    assert.equal(result.guideHasViewBox, false, '范字层不得使用会拉伸文字的 viewBox');

    if (process.env.SCREENSHOT_PATH) {
      const screenshot = await command('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        fromSurface: true
      });
      fs.writeFileSync(process.env.SCREENSHOT_PATH, Buffer.from(screenshot.data, 'base64'));
    }

    if (process.env.PDF_PATH) {
      const pdf = await command('Page.printToPDF', {
        printBackground: true,
        preferCSSPageSize: true,
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0
      });
      fs.writeFileSync(process.env.PDF_PATH, Buffer.from(pdf.data, 'base64'));
    }

    ws.close();
    console.log('PASS: 每页3份使用11mm字母格，Q/j/g/p 范字放大且保持规范基线');
  } finally {
    edge.kill();
    await new Promise(resolve => setTimeout(resolve, 150));
    if (profileDir.startsWith(os.tmpdir())) {
      fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 3 });
    }
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
