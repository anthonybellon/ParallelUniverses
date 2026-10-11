/**
 * Colours a universe can have. Each one stays readable as small text on the
 * terminal screen: at least 7:1 contrast (WCAG AAA) against the darkest and
 * the lightest surfaces it is drawn on. A test checks this.
 */
export const UNIVERSE_PALETTE = [
  { name: 'Phosphor green', value: '#7dff9b' },
  { name: 'Amber', value: '#ffb347' },
  { name: 'Cyan', value: '#5ee7ff' },
  { name: 'Pink', value: '#ff8fe0' },
  { name: 'Pale yellow', value: '#f4f1a6' },
  { name: 'Violet', value: '#bfaeff' },
  { name: 'Coral', value: '#ff9a8c' },
  { name: 'Lime', value: '#c3f56b' },
  { name: 'Sky', value: '#8ec5ff' },
  { name: 'Mint', value: '#7af5d6' },
  { name: 'Orange', value: '#ff9f5a' },
  { name: 'Ice', value: '#e8f0ff' },
] as const;

export const PALETTE_VALUES: string[] = UNIVERSE_PALETTE.map((c) => c.value);

export const isPaletteColor = (value: unknown): value is string =>
  typeof value === 'string' && PALETTE_VALUES.includes(value.toLowerCase());

/** Surfaces universe colours are drawn on: the screen and a lit lane band. */
export const SURFACES = ['#050a06', '#12291a'];

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio between two #rrggbb colours. */
export const contrastRatio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Applies the colours people picked over the default ones. */
export const withColorOverrides = <T extends { color: string }>(
  meta: Record<string, T>,
  overrides: Record<string, string>,
): Record<string, T> =>
  Object.fromEntries(
    Object.entries(meta).map(([id, m]) => [
      id,
      isPaletteColor(overrides[id]) ? { ...m, color: overrides[id] } : m,
    ]),
  );

/** Keeps only valid colour choices, for loading saved or imported data. */
export const parseColorOverrides = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, c]) => isPaletteColor(c))
      .map(([id, c]) => [id, (c as string).toLowerCase()]),
  );
};
