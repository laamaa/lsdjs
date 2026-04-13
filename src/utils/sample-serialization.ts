/**
 * Kit memory calculation utilities.
 */

import { Sample } from '../services/audio/sample/Sample';

/** Max bytes available for samples in a kit bank (0x4000 - 0x60 header) */
export const MAX_SAMPLE_SPACE = 0x3fa0;

/** Maximum number of samples per kit */
export const MAX_SAMPLES = 15;

/**
 * Calculate total sample size and bytes free for a kit.
 */
export function calculateKitMemory(
  samples: (Sample | null)[]
): { totalSampleSizeInBytes: number; bytesFree: number } {
  const totalSampleSizeInBytes = samples.reduce(
    (total, s) => total + (s ? s.lengthInBytes() : 0),
    0
  );

  return {
    totalSampleSizeInBytes,
    bytesFree: MAX_SAMPLE_SPACE - totalSampleSizeInBytes,
  };
}
