import React from 'react';

interface SampleHeaderProps {
  sampleName: string;
  isLoading: boolean;
  onUpdateName: (value: string) => void;
}

/**
 * Component for displaying and editing the sample name
 */
export function SampleHeader({
  sampleName,
  isLoading,
  onUpdateName
}: SampleHeaderProps) {
  return (
    <div className="sample-header-group">
      <label htmlFor="sample-name-control">Name:</label>
      <input
        id="sample-name-control"
        type="text"
        className="sample-name-input"
        value={sampleName}
        onChange={(e) => onUpdateName(e.target.value)}
        maxLength={3}
        disabled={isLoading}
        aria-label="Sample name"
      />
    </div>
  );
}
