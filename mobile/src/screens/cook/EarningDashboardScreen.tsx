import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ScrollView,
  Dimensions,
  StyleSheet,
  StatusBar,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import Svg, { Rect, Text as SvgText, Line, G, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const { width: SW } = Dimensions.get('window');

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  dark:       '#0A1628',
  darkMid:    '#0D1F35',
  darkCard:   '#111D2E',
  border:     '#1A2D42',
  green:      '#2D6A4F',
  greenLight: '#52B788',
  greenGlow:  '#40916C',
  orange:     '#FF6B35',
  amber:      '#F59E0B',
  blue:       '#3B82F6',
  blueLight:  '#60A5FA',
  red:        '#EF4444',
  redLight:   '#F87171',
  white:      '#FFFFFF',
  text1:      '#F0F6FF',
  text2:      '#7B9BC0',
  text3:      '#3D5A7A',
  surface:    '#F0F4F8',
};

// ─── Animated Counter ─────────────────────────────────────────────────────────
const AnimatedNumber: React.FC<{ value: number; prefix?: string }> = ({ value, prefix = '' }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState('0');
  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 1100, useNativeDriver: false }).start();
    const id = anim.addListener(({ value: v }) => setDisplay(Math.floor(v).toString()));
    return () => anim.removeListener(id);
  }, [value]);
  return (
    <Text style={{ color: C.white, fontSize: 30, fontWeight: '800', letterSpacing: -1 }}>
      {prefix}{Number(display).toLocaleString()}
    </Text>
  );
};

// ─── Bar Chart ────────────────────────────────────────────────────────────────
const BarChart: React.FC<{ orders: any[] }> = ({ orders }) => {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const cW = SW - 80;
  const cH = 110;
  const barW = Math.floor((cW - 40) / 7) - 8;

  const now = new Date();
  const dow = now.getDay();
  const mondayOff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOff);
  monday.setHours(0, 0, 0, 0);

  const earnings: number[] = [0, 0, 0, 0, 0, 0, 0];
  orders.forEach(o => {
    if (o.status !== 'DELIVERED' || !o.createdAt) return;
    const d = new Date(o.createdAt);
    const idx = Math.floor((d.getTime() - monday.getTime()) / 86400000);
    if (idx >= 0 && idx < 7) earnings[idx] += o.cookEarnings ?? 0;
  });

  const maxV = Math.max(...earnings, 1);
  const todayIdx = dow === 0 ? 6 : dow - 1;
  const tickV = Math.ceil(maxV / 4);
  const ticks = [0, tickV, tickV * 2, tickV * 3, tickV * 4];

  return (
    <View>
      <Svg width={cW} height={cH + 32} style={{ overflow: 'visible' }}>
        <Defs>
          <SvgGradient id="bg1" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.greenLight} stopOpacity="1" />
            <Stop offset="1" stopColor={C.green} stopOpacity="0.8" />
          </SvgGradient>
          <SvgGradient id="bg2" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2D6A4F" stopOpacity="0.45" />
            <Stop offset="1" stopColor="#1B4332" stopOpacity="0.25" />
          </SvgGradient>
        </Defs>
        {ticks.map((tick, i) => {
          const y = cH - (tick / (tickV * 4)) * cH;
          return (
            <G key={i}>
              <Line x1={38} y1={y} x2={cW} y2={y} stroke={C.border}
                strokeWidth={1} strokeDasharray={tick === 0 ? undefined : '3,4'} />
              <SvgText x={34} y={y + 4} fontSize={8} fill={C.text2} textAnchor="end" fontWeight="600">
                {tick > 0 ? (tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick) : '0'}
              </SvgText>
            </G>
          );
        })}
        {earnings.map((val, i) => {
          const barH = Math.max((val / maxV) * cH, val > 0 ? 6 : 0);
          const x = 40 + i * ((cW - 40) / 7) + ((cW - 40) / 7 - barW) / 2;
          const y = cH - barH;
          const isToday = i === todayIdx;
          return (
            <G key={i}>
              <Rect x={x} y={0} width={barW} height={cH} rx={6} ry={6} fill={C.border} opacity={0.3} />
              {val > 0 && (
                <Rect x={x} y={y} width={barW} height={barH} rx={6} ry={6}
                  fill={isToday ? 'url(#bg1)' : 'url(#bg2)'} />
              )}
              <SvgText x={x + barW / 2} y={cH + 18} fontSize={9}
                fill={isToday ? C.greenLight : C.text2}
                textAnchor="middle" fontWeight={isToday ? 'bold' : 'normal'}>
                {DAYS[i]}
              </SvgText>
              {val > 0 && barH > 18 && (
                <SvgText x={x + barW / 2} y={y - 5} fontSize={8}
                  fill={isToday ? C.greenLight : C.text2} textAnchor="middle" fontWeight="bold">
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

// ─── Status Pill ─────────────────────────────────────────────────────────────
const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    DELIVERED:        { bg: '#06564020', text: '#34D399', dot: '#34D399' },
    PLACED:           { bg: '#78350F20', text: '#F59E0B', dot: '#F59E0B' },
    ACCEPTED:         { bg: '#1D4ED820', text: '#60A5FA', dot: '#60A5FA' },
    PREPARING:        { bg: '#7C3AED20', text: '#A78BFA', dot: '#A78BFA' },
    READY_FOR_PICKUP: { bg: '#0F766E20', text: '#2DD4BF', dot: '#2DD4BF' },
    DELIVERING:       { bg: '#0369A120', text: '#38BDF8', dot: '#38BDF8' },
    CANCELLED:        { bg: '#7F1D1D20', text: '#F87171', dot: '#F87171' },
  };
  const s = map[status] ?? { bg: C.border, text: C.text2, dot: C.text3 };
  return (
    <View style={[S.pill, { backgroundColor: s.bg }]}>
      <View style={[S.pillDot, { backgroundColor: s.dot }]} />
      <Text style={[S.pillText, { color: s.text }]}>{status.replace('_', ' ')}</Text>
    </View>
  );
};

// ─── Metric Card ─────────────────────────────────────────────────────────────
const MetricCard: React.FC<{
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  sub?: string;
  color: string;
  delay?: number;
}> = ({ icon, label, value, sub, color, delay = 0 }) => {
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, delay, useNativeDriver: true, tension: 65, friction: 9 }),
      Animated.timing(opacity, { toValue: 1, delay, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[S.metricCard, { transform: [{ scale }], opacity }]}>
      <View style={[S.metricIconWrap, { backgroundColor: color + '20', borderColor: color + '35' }]}>
        <Feather name={icon} size={15} color={color} />
      </View>
      <Text style={S.metricLabel}>{label}</Text>
      <Text style={[S.metricValue, { color }]}>{value}</Text>
      {sub ? <Text style={S.metricSub}>{sub}</Text> : null}
      <View style={[S.metricGlow, { backgroundColor: color + '25' }]} />
    </Animated.View>
  );
};

// ─── Section Card ────────────────────────────────────────────────────────────
const SCard: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => (
  <View style={[S.sCard, style]}>{children}</View>
);

// ─── Payout Row ──────────────────────────────────────────────────────────────
const PayoutRow: React.FC<{ payout: any; isLast: boolean }> = ({ payout, isLast }) => {
  const dateFmt = payout.payoutDate.toLocaleDateString('en-LK', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  return (
    <View style={[S.payoutRow, !isLast && S.payoutRowBorder]}>
      <View style={[S.payoutIconBox, { backgroundColor: payout.settled ? C.greenLight + '20' : C.amber + '20' }]}>
        <Feather name={payout.settled ? 'check' : 'clock'} size={14}
          color={payout.settled ? C.greenLight : C.amber} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={S.payoutDate}>{dateFmt}</Text>
        <Text style={S.payoutCount}>{payout.orderCount} order{payout.orderCount !== 1 ? 's' : ''}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[S.payoutAmt, { color: payout.settled ? C.greenLight : C.amber }]}>
          LKR {payout.amount.toLocaleString()}
        </Text>
        <Text style={[S.payoutStatus, { color: payout.settled ? C.greenLight : C.amber }]}>
          {payout.settled ? '✓ Settled' : 'Pending'}
        </Text>
      </View>
    </View>
  );
};

// ─── Top Meal Row ────────────────────────────────────────────────────────────
const TopMealRow: React.FC<{ meal: any; maxRev: number; idx: number }> = ({ meal, maxRev, idx }) => {
  const pct = maxRev > 0 ? meal.revenue / maxRev : 0;
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  const colors = [C.greenLight, C.blueLight, C.amber, '#C084FC', '#F97316'];
  const barAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barAnim, { toValue: pct, duration: 900, delay: idx * 120, useNativeDriver: false }).start();
  }, [pct]);
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>{medals[idx] ?? '🍽️'}</Text>
          <Text style={S.mealName} numberOfLines={1}>{meal.name}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[S.mealRev, { color: colors[idx] ?? C.greenLight }]}>LKR {meal.revenue.toLocaleString()}</Text>
          <Text style={S.mealSold}>{meal.orders} sold</Text>
        </View>
      </View>
      <View style={S.mealBarBg}>
        <Animated.View style={[S.mealBarFill, {
          backgroundColor: colors[idx] ?? C.greenLight,
          width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) as any,
        }]} />
      </View>
    </View>
  );
};

// ─── Order Row ───────────────────────────────────────────────────────────────
const OrderRow: React.FC<{ item: any; index: number }> = ({ item, index }) => {
  const translateY = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, delay: Math.min(index * 50, 400), useNativeDriver: true, tension: 65, friction: 9 }),
      Animated.timing(opacity, { toValue: 1, delay: Math.min(index * 50, 400), duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);
  const net = item.cookEarnings ?? (item.totalAmount ? item.totalAmount * 0.9 : 0);
  const fee = item.platformFee ?? (item.totalAmount ? item.totalAmount * 0.1 : 0);
  const dateFmt = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString('en-LK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Recent';
  const summary = item.items?.length > 0
    ? item.items.map((i: any) => `${i.quantity}x ${i.mealName || 'Meal'}`).join(', ')
    : 'Order items';
  const netColor = item.status === 'DELIVERED' ? C.greenLight : item.status === 'CANCELLED' ? C.redLight : C.amber;
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <View style={S.orderCard}>
        <View style={S.orderHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
            <Text style={S.orderNum}>{item.orderNumber}</Text>
            <StatusPill status={item.status} />
          </View>
          <Text style={[S.orderNet, { color: netColor }]}>
            {item.status === 'CANCELLED' ? '×' : '+'} LKR {net.toFixed(0)}
          </Text>
        </View>
        <Text style={S.orderSummary} numberOfLines={1}>{summary}</Text>
        <View style={S.orderFooter}>
          <Text style={S.orderMeta}>{dateFmt} · {item.customerName || 'Customer'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={S.orderGross}>Gross: LKR {(item.totalAmount ?? 0).toFixed(0)}</Text>
            {fee > 0 && <Text style={S.orderFee}>−{fee.toFixed(0)}</Text>}
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

// ─── Helper Functions ─────────────────────────────────────────────────────────
const buildPayoutHistory = (orders: any[]) => {
  const delivered = orders.filter(o => o.status === 'DELIVERED' && o.createdAt);
  const weekMap: Record<string, { date: Date; total: number; count: number }> = {};
  delivered.forEach(order => {
    const d = new Date(order.createdAt);
    const day = d.getDay();
    const off = day === 0 ? -6 : 1 - day;
    const mon = new Date(d); mon.setDate(d.getDate() + off); mon.setHours(0, 0, 0, 0);
    const key = mon.toISOString().slice(0, 10);
    if (!weekMap[key]) weekMap[key] = { date: new Date(mon.getTime() + 6 * 86400000), total: 0, count: 0 };
    weekMap[key].total += order.cookEarnings ?? 0;
    weekMap[key].count++;
  });
  return Object.entries(weekMap)
    .sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6)
    .map(([weekStart, data]) => ({
      weekStart, payoutDate: data.date, amount: data.total,
      orderCount: data.count, settled: data.date < new Date(),
    }));
};

const buildTopMeals = (orders: any[]) => {
  const mm: Record<string, { name: string; revenue: number; orders: number }> = {};
  orders.filter(o => o.status === 'DELIVERED' && o.items).forEach(order => {
    order.items.forEach((item: any) => {
      const key = item.mealId || item.mealName || 'Unknown';
      const name = item.mealName || 'Meal';
      const rev = (item.price ?? 0) * (item.quantity ?? 1);
      if (!mm[key]) mm[key] = { name, revenue: 0, orders: 0 };
      mm[key].revenue += rev; mm[key].orders += item.quantity ?? 1;
    });
  });
  return Object.values(mm).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
};

type Period = 'WEEK' | 'MONTH' | 'ALL';
type OFilter = 'ALL' | 'DELIVERED' | 'ACTIVE' | 'TODAY';

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export const EarningDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('WEEK');
  const [filter, setFilter] = useState<OFilter>('ALL');

  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(-20)).current;

  const fetchData = async () => {
    try {
      const [profRes, ordRes] = await Promise.all([
        api.get('/api/users/profile'),
        api.get('/api/orders/my'),
      ]);
      setProfile(profRes.data);
      setOrders(ordRes.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => {
    fetchData();
    const unsub = navigation.addListener('focus', fetchData);
    return unsub;
  }, [navigation]);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(heroSlide, { toValue: 0, tension: 55, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  const isToday = (ds?: string) => {
    if (!ds) return false;
    const d = new Date(ds), n = new Date();
    return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  };
  const isThisWeek = (ds?: string) => {
    if (!ds) return false;
    const d = new Date(ds), now = new Date();
    const off = now.getDay() === 0 ? -6 : 1 - now.getDay();
    const mon = new Date(now); mon.setDate(now.getDate() + off); mon.setHours(0, 0, 0, 0);
    return d >= mon;
  };
  const isThisMonth = (ds?: string) => {
    if (!ds) return false;
    const d = new Date(ds), n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  };

  const periodOrders = orders.filter(o => {
    if (period === 'WEEK') return isThisWeek(o.createdAt);
    if (period === 'MONTH') return isThisMonth(o.createdAt);
    return true;
  });

  const deliveredOrders = periodOrders.filter(o => o.status === 'DELIVERED');
  const activeOrdersList = orders.filter(o =>
    ['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'DELIVERING'].includes(o.status)
  );
  const todayOrders = orders.filter(o => isToday(o.createdAt));

  const lifetimeEarnings =
    profile?.stats?.totalEarnings ??
    orders.filter(o => o.status === 'DELIVERED').reduce((s, o) => s + (o.cookEarnings ?? 0), 0);

  const periodNet = deliveredOrders.reduce((s, o) => s + (o.cookEarnings ?? 0), 0);
  const todayNet = todayOrders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + (o.cookEarnings ?? 0), 0);
  const pendingEarnings = activeOrdersList.reduce((s, o) => s + (o.cookEarnings ?? 0), 0);
  const periodGross = periodOrders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + (o.totalAmount ?? 0), 0);
  const periodFees = periodOrders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + (o.platformFee ?? 0), 0);
  const avgPerOrder = deliveredOrders.length > 0 ? periodNet / deliveredOrders.length : 0;
  const netPct = periodGross > 0 ? (periodNet / periodGross) * 100 : 90;

  const topMeals = buildTopMeals(orders);
  const payoutHistory = buildPayoutHistory(orders);

  const filteredOrders = periodOrders.filter(o => {
    if (filter === 'DELIVERED') return o.status === 'DELIVERED';
    if (filter === 'ACTIVE') return ['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'DELIVERING'].includes(o.status);
    if (filter === 'TODAY') return isToday(o.createdAt);
    return true;
  });

  const PERIOD_LABELS: Record<Period, string> = { WEEK: 'This Week', MONTH: 'This Month', ALL: 'All Time' };
  const FILTER_LABELS: Record<OFilter, string> = { ALL: 'All', DELIVERED: 'Completed', ACTIVE: 'Active', TODAY: 'Today' };

  const renderOrder = ({ item, index }: { item: any; index: number }) => (
    <OrderRow item={item} index={index} />
  );

  const ListHeader = (
    <View>
      {/* HERO */}
      <LinearGradient colors={['#0A1628', '#0D1F35', '#0A2218']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.heroCard}>
        <View style={S.blob1} />
        <View style={S.blob2} />
        <Animated.View style={{ opacity: heroOpacity, transform: [{ translateY: heroSlide }] }}>
          <View style={S.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={S.heroLabel}>LIFETIME NET EARNINGS</Text>
              <AnimatedNumber value={lifetimeEarnings} prefix="LKR " />
              <Text style={S.heroSub}>
                {orders.filter(o => o.status === 'DELIVERED').length} deliveries completed
              </Text>
            </View>
            <View style={S.heroIconWrap}>
              <Feather name="trending-up" size={24} color={C.greenLight} />
            </View>
          </View>
          <View style={S.heroMiniRow}>
            <View style={S.heroMiniItem}>
              <Text style={S.heroMiniLabel}>TODAY'S NET</Text>
              <Text style={S.heroMiniVal}>LKR {todayNet.toLocaleString()}</Text>
            </View>
            <View style={S.heroMiniDivider} />
            <View style={S.heroMiniItem}>
              <Text style={S.heroMiniLabel}>IN QUEUE</Text>
              <Text style={[S.heroMiniVal, { color: C.amber }]}>LKR {pendingEarnings.toLocaleString()}</Text>
            </View>
            <View style={S.heroMiniDivider} />
            <View style={S.heroMiniItem}>
              <Text style={S.heroMiniLabel}>NET RATE</Text>
              <Text style={[S.heroMiniVal, { color: C.blueLight }]}>{netPct.toFixed(0)}%</Text>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* PERIOD SELECTOR */}
      <View style={S.periodWrap}>
        {(['WEEK', 'MONTH', 'ALL'] as Period[]).map(p => (
          <TouchableOpacity key={p} onPress={() => setPeriod(p)} activeOpacity={0.8}
            style={[S.periodBtn, period === p && S.periodBtnActive]}>
            {period === p && (
              <LinearGradient colors={[C.greenLight, C.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill} />
            )}
            <Text style={[S.periodBtnText, period === p && S.periodBtnTextActive]}>
              {PERIOD_LABELS[p]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* METRIC CARDS */}
      <View style={S.metricRow}>
        <MetricCard icon="dollar-sign" label="NET EARNED"
          value={`LKR ${periodNet.toLocaleString()}`} sub={`${deliveredOrders.length} orders`}
          color={C.greenLight} delay={0} />
        <MetricCard icon="shopping-cart" label="GROSS SALES"
          value={`LKR ${periodGross.toLocaleString()}`} sub="before fees"
          color={C.blueLight} delay={80} />
        <MetricCard icon="zap" label="AVG / ORDER"
          value={`LKR ${avgPerOrder.toFixed(0)}`} sub="net per delivery"
          color={C.amber} delay={160} />
      </View>

      {/* WEEKLY CHART */}
      <SCard style={{ marginHorizontal: 16, marginBottom: 16 }}>
        <View style={S.cardHeader}>
          <View>
            <Text style={S.cardTitle}>Weekly Earnings</Text>
            <Text style={S.cardSub}>Net payouts per day · LKR</Text>
          </View>
          <View style={S.chipGreen}><Text style={S.chipGreenText}>Current Week</Text></View>
        </View>
        <BarChart orders={orders} />
        <View style={S.chartLegend}>
          <View style={[S.legendDot, { backgroundColor: C.greenLight }]} />
          <Text style={S.legendText}>Today</Text>
          <View style={[S.legendDot, { backgroundColor: C.border, marginLeft: 16 }]} />
          <Text style={S.legendText}>Other days</Text>
        </View>
      </SCard>

      {/* REVENUE BREAKDOWN */}
      <SCard style={{ marginHorizontal: 16, marginBottom: 16 }}>
        <View style={S.cardHeader}>
          <View>
            <Text style={S.cardTitle}>Revenue Breakdown</Text>
            <Text style={S.cardSub}>{PERIOD_LABELS[period]}</Text>
          </View>
          <View style={S.chipBlue}><Text style={S.chipBlueText}>90% NET</Text></View>
        </View>
        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={S.breakLabel}>Gross Sales</Text>
            <Text style={[S.breakValue, { color: C.blueLight }]}>LKR {periodGross.toLocaleString()}</Text>
          </View>
          <View style={S.breakBarBg}>
            <LinearGradient colors={[C.blueLight, C.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[S.breakBarFill, { width: '100%' }]} />
          </View>
        </View>
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={[S.breakLabel, { color: C.redLight }]}>Platform Fee (10%)</Text>
            <Text style={[S.breakValue, { color: C.redLight }]}>- LKR {periodFees.toLocaleString()}</Text>
          </View>
          <View style={S.breakBarBg}>
            <LinearGradient colors={[C.redLight, C.red]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[S.breakBarFill, {
                width: periodGross > 0 ? `${(periodFees / periodGross) * 100}%` as any : '10%',
              }]} />
          </View>
        </View>
        <LinearGradient colors={[C.greenGlow + '30', C.green + '15']} style={S.breakNetRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={S.breakNetIcon}>
              <Feather name="check-circle" size={14} color={C.greenLight} />
            </View>
            <Text style={S.breakNetLabel}>Your Net Earnings (90%)</Text>
          </View>
          <Text style={S.breakNetValue}>LKR {periodNet.toLocaleString()}</Text>
        </LinearGradient>
      </SCard>

      {/* TOP MEALS */}
      {topMeals.length > 0 && (
        <SCard style={{ marginHorizontal: 16, marginBottom: 16 }}>
          <View style={S.cardHeader}>
            <View>
              <Text style={S.cardTitle}>Top Meals by Revenue</Text>
              <Text style={S.cardSub}>All-time gross per meal</Text>
            </View>
            <Text style={{ fontSize: 22 }}>🏆</Text>
          </View>
          {topMeals.map((meal, idx) => (
            <TopMealRow key={meal.name + idx} meal={meal} maxRev={topMeals[0].revenue} idx={idx} />
          ))}
        </SCard>
      )}

      {/* PAYOUT HISTORY */}
      <SCard style={{ marginHorizontal: 16, marginBottom: 16 }}>
        <View style={S.cardHeader}>
          <View>
            <Text style={S.cardTitle}>Payout History</Text>
            <Text style={S.cardSub}>Weekly bank transfers</Text>
          </View>
          <View style={S.payoutIconWrap}>
            <Feather name="credit-card" size={16} color={C.greenLight} />
          </View>
        </View>
        {payoutHistory.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 28 }}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>🏦</Text>
            <Text style={S.emptyText}>Complete your first delivery to see payout history</Text>
          </View>
        ) : (
          payoutHistory.map((p, idx) => (
            <PayoutRow key={p.weekStart} payout={p} isLast={idx === payoutHistory.length - 1} />
          ))
        )}
      </SCard>

      {/* PAYOUT POLICY */}
      <LinearGradient colors={[C.green + '25', C.greenGlow + '15']} style={S.policyBanner}>
        <View style={S.policyIcon}>
          <Feather name="info" size={16} color={C.greenLight} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={S.policyTitle}>Weekly Automatic Payouts</Text>
          <Text style={S.policySub}>
            Your net earnings are deposited to your bank account every Monday. You keep 90% of all meal sales with zero hidden charges.
          </Text>
        </View>
      </LinearGradient>

      {/* ORDER HISTORY HEADER + FILTERS */}
      <View style={S.histHeader}>
        <Text style={S.histTitle}>Earning History</Text>
        <Text style={S.histCount}>{filteredOrders.length} orders</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, paddingLeft: 16 }}>
        {(['ALL', 'DELIVERED', 'ACTIVE', 'TODAY'] as OFilter[]).map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)} activeOpacity={0.75}
            style={[S.filterChip, filter === f && S.filterChipActive]}>
            {filter === f && (
              <LinearGradient colors={[C.greenLight, C.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill} />
            )}
            <Text style={[S.filterChipText, filter === f && S.filterChipTextActive]}>
              {FILTER_LABELS[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const ListEmpty = (
    <View style={S.emptyCard}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>💸</Text>
      <Text style={S.emptyCardTitle}>No orders in this view</Text>
      <Text style={S.emptyCardSub}>Orders matching the selected filter and period will appear here with full revenue breakdowns.</Text>
    </View>
  );

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

      {/* TOP BAR */}
      <LinearGradient colors={[C.dark, C.darkMid]}
        style={[S.topBar, { paddingTop: Platform.OS === 'ios' ? 52 : 40 }]}>
        <TouchableOpacity testID="earning-back-button" accessibilityLabel="Go back"
          onPress={() => navigation.goBack()} activeOpacity={0.75} style={S.backBtn}>
          <Feather name="chevron-left" size={22} color={C.text1} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={S.topBarTitle}>Earning Dashboard</Text>
          <Text style={S.topBarSub}>CHEF REVENUE & PAYOUTS</Text>
        </View>
        <View style={S.netBadge}>
          <Text style={S.netBadgeText}>90% NET</Text>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.surface }}>
          <View style={S.loadingBox}>
            <Feather name="trending-up" size={32} color={C.greenLight} />
          </View>
          <Text style={{ color: C.text2, marginTop: 16, fontSize: 13, fontWeight: '600' }}>Loading earnings...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={item => item.id || String(Math.random())}
          renderItem={renderOrder}
          contentContainerStyle={{ paddingBottom: 64, backgroundColor: C.surface }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
              tintColor={C.greenLight} colors={[C.greenLight]} progressBackgroundColor={C.darkCard} />
          }
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          style={{ backgroundColor: C.surface }}
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { color: C.text1, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  topBarSub: { color: C.text2, fontSize: 9, fontWeight: '700', letterSpacing: 1.2, marginTop: 1 },
  netBadge: { backgroundColor: C.greenLight + '25', borderWidth: 1, borderColor: C.greenLight + '50', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  netBadgeText: { color: C.greenLight, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  loadingBox: { width: 72, height: 72, borderRadius: 24, backgroundColor: C.darkCard, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  heroCard: { margin: 16, borderRadius: 24, padding: 20, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  blob1: { position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: C.greenLight + '12' },
  blob2: { position: 'absolute', bottom: -40, left: -30, width: 130, height: 130, borderRadius: 65, backgroundColor: C.blue + '10' },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  heroLabel: { color: C.text2, fontSize: 10, fontWeight: '700', letterSpacing: 1.3, marginBottom: 6 },
  heroSub: { color: C.text2, fontSize: 12, fontWeight: '500', marginTop: 4 },
  heroIconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: C.greenLight + '20', borderWidth: 1, borderColor: C.greenLight + '35', alignItems: 'center', justifyContent: 'center' },
  heroMiniRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 16 },
  heroMiniItem: { flex: 1, alignItems: 'center' },
  heroMiniLabel: { color: C.text2, fontSize: 9, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  heroMiniVal: { color: C.text1, fontSize: 13, fontWeight: '800' },
  heroMiniDivider: { width: 1, backgroundColor: C.border },
  periodWrap: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, backgroundColor: C.darkCard, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: C.border },
  periodBtn: { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center', overflow: 'hidden' },
  periodBtnActive: {},
  periodBtnText: { color: C.text2, fontSize: 12, fontWeight: '700' },
  periodBtnTextActive: { color: C.white, fontWeight: '800' },
  metricRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 16, gap: 8 },
  metricCard: { flex: 1, backgroundColor: C.white, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: '#E8EEF5', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  metricIconWrap: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  metricLabel: { fontSize: 8, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.6, marginBottom: 4 },
  metricValue: { fontSize: 12, fontWeight: '800', letterSpacing: -0.2 },
  metricSub: { fontSize: 9, color: '#9CA3AF', fontWeight: '500', marginTop: 2 },
  metricGlow: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, opacity: 0.5 },
  sCard: { backgroundColor: C.white, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#EBF0F5', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.2 },
  cardSub: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', marginTop: 2 },
  chipGreen: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  chipGreenText: { color: '#065F46', fontSize: 10, fontWeight: '700' },
  chipBlue: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  chipBlueText: { color: '#1E40AF', fontSize: 10, fontWeight: '700' },
  chartLegend: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  legendDot: { width: 10, height: 10, borderRadius: 3, marginRight: 5 },
  legendText: { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
  breakLabel: { fontSize: 12, fontWeight: '700', color: '#374151' },
  breakValue: { fontSize: 12, fontWeight: '800' },
  breakBarBg: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  breakBarFill: { height: 6, borderRadius: 3 },
  breakNetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12 },
  breakNetIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.greenLight + '25', alignItems: 'center', justifyContent: 'center' },
  breakNetLabel: { fontSize: 13, fontWeight: '700', color: C.green },
  breakNetValue: { fontSize: 15, fontWeight: '900', color: C.green },
  mealName: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', flex: 1 },
  mealRev: { fontSize: 12, fontWeight: '800' },
  mealSold: { fontSize: 10, color: '#9CA3AF', fontWeight: '500', marginTop: 1 },
  mealBarBg: { height: 5, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  mealBarFill: { height: 5, borderRadius: 3 },
  payoutIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.greenLight + '20', borderWidth: 1, borderColor: C.greenLight + '35', alignItems: 'center', justifyContent: 'center' },
  payoutRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  payoutRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  payoutIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  payoutDate: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  payoutCount: { fontSize: 10, color: '#9CA3AF', fontWeight: '500', marginTop: 2 },
  payoutAmt: { fontSize: 14, fontWeight: '800' },
  payoutStatus: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  policyBanner: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 20, borderRadius: 16, padding: 14, gap: 12, borderWidth: 1, borderColor: C.green + '30' },
  policyIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.greenLight + '20', alignItems: 'center', justifyContent: 'center' },
  policyTitle: { color: C.green, fontSize: 11, fontWeight: '800', letterSpacing: 0.3, marginBottom: 4 },
  policySub: { color: '#374151', fontSize: 11, lineHeight: 18, fontWeight: '500' },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, gap: 4, marginLeft: 6 },
  pillDot: { width: 5, height: 5, borderRadius: 3 },
  pillText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.2 },
  histHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  histTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.2 },
  histCount: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, marginRight: 8, backgroundColor: C.white, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  filterChipActive: { borderColor: C.green },
  filterChipText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  filterChipTextActive: { color: C.white, fontWeight: '800' },
  orderCard: { backgroundColor: C.white, borderRadius: 16, padding: 14, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: '#EBF0F5', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderNum: { fontSize: 13, fontWeight: '800', color: '#1A1A2E' },
  orderNet: { fontSize: 15, fontWeight: '900', letterSpacing: -0.3 },
  orderSummary: { fontSize: 11, color: '#6B7280', fontWeight: '500', marginBottom: 8 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8 },
  orderMeta: { fontSize: 10, color: '#9CA3AF', flex: 1 },
  orderGross: { fontSize: 10, color: '#9CA3AF' },
  orderFee: { fontSize: 10, color: C.redLight, fontWeight: '700' },
  emptyCard: { backgroundColor: C.white, borderRadius: 20, padding: 32, alignItems: 'center', marginHorizontal: 16, marginTop: 4, borderWidth: 1, borderColor: '#EBF0F5' },
  emptyCardTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A2E', marginBottom: 6 },
  emptyCardSub: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, fontWeight: '500' },
  emptyText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', fontWeight: '500' },
});
