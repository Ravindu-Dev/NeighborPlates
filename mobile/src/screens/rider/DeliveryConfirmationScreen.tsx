import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderStackParamList } from '../../navigation/RiderNavigator';
import { Feather } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RiderStackParamList, 'DeliveryConfirmation'>;

export const DeliveryConfirmationScreen: React.FC<Props> = ({ route, navigation }) => {
  const { orderId, earnings } = route.params;

  // Animations
  const checkScale = useSharedValue(0);
  const earningsOpacity = useSharedValue(0);
  const earningsTranslate = useSharedValue(20);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    // Sequence: checkmark → earnings → card
    checkScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 180 }));
    earningsOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
    earningsTranslate.value = withDelay(500, withTiming(0, { duration: 400 }));
    cardOpacity.value = withDelay(900, withTiming(1, { duration: 350 }));

    // Auto-dismiss after 4 seconds
    const timer = setTimeout(() => {
      navigation.replace('Tabs');
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const earningsStyle = useAnimatedStyle(() => ({
    opacity: earningsOpacity.value,
    transform: [{ translateY: earningsTranslate.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
  }));

  return (
    <View className="flex-1 bg-surface-elevated items-center justify-center px-8">
      {/* Animated Checkmark */}
      <Animated.View
        style={[checkStyle]}
        className="w-24 h-24 rounded-full bg-green-500 items-center justify-center mb-6"
      >
        <Feather name="check" size={48} color="#FFFFFF" />
      </Animated.View>

      <Text className="text-textPrimary text-2xl font-extrabold text-center mb-2">
        Delivery Complete!
      </Text>

      {/* Earnings */}
      <Animated.View style={earningsStyle} className="items-center mb-2">
        <Text className="text-textMuted text-sm mb-1">You earned</Text>
        <Text className="text-indigo-500 font-extrabold mb-1" style={{ fontSize: 40 }}>
          LKR {earnings.toFixed(0)}
        </Text>
        <Text style={{ fontSize: 24 }}>🎉</Text>
      </Animated.View>

      <Text className="text-textMuted text-xs text-center mb-10">
        Order #{orderId?.slice(-8)?.toUpperCase()}
      </Text>

      {/* Auto-dismiss note */}
      <Animated.View style={cardStyle} className="w-full">
        <View className="h-px bg-gray-200 mb-6" />

        <TouchableOpacity
          onPress={() => navigation.replace('Tabs')}
          activeOpacity={0.85}
          className="bg-indigo-500 rounded-2xl py-4 items-center mb-3 w-full"
        >
          <Text className="text-white font-bold text-base">Back to Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.replace('Tabs', { screen: 'History' } as any)}
          activeOpacity={0.8}
          className="border border-gray-200 rounded-2xl py-4 items-center w-full"
        >
          <Text className="text-textSecondary font-semibold text-sm">View Ride History</Text>
        </TouchableOpacity>

        <Text className="text-textMuted text-xs text-center mt-5">
          Returning to dashboard automatically...
        </Text>
      </Animated.View>
    </View>
  );
};
