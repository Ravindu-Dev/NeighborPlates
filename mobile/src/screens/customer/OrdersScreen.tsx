import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, Animated, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { OrderReceiptModal } from '../../components/customer/OrderReceiptModal';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../store/cartStore';

type OrdersScreenProp = NativeStackNavigationProp<CustomerStackParamList, 'HomeTabs'>;

const ACTIVE_STATUSES = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERING'];

interface OrdersScreenProps {
  navigation?: any;
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({ navigation: propNavigation }) => {
  const fallbackNav = useNavigation<any>();
  const navigation = propNavigation || fallbackNav;

  const safeNavigate = (name: string, params?: any) => {
    if (!navigation) return;
    try {
      navigation.navigate(name, params);
    } catch (_) {
      try {
        navigation.getParent?.()?.navigate(name, params);
      } catch (err) {
        console.warn('Navigation failed:', err);
      }
    }
  };

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'past'>('all');
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<any>(null);

  // Pulsing animation for active delivery banner
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/api/orders/my');
      setOrders(response.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = (order: any) => {
    if (!order || !order.items || order.items.length === 0) return;

    const cartItems = order.items.map((item: any) => ({
      mealId: item.mealId || item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity || 1,
      cookId: order.cookId || '',
      cookName: order.cookName || 'Home Kitchen',
      photos: item.photos || [],
      portionsRemaining: 99,
    }));

    useCartStore.setState({ items: cartItems });
    safeNavigate('Checkout');
  };

  useEffect(() => {
    if (!navigation || typeof navigation.addListener !== 'function') {
      fetchOrders();
      return;
    }
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrders();
    });
    return unsubscribe;
  }, [navigation]);

  const getVariant = (status: string) => {
    switch (status) {
      case 'PLACED':
        return 'primary';
      case 'ACCEPTED':
      case 'PREPARING':
        return 'secondary';
      case 'READY':
        return 'warning';
      case 'DELIVERING':
        return 'secondary';
      case 'DELIVERED':
        return 'success';
      case 'CANCELLED':
        return 'error';
      default:
        return 'neutral';
    }
  };

  const getActiveStep = (status: string) => {
    switch (status) {
      case 'PLACED':
      case 'ACCEPTED':
        return 1;
      case 'PREPARING':
        return 2;
      case 'READY':
        return 3;
      case 'DELIVERING':
        return 4;
      default:
        return 1;
    }
  };

  const getStatusSubtitle = (status: string) => {
    switch (status) {
      case 'PLACED':
        return 'Order placed • Waiting for confirmation';
      case 'ACCEPTED':
        return 'Order confirmed • Preparing to cook';
      case 'PREPARING':
        return 'Kitchen is cooking your meal fresh 🍳';
      case 'READY':
        return 'Food is prepared & packed for delivery';
      case 'DELIVERING':
        return 'Rider is on the way to your doorstep 🛵';
      default:
        return 'Delivery in progress';
    }
  };

  // Compute filtered list based on active tab
  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'past') {
      return order.status === 'DELIVERED' || order.status === 'CANCELLED';
    }
    return true; // 'all' tab
  });

  // Find most recent active order for the banner under 'all' tab
  const activeDeliveryOrder = orders.find((o) => ACTIVE_STATUSES.includes(o.status));
  const pastOrdersCount = orders.filter((o) => o.status === 'DELIVERED' || o.status === 'CANCELLED').length;

  return (
    <View className="flex-1 bg-surface-elevated relative">
      {/* Liquid Background Blobs matching HomeScreen & ProfileScreen */}
      <View className="absolute w-72 h-72 rounded-full bg-primary/5 -top-20 -left-20 blur-3xl opacity-40" />
      <View className="absolute w-80 h-80 rounded-full bg-secondary/5 top-80 -right-20 blur-3xl opacity-30" />

      {/* Modern Sticky Header */}
      <View className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 shadow-sm z-10 flex-row justify-between items-center">
        <View className="flex-1 mr-2">
          <Text className="font-black text-xl text-textPrimary">My Orders</Text>
          <Text className="text-textSecondary text-[10px] mt-0.5 font-bold uppercase tracking-wider" numberOfLines={1}>
            Track deliveries & receipts
          </Text>
        </View>
        <View className="border border-primary/20 bg-primary/10 rounded-full px-3 py-1 flex-row items-center gap-1 shadow-xs">
          <Ionicons name="receipt-outline" size={11} color="#FF6B35" />
          <Text className="text-primary font-black text-[9px] uppercase tracking-wider">Order History</Text>
        </View>
      </View>

      <View className="flex-1 px-5 pt-5">
        {/* Premium Segmented Toggle Bar */}
        <View className="bg-gray-100 p-1.5 rounded-2xl border border-gray-200 flex-row mb-5 shadow-inner">
          <TouchableOpacity
            key="tab-all"
            onPress={() => setActiveTab('all')}
            style={{
              backgroundColor: activeTab === 'all' ? '#FFFFFF' : 'transparent',
              borderColor: activeTab === 'all' ? '#E5E7EB' : 'transparent',
              borderWidth: 1,
            }}
            className="flex-1 py-2.5 rounded-xl items-center justify-center flex-row gap-2 shadow-xs"
            activeOpacity={0.8}
          >
            <Text
              style={{ color: activeTab === 'all' ? '#FF6B35' : '#6B7280' }}
              className="text-xs font-black"
            >
              All Orders
            </Text>
            <View
              style={{
                backgroundColor: activeTab === 'all' ? 'rgba(255, 107, 53, 0.12)' : 'rgba(229, 231, 235, 0.7)',
              }}
              className="px-2 py-0.5 rounded-full"
            >
              <Text
                style={{ color: activeTab === 'all' ? '#FF6B35' : '#9CA3AF' }}
                className="text-[10px] font-black"
              >
                {orders.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            key="tab-past"
            onPress={() => setActiveTab('past')}
            style={{
              backgroundColor: activeTab === 'past' ? '#FFFFFF' : 'transparent',
              borderColor: activeTab === 'past' ? '#E5E7EB' : 'transparent',
              borderWidth: 1,
            }}
            className="flex-1 py-2.5 rounded-xl items-center justify-center flex-row gap-2 shadow-xs"
            activeOpacity={0.8}
          >
            <Text
              style={{ color: activeTab === 'past' ? '#FF6B35' : '#6B7280' }}
              className="text-xs font-black"
            >
              Past Orders
            </Text>
            <View
              style={{
                backgroundColor: activeTab === 'past' ? 'rgba(255, 107, 53, 0.12)' : 'rgba(229, 231, 235, 0.7)',
              }}
              className="px-2 py-0.5 rounded-full"
            >
              <Text
                style={{ color: activeTab === 'past' ? '#FF6B35' : '#9CA3AF' }}
                className="text-[10px] font-black"
              >
                {pastOrdersCount}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View key="state-loading" className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text className="text-textMuted text-xs font-semibold mt-3">Fetching your orders...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View key="state-empty-all" className="flex-1 justify-center items-center p-6">
            <Text className="text-5xl mb-4">🍽️</Text>
            <Text className="text-textPrimary font-black text-base text-center mb-1">No orders placed yet</Text>
            <Text className="text-textMuted text-xs text-center leading-relaxed">
              Discover authentic home-cooked meals from local chefs in your neighborhood!
            </Text>
            <TouchableOpacity
              onPress={() => safeNavigate('HomeTabs', { screen: 'Home' })}
              className="mt-5 bg-primary px-6 py-3 rounded-2xl shadow-sm"
              activeOpacity={0.8}
            >
              <Text className="text-white font-black text-xs uppercase tracking-wider">Browse Home Kitchens</Text>
            </TouchableOpacity>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View key="state-empty-past" className="flex-1 justify-center items-center p-6">
            <Text className="text-4xl mb-3">📦</Text>
            <Text className="text-textPrimary font-black text-base text-center mb-1">No past orders found</Text>
            <Text className="text-textMuted text-xs text-center">
              Delivered and cancelled orders will appear in this list.
            </Text>
          </View>
        ) : (
          <FlatList
            key="orders-flatlist"
            data={filteredOrders}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListHeaderComponent={
              /* Active Delivery Banner at top of All Orders tab */
              activeTab === 'all' && activeDeliveryOrder ? (
                <View
                  style={{
                    backgroundColor: '#FFF7F2',
                    borderColor: '#FFD6C4',
                    borderWidth: 1.5,
                    borderRadius: 24,
                    padding: 16,
                    marginBottom: 20,
                    shadowColor: '#FF6B35',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.12,
                    shadowRadius: 10,
                    elevation: 3,
                  }}
                >
                  {/* Top Bar: Pulsing indicator + Title & Status Badge */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                      {/* Pulse Live Dot */}
                      <View style={{ width: 18, height: 18, justifyContent: 'center', alignItems: 'center', marginRight: 6 }}>
                        <Animated.View
                          style={{
                            position: 'absolute',
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            backgroundColor: '#FF6B35',
                            opacity: pulseAnim,
                          }}
                        />
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: '#FF6B35',
                          }}
                        />
                      </View>
                      <Text
                        style={{
                          color: '#FF6B35',
                          fontWeight: '900',
                          fontSize: 11,
                          letterSpacing: 0.8,
                          textTransform: 'uppercase',
                        }}
                        numberOfLines={1}
                      >
                        Live Order Tracking
                      </Text>
                    </View>

                    <Badge label={activeDeliveryOrder.status} variant={getVariant(activeDeliveryOrder.status)} />
                  </View>

                  {/* Step Progress Tracker Bar */}
                  <View style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                      {[1, 2, 3, 4].map((step) => {
                        const isCurrentOrPassed = getActiveStep(activeDeliveryOrder.status) >= step;
                        return (
                          <View
                            key={step}
                            style={{
                              flex: 1,
                              height: 5,
                              borderRadius: 3,
                              backgroundColor: isCurrentOrPassed ? '#FF6B35' : '#FED7AA',
                            }}
                          />
                        );
                      })}
                    </View>
                    <Text
                      style={{
                        color: '#6B7280',
                        fontSize: 11,
                        fontWeight: '600',
                      }}
                      numberOfLines={1}
                    >
                      {getStatusSubtitle(activeDeliveryOrder.status)}
                    </Text>
                  </View>

                  {/* Inner White Card */}
                  <View
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: '#FFE8DE',
                      padding: 14,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.04,
                      shadowRadius: 4,
                      elevation: 1,
                    }}
                  >
                    {/* Order details row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                          <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, marginRight: 6 }}>
                            <Text style={{ color: '#1A1A2E', fontWeight: '800', fontSize: 11 }}>
                              #{activeDeliveryOrder.orderNumber || activeDeliveryOrder.id.slice(-6).toUpperCase()}
                            </Text>
                          </View>
                          <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700' }}>
                            {activeDeliveryOrder.createdAt
                              ? new Date(activeDeliveryOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </Text>
                        </View>
                        <Text style={{ color: '#374151', fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
                          👨‍🍳 {activeDeliveryOrder.cookName || 'Home Kitchen'}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: '#9CA3AF', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Total Amount
                        </Text>
                        <Text style={{ color: '#FF6B35', fontSize: 14, fontWeight: '900' }}>
                          LKR {activeDeliveryOrder.totalAmount?.toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    {/* Meal items preview if available */}
                    {activeDeliveryOrder.items && activeDeliveryOrder.items.length > 0 && (
                      <View style={{ backgroundColor: '#F9FAFB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginBottom: 10 }}>
                        <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
                          {activeDeliveryOrder.items.map((i: any) => `${i.name} (×${i.quantity || 1})`).join(' • ')}
                        </Text>
                      </View>
                    )}

                    {/* Track Live Order Button */}
                    <TouchableOpacity
                      onPress={() => safeNavigate('OrderTracking', { orderId: activeDeliveryOrder.id })}
                      style={{
                        backgroundColor: '#FF6B35',
                        borderRadius: 14,
                        paddingVertical: 11,
                        paddingHorizontal: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#FF6B35',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.25,
                        shadowRadius: 5,
                        elevation: 2,
                      }}
                      activeOpacity={0.85}
                    >
                      <Feather name="navigation" size={14} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                        Track Live Delivery
                      </Text>
                      <Feather name="chevron-right" size={15} color="#FFFFFF" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <View className="bg-white rounded-3xl p-5 mb-4 border border-gray-150 shadow-sm">
                {/* Order Card Header */}
                <View className="flex-row justify-between items-start mb-2.5 pb-2.5 border-b border-gray-100">
                  <View>
                    <Text className="text-textPrimary font-black text-sm">
                      #{item.orderNumber || item.id.slice(-6).toUpperCase()}
                    </Text>
                    <Text className="text-textMuted text-[10px] font-bold mt-0.5">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString('en-LK', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : ''}
                    </Text>
                  </View>
                  <Badge label={item.status} variant={getVariant(item.status)} />
                </View>

                {/* Cook & Items Details */}
                <View className="mb-3">
                  <Text className="text-textSecondary text-xs font-bold mb-1">
                    👨‍🍳 Kitchen: {item.cookName || 'Home Cook'}
                  </Text>
                  <Text className="text-textMuted text-xs font-medium leading-relaxed" numberOfLines={2}>
                    {(item.items || []).map((meal: any) => `${meal.name} (×${meal.quantity})`).join(' • ')}
                  </Text>
                </View>

                {/* Price & Action Buttons */}
                <View className="flex-row justify-between items-center pt-3 border-t border-gray-100">
                  <View className="flex-1 mr-2">
                    <Text className="text-textMuted text-[9px] font-black uppercase tracking-wider">Total Amount</Text>
                    <Text className="text-primary font-black text-base">LKR {item.totalAmount?.toLocaleString()}</Text>
                  </View>

                  <View className="flex-row items-center gap-2">
                    {ACTIVE_STATUSES.includes(item.status) && (
                      <TouchableOpacity
                        key="btn-track"
                        onPress={() => safeNavigate('OrderTracking', { orderId: item.id })}
                        className="px-3.5 py-2.5 rounded-xl border border-primary/30 bg-primary/10 flex-row items-center gap-1.5 shadow-xs"
                        activeOpacity={0.7}
                      >
                        <Feather name="navigation" size={13} color="#FF6B35" />
                        <Text className="text-primary font-extrabold text-xs">Track Order</Text>
                      </TouchableOpacity>
                    )}
                    {item.status === 'DELIVERED' && (
                      <TouchableOpacity
                        key="btn-reorder"
                        onPress={() => handleReorder(item)}
                        className="px-3.5 py-2.5 rounded-xl bg-primary flex-row items-center gap-1.5 shadow-xs"
                        activeOpacity={0.7}
                      >
                        <Feather name="refresh-cw" size={13} color="#FFFFFF" />
                        <Text className="text-white font-extrabold text-xs">Reorder</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      key="btn-receipt"
                      onPress={() => setSelectedReceiptOrder(item)}
                      className="px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 flex-row items-center gap-1.5 shadow-xs"
                      activeOpacity={0.7}
                    >
                      <Feather name="file-text" size={13} color="#1A1A2E" />
                      <Text className="text-textPrimary font-extrabold text-xs">View Receipt</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </View>

      {/* Order Receipt Modal */}
      <OrderReceiptModal
        visible={!!selectedReceiptOrder}
        order={selectedReceiptOrder}
        onClose={() => setSelectedReceiptOrder(null)}
      />
    </View>
  );
};
