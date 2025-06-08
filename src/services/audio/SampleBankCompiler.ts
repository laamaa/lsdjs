/**
 * SampleBankCompiler.ts
 * 
 * Provides utilities for compiling samples into the format required by the LSDj ROM.
 * Based on the original Java implementation in sbc.java.
 */

import { Sample } from './sample';

/**
 * Service for compiling samples into the format required by the LSDj ROM
 */
export const SampleBankCompiler = {
  /**
   * Extract kit name from a ROM bank
   * 
   * @param romData - The ROM data
   * @param bankIndex - The bank index to read from
   * @returns The kit name or null if not a kit bank
   */
  extractKitNameFromRomBank(
    romData: ArrayBuffer,
    bankIndex: number
  ): string | null {
    const BANK_SIZE = 0x4000; // 16,384 bytes

    // Create a view of the ROM data
    const romView = new Uint8Array(romData);

    // Calculate the bank offset
    const bankOffset = bankIndex * BANK_SIZE;

    // Check if this is a kit bank
    const isKitBank = romView[bankOffset] === 0x60 && romView[bankOffset + 1] === 0x40;
    if (!isKitBank) {
      return null;
    }

    // Read the kit name
    const processor = new BinaryProcessor(romData);
    return processor.readAsciiString(bankOffset + 0x52, 6).trim();
  },
  /**
   * Compile samples into the format required by the LSDj ROM
   * 
   * @param samples - The samples to compile
   * @param gameBoyAdvancePolarity - Whether to use Game Boy Advance polarity
   * @returns An object containing the compiled data and byte lengths
   */
  compile(
    samples: (Sample | null)[],
    gameBoyAdvancePolarity: boolean = false
  ): { data: Uint8Array; byteLengths: number[] } {
    // Create a buffer for the compiled data (one bank size)
    const BANK_SIZE = 0x4000; // 16,384 bytes
    const data = new Uint8Array(BANK_SIZE);

    // Fill the buffer with 0xFF (RST opcode)
    data.fill(0xFF);

    // Don't overwrite sample bank info
    let offset = 0x60;

    // Array to store the byte length of each sample
    const byteLengths = new Array(samples.length).fill(0);

    for (let sampleIt = 0; sampleIt < samples.length; sampleIt++) {
      const sample = samples[sampleIt];
      if (!sample) {
        continue;
      }

      sample.seekStart();
      const sampleLength = sample.lengthInSamples();

      let addedBytes = 0;
      const outputBuffer = new Array(32).fill(0);
      let outputCounter = 0;

      for (let i = 0; i < sampleLength; i++) {
        let s = sample.read();

        // Convert to 4-bit value (0-15)
        s = Math.round(s / (256 * 16) + 7.5);
        s = Math.min(0xf, Math.max(0, s));

        if (!gameBoyAdvancePolarity) {
          // Use DMG polarity, where 0xf = -1.0 and 0 = 1.0
          s = 0xf - s;
        }

        // Starting from LSDj 9.2.0, first sample is skipped to compensate for wave refresh bug.
        // This rotates the wave frame rightwards.
        outputBuffer[(outputCounter + 1) % 32] = s;

        if (outputCounter === 31) {
          for (let j = 0; j < 32; j += 2) {
            data[offset++] = (outputBuffer[j] << 4) | outputBuffer[j + 1];
          }
          outputCounter = -1;
          addedBytes += 0x10;
        }

        outputCounter++;
      }

      byteLengths[sampleIt] = addedBytes;
    }

    return { data, byteLengths };
  },

  /**
   * Unswizzle packed nibbles (convert from LSDj format to standard format)
   * 
   * @param packedNibbles - The packed nibbles to unswizzle
   * @returns The unswizzled packed nibbles
   */
  unswizzle(packedNibbles: Uint8Array): Uint8Array {
    if (packedNibbles.length % 16 !== 0) {
      throw new Error('Packed nibbles length must be a multiple of 16');
    }

    // Create a copy of the input array
    const result = new Uint8Array(packedNibbles.length);

    // Rotates the wave frame left and inverts the signal
    const tmpBuf = new Uint8Array(packedNibbles.length * 2);

    for (let i = 0; i < packedNibbles.length; i += 16) {
      for (let j = 0; j < 16; j++) {
        const b = packedNibbles[i + j];
        let dst = ((2 * j + 31) % 32) + (i * 2);
        tmpBuf[dst] = (0xf0 - (b & 0xf0)) >> 4;
        dst = 2 * (i + j);
        tmpBuf[dst] = (0xf - (b & 0xf)) << 4;
      }
    }

    for (let i = 0; i < packedNibbles.length; i++) {
      result[i] = (tmpBuf[i * 2] | tmpBuf[i * 2 + 1]);
    }

    return result;
  },

  /**
   * Write samples to a ROM bank
   * 
   * @param romData - The ROM data
   * @param bankIndex - The bank index to write to
   * @param samples - The samples to write
   * @param kitName - The name of the kit
   * @param gameBoyAdvancePolarity - Whether to use Game Boy Advance polarity
   * @returns The updated ROM data
   */
  writeToRomBank(
    romData: ArrayBuffer,
    bankIndex: number,
    samples: (Sample | null)[],
    kitName: string,
    gameBoyAdvancePolarity: boolean = false
  ): ArrayBuffer {
    const BANK_SIZE = 0x4000; // 16,384 bytes
    const MAX_SAMPLES = 15;
    const KIT_VERSION_1 = 1;

    // Create a view of the ROM data
    const romView = new Uint8Array(romData);

    // Compile the samples
    const { data, byteLengths } = this.compile(samples, gameBoyAdvancePolarity);

    // Calculate the bank offset
    const bankOffset = bankIndex * BANK_SIZE;

    // Copy the compiled data to the ROM
    for (let i = 0x60; i < BANK_SIZE; i++) {
      romView[bankOffset + i] = data[i];
    }

    // Update the bank header
    romView[bankOffset] = 0x60;
    romView[bankOffset + 1] = 0x40;

    // Update the sample length info
    let offset = bankOffset + 2;
    let bankOffsetCounter = 0x4060;

    for (let i = 0; i < MAX_SAMPLES; i++) {
      bankOffsetCounter += byteLengths[i];
      if (byteLengths[i] !== 0) {
        romView[offset++] = bankOffsetCounter & 0xff;
        romView[offset++] = (bankOffsetCounter >> 8) & 0xff;
      } else {
        romView[offset++] = 0;
        romView[offset++] = 0;
      }
    }

    // Reset forced loop data
    romView[bankOffset + 0x5c] = 0;
    romView[bankOffset + 0x5d] = 0;

    // Set version number
    romView[bankOffset + 0x5f] = KIT_VERSION_1;

    // Update kit name
    const kitNamePadded = (kitName.toUpperCase() + '      ').substring(0, 6);
    for (let i = 0; i < 6; i++) {
      romView[bankOffset + 0x52 + i] = kitNamePadded.charCodeAt(i);
    }

    // Update sample names
    for (let i = 0; i < MAX_SAMPLES; i++) {
      const sample = samples[i];
      const nameOffset = bankOffset + 0x22 + i * 3;

      if (sample) {
        const name = sample.getName();
        for (let j = 0; j < 3; j++) {
          if (j < name.length) {
            romView[nameOffset + j] = name.charCodeAt(j);
          } else {
            romView[nameOffset + j] = '-'.charCodeAt(0);
          }
        }
      } else {
        romView[nameOffset] = 0;
        romView[nameOffset + 1] = '-'.charCodeAt(0);
        romView[nameOffset + 2] = '-'.charCodeAt(0);
      }
    }

    return romData;
  },

  /**
   * Extract samples from a ROM bank
   * 
   * @param romData - The ROM data
   * @param bankIndex - The bank index to read from
   * @returns A promise that resolves to an object containing the samples and kit name
   */
  async extractFromRomBank(
    romData: ArrayBuffer,
    bankIndex: number
  ): Promise<{ samples: (Sample | null)[]; kitName: string }> {
    const BANK_SIZE = 0x4000; // 16,384 bytes
    const MAX_SAMPLES = 15;

    // Create a view of the ROM data
    const romView = new Uint8Array(romData);
    const processor = new BinaryProcessor(romData);

    // Calculate the bank offset
    const bankOffset = bankIndex * BANK_SIZE;

    // Check if this is a kit bank
    const isKitBank = romView[bankOffset] === 0x60 && romView[bankOffset + 1] === 0x40;
    if (!isKitBank) {
      throw new Error('Not a kit bank');
    }

    // Read the kit name
    const kitName = processor.readAsciiString(bankOffset + 0x52, 6).trim();

    // Create an array to store the samples
    const samples: (Sample | null)[] = new Array(MAX_SAMPLES).fill(null);

    // Extract each sample
    for (let sampleIt = 0; sampleIt < MAX_SAMPLES; sampleIt++) {
      // Read the sample name
      const nameOffset = bankOffset + 0x22 + sampleIt * 3;
      let name = '';
      for (let i = 0; i < 3; i++) {
        const charCode = romView[nameOffset + i];
        if (charCode === 0) {
          break;
        }
        name += String.fromCharCode(charCode);
      }

      // Read the sample data
      const offsetIndex = bankOffset + sampleIt * 2;
      const start = romView[offsetIndex] | (romView[offsetIndex + 1] << 8);
      const stop = romView[offsetIndex + 2] | (romView[offsetIndex + 3] << 8);

      if (stop <= start) {
        continue;
      }

      // Extract the nibbles
      const nibbleLength = stop - start;
      const nibbles = new Uint8Array(nibbleLength);

      for (let i = 0; i < nibbleLength; i++) {
        // The sample data is stored in the same bank as the kit header
        nibbles[i] = romView[bankOffset + start + i - 0x4000];
      }

      // Check if the bank is swizzled
      const bankVersion = romView[bankOffset + 0x5f];
      const isSwizzled = bankVersion === 1;

      // Unswizzle if necessary
      if (isSwizzled) {
        const unswizzled = this.unswizzle(nibbles);
        samples[sampleIt] = await Sample.createFromNibbles(unswizzled, name);
      } else {
        samples[sampleIt] = await Sample.createFromNibbles(nibbles, name);
      }
    }

    return { samples, kitName };
  }
};

/**
 * Helper class for BinaryProcessor (used in extractFromRomBank)
 */
class BinaryProcessor {
  private dataView: DataView;

  constructor(buffer: ArrayBuffer) {
    this.dataView = new DataView(buffer);
  }

  public readAsciiString(offset: number, maxLength: number): string {
    const bytes = new Uint8Array(this.dataView.buffer, offset, maxLength);
    let endIndex = bytes.findIndex(byte => byte === 0);

    if (endIndex === -1) {
      endIndex = maxLength;
    }

    return String.fromCharCode(...bytes.slice(0, endIndex));
  }
}
