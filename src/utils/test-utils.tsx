import React from 'react';
import {render, RenderOptions} from '@testing-library/react';
import {RomProvider} from '../context/RomContext';
import {KitProvider} from '../context/KitContext';
import {SaveFileProvider} from '../context/SaveFileContext';

/**
 * Render a component wrapped in all context providers for testing.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <RomProvider>
        <KitProvider>
          <SaveFileProvider>
            {children}
          </SaveFileProvider>
        </KitProvider>
      </RomProvider>
    );
  }
  return render(ui, { wrapper: Wrapper, ...options });
}
