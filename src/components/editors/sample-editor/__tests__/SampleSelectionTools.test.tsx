import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { SampleSelectionTools } from '../SampleSelectionTools';

describe('SampleSelectionTools', () => {
  const mockSelection = { startFrame: 10, endFrame: 20 };
  const mockOnDeleteFrames = vi.fn();
  const mockOnCropFrames = vi.fn();
  const mockOnFadeInFrames = vi.fn();
  const mockOnFadeOutFrames = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when there is no selection', () => {
    render(
      <SampleSelectionTools
        selection={null}
        onDeleteFrames={mockOnDeleteFrames}
        onCropFrames={mockOnCropFrames}
        onFadeInFrames={mockOnFadeInFrames}
        onFadeOutFrames={mockOnFadeOutFrames}
      />
    );

    expect(screen.queryByText('10 to 20')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /crop/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fade in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fade out/i })).not.toBeInTheDocument();
  });

  it('should not render when start and end frames are the same', () => {
    render(
      <SampleSelectionTools
        selection={{ startFrame: 10, endFrame: 10 }}
        onDeleteFrames={mockOnDeleteFrames}
        onCropFrames={mockOnCropFrames}
        onFadeInFrames={mockOnFadeInFrames}
        onFadeOutFrames={mockOnFadeOutFrames}
      />
    );

    expect(screen.queryByText('10 to 10')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /crop/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fade in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fade out/i })).not.toBeInTheDocument();
  });

  it('should render selection info and buttons when there is a valid selection', () => {
    render(
      <SampleSelectionTools
        selection={mockSelection}
        onDeleteFrames={mockOnDeleteFrames}
        onCropFrames={mockOnCropFrames}
        onFadeInFrames={mockOnFadeInFrames}
        onFadeOutFrames={mockOnFadeOutFrames}
      />
    );

    expect(screen.getByText('10 to 20')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crop/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fade in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fade out/i })).toBeInTheDocument();
  });

  it('should call onDeleteFrames when Delete button is clicked', () => {
    render(
      <SampleSelectionTools
        selection={mockSelection}
        onDeleteFrames={mockOnDeleteFrames}
        onCropFrames={mockOnCropFrames}
        onFadeInFrames={mockOnFadeInFrames}
        onFadeOutFrames={mockOnFadeOutFrames}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(mockOnDeleteFrames).toHaveBeenCalledTimes(1);
  });

  it('should call onCropFrames when Crop button is clicked', () => {
    render(
      <SampleSelectionTools
        selection={mockSelection}
        onDeleteFrames={mockOnDeleteFrames}
        onCropFrames={mockOnCropFrames}
        onFadeInFrames={mockOnFadeInFrames}
        onFadeOutFrames={mockOnFadeOutFrames}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /crop/i }));
    expect(mockOnCropFrames).toHaveBeenCalledTimes(1);
  });

  it('should call onFadeInFrames when Fade In button is clicked', () => {
    render(
      <SampleSelectionTools
        selection={mockSelection}
        onDeleteFrames={mockOnDeleteFrames}
        onCropFrames={mockOnCropFrames}
        onFadeInFrames={mockOnFadeInFrames}
        onFadeOutFrames={mockOnFadeOutFrames}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /fade in/i }));
    expect(mockOnFadeInFrames).toHaveBeenCalledTimes(1);
  });

  it('should call onFadeOutFrames when Fade Out button is clicked', () => {
    render(
      <SampleSelectionTools
        selection={mockSelection}
        onDeleteFrames={mockOnDeleteFrames}
        onCropFrames={mockOnCropFrames}
        onFadeInFrames={mockOnFadeInFrames}
        onFadeOutFrames={mockOnFadeOutFrames}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /fade out/i }));
    expect(mockOnFadeOutFrames).toHaveBeenCalledTimes(1);
  });

  it('should not render Fade In button when onFadeInFrames is not provided', () => {
    render(
      <SampleSelectionTools
        selection={mockSelection}
        onDeleteFrames={mockOnDeleteFrames}
        onCropFrames={mockOnCropFrames}
        onFadeOutFrames={mockOnFadeOutFrames}
      />
    );

    expect(screen.queryByRole('button', { name: /fade in/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fade out/i })).toBeInTheDocument();
  });

  it('should not render Fade Out button when onFadeOutFrames is not provided', () => {
    render(
      <SampleSelectionTools
        selection={mockSelection}
        onDeleteFrames={mockOnDeleteFrames}
        onCropFrames={mockOnCropFrames}
        onFadeInFrames={mockOnFadeInFrames}
      />
    );

    expect(screen.getByRole('button', { name: /fade in/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fade out/i })).not.toBeInTheDocument();
  });
});
