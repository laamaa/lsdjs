import { BinaryProcessor } from './BinaryProcessor';
import { RomProcessor } from './RomProcessor';
import { PALETTE_CONSTANTS, RGB555, ColorSet, Palette, calculateMidTone } from '../../types/palette';

/**
 * Service for manipulating palette data in ROM files
 */
export class PaletteProcessor {
  private processor: BinaryProcessor;
  private paletteOffset: number;
  private nameOffset: number;
  private numberOfPalettes: number;

  /**
   * Create a new PaletteProcessor
   * @param romData ROM data as ArrayBuffer
   */
  constructor(romData: ArrayBuffer) {
    this.processor = new BinaryProcessor(romData);
    this.paletteOffset = RomProcessor.findPaletteOffset(this.processor);
    this.nameOffset = RomProcessor.findPaletteNameOffset(this.processor);
    this.numberOfPalettes = RomProcessor.getNumberOfPalettes(this.processor);

    if (this.paletteOffset === -1) {
      throw new Error('Could not find palette offset in ROM');
    }

    if (this.nameOffset === -1) {
      throw new Error('Could not find palette name offset in ROM');
    }

    if (this.numberOfPalettes <= 0) {
      throw new Error('No palettes found in ROM');
    }
  }

  /**
   * Get the number of palettes in the ROM
   * @returns Number of palettes
   */
  public getNumberOfPalettes(): number {
    return this.numberOfPalettes;
  }

  /**
   * Get the names of all palettes in the ROM
   * @returns Array of palette names
   */
  public getPaletteNames(): string[] {
    const names: string[] = [];

    for (let i = 0; i < this.numberOfPalettes; i++) {
      names.push(this.getPaletteName(i));
    }

    return names;
  }

  /**
   * Get the name of a palette
   * @param paletteIndex Index of the palette
   * @returns Palette name
   */
  public getPaletteName(paletteIndex: number): string {
    if (paletteIndex < 0 || paletteIndex >= this.numberOfPalettes) {
      throw new Error(`Invalid palette index: ${paletteIndex}`);
    }

    const offset = this.nameOffset + paletteIndex * PALETTE_CONSTANTS.PALETTE_NAME_SIZE;
    return this.processor.readAsciiString(offset, PALETTE_CONSTANTS.PALETTE_NAME_LENGTH);
  }

  /**
   * Set the name of a palette
   * @param paletteIndex Index of the palette
   * @param name New palette name (max 4 characters)
   */
  public setPaletteName(paletteIndex: number, name: string): void {
    if (paletteIndex < 0 || paletteIndex >= this.numberOfPalettes) {
      throw new Error(`Invalid palette index: ${paletteIndex}`);
    }

    // Ensure name is uppercase and padded/truncated to 4 characters
    name = name.toUpperCase();
    if (name.length > PALETTE_CONSTANTS.PALETTE_NAME_LENGTH) {
      name = name.substring(0, PALETTE_CONSTANTS.PALETTE_NAME_LENGTH);
    } else {
      name = name.padEnd(PALETTE_CONSTANTS.PALETTE_NAME_LENGTH, ' ');
    }

    const offset = this.nameOffset + paletteIndex * PALETTE_CONSTANTS.PALETTE_NAME_SIZE;
    this.processor.writeAsciiString(offset, name, PALETTE_CONSTANTS.PALETTE_NAME_SIZE);
  }

  /**
   * Get a color from the ROM
   * @param paletteIndex Index of the palette
   * @param colorSetIndex Index of the color set (0-4)
   * @param colorIndex Index of the color in the set (0=bg, 1=mid, 2=fg)
   * @returns RGB555 color
   */
  public getColor(paletteIndex: number, colorSetIndex: number, colorIndex: number): RGB555 {
    if (paletteIndex < 0 || paletteIndex >= this.numberOfPalettes) {
      throw new Error(`Invalid palette index: ${paletteIndex}`);
    }

    if (colorSetIndex < 0 || colorSetIndex >= PALETTE_CONSTANTS.NUM_COLOR_SETS) {
      throw new Error(`Invalid color set index: ${colorSetIndex}`);
    }

    if (colorIndex < 0 || colorIndex > 2) {
      throw new Error(`Invalid color index: ${colorIndex}`);
    }

    // Calculate the offset for the color
    let offset = this.paletteOffset + paletteIndex * PALETTE_CONSTANTS.PALETTE_SIZE;
    offset += colorSetIndex * PALETTE_CONSTANTS.COLOR_SET_SIZE;

    // For foreground color, use the last color in the set
    if (colorIndex === 2) {
      offset += 6; // Last color in the set
    } 
    // For mid-tone, use the second color in the set
    else if (colorIndex === 1) {
      offset += 2; // Second color in the set
    }
    // For background, use the first color in the set (offset already correct)

    // Read the color from the ROM
    // Format: gggrrrrr 0bbbbbgg
    const byte1 = this.processor.readUint8(offset);
    const byte2 = this.processor.readUint8(offset + 1);

    const r = byte1 & 0x1F;
    const g = ((byte1 & 0xE0) >> 5) | ((byte2 & 0x03) << 3);
    const b = (byte2 & 0x7C) >> 2;

    return { r, g, b };
  }

  /**
   * Set a color in the ROM
   * @param paletteIndex Index of the palette
   * @param colorSetIndex Index of the color set (0-4)
   * @param colorIndex Index of the color in the set (0=bg, 1=mid, 2=fg)
   * @param color RGB555 color
   */
  public setColor(paletteIndex: number, colorSetIndex: number, colorIndex: number, color: RGB555): void {
    if (paletteIndex < 0 || paletteIndex >= this.numberOfPalettes) {
      throw new Error(`Invalid palette index: ${paletteIndex}`);
    }

    if (colorSetIndex < 0 || colorSetIndex >= PALETTE_CONSTANTS.NUM_COLOR_SETS) {
      throw new Error(`Invalid color set index: ${colorSetIndex}`);
    }

    if (colorIndex < 0 || colorIndex > 2) {
      throw new Error(`Invalid color index: ${colorIndex}`);
    }

    // Calculate the offset for the color
    let offset = this.paletteOffset + paletteIndex * PALETTE_CONSTANTS.PALETTE_SIZE;
    offset += colorSetIndex * PALETTE_CONSTANTS.COLOR_SET_SIZE;

    // For foreground color, use the last color in the set
    if (colorIndex === 2) {
      offset += 6; // Last color in the set
    } 
    // For mid-tone, use the second color in the set
    else if (colorIndex === 1) {
      offset += 2; // Second color in the set
    }
    // For background, use the first color in the set (offset already correct)

    // Write the color to the ROM
    // Format: gggrrrrr 0bbbbbgg
    const byte1 = (color.r & 0x1F) | ((color.g & 0x07) << 5);
    const byte2 = ((color.g & 0x18) >> 3) | ((color.b & 0x1F) << 2);

    this.processor.writeUint8(offset, byte1);
    this.processor.writeUint8(offset + 1, byte2);

    // If we're setting a background or foreground color, recalculate the mid-tone
    if (colorIndex === 0 || colorIndex === 2) {
      this.updateMidTone(paletteIndex, colorSetIndex);
    }
  }

  /**
   * Update the mid-tone color for a color set
   * @param paletteIndex Index of the palette
   * @param colorSetIndex Index of the color set (0-4)
   */
  private updateMidTone(paletteIndex: number, colorSetIndex: number): void {
    // Get the background and foreground colors
    const bg = this.getColor(paletteIndex, colorSetIndex, 0);
    const fg = this.getColor(paletteIndex, colorSetIndex, 2);

    // Calculate the mid-tone
    const mid = calculateMidTone(bg, fg);

    // Set the mid-tone color (both copies)
    const offset = this.paletteOffset + paletteIndex * PALETTE_CONSTANTS.PALETTE_SIZE;
    const colorSetOffset = offset + colorSetIndex * PALETTE_CONSTANTS.COLOR_SET_SIZE;

    // Format: gggrrrrr 0bbbbbgg
    const byte1 = (mid.r & 0x1F) | ((mid.g & 0x07) << 5);
    const byte2 = ((mid.g & 0x18) >> 3) | ((mid.b & 0x1F) << 2);

    // Write the mid-tone color (first copy)
    this.processor.writeUint8(colorSetOffset + 2, byte1);
    this.processor.writeUint8(colorSetOffset + 3, byte2);

    // Write the mid-tone color (second copy)
    this.processor.writeUint8(colorSetOffset + 4, byte1);
    this.processor.writeUint8(colorSetOffset + 5, byte2);
  }

  /**
   * Get a color set from the ROM
   * @param paletteIndex Index of the palette
   * @param colorSetIndex Index of the color set (0-4)
   * @returns ColorSet
   */
  public getColorSet(paletteIndex: number, colorSetIndex: number): ColorSet {
    return {
      background: this.getColor(paletteIndex, colorSetIndex, 0),
      mid: this.getColor(paletteIndex, colorSetIndex, 1),
      foreground: this.getColor(paletteIndex, colorSetIndex, 2),
    };
  }

  /**
   * Set a color set in the ROM
   * @param paletteIndex Index of the palette
   * @param colorSetIndex Index of the color set (0-4)
   * @param colorSet ColorSet
   */
  public setColorSet(paletteIndex: number, colorSetIndex: number, colorSet: ColorSet): void {
    this.setColor(paletteIndex, colorSetIndex, 0, colorSet.background);
    this.setColor(paletteIndex, colorSetIndex, 2, colorSet.foreground);
    // Mid-tone is automatically calculated and set
  }

  /**
   * Get a complete palette from the ROM
   * @param paletteIndex Index of the palette
   * @returns Palette
   */
  public getPalette(paletteIndex: number): Palette {
    return {
      normal: this.getColorSet(paletteIndex, 0),
      shaded: this.getColorSet(paletteIndex, 1),
      alternate: this.getColorSet(paletteIndex, 2),
      cursor: this.getColorSet(paletteIndex, 3),
      scrollbar: this.getColorSet(paletteIndex, 4),
      name: this.getPaletteName(paletteIndex),
    };
  }

  /**
   * Set a complete palette in the ROM
   * @param paletteIndex Index of the palette
   * @param palette Palette
   */
  public setPalette(paletteIndex: number, palette: Palette): void {
    this.setPaletteName(paletteIndex, palette.name);
    this.setColorSet(paletteIndex, 0, palette.normal);
    this.setColorSet(paletteIndex, 1, palette.shaded);
    this.setColorSet(paletteIndex, 2, palette.alternate);
    this.setColorSet(paletteIndex, 3, palette.cursor);
    this.setColorSet(paletteIndex, 4, palette.scrollbar);
  }

  /**
   * Check if a palette name is already used
   * @param name Palette name to check
   * @param excludeIndex Index to exclude from the check (optional)
   * @returns True if the name is already used
   */
  public isPaletteNameUsed(name: string, excludeIndex?: number): boolean {
    name = name.toUpperCase();

    for (let i = 0; i < this.numberOfPalettes; i++) {
      if (excludeIndex !== undefined && i === excludeIndex) {
        continue;
      }

      if (this.getPaletteName(i) === name) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate a unique palette name
   * @param baseName Base name to use
   * @returns Unique palette name
   */
  public generateUniquePaletteName(baseName: string): string {
    baseName = baseName.toUpperCase();

    if (baseName.length > PALETTE_CONSTANTS.PALETTE_NAME_LENGTH) {
      baseName = baseName.substring(0, PALETTE_CONSTANTS.PALETTE_NAME_LENGTH);
    }

    // If the base name is not used, return it
    if (!this.isPaletteNameUsed(baseName)) {
      return baseName.padEnd(PALETTE_CONSTANTS.PALETTE_NAME_LENGTH, ' ');
    }

    // Try adding numbers to the base name
    for (let i = 1; i <= 9; i++) {
      const nameWithNumber = baseName.substring(0, PALETTE_CONSTANTS.PALETTE_NAME_LENGTH - 1) + i;

      if (!this.isPaletteNameUsed(nameWithNumber)) {
        return nameWithNumber.padEnd(PALETTE_CONSTANTS.PALETTE_NAME_LENGTH, ' ');
      }
    }

    // If all numbers are used, generate a random name
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let randomName = '';

    for (let i = 0; i < PALETTE_CONSTANTS.PALETTE_NAME_LENGTH; i++) {
      randomName += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return randomName;
  }
}
