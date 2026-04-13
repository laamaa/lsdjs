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
  describe('unpackSong', () => {
    /**
     * Helper: create a save buffer with a single song occupying one block,
     * containing the given raw bytes. The block allocation table marks
     * block 0 as belonging to song 0.
     */
    const createSaveWithSongBlock = (blockBytes: number[]): BinaryProcessor => {
      const buffer = createMockSaveFileBuffer(false);
      const processor = new BinaryProcessor(buffer);

      // Allocate block 0 to song 0
      processor.writeUint8(SAV_CONSTANTS.BLOCK_ALLOC_TABLE_START_PTR, 0);

      // Write song name so getBlocksUsed finds the song
      processor.writeUint8(SAV_CONSTANTS.FILE_NAME_START_PTR, 65); // 'A'

      // Write block data
      const blockStart = SAV_CONSTANTS.BLOCK_START_PTR;
      for (let i = 0; i < blockBytes.length; i++) {
        processor.writeUint8(blockStart + i, blockBytes[i]);
      }

      return processor;
    };

    it('should unpack literal bytes followed by end marker', () => {
      // Literal bytes: 0x01, 0x02, 0x03, then end marker 0xE0 0xFF
      const processor = createSaveWithSongBlock([0x01, 0x02, 0x03, 0xe0, 0xff]);
      const result = SaveFileProcessor.unpackSong(processor, 0);

      expect(result).not.toBeNull();
      expect(result![0]).toBe(0x01);
      expect(result![1]).toBe(0x02);
      expect(result![2]).toBe(0x03);
      expect(result!.length).toBe(3);
    });

    it('should handle literal 0xC0 (0xC0 0xC0)', () => {
      // 0xC0 0xC0 = literal 0xC0, then end marker
      const processor = createSaveWithSongBlock([0xc0, 0xc0, 0xe0, 0xff]);
      const result = SaveFileProcessor.unpackSong(processor, 0);

      expect(result).not.toBeNull();
      expect(result![0]).toBe(0xc0);
      expect(result!.length).toBe(1);
    });

    it('should handle RLE (0xC0 byte count)', () => {
      // 0xC0 0xAB 0x05 = repeat 0xAB five times, then end marker
      const processor = createSaveWithSongBlock([0xc0, 0xab, 0x05, 0xe0, 0xff]);
      const result = SaveFileProcessor.unpackSong(processor, 0);

      expect(result).not.toBeNull();
      expect(result!.length).toBe(5);
      for (let i = 0; i < 5; i++) {
        expect(result![i]).toBe(0xab);
      }
    });

    it('should handle literal 0xE0 (0xE0 0xE0)', () => {
      // 0xE0 0xE0 = literal 0xE0, then end marker
      const processor = createSaveWithSongBlock([0xe0, 0xe0, 0xe0, 0xff]);
      const result = SaveFileProcessor.unpackSong(processor, 0);

      expect(result).not.toBeNull();
      expect(result![0]).toBe(0xe0);
      expect(result!.length).toBe(1);
    });

    it('should handle wave pattern expansion (0xE0 0xF0 count)', () => {
      const expectedWave = [
        0x8e, 0xcd, 0xcc, 0xbb, 0xaa, 0xa9, 0x99, 0x88,
        0x87, 0x76, 0x66, 0x55, 0x54, 0x43, 0x32, 0x31
      ];

      // 0xE0 0xF0 0x02 = wave pattern twice, then end marker
      const processor = createSaveWithSongBlock([0xe0, 0xf0, 0x02, 0xe0, 0xff]);
      const result = SaveFileProcessor.unpackSong(processor, 0);

      expect(result).not.toBeNull();
      expect(result!.length).toBe(32); // 16 bytes x 2

      for (let rep = 0; rep < 2; rep++) {
        for (let i = 0; i < 16; i++) {
          expect(result![rep * 16 + i]).toBe(expectedWave[i]);
        }
      }
    });

    it('should handle instrument pattern expansion (0xE0 0xF1 count)', () => {
      const expectedInstr = [
        0xa8, 0x00, 0x00, 0xff, 0x00, 0x00, 0x03, 0x00,
        0x00, 0xd0, 0x00, 0x00, 0x00, 0xf3, 0x00, 0x00
      ];

      // 0xE0 0xF1 0x01 = instrument pattern once, then end marker
      const processor = createSaveWithSongBlock([0xe0, 0xf1, 0x01, 0xe0, 0xff]);
      const result = SaveFileProcessor.unpackSong(processor, 0);

      expect(result).not.toBeNull();
      expect(result!.length).toBe(16);

      for (let i = 0; i < 16; i++) {
        expect(result![i]).toBe(expectedInstr[i]);
      }
    });

    it('should handle end-of-song marker (0xE0 0xFF)', () => {
      const processor = createSaveWithSongBlock([0x42, 0xe0, 0xff]);
      const result = SaveFileProcessor.unpackSong(processor, 0);

      expect(result).not.toBeNull();
      expect(result!.length).toBe(1);
      expect(result![0]).toBe(0x42);
    });

    it('should handle block switching (0xE0 blockId)', () => {
      // Create a save with 2 blocks for song 0
      const buffer = createMockSaveFileBuffer(false);
      const processor = new BinaryProcessor(buffer);

      // Allocate blocks 0 and 1 to song 0
      processor.writeUint8(SAV_CONSTANTS.BLOCK_ALLOC_TABLE_START_PTR, 0);
      processor.writeUint8(SAV_CONSTANTS.BLOCK_ALLOC_TABLE_START_PTR + 1, 0);

      // Write song name
      processor.writeUint8(SAV_CONSTANTS.FILE_NAME_START_PTR, 65); // 'A'

      // Block 0: literal 0xAA, then block switch to block 1 (block ID = 2 because of +1 FAT offset)
      const block0Start = SAV_CONSTANTS.BLOCK_START_PTR;
      processor.writeUint8(block0Start, 0xaa);
      processor.writeUint8(block0Start + 1, 0xe0);
      processor.writeUint8(block0Start + 2, 0x02); // block ID 2 -> actual block 1

      // Block 1: literal 0xBB, then end marker
      const block1Start = SAV_CONSTANTS.BLOCK_START_PTR + SAV_CONSTANTS.BLOCK_SIZE;
      processor.writeUint8(block1Start, 0xbb);
      processor.writeUint8(block1Start + 1, 0xe0);
      processor.writeUint8(block1Start + 2, 0xff);

      const result = SaveFileProcessor.unpackSong(processor, 0);

      expect(result).not.toBeNull();
      expect(result![0]).toBe(0xaa);
      expect(result![1]).toBe(0xbb);
      expect(result!.length).toBe(2);
    });

    it('should return null for songs with no blocks', () => {
      const buffer = createMockSaveFileBuffer(false);
      const processor = new BinaryProcessor(buffer);

      const result = SaveFileProcessor.unpackSong(processor, 0);
      expect(result).toBeNull();
    });

    it('should handle combined commands', () => {
      // Mix: literal, RLE, literal 0xC0, wave pattern, end
      const processor = createSaveWithSongBlock([
        0x42,                   // literal 0x42
        0xc0, 0x00, 0x03,     // RLE: 0x00 x 3
        0xc0, 0xc0,           // literal 0xC0
        0xe0, 0xf0, 0x01,     // wave pattern x 1
        0xe0, 0xff            // end
      ]);
      const result = SaveFileProcessor.unpackSong(processor, 0);

      expect(result).not.toBeNull();
      // 1 (literal) + 3 (RLE) + 1 (literal 0xC0) + 16 (wave) = 21
      expect(result!.length).toBe(21);
      expect(result![0]).toBe(0x42);
      expect(result![1]).toBe(0x00);
      expect(result![2]).toBe(0x00);
      expect(result![3]).toBe(0x00);
      expect(result![4]).toBe(0xc0);
      expect(result![5]).toBe(0x8e); // first byte of wave pattern
    });
  });

  describe('extractSongForExport', () => {
    it('should export an imported song with correct header', () => {
      const saveBuffer = createMockSaveFileBuffer(true);
      const processor = new BinaryProcessor(saveBuffer);

      // Read the real triangle_waves.lsdprj file
      const filePath = `${__dirname}/triangle_waves.lsdprj`;
      const fileBuffer = fs.readFileSync(filePath);
      const lsdprjBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );

      // Import the song
      const songId = SaveFileProcessor.importSongFromLsdprj(processor, lsdprjBuffer);
      expect(songId).not.toBeNull();

      // Export the song
      const exported = SaveFileProcessor.extractSongForExport(processor, songId!);
      expect(exported).not.toBeNull();

      // Verify the header matches the original
      const originalView = new DataView(lsdprjBuffer);
      const exportedView = new DataView(exported!);

      // First 8 bytes: song name
      for (let i = 0; i < 8; i++) {
        expect(exportedView.getUint8(i)).toBe(originalView.getUint8(i));
      }

      // 9th byte: version
      expect(exportedView.getUint8(8)).toBe(originalView.getUint8(8));

      // Exported file should have 9-byte header + blocks
      expect(exported!.byteLength).toBeGreaterThan(9);
      expect((exported!.byteLength - 9) % SAV_CONSTANTS.BLOCK_SIZE).toBe(0);
    });

    it('should return null for invalid song', () => {
      const saveBuffer = createMockSaveFileBuffer(false);
      const processor = new BinaryProcessor(saveBuffer);

      const result = SaveFileProcessor.extractSongForExport(processor, 0);
      expect(result).toBeNull();
    });
  });

  describe('clearSong', () => {
    it('should free all blocks when clearing a song', () => {
      const saveBuffer = createMockSaveFileBuffer(true);
      const processor = new BinaryProcessor(saveBuffer);

      // Import a song first
      const filePath = `${__dirname}/triangle_waves.lsdprj`;
      const fileBuffer = fs.readFileSync(filePath);
      const lsdprjBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );

      const songId = SaveFileProcessor.importSongFromLsdprj(processor, lsdprjBuffer);
      expect(songId).not.toBeNull();
      expect(SaveFileProcessor.getBlocksUsed(processor, songId!)).toBeGreaterThan(0);

      // Clear the song
      SaveFileProcessor.clearSong(processor, songId!);

      // Verify blocks are freed
      expect(SaveFileProcessor.getBlocksUsed(processor, songId!)).toBe(0);
    });

    it('should clear file name and version', () => {
      const saveBuffer = createMockSaveFileBuffer(true);
      const processor = new BinaryProcessor(saveBuffer);

      // Import a song
      const filePath = `${__dirname}/triangle_waves.lsdprj`;
      const fileBuffer = fs.readFileSync(filePath);
      const lsdprjBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );

      const songId = SaveFileProcessor.importSongFromLsdprj(processor, lsdprjBuffer);
      expect(songId).not.toBeNull();

      // Clear the song
      SaveFileProcessor.clearSong(processor, songId!);

      // Verify file name is cleared (first byte should be 0)
      const fileNamePtr = SAV_CONSTANTS.FILE_NAME_START_PTR + songId! * SAV_CONSTANTS.FILE_NAME_LENGTH;
      expect(processor.readUint8(fileNamePtr)).toBe(0);

      // Verify file version is cleared
      const fileVersionPtr = SAV_CONSTANTS.FILE_VERSION_START_PTR + songId!;
      expect(processor.readUint8(fileVersionPtr)).toBe(0);
    });

    it('should clear active file slot if it matches', () => {
      const saveBuffer = createMockSaveFileBuffer(true);
      const processor = new BinaryProcessor(saveBuffer);

      // Import a song
      const filePath = `${__dirname}/triangle_waves.lsdprj`;
      const fileBuffer = fs.readFileSync(filePath);
      const lsdprjBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );

      const songId = SaveFileProcessor.importSongFromLsdprj(processor, lsdprjBuffer);
      expect(songId).not.toBeNull();

      // Set this song as the active file slot
      processor.writeUint8(SAV_CONSTANTS.ACTIVE_FILE_SLOT, songId!);
      expect(SaveFileProcessor.getActiveFileSlot(processor)).toBe(songId!);

      // Clear the song
      SaveFileProcessor.clearSong(processor, songId!);

      // Active file slot should be cleared
      expect(SaveFileProcessor.getActiveFileSlot(processor)).toBe(0xff);
    });

    it('should not clear active file slot if it does not match', () => {
      const saveBuffer = createMockSaveFileBuffer(true);
      const processor = new BinaryProcessor(saveBuffer);

      // Import a song
      const filePath = `${__dirname}/triangle_waves.lsdprj`;
      const fileBuffer = fs.readFileSync(filePath);
      const lsdprjBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );

      const songId = SaveFileProcessor.importSongFromLsdprj(processor, lsdprjBuffer);
      expect(songId).not.toBeNull();

      // Set a different song as the active file slot
      processor.writeUint8(SAV_CONSTANTS.ACTIVE_FILE_SLOT, 31);

      // Clear the imported song
      SaveFileProcessor.clearSong(processor, songId!);

      // Active file slot should remain unchanged
      expect(SaveFileProcessor.getActiveFileSlot(processor)).toBe(31);
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
