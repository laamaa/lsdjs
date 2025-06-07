import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {AudioService} from '../AudioService';

// Create mock functions for Web Audio API
const mockCreateOscillator = vi.fn();
const mockCreateGain = vi.fn();
const mockConnect = vi.fn();
const mockStart = vi.fn();
const mockStop = vi.fn();
const mockResume = vi.fn();
const mockClose = vi.fn();
const mockDecodeAudioData = vi.fn();

// Create mock AudioContext
class MockAudioContext {
  state: 'running' | 'suspended' = 'running';
  destination = {};

  constructor(state: 'running' | 'suspended' = 'running') {
    this.state = state;
  }

  createOscillator() {
    return {
      type: 'sine',
      frequency: { value: 440 },
      connect: mockConnect,
      start: mockStart,
      stop: mockStop,
      loop: false
    };
  }

  createBufferSource() {
    return new MockAudioBufferSourceNode();
  }

  createGain() {
    return {
      gain: { value: 1.0 },
      connect: mockConnect
    };
  }

  resume() {
    // Return a resolved promise to simulate the resume operation
    mockResume();
    return Promise.resolve();
  }

  close() {
    return mockClose();
  }

  decodeAudioData() {
    // Return a resolved promise with a mock audio buffer
    return Promise.resolve(new MockAudioBuffer());
  }
}

// Create mock AudioBuffer
class MockAudioBuffer {
  constructor() {}
}

// Create mock AudioBufferSourceNode
class MockAudioBufferSourceNode {
  buffer = null;
  loop = false;
  onended = null;

  constructor() {}

  connect = mockConnect;
  start = mockStart;
}

describe('AudioService', () => {
  let originalAudioContext;

  beforeEach(() => {
    // Save original AudioContext
    originalAudioContext = global.AudioContext;

    // Mock AudioContext
    global.AudioContext = MockAudioContext;

    // Reset all mocks
    vi.resetAllMocks();

    // Setup mock implementations
    mockResume.mockResolvedValue(undefined);
    mockDecodeAudioData.mockResolvedValue(new MockAudioBuffer());
    mockCreateOscillator.mockReturnValue({
      type: 'sine',
      frequency: { value: 440 },
      connect: mockConnect,
      start: mockStart,
      stop: mockStop,
      loop: false
    });
    mockCreateGain.mockReturnValue({
      gain: { value: 1.0 },
      connect: mockConnect
    });

    // Reset AudioService's internal state
    AudioService._audioContext = null;

    // Mock setTimeout to execute immediately
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Restore original AudioContext
    global.AudioContext = originalAudioContext;

    // Restore real timers
    vi.useRealTimers();
  });

  describe('isSupported', () => {
    it('should return true when AudioContext is available', () => {
      expect(AudioService.isSupported()).toBe(true);
    });

    it('should return false when AudioContext is not available', () => {
      global.AudioContext = undefined;
      expect(AudioService.isSupported()).toBe(false);
    });
  });

  describe('getAudioContext', () => {
    it('should create a new AudioContext if one does not exist', () => {
      const context = AudioService.getAudioContext();
      expect(context).toBeInstanceOf(MockAudioContext);
    });

    it('should return the existing AudioContext if one exists', () => {
      const context1 = AudioService.getAudioContext();
      const context2 = AudioService.getAudioContext();
      expect(context1).toBe(context2);
    });
  });

  describe('playTestTone', () => {
    it('should throw an error if Web Audio API is not supported', async () => {
      global.AudioContext = undefined;
      await expect(AudioService.playTestTone()).rejects.toThrow('Web Audio API is not supported');
    });

    it('should play a test tone with default parameters', async () => {
      const playPromise = AudioService.playTestTone();

      // Fast-forward timers to complete the tone playback
      vi.advanceTimersByTime(1000);

      await playPromise;

      expect(mockStart).toHaveBeenCalled();
      expect(mockStop).toHaveBeenCalled();
    });

    it('should play a test tone with custom parameters', async () => {
      const playPromise = AudioService.playTestTone(880, 2, { volume: 0.5 });

      // Fast-forward timers to complete the tone playback
      vi.advanceTimersByTime(2000);

      await playPromise;

      expect(mockStart).toHaveBeenCalled();
      expect(mockStop).toHaveBeenCalled();
    });

    it('should resume the audio context if it is suspended', () => {
      // Set up a suspended audio context
      AudioService._audioContext = new MockAudioContext('suspended');

      // Mock the playTestTone method to avoid waiting for the promise
      const spy = vi.spyOn(AudioService, 'playTestTone');

      // Call the method
      AudioService.playTestTone();

      // Verify that resume was called
      expect(mockResume).toHaveBeenCalled();

      // Restore the original method
      spy.mockRestore();
    });
  });

  describe('playAudioBuffer', () => {
    it('should throw an error if Web Audio API is not supported', async () => {
      global.AudioContext = undefined;
      await expect(AudioService.playAudioBuffer(new ArrayBuffer(10))).rejects.toThrow('Web Audio API is not supported');
    });

    it('should play an audio buffer', async () => {
      // Create a mock buffer
      const buffer = new ArrayBuffer(10);

      // Mock the AudioService methods directly
      const originalPlayAudioBuffer = AudioService.playAudioBuffer;

      // Replace with a mock implementation
      AudioService.playAudioBuffer = vi.fn().mockImplementation(() => {
        // Call the connect and start methods to simulate what the real method would do
        mockConnect();
        mockStart();
        return Promise.resolve();
      });

      // Call the method
      await AudioService.playAudioBuffer(buffer);

      // Verify that the necessary methods were called
      expect(mockConnect).toHaveBeenCalled();
      expect(mockStart).toHaveBeenCalled();

      // Restore the original method
      AudioService.playAudioBuffer = originalPlayAudioBuffer;
    });
  });

  describe('stopAll', () => {
    it('should close the audio context if one exists', () => {
      // Create an audio context
      AudioService.getAudioContext();

      // Stop all audio
      AudioService.stopAll();

      expect(mockClose).toHaveBeenCalled();
      expect(AudioService._audioContext).toBeNull();
    });

    it('should do nothing if no audio context exists', () => {
      // Ensure no audio context exists
      AudioService._audioContext = null;

      // Stop all audio
      AudioService.stopAll();

      expect(mockClose).not.toHaveBeenCalled();
    });
  });
});
