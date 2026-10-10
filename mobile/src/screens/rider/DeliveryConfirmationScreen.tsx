import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RiderStackParamList } from '../../navigation/RiderNavigator';
import { Feather } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RiderStackParamList, 'DeliveryConfirmation'>;

export const DeliveryConfirmationScreen: React.FC<Props> = ({ route, navigation }) => {
  const { orderId, earnings } = route.params || {};

  // Built-in Native Animations
  const checkScale = useRef(new Animated.Value(0)).current;
  const earningsOpacity = useRef(new Animated.Value(0)).current;
  const earningsTranslate = useRef(new Animated.Value(20)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Sequence: checkmark -> earnings -> card
    Animated.sequence([
      Animated.delay(100),
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(earningsOpacity, {
        toValue: 1,
        duration: 400,
        delay: 500,
        useNativeDriver: true,
      }),
      Animated.timing(earningsTranslate, {
        toValue: 0,
        duration: 400,
        delay: 500,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 350,
        delay: 900,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 4 seconds
    const timer = setTimeout(() => {
      navigation.replace('Tabs');
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="flex-1 bg-surface-elevated items-center justify-center px-8">
      {/* Animated Checkmark */}
      <Animated.View
        style={{ transform: [{ scale: checkScale }] }}
        className="w-24 h-24 rounded-full bg-green-500 items-center justify-center mb-6"
      >
        <Feather name="check" size={48} color="#FFFFFF" />
      </Animated.View>

      <Text className="text-textPrimary text-2xl font-extrabold text-center mb-2">
        Delivery Complete!
      </Text>

      {/* Earnings */}
      <Animated.View
        style={{
          opacity: earningsOpacity,
          transform: [{ translateY: earningsTranslate }],
        }}
        className="items-center mb-2"
      >
        <Text className="text-textMuted text-sm mb-1">You earned</Text>
        <Text className="text-[#9A3412] font-extrabold mb-1" style={{ fontSize: 40 }}>
          LKR {typeof earnings === 'number' ? earnings.toFixed(0) : (earnings || '0')}
        </Text>
        <Text style={{ fontSize: 24 }}>🎉</Text>
      </Animated.View>

      <Text className="text-textMuted text-xs text-center mb-10">
        Order #{orderId?.slice(-8)?.toUpperCase() || 'N/A'}
      </Text>

      {/* Auto-dismiss note */}
      <Animated.View style={{ opacity: cardOpacity }} className="w-full">
        <View className="h-px bg-gray-200 mb-6" />

        <TouchableOpacity
          onPress={() => navigation.replace('Tabs')}
          activeOpacity={0.85}
          className="bg-[#9A3412] rounded-2xl py-4 items-center mb-3 w-full"
        >
          <Text className="text-white font-bold text-base">Back to Jobs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.replace('Tabs', { screen: 'Earnings' } as any)}
          activeOpacity={0.8}
          className="border border-gray-200 rounded-2xl py-4 items-center w-full"
        >
          <Text className="text-textSecondary font-semibold text-sm">View Earnings & History</Text>
        </TouchableOpacity>

        <Text className="text-textMuted text-xs text-center mt-5">
          Returning to dashboard automatically...
        </Text>
      </Animated.View>
    </View>
  );
};

export default DeliveryConfirmationScreen;

