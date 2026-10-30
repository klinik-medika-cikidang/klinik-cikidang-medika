'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { CaretDown, Check, MagnifyingGlass } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string | number;
  label: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  icon?: React.ReactNode;
  /** Options sharing a group are listed under one heading, in the order given. */
  group?: string;
}

export interface SelectProps {
  id?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement> | any) => void;
  onValueChange?: (val: string) => void;
  options?: SelectOption[] | readonly (string | SelectOption)[];
  children?: React.ReactNode;
  leftElement?: React.ReactNode;
  error?: string;
  helperText?: string;
  requiredIndicator?: boolean;
  disabled?: boolean;
  className?: string;
  headerTitle?: string;
  searchable?: boolean;
  size?: 'sm' | 'md';
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      requiredIndicator,
      options,
      children,
      id,
      name,
      value,
      defaultValue,
      onChange,
      onValueChange,
      placeholder = 'Pilih salah satu...',
      leftElement,
      disabled = false,
      headerTitle,
      searchable,
      size = 'md',
    },
    forwardedRef
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [internalValue, setInternalValue] = useState<string | number>(
      value !== undefined ? value : defaultValue !== undefined ? defaultValue : ''
    );
    const [searchQuery, setSearchQuery] = useState('');

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    // Synchronize internal value when controlled value changes
    useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value);
      }
    }, [value]);

    // Parse options from array or children
    const parsedOptions = useMemo<SelectOption[]>(() => {
      if (options && Array.isArray(options)) {
        return options.map((opt) => {
          if (typeof opt === 'string' || typeof opt === 'number') {
            return { value: opt, label: String(opt) };
          }
          return opt;
        });
      }

      // If children passed like <option value="...">...</option>
      if (children) {
        const extracted: SelectOption[] = [];
        React.Children.forEach(children, (child) => {
          if (React.isValidElement(child) && child.props) {
            const childProps = child.props as Record<string, any>;
            extracted.push({
              value: childProps.value ?? '',
              label: String(childProps.children || childProps.value || ''),
            });
          }
        });
        return extracted;
      }

      return [];
    }, [options, children]);

    // Auto-searchable if more than 7 options
    const isSearchActive = searchable !== undefined ? searchable : parsedOptions.length > 7;

    // Filter options based on search query
    const filteredOptions = useMemo(() => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return parsedOptions;
      return parsedOptions.filter(
        (opt) =>
          opt.label.toLowerCase().includes(q) ||
          String(opt.value).toLowerCase().includes(q) ||
          (opt.subtitle && opt.subtitle.toLowerCase().includes(q))
      );
    }, [parsedOptions, searchQuery]);

    // Current selected option object
    const selectedOption = useMemo(() => {
      return parsedOptions.find((opt) => String(opt.value) === String(internalValue));
    }, [parsedOptions, internalValue]);

    // Consecutive options with the same group form one ARIA group under a visible heading.
    const optionRuns = useMemo(() => {
      const runs: Array<{ group?: string; options: SelectOption[] }> = [];
      for (const opt of filteredOptions) {
        const last = runs[runs.length - 1];
        if (last && last.group === opt.group) last.options.push(opt);
        else runs.push({ group: opt.group, options: [opt] });
      }
      return runs;
    }, [filteredOptions]);
    const listboxId = React.useId();

    const renderOption = (opt: SelectOption) => {
      const isSelected = String(opt.value) === String(internalValue);
      return (
        <div
          key={String(opt.value)}
          role="option"
          aria-selected={isSelected}
          onClick={() => handleSelect(opt.value)}
          className={cn(
            'flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors group select-none text-xs',
            isSelected
              ? 'bg-teal-50/90 text-teal-950 font-bold border border-teal-200/80 shadow-2xs'
              : 'hover:bg-teal-50/60 text-slate-700 hover:text-slate-900 font-medium'
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {opt.badge && (
              <span
                className={cn(
                  'px-1.5 py-0.5 text-[10px] font-bold font-mono rounded-md border shrink-0',
                  opt.badgeColor || 'bg-teal-50 text-teal-800 border-teal-200'
                )}
              >
                {opt.badge}
              </span>
            )}
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <div className="min-w-0">
              <div className="truncate">{opt.label}</div>
              {opt.subtitle && (
                <div className="text-[10px] text-slate-500 font-normal truncate mt-0.5">{opt.subtitle}</div>
              )}
            </div>
          </div>

          {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0 ml-2" weight="bold" />}
        </div>
      );
    };

    // Close on click outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          setSearchQuery('');
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Focus search input when popover opens
    useEffect(() => {
      if (isOpen && isSearchActive) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    }, [isOpen, isSearchActive]);

    const handleSelect = useCallback(
      (optValue: string | number) => {
        setInternalValue(optValue);
        setIsOpen(false);
        setSearchQuery('');

        const strVal = String(optValue);

        if (onValueChange) {
          onValueChange(strVal);
        }

        if (onChange) {
          const syntheticEvent = {
            target: { value: strVal, name: name || '', id: selectId },
            currentTarget: { value: strVal, name: name || '', id: selectId },
            preventDefault: () => {},
            stopPropagation: () => {},
          } as unknown as React.ChangeEvent<HTMLSelectElement>;

          onChange(syntheticEvent);
        }
      },
      [name, selectId, onChange, onValueChange]
    );

    // Keyboard accessibility
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'ArrowDown' && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === 'Enter' && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    const isSmall = size === 'sm';

    return (
      <div ref={containerRef} className="w-full space-y-1 relative">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 select-none"
          >
            {label}
            {requiredIndicator && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}

        {/* Hidden input for form submission */}
        {name && <input type="hidden" name={name} value={String(internalValue)} />}

        {/* Trigger Button (Medical Floating Popover Trigger) */}
        <button
          ref={forwardedRef}
          id={selectId}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) setIsOpen((prev) => !prev);
          }}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={cn(
            'w-full flex items-center justify-between bg-white border border-slate-300 rounded-xl transition-all duration-150 text-left select-none tactile-btn cursor-pointer',
            isSmall
              ? 'py-1.5 px-3 min-h-[36px] text-xs'
              : 'py-2.5 px-3.5 min-h-[44px] text-xs sm:text-sm',
            'focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600',
            isOpen ? 'border-teal-600 ring-4 ring-teal-500/10' : 'hover:border-slate-400',
            disabled && 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-70',
            error && 'border-rose-500 focus:ring-rose-500/15 focus:border-rose-600',
            className
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
            {leftElement && <span className="shrink-0 text-slate-400">{leftElement}</span>}

            {selectedOption ? (
              <div className="flex items-center gap-2 min-w-0 truncate">
                {selectedOption.badge && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 text-[10px] font-bold font-mono rounded-md border shrink-0',
                      selectedOption.badgeColor || 'bg-teal-50 text-teal-800 border-teal-200'
                    )}
                  >
                    {selectedOption.badge}
                  </span>
                )}
                {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
                <div className="min-w-0 truncate">
                  <div className="font-semibold text-slate-900 truncate">
                    {selectedOption.label}
                  </div>
                  {selectedOption.subtitle && (
                    <div className="text-[10px] text-slate-500 truncate -mt-0.5">
                      {selectedOption.subtitle}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-slate-400 font-medium truncate">{placeholder}</span>
            )}
          </div>

          <CaretDown
            className={cn(
              'w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200',
              isOpen && 'rotate-180 text-teal-600'
            )}
            weight="bold"
          />
        </button>

        {/* Floating Popover Menu (Medical Floating Popover — Bebas Bug Kotak OS) */}
        {isOpen && (
          <div
            role="listbox"
            tabIndex={-1}
            className="absolute left-0 right-0 mt-1.5 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-[0_0_0_1px_rgba(15,23,42,0.08),0_16px_36px_-4px_rgba(15,23,42,0.16),0_6px_12px_-2px_rgba(15,23,42,0.06)] p-1.5 z-50 animate-popover max-h-72 overflow-y-auto"
          >
            {headerTitle && (
              <div role="presentation" className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1 select-none">
                {headerTitle}
              </div>
            )}

            {/* Quick Search inside Popover if options > 7 */}
            {isSearchActive && (
              <div className="px-1 pb-1.5 mb-1 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
                <div className="relative flex items-center">
                  <MagnifyingGlass className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari pilihan..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-medium placeholder:text-slate-400"
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="space-y-0.5">
              {filteredOptions.length > 0 ? (
                optionRuns.map((run, runIndex) =>
                  run.group ? (
                    <div
                      key={`group-${runIndex}`}
                      role="group"
                      aria-labelledby={`${listboxId}-group-${runIndex}`}
                      className="space-y-0.5"
                    >
                      <div
                        id={`${listboxId}-group-${runIndex}`}
                        role="presentation"
                        className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500"
                      >
                        {run.group}
                      </div>
                      {run.options.map(renderOption)}
                    </div>
                  ) : (
                    <React.Fragment key={`run-${runIndex}`}>{run.options.map(renderOption)}</React.Fragment>
                  )
                )
              ) : (
                <div className="py-4 text-center text-xs text-slate-400 font-medium">
                  Tidak ada pilihan yang cocok.
                </div>
              )}
            </div>
          </div>
        )}

        {error ? (
          <p className="text-[11px] text-rose-600 font-medium pl-1">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-slate-400 pl-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
