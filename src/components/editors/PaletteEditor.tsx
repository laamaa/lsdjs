import { useState, useCallback, useMemo } from 'react';
import { DropdownSelector } from '../common/DropdownSelector';
import { ColorPicker } from './ColorPicker';
import { SwatchPanel } from './SwatchPanel';
import { PalettePreview } from './PalettePreview';
import { RGB555, Palette, ColorSet } from '../../types/palette';
import { randomRGB555 } from './SwatchPair';
import { PaletteProcessor } from '../../services/binary/PaletteProcessor';
import { useRomState } from '../../context/RomContext';
import './PaletteEditor.css';

/**
 * PaletteEditor component for editing palette data in ROM files
 * Integrates ColorPicker and SwatchPanel components
 */
export function PaletteEditor() {
  const { romData, romInfo } = useRomState();

  // State for the palette editor
  const [selectedPalette, setSelectedPalette] = useState(0);
  const [selectedColorSet, setSelectedColorSet] = useState<number | null>(null);
  const [selectedIsBackground, setSelectedIsBackground] = useState<boolean>(true);
  const [paletteProcessor, setPaletteProcessor] = useState<PaletteProcessor | null>(null);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [paletteNames, setPaletteNames] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<RGB555>({ r: 0, g: 0, b: 0 });
  const [colorSpaceMode, setColorSpaceMode] = useState<'modern' | 'gbc' | 'desaturated'>('modern');

  // Initialize the palette processor when ROM data changes
  const [prevRomData, setPrevRomData] = useState(romData);
  if (prevRomData !== romData) {
    setPrevRomData(romData);
    if (romData && romInfo?.hasPalettes) {
      try {
        const processor = new PaletteProcessor(romData);
        setPaletteProcessor(processor);

        const names = processor.getPaletteNames();
        setPaletteNames(names);

        const firstPalette = processor.getPalette(0);
        setPalette(firstPalette);

        setSelectedColorSet(0);
        setSelectedIsBackground(true);
        setSelectedColor(firstPalette.normal.background);
      } catch (error) {
        console.error('Error initializing palette processor:', error);
      }
    }
  }

  // Helper function to get a color set by index
  const getColorSetByIndex = useCallback((palette: Palette, index: number): ColorSet => {
    switch (index) {
      case 0: return palette.normal;
      case 1: return palette.shaded;
      case 2: return palette.alternate;
      case 3: return palette.cursor;
      case 4: return palette.scrollbar;
      default: return palette.normal;
    }
  }, []);

  // Handle color selection
  const handleColorSelect = useCallback((colorSetIndex: number, isBackground: boolean) => {
    if (!palette) return;

    setSelectedColorSet(colorSetIndex);
    setSelectedIsBackground(isBackground);

    const colorSet = getColorSetByIndex(palette, colorSetIndex);
    setSelectedColor(isBackground ? colorSet.background : colorSet.foreground);
  }, [getColorSetByIndex, palette]);

  // Handle palette selection
  const handlePaletteChange = useCallback((paletteIndex: number) => {
    if (!paletteProcessor) return;

    setSelectedPalette(paletteIndex);

    try {
      const newPalette = paletteProcessor.getPalette(paletteIndex);
      setPalette(newPalette);

      // Update selected color if a color set is selected
      if (selectedColorSet !== null) {
        const colorSet = getColorSetByIndex(newPalette, selectedColorSet);
        setSelectedColor(selectedIsBackground ? colorSet.background : colorSet.foreground);
      }
    } catch (error) {
      console.error('Error loading palette:', error);
    }
  }, [paletteProcessor, selectedColorSet, selectedIsBackground, getColorSetByIndex]);


  // Handle color change
  const handleColorChange = useCallback((color: RGB555) => {
    if (!paletteProcessor || !palette || selectedColorSet === null) return;

    setSelectedColor(color);

    try {
      // Update the color in the ROM
      paletteProcessor.setColor(
        selectedPalette,
        selectedColorSet,
        selectedIsBackground ? 0 : 2, // 0 for background, 2 for foreground
        color
      );

      // Update the palette state
      const updatedPalette = paletteProcessor.getPalette(selectedPalette);
      setPalette(updatedPalette);
    } catch (error) {
      console.error('Error updating color:', error);
    }
  }, [paletteProcessor, palette, selectedPalette, selectedColorSet, selectedIsBackground]);

  // Handle palette name change
  const handlePaletteNameChange = useCallback((name: string) => {
    if (!paletteProcessor || !palette) return;

    try {
      // Update the palette name in the ROM
      paletteProcessor.setPaletteName(selectedPalette, name);

      // Update the palette names
      const names = paletteProcessor.getPaletteNames();
      setPaletteNames(names);

      // Update the palette state
      const updatedPalette = paletteProcessor.getPalette(selectedPalette);
      setPalette(updatedPalette);
    } catch (error) {
      console.error('Error updating palette name:', error);
    }
  }, [paletteProcessor, palette, selectedPalette]);

  // Handle randomize
  const handleRandomize = useCallback(() => {
    if (!paletteProcessor || !palette) return;

    try {
      // Generate random colors for all color sets
      for (let colorSetIndex = 0; colorSetIndex < 5; colorSetIndex++) {
        const bgColor = randomRGB555();
        const fgColor = randomRGB555();

        paletteProcessor.setColor(selectedPalette, colorSetIndex, 0, bgColor);
        paletteProcessor.setColor(selectedPalette, colorSetIndex, 2, fgColor);
      }

      // Update the palette state
      const updatedPalette = paletteProcessor.getPalette(selectedPalette);
      setPalette(updatedPalette);

      // Update selected color if a color set is selected
      if (selectedColorSet !== null) {
        const colorSet = getColorSetByIndex(updatedPalette, selectedColorSet);
        setSelectedColor(selectedIsBackground ? colorSet.background : colorSet.foreground);
      }
    } catch (error) {
      console.error('Error randomizing palette:', error);
    }
  }, [paletteProcessor, palette, selectedPalette, selectedColorSet, selectedIsBackground, getColorSetByIndex]);

  // Screen type options
  const screenTypeOptions = useMemo(() => ['Modern LCD', 'Game Boy Color', 'Desaturated'], []);

  // Map index to color space mode
  const indexToColorSpaceMode = useMemo(() => ({
    0: 'modern',
    1: 'gbc',
    2: 'desaturated'
  }), []);

  // Get screen type index from color space mode
  const getScreenTypeIndex = useCallback((mode: 'modern' | 'gbc' | 'desaturated'): number => {
    switch (mode) {
      case 'modern': return 0;
      case 'gbc': return 1;
      case 'desaturated': return 2;
      default: return 0;
    }
  }, []);

  // Handle color space mode change
  const handleColorSpaceModeChange = useCallback((index: number) => {
    const mode = indexToColorSpaceMode[index as keyof typeof indexToColorSpaceMode] as 'modern' | 'gbc' | 'desaturated';
    setColorSpaceMode(mode);
  }, [indexToColorSpaceMode]);

  // Render a message if no ROM is loaded
  if (!romData || !romInfo?.hasPalettes) {
    return (
        <div className="palette-editor-empty">
          <p>Please load a ROM file with palette data to use the Palette Editor.</p>
        </div>
    );
  }

  // Render a message if no palette is loaded
  if (!palette) {
    return (
        <div className="palette-editor-empty">
          <p>Loading palette data...</p>
        </div>
    );
  }

  // Render the palette editor
  return (
    <div className="palette-editor">
      <div className="palette-editor-controls">
        <div className="palette-selector">
          <DropdownSelector
            selectedIndex={selectedPalette}
            options={paletteNames}
            onSelect={handlePaletteChange}
            onNameChange={handlePaletteNameChange}
            disabled={!romData || !romInfo?.hasPalettes}
            placeholder="Select Palette"
            editable={true}
          />
        </div>

        <div className="color-space-selector" id="color-space-selector">
          <DropdownSelector
            selectedIndex={getScreenTypeIndex(colorSpaceMode)}
            options={screenTypeOptions}
            onSelect={handleColorSpaceModeChange}
            disabled={!romData || !romInfo?.hasPalettes}
            placeholder="Screen Type"
            editable={false}
            showIndexPrefix={false}
          />
        </div>

      </div>

      <div className="palette-editor-main">
        <div className="palette-editor-color-picker">
          <ColorPicker
            color={selectedColor}
            onChange={handleColorChange}
          />
        </div>

        <div className="palette-editor-swatch-panel">
          <SwatchPanel
            normalSet={palette.normal}
            shadedSet={palette.shaded}
            alternateSet={palette.alternate}
            cursorSet={palette.cursor}
            scrollbarSet={palette.scrollbar}
            onColorSelect={handleColorSelect}
            onRandomize={handleRandomize}
          />
        </div>
      </div>

      <PalettePreview
        palette={palette}
        colorSpaceMode={colorSpaceMode}
        onColorSelect={handleColorSelect}
      />
    </div>
  );
}
