import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSampleOperations } from '../useSampleOperations';
import { Sample } from '../../../../services/audio';

function makeSample(processedLength: number): Sample {
  const data = new Int16Array(processedLength);
  const sample = new Sample(data, 'TST');
  sample.setOriginalSamples(data.slice());
  return sample;
}

describe('useSampleOperations', () => {
  const deleteFrames = vi.fn();
  const cropFrames = vi.fn();
  const fadeInFrames = vi.fn();
  const fadeOutFrames = vi.fn();
  const setSelection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderWithDefaults(overrides = {}) {
    return renderHook(() =>
      useSampleOperations({
        selectedSampleIndex: 0,
        selection: { startFrame: 5, endFrame: 20 },
        samples: [makeSample(100)],
        deleteFrames,
        cropFrames,
        fadeInFrames,
        fadeOutFrames,
        setSelection,
        ...overrides,
      })
    );
  }

  it('does nothing when selectedSampleIndex is null', () => {
    vi.spyOn(window, 'confirm');
    const { result } = renderWithDefaults({ selectedSampleIndex: null });
    result.current.handleDeleteFrames();
    expect(window.confirm).not.toHaveBeenCalled();
    expect(deleteFrames).not.toHaveBeenCalled();
  });

  it('does nothing when selection is null', () => {
    vi.spyOn(window, 'confirm');
    const { result } = renderWithDefaults({ selection: null });
    result.current.handleDeleteFrames();
    expect(window.confirm).not.toHaveBeenCalled();
    expect(deleteFrames).not.toHaveBeenCalled();
  });

  it('does nothing when user cancels confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { result } = renderWithDefaults();
    result.current.handleDeleteFrames();
    expect(window.confirm).toHaveBeenCalled();
    expect(deleteFrames).not.toHaveBeenCalled();
  });

  it('calls deleteFrames with normalized frame bounds on confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { result } = renderWithDefaults();
    result.current.handleDeleteFrames();
    expect(deleteFrames).toHaveBeenCalledWith(0, 5, 20);
    expect(setSelection).toHaveBeenCalledWith(null);
  });

  it('normalizes reversed selection (startFrame > endFrame)', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { result } = renderWithDefaults({ selection: { startFrame: 30, endFrame: 10 } });
    result.current.handleDeleteFrames();
    expect(deleteFrames).toHaveBeenCalledWith(0, 10, 30);
  });

  it('clamps frames to sample length', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { result } = renderWithDefaults({
      samples: [makeSample(15)],
      selection: { startFrame: 5, endFrame: 50 },
    });
    result.current.handleDeleteFrames();
    expect(deleteFrames).toHaveBeenCalledWith(0, 5, 14);
  });

  it('calls cropFrames on confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { result } = renderWithDefaults();
    result.current.handleCropFrames();
    expect(cropFrames).toHaveBeenCalledWith(0, 5, 20);
    expect(setSelection).toHaveBeenCalledWith(null);
  });

  it('calls fadeInFrames on confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { result } = renderWithDefaults();
    result.current.handleFadeInFrames();
    expect(fadeInFrames).toHaveBeenCalledWith(0, 5, 20);
    expect(setSelection).toHaveBeenCalledWith(null);
  });

  it('calls fadeOutFrames on confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { result } = renderWithDefaults();
    result.current.handleFadeOutFrames();
    expect(fadeOutFrames).toHaveBeenCalledWith(0, 5, 20);
    expect(setSelection).toHaveBeenCalledWith(null);
  });
});
