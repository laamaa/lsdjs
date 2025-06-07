import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithRedux } from '../../../utils/test-utils';
import { KitEditor } from '../KitEditor';
import { Sample } from '../../../services/audio';
import { vi } from 'vitest';

// Mock the AudioService to avoid actual audio playback during tests
vi.mock('../../../services/audio/AudioService', () => ({
  AudioService: {
    playAudioBuffer: vi.fn().mockResolvedValue(undefined),
    stopAll: vi.fn(),
    isSupported: vi.fn().mockReturnValue(true),
    getAudioContext: vi.fn().mockReturnValue({
      decodeAudioData: vi.fn(),
    }),
    playTestTone: vi.fn(),
  },
}));

describe('KitEditor', () => {
  it('renders without crashing', () => {
    renderWithRedux(<KitEditor />);
    expect(screen.getByText(/please load a rom file with kit data/i)).toBeInTheDocument();
  });

  it('displays a message when no ROM is loaded', () => {
    renderWithRedux(<KitEditor />);
    expect(screen.getByText(/please load a rom file with kit data/i)).toBeInTheDocument();
  });

  it('displays kit information when a kit is loaded', () => {
    // Create a mock sample
    const mockSample = new Sample(new Int16Array(32), 'TST');

    const preloadedState = {
      rom: {
        romInfo: { 
          title: 'Test ROM', 
          version: '1.0', 
          isValid: true, 
          size: 1024, 
          banks: 2, 
          hasPalettes: false, 
          hasFonts: false,
          kitBanks: [0, 1, 2]
        },
        romData: new ArrayBuffer(1024),
        isLoading: false,
        error: null,
      },
      kit: {
        kitInfo: {
          name: 'TESTKIT',
          bankIndex: 0,
          isValid: true,
          totalSampleSizeInBytes: 100,
          bytesFree: 16000,
        },
        samples: [mockSample, ...Array(14).fill(null)],
        selectedSampleIndex: null,
        selectedBankIndex: 0,
        isHalfSpeed: false,
        useGbaPolarity: false,
        isLoading: false,
        error: null,
      },
    };

    renderWithRedux(<KitEditor />, { preloadedState });

    // Check that kit information is displayed
    expect(screen.getByLabelText(/kit name/i)).toHaveValue('TESTKIT');
    expect(screen.getByText(/seconds free/i)).toBeInTheDocument();

    // Check that the sample grid is displayed
    expect(screen.getByRole('grid', { name: /sample grid/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sample 1: tst/i })).toBeInTheDocument();
  });

  it('displays sample editor when a sample is selected', () => {
    // Create a mock sample with original samples to enable volume adjustment
    const mockSample = new Sample(new Int16Array(32), 'TST');
    // Set originalSamples to enable volume adjustment
    Object.defineProperty(mockSample, 'originalSamples', {
      value: new Int16Array(32),
      writable: true,
    });

    const preloadedState = {
      rom: {
        romInfo: { 
          title: 'Test ROM', 
          version: '1.0', 
          isValid: true, 
          size: 1024, 
          banks: 2, 
          hasPalettes: false, 
          hasFonts: false,
          kitBanks: [0, 1, 2]
        },
        romData: new ArrayBuffer(1024),
        isLoading: false,
        error: null,
      },
      kit: {
        kitInfo: {
          name: 'TESTKIT',
          bankIndex: 0,
          isValid: true,
          totalSampleSizeInBytes: 100,
          bytesFree: 16000,
        },
        samples: [mockSample, ...Array(14).fill(null)],
        selectedSampleIndex: 0,
        selectedBankIndex: 0,
        isHalfSpeed: false,
        useGbaPolarity: false,
        isLoading: false,
        error: null,
      },
    };

    renderWithRedux(<KitEditor />, { preloadedState });

    // Check that sample editor is displayed
    expect(screen.getByRole('region', { name: /sample editor/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/volume/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pitch/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/trim/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dither/i)).toBeInTheDocument();
  });

  it('displays an error message when there is an error', () => {
    const preloadedState = {
      rom: {
        romInfo: { 
          title: 'Test ROM', 
          version: '1.0', 
          isValid: true, 
          size: 1024, 
          banks: 2, 
          hasPalettes: false, 
          hasFonts: false,
          kitBanks: [0, 1, 2]
        },
        romData: new ArrayBuffer(1024),
        isLoading: false,
        error: null,
      },
      kit: {
        kitInfo: null,
        samples: Array(15).fill(null),
        selectedSampleIndex: null,
        selectedBankIndex: 0,
        isHalfSpeed: false,
        useGbaPolarity: false,
        isLoading: false,
        error: 'Test error message',
      },
    };

    renderWithRedux(<KitEditor />, { preloadedState });

    // Check that error message is displayed
    expect(screen.getByRole('alert')).toHaveTextContent('Test error message');
  });

  it('renders the BankNameSelector component with correct bank and name', () => {
    // Create a mock sample
    const mockSample = new Sample(new Int16Array(32), 'TST');

    const preloadedState = {
      rom: {
        romInfo: { 
          title: 'Test ROM', 
          version: '1.0', 
          isValid: true, 
          size: 1024, 
          banks: 2, 
          hasPalettes: false, 
          hasFonts: false,
          kitBanks: [0, 1, 2]
        },
        romData: new ArrayBuffer(1024),
        isLoading: false,
        error: null,
      },
      kit: {
        kitInfo: {
          name: 'TESTKIT',
          bankIndex: 1,
          isValid: true,
          totalSampleSizeInBytes: 100,
          bytesFree: 16000,
        },
        samples: [mockSample, ...Array(14).fill(null)],
        selectedSampleIndex: null,
        selectedBankIndex: 1,
        isHalfSpeed: false,
        useGbaPolarity: false,
        isLoading: false,
        error: null,
      },
    };

    renderWithRedux(<KitEditor />, { preloadedState });

    // Check that the BankNameSelector is rendered with the correct bank number
    expect(screen.getByText('01')).toBeInTheDocument();

    // Check that the kit name input has the correct value
    expect(screen.getByLabelText(/kit name/i)).toHaveValue('TESTKIT');
  });
});
