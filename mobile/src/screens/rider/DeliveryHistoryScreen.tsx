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
  surge?: number;
  isSurge?: boolean;
}

const DEFAULT_DELIVERIES_TODAY: DeliveryRecord[] = [
  {
    id: 'del-1',
    time: '1:45 PM',
    distance: '3.1 km',
    duration: '22 min',
    restaurant: "Chef Maria's Lasagna",
    dropoff: 'Oakridge Apt 4B',
    payout: 1820,
    baseFee: 1420,
    tip: 400,
  },
  {
    id: 'del-2',
    time: '1:02 PM',
    distance: '2.4 km',
    duration: '17 min',
    restaurant: "Mama Sun's Dumpling Box",
    dropoff: '12 Pine St',
    payout: 1450,
    baseFee: 1150,
    tip: 300,
  },
  {
    id: 'del-3',
    time: '12:15 PM',
    distance: '4.8 km',
    duration: '29 min',
    restaurant: "Auntie Noor's Biryani",
    dropoff: 'Tech Park Bldg C',
    payout: 2280,
    baseFee: 1430,
    surge: 200,
    tip: 650,
    isSurge: true,
  },
  {
    id: 'del-4',
    time: '11:30 AM',
    distance: '1.9 km',
    duration: '15 min',
    restaurant: "Kenji's Bento Bento",
    dropoff: 'Riverside 101',
    payout: 1200,
    baseFee: 1000,
    tip: 200,
  },
  {
    id: 'del-5',
    time: '10:50 AM',
    distance: '3.4 km',
    duration: '24 min',
    restaurant: 'Ceylon Curry Pot',
    dropoff: '45 Lake View',
    payout: 1650,
    baseFee: 1350,
    tip: 300,
  },
  {
    id: 'del-6',
    time: '10:15 AM',
    distance: '2.1 km',
    duration: '16 min',
    restaurant: 'Green Garden Salad Bar',
    dropoff: '77 Horton Place',
    payout: 1350,
    baseFee: 1100,
    tip: 250,
  },
  {
    id: 'del-7',
    time: '9:40 AM',
    distance: '4.2 km',
    duration: '28 min',
    restaurant: 'Colombo Bakeries',
    dropoff: 'Tower 3, Penthouse',
    payout: 2100,
    baseFee: 1500,
    surge: 200,
    tip: 400,
    isSurge: true,
  },
  {
    id: 'del-8',
    time: '9:00 AM',
    distance: '2.8 km',
    duration: '20 min',
    restaurant: 'Morning Sunshine Dosa',
    dropoff: '19 Sea Avenue',
    payout: 1500,
    baseFee: 1200,
    tip: 300,
  },
];

type PeriodType = 'day' | 'week' | 'month';

export const DeliveryHistoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const [period, setPeriod] = useState<PeriodType>('day');
  const [refreshing, setRefreshing] = useState(false);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>(DEFAULT_DELIVERIES_TODAY);
  const [expandedOrders, setExpandedOrders] = useState(false);
  const [cashoutModalVisible, setCashoutModalVisible] = useState(false);
  const [cashoutSuccess, setCashoutSuccess] = useState(false);
  const [cashingOut, setCashingOut] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const fetchHistory = async () => {
    try {
      const [ordersRes, profileRes] = await Promise.allSettled([
        api.get('/api/orders/my'),
        api.get('/api/users/profile'),
      ]);

      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value.data);
      }

      if (ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value.data)) {
        const delivered = ordersRes.value.data.filter((o: any) => o.status === 'DELIVERED');
        if (delivered.length > 0) {
          // Map backend orders into DeliveryRecord format
          const mapped: DeliveryRecord[] = delivered.map((o: any, idx: number) => ({
            id: o.id,
            time: new Date(o.createdAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            distance: `${(2.0 + idx * 0.5).toFixed(1)} km`,
            duration: `${15 + idx * 3} min`,
            restaurant: o.cookName || 'Home Kitchen',
            dropoff: o.address?.label || 'Customer Address',
            payout: o.riderEarnings || 1450,
            baseFee: Math.round((o.riderEarnings || 1450) * 0.75),
            tip: Math.round((o.riderEarnings || 1450) * 0.25),
          }));
          setDeliveries([...mapped, ...DEFAULT_DELIVERIES_TODAY.slice(mapped.length)]);
        }
      }
    } catch {
      setDeliveries(DEFAULT_DELIVERIES_TODAY);
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

  const displayedDeliveries = expandedOrders
    ? deliveries
    : deliveries.slice(0, 4);

  const deriveRiderName = () => {
    if (profile?.profile?.name && profile.profile.name.trim().length > 0) return profile.profile.name.trim();
    if (user?.name && user.name.trim().length > 0) return user.name.trim();
    const emailToUse = user?.email || profile?.email;
    if (emailToUse) {
      const part = emailToUse.split('@')[0];
      return part.charAt(0).toUpperCase() + part.slice(1);
    }
    return 'Sahan';
  };
  const riderDisplayName = deriveRiderName();

  const avatarUrl =
    profile?.profile?.avatarUrl ||
    user?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(riderDisplayName)}&background=9A3412&color=fff&bold=true&size=256`;
  const payoutDisplay =
    profile?.profile?.payoutMethod || 'Chase Debit **** 4092';

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
                  EARNINGS
                </Text>
              </View>
            </View>

            {/* Ready Badge & Avatar */}
            <View className="flex-row items-center gap-2.5">
              <View className="bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1 rounded-full flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-[#10B981] mr-1.5" />
                <Text className="text-[#059669] font-bold text-xs">Ready</Text>
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
                  Today, Oct 24
                </Text>
                <TouchableOpacity
                  onPress={() => {}}
                  className="w-8 h-8 rounded-full bg-white border border-gray-200 items-center justify-center shadow-xs"
                >
                  <Feather name="calendar" size={14} color="#6B7280" />
                </TouchableOpacity>
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
                  NET SHIFT EARNINGS
                </Text>
                <View className="flex-row items-center">
                  <Text className="text-textPrimary font-black text-3xl">
                    Rs. 16,850
                  </Text>
                  <View className="bg-[#D1FAE5] px-2 py-0.5 rounded-full flex-row items-center ml-2">
                    <Feather name="trending-up" size={11} color="#059669" />
                    <Text className="text-[#059669] font-black text-[11px] ml-1">
                      +16%
                    </Text>
                  </View>
                </View>
              </View>

              <View className="items-end">
                <Text className="text-textMuted text-[10px] uppercase font-bold tracking-wider">
                  Balance Available
                </Text>
                <Text className="text-textPrimary font-black text-lg mt-0.5">
                  Rs. 24,190
                </Text>
              </View>
            </View>

            {/* 3-Column Metrics Pill Box */}
            <View className="bg-[#EEF4FF] rounded-2xl p-3 my-3.5 flex-row justify-between items-center">
              <View className="flex-1 items-center border-r border-blue-100">
                <Text className="text-textPrimary font-black text-lg">8</Text>
                <Text className="text-textMuted text-[10px] uppercase font-bold tracking-wider mt-0.5">
                  Deliveries
                </Text>
              </View>

              <View className="flex-1 items-center border-r border-blue-100">
                <Text className="text-textPrimary font-black text-lg">4h 15m</Text>
                <Text className="text-textMuted text-[10px] uppercase font-bold tracking-wider mt-0.5">
                  Time Online
                </Text>
              </View>

              <View className="flex-1 items-center">
                <Text className="text-[#059669] font-black text-lg">Rs. 3,965</Text>
                <Text className="text-textMuted text-[10px] uppercase font-bold tracking-wider mt-0.5">
                  Avg / Hour
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
                  Rs. 16,850
                </Text>
                <Feather name="chevron-right" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <Text className="text-textMuted text-[10px] text-center mt-2.5 font-medium">
              Auto-deposits to {payoutDisplay} (Rs. 50 fee)
            </Text>
          </View>

          {/* ── 4. Dinner Peak Challenge Card ── */}
          <View className="bg-[#EEF4FF] rounded-3xl p-4 border border-blue-100 mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <View className="w-7 h-7 rounded-full bg-[#9A3412] items-center justify-center mr-2">
                  <Text style={{ fontSize: 13 }}>🍽</Text>
                </View>
                <Text className="text-textPrimary font-black text-sm">
                  Dinner Peak Challenge
                </Text>
              </View>

              <View className="bg-[#FFEDD5] px-2.5 py-1 rounded-full">
                <Text className="text-[#7C2D12] font-black text-[10px]">
                  Ends 9:00 PM
                </Text>
              </View>
            </View>

            <Text className="text-textSecondary text-xs leading-4 mb-2.5">
              Complete <Text className="font-bold text-textPrimary">4 more deliveries</Text> before 9:00 PM to unlock an extra{' '}
              <Text className="text-[#059669] font-black">+Rs. 3,000 cash bonus!</Text>
            </Text>

            {/* Progress Bar */}
            <View className="flex-row justify-between mb-1">
              <Text className="text-textSecondary text-[11px] font-bold">
                Progress: 2 of 6 orders
              </Text>
              <Text className="text-[#9A3412] text-[11px] font-black">
                33% Completed
              </Text>
            </View>
            <View className="bg-white/80 h-2.5 rounded-full overflow-hidden">
              <View className="w-1/3 bg-[#9A3412] h-full rounded-full" />
            </View>
          </View>

          {/* ── 5. Weekly Trend Bar Chart ── */}
          <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-4">
            <View className="flex-row items-start justify-between mb-5">
              <View>
                <Text className="text-textPrimary font-black text-base">
                  Weekly Trend
                </Text>
                <Text className="text-textMuted text-[11px] font-semibold mt-0.5">
                  Week Total: Rs. 84,210 • 38 Deliveries
                </Text>
              </View>

              <View className="flex-row items-center">
                <Feather name="trending-up" size={13} color="#059669" />
                <Text className="text-[#059669] font-black text-xs ml-1">
                  Target: Rs. 100,000
                </Text>
              </View>
            </View>

            {/* Bars Canvas */}
            <View className="h-36 flex-row items-end justify-between px-1 mb-2 relative">
              {/* Target Line Guide */}
              <View className="absolute top-5 left-0 right-0 h-px bg-gray-150 border-b border-dashed border-gray-300">
                <Text className="text-textMuted text-[9px] absolute right-0 -top-4 font-bold">
                  Rs. 15,000
                </Text>
              </View>

              {/* Bar 1: Mon */}
              <View className="items-center flex-1">
                <View className="w-7 bg-[#DBEAFE] h-20 rounded-t-xl" />
                <Text className="text-textMuted font-bold text-xs mt-2">M</Text>
              </View>

              {/* Bar 2: Tue */}
              <View className="items-center flex-1">
                <View className="w-7 bg-[#DBEAFE] h-16 rounded-t-xl" />
                <Text className="text-textMuted font-bold text-xs mt-2">T</Text>
              </View>

              {/* Bar 3: Wed */}
              <View className="items-center flex-1">
                <View className="w-7 bg-[#DBEAFE] h-24 rounded-t-xl" />
                <Text className="text-textMuted font-bold text-xs mt-2">W</Text>
              </View>

              {/* Bar 4: Thu (Today - Highlighted) */}
              <View className="items-center flex-1 relative">
                {/* Floating amount pill above today */}
                <View className="bg-[#7C2D12] px-2 py-0.5 rounded-md absolute -top-6 shadow-xs">
                  <Text className="text-white text-[9px] font-black">
                    Rs. 16,850
                  </Text>
                </View>
                <View className="w-7 bg-[#BFDBFE] h-28 rounded-t-xl" />
                <Text className="text-[#9A3412] font-black text-xs mt-2">T</Text>
              </View>

              {/* Bar 5: Fri */}
              <View className="items-center flex-1">
                <View className="w-7 bg-[#DBEAFE] h-24 rounded-t-xl" />
                <Text className="text-textMuted font-bold text-xs mt-2">F</Text>
              </View>

              {/* Bar 6: Sat */}
              <View className="items-center flex-1">
                <View className="w-7 bg-[#DBEAFE] h-26 rounded-t-xl" />
                <Text className="text-textMuted font-bold text-xs mt-2">S</Text>
              </View>

              {/* Bar 7: Sun */}
              <View className="items-center flex-1">
                <View className="w-7 bg-[#DBEAFE] h-22 rounded-t-xl" />
                <Text className="text-textMuted font-bold text-xs mt-2">S</Text>
              </View>
            </View>
          </View>

          {/* ── 6. Income Composition ── */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-textPrimary font-black text-base">
                Income Composition
              </Text>
              <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider">
                Realtime Verified
              </Text>
            </View>

            {/* Composition Card 1: Base Delivery Fees */}
            <View className="bg-[#EFF6FF] rounded-2xl p-4 mb-2.5 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-11 h-11 rounded-2xl bg-white border border-blue-100 items-center justify-center mr-3 shadow-xs">
                  <Text style={{ fontSize: 20 }}>🛵</Text>
                </View>
                <View>
                  <Text className="text-textPrimary font-extrabold text-sm">
                    Base Delivery Fees
                  </Text>
                  <Text className="text-textMuted text-xs mt-0.5">
                    8 Completed trips
                  </Text>
                </View>
              </View>
              <Text className="text-textPrimary font-black text-base">
                Rs. 9,800
              </Text>
            </View>

            {/* Composition Card 2: Customer Tips */}
            <View className="bg-[#EFF6FF] rounded-2xl p-4 mb-2.5 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-11 h-11 rounded-2xl bg-white border border-blue-100 items-center justify-center mr-3 shadow-xs">
                  <Text style={{ fontSize: 20 }}>💵</Text>
                </View>
                <View>
                  <View className="flex-row items-center">
                    <Text className="text-textPrimary font-extrabold text-sm">
                      Customer Tips
                    </Text>
                    <View className="bg-[#A7F3D0] px-1.5 py-0.5 rounded-md ml-1.5">
                      <Text className="text-[#065F46] font-black text-[9px]">
                        100% Yours
                      </Text>
                    </View>
                  </View>
                  <Text className="text-textMuted text-xs mt-0.5">
                    Across 6 generous households
                  </Text>
                </View>
              </View>
              <Text className="text-[#059669] font-black text-base">
                +Rs. 4,650
              </Text>
            </View>

            {/* Composition Card 3: Lunch Rush Surge Quest */}
            <View className="bg-[#EFF6FF] rounded-2xl p-4 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-11 h-11 rounded-2xl bg-white border border-blue-100 items-center justify-center mr-3 shadow-xs">
                  <Text style={{ fontSize: 20 }}>🎖️</Text>
                </View>
                <View>
                  <Text className="text-textPrimary font-extrabold text-sm">
                    Lunch Rush Surge Quest
                  </Text>
                  <Text className="text-textMuted text-xs mt-0.5">
                    6/6 orders during 11 AM - 2 PM
                  </Text>
                </View>
              </View>
              <Text className="text-[#C25E00] font-black text-base">
                +Rs. 2,400
              </Text>
            </View>
          </View>

          {/* ── 7. Deliveries Today (Detailed Breakdown List) ── */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-textPrimary font-black text-base">
                  Deliveries Today
                </Text>
                <Text className="text-textMuted text-xs font-semibold mt-0.5">
                  Ordered by most recent trip
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {}}
                className="border border-gray-200 px-3 py-1 rounded-full flex-row items-center bg-white"
              >
                <Feather name="sliders" size={11} color="#6B7280" />
                <Text className="text-textSecondary text-xs font-bold ml-1.5">
                  Filter
                </Text>
              </TouchableOpacity>
            </View>

            {/* Delivery Items */}
            {displayedDeliveries.map((item) => (
              <View
                key={item.id}
                className="bg-white rounded-2xl p-4 mb-2.5 border border-gray-100 shadow-xs"
              >
                {/* Top Row: Time | Distance & Time | Total Payout */}
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <View className="bg-[#EEF2FF] px-2 py-0.5 rounded-md mr-2">
                      <Text className="text-[#4F46E5] text-[11px] font-black">
                        {item.time}
                      </Text>
                    </View>
                    <Text className="text-textMuted text-xs font-semibold mr-1.5">
                      {item.distance} • {item.duration}
                    </Text>
                    {item.isSurge && (
                      <View className="bg-[#FFEDD5] px-1.5 py-0.5 rounded-md">
                        <Text className="text-[#C25E00] text-[9px] font-black">
                          +Surge
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text className="text-[#059669] font-black text-base">
                    +Rs. {item.payout.toLocaleString()}
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

                {/* Bottom Details Row: Base Fee + Tip */}
                <View className="flex-row items-center justify-between pt-1 border-t border-gray-100/60">
                  <Text className="text-textMuted text-[11px] font-semibold">
                    Base: Rs. {item.baseFee.toLocaleString()}
                    {item.surge ? ` + Rs. ${item.surge} Surge` : ''}
                  </Text>

                  {item.tip ? (
                    <Text className="text-[#059669] text-[11px] font-bold">
                      ♡ Tip included: Rs. {item.tip.toLocaleString()}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}

            {/* Toggle Expand Orders Button */}
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
                  : 'View Remaining 4 Orders ⌵'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── 8. Super Star Rider Status Badge Card ── */}
          <View className="bg-white rounded-3xl p-4 border border-emerald-100 flex-row items-center shadow-xs">
            <View className="w-12 h-12 rounded-full bg-[#D1FAE5] items-center justify-center mr-3.5">
              <Text style={{ fontSize: 24 }}>🎖️</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[#059669] text-[10px] font-black uppercase tracking-wider mb-0.5">
                TOP 5% COURIER STATUS
              </Text>
              <Text className="text-textPrimary font-black text-sm mb-0.5">
                Super Star Rider Badge Active
              </Text>
              <Text className="text-textSecondary text-xs leading-4">
                Priority lunch matching and 0% instant transfer fees.
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
                  Transfer Completed!
                </Text>
                <Text className="text-green-700 text-xs text-center">
                  Rs. 16,850 has been deposited to Chase Debit ending in 4092.
                </Text>
              </View>
            ) : (
              <>
                <View className="bg-[#FFF7ED] rounded-2xl p-4 border border-[#FFEDD5] mb-4">
                  <Text className="text-textMuted text-xs font-bold uppercase mb-1">
                    Transfer Amount
                  </Text>
                  <Text className="text-textPrimary font-black text-2xl mb-2">
                    Rs. 16,850.00
                  </Text>
                  <View className="h-px bg-[#FED7AA] mb-2" />
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-textSecondary text-xs">Destination</Text>
                    <Text className="text-textPrimary font-bold text-xs">
                      Chase Debit (**** 4092)
                    </Text>
                  </View>
                  <View className="flex-row justify-between items-center">
                    <Text className="text-textSecondary text-xs">Express Transfer Fee</Text>
                    <Text className="text-[#059669] font-black text-xs">
                      Rs. 0 (Waived)
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleCashOut}
                  disabled={cashingOut}
                  activeOpacity={0.85}
                  className="bg-[#9A3412] py-4 rounded-2xl items-center justify-center mb-2 shadow-md"
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
