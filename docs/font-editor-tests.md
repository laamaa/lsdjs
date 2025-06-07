# Font Editor Tests

This document provides an overview of the tests implemented for the Font Editor components in the LSDPatcher web application.

## Components Tested

### 1. ColorSelector

The `ColorSelector` component allows users to select colors for the left and right mouse buttons when editing font tiles.

**Test File**: `src/components/editors/__tests__/ColorSelector.test.tsx`

**Tests Implemented**:
- Renders without crashing
- Displays the correct number of color buttons
- Marks the selected colors correctly
- Calls onColorChange with the correct parameters when left color is clicked
- Calls onColorChange with the correct parameters when right color is clicked
- Applies the provided className

### 2. FontProcessor

The `FontProcessor` service handles the binary data manipulation for font editing.

**Test File**: `src/services/binary/__tests__/FontProcessor.test.ts`

**Tests Implemented**:
- Gets the correct pixel color for different tiles
- Gets the correct pixel color for graphics tiles
- Throws an error for invalid coordinates
- Sets and gets the correct pixel color
- Sets and gets the correct pixel color for graphics tiles
- Throws an error for invalid color values
- Rotates tiles up, down, left, and right correctly
- Generates shaded and inverted variants

### 3. FontEditor

The `FontEditor` component integrates the other components to provide a complete font editing experience.

**Test File**: `src/components/editors/__tests__/FontEditor.test.tsx`

**Tests Implemented**:
- Renders a message when no ROM is loaded
- Renders the font editor when a ROM with fonts is loaded
- Initializes the FontProcessor when a ROM is loaded
- Changes the selected font when the dropdown is changed
- Toggles graphics characters when the button is clicked
- Rotates the tile when rotation buttons are clicked
- Changes the selected color when color buttons are clicked

## Test Setup

The tests use Vitest and React Testing Library. The following mocks are used:

- `FontMap` - Mocked to avoid canvas-related errors
- `TileEditor` - Mocked to simplify testing
- `DropdownSelector` - Mocked to provide a combobox role
- `FontProcessor` - Mocked to isolate component behavior

## Running the Tests

To run the tests:

```bash
cd web-application && npm run test
```

To run a specific test file:

```bash
cd web-application && npm run test -- FontEditor
```

## Coverage

The tests provide good coverage of the font editor functionality, including:
- Color selection
- Tile selection and editing
- Font selection
- Graphics character toggling
- Tile rotation
- Binary data manipulation

## Future Improvements

Potential improvements to the test suite:
- Add more edge case testing
- Test integration with the Redux store more thoroughly
- Add visual regression tests for the font editor UI