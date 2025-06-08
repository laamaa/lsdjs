/**
 * SampleFactory.ts
 * 
 * Factory methods for creating Sample instances
 */

import { Sample } from './Sample';
import { SampleProcessingOptions } from './types';
import { resample } from './SampleUtils';

/**
 * Creates a sample from nibbles (4-bit values)
 * 
 * @param nibbles - The nibbles as a Uint8Array
 * @param name - The name of the sample
 * @returns A new Sample instance
 */
export async function createFromNibbles(nibbles: Uint8Array, name: string): Promise<Sample> {
  const buf = new Int16Array(nibbles.length * 2);

  for (let i = 0; i < nibbles.length; i++) {
    const n = nibbles[i];
    buf[i * 2] = (n & 0xf0);
    buf[i * 2 + 1] = ((n & 0x0f) << 4);
  }

  for (let i = 0; i < buf.length; i++) {
    let s = buf[i] - 0x80;
    s *= 256;
    buf[i] = s;
  }

  const sample = new Sample(buf, name);
  // Store the original samples to enable editing operations
  sample.setOriginalSamples(buf.slice());
  // Also store a copy in uneditedSamples that will never be modified by pitch shifts
  sample.setUneditedSamples(buf.slice());
  return sample;
}

/**
 * Creates a sample from a WAV file
 * 
 * @param file - The WAV file
 * @param options - The sample processing options
 * @returns A new Sample instance
 */
export async function createFromWav(
  file: File,
  options: SampleProcessingOptions = {}
): Promise<Sample> {
  const { dither = false, halfSpeed = false, volumeDb = 0, trim = 0, pitchSemitones = 0 } = options;

  const fileName = file.name.split('.')[0];
  const sample = new Sample(null, fileName);
  sample.setFile(file);
  sample.setDither(dither);
  sample.setVolumeDb(volumeDb);
  sample.setTrim(trim);
  sample.setPitchSemitones(pitchSemitones);
  sample.setHalfSpeed(halfSpeed);

  await sample.reload(halfSpeed);
  return sample;
}

/**
 * Creates a duplicate of a sample
 * 
 * @param sample - The sample to duplicate
 * @returns A new Sample instance with the same properties
 */
export function dupeSample(sample: Sample): Sample {
  const newSample = new Sample(null, sample.getName());
  newSample.setFile(sample.getFile());
  newSample.setOriginalSamples(sample.getOriginalSamples() ? sample.getOriginalSamples()!.slice() : null);
  newSample.setUneditedSamples(sample.getUneditedSamples() ? sample.getUneditedSamples()!.slice() : null);
  newSample.setProcessedSamples(sample.workSampleData());
  newSample.setUntrimmedLength(sample.untrimmedLengthInSamples());
  newSample.setVolumeDb(sample.getVolumeDb());
  newSample.setPitchSemitones(sample.getPitchSemitones());
  newSample.setTrim(sample.getTrim());
  newSample.setDither(sample.getDither());
  newSample.setHalfSpeed(sample.getHalfSpeed());

  return newSample;
}

/**
 * Reads samples from a WAV file
 * 
 * @param file - The WAV file
 * @param halfSpeed - Whether to use half-speed mode
 * @param outRateFactor - The output rate factor for pitch adjustment
 * @returns A promise that resolves to an Int16Array of samples
 */
export async function readSamples(
  file: File,
  halfSpeed: boolean,
  outRateFactor: number
): Promise<Int16Array> {
  // Read the file as an ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Decode the audio data
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Get the sample data
  const channelData = audioBuffer.getChannelData(0);

  // Convert to Int16Array
  const samples = new Int16Array(channelData.length);
  for (let i = 0; i < channelData.length; i++) {
    // Convert float32 (-1.0 to 1.0) to int16 (-32768 to 32767)
    samples[i] = Math.max(-32768, Math.min(32767, Math.round(channelData[i] * 32767)));
  }

  // Resample to target sample rate
  const inSampleRate = audioBuffer.sampleRate;
  // Invert the outRateFactor to fix the pitch shift direction
  // When pitching up (positive semitones), we want a lower sample rate
  // When pitching down (negative semitones), we want a higher sample rate
  const outSampleRate = (halfSpeed ? 5734 : 11468) / outRateFactor;

  return resample(samples, inSampleRate, outSampleRate);
}