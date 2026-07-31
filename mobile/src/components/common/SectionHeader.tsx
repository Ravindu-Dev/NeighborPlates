import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface SectionHeaderProps {
  title: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  icon,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <View className={`flex-row justify-between items-center mb-3 ${className}`}>
      <View className="flex-row items-center">
        {icon ? <Text className="text-base mr-1.5">{icon}</Text> : null}
        <Text className="text-textPrimary font-bold text-base">{title}</Text>
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text className="text-secondary font-semibold text-xs">{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};
