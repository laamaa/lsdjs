import {ReactNode} from 'react';
import './Card.css';

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
    </div>
  );
}
