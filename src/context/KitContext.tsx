import { createContext, useContext, useState, useMemo, useRef, ReactNode } from 'react';
import { FileService } from '../services/file/FileService';
import { Sample, SampleBankCompiler, AudioService } from '../services/audio';
import { useLoadingState } from './useLoadingState';
import {
  SerializedSample,
  sampleToSerialized,
  serializedToSample,
  calculateKitMemory,
  MAX_SAMPLE_SPACE,
  MAX_SAMPLES,
} from '../utils/sample-serialization';
import { int16ToArrayBuffer } from '../utils/sample-utils';

export interface KitInfo {
  name: string;
  bankIndex: number;
  isValid: boolean;
  totalSampleSizeInBytes: number;
  bytesFree: number;
}

interface KitContextValue {
  kitInfo: KitInfo | null;
  samples: (SerializedSample | null)[];
  selectedSampleIndex: number | null;
  selectedBankIndex: number;
  isHalfSpeed: boolean;
  useGbaPolarity: boolean;
  isLoading: boolean;
  error: string | null;
  tempRecordedSample: SerializedSample | null;
  // Actions
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
  replaceSample: (index: number, sample: SerializedSample) => void;
  clearTempRecordedSample: () => void;
  updateTempRecordedSample: (sample: SerializedSample) => void;
  // Async actions
  loadKitFromRomBank: (romData: ArrayBuffer, bankIndex: number) => Promise<void>;
  loadKitFromFile: (romData: ArrayBuffer) => Promise<ArrayBuffer | null>;
  saveKitToFile: (romData: ArrayBuffer) => Promise<void>;
  addSample: () => Promise<void>;
  addRecordedSample: (audioBuffer: AudioBuffer) => Promise<void>;
  saveTempSampleToKit: () => void;
  playSample: (sampleIndex: number) => Promise<void>;
  // For pitch shift — returns the reconstructed Sample for direct manipulation
  getSampleInstance: (index: number) => Sample | null;
}

const KitContext = createContext<KitContextValue | null>(null);

const BANK_SIZE = 0x4000;

interface KitProviderProps {
  children: ReactNode;
  initialState?: Partial<Pick<KitContextValue, 'kitInfo' | 'samples' | 'selectedSampleIndex' | 'selectedBankIndex' | 'isHalfSpeed' | 'useGbaPolarity' | 'isLoading' | 'error' | 'tempRecordedSample'>>;
}

export function KitProvider({ children, initialState }: KitProviderProps) {
  const [kitInfo, setKitInfo] = useState<KitInfo | null>(initialState?.kitInfo ?? null);
  const [samples, setSamples] = useState<(SerializedSample | null)[]>(initialState?.samples ?? Array(MAX_SAMPLES).fill(null));
  const [selectedSampleIndex, setSelectedSampleIndex] = useState<number | null>(initialState?.selectedSampleIndex ?? null);
  const [selectedBankIndex, setSelectedBankIndex] = useState(initialState?.selectedBankIndex ?? 0);
  const [isHalfSpeed, setIsHalfSpeed] = useState(initialState?.isHalfSpeed ?? false);
  const [useGbaPolarity, setUseGbaPolarity] = useState(initialState?.useGbaPolarity ?? false);
  const [tempRecordedSample, setTempRecordedSample] = useState<SerializedSample | null>(initialState?.tempRecordedSample ?? null);
  const { isLoading, error, setError, withLoading } = useLoadingState(
    initialState?.isLoading ?? false,
    initialState?.error ?? null
  );

  // File map for non-serializable File objects
  const fileMapRef = useRef<Map<number, File>>(new Map());

  const stateRef = useRef({ kitInfo, samples, selectedSampleIndex, selectedBankIndex, isHalfSpeed, useGbaPolarity, tempRecordedSample });
  stateRef.current = { kitInfo, samples, selectedSampleIndex, selectedBankIndex, isHalfSpeed, useGbaPolarity, tempRecordedSample };

  // Helper: apply a Sample method to a serialized sample, returning updated serialized
  function withSampleInstance(
    s: SerializedSample,
    fn: (sample: Sample) => void
  ): SerializedSample {
    const instance = serializedToSample(s);
    fn(instance);
    return sampleToSerialized(instance);
  }

  // Helper: update a single sample in the array + recalculate kit memory
  function updateSampleAt(index: number, updater: (s: SerializedSample) => SerializedSample) {
    setSamples(prev => {
      const s = prev[index];
      if (!s) return prev;
      const updated = [...prev];
      updated[index] = updater(s);
      return updated;
    });
    // Recalculate memory outside the setSamples updater to avoid nested state updates
    setKitInfo(prev => {
      if (!prev) return prev;
      // Use stateRef to get the latest samples after the setSamples call is batched
      const latestSamples = [...stateRef.current.samples];
      const s = latestSamples[index];
      if (s) latestSamples[index] = updater(s);
      const { totalSampleSizeInBytes, bytesFree } = calculateKitMemory(latestSamples);
      return { ...prev, totalSampleSizeInBytes, bytesFree };
    });
  }

  // Helper: replace an entire sample at a given index
  function replaceSampleAt(index: number, sample: SerializedSample) {
    setSamples(prev => {
      const updated = [...prev];
      updated[index] = sample;
      return updated;
    });
    setKitInfo(prev => {
      if (!prev) return prev;
      const latestSamples = [...stateRef.current.samples];
      latestSamples[index] = sample;
      const { totalSampleSizeInBytes, bytesFree } = calculateKitMemory(latestSamples);
      return { ...prev, totalSampleSizeInBytes, bytesFree };
    });
  }

  // Helper: frame editing operations (delete, crop, fadeIn, fadeOut)
  function applyFrameOp(
    sampleIndex: number,
    startFrame: number,
    endFrame: number,
    method: 'deleteFrames' | 'cropFrames' | 'fadeInFrames' | 'fadeOutFrames'
  ) {
    updateSampleAt(sampleIndex, s => withSampleInstance(s, sample => {
      sample[method](startFrame, endFrame);
    }));
  }

  const actions = useMemo(() => ({
    selectSample: (index: number | null) => setSelectedSampleIndex(index),
    selectBank: (index: number) => setSelectedBankIndex(index),
    setHalfSpeed: (value: boolean) => setIsHalfSpeed(value),
    setGbaPolarity: (value: boolean) => setUseGbaPolarity(value),
    replaceSample: (index: number, sample: SerializedSample) => replaceSampleAt(index, sample),
    clearTempRecordedSample: () => setTempRecordedSample(null),
    updateTempRecordedSample: (sample: SerializedSample) => setTempRecordedSample(sample),

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
      setSamples(prev => {
        const newSamples = [...prev];
        for (let i = index; i < newSamples.length - 1; i++) {
          newSamples[i] = newSamples[i + 1];
        }
        newSamples[newSamples.length - 1] = null;
        return newSamples;
      });
      // Recalculate memory outside setSamples updater
      setKitInfo(prev => {
        if (!prev) return prev;
        const latestSamples = [...stateRef.current.samples];
        for (let i = index; i < latestSamples.length - 1; i++) {
          latestSamples[i] = latestSamples[i + 1];
        }
        latestSamples[latestSamples.length - 1] = null;
        const { totalSampleSizeInBytes, bytesFree } = calculateKitMemory(latestSamples);
        return { ...prev, totalSampleSizeInBytes, bytesFree };
      });
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
      updateSampleAt(index, s => withSampleInstance(s, sample => {
        sample.setVolumeDb(0);
        sample.setPitchSemitones(0);
        sample.setTrim(0);
        sample.setDither(false);
        if (sample.getUneditedSamples()) {
          sample.setOriginalSamplesFromUnedited();
          sample.processSamples();
        }
      }));
    },

    updateSampleVolume: (sampleIndex: number, volumeDb: number) => {
      updateSampleAt(sampleIndex, s => withSampleInstance(s, sample => {
        sample.setVolumeDb(volumeDb);
        sample.processSamples();
      }));
    },

    updateSamplePitch: (sampleIndex: number, pitchSemitones: number) => {
      updateSampleAt(sampleIndex, s => ({ ...s, pitchSemitones }));
    },

    updateSampleTrim: (sampleIndex: number, trim: number) => {
      updateSampleAt(sampleIndex, s => withSampleInstance(s, sample => {
        sample.setTrim(trim);
        sample.processSamples();
      }));
    },

    updateSampleDither: (sampleIndex: number, dither: boolean) => {
      updateSampleAt(sampleIndex, s => withSampleInstance(s, sample => {
        sample.setDither(dither);
        sample.processSamples();
      }));
    },

    updateSampleName: (sampleIndex: number, name: string) => {
      updateSampleAt(sampleIndex, s => ({ ...s, name: name.toUpperCase().substring(0, 3) }));
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
      const instance = serializedToSample(s);
      const file = fileMapRef.current.get(index);
      if (file) instance.setFile(file);
      return instance;
    },

    loadKitFromRomBank: (romData: ArrayBuffer, bankIndex: number) =>
      withLoading('Failed to load kit from ROM bank', async () => {
        const { samples: extracted, kitName } = await SampleBankCompiler.extractFromRomBank(romData, bankIndex);
        const serialized = extracted.map(s => s ? sampleToSerialized(s) : null);
        const { totalSampleSizeInBytes, bytesFree } = calculateKitMemory(serialized);

        setSamples(serialized);
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

    loadKitFromFile: (romData: ArrayBuffer): Promise<ArrayBuffer | null> => {
      // Returns updated romData if successful, null otherwise
      let result: ArrayBuffer | null = null;
      return withLoading('Failed to load kit file', async () => {
        const fileData = await FileService.loadBinaryFile('.kit');
        if (!fileData) return;

        const kitView = new Uint8Array(fileData);
        if (kitView[0] !== 0x60 || kitView[1] !== 0x40) {
          setError('Invalid kit file format');
          return;
        }

        const { selectedBankIndex: bankIdx } = stateRef.current;
        const newRomData = new ArrayBuffer(romData.byteLength);
        new Uint8Array(newRomData).set(new Uint8Array(romData));
        new Uint8Array(newRomData).set(new Uint8Array(fileData), bankIdx * BANK_SIZE);

        const { samples: extracted, kitName } = await SampleBankCompiler.extractFromRomBank(newRomData, bankIdx);
        const serialized = extracted.map(s => s ? sampleToSerialized(s) : null);
        const { totalSampleSizeInBytes, bytesFree } = calculateKitMemory(serialized);

        setSamples(serialized);
        setKitInfo({
          name: kitName,
          bankIndex: bankIdx,
          isValid: true,
          totalSampleSizeInBytes,
          bytesFree,
        });
        setSelectedSampleIndex(null);
        fileMapRef.current.clear();
        result = newRomData;
      }).then(() => result);
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
        const serialized = sampleToSerialized(sample);
        newSamples[firstFreeSlot] = serialized;
        const { bytesFree } = calculateKitMemory(newSamples);

        if (bytesFree < 0) {
          const trim = Math.ceil(-bytesFree / 16);
          sample.setTrim(trim);
          await sample.reload(halfSpeed);
          newSamples[firstFreeSlot] = sampleToSerialized(sample);
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
        const { resample } = await import('../services/audio/sample/SampleUtils');
        const resampled = resample(sampleData, inSampleRate, outSampleRate);

        setTempRecordedSample({
          name: 'REC',
          processedSamples: Array.from(resampled),
          originalSamples: Array.from(resampled),
          uneditedSamples: Array.from(resampled),
          untrimmedLength: resampled.length,
          volumeDb: 0,
          pitchSemitones: 0,
          trim: 0,
          dither: false,
          halfSpeed,
        });
      }),

    saveTempSampleToKit: () => {
      const { samples: currentSamples, tempRecordedSample: temp } = stateRef.current;
      if (!temp) return;

      const firstFreeSlot = currentSamples.findIndex(s => s === null);
      if (firstFreeSlot === -1) {
        setError('Kit is full');
        return;
      }

      // Process the temp sample through Sample instance to apply settings
      const instance = serializedToSample(temp);

      const newSamples = [...currentSamples];
      let serialized = sampleToSerialized(instance);

      // Check if it fits, trim if needed
      newSamples[firstFreeSlot] = serialized;
      const { bytesFree } = calculateKitMemory(newSamples);
      if (bytesFree < 0) {
        const trim = Math.ceil(-bytesFree / 16);
        instance.setTrim(trim);
        instance.processSamples();
        serialized = sampleToSerialized(instance);
        newSamples[firstFreeSlot] = serialized;
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
        const data = new Int16Array(s.processedSamples);
        const sampleRate = halfSpeed ? 5734 : 11468;
        await AudioService.playAudioBuffer(int16ToArrayBuffer(data), {}, sampleRate);
      } catch {
        // Audio playback errors are non-critical
      }
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [withLoading]);

  const value = useMemo<KitContextValue>(
    () => ({
      kitInfo, samples, selectedSampleIndex, selectedBankIndex,
      isHalfSpeed, useGbaPolarity, isLoading, error, tempRecordedSample,
      ...actions,
    }),
    [kitInfo, samples, selectedSampleIndex, selectedBankIndex,
     isHalfSpeed, useGbaPolarity, isLoading, error, tempRecordedSample, actions]
  );

  return (
    <KitContext.Provider value={value}>
      {children}
    </KitContext.Provider>
  );
}

export function useKit(): KitContextValue {
  const ctx = useContext(KitContext);
  if (!ctx) throw new Error('useKit must be used within KitProvider');
  return ctx;
}
