import React, { useRef, useEffect, useState, useCallback } from 'react';
import './SampleWaveform.css';

/**
 * Represents a selection range in the waveform
 */
interface SelectionRange {
  startFrame: number;
  endFrame: number;
}

interface SampleWaveformProps {
  /**
   * The sample data as a Uint8Array of packed nibbles
   */
  data: Uint8Array | null;

  /**
   * The duration of the sample in seconds
   */
  duration: number;

  /**
   * The width of the waveform in pixels
   * If not provided, the component will use the container's width
   * Default: undefined (responsive)
   */
  width?: number;

  /**
   * The height of the waveform in pixels
   * Default: 64
   */
  height?: number;

  /**
   * The color of the waveform
   * Default: Uses theme highlight color (--gb-highlight)
   */
  color?: string;

  /**
   * The background color of the waveform
   * Default: Uses theme background color (--gb-bg)
   */
  backgroundColor?: string;

  /**
   * Whether to show the duration text
   * Default: true
   */
  showDuration?: boolean;

  /**
   * Callback function when the waveform is clicked
   */
  onClick?: () => void;

  /**
   * Callback function when a selection is made
   * Returns the start and end frame indices
   */
  onSelection?: (selection: SelectionRange | null) => void;

  /**
   * Current selection state (controlled mode)
   * If provided, the component will use this instead of its internal state
   */
  selection?: SelectionRange | null;
}

/**
 * Component for visualizing sample waveforms using SVG (vector-based)
 */
export function SampleWaveform({
  data,
  duration,
  width,
  height = 64,
  color,
  backgroundColor,
  showDuration = true,
  onClick,
  onSelection,
  selection,
}: SampleWaveformProps) {
  // Constant for arrow key frame increment
  const ARROW_KEY_FRAME_INCREMENT = 64;
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState(width || 300);

  // Selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(selection ? selection.startFrame : null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(selection ? selection.endFrame : null);

  // Use theme colors if not explicitly provided via props
  const themeColor = color || 'var(--gb-highlight)';
  const themeBackgroundColor = backgroundColor || 'var(--gb-bg)';

  // Set up ResizeObserver to track container width changes
  useEffect(() => {
    // If width is explicitly provided, use that
    if (width) {
      setContainerWidth(width);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Create a ResizeObserver to track container width changes
    let resizeObserver: ResizeObserver;

    try {
      resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          // Use contentBoxSize if available (newer browsers)
          if (entry.contentBoxSize) {
            const contentBoxSize = Array.isArray(entry.contentBoxSize) 
              ? entry.contentBoxSize[0] 
              : entry.contentBoxSize;

            // Access inlineSize property
            const newWidth = contentBoxSize.inlineSize as number;
            if (newWidth > 0) {
              setContainerWidth(newWidth);
            }
          } else {
            // Fallback to contentRect for older browsers
            const newWidth = entry.contentRect.width;
            if (newWidth > 0) {
              setContainerWidth(newWidth);
            }
          }
        }
      });

      // Start observing the container
      resizeObserver.observe(container);

      // Initial measurement
      const initialWidth = container.clientWidth;
      if (initialWidth > 0) {
        setContainerWidth(initialWidth);
      }
    } catch (error) {
      console.error('Error setting up ResizeObserver:', error);
      // Fallback to window resize event if ResizeObserver is not supported
      const handleResize = () => {
        if (container) {
          const newWidth = container.clientWidth;
          if (newWidth > 0) {
            setContainerWidth(newWidth);
          }
        }
      };

      window.addEventListener('resize', handleResize);
      // Initial measurement
      handleResize();

      // Clean up
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }

    // Clean up
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [width]);

  // We no longer reset selection when data changes
  // This allows selections to persist when adjusting sample parameters
  // The selection will only be cleared when explicitly requested
  // or when the component unmounts

  // Update internal selection state when selection prop changes
  useEffect(() => {
    if (selection === null) {
      setSelectionStart(null);
      setSelectionEnd(null);
    } else if (selection) {
      setSelectionStart(selection.startFrame);
      setSelectionEnd(selection.endFrame);
    }
  }, [selection]);

  // Generate the SVG path for the waveform
  const generateWaveformPath = useCallback((): string => {
    if (!data || data.length === 0) return '';

    let path = `M 0,${height / 2}`;

    for (let i = 0; i < data.length; i++) {
      // Extract the 4-bit values from each byte
      const highNibble = (data[i] & 0xf0) >> 4;
      const lowNibble = data[i] & 0x0f;

      // Calculate the x positions for the two nibbles
      const x1 = (i * 2) * containerWidth / (data.length * 2);
      const x2 = (i * 2 + 1) * containerWidth / (data.length * 2);

      // Convert the 4-bit values (0-15) to y positions
      // 7.5 is the middle value, so we subtract it to center the waveform
      const y1 = height * (1 - (highNibble - 7.5) / 7.5) / 2;
      const y2 = height * (1 - (lowNibble - 7.5) / 7.5) / 2;

      // Add line segments to the path
      path += ` L ${x1},${y1} L ${x2},${y2}`;
    }

    return path;
  }, [data, containerWidth, height]);

  // Convert pixel position to frame index (snapped to sample frames)
  const pixelToFrameIndex = useCallback((pixelX: number): number => {
    if (!data || data.length === 0) return 0;

    // Calculate the frame index based on the pixel position
    // Each byte in data contains 2 samples (high and low nibbles)
    const totalSamples = data.length * 2;

    // Calculate the normalized position (0 to 1)
    const normalizedPosition = pixelX / containerWidth;

    // Define edge snap threshold (percentage of width)
    const edgeSnapThreshold = 0.02; // 2% of the width

    // Snap to edges if close enough
    if (normalizedPosition <= edgeSnapThreshold) {
      // Snap to start (frame 0)
      return 0;
    } else if (normalizedPosition >= 1 - edgeSnapThreshold) {
      // Snap to end (last frame)
      return totalSamples - 1;
    }

    // Regular calculation for positions not near edges
    const frameIndex = Math.round(normalizedPosition * totalSamples);

    // Ensure the frame index is within bounds
    return Math.max(0, Math.min(totalSamples - 1, frameIndex));
  }, [data, containerWidth]);

  // Helper function to get position relative to SVG
  const getPositionFromEvent = useCallback((clientX: number): number | null => {
    if (!data || data.length === 0) return null;

    // Get position relative to SVG
    const svg = svgRef.current;
    if (!svg) return null;

    const rect = svg.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));

    return x;
  }, [data, svgRef]);

  // Helper function to start selection
  const startSelection = useCallback((clientX: number) => {
    const x = getPositionFromEvent(clientX);
    if (x === null) return;

    // Start selection
    setIsSelecting(true);
    const frameIndex = pixelToFrameIndex(x);
    setSelectionStart(frameIndex);
    setSelectionEnd(frameIndex);

    // Notify parent component of selection
    if (onSelection) {
      onSelection({ startFrame: frameIndex, endFrame: frameIndex });
    }
  }, [getPositionFromEvent, onSelection, pixelToFrameIndex]);

  // Handle mouse down event to start selection
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // If onClick is provided, don't start selection
    if (onClick) {
      onClick();
      return;
    }

    startSelection(e.clientX);
  }, [onClick, startSelection]);

  // Handle touch start event to start selection
  const handleTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement> | TouchEvent) => {
    // If onClick is provided, don't start selection
    if (onClick) {
      onClick();
      return;
    }

    // Prevent default to avoid scrolling
    e.preventDefault();

    // Handle both React TouchEvent and DOM TouchEvent
    const touch = 'touches' in e ? e.touches[0] : (e as React.TouchEvent<SVGSVGElement>).touches[0];
    startSelection(touch.clientX);
  }, [onClick, startSelection]);

  // Helper function to update selection
  const updateSelection = useCallback((clientX: number) => {
    if (!isSelecting || !data || data.length === 0) return;

    const x = getPositionFromEvent(clientX);
    if (x === null) return;

    // Update selection end
    const frameIndex = pixelToFrameIndex(x);

    // Only update if the selection end has changed
    if (frameIndex !== selectionEnd) {
      setSelectionEnd(frameIndex);

      // Notify parent component of selection
      if (onSelection && selectionStart !== null) {
        // Pass the actual selection start and end without reordering
        // This preserves the direction of the selection
        onSelection({ startFrame: selectionStart, endFrame: frameIndex });
      }
    }
  }, [isSelecting, data, onSelection, selectionStart, selectionEnd, getPositionFromEvent, pixelToFrameIndex]);

  // Handle mouse move event to update selection
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    updateSelection(e.clientX);
  }, [updateSelection]);

  // Handle touch move event to update selection
  const handleTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement> | TouchEvent) => {
    if (!isSelecting || !data || data.length === 0) return;

    // Prevent default to avoid scrolling
    e.preventDefault();

    // Handle both React TouchEvent and DOM TouchEvent
    const touch = 'touches' in e ? e.touches[0] : (e as React.TouchEvent<SVGSVGElement>).touches[0];
    updateSelection(touch.clientX);
  }, [isSelecting, data, updateSelection]);

  // Helper function to end selection
  const endSelection = useCallback(() => {
    setIsSelecting(false);

    // If selection is a single frame, clear it
    if (selectionStart !== null && selectionEnd !== null && selectionStart === selectionEnd) {
      setSelectionStart(null);
      setSelectionEnd(null);
      if (onSelection) {
        onSelection(null);
      }
    }
  }, [selectionStart, selectionEnd, onSelection]);


  // Handle mouse up event to end selection
  const handleMouseUp = useCallback(() => {
    endSelection();
  }, [endSelection]);

  // Handle touch end event to end selection
  const handleTouchEnd = useCallback(() => {
    endSelection();
  }, [endSelection]);

  // Helper function to cancel selection
  const cancelSelection = useCallback(() => {
    setIsSelecting(false);
  }, []);

  // Handle mouse leave event to end selection
  const handleMouseLeave = useCallback(() => {
    cancelSelection();
  }, [cancelSelection]);

  // Handle touch cancel event to end selection
  const handleTouchCancel = useCallback(() => {
    cancelSelection();
  }, [cancelSelection]);

  // Convert frame index to pixel position
  const frameToPixel = useCallback((frameIndex: number): number => {
    if (!data || data.length === 0) return 0;

    const totalSamples = data.length * 2;
    return (frameIndex / totalSamples) * containerWidth;
  }, [data, containerWidth]);

  // Add non-passive touch event listeners
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Add touch event listeners with { passive: false } option
    svg.addEventListener('touchstart', handleTouchStart as unknown as EventListener, { passive: false });
    svg.addEventListener('touchmove', handleTouchMove as unknown as EventListener, { passive: false });
    svg.addEventListener('touchend', handleTouchEnd as unknown as EventListener);
    svg.addEventListener('touchcancel', handleTouchCancel as unknown as EventListener);

    // Clean up
    return () => {
      svg.removeEventListener('touchstart', handleTouchStart as unknown as EventListener);
      svg.removeEventListener('touchmove', handleTouchMove as unknown as EventListener);
      svg.removeEventListener('touchend', handleTouchEnd as unknown as EventListener);
      svg.removeEventListener('touchcancel', handleTouchCancel as unknown as EventListener);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]); // Re-add listeners when these handlers change

  // Handle keyboard events for accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent<SVGSVGElement>) => {
    // If onClick is provided, handle Enter/Space as click
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
      return;
    }

    // If selection is supported
    if (!onClick && data && data.length > 0) {
      const totalFrames = data.length * 2;

      // Start selection with Enter or Space
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        // Start selection at 25% of the waveform
        const startFrame = Math.floor(totalFrames * 0.25);
        setIsSelecting(true);
        setSelectionStart(startFrame);
        setSelectionEnd(startFrame);

        if (onSelection) {
          onSelection({ startFrame, endFrame: startFrame });
        }
      }

      // Extend selection with arrow keys
      if (e.key === 'ArrowRight' && selectionStart !== null && selectionEnd !== null) {
        e.preventDefault();
        // Use increment of 1 when Shift is pressed, otherwise use ARROW_KEY_FRAME_INCREMENT
        const increment = e.shiftKey ? 1 : ARROW_KEY_FRAME_INCREMENT;
        const newEnd = Math.min(totalFrames - 1, selectionEnd + increment);
        setSelectionEnd(newEnd);

        if (onSelection) {
          onSelection({ startFrame: selectionStart, endFrame: newEnd });
        }
      }

      if (e.key === 'ArrowLeft' && selectionStart !== null && selectionEnd !== null) {
        e.preventDefault();
        // Use increment of 1 when Shift is pressed, otherwise use ARROW_KEY_FRAME_INCREMENT
        const increment = e.shiftKey ? 1 : ARROW_KEY_FRAME_INCREMENT;
        const newEnd = Math.max(0, selectionEnd - increment);
        setSelectionEnd(newEnd);

        if (onSelection) {
          onSelection({ startFrame: selectionStart, endFrame: newEnd });
        }
      }

      // Home key: Select from current start to beginning of sample
      if (e.key === 'Home' && selectionStart !== null && selectionEnd !== null) {
        e.preventDefault();
        setSelectionEnd(0);

        if (onSelection) {
          onSelection({ startFrame: selectionStart, endFrame: 0 });
        }
      }

      // End key: Select from current start to end of sample
      if (e.key === 'End' && selectionStart !== null && selectionEnd !== null) {
        e.preventDefault();
        setSelectionEnd(totalFrames - 1);

        if (onSelection) {
          onSelection({ startFrame: selectionStart, endFrame: totalFrames - 1 });
        }
      }

      // Shift+Home: Start new selection from beginning
      if (e.key === 'Home' && e.shiftKey) {
        e.preventDefault();
        setSelectionStart(0);
        setSelectionEnd(0);

        if (onSelection) {
          onSelection({ startFrame: 0, endFrame: 0 });
        }
      }

      // Shift+End: Start new selection from end
      if (e.key === 'End' && e.shiftKey) {
        e.preventDefault();
        const lastFrame = totalFrames - 1;
        setSelectionStart(lastFrame);
        setSelectionEnd(lastFrame);

        if (onSelection) {
          onSelection({ startFrame: lastFrame, endFrame: lastFrame });
        }
      }

      // Clear selection with Escape
      if (e.key === 'Escape' && (selectionStart !== null || selectionEnd !== null)) {
        e.preventDefault();
        setSelectionStart(null);
        setSelectionEnd(null);
        setIsSelecting(false);

        if (onSelection) {
          onSelection(null);
        }
      }
    }
  }, [onClick, data, selectionStart, selectionEnd, onSelection]);

  return (
    <div ref={containerRef} className="sample-waveform-container">
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${containerWidth} ${height}`}
        preserveAspectRatio="none"
        className={`sample-waveform ${onClick ? 'clickable' : ''}`}
        role="img"
        aria-label={`Sample waveform, duration: ${duration.toFixed(3)} seconds${selectionStart !== null && selectionEnd !== null ? `, selection from frame ${Math.min(selectionStart, selectionEnd)} to ${Math.max(selectionStart, selectionEnd)}` : ''}`}
        tabIndex={0}
        aria-roledescription="Waveform visualization"
        aria-readonly={!!onClick}
        aria-description="Drag to select a range. The edges of the waveform have larger hit areas for easier selection. Use arrow keys to move selection by 64 frames, or Shift+arrow keys for fine-grained selection (1 frame). Use Home key to select to the start, End key to select to the end. Use Shift+Home to start selection at beginning, Shift+End to start at end."
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
      >
        {/* Background rectangle */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={themeBackgroundColor}
        />

        {/* Selection area */}
        {selectionStart !== null && selectionEnd !== null && !onClick && (
          <>
            <rect
              x={Math.min(frameToPixel(selectionStart), frameToPixel(selectionEnd))}
              y="0"
              width={Math.abs(frameToPixel(selectionEnd) - frameToPixel(selectionStart))}
              height="100%"
              fill="var(--gb-highlight)"
              fillOpacity="0.3"
              stroke="var(--gb-highlight)"
              strokeWidth="1"
              strokeOpacity="0.8"
            />

            {/* Edge indicators for selection boundaries */}
            {(selectionStart === 0 || selectionEnd === 0) && (
              <rect
                x="0"
                y="0"
                width="4"
                height={height}
                fill="var(--gb-highlight)"
                fillOpacity="0.6"
              />
            )}

            {(selectionStart === (data?.length ?? 0) * 2 - 1 || selectionEnd === (data?.length ?? 0) * 2 - 1) && (
              <rect
                x={containerWidth - 4}
                y="0"
                width="4"
                height={height}
                fill="var(--gb-highlight)"
                fillOpacity="0.6"
              />
            )}
          </>
        )}

        {/* Waveform path */}
        {data && data.length > 0 && (
          <path
            d={generateWaveformPath()}
            stroke={themeColor}
            strokeWidth="1"
            fill="none"
          />
        )}

        {/* Duration text */}
        {showDuration && (
          <>
            {/* Text shadow */}
            <text
              x={containerWidth - 1}
              y={height - 1}
              textAnchor="end"
              dominantBaseline="text-bottom"
              fontSize="12px"
              fontFamily="Arial"
              fill="var(--gb-darkest)"
            >
              {`${duration.toFixed(3)}s`}
            </text>

            {/* Main text */}
            <text
              x={containerWidth - 2}
              y={height - 2}
              textAnchor="end"
              dominantBaseline="text-bottom"
              fontSize="12px"
              fontFamily="Arial"
              fill="var(--gb-lightest)"
            >
              {`${duration.toFixed(3)}s`}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
