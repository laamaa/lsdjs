/**
 * Types and interfaces for the Font Editor
 */

// Font constants
export const FONT_CONSTANTS = {
  TILE_COUNT: 71,
  GFX_TILE_COUNT: 46,
  FONT_NUM_TILES_X: 8,
  FONT_NUM_TILES_Y: Math.ceil(71 / 8),
  GFX_FONT_NUM_TILES_Y: Math.ceil((71 + 46) / 8),
  FONT_MAP_WIDTH: 8 * 8,
  FONT_MAP_HEIGHT: Math.ceil(71 / 8) * 8,
  GFX_FONT_MAP_HEIGHT: Math.ceil((71 + 46) / 8) * 8,
  FONT_HEADER_SIZE: 130,
  FONT_COUNT: 3,
  FONT_SIZE: 0xe96,
  FONT_NAME_LENGTH: 4,
  FONT_TILE_SIZE: 16,
  GFX_SIZE: 16 * 46
};

// Font color type (1-3)
export type FontColor = 0 | 1 | 2 | 3;

// Interface for a font tile
export interface FontTile {
  pixels: FontColor[][];
}

// Interface for a font
export interface Font {
  name: string;
  tiles: FontTile[];
}

// Interface for the font editor state
export interface FontEditorState {
  selectedFont: number;
  selectedTile: number;
  selectedColor: FontColor;
  rightColor: FontColor;
  showGfxCharacters: boolean;
}

// Interface for the tile editor props
export interface TileEditorProps {
  tile: FontTile;
  selectedColor: FontColor;
  rightColor: FontColor;
  onTileChange: (tile: FontTile) => void;
}

// Interface for the font map props
export interface FontMapProps {
  font: Font;
  selectedTile: number;
  showGfxCharacters: boolean;
  onTileSelect: (tileIndex: number) => void;
}

// Interface for the color selector props
export interface ColorSelectorProps {
  selectedColor: FontColor;
  rightColor: FontColor;
  onColorChange: (color: FontColor, isRight: boolean) => void;
}