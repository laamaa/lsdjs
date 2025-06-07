import React, { useState, useEffect } from 'react';
import './ScrollToTopButton.css';

/**
 * ScrollToTopButton component
 * A floating button that appears in the top left corner when the navbar is scrolled out of view
 * Clicking the button scrolls the page back to the top
 */
export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  // Check scroll position and update button visibility
  useEffect(() => {
    const checkScrollPosition = () => {
      // Show button when scrolled past the navbar height (approximately 60px)
      const scrollPosition = window.scrollY;
      setIsVisible(scrollPosition > 60);
    };

    // Add scroll event listener
    window.addEventListener('scroll', checkScrollPosition);

    // Initial check
    checkScrollPosition();

    // Clean up event listener
    return () => window.removeEventListener('scroll', checkScrollPosition);
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <button 
      className="scroll-to-top-button" 
      onClick={scrollToTop}
      aria-label="Scroll to top"
      title="Scroll to top"
    >
      <svg 
        className="scroll-to-top-icon"
        viewBox="0 0 16 16" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path 
          d="M8 3L14 9L12.6 10.4L8 5.8L3.4 10.4L2 9L8 3Z" 
          fill="currentColor" 
        />
      </svg>
    </button>
  );
}
