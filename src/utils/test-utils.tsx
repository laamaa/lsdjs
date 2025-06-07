import React from 'react';
import {render} from '@testing-library/react';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import romReducer from '../store/slices/romSlice';
import saveFileReducer from '../store/slices/saveFileSlice';
import uiReducer from '../store/slices/uiSlice';
import kitReducer from '../store/slices/kitSlice';

/**
 * Utility function to render components with Redux Provider for testing
 * @param ui - The React component to render
 * @param options - Options for rendering, including preloadedState and store
 * @returns The rendered component with store
 */
export function renderWithRedux(
  ui: React.ReactElement,
  {
    preloadedState = {
      rom: {
        romInfo: null,
        romData: null,
        isLoading: false,
        error: null,
      },
      saveFile: {},
      ui: {},
      kit: {
        kitInfo: null,
        samples: Array(15).fill(null),
        selectedSampleIndex: null,
        selectedBankIndex: 0,
        isHalfSpeed: false,
        useGbaPolarity: false,
        isLoading: false,
        error: null,
      },
    },
    store = configureStore({
      reducer: {
        rom: romReducer,
        saveFile: saveFileReducer,
        ui: uiReducer,
        kit: kitReducer,
      },
      preloadedState,
    }),
    ...renderOptions
  } = {}
) {
  // Define props interface for the Wrapper component
  interface WrapperProps {
    children: React.ReactNode;
  }

  function Wrapper({ children }: WrapperProps) {
    return <Provider store={store}>{children}</Provider>;
  }
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
