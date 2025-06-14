/**
 * FileService.ts
 * 
 * Provides utilities for loading and saving files in the LSDPatcher web application.
 * This service uses the Web File API to handle file operations in the browser.
 */

/**
 * Interface for file loading options
 */
export interface FileLoadOptions {
  /**
   * The accepted file types (e.g., '.gb', '.sav')
   * @example '.gb,.sav'
   */
  accept?: string;

  /**
   * Whether to read the file as an ArrayBuffer (true) or as text (false)
   * Default is true (ArrayBuffer)
   */
  binary?: boolean;
}

/**
 * Interface for file saving options
 */
export interface FileSaveOptions {
  /**
   * The suggested file name
   */
  suggestedName?: string;

  /**
   * The MIME type of the file
   * Default is 'application/octet-stream'
   */
  mimeType?: string;

  /**
   * Force using the fallback method (download attribute) instead of the File Save API
   * This is mainly used for testing
   * Default is false
   */
  forceFallback?: boolean;
}

/**
 * Result of a file load operation
 */
export interface FileLoadResult {
  /**
   * The name of the loaded file
   */
  fileName: string;

  /**
   * The file extension (e.g., 'gb', 'sav')
   */
  fileExtension: string;

  /**
   * The file content as an ArrayBuffer (if binary is true) or as a string (if binary is false)
   * Maximum file size is 10MB
   */
  content: ArrayBuffer | string;
}

/**
 * Service for loading and saving files
 */
export const FileService = {
  /**
   * Opens a file picker dialog and loads the selected binary file
   * 
   * @param fileExtension - The file extension to accept (e.g., '.sav')
   * @returns A promise that resolves to the loaded file data as ArrayBuffer or null if no file was selected
   */
  async loadBinaryFile(fileExtension: string): Promise<ArrayBuffer | null> {
    try {
      const result = await this.loadFile({
        accept: fileExtension,
        binary: true
      });

      if (!result) {
        return null;
      }

      // Ensure we have a valid ArrayBuffer
      if (!(result.content instanceof ArrayBuffer)) {
        console.error('Expected ArrayBuffer but got:', typeof result.content);
        return null;
      }

      return result.content;
    } catch (error) {
      console.error('Error loading binary file:', error);
      throw error;
    }
  },

  /**
   * Saves text data to a file
   * 
   * @param content - The text content to save
   * @param fileName - The suggested file name
   * @returns A promise that resolves to true if the file was saved successfully, false otherwise
   */
  async saveTextFile(content: string, fileName: string): Promise<boolean> {
    const result = await this.saveFile(content, {
      suggestedName: fileName,
      mimeType: 'text/plain'
    });

    return result.success;
  },

  async loadFile(options: FileLoadOptions = {}): Promise<FileLoadResult | null> {
    const { accept = '', binary = true } = options;
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

    // Validate accept parameter
    if (accept && !/^(\.[a-zA-Z0-9]+,?\s*)+$/.test(accept)) {
      throw new Error('Invalid accept parameter format');
    }

    try {
      // Check if we should use the modern API
      // Detect browsers with limited File System Access API support
      const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
      const isMobileSafari = /iP(ad|hone|od)/.test(navigator.userAgent) && 
                             /WebKit/.test(navigator.userAgent) && 
                             !/(CriOS|FxiOS|OPiOS|mercury)/.test(navigator.userAgent);
      const useModernAPI = !isFirefox && !isMobileSafari && 'showOpenFilePicker' in window;

      if (useModernAPI) {
        try {
          const fileHandle = await window.showOpenFilePicker({
            types: accept ? [{
              description: 'Supported files',
              accept: { 'application/octet-stream': accept.split(',').map(ext => ext.trim()) }
            }] : undefined,
            multiple: false
          });

          if (!fileHandle || fileHandle.length === 0) {
            return null;
          }

          const file = await fileHandle[0].getFile();

          if (file.size > MAX_FILE_SIZE) {
            console.warn(`File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
            return null;
          }

          const fileName = file.name;
          const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

          // Ensure we're properly reading the file content based on the binary flag
          let content;
          if (binary) {
            content = await file.arrayBuffer();
            // Verify that we got a valid ArrayBuffer
            if (!(content instanceof ArrayBuffer)) {
              console.warn('Failed to read file as ArrayBuffer');
              return null;
            }
          } else {
            content = await file.text();
          }

          return { fileName, fileExtension, content };
        } catch (error) {
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              return null;
            }
            if (error.name === 'NotAllowedError') {
              console.warn('Permission denied for File System Access API, falling back to traditional method');
              // Continue to fallback
            } else {
              console.warn('File System Access API error, falling back to traditional method:', error);
              // Continue to fallback
            }
          }
        }
      }

      // Log that we're using the fallback method
      if (isFirefox) {
        console.log('Using traditional file input method for Firefox');
      }
      if (isMobileSafari) {
        console.log('Using traditional file input method for Mobile Safari');
        console.log('Note: On iOS Safari, focus/blur events are handled differently for file inputs');
      }

      // Fallback method using traditional file input
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        if (accept) {
          input.accept = accept;
        }

        const cleanup = () => {
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
          input.onchange = null;
          window.removeEventListener('focus', handleFocus);
          window.removeEventListener('blur', handleBlur);

          // Clear the safety timeout if it exists
          if (safetyTimeoutId !== null) {
            window.clearTimeout(safetyTimeoutId);
            safetyTimeoutId = null;
          }
        };

        let filePickerOpened = false;
        let fileDialogClosed = false;

        // Handle window focus (file dialog closed)
        const handleFocus = () => {
          // Only process if the file picker was opened and we haven't yet processed the close
          if (filePickerOpened && !fileDialogClosed) {
            fileDialogClosed = true;

            // Check if we're on mobile Safari
            const isMobileSafari = /iP(ad|hone|od)/.test(navigator.userAgent) && 
                                  /WebKit/.test(navigator.userAgent) && 
                                  !/(CriOS|FxiOS|OPiOS|mercury)/.test(navigator.userAgent);

            // On mobile Safari, don't automatically assume a dialog was closed without selection
            // as focus/blur events behave differently on iOS
            if (isMobileSafari) {
              // For mobile Safari, we'll rely solely on the change event
              // and not trigger the "closed without selection" logic
              return;
            }

            // Small delay to allow the change event to fire first if a file was selected
            setTimeout(() => {
              // If no files were selected, clean up and resolve null
              if (!input.files || input.files.length === 0) {
                console.log('File dialog closed without selection');
                cleanup();
                resolve(null);
              }
            }, 300);
          }
        };

        // Handle window blur (file dialog opened)
        const handleBlur = () => {
          filePickerOpened = true;
        };

        input.onchange = async (event) => {
          console.log('File input change event fired');
          const target = event.target as HTMLInputElement;
          const files = target.files;

          // Mark that we've handled the file dialog
          fileDialogClosed = true;

          try {
            if (!files || files.length === 0) {
              console.log('No files selected');
              cleanup();
              resolve(null);
              return;
            }

            const file = files[0];
            if (file.size > MAX_FILE_SIZE) {
              console.warn(`File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
              cleanup();
              resolve(null);
              return;
            }

            const fileName = file.name;
            const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

            // Ensure we're properly reading the file content based on the binary flag
            let content;
            try {
              if (binary) {
                content = await file.arrayBuffer();
                // Verify that we got a valid ArrayBuffer
                if (!(content instanceof ArrayBuffer)) {
                  console.warn('Failed to read file as ArrayBuffer');
                  cleanup();
                  resolve(null);
                  return;
                }
              } else {
                content = await file.text();
              }
            } catch (readError) {
              console.error('Error reading file:', readError);
              cleanup();
              resolve(null);
              return;
            }

            // Check if we're on mobile Safari for logging purposes
            const isMobileSafari = /iP(ad|hone|od)/.test(navigator.userAgent) && 
                                  /WebKit/.test(navigator.userAgent) && 
                                  !/(CriOS|FxiOS|OPiOS|mercury)/.test(navigator.userAgent);

            if (isMobileSafari) {
              console.log(`Mobile Safari: Successfully read file: ${fileName}`);
            } else {
              console.log(`Successfully read file: ${fileName}`);
            }

            cleanup();
            resolve({ fileName, fileExtension, content });
          } catch (error) {
            console.error('Error in file input change handler:', error);
            cleanup();
            resolve(null);
          }
        };

        // Add event listeners for focus and blur
        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);

        // Add the input to the document and trigger the click
        document.body.appendChild(input);

        // Check if we're on mobile Safari
        const isMobileSafari = /iP(ad|hone|od)/.test(navigator.userAgent) && 
                              /WebKit/.test(navigator.userAgent) && 
                              !/(CriOS|FxiOS|OPiOS|mercury)/.test(navigator.userAgent);

        // For mobile Safari, add a safety timeout to ensure cleanup happens
        // even if focus/blur events don't fire as expected
        let safetyTimeoutId: number | null = null;
        if (isMobileSafari) {
          safetyTimeoutId = window.setTimeout(() => {
            // Only clean up if we haven't already processed a file selection
            if (!fileDialogClosed) {
              console.log('Mobile Safari safety timeout triggered - cleaning up file input');
              cleanup();
              resolve(null);
            }
          }, 60000); // 1-minute timeout
        }

        // Use setTimeout to ensure the input is in the DOM before clicking
        setTimeout(() => {
          try {
            input.click();
          } catch (error) {
            console.error('Error clicking file input:', error);
            if (safetyTimeoutId !== null) {
              window.clearTimeout(safetyTimeoutId);
            }
            cleanup();
            resolve(null);
          }
        }, 0);

      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error loading file:', errorMessage);
      throw error;
    }
  },

  /**
   * Saves data to a file
   * 
   * @param data - The data to save (ArrayBuffer or string)
   * @param options - Options for file saving
   * @returns A promise that resolves to true if the file was saved successfully, false otherwise
   */
  async saveFile(data: ArrayBuffer | string, options: FileSaveOptions = {}): Promise<SaveFileResult> {
    const { 
      suggestedName = 'download', 
      mimeType = 'application/octet-stream',
      forceFallback = false
    } = options;

    // Add size check
    if (data instanceof ArrayBuffer && data.byteLength > 10 * 1024 * 1024) {
      return {
        success: false,
        error: {
          code: 'IO_ERROR',
          message: 'File too large (max 10mb)'
        }
      };
    }

    try {
      if (!window.Blob || !URL.createObjectURL) {
        return {
          success: false,
          error: {
            code: 'BROWSER_UNSUPPORTED',
            message: 'Browser does not support required APIs'
          }
        };
      }

      const fileExtension = suggestedName.includes('.') ? 
        `.${suggestedName.split('.').slice(-1)[0]}` : '';

      const blob = data instanceof ArrayBuffer
        ? new Blob([data], { type: mimeType })
        : new Blob([data], { type: 'text/plain' });

      // Detect browsers with limited File System Access API support
      const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
      const isMobileSafari = /iP(ad|hone|od)/.test(navigator.userAgent) && 
                             /WebKit/.test(navigator.userAgent) && 
                             !/(CriOS|FxiOS|OPiOS|mercury)/.test(navigator.userAgent);
      const useModernAPI = !forceFallback && !isFirefox && !isMobileSafari && 'showSaveFilePicker' in window;

      if (useModernAPI) {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName,
            types: [{
              description: 'File',
              accept: {[mimeType]: [fileExtension || '.dat']}
            }]
          });

          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();

          return {success: true};
        } catch (error) {
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              return {
                success: false,
                error: {
                  code: 'USER_CANCELLED',
                  message: 'User cancelled the save operation'
                }
              };
            }
            console.warn('File System Access API error, falling back to traditional method:', error);
            // Continue to fallback
          }
        }
      }

      // Log that we're using the fallback method
      if (isFirefox) {
        console.log('Using traditional download method for Firefox');
      }
      if (isMobileSafari) {
        console.log('Using open-in-new-tab method for Mobile Safari');
      }

      // Create a URL for the blob
      const url = URL.createObjectURL(blob);

      // Special handling for Mobile Safari
      if (isMobileSafari) {
        // For Mobile Safari, open in a new tab to allow manual saving
        // This works because Safari on iOS allows users to long-press and save the content
        try {
          // Open in a new tab
          window.open(url, '_blank');

          // Show a message to the user explaining how to save the file
          // This could be replaced with a more sophisticated UI component
          alert('To save the file on iOS:\n1. The file will open in a new tab\n2. Long-press on the content\n3. Select "Download" or "Save to Files"');

          // Keep the URL alive longer for mobile Safari
          await new Promise(resolve => setTimeout(resolve, 5000));

          // Revoke the URL after a delay
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 60000); // Keep URL valid for 1 minute to give the user time to save

          return { success: true };
        } catch (error) {
          console.error('Error opening file in new tab:', error);
          URL.revokeObjectURL(url);
          return {
            success: false,
            error: {
              code: 'IO_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error occurred'
            }
          };
        }
      }

      // Standard fallback for other browsers
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName;
      a.style.display = 'none';

      const cleanup = () => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
      };

      try {
        document.body.appendChild(a);
        a.click();
        // Increased timeout for larger files
        await new Promise(resolve => setTimeout(resolve, 1000));
      } finally {
        cleanup();
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: {
          code: error instanceof Error && error.message.includes('required APIs') 
            ? 'BROWSER_UNSUPPORTED' 
            : 'IO_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      };
    }
  }
};

interface SaveFileResult {
  success: boolean;
  error?: {
    code: 'USER_CANCELLED' | 'BROWSER_UNSUPPORTED' | 'IO_ERROR';
    message: string;
  };
}
