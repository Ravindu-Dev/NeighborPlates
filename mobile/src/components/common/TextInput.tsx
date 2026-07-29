import React, { useState } from 'react';
import { View, Text, TextInput as RNTextInput, TextInputProps as RNTextInputProps, TouchableOpacity } from 'react-native';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  helperText,
  secureTextEntry,
  className = '',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);

  return (
    <View className={`w-full mb-4 ${className}`}>
      {label ? (
        <Text className="text-textPrimary font-semibold text-xs mb-1.5 ml-1">
          {label}
        </Text>
      ) : null}
      
      <View 
        className={`flex-row items-center bg-white border rounded-xl px-4 py-3 w-full
          ${isFocused ? 'border-primary' : error ? 'border-red-500' : 'border-gray-200'}
        `}
      >
        <RNTextInput
          className="flex-1 text-textPrimary text-sm p-0"
          placeholderTextColor="#9CA3AF"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          {...props}
        />
        
        {secureTextEntry ? (
          <TouchableOpacity 
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            className="pl-2"
          >
            <Text className="text-xs text-primary font-bold">
              {isPasswordVisible ? "HIDE" : "SHOW"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      
      {error ? (
        <Text className="text-red-500 text-xs mt-1 ml-1 font-medium">{error}</Text>
      ) : helperText ? (
        <Text className="text-textMuted text-xs mt-1 ml-1">{helperText}</Text>
      ) : null}
    </View>
  );
};
