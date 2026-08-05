import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ActivityIndicator, ScrollView,
  TouchableOpacity, Modal, Alert, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { Feather, Ionicons } from '@expo/vector-icons';

// Types
type ActiveModal = 'addresses' | 'dietary' | 'wallet' | 'help' | 'orders' | null;

const DIETARY_OPTIONS = [
  'Vegan', 'Vegetarian', 'Gluten-Free',
  'Nut-Free', 'Dairy-Free', 'Halal', 'Low-Carb',
];

const FAQ_ITEMS = [
  { q: 'How are home cooks verified?', a: 'All cooks go through a hygiene inspection and identity check before listing on NeighborPlates.' },
  { q: 'Can I cancel an order?', a: 'Orders can be cancelled within 5 minutes of placing if the cook has not accepted yet.' },
  { q: 'How do I report a food safety issue?', a: 'Tap "Report" on any order or reach us at support@neighborplates.lk.' },
  { q: 'What payment methods are supported?', a: 'We support bank cards (via Stripe) and cash on delivery for selected cooks.' },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PLACED:     { bg: 'bg-primary/10',   text: 'text-primary-dark', label: '🕐 Placed' },
  ACCEPTED:   { bg: 'bg-blue-50',      text: 'text-blue-700',   label: '✅ Accepted' },
  PREPARING:  { bg: 'bg-amber-50',     text: 'text-amber-700',  label: '👨‍🍳 Preparing' },
  READY:      { bg: 'bg-yellow-50',    text: 'text-yellow-700', label: '🍱 Ready' },
  DELIVERING: { bg: 'bg-indigo-50',    text: 'text-indigo-700', label: '🚴 On the Way' },
  DELIVERED:  { bg: 'bg-green-50',     text: 'text-green-700',  label: '🎉 Delivered' },
  CANCELLED:  { bg: 'bg-red-50',       text: 'text-red-750',    label: '✕ Cancelled' },
};

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { logout } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // Dietary state
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);

  // Address state
  const [newAddress, setNewAddress] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<string[]>([
    'Home – 45/B, Flower Road, Colombo 3',
  ]);

  // FAQ accordion
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Orders state
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/users/profile');
      setProfile(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const response = await api.get('/api/orders/my');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProfile();
      if (activeModal === 'orders') {
        fetchOrders();
      }
    });
    return unsubscribe;
  }, [navigation, activeModal, fetchOrders]);

  const openModal = (modal: ActiveModal) => {
    setActiveModal(modal);
    if (modal === 'orders') fetchOrders();
  };

  const toggleDiet = (diet: string) =>
    setSelectedDiets(prev =>
      prev.includes(diet) ? prev.filter(d => d !== diet) : [...prev, diet]
    );

  const addAddress = () => {
    if (!newAddress.trim()) {
      Alert.alert('Required Field', 'Please enter a valid address to save.');
      return;
    }
    setSavedAddresses(prev => [...prev, newAddress.trim()]);
    setNewAddress('');
  };

  const deleteAddress = (index: number) => {
    Alert.alert('Remove Address', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => setSavedAddresses(prev => prev.filter((_, i) => i !== index)),
      },
    ]);
  };

  const getInitials = (nameStr: string) => {
    return nameStr ? nameStr.charAt(0).toUpperCase() : 'N';
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-elevated">
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  // Settings Menu List item renderer with Feather icon support
  const renderMenuItem = (
    iconName: keyof typeof Feather.glyphMap,
    title: string,
    subtitle: string,
    modal: ActiveModal,
    isLast = false,
  ) => (
    <TouchableOpacity
      onPress={() => openModal(modal)}
      className={`flex-row items-center justify-between p-4 bg-white ${!isLast ? 'border-b border-gray-50' : ''}`}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center flex-1 mr-2">
        <View className="w-10 h-10 bg-primary/5 rounded-2xl items-center justify-center mr-4 border border-primary/10">
          <Feather name={iconName} size={16} color="#FF6B35" />
        </View>
        <View className="flex-1">
          <Text className="text-textPrimary font-extrabold text-xs">{title}</Text>
          <Text className="text-textSecondary text-[10px] mt-0.5 font-medium">{subtitle}</Text>
        </View>
      </View>
      <Feather name="chevron-right" size={16} color="#9CA3AF" />
    </TouchableOpacity>
  );

  // Modal Wrapper with dynamic height fit and scrolling support
  const ModalWrapper = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Modal visible={activeModal !== null} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/60">
        <View className="bg-white rounded-t-[32px] w-full max-h-[85%] border-t border-gray-150 flex-col">
          {/* Pull indicator */}
          <View className="items-center pt-3 pb-1">
            <View className="w-12 h-1.5 rounded-full bg-gray-200" />
          </View>
          
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
            <Text className="text-textPrimary font-black text-lg">{title}</Text>
            <TouchableOpacity
              onPress={() => setActiveModal(null)}
              className="bg-gray-100 rounded-full w-8 h-8 items-center justify-center border border-gray-150"
            >
              <Feather name="x" size={14} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          {/* Scroll container wrapper */}
          <View className="flex-grow shrink min-h-0">
            <ScrollView 
              contentContainerStyle={{ padding: 24, paddingBottom: 48 }} 
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Orders List Modal
  const OrdersModal = () => (
    <ModalWrapper title="My Orders">
      {ordersLoading ? (
        <View className="py-12 items-center">
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text className="text-textMuted text-xs mt-3">Loading orders...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View className="py-12 items-center">
          <Text className="text-5xl mb-4">🍽️</Text>
          <Text className="text-textPrimary font-bold text-base mb-1">No orders yet</Text>
          <Text className="text-textMuted text-xs text-center px-6 leading-relaxed">
            Place your first home-cooked order from the listings screen to see it tracked here!
          </Text>
        </View>
      ) : (
        <>
          {orders.map((order) => {
            const statusInfo = STATUS_STYLES[order.status] ?? STATUS_STYLES['PLACED'];
            return (
              <TouchableOpacity 
                key={order.id} 
                onPress={() => {
                  setActiveModal(null);
                  navigation.navigate('OrderTracking', { orderId: order.id });
                }}
                className="bg-white rounded-3xl border border-gray-150 p-4 mb-3.5 shadow-sm active:opacity-80"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center justify-between mb-2 pb-2 border-b border-gray-50">
                  <Text className="text-textPrimary font-black text-xs">#{order.orderNumber || order.id.slice(-6).toUpperCase()}</Text>
                  <View className={`rounded-full px-2.5 py-0.5 ${statusInfo.bg}`}>
                    <Text className={`text-[9px] font-black uppercase ${statusInfo.text}`}>{statusInfo.label}</Text>
                  </View>
                </View>
                <Text className="text-textSecondary text-xs mb-3 font-semibold" numberOfLines={2}>
                  {order.items?.map((item: any) => `${item.name} ×${item.quantity}`).join(' • ')}
                </Text>
                <View className="flex-row justify-between items-center">
                  <Text className="text-textMuted text-[10px] font-bold">
                    {new Date(order.createdAt).toLocaleDateString('en-LK', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </Text>
                  <Text className="text-primary font-black text-sm">LKR {order.totalAmount}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      )}
    </ModalWrapper>
  );

  // Delivery Addresses Modal
  const AddressesModal = () => (
    <ModalWrapper title="Delivery Places">
      {savedAddresses.map((addr, i) => (
        <View key={i} className="flex-row items-center justify-between bg-gray-50 rounded-2xl p-4 mb-3 border border-gray-200">
          <View className="flex-1 mr-3">
            <Text className="text-textSecondary text-[9px] font-black uppercase tracking-wider mb-0.5">
              {i === 0 ? 'DEFAULT HOME' : `SAVED PLACE ${i + 1}`}
            </Text>
            <Text className="text-textPrimary font-semibold text-xs leading-relaxed">{addr}</Text>
          </View>
          <TouchableOpacity onPress={() => deleteAddress(i)} className="bg-red-50 rounded-xl p-2 border border-red-150">
            <Feather name="trash-2" size={14} color="#EF4444" />
          </TouchableOpacity>
        </View>
      ))}
      <View className="bg-gray-50 rounded-3xl p-5 border border-gray-200 mt-4">
        <Text className="text-textSecondary text-[10px] font-black uppercase tracking-wider mb-3">Add New Address</Text>
        <TextInput
          value={newAddress}
          onChangeText={setNewAddress}
          placeholder="e.g. Office – 12, Galle Road, Colombo 6"
          placeholderTextColor="#9CA3AF"
          className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs text-textPrimary mb-4"
        />
        <TouchableOpacity onPress={addAddress} className="bg-primary rounded-xl py-3.5 items-center shadow-sm" activeOpacity={0.8}>
          <Text className="text-white font-extrabold text-xs tracking-wider uppercase">+ SAVE NEW PLACE</Text>
        </TouchableOpacity>
      </View>
    </ModalWrapper>
  );

  // Dietary preferences selection
  const DietaryModal = () => (
    <ModalWrapper title="Dietary Preferences">
      <Text className="text-textSecondary text-xs mb-5 leading-relaxed font-medium">
        Select your dietary tags — we will filter the neighborhood menus to match your choices automatically.
      </Text>
      <View className="flex-row flex-wrap gap-2.5 mb-6">
        {DIETARY_OPTIONS.map(diet => {
          const selected = selectedDiets.includes(diet);
          return (
            <TouchableOpacity
              key={diet}
              onPress={() => toggleDiet(diet)}
              className={`px-4 py-2.5 rounded-full border ${selected ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}
              activeOpacity={0.7}
            >
              <Text className={`text-xs font-bold ${selected ? 'text-white' : 'text-textSecondary'}`}>
                {diet}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        onPress={() => { Alert.alert('Saved!', 'Preferences updated.'); setActiveModal(null); }}
        className="bg-primary rounded-xl py-3.5 items-center shadow-md"
        activeOpacity={0.8}
      >
        <Text className="text-white font-extrabold text-xs tracking-wider uppercase">SAVE PREFERENCES</Text>
      </TouchableOpacity>
    </ModalWrapper>
  );

  // Wallet and payment references
  const WalletModal = () => (
    <ModalWrapper title="Wallet & Credits">
      <View className="bg-gradient-to-tr from-orange-500 to-amber-600 rounded-3xl p-6 mb-5 shadow-lg relative overflow-hidden">
        <View className="absolute w-32 h-32 rounded-full bg-white/10 -top-10 -right-10" />
        <View className="absolute w-24 h-24 rounded-full bg-white/5 bottom-0 left-5" />
        <Text className="text-white/70 text-[9px] font-black uppercase tracking-widest mb-1">NP Wallet Balance</Text>
        <Text className="text-white font-black text-3xl mb-2">LKR 1,250</Text>
        <Text className="text-white/70 text-[10px] font-semibold">Support local home kitchens securely</Text>
      </View>
      
      <Text className="text-textSecondary text-[9px] font-black uppercase tracking-wider mb-3">Saved Bank Cards</Text>
      {[
        { icon: 'credit-card', label: 'Sampath Bank – ****4821', type: 'Credit Card' },
      ].map((pm, i) => (
        <View key={i} className="flex-row items-center bg-gray-50 rounded-2xl p-4 mb-3 border border-gray-150">
          <View className="w-10 h-10 bg-white rounded-xl items-center justify-center mr-4 border border-gray-200">
            <Feather name={pm.icon as any} size={16} color="#6B7280" />
          </View>
          <View className="flex-1">
            <Text className="text-textPrimary font-bold text-xs">{pm.label}</Text>
            <Text className="text-textMuted text-[10px] font-medium mt-0.5">{pm.type}</Text>
          </View>
          <View className="bg-secondary/10 rounded-full px-2.5 py-0.5">
            <Text className="text-secondary text-[8px] font-black">ACTIVE</Text>
          </View>
        </View>
      ))}
      <TouchableOpacity
        className="bg-gray-50 border border-gray-200 border-dashed rounded-2xl py-4 items-center mt-2"
        activeOpacity={0.7}
        onPress={() => Alert.alert('Coming Soon', 'Card additions are handled securely during your next order checkout.')}
      >
        <Text className="text-textSecondary font-bold text-xs">+ Add payment card</Text>
      </TouchableOpacity>
    </ModalWrapper>
  );

  // FAQ Modal
  const HelpModal = () => (
    <ModalWrapper title="Help Center">
      <Text className="text-textSecondary text-xs font-bold uppercase tracking-wider mb-4">FAQ Support</Text>
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = expandedFaq === i;
        return (
          <TouchableOpacity
            key={i}
            onPress={() => setExpandedFaq(isOpen ? null : i)}
            className="bg-gray-50 rounded-2xl border border-gray-150 mb-3 overflow-hidden"
            activeOpacity={0.8}
          >
            <View className="flex-row items-center justify-between p-4">
              <Text className="text-textPrimary font-bold text-xs flex-1 mr-3 leading-relaxed">{item.q}</Text>
              <Feather name={isOpen ? "minus" : "plus"} size={14} color="#FF6B35" />
            </View>
            {isOpen && (
              <View className="px-4 pb-4 border-t border-gray-100/50">
                <Text className="text-textSecondary text-xs leading-relaxed mt-3 font-medium">{item.a}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity
        className="bg-primary/5 border border-primary/10 rounded-xl py-3.5 items-center mt-2.5 flex-row justify-center gap-2"
        activeOpacity={0.7}
        onPress={() => Alert.alert('Contact Support', 'Email us at support@neighborplates.lk')}
      >
        <Feather name="mail" size={14} color="#FF6B35" />
        <Text className="text-primary font-extrabold text-xs uppercase tracking-wide">Write Support Ticket</Text>
      </TouchableOpacity>
    </ModalWrapper>
  );

  const activeOrdersCount = orders.filter(
    o => !['DELIVERED', 'CANCELLED'].includes(o.status)
  ).length;

  return (
    <View className="flex-1 bg-surface-elevated relative">
      {/* Active Modals */}
      {activeModal === 'orders'    && <OrdersModal />}
      {activeModal === 'addresses' && <AddressesModal />}
      {activeModal === 'dietary'   && <DietaryModal />}
      {activeModal === 'wallet'    && <WalletModal />}
      {activeModal === 'help'      && <HelpModal />}

      {/* Liquid Background Blobs */}
      <View className="absolute w-72 h-72 rounded-full bg-primary/5 -top-20 -left-20 blur-3xl opacity-40" />
      <View className="absolute w-80 h-80 rounded-full bg-secondary/5 top-80 -right-20 blur-3xl opacity-30" />

      {/* Header Panel */}
      <View className="bg-white px-6 pt-12 pb-4 border-b border-gray-100 shadow-sm z-10">
        <Text className="font-black text-xl text-textPrimary">My Profile</Text>
        <Text className="text-textSecondary text-[10px] mt-0.5 font-bold uppercase tracking-wider">Account preferences</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View className="bg-white rounded-3xl p-5 mb-5 shadow-sm border border-gray-100 items-center relative overflow-hidden">
          <View className="w-16 h-16 rounded-full bg-orange-100 border border-orange-200 items-center justify-center shadow-inner mb-3">
            <Text className="text-primary-dark font-black text-xl">{getInitials(profile?.profile?.name)}</Text>
          </View>
          <Text className="font-extrabold text-lg text-textPrimary mb-1">
            {profile?.profile?.name || 'Neighbor'}
          </Text>
          <Text className="text-textSecondary text-xs mb-4 font-semibold">{profile?.email}</Text>
          <View className="border border-primary/20 rounded-full px-3 py-1 flex-row items-center bg-primary/5 gap-1 shadow-xs">
            <Ionicons name="shield-checkmark" size={10} color="#FF6B35" />
            <Text className="font-black text-[8px] uppercase tracking-wider text-primary">👑 Premium Gourmet</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View className="flex-row justify-between mb-5 gap-3">
          <View className="flex-1 bg-white border border-gray-100 rounded-3xl p-4 items-center shadow-sm">
            <Text className="font-black text-lg mb-0.5 text-textPrimary">{profile?.stats?.totalOrders || 0}</Text>
            <Text className="text-[8px] font-black uppercase tracking-wider text-textSecondary">📦 Orders</Text>
          </View>
          <View className="flex-1 bg-white border border-gray-100 rounded-3xl p-4 items-center shadow-sm">
            <Text className="font-black text-lg mb-0.5 text-textPrimary">{profile?.favorites?.length || 0}</Text>
            <Text className="text-[8px] font-black uppercase tracking-wider text-textSecondary">❤️ Favorites</Text>
          </View>
          <View className="flex-1 bg-white border border-gray-100 rounded-3xl p-4 items-center shadow-sm">
            <Text className="font-black text-lg mb-0.5 text-textPrimary">
              {profile?.stats?.avgRating > 0 ? profile.stats.avgRating.toFixed(1) : '5.0'}
            </Text>
            <Text className="text-[8px] font-black uppercase tracking-wider text-textSecondary">⭐ Rating</Text>
          </View>
        </View>

        {/* Orders History Quick Access */}
        <TouchableOpacity
          onPress={() => openModal('orders')}
          className="bg-white border border-gray-150 rounded-3xl p-4 mb-5 flex-row items-center justify-between shadow-sm relative"
          activeOpacity={0.8}
        >
          {activeOrdersCount > 0 && (
            <View className="absolute -top-1.5 -right-1.5 bg-primary rounded-full w-5 h-5 items-center justify-center z-10 border border-white">
              <Text className="text-white font-black text-[9px]">{activeOrdersCount}</Text>
            </View>
          )}
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-11 h-11 bg-primary/5 rounded-2xl items-center justify-center mr-4 border border-primary/10">
              <Feather name="shopping-bag" size={16} color="#FF6B35" />
            </View>
            <View className="flex-1">
              <Text className="text-textPrimary font-extrabold text-sm">Order History</Text>
              <Text className="text-textSecondary text-[10px] mt-0.5 font-semibold">Check orders and live statuses</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Menu List */}
        <View className="border border-gray-150 rounded-3xl overflow-hidden mb-6 shadow-sm">
          {renderMenuItem("map-pin",       "Delivery Addresses",   "Manage home, work, and saved places",       'addresses')}
          {renderMenuItem("heart",         "Dietary Preferences", "Filter meals by vegan, allergen-free tags",  'dietary')}
          {renderMenuItem("credit-card",   "Wallet & Payments",   "Manage payment details and credits",         'wallet')}
          {renderMenuItem("help-circle",   "Help & Support",      "View FAQs and contact our team",            'help', true)}
        </View>

        {/* Log Out */}
        <TouchableOpacity
          onPress={logout}
          className="w-full border rounded-2xl py-3.5 items-center justify-center flex-row shadow-sm bg-red-50 border-red-200 active:bg-red-100"
          activeOpacity={0.8}
        >
          <Feather name="log-out" size={14} color="#EF4444" className="mr-2" />
          <Text className="font-extrabold text-xs tracking-wider uppercase text-red-500">LOG OUT</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};
