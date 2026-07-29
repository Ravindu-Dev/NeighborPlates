import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
}) => {
  const baseStyle = "rounded-xl items-center justify-center flex-row active:opacity-85";
  
  const variantStyles = {
    primary: "bg-primary border border-primary",
    secondary: "bg-secondary border border-secondary",
    outline: "bg-transparent border border-gray-300",
    text: "bg-transparent border border-transparent",
  };

  const textStyles = {
    primary: "text-white font-bold",
    secondary: "text-white font-bold",
    outline: "text-textPrimary font-semibold",
    text: "text-primary font-semibold",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-3 text-sm",
    lg: "px-6 py-4 text-base",
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      className={`${baseStyle} ${variantStyles[variant]} ${isDisabled ? 'opacity-50' : ''} ${className}`}
      style={{ paddingVertical: size === 'sm' ? 6 : size === 'md' ? 12 : 16 }}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'outline' || variant === 'text' ? '#FF6B35' : '#FFFFFF'} 
          className="mr-2"
        />
      ) : null}
      <Text 
        className={`${textStyles[variant]} ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}`}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};
