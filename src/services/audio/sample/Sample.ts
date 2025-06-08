/**
 * Sample.ts
 * 
 * Provides utilities for handling audio samples in the LSDPatcher web application.
 * This class is responsible for loading, processing, and manipulating audio samples
 * for use in the Kit Editor.
 */

import { SampleProcessingOptions } from './types';
import * as SampleUtils from './SampleUtils';
import * as SampleEditing from './SampleEditing';
import * as SampleFactory from './SampleFactory';

/**
 * Class for handling audio samples
 */
export class Sample {
  private name: string;
  private originalSamples: Int16Array | null = null;
  private uneditedSamples: Int16Array | null = null; // Never modified by pitch shifts
  private processedSamples: Int16Array;
  private _untrimmedLength: number = -1;
  private readPos: number = 0;
  private volumeDb: number = 0;
  private pitchSemitones: number = 0;
  private trim: number = 0;
  private dither: boolean = false;
  private file: File | null = null;
  private halfSpeed: boolean = false;

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
      this.uneditedSamples = samples.slice();
    } else {
      this.processedSamples = new Int16Array(0);
    }
  }

  /**
   * Gets the sample name
   */
  public getName(): string {
    return this.name;
  }

  /**
   * Sets the sample name, converting to uppercase and limiting to 3 characters
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
   * Sets the untrimmed length of the sample in samples
   * Used internally by the sample processing functions
   * 
   * @param length - The untrimmed length in samples
   */
  public setUntrimmedLength(length: number): void {
    this._untrimmedLength = length;
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
   * Sets the processed samples
   * Used internally by the sample processing functions
   * 
   * @param samples - The processed samples
   */
  public setProcessedSamples(samples: Int16Array): void {
    this.processedSamples = samples;
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
   * Gets the volume adjustment in decibels (0 = no adjustment)
   */
  public getVolumeDb(): number {
    return this.volumeDb;
  }

  /**
   * Sets the volume adjustment in decibels
   * Higher values make the sample louder, lower values make it quieter
   * 
   * @param value - The new volume adjustment in dB
   */
  public setVolumeDb(value: number): void {
    this.volumeDb = value;
  }

  /**
   * Gets the pitch adjustment in semitones (0 = no adjustment)
   */
  public getPitchSemitones(): number {
    return this.pitchSemitones;
  }

  /**
   * Sets the pitch adjustment in semitones
   * Positive values increase pitch, negative values decrease pitch
   * 
   * @param value - The new pitch adjustment in semitones
   */
  public setPitchSemitones(value: number): void {
    this.pitchSemitones = value;
  }

  /**
   * Gets the trim value in frames (0 = no trimming)
   */
  public getTrim(): number {
    return this.trim;
  }

  /**
   * Sets the trim value in frames
   * Higher values trim more from the end of the sample
   * 
   * @param value - The new trim value (must be non-negative)
   */
  public setTrim(value: number): void {
    if (value < 0) {
      throw new Error('Trim value cannot be negative');
    }
    this.trim = value;
  }

  /**
   * Gets whether dither is enabled
   * Dither reduces quantization noise by adding small amounts of random noise
   */
  public getDither(): boolean {
    return this.dither;
  }

  /**
   * Sets whether dither is enabled
   * Dither can improve audio quality when reducing bit depth
   * 
   * @param value - True to enable dither, false to disable
   */
  public setDither(value: boolean): void {
    this.dither = value;
  }

  /**
   * Gets the original file associated with this sample
   * Returns null for samples created from ROM or other sources
   */
  public getFile(): File | null {
    return this.file;
  }

  /**
   * Sets the file associated with this sample
   * 
   * @param file - The file to associate with this sample
   */
  public setFile(file: File | null): void {
    this.file = file;
  }

  /**
   * Gets whether half-speed mode is enabled
   */
  public getHalfSpeed(): boolean {
    return this.halfSpeed;
  }

  /**
   * Sets whether half-speed mode is enabled
   * 
   * @param value - True to enable half-speed mode, false to disable
   */
  public setHalfSpeed(value: boolean): void {
    this.halfSpeed = value;
  }

  /**
   * Gets the original unmodified samples
   * These samples are preserved for reverting edits and are never modified by operations
   */
  public getUneditedSamples(): Int16Array | null {
    return this.uneditedSamples;
  }

  /**
   * Sets the unedited samples
   * Used internally by the sample processing functions
   * 
   * @param samples - The unedited samples
   */
  public setUneditedSamples(samples: Int16Array | null): void {
    this.uneditedSamples = samples;
  }

  /**
   * Gets the original samples
   * These samples are used for editing operations
   */
  public getOriginalSamples(): Int16Array | null {
    return this.originalSamples;
  }

  /**
   * Sets the original samples
   * Used internally by the sample processing functions
   * 
   * @param samples - The original samples
   */
  public setOriginalSamples(samples: Int16Array | null): void {
    this.originalSamples = samples;
  }

  /**
   * Resets the working samples to the original unmodified state
   * Used when reverting edits to restore the sample to its initial state
   */
  public setOriginalSamplesFromUnedited(): void {
    if (this.uneditedSamples) {
      this.originalSamples = this.uneditedSamples.slice();
    }
  }

  /**
   * Processes the samples with the current settings
   */
  public processSamples(): void {
    if (!this.originalSamples) {
      return;
    }

    // Convert to Int32Array for processing
    const intBuffer = SampleUtils.toIntBuffer(this.originalSamples);

    // Normalize the samples
    SampleUtils.normalize(intBuffer, this.volumeDb);

    // Trim the samples
    const { trimmedBuffer, untrimmedLength } = SampleUtils.trimSamples(intBuffer, this.trim);
    this._untrimmedLength = untrimmedLength;

    // Apply dither if enabled
    if (this.dither) {
      SampleUtils.applyDither(trimmedBuffer);
    }

    // Convert back to Int16Array
    this.processedSamples = SampleUtils.toInt16Buffer(trimmedBuffer);
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
    const samples = await SampleFactory.readSamples(this.file, halfSpeed, outFactor);

    // Store the samples in both originalSamples and uneditedSamples
    this.originalSamples = samples;
    this.uneditedSamples = samples.slice(); // Keep a copy that will never be modified by pitch shifts

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
    if (!this.uneditedSamples) {
      return false;
    }

    // Store the current pitch value
    const currentPitch = this.pitchSemitones;

    // If pitch is 0, no need to resample
    if (currentPitch === 0) {
      // Reset to unedited samples
      this.originalSamples = this.uneditedSamples.slice();
      this.processSamples();
      return true;
    }

    this.halfSpeed = halfSpeed;
    const outFactor = Math.pow(2.0, currentPitch / 12.0);

    // Calculate sample rates
    const baseSampleRate = halfSpeed ? 5734 : 11468;
    const outSampleRate = baseSampleRate / outFactor;

    // Always resample from the unedited samples to avoid cumulative pitch shifts
    this.originalSamples = SampleUtils.resample(this.uneditedSamples, baseSampleRate, outSampleRate);

    // Process the samples with the updated data
    this.processSamples();

    return true;
  }

  /**
   * Deletes frames from the sample
   * 
   * @param startFrame - The starting frame index
   * @param endFrame - The ending frame index
   * @returns true if frames were deleted, false otherwise
   */
  public deleteFrames(startFrame: number, endFrame: number): boolean {
    if (!this.originalSamples) {
      return false; // Can't delete frames if we don't have original samples
    }

    const newSamples = SampleEditing.deleteFrames(this.originalSamples, startFrame, endFrame);
    if (!newSamples) {
      return false;
    }

    // Update only the original samples, preserve uneditedSamples for revert functionality
    this.originalSamples = newSamples;

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
    if (!this.originalSamples) {
      return false; // Can't crop frames if we don't have original samples
    }

    const newSamples = SampleEditing.cropFrames(this.originalSamples, startFrame, endFrame);
    if (!newSamples) {
      return false;
    }

    // Update only the original samples, preserve uneditedSamples for revert functionality
    this.originalSamples = newSamples;

    // Process the samples with the updated data
    this.processSamples();

    return true;
  }

  /**
   * Applies a fade-in effect to the selected frames
   * 
   * @param startFrame - The starting frame index
   * @param endFrame - The ending frame index
   * @returns true if the fade-in was applied, false otherwise
   */
  public fadeInFrames(startFrame: number, endFrame: number): boolean {
    if (!this.originalSamples) {
      return false; // Can't apply fade-in if we don't have original samples
    }

    const newSamples = SampleEditing.fadeInFrames(this.originalSamples, startFrame, endFrame);
    if (!newSamples) {
      return false;
    }

    // Update only the original samples, preserve uneditedSamples for revert functionality
    this.originalSamples = newSamples;

    // Process the samples with the updated data
    this.processSamples();

    return true;
  }

  /**
   * Applies a fade-out effect to the selected frames
   * 
   * @param startFrame - The starting frame index
   * @param endFrame - The ending frame index
   * @returns true if the fade-out was applied, false otherwise
   */
  public fadeOutFrames(startFrame: number, endFrame: number): boolean {
    if (!this.originalSamples) {
      return false; // Can't apply fade-out if we don't have original samples
    }

    const newSamples = SampleEditing.fadeOutFrames(this.originalSamples, startFrame, endFrame);
    if (!newSamples) {
      return false;
    }

    // Update only the original samples, preserve uneditedSamples for revert functionality
    this.originalSamples = newSamples;

    // Process the samples with the updated data
    this.processSamples();

    return true;
  }

  /**
   * Creates a sample from nibbles (4-bit values)
   * 
   * @param nibbles - The nibbles as a Uint8Array
   * @param name - The name of the sample
   * @returns A new Sample instance
   */
  public static async createFromNibbles(nibbles: Uint8Array, name: string): Promise<Sample> {
    return SampleFactory.createFromNibbles(nibbles, name);
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
    return SampleFactory.createFromWav(file, options);
  }

  /**
   * Creates a duplicate of a sample
   * 
   * @param sample - The sample to duplicate
   * @returns A new Sample instance with the same properties
   */
  public static dupeSample(sample: Sample): Sample {
    return SampleFactory.dupeSample(sample);
  }
}