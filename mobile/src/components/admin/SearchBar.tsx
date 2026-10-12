import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  onClear,
  className = '',
}) => {
  return (
    <View
      className={`flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 ${className}`}
    >
      <Feather name="search" size={16} color="#9CA3AF" />
      <TextInput
        className="flex-1 text-textPrimary text-sm ml-2 p-0"
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => {
            onChangeText('');
            onClear?.();
          }}
          className="pl-2"
          activeOpacity={0.7}
        >
          <Feather name="x-circle" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      )}
    </View>
  );
};
