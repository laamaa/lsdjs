import {ButtonHTMLAttributes, ReactNode} from 'react';
import './Button.css';

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
    </button>
  );
}
