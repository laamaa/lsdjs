/**
 * AudioService.ts
 * 
 * Provides utilities for audio playback in the LSDPatcher web application.
 * This service uses the Web Audio API to handle audio operations in the browser.
 */

/**
 * Interface for audio playback options
 */
export interface AudioPlaybackOptions {
  /**
   * The volume of the audio (0.0 to 1.0)
   * Default is 1.0 (full volume)
   */
  volume?: number;

  /**
   * Whether to loop the audio
   * Default is false
   */
  loop?: boolean;
}

/**
 * Service for audio playback
 */
export const AudioService = {
  /**
   * The audio context instance
   * Created lazily when needed to avoid autoplay restrictions
   */
  _audioContext: null as AudioContext | null,

  /**
   * Get the audio context, creating it if necessary
   * 
   * @returns The audio context
   */
  getAudioContext(): AudioContext {
    if (!this._audioContext) {
      this._audioContext = new AudioContext();
    }
    return this._audioContext;
  },

  /**
   * Check if the Web Audio API is supported in the current browser
   * 
   * @returns True if Web Audio API is supported, false otherwise
   */
  isSupported(): boolean {
    return typeof AudioContext !== 'undefined';
  },

  /**
   * Play a simple test tone
   * 
   * @param frequency - The frequency of the tone in Hz (default: 440Hz, A4 note)
   * @param duration - The duration of the tone in seconds (default: 1 second)
   * @param options - Options for audio playback
   * @returns A promise that resolves when the tone has finished playing
   */
  async playTestTone(
    frequency: number = 440,
    duration: number = 1,
    options: AudioPlaybackOptions = {}
  ): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Web Audio API is not supported in this browser');
    }

    const { volume = 1.0, loop = false } = options;

    try {
      const audioContext = this.getAudioContext();

      // Resume the audio context if it's suspended (autoplay policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Create an oscillator (tone generator)
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'sine'; // Sine wave - smooth tone
      oscillator.frequency.value = frequency; // Set frequency in Hz

      // Create a gain node to control volume
      const gainNode = audioContext.createGain();
      gainNode.gain.value = Math.max(0, Math.min(1, volume)); // Clamp volume between 0 and 1

      // Connect the nodes: oscillator -> gain -> output
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Start the oscillator
      oscillator.start();

      if (!loop) {
        // Stop the oscillator after the specified duration
        return new Promise((resolve) => {
          setTimeout(() => {
            oscillator.stop();
            resolve();
          }, duration * 1000);
        });
      } else {
        // For looping tones, return immediately
        return Promise.resolve();
      }
    } catch (error) {
      console.error('Error playing test tone:', error);
      throw error;
    }
  },

  /**
   * Play audio from an ArrayBuffer
   * 
   * @param audioData - The audio data as an ArrayBuffer
   * @param options - Options for audio playback
   * @param sampleRate - The sample rate of the audio data (default: 44100Hz)
   * @returns A promise that resolves when the audio has finished playing
   */
  async playAudioBuffer(
    audioData: ArrayBuffer,
    options: AudioPlaybackOptions = {},
    sampleRate: number = 44100
  ): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Web Audio API is not supported in this browser');
    }

    const { volume = 1.0, loop = false } = options;

    try {
      const audioContext = this.getAudioContext();

      // Resume the audio context if it's suspended (autoplay policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Create an audio buffer
      // Using the provided sample rate (default: 44100Hz)
      const numChannels = 1;
      const audioBuffer = audioContext.createBuffer(
        numChannels, 
        audioData.byteLength / 2, // 16-bit = 2 bytes per sample
        sampleRate
      );

      // Copy the audio data to the buffer
      const channelData = audioBuffer.getChannelData(0);
      const dataView = new DataView(audioData);
      for (let i = 0; i < channelData.length; i++) {
        // Convert from Int16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
        channelData[i] = dataView.getInt16(i * 2, true) / 32768.0;
      }

      // Create a buffer source node
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = loop;

      // Create a gain node to control volume
      const gainNode = audioContext.createGain();
      gainNode.gain.value = Math.max(0, Math.min(1, volume)); // Clamp volume between 0 and 1

      // Connect the nodes: source -> gain -> output
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Start playback
      source.start();

      if (!loop) {
        // Return a promise that resolves when the audio has finished playing
        return new Promise((resolve) => {
          source.onended = () => resolve();
        });
      } else {
        // For looping audio, return immediately
        return Promise.resolve();
      }
    } catch (error) {
      console.error('Error playing audio buffer:', error);
      throw error;
    }
  },

  /**
   * Stop all audio playback
   */
  stopAll(): void {
    if (this._audioContext) {
      // Close the current audio context to stop all audio
      this._audioContext.close();
      this._audioContext = null;
    }
  }
};
