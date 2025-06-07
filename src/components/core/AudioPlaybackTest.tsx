import {useState} from 'react';
import {AudioPlaybackOptions, AudioService} from '../../services/audio/AudioService';

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

  // Generate a unique ID for the heading
  const headingId = `audio-test-heading-${Math.random().toString(36).substr(2, 9)}`;

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

      <style>{`
        .audio-test-container {
          padding: 0.75rem;
          max-width: 100%;
          width: 100%;
          box-sizing: border-box;
          position: relative;
        }

        @media (min-width: 768px) {
          .audio-test-container {
            max-width: 600px;
            margin: 0 auto;
          }
        }

        h2 {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 1rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          text-shadow: 2px 2px 0 var(--gb-darkest);
          color: var(--gb-lightest);
        }

        h3 {
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--gb-lightest);
        }

        .control-group {
          margin-bottom: 1.25rem;
          display: flex;
          flex-direction: column;
          background-color: var(--gb-darkest);
          border: 3px solid var(--gb-light);
          padding: 0.75rem;
          position: relative;
        }

        .control-group::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            0deg,
            rgba(155, 188, 15, 0.03),
            rgba(155, 188, 15, 0.03) 1px,
            transparent 1px,
            transparent 2px
          );
          pointer-events: none;
          z-index: 1;
        }

        @media (min-width: 768px) {
          .control-group {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: bold;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--gb-lightest);
          position: relative;
          z-index: 2;
        }

        input[type="range"] {
          -webkit-appearance: none;
          width: 100%;
          height: 20px;
          background-color: var(--gb-dark);
          border: 3px solid var(--gb-light);
          margin: 0.5rem 0;
          position: relative;
          z-index: 2;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          background-color: var(--gb-lightest);
          border: 2px solid var(--gb-dark);
          cursor: pointer;
        }

        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background-color: var(--gb-lightest);
          border: 2px solid var(--gb-dark);
          cursor: pointer;
        }

        .value-display {
          width: 100%;
          text-align: right;
          font-size: 0.7rem;
          color: var(--gb-lightest);
          margin-top: 0.25rem;
          font-family: 'Press Start 2P', cursive;
          position: relative;
          z-index: 2;
        }

        .button-group {
          display: flex;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }

        button {
          padding: 0.75rem;
          border: 4px solid var(--gb-light);
          background-color: var(--gb-dark);
          color: var(--gb-lightest);
          font-family: 'Press Start 2P', cursive;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          cursor: pointer;
          box-shadow: 4px 4px 0 var(--gb-darkest);
          transition: all 0.1s;
        }

        button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 6px 6px 0 var(--gb-darkest);
        }

        button:active:not(:disabled) {
          transform: translateY(2px);
          box-shadow: 2px 2px 0 var(--gb-darkest);
        }

        .play-button {
          background-color: var(--gb-dark);
          color: var(--gb-lightest);
          flex: 1;
        }

        .play-button:hover:not(:disabled) {
          background-color: var(--gb-light);
          color: var(--gb-darkest);
        }

        .stop-button {
          background-color: var(--gb-dark);
          color: var(--gb-lightest);
          border-style: dashed;
          flex: 1;
        }

        .stop-button:hover:not(:disabled) {
          background-color: var(--gb-light);
          color: var(--gb-darkest);
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .preset-buttons {
          margin-top: 1.5rem;
          border-top: 3px solid var(--gb-light);
          padding-top: 1rem;
        }

        .preset-button {
          background-color: var(--gb-darkest);
          color: var(--gb-lightest);
          margin-right: 0.5rem;
          margin-bottom: 0.5rem;
          font-size: 0.6rem;
        }

        .preset-button:hover:not(:disabled) {
          background-color: var(--gb-light);
          color: var(--gb-darkest);
        }

        .error-message {
          padding: 0.75rem;
          background-color: var(--gb-dark);
          color: var(--gb-lightest);
          border: 4px dashed var(--gb-light);
          margin-top: 1.5rem;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
      `}</style>
    </div>
  );
}
