import { useEffect, useRef } from 'react';
import { useRom } from './RomContext';
import { useKit } from './KitContext';
import { SampleBankCompiler } from '../services/audio';
import { serializedToSample } from '../utils/sample-serialization';

/**
 * Coordinator component that handles cross-provider side effects:
 * 1. Auto-loads the first kit when a ROM is loaded
 * 2. Debounce-syncs kit changes back to ROM data
 *
 * Replaces the old kitMiddleware + setTimeout hack in romSlice.
 * Renders nothing — purely a side-effect component.
 */
export function RomKitSync() {
  const { romData, romInfo, updateRomData } = useRom();
  const { kitInfo, samples, useGbaPolarity, loadKitFromRomBank } = useKit();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const prevRomDataRef = useRef<ArrayBuffer | null>(null);
  // Read romData via ref in the sync effect to avoid romData → updateRomData → romData loop
  const romDataRef = useRef(romData);
  romDataRef.current = romData;

  // Auto-load first kit when ROM loads (replaces setTimeout hack in romSlice)
  useEffect(() => {
    // Only trigger when romData actually changes (new ROM loaded)
    if (romData && romData !== prevRomDataRef.current && romInfo?.kitBanks?.length) {
      loadKitFromRomBank(romData, romInfo.kitBanks[0]);
    }
    prevRomDataRef.current = romData;
  }, [romData, romInfo, loadKitFromRomBank]);

  // Debounced ROM sync (replaces kitMiddleware + window.__kitUpdateTimeout)
  useEffect(() => {
    if (!romDataRef.current || !kitInfo) return;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const currentRomData = romDataRef.current;
      if (!currentRomData) return;

      const sampleInstances = samples.map(s => s ? serializedToSample(s) : null);

      const updatedRomData = new ArrayBuffer(currentRomData.byteLength);
      new Uint8Array(updatedRomData).set(new Uint8Array(currentRomData));

      SampleBankCompiler.writeToRomBank(
        updatedRomData,
        kitInfo.bankIndex,
        sampleInstances,
        kitInfo.name,
        useGbaPolarity
      );

      updateRomData(updatedRomData);
    }, 100);

    return () => clearTimeout(debounceRef.current);
  // romData intentionally excluded — read via romDataRef to prevent infinite loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kitInfo, samples, useGbaPolarity, updateRomData]);

  return null;
}
