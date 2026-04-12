import {useCallback} from 'react';
import {useSaveFile} from '../../context/SaveFileContext';
import {SongInfo} from '../../services/binary/SaveFileProcessor';
import './SongManager.css';

export function SongManager() {
  const { saveFileInfo, isLoading, error, selectedSongId,
          loadSaveFile, exportSong, removeSong, exportSaveFile, importSong, selectSong } = useSaveFile();

  const handleRemoveSong = useCallback((songId: number) => {
    if (window.confirm(`Are you sure you want to remove song ${songId}?`)) {
      removeSong(songId);
    }
  }, [removeSong]);

  const renderMemoryUsage = () => {
    if (!saveFileInfo) return null;

    const { totalBlocks, usedBlocks, freeBlocks } = saveFileInfo;
    const usedPercentage = Math.round((usedBlocks / totalBlocks) * 100);
    const memoryBarId = `memory-bar-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="memory-usage" role="region" aria-labelledby="memory-usage-title">
        <h3 id="memory-usage-title">Memory Usage</h3>
        <div
          className="memory-bar"
          role="progressbar"
          aria-valuenow={usedPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-labelledby={memoryBarId}
        >
          <div
            className="memory-bar-used"
            style={{ width: `${usedPercentage}%` }}
            title={`${usedBlocks} blocks used (${usedPercentage}%)`}
          />
          <span id={memoryBarId} className="sr-only">
            {usedPercentage}% of memory used
          </span>
        </div>
        <div className="memory-stats" role="group" aria-label="Memory statistics">
          <span>Used: {usedBlocks} blocks ({usedPercentage}%)</span>
          <span>Free: {freeBlocks} blocks ({100 - usedPercentage}%)</span>
          <span>Total: {totalBlocks} blocks</span>
        </div>
      </div>
    );
  };

  const renderSongList = () => {
    if (!saveFileInfo || saveFileInfo.songs.length === 0) {
      return <p>No songs found in this save file.</p>;
    }

    const songListId = `song-list-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="song-list" role="region" aria-labelledby={songListId}>
        <h3 id={songListId}>Songs ({saveFileInfo.songs.length})</h3>
        <table role="grid" aria-label="Song list">
          <thead>
            <tr role="row">
              <th role="columnheader" scope="col">ID</th>
              <th role="columnheader" scope="col">Name</th>
              <th role="columnheader" scope="col">Version</th>
              <th role="columnheader" scope="col">Blocks</th>
              <th role="columnheader" scope="col">Status</th>
              <th role="columnheader" scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {saveFileInfo.songs.map((song: SongInfo) => (
              <tr
                key={song.id}
                className={selectedSongId === song.id ? 'selected' : ''}
                onClick={() => selectSong(song.id)}
                role="row"
                aria-selected={selectedSongId === song.id}
                tabIndex={selectedSongId === song.id ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    selectSong(song.id);
                    e.preventDefault();
                  }
                }}
              >
                <td role="gridcell">{song.id}</td>
                <td role="gridcell">{song.name || '<unnamed>'}</td>
                <td role="gridcell">{song.version}</td>
                <td role="gridcell">{song.blocksUsed}</td>
                <td role="gridcell">{song.isValid ? 'Valid' : 'Invalid'}</td>
                <td role="gridcell">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportSong(song.id);
                    }}
                    disabled={!song.isValid || isLoading}
                    aria-label={`Export song ${song.name || 'untitled'}`}
                  >
                    Export
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveSong(song.id);
                    }}
                    disabled={isLoading}
                    aria-label={`Remove song ${song.name || 'untitled'}`}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="song-manager" role="region" aria-label="Song Manager">

      <div className="controls" role="toolbar" aria-label="Song manager controls">
        <button
          onClick={loadSaveFile}
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? 'Loading...' : 'Load Save'}
        </button>
        {saveFileInfo && (
          <>
            <button
              onClick={exportSaveFile}
              disabled={isLoading}
              aria-busy={isLoading}
              aria-label="Export Save File"
            >
              {isLoading ? 'Exporting...' : 'Export Save'}
            </button>
            <button
              onClick={importSong}
              disabled={isLoading}
              aria-busy={isLoading}
              aria-label="Import Song"
            >
              {isLoading ? 'Importing...' : 'Import Song'}
            </button>
          </>
        )}
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

      {saveFileInfo && (
        <>
          {renderMemoryUsage()}
          {renderSongList()}
        </>
      )}

      {!saveFileInfo && !isLoading && !error && (
          <div className="kit-editor-empty">
            <p aria-live="polite">Please load a save file with song data to use the Song Manager</p>
          </div>
      )}
    </div>
  );
}
