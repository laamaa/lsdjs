/**
 * types.ts
 * 
 * Type definitions for the Sample module
 */

/**
 * Interface for sample processing options
 */
export interface SampleProcessingOptions {
  /**
   * The volume adjustment in decibels
   * Default is 0 (no adjustment)
   */
  volumeDb?: number;

  /**
   * The pitch adjustment in semitones
   * Default is 0 (no adjustment)
   */
  pitchSemitones?: number;

  /**
   * The number of frames to trim from the end of the sample
   * Default is 0 (no trimming)
   */
  trim?: number;

  /**
   * Whether to apply dither to reduce quantization noise
   * Default is true
   */
  dither?: boolean;

  /**
   * Whether to use half-speed mode (5734Hz instead of 11468Hz)
   * Default is false
   */
  halfSpeed?: boolean;
}