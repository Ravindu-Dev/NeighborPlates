import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';

interface FilterChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  count?: number;
  activeColor?: string;
  className?: string;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  selected = false,
  onPress,
  count,
  activeColor,
  className = '',
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className={`flex-row items-center px-4 py-2 rounded-full mr-2 border
        ${selected 
          ? 'bg-secondary border-secondary' 
          : 'bg-white border-gray-200'
        }
        ${className}
      `}
      style={selected && activeColor ? { backgroundColor: activeColor, borderColor: activeColor } : undefined}
    >
      <Text
        className={`text-xs font-bold tracking-wide
          ${selected ? 'text-white' : 'text-textSecondary'}
        `}
      >
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View
          className={`ml-1.5 w-5 h-5 rounded-full items-center justify-center
            ${selected ? 'bg-white/25' : 'bg-gray-100'}
          `}
        >
          <Text
            className={`text-[10px] font-black
              ${selected ? 'text-white' : 'text-textMuted'}
            `}
          >
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
