import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-kia-black disabled:opacity-50 disabled:cursor-not-allowed btn-glow';
  
  const variants = {
    primary: 'bg-gradient-kia text-white hover:shadow-kia-lg focus:ring-kia-red',
    secondary: 'bg-kia-grey text-kia-white hover:bg-kia-light-grey focus:ring-kia-grey',
    danger: 'bg-danger text-white hover:bg-red-600 focus:ring-danger',
    ghost: 'bg-transparent text-kia-silver hover:text-kia-white hover:bg-kia-grey focus:ring-kia-grey',
    outline: 'bg-transparent border-2 border-kia-red text-kia-red hover:bg-kia-red hover:text-white focus:ring-kia-red',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2.5 text-base gap-2',
    lg: 'px-6 py-3.5 text-lg gap-2.5',
  };
  
  const widthClass = fullWidth ? 'w-full' : '';
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
      ) : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};
