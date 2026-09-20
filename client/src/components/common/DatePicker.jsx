import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown, X } from 'lucide-react';
import { Calendar } from './Calendar';
import { Button } from './Button';

export const DatePicker = ({
  value, // string 'YYYY-MM-DD' or range { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' } or preset key
  onChange,
  isRange = false,
  preset = 'this_month', // 'today' | 'this_week' | 'this_month' | 'custom'
  onPresetChange,
  placeholder = 'Select date...',
  label,
  error,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const [tempRange, setTempRange] = useState(() => {
    if (typeof value === 'object' && value !== null) {
      return { start: value.start || '', end: value.end || '' };
    }
    return { start: '', end: '' };
  });

  const [selectedPreset, setSelectedPreset] = useState(preset || 'this_month');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
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

  const presets = [
    { key: 'today', label: 'Today' },
    { key: 'this_week', label: 'This Week' },
    { key: 'this_month', label: 'This Month' },
    { key: 'custom', label: 'Custom Range' },
  ];

  const getPresetDates = (presetKey) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (presetKey === 'today') {
      const todayStr = toStr(now);
      return { start: todayStr, end: todayStr, label: 'Today' };
    }
    if (presetKey === 'this_week') {
      const dayOfWeek = now.getDay();
      const firstDay = new Date(now);
      firstDay.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      return { start: toStr(firstDay), end: toStr(now), label: 'This Week' };
    }
    if (presetKey === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: toStr(firstDay), end: toStr(now), label: 'This Month' };
    }
    return { start: tempRange.start, end: tempRange.end, label: 'Custom Range' };
  };

  const handleSelectPreset = (pKey) => {
    setSelectedPreset(pKey);
    const range = getPresetDates(pKey);
    if (pKey !== 'custom') {
      if (onChange) onChange(range);
      if (onPresetChange) onPresetChange(pKey);
      setIsOpen(false);
    }
  };

  const handleCalendarClick = (dateStr) => {
    if (!isRange) {
      if (onChange) onChange(dateStr);
      setIsOpen(false);
    } else {
      if (!tempRange.start || (tempRange.start && tempRange.end)) {
        setTempRange({ start: dateStr, end: '' });
      } else if (tempRange.start && !tempRange.end) {
        if (dateStr < tempRange.start) {
          setTempRange({ start: dateStr, end: tempRange.start });
        } else {
          setTempRange({ start: tempRange.start, end: dateStr });
        }
      }
    }
  };

  const handleApplyCustom = () => {
    if (tempRange.start && tempRange.end) {
      if (onChange) onChange(tempRange);
      if (onPresetChange) onPresetChange('custom');
      setIsOpen(false);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setTempRange({ start: '', end: '' });
    setSelectedPreset('this_month');
    if (onChange) onChange(isRange ? { start: '', end: '' } : '');
  };

  // Display label
  const displayText = (() => {
    if (typeof value === 'string' && value) return value;
    if (typeof value === 'object' && value?.start && value?.end) {
      return `${value.start} — ${value.end}`;
    }
    const currentPresetObj = presets.find((p) => p.key === selectedPreset);
    if (currentPresetObj && currentPresetObj.key !== 'custom') {
      return currentPresetObj.label;
    }
    return placeholder;
  })();

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && <label className="text-xs font-semibold text-gray-700">{label}</label>}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between gap-2.5 bg-white border rounded-lg px-3.5 py-2 text-xs sm:text-sm font-medium
          transition-all duration-150 text-left hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935] cursor-pointer
          ${error ? 'border-red-400' : 'border-[#E5E7EB]'}
          ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-gray-800'}
        `}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-4 h-4 text-[#E53935] shrink-0" />
          <span className="truncate">{displayText}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 text-gray-400">
          {((typeof value === 'string' && value) || (typeof value === 'object' && value?.start)) && (
            <span
              onClick={handleClear}
              className="hover:text-gray-600 p-0.5 rounded cursor-pointer"
              title="Clear date"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 right-0 z-50 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden min-w-[280px] animate-fadeIn">
          {/* Preset Buttons */}
          <div className="p-2 border-b border-gray-100 flex flex-wrap gap-1 bg-gray-50/50">
            {presets.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => handleSelectPreset(p.key)}
                className={`
                  px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer
                  ${
                    selectedPreset === p.key
                      ? 'bg-[#E53935] text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-200/60'
                  }
                `}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendar Picker */}
          <Calendar
            selectedDate={typeof value === 'string' ? value : undefined}
            onSelectDate={handleCalendarClick}
            startDate={tempRange.start}
            endDate={tempRange.end}
            isRange={isRange}
          />

          {/* Footer Actions */}
          <div className="p-2.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-2">
            <span className="text-[11px] text-gray-500">
              {isRange
                ? tempRange.start
                  ? `${tempRange.start} to ${tempRange.end || '...'}`
                  : 'Select range'
                : 'Select single date'}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  if (onChange) onChange(isRange ? { start: todayStr, end: todayStr } : todayStr);
                  setIsOpen(false);
                }}
              >
                Today
              </Button>
              {isRange && (
                <Button
                  variant="primary"
                  size="xs"
                  disabled={!tempRange.start || !tempRange.end}
                  onClick={handleApplyCustom}
                >
                  Apply
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
