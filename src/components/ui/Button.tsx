'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 select-none disabled:opacity-50 disabled:cursor-not-allowed tactile-btn';

    const variantStyles = {
      primary: 'bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white shadow-btn-primary border border-teal-700/80',
      secondary: 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-btn-secondary',
      outline: 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-btn-secondary',
      ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
      danger: 'bg-gradient-to-b from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white shadow-xs border border-rose-700',
    };

    const sizeStyles = {
      sm: 'text-xs px-3 py-1 min-h-[32px] gap-1.5',
      md: 'text-xs px-3.5 py-1.5 min-h-[36px] gap-1.5',
      lg: 'text-xs sm:text-sm px-4.5 py-2 min-h-[40px] gap-2',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
