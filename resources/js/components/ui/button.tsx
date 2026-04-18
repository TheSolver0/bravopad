import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'warning';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  asChild?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  asChild: _asChild,
  ...props
}) => {
  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:     'bg-primary text-white hover:bg-primary/90',
    secondary:   'bg-secondary text-white hover:bg-secondary/90',
    outline:     'border-2 border-primary/20 text-primary hover:bg-primary/5',
    ghost:       'text-on-surface-variant hover:bg-surface-container-low',
    destructive: 'bg-red-500 text-white hover:bg-red-600',
    warning:     'bg-orange-500 text-white hover:bg-orange-600',
  };

  const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
    sm:   'px-3 py-1.5 text-xs',
    md:   'px-4 py-2 text-sm',
    lg:   'px-6 py-3 text-base',
    icon: 'p-2',
  };

  return (
    <button
      {...props}
      className={`rounded-lg font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 ${variants[variant]} ${sizes[size]} ${className} disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100`}
    >
      {children}
    </button>
  );
};
