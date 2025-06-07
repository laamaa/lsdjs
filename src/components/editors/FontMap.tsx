import { useRef, useEffect, useState, useCallback } from 'react';
import { FONT_CONSTANTS } from '../../types/font';

interface FontMapProps {
  fontData: number[][][];
  selectedTile: number;
  showGfxCharacters: boolean;
  onTileSelect: (tileIndex: number) => void;
  className?: string;
}

/**
 * FontMap component for displaying and selecting font tiles
 * Provides a grid of all characters in the font
 */
export function FontMap({
  fontData,
  selectedTile,
  showGfxCharacters,
  onTileSelect,
  className = ''
}: FontMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 128, height: 128 });
  const [zoom, setZoom] = useState(1);

  // Calculate the current map height based on whether graphics characters are shown
  const getCurrentMapHeight = useCallback(() => {
    return showGfxCharacters 
      ? FONT_CONSTANTS.GFX_FONT_MAP_HEIGHT 
      : FONT_CONSTANTS.FONT_MAP_HEIGHT;
  }, [showGfxCharacters]);

  // Calculate the current number of tiles to display
  const getCurrentTileCount = useCallback(() => {
    return showGfxCharacters
      ? FONT_CONSTANTS.TILE_COUNT + FONT_CONSTANTS.GFX_TILE_COUNT
      : FONT_CONSTANTS.TILE_COUNT;
  }, [showGfxCharacters]);

  // Get tile data for a specific tile index
  const getTileData = useCallback((tileIndex: number): number[][] => {
    if (tileIndex < 0 || tileIndex >= fontData.length) {
      // Return empty tile if index is out of bounds
      return Array(8).fill(0).map(() => Array(8).fill(0));
    }
    return fontData[tileIndex];
  }, [fontData]);

  // Convert a color value to a CSS color string
  const getColorForValue = (value: number): string => {
    switch (value) {
      case 0: return 'white';
      case 1: return 'lightgray';
      case 2: return 'darkgray';
      case 3: return 'black';
      default: return 'white';
    }
  };

  // Draw the font map on the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Log when the canvas is being drawn with the selected tile
    console.log('Drawing FontMap canvas with selectedTile:', selectedTile);

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate the current map height
    const currentMapHeight = getCurrentMapHeight();

    // Calculate the zoom factor based on available space
    const widthScale = canvas.width / FONT_CONSTANTS.FONT_MAP_WIDTH;
    const heightScale = canvas.height / currentMapHeight;
    const newZoom = Math.max(1, Math.min(widthScale, heightScale));

    // Update the zoom if it's changed
    if (newZoom !== zoom) {
      setZoom(newZoom);
    }

    // Calculate offsets to center the map
    const offsetX = (canvas.width - FONT_CONSTANTS.FONT_MAP_WIDTH * newZoom) / 2;
    const offsetY = (canvas.height - currentMapHeight * newZoom) / 2;

    // Draw each tile
    const tileCount = getCurrentTileCount();
    for (let tile = 0; tile < tileCount; tile++) {
      const x = (tile % FONT_CONSTANTS.FONT_NUM_TILES_X) * 8 * newZoom + offsetX;
      const y = Math.floor(tile / FONT_CONSTANTS.FONT_NUM_TILES_X) * 8 * newZoom + offsetY;

      // Get the tile data
      const tileData = getTileData(tile);

      // Draw the tile
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const color = tileData[row][col];
          ctx.fillStyle = getColorForValue(color);
          ctx.fillRect(
            x + col * newZoom, 
            y + row * newZoom, 
            newZoom, 
            newZoom
          );
        }
      }

      // Highlight the selected tile
      if (tile === selectedTile) {
        ctx.strokeStyle = 'rgba(0, 0, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 8 * newZoom, 8 * newZoom);
      }
    }
  }, [fontData, selectedTile, showGfxCharacters, canvasSize, zoom, getCurrentMapHeight, getCurrentTileCount, getTileData]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const container = canvasRef.current.parentElement;
        if (container) {
          const width = container.clientWidth;
          const height = container.clientHeight;
          setCanvasSize({ width, height });
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle mouse click to select a tile
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const offsetX = (canvas.width - FONT_CONSTANTS.FONT_MAP_WIDTH * zoom) / 2;
    const offsetY = (canvas.height - getCurrentMapHeight() * zoom) / 2;

    const x = e.clientX - rect.left - offsetX;
    const y = e.clientY - rect.top - offsetY;

    // Check if click is within the font map
    if (x < 0 || y < 0 || 
        x > FONT_CONSTANTS.FONT_MAP_WIDTH * zoom || 
        y > getCurrentMapHeight() * zoom) {
      return;
    }

    // Calculate the tile index
    const tileX = Math.floor(x / (8 * zoom));
    const tileY = Math.floor(y / (8 * zoom));
    const tile = tileY * FONT_CONSTANTS.FONT_NUM_TILES_X + tileX;

    // Check if the tile index is valid
    if (tile < 0 || tile >= getCurrentTileCount()) {
      return;
    }

    // Notify parent component
    onTileSelect(tile);
  };

  return (
    <div className={`font-map ${className}`}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onClick={handleClick}
        role="grid"
        aria-label="Font character map"
      />

      <style>{`
        .font-map {
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: var(--gb-darkest);
          border: 4px solid var(--gb-light);
          padding: 0.5rem;
          box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
          width: 100%;
          height: 100%;
          min-height: 200px;
        }

        .font-map canvas {
          image-rendering: pixelated;
          image-rendering: crisp-edges;
          cursor: pointer;
          max-width: 100%;
          max-height: 100%;
        }
      `}</style>
    </div>
  );
}
