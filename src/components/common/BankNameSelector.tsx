import React, { useState, useRef, useEffect } from 'react';
import './BankNameSelector.css';

interface BankNameSelectorProps {
  bankNumber: number;
  kitName: string;
  onBankChange: (bankIndex: number) => void;
  onNameChange: (name: string) => void;
  availableBanks: number[];
  kitNames?: Record<number, string>;
  disabled?: boolean;
  maxNameLength?: number;
}

export function BankNameSelector({
  bankNumber,
  kitName,
  onBankChange,
  onNameChange,
  availableBanks,
  kitNames = {},
  disabled = false,
  maxNameLength = 6
}: BankNameSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Format bank number to always have two digits, starting from 00 and displayed in hex
  const formatBankNumber = (bank: number): string => {
    // Get the index of the bank in the availableBanks array
    const index = availableBanks.indexOf(bank);
    // Convert to hex and ensure it's always two digits
    return (index >= 0 ? index : bank).toString(16).toUpperCase().padStart(2, '0');
  };

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
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleBankSelect = (bankIndex: number) => {
    onBankChange(bankIndex);
    setIsOpen(false);
  };

  return (
    <div className="bank-name-selector" ref={dropdownRef}>

      <div 
        className={`selector-header ${disabled ? 'disabled' : ''}`} 
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="bank-indicator">{formatBankNumber(bankNumber)}</span>
        <input
          ref={inputRef}
          type="text"
          className="name-input"
          value={kitName}
          onChange={(e) => onNameChange(e.target.value)}
          maxLength={maxNameLength}
          placeholder="Kit name"
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
          aria-label="Kit name"
        />
        <span className="dropdown-arrow">▼</span>
      </div>

      {isOpen && (
        <div className="dropdown-menu" role="listbox" aria-label="Available banks">
          {availableBanks.map((bank) => (
            <div
              key={bank}
              className={`bank-option ${bank === bankNumber ? 'selected' : ''}`}
              onClick={() => handleBankSelect(bank)}
              role="option"
              aria-selected={bank === bankNumber}
            >
              <span className="bank-number">{formatBankNumber(bank)}</span>
              {bank === bankNumber && kitName ? (
                <span className="kit-name">{kitName}</span>
              ) : kitNames[bank] ? (
                <span className="kit-name">{kitNames[bank]}</span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
