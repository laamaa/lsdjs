/**
 * SampleEditing.ts
 * 
 * Functions for editing audio samples
 */

/**
 * Deletes frames from a sample
 * 
 * @param samples - The original samples
 * @param startFrame - The starting frame index
 * @param endFrame - The ending frame index
 * @returns The samples with frames deleted, or null if operation failed
 */
export function deleteFrames(
  samples: Int16Array,
  startFrame: number,
  endFrame: number
): Int16Array | null {
  // Ensure start is less than end
  const start = Math.min(startFrame, endFrame);
  const end = Math.max(startFrame, endFrame);

  // Validate frame indices
  if (start < 0 || end >= samples.length) {
    return null;
  }

  // Create a new array without the selected frames
  const newSamples = new Int16Array(samples.length - (end - start + 1));

  // Copy samples before the selection
  for (let i = 0; i < start; i++) {
    newSamples[i] = samples[i];
  }

  // Copy samples after the selection
  for (let i = end + 1, j = start; i < samples.length; i++, j++) {
    newSamples[j] = samples[i];
  }

  return newSamples;
}

/**
 * Crops a sample to keep only the selected frames
 * 
 * @param samples - The original samples
 * @param startFrame - The starting frame index
 * @param endFrame - The ending frame index
 * @returns The cropped samples, or null if operation failed
 */
export function cropFrames(
  samples: Int16Array,
  startFrame: number,
  endFrame: number
): Int16Array | null {
  // Ensure start is less than end
  const start = Math.min(startFrame, endFrame);
  const end = Math.max(startFrame, endFrame);

  // Validate frame indices
  if (start < 0 || end >= samples.length) {
    return null;
  }

  // Create a new array with only the selected frames
  const newSamples = new Int16Array(end - start + 1);

  // Copy only the selected frames
  for (let i = start, j = 0; i <= end; i++, j++) {
    newSamples[j] = samples[i];
  }

  return newSamples;
}

/**
 * Applies a fade-in effect to the selected frames
 * 
 * @param samples - The original samples
 * @param startFrame - The starting frame index
 * @param endFrame - The ending frame index
 * @returns The samples with fade-in applied, or null if operation failed
 */
export function fadeInFrames(
  samples: Int16Array,
  startFrame: number,
  endFrame: number
): Int16Array | null {
  // Ensure start is less than end
  const start = Math.min(startFrame, endFrame);
  const end = Math.max(startFrame, endFrame);

  // Validate frame indices
  if (start < 0 || end >= samples.length) {
    return null;
  }

  const newSamples = samples.slice();

  // Single frame: no fade to apply
  if (start === end) {
    return newSamples;
  }

  const divisor = end - start;
  for (let i = start; i <= end; i++) {
    newSamples[i] = Math.round(samples[i] * ((i - start) / divisor));
  }

  return newSamples;
}

/**
 * Applies a fade-out effect to the selected frames
 * 
 * @param samples - The original samples
 * @param startFrame - The starting frame index
 * @param endFrame - The ending frame index
 * @returns The samples with fade-out applied, or null if operation failed
 */
export function fadeOutFrames(
  samples: Int16Array,
  startFrame: number,
  endFrame: number
): Int16Array | null {
  // Ensure start is less than end
  const start = Math.min(startFrame, endFrame);
  const end = Math.max(startFrame, endFrame);

  // Validate frame indices
  if (start < 0 || end >= samples.length) {
    return null;
  }

  const newSamples = samples.slice();

  // Single frame: no fade to apply
  if (start === end) {
    return newSamples;
  }

  const divisor = end - start;
  for (let i = start; i <= end; i++) {
    newSamples[i] = Math.round(samples[i] * (1 - (i - start) / divisor));
  }

  return newSamples;
}