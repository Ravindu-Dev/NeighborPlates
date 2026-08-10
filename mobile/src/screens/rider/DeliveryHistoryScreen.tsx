import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { Feather } from '@expo/vector-icons';

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatDateLabel = (iso: string) => {
  const d = new Date(iso);
  const t = new Date();
  const y = new Date(t);
  y.setDate(t.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' });
};

const HistorySkeleton = () => (
  <View>
    <SkeletonLoader width={80} height={14} borderRadius={6} className="mb-3" />
    {[1,2].map(i => (
      <View key={i} className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
        <View className="flex-row justify-between mb-2">
          <SkeletonLoader width="45%" height={13} borderRadius={6} />
          <SkeletonLoader width={60} height={13} borderRadius={6} />
        </View>
        <SkeletonLoader width="65%" height={11} borderRadius={6} className="mb-1" />
        <SkeletonLoader width="40%" height={11} borderRadius={6} />
      </View>
    ))}
  </View>
);

export const DeliveryHistoryScreen: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchHistory = async () => {
    setErrorMsg(null);
    try {
      const res = await api.get('/api/orders/my');
      const delivered = res.data.filter((o: any) => o.status === 'DELIVERED');
      setHistory(delivered);
    } catch {
      setErrorMsg('Couldn\'t load history. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchHistory();
  }, []));

  // Group by date label
  const grouped: { label: string; orders: any[] }[] = [];
  const seenLabels: Record<string, number> = {};
  history.forEach(o => {
    const label = formatDateLabel(o.createdAt);
    if (seenLabels[label] === undefined) {
      seenLabels[label] = grouped.length;
      grouped.push({ label, orders: [o] });
    } else {
      grouped[seenLabels[label]].orders.push(o);
    }
  });

  // Summary stats
  const totalEarnings = history.reduce((s, o) => s + (o.riderEarnings || 0), 0);
  const monthDeliveries = history.filter(o => {
    const d = new Date(o.createdAt);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  });
  const monthEarnings = monthDeliveries.reduce((s, o) => s + (o.riderEarnings || 0), 0);

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center py-20">
      <Text style={{ fontSize: 44 }} className="mb-4">📭</Text>
      <Text className="text-textPrimary font-bold text-base mb-2 text-center">
        No deliveries yet
      </Text>
      <Text className="text-textMuted text-sm text-center leading-5 px-6">
        Accept your first order to start earning and building your history.
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-surface-elevated">
      {/* Header */}
      <View className="px-4 pt-14 pb-3 bg-white border-b border-gray-100">
        <Text className="text-textPrimary text-xl font-extrabold">Delivery History</Text>
      </View>

      {loading ? (
        <View className="px-4 pt-4">
          <SkeletonLoader height={90} borderRadius={16} className="mb-4" />
          <HistorySkeleton />
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={item => item.label}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366F1"
              colors={['#6366F1']}
            />
          }
          ListHeaderComponent={
            history.length > 0 ? (
              <View className="bg-indigo-500 rounded-2xl p-5 mb-4">
                <Text className="text-indigo-100 text-xs font-bold uppercase tracking-wide mb-1">
                  This Month
                </Text>
                <Text className="text-white font-extrabold mb-0.5" style={{ fontSize: 28 }}>
                  LKR {monthEarnings.toFixed(0)}
                </Text>
                <Text className="text-indigo-200 text-sm">
                  {monthDeliveries.length} delivery{monthDeliveries.length !== 1 ? 'ies' : 'y'}
                  {' · '}
                  {history.length} total
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={errorMsg ? (
            <View className="bg-red-50 border border-red-200 rounded-2xl p-4 flex-row items-start">
              <Feather name="alert-circle" size={16} color="#DC2626" />
              <View className="ml-3 flex-1">
                <Text className="text-red-700 font-bold text-sm mb-0.5">Couldn't load history</Text>
                <Text className="text-red-600 text-xs">{errorMsg}</Text>
                <TouchableOpacity onPress={() => { setErrorMsg(null); fetchHistory(); }} className="mt-2">
                  <Text className="text-red-600 font-bold text-xs">Try again →</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : renderEmpty()}
          renderItem={({ item: group }) => (
            <View className="mb-2">
              <Text className="text-textMuted text-xs font-bold uppercase tracking-widest mb-2 ml-1">
                {group.label}
              </Text>
              {group.orders.map((order: any) => (
                <View key={order.id} className="bg-white rounded-2xl border border-gray-100 p-4 mb-2">
                  <View className="flex-row items-start justify-between mb-1">
                    <View className="flex-row items-center flex-1 mr-2">
                      <View className="w-2 h-2 rounded-full bg-green-500 mr-2 mt-0.5" />
                      <Text className="text-textPrimary font-bold text-sm flex-1" numberOfLines={1}>
                        {order.cookName}
                      </Text>
                    </View>
                    <Text className="text-indigo-600 font-bold text-sm">
                      +LKR {(order.riderEarnings || 0).toFixed(0)}
                    </Text>
                  </View>
                  <Text className="text-textMuted text-xs ml-4 mb-1">
                    {formatTime(order.createdAt)} · {order.orderNumber}
                  </Text>
                  <Text className="text-textSecondary text-xs ml-4" numberOfLines={1}>
                    {order.items?.slice(0, 2).map((i: any) => `${i.quantity}× ${i.name}`).join(', ')}
                    {order.items?.length > 2 ? ` +${order.items.length - 2} more` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
};
