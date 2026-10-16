let xlsxModulePromise = null;
export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;

function loadXlsxModule() {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import('xlsx');
  }
  return xlsxModulePromise;
}

/**
 * 判断是否为表头行
 */
function isHeaderRow(row) {
  if (!Array.isArray(row) || row.length === 0) return false;
  const str = row.join(' ').toLowerCase();
  return (
    str.includes('年级') ||
    str.includes('单元') ||
    str.includes('group') ||
    str.includes('unit') ||
    str.includes('英文') ||
    str.includes('单词') ||
    str.includes('word') ||
    str.includes('中文') ||
    str.includes('释义') ||
    str.includes('chinese') ||
    str.includes('meaning') ||
    str.includes('翻译')
  );
}

/**
 * 智能将单行数组转换为 { en, zh, group, phonetic }
 */
function mapRowToWordItem(cols, defaultGroup = '通用词汇') {
  if (!Array.isArray(cols) || cols.length === 0) return null;
  const cleanCols = cols.map(c => (c !== null && c !== undefined ? String(c).trim() : '')).filter(Boolean);
  if (cleanCols.length === 0) return null;

  let group = defaultGroup || '通用词汇';
  let en = '';
  let zh = '';
  let phonetic = '';
  let hasExplicitGroup = false;

  const isPureEnglish = (str) => /^[a-zA-Z0-9\s.,'’!?\-/()]+$/.test(str);
  const containsChinese = (str) => /[\u4e00-\u9fa5]/.test(str);

  if (cleanCols.length >= 3) {
    // 3 列情况
    // 模式 A: [年级/单元, 英文, 中文] (最常见标准模式)
    if (isPureEnglish(cleanCols[1]) && containsChinese(cleanCols[2])) {
      group = cleanCols[0];
      en = cleanCols[1];
      zh = cleanCols[2];
      hasExplicitGroup = true;
    }
    // 模式 B: [英文, 中文, 年级/单元]
    else if (isPureEnglish(cleanCols[0]) && containsChinese(cleanCols[1])) {
      en = cleanCols[0];
      zh = cleanCols[1];
      group = cleanCols[2];
      hasExplicitGroup = true;
    }
    // 模式 C: [年级/单元, 英文, 音标, 中文] (4列)
    else if (cleanCols.length >= 4) {
      group = cleanCols[0];
      en = cleanCols[1];
      phonetic = cleanCols[2];
      zh = cleanCols[3];
      hasExplicitGroup = true;
    }
    // 模式 D: 兜底模式: 第0列为组，第1列为英文，其余合并不空为中文
    else {
      group = cleanCols[0];
      en = cleanCols[1];
      zh = cleanCols.slice(2).join('；');
      hasExplicitGroup = true;
    }
  } else if (cleanCols.length === 2) {
    // 2 列情况: [英文, 中文] 或 [中文, 英文]
    if (isPureEnglish(cleanCols[0])) {
      en = cleanCols[0];
      zh = cleanCols[1];
    } else if (isPureEnglish(cleanCols[1])) {
      zh = cleanCols[0];
      en = cleanCols[1];
    } else {
      en = cleanCols[0];
      zh = cleanCols[1];
    }
  } else if (cleanCols.length === 1) {
    // 1 列情况: 单行内含分隔符，如 "ruler 尺子" 或 "ruler | 尺子" 或 "三年级上册 Unit 1, ruler, 尺子"
    const line = cleanCols[0];
    const parts = line.split(/[\t,|—–-]+/).map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return mapRowToWordItem(parts, defaultGroup);
    }
    const spaceMatch = line.match(/^([a-zA-Z\s.,'’!?\-/]+)\s+([\u4e00-\u9fa5].*)$/);
    if (spaceMatch) {
      en = spaceMatch[1].trim();
      zh = spaceMatch[2].trim();
    } else {
      en = line;
      zh = '';
    }
  }

  // 校验并清洗英文
  if (!en) return null;

  return {
    id: `w-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
    en: en.trim(),
    zh: zh.trim(),
    group: (group || '通用词汇').trim(),
    hasExplicitGroup,
    phonetic: phonetic.trim(),
    updatedAt: Date.now()
  };
}

/**
 * 解析用户上传的 Excel / CSV 文件
 * @param {File} file 浏览器文件对象 (.xlsx, .xls, .csv)
 * @param {string} defaultGroup 默认分组
 * @returns {Promise<{ words: Array, groupsCount: number, duplicatesCount: number }>}
 */
export async function parseExcelOrCsvFile(file, defaultGroup = '通用词汇') {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new Error('请选择有效的表格文件');
  }
  if (Number(file.size) > MAX_IMPORT_FILE_BYTES) {
    throw new Error('文件超过 10 MB，请拆分后再导入');
  }
  const XLSX = await loadXlsxModule();
  const buffer = await file.arrayBuffer();
  // 读取工作簿
  const workbook = XLSX.read(buffer, { type: 'array' });
  const allParsedWords = [];

  // 遍历工作表（若工作表名为具体单元名且首列无单元，可用工作表名作为单元名）
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rawData || rawData.length === 0) return;

    // 工作表名若包含有效名称（如非默认 Sheet1/Sheet2），可作兜底分组
    const sheetGroup = (!/^sheet\d+$/i.test(sheetName) && sheetName.trim()) ? sheetName.trim() : defaultGroup;

    rawData.forEach((row, index) => {
      if (index === 0 && isHeaderRow(row)) {
        return; // 跳过表头
      }
      const item = mapRowToWordItem(row, sheetGroup);
      if (item && item.en) {
        allParsedWords.push(item);
      }
    });
  });

  return allParsedWords;
}

/**
 * 解析用户直接从 Excel / WPS 复制并粘贴的多行制表符文本
 * @param {string} pastedText 剪贴板文本
 * @param {string} defaultGroup 默认分组
 * @returns {Array} 解析后的单词列表
 */
export function parsePastedExcelText(pastedText, defaultGroup = '通用词汇') {
  if (!pastedText || !pastedText.trim()) return [];
  const lines = pastedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const words = [];

  lines.forEach((line, idx) => {
    // 按 Tab (\t) 分割（Excel 复制的默认分隔符）
    let cols = line.split('\t');
    if (cols.length === 1) {
      // 若无 Tab，尝试逗号或竖线
      if (line.includes(',')) cols = line.split(',');
      else if (line.includes('|')) cols = line.split('|');
    }

    if (idx === 0 && isHeaderRow(cols)) {
      return; // 忽略首行表头
    }

    const item = mapRowToWordItem(cols, defaultGroup);
    if (item && item.en) {
      words.push(item);
    }
  });

  return words;
}

/**
 * 生成并下载标准的 Excel (.xlsx) 示范模板
 */
export async function downloadExcelTemplate() {
  const XLSX = await loadXlsxModule();
  const sampleData = [
    ['年级与单元（可选）', '英文单词（必填）', '中文释义（建议）'],
    ['三年级上册 Unit 1', 'ruler', '尺子'],
    ['三年级上册 Unit 1', 'pencil', '铅笔'],
    ['三年级上册 Unit 1', 'eraser', '橡皮'],
    ['四年级上册 Unit 1', 'classroom', '教室'],
    ['四年级上册 Unit 1', 'blackboard', '黑板'],
    ['四年级上册 Unit 1', 'window', '窗户'],
    ['五年级上册 Unit 1', 'clever', '聪明的；聪颖的'],
    ['五年级上册 Unit 1', 'polite', '有礼貌的；客气的'],
    ['五年级上册 Unit 1', 'hard-working', '工作努力的；辛勤的']
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleData);
  // 设置列宽
  ws['!cols'] = [
    { wch: 22 }, // 年级单元
    { wch: 20 }, // 英文单词
    { wch: 26 }  // 中文释义
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '词库导入模板');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerBlobDownload(blob, '中小学英语默写词库导入模板.xlsx');
}

/**
 * 生成并下载带有 UTF-8 BOM 的 CSV 模板（Excel 直接双击打开不乱码）
 */
export function downloadCsvTemplate() {
  const csvContent = 
`年级与单元,英文单词,中文释义
三年级上册 Unit 1,ruler,尺子
三年级上册 Unit 1,pencil,铅笔
三年级上册 Unit 1,eraser,橡皮
四年级上册 Unit 1,classroom,教室
四年级上册 Unit 1,blackboard,黑板
四年级上册 Unit 1,window,窗户
五年级上册 Unit 1,clever,聪明的；聪颖的
五年级上册 Unit 1,polite,有礼貌的；客气的
五年级上册 Unit 1,hard-working,工作努力的；辛勤的
`;

  // \uFEFF 为 UTF-8 BOM 标记，保证 Windows Excel 打开不出现中文乱码
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerBlobDownload(blob, '中小学英语默写词库导入模板.csv');
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
