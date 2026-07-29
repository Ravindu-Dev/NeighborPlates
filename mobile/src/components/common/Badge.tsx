import React from 'react';
import { View, Text } from 'react-native';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  className = '',
}) => {
  const containerColors = {
    primary: 'bg-primary/10 border border-primary/20',
    secondary: 'bg-secondary/10 border border-secondary/20',
    success: 'bg-green-50 border border-green-200',
    warning: 'bg-amber-50 border border-amber-200',
    error: 'bg-red-50 border border-red-200',
    neutral: 'bg-gray-100 border border-gray-200',
  };

  const textColors = {
    primary: 'text-primary-dark font-semibold',
    secondary: 'text-secondary-dark font-semibold',
    success: 'text-green-700 font-semibold',
    warning: 'text-amber-700 font-semibold',
    error: 'text-red-700 font-semibold',
    neutral: 'text-gray-600 font-medium',
  };

  return (
    <View className={`px-2.5 py-1 rounded-full self-start items-center justify-center ${containerColors[variant]} ${className}`}>
      <Text className={`text-[10px] uppercase tracking-wide ${textColors[variant]}`}>
        {label}
      </Text>
    </View>
  );
};
