import { FontColor } from '../../types/font';
import './ColorSelector.css';

interface ColorSelectorProps {
  selectedColor: FontColor;
  rightColor: FontColor;
  onColorChange: (color: FontColor, isRight: boolean) => void;
  className?: string;
}

/**
 * ColorSelector component for selecting colors in the font editor
 * Provides buttons for selecting different colors for left and right mouse buttons
 */
export function ColorSelector({
  selectedColor,
  rightColor,
  onColorChange,
  className = ''
}: ColorSelectorProps) {
  // Array of available colors
  const colors: FontColor[] = [0, 1, 3];


  // Get the class name for a color button
  const getColorButtonClass = (color: FontColor, isSelected: boolean, isRight: boolean): string => {
    return `color-button color-${color} ${isSelected ? (isRight ? 'selected-right' : 'selected-left') : ''}`;
  };

  return (
    <div className={`color-selector ${className}`}>
      <div className="color-selector-label">Left Click:</div>
      <div className="color-buttons">
        {colors.map(color => (
          <button
            key={`left-${color}`}
            className={getColorButtonClass(color, color === selectedColor, false)}
            onClick={() => onColorChange(color, false)}
            aria-label={`Select color ${color} for left click`}
            aria-pressed={color === selectedColor}
          />
        ))}
      </div>

      <div className="color-selector-label">Right Click:</div>
      <div className="color-buttons">
        {colors.map(color => (
          <button
            key={`right-${color}`}
            className={getColorButtonClass(color, color === rightColor, true)}
            onClick={() => onColorChange(color, true)}
            aria-label={`Select color ${color} for right click`}
            aria-pressed={color === rightColor}
          />
        ))}
      </div>

    </div>
  );
}
