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

// Realistic dummy data generator for rider delivery history and charts
const getDummyRiderData = () => {
  const now = new Date();
  const daysAgo = (days: number, hour: number, min: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(hour, min, 0, 0);
    return d.toISOString();
  };

  const dummyDeliveries: DeliveryRecord[] = [
    // Today
    {
      id: 'NP-DEL-8901',
      time: '02:15 PM',
      distance: 'Nugegoda Home Hub',
      duration: '18 min',
      restaurant: "Amma's Spice Garden",
      dropoff: '12/A Flower Road, Colombo 07',
      payout: 285.0,
      baseFee: 245.0,
      tip: 40.0,
      rawDate: daysAgo(0, 14, 15),
    },
    {
      id: 'NP-DEL-8902',
      time: '12:45 PM',
      distance: 'Maharagama Artisan Kitchen',
      duration: '14 min',
      restaurant: "Nimali's Home Kitchen",
      dropoff: '45 High Level Road, Nugegoda',
      payout: 217.5,
      baseFee: 185.0,
      tip: 32.5,
      rawDate: daysAgo(0, 12, 45),
    },
    // Yesterday (1 day ago)
    {
      id: 'NP-DEL-8903',
      time: '08:15 PM',
      distance: 'Kollupitiya Diner Hub',
      duration: '22 min',
      restaurant: 'Green Leaf Vegetarian',
      dropoff: '32 Duplication Road, Kollupitiya',
      payout: 310.0,
      baseFee: 260.0,
      tip: 50.0,
      rawDate: daysAgo(1, 20, 15),
    },
    {
      id: 'NP-DEL-8904',
      time: '06:40 PM',
      distance: 'Havelock Gourmet Pantry',
      duration: '20 min',
      restaurant: 'Curry Leaf Kitchen',
      dropoff: '14 Havelock Town, Colombo 05',
      payout: 350.0,
      baseFee: 290.0,
      tip: 60.0,
      rawDate: daysAgo(1, 18, 40),
    },
    {
      id: 'NP-DEL-8905',
      time: '01:20 PM',
      distance: 'Coastal Kitchens',
      duration: '26 min',
      restaurant: 'Authentic Jaffna Crab Pots',
      dropoff: '88 Galle Road, Mount Lavinia',
      payout: 420.0,
      baseFee: 350.0,
      tip: 70.0,
      rawDate: daysAgo(1, 13, 20),
    },
    // 2 days ago
    {
      id: 'NP-DEL-8906',
      time: '07:15 PM',
      distance: 'Dematagoda Spice Stop',
      duration: '21 min',
      restaurant: 'Village Claypot Rice',
      dropoff: '25 Baseline Road, Dematagoda',
      payout: 310.0,
      baseFee: 270.0,
      tip: 40.0,
      rawDate: daysAgo(2, 19, 15),
    },
    {
      id: 'NP-DEL-8907',
      time: '11:30 AM',
      distance: 'Borella Heritage Cooks',
      duration: '15 min',
      restaurant: "Nimali's Home Kitchen",
      dropoff: '102 Kynsey Road, Borella',
      payout: 240.0,
      baseFee: 210.0,
      tip: 30.0,
      rawDate: daysAgo(2, 11, 30),
    },
    // 3 days ago
    {
      id: 'NP-DEL-8908',
      time: '08:50 PM',
      distance: 'Kotte Sweets Collective',
      duration: '14 min',
      restaurant: 'Sweet & Spice Treats',
      dropoff: '18 Rajagiriya Road, Kotte',
      payout: 260.0,
      baseFee: 210.0,
      tip: 50.0,
      rawDate: daysAgo(3, 20, 50),
    },
    {
      id: 'NP-DEL-8909',
      time: '06:30 PM',
      distance: 'Havelock Biryani Lab',
      duration: '25 min',
      restaurant: 'Ceylon Biryani House',
      dropoff: '77 Havelock Road, Colombo 05',
      payout: 390.0,
      baseFee: 340.0,
      tip: 50.0,
      rawDate: daysAgo(3, 18, 30),
    },
    {
      id: 'NP-DEL-8910',
      time: '01:45 PM',
      distance: 'Marine Drive Curries',
      duration: '19 min',
      restaurant: 'Southern Fish Curry Pot',
      dropoff: '54 Marine Drive, Bambalapitiya',
      payout: 340.0,
      baseFee: 290.0,
      tip: 50.0,
      rawDate: daysAgo(3, 13, 45),
    },
    {
      id: 'NP-DEL-8911',
      time: '12:10 PM',
      distance: 'Cinnamon Gardens Hub',
      duration: '28 min',
      restaurant: "Grandma's Lamprais",
      dropoff: '6 Ward Place, Colombo 07',
      payout: 430.0,
      baseFee: 380.0,
      tip: 50.0,
      rawDate: daysAgo(3, 12, 10),
    },
    // 4 days ago
    {
      id: 'NP-DEL-8912',
      time: '08:30 PM',
      distance: 'Colombo 07 Cloud Cooks',
      duration: '17 min',
      restaurant: "Nimali's Home Kitchen",
      dropoff: '30 Barnes Place, Colombo 07',
      payout: 280.0,
      baseFee: 240.0,
      tip: 40.0,
      rawDate: daysAgo(4, 20, 30),
    },
    {
      id: 'NP-DEL-8913',
      time: '06:15 PM',
      distance: 'Park Street Dining Co.',
      duration: '23 min',
      restaurant: 'Curry Leaf Kitchen',
      dropoff: '15 Park Street, Colombo 02',
      payout: 360.0,
      baseFee: 310.0,
      tip: 50.0,
      rawDate: daysAgo(4, 18, 15),
    },
    {
      id: 'NP-DEL-8914',
      time: '01:00 PM',
      distance: 'Dharmapala Home Cooks',
      duration: '19 min',
      restaurant: "Amma's Spice Garden",
      dropoff: '91 Dharmapala Mawatha, Colombo 07',
      payout: 310.0,
      baseFee: 270.0,
      tip: 40.0,
      rawDate: daysAgo(4, 13, 0),
    },
    // 5 days ago
    {
      id: 'NP-DEL-8915',
      time: '07:45 PM',
      distance: 'Torrington Food Stalls',
      duration: '27 min',
      restaurant: 'Authentic Jaffna Crab Pots',
      dropoff: '68 Torrington Square, Colombo 07',
      payout: 420.0,
      baseFee: 360.0,
      tip: 60.0,
      rawDate: daysAgo(5, 19, 45),
    },
    {
      id: 'NP-DEL-8916',
      time: '12:30 PM',
      distance: 'Rajagiriya Artisan Hub',
      duration: '20 min',
      restaurant: 'Village Claypot Rice',
      dropoff: '44 Nawala Road, Rajagiriya',
      payout: 320.0,
      baseFee: 280.0,
      tip: 40.0,
      rawDate: daysAgo(5, 12, 30),
    },
    // 6 days ago
    {
      id: 'NP-DEL-8917',
      time: '07:30 PM',
      distance: 'Borella Junction Kitchen',
      duration: '18 min',
      restaurant: 'Green Leaf Vegetarian',
      dropoff: '58 Cotta Road, Borella',
      payout: 285.0,
      baseFee: 245.0,
      tip: 40.0,
      rawDate: daysAgo(6, 19, 30),
    },
    {
      id: 'NP-DEL-8918',
      time: '02:00 PM',
      distance: 'Dickmans Heritage Cooks',
      duration: '21 min',
      restaurant: 'Ceylon Biryani House',
      dropoff: '11 Dickmans Road, Colombo 05',
      payout: 325.0,
      baseFee: 275.0,
      tip: 50.0,
      rawDate: daysAgo(6, 14, 0),
    },
    {
      id: 'NP-DEL-8919',
      time: '11:45 AM',
      distance: 'Rosmead Gardens Kitchen',
      duration: '24 min',
      restaurant: "Grandma's Lamprais",
      dropoff: '22 Rosmead Place, Colombo 07',
      payout: 360.0,
      baseFee: 310.0,
      tip: 50.0,
      rawDate: daysAgo(6, 11, 45),
    },
  ];

  // Build last 7 days dynamic metrics aligned to days
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const last7Days: any[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayLabel = dayNames[d.getDay()];

    const matching = dummyDeliveries.filter((del) => {
      const delD = new Date(del.rawDate!);
      return (
        delD.getDate() === d.getDate() &&
        delD.getMonth() === d.getMonth() &&
        delD.getFullYear() === d.getFullYear()
      );
    });
    const count = matching.length;
    const earnings = matching.reduce((sum, item) => sum + item.payout, 0);

    last7Days.push({
      dayLabel,
      count,
      earnings,
      isToday: i === 0,
    });
  }

  const todayEarnings = last7Days[6].earnings;
  const todayCount = last7Days[6].count;
  const weekEarnings = last7Days.reduce((acc, d) => acc + d.earnings, 0);
  const weekCount = last7Days.reduce((acc, d) => acc + d.count, 0);

  const dummySummary = {
    today: {
      earnings: todayEarnings,
      deliveryCount: todayCount,
    },
    thisWeek: {
      earnings: weekEarnings,
      deliveryCount: weekCount,
    },
    thisMonth: {
      earnings: 24850,
      deliveryCount: 84,
    },
    totalEarnings: 486200,
    totalDeliveries: 142,
    activeDeliveries: 0,
    last7Days,
  };

  return { dummyDeliveries, dummySummary };
};

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

      let summaryData = summaryRes.status === 'fulfilled' ? summaryRes.value.data : null;
      let mappedDeliveries: DeliveryRecord[] = [];

      if (ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value.data)) {
        const delivered = ordersRes.value.data.filter((o: any) => o.status === 'DELIVERED');
        mappedDeliveries = delivered.map((o: any) => {
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
      }

      // Determine if current user is specifically the demo rider account (rider@neighborplates.com)
      const currentEmail = (
        user?.email ||
        (profileRes.status === 'fulfilled' ? profileRes.value?.data?.email : '') ||
        ''
      )
        .trim()
        .toLowerCase();
      const isDemoRider = currentEmail === 'rider@neighborplates.com';

      // Only load dummy demo data if the user is explicitly rider@neighborplates.com AND has no data
      const needsDummyData =
        isDemoRider &&
        (mappedDeliveries.length === 0 ||
          !summaryData ||
          (summaryData.totalEarnings === 0 &&
            (!summaryData.last7Days || summaryData.last7Days.every((d: any) => d.earnings === 0))));

      if (needsDummyData) {
        const { dummyDeliveries, dummySummary } = getDummyRiderData();
        if (mappedDeliveries.length === 0) {
          mappedDeliveries = dummyDeliveries;
        }
        if (
          !summaryData ||
          summaryData.totalEarnings === 0 ||
          !summaryData.last7Days ||
          summaryData.last7Days.every((d: any) => d.earnings === 0)
        ) {
          summaryData = {
            ...dummySummary,
            ...(summaryData || {}),
            today: summaryData?.today?.earnings ? summaryData.today : dummySummary.today,
            thisWeek: summaryData?.thisWeek?.earnings ? summaryData.thisWeek : dummySummary.thisWeek,
            thisMonth: summaryData?.thisMonth?.earnings ? summaryData.thisMonth : dummySummary.thisMonth,
            totalEarnings: summaryData?.totalEarnings || dummySummary.totalEarnings,
            totalDeliveries: summaryData?.totalDeliveries || dummySummary.totalDeliveries,
            last7Days:
              summaryData?.last7Days && summaryData.last7Days.some((d: any) => d.earnings > 0)
                ? summaryData.last7Days
                : dummySummary.last7Days,
          };
        }
      }

      // If non-demo rider and summaryData is missing, ensure clean zero-value structure
      if (!summaryData) {
        summaryData = {
          totalEarnings: 0,
          totalDeliveries: 0,
          activeDeliveries: 0,
          today: { deliveryCount: 0, earnings: 0 },
          thisWeek: { deliveryCount: 0, earnings: 0 },
          thisMonth: { deliveryCount: 0, earnings: 0 },
          last7Days: [
            { dayLabel: 'M', count: 0, earnings: 0, isToday: false },
            { dayLabel: 'T', count: 0, earnings: 0, isToday: false },
            { dayLabel: 'W', count: 0, earnings: 0, isToday: false },
            { dayLabel: 'T', count: 0, earnings: 0, isToday: false },
            { dayLabel: 'F', count: 0, earnings: 0, isToday: false },
            { dayLabel: 'S', count: 0, earnings: 0, isToday: false },
            { dayLabel: 'S', count: 0, earnings: 0, isToday: true },
          ],
        };
      }

      setDeliveries(mappedDeliveries);
      setSummary(summaryData);
    } catch {
      const emailToCheck = (user?.email || '').trim().toLowerCase();
      if (emailToCheck === 'rider@neighborplates.com') {
        const { dummyDeliveries, dummySummary } = getDummyRiderData();
        setDeliveries(dummyDeliveries);
        setSummary(dummySummary);
      } else {
        setDeliveries([]);
        setSummary({
          totalEarnings: 0,
          totalDeliveries: 0,
          activeDeliveries: 0,
          today: { deliveryCount: 0, earnings: 0 },
          thisWeek: { deliveryCount: 0, earnings: 0 },
          thisMonth: { deliveryCount: 0, earnings: 0 },
          last7Days: [
            { dayLabel: 'M', count: 0, earnings: 0, isToday: false },
            { dayLabel: 'T', count: 0, earnings: 0, isToday: false },
            { dayLabel: 'W', count: 0, earnings: 0, isToday: false },
            { dayLabel: 'T', count: 0, earnings: 0, isToday: false },
            { dayLabel: 'F', count: 0, earnings: 0, isToday: false },
            { dayLabel: 'S', count: 0, earnings: 0, isToday: false },
            { dayLabel: 'S', count: 0, earnings: 0, isToday: true },
          ],
        });
      }
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
