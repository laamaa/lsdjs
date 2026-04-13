import {ReactNode} from 'react';
import './Container.css';

interface ContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Container component for wrapping content in a consistent way
 * Provides consistent padding, max-width, and other styling
 */
export function Container({ children, className = '' }: ContainerProps) {
  return (
    <div 
      className={`container ${className}`}
      role="region"
      aria-label="Content container"
    >
      {children}
    </div>
  );
}
