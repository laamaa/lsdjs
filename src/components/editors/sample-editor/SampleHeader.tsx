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
    <div className="control-group">
      <label htmlFor="sample-name-control">Name:</label>
      <input
        id="sample-name-control"
        type="text"
        value={sampleName}
        onChange={(e) => onUpdateName(e.target.value)}
        maxLength={3}
        disabled={isLoading}
        aria-label="Sample name"
        style={{ 
          textTransform: 'uppercase', 
          width: '60px',
          height: '60px',
          marginLeft: '8px',
          padding: '4px 8px',
          border: '1px solid #ccc',
        }}
      />
    </div>
  );
}
