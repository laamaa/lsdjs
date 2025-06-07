import {useState} from 'react';
import {AppThemeSelector} from './AppThemeSelector';
import './Navbar.css';

/**
 * Navbar component for navigation between different sections of the application
 * Responsive design with mobile menu toggle
 */
export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLinkClick = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  };

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-container">
        <div className="navbar-logo">
          <h1>LSDjs</h1>
        </div>

        <ul 
          className={`navbar-menu ${isMenuOpen ? 'open' : ''}`}
          role="menubar"
          aria-hidden={!isMenuOpen && window.innerWidth < 768}
        >
          <li className="navbar-item" role="none">
            <a href="#rom-info" className="navbar-link" role="menuitem" onClick={handleLinkClick}>ROM Info</a>
          </li>
          <li className="navbar-item" role="none">
            <a href="#song-manager" className="navbar-link" role="menuitem" onClick={handleLinkClick}>Song Manager</a>
          </li>
          <li className="navbar-item" role="none">
            <a href="#kit-editor" className="navbar-link" role="menuitem" onClick={handleLinkClick}>Kit Editor</a>
          </li>
          <li className="navbar-item" role="none">
            <a href="#font-editor" className="navbar-link" role="menuitem" onClick={handleLinkClick}>Font Editor</a>
          </li>
          <li className="navbar-item" role="none">
            <a href="#palette-editor" className="navbar-link" role="menuitem" onClick={handleLinkClick}>Palette Editor</a>
          </li>
        </ul>

        <div className="navbar-actions">
          <AppThemeSelector className="navbar-theme-selector" hideFromScreenReaders={true} />

          <button 
            className="menu-toggle" 
            onClick={toggleMenu}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
          >
            <span className="menu-icon"></span>
          </button>
        </div>
      </div>
    </nav>
  );
}
