import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useKit } from '../../context/KitContext';
import { SerializedSample, serializedToSample, sampleToSerialized } from '../../utils/sample-serialization';
import { SampleWaveform } from './SampleWaveform';
import { AudioService } from '../../services/audio';
import { SampleControls } from './sample-editor/SampleControls';
import { SampleHeader } from './sample-editor/SampleHeader';
import { SampleActions } from './sample-editor/SampleActions';
import { SampleSelectionTools } from './sample-editor/SampleSelectionTools';
import { SampleRecorder } from './sample-editor/SampleRecorder';
import { convertSampleDataForWaveform, calculateSampleDuration, sanitizeLSDJInput, int16ToArrayBuffer } from '../../utils/sample-utils';
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
  const {
    kitInfo, tempRecordedSample,
    playSample: kitPlaySample,
    updateSampleVolume, updateSamplePitch, updateSampleTrim,
    updateSampleDither, updateSampleName, removeSample: kitRemoveSample,
    revertSample: kitRevertSample, replaceSample,
    deleteFrames, cropFrames, fadeInFrames, fadeOutFrames,
    saveTempSampleToKit, clearTempRecordedSample, updateTempRecordedSample,
    getSampleInstance,
  } = useKit();

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

  // Frame operations helper
  const handleFrameOp = useCallback((
    op: 'deleteFrames' | 'cropFrames' | 'fadeInFrames' | 'fadeOutFrames',
    confirmMsg: string
  ) => {
    if (selectedSampleIndex !== null && selection) {
      if (window.confirm(confirmMsg)) {
        const s = samples[selectedSampleIndex];
        if (s) {
          const len = s.processedSamples.length;
          const startFrame = Math.min(selection.startFrame, len - 1);
          const endFrame = Math.min(selection.endFrame, len - 1);
          const minFrame = Math.min(startFrame, endFrame);
          const maxFrame = Math.max(startFrame, endFrame);

          const ops = { deleteFrames, cropFrames, fadeInFrames, fadeOutFrames };
          ops[op](selectedSampleIndex, minFrame, maxFrame);
          setSelection(null);
        }
      }
    }
  }, [deleteFrames, cropFrames, fadeInFrames, fadeOutFrames, selectedSampleIndex, selection, samples]);

  const handleDeleteFrames = useCallback(() => {
    if (!selection) return;
    handleFrameOp('deleteFrames',
      `Are you sure you want to delete frames ${Math.min(selection.startFrame, selection.endFrame)} to ${Math.max(selection.startFrame, selection.endFrame)}?`);
  }, [handleFrameOp, selection]);

  const handleCropFrames = useCallback(() => {
    if (!selection) return;
    handleFrameOp('cropFrames',
      `Are you sure you want to crop to frames ${Math.min(selection.startFrame, selection.endFrame)} to ${Math.max(selection.startFrame, selection.endFrame)}?`);
  }, [handleFrameOp, selection]);

  const handleFadeInFrames = useCallback(() => {
    if (!selection) return;
    handleFrameOp('fadeInFrames',
      `Are you sure you want to apply fade in to frames ${Math.min(selection.startFrame, selection.endFrame)} to ${Math.max(selection.startFrame, selection.endFrame)}?`);
  }, [handleFrameOp, selection]);

  const handleFadeOutFrames = useCallback(() => {
    if (!selection) return;
    handleFrameOp('fadeOutFrames',
      `Are you sure you want to apply fade out to frames ${Math.min(selection.startFrame, selection.endFrame)} to ${Math.max(selection.startFrame, selection.endFrame)}?`);
  }, [handleFrameOp, selection]);

  // Memoize Sample instances to avoid reconstructing on every render
  const tempSample = useMemo(
    () => tempRecordedSample ? serializedToSample(tempRecordedSample) : null,
    [tempRecordedSample]
  );

  const sampleInstance = useMemo(
    () => (selectedSampleIndex !== null && samples[selectedSampleIndex])
      ? getSampleInstance(selectedSampleIndex)
      : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedSampleIndex, samples]
  );

  const handleSaveToKit = useCallback(() => {
    saveTempSampleToKit();
  }, [saveTempSampleToKit]);

  const handleDiscard = useCallback(() => {
    clearTempRecordedSample();
  }, [clearTempRecordedSample]);

  const handlePreviewSample = useCallback(async () => {
    if (!tempSample) return;
    try {
      AudioService.stopAll();
      const data = tempSample.workSampleData();
      const sampleRate = isHalfSpeed ? 5734 : 11468;
      await AudioService.playAudioBuffer(int16ToArrayBuffer(data), {}, sampleRate);
    } catch (error) {
      console.error('Error playing sample:', error);
    }
  }, [tempSample, isHalfSpeed]);

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
            updateTempRecordedSample(sampleToSerialized(tempSample));
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
          disableControls={true}
          onUpdateVolume={(value) => {
            tempSample.setVolumeDb(value);
            tempSample.processSamples();
            updateTempRecordedSample(sampleToSerialized(tempSample));
          }}
          onUpdatePitch={(value) => {
            tempSample.setPitchSemitones(value);
            tempSample.applyPitchShift(isHalfSpeed);
            updateTempRecordedSample(sampleToSerialized(tempSample));
          }}
          onUpdateTrim={(value) => {
            tempSample.setTrim(value);
            tempSample.processSamples();
            updateTempRecordedSample(sampleToSerialized(tempSample));
          }}
          onUpdateDither={(value) => {
            tempSample.setDither(value);
            tempSample.processSamples();
            updateTempRecordedSample(sampleToSerialized(tempSample));
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
                updateTempRecordedSample(sampleToSerialized(tempSample));
              }
            }}
            onCropFrames={() => {
              if (selection) {
                tempSample.cropFrames(
                  Math.min(selection.startFrame, selection.endFrame),
                  Math.max(selection.startFrame, selection.endFrame)
                );
                setSelection(null);
                updateTempRecordedSample(sampleToSerialized(tempSample));
              }
            }}
            onFadeInFrames={() => {
              if (selection) {
                tempSample.fadeInFrames(
                  Math.min(selection.startFrame, selection.endFrame),
                  Math.max(selection.startFrame, selection.endFrame)
                );
                setSelection(null);
                updateTempRecordedSample(sampleToSerialized(tempSample));
              }
            }}
            onFadeOutFrames={() => {
              if (selection) {
                tempSample.fadeOutFrames(
                  Math.min(selection.startFrame, selection.endFrame),
                  Math.max(selection.startFrame, selection.endFrame)
                );
                setSelection(null);
                updateTempRecordedSample(sampleToSerialized(tempSample));
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
