import React from 'react';

interface SampleSelectionToolsProps {
  selection: { startFrame: number; endFrame: number } | null;
  onDeleteFrames: () => void;
  onCropFrames: () => void;
}

/**
 * Component for tools to manipulate selected frames (delete, crop)
 */
export function SampleSelectionTools({
  selection,
  onDeleteFrames,
  onCropFrames
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
      </div>
    </div>
  );
}