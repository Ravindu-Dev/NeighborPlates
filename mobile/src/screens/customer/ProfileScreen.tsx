import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ActivityIndicator, ScrollView,
  TouchableOpacity, Modal, Alert, TextInput,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
type ActiveModal = 'addresses' | 'dietary' | 'wallet' | 'help' | 'orders' | null;

const DIETARY_OPTIONS = [
  'Vegan', 'Vegetarian', 'Gluten-Free',
  'Nut-Free', 'Dairy-Free', 'Halal', 'Low-Carb',
];

const FAQ_ITEMS = [
  { q: 'How are home cooks verified?', a: 'All cooks go through a hygiene inspection and identity check before listing on NeighborPlates.' },
  { q: 'Can I cancel an order?', a: 'Orders can be cancelled within 5 minutes of placing if the cook has not accepted yet.' },
  { q: 'How do I report a food safety issue?', a: 'Tap "Report" on any order or reach us at support@neighborplates.lk.' },
  { q: 'What payment methods are supported?', a: 'We support wallet credits, bank cards, and cash on delivery for selected cooks.' },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PLACED:     { bg: 'bg-primary/10',   text: 'text-primary',    label: '🕐 Placed' },
  ACCEPTED:   { bg: 'bg-blue-50',      text: 'text-blue-600',   label: '✅ Accepted' },
  PREPARING:  { bg: 'bg-amber-50',     text: 'text-amber-600',  label: '👨‍🍳 Preparing' },
  READY:      { bg: 'bg-yellow-50',    text: 'text-yellow-600', label: '🍱 Ready' },
  DELIVERING: { bg: 'bg-indigo-50',    text: 'text-indigo-600', label: '🚴 On the Way' },
  DELIVERED:  { bg: 'bg-green-50',     text: 'text-green-600',  label: '🎉 Delivered' },
  CANCELLED:  { bg: 'bg-red-50',       text: 'text-red-500',    label: '✕ Cancelled' },
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const ProfileScreen: React.FC = () => {
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

  // ── Fetch Profile ─────────────────────────────────────────────────────────
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

  // ── Fetch Orders ──────────────────────────────────────────────────────────
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
  }, []);

  // Opens a modal; fetches orders when opening orders modal
  const openModal = (modal: ActiveModal) => {
    setActiveModal(modal);
    if (modal === 'orders') fetchOrders();
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toggleDiet = (diet: string) =>
    setSelectedDiets(prev =>
      prev.includes(diet) ? prev.filter(d => d !== diet) : [...prev, diet]
    );

  const addAddress = () => {
    if (!newAddress.trim()) return;
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

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-elevated">
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  // ─── Menu Item ──────────────────────────────────────────────────────────────
  const renderMenuItem = (
    icon: string,
    title: string,
    subtitle: string,
    modal: ActiveModal,
    isLast = false,
  ) => (
    <TouchableOpacity
      onPress={() => openModal(modal)}
      className={`flex-row items-center justify-between p-4 ${!isLast ? 'border-b border-gray-100' : ''}`}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center flex-1">
        <View className="w-10 h-10 bg-white/70 rounded-xl items-center justify-center mr-4 border border-gray-100 shadow-inner">
          <Text className="text-lg">{icon}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-textPrimary font-bold text-sm">{title}</Text>
          <Text className="text-textSecondary text-xs mt-0.5">{subtitle}</Text>
        </View>
      </View>
      <Text className="text-gray-400 text-lg">›</Text>
    </TouchableOpacity>
  );

  // ─── Modal Wrapper ──────────────────────────────────────────────────────────
  const ModalWrapper = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Modal visible={activeModal !== null} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white rounded-t-3xl" style={{ maxHeight: '85%' }}>
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-gray-200" />
          </View>
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
            <Text className="text-textPrimary font-black text-lg">{title}</Text>
            <TouchableOpacity
              onPress={() => setActiveModal(null)}
              className="bg-gray-100 rounded-full w-8 h-8 items-center justify-center"
            >
              <Text className="text-textSecondary font-bold text-sm">✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // ─── My Orders Modal ────────────────────────────────────────────────────────
  const OrdersModal = () => (
    <ModalWrapper title="📦 My Orders">
      {ordersLoading ? (
        <View className="py-12 items-center">
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text className="text-textMuted text-xs mt-3">Loading your orders...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View className="py-12 items-center">
          <Text className="text-4xl mb-3">🍽️</Text>
          <Text className="text-textPrimary font-bold text-base mb-1">No orders yet</Text>
          <Text className="text-textMuted text-xs text-center px-6">
            Place your first order from the home feed to see it here!
          </Text>
        </View>
      ) : (
        <>
          {orders.map((order) => {
            const statusInfo = STATUS_STYLES[order.status] ?? STATUS_STYLES['PLACED'];
            return (
              <View key={order.id} className="bg-surface-elevated rounded-2xl border border-gray-100 p-4 mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-textPrimary font-extrabold text-sm">{order.orderNumber}</Text>
                  <View className={`rounded-full px-3 py-1 ${statusInfo.bg}`}>
                    <Text className={`text-[10px] font-bold ${statusInfo.text}`}>{statusInfo.label}</Text>
                  </View>
                </View>
                <Text className="text-textSecondary text-xs mb-2" numberOfLines={2}>
                  {order.items?.map((item: any) => `${item.name} ×${item.quantity}`).join(' • ')}
                </Text>
                <View className="flex-row justify-between items-center border-t border-gray-100 pt-2 mt-1">
                  <Text className="text-textMuted text-xs">
                    {new Date(order.createdAt).toLocaleDateString('en-LK', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </Text>
                  <Text className="text-primary font-black text-sm">LKR {order.totalAmount}</Text>
                </View>
              </View>
            );
          })}
        </>
      )}
    </ModalWrapper>
  );

  // ─── View Cart Modal ────────────────────────────────────────────────────────
  const CartModal = () => (
    <ModalWrapper title="🛒 Your Cart">
      <View className="py-10 items-center">
        <Text className="text-5xl mb-4">🛒</Text>
        <Text className="text-textPrimary font-black text-base mb-2">Your cart is empty</Text>
        <Text className="text-textSecondary text-xs text-center px-8 mb-6 leading-relaxed">
          Browse meals from local home cooks and add items to your cart to order!
        </Text>
        <TouchableOpacity
          onPress={() => setActiveModal(null)}
          className="bg-primary rounded-2xl px-8 py-3 items-center"
          activeOpacity={0.8}
        >
          <Text className="text-white font-extrabold text-sm tracking-wide">Browse Meals 🍛</Text>
        </TouchableOpacity>
      </View>
    </ModalWrapper>
  );

  // ─── Delivery Addresses Modal ───────────────────────────────────────────────
  const AddressesModal = () => (
    <ModalWrapper title="📍 Delivery Addresses">
      {savedAddresses.map((addr, i) => (
        <View key={i} className="flex-row items-center justify-between bg-surface-elevated rounded-2xl p-4 mb-3 border border-gray-100">
          <View className="flex-1 mr-3">
            <Text className="text-textSecondary text-[10px] font-bold uppercase tracking-wider mb-0.5">
              {i === 0 ? 'HOME' : `ADDRESS ${i + 1}`}
            </Text>
            <Text className="text-textPrimary font-semibold text-sm">{addr}</Text>
          </View>
          <TouchableOpacity onPress={() => deleteAddress(i)} className="bg-red-50 rounded-xl p-2 border border-red-100">
            <Text className="text-red-500 text-xs font-bold">✕</Text>
          </TouchableOpacity>
        </View>
      ))}
      <View className="bg-surface-elevated rounded-2xl p-4 border border-gray-100 mt-2">
        <Text className="text-textSecondary text-xs font-bold uppercase tracking-wider mb-3">Add New Address</Text>
        <TextInput
          value={newAddress}
          onChangeText={setNewAddress}
          placeholder="e.g. Office – 12, Galle Road, Colombo 6"
          placeholderTextColor="#9CA3AF"
          className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-textPrimary mb-3"
        />
        <TouchableOpacity onPress={addAddress} className="bg-primary rounded-xl py-3 items-center" activeOpacity={0.8}>
          <Text className="text-white font-extrabold text-sm tracking-wide">+ Save Address</Text>
        </TouchableOpacity>
      </View>
    </ModalWrapper>
  );

  // ─── Dietary Modal ──────────────────────────────────────────────────────────
  const DietaryModal = () => (
    <ModalWrapper title="🥗 Dietary Preferences">
      <Text className="text-textSecondary text-sm mb-5 leading-relaxed">
        Select your dietary preferences — these help NeighborPlates surface the right meals for you.
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-6">
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
        onPress={() => { Alert.alert('Saved!', 'Your dietary preferences have been updated.'); setActiveModal(null); }}
        className="bg-primary rounded-xl py-3 items-center"
        activeOpacity={0.8}
      >
        <Text className="text-white font-extrabold text-sm tracking-wide">Save Preferences</Text>
      </TouchableOpacity>
    </ModalWrapper>
  );

  // ─── Wallet Modal ───────────────────────────────────────────────────────────
  const WalletModal = () => (
    <ModalWrapper title="💳 Wallet & Payments">
      <View className="bg-primary rounded-3xl p-6 mb-5 relative overflow-hidden">
        <View className="absolute w-32 h-32 rounded-full bg-white/10 -top-10 -right-10" />
        <View className="absolute w-24 h-24 rounded-full bg-white/5 bottom-0 left-5" />
        <Text className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">NP Wallet Balance</Text>
        <Text className="text-white font-black text-4xl mb-2">LKR 1,250</Text>
        <Text className="text-white/60 text-xs">Last topped up: 28 July 2026</Text>
      </View>
      <Text className="text-textSecondary text-[10px] font-bold uppercase tracking-wider mb-3">Saved Payment Methods</Text>
      {[
        { icon: '🏦', label: 'Sampath Bank – ****4821', type: 'Bank Card' },
        { icon: '💰', label: 'NP Wallet Credits', type: 'Wallet' },
      ].map((pm, i) => (
        <View key={i} className="flex-row items-center bg-surface-elevated rounded-2xl p-4 mb-3 border border-gray-100">
          <View className="w-10 h-10 bg-white rounded-xl items-center justify-center mr-4 border border-gray-100">
            <Text className="text-lg">{pm.icon}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-textPrimary font-bold text-sm">{pm.label}</Text>
            <Text className="text-textMuted text-xs">{pm.type}</Text>
          </View>
          <View className="bg-secondary/10 rounded-full px-2 py-1">
            <Text className="text-secondary text-[9px] font-bold">ACTIVE</Text>
          </View>
        </View>
      ))}
      <TouchableOpacity
        className="bg-surface-elevated border border-gray-200 border-dashed rounded-2xl py-4 items-center mt-2"
        activeOpacity={0.7}
        onPress={() => Alert.alert('Coming Soon', 'Adding new payment methods will be available in the next update.')}
      >
        <Text className="text-textSecondary font-bold text-sm">+ Add Payment Method</Text>
      </TouchableOpacity>
    </ModalWrapper>
  );

  // ─── Help Modal ─────────────────────────────────────────────────────────────
  const HelpModal = () => (
    <ModalWrapper title="🛡️ Help & Support">
      <Text className="text-textSecondary text-xs font-bold uppercase tracking-wider mb-4">Frequently Asked Questions</Text>
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = expandedFaq === i;
        return (
          <TouchableOpacity
            key={i}
            onPress={() => setExpandedFaq(isOpen ? null : i)}
            className="bg-surface-elevated rounded-2xl border border-gray-100 mb-3 overflow-hidden"
            activeOpacity={0.8}
          >
            <View className="flex-row items-center justify-between p-4">
              <Text className="text-textPrimary font-bold text-sm flex-1 mr-3">{item.q}</Text>
              <Text className="text-primary font-bold text-base">{isOpen ? '−' : '+'}</Text>
            </View>
            {isOpen && (
              <View className="px-4 pb-4 border-t border-gray-100">
                <Text className="text-textSecondary text-sm leading-relaxed mt-3">{item.a}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity
        className="bg-primary/10 border border-primary/20 rounded-2xl py-4 items-center mt-2"
        activeOpacity={0.7}
        onPress={() => Alert.alert('Contact Support', 'Email us at support@neighborplates.lk')}
      >
        <Text className="text-primary font-extrabold text-sm">✉️  Contact Support</Text>
      </TouchableOpacity>
    </ModalWrapper>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  const activeOrdersCount = orders.filter(
    o => !['DELIVERED', 'CANCELLED'].includes(o.status)
  ).length;

  return (
    <View className="flex-1 relative bg-surface-elevated">
      {/* Active Modals */}
      {activeModal === 'orders'    && <OrdersModal />}
      {activeModal === 'addresses' && <AddressesModal />}
      {activeModal === 'dietary'   && <DietaryModal />}
      {activeModal === 'wallet'    && <WalletModal />}
      {activeModal === 'help'      && <HelpModal />}

      {/* Liquid Background Blobs */}
      <View className="absolute w-72 h-72 rounded-full bg-primary/10 -top-20 -left-20 blur-3xl opacity-40" />
      <View className="absolute w-80 h-80 rounded-full bg-secondary/8 top-80 -right-20 blur-3xl opacity-30" />
      <View className="absolute w-60 h-60 rounded-full bg-accent/8 bottom-20 -left-10 blur-3xl opacity-25" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingTop: 40, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Header */}
        <View className="mb-6">
          <Text className="font-black text-3xl tracking-tight text-textPrimary">My Profile</Text>
          <Text className="text-sm mt-1 text-textSecondary">Manage preferences and account settings</Text>
        </View>

        {/* Hero Card */}
        <View className="border rounded-3xl p-6 mb-6 shadow-xl items-center relative overflow-hidden bg-white/60 border-white/80">
          <View className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/5 opacity-30" />
          <View className="w-20 h-20 rounded-full items-center justify-center mb-4 border shadow-inner bg-primary/10 border-primary/20">
            <Text className="text-4xl">👤</Text>
          </View>
          <Text className="font-extrabold text-2xl mb-1 text-textPrimary">
            {profile?.profile?.name || 'Neighbor'}
          </Text>
          <Text className="text-xs mb-4 text-textSecondary">{profile?.email}</Text>
          <View className="border rounded-full px-4 py-1.5 flex-row items-center bg-primary/10 border-primary/20">
            <Text className="font-black text-[10px] uppercase tracking-widest text-primary">👑 Premium Gourmet</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View className="flex-row justify-between mb-6 gap-3">
          <View className="flex-1 border rounded-2xl p-4 items-center shadow-md bg-white/40 border-white/60">
            <Text className="font-black text-xl mb-1 text-textPrimary">{profile?.stats?.totalOrders || 0}</Text>
            <Text className="text-[9px] font-extrabold uppercase tracking-wider text-textSecondary">📦 Orders</Text>
          </View>
          <View className="flex-1 border rounded-2xl p-4 items-center shadow-md bg-white/40 border-white/60">
            <Text className="font-black text-xl mb-1 text-textPrimary">{profile?.favorites?.length || 0}</Text>
            <Text className="text-[9px] font-extrabold uppercase tracking-wider text-textSecondary">❤️ Favorites</Text>
          </View>
          <View className="flex-1 border rounded-2xl p-4 items-center shadow-md bg-white/40 border-white/60">
            <Text className="font-black text-xl mb-1 text-textPrimary">
              {profile?.stats?.avgRating > 0 ? profile.stats.avgRating.toFixed(1) : '5.0'}
            </Text>
            <Text className="text-[9px] font-extrabold uppercase tracking-wider text-textSecondary">⭐ Rating</Text>
          </View>
        </View>

        {/* ── My Orders Quick Access ── */}
        <TouchableOpacity
          onPress={() => openModal('orders')}
          className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-6 flex-row items-center relative"
          activeOpacity={0.75}
        >
          {activeOrdersCount > 0 && (
            <View className="absolute -top-2 -right-2 bg-primary rounded-full w-5 h-5 items-center justify-center z-10">
              <Text className="text-white font-black text-[9px]">{activeOrdersCount}</Text>
            </View>
          )}
          <View className="w-12 h-12 bg-white rounded-xl items-center justify-center mr-4 border border-primary/10 shadow-inner">
            <Text className="text-2xl">📦</Text>
          </View>
          <View className="flex-1">
            <Text className="text-primary font-extrabold text-sm">My Orders</Text>
            <Text className="text-primary/60 text-xs mt-0.5">View your order history & active orders</Text>
          </View>
          <Text className="text-primary/40 text-lg">›</Text>
        </TouchableOpacity>

        {/* Menu List */}
        <View className="border rounded-3xl overflow-hidden mb-6 shadow-lg bg-white/45 border-white/65">
          {renderMenuItem("📍", "Delivery Addresses",   "Manage home, work, and saved places",       'addresses')}
          {renderMenuItem("🥗", "Dietary Preferences", "Filter meals by vegan, allergen-free tags",  'dietary')}
          {renderMenuItem("💳", "Wallet & Payments",   "Manage payment details and credits",         'wallet')}
          {renderMenuItem("🛡️", "Help & Support",      "View FAQs and contact our team",            'help', true)}
        </View>

        {/* Log Out */}
        <TouchableOpacity
          onPress={logout}
          className="w-full border rounded-2xl py-4 items-center justify-center flex-row shadow-sm bg-red-50 border-red-200 active:bg-red-100"
          activeOpacity={0.7}
        >
          <Text className="font-extrabold text-sm tracking-widest mr-2 text-red-600">LOG OUT</Text>
          <Text className="text-red-600">🚪</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};
