import { useState, useEffect, useRef, useCallback } from 'react';
import { RGB555, Palette } from '../../types/palette';

function rgb555ToRgb(color: RGB555) {
  const r = Math.round((color.r * 255) / 31);
  const g = Math.round((color.g * 255) / 31);
  const b = Math.round((color.b * 255) / 31);
  return { r, g, b };
}

function pixelToColor(r: number, g: number, b: number): number {
  return 0xff000000 + (r << 16) + (g << 8) + b;
}

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

// GBC screen color curve (from Java LSDPatcher implementation)
const SCALE_CHANNEL_WITH_CURVE = [
  0, 6, 12, 20, 28, 36, 45, 56, 66, 76, 88, 100, 113, 125, 137, 149, 161, 172,
  182, 192, 202, 210, 218, 225, 232, 238, 243, 247, 250, 252, 254, 255
];

const COLOR_MAPPING: Record<number, number> = {
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

const COLOR_TO_SWATCH_MAPPING: Record<number, { colorSetIndex: number; isBackground: boolean }> = {
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

type ColorSpaceMode = 'modern' | 'gbc' | 'desaturated';

interface PalettePreviewProps {
  palette: Palette;
  colorSpaceMode: ColorSpaceMode;
  onColorSelect: (colorSetIndex: number, isBackground: boolean) => void;
}

export function PalettePreview({
  palette,
  colorSpaceMode,
  onColorSelect,
}: PalettePreviewProps) {
  const songCanvasRef = useRef<HTMLCanvasElement>(null);
  const instrCanvasRef = useRef<HTMLCanvasElement>(null);

  const [songImage, setSongImage] = useState<HTMLImageElement | null>(null);
  const [instrImage, setInstrImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const songImg = new Image();
    songImg.crossOrigin = 'anonymous';
    songImg.onload = () => {
      if (songImg.width > 0 && songImg.height > 0) {
        setSongImage(songImg);
      } else {
        console.error('Song image loaded but dimensions are invalid');
      }
    };
    songImg.onerror = (e) => {
      console.error('Error loading song image:', e);
    };
    songImg.src = '/resources/song.bmp';

    const instrImg = new Image();
    instrImg.crossOrigin = 'anonymous';
    instrImg.onload = () => {
      if (instrImg.width > 0 && instrImg.height > 0) {
        setInstrImage(instrImg);
      } else {
        console.error('Instrument image loaded but dimensions are invalid');
      }
    };
    instrImg.onerror = (e) => {
      console.error('Error loading instrument image:', e);
    };
    instrImg.src = '/resources/instr.bmp';
  }, []);

  const applyColorSpace = useCallback((color: { r: number, g: number, b: number }) => {
    if (colorSpaceMode === 'desaturated') {
      const gray = Math.round(0.299 * color.r + 0.587 * color.g + 0.114 * color.b);
      return { r: gray, g: gray, b: gray };
    }

    let r = Math.floor(color.r / 8);
    let g = Math.floor(color.g / 8);
    let b = Math.floor(color.b / 8);

    r = SCALE_CHANNEL_WITH_CURVE[r];
    g = SCALE_CHANNEL_WITH_CURVE[g];
    b = SCALE_CHANNEL_WITH_CURVE[b];

    const gamma = 2.2;
    let newG = Math.round(Math.pow((Math.pow(g / 255.0, gamma) * 3 + Math.pow(b / 255.0, gamma)) / 4, 1 / gamma) * 255);
    let newR = r;
    let newB = b;

    if (colorSpaceMode === 'gbc') {
      newR = Math.round(newR * 15 / 16 + (g + b) / 32);
      newG = Math.round(newG * 15 / 16 + (r + b) / 32);
      newB = Math.round(newB * 15 / 16 + (r + g) / 32);

      newR = Math.round(newR * (162 - 45) / 255 + 45);
      newG = Math.round(newG * (167 - 41) / 255 + 41);
      newB = Math.round(newB * (157 - 38) / 255 + 38);
    }

    return { r: newR, g: newG, b: newB };
  }, [colorSpaceMode]);

  const updatePreviewCanvas = useCallback((canvas: HTMLCanvasElement | null, image: HTMLImageElement) => {
    if (!canvas || !image.complete) return;

    if (image.width === 0 || image.height === 0) {
      console.error('Image has invalid dimensions', image);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = image.width;
    canvas.height = image.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      ctx.drawImage(image, 0, 0);
    } catch (error) {
      console.error('Error drawing image to canvas:', error);
      return;
    }

    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (error) {
      console.error('Error getting image data from canvas:', error);
      return;
    }
    const data = imageData.data;

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

    const colors = paletteColors.map(applyColorSpace);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a === 0) continue;

      const colorIndex = COLOR_MAPPING[pixelToColor(r, g, b)];

      if (colorIndex === undefined) continue;

      const newColor = colors[colorIndex];

      data[i] = newColor.r;
      data[i + 1] = newColor.g;
      data[i + 2] = newColor.b;
    }

    try {
      ctx.putImageData(imageData, 0, 0);
    } catch (error) {
      console.error('Error putting image data back to canvas:', error);
    }
  }, [palette, applyColorSpace]);

  const updatePreviews = useCallback(() => {
    if (songImage && songImage.complete && songImage.width > 0) {
      updatePreviewCanvas(songCanvasRef.current, songImage);
    }

    if (instrImage && instrImage.complete && instrImage.width > 0) {
      updatePreviewCanvas(instrCanvasRef.current, instrImage);
    }
  }, [songImage, instrImage, updatePreviewCanvas]);

  useEffect(() => {
    updatePreviews();

    // Add a small delay and update again to ensure Firefox renders correctly
    const timeoutId = setTimeout(() => {
      updatePreviews();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [updatePreviews]);

  const selectColorFromPixel = useCallback((pixelColor: number) => {
    const colorIndex = COLOR_MAPPING[pixelColor];
    if (colorIndex === undefined) return;

    const { colorSetIndex, isBackground } = COLOR_TO_SWATCH_MAPPING[colorIndex];
    onColorSelect(colorSetIndex, isBackground);
  }, [onColorSelect]);

  const handlePreviewClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((event.clientY - rect.top) * (canvas.height / rect.height));

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    try {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      selectColorFromPixel(pixelToColor(pixel[0], pixel[1], pixel[2]));
    } catch (error) {
      console.error('Error getting pixel data at click position:', error);
    }
  }, [selectColorFromPixel]);

  return (
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
  );
}
