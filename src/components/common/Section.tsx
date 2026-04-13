import {ReactNode} from 'react';
import './Section.css';

interface SectionProps {
  title: string;
  children: ReactNode;
  className?: string;
  id?: string;
}

/**
 * Section component for dividing content into distinct sections
 * Provides consistent styling for section headings and content
 */
export function Section({ title, children, className = '', id }: SectionProps) {
  // Generate a unique ID for the section title if not provided
  const sectionId = id || `section-${title.toLowerCase().replace(/\s+/g, '-')}`;
  const titleId = `${sectionId}-title`;

  return (
    <section 
      id={sectionId}
      className={`section ${className}`}
      aria-labelledby={titleId}
    >
      <h2 id={titleId} className="section-title">{title}</h2>
      <div className="section-content" role="region" aria-label={`${title} content`}>
        {children}
      </div>
    </section>
  );
}
