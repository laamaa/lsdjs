import React, { useState, useRef, useEffect } from 'react';
import './DropdownSelector.css';

interface DropdownSelectorProps {
  selectedIndex: number;
  options: string[];
  onSelect: (index: number) => void;
  onNameChange?: (name: string) => void;
  disabled?: boolean;
  maxNameLength?: number;
  editable?: boolean;
  placeholder?: string;
  className?: string;
  showIndexPrefix?: boolean;
}

export function DropdownSelector({
  selectedIndex,
  options,
  onSelect,
  onNameChange,
  disabled = false,
  maxNameLength = 6,
  editable = false,
  placeholder = "Name",
  className = '',
  showIndexPrefix = true
}: DropdownSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editableName, setEditableName] = useState(options[selectedIndex] || '');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Format index to always have two digits, starting from 00
  const formatIndex = (index: number): string => {
    return index.toString().padStart(2, '0');
  };

  // Update editable name when selected option changes
  useEffect(() => {
    if (editable && options[selectedIndex]) {
      setEditableName(options[selectedIndex]);
    }
  }, [selectedIndex, options, editable]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current && editable) {
      inputRef.current.focus();
    }
  }, [isOpen, editable]);

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (index: number) => {
    onSelect(index);
    setIsOpen(false);

    // Update editable name if editable
    if (editable && options[index]) {
      setEditableName(options[index]);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setEditableName(newName);
    if (onNameChange) {
      onNameChange(newName);
    }
  };

  return (
    <div className={`dropdown-selector ${className}`} ref={dropdownRef}>
      <div 
        className={`selector-header ${disabled ? 'disabled' : ''}`} 
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {showIndexPrefix && <span className="index-indicator">{formatIndex(selectedIndex)}</span>}
        {editable ? (
          <input
            ref={inputRef}
            type="text"
            className="name-input"
            value={editableName}
            onChange={handleNameChange}
            maxLength={maxNameLength}
            placeholder={placeholder}
            disabled={disabled}
            onClick={(e) => e.stopPropagation()}
            aria-label={placeholder}
          />
        ) : (
          <span className="name-display">{options[selectedIndex] || placeholder}</span>
        )}
        <span className="dropdown-arrow">▼</span>
      </div>

      {isOpen && (
        <div className="dropdown-menu" role="listbox" aria-label="Available options">
          {options.map((option, index) => (
            <div
              key={index}
              className={`option-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSelect(index)}
              role="option"
              aria-selected={index === selectedIndex}
            >
              {showIndexPrefix && <span className="option-index">{formatIndex(index)}</span>}
              <span className="option-name">{option}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
