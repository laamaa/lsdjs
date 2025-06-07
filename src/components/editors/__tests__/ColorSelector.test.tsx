import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColorSelector } from '../ColorSelector';

describe('ColorSelector', () => {
  const mockOnColorChange = vi.fn();

  beforeEach(() => {
    mockOnColorChange.mockClear();
  });

  it('renders without crashing', () => {
    render(
      <ColorSelector
        selectedColor={3}
        rightColor={0}
        onColorChange={mockOnColorChange}
      />
    );

    expect(screen.getByText('Left Click:')).toBeInTheDocument();
    expect(screen.getByText('Right Click:')).toBeInTheDocument();
  });

  it('displays the correct number of color buttons', () => {
    render(
      <ColorSelector
        selectedColor={3}
        rightColor={0}
        onColorChange={mockOnColorChange}
      />
    );

    // There should be 3 colors for left click and 3 colors for right click
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(6);
  });

  it('marks the selected colors correctly', () => {
    render(
      <ColorSelector
        selectedColor={3}
        rightColor={0}
        onColorChange={mockOnColorChange}
      />
    );

    // Check that the correct buttons are marked as selected
    const leftButtons = screen.getAllByLabelText(/Select color \d for left click/);
    const rightButtons = screen.getAllByLabelText(/Select color \d for right click/);

    // Find the selected left button (color 3)
    const selectedLeftButton = leftButtons.find(button => 
      button.getAttribute('aria-pressed') === 'true'
    );
    expect(selectedLeftButton).toHaveAttribute('aria-label', 'Select color 3 for left click');

    // Find the selected right button (color 0)
    const selectedRightButton = rightButtons.find(button => 
      button.getAttribute('aria-pressed') === 'true'
    );
    expect(selectedRightButton).toHaveAttribute('aria-label', 'Select color 0 for right click');
  });

  it('calls onColorChange with the correct parameters when left color is clicked', () => {
    render(
      <ColorSelector
        selectedColor={3}
        rightColor={0}
        onColorChange={mockOnColorChange}
      />
    );

    // Click on the left color button for color 1
    const leftColorButton = screen.getByLabelText('Select color 1 for left click');
    fireEvent.click(leftColorButton);

    // Check that onColorChange was called with the correct parameters
    expect(mockOnColorChange).toHaveBeenCalledWith(1, false);
  });

  it('calls onColorChange with the correct parameters when right color is clicked', () => {
    render(
      <ColorSelector
        selectedColor={3}
        rightColor={0}
        onColorChange={mockOnColorChange}
      />
    );

    // Click on the right color button for color 3
    const rightColorButton = screen.getByLabelText('Select color 3 for right click');
    fireEvent.click(rightColorButton);

    // Check that onColorChange was called with the correct parameters
    expect(mockOnColorChange).toHaveBeenCalledWith(3, true);
  });

  it('applies the provided className', () => {
    render(
      <ColorSelector
        selectedColor={3}
        rightColor={0}
        onColorChange={mockOnColorChange}
        className="custom-class"
      />
    );

    const colorSelector = screen.getByText('Left Click:').closest('.color-selector');
    expect(colorSelector).toHaveClass('custom-class');
  });
});
