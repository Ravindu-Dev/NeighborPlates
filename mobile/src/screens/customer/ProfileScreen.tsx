import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

export const ProfileScreen: React.FC = () => {
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
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-elevated p-6 justify-between">
      <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm items-center">
        <View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center mb-4">
          <Text className="text-primary text-3xl font-extrabold">👤</Text>
        </View>
        
        <Text className="text-textPrimary font-extrabold text-xl mb-1">{profile?.profile?.name}</Text>
        <Text className="text-textSecondary text-sm mb-4">{profile?.email}</Text>
        
        <View className="w-full border-t border-gray-50 pt-4 mt-2">
          <View className="flex-row justify-between mb-2">
            <Text className="text-textSecondary text-xs">Phone Number</Text>
            <Text className="text-textPrimary font-bold text-xs">{profile?.profile?.phone}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-textSecondary text-xs">Total Orders Placed</Text>
            <Text className="text-textPrimary font-bold text-xs">{profile?.stats?.totalOrders}</Text>
          </View>
        </View>
      </View>

      <Button
        title="LOG OUT"
        onPress={logout}
        variant="outline"
        className="w-full mb-6 border-primary text-primary"
      />
    </View>
  );
};
