// 唯一 ID 生成器
export function generateId(prefix = 'item') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

export function stripOuterBrackets(str) {
  if (!str) return '';
  let s = String(str).trim();
  while ((s.startsWith('（') && s.endsWith('）')) || (s.startsWith('(') && s.endsWith(')'))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

// 句子解析为结构化片段 (segments)
export function parseSentenceToSegments(rawText) {
  const sentence = (rawText || '').trim();
  if (!sentence) return [];

  const segments = [];
  const bracketRegex = /(\[([^\]]+)\]|\{([^}]+)\})([.,!?;:'"”]*)?/g;

  if (sentence.search(/\[([^\]]+)\]|\{([^}]+)\}/) !== -1) {
    let lastIndex = 0;
    let match;
    while ((match = bracketRegex.exec(sentence)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          text: sentence.substring(lastIndex, match.index),
          blank: false
        });
      }
      let blankContent = (match[2] || match[3] || '').trim();
      let punct = match[4] || '';
      // 剥离括号内部末尾可能包含的句末标点（例如 [help.]）
      const innerPunctMatch = blankContent.match(/([.,!?;:'"”]+)$/);
      if (innerPunctMatch) {
        punct = innerPunctMatch[1] + punct;
        blankContent = blankContent.slice(0, -innerPunctMatch[1].length).trim();
      }
      segments.push({
        text: blankContent,
        blank: true
      });
      if (punct) {
        segments.push({
          text: punct,
          blank: false
        });
      }
      lastIndex = bracketRegex.lastIndex;
    }
    if (lastIndex < sentence.length) {
      segments.push({
        text: sentence.substring(lastIndex),
        blank: false
      });
    }
    return segments;
  }

  // 下划线
  if (sentence.includes('___') || sentence.includes('——')) {
    const underRegex = /(_{2,}|——+)([.,!?;:'"”]*)?/g;
    let lastIndex = 0;
    let match;
    while ((match = underRegex.exec(sentence)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          text: sentence.substring(lastIndex, match.index),
          blank: false
        });
      }
      const punct = match[2] || '';
      segments.push({
        text: 'blank',
        blank: true
      });
      if (punct) {
        segments.push({
          text: punct,
          blank: false
        });
      }
      lastIndex = underRegex.lastIndex;
    }
    if (lastIndex < sentence.length) {
      segments.push({
        text: sentence.substring(lastIndex),
        blank: false
      });
    }
    return segments;
  }

  // 单词数 >= 3 自动挖空句子中间词
  const words = sentence.split(/\s+/);
  if (words.length >= 3) {
    const blankStart = 1;
    const blankCount = (words.length >= 5) ? 2 : 1;
    const beforeWords = words.slice(0, blankStart).join(' ');
    let blankWords = words.slice(blankStart, blankStart + blankCount).join(' ');
    const afterWords = words.slice(blankStart + blankCount).join(' ');

    let punct = '';
    const pMatch = blankWords.match(/([.,!?;:'"”]+)$/);
    if (pMatch) {
      punct = pMatch[1];
      blankWords = blankWords.slice(0, -punct.length);
    }

    segments.push({ text: beforeWords + ' ', blank: false });
    segments.push({ text: blankWords, blank: true });
    if (punct) {
      segments.push({ text: punct + (afterWords ? ' ' + afterWords : ''), blank: false });
    } else if (afterWords) {
      segments.push({ text: ' ' + afterWords, blank: false });
    }
    return segments;
  }

  let cleanSentence = sentence;
  let endPunct = '';
  const pMatch = sentence.match(/([.,!?;:'"”]+)$/);
  if (pMatch) {
    endPunct = pMatch[1];
    cleanSentence = sentence.slice(0, -endPunct.length);
  }
  const result = [{ text: cleanSentence, blank: true }];
  if (endPunct) {
    result.push({ text: endPunct, blank: false });
  }
  return result;
}

export function segmentsToMarkedText(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return '';
  return segments.map(seg => seg.blank ? `[${seg.text}]` : seg.text).join('');
}

// 可视化切词胶囊解析
export function parseSentenceIntoVisualTokens(rawText) {
  const text = (rawText || '').trim();
  if (!text) return [];

  const tokenRegex = /([a-zA-Z0-9'’-]+|[^\s\w]+|\s+)/g;
  const matches = text.match(tokenRegex) || [];

  let inBracket = false;
  const tokens = [];

  matches.forEach((tok, idx) => {
    if (tok === '[' || tok === '{') {
      inBracket = true;
      return;
    }
    if (tok === ']' || tok === '}') {
      inBracket = false;
      return;
    }
    const isWord = /^[a-zA-Z0-9'’-]+$/.test(tok);
    tokens.push({
      id: idx,
      text: tok,
      isWord: isWord,
      isBlank: isWord && inBracket
    });
  });

  return tokens;
}

// 由可视化胶囊计算 segments
export function getVisualSegments(tokens) {
  for (let i = 1; i < tokens.length - 1; i++) {
    if (!tokens[i].isWord && /^\s+$/.test(tokens[i].text)) {
      if (tokens[i - 1] && tokens[i - 1].isBlank && tokens[i + 1] && tokens[i + 1].isBlank) {
        tokens[i].isBlank = true;
      } else {
        tokens[i].isBlank = false;
      }
    }
  }

  const segments = [];
  let curText = '';
  let curBlank = null;

  tokens.forEach(t => {
    const b = !!t.isBlank;
    if (curBlank === null) {
      curBlank = b;
      curText = t.text;
    } else if (curBlank === b) {
      curText += t.text;
    } else {
      segments.push({ text: curText, blank: curBlank });
      curBlank = b;
      curText = t.text;
    }
  });

  if (curText) {
    segments.push({ text: curText, blank: curBlank });
  }

  return segments;
}

// 快速多行文本解析
export function parseCustomText(rawText, currentMode = 'writing') {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split('\n');
  const results = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('#') || trimmed.startsWith('//')) return;

    let en = '';
    let zh = '';
    let phonetic = '';

    // 格式 1: 包含分隔符 '|' 或 ' - '
    if (trimmed.includes('|')) {
      const parts = trimmed.split('|');
      en = parts[0].trim();
      zh = parts.slice(1).join('|').trim();
    } else if (trimmed.includes(' - ')) {
      const parts = trimmed.split(' - ');
      en = parts[0].trim();
      zh = parts.slice(1).join(' - ').trim();
    } else {
      // 格式 2: 正则提取音标 /.../ 或 [...]
      const phoneticMatch = trimmed.match(/(\/[^/]+\/|\[[^\]]+\])/);
      if (phoneticMatch && !trimmed.includes('[')) {
        phonetic = phoneticMatch[1];
        const beforePhonetic = trimmed.substring(0, phoneticMatch.index).trim();
        const afterPhonetic = trimmed.substring(phoneticMatch.index + phoneticMatch[0].length).trim();
        en = beforePhonetic;
        zh = afterPhonetic;
      } else {
        // 格式 3: 中英文混合
        const firstZhMatch = trimmed.search(/[\u4e00-\u9fa5]/);
        if (firstZhMatch > 0) {
          en = trimmed.substring(0, firstZhMatch).trim();
          zh = trimmed.substring(firstZhMatch).trim();
        } else if (firstZhMatch === 0) {
          en = '';
          zh = trimmed;
        } else {
          // 纯英文
          en = trimmed;
          zh = '';
        }
      }
    }

    // 句型判断
    const hasBracket = en && (en.includes('[') || en.includes('{'));
    const isSentence = hasBracket || (currentMode === 'cloze' && en && en.split(/\s+/).length > 2);

    if (isSentence) {
      const cleanZh = stripOuterBrackets(zh);
      const segments = parseSentenceToSegments(en);
      results.push({
        id: generateId('s'),
        type: 'sentence',
        en: en,
        zh: cleanZh,
        translation: cleanZh,
        segments: segments,
        rawText: trimmed
      });
    } else {
      results.push({
        id: generateId('w'),
        type: 'word',
        en: en,
        zh: stripOuterBrackets(zh),
        phonetic: phonetic,
        rawText: trimmed
      });
    }
  });

  return results;
}
