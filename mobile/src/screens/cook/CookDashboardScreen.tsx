import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/common/StatCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';

export const CookDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const fetchData = async () => {
    try {
      const [profRes, ordRes] = await Promise.all([
        api.get('/api/users/profile'),
        api.get('/api/orders/my'),
      ]);
      setProfile(profRes.data);
      setOrders(ordRes.data);

      // Fetch cook's meals
      if (profRes.data?.id) {
        try {
          const mealsRes = await api.get(`/api/meals/cook/${profRes.data.id}`);
          setMeals(mealsRes.data);
        } catch {
          setMeals([]);
        }
      }
    } catch (error) {
      console.error(error);
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
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation]);

  const activeOrders = orders.filter(
    (o) => o.status === 'PLACED' || o.status === 'ACCEPTED' || o.status === 'PREPARING'
  );

  const todayOrders = orders.filter((o) => {
    const orderDate = new Date(o.createdAt);
    const today = new Date();
    return (
      orderDate.getDate() === today.getDate() &&
      orderDate.getMonth() === today.getMonth() &&
      orderDate.getFullYear() === today.getFullYear()
    );
  });

  const activeMeals = meals.filter((m) => m.active);

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'PLACED': return 'border-l-primary';
      case 'ACCEPTED': return 'border-l-blue-500';
      case 'PREPARING': return 'border-l-amber-500';
      case 'READY': return 'border-l-secondary';
      default: return 'border-l-gray-300';
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    const deleteAction = async () => {
      try {
        await api.delete(`/api/meals/${mealId}`);
        fetchData();
      } catch (error) {
        console.error(error);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this meal?')) {
        deleteAction();
      }
    } else {
      Alert.alert('Delete Meal', 'Are you sure you want to delete this meal?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteAction },
      ]);
    }
  };

  const handleEditMeal = (meal: any) => {
    navigation.navigate('AddListing', { mealToEdit: meal });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-surface-elevated px-4 pt-14">
        {/* Skeleton Header */}
        <View className="mb-6">
          <SkeletonLoader width="60%" height={14} className="mb-2" />
          <SkeletonLoader width="80%" height={22} />
        </View>
        {/* Skeleton Stats */}
        <View className="flex-row mb-6">
          <View className="flex-1 mr-2"><SkeletonLoader height={90} borderRadius={16} /></View>
          <View className="flex-1 mr-2"><SkeletonLoader height={90} borderRadius={16} /></View>
          <View className="flex-1 mr-2"><SkeletonLoader height={90} borderRadius={16} /></View>
          <View className="flex-1"><SkeletonLoader height={90} borderRadius={16} /></View>
        </View>
        {/* Skeleton Cards */}
        <SkeletonLoader height={20} className="mb-4" width="40%" />
        <SkeletonLoader height={100} borderRadius={16} className="mb-3" />
        <SkeletonLoader height={100} borderRadius={16} className="mb-3" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-surface-elevated"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D6A4F" colors={['#2D6A4F']} />
      }
    >
      <View className="px-4 pt-14 pb-6">
        {/* ─── Cook Welcome Header ─── */}
        <View className="mb-6 flex-row justify-between items-start">
          <View className="flex-1 mr-3">
            <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider">
              KITCHEN STATUS
            </Text>
            <Text className="text-textPrimary font-extrabold text-lg mt-0.5">
              {getGreeting()}, Chef {profile?.profile?.name?.split(' ')[0]} 🍳
            </Text>
            <Text className="text-textSecondary text-xs mt-1">
              {todayOrders.length > 0
                ? `You have ${activeOrders.length} active order${activeOrders.length !== 1 ? 's' : ''} today`
                : 'No orders yet today — your kitchen is ready!'}
            </Text>
          </View>
          <Badge
            label={profile?.profile?.hygieneVerified ? 'Verified ✓' : 'Pending'}
            variant={profile?.profile?.hygieneVerified ? 'success' : 'warning'}
          />
        </View>

        {/* ─── Stats Row ─── */}
        <View className="flex-row mb-6">
          <StatCard
            icon="📦"
            label="TOTAL ORDERS"
            value={profile?.stats?.totalOrders ?? 0}
            className="mr-2"
          />
          <StatCard
            icon="💰"
            label="EARNINGS"
            value={`${(profile?.stats?.totalEarnings ?? 0).toLocaleString()}`}
            className="mr-2"
          />
          <TouchableOpacity
            onPress={() => navigation.navigate('CookReviews')}
            className="flex-1 mr-2"
            activeOpacity={0.7}
          >
            <StatCard
              icon="⭐"
              label="RATING"
              value={profile?.stats?.avgRating?.toFixed(1) ?? '0.0'}
              valueColor="#FBBF24"
            />
          </TouchableOpacity>
          <StatCard
            icon="🍽️"
            label="ACTIVE MEALS"
            value={activeMeals.length}
          />
        </View>

        {/* ─── Quick Actions ─── */}
        <View className="flex-row mb-6">
          <TouchableOpacity
            onPress={() => navigation.navigate('AddListing')}
            activeOpacity={0.85}
            className="flex-1 bg-secondary rounded-2xl py-3.5 items-center justify-center mr-2 flex-row"
          >
            <Text className="text-lg mr-1.5">➕</Text>
            <Text className="text-white font-bold text-xs tracking-wide">ADD NEW MEAL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Orders')}
            activeOpacity={0.85}
            className="flex-1 bg-white border border-secondary rounded-2xl py-3.5 items-center justify-center flex-row"
          >
            <Text className="text-lg mr-1.5">📋</Text>
            <Text className="text-secondary font-bold text-xs tracking-wide">VIEW ORDERS</Text>
          </TouchableOpacity>
        </View>

        {/* ─── My Meals Section ─── */}
        {meals.length > 0 && (
          <View className="mb-6">
            <SectionHeader
              title="My Meals"
              icon="🍛"
              actionLabel={`${meals.length} meal${meals.length !== 1 ? 's' : ''}`}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
              {meals.map((meal) => (
                <View key={meal.id} className="mx-1" style={{ width: 155 }}>
                  <Card className="p-3" bordered>
                    {/* Meal Photo */}
                    {meal.photos && meal.photos.length > 0 ? (
                      <View className="rounded-xl h-20 overflow-hidden mb-2">
                        <Image source={{ uri: meal.photos[0] }} className="w-full h-full" resizeMode="cover" />
                      </View>
                    ) : (
                      <View className="bg-secondary/10 rounded-xl h-20 items-center justify-center mb-2">
                        <Text className="text-3xl">
                          {meal.category === 'BREAKFAST' ? '🥞' 
                            : meal.category === 'LUNCH' ? '🍛' 
                            : meal.category === 'DINNER' ? '🍲' 
                            : '🍿'}
                        </Text>
                      </View>
                    )}
                    <Text className="text-textPrimary font-bold text-xs" numberOfLines={1}>
                      {meal.name}
                    </Text>
                    <View className="flex-row justify-between items-center mt-1">
                      <Text className="text-secondary font-black text-xs">
                        LKR {meal.price}
                      </Text>
                      <View className="flex-row items-center">
                        <Text className="text-[10px] mr-0.5">⭐</Text>
                        <Text className="text-textMuted text-[10px] font-bold">
                          {meal.avgRating?.toFixed(1) ?? '0.0'}
                        </Text>
                      </View>
                    </View>
                    <View className="mt-1.5 flex-row justify-between items-center">
                      <Badge
                        label={meal.active ? 'Active' : 'Inactive'}
                        variant={meal.active ? 'success' : 'neutral'}
                      />
                    </View>
                    {/* Actions */}
                    <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-100">
                      <TouchableOpacity onPress={() => handleEditMeal(meal)} activeOpacity={0.7} className="flex-1 py-1 items-center">
                        <Text className="text-blue-500 font-bold text-xs">✏️ Edit</Text>
                      </TouchableOpacity>
                      <View className="w-px h-4 bg-gray-200" />
                      <TouchableOpacity onPress={() => handleDeleteMeal(meal.id)} activeOpacity={0.7} className="flex-1 py-1 items-center">
                        <Text className="text-red-500 font-bold text-xs">🗑️ Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ─── Active Orders Queue ─── */}
        <SectionHeader
          title="Active Orders"
          icon="🔥"
          actionLabel={activeOrders.length > 0 ? 'See All' : undefined}
          onAction={() => navigation.navigate('Orders')}
        />

        {activeOrders.length === 0 ? (
          <Card className="py-10 items-center" bordered>
            <Text className="text-4xl mb-3">🎉</Text>
            <Text className="text-textMuted text-base font-semibold text-center mb-1">
              Queue is empty
            </Text>
            <Text className="text-textMuted text-xs text-center px-6">
              New incoming orders will appear here. Keep your meals published to attract customers!
            </Text>
          </Card>
        ) : (
          activeOrders.slice(0, 5).map((item) => (
            <Card
              key={item.id}
              onPress={() => navigation.navigate('Orders')}
              className={`mb-3 border-l-4 ${getStatusBorderColor(item.status)}`}
            >
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-textPrimary font-extrabold text-sm">{item.orderNumber}</Text>
                <Badge
                  label={item.status}
                  variant={
                    item.status === 'PLACED' ? 'warning'
                      : item.status === 'ACCEPTED' ? 'secondary'
                      : item.status === 'PREPARING' ? 'primary'
                      : 'neutral'
                  }
                />
              </View>
              <Text className="text-textSecondary text-xs">Customer: {item.customerName}</Text>
              <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-gray-50">
                <Text className="text-textMuted text-[10px] flex-1 mr-2" numberOfLines={1}>
                  {item.items?.map((meal: any) => `${meal.name} (x${meal.quantity})`).join(', ')}
                </Text>
                <Text className="text-secondary font-black text-sm">LKR {item.totalAmount}</Text>
              </View>
            </Card>
          ))
        )}

        {/* Bottom spacer for tab bar */}
        <View className="h-4" />
      </View>
    </ScrollView>
  );
};
