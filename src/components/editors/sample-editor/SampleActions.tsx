import React from 'react';

interface SampleActionsProps {
  sampleIndex: number;
  isLoading: boolean;
  onRemoveSample: (index: number) => void;
  onPlaySample: (index: number) => void;
}

/**
 * Component for sample actions (remove, play)
 */
export function SampleActions({
  sampleIndex,
  isLoading,
  onRemoveSample,
  onPlaySample
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
    </div>
  );
}