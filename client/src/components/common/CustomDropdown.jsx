import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

/**
 * Premium Unified Custom Dropdown Component
 * Used across the entire portal for:
 * - Month / Calendar selection
 * - Company filter selection
 * - Status selection (PAID, HOLD, PENDING, Active, Inactive, etc.)
 * - General Form selects
 */
export const CustomDropdown = ({
  value,
  onChange,
  options = [], // ['September', ...] or [{ value, label, icon: Icon, badge, color }]
  placeholder = 'Select option',
  icon: LeadingIcon,
  label = '',
  size = 'md', // 'sm' | 'md' | 'pill'
  searchable = false,
  disabled = false,
  fullWidth = false,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  align = 'left', // 'left' | 'right'
  minWidth = '160px',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      if (searchable && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, searchable]);

  // Normalized options
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value,
        label: opt.label !== undefined ? opt.label : opt.value,
        icon: opt.icon,
        badge: opt.badge,
        color: opt.color,
        pillClass: opt.pillClass,
      };
    }
    return {
      value: opt,
      label: opt,
    };
  });

  // Selected Option Object
  const selectedOption = normalizedOptions.find((opt) => opt.value === value) || {
    value: value || '',
    label: value || placeholder,
  };

  // Filtered by search
  const filteredOptions = searchable
    ? normalizedOptions.filter((opt) =>
        String(opt.label).toLowerCase().includes(searchTerm.toLowerCase())
      )
    : normalizedOptions;

  const handleSelect = (val) => {
    if (disabled) return;
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Size specific styles
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5';
      case 'pill':
        return 'px-3 py-1 text-xs font-bold rounded-md gap-1.5 shadow-2xs';
      case 'md':
      default:
        return 'px-3.5 py-2 text-xs font-semibold rounded-xl gap-2 shadow-2xs';
    }
  };

  const isFullWidth = fullWidth || className.includes('w-full');

  return (
    <div
      className={`relative ${isFullWidth ? 'w-full block' : 'inline-block'} text-left ${className}`}
      ref={dropdownRef}
    >
      {label && (
        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
          {label}
        </label>
      )}

      {/* Dropdown Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between transition-all duration-150 border cursor-pointer select-none outline-none
          ${isFullWidth ? 'w-full' : ''}
          ${getSizeStyles()}
          ${
            selectedOption.pillClass
              ? selectedOption.pillClass
              : isOpen
              ? 'bg-white border-primary-500 ring-2 ring-primary-100 text-gray-900 shadow-sm'
              : 'bg-white hover:bg-gray-50/90 border-gray-200 text-gray-800 hover:border-gray-300'
          }
          ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}
          ${buttonClassName}
        `}
        style={!isFullWidth && minWidth ? { minWidth } : {}}
      >
        <div className="flex items-center gap-2 truncate">
          {LeadingIcon && <LeadingIcon className="w-3.5 h-3.5 text-gray-500 shrink-0" />}
          {selectedOption.icon && !LeadingIcon && (
            <selectedOption.icon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          )}
          <span className="truncate font-semibold">{selectedOption.label}</span>
          {selectedOption.badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">
              {selectedOption.badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary-600' : ''
          }`}
        />
      </button>

      {/* Floating Menu */}
      {isOpen && (
        <div
          className={`
            absolute z-50 mt-1.5 rounded-xl bg-white border border-gray-200 shadow-xl py-1.5
            animate-in fade-in zoom-in-95 duration-150 max-h-64 overflow-y-auto scrollbar-thin
            ${align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'}
            ${isFullWidth ? 'w-full' : ''}
            ${menuClassName}
          `}
          style={{ minWidth: isFullWidth ? '100%' : 'max(100%, 180px)' }}
        >
          {/* Search box if enabled */}
          {searchable && (
            <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2 text-gray-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-7 pr-7 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400 text-center">No options found</div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              const OptIcon = opt.icon;

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`
                    w-full text-left px-3 py-2 flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer
                    ${
                      isSelected
                        ? 'bg-primary-50 text-primary-800 font-bold'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 truncate">
                    {OptIcon && <OptIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-primary-600' : 'text-gray-400'}`} />}
                    {opt.color && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: opt.color }}
                      />
                    )}
                    <span className="truncate">{opt.label}</span>
                    {opt.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">
                        {opt.badge}
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-primary-600 shrink-0 ml-2" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

