import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { TextInput } from '../../components/common/TextInput';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { Feather } from '@expo/vector-icons';

const VEHICLE_OPTIONS = ['Motorcycle', 'Bicycle', 'Car', 'Walking'];

const vehicleIcon: Record<string, string> = {
  Motorcycle: '🛵',
  Bicycle: '🚲',
  Car: '🚗',
  Walking: '🚶',
};

export const RiderProfileScreen: React.FC = () => {
  const { logout, user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Edit state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('Motorcycle');

  // Validation errors
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/users/profile');
      setProfile(res.data);
      setName(res.data?.profile?.name || '');
      setPhone(res.data?.profile?.phone || '');
      setSelectedVehicle(res.data?.profile?.vehicleType || 'Motorcycle');
    } catch {
      // swallow - show skeleton only
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => {
    fetchProfile();
  }, []));

  const validate = (): boolean => {
    let valid = true;
    setNameError('');
    setPhoneError('');

    if (!name.trim() || name.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      valid = false;
    }
    if (!phone.trim() || phone.trim().length < 9) {
      setPhoneError('Enter a valid phone number');
      valid = false;
    }
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    setSaveSuccess(false);
    try {
      await api.put('/api/users/profile', {
        name: name.trim(),
        phone: phone.trim(),
        vehicleType: selectedVehicle,
        // Preserve existing fields
        bio: profile?.profile?.bio,
        avatarUrl: profile?.profile?.avatarUrl,
        location: profile?.profile?.location,
      });
      setSaveSuccess(true);
      await fetchProfile();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      Alert.alert(
        'Save Failed',
        'Couldn\'t update your profile. Check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) logout();
    } else {
      Alert.alert('Log Out', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: logout },
      ]);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-surface-elevated px-4 pt-14">
        <SkeletonLoader width="40%" height={14} className="mb-2" />
        <SkeletonLoader height={100} borderRadius={16} className="mb-6" />
        <SkeletonLoader height={52} borderRadius={12} className="mb-4" />
        <SkeletonLoader height={52} borderRadius={12} className="mb-4" />
        <SkeletonLoader height={52} borderRadius={12} className="mb-6" />
        <SkeletonLoader height={52} borderRadius={12} />
      </View>
    );
  }

  const avgRating = profile?.stats?.avgRating ?? 0;
  const totalOrders = profile?.stats?.totalOrders ?? 0;

  return (
    <ScrollView
      className="flex-1 bg-surface-elevated"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" colors={['#6366F1']} />
      }
    >
      <View className="px-4 pt-14 pb-10">
        {/* Header */}
        <Text className="text-textPrimary text-xl font-extrabold mb-5">My Profile</Text>

        {/* Profile Card */}
        <View className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 items-center">
          <View className="w-16 h-16 rounded-full bg-indigo-100 items-center justify-center mb-3">
            <Text style={{ fontSize: 28 }}>
              {vehicleIcon[selectedVehicle] || '🛵'}
            </Text>
          </View>
          <Text className="text-textPrimary font-bold text-lg">{name || 'Rider'}</Text>
          <View className="flex-row items-center mt-1 gap-3">
            {avgRating > 0 && (
              <View className="flex-row items-center">
                <Feather name="star" size={12} color="#F59E0B" />
                <Text className="text-textSecondary text-xs ml-1 font-semibold">{avgRating.toFixed(1)}</Text>
              </View>
            )}
            {totalOrders > 0 && (
              <View className="flex-row items-center">
                <Feather name="truck" size={12} color="#9CA3AF" />
                <Text className="text-textMuted text-xs ml-1">{totalOrders} rides</Text>
              </View>
            )}
          </View>
        </View>

        {/* Edit Form */}
        <Text className="text-textMuted text-[10px] uppercase tracking-widest font-bold mb-3 ml-1">
          Edit Profile
        </Text>
        <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <TextInput
            label="FULL NAME"
            placeholder="Your name"
            value={name}
            onChangeText={setName}
            onBlur={() => {
              if (!name.trim() || name.trim().length < 2) {
                setNameError('Name must be at least 2 characters');
              } else {
                setNameError('');
              }
            }}
            error={nameError}
            autoCapitalize="words"
          />
          <TextInput
            label="PHONE NUMBER"
            placeholder="077-XXX-XXXX"
            value={phone}
            onChangeText={setPhone}
            onBlur={() => {
              if (!phone.trim() || phone.trim().length < 9) {
                setPhoneError('Enter a valid phone number');
              } else {
                setPhoneError('');
              }
            }}
            error={phoneError}
            keyboardType="phone-pad"
          />

          {/* Vehicle Picker */}
          <Text className="text-textPrimary font-semibold text-xs mb-2 ml-1">VEHICLE TYPE</Text>
          <View className="flex-row flex-wrap">
            {VEHICLE_OPTIONS.map(v => {
              const selected = selectedVehicle === v;
              return (
                <TouchableOpacity
                  key={v}
                  onPress={() => setSelectedVehicle(v)}
                  activeOpacity={0.8}
                  className={`flex-row items-center px-3 py-2 rounded-xl border mr-2 mb-2 ${
                    selected ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-gray-200'
                  }`}
                >
                  <Text className="text-sm mr-1">{vehicleIcon[v]}</Text>
                  <Text className={`text-xs font-bold ${selected ? 'text-white' : 'text-textPrimary'}`}>
                    {v}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Save Button + inline success */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          className="bg-indigo-500 rounded-2xl py-4 items-center flex-row justify-center mb-2"
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-white font-bold text-base">Save Changes</Text>
          )}
        </TouchableOpacity>

        {saveSuccess && (
          <View className="flex-row items-center justify-center mb-4">
            <Feather name="check-circle" size={14} color="#16A34A" />
            <Text className="text-green-600 text-sm font-semibold ml-1.5">
              Profile saved!
            </Text>
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.8}
          className="border border-gray-200 rounded-2xl py-4 items-center mt-2"
        >
          <Text className="text-textSecondary font-semibold text-sm">Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};
