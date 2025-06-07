import {createAsyncThunk, createSlice} from '@reduxjs/toolkit';
import {FileService} from '../../services/file/FileService';
import {RomProcessor, RomInfo as BaseRomInfo} from '../../services/binary';
import {store, AppDispatch} from '../store';
import {loadKitFromRomBank, loadKitFromFile} from './kitSlice';
import {SampleBankCompiler, Sample} from '../../services/audio';

// Extend the base RomInfo interface with additional properties
export interface RomInfo extends BaseRomInfo {
  kitBanks: number[]; // Array of bank indices that contain kits
  kitNames: Record<number, string>; // Map of bank indices to kit names
}

// Define the ROM state interface
interface RomState {
  romInfo: RomInfo | null;
  romData: ArrayBuffer | null;
  isLoading: boolean;
  error: string | null;
}

// Define the initial state
const initialState: RomState = {
  romInfo: null,
  romData: null,
  isLoading: false,
  error: null,
};

// Define return type for loadRomFile thunk
interface LoadRomResult {
  romInfo?: RomInfo;
  romData?: ArrayBuffer;
  canceled?: boolean;
}

// Define return type for exportRomFile thunk
interface ExportRomFileResult {
  canceled?: boolean;
}

// Create an async thunk for exporting a ROM file
export const exportRomFile = createAsyncThunk<ExportRomFileResult, void>(
  'rom/exportRomFile',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { rom: RomState; kit: { 
        kitInfo: { name: string; bankIndex: number } | null; 
        samples: (Sample | null)[]; 
        useGbaPolarity: boolean 
      } };
      const { romInfo, romData } = state.rom;
      const { kitInfo, samples, useGbaPolarity } = state.kit;

      if (!romInfo || !romData) {
        return rejectWithValue('No ROM file loaded');
      }

      // Create a copy of the ROM data to avoid mutating the original
      const updatedRomData = new ArrayBuffer(romData.byteLength);
      new Uint8Array(updatedRomData).set(new Uint8Array(romData));

      // If we have kit data, update the ROM with the current kit data
      if (kitInfo && samples) {
        // Update the ROM with the current kit data
        SampleBankCompiler.writeToRomBank(
          updatedRomData,
          kitInfo.bankIndex,
          samples,
          kitInfo.name,
          useGbaPolarity
        );
      }

      // Use FileService to save the updated ROM file data as a binary .gb file
      const fileExtension = romInfo.title.toLowerCase().includes('color') ? '.gbc' : '.gb';
      const result = await FileService.saveFile(updatedRomData, {
        suggestedName: `${romInfo.title.trim() || 'lsdj'}${fileExtension}`,
        mimeType: 'application/octet-stream'
      });

      // Check if the user canceled the save operation
      if (!result.success && result.error?.code === 'USER_CANCELLED') {
        return { canceled: true };
      }

      return {};
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to export ROM file');
    }
  }
);

// Create an async thunk for loading a ROM file
export const loadRomFile = createAsyncThunk<LoadRomResult, void, {
  rejectValue: string;
}>(
  'rom/loadRomFile',
  async (_, { rejectWithValue }) => {
    try {
      // Use FileService to open a file picker and load the selected file
      const fileData = await FileService.loadBinaryFile('.gb,.gbc');

      if (!fileData) {
        // User canceled the file selection, return without an error
        return { canceled: true };
      }

      // Parse the ROM file
      const romInfo = RomProcessor.parseRom(fileData) as RomInfo;

      if (!romInfo.isValid) {
        return rejectWithValue('Invalid ROM file format');
      }

      // Scan for kit banks and extract kit names
      const kitBanks: number[] = [];
      const kitNames: Record<number, string> = {};
      const romView = new Uint8Array(fileData);
      const BANK_SIZE = 0x4000; // 16,384 bytes
      const numBanks = Math.floor(romView.length / BANK_SIZE);

      for (let bankIndex = 0; bankIndex < numBanks; bankIndex++) {
        const bankOffset = bankIndex * BANK_SIZE;
        // Check if this is a kit bank (magic numbers 0x60 and 0x40 at the start of the bank)
        if (romView[bankOffset] === 0x60 && romView[bankOffset + 1] === 0x40) {
          kitBanks.push(bankIndex);

          // Extract kit name
          const kitName = SampleBankCompiler.extractKitNameFromRomBank(fileData, bankIndex);
          if (kitName) {
            kitNames[bankIndex] = kitName;
          }
        }
      }

      // Add kit banks and names to ROM info
      romInfo.kitBanks = kitBanks;
      romInfo.kitNames = kitNames;

      return {
        romInfo,
        romData: fileData,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load ROM file');
    }
  }
);

// Create the ROM slice
const romSlice = createSlice({
  name: 'rom',
  initialState,
  reducers: {
    clearRomData: (state) => {
      state.romInfo = null;
      state.romData = null;
      state.error = null;
    },
    // Add a reducer to handle the UPDATE_ROM_DATA action
    updateRomData: (state, action) => {
      state.romData = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadRomFile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadRomFile.fulfilled, (state, action) => {
        // Check if the action was canceled by the user
        if (action.payload.canceled) {
          // User canceled the file selection, just reset loading state without error
          state.isLoading = false;
          return;
        }

        state.isLoading = false;

        state.romInfo = action.payload.romInfo || null;
        state.romData = action.payload.romData || null;

        // Automatically load kits from the ROM if any kit banks are found
        // We need to use setTimeout to ensure this runs after the state update
        setTimeout(() => {
          const romInfo = action.payload.romInfo;
          const romData = action.payload.romData;
          if (romInfo && romData && romInfo.kitBanks && romInfo.kitBanks.length > 0) {
            // Load the first valid kit bank
            (store.dispatch as AppDispatch)(loadKitFromRomBank({ romData, bankIndex: romInfo.kitBanks[0] }));
          }
        }, 0);
      })
      .addCase(loadRomFile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An unknown error occurred';
      })
      // Handle exportRomFile
      .addCase(exportRomFile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(exportRomFile.fulfilled, (state, action) => {
        // Check if the action was canceled by the user
        if (action.payload.canceled) {
          // User canceled the save operation, just reset loading state without error
          state.isLoading = false;
          return;
        }

        state.isLoading = false;
      })
      .addCase(exportRomFile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An unknown error occurred';
      })
      // Handle loadKitFromFile to update ROM data when a kit is loaded from a file
      .addCase(loadKitFromFile.fulfilled, (state, action) => {
        // Check if the action was canceled by the user
        if (action.payload.canceled) {
          return;
        }

        // Update ROM data if provided
        if (action.payload.romData) {
          state.romData = action.payload.romData;
        }
      });
  },
});

// Export actions and reducer
export const { clearRomData, updateRomData } = romSlice.actions;
// exportRomFile is already exported above
export default romSlice.reducer;
