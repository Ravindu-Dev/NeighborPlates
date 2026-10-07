import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Feather } from '@expo/vector-icons';
import { Badge } from '../../components/common/Badge';
import Svg, { Rect, Text as SvgText, Line, G } from 'react-native-svg';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Weekly Bar Chart Component ───────────────────────────────────────────────
const WeeklyEarningsChart: React.FC<{ orders: any[] }> = ({ orders }) => {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const chartWidth = SCREEN_WIDTH - 64;
  const chartHeight = 120;
  const barAreaWidth = chartWidth - 40;
  const barWidth = Math.floor(barAreaWidth / 7) - 6;

  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const dayEarnings: number[] = [0, 0, 0, 0, 0, 0, 0];
  orders.forEach((order) => {
    if (order.status !== 'DELIVERED' || !order.createdAt) return;
    const d = new Date(order.createdAt);
    const dayIndex = Math.floor((d.getTime() - monday.getTime()) / 86400000);
    if (dayIndex >= 0 && dayIndex < 7) {
      dayEarnings[dayIndex] += order.cookEarnings ?? 0;
    }
  });

  const maxVal = Math.max(...dayEarnings, 1);
  const todayDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const yTickVal = Math.ceil(maxVal / 3);
  const yTicks = [0, yTickVal, yTickVal * 2, yTickVal * 3];

  return (
    <View>
      <Svg width={chartWidth} height={chartHeight + 28} style={{ overflow: 'visible' }}>
        {yTicks.map((tick, i) => {
          const y = chartHeight - (tick / (yTickVal * 3)) * chartHeight;
          return (
            <G key={i}>
              <Line x1={36} y1={y} x2={chartWidth} y2={y} stroke={tick === 0 ? '#E5E7EB' : '#F3F4F6'} strokeWidth={1} />
              <SvgText x={32} y={y + 4} fontSize={8} fill="#9CA3AF" textAnchor="end" fontWeight="bold">
                {tick > 0 ? `${(tick / 1000).toFixed(tick >= 1000 ? 1 : 0)}k` : '0'}
              </SvgText>
            </G>
          );
        })}
        {dayEarnings.map((val, i) => {
          const barH = Math.max((val / maxVal) * chartHeight, val > 0 ? 4 : 0);
          const x = 40 + i * (barAreaWidth / 7) + (barAreaWidth / 7 - barWidth) / 2;
          const y = chartHeight - barH;
          const isToday = i === todayDayIndex;
          return (
            <G key={i}>
              <Rect x={x} y={y} width={barWidth} height={barH} rx={4} ry={4} fill={isToday ? '#2D6A4F' : '#A7C4B5'} opacity={val === 0 ? 0.25 : 1} />
              <SvgText x={x + barWidth / 2} y={chartHeight + 14} fontSize={9} fill={isToday ? '#2D6A4F' : '#9CA3AF'} textAnchor="middle" fontWeight={isToday ? 'bold' : 'normal'}>
                {DAYS[i]}
              </SvgText>
              {val > 0 && barH > 16 && (
                <SvgText x={x + barWidth / 2} y={y - 3} fontSize={8} fill="#2D6A4F" textAnchor="middle" fontWeight="bold">
                  {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
};

// ─── Payout History ───────────────────────────────────────────────────────────
const buildPayoutHistory = (orders: any[]) => {
  const delivered = orders.filter((o) => o.status === 'DELIVERED' && o.createdAt);
  const weekMap: Record<string, { date: Date; total: number; count: number }> = {};

  delivered.forEach((order) => {
    const d = new Date(order.createdAt);
    const day = d.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const key = monday.toISOString().slice(0, 10);
    if (!weekMap[key]) {
      weekMap[key] = { date: new Date(monday.getTime() + 6 * 86400000), total: 0, count: 0 };
    }
    weekMap[key].total += order.cookEarnings ?? 0;
    weekMap[key].count++;
  });

  return Object.entries(weekMap)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6)
    .map(([weekStart, data]) => ({
      weekStart,
      payoutDate: data.date,
      amount: data.total,
      orderCount: data.count,
      settled: data.date < new Date(),
    }));
};

// ─── Best-Performing Meals ────────────────────────────────────────────────────
const buildTopMeals = (orders: any[]) => {
  const mealMap: Record<string, { name: string; revenue: number; orders: number }> = {};
  orders
    .filter((o) => o.status === 'DELIVERED' && o.items)
    .forEach((order) => {
      order.items.forEach((item: any) => {
        const key = item.mealId || item.mealName || 'Unknown';
        const name = item.mealName || 'Meal';
        const revenue = (item.price ?? 0) * (item.quantity ?? 1);
        if (!mealMap[key]) mealMap[key] = { name, revenue: 0, orders: 0 };
        mealMap[key].revenue += revenue;
        mealMap[key].orders += item.quantity ?? 1;
      });
    });
  return Object.values(mealMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
};

type Period = 'WEEK' | 'MONTH' | 'ALL';
type OrderFilter = 'ALL' | 'DELIVERED' | 'ACTIVE' | 'TODAY';

export const EarningDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('WEEK');
  const [selectedFilter, setSelectedFilter] = useState<OrderFilter>('ALL');

  const fetchData = async () => {
    try {
      const [profRes, ordRes] = await Promise.all([
        api.get('/api/users/profile'),
        api.get('/api/orders/my'),
      ]);
      setProfile(profRes.data);
      setOrders(ordRes.data || []);
    } catch (error) {
      console.error('Error fetching earnings data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const unsubscribe = navigation.addListener('focus', fetchData);
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  const isToday = (ds?: string) => {
    if (!ds) return false;
    const d = new Date(ds);
    const n = new Date();
    return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  };

  const isThisWeek = (ds?: string) => {
    if (!ds) return false;
    const d = new Date(ds);
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    return d >= monday;
  };

  const isThisMonth = (ds?: string) => {
    if (!ds) return false;
    const d = new Date(ds);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  };

  const periodOrders = orders.filter((o) => {
    if (selectedPeriod === 'WEEK') return isThisWeek(o.createdAt);
    if (selectedPeriod === 'MONTH') return isThisMonth(o.createdAt);
    return true;
  });

  const deliveredOrders = periodOrders.filter((o) => o.status === 'DELIVERED');
  const activeOrders = orders.filter((o) =>
    ['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'DELIVERING'].includes(o.status)
  );
  const todayOrders = orders.filter((o) => isToday(o.createdAt));

  const lifetimeTotalEarnings =
    profile?.stats?.totalEarnings ??
    orders.filter((o) => o.status === 'DELIVERED').reduce((s, o) => s + (o.cookEarnings ?? 0), 0);

  const periodNetEarnings = deliveredOrders.reduce((s, o) => s + (o.cookEarnings ?? 0), 0);
  const todayEarnings = todayOrders.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + (o.cookEarnings ?? 0), 0);
  const pendingEarnings = activeOrders.reduce((s, o) => s + (o.cookEarnings ?? 0), 0);
  const periodGross = periodOrders.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + (o.totalAmount ?? 0), 0);
  const periodFees = periodOrders.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + (o.platformFee ?? 0), 0);
  const avgPerOrder = deliveredOrders.length > 0 ? periodNetEarnings / deliveredOrders.length : 0;

  const topMeals = buildTopMeals(orders);
  const payoutHistory = buildPayoutHistory(orders);

  const filteredOrders = periodOrders.filter((o) => {
    if (selectedFilter === 'DELIVERED') return o.status === 'DELIVERED';
    if (selectedFilter === 'ACTIVE') return ['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'DELIVERING'].includes(o.status);
    if (selectedFilter === 'TODAY') return isToday(o.createdAt);
    return true;
  });

  const getStatusVariant = (status: string): 'success' | 'warning' | 'primary' | 'secondary' | 'neutral' => {
    switch (status) {
      case 'DELIVERED': return 'success';
      case 'PLACED': return 'warning';
      case 'ACCEPTED': case 'PREPARING': return 'primary';
      case 'READY_FOR_PICKUP': case 'DELIVERING': return 'secondary';
      default: return 'neutral';
    }
  };

  const renderOrderItem = ({ item }: { item: any }) => {
    const net = item.cookEarnings ?? (item.totalAmount ? item.totalAmount * 0.9 : 0);
    const fee = item.platformFee ?? (item.totalAmount ? item.totalAmount * 0.1 : 0);
    const dateFmt = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('en-LK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'Recent';
    const summary = item.items?.length > 0
      ? item.items.map((i: any) => `${i.quantity}x ${i.mealName || 'Meal'}`).join(', ')
      : 'Order items';

    return (
      <View className="bg-white rounded-3xl border border-gray-100 p-4 mb-3 shadow-sm">
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-row items-center flex-1 mr-2">
            <Text className="text-textPrimary font-black text-sm mr-2">{item.orderNumber}</Text>
            <Badge label={item.status} variant={getStatusVariant(item.status)} />
          </View>
          <Text className="text-secondary font-black text-base">+LKR {net.toFixed(0)}</Text>
        </View>
        <Text className="text-textSecondary text-xs font-medium mb-1.5" numberOfLines={1}>{summary}</Text>
        <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
          <Text className="text-textMuted text-[10px]">{dateFmt} · {item.customerName || 'Customer'}</Text>
          <View className="flex-row items-center">
            <Text className="text-textMuted text-[10px] mr-2">Gross: LKR {(item.totalAmount ?? 0).toFixed(0)}</Text>
            <Text className="text-red-400 text-[10px]">−LKR {fee.toFixed(0)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const PERIOD_LABELS: Record<Period, string> = { WEEK: 'This Week', MONTH: 'This Month', ALL: 'All Time' };
  const FILTER_LABELS: Record<OrderFilter, string> = { ALL: 'All Orders', DELIVERED: 'Completed', ACTIVE: 'Active', TODAY: 'Today' };

  return (
    <View className="flex-1 bg-surface-elevated">
      {/* ─── Top Bar ─── */}
      <View className={`bg-white px-6 ${Platform.OS === 'ios' ? 'pt-14' : 'pt-12'} pb-4 border-b border-gray-100 shadow-sm z-10 flex-row justify-between items-center`}>
        <View className="flex-row items-center flex-1 mr-2">
          <TouchableOpacity
            testID="earning-back-button"
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3 border border-gray-200"
          >
            <Feather name="chevron-left" size={20} color="#1A1A2E" />
          </TouchableOpacity>
          <View>
            <Text className="font-black text-xl text-textPrimary">Earning Dashboard</Text>
            <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider">Chef Revenue & Payouts</Text>
          </View>
        </View>
        <View className="bg-secondary/10 border border-secondary/20 rounded-full px-3 py-1">
          <Text className="text-secondary font-black text-[10px] uppercase tracking-wider">90% NET</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2D6A4F" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id || String(Math.random())}
          renderItem={renderOrderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D6A4F" colors={['#2D6A4F']} />}
          ListHeaderComponent={
            <View className="mb-2">

              {/* ═══ 1. HERO CARD ══════════════════════════════════ */}
              <View
                className="bg-secondary rounded-3xl p-6 mb-5"
                style={{ shadowColor: '#2D6A4F', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 }}
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View>
                    <Text className="text-white/80 text-[11px] font-extrabold uppercase tracking-widest">LIFETIME NET EARNINGS</Text>
                    <Text className="text-white font-black text-3xl mt-1">LKR {Number(lifetimeTotalEarnings).toLocaleString()}</Text>
                  </View>
                  <View className="w-12 h-12 rounded-2xl bg-white/20 items-center justify-center">
                    <Text className="text-2xl">💰</Text>
                  </View>
                </View>
                <View className="flex-row justify-between items-center pt-4 mt-2 border-t border-white/20">
                  <View className="flex-1 mr-2">
                    <Text className="text-white/70 text-[10px] font-bold">TODAY'S NET</Text>
                    <Text className="text-white font-extrabold text-sm mt-0.5">LKR {todayEarnings.toLocaleString()}</Text>
                  </View>
                  <View className="flex-1 mr-2">
                    <Text className="text-white/70 text-[10px] font-bold">PENDING / IN QUEUE</Text>
                    <Text className="text-white font-extrabold text-sm mt-0.5">LKR {pendingEarnings.toLocaleString()}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white/70 text-[10px] font-bold">ORDERS DELIVERED</Text>
                    <Text className="text-white font-extrabold text-sm mt-0.5">
                      {orders.filter((o) => o.status === 'DELIVERED').length}
                    </Text>
                  </View>
                </View>
              </View>

              {/* ═══ 2. PERIOD SELECTOR ════════════════════════════ */}
              <View className="flex-row bg-gray-100 rounded-2xl p-1 mb-5">
                {(['WEEK', 'MONTH', 'ALL'] as Period[]).map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setSelectedPeriod(p)}
                    activeOpacity={0.8}
                    className={`flex-1 py-2 rounded-xl items-center ${selectedPeriod === p ? 'bg-white' : ''}`}
                    style={selectedPeriod === p ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 } : {}}
                  >
                    <Text className={`text-xs font-bold ${selectedPeriod === p ? 'text-secondary' : 'text-textMuted'}`}>
                      {PERIOD_LABELS[p]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ═══ 3. PERIOD METRIC CARDS ════════════════════════ */}
              <View className="flex-row mb-5">
                <View className="flex-1 bg-white rounded-2xl p-4 mr-2 border border-gray-100 shadow-sm">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-sm mr-1.5">📈</Text>
                    <Text className="text-textMuted text-[10px] font-black uppercase">NET EARNED</Text>
                  </View>
                  <Text className="text-textPrimary font-black text-base">LKR {periodNetEarnings.toLocaleString()}</Text>
                  <Text className="text-textMuted text-[10px] mt-0.5">{deliveredOrders.length} orders</Text>
                </View>
                <View className="flex-1 bg-white rounded-2xl p-4 mr-2 border border-gray-100 shadow-sm">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-sm mr-1.5">🧾</Text>
                    <Text className="text-textMuted text-[10px] font-black uppercase">GROSS SALES</Text>
                  </View>
                  <Text className="text-textPrimary font-black text-base">LKR {periodGross.toLocaleString()}</Text>
                  <Text className="text-textMuted text-[10px] mt-0.5">before platform fee</Text>
                </View>
                <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-sm mr-1.5">⚡</Text>
                    <Text className="text-textMuted text-[10px] font-black uppercase">AVG / ORDER</Text>
                  </View>
                  <Text className="text-textPrimary font-black text-base">LKR {avgPerOrder.toFixed(0)}</Text>
                  <Text className="text-textMuted text-[10px] mt-0.5">net per delivery</Text>
                </View>
              </View>

              {/* ═══ 4. WEEKLY EARNINGS CHART ══════════════════════ */}
              <View className="bg-white rounded-3xl border border-gray-100 p-5 mb-5 shadow-sm">
                <View className="flex-row justify-between items-center mb-4">
                  <View>
                    <Text className="text-textPrimary font-black text-sm">Weekly Earnings</Text>
                    <Text className="text-textMuted text-[10px] font-bold mt-0.5">Net payouts per day (LKR)</Text>
                  </View>
                  <View className="bg-secondary/10 px-2.5 py-1 rounded-full">
                    <Text className="text-secondary text-[10px] font-black uppercase">Current Week</Text>
                  </View>
                </View>
                <WeeklyEarningsChart orders={orders} />
                <View className="flex-row items-center mt-3">
                  <View className="w-3 h-3 rounded-sm bg-secondary mr-1.5" />
                  <Text className="text-textMuted text-[10px] mr-4">Today</Text>
                  <View className="w-3 h-3 rounded-sm bg-[#A7C4B5] mr-1.5" />
                  <Text className="text-textMuted text-[10px]">Other days</Text>
                </View>
              </View>

              {/* ═══ 5. TOP MEALS LEADERBOARD ══════════════════════ */}
              {topMeals.length > 0 && (
                <View className="bg-white rounded-3xl border border-gray-100 p-5 mb-5 shadow-sm">
                  <View className="flex-row justify-between items-center mb-4">
                    <View>
                      <Text className="text-textPrimary font-black text-sm">Top Meals by Revenue</Text>
                      <Text className="text-textMuted text-[10px] font-bold mt-0.5">All-time gross revenue per meal</Text>
                    </View>
                    <Text className="text-2xl">🏆</Text>
                  </View>
                  {topMeals.map((meal, idx) => {
                    const maxRev = topMeals[0].revenue;
                    const pct = maxRev > 0 ? meal.revenue / maxRev : 0;
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <View key={meal.name + idx} className="mb-3">
                        <View className="flex-row justify-between items-center mb-1">
                          <View className="flex-row items-center flex-1 mr-2">
                            <Text className="text-sm mr-2">{medals[idx] ?? '🍽️'}</Text>
                            <Text className="text-textPrimary font-bold text-xs flex-1" numberOfLines={1}>{meal.name}</Text>
                          </View>
                          <View className="items-end">
                            <Text className="text-secondary font-black text-xs">LKR {meal.revenue.toLocaleString()}</Text>
                            <Text className="text-textMuted text-[10px]">{meal.orders} sold</Text>
                          </View>
                        </View>
                        <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <View className="h-full bg-secondary rounded-full" style={{ width: `${pct * 100}%` }} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* ═══ 6. REVENUE BREAKDOWN ══════════════════════════ */}
              <View className="bg-white rounded-3xl border border-gray-100 p-5 mb-5 shadow-sm">
                <Text className="text-textPrimary font-black text-sm mb-4">Revenue Breakdown</Text>
                <View className="mb-3">
                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-textSecondary text-xs font-bold">Gross Sales</Text>
                    <Text className="text-textPrimary text-xs font-black">LKR {periodGross.toLocaleString()}</Text>
                  </View>
                  <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <View className="h-full bg-gray-300 rounded-full w-full" />
                  </View>
                </View>
                <View className="mb-3">
                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-red-400 text-xs font-bold">Platform Fee (10%)</Text>
                    <Text className="text-red-400 text-xs font-black">−LKR {periodFees.toLocaleString()}</Text>
                  </View>
                  <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <View
                      className="h-full bg-red-200 rounded-full"
                      style={{ width: periodGross > 0 ? `${(periodFees / periodGross) * 100}%` : '10%' }}
                    />
                  </View>
                </View>
                <View className="pt-3 border-t border-gray-100">
                  <View className="flex-row justify-between">
                    <Text className="text-secondary font-black text-sm">Your Net Earnings (90%)</Text>
                    <Text className="text-secondary font-black text-sm">LKR {periodNetEarnings.toLocaleString()}</Text>
                  </View>
                </View>
              </View>

              {/* ═══ 7. PAYOUT HISTORY ═════════════════════════════ */}
              <View className="bg-white rounded-3xl border border-gray-100 p-5 mb-5 shadow-sm">
                <View className="flex-row justify-between items-center mb-4">
                  <View>
                    <Text className="text-textPrimary font-black text-sm">Payout History</Text>
                    <Text className="text-textMuted text-[10px] font-bold mt-0.5">Weekly bank transfers</Text>
                  </View>
                  <Feather name="credit-card" size={18} color="#2D6A4F" />
                </View>
                {payoutHistory.length === 0 ? (
                  <View className="items-center py-6">
                    <Text className="text-3xl mb-2">🏦</Text>
                    <Text className="text-textMuted text-xs text-center font-medium">
                      Complete your first delivery to see payout history
                    </Text>
                  </View>
                ) : (
                  payoutHistory.map((p, idx) => {
                    const dateFmt = p.payoutDate.toLocaleDateString('en-LK', {
                      weekday: 'short', month: 'short', day: 'numeric',
                    });
                    return (
                      <View
                        key={p.weekStart}
                        className={`flex-row justify-between items-center py-3 ${idx < payoutHistory.length - 1 ? 'border-b border-gray-100' : ''}`}
                      >
                        <View className="flex-row items-center flex-1 mr-3">
                          <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${p.settled ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                            <Feather name={p.settled ? 'check' : 'clock'} size={14} color={p.settled ? '#2D6A4F' : '#D97706'} />
                          </View>
                          <View>
                            <Text className="text-textPrimary font-bold text-xs">{dateFmt}</Text>
                            <Text className="text-textMuted text-[10px] mt-0.5">{p.orderCount} order{p.orderCount !== 1 ? 's' : ''}</Text>
                          </View>
                        </View>
                        <View className="items-end">
                          <Text className={`font-black text-sm ${p.settled ? 'text-secondary' : 'text-amber-600'}`}>
                            LKR {p.amount.toLocaleString()}
                          </Text>
                          <Text className={`text-[10px] font-bold ${p.settled ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {p.settled ? '✓ Settled' : '⏳ Pending'}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>

              {/* ═══ 8. PAYOUT POLICY BANNER ═══════════════════════ */}
              <View className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-5 flex-row items-start">
                <Text className="text-xl mr-3">ℹ️</Text>
                <View className="flex-1">
                  <Text className="text-secondary font-black text-xs uppercase tracking-wide">Weekly Automatic Payouts</Text>
                  <Text className="text-emerald-900 text-xs mt-1 leading-relaxed font-medium">
                    Your net earnings are deposited directly to your registered bank account every Monday.
                    You keep 90% of all meal sales with zero hidden charges.
                  </Text>
                </View>
              </View>

              {/* ═══ 9. ORDER HISTORY HEADER + FILTERS ════════════ */}
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-textPrimary font-black text-base">Earning History</Text>
                <Text className="text-textMuted text-xs font-bold">
                  {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                {(['ALL', 'DELIVERED', 'ACTIVE', 'TODAY'] as OrderFilter[]).map((filter) => {
                  const active = selectedFilter === filter;
                  return (
                    <TouchableOpacity
                      key={filter}
                      onPress={() => setSelectedFilter(filter)}
                      activeOpacity={0.7}
                      className={`px-4 py-1.5 rounded-full mr-2 border ${active ? 'bg-secondary border-secondary' : 'bg-white border-gray-200'}`}
                    >
                      <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-textSecondary'}`}>
                        {FILTER_LABELS[filter]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            <View className="bg-white rounded-3xl p-8 items-center border border-gray-100 mt-2">
              <Text className="text-4xl mb-3">💸</Text>
              <Text className="text-textPrimary font-bold text-base text-center mb-1">No orders in this view</Text>
              <Text className="text-textMuted text-xs text-center px-4">
                Orders matching the selected filter and period will appear here with full revenue breakdowns.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};
