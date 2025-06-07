import {useState} from 'react';
import {loadRomFile, exportRomFile, useAppDispatch, useAppSelector} from '../../store';
import './RomInfoDisplay.css';

/**
 * Component for displaying ROM file information
 * This is a minimal UI to demonstrate file loading and basic ROM information display
 */
export function RomInfoDisplay() {
  const dispatch = useAppDispatch();
  const romInfo = useAppSelector(state => state.rom.romInfo);
  const isLoading = useAppSelector(state => state.rom.isLoading);
  const error = useAppSelector(state => state.rom.error);
  const [isExpanded, setIsExpanded] = useState(false);

  /**
   * Handle file selection and load ROM information
   */
  async function handleFileSelect() {
    dispatch(loadRomFile());
  }

  /**
   * Handle export button click and export ROM file
   */
  async function handleExportRom() {
    dispatch(exportRomFile());
  }

  /**
   * Toggle the expanded state of the ROM info table
   */
  function handleToggleExpand() {
    setIsExpanded(!isExpanded);
  }

  // Generate unique IDs for headings
  const mainHeadingId = `rom-info-heading-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="rom-info-container" role="region" aria-labelledby={mainHeadingId}>

      <div className="button-container">
        <button 
          onClick={handleFileSelect}
          disabled={isLoading}
          className="file-select-button"
          aria-label="Select ROM file to analyze"
          aria-busy={isLoading}
        >
          {isLoading ? 'Loading...' : 'Select ROM File'}
        </button>

        {romInfo && (
          <button 
            onClick={handleExportRom}
            disabled={isLoading}
            className="file-export-button"
            aria-label="Export ROM file"
            aria-busy={isLoading}
          >
            {isLoading ? 'Exporting...' : 'Export ROM File'}
          </button>
        )}
      </div>

      {error && (
        <div className="error-message" role="alert" aria-live="assertive">
          Error: {error}
        </div>
      )}

      {romInfo && (
        <div className="rom-info" role="region" aria-label="ROM file details">
          <div className="rom-info-header">
            <h2 id="rom-title">{romInfo.title}</h2>
            <button 
              className={`gfx-toggle-icon ${isExpanded ? 'active' : ''}`}
              onClick={handleToggleExpand}
              aria-pressed={isExpanded}
              aria-label={isExpanded ? "Hide details" : "Show details"}
              title={isExpanded ? "Hide details" : "Show details"}
            >
              <svg
                className="gfx-toggle-svg-icon"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 14a6 6 0 1 1 0-12 6 6 0 0 1 0 12z" fill="currentColor"/>
                <path d="M10 6a1 1 0 0 0-1 1v2H7a1 1 0 0 0 0 2h2v2a1 1 0 0 0 2 0v-2h2a1 1 0 0 0 0-2h-2V7a1 1 0 0 0-1-1z" fill="currentColor"/>
              </svg>
            </button>
          </div>

          {isExpanded && (
            <table className="rom-info-table" aria-labelledby="rom-title">
              <tbody>
                <tr>
                  <th scope="row">Version:</th>
                  <td>{romInfo.version}</td>
                </tr>
                <tr>
                  <th scope="row">Size:</th>
                  <td>{(romInfo.size / 1024).toFixed(2)} KB</td>
                </tr>
                <tr>
                  <th scope="row">Banks:</th>
                  <td>{romInfo.banks}</td>
                </tr>
                <tr>
                  <th scope="row">Has Palettes:</th>
                  <td>{romInfo.hasPalettes ? 'Yes' : 'No'}</td>
                </tr>
                <tr>
                  <th scope="row">Has Fonts:</th>
                  <td>{romInfo.hasFonts ? 'Yes' : 'No'}</td>
                </tr>
                <tr>
                  <th scope="row">Valid ROM:</th>
                  <td>{romInfo.isValid ? 'Yes' : 'No'}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}

    </div>
  );
}
