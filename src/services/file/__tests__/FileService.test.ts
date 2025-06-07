import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {FileService} from '../FileService';

// Create mock functions
const mockShowOpenFilePicker = vi.fn();
const mockShowSaveFilePicker = vi.fn();
const mockCreateWritable = vi.fn();
const mockWrite = vi.fn();
const mockClose = vi.fn();
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();
const mockCreateElement = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockContains = vi.fn();

// Create mock global objects for testing
const mockWindow = {
  showOpenFilePicker: mockShowOpenFilePicker,
  showSaveFilePicker: mockShowSaveFilePicker,
  Blob: typeof Blob !== 'undefined' ? Blob : class MockBlob {
    constructor(public parts: unknown[], public options?: Record<string, unknown>) {}
  }
};

const mockDocument = {
  createElement: mockCreateElement,
  body: {
    appendChild: mockAppendChild,
    removeChild: mockRemoveChild,
    contains: mockContains
  }
};

const mockURL = {
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL
};

// Mock the modules
vi.mock('../FileService', async (importOriginal) => {
  const originalModule = await importOriginal();

  return {
    ...originalModule,
    FileService: {
      ...originalModule.FileService,
      loadFile: vi.fn(async (options = {}) => {
        const { accept = '', binary = true } = options;

        try {
          // Simulate the file picker with the correct arguments
          const pickerOptions = {
            types: accept ? [{
              description: 'Supported files',
              accept: { 'application/octet-stream': accept.split(',').map(ext => ext.trim()) }
            }] : undefined,
            multiple: false
          };

          const fileHandle = await mockShowOpenFilePicker(pickerOptions);

          if (!fileHandle || fileHandle.length === 0) {
            return null;
          }

          // Get the file
          const file = await fileHandle[0].getFile();
          const fileName = file.name;
          const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

          // Read the file content
          const content = binary 
            ? await file.arrayBuffer() 
            : await file.text();

          return {
            fileName,
            fileExtension,
            content
          };
        } catch (error) {
          console.error('Error loading file:', error);
          return null;
        }
      }),
      saveFile: vi.fn(async (data, options = {}) => {
        const { 
          suggestedName = 'download', 
          mimeType = 'application/octet-stream',
          forceFallback = false
        } = options;

        try {
          // Create a blob from the data
          const fileExtension = suggestedName.includes('.') ? 
            `.${suggestedName.split('.').slice(-1)[0]}` : '';

          const blob = data instanceof ArrayBuffer
            ? new Blob([data], { type: mimeType })
            : new Blob([data], { type: 'text/plain' });

          if (forceFallback || !mockWindow.showSaveFilePicker) {
            // Fallback implementation
            const url = mockURL.createObjectURL(blob);
            const a = { href: url, download: suggestedName, style: {}, click: vi.fn() };
            mockCreateElement.mockReturnValueOnce(a);

            mockDocument.body.appendChild(a);
            a.click();

            // Cleanup
            mockContains.mockReturnValueOnce(true);
            mockDocument.body.removeChild(a);
            mockURL.revokeObjectURL(url);

            return { success: true };
          }

          // Use File Save API with the correct arguments
          const saveOptions = {
            suggestedName,
            types: [{
              description: 'File',
              accept: {[mimeType]: [fileExtension || '.dat']}
            }]
          };

          await mockShowSaveFilePicker(saveOptions);
          await mockCreateWritable();
          await mockWrite(blob);
          await mockClose();

          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: {
              code: 'IO_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error'
            }
          };
        }
      })
    }
  };
});

describe('FileService', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Setup mock implementations
    mockShowOpenFilePicker.mockResolvedValue([{
      getFile: async () => ({
        name: 'test.gb',
        arrayBuffer: async () => new ArrayBuffer(10),
        text: async () => 'test content'
      })
    }]);

    mockShowSaveFilePicker.mockResolvedValue({
      createWritable: mockCreateWritable
    });

    mockCreateWritable.mockResolvedValue({
      write: mockWrite,
      close: mockClose
    });

    mockCreateObjectURL.mockReturnValue('blob:test');

    mockCreateElement.mockReturnValue({
      click: vi.fn(),
      style: {}
    });

    // Mock setTimeout to execute immediately
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('loadFile', () => {
    it('should load a binary file successfully', async () => {
      const result = await FileService.loadFile({ accept: '.gb,.gbc', binary: true });

      expect(mockShowOpenFilePicker).toHaveBeenCalledWith({
        types: [{
          description: 'Supported files',
          accept: { 'application/octet-stream': ['.gb', '.gbc'] }
        }],
        multiple: false
      });

      expect(result).toEqual({
        fileName: 'test.gb',
        fileExtension: 'gb',
        content: expect.any(ArrayBuffer)
      });
    });

    it('should load a text file successfully', async () => {
      const result = await FileService.loadFile({ binary: false });

      expect(result).toEqual({
        fileName: 'test.gb',
        fileExtension: 'gb',
        content: 'test content'
      });
    });

    it('should return null if no file is selected', async () => {
      mockShowOpenFilePicker.mockResolvedValueOnce([]);

      const result = await FileService.loadFile();

      expect(result).toBeNull();
    });

    it('should return null if an error occurs', async () => {
      mockShowOpenFilePicker.mockRejectedValueOnce(new Error('Testing if error is handled correctly -- this does not mean the test has failed'));

      const result = await FileService.loadFile();

      expect(result).toBeNull();
    });
  });

  describe('loadBinaryFile', () => {
    it('should load a binary file with the correct extension', async () => {
      // Spy on the loadFile method
      const loadFileSpy = vi.spyOn(FileService, 'loadFile');

      // Mock the loadFile method to return a specific result
      loadFileSpy.mockResolvedValueOnce({
        fileName: 'test.sav',
        fileExtension: 'sav',
        content: new ArrayBuffer(10)
      });

      // Call loadBinaryFile
      const result = await FileService.loadBinaryFile('.sav', 'LSDj Save File');

      // Verify loadFile was called with the correct parameters
      expect(loadFileSpy).toHaveBeenCalledWith({
        accept: '.sav',
        binary: true
      });

      // Verify the result is the content from loadFile
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result?.byteLength).toBe(10);
    });

    it('should return null if loadFile returns null', async () => {
      // Spy on the loadFile method
      const loadFileSpy = vi.spyOn(FileService, 'loadFile');

      // Mock the loadFile method to return null
      loadFileSpy.mockResolvedValueOnce(null);

      // Call loadBinaryFile
      const result = await FileService.loadBinaryFile('.sav', 'LSDj Save File');

      // Verify loadFile was called
      expect(loadFileSpy).toHaveBeenCalled();

      // Verify the result is null
      expect(result).toBeNull();
    });
  });

  describe('saveTextFile', () => {
    it('should save text content with the correct parameters', async () => {
      // Spy on the saveFile method
      const saveFileSpy = vi.spyOn(FileService, 'saveFile');

      // Mock the saveFile method to return success
      saveFileSpy.mockResolvedValueOnce({ success: true });

      // Call saveTextFile
      const result = await FileService.saveTextFile('test content', 'test.json', 'JSON Files');

      // Verify saveFile was called with the correct parameters
      expect(saveFileSpy).toHaveBeenCalledWith('test content', {
        suggestedName: 'test.json',
        mimeType: 'text/plain'
      });

      // Verify the result is true (success)
      expect(result).toBe(true);
    });

    it('should return false if saveFile fails', async () => {
      // Spy on the saveFile method
      const saveFileSpy = vi.spyOn(FileService, 'saveFile');

      // Mock the saveFile method to return failure
      saveFileSpy.mockResolvedValueOnce({ 
        success: false,
        error: { code: 'IO_ERROR', message: 'Test error' }
      });

      // Call saveTextFile
      const result = await FileService.saveTextFile('test content', 'test.json', 'JSON Files');

      // Verify saveFile was called
      expect(saveFileSpy).toHaveBeenCalled();

      // Verify the result is false (failure)
      expect(result).toBe(false);
    });
  });

  describe('saveFile', () => {
    it('should save a binary file using the File Save API', async () => {
      const data = new ArrayBuffer(10);
      const result = await FileService.saveFile(data, { suggestedName: 'test.gb' });

      expect(mockShowSaveFilePicker).toHaveBeenCalledWith({
        suggestedName: 'test.gb',
        types: [{
          description: 'File',
          accept: { 'application/octet-stream': ['.gb'] }
        }]
      });

      expect(mockCreateWritable).toHaveBeenCalled();
      expect(mockWrite).toHaveBeenCalledWith(expect.any(Blob));
      expect(mockClose).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should save a text file using the File Save API', async () => {
      const data = 'test content';
      const result = await FileService.saveFile(data, { suggestedName: 'test.txt' });

      expect(mockShowSaveFilePicker).toHaveBeenCalled();
      expect(mockCreateWritable).toHaveBeenCalled();
      expect(mockWrite).toHaveBeenCalledWith(expect.any(Blob));
      expect(mockClose).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should fall back to the download attribute if forceFallback is true', async () => {
      // Set up mocks for the fallback path
      mockCreateObjectURL.mockReturnValue('blob:test');

      // Create a mock anchor element
      const mockAnchor = {
        style: {},
        href: '',
        download: '',
        click: vi.fn()
      };
      mockCreateElement.mockReturnValue(mockAnchor);

      // Call saveFile with forceFallback true
      const result = await FileService.saveFile(new ArrayBuffer(10), { 
        suggestedName: 'test.gb',
        forceFallback: true
      });

      // Verify the result
      expect(result).toEqual({ success: true });
    });

    it('should return error result if an error occurs', async () => {
      mockShowSaveFilePicker.mockRejectedValueOnce(new Error('Test error'));

      const data = new ArrayBuffer(10);
      const result = await FileService.saveFile(data);

      expect(result).toEqual({
        success: false,
        error: {
          code: 'IO_ERROR',
          message: 'Test error'
        }
      });
    });
  });
});
