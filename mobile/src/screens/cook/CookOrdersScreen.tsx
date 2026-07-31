import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { FilterChip } from '../../components/common/FilterChip';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';

type FilterType = 'ALL' | 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PLACED', label: 'New' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'READY', label: 'Ready' },
  { key: 'DELIVERED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const getTimeAgo = (dateStr: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
};

export const CookOrdersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/api/orders/my');
      setOrders(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrders();
    });
    return unsubscribe;
  }, [navigation]);

  const handleUpdateStatus = async (orderId: string, currentStatus: string) => {
    let nextStatus = '';
    switch (currentStatus) {
      case 'PLACED': nextStatus = 'ACCEPTED'; break;
      case 'ACCEPTED': nextStatus = 'PREPARING'; break;
      case 'PREPARING': nextStatus = 'READY'; break;
      case 'READY': nextStatus = 'DELIVERED'; break;
      default: return;
    }

    try {
      await api.put(`/api/orders/${orderId}/status?status=${nextStatus}`);
      Alert.alert('Status Updated', `Order is now: ${nextStatus}`);
      fetchOrders();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update order status.');
    }
  };

  const handleDeclineOrder = (orderId: string) => {
    const confirmAction = async () => {
      try {
        await api.put(`/api/orders/${orderId}/status?status=CANCELLED`);
        Alert.alert('Order Declined', 'The order has been cancelled.');
        fetchOrders();
      } catch (error: any) {
        Alert.alert('Error', error.response?.data?.message || 'Failed to decline order.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to decline this order? The customer will be notified.')) {
        confirmAction();
      }
    } else {
      Alert.alert(
        'Decline Order',
        'Are you sure you want to decline this order? The customer will be notified.',
        [
          { text: 'Keep', style: 'cancel' },
          {
            text: 'Decline',
            style: 'destructive',
            onPress: confirmAction,
          },
        ]
      );
    }
  };

  const getActionLabel = (status: string) => {
    switch (status) {
      case 'PLACED': return 'ACCEPT ORDER';
      case 'ACCEPTED': return 'START PREPARING';
      case 'PREPARING': return 'MARK AS READY';
      case 'READY': return 'MARK DELIVERED';
      default: return null;
    }
  };

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'PLACED': return 'border-l-primary';
      case 'ACCEPTED': return 'border-l-blue-500';
      case 'PREPARING': return 'border-l-amber-500';
      case 'READY': return 'border-l-secondary';
      case 'DELIVERED': return 'border-l-green-400';
      case 'CANCELLED': return 'border-l-red-400';
      default: return 'border-l-gray-300';
    }
  };

  const getStatusBadgeVariant = (status: string): 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral' => {
    switch (status) {
      case 'PLACED': return 'warning';
      case 'ACCEPTED': return 'secondary';
      case 'PREPARING': return 'primary';
      case 'READY': return 'success';
      case 'DELIVERED': return 'success';
      case 'CANCELLED': return 'error';
      default: return 'neutral';
    }
  };

  const getDeliveryLabel = (method: string) => {
    switch (method) {
      case 'PICKUP': return '🏃 Pickup';
      case 'COOK_DELIVERY': return '🚗 Cook Delivery';
      case 'RIDER': return '🛵 Rider';
      default: return method;
    }
  };

  const filteredOrders = activeFilter === 'ALL'
    ? orders
    : orders.filter((o) => o.status === activeFilter);

  const getFilterCount = (key: FilterType) => {
    if (key === 'ALL') return orders.length;
    return orders.filter((o) => o.status === key).length;
  };

  const getEmptyMessage = () => {
    switch (activeFilter) {
      case 'PLACED': return { emoji: '📥', title: 'No new orders', subtitle: 'New orders from customers will appear here.' };
      case 'ACCEPTED': return { emoji: '✅', title: 'No accepted orders', subtitle: 'Accept incoming orders to see them here.' };
      case 'PREPARING': return { emoji: '👨‍🍳', title: 'Nothing cooking', subtitle: 'Orders you start preparing will show here.' };
      case 'READY': return { emoji: '🍽️', title: 'No orders ready', subtitle: 'Mark orders as ready when they are done.' };
      case 'DELIVERED': return { emoji: '📦', title: 'No completed orders', subtitle: 'Delivered orders will be listed here.' };
      case 'CANCELLED': return { emoji: '❌', title: 'No cancelled orders', subtitle: 'Declined orders will appear here.' };
      default: return { emoji: '📭', title: 'No orders yet', subtitle: 'Publish meals to receive orders from nearby customers.' };
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-surface-elevated px-4 pt-14">
        <SkeletonLoader width="50%" height={22} className="mb-4" />
        <View className="flex-row mb-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonLoader key={i} width={80} height={34} borderRadius={20} className="mr-2" />
          ))}
        </View>
        {[1, 2, 3].map((i) => (
          <SkeletonLoader key={i} height={130} borderRadius={16} className="mb-3" />
        ))}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-elevated">
      <View className="px-4 pt-14 pb-2">
        {/* ─── Header ─── */}
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider">
              ORDER MANAGEMENT
            </Text>
            <Text className="text-textPrimary font-extrabold text-xl mt-0.5">
              Manage Orders 📦
            </Text>
          </View>
          <View className="bg-secondary/10 px-3 py-1.5 rounded-full">
            <Text className="text-secondary font-black text-xs">
              {orders.length} total
            </Text>
          </View>
        </View>

        {/* ─── Filter Tabs ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-3 -mx-1"
        >
          {FILTERS.map((filter) => {
            const count = getFilterCount(filter.key);
            return (
              <FilterChip
                key={filter.key}
                label={filter.label}
                selected={activeFilter === filter.key}
                onPress={() => setActiveFilter(filter.key)}
                count={count}
                className="mx-1"
              />
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Orders List ─── */}
      {filteredOrders.length === 0 ? (
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-5xl mb-4">{getEmptyMessage().emoji}</Text>
          <Text className="text-textMuted text-base font-semibold text-center mb-1">
            {getEmptyMessage().title}
          </Text>
          <Text className="text-textMuted text-xs text-center px-8">
            {getEmptyMessage().subtitle}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D6A4F" colors={['#2D6A4F']} />
          }
          renderItem={({ item }) => {
            const actionLabel = getActionLabel(item.status);
            const isExpanded = expandedOrder === item.id;

            return (
              <Card className={`mb-3 border-l-4 ${getStatusBorderColor(item.status)}`}>
                {/* Order Header */}
                <View className="flex-row justify-between items-center mb-2">
                  <View className="flex-row items-center flex-1">
                    <Text className="text-textPrimary font-extrabold text-sm">{item.orderNumber}</Text>
                    <Text className="text-textMuted text-[10px] ml-2">
                      {item.createdAt ? getTimeAgo(item.createdAt) : ''}
                    </Text>
                  </View>
                  <Badge label={item.status} variant={getStatusBadgeVariant(item.status)} />
                </View>

                {/* Customer & Delivery Info */}
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-textSecondary text-xs">
                    👤 {item.customerName}
                  </Text>
                  {item.deliveryMethod && (
                    <Text className="text-textMuted text-[10px] font-semibold">
                      {getDeliveryLabel(item.deliveryMethod)}
                    </Text>
                  )}
                </View>

                {item.address?.label && (
                  <Text className="text-textMuted text-[10px] mb-1">
                    📍 {item.address.label}
                  </Text>
                )}

                {/* Special Instructions */}
                {item.specialInstructions && (
                  <View className="bg-amber-50 rounded-lg px-3 py-2 mt-1 mb-1">
                    <Text className="text-amber-700 text-[10px] font-bold uppercase mb-0.5">
                      SPECIAL INSTRUCTIONS
                    </Text>
                    <Text className="text-amber-800 text-xs">{item.specialInstructions}</Text>
                  </View>
                )}

                {/* Order Items - Expandable */}
                <TouchableOpacity
                  onPress={() => setExpandedOrder(isExpanded ? null : item.id)}
                  activeOpacity={0.7}
                  className="mt-2 pt-2 border-t border-gray-50"
                >
                  <View className="flex-row justify-between items-center">
                    <Text className="text-textMuted text-[10px] flex-1 mr-2" numberOfLines={isExpanded ? undefined : 1}>
                      {item.items?.map((meal: any) => `${meal.name} (x${meal.quantity})`).join(', ')}
                    </Text>
                    <Text className="text-textMuted text-[10px]">{isExpanded ? '▲' : '▼'}</Text>
                  </View>

                  {isExpanded && item.items && (
                    <View className="mt-2 bg-gray-50 rounded-xl p-3">
                      {item.items.map((meal: any, idx: number) => (
                        <View key={idx} className="flex-row justify-between items-center mb-1.5">
                          <View className="flex-row items-center flex-1">
                            <Text className="text-textSecondary text-xs">
                              {meal.name}
                            </Text>
                            <Text className="text-textMuted text-[10px] ml-1">x{meal.quantity}</Text>
                          </View>
                          <Text className="text-textPrimary font-bold text-xs">
                            LKR {(meal.price * meal.quantity).toFixed(0)}
                          </Text>
                        </View>
                      ))}
                      <View className="border-t border-gray-200 mt-1 pt-2 flex-row justify-between">
                        <Text className="text-textSecondary text-xs font-semibold">Total</Text>
                        <Text className="text-secondary font-black text-sm">LKR {item.totalAmount}</Text>
                      </View>
                      {item.cookEarnings !== undefined && (
                        <View className="flex-row justify-between mt-1">
                          <Text className="text-textMuted text-[10px]">Your Earnings</Text>
                          <Text className="text-secondary font-bold text-xs">
                            LKR {item.cookEarnings?.toFixed(0)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>

                {/* Total Amount (when collapsed) */}
                {!isExpanded && (
                  <View className="flex-row justify-end mt-1">
                    <Text className="text-secondary font-black text-sm">LKR {item.totalAmount}</Text>
                  </View>
                )}

                {/* Action Buttons */}
                {actionLabel && (
                  <View className="flex-row mt-3">
                    {item.status === 'PLACED' && (
                      <TouchableOpacity
                        onPress={() => handleDeclineOrder(item.id)}
                        className="bg-red-50 border border-red-200 rounded-xl py-2.5 items-center justify-center mr-2 flex-1 active:opacity-85"
                      >
                        <Text className="text-red-600 font-bold text-xs tracking-wider">DECLINE</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => handleUpdateStatus(item.id, item.status)}
                      className={`bg-secondary rounded-xl py-2.5 items-center justify-center active:opacity-85 ${item.status === 'PLACED' ? 'flex-[2]' : 'flex-1'}`}
                    >
                      <Text className="text-white font-bold text-xs tracking-wider">{actionLabel}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            );
          }}
        />
      )}
    </View>
  );
};
