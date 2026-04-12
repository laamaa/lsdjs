import { describe, expect, it } from 'vitest';
import { deleteFrames, cropFrames, fadeInFrames, fadeOutFrames } from '../SampleEditing';

describe('SampleEditing', () => {
  // Helper to create a constant-value Int16Array
  function makeConstArray(length: number, value: number): Int16Array {
    const arr = new Int16Array(length);
    arr.fill(value);
    return arr;
  }

  // Helper to create a sequential Int16Array [0, 1, 2, ...]
  function makeSequentialArray(length: number): Int16Array {
    const arr = new Int16Array(length);
    for (let i = 0; i < length; i++) arr[i] = i;
    return arr;
  }

  describe('deleteFrames', () => {
    it('should delete frames from the middle', () => {
      const samples = makeSequentialArray(10); // [0,1,2,3,4,5,6,7,8,9]
      const result = deleteFrames(samples, 3, 6);
      expect(result).not.toBeNull();
      expect(result!.length).toBe(6);
      expect(Array.from(result!)).toEqual([0, 1, 2, 7, 8, 9]);
    });

    it('should delete a single frame', () => {
      const samples = makeSequentialArray(5); // [0,1,2,3,4]
      const result = deleteFrames(samples, 2, 2);
      expect(result).not.toBeNull();
      expect(result!.length).toBe(4);
      expect(Array.from(result!)).toEqual([0, 1, 3, 4]);
    });

    it('should delete from beginning', () => {
      const samples = makeSequentialArray(5);
      const result = deleteFrames(samples, 0, 1);
      expect(result).not.toBeNull();
      expect(Array.from(result!)).toEqual([2, 3, 4]);
    });

    it('should delete from end', () => {
      const samples = makeSequentialArray(5);
      const result = deleteFrames(samples, 3, 4);
      expect(result).not.toBeNull();
      expect(Array.from(result!)).toEqual([0, 1, 2]);
    });

    it('should delete entire array', () => {
      const samples = makeSequentialArray(5);
      const result = deleteFrames(samples, 0, 4);
      expect(result).not.toBeNull();
      expect(result!.length).toBe(0);
    });

    it('should handle reversed indices', () => {
      const samples = makeSequentialArray(10);
      const result = deleteFrames(samples, 6, 3);
      expect(result).not.toBeNull();
      expect(result!.length).toBe(6);
      expect(Array.from(result!)).toEqual([0, 1, 2, 7, 8, 9]);
    });

    it('should return null for start < 0', () => {
      const samples = makeSequentialArray(5);
      expect(deleteFrames(samples, -1, 2)).toBeNull();
    });

    it('should return null for end >= length', () => {
      const samples = makeSequentialArray(5);
      expect(deleteFrames(samples, 2, 5)).toBeNull();
    });
  });

  describe('cropFrames', () => {
    it('should crop to middle of array', () => {
      const samples = makeSequentialArray(10);
      const result = cropFrames(samples, 3, 6);
      expect(result).not.toBeNull();
      expect(result!.length).toBe(4);
      expect(Array.from(result!)).toEqual([3, 4, 5, 6]);
    });

    it('should crop to single frame', () => {
      const samples = makeSequentialArray(5);
      const result = cropFrames(samples, 2, 2);
      expect(result).not.toBeNull();
      expect(result!.length).toBe(1);
      expect(Array.from(result!)).toEqual([2]);
    });

    it('should crop full array (returns copy)', () => {
      const samples = makeSequentialArray(5);
      const result = cropFrames(samples, 0, 4);
      expect(result).not.toBeNull();
      expect(Array.from(result!)).toEqual([0, 1, 2, 3, 4]);
    });

    it('should handle reversed indices', () => {
      const samples = makeSequentialArray(10);
      const result = cropFrames(samples, 6, 3);
      expect(result).not.toBeNull();
      expect(Array.from(result!)).toEqual([3, 4, 5, 6]);
    });

    it('should return null for start < 0', () => {
      const samples = makeSequentialArray(5);
      expect(cropFrames(samples, -1, 2)).toBeNull();
    });

    it('should return null for end >= length', () => {
      const samples = makeSequentialArray(5);
      expect(cropFrames(samples, 2, 5)).toBeNull();
    });
  });

  describe('fadeInFrames', () => {
    it('should apply correct fade-in reaching full volume at end', () => {
      const samples = makeConstArray(10, 1000);
      const result = fadeInFrames(samples, 2, 7);

      expect(result).not.toBeNull();
      // Frames outside range unchanged
      expect(result![0]).toBe(1000);
      expect(result![1]).toBe(1000);
      expect(result![8]).toBe(1000);
      expect(result![9]).toBe(1000);

      // Fade-in range [2,7]: fadeFactor = (i - start) / (end - start)
      // divisor = 5, so: 0/5, 1/5, 2/5, 3/5, 4/5, 5/5
      expect(result![2]).toBe(0);     // 0/5 * 1000 = 0
      expect(result![3]).toBe(200);   // 1/5 * 1000 = 200
      expect(result![4]).toBe(400);   // 2/5 * 1000 = 400
      expect(result![5]).toBe(600);   // 3/5 * 1000 = 600
      expect(result![6]).toBe(800);   // 4/5 * 1000 = 800
      expect(result![7]).toBe(1000);  // 5/5 * 1000 = 1000 (full volume)
    });

    it('should handle single frame (start === end)', () => {
      const samples = makeConstArray(5, 1000);
      const result = fadeInFrames(samples, 2, 2);

      expect(result).not.toBeNull();
      // Single frame fade-in: fadeFactor should be 1.0 (preserve sample)
      expect(result![2]).toBe(1000);
      // Other frames unchanged
      expect(result![0]).toBe(1000);
      expect(result![4]).toBe(1000);
    });

    it('should handle range of 2 frames', () => {
      const samples = makeConstArray(5, 1000);
      const result = fadeInFrames(samples, 1, 2);

      expect(result).not.toBeNull();
      // divisor = 1, so: 0/1=0.0, 1/1=1.0
      expect(result![1]).toBe(0);
      expect(result![2]).toBe(1000);
    });

    it('should handle reversed indices', () => {
      const samples = makeConstArray(10, 1000);
      const result = fadeInFrames(samples, 7, 2);

      expect(result).not.toBeNull();
      expect(result![2]).toBe(0);
      expect(result![7]).toBe(1000);
    });

    it('should not modify the original array', () => {
      const samples = makeConstArray(10, 1000);
      fadeInFrames(samples, 2, 7);
      // Original should be unchanged
      expect(samples[2]).toBe(1000);
      expect(samples[7]).toBe(1000);
    });

    it('should return null for start < 0', () => {
      const samples = makeConstArray(5, 1000);
      expect(fadeInFrames(samples, -1, 3)).toBeNull();
    });

    it('should return null for end >= length', () => {
      const samples = makeConstArray(5, 1000);
      expect(fadeInFrames(samples, 2, 5)).toBeNull();
    });
  });

  describe('fadeOutFrames', () => {
    it('should apply correct fade-out reaching silence at end', () => {
      const samples = makeConstArray(10, 1000);
      const result = fadeOutFrames(samples, 2, 7);

      expect(result).not.toBeNull();
      // Frames outside range unchanged
      expect(result![0]).toBe(1000);
      expect(result![1]).toBe(1000);
      expect(result![8]).toBe(1000);
      expect(result![9]).toBe(1000);

      // Fade-out range [2,7]: fadeFactor = 1 - (i - start) / (end - start)
      // divisor = 5, so: 1-0/5, 1-1/5, 1-2/5, 1-3/5, 1-4/5, 1-5/5
      expect(result![2]).toBe(1000);  // 5/5 * 1000 = 1000 (full volume)
      expect(result![3]).toBe(800);   // 4/5 * 1000 = 800
      expect(result![4]).toBe(600);   // 3/5 * 1000 = 600
      expect(result![5]).toBe(400);   // 2/5 * 1000 = 400
      expect(result![6]).toBe(200);   // 1/5 * 1000 = 200
      expect(result![7]).toBe(0);     // 0/5 * 1000 = 0 (silence)
    });

    it('should handle single frame (start === end)', () => {
      const samples = makeConstArray(5, 1000);
      const result = fadeOutFrames(samples, 2, 2);

      expect(result).not.toBeNull();
      // Single frame fade-out: fadeFactor should be 1.0 (preserve sample)
      expect(result![2]).toBe(1000);
    });

    it('should handle range of 2 frames', () => {
      const samples = makeConstArray(5, 1000);
      const result = fadeOutFrames(samples, 1, 2);

      expect(result).not.toBeNull();
      // divisor = 1, so: 1-0/1=1.0, 1-1/1=0.0
      expect(result![1]).toBe(1000);
      expect(result![2]).toBe(0);
    });

    it('should handle reversed indices', () => {
      const samples = makeConstArray(10, 1000);
      const result = fadeOutFrames(samples, 7, 2);

      expect(result).not.toBeNull();
      expect(result![2]).toBe(1000);
      expect(result![7]).toBe(0);
    });

    it('should not modify the original array', () => {
      const samples = makeConstArray(10, 1000);
      fadeOutFrames(samples, 2, 7);
      expect(samples[2]).toBe(1000);
      expect(samples[7]).toBe(1000);
    });

    it('should return null for start < 0', () => {
      const samples = makeConstArray(5, 1000);
      expect(fadeOutFrames(samples, -1, 3)).toBeNull();
    });

    it('should return null for end >= length', () => {
      const samples = makeConstArray(5, 1000);
      expect(fadeOutFrames(samples, 2, 5)).toBeNull();
    });
  });
});
