import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

export const CookProfileScreen: React.FC = () => {
  const { logout } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/users/profile');
      setProfile(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-elevated">
        <ActivityIndicator size="large" color="#2D6A4F" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-elevated p-6 justify-between">
      <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm items-center">
        <View className="w-20 h-20 bg-secondary/10 rounded-full items-center justify-center mb-4">
          <Text className="text-secondary text-3xl font-extrabold">👨‍🍳</Text>
        </View>
        
        <Text className="text-textPrimary font-extrabold text-xl mb-1">{profile?.profile?.name}</Text>
        <Text className="text-textSecondary text-sm mb-2">{profile?.email}</Text>
        <Text className="text-textMuted text-xs text-center px-4 mb-4 italic">
          "{profile?.profile?.bio || 'No kitchen bio specified.'}"
        </Text>
        
        <View className="w-full border-t border-gray-50 pt-4 mt-2">
          <View className="flex-row justify-between mb-2">
            <Text className="text-textSecondary text-xs">Phone Number</Text>
            <Text className="text-textPrimary font-bold text-xs">{profile?.profile?.phone}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-textSecondary text-xs">Delivery Radius</Text>
            <Text className="text-textPrimary font-bold text-xs">{profile?.profile?.deliveryRadius} km</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-textSecondary text-xs">Hygiene Verification</Text>
            <Text className={`font-bold text-xs ${profile?.profile?.hygieneVerified ? 'text-secondary' : 'text-amber-600'}`}>
              {profile?.profile?.hygieneVerified ? 'Verified' : 'Pending'}
            </Text>
          </View>
        </View>
      </View>

      <Button
        title="LOG OUT"
        onPress={logout}
        variant="outline"
        className="w-full mb-6 border-secondary text-secondary"
      />
    </View>
  );
};
