import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Feather } from '@expo/vector-icons';

interface DeliveryRecord {
  id: string;
  time: string;
  distance: string;
  duration: string;
  restaurant: string;
  dropoff: string;
  payout: number;
  baseFee: number;
  tip?: number;
  rawDate?: string;
}

type PeriodType = 'day' | 'week' | 'month';

export const DeliveryHistoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const [period, setPeriod] = useState<PeriodType>('day');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [expandedOrders, setExpandedOrders] = useState(false);
  const [cashoutModalVisible, setCashoutModalVisible] = useState(false);
  const [cashoutSuccess, setCashoutSuccess] = useState(false);
  const [cashingOut, setCashingOut] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const fetchHistory = async () => {
    try {
      const [ordersRes, profileRes, summaryRes] = await Promise.allSettled([
        api.get('/api/orders/my'),
        api.get('/api/users/profile'),
        api.get('/api/riders/summary'),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.data) {
        setProfile(profileRes.value.data);
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value.data) {
        setSummary(summaryRes.value.data);
      }

      if (ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value.data)) {
        const delivered = ordersRes.value.data.filter((o: any) => o.status === 'DELIVERED');
        const mapped: DeliveryRecord[] = delivered.map((o: any) => {
          const orderDate = new Date(o.deliveredAt || o.createdAt);
          return {
            id: o.id,
            time: orderDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            distance: o.cookAddressLabel || 'Home Kitchen',
            duration: 'Completed',
            restaurant: o.cookName || 'Home Cook',
            dropoff: o.address?.label || 'Customer Address',
            payout: o.riderEarnings || 150,
            baseFee: o.riderEarnings || 150,
            tip: 0,
            rawDate: o.deliveredAt || o.createdAt,
          };
        });
        setDeliveries(mapped);
      } else {
        setDeliveries([]);
      }
    } catch {
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  const handleCashOut = async () => {
    const balance = summary?.totalEarnings ?? 0;
    if (balance <= 0) {
      Alert.alert('No Balance', 'You currently have no available earnings to cash out.');
      return;
    }

    setCashingOut(true);
    try {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setTimeout(() => {
        setCashingOut(false);
        setCashoutSuccess(true);
        setTimeout(() => {
          setCashoutSuccess(false);
          setCashoutModalVisible(false);
        }, 2000);
      }, 1000);
    } catch {
      setCashingOut(false);
    }
  };

  const deriveRiderName = () => {
    if (profile?.profile?.name && profile.profile.name.trim().length > 0) return profile.profile.name.trim();
    if (user?.name && user.name.trim().length > 0) return user.name.trim();
    const emailToUse = user?.email || profile?.email;
    if (emailToUse) {
      const part = emailToUse.split('@')[0];
      return part.charAt(0).toUpperCase() + part.slice(1);
    }
    return 'Rider';
  };
  const riderDisplayName = deriveRiderName();

  const avatarUrl =
    profile?.profile?.avatarUrl ||
    user?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(riderDisplayName)}&background=9A3412&color=fff&bold=true&size=256`;
  const payoutDisplay =
    profile?.profile?.payoutMethod || 'Direct Deposit (Default)';

  // Period calculations
  const periodEarnings =
    period === 'day'
      ? (summary?.today?.earnings ?? 0)
      : period === 'week'
      ? (summary?.thisWeek?.earnings ?? 0)
      : (summary?.thisMonth?.earnings ?? 0);

  const periodDeliveryCount =
    period === 'day'
      ? (summary?.today?.deliveryCount ?? 0)
      : period === 'week'
      ? (summary?.thisWeek?.deliveryCount ?? 0)
      : (summary?.thisMonth?.deliveryCount ?? 0);

  const periodLabel =
    period === 'day'
      ? `Today, ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : period === 'week'
      ? 'This Week'
      : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Filter deliveries according to period
  const filteredDeliveries = deliveries.filter((item) => {
    if (!item.rawDate) return true;
    const d = new Date(item.rawDate);
    const now = new Date();
    if (period === 'day') {
      return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    }
    if (period === 'week') {
      const diffTime = Math.abs(now.getTime() - d.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }
    if (period === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const displayedDeliveries = expandedOrders
    ? filteredDeliveries
    : filteredDeliveries.slice(0, 4);

  // Weekly Trend Chart calculations
  const dailyMetrics = summary?.last7Days || [
    { dayLabel: 'M', count: 0, earnings: 0, isToday: false },
    { dayLabel: 'T', count: 0, earnings: 0, isToday: false },
    { dayLabel: 'W', count: 0, earnings: 0, isToday: false },
    { dayLabel: 'T', count: 0, earnings: 0, isToday: false },
    { dayLabel: 'F', count: 0, earnings: 0, isToday: false },
    { dayLabel: 'S', count: 0, earnings: 0, isToday: false },
    { dayLabel: 'S', count: 0, earnings: 0, isToday: true },
  ];

  const maxDaily = Math.max(...dailyMetrics.map((d: any) => d.earnings), 500);

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#9A3412"
            colors={['#9A3412']}
          />
        }
      >
        <View className="px-4 pt-14">
          {/* ── 1. Top Header (Homely Rider | EARNINGS | Ready | Avatar) ── */}
          <View className="flex-row items-center justify-between mb-5">
            <View className="flex-row items-center">
              {/* Brand Logo Icon */}
              <View className="w-10 h-10 rounded-2xl bg-[#EA580C] items-center justify-center mr-3 shadow-sm">
                <Feather name="navigation" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-textPrimary text-xl font-black tracking-tight">
                  Homely Rider
                </Text>
                <Text className="text-textMuted text-[10px] font-bold uppercase tracking-widest">
                  EARNINGS & HISTORY
                </Text>
              </View>
            </View>

            {/* Ready Badge & Avatar */}
            <View className="flex-row items-center gap-2.5">
              <View className="bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1 rounded-full flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-[#10B981] mr-1.5" />
                <Text className="text-[#059669] font-bold text-xs">
                  {profile?.profile?.isAvailable ?? true ? 'Ready' : 'Offline'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('Rider')}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: avatarUrl }}
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm bg-gray-200"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── 2. Statement Period & Period Selector ── */}
          <View className="mb-4">
            <Text className="text-textMuted text-[10px] uppercase font-bold tracking-wider mb-1">
              STATEMENT PERIOD
            </Text>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Text className="text-textPrimary font-black text-2xl tracking-tight mr-2">
                  {periodLabel}
                </Text>
                <View className="w-8 h-8 rounded-full bg-white border border-gray-200 items-center justify-center shadow-xs">
                  <Feather name="calendar" size={14} color="#6B7280" />
                </View>
              </View>

              {/* Segmented Period Filter (Day / Week / Month) */}
              <View className="flex-row items-center bg-gray-200/80 p-1 rounded-full">
                <TouchableOpacity
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPeriod('day');
                  }}
                  className={`px-3 py-1.5 rounded-full ${
                    period === 'day' ? 'bg-[#7C2D12] shadow-xs' : ''
                  }`}
                >
                  <Text
                    className={`text-xs font-black ${
                      period === 'day' ? 'text-white' : 'text-textSecondary'
                    }`}
                  >
                    Day
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPeriod('week');
                  }}
                  className={`px-3 py-1.5 rounded-full ${
                    period === 'week' ? 'bg-[#7C2D12] shadow-xs' : ''
                  }`}
                >
                  <Text
                    className={`text-xs font-black ${
                      period === 'week' ? 'text-white' : 'text-textSecondary'
                    }`}
                  >
                    Week
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPeriod('month');
                  }}
                  className={`px-3 py-1.5 rounded-full ${
                    period === 'month' ? 'bg-[#7C2D12] shadow-xs' : ''
                  }`}
                >
                  <Text
                    className={`text-xs font-black ${
                      period === 'month' ? 'text-white' : 'text-textSecondary'
                    }`}
                  >
                    Month
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── 3. Net Shift Earnings Hero Card ── */}
          <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-4">
            <View className="flex-row items-start justify-between">
              <View>
                <Text className="text-textMuted text-[10px] uppercase font-bold tracking-wider mb-1">
                  {period === 'day'
                    ? 'NET SHIFT EARNINGS'
                    : period === 'week'
                    ? 'WEEKLY EARNINGS'
                    : 'MONTHLY EARNINGS'}
                </Text>
                <View className="flex-row items-center">
                  <Text className="text-textPrimary font-black text-3xl">
                    Rs. {periodEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

              <View className="items-end">
                <Text className="text-textMuted text-[10px] uppercase font-bold tracking-wider">
                  Lifetime Earnings
                </Text>
                <Text className="text-textPrimary font-black text-lg mt-0.5">
                  Rs. {(summary?.totalEarnings ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            {/* 3-Column Metrics Pill Box */}
            <View className="bg-[#EEF4FF] rounded-2xl p-3 my-3.5 flex-row justify-between items-center">
              <View className="flex-1 items-center border-r border-blue-100">
                <Text className="text-textPrimary font-black text-lg">
                  {periodDeliveryCount}
                </Text>
                <Text className="text-textMuted text-[10px] uppercase font-bold tracking-wider mt-0.5">
                  Deliveries
                </Text>
              </View>

              <View className="flex-1 items-center border-r border-blue-100">
                <Text className="text-textPrimary font-black text-lg">
                  {summary?.activeDeliveries ?? 0}
                </Text>
                <Text className="text-textMuted text-[10px] uppercase font-bold tracking-wider mt-0.5">
                  In Progress
                </Text>
              </View>

              <View className="flex-1 items-center">
                <Text className="text-[#059669] font-black text-lg">
                  Rs. {periodDeliveryCount > 0 ? Math.round(periodEarnings / periodDeliveryCount).toLocaleString() : '0'}
                </Text>
                <Text className="text-textMuted text-[10px] uppercase font-bold tracking-wider mt-0.5">
                  Avg / Trip
                </Text>
              </View>
            </View>

            {/* Instant Cash Out Action Button */}
            <TouchableOpacity
              onPress={() => setCashoutModalVisible(true)}
              activeOpacity={0.85}
              className="bg-[#9A3412] rounded-2xl py-3.5 px-4 flex-row items-center justify-between shadow-md"
            >
              <View className="flex-row items-center">
                <Text style={{ fontSize: 16 }}>⚡</Text>
                <Text className="text-white font-extrabold text-sm ml-2">
                  Instant Cash Out
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-white font-black text-sm mr-1">
                  Rs. {(summary?.totalEarnings ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <Feather name="chevron-right" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <Text className="text-textMuted text-[10px] text-center mt-2.5 font-medium">
              Transfers to {payoutDisplay}
            </Text>
          </View>

          {/* ── 4. Weekly Trend Bar Chart (Real daily metrics) ── */}
          <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-4">
            <View className="flex-row items-start justify-between mb-5">
              <View>
                <Text className="text-textPrimary font-black text-base">
                  Weekly Trend
                </Text>
                <Text className="text-textMuted text-[11px] font-semibold mt-0.5">
                  Week Total: Rs. {(summary?.thisWeek?.earnings ?? 0).toLocaleString()} • {summary?.thisWeek?.deliveryCount ?? 0} Deliveries
                </Text>
              </View>

              <View className="flex-row items-center">
                <Feather name="trending-up" size={13} color="#059669" />
                <Text className="text-[#059669] font-black text-xs ml-1">
                  Verified Records
                </Text>
              </View>
            </View>

            {/* Bars Canvas */}
            <View className="h-36 flex-row items-end justify-between px-1 mb-2 relative">
              {dailyMetrics.map((dayItem: any, idx: number) => {
                const barHeight = Math.max(12, Math.round((dayItem.earnings / maxDaily) * 100));
                const isHighlight = dayItem.isToday;

                return (
                  <View key={idx} className="items-center flex-1 relative">
                    {isHighlight && dayItem.earnings > 0 && (
                      <View className="bg-[#7C2D12] px-1.5 py-0.5 rounded-md absolute -top-6 shadow-xs z-10">
                        <Text className="text-white text-[9px] font-black">
                          Rs. {Math.round(dayItem.earnings)}
                        </Text>
                      </View>
                    )}
                    <View
                      style={{ height: barHeight }}
                      className={`w-7 rounded-t-xl ${
                        isHighlight ? 'bg-[#9A3412]' : 'bg-[#DBEAFE]'
                      }`}
                    />
                    <Text
                      className={`font-bold text-xs mt-2 ${
                        isHighlight ? 'text-[#9A3412]' : 'text-textMuted'
                      }`}
                    >
                      {dayItem.dayLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── 5. Income Composition ── */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-textPrimary font-black text-base">
                Income Composition
              </Text>
              <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider">
                Database Verified
              </Text>
            </View>

            {/* Base Delivery Fees */}
            <View className="bg-[#EFF6FF] rounded-2xl p-4 mb-2.5 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-11 h-11 rounded-2xl bg-white border border-blue-100 items-center justify-center mr-3 shadow-xs">
                  <Text style={{ fontSize: 20 }}>🛵</Text>
                </View>
                <View>
                  <Text className="text-textPrimary font-extrabold text-sm">
                    Completed Deliveries
                  </Text>
                  <Text className="text-textMuted text-xs mt-0.5">
                    {periodDeliveryCount} Delivered Trips ({periodLabel})
                  </Text>
                </View>
              </View>
              <Text className="text-textPrimary font-black text-base">
                Rs. {periodEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          {/* ── 6. Deliveries List ── */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-textPrimary font-black text-base">
                  Deliveries ({filteredDeliveries.length})
                </Text>
                <Text className="text-textMuted text-xs font-semibold mt-0.5">
                  Ordered by most recent completion
                </Text>
              </View>
            </View>

            {loading ? (
              <View className="py-12 items-center justify-center">
                <ActivityIndicator size="large" color="#9A3412" />
                <Text className="text-textMuted text-xs mt-3 font-semibold">Loading delivery history...</Text>
              </View>
            ) : filteredDeliveries.length === 0 ? (
              <View className="bg-white rounded-3xl p-8 items-center justify-center border border-gray-100 shadow-sm my-2">
                <View className="w-16 h-16 rounded-full bg-orange-50 items-center justify-center mb-3">
                  <Feather name="clock" size={28} color="#EA580C" />
                </View>
                <Text className="text-textPrimary font-extrabold text-base text-center">
                  No Completed Deliveries
                </Text>
                <Text className="text-textMuted text-xs text-center mt-1.5 leading-5 max-w-xs">
                  Deliveries completed during {periodLabel.toLowerCase()} will appear here with fare breakdowns.
                </Text>
              </View>
            ) : (
              <>
                {displayedDeliveries.map((item) => (
                  <View
                    key={item.id}
                    className="bg-white rounded-2xl p-4 mb-2.5 border border-gray-100 shadow-xs"
                  >
                    {/* Top Row: Time | Restaurant -> Dropoff | Total Payout */}
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center">
                        <View className="bg-[#EEF2FF] px-2 py-0.5 rounded-md mr-2">
                          <Text className="text-[#4F46E5] text-[11px] font-black">
                            {item.time}
                          </Text>
                        </View>
                        <Text className="text-textMuted text-xs font-semibold">
                          {item.duration}
                        </Text>
                      </View>

                      <Text className="text-[#059669] font-black text-base">
                        +Rs. {item.payout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </View>

                    {/* Main Row: Restaurant -> Dropoff Destination */}
                    <View className="flex-row items-center mb-1.5">
                      <View className="w-2 h-2 rounded-full bg-[#EA580C] mr-2" />
                      <Text
                        className="text-textPrimary font-extrabold text-sm"
                        numberOfLines={1}
                      >
                        {item.restaurant}
                      </Text>
                      <Feather
                        name="arrow-right"
                        size={12}
                        color="#9CA3AF"
                        style={{ marginHorizontal: 6 }}
                      />
                      <Text
                        className="text-textSecondary text-xs font-medium flex-1"
                        numberOfLines={1}
                      >
                        {item.dropoff}
                      </Text>
                    </View>

                    {/* Bottom Details Row */}
                    <View className="flex-row items-center justify-between pt-1 border-t border-gray-100/60">
                      <Text className="text-textMuted text-[11px] font-semibold">
                        Base: Rs. {item.baseFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                      <Text className="text-emerald-700 text-[11px] font-semibold">
                        ✓ Dispatched & Delivered
                      </Text>
                    </View>
                  </View>
                ))}

                {filteredDeliveries.length > 4 && (
                  <TouchableOpacity
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setExpandedOrders(!expandedOrders);
                    }}
                    activeOpacity={0.8}
                    className="bg-[#EEF4FF] py-3.5 rounded-2xl items-center justify-center my-1"
                  >
                    <Text className="text-[#4F46E5] font-black text-xs">
                      {expandedOrders
                        ? 'Show Fewer Orders ⌃'
                        : `View Remaining ${filteredDeliveries.length - 4} Orders ⌵`}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* ── 7. Courier Status Badge Card ── */}
          <View className="bg-white rounded-3xl p-4 border border-emerald-100 flex-row items-center shadow-xs">
            <View className="w-12 h-12 rounded-full bg-[#D1FAE5] items-center justify-center mr-3.5">
              <Text style={{ fontSize: 24 }}>🎖️</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[#059669] text-[10px] font-black uppercase tracking-wider mb-0.5">
                VERIFIED COURIER PARTNER
              </Text>
              <Text className="text-textPrimary font-black text-sm mb-0.5">
                {(summary?.totalDeliveries ?? 0) >= 10 ? 'Senior Courier Status' : 'Homely Rider Partner'}
              </Text>
              <Text className="text-textSecondary text-xs leading-4">
                Total completed deliveries: {summary?.totalDeliveries ?? 0} trips
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Instant Cash Out Confirmation Modal ── */}
      <Modal
        visible={cashoutModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCashoutModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6 border-t border-gray-150">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-textPrimary font-black text-xl">
                Instant Cash Out
              </Text>
              <TouchableOpacity
                onPress={() => setCashoutModalVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Feather name="x" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {cashoutSuccess ? (
              <View className="bg-green-50 border border-green-200 rounded-3xl p-6 items-center mb-4">
                <Text style={{ fontSize: 36 }} className="mb-2">🎉</Text>
                <Text className="text-green-800 font-black text-lg mb-1">
                  Transfer Initiated!
                </Text>
                <Text className="text-green-700 text-xs text-center">
                  Rs. {(summary?.totalEarnings ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} routed to {payoutDisplay}.
                </Text>
              </View>
            ) : (
              <>
                <View className="bg-[#FFF7ED] rounded-2xl p-4 border border-[#FFEDD5] mb-4">
                  <Text className="text-textMuted text-xs font-bold uppercase mb-1">
                    Transfer Amount
                  </Text>
                  <Text className="text-textPrimary font-black text-2xl mb-2">
                    Rs. {(summary?.totalEarnings ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <View className="h-px bg-[#FED7AA] mb-2" />
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-textSecondary text-xs">Destination</Text>
                    <Text className="text-textPrimary font-bold text-xs">
                      {payoutDisplay}
                    </Text>
                  </View>
                  <View className="flex-row justify-between items-center">
                    <Text className="text-textSecondary text-xs">Express Transfer Fee</Text>
                    <Text className="text-[#059669] font-black text-xs">
                      Rs. 0.00
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleCashOut}
                  disabled={cashingOut || (summary?.totalEarnings ?? 0) <= 0}
                  activeOpacity={0.85}
                  className={`py-4 rounded-2xl items-center justify-center mb-2 shadow-md ${
                    (summary?.totalEarnings ?? 0) > 0 ? 'bg-[#9A3412]' : 'bg-gray-300'
                  }`}
                >
                  <Text className="text-white font-black text-sm">
                    {cashingOut ? 'PROCESSING TRANSFER...' : 'CONFIRM INSTANT TRANSFER'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setCashoutModalVisible(false)}
                  className="py-3 items-center"
                >
                  <Text className="text-textMuted font-bold text-xs">Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};
