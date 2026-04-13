import { useEffect, useRef } from 'react';
import { useRomState, useRomActions } from './RomContext';
import { useKitState, useKitActions } from './KitContext';
import { SampleBankCompiler } from '../services/audio';

/**
 * Coordinator component that handles cross-provider side effects:
 * 1. Auto-loads the first kit when a ROM is loaded
 * 2. Debounce-syncs kit changes back to ROM data
 *
 * Replaces the old kitMiddleware + setTimeout hack in romSlice.
 * Renders nothing — purely a side-effect component.
 */
export function RomKitSync() {
  const { romData, romInfo, romLoadGeneration } = useRomState();
  const { updateRomData } = useRomActions();
  const { kitInfo, samples, useGbaPolarity } = useKitState();
  const { loadKitFromRomBank } = useKitActions();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Read romData via ref in the sync effect to avoid romData → updateRomData → romData loop
  const romDataRef = useRef(romData);
  romDataRef.current = romData;

  // Auto-load first kit only when the user loads a new ROM file. Kit sync calls
  // updateRomData with a fresh ArrayBuffer, which must not reset the selected bank.
  useEffect(() => {
    if (romLoadGeneration === 0 || !romData || !romInfo?.kitBanks?.length) return;
    loadKitFromRomBank(romData, romInfo.kitBanks[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed to file load, not buffer replacement from sync
  }, [romLoadGeneration, loadKitFromRomBank]);

  // Debounced ROM sync (replaces kitMiddleware + window.__kitUpdateTimeout)
  useEffect(() => {
    if (!romDataRef.current || !kitInfo) return;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const currentRomData = romDataRef.current;
      if (!currentRomData) return;

      const updatedRomData = new ArrayBuffer(currentRomData.byteLength);
      new Uint8Array(updatedRomData).set(new Uint8Array(currentRomData));

      SampleBankCompiler.writeToRomBank(
        updatedRomData,
        kitInfo.bankIndex,
        samples,
        kitInfo.name,
        useGbaPolarity
      );

      updateRomData(updatedRomData);
    }, 100);

    return () => clearTimeout(debounceRef.current);
  // romData intentionally excluded — read via romDataRef to prevent infinite loop
  }, [kitInfo, samples, useGbaPolarity, updateRomData]);

  return null;
}
