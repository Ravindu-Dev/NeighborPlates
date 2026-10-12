import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
  Animated,
  Dimensions,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Toast } from '../../components/common/Toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const C = {
  dark:       '#0F1923',
  darkCard:   '#161F2C',
  darkBorder: '#1E2D3D',
  green:      '#2D6A4F',
  greenLight: '#52B788',
  orange:     '#FF6B35',
  amber:      '#FBBF24',
  blue:       '#3B82F6',
  white:      '#FFFFFF',
  text1:      '#E8F4F0',
  text2:      '#8FA9A0',
  text3:      '#4A6572',
  surface:    '#F8F9FA',
};

const AnimatedStatCard: React.FC<{
  icon?: string;
  featherIcon?: keyof typeof Feather.glyphMap;
  label: string;
  value: string | number;
  color: string;
  glowColor: string;
  delay: number;
  onPress?: () => void;
}> = ({ icon, featherIcon, label, value, color, glowColor, delay, onPress }) => {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, delay, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.timing(opacity, { toValue: 1, delay, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const inner = (
    <Animated.View style={[styles.statCard, { transform: [{ scale }], opacity }]}>
      <View style={[styles.statIconRing, { borderColor: color + '40', backgroundColor: color + '15' }]}>
        {featherIcon
          ? <Feather name={featherIcon} size={18} color={color} />
          : <Text style={{ fontSize: 18 }}>{icon}</Text>}
      </View>
      <Text style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={[styles.statGlow, { backgroundColor: glowColor }]} />
    </Animated.View>
  );

  return onPress
    ? <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ flex: 1 }}>{inner}</TouchableOpacity>
    : <View style={{ flex: 1 }}>{inner}</View>;
};

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    PLACED:    { bg: '#78350F20', text: '#F59E0B', dot: '#F59E0B' },
    ACCEPTED:  { bg: '#1D4ED820', text: '#60A5FA', dot: '#60A5FA' },
    PREPARING: { bg: '#7C3AED20', text: '#A78BFA', dot: '#A78BFA' },
    READY:     { bg: '#06564020', text: '#34D399', dot: '#34D399' },
    DELIVERING:{ bg: '#0F172A40', text: '#94A3B8', dot: '#94A3B8' },
  };
  const s = map[status] ?? { bg: '#1E2D3D', text: '#8FA9A0', dot: '#4A6572' };
  return (
    <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
      <Text style={[styles.statusText, { color: s.text }]}>{status}</Text>
    </View>
  );
};

const OrderCard: React.FC<{ item: any; onPress: () => void; index: number }> = ({ item, onPress, index }) => {
  const translateY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, delay: index * 80, useNativeDriver: true, tension: 60, friction: 9 }),
      Animated.timing(opacity, { toValue: 1, delay: index * 80, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  const accentMap: Record<string, string> = {
    PLACED: C.amber, ACCEPTED: C.blue, PREPARING: '#A78BFA', READY: C.greenLight, DELIVERING: C.text2,
  };
  const accent = accentMap[item.status] ?? C.text3;

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.82}>
        <View style={[styles.orderCard, { borderLeftColor: accent }]}>
          <View style={styles.orderCardHeader}>
            <View style={styles.orderNumberRow}>
              <View style={[styles.orderAccentDot, { backgroundColor: accent }]} />
              <Text style={styles.orderNumber}>{item.orderNumber}</Text>
            </View>
            <StatusPill status={item.status} />
          </View>
          <Text style={styles.orderCustomer}>{item.customerName}</Text>
          <View style={styles.orderCardFooter}>
            <Text style={styles.orderItems} numberOfLines={1}>
              {item.items?.map((m: any) => `${m.name} x${m.quantity}`).join(' . ')}
            </Text>
            <Text style={[styles.orderAmount, { color: C.green }]}>
              LKR {item.totalAmount?.toLocaleString()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const MealCard: React.FC<{ meal: any; onEdit: () => void; onDelete: () => void }> = ({ meal, onEdit, onDelete }) => {
  const categoryEmoji: Record<string, string> = {
    BREAKFAST: '🥞', LUNCH: '🍛', DINNER: '🍲', SNACK: '🍿',
  };
  return (
    <View style={styles.mealCard}>
      {meal.photos?.length > 0 ? (
        <Image source={{ uri: meal.photos[0] }} style={styles.mealThumb} resizeMode="cover" />
      ) : (
        <View style={styles.mealThumbPlaceholder}>
          <Text style={{ fontSize: 30 }}>{categoryEmoji[meal.category] ?? '🍽️'}</Text>
        </View>
      )}
      <View style={[styles.mealBadgeOverlay, { backgroundColor: meal.active ? C.greenLight + 'E8' : '#EF4444E8' }]}>
        <Text style={styles.mealBadgeText}>{meal.active ? 'LIVE' : 'OFF'}</Text>
      </View>
      <View style={styles.mealInfo}>
        <Text style={styles.mealName} numberOfLines={1}>{meal.name}</Text>
        <View style={styles.mealMetaRow}>
          <Text style={styles.mealPrice}>LKR {meal.price?.toLocaleString()}</Text>
          <View style={styles.mealRatingRow}>
            <Feather name="star" size={10} color={C.amber} />
            <Text style={styles.mealRating}>{meal.avgRating?.toFixed(1) ?? '-'}</Text>
          </View>
        </View>
      </View>
      <View style={styles.mealActions}>
        <TouchableOpacity onPress={onEdit} style={[styles.mealActionBtn, { backgroundColor: '#3B82F618' }]} activeOpacity={0.75}>
          <Feather name="edit-2" size={13} color="#3B82F6" />
          <Text style={[styles.mealActionText, { color: '#3B82F6' }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={[styles.mealActionBtn, { backgroundColor: '#EF444418' }]} activeOpacity={0.75}>
          <Feather name="trash-2" size={13} color="#EF4444" />
          <Text style={[styles.mealActionText, { color: '#EF4444' }]}>Del</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const QuickAction: React.FC<{
  icon: keyof typeof Feather.glyphMap;
  label: string;
  sublabel: string;
  primary?: boolean;
  onPress: () => void;
}> = ({ icon, label, sublabel, primary = false, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={{ flex: 1 }}>
    {primary ? (
      <LinearGradient colors={[C.green, C.greenLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.qaCard}>
        <View style={[styles.qaIconRing, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
          <Feather name={icon} size={20} color={C.white} />
        </View>
        <Text style={[styles.qaLabel, { color: C.white }]}>{label}</Text>
        <Text style={[styles.qaSublabel, { color: 'rgba(255,255,255,0.72)' }]}>{sublabel}</Text>
      </LinearGradient>
    ) : (
      <View style={[styles.qaCard, { backgroundColor: C.darkCard, borderWidth: 1, borderColor: C.darkBorder }]}>
        <View style={[styles.qaIconRing, { backgroundColor: C.orange + '20' }]}>
          <Feather name={icon} size={20} color={C.orange} />
        </View>
        <Text style={[styles.qaLabel, { color: C.text1 }]}>{label}</Text>
        <Text style={[styles.qaSublabel, { color: C.text2 }]}>{sublabel}</Text>
      </View>
    )}
  </TouchableOpacity>
);

const SectionTitle: React.FC<{
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}> = ({ title, subtitle, action, onAction }) => (
  <View style={styles.sectionTitleRow}>
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
    {action && onAction ? (
      <TouchableOpacity onPress={onAction} style={styles.sectionActionBtn} activeOpacity={0.7}>
        <Text style={styles.sectionActionText}>{action}</Text>
        <Feather name="chevron-right" size={13} color={C.greenLight} />
      </TouchableOpacity>
    ) : null}
  </View>
);

const EmptyQueue = () => (
  <View style={styles.emptyQueue}>
    <LinearGradient colors={[C.green + '20', '#F8F9FA']} style={styles.emptyQueueGrad}>
      <Text style={{ fontSize: 40, marginBottom: 10 }}>🎉</Text>
      <Text style={styles.emptyQueueTitle}>Queue is Clear!</Text>
      <Text style={styles.emptyQueueSub}>
        Keep your meals live to attract hungry neighbours. New orders will appear here instantly.
      </Text>
    </LinearGradient>
  </View>
);

const DarkSkeleton: React.FC<{ width?: number | string; height: number; radius?: number }> = ({
  width = '100%', height, radius = 10,
}) => {
  const opacity = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.2, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);
  return (
    <Animated.View style={{
      width: typeof width === 'number' ? width : (width as any),
      height, borderRadius: radius,
      backgroundColor: '#1E2D3D', opacity,
    }} />
  );
};

export const CookDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-16)).current;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const fetchData = async () => {
    try {
      const [profRes, ordRes] = await Promise.all([
        api.get('/api/users/profile'),
        api.get('/api/orders/my'),
      ]);
      setProfile(profRes.data);
      setOrders(Array.isArray(ordRes.data) ? ordRes.data : (Array.isArray(ordRes.data?.content) ? ordRes.data.content : []));
      if (profRes.data?.id) {
        try {
          const mealsRes = await api.get(`/api/meals/cook/${profRes.data.id}`);
          setMeals(Array.isArray(mealsRes.data) ? mealsRes.data : (Array.isArray(mealsRes.data?.content) ? mealsRes.data.content : []));
        } catch { setMeals([]); }
      }
    } catch (e) {
      console.error(e);
      setOrders([]);
      setMeals([]);
    }
    finally { setLoading(false); }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
    const unsub = navigation.addListener('focus', fetchData);
    return unsub;
  }, [navigation]);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(headerSlide, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  const activeOrders = orders.filter(o => ['PLACED', 'ACCEPTED', 'PREPARING'].includes(o.status));
  const todayOrders = orders.filter(o => {
    const d = new Date(o.createdAt), t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  });
  const activeMeals = meals.filter(m => m.active);
  const chefName = profile?.profile?.name
    ? profile.profile.name.split(' ')[0]
    : (user?.name ? user.name.split(' ')[0] : 'Chef');

  const handleDeleteMeal = (mealId: string) => {
    const doDelete = async () => {
      try {
        await api.delete(`/api/meals/${mealId}`);
        setMeals(prev => prev.filter(m => m.id !== mealId));
        setToast({ visible: true, message: 'Meal removed from menu', type: 'success' });
        fetchData();
      } catch {
        setToast({ visible: true, message: 'Could not delete meal', type: 'error' });
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Permanently remove this meal from your menu?')) doDelete();
    } else {
      Alert.alert('Remove Meal', 'Permanently remove this meal from your menu?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={C.dark} />
        <LinearGradient colors={[C.dark, '#0D2137', '#0F2B1A']} style={styles.loadingHero}>
          <View style={{ height: Platform.OS === 'ios' ? 56 : 44 }} />
          <DarkSkeleton width="48%" height={11} radius={6} />
          <View style={{ height: 10 }} />
          <DarkSkeleton width="72%" height={24} radius={8} />
          <View style={{ height: 8 }} />
          <DarkSkeleton width="54%" height={11} radius={6} />
        </LinearGradient>
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 22 }}>
            {[0, 1, 2, 3].map(i => <View key={i} style={{ flex: 1 }}><DarkSkeleton height={88} radius={16} /></View>)}
          </View>
          <DarkSkeleton width="36%" height={14} radius={7} />
          <View style={{ height: 12 }} />
          <DarkSkeleton height={96} radius={16} />
          <View style={{ height: 10 }} />
          <DarkSkeleton height={96} radius={16} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.greenLight}
            colors={[C.greenLight]}
            progressBackgroundColor={C.darkCard}
          />
        }
      >
        {/* HERO HEADER */}
        <LinearGradient
          colors={['#0F1923', '#0D2137', '#0F2B1A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroBlobTL} />
          <View style={styles.heroBlobBR} />

          <Animated.View style={{
            opacity: headerOpacity,
            transform: [{ translateY: headerSlide }],
            paddingTop: Platform.OS === 'ios' ? 56 : 44,
            paddingHorizontal: 20,
            paddingBottom: 30,
          }}>
            <View style={styles.heroTopBar}>
              <View style={styles.kitchenStatusBadge}>
                <View style={styles.kitchenStatusDot} />
                <Text style={styles.kitchenStatusText}>KITCHEN STATUS</Text>
              </View>
              <View style={[
                styles.verifiedBadge,
                profile?.profile?.hygieneVerified
                  ? { backgroundColor: C.greenLight + '25', borderColor: C.greenLight + '60' }
                  : { backgroundColor: C.amber + '22', borderColor: C.amber + '55' }
              ]}>
                <Feather
                  name={profile?.profile?.hygieneVerified ? 'shield' : 'clock'}
                  size={11}
                  color={profile?.profile?.hygieneVerified ? C.greenLight : C.amber}
                />
                <Text style={[styles.verifiedText, {
                  color: profile?.profile?.hygieneVerified ? C.greenLight : C.amber,
                }]}>
                  {profile?.profile?.hygieneVerified ? 'Verified' : 'Pending'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroGreeting}>{getGreeting()},</Text>
                <Text style={styles.heroName}>Chef {chefName} 👨‍🍳</Text>
              </View>
              {profile?.profile?.avatarUrl ? (
                <Image
                  source={{ uri: profile.profile.avatarUrl }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    borderWidth: 2,
                    borderColor: 'rgba(82, 183, 136, 0.7)',
                    marginLeft: 12,
                  }}
                  resizeMode="cover"
                />
              ) : null}
            </View>
            <Text style={styles.heroSub}>
              {todayOrders.length > 0
                ? `${activeOrders.length} active order${activeOrders.length !== 1 ? 's' : ''} · ${todayOrders.length} today`
                : 'No orders yet — your kitchen is ready!'}
            </Text>

            {todayOrders.length > 0 && (
              <View style={styles.miniProgressWrap}>
                <View style={styles.miniProgressBg}>
                  <View style={[
                    styles.miniProgressFill,
                    { width: `${Math.min((activeOrders.length / Math.max(todayOrders.length, 1)) * 100, 100)}%` as any }
                  ]} />
                </View>
                <Text style={styles.miniProgressLabel}>{activeOrders.length}/{todayOrders.length} active</Text>
              </View>
            )}
          </Animated.View>
        </LinearGradient>

        {/* BODY */}
        <View style={styles.body}>
          {/* Stats */}
          <View style={styles.statsRow}>
            <AnimatedStatCard
              icon="📦" label="ORDERS"
              value={profile?.stats?.totalOrders ?? 0}
              color={C.blue} glowColor={C.blue + '30'} delay={0}
            />
            <AnimatedStatCard
              featherIcon="dollar-sign" label="LKR EARNED"
              value={(profile?.stats?.totalEarnings ?? 0).toLocaleString()}
              color={C.greenLight} glowColor={C.greenLight + '30'} delay={80}
              onPress={() => navigation.navigate('EarningDashboard')}
            />
            <AnimatedStatCard
              featherIcon="star" label="RATING"
              value={profile?.stats?.avgRating?.toFixed(1) ?? '0.0'}
              color={C.amber} glowColor={C.amber + '30'} delay={160}
              onPress={() => navigation.navigate('CookReviews')}
            />
            <AnimatedStatCard
              icon="🍽️" label="LIVE MEALS"
              value={activeMeals.length}
              color={C.orange} glowColor={C.orange + '30'} delay={240}
            />
          </View>

          {/* Quick Actions */}
          <View style={styles.sectionWrap}>
            <SectionTitle title="Quick Actions" />
            <View style={styles.qaRow}>
              <QuickAction
                icon="plus-circle" label="Add Meal" sublabel="New listing"
                primary onPress={() => navigation.navigate('AddListing')}
              />
              <View style={{ width: 12 }} />
              <QuickAction
                icon="shopping-bag" label="Orders" sublabel="Manage queue"
                onPress={() => navigation.navigate('Orders')}
              />
            </View>
          </View>

          {/* Earnings Banner */}
          <View style={styles.sectionWrap}>
            <TouchableOpacity
              onPress={() => navigation.navigate('EarningDashboard')}
              activeOpacity={0.88}
              testID="earning-dashboard-button"
              accessibilityLabel="Earning Dashboard"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={['#1B4332', '#2D6A4F', '#40916C']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.earningsBanner}
              >
                <View style={styles.earningsBannerBlob} />
                <View style={styles.earningsLeft}>
                  <View style={styles.earningsIconWrap}>
                    <Feather name="trending-up" size={22} color={C.greenLight} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.earningsTitle}>Earning Dashboard</Text>
                    <Text style={styles.earningsSub}>Revenue · Payouts · Sales</Text>
                  </View>
                </View>
                <View style={styles.earningsRight}>
                  <Text style={styles.earningsAmount}>
                    LKR {(profile?.stats?.totalEarnings ?? 0).toLocaleString()}
                  </Text>
                  <Feather name="chevron-right" size={16} color={C.white} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* My Meals */}
          {meals.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <View style={styles.sectionWrap}>
                <SectionTitle
                  title="My Menu"
                  subtitle={`${meals.length} meal${meals.length !== 1 ? 's' : ''} · ${activeMeals.length} live`}
                />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}
              >
                {meals.map(meal => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    onEdit={() => navigation.navigate('AddMealForm', { mealToEdit: meal })}
                    onDelete={() => handleDeleteMeal(meal.id)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Active Orders */}
          <View style={styles.sectionWrap}>
            <SectionTitle
              title="Order Queue"
              subtitle={activeOrders.length > 0 ? `${activeOrders.length} active` : 'No pending orders'}
              action={activeOrders.length > 0 ? 'See All' : undefined}
              onAction={() => navigation.navigate('Orders')}
            />
            {activeOrders.length === 0
              ? <EmptyQueue />
              : activeOrders.slice(0, 5).map((item, index) => (
                  <OrderCard
                    key={item.id}
                    item={item}
                    onPress={() => navigation.navigate('Orders')}
                    index={index}
                  />
                ))
            }
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  loadingHero: { paddingHorizontal: 20, paddingBottom: 28 },
  hero: { overflow: 'hidden', position: 'relative' },
  heroBlobTL: {
    position: 'absolute', top: -60, left: -60, width: 200, height: 200, borderRadius: 100,
    backgroundColor: C.greenLight + '14',
  },
  heroBlobBR: {
    position: 'absolute', bottom: -40, right: -40, width: 160, height: 160, borderRadius: 80,
    backgroundColor: C.orange + '10',
  },
  heroTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  kitchenStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  kitchenStatusDot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: C.greenLight,
    shadowColor: C.greenLight, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4, elevation: 3,
  },
  kitchenStatusText: { color: C.text2, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  verifiedText: { fontSize: 10, fontWeight: '700' },
  heroGreeting: { color: C.text2, fontSize: 14, fontWeight: '500', marginBottom: 2 },
  heroName: { color: C.white, fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  heroSub: { color: C.text2, fontSize: 13, fontWeight: '400' },
  miniProgressWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 10 },
  miniProgressBg: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
  miniProgressFill: { height: 4, backgroundColor: C.greenLight, borderRadius: 2 },
  miniProgressLabel: { color: C.text2, fontSize: 10, fontWeight: '600' },
  body: { backgroundColor: C.surface },
  sectionWrap: { paddingHorizontal: 20, marginBottom: 24 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 20, marginBottom: 24, gap: 8 },
  statCard: {
    backgroundColor: C.white, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 8,
    alignItems: 'center', borderWidth: 1, borderColor: '#E8EEF5', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 4,
  },
  statIconRing: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  statLabel: { fontSize: 8, fontWeight: '700', color: C.text3, letterSpacing: 0.7, marginTop: 2, textAlign: 'center' },
  statGlow: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, opacity: 0.5 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 11, color: '#6B7280', marginTop: 2, fontWeight: '500' },
  sectionActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: C.greenLight + '18', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  sectionActionText: { fontSize: 12, fontWeight: '700', color: C.greenLight },
  qaRow: { flexDirection: 'row' },
  qaCard: {
    borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
  },
  qaIconRing: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  qaLabel: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  qaSublabel: { fontSize: 11, fontWeight: '500' },
  earningsBanner: {
    borderRadius: 20, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden',
    shadowColor: C.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 8,
  },
  earningsBannerBlob: { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)' },
  earningsLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12, marginRight: 12 },
  earningsIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  earningsTitle: { color: C.white, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  earningsSub: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2 },
  earningsRight: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, gap: 4 },
  earningsAmount: { color: C.white, fontSize: 13, fontWeight: '800' },
  mealCard: {
    width: 150, backgroundColor: C.white, borderRadius: 18, marginRight: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#EBF0F5',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  mealThumb: { width: '100%', height: 100 },
  mealThumbPlaceholder: { width: '100%', height: 100, backgroundColor: '#F0F7F4', alignItems: 'center', justifyContent: 'center' },
  mealBadgeOverlay: { position: 'absolute', top: 8, right: 8, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  mealBadgeText: { color: C.white, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  mealInfo: { padding: 10, paddingBottom: 6 },
  mealName: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  mealMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealPrice: { fontSize: 12, fontWeight: '800', color: C.green },
  mealRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  mealRating: { fontSize: 10, fontWeight: '700', color: '#6B7280' },
  mealActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 6 },
  mealActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 4 },
  mealActionText: { fontSize: 11, fontWeight: '700' },
  orderCard: {
    backgroundColor: C.white, borderRadius: 16, padding: 14, marginBottom: 10,
    borderLeftWidth: 4, borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
    borderTopColor: '#EBF0F5', borderRightColor: '#EBF0F5', borderBottomColor: '#EBF0F5',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderNumberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderAccentDot: { width: 8, height: 8, borderRadius: 4 },
  orderNumber: { fontSize: 14, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.2 },
  orderCustomer: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  orderCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8 },
  orderItems: { fontSize: 11, color: '#9CA3AF', flex: 1, marginRight: 8 },
  orderAmount: { fontSize: 14, fontWeight: '800' },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  emptyQueue: { borderRadius: 20, overflow: 'hidden' },
  emptyQueueGrad: { padding: 32, alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: C.green + '30' },
  emptyQueueTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A2E', marginBottom: 6 },
  emptyQueueSub: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
});
