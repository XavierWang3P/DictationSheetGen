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
 * 1. 生成 26 个英文字母全默写题 (只保留全部默写，彻底剔除接龙填空和乱序听写)
 * @param {Object} options
 * @param {string} options.caseStyle 'pair' (Aa) | 'upper' (A) | 'lower' (a)
 * @param {number} options.rowMode 3 (3×9) | 4 (4×7)
 * @returns {Array} DraftItem 数组
 */
export function generateAlphabetSequenceItems(options = {}) {
  const {
    caseStyle = 'pair',
    rowMode = 3
  } = options;

  const indices = Array.from({ length: 26 }, (_, i) => i);

  return indices.map((letterIdx, seqIdx) => {
    const u = UPPER_LETTERS[letterIdx];
    const l = LOWER_LETTERS[letterIdx];
    let targetEn = '';

    if (caseStyle === 'upper') {
      targetEn = u;
    } else if (caseStyle === 'lower') {
      targetEn = l;
    } else {
      targetEn = `${u} ${l}`;
    }

    const promptZh = `第 ${letterIdx + 1} 字母`;

    return createDraftItem({
      id: generateId('alpha'),
      type: 'word',
      questionType: 'alphabet',
      subType: 'sequence',
      alphabetType: 'sequence',
      en: targetEn,
      zh: promptZh,
      phonetic: '',
      alphaData: {
        letterIdx,
        seqIdx,
        upper: u,
        lower: l,
        targetEn,
        isBlank: true,
        caseStyle,
        subMode: 'full',
        rowMode: Number(options.rowMode || rowMode) === 4 ? 4 : 3
      }
    });
  });
}

/**
 * 2. 生成前后字母默写题 (只保留每行 5 题固定布局)
 * @param {Object} options
 * @param {number} options.count 题量 (5, 10, 15, 20，默认 10)
 * @param {string} options.caseStyle 'upper' | 'lower' | 'pair' | 'mix'
 * @param {string} options.neighborType 'both' (左右两邻) | 'middle' (中间字母) | 'pre' | 'post' | 'random'
 * @param {string} options.layoutStyle 默认 'bottom-5col' (每行5题)
 * @returns {Array} DraftItem 数组
 */
export function generateLetterNeighborsItems(options = {}) {
  const {
    count = 10,
    caseStyle = 'upper',
    neighborType = 'both',
    layoutStyle = null,
    rowLayout = null
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
      promptZh = `${midChar} 的前后字母`;
      targetEn = `${prevChar}, ${nextChar}`;
    } else if (type === 'middle') {
      promptZh = `${prevChar}、${nextChar} 中间的字母`;
      targetEn = midChar;
    } else if (type === 'pre') {
      promptZh = `${midChar} 前面的字母`;
      targetEn = prevChar;
    } else if (type === 'post') {
      promptZh = `${midChar} 后面的字母`;
      targetEn = nextChar;
    }

    const effectiveLayout = layoutStyle || rowLayout || 'bottom-5col';
    const columns = effectiveLayout === 'bottom-5col' ? 5 : (effectiveLayout === 'right-2col' ? 2 : 4);
    const gridPosition = effectiveLayout === 'right-2col' ? 'right' : 'below';

    return createDraftItem({
      id: generateId('neighbor'),
      type: 'word',
      questionType: 'alphabet',
      subType: 'neighbor',
      alphabetType: 'neighbor',
      en: targetEn,
      zh: promptZh,
      prompt: promptZh,
      phonetic: '',
      layout: { columns, gridPosition },
      neighborData: {
        type,
        midChar,
        prevChar,
        nextChar,
        curCase,
        layoutStyle: effectiveLayout
      }
    });
  });
}

/**
 * 3. 生成字母大小写互换默写题 (默认“混合”，题目在左四线三格在右，1行显示每行4题)
 * @param {Object} options
 * @param {number} options.count 题量 (默认 8)
 * @param {string} options.direction 默认 'random_switch' (混合互换) | 'upper_to_lower' | 'lower_to_upper'
 * @param {string} options.layoutStyle 默认 'right-4col' (题目左四线格右，每行4题)
 * @returns {Array} DraftItem 数组
 */
export function generateCaseConversionItems(options = {}) {
  const {
    count = 8,
    direction = 'random_switch',
    layoutStyle = 'right-4col',
    rowLayout = null
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
      promptZh = `${u} 的小写`;
      targetEn = l;
    } else if (dir === 'lower_to_upper') {
      promptZh = `${l} 的大写`;
      targetEn = u;
    } else {
      promptZh = `${u} 的小写`;
      targetEn = l;
    }

    const effectiveLayout = layoutStyle || rowLayout || 'right-4col';
    const columns = effectiveLayout === 'bottom-5col' ? 5 : (effectiveLayout === 'right-2col' ? 2 : 4);
    const gridPosition = 'right';

    return createDraftItem({
      id: generateId('case'),
      type: 'word',
      questionType: 'alphabet',
      subType: 'case',
      alphabetType: 'case',
      en: targetEn,
      zh: promptZh,
      prompt: promptZh,
      phonetic: '',
      layout: { columns, gridPosition },
      caseData: {
        dir,
        upper: u,
        lower: l,
        sourceChar: (dir === 'lower_to_upper') ? l : u,
        targetChar: targetEn,
        layoutStyle: effectiveLayout
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
    getItems: () => generateAlphabetSequenceItems({ caseStyle: 'pair' })
  },
  {
    key: 'alpha_neighbors_9',
    title: '三年级英语 前后字母练习卷',
    description: '写出中间字母前面和后面的字母，每行 5 题。',
    settings: {
      title: '三年级英语 前后字母专项练习卷',
      columns: 5,
      wordsPerPage: 10,
      copiesPerPage: 2
    },
    getItems: () => generateLetterNeighborsItems({ count: 10, caseStyle: 'upper', neighborType: 'both' })
  },
  {
    key: 'alpha_case_convert_9',
    title: '三年级英语 字母大小写转换专项卷',
    description: '大写转小写与小写转大写混合互换，左提示右四线格，每行4题。',
    settings: {
      title: '三年级英语 字母大小写转换专项练习卷',
      columns: 4,
      wordsPerPage: 8,
      copiesPerPage: 2
    },
    getItems: () => generateCaseConversionItems({ count: 8, direction: 'random_switch' })
  }
];
