import assert from 'assert';
import * as XLSX from 'xlsx';
import { MAX_IMPORT_FILE_BYTES, parseExcelOrCsvFile } from '../src/core/excelParser.js';

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet([
  ['年级与单元', '英文单词', '中文释义'],
  ['五年级上册 Unit 1', 'clever', '聪明的'],
  ['五年级上册 Unit 1', 'polite', '有礼貌的']
]);
XLSX.utils.book_append_sheet(workbook, worksheet, '词库');
const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
const file = new File([buffer], 'words.xlsx', {
  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
});

const words = await parseExcelOrCsvFile(file, '默认分组');
assert.equal(words.length, 2, '应解析 Excel 文件中的两条单词记录');
assert.deepEqual(
  words.map(({ en, zh, group }) => ({ en, zh, group })),
  [
    { en: 'clever', zh: '聪明的', group: '五年级上册 Unit 1' },
    { en: 'polite', zh: '有礼貌的', group: '五年级上册 Unit 1' }
  ],
  '动态加载 XLSX 后应保留英文、中文和分组'
);

const oversizedFile = {
  name: 'oversized.xlsx',
  size: MAX_IMPORT_FILE_BYTES + 1,
  arrayBuffer() {
    throw new Error('超限文件不应读取内容');
  }
};
await assert.rejects(
  () => parseExcelOrCsvFile(oversizedFile),
  /文件超过 10 MB/,
  '导入文件超过上限时应在读取前拒绝'
);

console.log('Excel 文件动态解析：PASS');
