import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderStackParamList } from '../../navigation/RiderNavigator';
import { Button } from '../../components/common/Button';
import { Feather } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<RiderStackParamList, 'Onboarding'>;

const VEHICLE_OPTIONS = ['Motorcycle', 'Bicycle', 'Car', 'Walking'];

export const RiderOnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuthStore();
  const [selectedVehicle, setSelectedVehicle] = useState<string>('Motorcycle');
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    setSaving(true);
    try {
      // Save vehicle type to profile
      await api.put('/api/users/profile', { vehicleType: selectedVehicle });

      // Mark onboarding done
      await AsyncStorage.setItem(`rider_onboarded_${user?.id}`, 'true');

      navigation.replace('Tabs');
    } catch (err) {
      Alert.alert(
        'Could not save',
        'We couldn\'t save your vehicle info. You can update it later in your profile.',
        [
          { text: 'Try Again', onPress: () => setSaving(false) },
          { text: 'Skip', style: 'cancel', onPress: () => {
              AsyncStorage.setItem(`rider_onboarded_${user?.id}`, 'true').then(() =>
                navigation.replace('Tabs')
              );
            }
          },
        ]
      );
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(`rider_onboarded_${user?.id}`, 'true');
    navigation.replace('Tabs');
  };

  return (
    <ScrollView
      className="flex-1 bg-surface-elevated"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-1 px-6 pt-16 pb-10">
        {/* Hero */}
        <View className="items-center mb-10">
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-5"
            style={{ backgroundColor: '#EEF2FF' }}
          >
            <Text style={{ fontSize: 38 }}>🛵</Text>
          </View>
          <Text className="text-textPrimary text-2xl font-extrabold text-center mb-2">
            Welcome, Rider!
          </Text>
          <Text className="text-textSecondary text-sm text-center leading-5">
            Deliver home-cooked meals from neighbors to neighbors.{'\n'}Let's get you set up quickly.
          </Text>
        </View>

        {/* Location Permission Explainer */}
        <View
          className="rounded-2xl p-4 mb-6 border border-indigo-100"
          style={{ backgroundColor: '#EEF2FF' }}
        >
          <View className="flex-row items-start">
            <View
              className="w-9 h-9 rounded-full items-center justify-center mr-3 mt-0.5"
              style={{ backgroundColor: '#6366F1' }}
            >
              <Feather name="map-pin" size={16} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-indigo-800 font-bold text-sm mb-1">
                Why we need your location
              </Text>
              <Text className="text-indigo-700 text-xs leading-4">
                We use your GPS to show you nearby READY orders and let customers
                track their delivery in real time. We only use location while you're
                on an active delivery — never in the background.
              </Text>
            </View>
          </View>
        </View>

        {/* Vehicle Selection */}
        <Text className="text-textPrimary font-bold text-sm mb-3 ml-1">
          YOUR VEHICLE
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-8">
          {VEHICLE_OPTIONS.map((v) => {
            const icons: Record<string, string> = {
              Motorcycle: '🛵',
              Bicycle: '🚲',
              Car: '🚗',
              Walking: '🚶',
            };
            const selected = selectedVehicle === v;
            return (
              <TouchableOpacity
                key={v}
                onPress={() => setSelectedVehicle(v)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                className={`flex-row items-center px-4 py-2.5 rounded-xl border mr-2 mb-2 ${
                  selected
                    ? 'bg-indigo-500 border-indigo-500'
                    : 'bg-white border-gray-200'
                }`}
              >
                <Text className="text-base mr-1.5">{icons[v]}</Text>
                <Text
                  className={`font-bold text-sm ${
                    selected ? 'text-white' : 'text-textPrimary'
                  }`}
                >
                  {v}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Location Card Note */}
        <View className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-8">
          <View className="flex-row items-center">
            <Feather name="info" size={14} color="#D97706" />
            <Text className="text-amber-700 text-xs font-semibold ml-2">
              After tapping Continue, your device will ask for location permission.
              Tap "Allow While Using App" for the best experience.
            </Text>
          </View>
        </View>

        {/* CTA */}
        <Button
          title="Continue & Allow GPS"
          onPress={handleContinue}
          loading={saving}
          variant="primary"
          size="lg"
          className="mb-3 w-full bg-indigo-500 border-indigo-500"
        />
        <TouchableOpacity onPress={handleSkip} className="items-center py-2">
          <Text className="text-textMuted text-sm font-medium">Skip for now</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};
