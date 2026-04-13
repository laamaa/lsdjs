import { createContext, useContext, useState, useMemo, useRef, useEffect, ReactNode } from 'react';
import { FileService } from '../services/file/FileService';
import { RomProcessor, RomInfo as BaseRomInfo } from '../services/binary';
import { SampleBankCompiler, Sample } from '../services/audio';
import { useLoadingState } from './useLoadingState';

export interface RomInfo extends BaseRomInfo {
  kitBanks: number[];
  kitNames: Record<number, string>;
}

export interface ExportKitData {
  kitInfo: { name: string; bankIndex: number } | null;
  samples: (Sample | null)[];
  useGbaPolarity: boolean;
}

export interface RomState {
  romInfo: RomInfo | null;
  romData: ArrayBuffer | null;
  /** Bumps only when a new ROM file is loaded (not when kit sync replaces the buffer). */
  romLoadGeneration: number;
  isLoading: boolean;
  error: string | null;
}

export interface RomActions {
  loadRomFile: () => Promise<void>;
  exportRomFile: (kitData: ExportKitData) => Promise<void>;
  updateRomData: (data: ArrayBuffer) => void;
}

type RomContextValue = RomState & RomActions;

const RomStateContext = createContext<RomState | null>(null);
const RomActionsContext = createContext<RomActions | null>(null);

interface RomProviderProps {
  children: ReactNode;
  // romLoadGeneration excluded: seeding it would incorrectly trigger the auto-load effect in RomKitSync
  initialState?: Partial<Pick<RomState, 'romInfo' | 'romData' | 'isLoading' | 'error'>>;
}

export function RomProvider({ children, initialState }: RomProviderProps) {
  const [romInfo, setRomInfo] = useState<RomInfo | null>(initialState?.romInfo ?? null);
  const [romData, setRomData] = useState<ArrayBuffer | null>(initialState?.romData ?? null);
  const [romLoadGeneration, setRomLoadGeneration] = useState(0);
  const { isLoading, error, setError, withLoading } = useLoadingState(
    initialState?.isLoading ?? false,
    initialState?.error ?? null
  );

  const stateRef = useRef({ romInfo, romData });
  useEffect(() => {
    stateRef.current = { romInfo, romData };
  });

  const actions = useMemo(() => ({
    updateRomData: (data: ArrayBuffer) => setRomData(data),

    loadRomFile: () => withLoading('Failed to load ROM file', async () => {
      const fileData = await FileService.loadBinaryFile('.gb,.gbc');
      if (!fileData) return;

      const baseInfo = RomProcessor.parseRom(fileData);
      if (!baseInfo.isValid) {
        setError('Invalid ROM file format');
        return;
      }

      const { kitBanks, kitNames } = SampleBankCompiler.scanKitBanks(fileData);
      const parsedInfo: RomInfo = { ...baseInfo, kitBanks, kitNames };

      setRomInfo(parsedInfo);
      setRomData(fileData);
      setRomLoadGeneration((g) => g + 1);
    }),

    exportRomFile: (kitData: ExportKitData) => withLoading('Failed to export ROM file', async () => {
      const { romInfo: info, romData: data } = stateRef.current;
      if (!info || !data) return;

      const updatedRomData = new ArrayBuffer(data.byteLength);
      new Uint8Array(updatedRomData).set(new Uint8Array(data));

      if (kitData.kitInfo && kitData.samples) {
        SampleBankCompiler.writeToRomBank(
          updatedRomData,
          kitData.kitInfo.bankIndex,
          kitData.samples,
          kitData.kitInfo.name,
          kitData.useGbaPolarity
        );
      }

      const fixedRomData = RomProcessor.fixChecksum(updatedRomData);
      const fileExtension = info.title.toLowerCase().includes('color') ? '.gbc' : '.gb';
      await FileService.saveFile(fixedRomData, {
        suggestedName: `${info.title.trim() || 'lsdj'}${fileExtension}`,
        mimeType: 'application/octet-stream',
      });
    }),
  }), [withLoading, setError]);

  const stateValue = useMemo<RomState>(
    () => ({ romInfo, romData, romLoadGeneration, isLoading, error }),
    [romInfo, romData, romLoadGeneration, isLoading, error]
  );

  return (
    <RomStateContext.Provider value={stateValue}>
      <RomActionsContext.Provider value={actions}>
        {children}
      </RomActionsContext.Provider>
    </RomStateContext.Provider>
  );
}

export function useRomState(): RomState {
  const ctx = useContext(RomStateContext);
  if (!ctx) throw new Error('useRomState must be used within RomProvider');
  return ctx;
}

export function useRomActions(): RomActions {
  const ctx = useContext(RomActionsContext);
  if (!ctx) throw new Error('useRomActions must be used within RomProvider');
  return ctx;
}

export function useRom(): RomContextValue {
  const state = useRomState();
  const actions = useRomActions();
  return { ...state, ...actions };
}
