import React, { useCallback, useEffect, useState } from 'react';
import { 
  useAppDispatch, 
  useAppSelector, 
  loadKitFromFile, 
  loadKitFromRomBank,
  saveKitToFile, 
  addSample, 
  selectSample, 
  selectBank, 
  setHalfSpeed, 
  setGbaPolarity, 
  renameKit, 
  clearKit,
  playSample
} from '../../store';
import { SampleEditor } from './SampleEditor';
import { BankNameSelector } from '../common/BankNameSelector';
import { Sample } from '../../services/audio';
import './KitEditor.css';

export function KitEditor() {
  const dispatch = useAppDispatch();

  // Select state from Redux store
  const romData = useAppSelector(state => state.rom.romData);
  const romInfo = useAppSelector(state => state.rom.romInfo);
  const kitInfo = useAppSelector(state => state.kit.kitInfo);
  const samples = useAppSelector(state => state.kit.samples);
  const selectedSampleIndex = useAppSelector(state => state.kit.selectedSampleIndex);
  const selectedBankIndex = useAppSelector(state => state.kit.selectedBankIndex);
  const isHalfSpeed = useAppSelector(state => state.kit.isHalfSpeed);
  const useGbaPolarity = useAppSelector(state => state.kit.useGbaPolarity);
  const isLoading = useAppSelector(state => state.kit.isLoading);
  const error = useAppSelector(state => state.kit.error);

  // Local state for editable fields
  const [kitName, setKitName] = useState('');
  const [showPreferences, setShowPreferences] = useState(false);

  // Update local state when kit info changes
  useEffect(() => {
    if (kitInfo) {
      // Directly update state without triggering rename action
      setKitName(kitInfo.name);
    } else {
      setKitName('');
    }
  }, [kitInfo]);


  // Handler for loading a kit from a file
  const handleLoadKitFromFile = useCallback(() => {
    dispatch(loadKitFromFile());
  }, [dispatch]);

  // Handler for saving a kit to a file
  const handleSaveKitToFile = useCallback(() => {
    dispatch(saveKitToFile());
  }, [dispatch]);

  // Handler for adding a sample
  const handleAddSample = useCallback(() => {
    dispatch(addSample());
  }, [dispatch]);

  // Handler for selecting a sample
  const handleSelectSample = useCallback((index: number | null) => {
    dispatch(selectSample(index));

    // Play the sample when it's selected
    if (index !== null) {
      dispatch(playSample(index));
    }
  }, [dispatch]);

  // Handler for selecting a bank
  const handleSelectBank = useCallback((index: number) => {
    dispatch(selectBank(index));

    // Load the kit from the selected bank if ROM data is available
    if (romData) {
      dispatch(loadKitFromRomBank({ romData, bankIndex: index }));
    }
  }, [dispatch, romData]);

  // Handler for toggling half-speed mode
  const handleToggleHalfSpeed = useCallback(() => {
    dispatch(setHalfSpeed(!isHalfSpeed));
  }, [dispatch, isHalfSpeed]);

  // Handler for toggling GBA polarity
  const handleToggleGbaPolarity = useCallback(() => {
    dispatch(setGbaPolarity(!useGbaPolarity));
  }, [dispatch, useGbaPolarity]);

  // Function to sanitize input for LSDj compatibility
  const sanitizeLSDJInput = (input: string): string => {
    return input.toUpperCase().replace(/[^A-Z0-9 -]/g, '');
  };

  // Handler for renaming a kit - now automatically called when input changes
  const handleRenameKit = useCallback((newName: string) => {
    const sanitizedName = sanitizeLSDJInput(newName);
    setKitName(sanitizedName);
    dispatch(renameKit(sanitizedName));
  }, [dispatch]);

  // Handler for clearing a kit
  const handleClearKit = useCallback(() => {
    if (window.confirm('Are you sure you want to clear this kit?')) {
      dispatch(clearKit());
    }
  }, [dispatch]);


  // Render the sample grid
  const renderSampleGrid = () => {
    return (
      <div className="sample-grid" role="grid" aria-label="Sample grid">
        {Array.from({ length: 15 }).map((_, index) => {
          const sample = samples[index];
          const name = sample ? sample.getName() : '-';

          return (
            <button
              key={index}
              className={`sample-pad ${selectedSampleIndex === index ? 'selected' : ''}`}
              onClick={() => {
                handleSelectSample(index);
              }}
              disabled={isLoading}
              aria-selected={selectedSampleIndex === index}
              aria-label={`Sample ${index + 1}: ${name}`}
            >
              {name}
            </button>
          );
        })}
      </div>
    );
  };

  // Render the kit info
  const renderKitInfo = () => {
    if (!kitInfo) return null;

    const { bytesFree, totalSampleSizeInBytes } = kitInfo;
    const totalSpace = totalSampleSizeInBytes + bytesFree;
    const usedPercentage = Math.round((totalSampleSizeInBytes / totalSpace) * 100);

    // Calculate time free
    const sampleRate = isHalfSpeed ? 5734 : 11468;
    const timeFree = (bytesFree * 2) / sampleRate;

    return (
      <div className="kit-info" role="region" aria-label="Kit information">
        <div className="kit-size">
          <div 
            className="memory-bar" 
            role="progressbar" 
            aria-valuenow={usedPercentage} 
            aria-valuemin={0} 
            aria-valuemax={100}
          >
            <div 
              className="memory-bar-used" 
              style={{ width: `${usedPercentage}%` }}
              title={`${totalSampleSizeInBytes} bytes used (${usedPercentage}%)`}
            />
          </div>
          <div className="memory-stats">
            <span>{timeFree.toFixed(3)} seconds free</span>
          </div>
        </div>
      </div>
    );
  };


  // Render a message if no ROM is loaded
  if (!romData || !romInfo?.kitBanks?.length) {
    return (
      <div className="kit-editor-empty">
        <p>Please load a ROM file with kit data to use the Kit Editor.</p>
      </div>
    );
  }

  return (
    <div className="kit-editor" role="region" aria-label="Kit Editor">

      <div className="controls" role="toolbar" aria-label="Kit editor controls">
        <button
          onClick={handleLoadKitFromFile}
          disabled={!romData || isLoading || !Array.isArray(romInfo?.kitBanks) || romInfo?.kitBanks.length === 0}
          aria-busy={isLoading}
        >
          {isLoading ? 'Loading...' : 'Load'}
        </button>
        <button
          onClick={handleSaveKitToFile}
          disabled={!kitInfo || isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleClearKit}
          disabled={!kitInfo || isLoading}
        >
          Clear
        </button>
        <button
          onClick={handleAddSample}
          disabled={!kitInfo || isLoading || samples.every((s: Sample | null) => s !== null)}
        >
          Add Sample
        </button>
      </div>


      {error && (
        <div 
          className="error-message"
          role="alert" 
          aria-live="assertive"
        >
          {error}
        </div>
      )}

      {kitInfo && (
        <>
          <div className="bank-kit-header">
            <BankNameSelector
              bankNumber={selectedBankIndex}
              kitName={kitName}
              onBankChange={handleSelectBank}
              onNameChange={handleRenameKit}
              availableBanks={romInfo?.kitBanks || []}
              kitNames={romInfo?.kitNames || {}}
              disabled={isLoading}
              maxNameLength={6}
            />
            <button 
              className={`preferences-icon ${showPreferences ? 'active' : ''}`}
              onClick={() => setShowPreferences(!showPreferences)}
              aria-expanded={showPreferences}
              aria-controls="preferences-panel"
              aria-label={showPreferences ? "Hide preferences" : "Show preferences"}
              title={showPreferences ? "Hide preferences" : "Show preferences"}
            >
              <svg
                className="preferences-svg-icon"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M10 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" fill={"var(--gb-lightest)"}/>
                <path d="M19 8h-1.26a8 8 0 0 0-.82-2l.89-.89a1 1 0 0 0 0-1.41l-1.4-1.4a1 1 0 0 0-1.42 0l-.89.89A7.92 7.92 0 0 0 12 2.29V1a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v1.29a8 8 0 0 0-2.06.82l-.89-.89a1 1 0 0 0-1.41 0l-1.42 1.4a1 1 0 0 0 0 1.42l.89.89a8 8 0 0 0-.82 2.05H1a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1.29a8 8 0 0 0 .82 2.05l-.89.89a1 1 0 0 0 0 1.41l1.4 1.4a1 1 0 0 0 1.42 0l.89-.89a8 8 0 0 0 2.06.82V19a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-1.29a7.92 7.92 0 0 0 2.06-.82l.89.89a1 1 0 0 0 1.41 0l1.4-1.4a1 1 0 0 0 0-1.42l-.89-.89a8 8 0 0 0 .82-2.05H19a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1zm-9 7a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" fill={"var(--gb-lightest)"}/>
              </svg>
            </button>
          </div>

          {showPreferences && (
            <div className="preferences-container" role="group" aria-label="Preferences">
              <div id="preferences-panel" className="preferences-panel">
                <label>
                  <input
                    type="checkbox"
                    checked={isHalfSpeed}
                    onChange={handleToggleHalfSpeed}
                    disabled={isLoading}
                  />
                  Half-speed
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={useGbaPolarity}
                    onChange={handleToggleGbaPolarity}
                    disabled={isLoading}
                  />
                  Invert Polarity for GBA
                </label>
              </div>
            </div>
          )}

          {renderKitInfo()}
          {renderSampleGrid()}
          <SampleEditor 
            selectedSampleIndex={selectedSampleIndex}
            samples={samples.filter((sample: Sample | null): sample is Sample => sample !== null)}
            isHalfSpeed={isHalfSpeed}
            isLoading={isLoading}
          />
        </>
      )}

      {!kitInfo && !isLoading && !error && (
        <p aria-live="polite">
          {romData && romInfo?.kitBanks?.length === 0 
            ? "This ROM does not contain any kit banks. Please load a ROM with kit banks."
            : "Please load a ROM file with kit data to use the Kit Editor."}
        </p>
      )}
    </div>
  );
}
