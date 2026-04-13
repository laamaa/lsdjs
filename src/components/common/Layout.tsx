import React, {ReactNode} from 'react';
import {Navbar} from './Navbar';
import {ScrollToTopButton} from './ScrollToTopButton';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Layout component that provides a consistent structure for all pages
 * Includes the Navbar and wraps the content in a main container
 */
export function Layout({ children }: LayoutProps) {
  return (
    <div className="app-container" role="application" aria-label="LSDjs Application">
      <Navbar />
      <ScrollToTopButton />
      <main className="main-content" role="main" aria-label="Main content">
        {children}
      </main>
      <footer className="app-footer" role="contentinfo" aria-label="Application footer">
        <p>LSDjs - Version 0.2.0 | <a href="https://github.com/laamaa/lsdjs" target="_blank" rel="noopener noreferrer" className="footer-link">GitHub</a></p>
      </footer>
    </div>
  );
}
