import {ReactNode} from 'react';

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

      <style>{`
        .section {
          margin-bottom: 2rem;
          background-color: var(--gb-dark);
          border: 4px solid var(--gb-light);
          overflow: hidden;
          position: relative;
          box-shadow: 6px 6px 0 var(--gb-darkest);
        }

        .section-title {
          margin: 0;
          padding: 0.75rem;
          background-color: var(--gb-light);
          color: var(--gb-darkest);
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-bottom: 4px solid var(--gb-light);
          text-shadow: 1px 1px 0 var(--gb-lightest);
        }

        .section-content {
          padding: 0.75rem;
          background-color: var(--gb-darkest);
          color: var(--gb-lightest);
          position: relative;
          overflow: hidden;
        }

        .section-content::before {
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

        @media (min-width: 768px) {
          .section-title {
            font-size: 1rem;
            padding: 0.75rem 1rem;
          }

          .section-content {
            padding: 1rem;
          }
        }
      `}</style>
    </section>
  );
}
