import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface RiderOnlineToggleProps {
  isOnline: boolean;
  isLoading: boolean;
  onToggle: () => void;
}

export const RiderOnlineToggle: React.FC<RiderOnlineToggleProps> = ({
  isOnline,
  isLoading,
  onToggle,
}) => {
  const animValue = useRef(new Animated.Value(isOnline ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(animValue, {
      toValue: isOnline ? 1 : 0,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [isOnline]);

  const thumbTranslate = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 30],
  });

  const trackColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E5E7EB', '#6366F1'],
  });

  return (
    <View
      className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
      style={{
        shadowColor: isOnline ? '#6366F1' : '#000',
        shadowOffset: { width: 0, height: isOnline ? 4 : 2 },
        shadowOpacity: isOnline ? 0.15 : 0.06,
        shadowRadius: isOnline ? 12 : 8,
        elevation: isOnline ? 8 : 4,
      }}
    >
      <View className="flex-row items-center justify-between">
        {/* Status Info */}
        <View className="flex-1 mr-4">
          <View className="flex-row items-center mb-1">
            <View
              className="w-2.5 h-2.5 rounded-full mr-2"
              style={{ backgroundColor: isOnline ? '#10B981' : '#9CA3AF' }}
            />
            <Text className="text-textPrimary font-bold text-lg">
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
          <Text className="text-textMuted text-xs">
            {isOnline
              ? "You're visible to nearby orders"
              : 'Go online to start receiving orders'}
          </Text>
        </View>

        {/* Toggle Switch */}
        <TouchableOpacity
          onPress={onToggle}
          disabled={isLoading}
          activeOpacity={0.85}
          accessibilityRole="switch"
          accessibilityState={{ checked: isOnline }}
          accessibilityLabel={isOnline ? 'Go offline' : 'Go online'}
        >
          <Animated.View
            style={{
              backgroundColor: trackColor,
              width: 60,
              height: 32,
              borderRadius: 16,
              justifyContent: 'center',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <Animated.View
              style={{
                transform: [{ translateX: thumbTranslate }],
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 3,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isLoading ? null : (
                <Feather
                  name={isOnline ? 'radio' : 'wifi-off'}
                  size={12}
                  color={isOnline ? '#6366F1' : '#9CA3AF'}
                />
              )}
            </Animated.View>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
};
