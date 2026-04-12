import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import {RomInfoDisplay} from '../RomInfoDisplay';
import {RomProvider, RomInfo} from '../../../context/RomContext';
import {KitProvider} from '../../../context/KitContext';

describe('RomInfoDisplay', () => {
  const mockRomInfo: RomInfo = {
    title: 'LSDJ v8.5.1',
    version: 'v85',
    isValid: true,
    size: 524288,
    banks: 32,
    hasPalettes: true,
    hasFonts: true,
    kitBanks: [],
    kitNames: {},
  };

  const mockArrayBuffer = new ArrayBuffer(10);

  function renderRomInfoDisplay(romState?: { romInfo: RomInfo | null; romData: ArrayBuffer | null; isLoading?: boolean; error?: string | null }) {
    const initialState = {
      romInfo: romState?.romInfo ?? null,
      romData: romState?.romData ?? null,
      isLoading: romState?.isLoading ?? false,
      error: romState?.error ?? null,
    };
    return render(
      <RomProvider initialState={initialState}>
        <KitProvider>
          <RomInfoDisplay />
        </KitProvider>
      </RomProvider>
    );
  }

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders the component with initial state', () => {
    renderRomInfoDisplay();

    expect(screen.getByText('Select ROM File')).toBeInTheDocument();
    expect(screen.queryByText('Error:')).not.toBeInTheDocument();
    expect(screen.queryByText(mockRomInfo.title)).not.toBeInTheDocument();
    expect(screen.queryByText('Export ROM File')).not.toBeInTheDocument();
  });

  it('loads and displays ROM information when a file is selected', async () => {
    renderRomInfoDisplay({
      romInfo: mockRomInfo,
      romData: mockArrayBuffer,
    });

    expect(screen.getByText(mockRomInfo.title)).toBeInTheDocument();

    const toggleButton = screen.getByRole('button', { name: /show details/i });
    expect(toggleButton).toBeInTheDocument();

    expect(screen.queryByText(mockRomInfo.version)).not.toBeInTheDocument();
    expect(screen.queryByText('512.00 KB')).not.toBeInTheDocument();

    fireEvent.click(toggleButton);

    expect(screen.getByText(mockRomInfo.version)).toBeInTheDocument();
    expect(screen.getByText('512.00 KB')).toBeInTheDocument();
    expect(screen.getByText('32')).toBeInTheDocument();
    const yesElements = screen.getAllByText(/Yes/i);
    expect(yesElements.length).toBeGreaterThan(0);

    expect(screen.getByText('Export ROM File')).toBeInTheDocument();

    fireEvent.click(toggleButton);

    expect(screen.queryByText(mockRomInfo.version)).not.toBeInTheDocument();
    expect(screen.queryByText('512.00 KB')).not.toBeInTheDocument();
  });

  it('displays an error message when file loading fails', async () => {
    renderRomInfoDisplay({
      romInfo: null,
      romData: null,
      error: 'No file selected or file loading failed',
    });

    expect(screen.getByText('Error: No file selected or file loading failed')).toBeInTheDocument();
    expect(screen.queryByText(mockRomInfo.title)).not.toBeInTheDocument();
  });

  it('displays an error message when an exception occurs', async () => {
    renderRomInfoDisplay({
      romInfo: null,
      romData: null,
      error: 'Unexpected error',
    });

    expect(screen.getByText('Error: Unexpected error')).toBeInTheDocument();
    expect(screen.queryByText(mockRomInfo.title)).not.toBeInTheDocument();
  });

  it('disables the select button while loading', async () => {
    renderRomInfoDisplay({
      romInfo: null,
      romData: null,
      isLoading: true,
    });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeDisabled();
  });

  it('disables the export button while loading', async () => {
    renderRomInfoDisplay({
      romInfo: mockRomInfo,
      romData: mockArrayBuffer,
      isLoading: true,
    });

    expect(screen.getByText('Exporting...')).toBeInTheDocument();
    expect(screen.getByText('Exporting...')).toBeDisabled();
  });

  it('renders the export button when a ROM file is loaded', async () => {
    renderRomInfoDisplay({
      romInfo: mockRomInfo,
      romData: mockArrayBuffer,
    });

    const exportButton = screen.getByText('Export ROM File');
    expect(exportButton).toBeInTheDocument();
    expect(exportButton).not.toBeDisabled();
  });
});
