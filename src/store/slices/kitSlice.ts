import { createAsyncThunk, createSlice, PayloadAction, Middleware, UnknownAction } from '@reduxjs/toolkit';
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

// Define the kit information interface
export interface KitInfo {
  name: string;
  bankIndex: number;
  isValid: boolean;
  totalSampleSizeInBytes: number;
  bytesFree: number;
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
}

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
      const { samples, kitName } = SampleBankCompiler.extractFromRomBank(romData, bankIndex);

      // Calculate total sample size and bytes free
      const totalSampleSizeInBytes = samples.reduce(
        (total, sample) => total + (sample ? sample.lengthInBytes() : 0),
        0
      );

      const bytesFree = MAX_SAMPLE_SPACE - totalSampleSizeInBytes;

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

// Define return type for loadKitFromFile thunk
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
      const BANK_SIZE = 0x4000; // 16,384 bytes
      const bankOffset = bankIndex * BANK_SIZE;

      // Copy the kit data to the ROM
      new Uint8Array(newRomData).set(new Uint8Array(fileData), bankOffset);

      // Extract the kit from the ROM bank
      const { samples, kitName } = SampleBankCompiler.extractFromRomBank(newRomData, bankIndex);

      // Calculate total sample size and bytes free
      const totalSampleSizeInBytes = samples.reduce(
        (total, sample) => total + (sample ? sample.lengthInBytes() : 0),
        0
      );

      const bytesFree = MAX_SAMPLE_SPACE - totalSampleSizeInBytes;

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

// Define return type for saveKitToFile thunk
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
      const BANK_SIZE = 0x4000; // 16,384 bytes
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
      const fileName = 'sample.wav'; // Default name, will be replaced by the actual file name
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

      // Calculate total sample size and bytes free
      const totalSampleSizeInBytes = newSamples.reduce(
        (total, sample) => total + (sample ? sample.lengthInBytes() : 0),
        0
      );

      const bytesFree = MAX_SAMPLE_SPACE - totalSampleSizeInBytes;

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
        const totalSampleSizeInBytes = state.samples.reduce(
          (total, sample) => total + (sample ? sample.lengthInBytes() : 0),
          0
        );

        if (state.kitInfo) {
          state.kitInfo.totalSampleSizeInBytes = totalSampleSizeInBytes;
          state.kitInfo.bytesFree = MAX_SAMPLE_SPACE - totalSampleSizeInBytes;
        }
      }
    },
    updateSamplePitch: (state, action: PayloadAction<{ sampleIndex: number; pitchSemitones: number }>) => {
      const { sampleIndex, pitchSemitones } = action.payload;
      const sample = state.samples[sampleIndex];
      if (sample) {
        // Store the pitch value in the sample
        sample.setPitchSemitones(pitchSemitones);
        // Note: pitch changes require reloading the sample, which is async
        // This will be handled in the component

        // For ROM samples, we need to ensure the pitch value is preserved
        // even after the sample is processed or reloaded
        if (!sample.getFile()) {
          // This is a ROM sample, so we need to make sure the pitch value sticks
          // even after applyPitchShift resets it to 0

          // Get a reference to the sample object outside of the timeout
          const sampleRef = sample;
          const pitchValue = pitchSemitones;

          setTimeout(() => {
            // Use the captured sample reference instead of accessing state
            sampleRef.setPitchSemitones(pitchValue);
          }, 10);
        }
      }
    },
    updateSampleTrim: (state, action: PayloadAction<{ sampleIndex: number; trim: number }>) => {
      const { sampleIndex, trim } = action.payload;
      const sample = state.samples[sampleIndex];
      if (sample) {
        sample.setTrim(trim);
        sample.processSamples();

        // Update total sample size and bytes free
        const totalSampleSizeInBytes = state.samples.reduce(
          (total, sample) => total + (sample ? sample.lengthInBytes() : 0),
          0
        );

        if (state.kitInfo) {
          state.kitInfo.totalSampleSizeInBytes = totalSampleSizeInBytes;
          state.kitInfo.bytesFree = MAX_SAMPLE_SPACE - totalSampleSizeInBytes;
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
      // Add console logs to track the execution flow
      console.log('kitSlice.deleteFrames called with:', sampleIndex, startFrame, endFrame);

      const sample = state.samples[sampleIndex];
      if (sample) {
        console.log('Sample found, calling sample.deleteFrames');
        const success = sample.deleteFrames(startFrame, endFrame);
        console.log('sample.deleteFrames returned:', success);

        if (success) {
          console.log('Updating total sample size and bytes free');
          // Update total sample size and bytes free
          const totalSampleSizeInBytes = state.samples.reduce(
            (total, sample) => total + (sample ? sample.lengthInBytes() : 0),
            0
          );

          if (state.kitInfo) {
            state.kitInfo.totalSampleSizeInBytes = totalSampleSizeInBytes;
            state.kitInfo.bytesFree = MAX_SAMPLE_SPACE - totalSampleSizeInBytes;
          }
        }
      } else {
        console.log('Sample not found');
      }
    },
    cropFrames: (state, action: PayloadAction<{ sampleIndex: number; startFrame: number; endFrame: number }>) => {
      const { sampleIndex, startFrame, endFrame } = action.payload;
      // Add console logs to track the execution flow
      console.log('kitSlice.cropFrames called with:', sampleIndex, startFrame, endFrame);

      const sample = state.samples[sampleIndex];
      if (sample) {
        console.log('Sample found, calling sample.cropFrames');
        const success = sample.cropFrames(startFrame, endFrame);
        console.log('sample.cropFrames returned:', success);

        if (success) {
          console.log('Updating total sample size and bytes free');
          // Update total sample size and bytes free
          const totalSampleSizeInBytes = state.samples.reduce(
            (total, sample) => total + (sample ? sample.lengthInBytes() : 0),
            0
          );

          if (state.kitInfo) {
            state.kitInfo.totalSampleSizeInBytes = totalSampleSizeInBytes;
            state.kitInfo.bytesFree = MAX_SAMPLE_SPACE - totalSampleSizeInBytes;
          }
        }
      } else {
        console.log('Sample not found');
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
        const totalSampleSizeInBytes = newSamples.reduce(
          (total, sample) => total + (sample ? sample.lengthInBytes() : 0),
          0
        );

        if (state.kitInfo) {
          state.kitInfo.totalSampleSizeInBytes = totalSampleSizeInBytes;
          state.kitInfo.bytesFree = MAX_SAMPLE_SPACE - totalSampleSizeInBytes;
        }

        // Update selected sample index if needed
        if (state.selectedSampleIndex === sampleIndex) {
          state.selectedSampleIndex = null;
        } else if (state.selectedSampleIndex !== null && state.selectedSampleIndex > sampleIndex) {
          state.selectedSampleIndex--;
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
        // Check if the action was canceled by the user
        if (action.payload.canceled) {
          // User canceled the file selection, just reset loading state without error
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
        // Check if the action was canceled by the user
        if (action.payload.canceled) {
          // User canceled the save operation, just reset loading state without error
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
        // Check if the action was canceled by the user
        if (action.payload.canceled) {
          // User canceled the file selection, just reset loading state without error
          state.isLoading = false;
          return;
        }

        state.isLoading = false;

        state.samples = action.payload.samples || Array(MAX_SAMPLES).fill(null);
        state.selectedSampleIndex = action.payload.selectedSampleIndex !== undefined ? action.payload.selectedSampleIndex : null;

        // Update total sample size and bytes free
        const totalSampleSizeInBytes = (action.payload.samples || []).reduce(
          (total, sample) => total + (sample ? sample.lengthInBytes() : 0),
          0
        );

        if (state.kitInfo) {
          state.kitInfo.totalSampleSizeInBytes = totalSampleSizeInBytes;
          state.kitInfo.bytesFree = MAX_SAMPLE_SPACE - totalSampleSizeInBytes;
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
      });
  },
});

// Export actions and reducer
export const {
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
} = kitSlice.actions;

// Define a type for the window object with our custom property
interface CustomWindow extends Window {
  __kitUpdateTimeout: ReturnType<typeof setTimeout> | null;
}

// Create a middleware to update ROM data after kit modifications
export const kitMiddleware: Middleware = (store) => (next) => (action: unknown) => {
  // Call the next middleware in the chain
  const result = next(action);

  // Check if the action is one that modifies kit data
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
    'kit/addSample/fulfilled',
    'kit/loadKitFromFile/fulfilled',
    'kit/loadKitFromRomBank/fulfilled',
  ];

  // Prevent infinite loops by not dispatching for updateRomDataWithKit actions
  if (
    typeof action === 'object' && 
    action !== null && 
    'type' in action && 
    typeof action.type === 'string' && 
    kitModifyingActions.includes(action.type) && 
    action.type !== 'kit/updateRomDataWithKit/pending' && 
    action.type !== 'kit/updateRomDataWithKit/fulfilled' && 
    action.type !== 'kit/updateRomDataWithKit/rejected'
  ) {
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
