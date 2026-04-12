import { describe, expect, it } from 'vitest';
import { Sample } from '../../services/audio/sample/Sample';
import {
  sampleToSerialized,
  serializedToSample,
  sampleLengthInBytes,
  calculateKitMemory,
  SerializedSample,
  MAX_SAMPLE_SPACE,
} from '../sample-serialization';

describe('sample-serialization', () => {
  function makeSample(name: string, data: Int16Array): Sample {
    const sample = new Sample(data, name);
    sample.setOriginalSamples(data.slice());
    sample.setUneditedSamples(data.slice());
    return sample;
  }

  describe('sampleToSerialized', () => {
    it('should serialize all sample properties', () => {
      const data = new Int16Array([100, 200, 300, 400]);
      const sample = makeSample('TST', data);
      sample.setVolumeDb(3);
      sample.setPitchSemitones(-2);
      sample.setTrim(1);
      sample.setDither(true);
      sample.setHalfSpeed(true);

      const s = sampleToSerialized(sample);

      expect(s.name).toBe('TST');
      expect(s.volumeDb).toBe(3);
      expect(s.pitchSemitones).toBe(-2);
      expect(s.trim).toBe(1);
      expect(s.dither).toBe(true);
      expect(s.halfSpeed).toBe(true);
      expect(s.originalSamples).not.toBeNull();
      expect(s.uneditedSamples).not.toBeNull();
      expect(s.processedSamples).toBeInstanceOf(Array);
    });

    it('should produce a plain object (no class instances)', () => {
      const sample = makeSample('TST', new Int16Array([1, 2, 3]));
      const s = sampleToSerialized(sample);

      // Should be JSON-serializable
      const json = JSON.stringify(s);
      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('TST');
      expect(parsed.processedSamples).toEqual(expect.any(Array));
    });

    it('should handle sample without originalSamples set', () => {
      const sample = new Sample(new Int16Array([1, 2, 3]), 'TST');
      // Constructor sets uneditedSamples but not originalSamples
      const s = sampleToSerialized(sample);
      expect(s.originalSamples).toBeNull();
      expect(s.uneditedSamples).not.toBeNull();
    });
  });

  describe('serializedToSample', () => {
    it('should reconstruct a Sample with all properties', () => {
      const s: SerializedSample = {
        name: 'TST',
        processedSamples: [100, 200, 300, 400],
        originalSamples: [100, 200, 300, 400],
        uneditedSamples: [100, 200, 300, 400],
        untrimmedLength: 4,
        volumeDb: 3,
        pitchSemitones: -2,
        trim: 1,
        dither: true,
        halfSpeed: true,
      };

      const sample = serializedToSample(s);

      expect(sample.getName()).toBe('TST');
      expect(sample.getVolumeDb()).toBe(3);
      expect(sample.getPitchSemitones()).toBe(-2);
      expect(sample.getTrim()).toBe(1);
      expect(sample.getDither()).toBe(true);
      expect(sample.getHalfSpeed()).toBe(true);
      expect(sample.getOriginalSamples()).not.toBeNull();
      expect(sample.getUneditedSamples()).not.toBeNull();
    });

    it('should handle null originalSamples', () => {
      const s: SerializedSample = {
        name: 'TST',
        processedSamples: [100],
        originalSamples: null,
        uneditedSamples: null,
        untrimmedLength: 0,
        volumeDb: 0,
        pitchSemitones: 0,
        trim: 0,
        dither: false,
        halfSpeed: false,
      };

      const sample = serializedToSample(s);
      // originalSamples is null because we didn't provide it
      expect(sample.getOriginalSamples()).toBeNull();
      // uneditedSamples is set by constructor from processedSamples data
      expect(sample.getUneditedSamples()).not.toBeNull();
    });
  });

  describe('roundtrip', () => {
    it('should preserve all properties through serialize/deserialize', () => {
      const data = new Int16Array([1000, 2000, -3000, 4000]);
      const original = makeSample('RND', data);
      original.setVolumeDb(5);
      original.setPitchSemitones(3);
      original.setTrim(2);
      original.setDither(true);

      const serialized = sampleToSerialized(original);
      const reconstructed = serializedToSample(serialized);

      expect(reconstructed.getName()).toBe(original.getName());
      expect(reconstructed.getVolumeDb()).toBe(original.getVolumeDb());
      expect(reconstructed.getPitchSemitones()).toBe(original.getPitchSemitones());
      expect(reconstructed.getTrim()).toBe(original.getTrim());
      expect(reconstructed.getDither()).toBe(original.getDither());
      expect(Array.from(reconstructed.getOriginalSamples()!)).toEqual(
        Array.from(original.getOriginalSamples()!)
      );
      expect(Array.from(reconstructed.getUneditedSamples()!)).toEqual(
        Array.from(original.getUneditedSamples()!)
      );
    });
  });

  describe('sampleLengthInBytes', () => {
    it('should match Sample.lengthInBytes() for same data', () => {
      const data = new Int16Array(64);
      const sample = new Sample(data, 'TST');

      expect(sampleLengthInBytes(data.length)).toBe(sample.lengthInBytes());
    });

    it('should return 0 for empty data', () => {
      expect(sampleLengthInBytes(0)).toBe(0);
    });

    it('should align to 0x10 boundary', () => {
      // 100 samples → floor(100/2) = 50 → 50 - (50 % 16) = 50 - 2 = 48
      expect(sampleLengthInBytes(100)).toBe(48);
    });

    it('should match for various sizes', () => {
      // 32 samples → floor(32/2) = 16 → 16 - 0 = 16
      expect(sampleLengthInBytes(32)).toBe(16);
      // 33 samples → floor(33/2) = 16 → 16 - 0 = 16
      expect(sampleLengthInBytes(33)).toBe(16);
      // 31 samples → floor(31/2) = 15 → 15 - 15 = 0
      expect(sampleLengthInBytes(31)).toBe(0);
    });
  });

  describe('calculateKitMemory', () => {
    it('should return full space when all samples are null', () => {
      const samples = Array(15).fill(null);
      const { totalSampleSizeInBytes, bytesFree } = calculateKitMemory(samples);
      expect(totalSampleSizeInBytes).toBe(0);
      expect(bytesFree).toBe(MAX_SAMPLE_SPACE);
    });

    it('should calculate size for one sample', () => {
      const s: SerializedSample = {
        name: 'TST',
        processedSamples: new Array(64).fill(0),
        originalSamples: null,
        uneditedSamples: null,
        untrimmedLength: 0,
        volumeDb: 0,
        pitchSemitones: 0,
        trim: 0,
        dither: false,
        halfSpeed: false,
      };
      const samples: (SerializedSample | null)[] = [s, null, null];

      const { totalSampleSizeInBytes, bytesFree } = calculateKitMemory(samples);
      expect(totalSampleSizeInBytes).toBe(sampleLengthInBytes(64));
      expect(bytesFree).toBe(MAX_SAMPLE_SPACE - sampleLengthInBytes(64));
    });

    it('should sum multiple samples', () => {
      const make = (len: number): SerializedSample => ({
        name: 'T',
        processedSamples: new Array(len).fill(0),
        originalSamples: null,
        uneditedSamples: null,
        untrimmedLength: 0,
        volumeDb: 0,
        pitchSemitones: 0,
        trim: 0,
        dither: false,
        halfSpeed: false,
      });

      const samples: (SerializedSample | null)[] = [make(64), null, make(128)];
      const { totalSampleSizeInBytes } = calculateKitMemory(samples);
      expect(totalSampleSizeInBytes).toBe(
        sampleLengthInBytes(64) + sampleLengthInBytes(128)
      );
    });
  });
});
