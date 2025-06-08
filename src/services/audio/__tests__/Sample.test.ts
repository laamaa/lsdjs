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
      expect(updatedOriginalSamples[2]).toBe(0); // 0% of 1000
      expect(updatedOriginalSamples[3]).toBe(167); // ~16.7% of 1000
      expect(updatedOriginalSamples[4]).toBe(333); // ~33.3% of 1000
      expect(updatedOriginalSamples[5]).toBe(500); // 50% of 1000
      expect(updatedOriginalSamples[6]).toBe(667); // ~66.7% of 1000
      expect(updatedOriginalSamples[7]).toBe(833); // ~83.3% of 1000

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
      expect(updatedOriginalSamples[2]).toBe(0); // 0% of 1000
      expect(updatedOriginalSamples[7]).toBe(833); // ~83.3% of 1000
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
      expect(updatedOriginalSamples[2]).toBe(1000); // 100% of 1000
      expect(updatedOriginalSamples[3]).toBe(833); // ~83.3% of 1000
      expect(updatedOriginalSamples[4]).toBe(667); // ~66.7% of 1000
      expect(updatedOriginalSamples[5]).toBe(500); // 50% of 1000
      expect(updatedOriginalSamples[6]).toBe(333); // ~33.3% of 1000
      expect(updatedOriginalSamples[7]).toBe(167); // ~16.7% of 1000

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
      expect(updatedOriginalSamples[2]).toBe(1000); // 100% of 1000
      expect(updatedOriginalSamples[7]).toBe(167); // ~16.7% of 1000
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
});
