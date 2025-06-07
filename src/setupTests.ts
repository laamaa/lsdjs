// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import {vi} from 'vitest';

// This file is used by vitest to setup the testing environment
// It's similar to the setupTests.js file used by create-react-app

// Mock the File System Access API which is not included in jsdom
// These mocks will be added to the window object by jsdom
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'showOpenFilePicker', {
    value: vi.fn(),
    writable: true
  });

  Object.defineProperty(window, 'showSaveFilePicker', {
    value: vi.fn(),
    writable: true
  });
}

// Mock URL methods that might not be implemented in jsdom
if (!URL.createObjectURL) {
  Object.defineProperty(URL, 'createObjectURL', {
    value: vi.fn(),
    writable: true
  });
}

if (!URL.revokeObjectURL) {
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: vi.fn(),
    writable: true
  });
}

// Mock ResizeObserver which is not available in jsdom
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }
    observe() {
      // Do nothing
    }
    unobserve() {
      // Do nothing
    }
    disconnect() {
      // Do nothing
    }
  };
}

// Mock HTMLCanvasElement.prototype.getContext
if (typeof window !== 'undefined') {
  // Create a partial mock of CanvasRenderingContext2D
  const createMockContext = (): Partial<CanvasRenderingContext2D> => ({
    canvas: document.createElement('canvas'),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    createLinearGradient: vi.fn(),
    createRadialGradient: vi.fn(),
    createPattern: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 0 }),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    transform: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    clip: vi.fn(),
    isPointInPath: vi.fn(),
    isPointInStroke: vi.fn()
  });

  // Save the original getContext method
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  // Create a type-safe replacement
  const mockGetContext = function(this: HTMLCanvasElement, contextId: string, options?: CanvasRenderingContext2DSettings | WebGLContextAttributes | Record<string, unknown>): RenderingContext | null {
    if (contextId === '2d') {
      return createMockContext() as unknown as CanvasRenderingContext2D;
    }
    // Fall back to original implementation if available
    if (originalGetContext) {
      return originalGetContext.call(this, contextId, options);
    }
    return null;
  };

  // Override the getContext method with our mock
  HTMLCanvasElement.prototype.getContext = mockGetContext as typeof HTMLCanvasElement.prototype.getContext;
}
