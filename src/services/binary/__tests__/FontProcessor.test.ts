import { describe, expect, it, beforeEach } from 'vitest';
import { FontProcessor } from '../FontProcessor';
import { BinaryProcessor } from '../BinaryProcessor';
import { FONT_CONSTANTS, FontColor } from '../../../types/font';

describe('FontProcessor', () => {
  // Create a test buffer with sample font data
  const createTestFontBuffer = (): ArrayBuffer => {
    const buffer = new ArrayBuffer(10000); // Large enough for test font data and shaded/inverted variants
    const processor = new BinaryProcessor(buffer);

    // Initialize with some test patterns
    // For simplicity, we'll create a pattern where:
    // - First tile (index 0) has all pixels set to color 0
    // - Second tile (index 1) has all pixels set to color 1
    // - Third tile (index 2) has all pixels set to color 2
    // - Fourth tile (index 3) has all pixels set to color 3

    // Each tile is 16 bytes (8 rows * 2 bytes per row)
    // Each pixel's color is determined by 2 bits from 2 bytes

    // Tile 0: All pixels color 0 (both bytes 0)
    for (let i = 0; i < 16; i++) {
      processor.writeUint8(i, 0x00);
    }

    // Tile 1: All pixels color 1 (first byte all 1s, second byte all 0s)
    for (let i = 0; i < 8; i++) {
      processor.writeUint8(16 + i * 2, 0xFF);
      processor.writeUint8(16 + i * 2 + 1, 0x00);
    }

    // Tile 2: All pixels color 2 (first byte all 0s, second byte all 1s)
    for (let i = 0; i < 8; i++) {
      processor.writeUint8(32 + i * 2, 0x00);
      processor.writeUint8(32 + i * 2 + 1, 0xFF);
    }

    // Tile 3: All pixels color 3 (both bytes all 1s)
    for (let i = 0; i < 8; i++) {
      processor.writeUint8(48 + i * 2, 0xFF);
      processor.writeUint8(48 + i * 2 + 1, 0xFF);
    }

    // Create a similar pattern for the graphics font section
    const gfxFontOffset = 500; // Arbitrary offset for graphics font

    // GFX Tile 0: All pixels color 0
    for (let i = 0; i < 16; i++) {
      processor.writeUint8(gfxFontOffset + i, 0x00);
    }

    // GFX Tile 1: All pixels color 1
    for (let i = 0; i < 8; i++) {
      processor.writeUint8(gfxFontOffset + 16 + i * 2, 0xFF);
      processor.writeUint8(gfxFontOffset + 16 + i * 2 + 1, 0x00);
    }

    return buffer;
  };

  describe('getTilePixel', () => {
    let fontProcessor: FontProcessor;
    const fontOffset = 0;
    const gfxFontOffset = 500;

    beforeEach(() => {
      const buffer = createTestFontBuffer();
      fontProcessor = new FontProcessor(buffer, fontOffset, gfxFontOffset);
    });

    it('should get the correct pixel color for tile 0 (all color 0)', () => {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          expect(fontProcessor.getTilePixel(0, x, y)).toBe(0);
        }
      }
    });

    it('should get the correct pixel color for tile 1 (all color 1)', () => {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          expect(fontProcessor.getTilePixel(1, x, y)).toBe(1);
        }
      }
    });

    it('should get the correct pixel color for tile 2 (all color 2)', () => {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          expect(fontProcessor.getTilePixel(2, x, y)).toBe(2);
        }
      }
    });

    it('should get the correct pixel color for tile 3 (all color 3)', () => {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          expect(fontProcessor.getTilePixel(3, x, y)).toBe(3);
        }
      }
    });

    it('should get the correct pixel color for graphics tiles', () => {
      // Test the first graphics tile (index TILE_COUNT)
      const gfxTileIndex = FONT_CONSTANTS.TILE_COUNT;
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          expect(fontProcessor.getTilePixel(gfxTileIndex, x, y)).toBe(0);
        }
      }

      // Test the second graphics tile (index TILE_COUNT + 1)
      const gfxTileIndex2 = FONT_CONSTANTS.TILE_COUNT + 1;
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          expect(fontProcessor.getTilePixel(gfxTileIndex2, x, y)).toBe(1);
        }
      }
    });

    it('should throw an error for invalid coordinates', () => {
      expect(() => fontProcessor.getTilePixel(0, -1, 0)).toThrow();
      expect(() => fontProcessor.getTilePixel(0, 8, 0)).toThrow();
      expect(() => fontProcessor.getTilePixel(0, 0, -1)).toThrow();
      expect(() => fontProcessor.getTilePixel(0, 0, 8)).toThrow();
    });
  });

  describe('setTilePixel', () => {
    let fontProcessor: FontProcessor;
    const fontOffset = 0;
    const gfxFontOffset = 500;

    beforeEach(() => {
      const buffer = createTestFontBuffer();
      fontProcessor = new FontProcessor(buffer, fontOffset, gfxFontOffset);
    });

    it('should set and get the correct pixel color', () => {
      // Set a pixel in tile 0 to color 3
      fontProcessor.setTilePixel(0, 2, 3, 3);
      expect(fontProcessor.getTilePixel(0, 2, 3)).toBe(3);

      // Set a pixel in tile 1 to color 2
      fontProcessor.setTilePixel(1, 4, 5, 2);
      expect(fontProcessor.getTilePixel(1, 4, 5)).toBe(2);

      // Set a pixel in tile 2 to color 1
      fontProcessor.setTilePixel(2, 6, 7, 1);
      expect(fontProcessor.getTilePixel(2, 6, 7)).toBe(1);

      // Set a pixel in tile 3 to color 0
      fontProcessor.setTilePixel(3, 0, 0, 0);
      expect(fontProcessor.getTilePixel(3, 0, 0)).toBe(0);
    });

    it('should set and get the correct pixel color for graphics tiles', () => {
      // Set a pixel in the first graphics tile
      const gfxTileIndex = FONT_CONSTANTS.TILE_COUNT;
      fontProcessor.setTilePixel(gfxTileIndex, 3, 4, 3);
      expect(fontProcessor.getTilePixel(gfxTileIndex, 3, 4)).toBe(3);
    });

    it('should throw an error for invalid coordinates', () => {
      expect(() => fontProcessor.setTilePixel(0, -1, 0, 1)).toThrow();
      expect(() => fontProcessor.setTilePixel(0, 8, 0, 1)).toThrow();
      expect(() => fontProcessor.setTilePixel(0, 0, -1, 1)).toThrow();
      expect(() => fontProcessor.setTilePixel(0, 0, 8, 1)).toThrow();
    });

    it('should throw an error for invalid color values', () => {
      expect(() => fontProcessor.setTilePixel(0, 0, 0, -1 as FontColor)).toThrow();
      expect(() => fontProcessor.setTilePixel(0, 0, 0, 4 as FontColor)).toThrow();
    });
  });

  describe('rotateTileUp', () => {
    let fontProcessor: FontProcessor;
    const fontOffset = 0;
    const gfxFontOffset = 500;

    beforeEach(() => {
      const buffer = createTestFontBuffer();
      fontProcessor = new FontProcessor(buffer, fontOffset, gfxFontOffset);

      // Create a test pattern for rotation
      // Set the first row to color 3, rest to color 0
      for (let x = 0; x < 8; x++) {
        fontProcessor.setTilePixel(0, x, 0, 3);
        for (let y = 1; y < 8; y++) {
          fontProcessor.setTilePixel(0, x, y, 0);
        }
      }
    });

    it('should rotate the tile up correctly', () => {
      fontProcessor.rotateTileUp(0);

      // After rotation, the first row should be color 0 and the last row should be color 3
      for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 7; y++) {
          expect(fontProcessor.getTilePixel(0, x, y)).toBe(0);
        }
        expect(fontProcessor.getTilePixel(0, x, 7)).toBe(3);
      }
    });
  });

  describe('rotateTileDown', () => {
    let fontProcessor: FontProcessor;
    const fontOffset = 0;
    const gfxFontOffset = 500;

    beforeEach(() => {
      const buffer = createTestFontBuffer();
      fontProcessor = new FontProcessor(buffer, fontOffset, gfxFontOffset);

      // Create a test pattern for rotation
      // Set the last row to color 3, rest to color 0
      for (let x = 0; x < 8; x++) {
        fontProcessor.setTilePixel(0, x, 7, 3);
        for (let y = 0; y < 7; y++) {
          fontProcessor.setTilePixel(0, x, y, 0);
        }
      }
    });

    it('should rotate the tile down correctly', () => {
      fontProcessor.rotateTileDown(0);

      // After rotation, the first row should be color 3 and the rest should be color 0
      for (let x = 0; x < 8; x++) {
        expect(fontProcessor.getTilePixel(0, x, 0)).toBe(3);
        for (let y = 1; y < 8; y++) {
          expect(fontProcessor.getTilePixel(0, x, y)).toBe(0);
        }
      }
    });
  });

  describe('rotateTileLeft and rotateTileRight', () => {
    let fontProcessor: FontProcessor;
    const fontOffset = 0;
    const gfxFontOffset = 500;

    beforeEach(() => {
      const buffer = createTestFontBuffer();
      fontProcessor = new FontProcessor(buffer, fontOffset, gfxFontOffset);

      // Create a test pattern for rotation
      // Set the leftmost column to color 3, rest to color 0
      for (let y = 0; y < 8; y++) {
        fontProcessor.setTilePixel(0, 0, y, 3);
        for (let x = 1; x < 8; x++) {
          fontProcessor.setTilePixel(0, x, y, 0);
        }
      }
    });

    it('should rotate the tile left correctly', () => {
      fontProcessor.rotateTileLeft(0);

      // After rotation, the leftmost column should be color 0 and the rightmost should be color 3
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 7; x++) {
          expect(fontProcessor.getTilePixel(0, x, y)).toBe(0);
        }
        expect(fontProcessor.getTilePixel(0, 7, y)).toBe(3);
      }
    });

    it('should rotate the tile right correctly', () => {
      // Reset the pattern
      for (let y = 0; y < 8; y++) {
        fontProcessor.setTilePixel(0, 7, y, 3);
        for (let x = 0; x < 7; x++) {
          fontProcessor.setTilePixel(0, x, y, 0);
        }
      }

      fontProcessor.rotateTileRight(0);

      // After rotation, the rightmost column should be color 0 and the leftmost should be color 3
      for (let y = 0; y < 8; y++) {
        expect(fontProcessor.getTilePixel(0, 0, y)).toBe(3);
        for (let x = 1; x < 8; x++) {
          expect(fontProcessor.getTilePixel(0, x, y)).toBe(0);
        }
      }
    });
  });

  describe('generateShadedAndInvertedTiles', () => {
    let fontProcessor: FontProcessor;
    const fontOffset = 0;
    const gfxFontOffset = 500;

    beforeEach(() => {
      const buffer = createTestFontBuffer();
      fontProcessor = new FontProcessor(buffer, fontOffset, gfxFontOffset);
    });

    it('should generate shaded and inverted variants', () => {
      // This is a more complex test that would require detailed knowledge of the shading algorithm
      // For now, we'll just verify that the method doesn't throw an error
      expect(() => fontProcessor.generateShadedAndInvertedTiles()).not.toThrow();
    });
  });
});
