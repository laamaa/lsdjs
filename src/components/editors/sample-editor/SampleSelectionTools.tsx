import React from 'react';

interface SampleSelectionToolsProps {
  selection: { startFrame: number; endFrame: number } | null;
  onDeleteFrames: () => void;
  onCropFrames: () => void;
  onFadeInFrames?: () => void;
  onFadeOutFrames?: () => void;
}

/**
 * Component for tools to manipulate selected frames (delete, crop, fade in, fade out)
 */
export function SampleSelectionTools({
  selection,
  onDeleteFrames,
  onCropFrames,
  onFadeInFrames,
  onFadeOutFrames
}: SampleSelectionToolsProps) {
  if (!selection || selection.startFrame === selection.endFrame) {
    return null;
  }

  const minFrame = Math.min(selection.startFrame, selection.endFrame);
  const maxFrame = Math.max(selection.startFrame, selection.endFrame);

  return (
    <div className="selection-info">
      <p>{minFrame} to {maxFrame}</p>
      <div className="selection-buttons">
        <button 
          onClick={onDeleteFrames}
          aria-label="Delete"
          className="delete-button"
        >
          Delete
        </button>
        <button 
          onClick={onCropFrames}
          aria-label="Crop"
          className="crop-button"
        >
          Crop
        </button>
        {onFadeInFrames && (
          <button 
            onClick={onFadeInFrames}
            aria-label="Fade In"
            className="fade-in-button"
          >
            Fade In
          </button>
        )}
        {onFadeOutFrames && (
          <button 
            onClick={onFadeOutFrames}
            aria-label="Fade Out"
            className="fade-out-button"
          >
            Fade Out
          </button>
        )}
      </div>
    </div>
  );
}
