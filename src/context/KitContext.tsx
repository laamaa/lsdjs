import { createContext, useContext, useState, useMemo, useRef, useEffect, ReactNode } from 'react';
import { FileService } from '../services/file/FileService';
import { Sample, SampleBankCompiler, AudioService } from '../services/audio';
import { reloadSampleFromFile } from '../services/audio/sample/SampleFactory';
import { useLoadingState } from './useLoadingState';
import {
  calculateKitMemory,
  MAX_SAMPLE_SPACE,
  MAX_SAMPLES,
} from '../utils/sample-serialization';
import { int16ToArrayBuffer } from '../utils/sample-utils';
import { resample } from '../services/audio/sample/SampleUtils';

export interface KitInfo {
  name: string;
  bankIndex: number;
  isValid: boolean;
  totalSampleSizeInBytes: number;
  bytesFree: number;
}

export interface KitState {
  kitInfo: KitInfo | null;
  samples: (Sample | null)[];
  selectedSampleIndex: number | null;
  selectedBankIndex: number;
  isHalfSpeed: boolean;
  useGbaPolarity: boolean;
  isLoading: boolean;
  error: string | null;
  tempRecordedSample: Sample | null;
}

export interface KitActions {
  selectSample: (index: number | null) => void;
  selectBank: (index: number) => void;
  setHalfSpeed: (value: boolean) => void;
  setGbaPolarity: (value: boolean) => void;
  renameKit: (name: string) => void;
  clearKit: () => void;
  removeSample: (index: number) => void;
  revertSample: (index: number) => void;
  updateSampleVolume: (sampleIndex: number, volumeDb: number) => void;
  updateSamplePitch: (sampleIndex: number, pitchSemitones: number) => void;
  updateSampleTrim: (sampleIndex: number, trim: number) => void;
  updateSampleDither: (sampleIndex: number, dither: boolean) => void;
  updateSampleName: (sampleIndex: number, name: string) => void;
  deleteFrames: (sampleIndex: number, startFrame: number, endFrame: number) => void;
  cropFrames: (sampleIndex: number, startFrame: number, endFrame: number) => void;
  fadeInFrames: (sampleIndex: number, startFrame: number, endFrame: number) => void;
  fadeOutFrames: (sampleIndex: number, startFrame: number, endFrame: number) => void;
  replaceSample: (index: number, sample: Sample) => void;
  clearTempRecordedSample: () => void;
  updateTempRecordedSample: (sample: Sample) => void;
  loadKitFromRomBank: (romData: ArrayBuffer, bankIndex: number) => Promise<void>;
  loadKitFromFile: (romData: ArrayBuffer) => Promise<ArrayBuffer | null>;
  saveKitToFile: (romData: ArrayBuffer) => Promise<void>;
  addSample: () => Promise<void>;
  addRecordedSample: (audioBuffer: AudioBuffer) => Promise<void>;
  saveTempSampleToKit: () => void;
  playSample: (sampleIndex: number) => Promise<void>;
  getSampleInstance: (index: number) => Sample | null;
  getSampleFile: (index: number) => File | null;
}

type KitContextValue = KitState & KitActions;

const KitStateContext = createContext<KitState | null>(null);
const KitActionsContext = createContext<KitActions | null>(null);

const BANK_SIZE = 0x4000;

interface KitProviderProps {
  children: ReactNode;
  initialState?: Partial<KitState>;
}

export function KitProvider({ children, initialState }: KitProviderProps) {
  const [kitInfo, setKitInfo] = useState<KitInfo | null>(initialState?.kitInfo ?? null);
  const [samples, setSamples] = useState<(Sample | null)[]>(initialState?.samples ?? Array(MAX_SAMPLES).fill(null));
  const [selectedSampleIndex, setSelectedSampleIndex] = useState<number | null>(initialState?.selectedSampleIndex ?? null);
  const [selectedBankIndex, setSelectedBankIndex] = useState(initialState?.selectedBankIndex ?? 0);
  const [isHalfSpeed, setIsHalfSpeed] = useState(initialState?.isHalfSpeed ?? false);
  const [useGbaPolarity, setUseGbaPolarity] = useState(initialState?.useGbaPolarity ?? false);
  const [tempRecordedSample, setTempRecordedSample] = useState<Sample | null>(initialState?.tempRecordedSample ?? null);
  const { isLoading, error, setError, withLoading } = useLoadingState(
    initialState?.isLoading ?? false,
    initialState?.error ?? null
  );

  // File map for non-serializable File objects
  const fileMapRef = useRef<Map<number, File>>(new Map());

  const stateRef = useRef({ kitInfo, samples, selectedSampleIndex, selectedBankIndex, isHalfSpeed, useGbaPolarity, tempRecordedSample });
  useEffect(() => {
    stateRef.current = { kitInfo, samples, selectedSampleIndex, selectedBankIndex, isHalfSpeed, useGbaPolarity, tempRecordedSample };
  });

  function updateSampleAt(index: number, mutator: (s: Sample) => void) {
    const s = stateRef.current.samples[index];
    if (!s) return;
    const cloned = Sample.dupeSample(s);
    mutator(cloned);
    const newSamples = [...stateRef.current.samples];
    newSamples[index] = cloned;

    setSamples(newSamples);
    const { totalSampleSizeInBytes, bytesFree } = calculateKitMemory(newSamples);
    setKitInfo(prev => prev ? { ...prev, totalSampleSizeInBytes, bytesFree } : prev);
  }

  function replaceSampleAt(index: number, sample: Sample) {
    const newSamples = [...stateRef.current.samples];
    newSamples[index] = sample;

    setSamples(newSamples);
    const { totalSampleSizeInBytes, bytesFree } = calculateKitMemory(newSamples);
    setKitInfo(prev => prev ? { ...prev, totalSampleSizeInBytes, bytesFree } : prev);
  }

  // Helper: frame editing operations (delete, crop, fadeIn, fadeOut)
  function applyFrameOp(
    sampleIndex: number,
    startFrame: number,
    endFrame: number,
    method: 'deleteFrames' | 'cropFrames' | 'fadeInFrames' | 'fadeOutFrames'
  ) {
    updateSampleAt(sampleIndex, sample => {
      sample[method](startFrame, endFrame);
    });
  }

  const actions = useMemo(() => ({
    selectSample: (index: number | null) => setSelectedSampleIndex(index),
    selectBank: (index: number) => setSelectedBankIndex(index),
    setHalfSpeed: (value: boolean) => setIsHalfSpeed(value),
    setGbaPolarity: (value: boolean) => setUseGbaPolarity(value),
    replaceSample: (index: number, sample: Sample) => replaceSampleAt(index, sample),
    clearTempRecordedSample: () => setTempRecordedSample(null),
    updateTempRecordedSample: (sample: Sample) => setTempRecordedSample(sample),

    renameKit: (name: string) => {
      setKitInfo(prev => prev ? { ...prev, name } : prev);
    },

    clearKit: () => {
      setSamples(Array(MAX_SAMPLES).fill(null));
      setSelectedSampleIndex(null);
      fileMapRef.current.clear();
      setKitInfo(prev => prev ? { ...prev, totalSampleSizeInBytes: 0, bytesFree: MAX_SAMPLE_SPACE } : prev);
    },

    removeSample: (index: number) => {
      const newSamples = [...stateRef.current.samples];
      for (let i = index; i < newSamples.length - 1; i++) {
        newSamples[i] = newSamples[i + 1];
      }
      newSamples[newSamples.length - 1] = null;

      setSamples(newSamples);
      const { totalSampleSizeInBytes, bytesFree } = calculateKitMemory(newSamples);
      setKitInfo(prev => prev ? { ...prev, totalSampleSizeInBytes, bytesFree } : prev);

      // Shift file map entries
      const map = fileMapRef.current;
      for (let i = index; i < MAX_SAMPLES - 1; i++) {
        if (map.has(i + 1)) {
          map.set(i, map.get(i + 1)!);
        } else {
          map.delete(i);
        }
      }
      map.delete(MAX_SAMPLES - 1);

      setSelectedSampleIndex(prev => {
        if (prev === index) return null;
        if (prev !== null && prev > index) return prev - 1;
        return prev;
      });
    },

    revertSample: (index: number) => {
      updateSampleAt(index, sample => {
        sample.setVolumeDb(0);
        sample.setPitchSemitones(0);
        sample.setTrim(0);
        sample.setDither(false);
        if (sample.getUneditedSamples()) {
          sample.setOriginalSamplesFromUnedited();
          sample.processSamples();
        }
      });
    },

    updateSampleVolume: (sampleIndex: number, volumeDb: number) => {
      updateSampleAt(sampleIndex, sample => {
        sample.setVolumeDb(volumeDb);
        sample.processSamples();
      });
    },

    updateSamplePitch: (sampleIndex: number, pitchSemitones: number) => {
      updateSampleAt(sampleIndex, sample => {
        sample.setPitchSemitones(pitchSemitones);
      });
    },

    updateSampleTrim: (sampleIndex: number, trim: number) => {
      updateSampleAt(sampleIndex, sample => {
        sample.setTrim(trim);
        sample.processSamples();
      });
    },

    updateSampleDither: (sampleIndex: number, dither: boolean) => {
      updateSampleAt(sampleIndex, sample => {
        sample.setDither(dither);
        sample.processSamples();
      });
    },

    updateSampleName: (sampleIndex: number, name: string) => {
      updateSampleAt(sampleIndex, sample => {
        sample.setName(name);
      });
    },

    deleteFrames: (sampleIndex: number, startFrame: number, endFrame: number) => {
      applyFrameOp(sampleIndex, startFrame, endFrame, 'deleteFrames');
    },

    cropFrames: (sampleIndex: number, startFrame: number, endFrame: number) => {
      applyFrameOp(sampleIndex, startFrame, endFrame, 'cropFrames');
    },

    fadeInFrames: (sampleIndex: number, startFrame: number, endFrame: number) => {
      applyFrameOp(sampleIndex, startFrame, endFrame, 'fadeInFrames');
    },

    fadeOutFrames: (sampleIndex: number, startFrame: number, endFrame: number) => {
      applyFrameOp(sampleIndex, startFrame, endFrame, 'fadeOutFrames');
    },

    getSampleInstance: (index: number): Sample | null => {
      const s = stateRef.current.samples[index];
      if (!s) return null;
      return Sample.dupeSample(s);
    },

    getSampleFile: (index: number): File | null => {
      return fileMapRef.current.get(index) ?? null;
    },

    loadKitFromRomBank: (romData: ArrayBuffer, bankIndex: number) =>
      withLoading('Failed to load kit from ROM bank', async () => {
        const { samples: extracted, kitName } = await SampleBankCompiler.extractFromRomBank(romData, bankIndex);
        const { totalSampleSizeInBytes, bytesFree } = calculateKitMemory(extracted);

        setSamples(extracted);
        setKitInfo({
          name: kitName,
          bankIndex,
          isValid: true,
          totalSampleSizeInBytes,
          bytesFree,
        });
        setSelectedSampleIndex(null);
        setSelectedBankIndex(bankIndex);
        fileMapRef.current.clear();
      }),

    loadKitFromFile: async (romData: ArrayBuffer): Promise<ArrayBuffer | null> => {
      const result = await withLoading('Failed to load kit file', async () => {
        const fileData = await FileService.loadBinaryFile('.kit');
        if (!fileData) return null;

        if (!SampleBankCompiler.isKitBank(fileData)) {
          setError('Invalid kit file format');
          return null;
        }

        const { selectedBankIndex: bankIdx } = stateRef.current;
        const newRomData = new ArrayBuffer(romData.byteLength);
        new Uint8Array(newRomData).set(new Uint8Array(romData));
        new Uint8Array(newRomData).set(new Uint8Array(fileData), bankIdx * BANK_SIZE);

        const { samples: extracted, kitName } = await SampleBankCompiler.extractFromRomBank(newRomData, bankIdx);
        const { totalSampleSizeInBytes, bytesFree } = calculateKitMemory(extracted);

        setSamples(extracted);
        setKitInfo({
          name: kitName,
          bankIndex: bankIdx,
          isValid: true,
          totalSampleSizeInBytes,
          bytesFree,
        });
        setSelectedSampleIndex(null);
        fileMapRef.current.clear();
        return newRomData;
      });
      return result ?? null;
    },

    saveKitToFile: (romData: ArrayBuffer) =>
      withLoading('Failed to save kit file', async () => {
        const { kitInfo: info, selectedBankIndex: bankIdx } = stateRef.current;
        if (!info) return;

        const kitData = new Uint8Array(BANK_SIZE);
        const bankOffset = bankIdx * BANK_SIZE;
        kitData.set(new Uint8Array(romData, bankOffset, BANK_SIZE));

        await FileService.saveFile(kitData.buffer, {
          suggestedName: `${info.name.trim() || 'untitled'}.kit`,
          mimeType: 'application/octet-stream',
        });
      }),

    addSample: () =>
      withLoading('Failed to add sample', async () => {
        const { samples: currentSamples, isHalfSpeed: halfSpeed } = stateRef.current;
        const firstFreeSlot = currentSamples.findIndex(s => s === null);
        if (firstFreeSlot === -1) {
          setError('Kit is full');
          return;
        }

        const fileData = await FileService.loadBinaryFile('.wav');
        if (!fileData) return;

        const file = new File([fileData], 'sample.wav', { type: 'audio/wav' });
        const sample = await Sample.createFromWav(file, {
          halfSpeed,
          dither: true,
          volumeDb: 0,
          trim: 0,
          pitchSemitones: 0,
        });

        // Check if it fits
        const newSamples = [...currentSamples];
        newSamples[firstFreeSlot] = sample;
        const { bytesFree } = calculateKitMemory(newSamples);

        if (bytesFree < 0) {
          const trim = Math.ceil(-bytesFree / 16);
          sample.setTrim(trim);
          await reloadSampleFromFile(sample, file, halfSpeed);
        }

        fileMapRef.current.set(firstFreeSlot, file);
        setSamples(newSamples);
        setSelectedSampleIndex(firstFreeSlot);
        const { totalSampleSizeInBytes: total, bytesFree: free } = calculateKitMemory(newSamples);
        setKitInfo(prev => prev ? { ...prev, totalSampleSizeInBytes: total, bytesFree: free } : prev);
      }),

    addRecordedSample: (audioBuffer: AudioBuffer) =>
      withLoading('Failed to add recorded sample', async () => {
        const { isHalfSpeed: halfSpeed } = stateRef.current;

        const channelData = audioBuffer.getChannelData(0);
        const sampleData = new Int16Array(channelData.length);
        for (let i = 0; i < channelData.length; i++) {
          sampleData[i] = Math.max(-32768, Math.min(32767, Math.round(channelData[i] * 32767)));
        }

        const inSampleRate = audioBuffer.sampleRate;
        const outSampleRate = halfSpeed ? 5734 : 11468;

        // Resample
        const resampled = resample(sampleData, inSampleRate, outSampleRate);

        const sample = new Sample(resampled, 'REC');
        sample.setOriginalSamples(resampled.slice());
        sample.setUneditedSamples(resampled.slice());
        sample.setHalfSpeed(halfSpeed);
        setTempRecordedSample(sample);
      }),

    saveTempSampleToKit: () => {
      const { samples: currentSamples, tempRecordedSample: temp } = stateRef.current;
      if (!temp) return;

      const firstFreeSlot = currentSamples.findIndex(s => s === null);
      if (firstFreeSlot === -1) {
        setError('Kit is full');
        return;
      }

      const instance = Sample.dupeSample(temp);

      const newSamples = [...currentSamples];
      newSamples[firstFreeSlot] = instance;

      // Check if it fits, trim if needed
      const { bytesFree } = calculateKitMemory(newSamples);
      if (bytesFree < 0) {
        const trim = Math.ceil(-bytesFree / 16);
        instance.setTrim(trim);
        instance.processSamples();
      }

      setSamples(newSamples);
      setSelectedSampleIndex(firstFreeSlot);
      setTempRecordedSample(null);
      const { totalSampleSizeInBytes: total, bytesFree: free } = calculateKitMemory(newSamples);
      setKitInfo(prev => prev ? { ...prev, totalSampleSizeInBytes: total, bytesFree: free } : prev);
    },

    playSample: async (sampleIndex: number) => {
      const { samples: currentSamples, isHalfSpeed: halfSpeed } = stateRef.current;
      const s = currentSamples[sampleIndex];
      if (!s) return;

      try {
        AudioService.stopAll();
        const data = s.workSampleData();
        const sampleRate = halfSpeed ? 5734 : 11468;
        await AudioService.playAudioBuffer(int16ToArrayBuffer(data), {}, sampleRate);
      } catch {
        // Audio playback errors are non-critical
      }
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [withLoading]);

  const stateValue = useMemo<KitState>(
    () => ({
      kitInfo, samples, selectedSampleIndex, selectedBankIndex,
      isHalfSpeed, useGbaPolarity, isLoading, error, tempRecordedSample,
    }),
    [kitInfo, samples, selectedSampleIndex, selectedBankIndex,
     isHalfSpeed, useGbaPolarity, isLoading, error, tempRecordedSample]
  );

  return (
    <KitStateContext.Provider value={stateValue}>
      <KitActionsContext.Provider value={actions}>
        {children}
      </KitActionsContext.Provider>
    </KitStateContext.Provider>
  );
}

export function useKitState(): KitState {
  const ctx = useContext(KitStateContext);
  if (!ctx) throw new Error('useKitState must be used within KitProvider');
  return ctx;
}

export function useKitActions(): KitActions {
  const ctx = useContext(KitActionsContext);
  if (!ctx) throw new Error('useKitActions must be used within KitProvider');
  return ctx;
}

export function useKit(): KitContextValue {
  const state = useKitState();
  const actions = useKitActions();
  return { ...state, ...actions };
}
