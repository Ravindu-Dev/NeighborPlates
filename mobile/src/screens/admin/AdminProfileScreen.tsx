import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { Feather } from '@expo/vector-icons';

interface AdminProfile {
  id?: string;
  email?: string;
  role?: string;
  profile?: {
    name?: string;
    phone?: string;
    avatarUrl?: string;
  };
  createdAt?: string;
}

const InfoRow: React.FC<{ icon: string; label: string; value?: string }> = ({ icon, label, value }) => (
  <View className="flex-row items-center py-3 border-b border-gray-50">
    <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-3">
      <Feather name={icon as any} size={14} color="#6B7280" />
    </View>
    <Text className="text-textSecondary text-xs font-semibold w-20">{label}</Text>
    <Text className="text-textPrimary text-sm font-bold flex-1" numberOfLines={1}>
      {value || 'Not provided'}
    </Text>
  </View>
);

export const AdminProfileScreen: React.FC = () => {
  const { logout } = useAuthStore();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const fetchProfile = async () => {
    setError(null);
    try {
      const response = await api.get('/api/users/profile');
      setProfile(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLogout = () => {
    const doLogout = async () => {
      setLoggingOut(true);
      try {
        await logout();
      } catch (err) {
        console.error('Logout error:', err);
      } finally {
        setLoggingOut(false);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm) {
        if (window.confirm('Are you sure you want to sign out of the admin panel?')) {
          doLogout();
        }
      } else {
        doLogout();
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out of the admin panel?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: doLogout,
          },
        ]
      );
    }
  };

  const displayName = profile?.profile?.name || 'Administrator';
  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const formatDate = (iso?: string) => {
    if (!iso) return 'Unknown';
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-surface-elevated justify-center items-center">
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="text-textMuted text-sm mt-3 font-medium">Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-surface-elevated justify-center items-center px-8">
        <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-4">
          <Feather name="wifi-off" size={28} color="#EF4444" />
        </View>
        <Text className="text-textPrimary font-bold text-base text-center mb-2">Unable to Load Profile</Text>
        <Text className="text-textMuted text-xs text-center mb-6 leading-relaxed">{error}</Text>
        <TouchableOpacity
          onPress={() => { setLoading(true); fetchProfile(); }}
          className="bg-primary px-6 py-3 rounded-2xl w-full items-center mb-3"
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold text-sm">Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-50 border border-red-200 px-6 py-3 rounded-2xl w-full items-center"
          activeOpacity={0.8}
        >
          <Text className="text-red-600 font-bold text-sm">Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-elevated">
      {/* Header Banner */}
      <View className="bg-primary pt-8 pb-6 px-5 items-center">
        {/* Avatar Circle */}
        <View className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/40 items-center justify-center mb-3">
          <Text className="text-white text-2xl font-black">{initials}</Text>
        </View>
        <Text className="text-white font-black text-xl mb-0.5">{displayName}</Text>
        <View className="flex-row items-center bg-white/20 px-3 py-1 rounded-full mt-1">
          <View className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
          <Text className="text-white/90 text-[11px] font-bold uppercase tracking-wider">
            {profile?.role || 'ADMIN'} · Active
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      >
        {/* Account Information Card */}
        <View className="bg-white rounded-3xl px-4 border border-gray-100 mb-4">
          <View className="py-3 border-b border-gray-100">
            <Text className="text-textSecondary text-[10px] font-bold uppercase tracking-wider">
              Account Information
            </Text>
          </View>
          <InfoRow icon="mail" label="Email" value={profile?.email} />
          <InfoRow icon="phone" label="Phone" value={profile?.profile?.phone} />
          <InfoRow icon="shield" label="Role" value={profile?.role} />
          <InfoRow icon="calendar" label="Member Since" value={formatDate(profile?.createdAt)} />
          <View className="flex-row items-center py-3">
            <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-3">
              <Feather name="hash" size={14} color="#6B7280" />
            </View>
            <Text className="text-textSecondary text-xs font-semibold w-20">User ID</Text>
            <Text className="text-textPrimary text-xs font-mono flex-1" numberOfLines={1}>
              {profile?.id || '—'}
            </Text>
          </View>
        </View>

        {/* Admin Permissions Card */}
        <View className="bg-white rounded-3xl px-4 border border-gray-100 mb-4">
          <View className="py-3 border-b border-gray-100">
            <Text className="text-textSecondary text-[10px] font-bold uppercase tracking-wider">
              Admin Permissions
            </Text>
          </View>
          {[
            { icon: 'users', label: 'User Management', desc: 'Manage cooks, customers, and riders' },
            { icon: 'activity', label: 'Live Operations', desc: 'Monitor orders and resolve disputes' },
            { icon: 'alert-triangle', label: 'Content Moderation', desc: 'Review meals and customer reviews' },
            { icon: 'bar-chart-2', label: 'Analytics & Payouts', desc: 'View financials and settle payouts' },
          ].map(({ icon, label, desc }) => (
            <View key={label} className="flex-row items-center py-3 border-b border-gray-50">
              <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center mr-3">
                <Feather name={icon as any} size={14} color="#FF6B35" />
              </View>
              <View className="flex-1">
                <Text className="text-textPrimary text-xs font-bold">{label}</Text>
                <Text className="text-textMuted text-[10px] mt-0.5">{desc}</Text>
              </View>
              <Feather name="check" size={14} color="#10B981" />
            </View>
          ))}
        </View>

        {/* App Info Card */}
        <View className="bg-white rounded-3xl px-4 border border-gray-100 mb-6">
          <View className="py-3 border-b border-gray-100">
            <Text className="text-textSecondary text-[10px] font-bold uppercase tracking-wider">
              System Info
            </Text>
          </View>
          <View className="flex-row items-center justify-between py-3 border-b border-gray-50">
            <Text className="text-textSecondary text-xs font-semibold">Platform</Text>
            <Text className="text-textPrimary text-xs font-bold">NeighborPlates Admin</Text>
          </View>
          <View className="flex-row items-center justify-between py-3 border-b border-gray-50">
            <Text className="text-textSecondary text-xs font-semibold">Session</Text>
            <View className="flex-row items-center">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
              <Text className="text-emerald-700 text-xs font-bold">Authenticated</Text>
            </View>
          </View>
          <View className="flex-row items-center justify-between py-3">
            <Text className="text-textSecondary text-xs font-semibold">Security</Text>
            <Text className="text-textPrimary text-xs font-bold">JWT · Role-based</Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <Button
          title={loggingOut ? 'SIGNING OUT...' : 'SIGN OUT'}
          onPress={handleLogout}
          variant="outline"
          loading={loggingOut}
          className="border-red-300 mb-2"
        />
        <Text className="text-textMuted text-[10px] text-center">
          You will be returned to the login screen
        </Text>
      </ScrollView>
    </View>
  );
};
