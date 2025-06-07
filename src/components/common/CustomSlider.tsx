import React, { useCallback } from 'react';
import './CustomSlider.css';

interface CustomSliderProps {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  showValue?: boolean;
  valueLabel?: string;
  className?: string;
  color?: 'default' | 'red' | 'green' | 'blue';
}

/**
 * A custom slider component that provides a more stylized and consistent UI
 * for range inputs across the application.
 */
export function CustomSlider({
  id,
  label,
  min,
  max,
  step,
  value,
  onChange,
  disabled = false,
  showValue = true,
  valueLabel = '',
  className = '',
  color = 'default'
}: CustomSliderProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    },
    [onChange]
  );

  return (
    <div className={`custom-slider ${className}`}>
      {label && <label htmlFor={id}>{label}</label>}
      <div className="slider-container">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={`slider-input ${color}`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />
        <div 
          className="slider-track"
          style={{
            width: `${((value - min) / (max - min)) * 100}%`
          }}
        />
      </div>
      {showValue && (
        <span className="slider-value">
          {value}{valueLabel}
        </span>
      )}
    </div>
  );
}