import { describe, expect, it } from 'vitest';
import { Sample } from '../sample';

describe('Sample', () => {
  describe('fadeInFrames', () => {
    it('should apply fade-in effect to frames', () => {
      // Create a sample with known data
      const sampleData = new Int16Array(10);
      for (let i = 0; i < sampleData.length; i++) {
        sampleData[i] = 1000; // All samples have the same value
      }

      const sample = new Sample(sampleData, 'TEST');

      // Store the original samples to enable editing
      // @ts-expect-error - Accessing private property for testing
      sample.originalSamples = sampleData.slice();
      // @ts-expect-error - Accessing private property for testing
      sample.uneditedSamples = sampleData.slice();

      // Apply fade-in to frames 2-7 (indices 2, 3, 4, 5, 6, 7)
      const result = sample.fadeInFrames(2, 7);

      // Verify the result
      expect(result).toBe(true);

      // Verify the original samples were updated
      // @ts-expect-error - Accessing private property for testing
      const updatedOriginalSamples = sample.originalSamples;
      expect(updatedOriginalSamples.length).toBe(10);

      // Verify the fade-in effect was applied correctly
      // First two samples should be unchanged
      expect(updatedOriginalSamples[0]).toBe(1000);
      expect(updatedOriginalSamples[1]).toBe(1000);

      // Frames 2-7 should have fade-in applied (increasing values)
      expect(updatedOriginalSamples[2]).toBe(0); // 0/5 * 1000 = 0
      expect(updatedOriginalSamples[3]).toBe(200); // 1/5 * 1000 = 200
      expect(updatedOriginalSamples[4]).toBe(400); // 2/5 * 1000 = 400
      expect(updatedOriginalSamples[5]).toBe(600); // 3/5 * 1000 = 600
      expect(updatedOriginalSamples[6]).toBe(800); // 4/5 * 1000 = 800
      expect(updatedOriginalSamples[7]).toBe(1000); // 5/5 * 1000 = 1000

      // Last two samples should be unchanged
      expect(updatedOriginalSamples[8]).toBe(1000);
      expect(updatedOriginalSamples[9]).toBe(1000);
    });

    it('should handle reversed frame indices', () => {
      // Create a sample with known data
      const sampleData = new Int16Array(10);
      for (let i = 0; i < sampleData.length; i++) {
        sampleData[i] = 1000;
      }

      const sample = new Sample(sampleData, 'TEST');

      // Store the original samples to enable editing
      // @ts-expect-error - Accessing private property for testing
      sample.originalSamples = sampleData.slice();
      // @ts-expect-error - Accessing private property for testing
      sample.uneditedSamples = sampleData.slice();

      // Apply fade-in to frames 7-2 (reversed order)
      const result = sample.fadeInFrames(7, 2);

      // Verify the result
      expect(result).toBe(true);

      // Verify the original samples were updated
      // @ts-expect-error - Accessing private property for testing
      const updatedOriginalSamples = sample.originalSamples;

      // Verify the fade-in effect was applied correctly (same as previous test)
      expect(updatedOriginalSamples[2]).toBe(0); // 0/5 * 1000 = 0
      expect(updatedOriginalSamples[7]).toBe(1000); // 5/5 * 1000 = 1000
    });

    it('should return false if originalSamples is null', () => {
      // Create a sample without original samples
      const sampleData = new Int16Array(10);
      const sample = new Sample(sampleData, 'TEST');

      // Apply fade-in
      const result = sample.fadeInFrames(2, 7);

      // Verify the result
      expect(result).toBe(false);
    });

    it('should return false if frame indices are out of bounds', () => {
      // Create a sample with known data
      const sampleData = new Int16Array(10);
      const sample = new Sample(sampleData, 'TEST');

      // Store the original samples to enable editing
      // @ts-expect-error - Accessing private property for testing
      sample.originalSamples = sampleData.slice();
      // @ts-expect-error - Accessing private property for testing
      sample.uneditedSamples = sampleData.slice();

      // Try to apply fade-in with invalid indices
      const result1 = sample.fadeInFrames(-1, 5);
      const result2 = sample.fadeInFrames(5, 15);

      // Verify the results
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });
  });

  describe('fadeOutFrames', () => {
    it('should apply fade-out effect to frames', () => {
      // Create a sample with known data
      const sampleData = new Int16Array(10);
      for (let i = 0; i < sampleData.length; i++) {
        sampleData[i] = 1000; // All samples have the same value
      }

      const sample = new Sample(sampleData, 'TEST');

      // Store the original samples to enable editing
      // @ts-expect-error - Accessing private property for testing
      sample.originalSamples = sampleData.slice();
      // @ts-expect-error - Accessing private property for testing
      sample.uneditedSamples = sampleData.slice();

      // Apply fade-out to frames 2-7 (indices 2, 3, 4, 5, 6, 7)
      const result = sample.fadeOutFrames(2, 7);

      // Verify the result
      expect(result).toBe(true);

      // Verify the original samples were updated
      // @ts-expect-error - Accessing private property for testing
      const updatedOriginalSamples = sample.originalSamples;
      expect(updatedOriginalSamples.length).toBe(10);

      // Verify the fade-out effect was applied correctly
      // First two samples should be unchanged
      expect(updatedOriginalSamples[0]).toBe(1000);
      expect(updatedOriginalSamples[1]).toBe(1000);

      // Frames 2-7 should have fade-out applied (decreasing values)
      expect(updatedOriginalSamples[2]).toBe(1000); // 5/5 * 1000 = 1000
      expect(updatedOriginalSamples[3]).toBe(800); // 4/5 * 1000 = 800
      expect(updatedOriginalSamples[4]).toBe(600); // 3/5 * 1000 = 600
      expect(updatedOriginalSamples[5]).toBe(400); // 2/5 * 1000 = 400
      expect(updatedOriginalSamples[6]).toBe(200); // 1/5 * 1000 = 200
      expect(updatedOriginalSamples[7]).toBe(0); // 0/5 * 1000 = 0

      // Last two samples should be unchanged
      expect(updatedOriginalSamples[8]).toBe(1000);
      expect(updatedOriginalSamples[9]).toBe(1000);
    });

    it('should handle reversed frame indices', () => {
      // Create a sample with known data
      const sampleData = new Int16Array(10);
      for (let i = 0; i < sampleData.length; i++) {
        sampleData[i] = 1000;
      }

      const sample = new Sample(sampleData, 'TEST');

      // Store the original samples to enable editing
      // @ts-expect-error - Accessing private property for testing
      sample.originalSamples = sampleData.slice();
      // @ts-expect-error - Accessing private property for testing
      sample.uneditedSamples = sampleData.slice();

      // Apply fade-out to frames 7-2 (reversed order)
      const result = sample.fadeOutFrames(7, 2);

      // Verify the result
      expect(result).toBe(true);

      // Verify the original samples were updated
      // @ts-expect-error - Accessing private property for testing
      const updatedOriginalSamples = sample.originalSamples;

      // Verify the fade-out effect was applied correctly (same as previous test)
      expect(updatedOriginalSamples[2]).toBe(1000); // 5/5 * 1000 = 1000
      expect(updatedOriginalSamples[7]).toBe(0); // 0/5 * 1000 = 0
    });

    it('should return false if originalSamples is null', () => {
      // Create a sample without original samples
      const sampleData = new Int16Array(10);
      const sample = new Sample(sampleData, 'TEST');

      // Apply fade-out
      const result = sample.fadeOutFrames(2, 7);

      // Verify the result
      expect(result).toBe(false);
    });

    it('should return false if frame indices are out of bounds', () => {
      // Create a sample with known data
      const sampleData = new Int16Array(10);
      const sample = new Sample(sampleData, 'TEST');

      // Store the original samples to enable editing
      // @ts-expect-error - Accessing private property for testing
      sample.originalSamples = sampleData.slice();
      // @ts-expect-error - Accessing private property for testing
      sample.uneditedSamples = sampleData.slice();

      // Try to apply fade-out with invalid indices
      const result1 = sample.fadeOutFrames(-1, 5);
      const result2 = sample.fadeOutFrames(5, 15);

      // Verify the results
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });
  });

  describe('cropFrames', () => {
    it('should crop the sample to keep only the selected frames', () => {
      // Create a sample with known data
      const sampleData = new Int16Array(10);
      for (let i = 0; i < sampleData.length; i++) {
        sampleData[i] = i * 1000; // 0, 1000, 2000, ..., 9000
      }

      const sample = new Sample(sampleData, 'TEST');

      // Store the original samples to enable editing
      // @ts-expect-error - Accessing private property for testing
      sample.originalSamples = sampleData.slice();
      // @ts-expect-error - Accessing private property for testing
      sample.uneditedSamples = sampleData.slice();

      // Crop to frames 3-6 (indices 3, 4, 5, 6)
      const result = sample.cropFrames(3, 6);

      // Verify the result
      expect(result).toBe(true);

      // Verify the original samples were updated
      // @ts-expect-error - Accessing private property for testing
      const updatedOriginalSamples = sample.originalSamples;
      expect(updatedOriginalSamples.length).toBe(4); // Only 4 frames remain

      // Verify the correct frames were kept
      expect(updatedOriginalSamples[0]).toBe(3000); // Index 3 from original
      expect(updatedOriginalSamples[1]).toBe(4000); // Index 4 from original
      expect(updatedOriginalSamples[2]).toBe(5000); // Index 5 from original
      expect(updatedOriginalSamples[3]).toBe(6000); // Index 6 from original
    });

    it('should handle reversed frame indices', () => {
      // Create a sample with known data
      const sampleData = new Int16Array(10);
      for (let i = 0; i < sampleData.length; i++) {
        sampleData[i] = i * 1000;
      }

      const sample = new Sample(sampleData, 'TEST');

      // Store the original samples to enable editing
      // @ts-expect-error - Accessing private property for testing
      sample.originalSamples = sampleData.slice();
      // @ts-expect-error - Accessing private property for testing
      sample.uneditedSamples = sampleData.slice();

      // Crop to frames 6-3 (indices 6, 5, 4, 3) - reversed order
      const result = sample.cropFrames(6, 3);

      // Verify the result
      expect(result).toBe(true);

      // Verify the original samples were updated
      // @ts-expect-error - Accessing private property for testing
      const updatedOriginalSamples = sample.originalSamples;
      expect(updatedOriginalSamples.length).toBe(4); // Only 4 frames remain

      // Verify the correct frames were kept
      expect(updatedOriginalSamples[0]).toBe(3000); // Index 3 from original
      expect(updatedOriginalSamples[1]).toBe(4000); // Index 4 from original
      expect(updatedOriginalSamples[2]).toBe(5000); // Index 5 from original
      expect(updatedOriginalSamples[3]).toBe(6000); // Index 6 from original
    });

    it('should return false if originalSamples is null', () => {
      // Create a sample without original samples
      const sampleData = new Int16Array(10);
      const sample = new Sample(sampleData, 'TEST');

      // Crop frames
      const result = sample.cropFrames(3, 6);

      // Verify the result
      expect(result).toBe(false);
    });

    it('should return false if frame indices are out of bounds', () => {
      // Create a sample with known data
      const sampleData = new Int16Array(10);
      const sample = new Sample(sampleData, 'TEST');

      // Store the original samples to enable editing
      // @ts-expect-error - Accessing private property for testing
      sample.originalSamples = sampleData.slice();
      // @ts-expect-error - Accessing private property for testing
      sample.uneditedSamples = sampleData.slice();

      // Try to crop frames with invalid indices
      const result1 = sample.cropFrames(-1, 5);
      const result2 = sample.cropFrames(5, 15);

      // Verify the results
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });
  });

  describe('deleteFrames', () => {
    it('should delete frames from the sample', () => {
      // Create a sample with known data
      const sampleData = new Int16Array(10);
      for (let i = 0; i < sampleData.length; i++) {
        sampleData[i] = i * 1000; // 0, 1000, 2000, ..., 9000
      }

      const sample = new Sample(sampleData, 'TEST');

      // Store the original samples to enable editing
      // @ts-expect-error - Accessing private property for testing
      sample.originalSamples = sampleData.slice();

      // Delete frames 3-6 (indices 3, 4, 5, 6)
      const result = sample.deleteFrames(3, 6);

      // Verify the result
      expect(result).toBe(true);

      // Verify the original samples were updated
      // @ts-expect-error - Accessing private property for testing
      const updatedOriginalSamples = sample.originalSamples;
      expect(updatedOriginalSamples.length).toBe(6); // 10 - 4 = 6

      // Verify the correct frames were deleted
      expect(updatedOriginalSamples[0]).toBe(0);
      expect(updatedOriginalSamples[1]).toBe(1000);
      expect(updatedOriginalSamples[2]).toBe(2000);
      expect(updatedOriginalSamples[3]).toBe(7000); // Index 7 from original
      expect(updatedOriginalSamples[4]).toBe(8000); // Index 8 from original
      expect(updatedOriginalSamples[5]).toBe(9000); // Index 9 from original

      // Verify the processed samples were updated
      const processedSamples = sample.workSampleData();
      // The Sample class pads samples to a minimum of 32 samples
      expect(processedSamples.length).toBe(32);

      // Since the sample processing includes normalization and possibly dithering,
      // we can't check for exact values or their order. The normalization process
      // can significantly change the values and potentially invert their order.

      // Instead, we'll just verify that the deleteFrames function correctly
      // updates the original samples, and trust that the processSamples method
      // will correctly process them (which is tested elsewhere).
    });

    it('should handle reversed frame indices', () => {
      // Create a sample with known data
      const sampleData = new Int16Array(10);
      for (let i = 0; i < sampleData.length; i++) {
        sampleData[i] = i * 1000;
      }

      const sample = new Sample(sampleData, 'TEST');

      // Store the original samples to enable editing
      // @ts-expect-error - Accessing private property for testing
      sample.originalSamples = sampleData.slice();

      // Delete frames 6-3 (indices 6, 5, 4, 3) - reversed order
      const result = sample.deleteFrames(6, 3);

      // Verify the result
      expect(result).toBe(true);

      // Verify the original samples were updated
      // @ts-expect-error - Accessing private property for testing
      const updatedOriginalSamples = sample.originalSamples;
      expect(updatedOriginalSamples.length).toBe(6); // 10 - 4 = 6

      // Verify the correct frames were deleted
      expect(updatedOriginalSamples[0]).toBe(0);
      expect(updatedOriginalSamples[1]).toBe(1000);
      expect(updatedOriginalSamples[2]).toBe(2000);
      expect(updatedOriginalSamples[3]).toBe(7000); // Index 7 from original
      expect(updatedOriginalSamples[4]).toBe(8000); // Index 8 from original
      expect(updatedOriginalSamples[5]).toBe(9000); // Index 9 from original
    });

    it('should return false if originalSamples is null', () => {
      // Create a sample without original samples
      const sampleData = new Int16Array(10);
      const sample = new Sample(sampleData, 'TEST');

      // Delete frames
      const result = sample.deleteFrames(3, 6);

      // Verify the result
      expect(result).toBe(false);

      // Verify the processed samples were not changed
      const processedSamples = sample.workSampleData();
      expect(processedSamples.length).toBe(10);
    });

    it('should return false if frame indices are out of bounds', () => {
      // Create a sample with known data
      const sampleData = new Int16Array(10);
      const sample = new Sample(sampleData, 'TEST');

      // Store the original samples to enable editing
      // @ts-expect-error - Accessing private property for testing
      sample.originalSamples = sampleData.slice();

      // Try to delete frames with invalid indices
      const result1 = sample.deleteFrames(-1, 5);
      const result2 = sample.deleteFrames(5, 15);

      // Verify the results
      expect(result1).toBe(false);
      expect(result2).toBe(false);

      // Verify the samples were not changed
      // @ts-expect-error - Accessing private property for testing
      expect(sample.originalSamples.length).toBe(10);
      expect(sample.workSampleData().length).toBe(10);
    });

    it('should delete frames from the beginning of the sample', () => {
      // Create a sample with known data
      const sampleData = new Int16Array(10);
      for (let i = 0; i < sampleData.length; i++) {
        sampleData[i] = i * 1000;
      }

      const sample = new Sample(sampleData, 'TEST');

      // Store the original samples to enable editing
      // @ts-expect-error - Accessing private property for testing
      sample.originalSamples = sampleData.slice();

      // Delete frames 0-3 (indices 0, 1, 2, 3)
      const result = sample.deleteFrames(0, 3);

      // Verify the result
      expect(result).toBe(true);

      // Verify the original samples were updated
      // @ts-expect-error - Accessing private property for testing
      const updatedOriginalSamples = sample.originalSamples;
      expect(updatedOriginalSamples.length).toBe(6); // 10 - 4 = 6

      // Verify the correct frames were deleted
      expect(updatedOriginalSamples[0]).toBe(4000); // Index 4 from original
      expect(updatedOriginalSamples[1]).toBe(5000); // Index 5 from original
      expect(updatedOriginalSamples[2]).toBe(6000); // Index 6 from original
      expect(updatedOriginalSamples[3]).toBe(7000); // Index 7 from original
      expect(updatedOriginalSamples[4]).toBe(8000); // Index 8 from original
      expect(updatedOriginalSamples[5]).toBe(9000); // Index 9 from original
    });

    it('should delete frames from the end of the sample', () => {
      // Create a sample with known data
      const sampleData = new Int16Array(10);
      for (let i = 0; i < sampleData.length; i++) {
        sampleData[i] = i * 1000;
      }

      const sample = new Sample(sampleData, 'TEST');

      // Store the original samples to enable editing
      // @ts-expect-error - Accessing private property for testing
      sample.originalSamples = sampleData.slice();

      // Delete frames 6-9 (indices 6, 7, 8, 9)
      const result = sample.deleteFrames(6, 9);

      // Verify the result
      expect(result).toBe(true);

      // Verify the original samples were updated
      // @ts-expect-error - Accessing private property for testing
      const updatedOriginalSamples = sample.originalSamples;
      expect(updatedOriginalSamples.length).toBe(6); // 10 - 4 = 6

      // Verify the correct frames were deleted
      expect(updatedOriginalSamples[0]).toBe(0);
      expect(updatedOriginalSamples[1]).toBe(1000);
      expect(updatedOriginalSamples[2]).toBe(2000);
      expect(updatedOriginalSamples[3]).toBe(3000);
      expect(updatedOriginalSamples[4]).toBe(4000);
      expect(updatedOriginalSamples[5]).toBe(5000);
    });

    it('should delete a single frame', () => {
      // Create a sample with known data
      const sampleData = new Int16Array(10);
      for (let i = 0; i < sampleData.length; i++) {
        sampleData[i] = i * 1000;
      }

      const sample = new Sample(sampleData, 'TEST');

      // Store the original samples to enable editing
      // @ts-expect-error - Accessing private property for testing
      sample.originalSamples = sampleData.slice();

      // Delete frame 5 only
      const result = sample.deleteFrames(5, 5);

      // Verify the result
      expect(result).toBe(true);

      // Verify the original samples were updated
      // @ts-expect-error - Accessing private property for testing
      const updatedOriginalSamples = sample.originalSamples;
      expect(updatedOriginalSamples.length).toBe(9); // 10 - 1 = 9

      // Verify the correct frame was deleted
      expect(updatedOriginalSamples[0]).toBe(0);
      expect(updatedOriginalSamples[1]).toBe(1000);
      expect(updatedOriginalSamples[2]).toBe(2000);
      expect(updatedOriginalSamples[3]).toBe(3000);
      expect(updatedOriginalSamples[4]).toBe(4000);
      expect(updatedOriginalSamples[5]).toBe(6000); // Index 6 from original
      expect(updatedOriginalSamples[6]).toBe(7000); // Index 7 from original
      expect(updatedOriginalSamples[7]).toBe(8000); // Index 8 from original
      expect(updatedOriginalSamples[8]).toBe(9000); // Index 9 from original
    });
  });

  describe('processSamples', () => {
    it('should produce output from originalSamples with default settings', () => {
      // Create a sample with loud data (above silence threshold of 2048)
      const sampleData = new Int16Array(64);
      for (let i = 0; i < sampleData.length; i++) {
        sampleData[i] = 10000; // constant, clearly above silence threshold
      }

      const sample = new Sample(sampleData, 'TST');
      sample.setOriginalSamples(sampleData.slice());
      sample.setUneditedSamples(sampleData.slice());

      // Default settings: volumeDb=0, trim=0, dither=false
      sample.processSamples();

      const processed = sample.workSampleData();
      expect(processed.length).toBeGreaterThan(0);
      // With volumeDb=0, normalize divides by peak then multiplies by 1.0
      // Peak is 10000/32767 ≈ 0.305, so normalized = round(10000 * 1.0 / 0.305) = 32767
      // All samples should be the same value
      for (let i = 0; i < processed.length; i++) {
        expect(processed[i]).toBe(processed[0]);
      }
    });

    it('should apply volume adjustment via normalization', () => {
      const sampleData = new Int16Array(64);
      sampleData.fill(16000); // above silence threshold

      const sample = new Sample(sampleData, 'VOL');
      sample.setOriginalSamples(sampleData.slice());
      sample.setUneditedSamples(sampleData.slice());

      // Process with 0 dB (no volume change relative to peak)
      sample.setVolumeDb(0);
      sample.processSamples();
      const atZeroDb = sample.workSampleData();

      // Process with -6 dB (quieter)
      sample.setOriginalSamples(sampleData.slice());
      sample.setVolumeDb(-6);
      sample.processSamples();
      const atMinusSixDb = sample.workSampleData();

      // -6 dB should produce quieter output than 0 dB
      expect(Math.abs(atMinusSixDb[0])).toBeLessThan(Math.abs(atZeroDb[0]));
    });

    it('should trim samples from the end', () => {
      // Create a sample with 128 non-silent samples
      const sampleData = new Int16Array(128);
      sampleData.fill(10000);

      const sample = new Sample(sampleData, 'TRM');
      sample.setOriginalSamples(sampleData.slice());
      sample.setUneditedSamples(sampleData.slice());

      // No trim
      sample.setTrim(0);
      sample.processSamples();
      const untrimmedLength = sample.lengthInSamples();

      // Trim 2 frames (2 * 32 = 64 samples from the end)
      sample.setOriginalSamples(sampleData.slice());
      sample.setTrim(2);
      sample.processSamples();
      const trimmedLength = sample.lengthInSamples();

      expect(trimmedLength).toBeLessThan(untrimmedLength);
      // Should be approximately 64 samples shorter
      expect(untrimmedLength - trimmedLength).toBe(64);
    });

    it('should produce different output with dither enabled', () => {
      const sampleData = new Int16Array(64);
      sampleData.fill(10000);

      const sample = new Sample(sampleData, 'DTH');
      sample.setOriginalSamples(sampleData.slice());
      sample.setUneditedSamples(sampleData.slice());

      // Without dither
      sample.setDither(false);
      sample.processSamples();
      const withoutDither = sample.workSampleData();

      // All values should be identical (constant input, no dither)
      const allSame = withoutDither.every((v: number) => v === withoutDither[0]);
      expect(allSame).toBe(true);

      // With dither
      sample.setOriginalSamples(sampleData.slice());
      sample.setDither(true);
      sample.processSamples();
      const withDither = sample.workSampleData();

      // With dither, values should vary (random noise added)
      // Not all values should be the same anymore
      const allSameWithDither = withDither.every((v: number) => v === withDither[0]);
      expect(allSameWithDither).toBe(false);
    });

    it('should not process if originalSamples is null', () => {
      const sampleData = new Int16Array([100, 200, 300]);
      const sample = new Sample(sampleData, 'NUL');
      // originalSamples is null by default (not set)

      sample.processSamples();

      // processedSamples should remain unchanged
      const processed = sample.workSampleData();
      expect(processed[0]).toBe(100);
      expect(processed[1]).toBe(200);
      expect(processed[2]).toBe(300);
    });
  });

  describe('applyPitchShift', () => {
    it('should reset to unedited samples when pitch is 0', () => {
      const sampleData = new Int16Array(64);
      for (let i = 0; i < 64; i++) {
        sampleData[i] = i * 500; // ramp signal, above silence threshold
      }

      const sample = new Sample(sampleData, 'PIT');
      sample.setOriginalSamples(sampleData.slice());
      sample.setUneditedSamples(sampleData.slice());
      sample.setPitchSemitones(0);

      const result = sample.applyPitchShift(false);

      expect(result).toBe(true);
      // originalSamples should be a copy of uneditedSamples
      const original = sample.getOriginalSamples();
      const unedited = sample.getUneditedSamples();
      expect(original).not.toBeNull();
      expect(original!.length).toBe(unedited!.length);
      for (let i = 0; i < original!.length; i++) {
        expect(original![i]).toBe(unedited![i]);
      }
    });

    it('should produce shorter output when pitching up', () => {
      const sampleData = new Int16Array(128);
      sampleData.fill(10000); // above silence threshold

      const sample = new Sample(sampleData, 'PUP');
      sample.setOriginalSamples(sampleData.slice());
      sample.setUneditedSamples(sampleData.slice());

      // Pitch up by 12 semitones (1 octave) → resample at double rate → half the samples
      sample.setPitchSemitones(12);
      const result = sample.applyPitchShift(false);

      expect(result).toBe(true);
      const original = sample.getOriginalSamples();
      expect(original).not.toBeNull();
      // Pitching up should produce fewer samples (approximately half for +12 semitones)
      expect(original!.length).toBeLessThan(128);
      expect(original!.length).toBeCloseTo(64, -1); // approximately 64, within rounding
    });

    it('should produce longer output when pitching down', () => {
      const sampleData = new Int16Array(64);
      sampleData.fill(10000);

      const sample = new Sample(sampleData, 'PDN');
      sample.setOriginalSamples(sampleData.slice());
      sample.setUneditedSamples(sampleData.slice());

      // Pitch down by 12 semitones (1 octave) → resample at half rate → double the samples
      sample.setPitchSemitones(-12);
      const result = sample.applyPitchShift(false);

      expect(result).toBe(true);
      const original = sample.getOriginalSamples();
      expect(original).not.toBeNull();
      // Pitching down should produce more samples (approximately double for -12 semitones)
      expect(original!.length).toBeGreaterThan(64);
      expect(original!.length).toBeCloseTo(128, -1);
    });

    it('should return false if uneditedSamples is null', () => {
      const sample = new Sample(null, 'NUL');
      sample.setPitchSemitones(5);

      const result = sample.applyPitchShift(false);
      expect(result).toBe(false);
    });

    it('should always resample from uneditedSamples (not accumulate)', () => {
      const sampleData = new Int16Array(128);
      sampleData.fill(10000);

      const sample = new Sample(sampleData, 'ACC');
      sample.setOriginalSamples(sampleData.slice());
      sample.setUneditedSamples(sampleData.slice());

      // Apply pitch +12 twice
      sample.setPitchSemitones(12);
      sample.applyPitchShift(false);
      const lengthAfterFirst = sample.getOriginalSamples()!.length;

      sample.applyPitchShift(false);
      const lengthAfterSecond = sample.getOriginalSamples()!.length;

      // Both should produce the same result since we resample from uneditedSamples
      expect(lengthAfterSecond).toBe(lengthAfterFirst);
    });
  });
});
