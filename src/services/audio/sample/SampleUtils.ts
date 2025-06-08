/**
 * SampleUtils.ts
 * 
 * Utility functions for sample processing
 */

/**
 * Converts an Int16Array to an Int32Array
 * 
 * @param shortBuffer - The Int16Array to convert
 * @returns The converted Int32Array
 */
export function toIntBuffer(shortBuffer: Int16Array): Int32Array {
  // Convert Int16Array to Int32Array for processing with higher precision
  return Int32Array.from(shortBuffer);
}

/**
 * Converts an Int32Array to an Int16Array
 * 
 * @param intBuffer - The Int32Array to convert
 * @returns The converted Int16Array
 */
export function toInt16Buffer(intBuffer: Int32Array): Int16Array {
  // Convert Int32Array back to Int16Array with clamping to prevent overflow
  return Int16Array.from(intBuffer, v => Math.max(-32768, Math.min(32767, v)));
}

/**
 * Normalizes the volume of the samples
 * 
 * @param samples - The samples to normalize
 * @param volumeDb - The volume adjustment in decibels
 */
export function normalize(samples: Int32Array, volumeDb: number): void {
  let peak = Number.MIN_VALUE;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const normalizedS = s < 0 ? s / -32768 : s / 32767;
    peak = Math.max(Math.abs(normalizedS), peak);
  }

  if (peak === 0) {
    return;
  }

  const volumeAdjust = Math.pow(10, volumeDb / 20.0);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.round((samples[i] * volumeAdjust) / peak);
  }
}

// Silence threshold for detecting silent parts of samples
export const SILENCE_THRESHOLD = 32768 / 16; // Short.MAX_VALUE / 16

/**
 * Finds the position of the first non-silent sample
 * 
 * @param buf - The buffer to search
 * @returns The position of the first non-silent sample
 */
export function headPos(buf: Int32Array): number {
  for (let i = 0; i < buf.length; i++) {
    if (Math.abs(buf[i]) >= SILENCE_THRESHOLD) {
      return i;
    }
  }
  return buf.length;
}

/**
 * Finds the position of the last non-silent sample
 * 
 * @param buf - The buffer to search
 * @returns The position of the last non-silent sample
 */
export function tailPos(buf: Int32Array): number {
  for (let i = buf.length - 1; i >= 0; i--) {
    if (Math.abs(buf[i]) >= SILENCE_THRESHOLD) {
      return i;
    }
  }
  return 0;
}

/**
 * Trims silence from the beginning and end of the sample
 * 
 * @param intBuffer - The buffer to trim
 * @param trim - The number of frames to trim from the end
 * @returns An object containing the trimmed buffer and the untrimmed length
 */
export function trimSamples(intBuffer: Int32Array, trim: number): { 
  trimmedBuffer: Int32Array; 
  untrimmedLength: number;
} {
  const headPosition = headPos(intBuffer);
  const tailPosition = tailPos(intBuffer);

  if (headPosition > tailPosition) {
    return { 
      trimmedBuffer: new Int32Array(0),
      untrimmedLength: 0
    };
  }

  const untrimmedLength = tailPosition + 1 - headPosition;
  const adjustedTailPos = Math.max(headPosition, tailPosition - trim * 32);

  const newBuffer = new Int32Array(adjustedTailPos + 1 - headPosition);
  for (let i = 0; i < newBuffer.length; i++) {
    newBuffer[i] = intBuffer[headPosition + i];
  }

  // Extend to at least 32 samples
  if (newBuffer.length < 32) {
    const zeroPadded = new Int32Array(32);
    for (let i = 0; i < newBuffer.length; i++) {
      zeroPadded[i] = newBuffer[i];
    }
    return {
      trimmedBuffer: zeroPadded,
      untrimmedLength
    };
  }

  return {
    trimmedBuffer: newBuffer,
    untrimmedLength
  };
}

/**
 * Applies dither to the samples to reduce quantization noise
 * 
 * @param samples - The samples to dither
 */
export function applyDither(samples: Int32Array): void {
  // Triangular probability density function dither
  let state = Math.random();
  for (let i = 0; i < samples.length; i++) {
    const r = state;
    state = Math.random();
    const noiseLevel = 256 * 16;
    samples[i] += Math.round((r - state) * noiseLevel);
  }
}

/**
 * Resamples audio data to a new sample rate
 * 
 * @param samples - The input samples
 * @param inSampleRate - The input sample rate
 * @param outSampleRate - The output sample rate
 * @returns The resampled audio data
 */
export function resample(
  samples: Int16Array,
  inSampleRate: number,
  outSampleRate: number
): Int16Array {
  // Linear interpolation resampling
  const ratio = inSampleRate / outSampleRate;
  const outLength = Math.floor(samples.length / ratio);
  const result = new Int16Array(outLength);

  for (let i = 0; i < outLength; i++) {
    const position = i * ratio;
    const index = Math.floor(position);
    const fraction = position - index;

    if (index >= samples.length - 1) {
      result[i] = samples[samples.length - 1];
    } else {
      result[i] = Math.round(
        samples[index] * (1 - fraction) + samples[index + 1] * fraction
      );
    }
  }

  return result;
}