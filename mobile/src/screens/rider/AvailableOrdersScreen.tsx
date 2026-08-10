import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, RefreshControl,
  TouchableOpacity, Alert, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { RiderOrderCard } from '../../components/rider/RiderOrderCard';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const OrderSkeleton = () => (
  <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
    <View className="flex-row justify-between mb-3">
      <SkeletonLoader width="50%" height={14} borderRadius={6} />
      <SkeletonLoader width={70} height={24} borderRadius={12} />
    </View>
    <SkeletonLoader width="70%" height={11} borderRadius={6} className="mb-2" />
    <SkeletonLoader width="60%" height={11} borderRadius={6} className="mb-4" />
    <View className="h-px bg-gray-100 mb-3" />
    <View className="flex-row justify-between items-center">
      <SkeletonLoader width={80} height={30} borderRadius={6} />
      <SkeletonLoader width={100} height={40} borderRadius={10} />
    </View>
  </View>
);

export const AvailableOrdersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchOrders = async () => {
    setErrorMsg(null);
    try {
      const res = await api.get('/api/orders/available');
      setOrders(res.data);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        setErrorMsg('You need to go online on the Dashboard to see available orders.');
      } else {
        setErrorMsg('Couldn\'t load orders. Check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchOrders();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, []);

  const handleAccept = async (orderId: string) => {
    setAcceptingId(orderId);
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      const res = await api.put(`/api/orders/${orderId}/rider-accept`);
      const acceptedOrder = res.data;

      // Remove from list with feedback
      setOrders((prev) => prev.filter((o) => o.id !== orderId));

      // Navigate to Active Delivery
      navigation.navigate('ActiveDelivery', { orderId: acceptedOrder.id });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409 || err?.response?.data?.message?.includes('Someone else')) {
        // Conflict: order was taken
        Alert.alert(
          'Order Taken',
          'Someone else got there first — the list has been refreshed.',
          [{ text: 'OK' }]
        );
        // Refresh list
        await fetchOrders();
      } else if (status === 400) {
        Alert.alert(
          'Not Available',
          'This order is no longer available for pickup.',
          [{ text: 'OK' }]
        );
        await fetchOrders();
      } else {
        Alert.alert(
          'Connection Error',
          'Couldn\'t accept the order. Check your internet and try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setAcceptingId(null);
    }
  };

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center py-20">
      <Text style={{ fontSize: 44 }} className="mb-4">📭</Text>
      <Text className="text-textPrimary font-bold text-base mb-2 text-center">
        No orders nearby right now
      </Text>
      <Text className="text-textMuted text-sm text-center mb-6 leading-5 px-6">
        We'll notify you when a READY order appears close to you.
      </Text>
      <TouchableOpacity
        onPress={onRefresh}
        activeOpacity={0.8}
        className="border border-indigo-400 px-6 py-3 rounded-xl flex-row items-center"
      >
        <Feather name="refresh-cw" size={14} color="#6366F1" />
        <Text className="text-indigo-500 font-bold text-sm ml-2">Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 bg-surface-elevated">
      {/* Header */}
      <View className="px-4 pt-14 pb-3 bg-white border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <Text className="text-textPrimary text-xl font-extrabold">
            Available Orders
          </Text>
          <TouchableOpacity
            onPress={onRefresh}
            activeOpacity={0.7}
            accessibilityLabel="Refresh available orders"
          >
            <Feather name="refresh-cw" size={20} color="#6366F1" />
          </TouchableOpacity>
        </View>
        {orders.length > 0 && (
          <Text className="text-textMuted text-xs mt-0.5">
            {orders.length} order{orders.length !== 1 ? 's' : ''} ready for pickup
          </Text>
        )}
      </View>

      {/* Error State */}
      {errorMsg ? (
        <View className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-2xl p-4 flex-row items-start">
          <Feather name="alert-circle" size={16} color="#DC2626" />
          <View className="ml-3 flex-1">
            <Text className="text-red-700 font-bold text-sm mb-0.5">Something went wrong</Text>
            <Text className="text-red-600 text-xs">{errorMsg}</Text>
            <TouchableOpacity onPress={() => { setErrorMsg(null); fetchOrders(); }} className="mt-2">
              <Text className="text-red-600 font-bold text-xs">Try again →</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Loading Skeletons */}
      {loading ? (
        <View className="px-4 pt-4">
          <OrderSkeleton />
          <OrderSkeleton />
          <OrderSkeleton />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RiderOrderCard
              order={item}
              accepting={acceptingId === item.id}
              onAccept={() => handleAccept(item.id)}
            />
          )}
          contentContainerStyle={{
            padding: 16,
            flexGrow: 1,
          }}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366F1"
              colors={['#6366F1']}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};
