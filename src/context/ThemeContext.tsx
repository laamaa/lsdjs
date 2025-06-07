import React, {createContext, ReactNode, useContext, useEffect, useState} from 'react';

// Define the palette types
export type PaletteType = 'gameboy' | 'nes' | 'snes' | 'sega' | 'c64' | 'amiga';

// Define the palette interface
interface Palette {
  name: string;
  colors: {
    lightest: string;
    light: string;
    dark: string;
    darkest: string;
  };
}

// Define the palettes
const palettes: Record<PaletteType, Palette> = {
  gameboy: {
    name: 'Game Boy',
    colors: {
      lightest: '#9BBC0F', // Lightest green
      light: '#8BAC0F',    // Light green
      dark: '#306230',     // Dark green
      darkest: '#0F380F',  // Darkest green
    },
  },
  nes: {
    name: 'NES',
    colors: {
      lightest: '#FCE6BC', // Light beige
      light: '#F8A060',    // Orange
      dark: '#D84000',     // Red-orange
      darkest: '#503000',  // Dark brown
    },
  },
  snes: {
    name: 'SNES',
    colors: {
      lightest: '#F8F8F8', // Light gray
      light: '#A8A8F8',    // Light purple
      dark: '#6050F8',     // Purple
      darkest: '#282880',  // Dark blue
    },
  },
  sega: {
    name: 'Sega',
    colors: {
      lightest: '#F8F8F8', // White
      light: '#00A0F8',    // Light blue
      dark: '#0000F8',     // Blue
      darkest: '#000050',  // Dark blue
    },
  },
  c64: {
    name: 'C64',
    colors: {
      lightest: '#AAFFEE', // Light cyan
      light: '#50B8F8',    // Light blue
      dark: '#5050F8',     // Blue
      darkest: '#000088',  // Dark blue
    },
  },
  amiga: {
    name: 'Amiga',
    colors: {
      lightest: '#FFFFFF', // Light gray
      light: '#FF8800',    // Orange
      dark: '#0055AA',     // Blue
      darkest: '#0055AA',  // Blue
    },
  },
};

// Define the theme context interface
interface ThemeContextType {
  currentPalette: PaletteType;
  setPalette: (palette: PaletteType) => void;
  availablePalettes: PaletteType[];
}

// Create the theme context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Create the theme provider props interface
interface ThemeProviderProps {
  children: ReactNode;
}

// Create the theme provider component
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [currentPalette, setCurrentPalette] = useState<PaletteType>('gameboy');
  const availablePalettes = Object.keys(palettes) as PaletteType[];

  // Apply the palette to CSS variables
  useEffect(() => {
    const palette = palettes[currentPalette];
    document.documentElement.style.setProperty('--gb-lightest', palette.colors.lightest);
    document.documentElement.style.setProperty('--gb-light', palette.colors.light);
    document.documentElement.style.setProperty('--gb-dark', palette.colors.dark);
    document.documentElement.style.setProperty('--gb-darkest', palette.colors.darkest);
    document.documentElement.style.setProperty('--gb-bg', palette.colors.darkest);
    document.documentElement.style.setProperty('--gb-text', palette.colors.lightest);
    document.documentElement.style.setProperty('--gb-border', palette.colors.light);
    document.documentElement.style.setProperty('--gb-highlight', palette.colors.lightest);
  }, [currentPalette]);

  // Set the palette
  const setPalette = (palette: PaletteType) => {
    setCurrentPalette(palette);
    localStorage.setItem('lsdpatcher-palette', palette);
  };

  // Load the palette from localStorage on mount
  useEffect(() => {
    const savedPalette = localStorage.getItem('lsdpatcher-palette') as PaletteType | null;
    if (savedPalette && palettes[savedPalette]) {
      setCurrentPalette(savedPalette);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ currentPalette, setPalette, availablePalettes }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Create a hook to use the theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Export the palettes for use in other components
export { palettes };
