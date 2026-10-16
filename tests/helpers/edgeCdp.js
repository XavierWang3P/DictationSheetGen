import { spawn } from 'child_process';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePageUrl(value) {
  try {
    const url = new URL(value);
    const pathname = decodeURIComponent(url.pathname).replaceAll('\\', '/');
    const isWindowsFilePath = url.protocol === 'file:' && /^\/[a-z]:\//i.test(pathname);
    const normalizedPath = isWindowsFilePath ? pathname.toLowerCase() : pathname;
    const query = [...url.searchParams.entries()]
      .sort(([leftKey, leftValue], [rightKey, rightValue]) => leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue))
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    return `${url.protocol}//${url.host.toLowerCase()}${normalizedPath}${query ? `?${query}` : ''}`;
  } catch {
    return null;
  }
}

export function selectPageTarget(targets, requestedUrl) {
  const pages = (targets || []).filter((target) =>
    target?.webSocketDebuggerUrl && (!target.type || target.type === 'page')
  );
  const expected = normalizePageUrl(requestedUrl);
  if (expected) {
    const exact = pages.find((target) => normalizePageUrl(target.url) === expected);
    if (exact) return exact;
  }

  const navigatedPages = pages.filter((target) => /^(?:file|https?):/i.test(target.url || ''));
  if (navigatedPages.length === 1) return navigatedPages[0];
  if (pages.length === 1) return pages[0];
  return null;
}

export async function launchEdgePage({ port, url, width = 1800, height = 1400 }) {
  const edge = spawn(EDGE_PATH, [
    '--headless',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${process.env.TEMP}\\DictationSheetGenEdge-${process.pid}-${port}`,
    `--window-size=${width},${height}`,
    url
  ]);

  let response = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await delay(250);
      response = await fetch(`http://127.0.0.1:${port}/json`);
      if (response.ok) break;
    } catch {}
  }
  if (!response?.ok) {
    edge.kill();
    throw new Error(`无法连接 Edge 调试端口 ${port}`);
  }

  const tabs = await response.json();
  const target = selectPageTarget(tabs, url);
  if (!target) {
    edge.kill();
    throw new Error('未找到请求的测试页面');
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let id = 1;
  const pending = new Map();
  const browserErrors = [];

  ws.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const request = pending.get(data.id);
      pending.delete(data.id);
      if (data.error || data.result?.exceptionDetails) {
        request.reject(new Error(JSON.stringify(data.error || data.result.exceptionDetails)));
      } else {
        request.resolve(data.result);
      }
      return;
    }
    if (data.method === 'Runtime.exceptionThrown') {
      browserErrors.push(data.params?.exceptionDetails?.exception?.description || data.params?.exceptionDetails?.text || 'Runtime exception');
    }
    if (data.method === 'Runtime.consoleAPICalled' && data.params?.type === 'error') {
      const text = (data.params.args || []).map((arg) => arg.value || arg.description || '').join(' ');
      browserErrors.push(text || 'console.error');
    }
  });

  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const current = id++;
      pending.set(current, { resolve, reject });
      ws.send(JSON.stringify({ id: current, method, params }));
    });
  }

  async function evaluate(expression) {
    const result = await call('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    return result.result?.value;
  }

  await call('Runtime.enable');
  await call('Page.enable');

  // DevTools 目标可能在文件页完成提交前就已出现；此时 location 看似可用，
  // 但文档仍继承 about:blank 的不透明来源，localStorage/IndexedDB 会偶发拒绝访问。
  let documentReady = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const state = await evaluate(`({
        href: location.href,
        readyState: document.readyState,
        storageAvailable: (() => {
          try { void localStorage.length; return true; } catch { return false; }
        })()
      })`);
      documentReady = /^(?:file|https?):/i.test(state?.href || '')
        && ['interactive', 'complete'].includes(state?.readyState)
        && state?.storageAvailable === true;
      if (documentReady) break;
    } catch {}
    await delay(50);
  }
  if (!documentReady) {
    await close();
    throw new Error(`Edge 测试页面未完成加载：${url}`);
  }

  async function close() {
    try {
      if (ws.readyState === WebSocket.OPEN) await call('Browser.close');
    } catch {}
    try { ws.close(); } catch {}
    if (!edge.killed) edge.kill();
    await Promise.race([
      new Promise((resolve) => edge.once('exit', resolve)),
      delay(1500)
    ]);
  }

  return { call, evaluate, browserErrors, close };
}
