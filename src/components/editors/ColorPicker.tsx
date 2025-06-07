import { useState, useEffect } from 'react';
import { RGB555, rgb555ToHex, hexToRgb555 } from '../../types/palette';
import './ColorPicker.css';

interface ColorPickerProps {
  color: RGB555;
  onChange: (color: RGB555) => void;
  className?: string;
}

/**
 * ColorPicker component for selecting colors in the palette editor
 * Provides a color wheel and sliders for selecting colors
 */
export function ColorPicker({ color, onChange, className = '' }: ColorPickerProps) {
  // Convert RGB555 to hex for the color inputs
  const [hexColor, setHexColor] = useState(rgb555ToHex(color));
  
  // Update hex color when the color prop changes
  useEffect(() => {
    setHexColor(rgb555ToHex(color));
  }, [color]);
  
  // Handle color change from the color picker
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHexColor = e.target.value;
    setHexColor(newHexColor);
    onChange(hexToRgb555(newHexColor));
  };
  
  // Handle individual RGB component changes
  const handleComponentChange = (component: 'r' | 'g' | 'b', value: number) => {
    // Ensure value is within range (0-31)
    const clampedValue = Math.max(0, Math.min(31, value));
    
    // Create a new color object with the updated component
    const newColor: RGB555 = { ...color, [component]: clampedValue };
    
    // Update the hex color
    setHexColor(rgb555ToHex(newColor));
    
    // Notify parent component
    onChange(newColor);
  };
  
  return (
    <div className={`color-picker ${className}`}>
      <div className="color-picker-preview" style={{ backgroundColor: hexColor }}>
        <div className="color-picker-hex">
          <input
            type="color"
            value={hexColor}
            onChange={handleColorChange}
            aria-label="Color picker"
          />
          <span>{hexColor}</span>
        </div>
      </div>
      
      <div className="color-picker-sliders">
        <div className="color-picker-slider">
          <label htmlFor="red-slider">R:</label>
          <input
            id="red-slider"
            type="range"
            min="0"
            max="31"
            value={color.r}
            onChange={(e) => handleComponentChange('r', parseInt(e.target.value))}
            className="red-slider"
            aria-label="Red component"
          />
          <input
            type="number"
            min="0"
            max="31"
            value={color.r}
            onChange={(e) => handleComponentChange('r', parseInt(e.target.value))}
            aria-label="Red component value"
          />
        </div>
        
        <div className="color-picker-slider">
          <label htmlFor="green-slider">G:</label>
          <input
            id="green-slider"
            type="range"
            min="0"
            max="31"
            value={color.g}
            onChange={(e) => handleComponentChange('g', parseInt(e.target.value))}
            className="green-slider"
            aria-label="Green component"
          />
          <input
            type="number"
            min="0"
            max="31"
            value={color.g}
            onChange={(e) => handleComponentChange('g', parseInt(e.target.value))}
            aria-label="Green component value"
          />
        </div>
        
        <div className="color-picker-slider">
          <label htmlFor="blue-slider">B:</label>
          <input
            id="blue-slider"
            type="range"
            min="0"
            max="31"
            value={color.b}
            onChange={(e) => handleComponentChange('b', parseInt(e.target.value))}
            className="blue-slider"
            aria-label="Blue component"
          />
          <input
            type="number"
            min="0"
            max="31"
            value={color.b}
            onChange={(e) => handleComponentChange('b', parseInt(e.target.value))}
            aria-label="Blue component value"
          />
        </div>
      </div>
      
      <div className="color-picker-info">
        <p>RGB555: {color.r}, {color.g}, {color.b}</p>
      </div>
    </div>
  );
}