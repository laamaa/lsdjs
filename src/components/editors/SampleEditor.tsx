import { useCallback, useMemo, useState } from 'react';
import { useKitState, useKitActions } from '../../context/KitContext';
import { Sample } from '../../services/audio';
import { SampleWaveform } from './SampleWaveform';
import { SampleControls } from './sample-editor/SampleControls';
import { SampleHeader } from './sample-editor/SampleHeader';
import { SampleActions } from './sample-editor/SampleActions';
import { SampleSelectionTools } from './sample-editor/SampleSelectionTools';
import { SampleRecorder } from './sample-editor/SampleRecorder';
import { TempSampleEditor } from './sample-editor/TempSampleEditor';
import { useSampleOperations } from './sample-editor/useSampleOperations';
import { convertSampleDataForWaveform, calculateSampleDuration, sanitizeLSDJInput } from '../../utils/sample-utils';
import './SampleEditor.css';

interface SampleEditorProps {
  selectedSampleIndex: number | null;
  samples: (Sample | null)[];
  isHalfSpeed: boolean;
  isLoading: boolean;
}

export function SampleEditor({
  selectedSampleIndex,
  samples,
  isHalfSpeed,
  isLoading
}: SampleEditorProps) {
  const { tempRecordedSample } = useKitState();
  const {
    playSample: kitPlaySample,
    updateSampleVolume, updateSamplePitch, updateSampleTrim,
    updateSampleDither, updateSampleName, removeSample: kitRemoveSample,
    revertSample: kitRevertSample, replaceSample,
    deleteFrames, cropFrames, fadeInFrames, fadeOutFrames,
    getSampleInstance,
  } = useKitActions();

  const [selection, setSelection] = useState<{ startFrame: number; endFrame: number } | null>(null);

  const [isApplyingPitchShift, setIsApplyingPitchShift] = useState(false);
  const [displayPitch, setDisplayPitch] = useState(0);

  // Compute derived values from sample instance
  const { maxTrim, sampleData, sampleDuration } = useMemo(() => {
    if (selectedSampleIndex !== null && samples[selectedSampleIndex]) {
      const s = samples[selectedSampleIndex]!;
      const trim = Math.max(0, Math.floor(s.untrimmedLengthInSamples() / 32) - 1);
      const int16Data = s.workSampleData();
      return {
        maxTrim: trim,
        sampleData: convertSampleDataForWaveform(int16Data),
        sampleDuration: calculateSampleDuration(int16Data.length, isHalfSpeed),
      };
    }
    return { maxTrim: 0, sampleData: null as Uint8Array | null, sampleDuration: 0 };
  }, [selectedSampleIndex, samples, isHalfSpeed]);

  const handleUpdateSampleVolume = useCallback((value: number) => {
    if (selectedSampleIndex !== null) {
      updateSampleVolume(selectedSampleIndex, value);
    }
  }, [updateSampleVolume, selectedSampleIndex]);

  const handleUpdateSamplePitch = useCallback(async (value: number) => {
    if (selectedSampleIndex !== null) {
      setDisplayPitch(value);
      updateSamplePitch(selectedSampleIndex, value);
      setIsApplyingPitchShift(true);

      const instance = getSampleInstance(selectedSampleIndex);
      if (instance) {
        try {
          if (instance.getFile()) {
            instance.setPitchSemitones(0);
            await instance.reload(isHalfSpeed);
            instance.setPitchSemitones(value);
            await instance.reload(isHalfSpeed);
          } else {
            instance.setPitchSemitones(value);
            instance.applyPitchShift(isHalfSpeed);
          }

          replaceSample(selectedSampleIndex, instance);
          setIsApplyingPitchShift(false);
        } catch (error) {
          console.error('Error applying pitch change:', error);
          setIsApplyingPitchShift(false);
        }
      }
    }
  }, [updateSamplePitch, replaceSample, getSampleInstance, selectedSampleIndex, isHalfSpeed]);

  const handleUpdateSampleTrim = useCallback((value: number) => {
    if (selectedSampleIndex !== null) {
      updateSampleTrim(selectedSampleIndex, value);
    }
  }, [updateSampleTrim, selectedSampleIndex]);

  const handleUpdateSampleDither = useCallback((value: boolean) => {
    if (selectedSampleIndex !== null) {
      updateSampleDither(selectedSampleIndex, value);
    }
  }, [updateSampleDither, selectedSampleIndex]);

  const handleUpdateSampleName = useCallback((value: string) => {
    if (selectedSampleIndex !== null) {
      const sanitizedName = sanitizeLSDJInput(value).substring(0, 3);
      updateSampleName(selectedSampleIndex, sanitizedName);
    }
  }, [updateSampleName, selectedSampleIndex]);

  const handleRemoveSample = useCallback((index: number) => {
    if (window.confirm(`Are you sure you want to remove sample ${index}?`)) {
      kitRemoveSample(index);
    }
  }, [kitRemoveSample]);

  const handleRevertSample = useCallback((index: number) => {
    if (window.confirm(`Are you sure you want to revert all edits for sample ${index}?`)) {
      kitRevertSample(index);
    }
  }, [kitRevertSample]);

  const { handleDeleteFrames, handleCropFrames, handleFadeInFrames, handleFadeOutFrames } =
    useSampleOperations({
      selectedSampleIndex,
      selection,
      samples,
      deleteFrames,
      cropFrames,
      fadeInFrames,
      fadeOutFrames,
      setSelection,
    });

  // If there's a temporary recorded sample, show the temp sample editor
  if (tempRecordedSample) {
    return (
      <TempSampleEditor
        tempRecordedSample={tempRecordedSample}
        isHalfSpeed={isHalfSpeed}
        isLoading={isLoading}
      />
    );
  }

  if (selectedSampleIndex === null) {
    return null;
  }

  if (!samples[selectedSampleIndex]) {
    return (
      <div className="sample-editor" role="region" aria-label="Sample editor">
        <div className="sample-editor-empty">
          <SampleRecorder isLoading={isLoading} />
        </div>
      </div>
    );
  }

  const s = samples[selectedSampleIndex]!;

  return (
    <div className="sample-editor" role="region" aria-label="Sample editor">
      <SampleHeader
        sampleName={s.getName()}
        isLoading={isLoading}
        onUpdateName={handleUpdateSampleName}
      />

      <SampleControls
        canAdjustVolume={s.canAdjustVolume()}
        volumeDb={s.getVolumeDb()}
        pitchSemitones={isApplyingPitchShift ? displayPitch : s.getPitchSemitones()}
        trim={s.getTrim()}
        dither={s.getDither()}
        maxTrim={maxTrim}
        isLoading={isLoading}
        onUpdateVolume={handleUpdateSampleVolume}
        onUpdatePitch={handleUpdateSamplePitch}
        onUpdateTrim={handleUpdateSampleTrim}
        onUpdateDither={handleUpdateSampleDither}
      />

      <div className="sample-waveform-selection">
        <SampleWaveform
          data={sampleData}
          duration={sampleDuration}
          height={128}
          onSelection={setSelection}
          selection={selection}
        />

        <SampleSelectionTools
          selection={selection}
          onDeleteFrames={handleDeleteFrames}
          onCropFrames={handleCropFrames}
          onFadeInFrames={handleFadeInFrames}
          onFadeOutFrames={handleFadeOutFrames}
        />
      </div>

      <div className="sample-editor-actions">
        <SampleRecorder
          isLoading={isLoading}
        />
        <SampleActions
          sampleIndex={selectedSampleIndex}
          isLoading={isLoading}
          onRemoveSample={handleRemoveSample}
          onPlaySample={kitPlaySample}
          onRevertSample={handleRevertSample}
        />
      </div>
    </div>
  );
}
