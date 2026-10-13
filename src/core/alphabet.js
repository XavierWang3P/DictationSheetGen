import { generateId } from './tokenizer.js';
import { createDraftItem } from './layout.js';

export const UPPER_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
];

export const LOWER_LETTERS = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
];

/**
 * 洗牌算法辅助函数
 */
function shuffleArray(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 1. 生成 26 个英文字母默写题
 * @param {Object} options
 * @param {string} options.caseStyle 'pair' (Aa) | 'upper' (A) | 'lower' (a)
 * @param {string} options.subMode 'full' (全默写) | 'gap' (挖空接龙) | 'shuffle' (乱序听写)
 * @param {number} options.gapCount 挖空数量 (subMode === 'gap' 时有效，默认 13)
 * @returns {Array} DraftItem 数组
 */
export function generateAlphabetSequenceItems(options = {}) {
  const {
    caseStyle = 'pair',
    subMode = 'full',
    gapCount = 13
  } = options;

  let indices = Array.from({ length: 26 }, (_, i) => i);
  let blankIndices = new Set();

  if (subMode === 'gap') {
    // 随机挑选 gapCount 个位置挖空
    const shuffled = shuffleArray(indices);
    const count = Math.min(25, Math.max(1, gapCount || 13));
    shuffled.slice(0, count).forEach(idx => blankIndices.add(idx));
  } else if (subMode === 'shuffle') {
    indices = shuffleArray(indices);
  }

  return indices.map((letterIdx, seqIdx) => {
    const u = UPPER_LETTERS[letterIdx];
    const l = LOWER_LETTERS[letterIdx];
    let targetEn = '';
    let promptZh = '';

    if (caseStyle === 'upper') {
      targetEn = u;
    } else if (caseStyle === 'lower') {
      targetEn = l;
    } else {
      targetEn = `${u} ${l}`;
    }

    if (subMode === 'full') {
      const typeLabel = caseStyle === 'upper' ? u : (caseStyle === 'lower' ? l : `${u}${l}`);
      promptZh = `第 ${letterIdx + 1} 字母 (${typeLabel})`;
    } else if (subMode === 'gap') {
      const isBlank = blankIndices.has(letterIdx);
      if (isBlank) {
        promptZh = `补全第 ${letterIdx + 1} 字母: [ ? ]`;
      } else {
        promptZh = `给出第 ${letterIdx + 1} 字母: ${caseStyle === 'pair' ? `${u}${l}` : targetEn}`;
      }
    } else if (subMode === 'shuffle') {
      promptZh = `听写字母 (书写四线格)`;
    }

    return createDraftItem({
      id: generateId('alpha'),
      type: 'word',
      en: targetEn,
      zh: promptZh,
      phonetic: '',
      alphaData: {
        letterIdx,
        seqIdx,
        upper: u,
        lower: l,
        targetEn,
        isBlank: subMode === 'gap' ? blankIndices.has(letterIdx) : (subMode === 'full' ? true : false),
        caseStyle,
        subMode
      }
    });
  });
}

/**
 * 2. 生成字母左右邻居默写题
 * @param {Object} options
 * @param {number} options.count 题量 (默认 9)
 * @param {string} options.caseStyle 'upper' | 'lower' | 'pair' | 'mix'
 * @param {string} options.neighborType 'both' (左右两邻) | 'middle' (中间字母) | 'pre' | 'post' | 'random'
 * @returns {Array} DraftItem 数组
 */
export function generateLetterNeighborsItems(options = {}) {
  const {
    count = 9,
    caseStyle = 'upper',
    neighborType = 'both'
  } = options;

  // 可作为中间已知字母的索引：1 (B/b) 到 24 (Y/y)
  const validMidIndices = Array.from({ length: 24 }, (_, i) => i + 1);
  const selectedIndices = shuffleArray(validMidIndices).slice(0, Math.min(count, 24));

  // 如果请求数量超过 24，则循环补充
  while (selectedIndices.length < count) {
    const remaining = count - selectedIndices.length;
    selectedIndices.push(...shuffleArray(validMidIndices).slice(0, remaining));
  }

  return selectedIndices.map((midIdx) => {
    // 决定当前题目的大小写
    let curCase = caseStyle;
    if (curCase === 'mix') {
      curCase = Math.random() > 0.5 ? 'upper' : 'lower';
    }

    const prevChar = curCase === 'lower'
      ? LOWER_LETTERS[midIdx - 1]
      : (curCase === 'pair' ? `${UPPER_LETTERS[midIdx - 1]}${LOWER_LETTERS[midIdx - 1]}` : UPPER_LETTERS[midIdx - 1]);

    const midChar = curCase === 'lower'
      ? LOWER_LETTERS[midIdx]
      : (curCase === 'pair' ? `${UPPER_LETTERS[midIdx]}${LOWER_LETTERS[midIdx]}` : UPPER_LETTERS[midIdx]);

    const nextChar = curCase === 'lower'
      ? LOWER_LETTERS[midIdx + 1]
      : (curCase === 'pair' ? `${UPPER_LETTERS[midIdx + 1]}${LOWER_LETTERS[midIdx + 1]}` : UPPER_LETTERS[midIdx + 1]);

    let type = neighborType;
    if (type === 'random') {
      const types = ['both', 'middle', 'pre', 'post'];
      type = types[Math.floor(Math.random() * types.length)];
    }

    let promptZh = '';
    let targetEn = '';

    if (type === 'both') {
      promptZh = `邻居: ___  ${midChar}  ___`;
      targetEn = `${prevChar}, ${nextChar}`;
    } else if (type === 'middle') {
      promptZh = `邻居: ${prevChar}  ___  ${nextChar}`;
      targetEn = midChar;
    } else if (type === 'pre') {
      promptZh = `邻居: ___  ${midChar}`;
      targetEn = prevChar;
    } else if (type === 'post') {
      promptZh = `邻居: ${midChar}  ___`;
      targetEn = nextChar;
    }

    return createDraftItem({
      id: generateId('neighbor'),
      type: 'word',
      en: targetEn,
      zh: promptZh,
      phonetic: '',
      neighborData: {
        type,
        midChar,
        prevChar,
        nextChar,
        curCase
      }
    });
  });
}

/**
 * 3. 生成字母大小写互换默写题
 * @param {Object} options
 * @param {number} options.count 题量 (默认 9)
 * @param {string} options.direction 'upper_to_lower' (给大写写小写) | 'lower_to_upper' (给小写写大写) | 'random_switch' (混合互换) | 'pair_write' (写大小写对)
 * @returns {Array} DraftItem 数组
 */
export function generateCaseConversionItems(options = {}) {
  const {
    count = 9,
    direction = 'upper_to_lower'
  } = options;

  const allIndices = Array.from({ length: 26 }, (_, i) => i);
  const selectedIndices = shuffleArray(allIndices).slice(0, Math.min(count, 26));

  while (selectedIndices.length < count) {
    const remaining = count - selectedIndices.length;
    selectedIndices.push(...shuffleArray(allIndices).slice(0, remaining));
  }

  return selectedIndices.map((idx) => {
    const u = UPPER_LETTERS[idx];
    const l = LOWER_LETTERS[idx];

    let dir = direction;
    if (dir === 'random_switch') {
      dir = Math.random() > 0.5 ? 'upper_to_lower' : 'lower_to_upper';
    }

    let promptZh = '';
    let targetEn = '';

    if (dir === 'upper_to_lower') {
      promptZh = `写小写:  ${u}  ➔  ___`;
      targetEn = l;
    } else if (dir === 'lower_to_upper') {
      promptZh = `写大写:  ${l}  ➔  ___`;
      targetEn = u;
    } else if (dir === 'pair_write') {
      promptZh = `大小写:  ${u}  ➔  ___`;
      targetEn = `${u} ${l}`;
    }

    return createDraftItem({
      id: generateId('case'),
      type: 'word',
      en: targetEn,
      zh: promptZh,
      phonetic: '',
      caseData: {
        dir,
        upper: u,
        lower: l,
        targetEn
      }
    });
  });
}

/**
 * 一键快捷预设场景套件
 */
export const ALPHABET_PRESETS = [
  {
    key: 'alpha_26_pair',
    title: '三年级英语 26个英文字母规范书写卷 (大小写)',
    description: '3行完整四线三格，每行9个字母，按 A 到 Z 顺序规范书写。',
    settings: {
      title: '三年级英语 26个英文字母规范书写卷 (大小写)',
      columns: 1,
      wordsPerPage: 26,
      copiesPerPage: 1
    },
    getItems: () => generateAlphabetSequenceItems({ caseStyle: 'pair', subMode: 'full' })
  },
  {
    key: 'alpha_26_gap',
    title: '三年级英语 26个英文字母接龙填空卷',
    description: '3行完整四线三格，每行9个字母，随机挖空 13 个位置考察接龙。',
    settings: {
      title: '三年级英语 26个英文字母接龙填空卷',
      columns: 1,
      wordsPerPage: 26,
      copiesPerPage: 1
    },
    getItems: () => generateAlphabetSequenceItems({ caseStyle: 'pair', subMode: 'gap', gapCount: 13 })
  },
  {
    key: 'alpha_neighbors_9',
    title: '三年级英语 字母左右邻居必考 9 题卷',
    description: '前后各留空，考查字母在字母表中的前驱与后继邻居。',
    settings: {
      title: '三年级英语 字母左右邻居专项练习卷',
      columns: 3,
      wordsPerPage: 9,
      copiesPerPage: 3
    },
    getItems: () => generateLetterNeighborsItems({ count: 9, caseStyle: 'upper', neighborType: 'both' })
  },
  {
    key: 'alpha_case_convert_9',
    title: '三年级英语 字母大小写转换专项 9 题卷',
    description: '随机大写转小写与小写转大写互换，快速夯实辨识度。',
    settings: {
      title: '三年级英语 字母大小写转换专项练习卷',
      columns: 3,
      wordsPerPage: 9,
      copiesPerPage: 3
    },
    getItems: () => generateCaseConversionItems({ count: 9, direction: 'random_switch' })
  }
];
