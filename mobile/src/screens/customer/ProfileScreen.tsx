import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ActivityIndicator, ScrollView,
  TouchableOpacity, Modal, Alert, TextInput, Image,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useFavoriteStore } from '../../store/favoriteStore';
import { api } from '../../services/api';
import { Feather, Ionicons } from '@expo/vector-icons';
import { pickImageFromGallery, uploadImageToImgBB } from '../../services/imageService';
import { DropdownPicker } from '../../components/common/DropdownPicker';
import { DISTRICT_TOWN_DATA } from '../../constants/filterConstants';

// Types
type ActiveModal = 'addresses' | 'dietary' | 'wallet' | 'help' | 'orders' | 'editProfile' | 'changePassword' | 'favorites' | null;

const DIETARY_OPTIONS = [
  'Vegan', 'Vegetarian', 'Gluten-Free',
  'Nut-Free', 'Dairy-Free', 'Halal', 'Low-Carb',
];

const FAQ_ITEMS = [
  { q: 'How are home cooks verified?', a: 'All cooks go through hygiene inspection and identity verification before listing on NeighborPlates.' },
  { q: 'Can I cancel an order?', a: 'Orders can be cancelled within 5 minutes of placing if the cook has not yet accepted.' },
  { q: 'How do I report a food safety issue?', a: 'Tap "Report" on any order or contact our team directly at support@neighborplates.lk.' },
  { q: 'What payment methods are supported?', a: 'We support bank credit/debit cards (via Stripe) and cash on delivery for selected home kitchens.' },
];

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: keyof typeof Feather.glyphMap }> = {
  PLACED:     { bg: 'bg-primary/10',   text: 'text-primary-dark', label: 'Placed', icon: 'clock' },
  ACCEPTED:   { bg: 'bg-blue-50',      text: 'text-blue-700',     label: 'Accepted', icon: 'check-circle' },
  PREPARING:  { bg: 'bg-amber-50',     text: 'text-amber-700',    label: 'Preparing', icon: 'disc' },
  READY:      { bg: 'bg-emerald-50',   text: 'text-emerald-700',  label: 'Ready for Pickup', icon: 'package' },
  DELIVERING: { bg: 'bg-indigo-50',    text: 'text-indigo-700',   label: 'On the Way', icon: 'navigation' },
  DELIVERED:  { bg: 'bg-green-50',     text: 'text-green-700',    label: 'Delivered', icon: 'check' },
  CANCELLED:  { bg: 'bg-red-50',       text: 'text-red-700',      label: 'Cancelled', icon: 'x-circle' },
};

interface ProfileScreenProps {
  navigation?: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation: propNavigation }) => {
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

  const { logout, updateUserAvatar } = useAuthStore();
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

  // Edit Profile state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editTown, setEditTown] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Favorites store state
  const favoriteMealIds = useFavoriteStore((state) => state.favoriteMealIds);
  const favoriteMeals = useFavoriteStore((state) => state.favoriteMeals);
  const favoritesLoading = useFavoriteStore((state) => state.isLoading);
  const toggleFavorite = useFavoriteStore((state) => state.toggleFavorite);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/users/profile');
      setProfile(response.data);
      if (response.data?.favorites) {
        useFavoriteStore.getState().setFavoriteMealIds(response.data.favorites);
      }
      if (response.data?.profile?.avatarUrl) {
        updateUserAvatar(response.data.profile.avatarUrl);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const response = await api.get('/api/orders/my');
      const raw = response.data;
      setOrders(Array.isArray(raw) ? raw : (Array.isArray(raw?.content) ? raw.content : []));
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    useFavoriteStore.getState().fetchFavoriteMeals();
    if (!navigation || typeof navigation.addListener !== 'function') return;
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProfile();
      useFavoriteStore.getState().fetchFavoriteMeals();
      if (activeModal === 'orders') {
        fetchOrders();
      }
    });
    return unsubscribe;
  }, [navigation, activeModal, fetchOrders]);

  const openModal = (modal: ActiveModal) => {
    if (modal === 'orders') {
      navigation.navigate('Orders');
      return;
    }
    setActiveModal(modal);
    if (modal === 'editProfile') {
      setEditName(profile?.profile?.name || '');
      setEditPhone(profile?.profile?.phone || '');
      setEditBio(profile?.profile?.bio || '');
      setEditDistrict(profile?.profile?.district || '');
      setEditTown(profile?.profile?.town || '');
      setEditAvatarUrl(profile?.profile?.avatarUrl || '');
    }
    if (modal === 'changePassword') {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    if (modal === 'favorites') {
      useFavoriteStore.getState().fetchFavoriteMeals();
    }
  };

  const handlePickAvatar = async () => {
    try {
      const asset = await pickImageFromGallery();
      if (!asset) return;
      setUploadingAvatar(true);
      const cdnUrl = await uploadImageToImgBB(asset.uri);
      setEditAvatarUrl(cdnUrl);
    } catch (err: any) {
      Alert.alert('Upload Error', err?.message || 'Could not upload image.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Required Field', 'Full name cannot be empty.');
      return;
    }
    setEditSaving(true);
    try {
      await api.put('/api/users/profile', {
        name: editName.trim(),
        phone: editPhone.trim(),
        bio: editBio.trim(),
        district: editDistrict || undefined,
        town: editTown || undefined,
        avatarUrl: editAvatarUrl.trim(),
      });
      await fetchProfile();
      setActiveModal(null);
      Alert.alert('Profile Saved', 'Your profile details have been successfully updated.');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Could not update profile. Please try again.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Required Fields', 'Please complete all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Security Policy', 'New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'The new password and confirmation password do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await api.put('/api/users/change-password', {
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setActiveModal(null);
      Alert.alert('Security Updated', 'Your account password has been changed successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Incorrect current password or update error.');
    } finally {
      setPasswordSaving(false);
    }
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
    Alert.alert('Remove Address', 'Are you sure you want to remove this saved place?', [
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

  // Menu List item renderer with Feather icon support
  const renderMenuItem = (
    iconName: keyof typeof Feather.glyphMap,
    title: string,
    subtitle: string,
    modalOrAction: ActiveModal | (() => void),
    isLast = false,
  ) => (
    <TouchableOpacity
      onPress={() => {
        if (typeof modalOrAction === 'function') {
          modalOrAction();
        } else {
          openModal(modalOrAction);
        }
      }}
      className={`flex-row items-center justify-between p-4 bg-white ${!isLast ? 'border-b border-gray-100' : ''}`}
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

  // Modal Wrapper with dynamic height fit, keyboard avoiding, and scrolling support
  const renderModalWrapper = (title: string, children: React.ReactNode) => (
    <Modal
      visible={activeModal !== null}
      transparent
      animationType="slide"
      onRequestClose={() => setActiveModal(null)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/60"
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
          className="flex-1"
        />
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
          <ScrollView 
            contentContainerStyle={{ padding: 24, paddingBottom: 48 }} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Modal content renderers
  const renderOrdersContent = () => (
    ordersLoading ? (
      <View className="py-12 items-center">
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="text-textMuted text-xs mt-3">Loading orders...</Text>
      </View>
    ) : orders.length === 0 ? (
      <View className="py-12 items-center">
        <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4 border border-primary/20">
          <Feather name="shopping-bag" size={26} color="#FF6B35" />
        </View>
        <Text className="text-textPrimary font-bold text-base mb-1">No orders yet</Text>
        <Text className="text-textMuted text-xs text-center px-6 leading-relaxed">
          Explore delicious home-cooked meals from local cooks near you to see them tracked here!
        </Text>
      </View>
    ) : (
      <>
        {orders.map((order) => {
          const statusInfo = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['PLACED'];
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
                <View className={`rounded-full px-2.5 py-1 flex-row items-center gap-1 ${statusInfo.bg}`}>
                  <Feather name={statusInfo.icon} size={10} color="#FF6B35" />
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
    )
  );

  const renderFavoritesContent = () => (
    favoritesLoading ? (
      <View className="py-12 items-center">
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="text-textMuted text-xs mt-3">Loading saved dishes...</Text>
      </View>
    ) : favoriteMeals.length === 0 ? (
      <View className="py-12 items-center px-4">
        <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4 border border-primary/20">
          <Feather name="heart" size={26} color="#FF6B35" />
        </View>
        <Text className="text-textPrimary font-bold text-base mb-1">No saved favorites yet</Text>
        <Text className="text-textMuted text-xs text-center px-6 leading-relaxed">
          Tap the heart icon on any food item to save your favorite home dishes for quick access here!
        </Text>
      </View>
    ) : (
      <View>
        <Text className="text-textSecondary text-[10px] font-black uppercase tracking-wider mb-3">
          Saved Dishes ({favoriteMeals.length})
        </Text>
        {favoriteMeals.map((meal) => (
          <TouchableOpacity
            key={meal.id}
            onPress={() => {
              setActiveModal(null);
              safeNavigate('MealDetail', { mealId: meal.id });
            }}
            className="bg-white rounded-3xl border border-gray-150 p-4 mb-3 shadow-xs flex-row items-center justify-between"
            activeOpacity={0.8}
          >
            <View className="flex-row items-center flex-1 mr-3">
              {meal.photos && meal.photos.length > 0 ? (
                <Image
                  source={{ uri: meal.photos[0] }}
                  className="w-14 h-14 rounded-2xl mr-3 bg-gray-100"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-14 h-14 rounded-2xl bg-orange-100 items-center justify-center mr-3 border border-orange-200">
                  <Feather name="coffee" size={20} color="#FF6B35" />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-textPrimary font-extrabold text-xs mb-0.5" numberOfLines={1}>
                  {meal.name}
                </Text>
                <Text className="text-textSecondary text-[10px] font-medium mb-1" numberOfLines={1}>
                  Chef {meal.cookName || 'Local Cook'}
                </Text>
                <Text className="text-primary font-black text-xs">LKR {meal.price}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => toggleFavorite(meal.id)}
              className="w-8 h-8 rounded-full bg-red-50 border border-red-150 items-center justify-center"
              activeOpacity={0.7}
            >
              <Feather name="trash-2" size={13} color="#EF4444" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    )
  );

  const renderAddressesContent = () => (
    <>
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
          className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs text-textPrimary mb-4 font-semibold"
        />
        <TouchableOpacity onPress={addAddress} className="bg-primary rounded-xl py-3.5 items-center shadow-sm" activeOpacity={0.8}>
          <Text className="text-white font-extrabold text-xs tracking-wider uppercase">+ SAVE NEW PLACE</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderDietaryContent = () => (
    <>
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
        onPress={() => { Alert.alert('Preferences Saved', 'Your dietary filters have been updated.'); setActiveModal(null); }}
        className="bg-primary rounded-xl py-3.5 items-center shadow-md"
        activeOpacity={0.8}
      >
        <Text className="text-white font-extrabold text-xs tracking-wider uppercase">SAVE PREFERENCES</Text>
      </TouchableOpacity>
    </>
  );

  const renderWalletContent = () => (
    <>
      <View className="bg-primary rounded-3xl p-6 mb-5 shadow-lg relative overflow-hidden">
        <View className="absolute w-32 h-32 rounded-full bg-white/10 -top-10 -right-10" />
        <View className="absolute w-24 h-24 rounded-full bg-white/5 bottom-0 left-5" />
        <Text className="text-white/70 text-[9px] font-black uppercase tracking-widest mb-1">NP Wallet Balance</Text>
        <Text className="text-white font-black text-3xl mb-2">LKR 1,250</Text>
        <Text className="text-white/80 text-[10px] font-semibold">Support local home kitchens securely</Text>
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
        onPress={() => Alert.alert('Information', 'Card additions are handled securely during checkout.')}
      >
        <Text className="text-textSecondary font-bold text-xs">+ Add payment card</Text>
      </TouchableOpacity>
    </>
  );

  const renderHelpContent = () => (
    <>
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
    </>
  );

  const renderEditProfileContent = () => (
    <>
      {/* Profile Photo Selector */}
      <View className="items-center mb-6">
        <TouchableOpacity
          onPress={handlePickAvatar}
          disabled={uploadingAvatar}
          className="relative"
          activeOpacity={0.8}
        >
          <View className="w-24 h-24 rounded-full bg-orange-100 border-2 border-primary/30 items-center justify-center overflow-hidden shadow-sm">
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color="#FF6B35" />
            ) : editAvatarUrl ? (
              <Image source={{ uri: editAvatarUrl }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <Text className="text-primary-dark font-black text-3xl">{getInitials(editName)}</Text>
            )}
          </View>
          <View className="absolute bottom-0 right-0 bg-primary rounded-full p-2 border-2 border-white shadow-xs">
            <Feather name="camera" size={13} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <Text className="text-textSecondary text-[10px] font-semibold mt-2">
          {uploadingAvatar ? 'Uploading photo...' : 'Tap camera icon to change photo'}
        </Text>
      </View>

      <Text className="text-textSecondary text-[10px] font-black uppercase tracking-wider mb-2">Full Name *</Text>
      <TextInput
        value={editName}
        onChangeText={setEditName}
        placeholder="Your full name"
        placeholderTextColor="#9CA3AF"
        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-textPrimary mb-4 font-semibold"
      />

      <Text className="text-textSecondary text-[10px] font-black uppercase tracking-wider mb-2">Phone Number *</Text>
      <TextInput
        value={editPhone}
        onChangeText={setEditPhone}
        placeholder="e.g. +94 77 123 4567"
        placeholderTextColor="#9CA3AF"
        keyboardType="phone-pad"
        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-textPrimary mb-4 font-semibold"
      />

      {/* District & Town Pickers from Sign-Up */}
      <DropdownPicker
        label="DEFAULT DISTRICT"
        placeholder="Select District..."
        selectedValue={editDistrict}
        onValueChange={(val) => {
          setEditDistrict(val);
          setEditTown('');
        }}
        options={Object.keys(DISTRICT_TOWN_DATA)}
        iconName="map-pin"
      />

      <DropdownPicker
        label="NEIGHBORHOOD / TOWN"
        placeholder={editDistrict ? "Select Town..." : "Select District first..."}
        selectedValue={editTown}
        onValueChange={setEditTown}
        options={editDistrict ? DISTRICT_TOWN_DATA[editDistrict] || [] : []}
        disabled={!editDistrict}
        iconName="navigation"
      />

      <Text className="text-textSecondary text-[10px] font-black uppercase tracking-wider mb-2">Bio / Food Preferences</Text>
      <TextInput
        value={editBio}
        onChangeText={setEditBio}
        placeholder="Tell neighbors a little about your taste..."
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={3}
        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-textPrimary mb-6 font-semibold"
        style={{ textAlignVertical: 'top', minHeight: 72 }}
      />

      <TouchableOpacity
        onPress={saveProfile}
        disabled={editSaving}
        className={`rounded-xl py-3.5 items-center shadow-md ${editSaving ? 'bg-gray-300' : 'bg-primary'}`}
        activeOpacity={0.8}
      >
        <Text className="text-white font-extrabold text-xs tracking-wider uppercase">
          {editSaving ? 'SAVING CHANGES...' : 'SAVE PROFILE'}
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderChangePasswordContent = () => (
    <>
      <Text className="text-textSecondary text-xs mb-5 leading-relaxed font-medium">
        Ensure your account uses a secure password. You will need your current password to confirm this change.
      </Text>

      <Text className="text-textSecondary text-[10px] font-black uppercase tracking-wider mb-2">Current Password</Text>
      <TextInput
        value={currentPassword}
        onChangeText={setCurrentPassword}
        placeholder="Enter current password"
        placeholderTextColor="#9CA3AF"
        secureTextEntry
        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-textPrimary mb-4 font-semibold"
      />

      <Text className="text-textSecondary text-[10px] font-black uppercase tracking-wider mb-2">New Password (Min 6 Characters)</Text>
      <TextInput
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="Enter new password"
        placeholderTextColor="#9CA3AF"
        secureTextEntry
        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-textPrimary mb-4 font-semibold"
      />

      <Text className="text-textSecondary text-[10px] font-black uppercase tracking-wider mb-2">Confirm New Password</Text>
      <TextInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Confirm new password"
        placeholderTextColor="#9CA3AF"
        secureTextEntry
        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-textPrimary mb-6 font-semibold"
      />

      <TouchableOpacity
        onPress={handleSavePassword}
        disabled={passwordSaving}
        className={`rounded-xl py-3.5 items-center shadow-md ${passwordSaving ? 'bg-gray-300' : 'bg-primary'}`}
        activeOpacity={0.8}
      >
        <Text className="text-white font-extrabold text-xs tracking-wider uppercase">
          {passwordSaving ? 'UPDATING PASSWORD...' : 'UPDATE PASSWORD'}
        </Text>
      </TouchableOpacity>
    </>
  );

  const activeOrdersCount = (Array.isArray(orders) ? orders : []).filter(
    o => !['DELIVERED', 'CANCELLED'].includes(o.status)
  ).length;

  return (
    <View className="flex-1 bg-surface-elevated relative">
      {/* Active Modals */}
      {activeModal === 'orders'          && renderModalWrapper("My Orders", renderOrdersContent())}
      {activeModal === 'favorites'       && renderModalWrapper("Saved Favorites", renderFavoritesContent())}
      {activeModal === 'addresses'       && renderModalWrapper("Delivery Places", renderAddressesContent())}
      {activeModal === 'dietary'         && renderModalWrapper("Dietary Preferences", renderDietaryContent())}
      {activeModal === 'wallet'          && renderModalWrapper("Wallet & Payments", renderWalletContent())}
      {activeModal === 'help'            && renderModalWrapper("Help Center", renderHelpContent())}
      {activeModal === 'editProfile'     && renderModalWrapper("Edit Profile Details", renderEditProfileContent())}
      {activeModal === 'changePassword'  && renderModalWrapper("Change Password", renderChangePasswordContent())}

      {/* Header Panel */}
      <View className="bg-white px-6 pt-12 pb-4 border-b border-gray-100 shadow-sm z-10 flex-row items-center justify-between">
        <View>
          <Text className="font-black text-xl text-textPrimary">My Profile</Text>
          <Text className="text-textSecondary text-[10px] mt-0.5 font-bold uppercase tracking-wider">Account & Preferences</Text>
        </View>
        <TouchableOpacity
          onPress={() => openModal('editProfile')}
          className="bg-primary/10 rounded-full px-3 py-1.5 flex-row items-center gap-1.5 border border-primary/20"
          activeOpacity={0.7}
        >
          <Feather name="edit-2" size={12} color="#FF6B35" />
          <Text className="text-primary font-black text-[10px] uppercase tracking-wider">Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Hero Card */}
        <View className="bg-white rounded-3xl p-5 mb-5 shadow-sm border border-gray-100 items-center relative overflow-hidden">
          <View className="w-20 h-20 rounded-full bg-orange-100 border border-orange-200 items-center justify-center shadow-inner mb-3 overflow-hidden">
            {profile?.profile?.avatarUrl ? (
              <Image source={{ uri: profile.profile.avatarUrl }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <Text className="text-primary-dark font-black text-2xl">{getInitials(profile?.profile?.name)}</Text>
            )}
          </View>
          
          <Text className="font-extrabold text-lg text-textPrimary mb-0.5">
            {profile?.profile?.name || 'Neighbor Customer'}
          </Text>
          
          <Text className="text-textSecondary text-xs mb-1 font-semibold">{profile?.email}</Text>
          
          {profile?.profile?.phone ? (
            <Text className="text-textMuted text-[11px] font-semibold mb-2">{profile.profile.phone}</Text>
          ) : null}

          {/* Location Badge */}
          {(profile?.profile?.district || profile?.profile?.town) ? (
            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-full px-3 py-1 mb-3">
              <Feather name="map-pin" size={11} color="#6B7280" />
              <Text className="text-textSecondary text-[11px] font-semibold ml-1.5">
                {profile.profile.town ? `${profile.profile.town}, ` : ''}{profile.profile.district || ''}
              </Text>
            </View>
          ) : null}

          {profile?.profile?.bio ? (
            <Text className="text-textMuted text-[10px] text-center leading-relaxed mb-3 font-medium px-4" numberOfLines={2}>
              "{profile.profile.bio}"
            </Text>
          ) : null}

          <View className="border border-primary/20 rounded-full px-3 py-1 flex-row items-center bg-primary/5 gap-1.5 shadow-xs">
            <Ionicons name="shield-checkmark" size={12} color="#FF6B35" />
            <Text className="font-black text-[9px] uppercase tracking-wider text-primary">Verified Customer</Text>
          </View>
        </View>

        {/* Quick Stats Row */}
        <View className="flex-row justify-between mb-5 gap-3">
          <TouchableOpacity
            onPress={() => openModal('orders')}
            className="flex-1 bg-white border border-gray-100 rounded-3xl p-4 items-center shadow-sm active:opacity-80"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-1 mb-1">
              <Feather name="package" size={13} color="#FF6B35" />
              <Text className="font-black text-lg text-textPrimary">{profile?.stats?.totalOrders || 0}</Text>
            </View>
            <Text className="text-[9px] font-black uppercase tracking-wider text-textSecondary">Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openModal('favorites')}
            className="flex-1 bg-white border border-gray-100 rounded-3xl p-4 items-center shadow-sm active:opacity-80"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-1 mb-1">
              <Feather name="heart" size={13} color="#FF6B35" />
              <Text className="font-black text-lg text-textPrimary">
                {favoriteMealIds.length || profile?.favorites?.length || 0}
              </Text>
            </View>
            <Text className="text-[9px] font-black uppercase tracking-wider text-textSecondary">Favorites</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => safeNavigate('CustomerReviews')}
            className="flex-1 bg-white border border-gray-100 rounded-3xl p-4 items-center shadow-sm active:opacity-80"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-1 mb-1">
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text className="font-black text-lg text-textPrimary">
                {profile?.stats?.avgRating > 0 ? profile.stats.avgRating.toFixed(1) : '5.0'}
              </Text>
            </View>
            <Text className="text-[9px] font-black uppercase tracking-wider text-textSecondary">Reviews</Text>
          </TouchableOpacity>
        </View>

        {/* Orders History Quick Banner */}
        <TouchableOpacity
          onPress={() => openModal('orders')}
          className="bg-white border border-gray-150 rounded-3xl p-4 mb-5 flex-row items-center justify-between shadow-sm relative"
          activeOpacity={0.8}
        >
          {activeOrdersCount > 0 && (
            <View className="absolute -top-1.5 -right-1.5 bg-primary rounded-full px-2 py-0.5 items-center justify-center z-10 border border-white">
              <Text className="text-white font-black text-[9px]">{activeOrdersCount} Active</Text>
            </View>
          )}
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-11 h-11 bg-primary/5 rounded-2xl items-center justify-center mr-4 border border-primary/10">
              <Feather name="shopping-bag" size={16} color="#FF6B35" />
            </View>
            <View className="flex-1">
              <Text className="text-textPrimary font-extrabold text-sm">Order History</Text>
              <Text className="text-textSecondary text-[10px] mt-0.5 font-semibold">Track active and past home food orders</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Activity & Favorites Menu */}
        <Text className="text-textSecondary text-[10px] font-black uppercase tracking-wider mb-2 ml-1">Activity</Text>
        <View className="border border-gray-150 rounded-3xl overflow-hidden mb-5 shadow-sm">
          {renderMenuItem("heart",         "Saved Favorites",     "View and manage your favorited dishes",   'favorites')}
          {renderMenuItem("star",          "My Reviews",          "View, edit, or delete meal reviews",      () => safeNavigate('CustomerReviews'), true)}
        </View>

        {/* Preferences Menu */}
        <Text className="text-textSecondary text-[10px] font-black uppercase tracking-wider mb-2 ml-1">Preferences</Text>
        <View className="border border-gray-150 rounded-3xl overflow-hidden mb-5 shadow-sm">
          {renderMenuItem("map-pin",       "Delivery Addresses",  "Manage home, work, and saved places",     'addresses')}
          {renderMenuItem("check-square",  "Dietary Preferences", "Filter meals by vegan, allergen-free tags",'dietary')}
          {renderMenuItem("credit-card",   "Wallet & Payments",   "Manage payment details and credits",       'wallet', true)}
        </View>

        {/* Account Security & Support Menu */}
        <Text className="text-textSecondary text-[10px] font-black uppercase tracking-wider mb-2 ml-1">Account & Security</Text>
        <View className="border border-gray-150 rounded-3xl overflow-hidden mb-6 shadow-sm">
          {renderMenuItem("user",          "Edit Profile Details","Update name, phone, district & town",     'editProfile')}
          {renderMenuItem("lock",          "Change Password",     "Update account security password",        'changePassword')}
          {renderMenuItem("help-circle",   "Help Center & FAQs",  "View FAQs and reach customer support",    'help', true)}
        </View>

        {/* Log Out Button */}
        <TouchableOpacity
          onPress={logout}
          className="w-full border rounded-2xl py-3.5 items-center justify-center flex-row shadow-sm bg-red-50 border-red-200 active:bg-red-100"
          activeOpacity={0.8}
        >
          <Feather name="log-out" size={14} color="#EF4444" style={{ marginRight: 8 }} />
          <Text className="font-extrabold text-xs tracking-wider uppercase text-red-500">LOG OUT</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};
