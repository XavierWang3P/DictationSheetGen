import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { launchEdgePage } from '../tests/helpers/edgeCdp.js';

const port = 9362;
const profileDir = path.join(process.env.TEMP, `DictationSheetGenEdge-${process.pid}-${port}`);
const outputDir = path.resolve('docs/screenshots');
const browser = await launchEdgePage({
  port,
  url: new URL('../dist/index.html?__test=1', import.meta.url).href,
  width: 1600,
  height: 1000
});

try {
  await browser.evaluate(`(async () => {
    for (let i = 0; i < 50 && !window.__appStoreState; i += 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const state = window.__appStoreState;
    state.library.words = Array.from({ length: 9 }, (_, index) => ({
      id: 'ui-word-' + index,
      en: ['beautiful', 'hard-working', 'rope', 'clever', 'robot', 'piano', 'young', 'jump', 'river'][index],
      zh: ['美丽的；优美的', '工作努力的；辛勤的', '绳；绳索', '聪明的；聪颖的', '机器人', '钢琴', '幼小的；年轻的', '跳', '河流'][index],
      group: '五年级上册 Unit 1'
    }));
    state.ui.activeView = 'paneWordLib';
    await new Promise(resolve => setTimeout(resolve, 250));
  })()`);

  const library = await browser.evaluate(`(() => {
    const pane = document.querySelector('.word-library-pane');
    const zh = document.querySelector('.lib-item-zh');
    const control = document.querySelector('.library-control-panel');
    const searchIcon = document.querySelector('.search-leading-icon');
    const row = document.querySelector('.lib-item-row');
    const logo = document.querySelector('.header-logo');
    const mainActions = ['btnLibImport', 'btnLibExport', 'btnLibClear']
      .map(id => document.getElementById(id))
      .filter(Boolean);
    const rowActions = [...document.querySelectorAll('.lib-item-row:first-child .lib-row-action')];
    const list = document.querySelector('#libWordsContainer');
    return {
      visible: !!pane && pane.getBoundingClientRect().height > 0,
      paneFont: getComputedStyle(pane).fontFamily,
      zhFont: zh ? getComputedStyle(zh).fontFamily : '',
      hasControlPanel: !!control,
      hasSearchIcon: !!searchIcon,
      rowRadius: row ? getComputedStyle(row).borderRadius : '',
      logoLoaded: !!logo && logo.complete && logo.naturalWidth > 0,
      title: document.querySelector('.word-library-pane > .pane-header .title-with-icon')?.textContent.trim(),
      addLabel: document.querySelector('.btn-lib-add')?.getAttribute('aria-label'),
      mainActionLabels: mainActions.map(button => button.textContent.trim()),
      mainActionHeights: mainActions.map(button => button.getBoundingClientRect().height),
      rowActionSizes: rowActions.map(button => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })),
      embeddedGroupDeleteCount: document.querySelectorAll('.group-pill-btn .pill-del-icon').length,
      listGap: list ? getComputedStyle(list).gap : '',
      listBorderStyle: list ? getComputedStyle(list).borderStyle : ''
    };
  })()`);

  assert.equal(library.visible, true);
  assert.equal(library.hasControlPanel, true);
  assert.equal(library.hasSearchIcon, true);
  assert.equal(library.logoLoaded, true);
  assert.match(library.paneFont, /Microsoft YaHei|PingFang SC|Segoe UI/i);
  assert.doesNotMatch(library.zhFont, /KaiTi|楷体|SimSun|宋体/i);
  assert.match(library.zhFont, /sans-serif/i);
  assert.equal(library.title, '本地题库');
  assert.equal(library.addLabel, '加入试卷');
  assert.deepEqual(library.mainActionLabels, ['导入词库', '导出备份', '清空']);
  assert.ok(library.mainActionHeights.every(height => height === 28));
  assert.deepEqual(library.rowActionSizes, [{ width: 24, height: 24 }, { width: 24, height: 24 }]);
  assert.equal(library.embeddedGroupDeleteCount, 0);
  assert.equal(library.listGap, '0px');
  assert.equal(library.listBorderStyle, 'solid');

  const libraryShot = await browser.call('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outputDir, 'ui-library-polish.png'), Buffer.from(libraryShot.data, 'base64'));

  const alphabet = await browser.evaluate(`(async () => {
    const state = window.__appStoreState;
    state.ui.activeView = 'paneQuick';
    await new Promise(resolve => setTimeout(resolve, 100));
    document.getElementById('modeAlphabet')?.click();
    await new Promise(resolve => setTimeout(resolve, 100));
    document.getElementById('tabAlphaNeighbors')?.click();
    await new Promise(resolve => setTimeout(resolve, 100));
    const tabs = [...document.querySelectorAll('#alphabetTypeTabs .grid-btn')];
    const tabStyles = tabs.map(tab => ({
      text: tab.textContent.trim(),
      gap: getComputedStyle(tab).columnGap,
      iconSize: tab.querySelector('.app-icon')?.getBoundingClientRect().width || 0
    }));
    const hint = document.querySelector('.alpha-student-hint')?.textContent.trim();

    document.getElementById('btnLoadAlphabet26')?.click();
    state.draft.items.unshift({
      id: 'ui-preceding-word',
      type: 'word',
      questionType: 'word-dictation',
      en: 'apple',
      zh: '苹果'
    });
    await new Promise(resolve => setTimeout(resolve, 300));
    const numbers = [...document.querySelectorAll('.alpha-26-cell:not(.alpha-dummy-cell) .entry-index')]
      .map(node => Number(node.textContent.replace('.', '').trim()));
    state.draft.items.shift();
    await new Promise(resolve => setTimeout(resolve, 200));
    return { tabStyles, hint, numbers };
  })()`);

  assert.deepEqual(alphabet.tabStyles.map(tab => tab.text), ['26个字母默写', '前后字母', '大小写转换']);
  assert.ok(alphabet.tabStyles.every(tab => parseFloat(tab.gap) >= 6));
  assert.ok(alphabet.tabStyles.every(tab => tab.iconSize >= 13));
  assert.equal(alphabet.hint, '给学生的提示：写出中间字母前面和后面的字母。');
  assert.deepEqual(alphabet.numbers, Array.from({ length: 26 }, (_, index) => index + 1));

  const alphabetShot = await browser.call('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outputDir, 'ui-alphabet-polish.png'), Buffer.from(alphabetShot.data, 'base64'));

  assert.deepEqual(browser.browserErrors, []);
  console.log(JSON.stringify({ library, alphabet, browserErrors: browser.browserErrors }, null, 2));
} finally {
  await browser.close();
  await new Promise(resolve => setTimeout(resolve, 500));
  fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
}
