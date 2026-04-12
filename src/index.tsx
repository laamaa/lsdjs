import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import {ThemeProvider} from './context/ThemeContext';
import {SaveFileProvider} from './context/SaveFileContext';
import {RomProvider} from './context/RomContext';
import {KitProvider} from './context/KitContext';
import {RomKitSync} from './context/RomKitSync';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <RomProvider>
        <KitProvider>
          <RomKitSync />
          <SaveFileProvider>
            <App />
          </SaveFileProvider>
        </KitProvider>
      </RomProvider>
    </ThemeProvider>
  </React.StrictMode>
);
