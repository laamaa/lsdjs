import { useCallback } from 'react';
import { SerializedSample } from '../../../utils/sample-serialization';

interface Selection {
  startFrame: number;
  endFrame: number;
}

interface UseSampleOperationsInput {
  selectedSampleIndex: number | null;
  selection: Selection | null;
  samples: (SerializedSample | null)[];
  deleteFrames: (sampleIndex: number, startFrame: number, endFrame: number) => void;
  cropFrames: (sampleIndex: number, startFrame: number, endFrame: number) => void;
  fadeInFrames: (sampleIndex: number, startFrame: number, endFrame: number) => void;
  fadeOutFrames: (sampleIndex: number, startFrame: number, endFrame: number) => void;
  setSelection: (selection: Selection | null) => void;
}

export function useSampleOperations({
  selectedSampleIndex,
  selection,
  samples,
  deleteFrames,
  cropFrames,
  fadeInFrames,
  fadeOutFrames,
  setSelection,
}: UseSampleOperationsInput) {
  const handleFrameOp = useCallback((
    op: 'deleteFrames' | 'cropFrames' | 'fadeInFrames' | 'fadeOutFrames',
    confirmMsg: string
  ) => {
    if (selectedSampleIndex !== null && selection) {
      if (window.confirm(confirmMsg)) {
        const s = samples[selectedSampleIndex];
        if (s) {
          const len = s.processedSamples.length;
          const startFrame = Math.min(selection.startFrame, len - 1);
          const endFrame = Math.min(selection.endFrame, len - 1);
          const minFrame = Math.min(startFrame, endFrame);
          const maxFrame = Math.max(startFrame, endFrame);

          const ops = { deleteFrames, cropFrames, fadeInFrames, fadeOutFrames };
          ops[op](selectedSampleIndex, minFrame, maxFrame);
          setSelection(null);
        }
      }
    }
  }, [deleteFrames, cropFrames, fadeInFrames, fadeOutFrames, selectedSampleIndex, selection, samples, setSelection]);

  const handleDeleteFrames = useCallback(() => {
    if (!selection) return;
    handleFrameOp('deleteFrames',
      `Are you sure you want to delete frames ${Math.min(selection.startFrame, selection.endFrame)} to ${Math.max(selection.startFrame, selection.endFrame)}?`);
  }, [handleFrameOp, selection]);

  const handleCropFrames = useCallback(() => {
    if (!selection) return;
    handleFrameOp('cropFrames',
      `Are you sure you want to crop to frames ${Math.min(selection.startFrame, selection.endFrame)} to ${Math.max(selection.startFrame, selection.endFrame)}?`);
  }, [handleFrameOp, selection]);

  const handleFadeInFrames = useCallback(() => {
    if (!selection) return;
    handleFrameOp('fadeInFrames',
      `Are you sure you want to apply fade in to frames ${Math.min(selection.startFrame, selection.endFrame)} to ${Math.max(selection.startFrame, selection.endFrame)}?`);
  }, [handleFrameOp, selection]);

  const handleFadeOutFrames = useCallback(() => {
    if (!selection) return;
    handleFrameOp('fadeOutFrames',
      `Are you sure you want to apply fade out to frames ${Math.min(selection.startFrame, selection.endFrame)} to ${Math.max(selection.startFrame, selection.endFrame)}?`);
  }, [handleFrameOp, selection]);

  return { handleDeleteFrames, handleCropFrames, handleFadeInFrames, handleFadeOutFrames };
}
