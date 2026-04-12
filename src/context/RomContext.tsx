import { createContext, useContext, useState, useMemo, useRef, ReactNode } from 'react';
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

interface RomContextValue {
  romInfo: RomInfo | null;
  romData: ArrayBuffer | null;
  isLoading: boolean;
  error: string | null;
  loadRomFile: () => Promise<void>;
  exportRomFile: (kitData: ExportKitData) => Promise<void>;
  updateRomData: (data: ArrayBuffer) => void;
}

const RomContext = createContext<RomContextValue | null>(null);

interface RomProviderProps {
  children: ReactNode;
  initialState?: Partial<Pick<RomContextValue, 'romInfo' | 'romData' | 'isLoading' | 'error'>>;
}

export function RomProvider({ children, initialState }: RomProviderProps) {
  const [romInfo, setRomInfo] = useState<RomInfo | null>(initialState?.romInfo ?? null);
  const [romData, setRomData] = useState<ArrayBuffer | null>(initialState?.romData ?? null);
  const { isLoading, error, setError, withLoading } = useLoadingState(
    initialState?.isLoading ?? false,
    initialState?.error ?? null
  );

  const stateRef = useRef({ romInfo, romData });
  stateRef.current = { romInfo, romData };

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
  }), [withLoading]);

  const value = useMemo<RomContextValue>(
    () => ({ romInfo, romData, isLoading, error, ...actions }),
    [romInfo, romData, isLoading, error, actions]
  );

  return (
    <RomContext.Provider value={value}>
      {children}
    </RomContext.Provider>
  );
}

export function useRom(): RomContextValue {
  const ctx = useContext(RomContext);
  if (!ctx) throw new Error('useRom must be used within RomProvider');
  return ctx;
}
