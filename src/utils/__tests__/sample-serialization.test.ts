import { describe, expect, it } from 'vitest';
import { Sample } from '../../services/audio/sample/Sample';
import {
  calculateKitMemory,
  MAX_SAMPLE_SPACE,
} from '../sample-serialization';

describe('sample-serialization', () => {
  describe('calculateKitMemory', () => {
    it('should return full space when all samples are null', () => {
      const samples = Array(15).fill(null);
      const { totalSampleSizeInBytes, bytesFree } = calculateKitMemory(samples);
      expect(totalSampleSizeInBytes).toBe(0);
      expect(bytesFree).toBe(MAX_SAMPLE_SPACE);
    });

    it('should calculate size for one sample', () => {
      const sample = new Sample(new Int16Array(64), 'TST');
      const samples: (Sample | null)[] = [sample, null, null];

      const { totalSampleSizeInBytes, bytesFree } = calculateKitMemory(samples);
      expect(totalSampleSizeInBytes).toBe(sample.lengthInBytes());
      expect(bytesFree).toBe(MAX_SAMPLE_SPACE - sample.lengthInBytes());
    });

    it('should sum multiple samples', () => {
      const sample64 = new Sample(new Int16Array(64), 'A');
      const sample128 = new Sample(new Int16Array(128), 'B');

      const samples: (Sample | null)[] = [sample64, null, sample128];
      const { totalSampleSizeInBytes } = calculateKitMemory(samples);
      expect(totalSampleSizeInBytes).toBe(
        sample64.lengthInBytes() + sample128.lengthInBytes()
      );
    });
  });
});
