import { describe, expect, it } from 'vitest';
import {
  toIntBuffer,
  toInt16Buffer,
  normalize,
  headPos,
  tailPos,
  trimSamples,
  applyDither,
  resample,
  SILENCE_THRESHOLD,
} from '../SampleUtils';

describe('SampleUtils', () => {
  describe('toIntBuffer / toInt16Buffer roundtrip', () => {
    it('should preserve values within Int16 range', () => {
      const input = new Int16Array([0, 100, -100, 32767, -32768]);
      const int32 = toIntBuffer(input);
      const back = toInt16Buffer(int32);
      expect(Array.from(back)).toEqual(Array.from(input));
    });

    it('should convert Int16 to Int32', () => {
      const input = new Int16Array([1, 2, 3]);
      const result = toIntBuffer(input);
      expect(result).toBeInstanceOf(Int32Array);
      expect(result.length).toBe(3);
      expect(result[0]).toBe(1);
    });
  });

  describe('toInt16Buffer clamping', () => {
    it('should clamp values above 32767', () => {
      const input = new Int32Array([50000, 100000]);
      const result = toInt16Buffer(input);
      expect(result[0]).toBe(32767);
      expect(result[1]).toBe(32767);
    });

    it('should clamp values below -32768', () => {
      const input = new Int32Array([-50000, -100000]);
      const result = toInt16Buffer(input);
      expect(result[0]).toBe(-32768);
      expect(result[1]).toBe(-32768);
    });

    it('should pass through values in range', () => {
      const input = new Int32Array([0, 1000, -1000]);
      const result = toInt16Buffer(input);
      expect(Array.from(result)).toEqual([0, 1000, -1000]);
    });
  });

  describe('normalize', () => {
    it('should return early for all-zero input', () => {
      const samples = new Int32Array([0, 0, 0, 0]);
      normalize(samples, 0);
      // All zeros should remain zeros
      expect(Array.from(samples)).toEqual([0, 0, 0, 0]);
    });

    it('should scale positive peak to full range at 0dB', () => {
      const samples = new Int32Array([0, 16384, 0, -8192]);
      normalize(samples, 0);
      // Peak is 16384/32767 ≈ 0.5. Scaling by 1/peak doubles values.
      // 16384 * 1 / (16384/32767) = 32767
      expect(samples[1]).toBe(32767);
    });

    it('should handle negative peak', () => {
      const samples = new Int32Array([0, -32768, 0]);
      normalize(samples, 0);
      // Peak is 32768/32768 = 1.0. Volume adjust = 1.0. Result unchanged.
      expect(samples[1]).toBe(-32768);
    });

    it('should apply volume boost (positive dB)', () => {
      const samples = new Int32Array([0, 32767, 0]);
      normalize(samples, 6); // ~2x boost
      // Peak = 1.0, volumeAdjust = 10^(6/20) ≈ 1.995
      // Result ≈ 32767 * 1.995 / 1.0 ≈ 65370
      expect(samples[1]).toBeGreaterThan(32767);
    });

    it('should apply volume cut (negative dB)', () => {
      const samples = new Int32Array([0, 32767, 0]);
      normalize(samples, -6); // ~0.5x
      // Peak = 1.0, volumeAdjust = 10^(-6/20) ≈ 0.501
      // Result ≈ 32767 * 0.501 / 1.0 ≈ 16416
      expect(samples[1]).toBeGreaterThan(16000);
      expect(samples[1]).toBeLessThan(17000);
    });

    it('should normalize based on maximum absolute value', () => {
      const samples = new Int32Array([100, -200, 50]);
      normalize(samples, 0);
      // Peak is from -200: abs(-200)/32768 ≈ 0.0061
      // All values scaled by 1/peak
      // -200 becomes the peak → scaled to close to -32768
      const maxAbs = Math.max(Math.abs(samples[0]), Math.abs(samples[1]), Math.abs(samples[2]));
      expect(maxAbs).toBeGreaterThan(30000);
    });
  });

  describe('headPos', () => {
    it('should return first non-silent position', () => {
      const buf = new Int32Array([0, 0, SILENCE_THRESHOLD, 100]);
      expect(headPos(buf)).toBe(2);
    });

    it('should return buffer length for all-silent input', () => {
      const buf = new Int32Array([0, 0, 0]);
      expect(headPos(buf)).toBe(3);
    });

    it('should detect negative values', () => {
      const buf = new Int32Array([0, -SILENCE_THRESHOLD, 0]);
      expect(headPos(buf)).toBe(1);
    });

    it('should not detect values just below threshold', () => {
      const buf = new Int32Array([SILENCE_THRESHOLD - 1, 0]);
      expect(headPos(buf)).toBe(buf.length);
    });

    it('should return 0 for first sample above threshold', () => {
      const buf = new Int32Array([SILENCE_THRESHOLD, 0]);
      expect(headPos(buf)).toBe(0);
    });
  });

  describe('tailPos', () => {
    it('should return last non-silent position', () => {
      const buf = new Int32Array([100, SILENCE_THRESHOLD, 0, 0]);
      expect(tailPos(buf)).toBe(1);
    });

    it('should return 0 for all-silent input', () => {
      const buf = new Int32Array([0, 0, 0]);
      expect(tailPos(buf)).toBe(0);
    });

    it('should detect negative values', () => {
      const buf = new Int32Array([0, 0, -SILENCE_THRESHOLD]);
      expect(tailPos(buf)).toBe(2);
    });
  });

  describe('trimSamples', () => {
    it('should trim leading silence', () => {
      const buf = new Int32Array(40);
      // First 5 are silent, rest have signal
      for (let i = 5; i < 40; i++) buf[i] = SILENCE_THRESHOLD;

      const { trimmedBuffer } = trimSamples(buf, 0);
      expect(trimmedBuffer[0]).toBe(SILENCE_THRESHOLD);
      expect(trimmedBuffer.length).toBe(35);
    });

    it('should trim trailing silence', () => {
      const buf = new Int32Array(100);
      // First 50 have signal, rest silent
      for (let i = 0; i < 50; i++) buf[i] = SILENCE_THRESHOLD;

      const { trimmedBuffer } = trimSamples(buf, 0);
      expect(trimmedBuffer.length).toBe(50);
    });

    it('should apply trim parameter (cuts frames from end)', () => {
      const buf = new Int32Array(100);
      for (let i = 0; i < 100; i++) buf[i] = SILENCE_THRESHOLD;

      const noTrim = trimSamples(buf, 0);
      const withTrim = trimSamples(buf, 1); // trim 1 * 32 = 32 frames from end

      expect(withTrim.trimmedBuffer.length).toBeLessThan(noTrim.trimmedBuffer.length);
      expect(withTrim.trimmedBuffer.length).toBe(100 - 32);
    });

    it('should return untrimmedLength before trim parameter is applied', () => {
      const buf = new Int32Array(100);
      for (let i = 0; i < 100; i++) buf[i] = SILENCE_THRESHOLD;

      const { untrimmedLength } = trimSamples(buf, 2);
      expect(untrimmedLength).toBe(100); // full length before trim
    });

    it('should pad to minimum 32 samples', () => {
      const buf = new Int32Array(40);
      // Only 5 samples of signal
      for (let i = 0; i < 5; i++) buf[i] = SILENCE_THRESHOLD;

      const { trimmedBuffer } = trimSamples(buf, 0);
      expect(trimmedBuffer.length).toBe(32); // padded to minimum
      // First 5 should be signal
      expect(trimmedBuffer[0]).toBe(SILENCE_THRESHOLD);
      // Rest should be zero (padding)
      expect(trimmedBuffer[10]).toBe(0);
    });

    it('should return empty buffer for all-silent input', () => {
      const buf = new Int32Array([0, 0, 0]);
      const { trimmedBuffer, untrimmedLength } = trimSamples(buf, 0);
      expect(trimmedBuffer.length).toBe(0);
      expect(untrimmedLength).toBe(0);
    });
  });

  describe('applyDither', () => {
    it('should modify the samples', () => {
      const samples = new Int32Array(100);
      samples.fill(10000);
      const original = samples.slice();

      applyDither(samples);

      // At least some values should differ
      let differences = 0;
      for (let i = 0; i < samples.length; i++) {
        if (samples[i] !== original[i]) differences++;
      }
      expect(differences).toBeGreaterThan(0);
    });

    it('should keep values within reasonable range of input', () => {
      const samples = new Int32Array(1000);
      samples.fill(0);

      applyDither(samples);

      // Maximum deviation per sample: (r - state) ranges from -1 to 1, noiseLevel = 4096
      // So max deviation is roughly 4096
      const maxDeviation = 256 * 16; // 4096
      for (let i = 0; i < samples.length; i++) {
        expect(Math.abs(samples[i])).toBeLessThanOrEqual(maxDeviation);
      }
    });
  });

  describe('resample', () => {
    it('should return same data when rates are equal', () => {
      const input = new Int16Array([100, 200, 300, 400]);
      const result = resample(input, 44100, 44100);
      expect(Array.from(result)).toEqual([100, 200, 300, 400]);
    });

    it('should downsample by half', () => {
      const input = new Int16Array([100, 200, 300, 400]);
      const result = resample(input, 44100, 22050);
      // ratio = 2, outLength = 2
      // i=0: position=0, index=0, fraction=0 → 100
      // i=1: position=2, index=2, fraction=0 → 300
      expect(result.length).toBe(2);
      expect(result[0]).toBe(100);
      expect(result[1]).toBe(300);
    });

    it('should upsample by double', () => {
      const input = new Int16Array([100, 300]);
      const result = resample(input, 22050, 44100);
      // ratio = 0.5, outLength = 4
      // i=0: pos=0, idx=0, frac=0 → 100
      // i=1: pos=0.5, idx=0, frac=0.5 → round(100*0.5 + 300*0.5) = 200
      // i=2: pos=1.0, idx=1, frac=0 → 300 (last sample)
      // i=3: pos=1.5, idx=1, last sample → 300
      expect(result.length).toBe(4);
      expect(result[0]).toBe(100);
      expect(result[1]).toBe(200); // interpolated
      expect(result[2]).toBe(300);
      expect(result[3]).toBe(300); // clamped to last
    });

    it('should handle single sample input', () => {
      const input = new Int16Array([500]);
      const result = resample(input, 44100, 44100);
      expect(result.length).toBe(1);
      expect(result[0]).toBe(500);
    });

    it('should interpolate linearly between samples', () => {
      const input = new Int16Array([0, 1000]);
      const result = resample(input, 10000, 40000);
      // ratio = 0.25, outLength = 8
      // Positions: 0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75
      expect(result.length).toBe(8);
      expect(result[0]).toBe(0);       // pos=0.0
      expect(result[1]).toBe(250);     // pos=0.25, lerp(0,1000,0.25)
      expect(result[2]).toBe(500);     // pos=0.5
      expect(result[3]).toBe(750);     // pos=0.75
    });
  });
});
