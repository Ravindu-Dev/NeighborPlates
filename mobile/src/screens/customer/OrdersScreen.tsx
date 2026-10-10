import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, Animated, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { OrderReceiptModal } from '../../components/customer/OrderReceiptModal';
import { Feather, Ionicons } from '@expo/vector-icons';

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
            onPress={() => setActiveTab('all')}
            className={`flex-1 py-2.5 rounded-xl items-center justify-center flex-row gap-2 ${
              activeTab === 'all' ? 'bg-white shadow-sm border border-gray-200/60' : 'bg-transparent'
            }`}
            activeOpacity={0.8}
          >
            <Text className={`text-xs font-black ${activeTab === 'all' ? 'text-primary' : 'text-textSecondary'}`}>
              All Orders
            </Text>
            <View className={`px-2 py-0.5 rounded-full ${activeTab === 'all' ? 'bg-primary/10' : 'bg-gray-200/60'}`}>
              <Text className={`text-[10px] font-black ${activeTab === 'all' ? 'text-primary' : 'text-textMuted'}`}>
                {orders.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('past')}
            className={`flex-1 py-2.5 rounded-xl items-center justify-center flex-row gap-2 ${
              activeTab === 'past' ? 'bg-white shadow-sm border border-gray-200/60' : 'bg-transparent'
            }`}
            activeOpacity={0.8}
          >
            <Text className={`text-xs font-black ${activeTab === 'past' ? 'text-primary' : 'text-textSecondary'}`}>
              Past Orders
            </Text>
            <View className={`px-2 py-0.5 rounded-full ${activeTab === 'past' ? 'bg-primary/10' : 'bg-gray-200/60'}`}>
              <Text className={`text-[10px] font-black ${activeTab === 'past' ? 'text-primary' : 'text-textMuted'}`}>
                {pastOrdersCount}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text className="text-textMuted text-xs font-semibold mt-3">Fetching your orders...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View className="flex-1 justify-center items-center p-6">
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
          <View className="flex-1 justify-center items-center p-6">
            <Text className="text-4xl mb-3">📦</Text>
            <Text className="text-textPrimary font-black text-base text-center mb-1">No past orders found</Text>
            <Text className="text-textMuted text-xs text-center">
              Delivered and cancelled orders will appear in this list.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredOrders}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListHeaderComponent={
              /* Active Delivery Banner at top of All Orders tab */
              activeTab === 'all' && activeDeliveryOrder ? (
                <View className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 border border-primary/30 rounded-3xl p-5 mb-5 shadow-sm relative overflow-hidden">
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center gap-2">
                      <Animated.View
                        style={{ opacity: pulseAnim }}
                        className="w-3 h-3 rounded-full bg-primary shadow-xs"
                      />
                      <Text className="text-primary font-black text-xs uppercase tracking-wider">
                        Active Delivery In Progress
                      </Text>
                    </View>
                    <Badge label={activeDeliveryOrder.status} variant={getVariant(activeDeliveryOrder.status)} />
                  </View>

                  <View className="flex-row justify-between items-center bg-white/90 rounded-2xl p-3.5 border border-primary/10">
                    <View className="flex-1 mr-3">
                      <Text className="text-textPrimary font-black text-sm">
                        #{activeDeliveryOrder.orderNumber || activeDeliveryOrder.id.slice(-6).toUpperCase()}
                      </Text>
                      <Text className="text-textSecondary text-xs font-semibold mt-0.5" numberOfLines={1}>
                        👨‍🍳 Cook: {activeDeliveryOrder.cookName}
                      </Text>
                      <Text className="text-primary font-black text-xs mt-1">
                        LKR {activeDeliveryOrder.totalAmount?.toLocaleString()}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => safeNavigate('OrderTracking', { orderId: activeDeliveryOrder.id })}
                      className="px-4 py-2.5 rounded-xl bg-primary flex-row items-center gap-1.5 shadow-sm"
                      activeOpacity={0.8}
                    >
                      <Feather name="map-pin" size={13} color="#FFFFFF" />
                      <Text className="text-white font-extrabold text-xs">Track Live</Text>
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
                        onPress={() => safeNavigate('OrderTracking', { orderId: item.id })}
                        className="px-3.5 py-2.5 rounded-xl border border-primary/30 bg-primary/10 flex-row items-center gap-1.5 shadow-xs"
                        activeOpacity={0.7}
                      >
                        <Feather name="navigation" size={13} color="#FF6B35" />
                        <Text className="text-primary font-extrabold text-xs">Track Order</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
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
