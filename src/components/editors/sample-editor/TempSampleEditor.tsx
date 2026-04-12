import { useCallback, useMemo, useState } from 'react';
import { useKit } from '../../../context/KitContext';
import { SerializedSample, serializedToSample, sampleToSerialized } from '../../../utils/sample-serialization';
import { SampleWaveform } from '../SampleWaveform';
import { AudioService } from '../../../services/audio';
import { SampleControls } from './SampleControls';
import { SampleHeader } from './SampleHeader';
import { SampleSelectionTools } from './SampleSelectionTools';
import { convertSampleDataForWaveform, calculateSampleDuration, int16ToArrayBuffer } from '../../../utils/sample-utils';

interface TempSampleEditorProps {
  tempRecordedSample: SerializedSample;
  isHalfSpeed: boolean;
  isLoading: boolean;
}

export function TempSampleEditor({
  tempRecordedSample,
  isHalfSpeed,
  isLoading,
}: TempSampleEditorProps) {
  const {
    kitInfo,
    updateTempRecordedSample,
    saveTempSampleToKit,
    clearTempRecordedSample,
  } = useKit();

  const [selection, setSelection] = useState<{ startFrame: number; endFrame: number } | null>(null);

  const tempSample = useMemo(
    () => serializedToSample(tempRecordedSample),
    [tempRecordedSample]
  );

  const tempSampleSize = tempSample.lengthInBytes();
  const isSampleTooLarge = kitInfo ? tempSampleSize > kitInfo.bytesFree : false;

  const applyFrameOp = useCallback((method: 'deleteFrames' | 'cropFrames' | 'fadeInFrames' | 'fadeOutFrames') => {
    if (!selection) return;
    tempSample[method](
      Math.min(selection.startFrame, selection.endFrame),
      Math.max(selection.startFrame, selection.endFrame)
    );
    setSelection(null);
    updateTempRecordedSample(sampleToSerialized(tempSample));
  }, [selection, tempSample, updateTempRecordedSample]);

  const handlePreviewSample = useCallback(async () => {
    try {
      AudioService.stopAll();
      const data = tempSample.workSampleData();
      const sampleRate = isHalfSpeed ? 5734 : 11468;
      await AudioService.playAudioBuffer(int16ToArrayBuffer(data), {}, sampleRate);
    } catch (error) {
      console.error('Error playing sample:', error);
    }
  }, [tempSample, isHalfSpeed]);

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
          onDeleteFrames={() => applyFrameOp('deleteFrames')}
          onCropFrames={() => applyFrameOp('cropFrames')}
          onFadeInFrames={() => applyFrameOp('fadeInFrames')}
          onFadeOutFrames={() => applyFrameOp('fadeOutFrames')}
        />
      </div>

      <div className="sample-editor-actions">
        <div className="temp-sample-actions">
          <button
            onClick={clearTempRecordedSample}
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
            onClick={saveTempSampleToKit}
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
