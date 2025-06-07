import {ReactNode} from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  footer?: ReactNode;
  className?: string;
  /**
   * Optional ID for the card header. If not provided and title exists, a deterministic ID will be generated.
   */
  headerId?: string;
}

/**
 * Card component for displaying content in a card-like container
 * Provides consistent styling with optional header and footer
 */
export function Card({ children, title, footer, className = '', headerId: propHeaderId }: CardProps) {
  // Use provided headerId or generate a deterministic one based on the title
  const headerId = propHeaderId || (title ? `card-header-${title.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div 
      className={`card ${className}`}
      role="region"
      aria-labelledby={headerId}
    >
      {title && <div className="card-header" id={headerId} role="heading" aria-level={3}>{title}</div>}
      <div className="card-body" role="group">{children}</div>
      {footer && <div className="card-footer" role="contentinfo">{footer}</div>}

      <style>{`
        .card {
          background-color: var(--gb-dark);
          border: 4px solid var(--gb-light);
          box-shadow: 4px 4px 0 var(--gb-darkest);
          overflow: hidden;
          margin-bottom: 1.5rem;
          position: relative;
        }

        .card-header {
          padding: 0.75rem;
          background-color: var(--gb-light);
          border-bottom: 4px solid var(--gb-light);
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--gb-darkest);
          text-shadow: 1px 1px 0 var(--gb-lightest);
        }

        .card-body {
          padding: 0.75rem;
          background-color: var(--gb-darkest);
          color: var(--gb-lightest);
          position: relative;
        }

        .card-body::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            0deg,
            rgba(155, 188, 15, 0.03),
            rgba(155, 188, 15, 0.03) 1px,
            transparent 1px,
            transparent 2px
          );
          pointer-events: none;
          z-index: 1;
        }

        .card-footer {
          padding: 0.75rem;
          background-color: var(--gb-dark);
          border-top: 4px solid var(--gb-light);
          color: var(--gb-lightest);
          font-size: 0.7rem;
        }

        @media (min-width: 768px) {
          .card {
            margin-bottom: 2rem;
          }

          .card-header {
            padding: 0.75rem 1rem;
          }

          .card-body {
            padding: 1rem;
          }

          .card-footer {
            padding: 0.75rem 1rem;
          }
        }
      `}</style>
    </div>
  );
}
