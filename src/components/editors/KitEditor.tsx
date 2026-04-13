import React, { useCallback, useEffect, useState } from 'react';
import { useRomState } from '../../context/RomContext';
import { useKitState, useKitActions } from '../../context/KitContext';
import { SampleEditor } from './SampleEditor';
import { BankNameSelector } from '../common/BankNameSelector';
import { CustomCheckbox } from '../common';
import './KitEditor.css';

export function KitEditor() {
  const { romData, romInfo } = useRomState();
  const {
    kitInfo, samples, selectedSampleIndex, selectedBankIndex,
    isHalfSpeed, useGbaPolarity, isLoading, error,
  } = useKitState();
  const {
    selectSample, selectBank, setHalfSpeed, setGbaPolarity,
    renameKit, clearKit, playSample, addSample,
    loadKitFromFile, loadKitFromRomBank, saveKitToFile,
  } = useKitActions();

  const [kitName, setKitName] = useState('');
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    if (kitInfo) {
      setKitName(kitInfo.name);
    } else {
      setKitName('');
    }
  }, [kitInfo]);

  const handleLoadKitFromFile = useCallback(() => {
    if (romData) loadKitFromFile(romData);
  }, [loadKitFromFile, romData]);

  const handleSaveKitToFile = useCallback(() => {
    if (romData) saveKitToFile(romData);
  }, [saveKitToFile, romData]);

  const handleAddSample = useCallback(() => {
    addSample();
  }, [addSample]);

  const handleSelectSample = useCallback((index: number | null) => {
    selectSample(index);
    if (index !== null) {
      playSample(index);
    }
  }, [selectSample, playSample]);

  const handleSelectBank = useCallback((index: number) => {
    selectBank(index);
    if (romData) {
      loadKitFromRomBank(romData, index);
    }
  }, [selectBank, loadKitFromRomBank, romData]);

  const handleToggleHalfSpeed = useCallback(() => {
    setHalfSpeed(!isHalfSpeed);
  }, [setHalfSpeed, isHalfSpeed]);

  const handleToggleGbaPolarity = useCallback(() => {
    setGbaPolarity(!useGbaPolarity);
  }, [setGbaPolarity, useGbaPolarity]);

  const sanitizeLSDJInput = (input: string): string => {
    return input.toUpperCase().replace(/[^A-Z0-9 -]/g, '');
  };

  const handleRenameKit = useCallback((newName: string) => {
    const sanitizedName = sanitizeLSDJInput(newName);
    setKitName(sanitizedName);
    renameKit(sanitizedName);
  }, [renameKit]);

  const handleClearKit = useCallback(() => {
    if (window.confirm('Are you sure you want to clear this kit?')) {
      clearKit();
    }
  }, [clearKit]);

  const renderSampleGrid = () => {
    return (
      <div className="sample-grid" role="grid" aria-label="Sample grid">
        {Array.from({ length: 15 }).map((_, index) => {
          const sample = samples[index];
          const isEmpty = !sample;
          const name = sample ? sample.getName() : '-';

          return (
            <button
              key={index}
              className={`sample-pad ${selectedSampleIndex === index ? 'selected' : ''} ${isEmpty ? 'empty' : ''}`}
              onClick={() => handleSelectSample(index)}
              disabled={isLoading}
              aria-selected={selectedSampleIndex === index}
              aria-label={`Sample ${index + 1}: ${name}`}
            >
              <span className="pad-index">{index.toString(16).toUpperCase()}</span>
              <span className="pad-name">{name}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderKitInfo = () => {
    if (!kitInfo) return null;

    const { bytesFree, totalSampleSizeInBytes } = kitInfo;
    const totalSpace = totalSampleSizeInBytes + bytesFree;
    const usedPercentage = Math.round((totalSampleSizeInBytes / totalSpace) * 100);

    const sampleRate = isHalfSpeed ? 5734 : 11468;
    const timeFree = (bytesFree * 2) / sampleRate;

    return (
      <div className="kit-info" role="region" aria-label="Kit information">
        <div className="kit-size">
          <div
            className={`memory-bar ${usedPercentage > 90 ? 'memory-bar-warning' : ''}`}
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
            <span>{timeFree.toFixed(3)}s free</span>
            <span>{usedPercentage}% — {(totalSampleSizeInBytes / 1024).toFixed(1)}KB / {(totalSpace / 1024).toFixed(1)}KB</span>
          </div>
        </div>
      </div>
    );
  };

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
        <div className="control-group-file">
          <button
            onClick={handleLoadKitFromFile}
            disabled={!romData || isLoading || !Array.isArray(romInfo?.kitBanks) || romInfo?.kitBanks.length === 0}
            aria-busy={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load Kit'}
          </button>
          <button
            onClick={handleSaveKitToFile}
            disabled={!kitInfo || isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Kit'}
          </button>
        </div>
        <div className="control-group-kit">
          <button
            onClick={handleAddSample}
            disabled={!kitInfo || isLoading || samples.every(s => s !== null)}
          >
            Add Sample
          </button>
          <button
            className="btn-danger"
            onClick={handleClearKit}
            disabled={!kitInfo || isLoading}
          >
            Clear
          </button>
        </div>
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
                <CustomCheckbox
                  id="half-speed"
                  label="Half-speed"
                  checked={isHalfSpeed}
                  onChange={handleToggleHalfSpeed}
                  disabled={isLoading}
                />
                <CustomCheckbox
                  id="gba-polarity"
                  label="Invert Polarity for GBA"
                  checked={useGbaPolarity}
                  onChange={handleToggleGbaPolarity}
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          {renderKitInfo()}
          {renderSampleGrid()}
          <SampleEditor
            selectedSampleIndex={selectedSampleIndex}
            samples={samples}
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
