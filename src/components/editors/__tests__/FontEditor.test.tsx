import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FontEditor } from '../FontEditor';
import { FontProcessor } from '../../../services/binary/FontProcessor';
import { RomProvider } from '../../../context/RomContext';
import { vi } from 'vitest';

// Mock the FontMap component to avoid canvas-related errors
vi.mock('../FontMap', () => ({
  FontMap: ({ onTileSelect }: { onTileSelect: (index: number) => void }) => (
    <div data-testid="font-map">
      <button onClick={() => onTileSelect(1)}>Select Tile 1</button>
    </div>
  ),
}));

// Mock the TileEditor component
vi.mock('../TileEditor', () => ({
  TileEditor: ({ onTileChange }: { onTileChange: (data: number[][]) => void }) => (
    <div data-testid="tile-editor">
      <button onClick={() => onTileChange(Array(8).fill(Array(8).fill(0)))}>Edit Tile</button>
    </div>
  ),
}));

// Mock the DropdownSelector component
vi.mock('../../../components/common/DropdownSelector', () => ({
  DropdownSelector: ({ onSelect }: { onSelect: (index: number) => void }) => (
    <select 
      role="combobox"
      onChange={(e) => onSelect(Number(e.target.value))}
      data-testid="font-selector"
    >
      <option value="0">FONT1</option>
      <option value="1">FONT2</option>
      <option value="2">FONT3</option>
    </select>
  ),
}));

// Mock the FontProcessor class (must be a non-arrow function so `new FontProcessor()` works)
vi.mock('../../../services/binary/FontProcessor', () => {
  function createInstance() {
    return {
      getTilePixel: vi.fn().mockReturnValue(0),
      setTilePixel: vi.fn(),
      generateShadedAndInvertedTiles: vi.fn(),
      rotateTileUp: vi.fn(),
      rotateTileDown: vi.fn(),
      rotateTileLeft: vi.fn(),
      rotateTileRight: vi.fn(),
    };
  }
  return {
    FontProcessor: vi.fn(function FontProcessor() {
      return createInstance();
    }),
  };
});

// Mock the RomProcessor methods
vi.mock('../../../services/binary/RomProcessor', () => {
  return {
    RomProcessor: {
      findFontOffset: vi.fn().mockReturnValue(0),
      findGfxFontOffset: vi.fn().mockReturnValue(500),
      findFontNameOffset: vi.fn().mockReturnValue(1000),
    },
  };
});

const mockRomState = {
  romInfo: {
    title: 'Test ROM',
    version: '1.0',
    isValid: true,
    size: 1024,
    banks: 2,
    hasPalettes: false,
    hasFonts: true,
    kitBanks: [],
    kitNames: {},
  },
  romData: new ArrayBuffer(1024),
};

function renderFontEditor(romState?: { romInfo: typeof mockRomState.romInfo | null; romData: ArrayBuffer | null }) {
  const initialState = romState ?? { romInfo: null, romData: null };
  return render(
    <RomProvider initialState={initialState}>
      <FontEditor />
    </RomProvider>
  );
}

describe('FontEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a message when no ROM is loaded', () => {
    renderFontEditor();
    expect(screen.getByText(/Please load a ROM file with font data to use the Font Editor/i)).toBeInTheDocument();
  });

  it('renders the font editor when a ROM with fonts is loaded', () => {
    renderFontEditor(mockRomState);

    // Check that the font editor components are rendered
    expect(screen.getByRole('combobox')).toBeInTheDocument(); // Font selector
    expect(screen.getByText('Left Click:')).toBeInTheDocument(); // Color selector
    expect(screen.getByText('Right Click:')).toBeInTheDocument(); // Color selector
  });

  it('initializes the FontProcessor when a ROM is loaded', () => {
    renderFontEditor(mockRomState);

    // Check that the FontProcessor was initialized
    expect(FontProcessor).toHaveBeenCalled();
  });

  it('changes the selected font when the dropdown is changed', () => {
    renderFontEditor(mockRomState);

    // Find the font selector dropdown
    const fontSelector = screen.getByRole('combobox');

    // Change the selected font
    fireEvent.change(fontSelector, { target: { value: '1' } });

    // Check that a new FontProcessor was created with the correct offset
    expect(FontProcessor).toHaveBeenCalledTimes(2); // Once on initial render, once on change
  });

  it('toggles graphics characters when the button is clicked', () => {
    renderFontEditor(mockRomState);

    // Find the graphics toggle button
    const gfxToggleButton = screen.getByRole('button', { name: /Show all characters/i });

    // Click the button to show graphics characters
    fireEvent.click(gfxToggleButton);

    // Check that the button state changed
    expect(gfxToggleButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('rotates the tile when rotation buttons are clicked', () => {
    // Create mock functions for the FontProcessor methods
    const rotateTileUp = vi.fn();
    const rotateTileDown = vi.fn();
    const rotateTileLeft = vi.fn();
    const rotateTileRight = vi.fn();

    // Mock the FontProcessor class before rendering
    (FontProcessor as unknown as vi.Mock).mockImplementation(function FontProcessor() {
      return {
        getTilePixel: vi.fn().mockReturnValue(0),
        setTilePixel: vi.fn(),
        generateShadedAndInvertedTiles: vi.fn(),
        rotateTileUp,
        rotateTileDown,
        rotateTileLeft,
        rotateTileRight,
      };
    });

    renderFontEditor(mockRomState);

    // Find the rotation buttons
    const upButton = screen.getByRole('button', { name: /Rotate up/i });
    const downButton = screen.getByRole('button', { name: /Rotate down/i });
    const leftButton = screen.getByRole('button', { name: /Rotate left/i });
    const rightButton = screen.getByRole('button', { name: /Rotate right/i });

    // Click each button and check that the corresponding method was called
    fireEvent.click(upButton);
    expect(rotateTileUp).toHaveBeenCalledWith(0); // 0 is the default selected tile

    fireEvent.click(downButton);
    expect(rotateTileDown).toHaveBeenCalledWith(0);

    fireEvent.click(leftButton);
    expect(rotateTileLeft).toHaveBeenCalledWith(0);

    fireEvent.click(rightButton);
    expect(rotateTileRight).toHaveBeenCalledWith(0);
  });

  it('changes the selected color when color buttons are clicked', () => {
    renderFontEditor(mockRomState);

    // Find the color buttons for left click
    const leftColorButtons = screen.getAllByLabelText(/Select color \d for left click/);

    // Click on the color button for color 1
    fireEvent.click(leftColorButtons[1]); // Index 1 corresponds to color 1

    // Find the color buttons for right click
    const rightColorButtons = screen.getAllByLabelText(/Select color \d for right click/);

    // Click on the color button for color 3
    fireEvent.click(rightColorButtons[2]); // Index 2 corresponds to color 3

    // Check that the buttons are marked as selected
    expect(leftColorButtons[1]).toHaveAttribute('aria-pressed', 'true');
    expect(rightColorButtons[2]).toHaveAttribute('aria-pressed', 'true');
  });
});
