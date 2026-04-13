import {beforeEach, describe, expect, it} from 'vitest';
import {BinaryProcessor} from '../BinaryProcessor';
import {ROM_CONSTANTS, RomProcessor} from '../RomProcessor';

describe('RomProcessor', () => {
  // Palette name pattern offset within bank 27 (arbitrary, just needs to be found by scan)
  const PALETTE_NAMES_INTRA_BANK_OFFSET = 0x200;
  const PALETTE_NAMES_OFFSET = 27 * ROM_CONSTANTS.BANK_SIZE + PALETTE_NAMES_INTRA_BANK_OFFSET;

  // We'll create 2 palettes worth of data
  const NUM_PALETTES = 2;

  // Screen background is in bank 1 — placed after palette data
  // paletteOffset = screenBackgroundOffset - NUM_PALETTES * PALETTE_SIZE
  // We pick a screen background offset and derive palette offset from it
  const SCREEN_BG_OFFSET = ROM_CONSTANTS.BANK_SIZE + 1000;

  // Font magic in bank 30
  const FONT_MAGIC_INTRA_BANK_OFFSET = 0x100;
  const FONT_MAGIC_OFFSET = 30 * ROM_CONSTANTS.BANK_SIZE + FONT_MAGIC_INTRA_BANK_OFFSET;

  /**
   * Create a 64-bank ROM buffer with realistic data placed at correct offsets.
   * No test-environment shortcuts — the real search algorithms must find these patterns.
   */
  const createFullMockRomBuffer = (): ArrayBuffer => {
    const buffer = new ArrayBuffer(64 * ROM_CONSTANTS.BANK_SIZE);
    const view = new Uint8Array(buffer);

    // --- ROM header ---
    const title = 'LSDJ v8.5.1';
    for (let i = 0; i < title.length; i++) {
      view[0x134 + i] = title.charCodeAt(i);
    }
    view[0x14C] = 0x85; // version

    // --- Bank 27: Grayscale palette names pattern ---
    // Pattern: 3 groups of [4 non-zero, 1 zero] = 15 bytes
    // "ABCD\0EFGH\0IJKL\0"
    const patternStart = PALETTE_NAMES_OFFSET;
    const nameChars = [
      65, 66, 67, 68, 0,  // ABCD + null
      69, 70, 71, 72, 0,  // EFGH + null
      73, 74, 75, 76, 0,  // IJKL + null
    ];
    for (let i = 0; i < nameChars.length; i++) {
      view[patternStart + i] = nameChars[i];
    }

    // After the pattern (offset patternStart + 15), getNumberOfPalettes counts
    // groups where every 5th byte is 0. We need NUM_PALETTES * 2 such groups.
    // (numPalettes = floor(count / 2))
    const countStart = patternStart + 15;
    // Write 4 groups of zero-terminated 5-byte name blocks
    // (4 groups => floor(4/2) = 2 palettes)
    for (let g = 0; g < NUM_PALETTES * 2; g++) {
      const base = countStart + g * 5;
      // First 4 bytes can be anything (palette names) — use non-zero so they look like names
      view[base + 0] = 80 + g; // 'P', 'Q', 'R', 'S'
      view[base + 1] = 65;     // 'A'
      view[base + 2] = 76;     // 'L'
      view[base + 3] = g + 49; // '1', '2', '3', '4'
      view[base + 4] = 0;      // null terminator — this is what the loop checks
    }
    // Fill the area after palette data with 0xFF to stop the counting loop.
    // The loop checks every 5th byte, so we need several non-zero bytes.
    const dataEnd = countStart + NUM_PALETTES * 2 * 5;
    for (let i = 0; i < 32; i++) {
      view[dataEnd + i] = 0xFF;
    }

    // --- Bank 1: Screen background data ---
    // Pattern: 17 zero bytes, then three 0x48 (72) bytes
    // The area before screenBgOffset should be zeroed (it is by default in ArrayBuffer)
    // but we need the 17+3 pattern to be clean. Make sure the area before it
    // doesn't accidentally match by writing non-zero data.
    // Put some non-zero data before the pattern to avoid false positives
    view[SCREEN_BG_OFFSET - 1] = 0xFF;
    // Write the pattern
    for (let i = 0; i < 17; i++) {
      view[SCREEN_BG_OFFSET + i] = 0;
    }
    view[SCREEN_BG_OFFSET + 17] = 72;
    view[SCREEN_BG_OFFSET + 18] = 72;
    view[SCREEN_BG_OFFSET + 19] = 72;

    // --- Bank 30: Font data ---
    view[FONT_MAGIC_OFFSET] = 1;
    view[FONT_MAGIC_OFFSET + 1] = 46;
    view[FONT_MAGIC_OFFSET + 2] = 0;
    view[FONT_MAGIC_OFFSET + 3] = 1;

    return buffer;
  };

  // Pre-computed expected offsets for assertions
  const EXPECTED_GRAYSCALE_OFFSET = PALETTE_NAMES_OFFSET + 15;
  const EXPECTED_GFX_FONT_OFFSET = FONT_MAGIC_OFFSET + 2 + 8 * 16;
  const EXPECTED_FONT_OFFSET = EXPECTED_GFX_FONT_OFFSET + 46 * 16;

  describe('parseRom', () => {
    it('should parse basic ROM information correctly', () => {
      const romBuffer = createFullMockRomBuffer();
      const romInfo = RomProcessor.parseRom(romBuffer);

      expect(romInfo.title).toBe('LSDJ v8.5.1');
      expect(romInfo.version).toBe('v85');
      expect(romInfo.isValid).toBe(true);
      expect(romInfo.size).toBe(64 * ROM_CONSTANTS.BANK_SIZE);
      expect(romInfo.banks).toBe(64);
      expect(romInfo.hasPalettes).toBe(true);
      expect(romInfo.hasFonts).toBe(true);
    });

    it('should handle invalid ROM sizes', () => {
      const buffer = new ArrayBuffer(ROM_CONSTANTS.BANK_SIZE + 100);
      const romInfo = RomProcessor.parseRom(buffer);

      expect(romInfo.isValid).toBe(false);
      expect(romInfo.banks).toBe(0);
    });

    it('should report no palettes for ROM without palette data', () => {
      // A valid 64-bank ROM with no palette/font patterns
      const buffer = new ArrayBuffer(64 * ROM_CONSTANTS.BANK_SIZE);
      const romInfo = RomProcessor.parseRom(buffer);

      expect(romInfo.isValid).toBe(true);
      expect(romInfo.hasPalettes).toBe(false);
      expect(romInfo.hasFonts).toBe(false);
    });
  });

  describe('utility functions', () => {
    let processor: BinaryProcessor;

    beforeEach(() => {
      processor = new BinaryProcessor(createFullMockRomBuffer());
    });

    it('should find grayscale palette names', () => {
      const offset = RomProcessor.findGrayscalePaletteNames(processor);
      expect(offset).toBe(EXPECTED_GRAYSCALE_OFFSET);
    });

    it('should get the number of palettes', () => {
      const numPalettes = RomProcessor.getNumberOfPalettes(processor);
      expect(numPalettes).toBe(NUM_PALETTES);
    });

    it('should find palette name offset', () => {
      const offset = RomProcessor.findPaletteNameOffset(processor);
      // paletteNameOffset = grayscaleOffset + 5 * numPalettes
      expect(offset).toBe(EXPECTED_GRAYSCALE_OFFSET + 5 * NUM_PALETTES);
    });

    it('should find screen background data', () => {
      const offset = RomProcessor.findScreenBackgroundData(processor);
      expect(offset).toBe(SCREEN_BG_OFFSET);
    });

    it('should find palette offset', () => {
      const offset = RomProcessor.findPaletteOffset(processor);
      expect(offset).toBe(SCREEN_BG_OFFSET - NUM_PALETTES * ROM_CONSTANTS.PALETTE_SIZE);
    });

    it('should find font offset', () => {
      const offset = RomProcessor.findFontOffset(processor);
      expect(offset).toBe(EXPECTED_FONT_OFFSET);
    });

    it('should find graphics font offset', () => {
      const offset = RomProcessor.findGfxFontOffset(processor);
      expect(offset).toBe(EXPECTED_GFX_FONT_OFFSET);
    });

    it('should return -1 for grayscale palette names in ROM without the pattern', () => {
      const emptyRom = new ArrayBuffer(64 * ROM_CONSTANTS.BANK_SIZE);
      const emptyProcessor = new BinaryProcessor(emptyRom);
      expect(RomProcessor.findGrayscalePaletteNames(emptyProcessor)).toBe(-1);
    });

    it('should return -1 for font offset in ROM without font data', () => {
      const emptyRom = new ArrayBuffer(64 * ROM_CONSTANTS.BANK_SIZE);
      const emptyProcessor = new BinaryProcessor(emptyRom);
      expect(RomProcessor.findFontOffset(emptyProcessor)).toBe(-1);
    });
  });

  describe('fixChecksum', () => {
    it('should compute valid header checksum at 0x14D', () => {
      const romBuffer = createFullMockRomBuffer();

      const fixedRom = RomProcessor.fixChecksum(romBuffer);
      const view = new Uint8Array(fixedRom);

      let expected = 0;
      for (let i = 0x134; i < 0x14d; i++) {
        expected = expected - view[i] - 1;
      }
      expected = expected & 0xff;

      expect(view[0x14d]).toBe(expected);
    });

    it('should compute valid global checksum at 0x14E-0x14F', () => {
      const romBuffer = createFullMockRomBuffer();

      const fixedRom = RomProcessor.fixChecksum(romBuffer);
      const view = new Uint8Array(fixedRom);

      let expected = 0;
      for (let i = 0; i < view.length; i++) {
        if (i === 0x14e || i === 0x14f) continue;
        expected += view[i] & 0xff;
      }

      const storedChecksum = (view[0x14e] << 8) | view[0x14f];
      expect(storedChecksum).toBe(expected & 0xffff);
    });

    it('should not mutate the original buffer', () => {
      const romBuffer = createFullMockRomBuffer();
      const originalBytes = new Uint8Array(romBuffer).slice();

      RomProcessor.fixChecksum(romBuffer);

      const afterBytes = new Uint8Array(romBuffer);
      for (let i = 0; i < originalBytes.length; i++) {
        expect(afterBytes[i]).toBe(originalBytes[i]);
      }
    });

    it('should return a copy of the ROM data', () => {
      const romBuffer = createFullMockRomBuffer();

      const fixedRom = RomProcessor.fixChecksum(romBuffer);

      expect(fixedRom).not.toBe(romBuffer);
      expect(fixedRom.byteLength).toBe(romBuffer.byteLength);
    });

    it('should produce idempotent checksums when called twice', () => {
      const romBuffer = createFullMockRomBuffer();

      const fixedOnce = RomProcessor.fixChecksum(romBuffer);
      const fixedTwice = RomProcessor.fixChecksum(fixedOnce);

      const view1 = new Uint8Array(fixedOnce);
      const view2 = new Uint8Array(fixedTwice);

      expect(view2[0x14d]).toBe(view1[0x14d]);
      expect(view2[0x14e]).toBe(view1[0x14e]);
      expect(view2[0x14f]).toBe(view1[0x14f]);
    });
  });
});
