/**
 * BinaryProcessor.ts
 * 
 * Provides utilities for handling binary data in the LSDPatcher web application.
 * This class offers methods for reading and writing different data types from/to
 * ArrayBuffer objects, which are used to represent binary data in JavaScript.
 */

export class BinaryProcessor {
  private dataView: DataView;
  private littleEndian: boolean;

  /**
   * Creates a new BinaryProcessor instance
   * 
   * @param buffer - The ArrayBuffer to process
   * @param littleEndian - Whether to use little-endian byte order (default: true)
   */
  constructor(buffer: ArrayBuffer, littleEndian: boolean = true) {
    this.dataView = new DataView(buffer);
    this.littleEndian = littleEndian;
  }

  /**
   * Gets the size of the underlying buffer in bytes
   */
  public get bufferSize(): number {
    return this.dataView.byteLength;
  }

  /**
   * Creates a new BinaryProcessor from a Uint8Array
   * 
   * @param array - The Uint8Array to create the processor from
   * @param littleEndian - Whether to use little-endian byte order
   * @returns A new BinaryProcessor instance
   */
  public static fromUint8Array(array: Uint8Array, littleEndian: boolean = true): BinaryProcessor {
    // Create a new ArrayBuffer from the Uint8Array data
    const newBuffer = new ArrayBuffer(array.byteLength);
    new Uint8Array(newBuffer).set(array);
    return new BinaryProcessor(newBuffer, littleEndian);
  }

  /**
   * Reads an unsigned 8-bit integer from the buffer
   * 
   * @param offset - The byte offset to read from
   * @returns The read value
   */
  public readUint8(offset: number): number {
    this.validateOffset(offset, 1);
    return this.dataView.getUint8(offset);
  }

  /**
   * Reads a signed 8-bit integer from the buffer
   * 
   * @param offset - The byte offset to read from
   * @returns The read value
   */
  public readInt8(offset: number): number {
    this.validateOffset(offset, 1);
    return this.dataView.getInt8(offset);
  }

  /**
   * Reads an unsigned 16-bit integer from the buffer
   * 
   * @param offset - The byte offset to read from
   * @returns The read value
   */
  public readUint16(offset: number): number {
    this.validateOffset(offset, 2);
    return this.dataView.getUint16(offset, this.littleEndian);
  }

  /**
   * Reads a signed 16-bit integer from the buffer
   * 
   * @param offset - The byte offset to read from
   * @returns The read value
   */
  public readInt16(offset: number): number {
    this.validateOffset(offset, 2);
    return this.dataView.getInt16(offset, this.littleEndian);
  }

  /**
   * Reads an unsigned 32-bit integer from the buffer
   * 
   * @param offset - The byte offset to read from
   * @returns The read value
   */
  public readUint32(offset: number): number {
    this.validateOffset(offset, 4);
    return this.dataView.getUint32(offset, this.littleEndian);
  }

  /**
   * Reads a signed 32-bit integer from the buffer
   * 
   * @param offset - The byte offset to read from
   * @returns The read value
   */
  public readInt32(offset: number): number {
    this.validateOffset(offset, 4);
    return this.dataView.getInt32(offset, this.littleEndian);
  }

  /**
   * Writes an unsigned 8-bit integer to the buffer
   * 
   * @param offset - The byte offset to write to
   * @param value - The value to write
   */
  public writeUint8(offset: number, value: number): void {
    this.validateOffset(offset, 1);
    this.dataView.setUint8(offset, value);
  }

  /**
   * Writes a signed 8-bit integer to the buffer
   * 
   * @param offset - The byte offset to write to
   * @param value - The value to write
   */
  public writeInt8(offset: number, value: number): void {
    this.validateOffset(offset, 1);
    this.dataView.setInt8(offset, value);
  }

  /**
   * Writes an unsigned 16-bit integer to the buffer
   * 
   * @param offset - The byte offset to write to
   * @param value - The value to write
   */
  public writeUint16(offset: number, value: number): void {
    this.validateOffset(offset, 2);
    this.dataView.setUint16(offset, value, this.littleEndian);
  }

  /**
   * Writes a signed 16-bit integer to the buffer
   * 
   * @param offset - The byte offset to write to
   * @param value - The value to write
   */
  public writeInt16(offset: number, value: number): void {
    this.validateOffset(offset, 2);
    this.dataView.setInt16(offset, value, this.littleEndian);
  }

  /**
   * Writes an unsigned 32-bit integer to the buffer
   * 
   * @param offset - The byte offset to write to
   * @param value - The value to write
   */
  public writeUint32(offset: number, value: number): void {
    this.validateOffset(offset, 4);
    this.dataView.setUint32(offset, value, this.littleEndian);
  }

  /**
   * Writes a signed 32-bit integer to the buffer
   * 
   * @param offset - The byte offset to write to
   * @param value - The value to write
   */
  public writeInt32(offset: number, value: number): void {
    this.validateOffset(offset, 4);
    this.dataView.setInt32(offset, value, this.littleEndian);
  }

  /**
   * Reads a sequence of bytes from the buffer
   * 
   * @param offset - The byte offset to read from
   * @param length - The number of bytes to read
   * @param createCopy - Whether to create a copy of the data (default: true)
   * @returns A Uint8Array containing the read bytes
   */
  public readBytes(offset: number, length: number, createCopy: boolean = true): Uint8Array {
    this.validateOffset(offset, length);

    if (createCopy) {
      // Create a copy of the data (safer but slower)
      return new Uint8Array(this.dataView.buffer.slice(offset, offset + length));
    } else {
      // Create a view of the data (faster but requires careful handling)
      return new Uint8Array(this.dataView.buffer, offset, length);
    }
  }

  /**
   * Writes a sequence of bytes to the buffer
   * 
   * @param offset - The byte offset to write to
   * @param bytes - The bytes to write
   */
  public writeBytes(offset: number, bytes: Uint8Array): void {
    this.validateOffset(offset, bytes.length);
    const targetArray = new Uint8Array(this.dataView.buffer);
    targetArray.set(bytes, offset);
  }

  /**
   * Reads a null-terminated ASCII string from the buffer
   * 
   * @param offset - The byte offset to read from
   * @param maxLength - The maximum number of bytes to read
   * @returns The read string
   */
  public readAsciiString(offset: number, maxLength: number): string {
    this.validateOffset(offset, maxLength);

    // Use a direct view of the buffer for better performance
    const bytes = new Uint8Array(this.dataView.buffer, offset, maxLength);

    // Find the null terminator or use maxLength
    let endIndex = bytes.findIndex(byte => byte === 0);
    if (endIndex === -1) {
      endIndex = maxLength;
    }

    // For small strings, use spread operator (faster for small arrays)
    if (endIndex < 1024) {
      return String.fromCharCode(...bytes.slice(0, endIndex));
    } 

    // For larger strings, use a loop to avoid call stack size limits
    let result = '';
    for (let i = 0; i < endIndex; i++) {
      result += String.fromCharCode(bytes[i]);
    }
    return result;
  }

  /**
   * Writes an ASCII string to the buffer
   * 
   * @param offset - The byte offset to write to
   * @param str - The string to write
   * @param maxLength - The maximum number of bytes to write
   * @param nullTerminate - Whether to null-terminate the string (default: true)
   */
  public writeAsciiString(offset: number, str: string, maxLength: number, nullTerminate: boolean = true): void {
    this.validateOffset(offset, maxLength);

    const targetArray = new Uint8Array(this.dataView.buffer);
    const writeLength = Math.min(str.length, nullTerminate ? maxLength - 1 : maxLength);

    for (let i = 0; i < writeLength; i++) {
      targetArray[offset + i] = str.charCodeAt(i);
    }

    if (nullTerminate && writeLength < maxLength) {
      targetArray[offset + writeLength] = 0;
    }
  }

  /**
   * Validates that the given offset and size are within the buffer bounds
   * 
   * @param offset - The byte offset to validate
   * @param size - The size in bytes to validate
   * @throws Error if the offset and size are out of bounds
   */
  private validateOffset(offset: number, size: number): void {
    if (offset < 0 || offset + size > this.dataView.byteLength) {
      throw new Error(`Buffer access out of bounds: offset=${offset}, size=${size}, bufferSize=${this.dataView.byteLength}`);
    }
  }

  /**
   * Reads multiple uint8 values in sequence
   * 
   * @param startOffset - The starting byte offset
   * @param count - The number of values to read
   * @returns An array of read values
   */
  public readUint8Array(startOffset: number, count: number): Uint8Array {
    this.validateOffset(startOffset, count);
    return new Uint8Array(this.dataView.buffer, startOffset, count);
  }

  /**
   * Writes multiple uint8 values in sequence
   * 
   * @param startOffset - The starting byte offset
   * @param values - The values to write
   */
  public writeUint8Array(startOffset: number, values: Uint8Array): void {
    this.validateOffset(startOffset, values.length);
    const targetArray = new Uint8Array(this.dataView.buffer);
    targetArray.set(values, startOffset);
  }

  /**
   * Reads multiple values in sequence with a custom reader function
   * 
   * @param startOffset - The starting byte offset
   * @param count - The number of values to read
   * @param bytesPerValue - The number of bytes per value
   * @param readerFn - The function to read each value
   * @returns An array of read values
   */
  public readBatch<T>(
    startOffset: number, 
    count: number, 
    bytesPerValue: number, 
    readerFn: (offset: number) => T
  ): T[] {
    const totalSize = count * bytesPerValue;
    this.validateOffset(startOffset, totalSize);

    const result: T[] = new Array(count);
    let offset = startOffset;

    for (let i = 0; i < count; i++) {
      result[i] = readerFn(offset);
      offset += bytesPerValue;
    }

    return result;
  }

  /**
   * Writes multiple values in sequence with a custom writer function
   * 
   * @param startOffset - The starting byte offset
   * @param values - The values to write
   * @param bytesPerValue - The number of bytes per value
   * @param writerFn - The function to write each value
   */
  public writeBatch<T>(
    startOffset: number, 
    values: T[], 
    bytesPerValue: number, 
    writerFn: (offset: number, value: T) => void
  ): void {
    const totalSize = values.length * bytesPerValue;
    this.validateOffset(startOffset, totalSize);

    let offset = startOffset;

    for (let i = 0; i < values.length; i++) {
      writerFn(offset, values[i]);
      offset += bytesPerValue;
    }
  }
}
