import {ReactNode} from 'react';

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

      <style>{`
        .container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem;
          box-sizing: border-box;
        }

        @media (min-width: 768px) {
          .container {
            padding: 2rem;
          }
        }
      `}</style>
    </div>
  );
}
