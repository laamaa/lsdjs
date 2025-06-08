import { createAsyncThunk, createSlice, PayloadAction, Middleware, UnknownAction } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer';
import { FileService } from '../../services/file/FileService';
import { Sample, SampleBankCompiler, AudioService } from '../../services/audio';
import { RootState } from '../store';
import { updateRomData } from './romSlice';

// Create a thunk for updating ROM data with current kit data
export const updateRomDataWithKit = createAsyncThunk<void, void>(
  'kit/updateRomDataWithKit',
  async (_, { getState, dispatch }) => {
    const state = getState() as RootState;
    const { romData } = state.rom;
    const { kitInfo, samples, useGbaPolarity } = state.kit;

    if (!romData || !kitInfo) {
      return;
    }

    // Create a copy of the ROM data to avoid mutating the original
    const updatedRomData = new ArrayBuffer(romData.byteLength);
    new Uint8Array(updatedRomData).set(new Uint8Array(romData));

    // Update the ROM with the current kit data
    SampleBankCompiler.writeToRomBank(
      updatedRomData,
      kitInfo.bankIndex,
      samples,
      kitInfo.name,
      useGbaPolarity
    );

    // Dispatch an action to update the ROM data in the store
    dispatch(updateRomData(updatedRomData));
  }
);

// Constants
const MAX_SAMPLES = 15;
const MAX_SAMPLE_SPACE = 0x3fa0;
const BANK_SIZE = 0x4000; // 16,384 bytes

// Define the kit information interface
export interface KitInfo {
  name: string;
  bankIndex: number;
  isValid: boolean;
  totalSampleSizeInBytes: number;
  bytesFree: number;
}

// Define a serializable representation of a Sample
interface SerializableSample {
  name: string;
  sampleData: number[]; // Serialized Int16Array
  untrimmedLength: number;
  readPos: number;
  volumeDb: number;
  pitchSemitones: number;
  trim: number;
  dither: boolean;
  halfSpeed: boolean;
}

// Define the kit state interface
interface KitState {
  kitInfo: KitInfo | null;
  samples: (Sample | null)[];
  selectedSampleIndex: number | null;
  selectedBankIndex: number;
  isHalfSpeed: boolean;
  useGbaPolarity: boolean;
  isLoading: boolean;
  error: string | null;
  // Temporary sample for editing before adding to kit (serializable version)
  tempRecordedSample: SerializableSample | null;
}

// Helper function to calculate total sample size and bytes free
const calculateSampleSizeAndBytesFree = (samples: (Sample | WritableDraft<Sample> | null)[]): { totalSampleSizeInBytes: number; bytesFree: number } => {
  const totalSampleSizeInBytes = samples.reduce(
    (total, sample) => total + (sample ? sample.lengthInBytes() : 0),
    0
  );

  return {
    totalSampleSizeInBytes,
    bytesFree: MAX_SAMPLE_SPACE - totalSampleSizeInBytes
  };
};

// Helper function to convert a Sample to a SerializableSample
const sampleToSerializable = (sample: Sample): SerializableSample => {
  return {
    name: sample.getName(),
    sampleData: Array.from(sample.workSampleData()), // Convert Int16Array to regular array
    untrimmedLength: sample.untrimmedLengthInSamples(),
    readPos: 0, // Reset read position
    volumeDb: sample.getVolumeDb(),
    pitchSemitones: sample.getPitchSemitones(),
    trim: sample.getTrim(),
    dither: sample.getDither(),
    halfSpeed: false // Default to false, will be set by component
  };
};

// Helper function to convert a SerializableSample to a Sample
const serializableToSample = (serializable: SerializableSample): Sample => {
  // Create a new Int16Array from the serialized data
  const sampleData = new Int16Array(serializable.sampleData);

  // Create a new Sample with the data
  const sample = new Sample(sampleData, serializable.name);

  // Set all the properties
  sample.setVolumeDb(serializable.volumeDb);
  sample.setPitchSemitones(serializable.pitchSemitones);
  sample.setTrim(serializable.trim);
  sample.setDither(serializable.dither);

  // Set originalSamples to enable editing operations
  sample.setOriginalSamples(sampleData.slice());

  // Also set uneditedSamples to ensure proper revert functionality
  sample.setUneditedSamples(sampleData.slice());

  // Process the samples to apply the settings
  sample.processSamples();

  return sample;
};

// Define the initial state
const initialState: KitState = {
  kitInfo: null,
  samples: Array(MAX_SAMPLES).fill(null),
  selectedSampleIndex: null,
  selectedBankIndex: 0,
  isHalfSpeed: false,
  useGbaPolarity: false,
  isLoading: false,
  error: null,
  tempRecordedSample: null,
};

// Define return type for loadKitFromRomBank thunk
interface LoadKitFromRomBankResult {
  kitInfo: KitInfo;
  samples: (Sample | null)[];
}

// Create an async thunk for loading a kit from a ROM bank
export const loadKitFromRomBank = createAsyncThunk<LoadKitFromRomBankResult, { romData: ArrayBuffer; bankIndex: number }>(
  'kit/loadKitFromRomBank',
  async ({ romData, bankIndex }, { rejectWithValue }) => {
    try {
      // Extract the kit from the ROM bank
      const { samples, kitName } = await SampleBankCompiler.extractFromRomBank(romData, bankIndex);

      // Calculate total sample size and bytes free
      const { totalSampleSizeInBytes, bytesFree } = calculateSampleSizeAndBytesFree(samples);

      return {
        kitInfo: {
          name: kitName,
          bankIndex,
          isValid: true,
          totalSampleSizeInBytes,
          bytesFree,
        },
        samples,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load kit from ROM bank');
    }
  }
);

// Define the return type for loadKitFromFile thunk
interface LoadKitResult {
  kitInfo?: KitInfo;
  samples?: (Sample | null)[];
  romData?: ArrayBuffer;
  canceled?: boolean;
}

// Create an async thunk for loading a kit from a file
export const loadKitFromFile = createAsyncThunk<LoadKitResult, void>(
  'kit/loadKitFromFile',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { romData } = state.rom;

      if (!romData) {
        return rejectWithValue('No ROM loaded');
      }

      // Use FileService to open a file picker and load the selected file
      const fileData = await FileService.loadBinaryFile('.kit');

      if (!fileData) {
        // User canceled the file selection, return without an error
        return { canceled: true };
      }

      // Check if the file is a valid kit file
      const kitView = new Uint8Array(fileData);
      if (kitView[0] !== 0x60 || kitView[1] !== 0x40) {
        return rejectWithValue('Invalid kit file format');
      }

      // Create a copy of the ROM data
      const newRomData = new ArrayBuffer(romData.byteLength);
      new Uint8Array(newRomData).set(new Uint8Array(romData));

      // Write the kit data to the ROM
      const bankIndex = state.kit.selectedBankIndex;
      const bankOffset = bankIndex * BANK_SIZE;

      // Copy the kit data to the ROM
      new Uint8Array(newRomData).set(new Uint8Array(fileData), bankOffset);

      // Extract the kit from the ROM bank
      const { samples, kitName } = await SampleBankCompiler.extractFromRomBank(newRomData, bankIndex);

      // Calculate total sample size and bytes free
      const { totalSampleSizeInBytes, bytesFree } = calculateSampleSizeAndBytesFree(samples);

      return {
        kitInfo: {
          name: kitName,
          bankIndex,
          isValid: true,
          totalSampleSizeInBytes,
          bytesFree,
        },
        samples,
        romData: newRomData,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load kit file');
    }
  }
);

// Define the return type for saveKitToFile thunk
interface SaveKitResult {
  success?: boolean;
  canceled?: boolean;
}

// Create an async thunk for saving a kit to a file
export const saveKitToFile = createAsyncThunk<SaveKitResult, void>(
  'kit/saveKitToFile',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { romData } = state.rom;
      const { kitInfo, selectedBankIndex } = state.kit;

      if (!romData || !kitInfo) {
        return rejectWithValue('No ROM or kit loaded');
      }

      // Create a buffer for the kit data
      const kitData = new Uint8Array(BANK_SIZE);

      // Copy the bank data from the ROM
      const bankOffset = selectedBankIndex * BANK_SIZE;
      for (let i = 0; i < BANK_SIZE; i++) {
        kitData[i] = new Uint8Array(romData)[bankOffset + i];
      }

      // Use FileService to save the kit data
      const result = await FileService.saveFile(kitData.buffer, {
        suggestedName: `${kitInfo.name.trim() || 'untitled'}.kit`,
        mimeType: 'application/octet-stream'
      });

      // Check if the user canceled the save operation
      if (!result.success && result.error?.code === 'USER_CANCELLED') {
        return { canceled: true };
      }

      return { success: result.success };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save kit file');
    }
  }
);

// Define return type for addSample thunk
interface AddSampleResult {
  samples?: (Sample | null)[];
  selectedSampleIndex?: number;
  canceled?: boolean;
}

// Define return type for addRecordedSample thunk
interface AddRecordedSampleResult {
  sampleData: number[]; // Serializable array of sample data
  sampleName: string;
}

// Helper function to resample audio data
const resampleAudio = (samples: Int16Array, inSampleRate: number, outSampleRate: number): Int16Array => {
  // Linear interpolation resampling
  const ratio = inSampleRate / outSampleRate;
  const outLength = Math.floor(samples.length / ratio);
  const result = new Int16Array(outLength);

  for (let i = 0; i < outLength; i++) {
    const position = i * ratio;
    const index = Math.floor(position);
    const fraction = position - index;

    if (index >= samples.length - 1) {
      result[i] = samples[samples.length - 1];
    } else {
      result[i] = Math.round(
        samples[index] * (1 - fraction) + samples[index + 1] * fraction
      );
    }
  }

  return result;
};

// Create an async thunk for adding a recorded sample to temporary state for editing
export const addRecordedSample = createAsyncThunk<AddRecordedSampleResult, { audioBuffer: AudioBuffer }>(
  'kit/addRecordedSample',
  async ({ audioBuffer }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { isHalfSpeed } = state.kit;

      // Convert AudioBuffer to Int16Array
      const channelData = audioBuffer.getChannelData(0);
      const sampleData = new Int16Array(channelData.length);

      // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
      for (let i = 0; i < channelData.length; i++) {
        sampleData[i] = Math.max(-32768, Math.min(32767, Math.round(channelData[i] * 32767)));
      }

      // Get the original sample rate from the AudioBuffer
      const inSampleRate = audioBuffer.sampleRate;

      // Determine the target sample rate based on half-speed mode
      const outSampleRate = isHalfSpeed ? 5734 : 11468;

      // Resample the audio data to match the target sample rate
      const resampledData = resampleAudio(sampleData, inSampleRate, outSampleRate);

      // Convert Int16Array to regular array for serialization
      const serializableSampleData = Array.from(resampledData);

      return {
        sampleData: serializableSampleData,
        sampleName: 'REC',
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to add recorded sample');
    }
  }
);

// Define return type for saveTempSampleToKit thunk
interface SaveTempSampleToKitResult {
  selectedSampleIndex: number;
}

// Create an async thunk for saving the temporary sample to the kit
export const saveTempSampleToKit = createAsyncThunk<SaveTempSampleToKitResult, void>(
  'kit/saveTempSampleToKit',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { samples, tempRecordedSample } = state.kit;

      if (!tempRecordedSample) {
        return rejectWithValue('No temporary sample to save');
      }

      // Find the first free sample slot
      const firstFreeSlot = samples.findIndex((sample: Sample | null) => sample === null);
      if (firstFreeSlot === -1) {
        return rejectWithValue('Kit is full');
      }

      return {
        selectedSampleIndex: firstFreeSlot,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save sample to kit');
    }
  }
);

// Create an async thunk for adding a sample
export const addSample = createAsyncThunk<AddSampleResult, void>(
  'kit/addSample',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { samples, isHalfSpeed } = state.kit;

      // Find the first free sample slot
      const firstFreeSlot = samples.findIndex((sample: Sample | null) => sample === null);
      if (firstFreeSlot === -1) {
        return rejectWithValue('Kit is full');
      }

      // Use FileService to open a file picker and load the selected file
      const fileData = await FileService.loadBinaryFile('.wav');

      if (!fileData) {
        // User canceled the file selection, return without an error
        return { canceled: true };
      }

      // Create a File object from the ArrayBuffer
      const fileName = 'sample.wav'; // The default name will be replaced by the actual file name
      const file = new File([fileData], fileName, { type: 'audio/wav' });

      // Create a sample from the WAV file
      const sample = await Sample.createFromWav(file, {
        halfSpeed: isHalfSpeed,
        dither: true,
        volumeDb: 0,
        trim: 0,
        pitchSemitones: 0,
      });

      // Create a copy of the samples array
      const newSamples = [...samples];
      newSamples[firstFreeSlot] = sample;

      // Calculate bytes free
      const { bytesFree } = calculateSampleSizeAndBytesFree(newSamples);

      // If the sample doesn't fit, trim it
      if (bytesFree < 0) {
        const trim = Math.ceil(-bytesFree / 16);
        sample.setTrim(trim);
        await sample.reload(isHalfSpeed);
      }

      return {
        samples: newSamples,
        selectedSampleIndex: firstFreeSlot,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to add sample');
    }
  }
);

// Create an async thunk for playing a sample
export const playSample = createAsyncThunk<number, number>(
  'kit/playSample',
  async (sampleIndex, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { samples } = state.kit;

      if (sampleIndex < 0 || sampleIndex >= samples.length) {
        return rejectWithValue('Invalid sample index');
      }

      const sample = samples[sampleIndex];
      if (!sample) {
        return rejectWithValue('No sample at this index');
      }

      // Stop any currently playing audio
      AudioService.stopAll();

      // Get the sample data
      const sampleData = sample.workSampleData();

      // Convert the Int16Array to an ArrayBuffer
      const buffer = new ArrayBuffer(sampleData.length * 2);
      const view = new DataView(buffer);
      for (let i = 0; i < sampleData.length; i++) {
        view.setInt16(i * 2, sampleData[i], true);
      }

      // Determine the sample rate based on half-speed mode
      const sampleRate = state.kit.isHalfSpeed ? 5734 : 11468;

      // Play the sample
      await AudioService.playAudioBuffer(buffer, {}, sampleRate);

      return sampleIndex;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to play sample');
    }
  }
);

// Create the kit slice
const kitSlice = createSlice({
  name: 'kit',
  initialState,
  reducers: {
    clearTempRecordedSample: (state) => {
      state.tempRecordedSample = null;
    },
    updateTempRecordedSample: (state, action: PayloadAction<SerializableSample>) => {
      if (state.tempRecordedSample) {
        // Update the state with the serializable sample
        state.tempRecordedSample = action.payload;
      }
    },
    selectSample: (state, action: PayloadAction<number | null>) => {
      state.selectedSampleIndex = action.payload;
    },
    selectBank: (state, action: PayloadAction<number>) => {
      state.selectedBankIndex = action.payload;
    },
    setHalfSpeed: (state, action: PayloadAction<boolean>) => {
      state.isHalfSpeed = action.payload;
    },
    setGbaPolarity: (state, action: PayloadAction<boolean>) => {
      state.useGbaPolarity = action.payload;
    },
    renameKit: (state, action: PayloadAction<string>) => {
      if (state.kitInfo) {
        state.kitInfo.name = action.payload;
      }
    },
    updateSampleVolume: (state, action: PayloadAction<{ sampleIndex: number; volumeDb: number }>) => {
      const { sampleIndex, volumeDb } = action.payload;
      const sample = state.samples[sampleIndex];
      if (sample) {
        sample.setVolumeDb(volumeDb);
        sample.processSamples();

        // Update total sample size and bytes free
        if (state.kitInfo) {
          const { totalSampleSizeInBytes, bytesFree } = calculateSampleSizeAndBytesFree(state.samples);
          state.kitInfo.totalSampleSizeInBytes = totalSampleSizeInBytes;
          state.kitInfo.bytesFree = bytesFree;
        }
      }
    },
    updateSamplePitch: (state, action: PayloadAction<{ sampleIndex: number; pitchSemitones: number }>) => {
      const { sampleIndex, pitchSemitones } = action.payload;
      const sample = state.samples[sampleIndex];
      if (sample) {
        // Store the pitch value in the sample
        sample.setPitchSemitones(pitchSemitones);
      }
    },
    updateSampleTrim: (state, action: PayloadAction<{ sampleIndex: number; trim: number }>) => {
      const { sampleIndex, trim } = action.payload;
      const sample = state.samples[sampleIndex];
      if (sample) {
        sample.setTrim(trim);
        sample.processSamples();

        // Update total sample size and bytes free
        if (state.kitInfo) {
          const { totalSampleSizeInBytes, bytesFree } = calculateSampleSizeAndBytesFree(state.samples);
          state.kitInfo.totalSampleSizeInBytes = totalSampleSizeInBytes;
          state.kitInfo.bytesFree = bytesFree;
        }
      }
    },
    updateSampleDither: (state, action: PayloadAction<{ sampleIndex: number; dither: boolean }>) => {
      const { sampleIndex, dither } = action.payload;
      const sample = state.samples[sampleIndex];
      if (sample) {
        sample.setDither(dither);
        sample.processSamples();
      }
    },
    updateSampleName: (state, action: PayloadAction<{ sampleIndex: number; name: string }>) => {
      const { sampleIndex, name } = action.payload;
      const sample = state.samples[sampleIndex];
      if (sample) {
        sample.setName(name);
      }
    },
    deleteFrames: (state, action: PayloadAction<{ sampleIndex: number; startFrame: number; endFrame: number }>) => {
      const { sampleIndex, startFrame, endFrame } = action.payload;
      const sample = state.samples[sampleIndex];

      if (sample) {
        const success = sample.deleteFrames(startFrame, endFrame);

        if (success && state.kitInfo) {
          // Update total sample size and bytes free
          const { totalSampleSizeInBytes, bytesFree } = calculateSampleSizeAndBytesFree(state.samples);
          state.kitInfo.totalSampleSizeInBytes = totalSampleSizeInBytes;
          state.kitInfo.bytesFree = bytesFree;
        }
      }
    },
    cropFrames: (state, action: PayloadAction<{ sampleIndex: number; startFrame: number; endFrame: number }>) => {
      const { sampleIndex, startFrame, endFrame } = action.payload;
      const sample = state.samples[sampleIndex];

      if (sample) {
        const success = sample.cropFrames(startFrame, endFrame);

        if (success && state.kitInfo) {
          // Update total sample size and bytes free
          const { totalSampleSizeInBytes, bytesFree } = calculateSampleSizeAndBytesFree(state.samples);
          state.kitInfo.totalSampleSizeInBytes = totalSampleSizeInBytes;
          state.kitInfo.bytesFree = bytesFree;
        }
      }
    },
    fadeInFrames: (state, action: PayloadAction<{ sampleIndex: number; startFrame: number; endFrame: number }>) => {
      const { sampleIndex, startFrame, endFrame } = action.payload;
      const sample = state.samples[sampleIndex];

      if (sample) {
        const success = sample.fadeInFrames(startFrame, endFrame);

        if (success && state.kitInfo) {
          // Update total sample size and bytes free
          const { totalSampleSizeInBytes, bytesFree } = calculateSampleSizeAndBytesFree(state.samples);
          state.kitInfo.totalSampleSizeInBytes = totalSampleSizeInBytes;
          state.kitInfo.bytesFree = bytesFree;
        }
      }
    },
    fadeOutFrames: (state, action: PayloadAction<{ sampleIndex: number; startFrame: number; endFrame: number }>) => {
      const { sampleIndex, startFrame, endFrame } = action.payload;
      const sample = state.samples[sampleIndex];

      if (sample) {
        const success = sample.fadeOutFrames(startFrame, endFrame);

        if (success && state.kitInfo) {
          // Update total sample size and bytes free
          const { totalSampleSizeInBytes, bytesFree } = calculateSampleSizeAndBytesFree(state.samples);
          state.kitInfo.totalSampleSizeInBytes = totalSampleSizeInBytes;
          state.kitInfo.bytesFree = bytesFree;
        }
      }
    },
    clearKit: (state) => {
      state.samples = Array(MAX_SAMPLES).fill(null);
      if (state.kitInfo) {
        state.kitInfo.totalSampleSizeInBytes = 0;
        state.kitInfo.bytesFree = MAX_SAMPLE_SPACE;
      }
      state.selectedSampleIndex = null;
    },
    removeSample: (state, action: PayloadAction<number>) => {
      const sampleIndex = action.payload;
      if (sampleIndex >= 0 && sampleIndex < state.samples.length) {
        // Create a copy of the samples array
        const newSamples = [...state.samples];

        // Remove the sample
        newSamples[sampleIndex] = null;

        // Shift samples up if needed
        for (let i = sampleIndex; i < newSamples.length - 1; i++) {
          newSamples[i] = newSamples[i + 1];
        }
        newSamples[newSamples.length - 1] = null;

        state.samples = newSamples;

        // Update total sample size and bytes free
        if (state.kitInfo) {
          const { totalSampleSizeInBytes, bytesFree } = calculateSampleSizeAndBytesFree(newSamples);
          state.kitInfo.totalSampleSizeInBytes = totalSampleSizeInBytes;
          state.kitInfo.bytesFree = bytesFree;
        }

        // Update the selected sample index if needed
        if (state.selectedSampleIndex === sampleIndex) {
          state.selectedSampleIndex = null;
        } else if (state.selectedSampleIndex !== null && state.selectedSampleIndex > sampleIndex) {
          state.selectedSampleIndex--;
        }
      }
    },
    revertSample: (state, action: PayloadAction<number>) => {
      const sampleIndex = action.payload;
      const sample = state.samples[sampleIndex];

      if (sample) {
        // Reset all editable properties to default values
        sample.setVolumeDb(0);
        sample.setPitchSemitones(0);
        sample.setTrim(0);
        sample.setDither(false);

        // If the sample has a file, reload it with default settings
        if (sample.getFile()) {
          // The actual reload will happen in the component after this action
        } else if (sample.getUneditedSamples()) {
          // For samples without a file, reset to the unedited samples
          sample.setOriginalSamplesFromUnedited();
          sample.processSamples();
        }

        // Update total sample size and bytes free
        if (state.kitInfo) {
          const { totalSampleSizeInBytes, bytesFree } = calculateSampleSizeAndBytesFree(state.samples);
          state.kitInfo.totalSampleSizeInBytes = totalSampleSizeInBytes;
          state.kitInfo.bytesFree = bytesFree;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle loadKitFromRomBank
      .addCase(loadKitFromRomBank.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadKitFromRomBank.fulfilled, (state, action) => {
        state.isLoading = false;
        state.kitInfo = action.payload.kitInfo;
        state.samples = action.payload.samples;
        state.selectedSampleIndex = null;
      })
      .addCase(loadKitFromRomBank.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An unknown error occurred';
      })
      // Handle loadKitFromFile
      .addCase(loadKitFromFile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadKitFromFile.fulfilled, (state, action) => {
        // Check if the user canceled the action
        if (action.payload.canceled) {
          // User canceled the file selection, just reset the loading state without error
          state.isLoading = false;
          return;
        }

        state.isLoading = false;

        state.kitInfo = action.payload.kitInfo || null;
        state.samples = action.payload.samples || Array(MAX_SAMPLES).fill(null);
        state.selectedSampleIndex = null;
      })
      .addCase(loadKitFromFile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An unknown error occurred';
      })
      // Handle saveKitToFile
      .addCase(saveKitToFile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveKitToFile.fulfilled, (state, action) => {
        // Check if the user canceled the action
        if (action.payload.canceled) {
          // User canceled the save operation, just reset the loading state without error
          state.isLoading = false;
          return;
        }

        state.isLoading = false;
      })
      .addCase(saveKitToFile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An unknown error occurred';
      })
      // Handle addSample
      .addCase(addSample.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addSample.fulfilled, (state, action) => {
        // Check if the user canceled the action
        if (action.payload.canceled) {
          // User canceled the file selection, just reset the loading state without error
          state.isLoading = false;
          return;
        }

        state.isLoading = false;

        state.samples = action.payload.samples || Array(MAX_SAMPLES).fill(null);
        state.selectedSampleIndex = action.payload.selectedSampleIndex !== undefined ? action.payload.selectedSampleIndex : null;

        // Update total sample size and bytes free
        if (state.kitInfo && action.payload.samples) {
          const { totalSampleSizeInBytes, bytesFree } = calculateSampleSizeAndBytesFree(action.payload.samples);
          state.kitInfo.totalSampleSizeInBytes = totalSampleSizeInBytes;
          state.kitInfo.bytesFree = bytesFree;
        }
      })
      .addCase(addSample.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An unknown error occurred';
      })
      // Handle playSample
      .addCase(playSample.pending, (state) => {
        state.error = null;
      })
      .addCase(playSample.fulfilled, () => {
        // No state changes needed on successful playback
      })
      .addCase(playSample.rejected, (state, action) => {
        state.error = action.payload as string || 'An unknown error occurred';
      })
      // Handle addRecordedSample
      .addCase(addRecordedSample.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addRecordedSample.fulfilled, (state, action) => {
        state.isLoading = false;

        // Create a serializable representation of the sample
        state.tempRecordedSample = {
          name: action.payload.sampleName,
          sampleData: action.payload.sampleData,
          untrimmedLength: action.payload.sampleData.length,
          readPos: 0,
          volumeDb: 0,
          pitchSemitones: 0,
          trim: 0,
          dither: false,
          halfSpeed: state.isHalfSpeed
        };
      })
      .addCase(addRecordedSample.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An unknown error occurred';
      })

      // Handle saveTempSampleToKit
      .addCase(saveTempSampleToKit.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveTempSampleToKit.fulfilled, (state, action) => {
        state.isLoading = false;

        if (!state.tempRecordedSample) {
          state.error = 'No temporary sample to save';
          return;
        }

        // Convert the serializable sample to a Sample object
        const sample = serializableToSample(state.tempRecordedSample);

        // Create a copy of the samples array
        const newSamples = [...state.samples];
        newSamples[action.payload.selectedSampleIndex] = sample;

        // Calculate bytes free
        const { bytesFree } = calculateSampleSizeAndBytesFree(newSamples);

        // If the sample doesn't fit, trim it
        if (bytesFree < 0) {
          const trim = Math.ceil(-bytesFree / 16);
          sample.setTrim(trim);
          sample.processSamples();
        }

        // Update state
        state.samples = newSamples;
        state.selectedSampleIndex = action.payload.selectedSampleIndex;
        state.tempRecordedSample = null; // Clear the temporary sample

        // Update total sample size and bytes free
        if (state.kitInfo) {
          const { totalSampleSizeInBytes, bytesFree } = calculateSampleSizeAndBytesFree(newSamples);
          state.kitInfo.totalSampleSizeInBytes = totalSampleSizeInBytes;
          state.kitInfo.bytesFree = bytesFree;
        }
      })
      .addCase(saveTempSampleToKit.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An unknown error occurred';
      });
  },
});

// Export actions and reducer
export const {
  clearTempRecordedSample,
  updateTempRecordedSample,
  selectSample,
  selectBank,
  setHalfSpeed,
  setGbaPolarity,
  renameKit,
  updateSampleVolume,
  updateSamplePitch,
  updateSampleTrim,
  updateSampleDither,
  updateSampleName,
  clearKit,
  removeSample,
  deleteFrames,
  cropFrames,
  fadeInFrames,
  fadeOutFrames,
  revertSample,
} = kitSlice.actions;

// Export helper functions
export { serializableToSample, sampleToSerializable };

// Define a type for the window object with our custom property
interface CustomWindow extends Window {
  __kitUpdateTimeout: ReturnType<typeof setTimeout> | null;
}

// Type guard to check if an action is a kit modifying action
const isKitModifyingAction = (action: unknown): action is { type: string } => {
  const kitModifyingActions = [
    'kit/renameKit',
    'kit/updateSampleVolume',
    'kit/updateSamplePitch',
    'kit/updateSampleTrim',
    'kit/updateSampleDither',
    'kit/updateSampleName',
    'kit/clearKit',
    'kit/removeSample',
    'kit/deleteFrames',
    'kit/cropFrames',
    'kit/fadeInFrames',
    'kit/fadeOutFrames',
    'kit/revertSample',
    'kit/clearTempRecordedSample',
    'kit/addSample/fulfilled',
    'kit/addRecordedSample/fulfilled',
    'kit/saveTempSampleToKit/fulfilled',
    'kit/loadKitFromFile/fulfilled',
    'kit/loadKitFromRomBank/fulfilled',
  ];

  const updateRomDataWithKitActions = [
    'kit/updateRomDataWithKit/pending',
    'kit/updateRomDataWithKit/fulfilled',
    'kit/updateRomDataWithKit/rejected'
  ];

  return (
    typeof action === 'object' && 
    action !== null && 
    'type' in action && 
    typeof action.type === 'string' && 
    kitModifyingActions.includes(action.type) && 
    !updateRomDataWithKitActions.includes(action.type)
  );
};

// Create a middleware to update ROM data after kit modifications
export const kitMiddleware: Middleware = (store) => (next) => (action: unknown) => {
  // Call the next middleware in the chain
  const result = next(action);

  // Check if the action is one that modifies kit data
  if (isKitModifyingAction(action)) {
    // Use a debounced dispatch to prevent multiple rapid updates
    // Clear any existing timeout
    const customWindow = window as unknown as CustomWindow;
    if (customWindow.__kitUpdateTimeout) {
      clearTimeout(customWindow.__kitUpdateTimeout);
    }

    // Set a new timeout
    customWindow.__kitUpdateTimeout = setTimeout(() => {
      store.dispatch(updateRomDataWithKit() as unknown as UnknownAction);
      customWindow.__kitUpdateTimeout = null;
    }, 100); // Increased delay to reduce update frequency
  }

  return result;
};

export default kitSlice.reducer;
