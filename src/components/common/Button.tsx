import {ButtonHTMLAttributes, ReactNode} from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

/**
 * Button component for actions throughout the application
 * Provides consistent styling with different variants and sizes
 */
export function Button({
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`button button-${variant} button-${size} ${fullWidth ? 'full-width' : ''} ${className}`}
      role="button"
      aria-disabled={props.disabled}
      {...props}
    >
      {children}

      <style>{`
        .button {
          display: inline-block;
          border: 4px solid var(--gb-light);
          background-color: var(--gb-dark);
          color: var(--gb-lightest);
          font-family: 'Press Start 2P', cursive;
          cursor: pointer;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 1px;
          position: relative;
          box-shadow: 4px 4px 0 var(--gb-darkest);
          transition: all 0.1s;
        }

        .button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 6px 6px 0 var(--gb-darkest);
        }

        .button:active:not(:disabled) {
          transform: translateY(2px);
          box-shadow: 2px 2px 0 var(--gb-darkest);
        }

        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .button-primary {
          background-color: var(--gb-dark);
          color: var(--gb-lightest);
          border-color: var(--gb-light);
        }

        .button-primary:hover:not(:disabled) {
          background-color: var(--gb-light);
          color: var(--gb-darkest);
        }

        .button-secondary {
          background-color: var(--gb-darkest);
          color: var(--gb-light);
          border-color: var(--gb-light);
        }

        .button-secondary:hover:not(:disabled) {
          background-color: var(--gb-dark);
          color: var(--gb-lightest);
        }

        .button-danger {
          background-color: var(--gb-dark);
          color: var(--gb-lightest);
          border-color: var(--gb-light);
          border-style: dashed;
        }

        .button-danger:hover:not(:disabled) {
          background-color: var(--gb-light);
          color: var(--gb-darkest);
        }

        .button-small {
          padding: 0.25rem 0.5rem;
          font-size: 0.6rem;
        }

        .button-medium {
          padding: 0.5rem 0.75rem;
          font-size: 0.7rem;
        }

        .button-large {
          padding: 0.75rem 1rem;
          font-size: 0.8rem;
        }

        .full-width {
          display: block;
          width: 100%;
        }
      `}</style>
    </button>
  );
}
