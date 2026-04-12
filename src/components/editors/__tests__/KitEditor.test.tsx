import React from 'react';
import { render, screen } from '@testing-library/react';
import { KitEditor } from '../KitEditor';
import { vi } from 'vitest';
import { RomProvider, RomInfo } from '../../../context/RomContext';
import { KitProvider } from '../../../context/KitContext';
import { KitInfo } from '../../../context/KitContext';
import { SerializedSample } from '../../../utils/sample-serialization';

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

const mockRomInfo: RomInfo = {
  title: 'Test ROM',
  version: '1.0',
  isValid: true,
  size: 1024,
  banks: 2,
  hasPalettes: false,
  hasFonts: false,
  kitBanks: [0, 1, 2],
  kitNames: {},
};

const mockSample: SerializedSample = {
  name: 'TST',
  processedSamples: new Array(32).fill(0),
  originalSamples: new Array(32).fill(0),
  uneditedSamples: new Array(32).fill(0),
  untrimmedLength: 32,
  volumeDb: 0,
  pitchSemitones: 0,
  trim: 0,
  dither: false,
  halfSpeed: false,
};

const mockKitInfo: KitInfo = {
  name: 'TESTKIT',
  bankIndex: 0,
  isValid: true,
  totalSampleSizeInBytes: 100,
  bytesFree: 16000,
};

function renderKitEditor(opts?: {
  romState?: Partial<{ romInfo: RomInfo | null; romData: ArrayBuffer | null }>;
  kitState?: Partial<{ kitInfo: KitInfo | null; samples: (SerializedSample | null)[]; selectedSampleIndex: number | null; selectedBankIndex: number; error: string | null }>;
}) {
  return render(
    <RomProvider initialState={{
      romInfo: opts?.romState?.romInfo ?? null,
      romData: opts?.romState?.romData ?? null,
    }}>
      <KitProvider initialState={{
        kitInfo: opts?.kitState?.kitInfo ?? null,
        samples: opts?.kitState?.samples ?? Array(15).fill(null),
        selectedSampleIndex: opts?.kitState?.selectedSampleIndex ?? null,
        selectedBankIndex: opts?.kitState?.selectedBankIndex ?? 0,
        error: opts?.kitState?.error ?? null,
      }}>
        <KitEditor />
      </KitProvider>
    </RomProvider>
  );
}

describe('KitEditor', () => {
  it('renders without crashing', () => {
    renderKitEditor();
    expect(screen.getByText(/please load a rom file with kit data/i)).toBeInTheDocument();
  });

  it('displays a message when no ROM is loaded', () => {
    renderKitEditor();
    expect(screen.getByText(/please load a rom file with kit data/i)).toBeInTheDocument();
  });

  it('displays kit information when a kit is loaded', () => {
    renderKitEditor({
      romState: { romInfo: mockRomInfo, romData: new ArrayBuffer(1024) },
      kitState: {
        kitInfo: mockKitInfo,
        samples: [mockSample, ...Array(14).fill(null)],
      },
    });

    expect(screen.getByLabelText(/kit name/i)).toHaveValue('TESTKIT');
    expect(screen.getByText(/seconds free/i)).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: /sample grid/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sample 1: tst/i })).toBeInTheDocument();
  });

  it('displays sample editor when a sample is selected', () => {
    renderKitEditor({
      romState: { romInfo: mockRomInfo, romData: new ArrayBuffer(1024) },
      kitState: {
        kitInfo: mockKitInfo,
        samples: [mockSample, ...Array(14).fill(null)],
        selectedSampleIndex: 0,
      },
    });

    expect(screen.getByRole('region', { name: /sample editor/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/volume/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pitch/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/trim/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dither/i)).toBeInTheDocument();
  });

  it('displays an error message when there is an error', () => {
    renderKitEditor({
      romState: { romInfo: mockRomInfo, romData: new ArrayBuffer(1024) },
      kitState: {
        kitInfo: null,
        error: 'Test error message',
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Test error message');
  });

  it('renders the BankNameSelector component with correct bank and name', () => {
    renderKitEditor({
      romState: { romInfo: mockRomInfo, romData: new ArrayBuffer(1024) },
      kitState: {
        kitInfo: { ...mockKitInfo, bankIndex: 1 },
        samples: [mockSample, ...Array(14).fill(null)],
        selectedBankIndex: 1,
      },
    });

    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByLabelText(/kit name/i)).toHaveValue('TESTKIT');
  });
});
