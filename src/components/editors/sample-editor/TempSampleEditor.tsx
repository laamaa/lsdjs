import { useCallback, useMemo, useState } from 'react';
import { useKitState, useKitActions } from '../../../context/KitContext';
import { Sample } from '../../../services/audio';
import { SampleWaveform } from '../SampleWaveform';
import { AudioService } from '../../../services/audio';
import { SampleControls } from './SampleControls';
import { SampleHeader } from './SampleHeader';
import { SampleSelectionTools } from './SampleSelectionTools';
import { convertSampleDataForWaveform, calculateSampleDuration, int16ToArrayBuffer } from '../../../utils/sample-utils';

interface TempSampleEditorProps {
  tempRecordedSample: Sample;
  isHalfSpeed: boolean;
  isLoading: boolean;
}

export function TempSampleEditor({
  tempRecordedSample,
  isHalfSpeed,
  isLoading,
}: TempSampleEditorProps) {
  const { kitInfo } = useKitState();
  const { updateTempRecordedSample, saveTempSampleToKit, clearTempRecordedSample } = useKitActions();

  const [selection, setSelection] = useState<{ startFrame: number; endFrame: number } | null>(null);

  const tempSampleSize = tempRecordedSample.lengthInBytes();
  const isSampleTooLarge = kitInfo ? tempSampleSize > kitInfo.bytesFree : false;

  const updateTemp = useCallback((mutator: (s: Sample) => void) => {
    const cloned = Sample.dupeSample(tempRecordedSample);
    mutator(cloned);
    updateTempRecordedSample(cloned);
  }, [tempRecordedSample, updateTempRecordedSample]);

  const applyFrameOp = useCallback((method: 'deleteFrames' | 'cropFrames' | 'fadeInFrames' | 'fadeOutFrames') => {
    if (!selection) return;
    updateTemp(s => {
      s[method](
        Math.min(selection.startFrame, selection.endFrame),
        Math.max(selection.startFrame, selection.endFrame)
      );
    });
    setSelection(null);
  }, [selection, updateTemp]);

  const handlePreviewSample = useCallback(async () => {
    try {
      AudioService.stopAll();
      const data = tempRecordedSample.workSampleData();
      const sampleRate = isHalfSpeed ? 5734 : 11468;
      await AudioService.playAudioBuffer(int16ToArrayBuffer(data), {}, sampleRate);
    } catch (error) {
      console.error('Error playing sample:', error);
    }
  }, [tempRecordedSample, isHalfSpeed]);

  const waveformData = useMemo(
    () => convertSampleDataForWaveform(tempRecordedSample.workSampleData()),
    [tempRecordedSample]
  );
  const waveformDuration = useMemo(
    () => calculateSampleDuration(tempRecordedSample.lengthInSamples(), isHalfSpeed),
    [tempRecordedSample, isHalfSpeed]
  );

  return (
    <div className="sample-editor" role="region" aria-label="Sample editor">
      <div className="sample-editor-header">
        <h3>Edit Recorded Sample</h3>
        <p className="sample-editor-instructions">
          Edit your recording to fit the kit requirements, then save it to the kit.
        </p>
      </div>

      <SampleHeader
        sampleName={tempRecordedSample.getName()}
        isLoading={isLoading}
        onUpdateName={(name) => updateTemp(s => s.setName(name))}
      />

      <SampleControls
        canAdjustVolume={tempRecordedSample.canAdjustVolume()}
        volumeDb={tempRecordedSample.getVolumeDb()}
        pitchSemitones={tempRecordedSample.getPitchSemitones()}
        trim={tempRecordedSample.getTrim()}
        dither={tempRecordedSample.getDither()}
        maxTrim={Math.max(0, Math.floor(tempRecordedSample.untrimmedLengthInSamples() / 32) - 1)}
        isLoading={isLoading}
        disableControls={true}
        onUpdateVolume={(value) => updateTemp(s => { s.setVolumeDb(value); s.processSamples(); })}
        onUpdatePitch={(value) => updateTemp(s => { s.setPitchSemitones(value); s.applyPitchShift(isHalfSpeed); })}
        onUpdateTrim={(value) => updateTemp(s => { s.setTrim(value); s.processSamples(); })}
        onUpdateDither={(value) => updateTemp(s => { s.setDither(value); s.processSamples(); })}
      />

      <div className="sample-waveform-selection">
        <SampleWaveform
          data={waveformData}
          duration={waveformDuration}
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
