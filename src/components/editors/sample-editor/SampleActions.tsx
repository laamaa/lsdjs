import React from 'react';

interface SampleActionsProps {
  sampleIndex: number;
  isLoading: boolean;
  onRemoveSample: (index: number) => void;
  onPlaySample: (index: number) => void;
  onRevertSample: (index: number) => void;
}

/**
 * Component for sample actions (remove, play, revert)
 */
export function SampleActions({
  sampleIndex,
  isLoading,
  onRemoveSample,
  onPlaySample,
  onRevertSample
}: SampleActionsProps) {
  return (
    <div className="sample-actions">
      <button
        onClick={() => onRemoveSample(sampleIndex)}
        disabled={isLoading}
        aria-label="Remove sample"
      >
        Remove
      </button>
      <button
        onClick={() => onPlaySample(sampleIndex)}
        disabled={isLoading}
        aria-label="Play sample"
      >
        Play
      </button>
      <button
        onClick={() => onRevertSample(sampleIndex)}
        disabled={isLoading}
        aria-label="Undo all edits"
      >
        Revert
      </button>
    </div>
  );
}
