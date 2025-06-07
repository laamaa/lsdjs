import {beforeEach, describe, expect, it} from 'vitest';
import {BinaryProcessor} from '../BinaryProcessor';
import {SAV_CONSTANTS, SaveFileProcessor} from '../SaveFileProcessor';
import fs from 'fs';

describe('SaveFileProcessor', () => {
  // Create a mock save file buffer with song data
  const createMockSaveFileBuffer = (is64kb = false): ArrayBuffer => {
    // Create a buffer with the appropriate size for 32KB
    const baseSize = SAV_CONSTANTS.SAV_FILE_SIZE / 2;
    const size = is64kb ? SAV_CONSTANTS.SAV_FILE_SIZE : baseSize;
    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);

    // Fill the entire buffer with 0xFF (empty slots)
    // This matches the Java implementation: Arrays.fill(savFile.workRam, (byte)-1);
    for (let i = 0; i < baseSize; i++) {
      view.setUint8(i, 0xFF);
    }

    // Set workRam[0] to 0 to satisfy 64KB SRAM check
    // This matches the Java implementation: savFile.workRam[0] = 0;
    view.setUint8(0, 0);

    // If 64KB, duplicate the first 32KB to the second 32KB
    // This ensures the 64KB detection works correctly
    if (is64kb) {
      for (let i = 0; i < baseSize; i++) {
        view.setUint8(i + baseSize, view.getUint8(i));
      }
    }

    return buffer;
  };

  describe('parseSaveFile', () => {
    it('should parse basic save file information correctly (32KB)', () => {
      const saveBuffer = createMockSaveFileBuffer(false);
      const saveInfo = SaveFileProcessor.parseSaveFile(saveBuffer);

      expect(saveInfo.isValid).toBe(true);
      expect(saveInfo.is64kb).toBe(false);
      expect(saveInfo.totalBlocks).toBe(0xbf);
      expect(saveInfo.usedBlocks).toBe(0); // No blocks used initially
      expect(saveInfo.freeBlocks).toBe(0xbf);
      expect(saveInfo.songs.length).toBe(0); // No songs initially
    });

    it('should parse basic save file information correctly (64KB)', () => {
      const saveBuffer = createMockSaveFileBuffer(true);
      const saveInfo = SaveFileProcessor.parseSaveFile(saveBuffer);

      expect(saveInfo.isValid).toBe(true);
      expect(saveInfo.is64kb).toBe(true);
      expect(saveInfo.totalBlocks).toBe(0xbf - 0x80);
      expect(saveInfo.usedBlocks).toBe(0); // No blocks used initially
      expect(saveInfo.freeBlocks).toBe(0xbf - 0x80);
      expect(saveInfo.songs.length).toBe(0); // No songs initially
    });

    it('should handle invalid save file sizes', () => {
      // Create a buffer with an invalid size
      const buffer = new ArrayBuffer(1000);
      const saveInfo = SaveFileProcessor.parseSaveFile(buffer);

      expect(saveInfo.isValid).toBe(false);
    });
  });

  describe('utility functions', () => {
    let processor32kb: BinaryProcessor;
    let processor64kb: BinaryProcessor;

    beforeEach(() => {
      processor32kb = new BinaryProcessor(createMockSaveFileBuffer(false));
      processor64kb = new BinaryProcessor(createMockSaveFileBuffer(true));
    });

    it('should detect 64KB RAM save files', () => {
      expect(SaveFileProcessor.isSixtyFourKbRam(processor32kb)).toBe(false);
      expect(SaveFileProcessor.isSixtyFourKbRam(processor64kb)).toBe(true);
    });

    it('should calculate total block count correctly', () => {
      expect(SaveFileProcessor.getTotalBlockCount(false)).toBe(0xbf);
      expect(SaveFileProcessor.getTotalBlockCount(true)).toBe(0xbf - 0x80);
    });

    it('should count free blocks correctly', () => {
      const freeBlocks32kb = SaveFileProcessor.getFreeBlockCount(processor32kb);
      expect(freeBlocks32kb).toBe(0xbf); // All blocks free initially

      const freeBlocks64kb = SaveFileProcessor.getFreeBlockCount(processor64kb);
      expect(freeBlocks64kb).toBe(0xbf - 0x80); // All blocks free initially (63 blocks for 64KB)
    });

    it('should count blocks used by a song correctly', () => {
      // No blocks used initially
      expect(SaveFileProcessor.getBlocksUsed(processor32kb, 0)).toBe(0);
      expect(SaveFileProcessor.getBlocksUsed(processor32kb, 1)).toBe(0);
      expect(SaveFileProcessor.getBlocksUsed(processor32kb, 2)).toBe(0);
    });

    it('should convert LSDj characters to ASCII correctly', () => {
      expect(SaveFileProcessor.convertLsdCharToAscii(65)).toBe('A'.charCodeAt(0));
      expect(SaveFileProcessor.convertLsdCharToAscii(90)).toBe('Z'.charCodeAt(0));
      expect(SaveFileProcessor.convertLsdCharToAscii(48)).toBe('0'.charCodeAt(0));
      expect(SaveFileProcessor.convertLsdCharToAscii(57)).toBe('9'.charCodeAt(0));
      expect(SaveFileProcessor.convertLsdCharToAscii(0)).toBe(0);
      expect(SaveFileProcessor.convertLsdCharToAscii(100)).toBe(' '.charCodeAt(0));
    });

    it('should get file names correctly', () => {
      // No file names initially (returns spaces for 0xFF bytes)
      expect(SaveFileProcessor.getFileName(processor32kb, 0)).toBe('        ');
      expect(SaveFileProcessor.getFileName(processor32kb, 1)).toBe('        ');
      expect(SaveFileProcessor.getFileName(processor32kb, 2)).toBe('        ');
    });

    it('should get versions correctly', () => {
      // All versions are 0xFF (empty) initially
      expect(SaveFileProcessor.getVersion(processor32kb, 0)).toBe('FF');
      expect(SaveFileProcessor.getVersion(processor32kb, 1)).toBe('FF');
      expect(SaveFileProcessor.getVersion(processor32kb, 2)).toBe('FF');
    });

    it('should get the active file slot', () => {
      // Active file slot is 0xFF (empty) initially
      expect(SaveFileProcessor.getActiveFileSlot(processor32kb)).toBe(0xff);
    });

    it('should check if songs are valid', () => {
      // No songs are valid initially
      expect(SaveFileProcessor.isValid(processor32kb, 0)).toBe(false);
      expect(SaveFileProcessor.isValid(processor32kb, 1)).toBe(false);
      expect(SaveFileProcessor.isValid(processor32kb, 2)).toBe(false);
    });

    it('should get song list correctly', () => {
      // No songs initially
      const songs = SaveFileProcessor.getSongList(processor32kb);
      expect(songs.length).toBe(0);
    });
  });
  describe('importSongFromLsdprj', () => {
    /**
     * This test is a port of the Java test `isValid_addSongsUntilOutOfBlocks` from LSDSavFileTest.java.
     * It tests adding songs to the save file until it runs out of blocks, then validates all songs.
     * 
     * The test uses the real triangle_waves.lsdprj file from the __tests__ directory.
     * 
     * Note: The mock save file buffer has been modified to match the Java implementation:
     * 1. The entire buffer is filled with 0xFF (empty slots) to reset the block allocation table
     * 2. workRam[0] is set to 0 to satisfy the 64KB SRAM check
     * 
     * This allows the test to add 19 songs before running out of blocks, matching the Java test.
     */
    it('should add songs until out of blocks, then validate all songs', () => {
      // Create a mock save file buffer (128KB)
      // Use the full 128KB buffer to match the Java implementation
      const saveBuffer = createMockSaveFileBuffer(true);
      const processor = new BinaryProcessor(saveBuffer);

      // Read the real triangle_waves.lsdprj file from the __tests__ directory
      const filePath = `${__dirname}/triangle_waves.lsdprj`;
      const fileBuffer = fs.readFileSync(filePath);

      // Convert the Node.js Buffer to an ArrayBuffer
      const lsdprjBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );
      let addedSongs = 0;

      // Add songs until we run out of blocks
      try {
        while (true) {
          const result = SaveFileProcessor.importSongFromLsdprj(processor, lsdprjBuffer);
          if (result === null) {
            throw new Error("Out of blocks!");
          }
          addedSongs++;
        }
      } catch (e) {
        expect(e.message).toBe("Out of blocks!");
      }

      // Verify the number of songs added
      // The exact number depends on the block size and total blocks available
      // In the Java test, it was 19 songs
      // We expect the same number since we're using the same file
      expect(addedSongs).toBe(19);
      console.log(`Added ${addedSongs} songs before running out of blocks`);

      // Validate all added songs
      for (let song = 0; song < addedSongs; song++) {
        expect(SaveFileProcessor.isValid(processor, song)).toBe(true);
      }
    });
  });
});
