import {beforeEach, describe, expect, it} from 'vitest';
import {BinaryProcessor} from '../BinaryProcessor';

describe('BinaryProcessor', () => {
  // Create a test buffer with some sample data
  const createTestBuffer = (): ArrayBuffer => {
    const buffer = new ArrayBuffer(16);
    const view = new DataView(buffer);

    // Set some test values
    view.setUint8(0, 0x12);                 // 0x12 (18 in decimal)
    view.setInt8(1, -0x12);                 // -0x12 (-18 in decimal)
    view.setUint16(2, 0x1234, true);        // 0x1234 (4660 in decimal) - little endian
    view.setInt16(4, -0x1234, true);        // -0x1234 (-4660 in decimal) - little endian
    view.setUint32(6, 0x12345678, true);    // 0x12345678 (305419896 in decimal) - little endian
    view.setInt32(10, -0x12345678, true);   // -0x12345678 (-305419896 in decimal) - little endian

    // Set a test string "ABC" + null terminator
    view.setUint8(14, 65);  // 'A'
    view.setUint8(15, 0);   // null terminator

    return buffer;
  };

  describe('constructor', () => {
    it('should create a BinaryProcessor with the given buffer', () => {
      const buffer = new ArrayBuffer(10);
      const processor = new BinaryProcessor(buffer);

      expect(processor.bufferSize).toBe(10);
    });
  });

  describe('fromUint8Array', () => {
    it('should create a BinaryProcessor from a Uint8Array', () => {
      const array = new Uint8Array([1, 2, 3, 4, 5]);
      const processor = BinaryProcessor.fromUint8Array(array);

      expect(processor.bufferSize).toBe(5);
      expect(processor.readUint8(0)).toBe(1);
      expect(processor.readUint8(4)).toBe(5);
    });
  });

  describe('read methods', () => {
    let processor: BinaryProcessor;

    beforeEach(() => {
      processor = new BinaryProcessor(createTestBuffer());
    });

    it('should read Uint8 values correctly', () => {
      expect(processor.readUint8(0)).toBe(0x12);
    });

    it('should read Int8 values correctly', () => {
      expect(processor.readInt8(1)).toBe(-0x12);
    });

    it('should read Uint16 values correctly', () => {
      expect(processor.readUint16(2)).toBe(0x1234);
    });

    it('should read Int16 values correctly', () => {
      expect(processor.readInt16(4)).toBe(-0x1234);
    });

    it('should read Uint32 values correctly', () => {
      expect(processor.readUint32(6)).toBe(0x12345678);
    });

    it('should read Int32 values correctly', () => {
      expect(processor.readInt32(10)).toBe(-0x12345678);
    });

    it('should read bytes correctly', () => {
      const bytes = processor.readBytes(0, 2);
      expect(bytes.length).toBe(2);
      expect(bytes[0]).toBe(0x12);
      expect(bytes[1]).toBe(0xEE); // -0x12 in two's complement
    });

    it('should read bytes with createCopy=false correctly', () => {
      const bytes = processor.readBytes(0, 2, false);
      expect(bytes.length).toBe(2);
      expect(bytes[0]).toBe(0x12);
      expect(bytes[1]).toBe(0xEE); // -0x12 in two's complement

      // Verify it's a view, not a copy
      const buffer = processor.readBytes(0, 16, false);
      expect(buffer.buffer).toBe(processor['dataView'].buffer);
    });

    it('should read Uint8Array correctly', () => {
      const bytes = processor.readUint8Array(0, 2);
      expect(bytes.length).toBe(2);
      expect(bytes[0]).toBe(0x12);
      expect(bytes[1]).toBe(0xEE); // -0x12 in two's complement

      // Verify it's a view, not a copy
      expect(bytes.buffer).toBe(processor['dataView'].buffer);
    });

    it('should read batch of values correctly', () => {
      const values = processor.readBatch(0, 2, 1, (offset) => processor.readUint8(offset));
      expect(values.length).toBe(2);
      expect(values[0]).toBe(0x12);
      expect(values[1]).toBe(0xEE); // -0x12 in two's complement
    });

    it('should read ASCII strings correctly', () => {
      expect(processor.readAsciiString(14, 2)).toBe('A');
    });

    it('should handle large ASCII strings correctly', () => {
      // Create a processor with a large string
      const largeBuffer = new ArrayBuffer(2048);
      const view = new DataView(largeBuffer);

      // Fill with 'A' characters (ASCII 65)
      for (let i = 0; i < 2000; i++) {
        view.setUint8(i, 65);
      }
      view.setUint8(2000, 0); // null terminator

      const largeProcessor = new BinaryProcessor(largeBuffer);

      // Test with a string larger than 1024 characters
      const largeString = largeProcessor.readAsciiString(0, 2001);
      expect(largeString.length).toBe(2000);
      expect(largeString[0]).toBe('A');
      expect(largeString[1999]).toBe('A');
    });

    it('should throw an error when reading out of bounds', () => {
      expect(() => processor.readUint8(16)).toThrow();
      expect(() => processor.readUint16(15)).toThrow();
      expect(() => processor.readUint32(13)).toThrow();
    });
  });

  describe('write methods', () => {
    let processor: BinaryProcessor;

    beforeEach(() => {
      processor = new BinaryProcessor(new ArrayBuffer(16));
    });

    it('should write and read Uint8 values correctly', () => {
      processor.writeUint8(0, 0x12);
      expect(processor.readUint8(0)).toBe(0x12);
    });

    it('should write and read Int8 values correctly', () => {
      processor.writeInt8(1, -0x12);
      expect(processor.readInt8(1)).toBe(-0x12);
    });

    it('should write and read Uint16 values correctly', () => {
      processor.writeUint16(2, 0x1234);
      expect(processor.readUint16(2)).toBe(0x1234);
    });

    it('should write and read Int16 values correctly', () => {
      processor.writeInt16(4, -0x1234);
      expect(processor.readInt16(4)).toBe(-0x1234);
    });

    it('should write and read Uint32 values correctly', () => {
      processor.writeUint32(6, 0x12345678);
      expect(processor.readUint32(6)).toBe(0x12345678);
    });

    it('should write and read Int32 values correctly', () => {
      processor.writeInt32(10, -0x12345678);
      expect(processor.readInt32(10)).toBe(-0x12345678);
    });

    it('should write and read bytes correctly', () => {
      const bytes = new Uint8Array([0x12, 0x34]);
      processor.writeBytes(0, bytes);

      const readBytes = processor.readBytes(0, 2);
      expect(readBytes.length).toBe(2);
      expect(readBytes[0]).toBe(0x12);
      expect(readBytes[1]).toBe(0x34);
    });

    it('should write and read Uint8Array correctly', () => {
      const bytes = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
      processor.writeUint8Array(0, bytes);

      const readBytes = processor.readUint8Array(0, 4);
      expect(readBytes.length).toBe(4);
      expect(readBytes[0]).toBe(0x12);
      expect(readBytes[1]).toBe(0x34);
      expect(readBytes[2]).toBe(0x56);
      expect(readBytes[3]).toBe(0x78);
    });

    it('should write batch of values correctly', () => {
      const values = [0x12, 0x34];
      processor.writeBatch(0, values, 1, (offset, value) => processor.writeUint8(offset, value));

      const readValues = processor.readBatch(0, 2, 1, (offset) => processor.readUint8(offset));
      expect(readValues.length).toBe(2);
      expect(readValues[0]).toBe(0x12);
      expect(readValues[1]).toBe(0x34);
    });

    it('should write and read ASCII strings correctly', () => {
      processor.writeAsciiString(0, 'ABC', 4);
      expect(processor.readAsciiString(0, 4)).toBe('ABC');

      // Check null termination
      const bytes = processor.readBytes(0, 4);
      expect(bytes[0]).toBe(65); // 'A'
      expect(bytes[1]).toBe(66); // 'B'
      expect(bytes[2]).toBe(67); // 'C'
      expect(bytes[3]).toBe(0);  // null terminator
    });

    it('should handle ASCII strings that fill the entire buffer', () => {
      processor.writeAsciiString(0, 'ABCD', 4, false);
      expect(processor.readAsciiString(0, 4)).toBe('ABCD');

      // No null terminator when nullTerminate is false
      const bytes = processor.readBytes(0, 4);
      expect(bytes[3]).toBe(68); // 'D'
    });

    it('should truncate ASCII strings that are too long', () => {
      processor.writeAsciiString(0, 'ABCDEFG', 4);
      expect(processor.readAsciiString(0, 4)).toBe('ABC');

      // Check null termination
      const bytes = processor.readBytes(0, 4);
      expect(bytes[3]).toBe(0);  // null terminator
    });

    it('should throw an error when writing out of bounds', () => {
      expect(() => processor.writeUint8(16, 0)).toThrow();
      expect(() => processor.writeUint16(15, 0)).toThrow();
      expect(() => processor.writeUint32(13, 0)).toThrow();
    });
  });
});
