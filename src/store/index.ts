// Export the store
export { store } from './store';

// Export the hooks
export { useAppDispatch, useAppSelector } from './hooks';

// Export types
export type { RootState, AppDispatch } from './store';

// Export actions from slices
export { loadRomFile, exportRomFile, clearRomData } from './slices/romSlice';
export { loadSaveFile, exportSong, exportSaveFile, selectSong, clearSaveFileData, removeSong, importSong } from './slices/saveFileSlice';
export {
  setActiveTab,
  openModal,
  closeModal,
  toggleMobileMenu,
  closeMobileMenu,
  addNotification,
  removeNotification,
  clearAllNotifications,
} from './slices/uiSlice';
export {
  loadKitFromRomBank,
  loadKitFromFile,
  saveKitToFile,
  addSample,
  addRecordedSample,
  saveTempSampleToKit,
  clearTempRecordedSample,
  updateTempRecordedSample,
  playSample,
  selectSample,
  selectBank,
  setHalfSpeed,
  setGbaPolarity,
  renameKit,
  updateSampleVolume,
  updateSamplePitch,
  updateSampleTrim,
  updateSampleDither,
  updateSampleName,
  clearKit,
  removeSample,
  deleteFrames,
  cropFrames,
  fadeInFrames,
  fadeOutFrames,
  revertSample,
} from './slices/kitSlice';

// Export interfaces from slices
export type { RomInfo } from './slices/romSlice';
export type { KitInfo } from './slices/kitSlice';
