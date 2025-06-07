import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { DropdownSelector } from '../common/DropdownSelector';
import { ColorPicker } from './ColorPicker';
import { SwatchPanel } from './SwatchPanel';
import { RGB555, Palette, ColorSet } from '../../types/palette';
import { randomRGB555 } from './SwatchPair';
import { PaletteProcessor } from '../../services/binary/PaletteProcessor';
import { RootState } from '../../store';
import './PaletteEditor.css';

// Color constants for the preview images
const ScreenShotColors = {
  NORMAL_BG: 0xff1a4577,
  NORMAL_MID: 0xffb06a76,
  NORMAL_FG: 0xfff58f77,
  SHADED_BG: 0xffebf1fd,
  SHADED_MID: 0xffcba9c5,
  SHADED_FG: 0xffa64556,
  ALT_BG: 0xff2d79bd,
  ALT_MID: 0xff76c0c3,
  ALT_FG: 0xffbdebd0,
  CUR_BG: 0xff88bdf5,
  CUR_MID: 0xff7578a8,
  CUR_FG: 0xff6e231a,
  SCROLL_BG: 0xffc4ecd0,
  SCROLL_MID: 0xff7fc1c4,
  SCROLL_FG: 0xff3a7abd
};

// Scale channel with curve (from Java implementation)
const SCALE_CHANNEL_WITH_CURVE = [
  0, 6, 12, 20, 28, 36, 45, 56, 66, 76, 88, 100, 113, 125, 137, 149, 161, 172,
  182, 192, 202, 210, 218, 225, 232, 238, 243, 247, 250, 252, 254, 255
];

// Map of ScreenShotColors to color indices
const COLOR_MAPPING = {
  [ScreenShotColors.NORMAL_BG]: 0,
  [ScreenShotColors.NORMAL_MID]: 1,
  [ScreenShotColors.NORMAL_FG]: 2,
  [ScreenShotColors.SHADED_BG]: 3,
  [ScreenShotColors.SHADED_MID]: 4,
  [ScreenShotColors.SHADED_FG]: 5,
  [ScreenShotColors.ALT_BG]: 6,
  [ScreenShotColors.ALT_MID]: 7,
  [ScreenShotColors.ALT_FG]: 8,
  [ScreenShotColors.CUR_BG]: 9,
  [ScreenShotColors.CUR_MID]: 10,
  [ScreenShotColors.CUR_FG]: 11,
  [ScreenShotColors.SCROLL_BG]: 12,
  [ScreenShotColors.SCROLL_MID]: 13,
  [ScreenShotColors.SCROLL_FG]: 14
};

// Map of color indices to color set indices and background/foreground flags
const COLOR_TO_SWATCH_MAPPING = {
  0: { colorSetIndex: 0, isBackground: true },  // NORMAL_BG
  1: { colorSetIndex: 0, isBackground: false }, // NORMAL_MID
  2: { colorSetIndex: 0, isBackground: false }, // NORMAL_FG
  3: { colorSetIndex: 1, isBackground: true },  // SHADED_BG
  4: { colorSetIndex: 1, isBackground: false }, // SHADED_MID
  5: { colorSetIndex: 1, isBackground: false }, // SHADED_FG
  6: { colorSetIndex: 2, isBackground: true },  // ALT_BG
  7: { colorSetIndex: 2, isBackground: false }, // ALT_MID
  8: { colorSetIndex: 2, isBackground: false }, // ALT_FG
  9: { colorSetIndex: 3, isBackground: true },  // CUR_BG
  10: { colorSetIndex: 3, isBackground: false }, // CUR_MID
  11: { colorSetIndex: 3, isBackground: false }, // CUR_FG
  12: { colorSetIndex: 4, isBackground: true },  // SCROLL_BG
  13: { colorSetIndex: 4, isBackground: false }, // SCROLL_MID
  14: { colorSetIndex: 4, isBackground: false }  // SCROLL_FG
};

/**
 * PaletteEditor component for editing palette data in ROM files
 * Integrates ColorPicker and SwatchPanel components
 */
export function PaletteEditor() {
  const romData = useSelector((state: RootState) => state.rom.romData);
  const romInfo = useSelector((state: RootState) => state.rom.romInfo);

  // State for the palette editor
  const [selectedPalette, setSelectedPalette] = useState(0);
  const [selectedColorSet, setSelectedColorSet] = useState<number | null>(null);
  const [selectedIsBackground, setSelectedIsBackground] = useState<boolean>(true);
  const [paletteProcessor, setPaletteProcessor] = useState<PaletteProcessor | null>(null);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [paletteNames, setPaletteNames] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<RGB555>({ r: 0, g: 0, b: 0 });
  const [colorSpaceMode, setColorSpaceMode] = useState<'modern' | 'gbc' | 'desaturated'>('modern');

  // Refs for the preview canvases
  const songCanvasRef = useRef<HTMLCanvasElement>(null);
  const instrCanvasRef = useRef<HTMLCanvasElement>(null);

  // State for the preview images
  const [songImage, setSongImage] = useState<HTMLImageElement | null>(null);
  const [instrImage, setInstrImage] = useState<HTMLImageElement | null>(null);

  // Initialize the palette processor when ROM data is available
  useEffect(() => {
    if (!romData || !romInfo?.hasPalettes) return;

    try {
      const processor = new PaletteProcessor(romData);
      setPaletteProcessor(processor);

      // Load palette names
      const names = processor.getPaletteNames();
      setPaletteNames(names);

      // Load the first palette
      const firstPalette = processor.getPalette(0);
      setPalette(firstPalette);

      // Select the first color by default
      setSelectedColorSet(0);
      setSelectedIsBackground(true);
      setSelectedColor(firstPalette.normal.background);
    } catch (error) {
      console.error('Error initializing palette processor:', error);
    }
  }, [romData, romInfo]);

  // Load the preview images
  useEffect(() => {
    // Load song image
    const songImg = new Image();
    songImg.onload = () => setSongImage(songImg);
    songImg.src = '/resources/song.bmp';

    // Load instrument image
    const instrImg = new Image();
    instrImg.onload = () => setInstrImage(instrImg);
    instrImg.src = '/resources/instr.bmp';
  }, []);

  // Convert RGB555 to RGB
  const rgb555ToRgb = useCallback((color: RGB555) => {
    // Scale from 0-31 to 0-255
    const r = Math.round((color.r * 255) / 31);
    const g = Math.round((color.g * 255) / 31);
    const b = Math.round((color.b * 255) / 31);
    return { r, g, b };
  }, []);

  // Apply color space adjustments if needed (based on Java implementation)
  const applyColorSpace = useCallback((color: { r: number, g: number, b: number }) => {
    if (colorSpaceMode === 'desaturated') {
      // Convert to grayscale
      const gray = Math.round(0.299 * color.r + 0.587 * color.g + 0.114 * color.b);
      return { r: gray, g: gray, b: gray };
    }

    // Convert to 5-bit color components (0-31)
    let r = Math.floor(color.r / 8);
    let g = Math.floor(color.g / 8);
    let b = Math.floor(color.b / 8);

    // Apply curve
    r = SCALE_CHANNEL_WITH_CURVE[r];
    g = SCALE_CHANNEL_WITH_CURVE[g];
    b = SCALE_CHANNEL_WITH_CURVE[b];

    // Apply gamma correction
    const gamma = 2.2;
    let newG = Math.round(Math.pow((Math.pow(g / 255.0, gamma) * 3 + Math.pow(b / 255.0, gamma)) / 4, 1 / gamma) * 255);
    let newR = r;
    let newB = b;

    if (colorSpaceMode === 'gbc') {
      // Apply GBC color correction (from Java implementation)
      newR = Math.round(newR * 15 / 16 + (g + b) / 32);
      newG = Math.round(newG * 15 / 16 + (r + b) / 32);
      newB = Math.round(newB * 15 / 16 + (r + g) / 32);

      newR = Math.round(newR * (162 - 45) / 255 + 45);
      newG = Math.round(newG * (167 - 41) / 255 + 41);
      newB = Math.round(newB * (157 - 38) / 255 + 38);
    }

    return { r: newR, g: newG, b: newB };
  }, [colorSpaceMode]);

  // Function to update a preview canvas with the current palette
  const updatePreviewCanvas = useCallback((canvas: HTMLCanvasElement | null, image: HTMLImageElement) => {
    if (!canvas || !palette) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Set canvas dimensions to match the image
    canvas.width = image.width;
    canvas.height = image.height;

    // Draw the original image
    ctx.drawImage(image, 0, 0);

    // Get image data to modify
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Get palette colors
    const paletteColors = [
      rgb555ToRgb(palette.normal.background),
      rgb555ToRgb(palette.normal.mid),
      rgb555ToRgb(palette.normal.foreground),
      rgb555ToRgb(palette.shaded.background),
      rgb555ToRgb(palette.shaded.mid),
      rgb555ToRgb(palette.shaded.foreground),
      rgb555ToRgb(palette.alternate.background),
      rgb555ToRgb(palette.alternate.mid),
      rgb555ToRgb(palette.alternate.foreground),
      rgb555ToRgb(palette.cursor.background),
      rgb555ToRgb(palette.cursor.mid),
      rgb555ToRgb(palette.cursor.foreground),
      rgb555ToRgb(palette.scrollbar.background),
      rgb555ToRgb(palette.scrollbar.mid),
      rgb555ToRgb(palette.scrollbar.foreground)
    ];

    // Apply color space adjustments to all colors
    const colors = paletteColors.map(applyColorSpace);

    // Replace colors in the image
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Skip transparent pixels
      if (a === 0) continue;

      // Create a color value to compare with ScreenShotColors
      // Use Number() to ensure we're working with a positive number
      const pixelColor = Number(`0xff${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);

      // Get the color index from the mapping
      const colorIndex = COLOR_MAPPING[pixelColor];

      // Skip pixels that don't match any of our colors
      if (colorIndex === undefined) continue;

      const newColor = colors[colorIndex];

      // Update the pixel data
      data[i] = newColor.r;
      data[i + 1] = newColor.g;
      data[i + 2] = newColor.b;
    }

    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);
  }, [palette, applyColorSpace, rgb555ToRgb]);

  // Helper function to update both preview canvases
  const updatePreviews = useCallback(() => {
    if (!palette || !songImage || !instrImage) return;

    // Update song preview
    updatePreviewCanvas(songCanvasRef.current, songImage);

    // Update instrument preview
    updatePreviewCanvas(instrCanvasRef.current, instrImage);
  }, [palette, songImage, instrImage, updatePreviewCanvas]);

  // Update the preview canvases when the palette or images change
  useEffect(() => {
    updatePreviews();
  }, [updatePreviews]);

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

  // Select color from pixel value
  const selectColorFromPixel = useCallback((pixelColor: number) => {
    // Get the color index from the mapping
    const colorIndex = COLOR_MAPPING[pixelColor];

    // Skip if the color doesn't match any of our colors
    if (colorIndex === undefined) return;

    // Get the color set index and background/foreground flag
    const { colorSetIndex, isBackground } = COLOR_TO_SWATCH_MAPPING[colorIndex as keyof typeof COLOR_TO_SWATCH_MAPPING];

    // Select the color
    handleColorSelect(colorSetIndex, isBackground);
  }, [handleColorSelect]);

  // Handle click on preview images to select colors
  const handlePreviewClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    if (!palette) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((event.clientY - rect.top) * (canvas.height / rect.height));

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Get the pixel color at the clicked position
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const pixelColor = Number(`0xff${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`);

    // Select the appropriate swatch based on the color
    selectColorFromPixel(pixelColor);
  }, [palette, selectColorFromPixel]);

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

      // Update preview images
      updatePreviews();
    } catch (error) {
      console.error('Error loading palette:', error);
    }
  }, [paletteProcessor, selectedColorSet, selectedIsBackground, getColorSetByIndex, updatePreviews]);


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

      // Update preview images
      updatePreviews();
    } catch (error) {
      console.error('Error updating color:', error);
    }
  }, [paletteProcessor, palette, selectedPalette, selectedColorSet, selectedIsBackground, updatePreviews]);

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

      // Update preview images
      updatePreviews();
    } catch (error) {
      console.error('Error updating palette name:', error);
    }
  }, [paletteProcessor, palette, selectedPalette, updatePreviews]);

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

      // Update preview images
      updatePreviews();
    } catch (error) {
      console.error('Error randomizing palette:', error);
    }
  }, [paletteProcessor, palette, selectedPalette, selectedColorSet, selectedIsBackground, getColorSetByIndex, updatePreviews]);

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
    // Preview will update automatically due to dependency on colorSpaceMode in updatePreviewCanvas
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

      <div className="palette-editor-preview">
        <div className="preview-section">
          <h3>Song Screen Preview</h3>
          <div className="preview-image song-preview">
            {songImage ? (
              <canvas 
                ref={songCanvasRef} 
                onClick={e => songCanvasRef.current && handlePreviewClick(e, songCanvasRef.current)}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                aria-label="Song screen preview"
              />
            ) : (
              <div className="preview-placeholder">
                <p>Loading Song Preview...</p>
              </div>
            )}
          </div>
        </div>

        <div className="preview-section">
          <h3>Instrument Screen Preview</h3>
          <div className="preview-image instrument-preview">
            {instrImage ? (
              <canvas 
                ref={instrCanvasRef} 
                onClick={e => instrCanvasRef.current && handlePreviewClick(e, instrCanvasRef.current)}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                aria-label="Instrument screen preview"
              />
            ) : (
              <div className="preview-placeholder">
                <p>Loading Instrument Preview...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
