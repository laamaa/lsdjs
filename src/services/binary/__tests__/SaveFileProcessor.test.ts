import {beforeEach, describe, expect, it} from 'vitest';
import {BinaryProcessor} from '../BinaryProcessor';
import {SAV_CONSTANTS, SaveFileProcessor} from '../SaveFileProcessor';

describe('SaveFileProcessor', () => {
  // Create a mock save file buffer with song data
  const createMockSaveFileBuffer = (is64kb = false): ArrayBuffer => {
    // Create a buffer with the appropriate size
    const size = is64kb ? SAV_CONSTANTS.SAV_FILE_SIZE : SAV_CONSTANTS.SAV_FILE_SIZE / 2;
    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);

    // Add file names for a few songs
    const songNames = ['SONG1', 'SONG2', 'EMPTY'];
    songNames.forEach((name, index) => {
      const offset = SAV_CONSTANTS.FILE_NAME_START_PTR + index * SAV_CONSTANTS.FILE_NAME_LENGTH;
      for (let i = 0; i < name.length; i++) {
        // Convert ASCII to LSDj character codes
        let charCode = name.charCodeAt(i);
        if (charCode >= 'A'.charCodeAt(0) && charCode <= 'Z'.charCodeAt(0)) {
          charCode = charCode - 'A'.charCodeAt(0) + 65;
        } else if (charCode >= '0'.charCodeAt(0) && charCode <= '9'.charCodeAt(0)) {
          charCode = charCode - '0'.charCodeAt(0) + 48;
        }
        view.setUint8(offset + i, charCode);
      }
      // Null-terminate the name
      if (name.length < SAV_CONSTANTS.FILE_NAME_LENGTH) {
        view.setUint8(offset + name.length, 0);
      }
    });

    // Add file versions
    view.setUint8(SAV_CONSTANTS.FILE_VERSION_START_PTR, 0x01); // Song 1: version 01
    view.setUint8(SAV_CONSTANTS.FILE_VERSION_START_PTR + 1, 0x02); // Song 2: version 02
    view.setUint8(SAV_CONSTANTS.FILE_VERSION_START_PTR + 2, 0x00); // Empty song: version 00

    // Set active file slot
    view.setUint8(SAV_CONSTANTS.ACTIVE_FILE_SLOT, 0);

    // Set up block allocation table
    // Song 1 uses 2 blocks
    view.setUint8(SAV_CONSTANTS.BLOCK_ALLOC_TABLE_START_PTR, 0);
    view.setUint8(SAV_CONSTANTS.BLOCK_ALLOC_TABLE_START_PTR + 1, 0);
    // Song 2 uses 1 block
    view.setUint8(SAV_CONSTANTS.BLOCK_ALLOC_TABLE_START_PTR + 2, 1);
    // Rest are empty (0xff)
    const totalBlocks = is64kb ? 0xbf - 0x80 : 0xbf;
    for (let i = 3; i < totalBlocks; i++) {
      view.setUint8(SAV_CONSTANTS.BLOCK_ALLOC_TABLE_START_PTR + i, 0xff);
    }

    // Add block data for Song 1 (first block)
    let blockOffset = SAV_CONSTANTS.BLOCK_START_PTR;
    // Add a simple compressed song with RLE and block switch
    view.setUint8(blockOffset++, 0xc0); // RLE command
    view.setUint8(blockOffset++, 0x42); // Value to repeat
    view.setUint8(blockOffset++, 0x10); // Repeat 16 times
    view.setUint8(blockOffset++, 0xe0); // Block switch command
    view.setUint8(blockOffset++, 0x01); // Switch to block 1

    // Add block data for Song 1 (second block)
    blockOffset = SAV_CONSTANTS.BLOCK_START_PTR + SAV_CONSTANTS.BLOCK_SIZE;
    // Add end of song marker
    view.setUint8(blockOffset++, 0xe0); // Command
    view.setUint8(blockOffset++, 0xff); // End of song

    // Add block data for Song 2
    blockOffset = SAV_CONSTANTS.BLOCK_START_PTR + 2 * SAV_CONSTANTS.BLOCK_SIZE;
    // Add a simple song with literal data and end marker
    for (let i = 0; i < 16; i++) {
      view.setUint8(blockOffset++, i);
    }
    view.setUint8(blockOffset++, 0xe0); // Command
    view.setUint8(blockOffset++, 0xff); // End of song

    // If 64KB, duplicate the data
    if (is64kb) {
      for (let i = 0; i < SAV_CONSTANTS.SAV_FILE_SIZE / 2; i++) {
        view.setUint8(i + SAV_CONSTANTS.SAV_FILE_SIZE / 2, view.getUint8(i));
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
      expect(saveInfo.usedBlocks).toBe(3); // 2 for Song 1, 1 for Song 2
      expect(saveInfo.freeBlocks).toBe(0xbf - 3);
      expect(saveInfo.songs.length).toBe(2); // 2 songs with blocks
    });

    it('should parse basic save file information correctly (64KB)', () => {
      const saveBuffer = createMockSaveFileBuffer(true);
      const saveInfo = SaveFileProcessor.parseSaveFile(saveBuffer);

      expect(saveInfo.isValid).toBe(true);
      expect(saveInfo.is64kb).toBe(true);
      expect(saveInfo.totalBlocks).toBe(0xbf - 0x80);
      expect(saveInfo.usedBlocks).toBe(3); // 2 for Song 1, 1 for Song 2
      expect(saveInfo.freeBlocks).toBe(0xbf - 0x80 - 3);
      expect(saveInfo.songs.length).toBe(2); // 2 songs with blocks
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
      expect(freeBlocks32kb).toBe(0xbf - 3); // 3 blocks used

      const freeBlocks64kb = SaveFileProcessor.getFreeBlockCount(processor64kb);
      expect(freeBlocks64kb).toBe(0xbf - 0x80 - 3); // 3 blocks used
    });

    it('should count blocks used by a song correctly', () => {
      expect(SaveFileProcessor.getBlocksUsed(processor32kb, 0)).toBe(2); // Song 1: 2 blocks
      expect(SaveFileProcessor.getBlocksUsed(processor32kb, 1)).toBe(1); // Song 2: 1 block
      expect(SaveFileProcessor.getBlocksUsed(processor32kb, 2)).toBe(0); // No blocks
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
      expect(SaveFileProcessor.getFileName(processor32kb, 0)).toBe('SONG1');
      expect(SaveFileProcessor.getFileName(processor32kb, 1)).toBe('SONG2');
      expect(SaveFileProcessor.getFileName(processor32kb, 2)).toBe('EMPTY');
    });

    it('should get versions correctly', () => {
      expect(SaveFileProcessor.getVersion(processor32kb, 0)).toBe('01');
      expect(SaveFileProcessor.getVersion(processor32kb, 1)).toBe('02');
      expect(SaveFileProcessor.getVersion(processor32kb, 2)).toBe('00');
    });

    it('should get the active file slot', () => {
      expect(SaveFileProcessor.getActiveFileSlot(processor32kb)).toBe(0);
    });

    it('should check if songs are valid', () => {
      // Our mock songs should be valid
      expect(SaveFileProcessor.isValid(processor32kb, 0)).toBe(true);
      expect(SaveFileProcessor.isValid(processor32kb, 1)).toBe(true);
      // Empty song should not be valid
      expect(SaveFileProcessor.isValid(processor32kb, 2)).toBe(false);
    });

    it('should get song list correctly', () => {
      const songs = SaveFileProcessor.getSongList(processor32kb);
      expect(songs.length).toBe(2);

      expect(songs[0].id).toBe(0);
      expect(songs[0].name).toBe('SONG1');
      expect(songs[0].version).toBe('01');
      expect(songs[0].blocksUsed).toBe(2);
      expect(songs[0].isValid).toBe(true);

      expect(songs[1].id).toBe(1);
      expect(songs[1].name).toBe('SONG2');
      expect(songs[1].version).toBe('02');
      expect(songs[1].blocksUsed).toBe(1);
      expect(songs[1].isValid).toBe(true);
    });
  });
});
