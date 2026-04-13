import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useKitState, useKitActions } from '../../context/KitContext';
import { SerializedSample, sampleToSerialized } from '../../utils/sample-serialization';
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
  samples: (SerializedSample | null)[];
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

  // Local state for editable fields
  const [volumeDb, setVolumeDb] = useState(0);
  const [pitchSemitones, setPitchSemitones] = useState(0);
  const [trim, setTrim] = useState(0);
  const [dither, setDither] = useState(false);
  const [maxTrim, setMaxTrim] = useState(0);
  const [sampleData, setSampleData] = useState<Uint8Array | null>(null);
  const [sampleDuration, setSampleDuration] = useState(0);
  const [selection, setSelection] = useState<{ startFrame: number; endFrame: number } | null>(null);
  const [sampleName, setSampleName] = useState("");

  const [isApplyingPitchShift, setIsApplyingPitchShift] = useState(false);
  const currentPitchRef = React.useRef(0);
  const isUserUpdate = React.useRef(false);

  // Sync local state from serialized sample
  useEffect(() => {
    if (selectedSampleIndex !== null && samples[selectedSampleIndex]) {
      const s = samples[selectedSampleIndex]!;

      // Only sync control values from context when not a user-initiated update
      if (!isUserUpdate.current) {
        setVolumeDb(s.volumeDb);
        if (!isApplyingPitchShift) {
          setPitchSemitones(s.pitchSemitones);
        }
        setTrim(s.trim);
        setDither(s.dither);
        setSampleName(s.name);
      }

      const untrimmedLength = s.untrimmedLength;
      setMaxTrim(Math.max(0, Math.floor(untrimmedLength / 32) - 1));

      const int16Data = new Int16Array(s.processedSamples);
      setSampleData(convertSampleDataForWaveform(int16Data));
      setSampleDuration(calculateSampleDuration(int16Data.length, isHalfSpeed));
    } else {
      setVolumeDb(0);
      setPitchSemitones(0);
      setTrim(0);
      setDither(false);
      setMaxTrim(0);
      setSampleData(null);
      setSampleDuration(0);
      setSampleName("");
    }
  }, [selectedSampleIndex, samples, isHalfSpeed, isApplyingPitchShift]);

  const handlePlaySample = useCallback((index: number) => {
    kitPlaySample(index);
  }, [kitPlaySample]);

  const handleUpdateSampleVolume = useCallback((value: number) => {
    if (selectedSampleIndex !== null) {
      isUserUpdate.current = true;
      setVolumeDb(value);
      updateSampleVolume(selectedSampleIndex, value);
      setTimeout(() => { isUserUpdate.current = false; }, 50);
    }
  }, [updateSampleVolume, selectedSampleIndex]);

  const handleUpdateSamplePitch = useCallback(async (value: number) => {
    if (selectedSampleIndex !== null) {
      isUserUpdate.current = true;
      setPitchSemitones(value);
      currentPitchRef.current = value;
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

          // Write back the pitch-shifted sample to context state
          replaceSample(selectedSampleIndex, sampleToSerialized(instance));

          setPitchSemitones(currentPitchRef.current);

          setTimeout(() => {
            setIsApplyingPitchShift(false);
            isUserUpdate.current = false;
          }, 100);
        } catch (error) {
          console.error('Error applying pitch change:', error);
          setIsApplyingPitchShift(false);
          isUserUpdate.current = false;
        }
      }
    }
  }, [updateSamplePitch, replaceSample, getSampleInstance, selectedSampleIndex, isHalfSpeed]);

  const handleUpdateSampleTrim = useCallback((value: number) => {
    if (selectedSampleIndex !== null) {
      isUserUpdate.current = true;
      setTrim(value);
      updateSampleTrim(selectedSampleIndex, value);
      setTimeout(() => { isUserUpdate.current = false; }, 50);
    }
  }, [updateSampleTrim, selectedSampleIndex]);

  const handleUpdateSampleDither = useCallback((value: boolean) => {
    if (selectedSampleIndex !== null) {
      isUserUpdate.current = true;
      setDither(value);
      updateSampleDither(selectedSampleIndex, value);
      setTimeout(() => { isUserUpdate.current = false; }, 50);
    }
  }, [updateSampleDither, selectedSampleIndex]);

  const handleUpdateSampleName = useCallback((value: string) => {
    if (selectedSampleIndex !== null) {
      isUserUpdate.current = true;
      const sanitizedName = sanitizeLSDJInput(value).substring(0, 3);
      setSampleName(sanitizedName);
      updateSampleName(selectedSampleIndex, sanitizedName);
      setTimeout(() => { isUserUpdate.current = false; }, 50);
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

  const sampleInstance = useMemo(
    () => (selectedSampleIndex !== null && samples[selectedSampleIndex])
      ? getSampleInstance(selectedSampleIndex)
      : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedSampleIndex, samples]
  );

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

  return (
    <div className="sample-editor" role="region" aria-label="Sample editor">
      <SampleHeader
        sampleName={sampleName}
        isLoading={isLoading}
        onUpdateName={handleUpdateSampleName}
      />

      <SampleControls
        sample={sampleInstance!}
        volumeDb={volumeDb}
        pitchSemitones={pitchSemitones}
        trim={trim}
        dither={dither}
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
          onPlaySample={handlePlaySample}
          onRevertSample={handleRevertSample}
        />
      </div>
    </div>
  );
}
