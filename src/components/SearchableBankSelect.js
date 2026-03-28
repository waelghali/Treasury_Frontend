// frontend/src/components/SearchableBankSelect.js
// Shared searchable dropdown component for bank selection across the app.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ChevronDown } from 'lucide-react';

/**
 * SearchableBankSelect — a reusable, searchable dropdown.
 *
 * Props:
 *   banks      – Array of { id, name } (the option list)
 *   value      – currently selected bank id (string or number)
 *   onChange   – (bankId: string) => void   — called with the new id as a string
 *   placeholder – placeholder text (default: "Search bank…")
 *   disabled   – boolean
 *   required   – boolean
 *   className  – extra wrapper class names
 *   inputClassName – extra class names applied to the <input>
 *   label      – optional label rendered above the input
 *   labelClassName – class names for the label
 *   name       – form field name (optional, used by some callers)
 *   allOption  – if truthy string like "All Banks", renders an "all" entry at the top
 */
const SearchableBankSelect = ({
  banks = [],
  value,
  onChange,
  placeholder = 'Search bank…',
  disabled = false,
  required = false,
  className = '',
  inputClassName = '',
  label,
  labelClassName = '',
  name,
  allOption,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Build normalised options list
  const options = React.useMemo(() => {
    const base = banks.map(b => ({ value: String(b.id), label: b.name }));
    if (allOption) {
      base.unshift({ value: '', label: allOption });
    }
    return base;
  }, [banks, allOption]);

  const selectedOption = options.find(opt => String(opt.value) === String(value ?? ''));

  const isSearchActive = searchTerm.length > 0 && !(selectedOption && selectedOption.label === searchTerm);

  const filteredOptions = isSearchActive
    ? options.filter(o => o.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  const handleSelect = (option) => {
    onChange(option.value);
    setSearchTerm(option.label);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleInputChange = (e) => {
    const newTerm = e.target.value;
    setSearchTerm(newTerm);
    setIsOpen(true);
    setHighlightedIndex(-1);

    if (String(value).length > 0 && (selectedOption ? selectedOption.label !== newTerm : true)) {
      onChange('');
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (wrapperRef.current && !wrapperRef.current.contains(document.activeElement)) {
        setIsOpen(false);
        setSearchTerm(selectedOption ? selectedOption.label : '');
      }
    }, 150);
  };

  const handleFocus = () => {
    setIsOpen(true);
    if (!selectedOption) setSearchTerm('');
  };

  const handleKeyDown = useCallback((e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (filteredOptions.length === 1) {
          handleSelect(filteredOptions[0]);
        } else if (selectedOption && selectedOption.label === searchTerm) {
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, highlightedIndex, filteredOptions, searchTerm, selectedOption]);

  useEffect(() => {
    const outside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);

  useEffect(() => {
    setSearchTerm(selectedOption ? selectedOption.label : '');
  }, [value, selectedOption]);

  const defaultInputCls =
    'w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white';

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {label && <label className={labelClassName}>{label}</label>}
      <div className={`relative ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          ref={inputRef}
          name={name}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          className={inputClassName || defaultInputCls}
          disabled={disabled}
          autoComplete="off"
        />
        <ChevronDown
          className={`absolute right-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform duration-200 pointer-events-none ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
          {filteredOptions.map((option, index) => (
            <li
              key={option.value || '__all__'}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(option);
              }}
              className={`px-3 py-2 cursor-pointer text-sm transition-colors ${
                index === highlightedIndex ? 'bg-blue-100' : 'hover:bg-gray-50'
              } ${String(option.value) === String(value) ? 'bg-blue-50 font-semibold' : ''}`}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
      {isOpen && filteredOptions.length === 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 px-3 py-2 text-sm text-gray-500">
          No matches found for "{searchTerm}"
        </div>
      )}
    </div>
  );
};

export default SearchableBankSelect;
