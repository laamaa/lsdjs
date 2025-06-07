import React from 'react';
import './App.css';
import {RomInfoDisplay} from './components/core/RomInfoDisplay';
import {SongManager} from './components/editors/SongManager';
import {KitEditor} from './components/editors/KitEditor';
import {FontEditor} from './components/editors/FontEditor';
import {PaletteEditor} from './components/editors/PaletteEditor';
import {Container, Layout, Section} from './components/common';

function App() {
  return (
    <Layout>
      <Container>
        <Section id="rom-info" title="ROM Information">
          <RomInfoDisplay />
        </Section>

        <Section id="song-manager" title="Song Manager">
          <SongManager />
        </Section>

        <Section id="kit-editor" title="Kit Editor">
          <KitEditor />
        </Section>

        <Section id="font-editor" title="Font Editor">
          <FontEditor />
        </Section>

        <Section id="palette-editor" title="Palette Editor">
          <PaletteEditor />
        </Section>
      </Container>
    </Layout>
  );
}

export default App;
