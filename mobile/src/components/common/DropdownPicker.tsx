import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput as RNTextInput,
  SafeAreaView,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

interface DropdownPickerProps {
  label?: string;
  placeholder?: string;
  selectedValue?: string;
  onValueChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
  error?: string;
  className?: string;
  iconName?: keyof typeof Feather.glyphMap;
}

export const DropdownPicker: React.FC<DropdownPickerProps> = ({
  label,
  placeholder = 'Select an option...',
  selectedValue,
  onValueChange,
  options = [],
  disabled = false,
  error,
  className = '',
  iconName,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (val: string) => {
    onValueChange(val);
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <View className={`mb-4 ${className}`}>
      {label ? (
        <Text className="text-textSecondary text-xs font-bold uppercase tracking-wider mb-2">
          {label}
        </Text>
      ) : null}

      <TouchableOpacity
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        activeOpacity={0.7}
        className={`
          flex-row items-center justify-between bg-white px-4 py-3.5 rounded-2xl border
          ${error ? 'border-red-500' : 'border-gray-200'}
          ${disabled ? 'bg-gray-100 opacity-60' : ''}
        `}
      >
        <View className="flex-row items-center flex-1 mr-2">
          {iconName && (
            <Feather name={iconName} size={16} color="#6B7280" style={{ marginRight: 8 }} />
          )}
          <Text
            className={`text-sm flex-1 ${
              selectedValue ? 'text-textPrimary font-semibold' : 'text-gray-400 font-normal'
            }`}
            numberOfLines={1}
          >
            {selectedValue || placeholder}
          </Text>
        </View>
        <Feather name="chevron-down" size={18} color="#6B7280" />
      </TouchableOpacity>

      {error ? (
        <Text className="text-red-500 text-xs mt-1 font-medium ml-1">{error}</Text>
      ) : null}

      {/* Modal Selection Sheet */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <SafeAreaView className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-[32px] max-h-[80%] min-h-[50%] flex-col border-t border-gray-100 shadow-2xl">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <View>
                <Text className="text-textPrimary font-black text-lg">
                  {label ? `Select ${label}` : 'Select Option'}
                </Text>
                <Text className="text-textMuted text-[10px] font-semibold uppercase tracking-wider mt-0.5">
                  Tap an item to select
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSearchQuery('');
                }}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center border border-gray-200"
              >
                <Ionicons name="close" size={18} color="#4B5563" />
              </TouchableOpacity>
            </View>

            {/* Search Input for Long Lists */}
            {options.length > 8 && (
              <View className="px-6 py-3 border-b border-gray-100 bg-gray-50">
                <View className="flex-row items-center bg-white px-3.5 py-2 rounded-xl border border-gray-200">
                  <Feather name="search" size={14} color="#9CA3AF" style={{ marginRight: 8 }} />
                  <RNTextInput
                    placeholder="Search options..."
                    placeholderTextColor="#9CA3AF"
                    className="flex-1 text-xs text-textPrimary p-0 font-medium"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={14} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Options List */}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item, index) => `${item}-${index}`}
              contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 12 }}
              renderItem={({ item }) => {
                const isSelected = item === selectedValue;
                return (
                  <TouchableOpacity
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                    className={`
                      flex-row items-center justify-between py-3.5 px-4 rounded-2xl mb-2 border
                      ${
                        isSelected
                          ? 'bg-secondary/10 border-secondary/30'
                          : 'bg-white border-gray-100'
                      }
                    `}
                  >
                    <Text
                      className={`text-sm flex-1 ${
                        isSelected ? 'text-secondary font-bold' : 'text-textPrimary font-medium'
                      }`}
                    >
                      {item}
                    </Text>
                    {isSelected && <Feather name="check" size={18} color="#2D6A4F" />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View className="py-8 items-center justify-center">
                  <Text className="text-textMuted text-xs font-semibold">No options match your search</Text>
                </View>
              }
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};
