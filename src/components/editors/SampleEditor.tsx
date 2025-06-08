import React, { useCallback, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
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
  fadeInFrames,
  fadeOutFrames,
  selectSample,
  revertSample,
  saveTempSampleToKit,
  clearTempRecordedSample,
  updateTempRecordedSample
} from '../../store';
import { serializableToSample, sampleToSerializable } from '../../store/slices/kitSlice';
import { SampleWaveform } from './SampleWaveform';
import { Sample, AudioService } from '../../services/audio';
import { SampleControls } from './sample-editor/SampleControls';
import { SampleHeader } from './sample-editor/SampleHeader';
import { SampleActions } from './sample-editor/SampleActions';
import { SampleSelectionTools } from './sample-editor/SampleSelectionTools';
import { SampleRecorder } from './sample-editor/SampleRecorder';
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
  const { tempRecordedSample, kitInfo } = useAppSelector(state => state.kit);

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

  // Handler for reverting a sample to its original state
  const handleRevertSample = useCallback(async (index: number) => {
    if (window.confirm(`Are you sure you want to revert all edits for sample ${index}?`)) {
      dispatch(revertSample(index));

      // If the sample has a file, we need to reload it
      const sample = samples[index];
      if (sample && sample.getFile()) {
        await sample.reload(isHalfSpeed);
        dispatch(selectSample(index));
      }
    }
  }, [dispatch, samples, isHalfSpeed]);

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

  const handleFadeInFrames = useCallback(async () => {
    if (selectedSampleIndex !== null && selection) {
      if (window.confirm(`Are you sure you want to apply fade in to frames ${Math.min(selection.startFrame, selection.endFrame)} to ${Math.max(selection.startFrame, selection.endFrame)}?`)) {
        const sample = samples[selectedSampleIndex];
        if (sample) {
          const originalSamples = sample.workSampleData();

          const startFrame = Math.min(selection.startFrame, originalSamples.length - 1);
          const endFrame = Math.min(selection.endFrame, originalSamples.length - 1);

          const minFrame = Math.min(startFrame, endFrame);
          const maxFrame = Math.max(startFrame, endFrame);

          dispatch(fadeInFrames({
            sampleIndex: selectedSampleIndex,
            startFrame: minFrame,
            endFrame: maxFrame
          }));

          const updatedSample = samples[selectedSampleIndex];
          if (updatedSample && updatedSample.getFile()) {
            await updatedSample.reload(isHalfSpeed);
            dispatch(selectSample(selectedSampleIndex));
          }

          setSelection(null); // Clear selection after applying fade in
        }
      }
    }
  }, [dispatch, selectedSampleIndex, selection, samples, isHalfSpeed]);

  const handleFadeOutFrames = useCallback(async () => {
    if (selectedSampleIndex !== null && selection) {
      if (window.confirm(`Are you sure you want to apply fade out to frames ${Math.min(selection.startFrame, selection.endFrame)} to ${Math.max(selection.startFrame, selection.endFrame)}?`)) {
        const sample = samples[selectedSampleIndex];
        if (sample) {
          const originalSamples = sample.workSampleData();

          const startFrame = Math.min(selection.startFrame, originalSamples.length - 1);
          const endFrame = Math.min(selection.endFrame, originalSamples.length - 1);

          const minFrame = Math.min(startFrame, endFrame);
          const maxFrame = Math.max(startFrame, endFrame);

          dispatch(fadeOutFrames({
            sampleIndex: selectedSampleIndex,
            startFrame: minFrame,
            endFrame: maxFrame
          }));

          const updatedSample = samples[selectedSampleIndex];
          if (updatedSample && updatedSample.getFile()) {
            await updatedSample.reload(isHalfSpeed);
            dispatch(selectSample(selectedSampleIndex));
          }

          setSelection(null); // Clear selection after applying fade out
        }
      }
    }
  }, [dispatch, selectedSampleIndex, selection, samples, isHalfSpeed]);

  // Convert the serializable sample to a Sample object if it exists
  const tempSample = tempRecordedSample ? serializableToSample(tempRecordedSample) : null;

  // tempSample is used directly, no need to create an array

  // Create handlers for the temporary sample
  const handleSaveToKit = useCallback(() => {
    dispatch(saveTempSampleToKit());
  }, [dispatch]);

  const handleDiscard = useCallback(() => {
    dispatch(clearTempRecordedSample());
  }, [dispatch]);

  // Handler for previewing the temporary sample
  const handlePreviewSample = useCallback(async () => {
    if (!tempSample) return;

    try {
      // Stop any currently playing audio
      AudioService.stopAll();

      // Get the sample data
      const sampleData = tempSample.workSampleData();

      // Convert the Int16Array to an ArrayBuffer
      const buffer = new ArrayBuffer(sampleData.length * 2);
      const view = new DataView(buffer);
      for (let i = 0; i < sampleData.length; i++) {
        view.setInt16(i * 2, sampleData[i], true);
      }

      // Determine the sample rate based on half-speed mode
      const sampleRate = isHalfSpeed ? 5734 : 11468;

      // Play the sample
      await AudioService.playAudioBuffer(buffer, {}, sampleRate);
    } catch (error) {
      console.error('Error playing sample:', error);
    }
  }, [tempSample, isHalfSpeed]);

  // Calculate if the sample will fit in the kit
  const tempSampleSize = tempSample ? tempSample.lengthInBytes() : 0;
  const isSampleTooLarge = kitInfo && tempSample ? tempSampleSize > kitInfo.bytesFree : false;

  // If there's a temporary recorded sample, show the temp sample editor
  if (tempRecordedSample && tempSample) {

    return (
      <div className="sample-editor" role="region" aria-label="Sample editor">
        <div className="sample-editor-header">
          <h3>Edit Recorded Sample</h3>
          <p className="sample-editor-instructions">
            Edit your recording to fit the kit requirements, then save it to the kit.
          </p>
        </div>

        <SampleHeader
          sampleName={tempSample.getName()}
          isLoading={isLoading}
          onUpdateName={(name) => {
            tempSample.setName(name);
            // Convert to serializable format and update in the Redux store
            dispatch(updateTempRecordedSample(sampleToSerializable(tempSample)));
          }}
        />

        <SampleControls
          sample={tempSample}
          volumeDb={tempSample.getVolumeDb()}
          pitchSemitones={tempSample.getPitchSemitones()}
          trim={tempSample.getTrim()}
          dither={tempSample.getDither()}
          maxTrim={Math.max(0, Math.floor(tempSample.untrimmedLengthInSamples() / 32) - 1)}
          isLoading={isLoading}
          disableControls={true} // Disable volume, pitch, and trim controls for newly recorded samples
          onUpdateVolume={(value) => {
            tempSample.setVolumeDb(value);
            tempSample.processSamples();
            // Convert to serializable format and update in the Redux store
            dispatch(updateTempRecordedSample(sampleToSerializable(tempSample)));
          }}
          onUpdatePitch={(value) => {
            tempSample.setPitchSemitones(value);
            tempSample.applyPitchShift(isHalfSpeed);
            // Convert to serializable format and update in the Redux store
            dispatch(updateTempRecordedSample(sampleToSerializable(tempSample)));
          }}
          onUpdateTrim={(value) => {
            tempSample.setTrim(value);
            tempSample.processSamples();
            // Convert to serializable format and update in the Redux store
            dispatch(updateTempRecordedSample(sampleToSerializable(tempSample)));
          }}
          onUpdateDither={(value) => {
            tempSample.setDither(value);
            tempSample.processSamples();
            // Convert to serializable format and update in the Redux store
            dispatch(updateTempRecordedSample(sampleToSerializable(tempSample)));
          }}
        />

        <div className="sample-waveform-selection">
          <SampleWaveform
            data={convertSampleDataForWaveform(tempSample.workSampleData())}
            duration={calculateSampleDuration(tempSample.lengthInSamples(), isHalfSpeed)}
            height={128}
            onSelection={setSelection}
            selection={selection}
          />

          <SampleSelectionTools
            selection={selection}
            onDeleteFrames={() => {
              if (selection) {
                tempSample.deleteFrames(
                  Math.min(selection.startFrame, selection.endFrame),
                  Math.max(selection.startFrame, selection.endFrame)
                );
                setSelection(null);
                // Convert to serializable format and update in the Redux store
                dispatch(updateTempRecordedSample(sampleToSerializable(tempSample)));
              }
            }}
            onCropFrames={() => {
              if (selection) {
                tempSample.cropFrames(
                  Math.min(selection.startFrame, selection.endFrame),
                  Math.max(selection.startFrame, selection.endFrame)
                );
                setSelection(null);
                // Convert to serializable format and update in the Redux store
                dispatch(updateTempRecordedSample(sampleToSerializable(tempSample)));
              }
            }}
            onFadeInFrames={() => {
              if (selection) {
                tempSample.fadeInFrames(
                  Math.min(selection.startFrame, selection.endFrame),
                  Math.max(selection.startFrame, selection.endFrame)
                );
                setSelection(null);
                // Convert to serializable format and update in the Redux store
                dispatch(updateTempRecordedSample(sampleToSerializable(tempSample)));
              }
            }}
            onFadeOutFrames={() => {
              if (selection) {
                tempSample.fadeOutFrames(
                  Math.min(selection.startFrame, selection.endFrame),
                  Math.max(selection.startFrame, selection.endFrame)
                );
                setSelection(null);
                // Convert to serializable format and update in the Redux store
                dispatch(updateTempRecordedSample(sampleToSerializable(tempSample)));
              }
            }}
          />
        </div>

        <div className="sample-editor-actions">
          <div className="temp-sample-actions">
            <button
              onClick={handleDiscard}
              className="discard-button"
              disabled={isLoading}
              aria-label="Discard recorded sample"
            >
              Discard
            </button>
            <button
              onClick={handlePreviewSample}
              className="preview-button"
              disabled={isLoading}
              aria-label="Preview recorded sample"
            >
              Preview
            </button>
            <button
              onClick={handleSaveToKit}
              className="save-button"
              disabled={isLoading || isSampleTooLarge}
              aria-label="Save sample to kit"
              title={isSampleTooLarge ? "Sample is too large for the available space in the kit" : "Save this sample to the kit"}
            >
              Save to Kit
            </button>
          </div>
          {kitInfo && (
            <div className="sample-size-info">
              <p>
                {tempSampleSize}/{kitInfo.bytesFree} bytes
                {isSampleTooLarge && (
                  <span className="sample-size-warning">
                    {" "}(need to trim {tempSampleSize - kitInfo.bytesFree} bytes)
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If no sample index is selected at all, don't render anything
  if (selectedSampleIndex === null) {
    return null;
  }

  // If an empty slot is selected, only show the recorder
  if (!samples[selectedSampleIndex]) {
    return (
      <div className="sample-editor" role="region" aria-label="Sample editor">
        <div className="sample-editor-empty">
          <SampleRecorder isLoading={isLoading} />
        </div>
      </div>
    );
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
