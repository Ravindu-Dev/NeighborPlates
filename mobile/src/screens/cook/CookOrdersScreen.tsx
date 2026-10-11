import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ScrollView,
  Platform,
  StyleSheet,
  StatusBar,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { Toast } from '../../components/common/Toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  dark:        '#0F1923',
  darkMid:     '#132235',
  darkCard:    '#162438',
  darkBorder:  '#1E324D',
  green:       '#2D6A4F',
  greenLight:  '#52B788',
  greenGlow:   '#40916C',
  orange:      '#FF6B35',
  amber:       '#F59E0B',
  blue:        '#3B82F6',
  blueLight:   '#60A5FA',
  purple:      '#8B5CF6',
  red:         '#EF4444',
  redLight:    '#F87171',
  white:       '#FFFFFF',
  surface:     '#F4F7FB',
  cardBg:      '#FFFFFF',
  text1:       '#0F1923',
  text2:       '#475569',
  text3:       '#94A3B8',
  borderLight: '#E2E8F0',
};

type FilterType = 'ALL' | 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';

const FILTERS: { key: FilterType; label: string; icon: string }[] = [
  { key: 'ALL',        label: 'All Orders',  icon: '🔥' },
  { key: 'PLACED',     label: 'New Placed',  icon: '📥' },
  { key: 'ACCEPTED',   label: 'Accepted',    icon: '✅' },
  { key: 'PREPARING',  label: 'Cooking',     icon: '🍳' },
  { key: 'READY',      label: 'Food Ready',  icon: '🍽️' },
  { key: 'DELIVERING', label: 'In Transit',  icon: '🛵' },
  { key: 'DELIVERED',  label: 'Completed',   icon: '📦' },
  { key: 'CANCELLED',  label: 'Declined',    icon: '❌' },
];

const getTimeAgo = (dateStr: string): string => {
  if (!dateStr) return 'recently';
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

interface CookOrdersScreenProps {
  navigation?: any;
}

export const CookOrdersScreen: React.FC<CookOrdersScreenProps> = ({ navigation: propNavigation }) => {
  const fallbackNav = useNavigation<any>();
  const navigation = propNavigation || fallbackNav;

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(-15)).current;

  const fetchOrders = async () => {
    try {
      const response = await api.get('/api/orders/my');
      setOrders(response.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

  useEffect(() => {
    fetchOrders();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrders();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(heroSlide, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  const handleUpdateStatus = async (orderId: string, currentStatus: string, deliveryMethod?: string) => {
    let nextStatus = '';
    switch (currentStatus) {
      case 'PLACED': nextStatus = 'ACCEPTED'; break;
      case 'ACCEPTED': nextStatus = 'PREPARING'; break;
      case 'PREPARING': nextStatus = 'READY'; break;
      case 'READY': nextStatus = 'DELIVERING'; break;
      case 'DELIVERING':
        if (deliveryMethod !== 'RIDER') {
          nextStatus = 'DELIVERED';
        } else {
          return;
        }
        break;
      default: return;
    }

    setUpdatingOrderId(orderId);
    try {
      await api.put(`/api/orders/${orderId}/status?status=${nextStatus}`);
      const statusText = nextStatus === 'DELIVERING' ? 'IN TRANSIT (Dispatched to Riders)' : nextStatus;
      setToast({ visible: true, message: `✅ Order is now ${statusText}`, type: 'success' });
      fetchOrders();
    } catch (error: any) {
      setToast({
        visible: true,
        message: error.response?.data?.message || 'Failed to update order status.',
        type: 'error',
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleDeclineOrder = (orderId: string) => {
    const confirmAction = async () => {
      setUpdatingOrderId(orderId);
      try {
        await api.put(`/api/orders/${orderId}/status?status=CANCELLED`);
        setToast({ visible: true, message: 'Order has been declined and cancelled.', type: 'error' });
        fetchOrders();
      } catch (error: any) {
        setToast({
          visible: true,
          message: error.response?.data?.message || 'Failed to decline order.',
          type: 'error',
        });
      } finally {
        setUpdatingOrderId(null);
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
          { text: 'Keep Order', style: 'cancel' },
          { text: 'Decline', style: 'destructive', onPress: confirmAction },
        ]
      );
    }
  };

  const getActionConfig = (status: string, deliveryMethod?: string) => {
    switch (status) {
      case 'PLACED':
        return { label: 'ACCEPT ORDER', icon: 'check', colors: [C.greenLight, C.green] };
      case 'ACCEPTED':
        return { label: 'START PREPARING', icon: 'play', colors: ['#F59E0B', '#D97706'] };
      case 'PREPARING':
        return { label: 'MARK AS READY', icon: 'check-circle', colors: [C.greenLight, C.green] };
      case 'READY':
        return { label: 'HAND OVER FOR DELIVERY', icon: 'send', colors: [C.blueLight, C.blue] };
      case 'DELIVERING':
        if (deliveryMethod === 'COOK_DELIVERY' || deliveryMethod === 'PICKUP') {
          return { label: 'MARK DELIVERED', icon: 'check-square', colors: [C.greenLight, C.green] };
        }
        return null;
      default:
        return null;
    }
  };

  const getStatusColorConfig = (status: string) => {
    switch (status) {
      case 'PLACED':
        return { color: C.amber, bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', label: 'NEW PLACED' };
      case 'ACCEPTED':
        return { color: C.blue, bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', label: 'ACCEPTED' };
      case 'PREPARING':
        return { color: C.orange, bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', label: 'COOKING' };
      case 'READY':
        return { color: C.green, bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', label: 'FOOD READY' };
      case 'DELIVERING':
        return { color: C.purple, bg: '#F5F3FF', border: '#DDD6FE', text: '#6D28D9', label: 'IN TRANSIT' };
      case 'DELIVERED':
        return { color: '#10B981', bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', label: 'COMPLETED' };
      case 'CANCELLED':
        return { color: C.red, bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', label: 'DECLINED' };
      default:
        return { color: C.text2, bg: '#F1F5F9', border: '#E2E8F0', text: C.text1, label: status };
    }
  };

  const getDeliveryBadge = (method: string) => {
    switch (method) {
      case 'PICKUP':
        return { label: 'Self Pickup', icon: 'shopping-bag', bg: '#EFF6FF', text: '#1D4ED8' };
      case 'COOK_DELIVERY':
        return { label: 'Chef Delivery', icon: 'truck', bg: '#ECFDF5', text: '#047857' };
      case 'RIDER':
        return { label: 'Rider Delivery', icon: 'navigation', bg: '#F5F3FF', text: '#6D28D9' };
      default:
        return { label: method || 'Standard', icon: 'package', bg: '#F1F5F9', text: C.text2 };
    }
  };

  const filteredOrders = activeFilter === 'ALL'
    ? orders
    : orders.filter((o) => o.status === activeFilter);

  const getFilterCount = (key: FilterType) => {
    if (key === 'ALL') return orders.length;
    return orders.filter((o) => o.status === key).length;
  };

  // Telemetry counts
  const placedCount = orders.filter((o) => o.status === 'PLACED').length;
  const activeQueueCount = orders.filter((o) => ['PLACED', 'ACCEPTED', 'PREPARING'].includes(o.status)).length;
  const readyCount = orders.filter((o) => o.status === 'READY').length;
  const deliveringCount = orders.filter((o) => o.status === 'DELIVERING').length;

  const getEmptyMessage = () => {
    switch (activeFilter) {
      case 'PLACED':
        return { emoji: '📥', title: 'No New Orders Pending', subtitle: 'New order alerts from hungry neighbors will appear here instantly.' };
      case 'ACCEPTED':
        return { emoji: '✅', title: 'No Accepted Orders', subtitle: 'Accept incoming orders from the New tab to queue them for preparation.' };
      case 'PREPARING':
        return { emoji: '👨‍🍳', title: 'Kitchen Stove is Clear', subtitle: 'Orders you begin cooking will be tracked here.' };
      case 'READY':
        return { emoji: '🍽️', title: 'No Dishes Waiting for Handover', subtitle: 'Dishes marked as ready for pickup or rider dispatch will show here.' };
      case 'DELIVERING':
        return { emoji: '🛵', title: 'No Orders in Transit', subtitle: 'Deliveries currently on the road with riders or cooks will appear here.' };
      case 'DELIVERED':
        return { emoji: '📦', title: 'No Completed Orders Yet', subtitle: 'Fulfilled orders with final customer settlements will be recorded here.' };
      case 'CANCELLED':
        return { emoji: '🛡️', title: 'Zero Cancelled Orders', subtitle: 'Great work maintaining a spotless fulfillment rate!' };
      default:
        return { emoji: '📭', title: 'No Orders Placed Yet', subtitle: 'Keep your meals active on your menu to start receiving orders.' };
    }
  };

  if (loading) {
    return (
      <View style={S.loadingScreen}>
        <StatusBar barStyle="light-content" backgroundColor={C.dark} />
        <View style={S.loadingBox}>
          <ActivityIndicator size="large" color={C.greenLight} />
          <Text style={S.loadingText}>Loading kitchen order queue...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={S.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />

      {/* ─── Screen Header ─── */}
      <LinearGradient
        colors={['#0F1923', '#0D2137', '#0F2B1A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={S.hero}
      >
        <View style={S.blobTopRight} />
        <View style={S.blobBottomLeft} />

        <Animated.View
          style={[
            S.heroContent,
            {
              opacity: heroOpacity,
              transform: [{ translateY: heroSlide }],
            },
          ]}
        >
          {/* Top Bar with Kitchen Tag */}
          <View style={S.topBarRow}>
            <View style={S.heroTagPill}>
              <View style={[S.liveDot, { backgroundColor: activeQueueCount > 0 ? '#10B981' : '#F59E0B' }]} />
              <Text style={S.heroTagText}>KITCHEN DISPATCH DESK</Text>
            </View>

            <View style={S.totalPill}>
              <Text style={S.totalPillText}>{orders.length} total orders</Text>
            </View>
          </View>

          {/* Titles */}
          <Text style={S.heroTitle}>Manage Orders 📦</Text>
          <Text style={S.heroSubtitle}>
            Live kitchen order management, dispatch status, and step-by-step handover controls.
          </Text>

          {/* Telemetry Bar */}
          <View style={S.telemetryBar}>
            <View style={S.telemetryItem}>
              <Text style={[S.telemetryVal, placedCount > 0 && { color: C.amber }]}>
                {placedCount}
              </Text>
              <Text style={S.telemetryLbl}>New Alerts</Text>
            </View>
            <View style={S.telemetrySep} />
            <View style={S.telemetryItem}>
              <Text style={[S.telemetryVal, { color: C.greenLight }]}>{activeQueueCount}</Text>
              <Text style={S.telemetryLbl}>In Kitchen</Text>
            </View>
            <View style={S.telemetrySep} />
            <View style={S.telemetryItem}>
              <Text style={[S.telemetryVal, { color: C.blueLight }]}>{readyCount}</Text>
              <Text style={S.telemetryLbl}>Ready Handover</Text>
            </View>
            <View style={S.telemetrySep} />
            <View style={S.telemetryItem}>
              <Text style={[S.telemetryVal, { color: C.purple }]}>{deliveringCount}</Text>
              <Text style={S.telemetryLbl}>In Transit</Text>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* ─── Stage Filter Carousel ─── */}
      <View style={S.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={S.filtersScroll}
        >
          {FILTERS.map((f) => {
            const isSelected = activeFilter === f.key;
            const count = getFilterCount(f.key);
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.8}
                style={[S.filterChip, isSelected && S.filterChipActive]}
              >
                <Text style={{ fontSize: 13, marginRight: 5 }}>{f.icon}</Text>
                <Text style={[S.filterLabel, isSelected && S.filterLabelActive]}>
                  {f.label}
                </Text>
                <View style={[S.filterCountBadge, isSelected && S.filterCountBadgeActive]}>
                  <Text style={[S.filterCountText, isSelected && S.filterCountTextActive]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Orders List ─── */}
      {filteredOrders.length === 0 ? (
        <View style={S.emptyContainer}>
          <View style={S.emptyIconWrap}>
            <Text style={{ fontSize: 44 }}>{getEmptyMessage().emoji}</Text>
          </View>
          <Text style={S.emptyTitle}>{getEmptyMessage().title}</Text>
          <Text style={S.emptySubtitle}>{getEmptyMessage().subtitle}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={S.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.greenLight}
              colors={[C.greenLight]}
              progressBackgroundColor={C.darkCard}
            />
          }
          renderItem={({ item }) => {
            const actionConfig = getActionConfig(item.status, item.deliveryMethod);
            const statusConfig = getStatusColorConfig(item.status);
            const deliveryConfig = getDeliveryBadge(item.deliveryMethod);
            const isExpanded = expandedOrder === item.id;
            const isUpdating = updatingOrderId === item.id;

            // Calculations
            const netEarnings = item.cookEarnings !== undefined
              ? item.cookEarnings
              : (item.totalAmount ? item.totalAmount * 0.9 : 0);

            return (
              <View style={[S.orderCard, { borderLeftColor: statusConfig.color }]}>
                {/* ── Header Row: Order Number, Time & Status Badge ── */}
                <View style={S.orderCardHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={S.orderNumber}>{item.orderNumber}</Text>
                      <View style={S.timeAgoBadge}>
                        <Feather name="clock" size={10} color={C.text3} style={{ marginRight: 3 }} />
                        <Text style={S.timeAgoText}>{getTimeAgo(item.createdAt)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Status Badge */}
                  <View style={[S.statusBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }]}>
                    <View style={[S.statusBadgeDot, { backgroundColor: statusConfig.color }]} />
                    <Text style={[S.statusBadgeText, { color: statusConfig.text }]}>
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>

                {/* ── Customer & Delivery Bar ── */}
                <View style={S.customerInfoRow}>
                  <View style={S.customerNameBox}>
                    <Feather name="user" size={13} color={C.text2} style={{ marginRight: 5 }} />
                    <Text style={S.customerNameText} numberOfLines={1}>
                      {item.customerName || 'Customer'}
                    </Text>
                  </View>

                  {/* Delivery Method Badge */}
                  <View style={[S.deliveryBadge, { backgroundColor: deliveryConfig.bg }]}>
                    <Feather name={deliveryConfig.icon as any} size={11} color={deliveryConfig.text} style={{ marginRight: 4 }} />
                    <Text style={[S.deliveryBadgeText, { color: deliveryConfig.text }]}>
                      {deliveryConfig.label}
                    </Text>
                  </View>
                </View>

                {/* Rider details if assigned */}
                {item.riderName && (
                  <View style={S.riderBanner}>
                    <Ionicons name="bicycle" size={14} color="#5B21B6" style={{ marginRight: 6 }} />
                    <Text style={S.riderText}>
                      Assigned Rider: <Text style={{ fontWeight: '800' }}>{item.riderName}</Text>
                    </Text>
                  </View>
                )}

                {/* Address */}
                {item.address?.label && (
                  <View style={S.addressRow}>
                    <Feather name="map-pin" size={11} color={C.text3} style={{ marginRight: 4 }} />
                    <Text style={S.addressText} numberOfLines={1}>
                      {item.address.label}
                    </Text>
                  </View>
                )}

                {/* Special Instructions Callout */}
                {item.specialInstructions ? (
                  <View style={S.instructionsCallout}>
                    <View style={S.instructionsHeader}>
                      <Ionicons name="chatbubble-ellipses" size={12} color="#B45309" style={{ marginRight: 4 }} />
                      <Text style={S.instructionsTitle}>SPECIAL CUSTOMER REQUEST</Text>
                    </View>
                    <Text style={S.instructionsBody}>"{item.specialInstructions}"</Text>
                  </View>
                ) : null}

                {/* ── Ordered Items Summary (Expandable) ── */}
                <TouchableOpacity
                  onPress={() => setExpandedOrder(isExpanded ? null : item.id)}
                  activeOpacity={0.7}
                  style={S.itemsAccordionHeader}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={S.itemsSummaryText} numberOfLines={isExpanded ? undefined : 1}>
                      {item.items?.map((meal: any) => `${meal.name} (x${meal.quantity})`).join(' • ')}
                    </Text>
                  </View>
                  <View style={S.expandIconWrap}>
                    <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={C.text2} />
                  </View>
                </TouchableOpacity>

                {/* Expanded Items Breakdown */}
                {isExpanded && item.items && (
                  <View style={S.expandedItemsBox}>
                    {item.items.map((meal: any, idx: number) => (
                      <View key={idx} style={S.expandedItemRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View style={S.itemQtyBadge}>
                            <Text style={S.itemQtyText}>x{meal.quantity}</Text>
                          </View>
                          <Text style={S.itemNameText} numberOfLines={1}>
                            {meal.name}
                          </Text>
                        </View>
                        <Text style={S.itemPriceText}>
                          LKR {(meal.price * meal.quantity).toLocaleString()}
                        </Text>
                      </View>
                    ))}

                    <View style={S.receiptDivider} />

                    <View style={S.receiptTotalRow}>
                      <Text style={S.receiptTotalLabel}>Customer Billed Total</Text>
                      <Text style={S.receiptTotalVal}>LKR {Number(item.totalAmount || 0).toLocaleString()}</Text>
                    </View>

                    <View style={S.receiptNetRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Feather name="shield" size={11} color={C.green} style={{ marginRight: 4 }} />
                        <Text style={S.receiptNetLabel}>Chef Net Take-Home (90%)</Text>
                      </View>
                      <Text style={S.receiptNetVal}>
                        LKR {Number(netEarnings).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Financial Summary (when collapsed) */}
                {!isExpanded && (
                  <View style={S.collapsedFinancials}>
                    <Text style={S.collapsedNetText}>
                      Your Net: <Text style={S.collapsedNetVal}>LKR {Number(netEarnings).toLocaleString()}</Text>
                    </Text>
                    <Text style={S.collapsedGrossText}>
                      (Bill: LKR {Number(item.totalAmount || 0).toLocaleString()})
                    </Text>
                  </View>
                )}

                {/* Status Notice Banners */}
                {item.status === 'READY' && (
                  <View style={S.readyNoticeBanner}>
                    <Text style={{ fontSize: 14, marginRight: 6 }}>🍽️</Text>
                    <Text style={S.readyNoticeText}>
                      Dish is packed & ready. Hand over to delivery rider or customer.
                    </Text>
                  </View>
                )}

                {item.status === 'DELIVERING' && (
                  <View style={S.deliveringNoticeBanner}>
                    <Text style={{ fontSize: 14, marginRight: 6 }}>🛵</Text>
                    <Text style={S.deliveringNoticeText}>
                      {item.riderName
                        ? `Out for delivery with rider ${item.riderName}.`
                        : 'Dispatched to nearby NeighborPlates delivery riders.'}
                    </Text>
                  </View>
                )}

                {/* ── Action Buttons ── */}
                {actionConfig && (
                  <View style={S.actionRow}>
                    {item.status === 'PLACED' && (
                      <TouchableOpacity
                        onPress={() => handleDeclineOrder(item.id)}
                        disabled={isUpdating}
                        activeOpacity={0.8}
                        style={S.declineBtn}
                      >
                        <Feather name="x" size={14} color={C.red} style={{ marginRight: 4 }} />
                        <Text style={S.declineBtnText}>DECLINE</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={() => handleUpdateStatus(item.id, item.status, item.deliveryMethod)}
                      disabled={isUpdating}
                      activeOpacity={0.88}
                      style={[S.actionBtn, item.status === 'PLACED' ? { flex: 2 } : { flex: 1 }]}
                    >
                      <LinearGradient
                        colors={actionConfig.colors as any}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={S.actionGradient}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color={C.white} />
                        ) : (
                          <>
                            <Feather name={actionConfig.icon as any} size={15} color={C.white} style={{ marginRight: 6 }} />
                            <Text style={S.actionBtnText}>{actionConfig.label}</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

// ─── Stylesheet ────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.surface,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.surface,
  },
  loadingBox: {
    backgroundColor: C.white,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loadingText: {
    color: C.text2,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
  },

  // Hero Section
  hero: {
    paddingTop: Platform.OS === 'ios' ? 52 : 44,
    paddingHorizontal: 20,
    paddingBottom: 22,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  blobTopRight: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(82, 183, 136, 0.12)',
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heroTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(82, 183, 136, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(82, 183, 136, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  heroTagText: {
    color: C.greenLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  totalPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  totalPillText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    color: C.white,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  heroSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 16,
  },

  // Telemetry Bar
  telemetryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 36, 56, 0.85)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.darkBorder,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  telemetryItem: {
    flex: 1,
    alignItems: 'center',
  },
  telemetryVal: {
    color: C.white,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  telemetryLbl: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  telemetrySep: {
    width: 1,
    height: 22,
    backgroundColor: C.darkBorder,
  },

  // Filter Chips Carousel
  filtersWrapper: {
    paddingVertical: 12,
    backgroundColor: C.surface,
  },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  filterChipActive: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.text1,
    marginRight: 6,
  },
  filterLabelActive: {
    color: C.white,
  },
  filterCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.text2,
  },
  filterCountTextActive: {
    color: C.white,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: C.text1,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: C.text3,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Orders List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 4,
  },
  orderCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8EEF5',
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '900',
    color: C.text1,
    letterSpacing: -0.3,
  },
  timeAgoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  timeAgoText: {
    fontSize: 10,
    fontWeight: '600',
    color: C.text2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Customer Info Row
  customerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerNameBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  customerNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.text1,
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  deliveryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // Rider Banner
  riderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  riderText: {
    fontSize: 11,
    color: '#5B21B6',
    fontWeight: '600',
  },

  // Address
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 11,
    color: C.text3,
    fontWeight: '500',
    flex: 1,
  },

  // Special Instructions
  instructionsCallout: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  instructionsTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.6,
  },
  instructionsBody: {
    fontSize: 11,
    color: '#78350F',
    fontWeight: '600',
    lineHeight: 16,
  },

  // Accordion Header
  itemsAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemsSummaryText: {
    fontSize: 11,
    color: C.text2,
    fontWeight: '600',
  },
  expandIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  // Expanded Items
  expandedItemsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  expandedItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemQtyBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  itemQtyText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.text1,
  },
  itemNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.text1,
  },
  itemPriceText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.text1,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptTotalLabel: {
    fontSize: 11,
    color: C.text2,
    fontWeight: '600',
  },
  receiptTotalVal: {
    fontSize: 13,
    fontWeight: '900',
    color: C.text1,
  },
  receiptNetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  receiptNetLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.green,
  },
  receiptNetVal: {
    fontSize: 14,
    fontWeight: '900',
    color: C.green,
  },

  // Collapsed Financials
  collapsedFinancials: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'baseline',
    marginTop: 8,
    gap: 4,
  },
  collapsedNetText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.text2,
  },
  collapsedNetVal: {
    fontSize: 14,
    fontWeight: '900',
    color: C.green,
  },
  collapsedGrossText: {
    fontSize: 10,
    color: C.text3,
    fontWeight: '500',
  },

  // Status Notice Banners
  readyNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  readyNoticeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
  },
  deliveringNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  deliveringNoticeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D28D9',
    flex: 1,
  },

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 11,
    borderRadius: 14,
  },
  declineBtnText: {
    color: C.red,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionBtnText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
