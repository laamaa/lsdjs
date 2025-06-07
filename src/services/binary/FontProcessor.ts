import { BinaryProcessor } from './BinaryProcessor';
import { FONT_CONSTANTS, FontColor } from '../../types/font';

/**
 * Service for processing font data in ROM files
 */
export class FontProcessor {
  private romData: ArrayBuffer;
  private processor: BinaryProcessor;
  private fontOffset: number;
  private gfxFontOffset: number;

  /**
   * Create a new FontProcessor
   * @param romData The ROM data
   * @param fontOffset The offset of the font data in the ROM
   * @param gfxFontOffset The offset of the graphics font data in the ROM
   */
  constructor(romData: ArrayBuffer, fontOffset: number, gfxFontOffset: number) {
    this.romData = romData;
    this.processor = new BinaryProcessor(romData);
    this.fontOffset = fontOffset;
    this.gfxFontOffset = gfxFontOffset;
  }

  /**
   * Get the pixel color at the specified position in the specified tile
   * @param tile The tile index
   * @param x The x coordinate within the tile (0-7)
   * @param y The y coordinate within the tile (0-7)
   * @returns The color value (0-3)
   */
    getTilePixel(tile: number, x: number, y: number): FontColor {
    // Validate input
    if (x < 0 || x > 7 || y < 0 || y > 7) {
      throw new Error(`Invalid pixel coordinates: (${x}, ${y})`);
    }

    // Determine the tile offset
    let tileOffset: number;
    if (tile < FONT_CONSTANTS.TILE_COUNT) {
      tileOffset = this.fontOffset;
    } else {
      tileOffset = this.gfxFontOffset;
      tile -= FONT_CONSTANTS.TILE_COUNT;
    }

    // Calculate the byte offset for the tile
    tileOffset += tile * FONT_CONSTANTS.FONT_TILE_SIZE + y * 2;

    // Calculate the bit mask for the x position (bits are reversed, 0 is rightmost)
    const xMask = 7 - x;

    // Read the two bytes that define the pixel
    const byte1 = this.processor.readUint8(tileOffset);
    const byte2 = this.processor.readUint8(tileOffset + 1);

    // Combine the bits to get the color value
    const value = ((byte1 >> xMask) & 1) | (((byte2 >> xMask) & 1) << 1);

    return value as FontColor;
  }

  /**
   * Set the pixel color at the specified position in the specified tile
   * @param tile The tile index
   * @param x The x coordinate within the tile (0-7)
   * @param y The y coordinate within the tile (0-7)
   * @param color The color value (1-3)
   */
  setTilePixel(tile: number, x: number, y: number, color: FontColor): void {
    // Validate input
    if (x < 0 || x > 7 || y < 0 || y > 7) {
      throw new Error(`Invalid pixel coordinates: (${x}, ${y})`);
    }
    if (color < 0 || color > 3) {
      throw new Error(`Invalid color value: ${color}`);
    }

    // Determine the tile offset
    let tileOffset: number;
    if (tile < FONT_CONSTANTS.TILE_COUNT) {
      tileOffset = this.fontOffset;
    } else {
      tileOffset = this.gfxFontOffset;
      tile -= FONT_CONSTANTS.TILE_COUNT;
    }

    // Calculate the byte offset for the tile
    tileOffset += tile * FONT_CONSTANTS.FONT_TILE_SIZE + y * 2;

    // Calculate the bit mask for the x position (bits are reversed, 0 is rightmost)
    const xMask = 0x80 >> x;

    // Read the current bytes
    let byte1 = this.processor.readUint8(tileOffset);
    let byte2 = this.processor.readUint8(tileOffset + 1);

    // Clear the bits for this pixel
    byte1 &= 0xff ^ xMask;
    byte2 &= 0xff ^ xMask;

    // Set the bits based on the color
    if (color === 1) {
      byte1 |= xMask;
    } else if (color === 2) {
      byte2 |= xMask;
    } else if (color === 3) {
      byte1 |= xMask;
      byte2 |= xMask;
    }

    // Write the updated bytes
    this.processor.writeUint8(tileOffset, byte1);
    this.processor.writeUint8(tileOffset + 1, byte2);
  }

  /**
   * Rotate a tile up
   * @param tile The tile index
   */
  rotateTileUp(tile: number): void {
    const tileOffset = this.getTileOffset(tile);

    // Save the first line
    const line0byte1 = this.processor.readUint8(tileOffset);
    const line0byte2 = this.processor.readUint8(tileOffset + 1);

    // Shift all lines up
    for (let i = 0; i < 7; i++) {
      const targetOffset = tileOffset + i * 2;
      const sourceOffset = tileOffset + (i + 1) * 2;

      this.processor.writeUint8(targetOffset, this.processor.readUint8(sourceOffset));
      this.processor.writeUint8(targetOffset + 1, this.processor.readUint8(sourceOffset + 1));
    }

    // Put the first line at the bottom
    this.processor.writeUint8(tileOffset + 14, line0byte1);
    this.processor.writeUint8(tileOffset + 15, line0byte2);
  }

  /**
   * Rotate a tile down
   * @param tile The tile index
   */
  rotateTileDown(tile: number): void {
    const tileOffset = this.getTileOffset(tile);

    // Save the last line
    const line7byte1 = this.processor.readUint8(tileOffset + 14);
    const line7byte2 = this.processor.readUint8(tileOffset + 15);

    // Shift all lines down
    for (let i = 7; i > 0; i--) {
      const targetOffset = tileOffset + i * 2;
      const sourceOffset = tileOffset + (i - 1) * 2;

      this.processor.writeUint8(targetOffset, this.processor.readUint8(sourceOffset));
      this.processor.writeUint8(targetOffset + 1, this.processor.readUint8(sourceOffset + 1));
    }

    // Put the last line at the top
    this.processor.writeUint8(tileOffset, line7byte1);
    this.processor.writeUint8(tileOffset + 1, line7byte2);
  }

  /**
   * Rotate a tile left
   * @param tile The tile index
   */
  rotateTileLeft(tile: number): void {
    const tileOffset = this.getTileOffset(tile);

    for (let i = 0; i < FONT_CONSTANTS.FONT_TILE_SIZE; i++) {
      const currentByte = this.processor.readUint8(tileOffset + i);
      // Shift left and wrap the leftmost bit to the right
      const shiftedByte = ((currentByte & 0x80) >> 7) | (currentByte << 1);
      this.processor.writeUint8(tileOffset + i, shiftedByte);
    }
  }

  /**
   * Rotate a tile right
   * @param tile The tile index
   */
  rotateTileRight(tile: number): void {
    const tileOffset = this.getTileOffset(tile);

    for (let i = 0; i < FONT_CONSTANTS.FONT_TILE_SIZE; i++) {
      const currentByte = this.processor.readUint8(tileOffset + i);
      // Shift right and wrap the rightmost bit to the left
      const shiftedByte = ((currentByte & 1) << 7) | ((currentByte >> 1) & 0x7F);
      this.processor.writeUint8(tileOffset + i, shiftedByte);
    }
  }

  /**
   * Generate shaded and inverted variants of all tiles
   */
  generateShadedAndInvertedTiles(): void {
    for (let i = 2; i < FONT_CONSTANTS.TILE_COUNT; i++) {
      this.generateShadedTileVariant(i);
      this.generateInvertedTileVariant(i);
    }
  }

  /**
   * Generate a shaded variant of a tile
   * @param index The tile index
   */
  private generateShadedTileVariant(index: number): void {
    if (index < 2 || index >= FONT_CONSTANTS.TILE_COUNT) {
      return;
    }

    const sourceLocation = this.getTileOffset(index);
    const shadedLocation = sourceLocation + 0x4d2 * 2;

    for (let i = 0; i < FONT_CONSTANTS.FONT_TILE_SIZE; i += 2) {
      const sourceByte = this.processor.readUint8(sourceLocation + i);

      if (i % 4 === 2) {
        this.processor.writeUint8(shadedLocation + i, sourceByte | 0xaa);
      } else {
        this.processor.writeUint8(shadedLocation + i, sourceByte | 0x55);
      }

      this.processor.writeUint8(
        shadedLocation + i + 1, 
        this.processor.readUint8(sourceLocation + i + 1)
      );
    }
  }

  /**
   * Generate an inverted variant of a tile
   * @param index The tile index
   */
  private generateInvertedTileVariant(index: number): void {
    if (index < 2 || index >= FONT_CONSTANTS.TILE_COUNT) {
      return;
    }

    const sourceLocation = this.getTileOffset(index);
    const invertedLocation = sourceLocation + 0x4d2;

    for (let i = 0; i < FONT_CONSTANTS.FONT_TILE_SIZE; i += 2) {
      this.processor.writeUint8(
        invertedLocation + i, 
        ~this.processor.readUint8(sourceLocation + i + 1) & 0xFF
      );

      this.processor.writeUint8(
        invertedLocation + i + 1, 
        ~this.processor.readUint8(sourceLocation + i) & 0xFF
      );
    }
  }

  /**
   * Get the offset of a tile in the ROM
   * @param tile The tile index
   * @returns The offset of the tile in the ROM
   */
  private getTileOffset(tile: number): number {
    if (tile >= FONT_CONSTANTS.TILE_COUNT) {
      tile -= FONT_CONSTANTS.TILE_COUNT;
      return this.getGfxTileOffset(tile);
    }

    if (tile < 0 || tile >= FONT_CONSTANTS.TILE_COUNT) {
      throw new Error(`Invalid tile index: ${tile}`);
    }

    return this.fontOffset + tile * FONT_CONSTANTS.FONT_TILE_SIZE;
  }

  /**
   * Get the offset of a graphics tile in the ROM
   * @param tile The graphics tile index
   * @returns The offset of the graphics tile in the ROM
   */
  private getGfxTileOffset(tile: number): number {
    if (tile < 0 || tile >= FONT_CONSTANTS.GFX_TILE_COUNT) {
      throw new Error(`Invalid graphics tile index: ${tile}`);
    }

    return this.gfxFontOffset + tile * FONT_CONSTANTS.FONT_TILE_SIZE;
  }
}
