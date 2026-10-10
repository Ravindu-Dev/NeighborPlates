import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  Platform,
  Linking,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Feather, Ionicons } from '@expo/vector-icons';

type VehicleOption = 'E-Bike' | 'Scooter' | 'Bicycle' | 'Car';
type NavigationApp = 'Google' | 'Apple' | 'Waze';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';

export const RiderProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { logout, user, updateUser } = useAuthStore();

  const [profile, setProfile] = useState<any>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(false);

  // Shift & Ride Modes
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleOption>('E-Bike');
  const [hotFoodPriority, setHotFoodPriority] = useState(true);
  const [deliveryRadius, setDeliveryRadius] = useState(5.0);
  const [autoAcceptRush, setAutoAcceptRush] = useState(true);

  // Care Gear Checklists
  const [gearHaccp, setGearHaccp] = useState(true);
  const [gearBackpack, setGearBackpack] = useState(true);
  const [gearSoupRack, setGearSoupRack] = useState(true);
  const [gearWarmerPod, setGearWarmerPod] = useState(true);

  // App Settings
  const [navigationApp, setNavigationApp] = useState<NavigationApp>('Google');
  const [payoutMethod, setPayoutMethod] = useState('');
  const [insurancePolicy, setInsurancePolicy] = useState('');

  // Modals: Vehicle
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [vehicleModel, setVehicleModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [modalVehicleType, setModalVehicleType] = useState<VehicleOption>('E-Bike');
  const [savingVehicle, setSavingVehicle] = useState(false);

  // Modals: Profile Edit
  const [profileEditModalVisible, setProfileEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Modals: Payout Edit
  const [payoutModalVisible, setPayoutModalVisible] = useState(false);
  const [editBank, setEditBank] = useState('');
  const [savingPayout, setSavingPayout] = useState(false);

  // Modals: Documents & SOS
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [taxModalVisible, setTaxModalVisible] = useState(false);
  const [insuranceModalVisible, setInsuranceModalVisible] = useState(false);

  // Fetch logged in rider's real data
  const fetchProfile = async () => {
    try {
      const [userRes, ordersRes, summaryRes] = await Promise.allSettled([
        api.get('/api/users/profile'),
        api.get('/api/orders/my'),
        api.get('/api/riders/summary'),
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value.data) {
        setSummary(summaryRes.value.data);
      }

      if (userRes.status === 'fulfilled' && userRes.value.data) {
        const u = userRes.value.data;
        setProfile(u);
        // Auto-heal empty rider name in backend database
        if (!u.profile?.name && (user?.email || u.email)) {
          const emailStr = user?.email || u.email;
          const userPart = emailStr.split('@')[0];
          const autoName = userPart.charAt(0).toUpperCase() + userPart.slice(1);
          u.profile = u.profile || {};
          u.profile.name = autoName;
          api.put('/api/users/profile', { name: autoName }).catch(() => {});
          updateUser({ name: autoName });
        }

        // Vehicle info
        if (u.profile?.vehicleModel) {
          setVehicleModel(u.profile.vehicleModel);
        }
        if (u.profile?.vehiclePlate) {
          setPlateNumber(u.profile.vehiclePlate);
        }

        const backendVehicle = u.profile?.vehicleType;
        if (backendVehicle) {
          if (backendVehicle === 'Motorcycle' || backendVehicle === 'Scooter') {
            setSelectedVehicle('Scooter');
            setModalVehicleType('Scooter');
          } else if (backendVehicle === 'Bicycle') {
            setSelectedVehicle('Bicycle');
            setModalVehicleType('Bicycle');
          } else if (backendVehicle === 'Car') {
            setSelectedVehicle('Car');
            setModalVehicleType('Car');
          } else {
            setSelectedVehicle('E-Bike');
            setModalVehicleType('E-Bike');
          }
        }

        // Shift parameters
        if (typeof u.profile?.deliveryRadius === 'number') {
          setDeliveryRadius(u.profile.deliveryRadius);
        }
        if (typeof u.profile?.hotFoodPriority === 'boolean') {
          setHotFoodPriority(u.profile.hotFoodPriority);
        }
        if (typeof u.profile?.autoAcceptRush === 'boolean') {
          setAutoAcceptRush(u.profile.autoAcceptRush);
        }

        // Care gear
        if (typeof u.profile?.haccpCertified === 'boolean') {
          setGearHaccp(u.profile.haccpCertified);
        }
        if (typeof u.profile?.thermalBackpack === 'boolean') {
          setGearBackpack(u.profile.thermalBackpack);
        }
        if (typeof u.profile?.spillProofRack === 'boolean') {
          setGearSoupRack(u.profile.spillProofRack);
        }
        if (typeof u.profile?.heatedWarmerPod === 'boolean') {
          setGearWarmerPod(u.profile.heatedWarmerPod);
        }

        // App & compliance
        if (u.profile?.navigationApp) {
          setNavigationApp(u.profile.navigationApp as NavigationApp);
        }
        if (u.profile?.payoutMethod) {
          setPayoutMethod(u.profile.payoutMethod);
          setEditBank(u.profile.payoutMethod);
        }
        if (u.profile?.insurancePolicy) {
          setInsurancePolicy(u.profile.insurancePolicy);
        }

        // Profile edit inputs
        setEditName(u.profile?.name || user?.name || '');
        setEditPhone(u.profile?.phone || '');
        setEditAvatarUrl(u.profile?.avatarUrl || user?.avatarUrl || '');
      }

      if (ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value.data)) {
        setMyOrders(ordersRes.value.data);
      }
    } catch (err) {
      console.warn('[RiderProfile] fetch error:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, []);

  // Toggle rider online availability
  const handleToggleOnline = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const nextState = !isOnline;
    setIsOnline(nextState);
    try {
      await api.put(`/api/riders/availability?isAvailable=${nextState}`);
    } catch (e) {
      console.warn('[RiderProfile] toggle online warning', e);
    }
  };

  // Change primary vehicle & save to backend
  const handleVehicleChange = async (v: VehicleOption) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedVehicle(v);
    setModalVehicleType(v);
    try {
      await api.put('/api/users/profile', {
        vehicleType: v,
      });
    } catch (err) {
      console.warn('[RiderProfile] vehicleType update error', err);
    }
  };

  // Save vehicle edit modal
  const handleSaveVehicleInfo = async () => {
    setSavingVehicle(true);
    try {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setSelectedVehicle(modalVehicleType);
      await api.put('/api/users/profile', {
        vehicleModel: vehicleModel.trim(),
        vehiclePlate: plateNumber.trim(),
        vehicleType: modalVehicleType,
      });
      setVehicleModalVisible(false);
      Alert.alert('Saved', 'Vehicle details successfully updated on your rider profile!');
      fetchProfile();
    } catch (err) {
      Alert.alert('Error', 'Could not update vehicle details. Please try again.');
    } finally {
      setSavingVehicle(false);
    }
  };

  // Save personal profile edit modal
  const handleSaveProfileInfo = async () => {
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Name cannot be empty.');
      return;
    }
    setSavingProfile(true);
    try {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await api.put('/api/users/profile', {
        name: editName.trim(),
        phone: editPhone.trim(),
        avatarUrl: editAvatarUrl.trim() || undefined,
      });

      // Update in local auth store so whole app reflects changes
      updateUser({
        name: editName.trim(),
        avatarUrl: editAvatarUrl.trim() || undefined,
      });

      setProfileEditModalVisible(false);
      Alert.alert('Success', 'Profile details updated!');
      fetchProfile();
    } catch (err) {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Save payout method
  const handleSavePayoutMethod = async () => {
    if (!editBank.trim()) {
      Alert.alert('Validation Error', 'Payout method cannot be empty.');
      return;
    }
    setSavingPayout(true);
    try {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setPayoutMethod(editBank.trim());
      await api.put('/api/users/profile', {
        payoutMethod: editBank.trim(),
      });
      setPayoutModalVisible(false);
      Alert.alert('Payout Method Updated', 'Direct deposit will be routed to this account.');
    } catch (err) {
      Alert.alert('Error', 'Could not save payout method.');
    } finally {
      setSavingPayout(false);
    }
  };

  // Gear toggles
  const handleToggleGear = async (gearKey: 'haccp' | 'backpack' | 'soup' | 'warmer') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    let payload: any = {};
    if (gearKey === 'haccp') {
      const next = !gearHaccp;
      setGearHaccp(next);
      payload.haccpCertified = next;
    } else if (gearKey === 'backpack') {
      const next = !gearBackpack;
      setGearBackpack(next);
      payload.thermalBackpack = next;
    } else if (gearKey === 'soup') {
      const next = !gearSoupRack;
      setGearSoupRack(next);
      payload.spillProofRack = next;
    } else if (gearKey === 'warmer') {
      const next = !gearWarmerPod;
      setGearWarmerPod(next);
      payload.heatedWarmerPod = next;
    }
    try {
      await api.put('/api/users/profile', payload);
    } catch (err) {
      console.warn('[RiderProfile] gear update warning', err);
    }
  };

  // Shift toggles & sliders
  const handleToggleHotFood = async (val: boolean) => {
    setHotFoodPriority(val);
    try {
      await api.put('/api/users/profile', { hotFoodPriority: val });
    } catch {}
  };

  const handleToggleAutoAccept = async (val: boolean) => {
    setAutoAcceptRush(val);
    try {
      await api.put('/api/users/profile', { autoAcceptRush: val });
    } catch {}
  };

  const handleChangeRadius = async (val: number) => {
    const clamped = Math.max(2.0, Math.min(15.0, parseFloat(val.toFixed(1))));
    setDeliveryRadius(clamped);
    try {
      await api.put('/api/users/profile', { deliveryRadius: clamped });
    } catch {}
  };

  const handleSelectNavigationApp = async (app: NavigationApp) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setNavigationApp(app);
    try {
      await AsyncStorage.setItem('rider_default_nav', app);
      await api.put('/api/users/profile', { navigationApp: app });
    } catch {}
  };

  const handleLogout = async () => {
    const confirmAction = async () => {
      try {
        await api.put('/api/riders/availability?isAvailable=false');
      } catch {}
      logout();
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Go offline and log out of Homely Rider?')) {
        confirmAction();
      }
    } else {
      Alert.alert(
        'Go Offline & Log Out',
        'Are you sure you want to end your shift and log out?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log Out', style: 'destructive', onPress: confirmAction },
        ]
      );
    }
  };

  const handleCallSupport = () => {
    if (Platform.OS !== 'web') {
      Linking.openURL('tel:0112345678');
    } else {
      Alert.alert('Calling Support', 'Connecting to Cook Dispatch Support at 011-234-5678...');
    }
  };

  // ── Real Data Mapping ──
  const deriveRiderName = () => {
    if (profile?.profile?.name && profile.profile.name.trim().length > 0) {
      return profile.profile.name.trim();
    }
    if (user?.name && user.name.trim().length > 0) {
      return user.name.trim();
    }
    const emailToUse = user?.email || profile?.email;
    if (emailToUse) {
      const part = emailToUse.split('@')[0];
      return part.charAt(0).toUpperCase() + part.slice(1);
    }
    return 'Rider';
  };

  const riderName = deriveRiderName();
  const riderEmail = user?.email || profile?.email || '';
  const riderPhone = profile?.profile?.phone || 'Not set';
  const avatarUrl =
    profile?.profile?.avatarUrl ||
    user?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(riderName)}&background=9A3412&color=fff&bold=true&size=256`;

  // Member Since date
  const formatPartnerSince = () => {
    const rawDate = profile?.createdAt || (user as any)?.createdAt;
    if (!rawDate) return 'Homely Partner';
    try {
      const d = new Date(rawDate);
      return `Homely Partner since ${d.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`;
    } catch {
      return 'Homely Partner';
    }
  };

  // Performance calculations
  const isVerified = profile?.profile?.riderVerified !== false;
  const ratingValue =
    profile?.stats?.avgRating && profile.stats.avgRating > 0
      ? profile.stats.avgRating.toFixed(1)
      : 'New';

  const deliveredCount =
    summary?.totalDeliveries ??
    myOrders.filter((o: any) => o.status === 'DELIVERED').length;

  const totalDeliveriesLabel = `${deliveredCount} Deliv.`;

  const onTimePercentage =
    summary?.onTimeRate != null
      ? `${summary.onTimeRate.toFixed(0)}%`
      : profile?.profile?.onTimeRate != null
      ? `${profile.profile.onTimeRate.toFixed(0)}%`
      : '—';

  const acceptancePercentage =
    summary?.completionRate != null
      ? `${summary.completionRate.toFixed(0)}%`
      : profile?.profile?.acceptanceRate != null
      ? `${Math.round(profile.profile.acceptanceRate)}%`
      : '—';

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
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
          {/* ── 1. Top Header (Homely Rider | RIDER PROFILE | Ready Pill | Avatar) ── */}
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
                  RIDER PROFILE
                </Text>
              </View>
            </View>

            {/* Ready Badge & Real Avatar */}
            <View className="flex-row items-center gap-2.5">
              <TouchableOpacity
                onPress={handleToggleOnline}
                activeOpacity={0.8}
                className={`px-3 py-1 rounded-full flex-row items-center border ${
                  isOnline
                    ? 'bg-[#ECFDF5] border-[#A7F3D0]'
                    : 'bg-gray-100 border-gray-300'
                }`}
              >
                <View
                  className={`w-2 h-2 rounded-full mr-1.5 ${
                    isOnline ? 'bg-[#10B981]' : 'bg-gray-400'
                  }`}
                />
                <Text
                  className={`font-bold text-xs ${
                    isOnline ? 'text-[#059669]' : 'text-gray-500'
                  }`}
                >
                  {isOnline ? 'Ready' : 'Offline'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setProfileEditModalVisible(true)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: avatarUrl }}
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm bg-gray-200"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── 2. Rider Identity Card (Logged-in Name, Real Details, Stats, Vehicle) ── */}
          <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-4">
            {/* Top Identity Row */}
            <View className="flex-row items-start mb-4">
              <TouchableOpacity
                onPress={() => setProfileEditModalVisible(true)}
                activeOpacity={0.8}
                className="relative mr-3.5"
              >
                <Image
                  source={{ uri: avatarUrl }}
                  className="w-16 h-16 rounded-full border-2 border-white shadow-sm bg-gray-200"
                />
                <View
                  className={`w-4 h-4 rounded-full border-2 border-white absolute bottom-0 right-0 ${
                    isOnline ? 'bg-[#10B981]' : 'bg-gray-400'
                  }`}
                />
              </TouchableOpacity>

              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1 mr-2">
                    <Text className="text-textPrimary font-black text-xl mr-1.5" numberOfLines={1}>
                      {riderName}
                    </Text>
                    {isVerified && (
                      <View className="w-4 h-4 rounded-full bg-[#EA580C] items-center justify-center">
                        <Feather name="check" size={10} color="#FFFFFF" />
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => setProfileEditModalVisible(true)}
                    activeOpacity={0.8}
                    className="p-1"
                  >
                    <Feather name="edit-2" size={15} color="#EA580C" />
                  </TouchableOpacity>
                </View>

                <Text className="text-textMuted text-xs font-semibold mt-0.5">
                  {formatPartnerSince()}
                </Text>

                <View className="flex-row items-center mt-1">
                  <View
                    className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                      isVerified ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <Text
                    className={`font-extrabold text-[11px] ${
                      isVerified ? 'text-[#059669]' : 'text-amber-600'
                    }`}
                  >
                    {isVerified ? 'Active & Verified Courier' : 'Verification In Review'}
                  </Text>
                </View>

                {/* Real Email & Phone subline */}
                <View className="mt-1 flex-row items-center flex-wrap gap-x-2">
                  <Text className="text-textMuted text-[10px] font-medium" numberOfLines={1}>
                    ✉ {riderEmail}
                  </Text>
                  <Text className="text-textMuted text-[10px] font-medium">
                    📞 {riderPhone}
                  </Text>
                </View>
              </View>
            </View>

            {/* 3-Column Performance Stats Box */}
            <View className="flex-row gap-2.5 mb-3">
              <View className="flex-1 bg-[#EEF4FF] rounded-2xl p-3 items-center">
                <View className="flex-row items-center">
                  <Text className="text-textPrimary font-black text-lg">{ratingValue}</Text>
                  <Text className="text-[#EA580C] font-black text-sm ml-0.5">★</Text>
                </View>
                <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mt-0.5">
                  {totalDeliveriesLabel}
                </Text>
              </View>

              <View className="flex-1 bg-[#EEF4FF] rounded-2xl p-3 items-center">
                <Text className="text-textPrimary font-black text-lg">{onTimePercentage}</Text>
                <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mt-0.5">
                  On-Time
                </Text>
              </View>

              <View className="flex-1 bg-[#EEF4FF] rounded-2xl p-3 items-center">
                <Text className="text-textPrimary font-black text-lg">{acceptancePercentage}</Text>
                <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mt-0.5">
                  Acceptance
                </Text>
              </View>
            </View>

            {/* Registered Vehicle Pill */}
            <View className="bg-[#EFF6FF] rounded-2xl p-3.5 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-2xl bg-white border border-blue-100 items-center justify-center mr-3 shadow-xs">
                  <Text style={{ fontSize: 18 }}>
                    {selectedVehicle === 'E-Bike'
                      ? '🚲'
                      : selectedVehicle === 'Scooter'
                      ? '🛵'
                      : selectedVehicle === 'Bicycle'
                      ? '🚲'
                      : '🚗'}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-textPrimary font-extrabold text-sm" numberOfLines={1}>
                    {vehicleModel}
                  </Text>
                  <Text className="text-textMuted text-[11px] font-medium mt-0.5">
                    Plate / Fleet: {plateNumber}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setVehicleModalVisible(true)}
                activeOpacity={0.8}
                className="bg-white border border-gray-200 px-3.5 py-1.5 rounded-xl shadow-xs"
              >
                <Text className="text-textPrimary font-bold text-xs">Edit</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── 3. Home-Cooked Care Gear Section ── */}
          <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-4">
            <View className="flex-row items-center justify-between mb-3.5">
              <View className="flex-row items-center">
                <Text style={{ fontSize: 16 }}>🍲</Text>
                <Text className="text-textPrimary font-black text-base ml-2">
                  Home-Cooked Care Gear
                </Text>
              </View>

              <View className="bg-[#A7F3D0] px-2 py-0.5 rounded-md">
                <Text className="text-[#065F46] font-black text-[10px]">
                  HACCP L2
                </Text>
              </View>
            </View>

            {/* Certified Handler Banner */}
            <TouchableOpacity
              onPress={() => handleToggleGear('haccp')}
              activeOpacity={0.85}
              className="bg-[#EFF6FF] rounded-2xl p-3.5 mb-3 flex-row items-start"
            >
              <View className="w-6 h-6 rounded-full bg-emerald-100 items-center justify-center mr-2.5 mt-0.5">
                <Feather
                  name={gearHaccp ? 'shield' : 'alert-circle'}
                  size={13}
                  color={gearHaccp ? '#059669' : '#D97706'}
                />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-textPrimary font-black text-xs mb-0.5">
                    Certified Home-Food Handler
                  </Text>
                  <View className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <Text className="text-[#059669] font-black text-[9px]">
                      {gearHaccp ? 'Verified' : 'Pending'}
                    </Text>
                  </View>
                </View>
                <Text className="text-textSecondary text-[11px] leading-4">
                  Verified handling protocol for artisan kitchens, warm gravies, and fresh bakes.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Gear List */}
            <View className="gap-2">
              {/* Item 1: Thermal Insulated Backpack */}
              <TouchableOpacity
                onPress={() => handleToggleGear('backpack')}
                activeOpacity={0.8}
                className="flex-row items-center justify-between py-2 border-b border-gray-100"
              >
                <View className="flex-row items-center">
                  <Text style={{ fontSize: 16 }}>🍱</Text>
                  <Text className="text-textPrimary font-extrabold text-xs ml-2.5">
                    Thermal Insulated Backpack
                  </Text>
                </View>
                <View
                  className={`flex-row items-center px-2.5 py-1 rounded-full border ${
                    gearBackpack
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-gray-100 border-gray-200'
                  }`}
                >
                  <Feather
                    name={gearBackpack ? 'check' : 'circle'}
                    size={11}
                    color={gearBackpack ? '#059669' : '#6B7280'}
                  />
                  <Text
                    className={`font-black text-[10px] ml-1 ${
                      gearBackpack ? 'text-[#059669]' : 'text-gray-500'
                    }`}
                  >
                    {gearBackpack ? 'Approved' : 'Off'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Item 2: Spill-Proof Soup Rack */}
              <TouchableOpacity
                onPress={() => handleToggleGear('soup')}
                activeOpacity={0.8}
                className="flex-row items-center justify-between py-2 border-b border-gray-100"
              >
                <View className="flex-row items-center">
                  <Text style={{ fontSize: 16 }}>🍲</Text>
                  <Text className="text-textPrimary font-extrabold text-xs ml-2.5">
                    Spill-Proof Soup Rack
                  </Text>
                </View>
                <View
                  className={`flex-row items-center px-2.5 py-1 rounded-full border ${
                    gearSoupRack
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-gray-100 border-gray-200'
                  }`}
                >
                  <Feather
                    name={gearSoupRack ? 'check' : 'circle'}
                    size={11}
                    color={gearSoupRack ? '#059669' : '#6B7280'}
                  />
                  <Text
                    className={`font-black text-[10px] ml-1 ${
                      gearSoupRack ? 'text-[#059669]' : 'text-gray-500'
                    }`}
                  >
                    {gearSoupRack ? 'Equipped' : 'Off'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Item 3: Heated Warmer Pod */}
              <TouchableOpacity
                onPress={() => handleToggleGear('warmer')}
                activeOpacity={0.8}
                className="flex-row items-center justify-between py-2"
              >
                <View className="flex-row items-center">
                  <Text style={{ fontSize: 16 }}>♨️</Text>
                  <Text className="text-textPrimary font-extrabold text-xs ml-2.5">
                    Heated Warmer Pod
                  </Text>
                </View>
                <View
                  className={`flex-row items-center px-2.5 py-1 rounded-full border ${
                    gearWarmerPod
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-gray-100 border-gray-200'
                  }`}
                >
                  <Feather
                    name={gearWarmerPod ? 'check' : 'circle'}
                    size={11}
                    color={gearWarmerPod ? '#059669' : '#6B7280'}
                  />
                  <Text
                    className={`font-black text-[10px] ml-1 ${
                      gearWarmerPod ? 'text-[#059669]' : 'text-gray-500'
                    }`}
                  >
                    {gearWarmerPod ? 'Active' : 'Off'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── 4. Shift & Ride Modes Section ── */}
          <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-4">
            <View className="flex-row items-center mb-3.5">
              <Feather name="sliders" size={16} color="#EA580C" />
              <Text className="text-textPrimary font-black text-base ml-2">
                Shift & Ride Modes
              </Text>
            </View>

            {/* Primary Vehicle Switcher */}
            <Text className="text-textMuted text-[10px] uppercase font-bold tracking-wider mb-2.5">
              PRIMARY VEHICLE
            </Text>
            <View className="flex-row gap-2 mb-4">
              {[
                { type: 'E-Bike' as VehicleOption, icon: '🚲' },
                { type: 'Scooter' as VehicleOption, icon: '🛵' },
                { type: 'Bicycle' as VehicleOption, icon: '🚲' },
                { type: 'Car' as VehicleOption, icon: '🚗' },
              ].map((item) => {
                const isSelected = selectedVehicle === item.type;
                return (
                  <TouchableOpacity
                    key={item.type}
                    onPress={() => handleVehicleChange(item.type)}
                    activeOpacity={0.8}
                    className={`flex-1 py-3 rounded-2xl items-center justify-center ${
                      isSelected ? 'bg-[#9A3412] shadow-sm' : 'bg-[#EEF4FF]'
                    }`}
                  >
                    <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                    <Text
                      className={`text-[11px] font-black mt-1 ${
                        isSelected ? 'text-white' : 'text-textPrimary'
                      }`}
                    >
                      {item.type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Toggle 1: Hot Food Priority Matching */}
            <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View className="flex-1 mr-3">
                <Text className="text-textPrimary font-black text-sm">
                  Hot Food Priority Matching
                </Text>
                <Text className="text-textSecondary text-xs mt-0.5 leading-4">
                  Match with nearby home kitchens needing sub-15 min dropoffs.
                </Text>
              </View>
              <Switch
                value={hotFoodPriority}
                onValueChange={handleToggleHotFood}
                trackColor={{ false: '#E5E7EB', true: '#9A3412' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Slider / Range: Maximum Delivery Radius */}
            <View className="py-3 border-b border-gray-100">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-textPrimary font-black text-sm">
                  Maximum Delivery Radius
                </Text>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    onPress={() => handleChangeRadius(deliveryRadius - 0.5)}
                    className="w-6 h-6 rounded-full bg-gray-100 items-center justify-center"
                  >
                    <Feather name="minus" size={12} color="#9A3412" />
                  </TouchableOpacity>
                  <Text className="text-[#9A3412] font-black text-base min-w-[55px] text-center">
                    {deliveryRadius.toFixed(1)} km
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleChangeRadius(deliveryRadius + 0.5)}
                    className="w-6 h-6 rounded-full bg-gray-100 items-center justify-center"
                  >
                    <Feather name="plus" size={12} color="#9A3412" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Interactive Range Steps Bar */}
              <View className="h-2.5 bg-gray-200 rounded-full overflow-hidden mb-2 relative">
                <View
                  style={{ width: `${Math.min(100, Math.max(5, (deliveryRadius / 15) * 100))}%` }}
                  className="h-full bg-[#9A3412] rounded-full"
                />
              </View>

              {/* Radius Quick Presets */}
              <View className="flex-row justify-between mb-2">
                {[2.0, 5.0, 8.0, 12.0, 15.0].map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => handleChangeRadius(r)}
                    className={`px-2 py-1 rounded-lg ${
                      Math.abs(deliveryRadius - r) < 0.2
                        ? 'bg-orange-100 border border-orange-300'
                        : 'bg-gray-100'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        Math.abs(deliveryRadius - r) < 0.2
                          ? 'text-[#9A3412]'
                          : 'text-gray-600'
                      }`}
                    >
                      {r} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View className="flex-row justify-between">
                <Text className="text-textMuted text-[10px] font-semibold">
                  2 km (Local neighborhood)
                </Text>
                <Text className="text-textMuted text-[10px] font-semibold">
                  15 km (Wide city)
                </Text>
              </View>
            </View>

            {/* Toggle 2: Auto-Accept Rush Quests */}
            <View className="flex-row items-center justify-between pt-3">
              <View className="flex-1 mr-3">
                <Text className="text-textPrimary font-black text-sm">
                  Auto-Accept Rush Quests
                </Text>
                <Text className="text-textSecondary text-xs mt-0.5 leading-4">
                  Instantly reserve bonus reward runs during 6-9 PM dinner rush.
                </Text>
              </View>
              <Switch
                value={autoAcceptRush}
                onValueChange={handleToggleAutoAccept}
                trackColor={{ false: '#E5E7EB', true: '#9A3412' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* ── 5. Compliance & Payouts Section ── */}
          <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-4">
            <View className="flex-row items-center mb-3.5">
              <Feather name="briefcase" size={16} color="#EA580C" />
              <Text className="text-textPrimary font-black text-base ml-2">
                Compliance & Payouts
              </Text>
            </View>

            <View className="gap-1">
              {/* Item 1: Payout Methods */}
              <TouchableOpacity
                onPress={() => setPayoutModalVisible(true)}
                activeOpacity={0.8}
                className="flex-row items-center justify-between py-2.5 border-b border-gray-100"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-9 h-9 rounded-xl bg-orange-50 items-center justify-center mr-3">
                    <Feather name="credit-card" size={16} color="#EA580C" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-textPrimary font-extrabold text-sm">
                      Payout Methods
                    </Text>
                    <Text className="text-textMuted text-[11px] mt-0.5" numberOfLines={1}>
                      {payoutMethod}
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Item 2: Tax Documents */}
              <TouchableOpacity
                onPress={() => setTaxModalVisible(true)}
                activeOpacity={0.8}
                className="flex-row items-center justify-between py-2.5 border-b border-gray-100"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-9 h-9 rounded-xl bg-amber-50 items-center justify-center mr-3">
                    <Feather name="file-text" size={16} color="#D97706" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-textPrimary font-extrabold text-sm">
                      Tax Documents & 1099-NEC
                    </Text>
                    <Text className="text-[#059669] font-bold text-[11px] mt-0.5">
                      2023 Statement Ready for Download
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Item 3: Background & Commercial Cover */}
              <TouchableOpacity
                onPress={() => setInsuranceModalVisible(true)}
                activeOpacity={0.8}
                className="flex-row items-center justify-between py-2.5 border-b border-gray-100"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center mr-3">
                    <Feather name="shield" size={16} color="#2563EB" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-textPrimary font-extrabold text-sm">
                      Background & Commercial Cover
                    </Text>
                    <Text className="text-textMuted text-[11px] mt-0.5">
                      {insurancePolicy}
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Item 4: Emergency SOS */}
              <TouchableOpacity
                onPress={() => setSosModalVisible(true)}
                activeOpacity={0.8}
                className="flex-row items-center justify-between py-2.5"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-9 h-9 rounded-xl bg-red-50 items-center justify-center mr-3">
                    <Feather name="alert-triangle" size={16} color="#DC2626" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[#DC2626] font-black text-sm">
                      Courier Safety & Emergency SOS
                    </Text>
                    <Text className="text-textMuted text-[11px] mt-0.5">
                      Instant roadside assistance & 911 telemetry
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── 6. App Settings & Help Section ── */}
          <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-4">
            <View className="flex-row items-center mb-3.5">
              <Feather name="settings" size={16} color="#EA580C" />
              <Text className="text-textPrimary font-black text-base ml-2">
                App Settings & Help
              </Text>
            </View>

            {/* Default Navigation GPS */}
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-textPrimary font-black text-xs">
                Default Navigation GPS
              </Text>
              <Text className="text-textMuted text-[11px] font-semibold">
                Turn-by-turn sync
              </Text>
            </View>

            {/* GPS App Selector */}
            <View className="flex-row bg-[#EEF4FF] p-1 rounded-2xl mb-3.5">
              {(['Google', 'Apple', 'Waze'] as NavigationApp[]).map((app) => {
                const isSelected = navigationApp === app;
                return (
                  <TouchableOpacity
                    key={app}
                    onPress={() => handleSelectNavigationApp(app)}
                    className={`flex-1 py-2 rounded-xl flex-row items-center justify-center ${
                      isSelected ? 'bg-white shadow-xs' : ''
                    }`}
                  >
                    <Feather
                      name="map-pin"
                      size={12}
                      color={isSelected ? '#9A3412' : '#6B7280'}
                    />
                    <Text
                      className={`text-xs font-black ml-1.5 ${
                        isSelected ? 'text-[#9A3412]' : 'text-textSecondary'
                      }`}
                    >
                      {app}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Cook Dispatch Support Card */}
            <View className="bg-[#EFF6FF] rounded-2xl p-3.5 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-2xl bg-[#FFEDD5] items-center justify-center mr-3">
                  <Feather name="headphones" size={18} color="#C25E00" />
                </View>
                <View className="flex-1">
                  <Text className="text-textPrimary font-extrabold text-sm">
                    Cook Dispatch Support
                  </Text>
                  <Text className="text-textMuted text-[11px] font-medium mt-0.5">
                    Dedicated 24/7 Home Kitchen Bridge
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleCallSupport}
                activeOpacity={0.85}
                className="bg-[#7C2D12] px-3.5 py-2 rounded-xl shadow-xs"
              >
                <Text className="text-white font-black text-xs">Call Now</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── 7. Go Offline & Log Out Button ── */}
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.85}
            className="bg-white border border-red-200 py-4 rounded-3xl items-center justify-center flex-row shadow-xs mb-3"
          >
            <Feather name="log-out" size={16} color="#DC2626" />
            <Text className="text-[#DC2626] font-black text-sm ml-2">
              Go Offline & Log Out
            </Text>
          </TouchableOpacity>

          {/* App Build Info */}
          <Text className="text-textMuted text-[11px] text-center font-medium">
            Homely Rider App v4.18.2 (Build 2049)
          </Text>
        </View>
      </ScrollView>

      {/* ── Modal 1: Vehicle Edit Modal (Persistent to Backend) ── */}
      <Modal
        visible={vehicleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVehicleModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6 border-t border-gray-150">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-textPrimary font-black text-lg">
                Edit Registered Vehicle
              </Text>
              <TouchableOpacity
                onPress={() => setVehicleModalVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Feather name="x" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-textMuted text-xs font-bold uppercase mb-1">
              Vehicle Type
            </Text>
            <View className="flex-row gap-2 mb-3">
              {(['E-Bike', 'Scooter', 'Bicycle', 'Car'] as VehicleOption[]).map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setModalVehicleType(v)}
                  className={`flex-1 py-2 rounded-xl items-center border ${
                    modalVehicleType === v
                      ? 'bg-orange-50 border-[#9A3412]'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      modalVehicleType === v ? 'text-[#9A3412]' : 'text-gray-600'
                    }`}
                  >
                    {v}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-textMuted text-xs font-bold uppercase mb-1">
              Vehicle Model Name
            </Text>
            <TextInput
              value={vehicleModel}
              onChangeText={setVehicleModel}
              placeholder="e.g. Rad Power E-Bike Pro or Honda Dio"
              className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-textPrimary mb-3"
            />

            <Text className="text-textMuted text-xs font-bold uppercase mb-1">
              License Plate / Fleet ID
            </Text>
            <TextInput
              value={plateNumber}
              onChangeText={setPlateNumber}
              placeholder="e.g. #EB-4092 or WP-BHM-7821"
              className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-textPrimary mb-5"
            />

            <TouchableOpacity
              onPress={handleSaveVehicleInfo}
              disabled={savingVehicle}
              className="bg-[#9A3412] py-4 rounded-2xl items-center shadow-md flex-row justify-center"
            >
              {savingVehicle ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-white font-black text-sm">SAVE VEHICLE INFO</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal 2: Edit Courier Profile Details Modal (Persistent to Backend & AuthStore) ── */}
      <Modal
        visible={profileEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProfileEditModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6 border-t border-gray-150">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-textPrimary font-black text-lg">
                Edit Courier Profile
              </Text>
              <TouchableOpacity
                onPress={() => setProfileEditModalVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Feather name="x" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-textMuted text-xs font-bold uppercase mb-1">
              Full Legal Name
            </Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Courier name"
              className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-textPrimary mb-3"
            />

            <Text className="text-textMuted text-xs font-bold uppercase mb-1">
              Phone Number
            </Text>
            <TextInput
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="+94 77 123 4567"
              keyboardType="phone-pad"
              className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-textPrimary mb-3"
            />

            <Text className="text-textMuted text-xs font-bold uppercase mb-1">
              Avatar Image URL
            </Text>
            <TextInput
              value={editAvatarUrl}
              onChangeText={setEditAvatarUrl}
              placeholder="https://..."
              autoCapitalize="none"
              className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-textPrimary mb-5"
            />

            <TouchableOpacity
              onPress={handleSaveProfileInfo}
              disabled={savingProfile}
              className="bg-[#9A3412] py-4 rounded-2xl items-center shadow-md flex-row justify-center"
            >
              {savingProfile ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-white font-black text-sm">SAVE PROFILE CHANGES</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal 3: Payout Method Modal ── */}
      <Modal
        visible={payoutModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPayoutModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6 border-t border-gray-150">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-textPrimary font-black text-lg">
                Direct Deposit Payout Details
              </Text>
              <TouchableOpacity
                onPress={() => setPayoutModalVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Feather name="x" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-textSecondary text-xs leading-5 mb-4">
              Instant earnings payouts are transferred to your verified checking account or debit card within 15 minutes of shift end.
            </Text>

            <Text className="text-textMuted text-xs font-bold uppercase mb-1">
              Bank / Card Method
            </Text>
            <TextInput
              value={editBank}
              onChangeText={setEditBank}
              placeholder="e.g. Commercial Bank •••• 5678 (Instant Active)"
              className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-textPrimary mb-5"
            />

            <TouchableOpacity
              onPress={handleSavePayoutMethod}
              disabled={savingPayout}
              className="bg-[#9A3412] py-4 rounded-2xl items-center shadow-md flex-row justify-center"
            >
              {savingPayout ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-white font-black text-sm">UPDATE PAYOUT METHOD</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal 4: Tax Documents Modal ── */}
      <Modal
        visible={taxModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTaxModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6 border-t border-gray-150">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-textPrimary font-black text-lg">
                📄 Tax Documents & 1099-NEC
              </Text>
              <TouchableOpacity
                onPress={() => setTaxModalVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Feather name="x" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl mb-4">
              <Text className="text-[#059669] font-black text-sm">
                2023 1099-NEC Form Available
              </Text>
              <Text className="text-textSecondary text-xs mt-1">
                Gross Courier Earnings for tax year: Rs. 486,200. Prepared under NeighborPlates Logistics Pvt Ltd.
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                Alert.alert('Download Started', 'Your 1099-NEC PDF statement is downloading to your device.');
                setTaxModalVisible(false);
              }}
              className="bg-[#7C2D12] py-4 rounded-2xl items-center shadow-md mb-2"
            >
              <Text className="text-white font-black text-sm">DOWNLOAD PDF STATEMENT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal 5: Commercial Insurance Cover Modal ── */}
      <Modal
        visible={insuranceModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInsuranceModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6 border-t border-gray-150">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-textPrimary font-black text-lg">
                🛡️ Commercial Coverage Certificate
              </Text>
              <TouchableOpacity
                onPress={() => setInsuranceModalVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Feather name="x" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="bg-blue-50 border border-blue-200 p-4 rounded-2xl mb-4">
              <Text className="text-blue-900 font-black text-sm">
                Active Policy: #NP-COV-88291
              </Text>
              <Text className="text-blue-800 text-xs mt-1">
                Valid through Nov 30, 2025. Covers comprehensive roadside third-party liability up to $1,000,000 and hot food loss compensation.
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setInsuranceModalVisible(false)}
              className="bg-gray-100 py-3.5 rounded-2xl items-center"
            >
              <Text className="text-textPrimary font-bold text-sm">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal 6: Emergency SOS Modal ── */}
      <Modal
        visible={sosModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSosModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6 border-t border-gray-150">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[#DC2626] font-black text-lg">
                🚨 Courier Safety & SOS
              </Text>
              <TouchableOpacity
                onPress={() => setSosModalVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Feather name="x" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-textSecondary text-xs leading-5 mb-5">
              Triggering SOS immediately shares your live telemetry coordinates and active delivery context with roadside emergency dispatch.
            </Text>

            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== 'web') Linking.openURL('tel:911');
                setSosModalVisible(false);
              }}
              className="bg-[#DC2626] py-4 rounded-2xl items-center mb-3 shadow-md"
            >
              <Text className="text-white font-black text-sm">CALL EMERGENCY 911</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Alert.alert('Assistance Requested', 'Homely Roadside Dispatch has been alerted to your position.');
                setSosModalVisible(false);
              }}
              className="bg-gray-100 py-3.5 rounded-2xl items-center"
            >
              <Text className="text-textPrimary font-bold text-xs">
                Request Roadside Tire / Mechanical Aid
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};
