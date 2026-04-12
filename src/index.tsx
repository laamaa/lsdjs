import React from 'react';
import ReactDOM from 'react-dom/client';
import {Provider} from 'react-redux';
import './index.css';
import App from './App';
import {ThemeProvider} from './context/ThemeContext';
import {SaveFileProvider} from './context/SaveFileContext';
import {RomProvider} from './context/RomContext';
import {KitProvider} from './context/KitContext';
import {store} from './store';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <RomProvider>
          <KitProvider>
            <SaveFileProvider>
              <App />
            </SaveFileProvider>
          </KitProvider>
        </RomProvider>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
