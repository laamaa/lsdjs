import { RGB555, rgb555ToHex } from '../../types/palette';
import './SwatchPair.css';

interface SwatchPairProps {
  name: string;
  backgroundColor: RGB555;
  foregroundColor: RGB555;
  onBackgroundSelect: () => void;
  onForegroundSelect: () => void;
  selectedSwatch: 'background' | 'foreground' | null;
  className?: string;
}

/**
 * SwatchPair component for displaying and selecting color pairs
 * Each pair consists of a background and foreground color
 */
export function SwatchPair({
  name,
  backgroundColor,
  foregroundColor,
  onBackgroundSelect,
  onForegroundSelect,
  selectedSwatch,
  className = ''
}: SwatchPairProps) {
  // Convert RGB555 to hex for CSS
  const bgHex = rgb555ToHex(backgroundColor);
  const fgHex = rgb555ToHex(foregroundColor);
  
  return (
    <div className={`swatch-pair ${className}`}>
      <div className="swatch-pair-label">{name}</div>
      <div className="swatch-pair-colors">
        <button
          className={`swatch background-swatch ${selectedSwatch === 'background' ? 'selected' : ''}`}
          style={{ backgroundColor: bgHex }}
          onClick={onBackgroundSelect}
          aria-label={`Select ${name} background color`}
          aria-pressed={selectedSwatch === 'background'}
        />
        <button
          className={`swatch foreground-swatch ${selectedSwatch === 'foreground' ? 'selected' : ''}`}
          style={{ backgroundColor: fgHex }}
          onClick={onForegroundSelect}
          aria-label={`Select ${name} foreground color`}
          aria-pressed={selectedSwatch === 'foreground'}
        />
      </div>
    </div>
  );
}

/**
 * Generate a random RGB555 color
 * @returns Random RGB555 color
 */
export function randomRGB555(): RGB555 {
  return {
    r: Math.floor(Math.random() * 32),
    g: Math.floor(Math.random() * 32),
    b: Math.floor(Math.random() * 32),
  };
}