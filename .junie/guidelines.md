# LSDjs Developer Guidelines

You are an expert in TypeScript, React, Node.js, and Mobile-first UI development.

Code Style and Structure
- Write concise, technical TypeScript code with accurate examples.
- Use functional and declarative programming patterns; avoid classes.
- Prefer iteration and modularization over code duplication.
- Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasError).
- Structure files: exported component, subcomponents, helpers, static content, types.

Naming Conventions
- Use lowercase with dashes for directories (e.g., components/editors).
- Favor named exports for components.

TypeScript Usage
- Use TypeScript for all code; prefer interfaces to types.
- Avoid enums; use maps instead.
- Use functional components with TypeScript interfaces.
- Use strict mode in TypeScript for better type safety.

Syntax and Formatting
- Use the "function" keyword for pure functions.
- Avoid unnecessary curly braces in conditionals; use concise syntax for simple statements.
- Use declarative JSX.
- Use Prettier for consistent code formatting.

UI and Styling
- Implement responsive design with Flexbox and Expo's useWindowDimensions for screen size adjustments.
- Ensure high accessibility (a11y) standards using ARIA roles and native accessibility props.

Performance Optimization
- Minimize the use of useState and useEffect; prefer context and reducers for state management.
- Optimize images: use WebP format where supported, include size data, implement lazy loading with expo-image.
- Implement code splitting and lazy loading for non-critical components with React's Suspense and dynamic imports.
- Avoid unnecessary re-renders by memorizing components and using useMemo and useCallback hooks appropriately.

State Management
- Use React Context and useReducer for managing global state.
- Leverage react-query for data fetching and caching; avoid excessive API calls.
- For complex state management, use Redux Toolkit.

Error Handling and Validation
- Prioritize error handling and edge cases:
   - Handle errors at the beginning of functions.
   - Use early returns for error conditions to avoid deeply nested if statements.
   - Avoid unnecessary else statements; use if-return pattern instead.
   - Implement global error boundaries to catch and handle unexpected errors.

Testing
- Write unit tests using Vitest
- Tests are located under "__tests__" directories within the component directories
- Run tests with `npm run test`

Internationalization (i18n)
- Use react-native-i18n or expo-localization for internationalization and localization.
- Support multiple languages and RTL layouts.
- Ensure text scaling and font adjustments for accessibility.

## Project Structure

The web application follows a React-based architecture with TypeScript:

```
/
├── public/            # Static assets
├── src/
│   ├── components/    # React UI components
│   │   ├── core/      # Core application components
│   │   ├── editors/   # Specialized editors (Song, Kit, Font, Palette)
│   │   └── common/    # Reusable UI components
│   ├── services/      # Business logic services
│   │   ├── binary/    # Binary data processing utilities
│   │   ├── audio/     # Audio processing and playback
│   │   └── file/      # File handling services
│   ├── store/         # Redux state management
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
└── docs/              # Documentation
```

### Version Requirements

The application requires:
- **Node.js**: Version 22 LTS or higher
- **React**: Version 19.0.0 or higher
- **TypeScript**: Version 5.3.3 or higher

## Best Practices

### Code Organization

1. **Component Structure**: Follow the component architecture outlined in the documentation.
   - Keep components focused on a single responsibility
   - Use TypeScript interfaces for props and state

2. **State Management**:
   - Use Redux for global application state
   - Use React Context for component-specific state
   - Keep UI state local to components when possible

### Binary Data Handling

1. Use `ArrayBuffer` and `DataView` for binary operations
2. Implement thorough error handling for binary operations
3. Consider WebAssembly for performance-critical operations

### Mobile-First Development

1. Design for mobile first, then enhance for larger screens
2. Test on various device sizes regularly
3. Use responsive design principles (fluid layouts, breakpoints)
4. Implement touch-friendly controls with appropriate sizing

### Testing Guidelines

1. Write unit tests for all utility functions
2. Create component tests for UI behavior
3. Implement integration tests for critical user flows
4. Test binary data processing thoroughly with various input files

## Implementation Priorities

Follow the phased approach outlined in the implementation plan:

1. Core infrastructure and binary data handling
2. Basic functionality (file handling, song management)
3. Advanced editors (kit, font, palette)
4. Refinement and advanced features

## Performance Considerations

1. Optimize binary data operations for large files
2. Implement efficient rendering for complex UI components
3. Use memoization for expensive calculations
4. Consider chunked processing for large operations
5. Monitor and optimize memory usage, especially for mobile devices

### File Formats

The web application needs to handle these file formats:

1. **ROM Files (.gb, .gbc)**: Game Boy ROM files containing the LSDj application
2. **Save Files (.sav)**: Store songs with block allocation tables
3. **Project Files (.lsdprj, .lsdsng)**: Individual exported songs
4. **Kit Files (.kit)**: Sample kits that can be loaded into ROM files
