import { createContext, useContext, useState, useMemo, useRef, ReactNode } from 'react';
import { FileService } from '../services/file/FileService';
import { SaveFileInfo, SaveFileProcessor } from '../services/binary/SaveFileProcessor';
import { BinaryProcessor } from '../services/binary';
import { useLoadingState } from './useLoadingState';

interface SaveFileContextValue {
  saveFileInfo: SaveFileInfo | null;
  selectedSongId: number | null;
  isLoading: boolean;
  error: string | null;
  loadSaveFile: () => Promise<void>;
  exportSong: (songId: number) => Promise<void>;
  exportSaveFile: () => Promise<void>;
  removeSong: (songId: number) => Promise<void>;
  importSong: () => Promise<void>;
  selectSong: (songId: number | null) => void;
}

const SaveFileContext = createContext<SaveFileContextValue | null>(null);

interface SaveFileProviderProps {
  children: ReactNode;
  initialState?: Partial<Pick<SaveFileContextValue, 'saveFileInfo' | 'selectedSongId' | 'isLoading' | 'error'>>;
}

export function SaveFileProvider({ children, initialState }: SaveFileProviderProps) {
  const [saveFileInfo, setSaveFileInfo] = useState<SaveFileInfo | null>(initialState?.saveFileInfo ?? null);
  const [saveFileData, setSaveFileData] = useState<ArrayBuffer | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<number | null>(initialState?.selectedSongId ?? null);
  const { isLoading, error, setError, withLoading } = useLoadingState(
    initialState?.isLoading ?? false,
    initialState?.error ?? null
  );

  // Ref holds latest state for stable action closures
  const stateRef = useRef({ saveFileInfo, saveFileData, selectedSongId });
  stateRef.current = { saveFileInfo, saveFileData, selectedSongId };

  const actions = useMemo<Omit<SaveFileContextValue, 'saveFileInfo' | 'selectedSongId' | 'isLoading' | 'error'>>(() => ({
    selectSong: (songId: number | null) => setSelectedSongId(songId),

    loadSaveFile: () => withLoading('Failed to load save file', async () => {
      const fileData = await FileService.loadBinaryFile('.sav');
      if (!fileData) return;
      const saveInfo = SaveFileProcessor.parseSaveFile(fileData);
      if (!saveInfo.isValid) {
        setError('Invalid save file format');
        return;
      }
      setSaveFileInfo(saveInfo);
      setSaveFileData(fileData);
      setSelectedSongId(null);
    }),

    exportSong: (songId: number) => withLoading('Failed to export song', async () => {
      const { saveFileInfo: info, saveFileData: data } = stateRef.current;
      if (!info || !data) return;
      const song = info.songs.find(s => s.id === songId);
      if (!song) return;

      const processor = new BinaryProcessor(data);
      const songData = SaveFileProcessor.extractSongForExport(processor, songId);
      if (!songData) {
        setError(`Failed to extract song data for song ID ${songId}`);
        return;
      }
      await FileService.saveFile(songData, {
        suggestedName: `${song.name.trim() || 'untitled'}.lsdprj`,
        mimeType: 'application/octet-stream',
      });
    }),

    exportSaveFile: () => withLoading('Failed to export save file', async () => {
      const { saveFileData: data } = stateRef.current;
      if (!data) return;
      await FileService.saveFile(data, {
        suggestedName: 'lsdj.sav',
        mimeType: 'application/octet-stream',
      });
    }),

    removeSong: (songId: number) => withLoading('Failed to remove song', async () => {
      const { saveFileInfo: info, saveFileData: data, selectedSongId: selected } = stateRef.current;
      if (!info || !data) return;
      const song = info.songs.find(s => s.id === songId);
      if (!song) return;

      const processor = new BinaryProcessor(data);
      SaveFileProcessor.clearSong(processor, songId);

      const updatedInfo = SaveFileProcessor.parseSaveFile(data);
      setSaveFileInfo(updatedInfo);

      if (selected === songId) {
        setSelectedSongId(null);
      }
    }),

    importSong: () => withLoading('Failed to import song', async () => {
      const { saveFileData: data } = stateRef.current;
      if (!data) return;

      const songData = await FileService.loadBinaryFile('.lsdprj');
      if (!songData) return;

      const processor = new BinaryProcessor(data);
      const songId = SaveFileProcessor.importSongFromLsdprj(processor, songData);
      if (songId === null) {
        setError('Failed to import song');
        return;
      }

      const updatedInfo = SaveFileProcessor.parseSaveFile(data);
      setSaveFileInfo(updatedInfo);
      setSelectedSongId(songId);
    }),
  }), [withLoading]);

  const value = useMemo<SaveFileContextValue>(
    () => ({ saveFileInfo, selectedSongId, isLoading, error, ...actions }),
    [saveFileInfo, selectedSongId, isLoading, error, actions]
  );

  return (
    <SaveFileContext.Provider value={value}>
      {children}
    </SaveFileContext.Provider>
  );
}

export function useSaveFile(): SaveFileContextValue {
  const ctx = useContext(SaveFileContext);
  if (!ctx) throw new Error('useSaveFile must be used within SaveFileProvider');
  return ctx;
}
