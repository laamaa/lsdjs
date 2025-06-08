import React from 'react';
import { CustomSlider, CustomCheckbox } from '../../common';
import { Sample } from '../../../services/audio';

interface SampleControlsProps {
  sample: Sample;
  volumeDb: number;
  pitchSemitones: number;
  trim: number;
  dither: boolean;
  maxTrim: number;
  isLoading: boolean;
  disableControls?: boolean; // Optional prop to disable volume, pitch, and trim controls
  onUpdateVolume: (value: number) => void;
  onUpdatePitch: (value: number) => void;
  onUpdateTrim: (value: number) => void;
  onUpdateDither: (value: boolean) => void;
}

/**
 * Component for controlling sample properties (volume, pitch, trim, dither)
 */
export function SampleControls({
  sample,
  volumeDb,
  pitchSemitones,
  trim,
  dither,
  maxTrim,
  isLoading,
  disableControls = false,
  onUpdateVolume,
  onUpdatePitch,
  onUpdateTrim,
  onUpdateDither
}: SampleControlsProps) {
  const canAdjustVolume = sample.canAdjustVolume() && !disableControls;

  return (
    <div className="sample-controls">
      {!disableControls && (
        <>
          <div className="control-group">
            <CustomSlider
              id="volume-control"
              label="Volume:"
              min={-24}
              max={24}
              step={1}
              value={volumeDb}
              onChange={onUpdateVolume}
              disabled={!canAdjustVolume || isLoading}
              valueLabel=" dB"
            />
          </div>

          <div className="control-group">
            <CustomSlider
              id="pitch-control"
              label="Pitch:"
              min={-12}
              max={12}
              step={1}
              value={pitchSemitones}
              onChange={onUpdatePitch}
              disabled={!canAdjustVolume || isLoading}
              valueLabel={" st"}
            />
          </div>

          <div className="control-group">
            <CustomSlider
              id="trim-control"
              label="Trim:"
              min={0}
              max={maxTrim}
              step={1}
              value={trim}
              onChange={onUpdateTrim}
              disabled={!canAdjustVolume || maxTrim === 0 || isLoading}
            />
          </div>


          <div className="control-group">
            <CustomCheckbox
              id="dither-control"
              label="Dither:"
              checked={dither}
              onChange={onUpdateDither}
              disabled={!canAdjustVolume || isLoading}
            />
          </div>
        </>
      )}
    </div>
  );
}
