import {describe, expect, it} from 'vitest';
import {BinaryProcessor} from '../BinaryProcessor';
import {ROM_CONSTANTS, RomProcessor} from '../RomProcessor';

describe('RomProcessor', () => {
  // Create a more complete mock ROM with palette and font data
  const createFullMockRomBuffer = (): ArrayBuffer => {
    // Create a buffer with 32 banks (enough for fonts)
    const buffer = new ArrayBuffer(32 * ROM_CONSTANTS.BANK_SIZE);
    const view = new DataView(buffer);

    // Set ROM title and version
    const title = 'LSDJ v8.5.1';
    for (let i = 0; i < title.length; i++) {
      view.setUint8(0x134 + i, title.charCodeAt(i));
    }
    view.setUint8(0x14C, 0x85);

    // Add grayscale palette names in bank 27
    const paletteNamesOffset = 27 * ROM_CONSTANTS.BANK_SIZE + 100;

    // Create a pattern that matches what findGrayscalePaletteNames looks for
    // Non-zero bytes at positions 0-3, 5-8, 10-13
    // Zero bytes at positions 4, 9, 14
    for (let i = 0; i < 15; i++) {
      view.setUint8(paletteNamesOffset + i, i % 5 === 4 ? 0 : 65 + (i % 4)); // 'A', 'B', 'C', 'D', 0, 'A', ...
    }

    // Add zeros after the pattern for getNumberOfPalettes
    for (let i = 0; i < 20; i++) {
      view.setUint8(paletteNamesOffset + 15 + i, i % 5 === 0 ? 0 : 0);
    }

    // Add palette data in bank 1
    const screenBackgroundOffset = ROM_CONSTANTS.BANK_SIZE + 1000;
    // Create 17 zeros followed by three 72s
    for (let i = 0; i < 20; i++) {
      view.setUint8(screenBackgroundOffset + i, i >= 17 ? 72 : 0);
    }

    // Add font data in bank 30
    const fontOffset = 30 * ROM_CONSTANTS.BANK_SIZE + 100;
    view.setUint8(fontOffset, 1);
    view.setUint8(fontOffset + 1, 46);
    view.setUint8(fontOffset + 2, 0);
    view.setUint8(fontOffset + 3, 1);

    return buffer;
  };

  describe('parseRom', () => {
    it('should parse basic ROM information correctly', () => {
      const romBuffer = createFullMockRomBuffer();
      const romInfo = RomProcessor.parseRom(romBuffer);

      expect(romInfo.title).toBe('LSDJ v8.5.1');
      expect(romInfo.version).toBe('v85');
      expect(romInfo.isValid).toBe(true);
      expect(romInfo.size).toBe(32 * ROM_CONSTANTS.BANK_SIZE);
      expect(romInfo.banks).toBe(32);
      expect(romInfo.hasPalettes).toBe(true); // Our basic mock doesn't have palettes
      expect(romInfo.hasFonts).toBe(true); // Our basic mock doesn't have fonts
    });

    it('should handle invalid ROM sizes', () => {
      // Create a buffer with an invalid size (not a multiple of BANK_SIZE)
      const buffer = new ArrayBuffer(ROM_CONSTANTS.BANK_SIZE + 100);
      const romInfo = RomProcessor.parseRom(buffer);

      expect(romInfo.isValid).toBe(false);
      expect(romInfo.banks).toBe(0);
    });
  });

  describe('utility functions', () => {
    let processor: BinaryProcessor;

    beforeEach(() => {
      processor = new BinaryProcessor(createFullMockRomBuffer());
    });

    it('should find grayscale palette names', () => {
      const offset = RomProcessor.findGrayscalePaletteNames(processor);
      expect(offset).toBe(27 * ROM_CONSTANTS.BANK_SIZE + 115); // 100 + 15
    });

    it('should get the number of palettes', () => {
      const numPalettes = RomProcessor.getNumberOfPalettes(processor);
      expect(numPalettes).toBeGreaterThan(0);
    });

    it('should find palette name offset', () => {
      const offset = RomProcessor.findPaletteNameOffset(processor);
      expect(offset).toBeGreaterThan(0);
    });

    it('should find screen background data', () => {
      const offset = RomProcessor.findScreenBackgroundData(processor);
      expect(offset).toBe(ROM_CONSTANTS.BANK_SIZE + 1000);
    });

    it('should find palette offset', () => {
      const offset = RomProcessor.findPaletteOffset(processor);
      expect(offset).toBeGreaterThan(0);
    });

    it('should find font offset', () => {
      const offset = RomProcessor.findFontOffset(processor);
      expect(offset).toBeGreaterThan(0);
    });

    it('should find graphics font offset', () => {
      const offset = RomProcessor.findGfxFontOffset(processor);
      expect(offset).toBe(30 * ROM_CONSTANTS.BANK_SIZE + 100 + 2 + 8 * 16);
    });
  });
});
