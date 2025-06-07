import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Button } from '../common';
import { TileEditor } from './TileEditor';
import { FontMap } from './FontMap';
import { ColorSelector } from './ColorSelector';
import { DropdownSelector } from '../common/DropdownSelector';
import { FontColor, FONT_CONSTANTS } from '../../types/font';
import { FontProcessor } from '../../services/binary/FontProcessor';
import { BinaryProcessor } from '../../services/binary';
import { RomProcessor } from '../../services/binary';
import { RootState } from '../../store';
import './FontEditor.css';

/**
 * FontEditor component for editing font data in ROM files
 * Integrates TileEditor, FontMap, and ColorSelector components
 */
export function FontEditor() {
  const romData = useSelector((state: RootState) => state.rom.romData);
  const romInfo = useSelector((state: RootState) => state.rom.romInfo);

  // State for the font editor
  const [selectedFont, setSelectedFont] = useState(0);
  const [selectedTile, setSelectedTile] = useState(0);
  const [selectedColor, setSelectedColor] = useState<FontColor>(3);
  const [rightColor, setRightColor] = useState<FontColor>(0);
  const [showGfxCharacters, setShowGfxCharacters] = useState(false);
  const [fontProcessor, setFontProcessor] = useState<FontProcessor | null>(null);
  const [fontData, setFontData] = useState<number[][][]>([]);
  const [fontNames, setFontNames] = useState<string[]>([]);

  // Load font data from the processor
  const loadFontData = useCallback((processor: FontProcessor) => {
    if (!processor) return;

    // Calculate the number of tiles to load
    const tileCount = showGfxCharacters
      ? FONT_CONSTANTS.TILE_COUNT + FONT_CONSTANTS.GFX_TILE_COUNT
      : FONT_CONSTANTS.TILE_COUNT;

    // Create a 3D array to hold the font data
    const data: number[][][] = [];

    // Load each tile
    for (let tile = 0; tile < tileCount; tile++) {
      const tileData: number[][] = [];

      // Load each pixel in the tile
      for (let y = 0; y < 8; y++) {
        const row: number[] = [];
        for (let x = 0; x < 8; x++) {
          row.push(processor.getTilePixel(tile, x, y));
        }
        tileData.push(row);
      }

      data.push(tileData);
    }

    setFontData(data);
  }, [showGfxCharacters]);

  // Initialize the font processor when ROM data is available or showGfxCharacters changes
  useEffect(() => {
    if (!romData || !romInfo?.hasFonts) return;

    // Find font and graphics font offsets
    const fontOffset = findFontOffset(romData);
    const gfxFontOffset = findGfxFontOffset(romData);

    if (fontOffset === -1 || gfxFontOffset === -1) {
      console.error('Could not find font data in ROM');
      return;
    }

    // Load font names
    const names = loadFontNames(romData);
    setFontNames(names);

    // Calculate the offset for the first font (index 0)
    // In the Java implementation, fonts are defined in reverse order
    // and we need to adjust the index: (index + 1) % 3
    const adjustedIndex = (1) % FONT_CONSTANTS.FONT_COUNT;
    const firstFontOffset = fontOffset + adjustedIndex * FONT_CONSTANTS.FONT_SIZE + FONT_CONSTANTS.FONT_HEADER_SIZE;

    // Create a new font processor for the first font
    const processor = new FontProcessor(romData, firstFontOffset, gfxFontOffset);
    setFontProcessor(processor);

    // Load initial font data
    loadFontData(processor);
  }, [romData, romInfo, showGfxCharacters, loadFontData]);


  // Find the font offset in the ROM
  const findFontOffset = (romData: ArrayBuffer): number => {
    const processor = new BinaryProcessor(romData);
    return RomProcessor.findFontOffset(processor);
  };

  // Find the graphics font offset in the ROM
  const findGfxFontOffset = (romData: ArrayBuffer): number => {
    const processor = new BinaryProcessor(romData);
    return RomProcessor.findGfxFontOffset(processor);
  };

  // Load font names from the ROM
  const loadFontNames = (romData: ArrayBuffer): string[] => {
    const processor = new BinaryProcessor(romData);
    const nameOffset = RomProcessor.findFontNameOffset(processor);

    if (nameOffset === -1) {
      console.error('Could not find font name offset in ROM');
      return ['FONT1', 'FONT2', 'FONT3']; // Fallback to placeholder names
    }

    const names: string[] = [];
    const fontNameSize = 5; // Each font name is 5 bytes (4 chars + 1 separator)

    // Read font names from the ROM
    for (let i = 0; i < FONT_CONSTANTS.FONT_COUNT; i++) {
      const name = processor.readAsciiString(nameOffset + i * fontNameSize, FONT_CONSTANTS.FONT_NAME_LENGTH);
      names.push(name || `FONT${i + 1}`); // Use a default name if the read fails
    }

    return names;
  };

  // Handle tile selection
  const handleTileSelect = (tileIndex: number) => {
    setSelectedTile(tileIndex);
  };

  // Handle color selection
  const handleColorChange = (color: FontColor, isRight: boolean) => {
    if (isRight) {
      setRightColor(color);
    } else {
      setSelectedColor(color);
    }
  };

  // Handle tile data changes
  const handleTileChange = (newTileData: number[][]) => {
    if (!fontProcessor) return;
    // Update the tile data in the processor
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const color = newTileData[y][x] as FontColor;
          fontProcessor.setTilePixel(selectedTile, x, y, color);
      }
    }

    // Generate shaded and inverted variants
    fontProcessor.generateShadedAndInvertedTiles();

    // Reload the font data to reflect changes
    loadFontData(fontProcessor);
  };

  // Handle font selection
  const handleFontChange = (fontIndex: number) => {
    setSelectedFont(fontIndex);

    if (!romData || !romInfo?.hasFonts) return;

    // Find font and graphics font offsets
    const fontOffset = findFontOffset(romData);
    const gfxFontOffset = findGfxFontOffset(romData);

    if (fontOffset === -1 || gfxFontOffset === -1) {
      console.error('Could not find font data in ROM');
      return;
    }

    // Calculate the offset for the selected font
    // In the Java implementation, fonts are defined in reverse order
    // and we need to adjust the index: (index + 1) % 3
    const adjustedIndex = (fontIndex + 1) % FONT_CONSTANTS.FONT_COUNT;
    const selectedFontOffset = fontOffset + adjustedIndex * FONT_CONSTANTS.FONT_SIZE + FONT_CONSTANTS.FONT_HEADER_SIZE;

    // Create a new font processor for the selected font
    const processor = new FontProcessor(romData, selectedFontOffset, gfxFontOffset);
    setFontProcessor(processor);

    // Load the font data
    loadFontData(processor);
  };

  // Handle toggling graphics characters
  const handleToggleGfxCharacters = () => {
    const newShowGfxCharacters = !showGfxCharacters;
    setShowGfxCharacters(newShowGfxCharacters);

    // Reset selected tile if we're hiding graphics characters and a graphics character is selected
    if (!newShowGfxCharacters && selectedTile >= FONT_CONSTANTS.TILE_COUNT) {
      setSelectedTile(0);
    }

    // Reload the font data to include/exclude graphics characters
    if (fontProcessor) {
      // Create a modified version of loadFontData that uses the new showGfxCharacters value
      const loadFontDataWithNewSetting = (processor: FontProcessor) => {
        // Calculate the number of tiles to load using the new setting
        const tileCount = newShowGfxCharacters
          ? FONT_CONSTANTS.TILE_COUNT + FONT_CONSTANTS.GFX_TILE_COUNT
          : FONT_CONSTANTS.TILE_COUNT;

        // Create a 3D array to hold the font data
        const data: number[][][] = [];

        // Load each tile
        for (let tile = 0; tile < tileCount; tile++) {
          const tileData: number[][] = [];

          // Load each pixel in the tile
          for (let y = 0; y < 8; y++) {
            const row: number[] = [];
            for (let x = 0; x < 8; x++) {
              row.push(processor.getTilePixel(tile, x, y));
            }
            tileData.push(row);
          }

          data.push(tileData);
        }

        setFontData(data);
      };

      loadFontDataWithNewSetting(fontProcessor);
    }
  };

  // Handle rotating the tile
  const handleRotateTile = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!fontProcessor) return;

    switch (direction) {
      case 'up':
        fontProcessor.rotateTileUp(selectedTile);
        break;
      case 'down':
        fontProcessor.rotateTileDown(selectedTile);
        break;
      case 'left':
        fontProcessor.rotateTileLeft(selectedTile);
        break;
      case 'right':
        fontProcessor.rotateTileRight(selectedTile);
        break;
    }

    // Reload the font data to reflect changes
    loadFontData(fontProcessor);
  };

  // Render a message if no ROM is loaded
  if (!romData || !romInfo?.hasFonts) {
    return (
        <div className="font-editor-empty">
          <p>Please load a ROM file with font data to use the Font Editor.</p>
        </div>
    );
  }

  // Render the font editor
  return (
      <div className="font-editor">
        <div className="font-editor-controls">
          <div className="font-selector">
            <DropdownSelector
              selectedIndex={selectedFont}
              options={fontNames}
              onSelect={handleFontChange}
              disabled={!romData || !romInfo?.hasFonts}
              placeholder="Select Font"
              editable={false}
            />
          </div>

          <div className="gfx-toggle">
            <button 
              className={`gfx-toggle-icon ${showGfxCharacters ? 'active' : ''}`}
              onClick={handleToggleGfxCharacters}
              aria-pressed={showGfxCharacters}
              aria-label={showGfxCharacters ? "Hide graphics characters" : "Show all characters"}
              title={showGfxCharacters ? "Hide graphics characters" : "Show all characters"}
            >
              <svg
                className="gfx-toggle-svg-icon"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 14a6 6 0 1 1 0-12 6 6 0 0 1 0 12z" fill="currentColor"/>
                <path d="M10 6a1 1 0 0 0-1 1v2H7a1 1 0 0 0 0 2h2v2a1 1 0 0 0 2 0v-2h2a1 1 0 0 0 0-2h-2V7a1 1 0 0 0-1-1z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="font-editor-main">
          <div className="font-editor-tile">
            <TileEditor
              tileData={fontData[selectedTile] || Array(8).fill(0).map(() => Array(8).fill(0))}
              selectedColor={selectedColor}
              rightColor={rightColor}
              onTileChange={handleTileChange}
            />

            <div className="tile-controls">
              <Button
                size="small"
                onClick={() => handleRotateTile('up')}
                aria-label="Rotate up"
              >
                ↑
              </Button>
              <Button
                size="small"
                onClick={() => handleRotateTile('down')}
                aria-label="Rotate down"
              >
                ↓
              </Button>
              <Button
                size="small"
                onClick={() => handleRotateTile('left')}
                aria-label="Rotate left"
              >
                ←
              </Button>
              <Button
                size="small"
                onClick={() => handleRotateTile('right')}
                aria-label="Rotate right"
              >
                →
              </Button>
            </div>

            <ColorSelector
              selectedColor={selectedColor}
              rightColor={rightColor}
              onColorChange={handleColorChange}
            />
          </div>

          <div className="font-editor-map">
            <FontMap
              fontData={fontData}
              selectedTile={selectedTile}
              showGfxCharacters={showGfxCharacters}
              onTileSelect={handleTileSelect}
            />
          </div>
        </div>
      </div>
  );
}
