import { describe, expect, it } from 'vitest';
import { createFromNibbles, dupeSample } from '../SampleFactory';
import { Sample } from '../Sample';

describe('SampleFactory', () => {
  describe('createFromNibbles', () => {
    it('should create a sample with correct length (2 samples per nibble byte)', async () => {
      const nibbles = new Uint8Array([0x80, 0x80]);
      const sample = await createFromNibbles(nibbles, 'TST');
      expect(sample.lengthInSamples()).toBe(4); // 2 bytes * 2 samples each
    });

    it('should decode nibble 0x80 correctly', async () => {
      // Byte 0x80: high nibble = 0x80, low nibble = 0x00
      // Sample 0: (0x80 - 0x80) * 256 = 0
      // Sample 1: (0x00 - 0x80) * 256 = -128 * 256 = -32768
      const nibbles = new Uint8Array([0x80]);
      const sample = await createFromNibbles(nibbles, 'TST');
      const data = sample.workSampleData();
      expect(data[0]).toBe(0);
      expect(data[1]).toBe(-32768);
    });

    it('should decode nibble 0xFF correctly', async () => {
      // Byte 0xFF: high nibble = 0xF0, low nibble = 0x0F << 4 = 0xF0
      // Sample 0: (0xF0 - 0x80) * 256 = 112 * 256 = 28672
      // Sample 1: (0xF0 - 0x80) * 256 = 112 * 256 = 28672
      const nibbles = new Uint8Array([0xFF]);
      const sample = await createFromNibbles(nibbles, 'TST');
      const data = sample.workSampleData();
      expect(data[0]).toBe(28672);
      expect(data[1]).toBe(28672);
    });

    it('should decode nibble 0x00 correctly', async () => {
      // Byte 0x00: high nibble = 0x00, low nibble = 0x00
      // Sample 0: (0x00 - 0x80) * 256 = -128 * 256 = -32768
      // Sample 1: (0x00 - 0x80) * 256 = -128 * 256 = -32768
      const nibbles = new Uint8Array([0x00]);
      const sample = await createFromNibbles(nibbles, 'TST');
      const data = sample.workSampleData();
      expect(data[0]).toBe(-32768);
      expect(data[1]).toBe(-32768);
    });

    it('should decode nibble 0x48 correctly', async () => {
      // Byte 0x48: high nibble = 0x40, low nibble = 0x08 << 4 = 0x80
      // Sample 0: (0x40 - 0x80) * 256 = -64 * 256 = -16384
      // Sample 1: (0x80 - 0x80) * 256 = 0
      const nibbles = new Uint8Array([0x48]);
      const sample = await createFromNibbles(nibbles, 'TST');
      const data = sample.workSampleData();
      expect(data[0]).toBe(-16384);
      expect(data[1]).toBe(0);
    });

    it('should set the sample name (uppercase, truncated to 3 chars)', async () => {
      const nibbles = new Uint8Array([0x80]);
      const sample = await createFromNibbles(nibbles, 'longname');
      expect(sample.getName()).toBe('LON');
    });

    it('should set originalSamples and uneditedSamples', async () => {
      const nibbles = new Uint8Array([0x80, 0x80]);
      const sample = await createFromNibbles(nibbles, 'TST');
      expect(sample.getOriginalSamples()).not.toBeNull();
      expect(sample.getUneditedSamples()).not.toBeNull();
      expect(sample.getOriginalSamples()!.length).toBe(4);
      expect(sample.getUneditedSamples()!.length).toBe(4);
    });
  });

  describe('dupeSample', () => {
    it('should create a copy with the same name', () => {
      const data = new Int16Array([100, 200, 300]);
      const original = new Sample(data, 'TST');
      original.setOriginalSamples(data.slice());
      original.setUneditedSamples(data.slice());
      original.setVolumeDb(3);
      original.setPitchSemitones(5);
      original.setTrim(2);
      original.setDither(true);

      const copy = dupeSample(original);

      expect(copy.getName()).toBe('TST');
      expect(copy.getVolumeDb()).toBe(3);
      expect(copy.getPitchSemitones()).toBe(5);
      expect(copy.getTrim()).toBe(2);
      expect(copy.getDither()).toBe(true);
    });

    it('should produce an independent copy', () => {
      const data = new Int16Array([100, 200, 300]);
      const original = new Sample(data, 'TST');
      original.setOriginalSamples(data.slice());
      original.setUneditedSamples(data.slice());

      const copy = dupeSample(original);

      // Mutate the copy
      copy.setVolumeDb(10);
      copy.setName('NEW');

      // Original should be unaffected
      expect(original.getVolumeDb()).toBe(0);
      expect(original.getName()).toBe('TST');
    });

    it('should copy sample data', () => {
      const data = new Int16Array([100, 200, 300]);
      const original = new Sample(data, 'TST');
      original.setOriginalSamples(data.slice());
      original.setUneditedSamples(data.slice());

      const copy = dupeSample(original);

      expect(Array.from(copy.getOriginalSamples()!)).toEqual([100, 200, 300]);
      expect(Array.from(copy.getUneditedSamples()!)).toEqual([100, 200, 300]);
    });
  });
});
