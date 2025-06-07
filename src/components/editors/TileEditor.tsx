import { useRef, useEffect, useState } from 'react';
import { FontColor } from '../../types/font';

interface TileEditorProps {
  tileData: number[][];
  selectedColor: FontColor;
  rightColor: FontColor;
  onTileChange: (tileData: number[][]) => void;
  className?: string;
}

/**
 * TileEditor component for editing individual font tiles
 * Provides a grid interface for pixel-level editing
 */
export function TileEditor({ 
  tileData, 
  selectedColor, 
  rightColor, 
  onTileChange,
  className = ''
}: TileEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 240, height: 240 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeButton, setActiveButton] = useState(-1);
  const [lastPosition, setLastPosition] = useState({ x: -1, y: -1 });

  // Draw the tile on the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate pixel size
    const pixelSize = Math.min(canvas.width, canvas.height) / 8;

    // Draw the pixels
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const color = tileData[y][x];
        ctx.fillStyle = getColorForValue(color);
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }

    // Draw the grid
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)';
    ctx.lineWidth = 1;

    for (let i = 1; i < 8; i++) {
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(i * pixelSize, 0);
      ctx.lineTo(i * pixelSize, canvas.height);
      ctx.stroke();

      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(0, i * pixelSize);
      ctx.lineTo(canvas.width, i * pixelSize);
      ctx.stroke();
    }
  }, [tileData]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const container = canvasRef.current.parentElement;
        if (container) {
          const size = Math.min(container.clientWidth, container.clientHeight);
          setCanvasSize({ width: size, height: size });
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Convert a color value to a CSS color string
  function getColorForValue(value: number): string {
    switch (value) {
      case 0: return 'white';
      case 1: return 'lightgray';
      case 2: return 'darkgray';
      case 3: return 'black';
      default: return 'white';
    }
  }

  // Handle mouse down event
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setActiveButton(e.button);
    const { x, y } = getPixelCoordinates(e);
    if (x >= 0 && x < 8 && y >= 0 && y < 8) {
      setLastPosition({ x, y });
      setPixel(x, y, e.button === 0 ? selectedColor : rightColor);
    }
  };

  // Handle mouse move event
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const { x, y } = getPixelCoordinates(e);
    if (x >= 0 && x < 8 && y >= 0 && y < 8 && (x !== lastPosition.x || y !== lastPosition.y)) {
      setLastPosition({ x, y });
      setPixel(x, y, activeButton === 0 ? selectedColor : rightColor);
    }
  };

  // Handle mouse up event
  const handleMouseUp = () => {
    setIsDrawing(false);
    setActiveButton(-1);
  };

  // Handle mouse leave event
  const handleMouseLeave = () => {
    setIsDrawing(false);
    setActiveButton(-1);
  };

  // Prevent context menu on right-click
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Get the pixel coordinates from a mouse event
  const getPixelCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: -1, y: -1 };

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * 8);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * 8);

    return { x, y };
  };

  // Set a pixel in the tile data
  const setPixel = (x: number, y: number, color: FontColor) => {
    if (x < 0 || x >= 8 || y < 0 || y >= 8) return;

    // Create a copy of the tile data
    const newTileData = tileData.map(row => [...row]);

    // Update the pixel
    newTileData[y][x] = color;

    // Notify parent component
    onTileChange(newTileData);
  };

  return (
    <div className={`tile-editor ${className}`}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        role="img"
        aria-label="Font tile editor"
      />

      <style>{`
        .tile-editor {
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: var(--gb-darkest);
          border: 4px solid var(--gb-light);
          padding: 1rem;
          box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
        }

        .tile-editor canvas {
          image-rendering: pixelated;
          image-rendering: crisp-edges;
          cursor: crosshair;
          max-width: 100%;
          max-height: 100%;
        }
      `}</style>
    </div>
  );
}
