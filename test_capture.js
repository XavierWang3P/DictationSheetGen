const { spawn } = require('child_process');
const fs = require('fs');

async function capture() {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9251',
    '--disable-gpu',
    '--window-size=1600,1400',
    'file:///d:/DictationSheetGen/index.html'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const res = await fetch('http://127.0.0.1:9251/json');
    const tabs = await res.json();
    const target = tabs.find(t => t.url.includes('DictationSheetGen'));
    if (!target) throw new Error('Target tab not found');

    const ws = new WebSocket(target.webSocketDebuggerUrl);

    let msgId = 1;
    function sendCommand(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const handler = (event) => {
          const data = JSON.parse(event.data);
          if (data.id === id) {
            ws.removeEventListener('message', handler);
            if (data.error) reject(data.error);
            else resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await new Promise(resolve => ws.onopen = resolve);

    // 禁用阻塞框并载入一页3份示例
    await sendCommand('Runtime.evaluate', {
      expression: `
        window.alert = () => {};
        window.confirm = () => true;
        document.getElementById('btnLoadDefaultSample').click();
      `
    });

    await new Promise(r => setTimeout(r, 500));

    // 截取完整 UI
    const ssFull = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('d:/DictationSheetGen/preview_full_ui_v3.png', Buffer.from(ssFull.data, 'base64'));
    console.log('Saved preview_full_ui_v3.png');

    // 截取单页试卷
    await sendCommand('Runtime.evaluate', {
      expression: `
        const toast = document.getElementById('appToast');
        if (toast) toast.remove();
        document.getElementById('sheetsStreamContainer').style.transform = 'scale(1)';
      `
    });
    await new Promise(r => setTimeout(r, 300));

    const clipBox = await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const page = document.querySelector('.sheet-page');
        const rect = page.getBoundingClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          scale: 1
        };
      })()`,
      returnByValue: true
    });

    const ssClip = await sendCommand('Page.captureScreenshot', {
      format: 'png',
      clip: clipBox.result.value
    });
    fs.writeFileSync('d:/DictationSheetGen/preview_sheet_v3.png', Buffer.from(ssClip.data, 'base64'));
    console.log('Saved preview_sheet_v3.png');

    // 截取挖空模式单页与全界面 (测试用户遇到的 2 列排版)
    await sendCommand('Runtime.evaluate', {
      expression: `
        document.getElementById('modeCloze').click();
        document.getElementById('col2').click();
        const toast2 = document.getElementById('appToast');
        if (toast2) toast2.remove();
        document.getElementById('sheetsStreamContainer').style.transform = 'scale(0.85)';
      `
    });
    await new Promise(r => setTimeout(r, 400));
    const ssClozeFull = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('d:/DictationSheetGen/preview_cloze_ui.png', Buffer.from(ssClozeFull.data, 'base64'));
    console.log('Saved preview_cloze_ui.png');

    await sendCommand('Runtime.evaluate', {
      expression: `
        const toast3 = document.getElementById('appToast');
        if (toast3) toast3.remove();
        document.getElementById('sheetsStreamContainer').style.transform = 'scale(1)';
      `
    });
    await new Promise(r => setTimeout(r, 300));
    const clipBoxCloze = await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const page = document.querySelector('.sheet-page');
        const rect = page.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale: 1 };
      })()`,
      returnByValue: true
    });
    const ssClozeClip = await sendCommand('Page.captureScreenshot', {
      format: 'png',
      clip: clipBoxCloze.result.value
    });
    fs.writeFileSync('d:/DictationSheetGen/preview_cloze_sheet.png', Buffer.from(ssClozeClip.data, 'base64'));
    console.log('Saved preview_cloze_sheet.png');

    // 切回 writing 模式生成最终 PDF
    await sendCommand('Runtime.evaluate', {
      expression: `
        document.getElementById('modeWriting').click();
      `
    });
    await new Promise(r => setTimeout(r, 200));

    // 打印真实 PDF (A4 尺寸，margin 0)
    const pdfData = await sendCommand('Page.printToPDF', {
      paperWidth: 8.27, // 210mm in inches
      paperHeight: 11.69, // 297mm in inches
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      printBackground: true,
      preferCSSPageSize: true
    });
    fs.writeFileSync('d:/DictationSheetGen/test_print_output.pdf', Buffer.from(pdfData.data, 'base64'));
    console.log('Saved test_print_output.pdf');

    edge.kill();
    process.exit(0);
  } catch (e) {
    console.error('Error during capture:', e);
    edge.kill();
    process.exit(1);
  }
}

capture();
