import React from 'react';
import { View, Pressable, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  onPress?: () => void;
  elevated?: boolean;
  bordered?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  elevated = false,
  bordered = true,
  className = '',
  ...props
}) => {
  const containerClass = `bg-white rounded-2xl p-4 w-full
    ${elevated ? 'shadow-sm' : ''}
    ${bordered ? 'border border-gray-100' : ''}
    ${className}
  `;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        className={containerClass}
        {...(props as any)}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={containerClass} {...props}>
      {children}
    </View>
  );
};
