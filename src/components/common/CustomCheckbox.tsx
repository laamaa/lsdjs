import React, { useCallback, useRef } from 'react';
import './CustomCheckbox.css';

interface CustomCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  color?: 'default' | 'red' | 'green' | 'blue';
}

/**
 * A custom checkbox component that provides a more stylized and consistent UI
 * for checkbox inputs across the application.
 */
export function CustomCheckbox({
  id,
  label,
  checked,
  onChange,
  disabled = false,
  className = '',
  color = 'default'
}: CustomCheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.checked);
    },
    [onChange]
  );

  const handleVisualClick = useCallback(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  }, [disabled]);

  return (
    <div className={`custom-checkbox ${className}`}>
      {label && (
        <label 
          htmlFor={id}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          {label}
        </label>
      )}
      <div className="checkbox-container">
        <input
          ref={inputRef}
          id={id}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="checkbox-input"
          aria-checked={checked}
        />
        <div 
          className={`checkbox-visual ${color} ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}`}
          aria-hidden="true"
          onClick={handleVisualClick}
        >
          {checked && (
            <svg className="checkbox-checkmark" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
