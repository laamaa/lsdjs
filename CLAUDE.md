# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LSDjs is a web port of the LSDPatcher application for editing Little Sound Dj (LSDJ) Game Boy ROM images and save files. It allows users to modify samples/kits, fonts, palettes, and songs entirely in the browser. No server backend — all processing happens client-side.

Live at: https://lsdjs.laamaa.fi

## Commands

```bash
npm run dev          # Start Vite dev server on http://localhost:3000
npm run build        # TypeScript check + Vite production build
npm test             # Run tests once (vitest run)
npm run test:watch   # Run tests in watch mode
npm test -- SampleEditor   # Run a single test file by name match
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
```

Requires Node >= 22. Build output goes to `build/`.

## Architecture

### Data Flow

```
React Components (src/components/)
    ↓ dispatch actions
Redux Store (src/store/) — 4 slices: rom, kit, saveFile, ui
    ↓ async thunks call
Services (src/services/) — binary parsing, audio, file I/O
    ↓ operate on
Binary Data (ArrayBuffer/Uint8Array) & Web Audio API
```

### Redux Store (`src/store/`)

- **romSlice** — ROM file loading/export, ROM metadata and binary data
- **kitSlice** — Sample kit management, audio editing operations (volume, pitch, trim, fade, crop), audio playback via `kitMiddleware`
- **saveFileSlice** — LSDJ `.sav` file loading, song import/export/selection
- **uiSlice** — Active tab, modals, notifications

Use `useAppDispatch` and `useAppSelector` from `src/store/hooks.ts` (not plain `useDispatch`/`useSelector`).

Non-serializable data (ROM binary buffers, Sample instances) is stored in Redux with serialization checks disabled for those paths.

### Services (`src/services/`)

- **binary/** — Low-level binary read/write (`BinaryProcessor`), Game Boy ROM parsing (`RomProcessor`), font tile manipulation (`FontProcessor`), palette data (`PaletteProcessor`), save file format (`SaveFileProcessor`)
- **audio/** — Web Audio playback (`AudioService`), `Sample` class with editing methods, `SampleBankCompiler` for ROM bank read/write, `SampleFactory` for creating samples from files
- **file/** — File System Access API wrapper with download fallback (`FileService`)

### Components (`src/components/`)

- **editors/** — Feature editors: `KitEditor`, `SampleEditor`, `FontEditor`, `PaletteEditor`, `SongManager`. These dispatch Redux thunks and render domain-specific UIs.
- **common/** — Reusable UI primitives (Button, Card, Layout, Slider, etc.), barrel-exported from `index.ts`
- **core/** — `RomInfoDisplay`, `AudioPlaybackTest`

### Path Alias

`@` is aliased to `src/` in Vite config (e.g., `import { something } from '@/services/audio'`).

## LSDJ Domain Concepts

- **ROM banks**: 64 banks of 16KB (0x4000 bytes) each. Sample kits live in specific banks.
- **Kit**: Up to 15 audio samples compiled into a ROM bank via `SampleBankCompiler`
- **Fonts**: 3 fonts per ROM, each with 8x8 pixel tiles (4-color palette)
- **Palettes**: 5 color sets per palette using RGB555 format (5 bits per channel)
- **ROM checksums**: Must be fixed before saving (`RomProcessor.fixChecksum`), otherwise the ROM is invalid

## Testing

- Framework: **Vitest** with **jsdom** environment and **@testing-library/react**
- Test helper: `renderWithRedux()` in `src/utils/test-utils.tsx` wraps components with Redux Provider
- Setup file: `src/setupTests.ts` mocks File System Access API, Web Audio, Canvas, ResizeObserver
- Coverage thresholds: 80% (statements, branches, functions, lines)
- Tests live in `__tests__/` directories alongside the code they test

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages on push to `main`.
