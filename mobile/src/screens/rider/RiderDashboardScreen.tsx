import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { RiderOnlineToggle } from '../../components/rider/RiderOnlineToggle';
import { StatCard } from '../../components/common/StatCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { Feather } from '@expo/vector-icons';

export const RiderDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const [profile, setProfile] = useState<any>(null);
  const [deliveryHistory, setDeliveryHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  const fetchData = async () => {
    try {
      const [profileRes, ordersRes] = await Promise.all([
        api.get('/api/users/profile'),
        api.get('/api/orders/my'),
      ]);
      setProfile(profileRes.data);
      setIsOnline(profileRes.data?.profile?.isAvailable ?? false);
      setDeliveryHistory(ordersRes.data.filter((o: any) => o.status === 'DELIVERED'));
    } catch (err) {
      console.error('[RiderDashboard] fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    // Check if onboarding is done, if not redirect
    const checkOnboarding = async () => {
      const done = await AsyncStorage.getItem(`rider_onboarded_${user?.id}`);
      if (!done) {
        navigation.navigate('Onboarding');
        return;
      }
      fetchData();
    };
    checkOnboarding();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => fetchData());
    return unsubscribe;
  }, [navigation]);

  const handleToggleOnline = async () => {
    setTogglingOnline(true);
    try {
      const newState = !isOnline;
      await api.put(`/api/riders/availability?isAvailable=${newState}`);
      setIsOnline(newState);
    } catch (err) {
      console.error('[RiderDashboard] toggle error', err);
    } finally {
      setTogglingOnline(false);
    }
  };

  // Stats
  const todayDeliveries = deliveryHistory.filter((o) => {
    const d = new Date(o.createdAt);
    const t = new Date();
    return d.toDateString() === t.toDateString();
  });

  const todayEarnings = todayDeliveries.reduce(
    (sum, o) => sum + (o.riderEarnings || 0),
    0
  );

  const avgRating = profile?.stats?.avgRating ?? 0;

  if (loading) {
    return (
      <View className="flex-1 bg-surface-elevated px-4 pt-14">
        <SkeletonLoader width="55%" height={14} className="mb-2" />
        <SkeletonLoader width="75%" height={22} className="mb-6" />
        <SkeletonLoader height={88} borderRadius={16} className="mb-6" />
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1"><SkeletonLoader height={90} borderRadius={16} /></View>
          <View className="flex-1"><SkeletonLoader height={90} borderRadius={16} /></View>
          <View className="flex-1"><SkeletonLoader height={90} borderRadius={16} /></View>
        </View>
        <SkeletonLoader height={100} borderRadius={16} />
      </View>
    );
  }

  const name = profile?.profile?.name || user?.name || 'Rider';
  const vehicle = profile?.profile?.vehicleType || '';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <ScrollView
      className="flex-1 bg-surface-elevated"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#6366F1"
          colors={['#6366F1']}
        />
      }
    >
      <View className="px-4 pt-14 pb-6">
        {/* ── Header ── */}
        <View className="mb-6">
          <Text className="text-textMuted text-xs font-bold uppercase tracking-widest mb-1">
            {greeting}
          </Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-textPrimary text-2xl font-extrabold flex-1 mr-2" numberOfLines={1}>
              {name} {vehicle ? `· ${vehicle === 'Motorcycle' ? '🛵' : vehicle === 'Bicycle' ? '🚲' : vehicle === 'Car' ? '🚗' : '🚶'}` : '🛵'}
            </Text>
          </View>
        </View>

        {/* ── Online Toggle (hero element) ── */}
        <View className="mb-5">
          <RiderOnlineToggle
            isOnline={isOnline}
            isLoading={togglingOnline}
            onToggle={handleToggleOnline}
          />
        </View>

        {/* ── Today's Stats ── */}
        <SectionHeader title="Today's Stats" icon="📊" className="mb-3" />
        <View className="flex-row gap-3 mb-6">
          <StatCard
            icon="🚚"
            label="Deliveries"
            value={todayDeliveries.length}
            className="flex-1"
          />
          <StatCard
            icon="💰"
            label="Earned"
            value={`LKR ${todayEarnings.toFixed(0)}`}
            className="flex-1"
            valueColor="#6366F1"
          />
          <StatCard
            icon="⭐"
            label="Rating"
            value={avgRating > 0 ? avgRating.toFixed(1) : '--'}
            className="flex-1"
            valueColor="#F59E0B"
          />
        </View>

        {/* ── Empty / Idle State ── */}
        {isOnline ? (
          <View className="bg-white rounded-2xl border border-gray-100 p-6 items-center">
            <Text style={{ fontSize: 36 }} className="mb-3">🛵</Text>
            <Text className="text-textPrimary font-bold text-base text-center mb-1">
              You're online!
            </Text>
            <Text className="text-textMuted text-sm text-center mb-5 leading-5">
              We'll alert you the moment an order nearby is ready for pickup.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AvailableOrders')}
              activeOpacity={0.8}
              className="border border-indigo-400 px-6 py-3 rounded-xl"
            >
              <Text className="text-indigo-500 font-bold text-sm">
                Browse Available Orders
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="bg-white rounded-2xl border border-gray-100 p-6 items-center">
            <Text style={{ fontSize: 36 }} className="mb-3">😴</Text>
            <Text className="text-textPrimary font-bold text-base text-center mb-1">
              You're offline
            </Text>
            <Text className="text-textMuted text-sm text-center leading-5">
              Toggle online above to start receiving orders and earning.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};
