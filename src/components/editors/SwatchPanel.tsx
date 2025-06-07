import { useState } from 'react';
import { ColorSet } from '../../types/palette';
import { SwatchPair } from './SwatchPair';
import { Button } from '../common/Button';
import './SwatchPanel.css';

interface SwatchPanelProps {
  normalSet: ColorSet;
  shadedSet: ColorSet;
  alternateSet: ColorSet;
  cursorSet: ColorSet;
  scrollbarSet: ColorSet;
  onColorSelect: (colorSetIndex: number, isBackground: boolean) => void;
  onRandomize?: () => void;
  className?: string;
}

/**
 * SwatchPanel component for displaying and managing multiple swatch pairs
 * Displays 5 swatch pairs for the different color sets in a palette
 */
export function SwatchPanel({
  normalSet,
  shadedSet,
  alternateSet,
  cursorSet,
  scrollbarSet,
  onColorSelect,
  onRandomize,
  className = ''
}: SwatchPanelProps) {
  // Track which swatch is selected
  const [selectedColorSet, setSelectedColorSet] = useState<number | null>(null);
  const [selectedSwatch, setSelectedSwatch] = useState<'background' | 'foreground' | null>(null);
  
  // Handle swatch selection
  const handleSwatchSelect = (colorSetIndex: number, isBackground: boolean) => {
    setSelectedColorSet(colorSetIndex);
    setSelectedSwatch(isBackground ? 'background' : 'foreground');
    onColorSelect(colorSetIndex, isBackground);
  };
  
  return (
    <div className={`swatch-panel ${className}`}>
      <div className="swatch-panel-header">
        <h3>Color Sets</h3>
        {onRandomize && (
          <Button 
            onClick={onRandomize}
            size="small"
            aria-label="Randomize all colors"
          >
            Random
          </Button>
        )}
      </div>
      
      <div className="swatch-panel-grid">
        <SwatchPair
          name="Normal"
          backgroundColor={normalSet.background}
          foregroundColor={normalSet.foreground}
          onBackgroundSelect={() => handleSwatchSelect(0, true)}
          onForegroundSelect={() => handleSwatchSelect(0, false)}
          selectedSwatch={selectedColorSet === 0 ? selectedSwatch : null}
        />
        
        <SwatchPair
          name="Shaded"
          backgroundColor={shadedSet.background}
          foregroundColor={shadedSet.foreground}
          onBackgroundSelect={() => handleSwatchSelect(1, true)}
          onForegroundSelect={() => handleSwatchSelect(1, false)}
          selectedSwatch={selectedColorSet === 1 ? selectedSwatch : null}
        />
        
        <SwatchPair
          name="Alternate"
          backgroundColor={alternateSet.background}
          foregroundColor={alternateSet.foreground}
          onBackgroundSelect={() => handleSwatchSelect(2, true)}
          onForegroundSelect={() => handleSwatchSelect(2, false)}
          selectedSwatch={selectedColorSet === 2 ? selectedSwatch : null}
        />
        
        <SwatchPair
          name="Cursor"
          backgroundColor={cursorSet.background}
          foregroundColor={cursorSet.foreground}
          onBackgroundSelect={() => handleSwatchSelect(3, true)}
          onForegroundSelect={() => handleSwatchSelect(3, false)}
          selectedSwatch={selectedColorSet === 3 ? selectedSwatch : null}
        />
        
        <SwatchPair
          name="Scrollbar"
          backgroundColor={scrollbarSet.background}
          foregroundColor={scrollbarSet.foreground}
          onBackgroundSelect={() => handleSwatchSelect(4, true)}
          onForegroundSelect={() => handleSwatchSelect(4, false)}
          selectedSwatch={selectedColorSet === 4 ? selectedSwatch : null}
        />
      </div>
    </div>
  );
}