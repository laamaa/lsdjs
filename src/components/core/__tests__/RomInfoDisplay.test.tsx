import {beforeEach, describe, expect, it, vi} from 'vitest';
import {screen, fireEvent} from '@testing-library/react';
import {RomInfoDisplay} from '../RomInfoDisplay';
import {renderWithRedux} from '../../../utils/test-utils';

// Mock the Redux store and actions
vi.mock('../../../store', async () => {
  const actual = await vi.importActual('../../../store');

  // Create mock functions
  const loadRomFileMock = vi.fn();
  const exportRomFileMock = vi.fn();

  // Set up return values
  loadRomFileMock.mockReturnValue({
    type: 'rom/loadRomFile/fulfilled',
    payload: {
      romInfo: {
        title: 'LSDJ v8.5.1',
        version: 'v85',
        isValid: true,
        size: 524288, // 512 KB
        banks: 32,
        hasPalettes: true,
        hasFonts: true,
      },
      romData: new ArrayBuffer(10),
    },
  });

  exportRomFileMock.mockReturnValue({
    type: 'rom/exportRomFile/fulfilled',
    payload: {},
  });

  return {
    ...actual,
    loadRomFile: loadRomFileMock,
    exportRomFile: exportRomFileMock,
  };
});

describe('RomInfoDisplay', () => {
  const mockRomInfo = {
    title: 'LSDJ v8.5.1',
    version: 'v85',
    isValid: true,
    size: 524288, // 512 KB
    banks: 32,
    hasPalettes: true,
    hasFonts: true,
  };

  const mockArrayBuffer = new ArrayBuffer(10);


  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders the component with initial state', () => {
    renderWithRedux(<RomInfoDisplay />);

    expect(screen.getByText('Select ROM File')).toBeInTheDocument();
    expect(screen.queryByText('Error:')).not.toBeInTheDocument();
    expect(screen.queryByText(mockRomInfo.title)).not.toBeInTheDocument();

    // Check that the export button is not displayed when no ROM file is loaded
    expect(screen.queryByText('Export ROM File')).not.toBeInTheDocument();
  });

  it('loads and displays ROM information when a file is selected', async () => {
    // Set up the store with ROM info
    renderWithRedux(<RomInfoDisplay />, {
      preloadedState: {
        rom: {
          romInfo: mockRomInfo,
          romData: mockArrayBuffer,
          isLoading: false,
          error: null,
        },
        saveFile: {},
        ui: {},
      },
    });

    // Check that the ROM title is displayed
    expect(screen.getByText(mockRomInfo.title)).toBeInTheDocument();

    // Check that the toggle button is displayed
    const toggleButton = screen.getByRole('button', { name: /show details/i });
    expect(toggleButton).toBeInTheDocument();

    // Check that the table is collapsed by default (details not visible)
    expect(screen.queryByText(mockRomInfo.version)).not.toBeInTheDocument();
    expect(screen.queryByText('512.00 KB')).not.toBeInTheDocument();

    // Click the toggle button to expand the table
    fireEvent.click(toggleButton);

    // Now check that the details are visible
    expect(screen.getByText(mockRomInfo.version)).toBeInTheDocument();
    expect(screen.getByText('512.00 KB')).toBeInTheDocument();
    expect(screen.getByText('32')).toBeInTheDocument();
    // Check for "Yes" values in the table (there are multiple)
    const yesElements = screen.getAllByText(/Yes/i);
    expect(yesElements.length).toBeGreaterThan(0);

    // Check that the export button is displayed
    expect(screen.getByText('Export ROM File')).toBeInTheDocument();

    // Click the toggle button again to collapse the table
    fireEvent.click(toggleButton);

    // Check that the details are hidden again
    expect(screen.queryByText(mockRomInfo.version)).not.toBeInTheDocument();
    expect(screen.queryByText('512.00 KB')).not.toBeInTheDocument();
  });

  it('displays an error message when file loading fails', async () => {
    // Set up the store with an error
    renderWithRedux(<RomInfoDisplay />, {
      preloadedState: {
        rom: {
          romInfo: null,
          romData: null,
          isLoading: false,
          error: 'No file selected or file loading failed',
        },
        saveFile: {},
        ui: {},
      },
    });

    // Check that the error message is displayed
    expect(screen.getByText('Error: No file selected or file loading failed')).toBeInTheDocument();

    // Check that the ROM information is not displayed
    expect(screen.queryByText(mockRomInfo.title)).not.toBeInTheDocument();
  });

  it('displays an error message when an exception occurs', async () => {
    // Set up the store with an error
    renderWithRedux(<RomInfoDisplay />, {
      preloadedState: {
        rom: {
          romInfo: null,
          romData: null,
          isLoading: false,
          error: 'Unexpected error',
        },
        saveFile: {},
        ui: {},
      },
    });

    // Check that the error message is displayed
    expect(screen.getByText('Error: Unexpected error')).toBeInTheDocument();

    // Check that the ROM information is not displayed
    expect(screen.queryByText(mockRomInfo.title)).not.toBeInTheDocument();
  });

  it('disables the select button while loading', async () => {
    // Set up the store with loading state
    renderWithRedux(<RomInfoDisplay />, {
      preloadedState: {
        rom: {
          romInfo: null,
          romData: null,
          isLoading: true,
          error: null,
        },
        saveFile: {},
        ui: {},
      },
    });

    // Check that the button is disabled and shows loading text
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeDisabled();
  });

  it('disables the export button while loading', async () => {
    // Set up the store with loading state and ROM info
    renderWithRedux(<RomInfoDisplay />, {
      preloadedState: {
        rom: {
          romInfo: mockRomInfo,
          romData: mockArrayBuffer,
          isLoading: true,
          error: null,
        },
        saveFile: {},
        ui: {},
      },
    });

    // Check that the export button is disabled and shows exporting text
    expect(screen.getByText('Exporting...')).toBeInTheDocument();
    expect(screen.getByText('Exporting...')).toBeDisabled();
  });

  it('renders the export button when a ROM file is loaded', async () => {
    // Set up the store with ROM info
    renderWithRedux(<RomInfoDisplay />, {
      preloadedState: {
        rom: {
          romInfo: mockRomInfo,
          romData: mockArrayBuffer,
          isLoading: false,
          error: null,
        },
        saveFile: {},
        ui: {},
      },
    });

    // Find the export button
    const exportButton = screen.getByText('Export ROM File');

    // Check that the export button is rendered and enabled
    expect(exportButton).toBeInTheDocument();
    expect(exportButton).not.toBeDisabled();
  });
});
