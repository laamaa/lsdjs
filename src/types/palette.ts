/**
 * Types and constants related to palettes in LSDj
 */

/**
 * Constants for palette-related operations
 */
export const PALETTE_CONSTANTS = {
  /** Number of color sets in a palette (normal, shaded, alternate, cursor, scrollbar) */
  NUM_COLOR_SETS: 5,
  
  /** Size of a color set in bytes (4 colors * 2 bytes per color) */
  COLOR_SET_SIZE: 8,
  
  /** Size of a palette in bytes (NUM_COLOR_SETS * COLOR_SET_SIZE) */
  PALETTE_SIZE: 5 * 8,
  
  /** Size of a palette name in bytes */
  PALETTE_NAME_SIZE: 5,
  
  /** Maximum length of a palette name (4 characters) */
  PALETTE_NAME_LENGTH: 4,
};

/**
 * RGB555 color format (5 bits each for red, green, and blue)
 * Each component ranges from 0 to 31
 */
export interface RGB555 {
  r: number;
  g: number;
  b: number;
}

/**
 * Color set in a palette (background, mid, foreground)
 */
export interface ColorSet {
  /** Background color */
  background: RGB555;
  
  /** Mid-tone color (automatically calculated) */
  mid: RGB555;
  
  /** Foreground color */
  foreground: RGB555;
}

/**
 * Complete palette with 5 color sets
 */
export interface Palette {
  /** Normal color set */
  normal: ColorSet;
  
  /** Shaded color set */
  shaded: ColorSet;
  
  /** Alternate color set */
  alternate: ColorSet;
  
  /** Cursor color set */
  cursor: ColorSet;
  
  /** Scrollbar color set */
  scrollbar: ColorSet;
  
  /** Palette name (4 characters) */
  name: string;
}

/**
 * Convert RGB555 to CSS color string
 * @param color RGB555 color
 * @returns CSS color string (e.g., "#ff0000")
 */
export function rgb555ToHex(color: RGB555): string {
  // Convert 5-bit components to 8-bit
  const r = Math.floor((color.r * 255) / 31);
  const g = Math.floor((color.g * 255) / 31);
  const b = Math.floor((color.b * 255) / 31);
  
  // Format as hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Convert CSS color string to RGB555
 * @param hex CSS color string (e.g., "#ff0000")
 * @returns RGB555 color
 */
export function hexToRgb555(hex: string): RGB555 {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Convert 8-bit components to 5-bit
  return {
    r: Math.floor((r * 31) / 255),
    g: Math.floor((g * 31) / 255),
    b: Math.floor((b * 31) / 255),
  };
}

/**
 * Calculate mid-tone color between background and foreground
 * @param background Background color
 * @param foreground Foreground color
 * @returns Mid-tone color
 */
export function calculateMidTone(background: RGB555, foreground: RGB555): RGB555 {
  // Use a 55/45 mix of background and foreground
  const k = 0.55;
  
  return {
    r: Math.floor(background.r * k + foreground.r * (1 - k)),
    g: Math.floor(background.g * k + foreground.g * (1 - k)),
    b: Math.floor(background.b * k + foreground.b * (1 - k)),
  };
}