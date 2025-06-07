/**
 * Utility functions for working with audio samples
 */

/**
 * Converts sample data from Int16Array to Uint8Array of packed nibbles for waveform visualization
 * 
 * @param sampleData - The sample data as an Int16Array
 * @returns Uint8Array of packed nibbles for visualization
 */
export function convertSampleDataForWaveform(sampleData: Int16Array): Uint8Array {
  const packedData = new Uint8Array(Math.ceil(sampleData.length / 2));

  for (let i = 0; i < packedData.length; i++) {
    // Get two samples and convert them to 4-bit values (0-15)
    const sample1 = i * 2 < sampleData.length ? sampleData[i * 2] : 0;
    const sample2 = i * 2 + 1 < sampleData.length ? sampleData[i * 2 + 1] : 0;

    // Normalize from -32768..32767 to 0..15
    const nibble1 = Math.max(0, Math.min(15, Math.floor((sample1 + 32768) / 4096)));
    const nibble2 = Math.max(0, Math.min(15, Math.floor((sample2 + 32768) / 4096)));

    // Pack the two 4-bit values into one byte
    packedData[i] = (nibble1 << 4) | nibble2;
  }

  return packedData;
}

/**
 * Calculates the duration of a sample in seconds
 * 
 * @param sampleLength - The length of the sample in samples
 * @param isHalfSpeed - Whether half-speed mode is enabled
 * @returns The duration in seconds
 */
export function calculateSampleDuration(sampleLength: number, isHalfSpeed: boolean): number {
  const sampleRate = isHalfSpeed ? 5734 : 11468;
  return sampleLength / (sampleRate * 2);
}

/**
 * Sanitizes input for LSDj compatibility
 * 
 * @param input - The input string to sanitize
 * @returns The sanitized string
 */
export function sanitizeLSDJInput(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9 -]/g, '');
}