import React, { useState, useRef, useEffect } from 'react';

export const Dropdown = ({
  trigger,
  items = [], // [{ label, icon: Icon, onClick, danger, disabled, divider }]
  children,
  align = 'right', // 'left' | 'right'
  className = '',
  menuClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {isOpen && (
        <div
          className={`
            absolute z-50 mt-1.5 w-48 rounded-lg bg-white shadow-lg border border-gray-100 py-1.5
            animate-fadeIn text-xs
            ${align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'}
            ${menuClassName}
          `}
        >
          {children ? (
            children({ close: () => setIsOpen(false) })
          ) : (
            items.map((item, index) => {
              if (item.divider) {
                return <div key={`div-${index}`} className="my-1 border-t border-gray-100" />;
              }
              const Icon = item.icon;
              return (
                <button
                  key={item.label || index}
                  type="button"
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!item.disabled && item.onClick) {
                      item.onClick();
                      setIsOpen(false);
                    }
                  }}
                  className={`
                    w-full text-left px-3.5 py-2 flex items-center gap-2.5 transition-colors font-medium
                    ${
                      item.danger
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                    ${item.disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}
                  `}
                >
                  {Icon && <Icon className="w-4 h-4 shrink-0" />}
                  <span>{item.label}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
