import {createAsyncThunk, createSlice, PayloadAction} from '@reduxjs/toolkit';
import {FileService} from '../../services/file/FileService';
import {SaveFileInfo, SaveFileProcessor} from '../../services/binary/SaveFileProcessor';
import {BinaryProcessor} from '../../services/binary';

// Define the save file state interface
interface SaveFileState {
  saveFileInfo: SaveFileInfo | null;
  saveFileData: ArrayBuffer | null;
  selectedSongId: number | null;
  isLoading: boolean;
  error: string | null;
}

// Define return type for loadSaveFile thunk
interface LoadSaveFileResult {
  saveFileInfo?: SaveFileInfo;
  saveFileData?: ArrayBuffer;
  canceled?: boolean;
}

// Define return type for exportSong thunk
interface ExportSongResult {
  songId?: number;
  canceled?: boolean;
}

// Define return type for exportSaveFile thunk
interface ExportSaveFileResult {
  canceled?: boolean;
}

// Define return type for removeSong thunk
interface RemoveSongResult {
  songId: number;
}

// Define return type for importSong thunk
interface ImportSongResult {
  songId?: number;
  canceled?: boolean;
}

// Define the initial state
const initialState: SaveFileState = {
  saveFileInfo: null,
  saveFileData: null,
  selectedSongId: null,
  isLoading: false,
  error: null,
};

// Create an async thunk for loading a save file
export const loadSaveFile = createAsyncThunk<LoadSaveFileResult, void>(
  'saveFile/loadSaveFile',
  async (_, { rejectWithValue }) => {
    try {
      // Use FileService to open a file picker and load the selected file
      const fileData = await FileService.loadBinaryFile('.sav');

      if (!fileData) {
        // User canceled the file selection, return without an error
        return { canceled: true };
      }

      // Parse the save file
      const saveInfo = SaveFileProcessor.parseSaveFile(fileData);

      if (!saveInfo.isValid) {
        return rejectWithValue('Invalid save file format');
      }

      return {
        saveFileInfo: saveInfo,
        saveFileData: fileData,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load save file');
    }
  }
);

// Create an async thunk for exporting a song
export const exportSong = createAsyncThunk<ExportSongResult, number>(
  'saveFile/exportSong',
  async (songId: number, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { saveFile: SaveFileState };
      const { saveFileInfo, saveFileData } = state.saveFile;

      if (!saveFileInfo || !saveFileData) {
        return rejectWithValue('No save file loaded');
      }

      const song = saveFileInfo.songs.find(s => s.id === songId);
      if (!song) {
        return rejectWithValue(`Song with ID ${songId} not found`);
      }

      // Create a BinaryProcessor for the save file data
      const processor = new BinaryProcessor(saveFileData);

      // Extract the song data for export
      const songData = SaveFileProcessor.extractSongForExport(processor, songId);

      if (!songData) {
        return rejectWithValue(`Failed to extract song data for song ID ${songId}`);
      }

      // Use FileService to save the song data as a binary .lsdprj file
      const result = await FileService.saveFile(songData, {
        suggestedName: `${song.name.trim() || 'untitled'}.lsdprj`,
        mimeType: 'application/octet-stream'
      });

      // Check if the user canceled the save operation
      if (!result.success && result.error?.code === 'USER_CANCELLED') {
        return { canceled: true };
      }

      return { songId };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to export song');
    }
  }
);

// Create an async thunk for exporting the entire save file
export const exportSaveFile = createAsyncThunk<ExportSaveFileResult, void>(
  'saveFile/exportSaveFile',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { saveFile: SaveFileState };
      const { saveFileInfo, saveFileData } = state.saveFile;

      if (!saveFileInfo || !saveFileData) {
        return rejectWithValue('No save file loaded');
      }

      // Use FileService to save the save file data as a binary .sav file
      const result = await FileService.saveFile(saveFileData, {
        suggestedName: 'lsdj.sav',
        mimeType: 'application/octet-stream'
      });

      // Check if the user canceled the save operation
      if (!result.success && result.error?.code === 'USER_CANCELLED') {
        return { canceled: true };
      }

      return {};
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to export save file');
    }
  }
);

// Create an async thunk for removing a song
export const removeSong = createAsyncThunk<RemoveSongResult, number>(
  'saveFile/removeSong',
  async (songId: number, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { saveFile: SaveFileState };
      const { saveFileInfo, saveFileData } = state.saveFile;

      if (!saveFileInfo || !saveFileData) {
        return rejectWithValue('No save file loaded');
      }

      const song = saveFileInfo.songs.find(s => s.id === songId);
      if (!song) {
        return rejectWithValue(`Song with ID ${songId} not found`);
      }

      // Create a BinaryProcessor for the save file data
      const processor = new BinaryProcessor(saveFileData);

      // Clear the song from the save file
      SaveFileProcessor.clearSong(processor, songId);

      // Clear the song from the save file (already done above)

      return { songId };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to remove song');
    }
  }
);

// Create an async thunk for importing a song from a .lsdprj file
export const importSong = createAsyncThunk<ImportSongResult, void>(
  'saveFile/importSong',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { saveFile: SaveFileState };
      const { saveFileInfo, saveFileData } = state.saveFile;

      if (!saveFileInfo || !saveFileData) {
        return rejectWithValue('No save file loaded');
      }

      // Use FileService to open a file picker and load the selected file
      const songData = await FileService.loadBinaryFile('.lsdprj');

      if (!songData) {
        // User canceled the file selection, return without an error
        return { canceled: true };
      }

      // Create a BinaryProcessor for the save file data
      const processor = new BinaryProcessor(saveFileData);

      // Import the song into the save file
      const songId = SaveFileProcessor.importSongFromLsdprj(processor, songData);

      if (songId === null) {
        return rejectWithValue('Failed to import song');
      }

      return { songId };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to import song');
    }
  }
);

// Create the save file slice
const saveFileSlice = createSlice({
  name: 'saveFile',
  initialState,
  reducers: {
    selectSong: (state, action: PayloadAction<number | null>) => {
      state.selectedSongId = action.payload;
    },
    clearSaveFileData: (state) => {
      state.saveFileInfo = null;
      state.saveFileData = null;
      state.selectedSongId = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle loadSaveFile
      .addCase(loadSaveFile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadSaveFile.fulfilled, (state, action) => {
        // Check if the action was canceled by the user
        if (action.payload.canceled) {
          // User canceled the file selection, just reset loading state without error
          state.isLoading = false;
          return;
        }

        state.isLoading = false;

        state.saveFileInfo = action.payload.saveFileInfo || null;
        state.saveFileData = action.payload.saveFileData || null;
        state.selectedSongId = null; // Reset selection when loading a new file
      })
      .addCase(loadSaveFile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An unknown error occurred';
      })
      // Handle exportSong
      .addCase(exportSong.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(exportSong.fulfilled, (state, action) => {
        // Check if the action was canceled by the user
        if (action.payload.canceled) {
          // User canceled the save operation, just reset loading state without error
          state.isLoading = false;
          return;
        }

        state.isLoading = false;
      })
      .addCase(exportSong.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An unknown error occurred';
      })
      // Handle removeSong
      .addCase(removeSong.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(removeSong.fulfilled, (state, action) => {
        state.isLoading = false;

        // Update the saveFileInfo with the removed song
        if (state.saveFileInfo && state.saveFileData) {
          // Re-parse the save file to get updated information
          state.saveFileInfo = SaveFileProcessor.parseSaveFile(state.saveFileData);

          // If the removed song was selected, clear the selection
          if (state.selectedSongId === action.payload.songId) {
            state.selectedSongId = null;
          }
        }
      })
      .addCase(removeSong.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An unknown error occurred';
      })
      // Handle exportSaveFile
      .addCase(exportSaveFile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(exportSaveFile.fulfilled, (state, action) => {
        // Check if the action was canceled by the user
        if (action.payload.canceled) {
          // User canceled the save operation, just reset loading state without error
          state.isLoading = false;
          return;
        }

        state.isLoading = false;
      })
      .addCase(exportSaveFile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An unknown error occurred';
      })
      // Handle importSong
      .addCase(importSong.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(importSong.fulfilled, (state, action) => {
        // Check if the action was canceled by the user
        if (action.payload.canceled) {
          // User canceled the file selection, just reset loading state without error
          state.isLoading = false;
          return;
        }

        state.isLoading = false;

        // Update the saveFileInfo with the imported song
        if (state.saveFileInfo && state.saveFileData) {
          // Re-parse the save file to get updated information
          state.saveFileInfo = SaveFileProcessor.parseSaveFile(state.saveFileData);

          // Select the newly imported song
          if (action.payload.songId !== undefined) {
            state.selectedSongId = action.payload.songId;
          }
        }
      })
      .addCase(importSong.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An unknown error occurred';
      });
  },
});

// Export actions and reducer
export const { selectSong, clearSaveFileData } = saveFileSlice.actions;
// removeSong, exportSong, importSong, and exportSaveFile are already exported above
export default saveFileSlice.reducer;
