import React, { useCallback, useEffect, useState } from 'react';
import { useAppDispatch } from '../../store';
import { 
  playSample, 
  updateSampleVolume, 
  updateSamplePitch, 
  updateSampleTrim, 
  updateSampleDither, 
  updateSampleName,
  removeSample,
  deleteFrames,
  cropFrames,
  selectSample
} from '../../store';
import { SampleWaveform } from './SampleWaveform';
import { Sample } from '../../services/audio';
import { SampleControls } from './sample-editor/SampleControls';
import { SampleHeader } from './sample-editor/SampleHeader';
import { SampleActions } from './sample-editor/SampleActions';
import { SampleSelectionTools } from './sample-editor/SampleSelectionTools';
import { convertSampleDataForWaveform, calculateSampleDuration, sanitizeLSDJInput } from '../../utils/sample-utils';
import './SampleEditor.css';

interface SampleEditorProps {
  selectedSampleIndex: number | null;
  samples: Sample[];
  isHalfSpeed: boolean;
  isLoading: boolean;
}

export function SampleEditor({ 
  selectedSampleIndex, 
  samples, 
  isHalfSpeed, 
  isLoading 
}: SampleEditorProps) {
  const dispatch = useAppDispatch();

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

  useEffect(() => {
    if (selectedSampleIndex !== null && samples[selectedSampleIndex]) {
      const sample = samples[selectedSampleIndex];
      setVolumeDb(sample.getVolumeDb());

      if (!isApplyingPitchShift) {
        setPitchSemitones(sample.getPitchSemitones());
      }

      setTrim(sample.getTrim());
      setDither(sample.getDither());
      setSampleName(sample.getName());

      const untrimmedLength = sample.untrimmedLengthInSamples();
      const maxTrimValue = Math.max(0, Math.floor(untrimmedLength / 32) - 1);
      setMaxTrim(maxTrimValue);

      const sampleData = sample.workSampleData();
      const packedData = convertSampleDataForWaveform(sampleData);
      setSampleData(packedData);

      const durationInSeconds = calculateSampleDuration(sample.lengthInSamples(), isHalfSpeed);
      setSampleDuration(durationInSeconds);
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

  useEffect(() => {
    if (isUserUpdate.current) {
      return;
    }

    if (selectedSampleIndex !== null && samples[selectedSampleIndex]) {
      const sample = samples[selectedSampleIndex];

      const sampleData = sample.workSampleData();
      const packedData = convertSampleDataForWaveform(sampleData);
      setSampleData(packedData);

      const durationInSeconds = calculateSampleDuration(sample.lengthInSamples(), isHalfSpeed);
      setSampleDuration(durationInSeconds);
    }
  }, [selectedSampleIndex, samples, isHalfSpeed]);

  const handlePlaySample = useCallback((index: number) => {
    dispatch(playSample(index));
  }, [dispatch]);

  const handleUpdateSampleVolume = useCallback((value: number) => {
    if (selectedSampleIndex !== null) {
      isUserUpdate.current = true;
      setVolumeDb(value);
      dispatch(updateSampleVolume({ sampleIndex: selectedSampleIndex, volumeDb: value }));

      setTimeout(() => {
        isUserUpdate.current = false;
      }, 50);
    }
  }, [dispatch, selectedSampleIndex]);

  const handleUpdateSamplePitch = useCallback(async (value: number) => {
    if (selectedSampleIndex !== null) {
      isUserUpdate.current = true;
      setPitchSemitones(value);
      currentPitchRef.current = value;
      dispatch(updateSamplePitch({ sampleIndex: selectedSampleIndex, pitchSemitones: value }));
      setIsApplyingPitchShift(true);

      const sample = samples[selectedSampleIndex];
      if (sample) {
        try {
          if (sample.getFile()) {
            sample.setPitchSemitones(0);
            await sample.reload(isHalfSpeed);
            sample.setPitchSemitones(value);
            await sample.reload(isHalfSpeed);
          } else {
            sample.setPitchSemitones(value);
            sample.applyPitchShift(isHalfSpeed);
          }

          setPitchSemitones(currentPitchRef.current);
          dispatch(selectSample(selectedSampleIndex));

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
  }, [dispatch, selectedSampleIndex, samples, isHalfSpeed, setIsApplyingPitchShift]);

  const handleUpdateSampleTrim = useCallback((value: number) => {
    if (selectedSampleIndex !== null) {
      isUserUpdate.current = true;
      setTrim(value);
      dispatch(updateSampleTrim({ sampleIndex: selectedSampleIndex, trim: value }));

      setTimeout(() => {
        isUserUpdate.current = false;
      }, 50);
    }
  }, [dispatch, selectedSampleIndex]);

  const handleUpdateSampleDither = useCallback((value: boolean) => {
    if (selectedSampleIndex !== null) {
      isUserUpdate.current = true;
      setDither(value);
      dispatch(updateSampleDither({ sampleIndex: selectedSampleIndex, dither: value }));

      setTimeout(() => {
        isUserUpdate.current = false;
      }, 50);
    }
  }, [dispatch, selectedSampleIndex]);

  const handleUpdateSampleName = useCallback((value: string) => {
    if (selectedSampleIndex !== null) {
      isUserUpdate.current = true;

      // Sanitize input for LSDj compatibility and limit to 3 characters
      const sanitizedName = sanitizeLSDJInput(value).substring(0, 3);

      setSampleName(sanitizedName);
      dispatch(updateSampleName({ sampleIndex: selectedSampleIndex, name: sanitizedName }));

      setTimeout(() => {
        isUserUpdate.current = false;
      }, 50);
    }
  }, [dispatch, selectedSampleIndex]);

  // Handler for removing a sample
  const handleRemoveSample = useCallback((index: number) => {
    if (window.confirm(`Are you sure you want to remove sample ${index}?`)) {
      dispatch(removeSample(index));
    }
  }, [dispatch]);

  const handleDeleteFrames = useCallback(async () => {
    if (selectedSampleIndex !== null && selection) {
      if (window.confirm(`Are you sure you want to delete frames ${Math.min(selection.startFrame, selection.endFrame)} to ${Math.max(selection.startFrame, selection.endFrame)}?`)) {
        const sample = samples[selectedSampleIndex];
        if (sample) {
          const originalSamples = sample.workSampleData();

          const startFrame = Math.min(selection.startFrame, originalSamples.length - 1);
          const endFrame = Math.min(selection.endFrame, originalSamples.length - 1);

          const minFrame = Math.min(startFrame, endFrame);
          const maxFrame = Math.max(startFrame, endFrame);

          dispatch(deleteFrames({
            sampleIndex: selectedSampleIndex,
            startFrame: minFrame,
            endFrame: maxFrame
          }));

          const updatedSample = samples[selectedSampleIndex];
          if (updatedSample && updatedSample.getFile()) {
            await updatedSample.reload(isHalfSpeed);
            dispatch(selectSample(selectedSampleIndex));
          }

          setSelection(null); // Clear selection after deleting
        }
      }
    }
  }, [dispatch, selectedSampleIndex, selection, samples, isHalfSpeed]);

  const handleCropFrames = useCallback(async () => {
    if (selectedSampleIndex !== null && selection) {
      if (window.confirm(`Are you sure you want to crop to frames ${Math.min(selection.startFrame, selection.endFrame)} to ${Math.max(selection.startFrame, selection.endFrame)}?`)) {
        const sample = samples[selectedSampleIndex];
        if (sample) {
          const originalSamples = sample.workSampleData();

          const startFrame = Math.min(selection.startFrame, originalSamples.length - 1);
          const endFrame = Math.min(selection.endFrame, originalSamples.length - 1);

          const minFrame = Math.min(startFrame, endFrame);
          const maxFrame = Math.max(startFrame, endFrame);

          dispatch(cropFrames({
            sampleIndex: selectedSampleIndex,
            startFrame: minFrame,
            endFrame: maxFrame
          }));

          const updatedSample = samples[selectedSampleIndex];
          if (updatedSample && updatedSample.getFile()) {
            await updatedSample.reload(isHalfSpeed);
            dispatch(selectSample(selectedSampleIndex));
          }

          setSelection(null); // Clear selection after cropping
        }
      }
    }
  }, [dispatch, selectedSampleIndex, selection, samples, isHalfSpeed]);

  if (selectedSampleIndex === null || !samples[selectedSampleIndex]) {
    return null;
  }

  const sample = samples[selectedSampleIndex];

  return (
    <div className="sample-editor" role="region" aria-label="Sample editor">
      <SampleHeader
        sampleName={sampleName}
        isLoading={isLoading}
        onUpdateName={handleUpdateSampleName}
      />

      <SampleControls
        sample={sample}
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
        />
      </div>

      <SampleActions
        sampleIndex={selectedSampleIndex}
        isLoading={isLoading}
        onRemoveSample={handleRemoveSample}
        onPlaySample={handlePlaySample}
      />
    </div>
  );
}
