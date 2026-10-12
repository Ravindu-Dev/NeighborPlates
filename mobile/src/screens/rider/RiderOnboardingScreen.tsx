import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RiderStackParamList } from '../../navigation/RiderNavigator';
import { Button } from '../../components/common/Button';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { getRealLocation } from '../../services/locationService';

type Props = NativeStackScreenProps<RiderStackParamList, 'Onboarding'>;

export const RiderOnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    setSaving(true);
    try {
      // Request location permission optionally without failing or blocking continuation
      try {
        await getRealLocation(true);
      } catch (locErr) {
        console.log('[Onboarding] Optional location permission skipped or denied:', locErr);
      }

      // Mark onboarding as completed for this rider
      if (user?.id) {
        await AsyncStorage.setItem(`rider_onboarded_${user.id}`, 'true');
      }

      navigation.replace('Tabs');
    } catch (err) {
      if (user?.id) {
        await AsyncStorage.setItem(`rider_onboarded_${user.id}`, 'true');
      }
      navigation.replace('Tabs');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (user?.id) {
      await AsyncStorage.setItem(`rider_onboarded_${user.id}`, 'true');
    }
    navigation.replace('Tabs');
  };

  return (
    <ScrollView
      className="flex-1 bg-surface-elevated"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-1 px-6 pt-16 pb-10 justify-between max-w-lg w-full self-center">
        <View>
          {/* Centered Scooter Hero */}
          <View className="items-center mb-8">
            <View
              className="w-24 h-24 rounded-full items-center justify-center mb-5 shadow-xs"
              style={{ backgroundColor: '#FFF7ED' }}
            >
              <Text style={{ fontSize: 44 }}>🛵</Text>
            </View>
            <Text className="text-textPrimary text-2xl font-black text-center mb-2">
              Welcome, Rider!
            </Text>
            <Text className="text-textSecondary text-sm text-center leading-5 px-3">
              Deliver home-cooked meals from neighbors to neighbors.{'\n'}
              Let's get you set up quickly to receive nearby orders.
            </Text>
          </View>

          {/* Location Permission Explainer Card */}
          <View
            className="rounded-2xl p-4.5 mb-5 border border-indigo-100"
            style={{ backgroundColor: '#EEF2FF' }}
          >
            <View className="flex-row items-start">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3.5 mt-0.5"
                style={{ backgroundColor: '#6366F1' }}
              >
                <Feather name="map-pin" size={18} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-indigo-900 font-extrabold text-sm mb-1">
                  Why we need your location
                </Text>
                <Text className="text-indigo-700 text-xs leading-5">
                  We use your GPS to show you nearby READY orders and let customers
                  track their delivery in real time. We only use location while you're
                  on an active delivery — never in the background.
                </Text>
              </View>
            </View>
          </View>

          {/* GPS Information Note Card */}
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
            <View className="flex-row items-start">
              <Feather name="info" size={16} color="#D97706" style={{ marginTop: 2 }} />
              <Text className="text-amber-800 text-xs font-semibold ml-2.5 flex-1 leading-5">
                After tapping Continue, your device will ask for location permission.
                Tap "Allow While Using App" for the best delivery dispatch experience.
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons: Continue & Allow GPS (Orange) and Skip for now */}
        <View className="pt-4">
          <Button
            title="Continue & Allow GPS"
            onPress={handleContinue}
            loading={saving}
            variant="primary"
            size="lg"
            className="mb-3 w-full bg-[#EA580C] border-[#EA580C]"
          />
          <TouchableOpacity
            onPress={handleSkip}
            activeOpacity={0.7}
            className="items-center py-3"
          >
            <Text className="text-textMuted text-sm font-semibold">Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};
