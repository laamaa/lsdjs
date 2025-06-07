import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
// Note: The root directory is explicitly set to '.' to ensure Vite finds the index.html entry point
// in the root directory. The publicDir is set to 'public' to maintain compatibility with the
// Create React App structure. This configuration is important for the build process to work correctly.
export default defineConfig({
  plugins: [react()],
  root: '.', // Explicitly set the root directory where index.html is located
  publicDir: 'public', // Explicitly set the public directory for static assets
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000, // Match the port used by react-scripts
    open: true, // Automatically open browser on start
  },
  build: {
    outDir: 'build', // Match the output directory used by react-scripts
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    css: true,
    coverage: {
      provider: 'v8', // Specify the coverage provider
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'src/setupTests.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.d.ts'
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    }
  }
});
