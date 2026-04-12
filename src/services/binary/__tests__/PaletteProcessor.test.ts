import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock RomProcessor before importing PaletteProcessor
vi.mock('../RomProcessor', () => ({
  RomProcessor: {
    findPaletteOffset: vi.fn().mockReturnValue(0x100),
    findPaletteNameOffset: vi.fn().mockReturnValue(0x1000),
    getNumberOfPalettes: vi.fn().mockReturnValue(3),
  },
}));

import { PaletteProcessor } from '../PaletteProcessor';

describe('PaletteProcessor', () => {
  // Create a buffer large enough to hold palette + name data
  // Palette data starts at 0x100, names at 0x1000
  const BUFFER_SIZE = 0x2000;
  let romData: ArrayBuffer;
  let processor: PaletteProcessor;

  beforeEach(() => {
    romData = new ArrayBuffer(BUFFER_SIZE);
    processor = new PaletteProcessor(romData);
  });

  describe('getColor / setColor roundtrip', () => {
    it('should roundtrip pure red (r=31, g=0, b=0)', () => {
      processor.setColor(0, 0, 0, { r: 31, g: 0, b: 0 });
      const color = processor.getColor(0, 0, 0);
      expect(color).toEqual({ r: 31, g: 0, b: 0 });
    });

    it('should roundtrip pure green (r=0, g=31, b=0)', () => {
      processor.setColor(0, 0, 0, { r: 0, g: 31, b: 0 });
      const color = processor.getColor(0, 0, 0);
      expect(color).toEqual({ r: 0, g: 31, b: 0 });
    });

    it('should roundtrip pure blue (r=0, g=0, b=31)', () => {
      processor.setColor(0, 0, 0, { r: 0, g: 0, b: 31 });
      const color = processor.getColor(0, 0, 0);
      expect(color).toEqual({ r: 0, g: 0, b: 31 });
    });

    it('should roundtrip all zeros', () => {
      processor.setColor(0, 0, 0, { r: 0, g: 0, b: 0 });
      const color = processor.getColor(0, 0, 0);
      expect(color).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('should roundtrip all max (31, 31, 31)', () => {
      processor.setColor(0, 0, 0, { r: 31, g: 31, b: 31 });
      const color = processor.getColor(0, 0, 0);
      expect(color).toEqual({ r: 31, g: 31, b: 31 });
    });

    it('should roundtrip mixed values', () => {
      processor.setColor(0, 0, 0, { r: 15, g: 22, b: 8 });
      const color = processor.getColor(0, 0, 0);
      expect(color).toEqual({ r: 15, g: 22, b: 8 });
    });

    it('should handle foreground color (index 2)', () => {
      processor.setColor(0, 0, 2, { r: 10, g: 20, b: 5 });
      const color = processor.getColor(0, 0, 2);
      expect(color).toEqual({ r: 10, g: 20, b: 5 });
    });

    it('should store different colors in different color sets', () => {
      processor.setColor(0, 0, 0, { r: 1, g: 2, b: 3 });
      processor.setColor(0, 1, 0, { r: 10, g: 20, b: 30 });
      processor.setColor(0, 2, 0, { r: 5, g: 15, b: 25 });

      expect(processor.getColor(0, 0, 0)).toEqual({ r: 1, g: 2, b: 3 });
      expect(processor.getColor(0, 1, 0)).toEqual({ r: 10, g: 20, b: 30 });
      expect(processor.getColor(0, 2, 0)).toEqual({ r: 5, g: 15, b: 25 });
    });

    it('should store different colors in different palettes', () => {
      processor.setColor(0, 0, 0, { r: 1, g: 2, b: 3 });
      processor.setColor(1, 0, 0, { r: 10, g: 20, b: 30 });

      expect(processor.getColor(0, 0, 0)).toEqual({ r: 1, g: 2, b: 3 });
      expect(processor.getColor(1, 0, 0)).toEqual({ r: 10, g: 20, b: 30 });
    });
  });

  describe('RGB555 bit layout', () => {
    it('should encode correctly: gggrrrrr 0bbbbbgg', () => {
      // Set a known color and verify the raw bytes
      // r=31 (0x1F), g=0, b=0 → byte1=0x1F, byte2=0x00
      processor.setColor(0, 0, 0, { r: 31, g: 0, b: 0 });
      const view = new Uint8Array(romData);
      const offset = 0x100; // palette offset for palette 0, colorSet 0, bg
      expect(view[offset]).toBe(0x1F);     // gggrrrrr = 000_11111
      expect(view[offset + 1]).toBe(0x00); // 0bbbbbgg = 0_00000_00

      // r=0, g=31, b=0 → byte1=0xE0, byte2=0x03
      processor.setColor(0, 0, 0, { r: 0, g: 31, b: 0 });
      expect(view[offset]).toBe(0xE0);     // gggrrrrr = 111_00000
      expect(view[offset + 1]).toBe(0x03); // 0bbbbbgg = 0_00000_11

      // r=0, g=0, b=31 → byte1=0x00, byte2=0x7C
      processor.setColor(0, 0, 0, { r: 0, g: 0, b: 31 });
      expect(view[offset]).toBe(0x00);     // gggrrrrr = 000_00000
      expect(view[offset + 1]).toBe(0x7C); // 0bbbbbgg = 0_11111_00
    });
  });

  describe('setColor mid-tone recalculation', () => {
    it('should auto-calculate mid-tone when setting bg', () => {
      // Set bg and fg first
      processor.setColor(0, 0, 2, { r: 0, g: 0, b: 0 }); // fg = black
      processor.setColor(0, 0, 0, { r: 31, g: 31, b: 31 }); // bg = white

      const mid = processor.getColor(0, 0, 1);
      // Mid = 55% bg + 45% fg = floor(31*0.55) = 17, floor(0*0.45) = 0 → 17
      expect(mid.r).toBe(17);
      expect(mid.g).toBe(17);
      expect(mid.b).toBe(17);
    });

    it('should auto-calculate mid-tone when setting fg', () => {
      processor.setColor(0, 0, 0, { r: 0, g: 0, b: 0 }); // bg = black
      processor.setColor(0, 0, 2, { r: 31, g: 31, b: 31 }); // fg = white

      const mid = processor.getColor(0, 0, 1);
      // Mid = 55% bg + 45% fg = floor(0*0.55 + 31*0.45) = floor(13.95) = 13
      expect(mid.r).toBe(13);
      expect(mid.g).toBe(13);
      expect(mid.b).toBe(13);
    });

    it('should not recalculate mid when setting mid directly', () => {
      processor.setColor(0, 0, 0, { r: 0, g: 0, b: 0 });
      processor.setColor(0, 0, 2, { r: 31, g: 31, b: 31 });
      // Override mid manually
      processor.setColor(0, 0, 1, { r: 10, g: 10, b: 10 });

      const mid = processor.getColor(0, 0, 1);
      expect(mid.r).toBe(10);
      expect(mid.g).toBe(10);
      expect(mid.b).toBe(10);
    });
  });

  describe('validation', () => {
    it('should throw on invalid palette index', () => {
      expect(() => processor.getColor(-1, 0, 0)).toThrow('Invalid palette index');
      expect(() => processor.getColor(3, 0, 0)).toThrow('Invalid palette index');
    });

    it('should throw on invalid color set index', () => {
      expect(() => processor.getColor(0, -1, 0)).toThrow('Invalid color set index');
      expect(() => processor.getColor(0, 5, 0)).toThrow('Invalid color set index');
    });

    it('should throw on invalid color index', () => {
      expect(() => processor.getColor(0, 0, -1)).toThrow('Invalid color index');
      expect(() => processor.getColor(0, 0, 3)).toThrow('Invalid color index');
    });
  });

  describe('getPaletteName / setPaletteName', () => {
    it('should write and read back a palette name', () => {
      processor.setPaletteName(0, 'TEST');
      expect(processor.getPaletteName(0)).toBe('TEST');
    });

    it('should uppercase the name', () => {
      processor.setPaletteName(0, 'test');
      expect(processor.getPaletteName(0)).toBe('TEST');
    });

    it('should truncate names longer than 4 chars', () => {
      processor.setPaletteName(0, 'TOOLONG');
      expect(processor.getPaletteName(0)).toBe('TOOL');
    });

    it('should pad short names with spaces', () => {
      processor.setPaletteName(0, 'AB');
      expect(processor.getPaletteName(0)).toBe('AB  ');
    });

    it('should throw on invalid palette index', () => {
      expect(() => processor.setPaletteName(-1, 'TEST')).toThrow();
      expect(() => processor.setPaletteName(3, 'TEST')).toThrow();
    });

    it('should store independent names per palette', () => {
      processor.setPaletteName(0, 'AAA');
      processor.setPaletteName(1, 'BBB');
      processor.setPaletteName(2, 'CCC');

      expect(processor.getPaletteName(0)).toBe('AAA ');
      expect(processor.getPaletteName(1)).toBe('BBB ');
      expect(processor.getPaletteName(2)).toBe('CCC ');
    });
  });

  describe('getNumberOfPalettes', () => {
    it('should return the mocked palette count', () => {
      expect(processor.getNumberOfPalettes()).toBe(3);
    });
  });

  describe('getPaletteNames', () => {
    it('should return names for all palettes', () => {
      processor.setPaletteName(0, 'ONE');
      processor.setPaletteName(1, 'TWO');
      processor.setPaletteName(2, 'TRE');

      const names = processor.getPaletteNames();
      expect(names).toHaveLength(3);
      expect(names[0]).toBe('ONE ');
      expect(names[1]).toBe('TWO ');
      expect(names[2]).toBe('TRE ');
    });
  });

  describe('isPaletteNameUsed', () => {
    it('should return true when name exists', () => {
      processor.setPaletteName(0, 'TEST');
      expect(processor.isPaletteNameUsed('TEST')).toBe(true);
    });

    it('should be case-insensitive', () => {
      processor.setPaletteName(0, 'TEST');
      expect(processor.isPaletteNameUsed('test')).toBe(true);
    });

    it('should return false when name does not exist', () => {
      processor.setPaletteName(0, 'AAA');
      expect(processor.isPaletteNameUsed('ZZZ')).toBe(false);
    });

    it('should respect excludeIndex', () => {
      processor.setPaletteName(0, 'TEST');
      expect(processor.isPaletteNameUsed('TEST', 0)).toBe(false);
    });
  });

  describe('generateUniquePaletteName', () => {
    it('should return base name if not taken', () => {
      const name = processor.generateUniquePaletteName('NEW');
      expect(name).toBe('NEW ');
    });

    it('should add number suffix when base is taken', () => {
      processor.setPaletteName(0, 'TEST');
      const name = processor.generateUniquePaletteName('TEST');
      expect(name).toBe('TES1');
    });
  });

  describe('getColorSet / setColorSet', () => {
    it('should roundtrip a color set', () => {
      const bg = { r: 5, g: 10, b: 15 };
      const fg = { r: 25, g: 20, b: 10 };

      processor.setColorSet(0, 0, { background: bg, mid: { r: 0, g: 0, b: 0 }, foreground: fg });

      const colorSet = processor.getColorSet(0, 0);
      expect(colorSet.background).toEqual(bg);
      expect(colorSet.foreground).toEqual(fg);
      // Mid is auto-calculated, not the one we passed
      expect(colorSet.mid).toBeDefined();
    });
  });

  describe('getPalette / setPalette', () => {
    it('should roundtrip a full palette', () => {
      const makeColorSet = (r: number) => ({
        background: { r, g: 0, b: 0 },
        mid: { r: 0, g: 0, b: 0 },
        foreground: { r: 0, g: 0, b: r },
      });

      const palette = {
        normal: makeColorSet(1),
        shaded: makeColorSet(5),
        alternate: makeColorSet(10),
        cursor: makeColorSet(15),
        scrollbar: makeColorSet(20),
        name: 'FULL',
      };

      processor.setPalette(0, palette);
      const result = processor.getPalette(0);

      expect(result.name).toBe('FULL');
      expect(result.normal.background.r).toBe(1);
      expect(result.shaded.background.r).toBe(5);
      expect(result.alternate.background.r).toBe(10);
      expect(result.cursor.background.r).toBe(15);
      expect(result.scrollbar.background.r).toBe(20);
      expect(result.normal.foreground.b).toBe(1);
    });
  });
});
