import {configureStore, EnhancedStore, ThunkDispatch, UnknownAction} from '@reduxjs/toolkit';
import romReducer from './slices/romSlice';
import saveFileReducer from './slices/saveFileSlice';
import uiReducer from './slices/uiSlice';
import kitReducer, { kitMiddleware } from './slices/kitSlice';

export const store: EnhancedStore = configureStore({
  reducer: {
    rom: romReducer,
    saveFile: saveFileReducer,
    ui: uiReducer,
    kit: kitReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable values in the specified paths
        ignoredActions: [
          'rom/loadRomFile/fulfilled',
          'kit/loadKitFromRomBank',
          'kit/loadKitFromRomBank/fulfilled',
          'kit/loadKitFromFile/fulfilled',
          'kit/addSample/fulfilled',
          'saveFile/loadSaveFile/fulfilled',
          'rom/updateRomData'
        ],
        ignoredPaths: [
          'rom.romData',
          'kit.samples',
          'saveFile.saveFileData'
        ],
      },
    }).concat(kitMiddleware),
});

// Define the root state type
export type RootState = {
  rom: ReturnType<typeof romReducer>;
  saveFile: ReturnType<typeof saveFileReducer>;
  ui: ReturnType<typeof uiReducer>;
  kit: ReturnType<typeof kitReducer>;
};

// Define the AppDispatch type
// Include support for AsyncThunkAction
export type AppDispatch = ThunkDispatch<RootState, unknown, UnknownAction>;
