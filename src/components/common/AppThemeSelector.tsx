import React, {useEffect, useRef, useState} from 'react';
import {palettes, PaletteType, useTheme} from '../../context/ThemeContext';
import './AppThemeSelector.css';

interface AppThemeSelectorProps {
  className?: string;
  hideFromScreenReaders?: boolean;
}

/**
 * AppThemeSelector component for switching between different retro video game inspired palettes
 * Uses an SVG palette icon that shows a dropdown menu when clicked
 * 
 * @param className - Optional CSS class name to apply to the component
 * @param hideFromScreenReaders - Optional flag to hide the component from screen readers (default: false)
 *                               Set to true to completely hide this component from screen readers
 *                               when it's not relevant for non-visual users
 */
export function AppThemeSelector({ className = '', hideFromScreenReaders = false }: AppThemeSelectorProps) {
  const { currentPalette, setPalette, availablePalettes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePaletteChange = (palette: PaletteType) => {
    setPalette(palette);
    setIsOpen(false);
  };

  return (
    <div 
      className={`app-theme-selector ${className}`} 
      ref={dropdownRef}
      aria-hidden={hideFromScreenReaders}>
      <button 
        className="theme-icon-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select color palette"
        aria-expanded={isOpen}
      >
        <svg 
          className="theme-icon" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 8 6.5 8 8 8.67 8 9.5 7.33 11 6.5 11zm3-4C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4s1.5.67 1.5 1.5S15.33 7 14.5 7zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
        </svg>
      </button>

      {isOpen && (
        <div className="theme-dropdown" role="dialog" aria-label="Select color palette">
          <ul className="theme-list" role="menu" aria-label="Available palettes">
            {availablePalettes.map((paletteKey) => (
              <li 
                key={paletteKey} 
                className={`theme-item ${currentPalette === paletteKey ? 'active' : ''}`}
                onClick={() => handlePaletteChange(paletteKey)}
                role="menuitem"
                aria-selected={currentPalette === paletteKey}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handlePaletteChange(paletteKey);
                    e.preventDefault();
                  }
                }}
              >
                <div className="theme-preview" aria-hidden="true">
                  <span 
                    className="color-lightest" 
                    style={{ backgroundColor: palettes[paletteKey].colors.lightest }}
                    aria-label={`Lightest color for ${palettes[paletteKey].name} palette`}
                  ></span>
                  <span 
                    className="color-light" 
                    style={{ backgroundColor: palettes[paletteKey].colors.light }}
                    aria-label={`Light color for ${palettes[paletteKey].name} palette`}
                  ></span>
                  <span 
                    className="color-dark" 
                    style={{ backgroundColor: palettes[paletteKey].colors.dark }}
                    aria-label={`Dark color for ${palettes[paletteKey].name} palette`}
                  ></span>
                  <span 
                    className="color-darkest" 
                    style={{ backgroundColor: palettes[paletteKey].colors.darkest }}
                    aria-label={`Darkest color for ${palettes[paletteKey].name} palette`}
                  ></span>
                </div>
                <span className="theme-name">{palettes[paletteKey].name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
}
