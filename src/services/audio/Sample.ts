/**
 * Sample.ts
 * 
 * Provides utilities for handling audio samples in the LSDPatcher web application.
 * This class is responsible for loading, processing, and manipulating audio samples
 * for use in the Kit Editor.
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

/**
 * Class for handling audio samples
 */
export class Sample {
  private name: string;
  private originalSamples: Int16Array | null = null;
  private trulyOriginalSamples: Int16Array | null = null; // Never modified by pitch shifts
  private processedSamples: Int16Array;
  private _untrimmedLength: number = -1;
  private readPos: number = 0;
  private volumeDb: number = 0;
  private pitchSemitones: number = 0;
  private trim: number = 0;
  private dither: boolean = false;
  private file: File | null = null;
  private halfSpeed: boolean = false;

  // Constants
  private static readonly SILENCE_THRESHOLD = 32768 / 16; // Short.MAX_VALUE / 16

  /**
   * Creates a new Sample instance
   * 
   * @param samples - The sample data as an Int16Array
   * @param name - The name of the sample
   */
  constructor(samples: Int16Array | null, name: string) {
    this.name = name.toUpperCase().substring(0, 3);
    if (samples) {
      this.processedSamples = samples;
      // Store a copy of the original samples that will never be modified by pitch shifts
      this.trulyOriginalSamples = samples.slice();
    } else {
      this.processedSamples = new Int16Array(0);
    }
  }

  /**
   * Gets the name of the sample
   */
  public getName(): string {
    return this.name;
  }

  /**
   * Sets the name of the sample
   * 
   * @param name - The new name for the sample
   */
  public setName(name: string): void {
    this.name = name.toUpperCase().substring(0, 3);
  }

  /**
   * Gets the length of the processed sample in samples
   */
  public lengthInSamples(): number {
    return this.processedSamples.length;
  }

  /**
   * Gets the untrimmed length of the sample in samples
   */
  public untrimmedLengthInSamples(): number {
    return this._untrimmedLength === -1 
      ? this.lengthInSamples() 
      : this._untrimmedLength;
  }

  /**
   * Gets the untrimmed length of the sample in bytes
   */
  public untrimmedLengthInBytes(): number {
    let length = Math.floor(this.untrimmedLengthInSamples() / 2);
    length -= length % 0x10;
    return length;
  }

  /**
   * Gets a copy of the working sample data
   */
  public workSampleData(): Int16Array {
    return this.processedSamples.slice();
  }

  /**
   * Gets the length of the processed sample in bytes
   */
  public lengthInBytes(): number {
    let length = Math.floor(this.lengthInSamples() / 2);
    length -= length % 0x10;
    return length;
  }

  /**
   * Seeks to the start of the sample
   */
  public seekStart(): void {
    this.readPos = 0;
  }

  /**
   * Reads the next sample value
   */
  public read(): number {
    return this.processedSamples[this.readPos++];
  }

  /**
   * Checks if the sample's volume can be adjusted
   */
  public canAdjustVolume(): boolean {
    return this.originalSamples !== null;
  }

  /**
   * Gets the volume adjustment in decibels
   */
  public getVolumeDb(): number {
    return this.volumeDb;
  }

  /**
   * Sets the volume adjustment in decibels
   * 
   * @param value - The new volume adjustment
   */
  public setVolumeDb(value: number): void {
    this.volumeDb = value;
  }

  /**
   * Gets the pitch adjustment in semitones
   */
  public getPitchSemitones(): number {
    return this.pitchSemitones;
  }

  /**
   * Sets the pitch adjustment in semitones
   * 
   * @param value - The new pitch adjustment
   */
  public setPitchSemitones(value: number): void {
    this.pitchSemitones = value;
  }

  /**
   * Gets the trim value in frames
   */
  public getTrim(): number {
    return this.trim;
  }

  /**
   * Sets the trim value in frames
   * 
   * @param value - The new trim value
   */
  public setTrim(value: number): void {
    if (value < 0) {
      throw new Error('Trim value cannot be negative');
    }
    this.trim = value;
  }

  /**
   * Gets whether dither is enabled
   */
  public getDither(): boolean {
    return this.dither;
  }

  /**
   * Sets whether dither is enabled
   * 
   * @param value - The new dither value
   */
  public setDither(value: boolean): void {
    this.dither = value;
  }

  /**
   * Gets the file associated with this sample
   */
  public getFile(): File | null {
    return this.file;
  }

  /**
   * Processes the samples with the current settings
   */
  public processSamples(): void {
    if (!this.originalSamples) {
      return;
    }

    // Convert to Int32Array for processing
    const intBuffer = this.toIntBuffer(this.originalSamples);

    // Normalize the samples
    this.normalize(intBuffer);

    // Trim the samples
    const trimmedBuffer = this.trimSamples(intBuffer);

    // Apply dither if enabled
    if (this.dither) {
      this.applyDither(trimmedBuffer);
    }

    // Convert back to Int16Array
    this.processedSamples = this.toInt16Buffer(trimmedBuffer);
  }

  /**
   * Reloads the sample from the file with the current settings
   * 
   * @param halfSpeed - Whether to use half-speed mode
   */
  public async reload(halfSpeed: boolean): Promise<void> {
    if (!this.file) {
      return;
    }

    this.halfSpeed = halfSpeed;
    const outFactor = Math.pow(2.0, this.pitchSemitones / 12.0);
    const samples = await this.readSamples(this.file, halfSpeed, outFactor);

    // Store the samples in both originalSamples and trulyOriginalSamples
    this.originalSamples = samples;
    this.trulyOriginalSamples = samples.slice(); // Keep a copy that will never be modified by pitch shifts

    this.processSamples();
  }

  /**
   * Applies pitch shifting to samples without a file
   * This is used for ROM samples that don't have an associated file
   * 
   * @param halfSpeed - Whether to use half-speed mode
   * @returns true if pitch shifting was applied, false otherwise
   */
  public applyPitchShift(halfSpeed: boolean): boolean {
    if (!this.trulyOriginalSamples) {
      return false;
    }

    // Store the current pitch value
    const currentPitch = this.pitchSemitones;

    // If pitch is 0, no need to resample
    if (currentPitch === 0) {
      // Reset to truly original samples
      if (this.trulyOriginalSamples) {
        this.originalSamples = this.trulyOriginalSamples.slice();
        this.processSamples();
      }
      return true;
    }

    this.halfSpeed = halfSpeed;
    const outFactor = Math.pow(2.0, currentPitch / 12.0);

    // Calculate sample rates
    const baseSampleRate = halfSpeed ? 5734 : 11468;
    const outSampleRate = baseSampleRate / outFactor;

    // Always resample from the truly original samples to avoid cumulative pitch shifts
    this.originalSamples = this.resample(this.trulyOriginalSamples, baseSampleRate, outSampleRate);

    // Process the samples with the updated data
    this.processSamples();

    // Note: We're no longer resetting the pitch to 0 here
    // This allows the pitch value to be preserved in the sample object
    // The actual pitch shift has been applied to the samples, but we keep
    // the pitch value for UI consistency and to ensure it's not lost during
    // ROM updates or other operations

    return true;
  }

  /**
   * Creates a sample from nibbles (4-bit values)
   * 
   * @param nibbles - The nibbles as a Uint8Array
   * @param name - The name of the sample
   * @returns A new Sample instance
   */
  public static createFromNibbles(nibbles: Uint8Array, name: string): Sample {
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
    // Store the original samples to enable editing operations like deleteFrames
    sample.originalSamples = buf.slice();
    // Also store a copy in trulyOriginalSamples that will never be modified by pitch shifts
    sample.trulyOriginalSamples = buf.slice();
    return sample;
  }

  /**
   * Creates a sample from a WAV file
   * 
   * @param file - The WAV file
   * @param options - The sample processing options
   * @returns A new Sample instance
   */
  public static async createFromWav(
    file: File,
    options: SampleProcessingOptions = {}
  ): Promise<Sample> {
    const { dither = false, halfSpeed = false, volumeDb = 0, trim = 0, pitchSemitones = 0 } = options;

    const fileName = file.name.split('.')[0];
    const sample = new Sample(null, fileName);
    sample.file = file;
    sample.dither = dither;
    sample.volumeDb = volumeDb;
    sample.trim = trim;
    sample.pitchSemitones = pitchSemitones;
    sample.halfSpeed = halfSpeed;

    await sample.reload(halfSpeed);
    return sample;
  }

  /**
   * Creates a duplicate of a sample
   * 
   * @param sample - The sample to duplicate
   * @returns A new Sample instance with the same properties
   */
  public static dupeSample(sample: Sample): Sample {
    const newSample = new Sample(null, sample.name);
    newSample.file = sample.file;
    newSample.originalSamples = sample.originalSamples ? sample.originalSamples.slice() : null;
    newSample.trulyOriginalSamples = sample.trulyOriginalSamples ? sample.trulyOriginalSamples.slice() : null;
    newSample.processedSamples = sample.processedSamples.slice();
    newSample._untrimmedLength = sample._untrimmedLength;
    newSample.readPos = sample.readPos;
    newSample.volumeDb = sample.volumeDb;
    newSample.pitchSemitones = sample.pitchSemitones;
    newSample.trim = sample.trim;
    newSample.dither = sample.dither;
    newSample.halfSpeed = sample.halfSpeed;

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
  private async readSamples(
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

    return this.resample(samples, inSampleRate, outSampleRate);
  }

  /**
   * Resamples audio data to a new sample rate
   * 
   * @param samples - The input samples
   * @param inSampleRate - The input sample rate
   * @param outSampleRate - The output sample rate
   * @returns The resampled audio data
   */
  private resample(
    samples: Int16Array,
    inSampleRate: number,
    outSampleRate: number
  ): Int16Array {
    // Simple linear interpolation resampling
    // For a production app, a more sophisticated algorithm would be better
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

  /**
   * Converts an Int16Array to an Int32Array
   * 
   * @param shortBuffer - The Int16Array to convert
   * @returns The converted Int32Array
   */
  private toIntBuffer(shortBuffer: Int16Array): Int32Array {
    const intBuffer = new Int32Array(shortBuffer.length);
    for (let i = 0; i < shortBuffer.length; i++) {
      intBuffer[i] = shortBuffer[i];
    }
    return intBuffer;
  }

  /**
   * Converts an Int32Array to an Int16Array
   * 
   * @param intBuffer - The Int32Array to convert
   * @returns The converted Int16Array
   */
  private toInt16Buffer(intBuffer: Int32Array): Int16Array {
    const shortBuffer = new Int16Array(intBuffer.length);
    for (let i = 0; i < intBuffer.length; i++) {
      let s = intBuffer[i];
      s = Math.max(-32768, Math.min(32767, s));
      shortBuffer[i] = s;
    }
    return shortBuffer;
  }

  /**
   * Normalizes the volume of the samples
   * 
   * @param samples - The samples to normalize
   */
  private normalize(samples: Int32Array): void {
    let peak = Number.MIN_VALUE;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const normalizedS = s < 0 ? s / -32768 : s / 32767;
      peak = Math.max(Math.abs(normalizedS), peak);
    }

    if (peak === 0) {
      return;
    }

    const volumeAdjust = Math.pow(10, this.volumeDb / 20.0);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.round((samples[i] * volumeAdjust) / peak);
    }
  }

  /**
   * Finds the position of the first non-silent sample
   * 
   * @param buf - The buffer to search
   * @returns The position of the first non-silent sample
   */
  private headPos(buf: Int32Array): number {
    for (let i = 0; i < buf.length; i++) {
      if (Math.abs(buf[i]) >= Sample.SILENCE_THRESHOLD) {
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
  private tailPos(buf: Int32Array): number {
    for (let i = buf.length - 1; i >= 0; i--) {
      if (Math.abs(buf[i]) >= Sample.SILENCE_THRESHOLD) {
        return i;
      }
    }
    return 0;
  }

  /**
   * Trims silence from the beginning and end of the sample
   * 
   * @param intBuffer - The buffer to trim
   * @returns The trimmed buffer
   */
  private trimSamples(intBuffer: Int32Array): Int32Array {
    const headPos = this.headPos(intBuffer);
    const tailPos = this.tailPos(intBuffer);

    if (headPos > tailPos) {
      return new Int32Array(0);
    }

    this._untrimmedLength = tailPos + 1 - headPos;
    const adjustedTailPos = Math.max(headPos, tailPos - this.trim * 32);

    const newBuffer = new Int32Array(adjustedTailPos + 1 - headPos);
    for (let i = 0; i < newBuffer.length; i++) {
      newBuffer[i] = intBuffer[headPos + i];
    }

    // Extend to at least 32 samples
    if (newBuffer.length < 32) {
      const zeroPadded = new Int32Array(32);
      for (let i = 0; i < newBuffer.length; i++) {
        zeroPadded[i] = newBuffer[i];
      }
      return zeroPadded;
    }

    return newBuffer;
  }

  /**
   * Applies dither to the samples to reduce quantization noise
   * 
   * @param samples - The samples to dither
   */
  private applyDither(samples: Int32Array): void {
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
   * Deletes frames from the sample
   * 
   * @param startFrame - The starting frame index
   * @param endFrame - The ending frame index
   * @returns true if frames were deleted, false otherwise
   */
  public deleteFrames(startFrame: number, endFrame: number): boolean {
    // Add console logs to track the execution flow
    console.log('Sample.deleteFrames called with:', startFrame, endFrame);
    console.log('originalSamples length:', this.originalSamples?.length);

    if (!this.originalSamples || !this.trulyOriginalSamples) {
      console.log('No original samples, returning false');
      return false; // Can't delete frames if we don't have original samples
    }

    // Ensure start is less than end
    const start = Math.min(startFrame, endFrame);
    const end = Math.max(startFrame, endFrame);

    // Validate frame indices
    if (start < 0 || end >= this.originalSamples.length) {
      console.log('Frame indices out of bounds, returning false');
      return false;
    }

    // Create a new array without the selected frames
    const newSamples = new Int16Array(this.originalSamples.length - (end - start + 1));

    // Copy samples before the selection
    for (let i = 0; i < start; i++) {
      newSamples[i] = this.originalSamples[i];
    }

    // Copy samples after the selection
    for (let i = end + 1, j = start; i < this.originalSamples.length; i++, j++) {
      newSamples[j] = this.originalSamples[i];
    }

    // Update both the original samples and the truly original samples
    this.originalSamples = newSamples;
    this.trulyOriginalSamples = newSamples.slice(); // Update truly original samples too

    // Process the samples with the updated data
    this.processSamples();

    return true;
  }

  /**
   * Crops the sample to keep only the selected frames
   * 
   * @param startFrame - The starting frame index
   * @param endFrame - The ending frame index
   * @returns true if the sample was cropped, false otherwise
   */
  public cropFrames(startFrame: number, endFrame: number): boolean {
    // Add console logs to track the execution flow
    console.log('Sample.cropFrames called with:', startFrame, endFrame);
    console.log('originalSamples length:', this.originalSamples?.length);

    if (!this.originalSamples || !this.trulyOriginalSamples) {
      console.log('No original samples, returning false');
      return false; // Can't crop frames if we don't have original samples
    }

    // Ensure start is less than end
    const start = Math.min(startFrame, endFrame);
    const end = Math.max(startFrame, endFrame);

    // Validate frame indices
    if (start < 0 || end >= this.originalSamples.length) {
      console.log('Frame indices out of bounds, returning false');
      return false;
    }

    // Create a new array with only the selected frames
    const newSamples = new Int16Array(end - start + 1);

    // Copy only the selected frames
    for (let i = start, j = 0; i <= end; i++, j++) {
      newSamples[j] = this.originalSamples[i];
    }

    // Update both the original samples and the truly original samples
    this.originalSamples = newSamples;
    this.trulyOriginalSamples = newSamples.slice(); // Update truly original samples too

    // Process the samples with the updated data
    this.processSamples();

    return true;
  }
}
