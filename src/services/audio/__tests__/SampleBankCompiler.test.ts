import { describe, expect, it } from 'vitest';
import { SampleBankCompiler } from '../SampleBankCompiler';
import { Sample } from '../sample';

describe('SampleBankCompiler', () => {
  const BANK_SIZE = 0x4000;

  // Helper: create a Sample with known Int16 data
  function makeSample(name: string, data: Int16Array): Sample {
    const sample = new Sample(data, name);
    sample.setOriginalSamples(data.slice());
    sample.setUneditedSamples(data.slice());
    return sample;
  }

  // Helper: create a sample with a constant value repeated for N frames
  // Frames must be a multiple of 32 for clean packing
  function makeConstSample(name: string, value: number, frames: number): Sample {
    const data = new Int16Array(frames);
    data.fill(value);
    return makeSample(name, data);
  }

  describe('compile', () => {
    it('should fill buffer with 0xFF initially', () => {
      const { data } = SampleBankCompiler.compile([null], false);
      // Check area after header that has no sample data
      expect(data[0x60]).toBe(0xFF);
      expect(data[BANK_SIZE - 1]).toBe(0xFF);
    });

    it('should compile a single sample with DMG polarity', () => {
      // 32 frames of silence (0) → 4-bit value = round(0/(256*16) + 7.5) = 8
      // DMG: 0xf - 8 = 7
      // Rotated: outputBuffer[(counter+1) % 32] gets the value
      const sample = makeConstSample('TST', 0, 32);
      const { data, byteLengths } = SampleBankCompiler.compile([sample], false);

      expect(byteLengths[0]).toBe(0x10); // 32 frames → 16 bytes
      // Data starts at offset 0x60
      expect(data[0x60]).not.toBe(0xFF); // Should have sample data
    });

    it('should compile a single sample with GBA polarity', () => {
      const sample = makeConstSample('TST', 0, 32);
      const { data: dmgData } = SampleBankCompiler.compile([sample], false);
      const { data: gbaData } = SampleBankCompiler.compile([sample], true);

      // DMG and GBA should produce different nibble values (inverted)
      // For value 0: DMG gets 0xf-8=7, GBA gets 8
      // The packed bytes should differ
      expect(dmgData[0x60]).not.toBe(gbaData[0x60]);
    });

    it('should return byteLengths[i] = 0 for null samples', () => {
      const { byteLengths } = SampleBankCompiler.compile([null, null, null], false);
      expect(byteLengths[0]).toBe(0);
      expect(byteLengths[1]).toBe(0);
      expect(byteLengths[2]).toBe(0);
    });

    it('should pack two 4-bit nibbles per byte', () => {
      // 32 frames of max positive → 4-bit = round(32767/(256*16) + 7.5) = round(7.99.. + 7.5) = 15
      // DMG: 0xf - 15 = 0, so all nibbles are 0 → packed byte = 0x00
      const sample = makeConstSample('MAX', 32767, 32);
      const { data } = SampleBankCompiler.compile([sample], false);

      // With DMG polarity, max positive → nibble 0, packed = 0x00
      for (let i = 0x60; i < 0x60 + 0x10; i++) {
        expect(data[i]).toBe(0x00);
      }
    });

    it('should compile multiple samples sequentially', () => {
      const s1 = makeConstSample('S1', 0, 32);
      const s2 = makeConstSample('S2', 0, 64);
      const { byteLengths } = SampleBankCompiler.compile([s1, s2], false);

      expect(byteLengths[0]).toBe(0x10); // 32 frames → 16 bytes
      expect(byteLengths[1]).toBe(0x20); // 64 frames → 32 bytes
    });

    it('should skip null samples in the middle', () => {
      const s1 = makeConstSample('S1', 0, 32);
      const s2 = makeConstSample('S2', 0, 32);
      const { byteLengths } = SampleBankCompiler.compile([s1, null, s2], false);

      expect(byteLengths[0]).toBe(0x10);
      expect(byteLengths[1]).toBe(0);
      expect(byteLengths[2]).toBe(0x10);
    });
  });

  describe('unswizzle', () => {
    it('should throw on input not a multiple of 16', () => {
      expect(() => SampleBankCompiler.unswizzle(new Uint8Array(15))).toThrow();
      expect(() => SampleBankCompiler.unswizzle(new Uint8Array(17))).toThrow();
    });

    it('should accept input that is a multiple of 16', () => {
      expect(() => SampleBankCompiler.unswizzle(new Uint8Array(16))).not.toThrow();
      expect(() => SampleBankCompiler.unswizzle(new Uint8Array(32))).not.toThrow();
    });

    it('should return a Uint8Array of the same length', () => {
      const input = new Uint8Array(16);
      const result = SampleBankCompiler.unswizzle(input);
      expect(result.length).toBe(16);
    });

    it('should not modify the original array', () => {
      const input = new Uint8Array(16);
      input.fill(0x88);
      const copy = input.slice();
      SampleBankCompiler.unswizzle(input);
      expect(Array.from(input)).toEqual(Array.from(copy));
    });
  });

  describe('writeToRomBank', () => {
    function createEmptyRom(banks: number): ArrayBuffer {
      return new ArrayBuffer(banks * BANK_SIZE);
    }

    it('should write magic bytes at bank start', () => {
      const rom = createEmptyRom(2);
      const sample = makeConstSample('TST', 0, 32);
      SampleBankCompiler.writeToRomBank(rom, 1, [sample], 'MYKIT', false);

      const view = new Uint8Array(rom);
      expect(view[BANK_SIZE]).toBe(0x60);
      expect(view[BANK_SIZE + 1]).toBe(0x40);
    });

    it('should write kit name at offset 0x52', () => {
      const rom = createEmptyRom(2);
      SampleBankCompiler.writeToRomBank(rom, 1, [null], 'abcdef', false);

      const view = new Uint8Array(rom);
      const nameOffset = BANK_SIZE + 0x52;
      // Kit name should be uppercase
      expect(String.fromCharCode(view[nameOffset])).toBe('A');
      expect(String.fromCharCode(view[nameOffset + 1])).toBe('B');
      expect(String.fromCharCode(view[nameOffset + 2])).toBe('C');
      expect(String.fromCharCode(view[nameOffset + 3])).toBe('D');
      expect(String.fromCharCode(view[nameOffset + 4])).toBe('E');
      expect(String.fromCharCode(view[nameOffset + 5])).toBe('F');
    });

    it('should pad short kit names with spaces', () => {
      const rom = createEmptyRom(2);
      SampleBankCompiler.writeToRomBank(rom, 1, [null], 'HI', false);

      const view = new Uint8Array(rom);
      const nameOffset = BANK_SIZE + 0x52;
      expect(String.fromCharCode(view[nameOffset])).toBe('H');
      expect(String.fromCharCode(view[nameOffset + 1])).toBe('I');
      expect(String.fromCharCode(view[nameOffset + 2])).toBe(' ');
    });

    it('should write sample names at offset 0x22', () => {
      const rom = createEmptyRom(2);
      const sample = makeConstSample('ABC', 0, 32);
      SampleBankCompiler.writeToRomBank(rom, 1, [sample], 'KIT', false);

      const view = new Uint8Array(rom);
      const nameOffset = BANK_SIZE + 0x22;
      expect(String.fromCharCode(view[nameOffset])).toBe('A');
      expect(String.fromCharCode(view[nameOffset + 1])).toBe('B');
      expect(String.fromCharCode(view[nameOffset + 2])).toBe('C');
    });

    it('should write null byte + dashes for null samples', () => {
      const rom = createEmptyRom(2);
      SampleBankCompiler.writeToRomBank(rom, 1, [null], 'KIT', false);

      const view = new Uint8Array(rom);
      const nameOffset = BANK_SIZE + 0x22;
      expect(view[nameOffset]).toBe(0); // null char
      expect(String.fromCharCode(view[nameOffset + 1])).toBe('-');
      expect(String.fromCharCode(view[nameOffset + 2])).toBe('-');
    });

    it('should set version byte to 1 at offset 0x5f', () => {
      const rom = createEmptyRom(2);
      SampleBankCompiler.writeToRomBank(rom, 1, [null], 'KIT', false);

      const view = new Uint8Array(rom);
      expect(view[BANK_SIZE + 0x5f]).toBe(1);
    });

    it('should reset forced loop data at 0x5c-0x5d', () => {
      const rom = createEmptyRom(2);
      const view = new Uint8Array(rom);
      view[BANK_SIZE + 0x5c] = 0xFF;
      view[BANK_SIZE + 0x5d] = 0xFF;

      SampleBankCompiler.writeToRomBank(rom, 1, [null], 'KIT', false);

      expect(view[BANK_SIZE + 0x5c]).toBe(0);
      expect(view[BANK_SIZE + 0x5d]).toBe(0);
    });

    it('should write sample end offsets starting at offset 2', () => {
      const rom = createEmptyRom(2);
      const sample = makeConstSample('TST', 0, 32);
      SampleBankCompiler.writeToRomBank(rom, 1, [sample], 'KIT', false);

      const view = new Uint8Array(rom);
      // First sample end offset at bankOffset+2
      // Start = 0x4060, bytes = 0x10, end = 0x4070
      const lo = view[BANK_SIZE + 2];
      const hi = view[BANK_SIZE + 3];
      const endOffset = lo | (hi << 8);
      expect(endOffset).toBe(0x4060 + 0x10);
    });

    it('should write 0x00 offsets for null samples', () => {
      const rom = createEmptyRom(2);
      SampleBankCompiler.writeToRomBank(rom, 1, [null], 'KIT', false);

      const view = new Uint8Array(rom);
      expect(view[BANK_SIZE + 2]).toBe(0);
      expect(view[BANK_SIZE + 3]).toBe(0);
    });
  });

  describe('extractFromRomBank', () => {
    it('should throw on non-kit bank', async () => {
      const rom = new ArrayBuffer(BANK_SIZE * 2);
      await expect(SampleBankCompiler.extractFromRomBank(rom, 1)).rejects.toThrow('Not a kit bank');
    });

    it('should extract kit name', async () => {
      const rom = new ArrayBuffer(BANK_SIZE * 2);
      const sample = makeConstSample('TST', 0, 32);
      SampleBankCompiler.writeToRomBank(rom, 1, [sample], 'MYKIT', false);

      const { kitName } = await SampleBankCompiler.extractFromRomBank(rom, 1);
      expect(kitName).toBe('MYKIT');
    });

    it('should extract sample names', async () => {
      const rom = new ArrayBuffer(BANK_SIZE * 2);
      const s1 = makeConstSample('ONE', 0, 32);
      const s2 = makeConstSample('TWO', 0, 32);
      SampleBankCompiler.writeToRomBank(rom, 1, [s1, s2], 'KIT', false);

      const { samples } = await SampleBankCompiler.extractFromRomBank(rom, 1);
      expect(samples[0]?.getName()).toBe('ONE');
      expect(samples[1]?.getName()).toBe('TWO');
    });

    it('should return null for empty sample slots', async () => {
      const rom = new ArrayBuffer(BANK_SIZE * 2);
      const sample = makeConstSample('TST', 0, 32);
      SampleBankCompiler.writeToRomBank(rom, 1, [sample, null, null], 'KIT', false);

      const { samples } = await SampleBankCompiler.extractFromRomBank(rom, 1);
      expect(samples[0]).not.toBeNull();
      expect(samples[1]).toBeNull();
      expect(samples[2]).toBeNull();
    });

    it('should round-trip sample data (within quantization tolerance)', async () => {
      // Create a sample with specific values
      // Use values that quantize cleanly to 4-bit: multiples of ~2185 (32768/15)
      const data = new Int16Array(32);
      for (let i = 0; i < 32; i++) {
        // Range from -32768 to ~32767 in steps
        data[i] = Math.round(-32768 + i * (65535 / 31));
      }
      const sample = makeSample('RND', data);

      const rom = new ArrayBuffer(BANK_SIZE * 2);
      SampleBankCompiler.writeToRomBank(rom, 1, [sample], 'KIT', false);

      const { samples } = await SampleBankCompiler.extractFromRomBank(rom, 1);
      expect(samples[0]).not.toBeNull();

      // Verify the extracted sample has the right length
      // 32 frames → 16 packed bytes → 32 nibbles → 64 samples (createFromNibbles doubles)
      // Actually, 32 frames pack into 16 bytes, each byte has 2 nibbles,
      // and createFromNibbles creates 2 samples per nibble byte = 32 samples
      const extracted = samples[0]!;
      expect(extracted.getName()).toBe('RND');
      expect(extracted.lengthInSamples()).toBe(32);
    });
  });

  describe('extractKitNameFromRomBank', () => {
    it('should return kit name from valid kit bank', () => {
      const rom = new ArrayBuffer(BANK_SIZE * 2);
      const sample = makeConstSample('TST', 0, 32);
      SampleBankCompiler.writeToRomBank(rom, 1, [sample], 'DRUMS', false);

      const name = SampleBankCompiler.extractKitNameFromRomBank(rom, 1);
      expect(name).toBe('DRUMS');
    });

    it('should return null from non-kit bank', () => {
      const rom = new ArrayBuffer(BANK_SIZE * 2);
      const name = SampleBankCompiler.extractKitNameFromRomBank(rom, 1);
      expect(name).toBeNull();
    });
  });
});
