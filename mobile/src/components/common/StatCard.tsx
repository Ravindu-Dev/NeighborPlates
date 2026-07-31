import React from 'react';
import { View, Text } from 'react-native';

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  className?: string;
  valueColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  className = '',
  valueColor,
}) => {
  return (
    <View
      className={`bg-white rounded-2xl p-4 border border-gray-100 items-center flex-1 ${className}`}
    >
      <Text className="text-2xl mb-1.5">{icon}</Text>
      <Text
        className="text-secondary font-black text-lg"
        style={valueColor ? { color: valueColor } : undefined}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text className="text-textMuted text-[9px] font-bold uppercase tracking-wider mt-0.5">
        {label}
      </Text>
    </View>
  );
};
