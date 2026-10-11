import {
  contrastRatio,
  isPaletteColor,
  SURFACES,
  UNIVERSE_PALETTE,
} from '@utils/palette';
import { TIMELINE_COLORS } from '@utils/timelineGraph';

describe('universe palette', () => {
  it.each(UNIVERSE_PALETTE.map((c) => [c.name, c.value]))(
    '%s is readable as small text on every surface',
    (_name, value) => {
      SURFACES.forEach((surface) =>
        expect(contrastRatio(value, surface)).toBeGreaterThanOrEqual(7),
      );
    },
  );

  it('gives universes their default colours from the palette', () => {
    TIMELINE_COLORS.forEach((c) => expect(isPaletteColor(c)).toBe(true));
  });

  it('knows a palette colour from anything else', () => {
    expect(isPaletteColor('#7DFF9B')).toBe(true);
    expect(isPaletteColor('#ff0000')).toBe(false);
    expect(isPaletteColor('red')).toBe(false);
  });

  it('measures contrast the WCAG way', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });
});
