export const DEFAULT_ALPHABET_GUIDE_FONT = 'Shuyao Italic, cursive';

export const EMBEDDED_HANDWRITING_FONTS = Object.freeze([
  {
    id: 'shuyao-hengshui',
    label: '舒窈英文衡水体',
    cssFamily: 'Shuyao Hengshui, cursive',
    // 64.65% cap height: enlarge the em so capitals still span the upper two zones.
    guideScale: 0.89,
    supportsGuideOverlay: true
  },
  {
    id: 'shuyao-italic',
    label: '舒窈意大利斜体（推荐）',
    cssFamily: DEFAULT_ALPHABET_GUIDE_FONT,
    // 82.03% cap height and 43.85% x-height closely match the current 14.5:8 grid ratio.
    guideScale: 0.707,
    supportsGuideOverlay: true
  },
  {
    id: 'shuyao-italic-four-line',
    label: '舒窈意大利斜体★四线三格（自带格线）',
    cssFamily: 'Shuyao Italic Four Line, cursive',
    guideScale: 0.707,
    supportsGuideOverlay: false
  },
  {
    id: 'xumin-regular',
    label: 'xumin 字体',
    cssFamily: 'Xumin Regular, cursive',
    guideScale: 0.707,
    supportsGuideOverlay: true
  },
  {
    id: 'xumin-linglish',
    label: 'xumin Linglish',
    cssFamily: 'Xumin Linglish, cursive',
    guideScale: 0.707,
    supportsGuideOverlay: true
  }
]);

export const ALPHABET_GUIDE_FONT_OPTIONS = Object.freeze(
  EMBEDDED_HANDWRITING_FONTS.filter(font => font.supportsGuideOverlay)
);

const GUIDE_FONT_MAP = new Map(
  ALPHABET_GUIDE_FONT_OPTIONS.map(font => [font.cssFamily, font])
);

export function resolveAlphabetGuideFont(fontFamily) {
  const requested = String(fontFamily || '').replace(/["']/g, '').trim();
  return GUIDE_FONT_MAP.get(requested) || GUIDE_FONT_MAP.get(DEFAULT_ALPHABET_GUIDE_FONT);
}
