import React, {ReactNode} from 'react';
import {Navbar} from './Navbar';
import {ScrollToTopButton} from './ScrollToTopButton';

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
        <p>LSDjs - Version 0.2.0</p>
      </footer>

      <style>{`
        .app-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background-color: var(--gb-darkest);
          position: relative;
          overflow-x: hidden; /* Prevent horizontal scrolling on mobile */
        }

        .app-container::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            0deg,
            rgba(155, 188, 15, 0.02),
            rgba(155, 188, 15, 0.02) 1px,
            transparent 1px,
            transparent 2px
          );
          pointer-events: none;
          z-index: 1;
        }

        .main-content {
          flex: 1;
          padding: 1rem;
          width: 100%;
          box-sizing: border-box;
          max-width: 800px;
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }

        .app-footer {
          background-color: var(--gb-dark);
          color: var(--gb-lightest);
          padding: 0.75rem;
          text-align: center;
          font-size: 0.6rem;
          border-top: 4px solid var(--gb-light);
          position: relative;
          z-index: 2;
        }

        @media (min-width: 768px) {
          .main-content {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
