# LSDjs

This is a web port of the LSDPatcher application for Game Boy music creation.

## Forewords
The app was an experiment in doing a project completely using a LLM agent (Jetbrains Junie).
I haven't looked at the code and probably don't even want to. It still seems to work, mostly(?)

I feel there is absolutely no joy in making a thing this way — the process is mind-numbing, and I feel bad for wasting 
natural resources for doing something like this. Anyway...  

## Project Structure

The web application follows a React-based architecture with TypeScript:

```
/
├── public/            # Static assets
└── src/
    ├── components/    # React UI components
    │   ├── core/      # Core application components
    │   │   └── __tests__/  # Tests for core components
    │   ├── editors/   # Specialized editors (Song, Kit, Font, Palette)
    │   │   └── __tests__/  # Tests for editor components
    │   └── common/    # Reusable UI components
    ├── context/       # React context providers
    ├── services/      # Business logic services
    │   ├── binary/    # Binary data processing utilities
    │   ├── audio/     # Audio processing and playback
    │   └── file/      # File handling services
    ├── store/         # Redux state management
    ├── types/         # TypeScript type definitions
    └── utils/         # Utility functions
```

## Development Setup

### Prerequisites

- Node.js (v22 or later)
- npm (v10 or later)

### Installation

1. Clone the repository
2. Navigate to the web-application directory
3. Install dependencies:
   ```
   npm install
   ```

### Development

1. Start the development server:
   ```
   npm start
   # or
   npm run dev
   ```
2. Open [http://localhost:3000](http://localhost:3000) in your browser

### Testing

The project uses Vitest for testing. Tests are located under `__tests__` directories within the component directories.

Run tests:
```
npm test           # Run tests once
npm run test:watch # Run tests in watch mode
```

To run a specific test file:
```
npm run test -- FontEditor  # Run tests for FontEditor
```

### Building for Production

Create a production build:
```
npm run build
```

Preview the production build locally:
```
npm run preview
```

## Build System

This project uses Vite as its build system, replacing the deprecated react-scripts. Key features include:

- Faster development server with HMR (Hot Module Replacement)
- Optimized production builds
- TypeScript support out of the box
- Testing with Vitest

### Important Build Configuration Notes

- The project requires an `index.html` file in the root directory (not just in the public directory) as the entry point for Vite.
- The Vite configuration (`vite.config.ts`) explicitly sets the root directory to '.' and the public directory to 'public' to ensure the build process works correctly.
- If you encounter build errors, verify that the index.html file exists in the root directory and that the paths in the file are correct.

### Environment Variables

Environment variables are managed through `.env` files. Variables must be prefixed with `VITE_` to be accessible in the client-side code:

```
# Example .env file
VITE_API_URL=https://api.example.com
VITE_DEBUG_MODE=true
```

Access environment variables in code:
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```
