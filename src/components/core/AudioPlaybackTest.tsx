import {useId, useState} from 'react';
import {AudioPlaybackOptions, AudioService} from '../../services/audio/AudioService';
import './AudioPlaybackTest.css';

/**
 * Component for testing audio playback
 * This is a minimal UI to demonstrate the Web Audio API functionality
 */
export function AudioPlaybackTest() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [frequency, setFrequency] = useState(440);
  const [duration, setDuration] = useState(1);
  const [volume, setVolume] = useState(0.5);
  const [error, setError] = useState<string | null>(null);

  /**
   * Play a test tone with the current settings
   */
  async function handlePlayTestTone() {
    setError(null);
    setIsPlaying(true);

    try {
      const options: AudioPlaybackOptions = {
        volume,
        loop: false
      };

      await AudioService.playTestTone(frequency, duration, options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsPlaying(false);
    }
  }

  /**
   * Stop all audio playback
   */
  function handleStopAudio() {
    AudioService.stopAll();
    setIsPlaying(false);
  }

  /**
   * Check if the Web Audio API is supported
   */
  const isAudioSupported = AudioService.isSupported();

  const headingId = useId();

  return (
    <div className="audio-test-container" role="region" aria-labelledby={headingId}>
      <h2 id={headingId}>Audio Playback Test</h2>

      {!isAudioSupported ? (
        <div className="error-message" role="alert">
          Web Audio API is not supported in this browser.
        </div>
      ) : (
        <>
          <div className="control-group" role="group" aria-labelledby="frequency-label">
            <label id="frequency-label" htmlFor="frequency">Frequency (Hz):</label>
            <input
              id="frequency"
              type="range"
              min="20"
              max="2000"
              step="1"
              value={frequency}
              onChange={(e) => setFrequency(Number(e.target.value))}
              disabled={isPlaying}
              aria-valuemin={20}
              aria-valuemax={2000}
              aria-valuenow={frequency}
              aria-valuetext={`${frequency} Hertz`}
            />
            <span className="value-display">{frequency} Hz</span>
          </div>

          <div className="control-group" role="group" aria-labelledby="duration-label">
            <label id="duration-label" htmlFor="duration">Duration (seconds):</label>
            <input
              id="duration"
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={isPlaying}
              aria-valuemin={0.1}
              aria-valuemax={5}
              aria-valuenow={duration}
              aria-valuetext={`${duration} seconds`}
            />
            <span className="value-display">{duration} s</span>
          </div>

          <div className="control-group" role="group" aria-labelledby="volume-label">
            <label id="volume-label" htmlFor="volume">Volume:</label>
            <input
              id="volume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              disabled={isPlaying}
              aria-valuemin={0}
              aria-valuemax={1}
              aria-valuenow={volume}
              aria-valuetext={`${Math.round(volume * 100)}%`}
            />
            <span className="value-display">{Math.round(volume * 100)}%</span>
          </div>

          <div className="button-group" role="group" aria-label="Playback controls">
            <button
              onClick={handlePlayTestTone}
              disabled={isPlaying}
              className="play-button"
              aria-label="Play test tone"
              aria-busy={isPlaying}
            >
              {isPlaying ? 'Playing...' : 'Play Test Tone'}
            </button>

            <button
              onClick={handleStopAudio}
              disabled={!isPlaying}
              className="stop-button"
              aria-label="Stop audio playback"
            >
              Stop Audio
            </button>
          </div>

          <div className="preset-buttons" role="group" aria-labelledby="presets-heading">
            <h3 id="presets-heading">Presets:</h3>
            <button
              onClick={() => {
                setFrequency(261.63); // C4
                setDuration(0.5);
              }}
              disabled={isPlaying}
              className="preset-button"
              aria-label="Set to C4 note, 261.63 Hertz"
            >
              C4 (261.63 Hz)
            </button>
            <button
              onClick={() => {
                setFrequency(329.63); // E4
                setDuration(0.5);
              }}
              disabled={isPlaying}
              className="preset-button"
              aria-label="Set to E4 note, 329.63 Hertz"
            >
              E4 (329.63 Hz)
            </button>
            <button
              onClick={() => {
                setFrequency(392.00); // G4
                setDuration(0.5);
              }}
              disabled={isPlaying}
              className="preset-button"
              aria-label="Set to G4 note, 392 Hertz"
            >
              G4 (392.00 Hz)
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="error-message" role="alert" aria-live="assertive">
          Error: {error}
        </div>
      )}
    </div>
  );
}
