/**
 * Serialization utilities for converting between Sample class instances
 * and plain serializable objects suitable for React state.
 */

import { Sample } from '../services/audio/sample/Sample';

/** Max bytes available for samples in a kit bank (0x4000 - 0x60 header) */
export const MAX_SAMPLE_SPACE = 0x3fa0;

/** Maximum number of samples per kit */
export const MAX_SAMPLES = 15;

/**
 * Plain-object representation of a Sample, safe to store in React state.
 * No class instances, no methods, no non-serializable data.
 */
export interface SerializedSample {
  name: string;
  processedSamples: number[];
  originalSamples: number[] | null;
  uneditedSamples: number[] | null;
  untrimmedLength: number;
  volumeDb: number;
  pitchSemitones: number;
  trim: number;
  dither: boolean;
  halfSpeed: boolean;
}

/**
 * Convert a Sample class instance to a SerializedSample.
 */
export function sampleToSerialized(sample: Sample): SerializedSample {
  return {
    name: sample.getName(),
    processedSamples: Array.from(sample.workSampleData()),
    originalSamples: sample.getOriginalSamples()
      ? Array.from(sample.getOriginalSamples()!)
      : null,
    uneditedSamples: sample.getUneditedSamples()
      ? Array.from(sample.getUneditedSamples()!)
      : null,
    untrimmedLength: sample.untrimmedLengthInSamples(),
    volumeDb: sample.getVolumeDb(),
    pitchSemitones: sample.getPitchSemitones(),
    trim: sample.getTrim(),
    dither: sample.getDither(),
    halfSpeed: sample.getHalfSpeed(),
  };
}

/**
 * Reconstruct a Sample class instance from a SerializedSample.
 */
export function serializedToSample(s: SerializedSample): Sample {
  const processedData = new Int16Array(s.processedSamples);
  const sample = new Sample(processedData, s.name);

  sample.setVolumeDb(s.volumeDb);
  sample.setPitchSemitones(s.pitchSemitones);
  sample.setTrim(s.trim);
  sample.setDither(s.dither);
  sample.setHalfSpeed(s.halfSpeed);
  sample.setUntrimmedLength(s.untrimmedLength);

  if (s.originalSamples) {
    sample.setOriginalSamples(new Int16Array(s.originalSamples));
  }
  if (s.uneditedSamples) {
    sample.setUneditedSamples(new Int16Array(s.uneditedSamples));
  }

  return sample;
}

/**
 * Calculate the byte length of a sample's processed data in ROM format.
 * Matches Sample.lengthInBytes().
 */
export function sampleLengthInBytes(processedSamplesLength: number): number {
  let length = Math.floor(processedSamplesLength / 2);
  length -= length % 0x10;
  return length;
}

/**
 * Calculate total sample size and bytes free for a kit.
 */
export function calculateKitMemory(
  samples: (SerializedSample | null)[]
): { totalSampleSizeInBytes: number; bytesFree: number } {
  const totalSampleSizeInBytes = samples.reduce(
    (total, s) => total + (s ? sampleLengthInBytes(s.processedSamples.length) : 0),
    0
  );

  return {
    totalSampleSizeInBytes,
    bytesFree: MAX_SAMPLE_SPACE - totalSampleSizeInBytes,
  };
}
