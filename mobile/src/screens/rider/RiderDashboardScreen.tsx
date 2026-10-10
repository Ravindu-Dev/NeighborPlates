import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, Image, Modal, Platform, Alert,
  Animated, ActivityIndicator, Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { RiderOrderCard, RiderJobItem } from '../../components/rider/RiderOrderCard';
import { Feather } from '@expo/vector-icons';

let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {}
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type FilterType = 'all' | 'nearby' | 'payout' | 'ready';
type ViewMode = 'list' | 'map';

const getDeliveryJobsMapHtml = (
  jobs: (RiderJobItem & { lat: number; lon: number })[],
  selectedJobId?: string
) => {
  const serializedJobs = JSON.stringify(
    jobs.map((j) => ({
      id: j.id,
      name: j.cookName,
      payout:
        typeof j.payoutAmount === 'number'
          ? j.payoutAmount.toFixed(j.payoutAmount % 1 === 0 ? 0 : 2)
          : j.payoutAmount,
      distance: j.pickupDistance,
      dish: j.highlightDish,
      lat: j.lat,
      lon: j.lon,
    }))
  );

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .job-pin {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
    }
    .job-badge {
      background: #7C2D12;
      color: #FFF;
      font-weight: 800;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 12px;
      white-space: nowrap;
      box-shadow: 0 4px 14px rgba(0,0,0,0.35);
      border: 1.5px solid #FFF;
      transition: all 0.2s ease;
    }
    .job-badge.active {
      background: #EA580C;
      transform: scale(1.15);
      box-shadow: 0 0 16px rgba(234,88,12,0.9);
      border-color: #FEF08A;
    }
    .pin-circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #EA580C;
      border: 3px solid #FFF;
      box-shadow: 0 0 12px rgba(234,88,12,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      margin-top: 2px;
    }
    .rider-pin {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #10B981;
      border: 3px solid #FFF;
      box-shadow: 0 0 18px rgba(16,185,129,0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }
    .pulse-ring {
      border: 3px solid #10B981;
      border-radius: 50%;
      height: 60px;
      width: 60px;
      position: absolute;
      left: -30px;
      top: -30px;
      animation: pulsate 2s ease-out infinite;
      opacity: 0;
    }
    @keyframes pulsate {
      0% { transform: scale(0.1, 0.1); opacity: 0; }
      50% { opacity: 0.8; }
      100% { transform: scale(1.2, 1.2); opacity: 0; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var riderLat = 6.9271, riderLon = 79.8612;
    var map = L.map('map', { zoomControl: false }).setView([riderLat, riderLon], 14);
    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=sk-OP85plgYVLRSP0UYseCWtvvDJITdJ3mgrBVjGmh9OzAnaVWL', {
      maxZoom: 20,
      attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Radar Nearby Range Zone (< 3 km)
    L.circle([riderLat, riderLon], {
      radius: 2600,
      color: '#EA580C',
      fillColor: '#FFEDD5',
      fillOpacity: 0.18,
      weight: 1.5,
      dashArray: '6, 6'
    }).addTo(map);

    // Rider Marker with Pulse Ring
    var riderHtml = '<div style="position:relative;display:flex;align-items:center;justify-content:center;">' +
      '<div class="pulse-ring"></div>' +
      '<div class="rider-pin">🛵</div>' +
      '</div>';
    L.marker([riderLat, riderLon], {
      icon: L.divIcon({ html: riderHtml, className: '', iconSize: [38, 38], iconAnchor: [19, 19] })
    }).addTo(map).bindPopup('<b style="font-size:12px;">You are here</b><br/><span style="color:#6B7280;font-size:11px;">Westwood Food Hub (GPS Online 🟢)</span>');

    // Jobs coordinates mapping
    var jobs = ${serializedJobs};

    jobs.forEach(function(job) {
      var isAct = job.id === '${selectedJobId || ''}';
      var badgeClass = isAct ? 'job-badge active' : 'job-badge';

      var pinHtml = '<div class="job-pin" onclick="selectJob(\\'' + job.id + '\\')">' +
        '<div class="' + badgeClass + '">RS ' + job.payout + '</div>' +
        '<div class="pin-circle">🍽</div>' +
        '</div>';

      var marker = L.marker([job.lat, job.lon], {
        icon: L.divIcon({ html: pinHtml, className: '', iconSize: [110, 56], iconAnchor: [55, 48] })
      }).addTo(map);

      // Dash line connecting rider to nearby job
      L.polyline([[riderLat, riderLon], [job.lat, job.lon]], {
        color: isAct ? '#EA580C' : '#94A3B8',
        weight: isAct ? 3 : 1.5,
        opacity: isAct ? 0.85 : 0.45,
        dashArray: '5, 6'
      }).addTo(map);

      marker.bindPopup(
        '<div style="font-family:sans-serif;min-width:140px;">' +
        '<b style="font-size:13px;color:#1A1A2E;">' + job.name + '</b><br/>' +
        '<span style="color:#6B7280;font-size:11px;">' + job.distance + ' • ' + job.dish + '</span><br/>' +
        '<b style="color:#C25E00;font-size:14px;margin-top:2px;display:inline-block;">RS ' + job.payout + '</b>' +
        '</div>'
      );
    });

    function selectJob(id) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_JOB', id: id }));
      }
    }
  </script>
</body>
</html>`;
};

export const RiderDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const [profile, setProfile] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('nearby');
  const [viewMode, setViewMode] = useState<ViewMode>('list'); // 'list' or 'map'
  const [jobs, setJobs] = useState<(RiderJobItem & { lat: number; lon: number })[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [selectedJob, setSelectedJob] = useState<RiderJobItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [accepting, setAccepting] = useState(false);

  // Animated spin for the auto-refreshing indicator
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const fetchData = async () => {
    try {
      const [profileRes, availableRes, summaryRes] = await Promise.allSettled([
        api.get('/api/users/profile'),
        api.get('/api/orders/available'),
        api.get('/api/riders/summary'),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.data) {
        setProfile(profileRes.value.data);
        setIsOnline(profileRes.value.data?.profile?.isAvailable ?? true);
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value.data) {
        setSummary(summaryRes.value.data);
      }

      if (
        availableRes.status === 'fulfilled' &&
        Array.isArray(availableRes.value.data)
      ) {
        const mappedLiveJobs = availableRes.value.data.map((order: any, idx: number) => {
          const cookName = order.cookName || 'Home Cook';
          const payout = order.riderEarnings || Math.max(150, Math.round((order.totalAmount || 0) * 0.15));
          const foodName = order.items?.[0]?.name || 'Prepared Meal';
          const cookCoords = order.cookCoordinates || [79.8612, 6.9271];
          const cookLat = typeof cookCoords[1] === 'number' ? cookCoords[1] : (6.9271 + (idx * 0.005));
          const cookLon = typeof cookCoords[0] === 'number' ? cookCoords[0] : (79.8612 + (idx * 0.005));

          return {
            id: order.id,
            orderNumber: order.orderNumber,
            cookName,
            isVerified: true,
            distancePickup: order.cookAddressLabel || 'Home Kitchen',
            estimatedTime: 'Ready Now',
            payoutAmount: payout,
            payoutTag: {
              type: 'ready_now' as const,
              text: 'Ready Now',
            },
            pickupDistance: order.cookAddressLabel || 'Home Kitchen',
            dropoffDistance: order.address?.label ? (order.address.label.length > 18 ? order.address.label.slice(0, 16) + '...' : order.address.label) : 'Customer Address',
            packageSummary: {
              label: 'Items',
              value: `${order.items?.length || 1} Item${(order.items?.length || 1) > 1 ? 's' : ''}`,
              isHighlight: false,
            },
            highlightDish: `🍲 ${foodName}${order.items?.length > 1 ? ` (+${order.items.length - 1} more)` : ''}`,
            imageUrl: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=400&q=80',
            lat: cookLat,
            lon: cookLon,
            rawOrder: order,
          };
        });
        setJobs(mappedLiveJobs);
      } else {
        setJobs([]);
      }
    } catch (err) {
      console.warn('[RiderDashboard] data fetch warning', err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const checkOnboarding = async () => {
      const done = await AsyncStorage.getItem(`rider_onboarded_${user?.id}`);
      if (!done && user?.role === 'RIDER') {
        navigation.navigate('Onboarding');
        return;
      }
      fetchData();
    };
    checkOnboarding();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation]);

  const handleToggleOnline = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTogglingOnline(true);
    const newState = !isOnline;
    setIsOnline(newState);
    try {
      await api.put(`/api/riders/availability?isAvailable=${newState}`);
    } catch (err) {
      console.warn('[RiderDashboard] toggle availability warning', err);
    } finally {
      setTogglingOnline(false);
    }
  };

  // Filter jobs logic
  const filteredJobs = jobs.filter((job) => {
    if (activeFilter === 'nearby') {
      return true; // All fetched jobs are already in rider's serviceable area
    }
    if (activeFilter === 'payout') {
      const amt =
        typeof job.payoutAmount === 'number'
          ? job.payoutAmount
          : parseFloat(job.payoutAmount);
      return amt >= 500;
    }
    if (activeFilter === 'ready') {
      return job.payoutTag?.type === 'ready_now';
    }
    return true;
  });

  const handleOpenJob = (job: RiderJobItem) => {
    setSelectedJob(job);
    setModalVisible(true);
  };

  const handleAcceptJob = async (job: RiderJobItem) => {
    const targetOrderId = job.rawOrder?.id || job.id;
    if (!targetOrderId) return;

    setAccepting(true);
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      await api.put(`/api/orders/${targetOrderId}/rider-accept`);
      setModalVisible(false);
      navigation.navigate('ActiveDelivery', { orderId: targetOrderId });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409 || err?.response?.data?.message?.includes('Someone else')) {
        Alert.alert('Order Taken', 'Another rider accepted this job just now.', [
          { text: 'OK' },
        ]);
      } else {
        Alert.alert('Unable to Accept', err?.response?.data?.message || 'Could not accept order.');
      }
      fetchData();
    } finally {
      setAccepting(false);
    }
  };

  const handleMapMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SELECT_JOB' && data.id) {
        const target = jobs.find((j) => j.id === data.id);
        if (target) {
          handleOpenJob(target);
        }
      }
    } catch (e) {}
  };

  const deriveRiderName = () => {
    if (profile?.profile?.name && profile.profile.name.trim().length > 0) return profile.profile.name.trim();
    if (user?.name && user.name.trim().length > 0) return user.name.trim();
    const emailToUse = user?.email || profile?.email;
    if (emailToUse) {
      const part = emailToUse.split('@')[0];
      return part.charAt(0).toUpperCase() + part.slice(1);
    }
    return 'Rider';
  };
  const riderDisplayName = deriveRiderName();

  const vehicleType = profile?.profile?.vehicleType || 'E-Bike';
  const vehicleModelName = profile?.profile?.vehicleModel || `${vehicleType} Active`;
  const avatarUrl =
    profile?.profile?.avatarUrl ||
    user?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(riderDisplayName)}&background=9A3412&color=fff&bold=true&size=256`;

  const mapHtml = getDeliveryJobsMapHtml(filteredJobs, selectedJob?.id);

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#B45309"
            colors={['#B45309']}
          />
        }
      >
        <View className="px-4 pt-14">
          {/* ── 1. Top Header (Homely Rider | Ready Pill | Avatar) ── */}
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
                  AVAILABLE JOBS
                </Text>
              </View>
            </View>

            {/* Ready Badge & Avatar */}
            <View className="flex-row items-center gap-2.5">
              <TouchableOpacity
                onPress={handleToggleOnline}
                activeOpacity={0.8}
                className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                  isOnline
                    ? 'bg-[#ECFDF5] border-[#A7F3D0]'
                    : 'bg-gray-100 border-gray-200'
                }`}
              >
                <View
                  className={`w-2 h-2 rounded-full mr-1.5 ${
                    isOnline ? 'bg-[#10B981]' : 'bg-gray-400'
                  }`}
                />
                <Text
                  className={`text-xs font-bold ${
                    isOnline ? 'text-[#059669]' : 'text-gray-500'
                  }`}
                >
                  {isOnline ? 'Ready' : 'Offline'}
                </Text>
              </TouchableOpacity>

              {/* Rider Avatar */}
              <TouchableOpacity
                onPress={() => navigation.navigate('Rider')}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: avatarUrl }}
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm bg-gray-200"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── 2. Active Hub & Online Switch Hero Card ── */}
          <View className="bg-white rounded-3xl p-4 mb-4 border border-gray-100 shadow-sm">
            {/* Upper Row: Vehicle Icon + Hub + Switch */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-12 h-12 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] items-center justify-center mr-3">
                  <Text style={{ fontSize: 22 }}>
                    {vehicleType === 'Motorcycle'
                      ? '🛵'
                      : vehicleType === 'Car'
                      ? '🚗'
                      : vehicleType === 'Walking'
                      ? '🚶'
                      : '🚲'}
                  </Text>
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-textPrimary font-extrabold text-base" numberOfLines={1}>
                      {vehicleModelName}
                    </Text>
                    <View className="w-2 h-2 rounded-full bg-[#10B981] ml-1.5" />
                  </View>
                  <Text
                    className="text-textMuted text-xs font-medium mt-0.5"
                    numberOfLines={1}
                  >
                    {isOnline ? 'Online • Homely Delivery Network' : 'Offline'}
                  </Text>
                </View>
              </View>

              {/* Modern iOS-style toggle */}
              <TouchableOpacity
                onPress={handleToggleOnline}
                disabled={togglingOnline}
                activeOpacity={0.85}
                accessibilityRole="switch"
                accessibilityState={{ checked: isOnline }}
                className={`w-14 h-8 rounded-full p-1 justify-center ${
                  isOnline ? 'bg-[#10B981]' : 'bg-gray-200'
                }`}
              >
                <View
                  className={`w-6 h-6 rounded-full bg-white shadow-sm ${
                    isOnline ? 'self-end' : 'self-start'
                  }`}
                />
              </TouchableOpacity>
            </View>

            {/* Lower Banner: Real Shift Metrics */}
            <View className="bg-[#FFF7ED] border border-[#FFEDD5] p-3 rounded-2xl mt-3.5 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <Text style={{ fontSize: 14 }}>📊</Text>
                <Text className="text-[#7C2D12] text-xs font-extrabold ml-1.5">
                  Today's Delivered: {summary?.today?.deliveryCount ?? 0} trips
                </Text>
              </View>

              <View className="bg-[#7C2D12] px-2.5 py-1 rounded-full">
                <Text className="text-white text-[11px] font-black">
                  RS {summary?.today?.earnings ? summary.today.earnings.toFixed(2) : '0.00'}
                </Text>
              </View>
            </View>
          </View>

          {/* Active Order Banner if rider has order in progress */}
          {summary?.activeOrder && (
            <TouchableOpacity
              onPress={() => navigation.navigate('ActiveDelivery', { orderId: summary.activeOrder.id })}
              activeOpacity={0.9}
              className="bg-[#EFF6FF] rounded-3xl p-4 mb-4 border border-blue-200 shadow-sm"
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <View className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-2" />
                  <Text className="text-blue-900 font-black text-xs uppercase tracking-wider">
                    Active Delivery In Progress
                  </Text>
                </View>
                <View className="bg-blue-600 px-2.5 py-0.5 rounded-full">
                  <Text className="text-white text-[10px] font-black">
                    {summary.activeOrder.status === 'READY' ? 'READY FOR PICKUP' : summary.activeOrder.status}
                  </Text>
                </View>
              </View>
              <Text className="text-textPrimary font-extrabold text-base mb-0.5">
                {summary.activeOrder.cookName} → {summary.activeOrder.customerName}
              </Text>
              <Text className="text-textMuted text-xs mb-3">
                Order #{summary.activeOrder.orderNumber || summary.activeOrder.id.slice(-6)} • RS {summary.activeOrder.riderEarnings ? summary.activeOrder.riderEarnings.toFixed(2) : '150.00'}
              </Text>
              <View className="bg-blue-600 py-2.5 px-4 rounded-xl flex-row items-center justify-center">
                <Feather name="navigation" size={14} color="#FFFFFF" />
                <Text className="text-white font-extrabold text-xs ml-2">Resume Active Delivery Route →</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* ── 3. Filter Chips Row ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row mb-4"
            contentContainerStyle={{ paddingRight: 8 }}
          >
            {/* Filter 1: Nearby */}
            <TouchableOpacity
              onPress={() =>
                setActiveFilter(activeFilter === 'nearby' ? 'all' : 'nearby')
              }
              activeOpacity={0.8}
              className={`flex-row items-center px-4 py-2.5 rounded-full mr-2.5 ${
                activeFilter === 'nearby'
                  ? 'bg-[#9A3412]'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <Feather
                name="sliders"
                size={13}
                color={activeFilter === 'nearby' ? '#FFFFFF' : '#6B7280'}
              />
              <Text
                className={`text-xs font-extrabold ml-2 ${
                  activeFilter === 'nearby' ? 'text-white' : 'text-textPrimary'
                }`}
              >
                Nearby (&lt; 3 km)
              </Text>
            </TouchableOpacity>

            {/* Filter 2: High Payout */}
            <TouchableOpacity
              onPress={() =>
                setActiveFilter(activeFilter === 'payout' ? 'all' : 'payout')
              }
              activeOpacity={0.8}
              className={`flex-row items-center px-4 py-2.5 rounded-full mr-2.5 ${
                activeFilter === 'payout'
                  ? 'bg-[#9A3412]'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <Feather
                name="dollar-sign"
                size={13}
                color={activeFilter === 'payout' ? '#FFFFFF' : '#10B981'}
              />
              <Text
                className={`text-xs font-extrabold ml-1.5 ${
                  activeFilter === 'payout' ? 'text-white' : 'text-textPrimary'
                }`}
              >
                High Payout (RS 1000+)
              </Text>
            </TouchableOpacity>

            {/* Filter 3: Ready Now */}
            <TouchableOpacity
              onPress={() =>
                setActiveFilter(activeFilter === 'ready' ? 'all' : 'ready')
              }
              activeOpacity={0.8}
              className={`flex-row items-center px-4 py-2.5 rounded-full ${
                activeFilter === 'ready'
                  ? 'bg-[#9A3412]'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <Feather
                name="clock"
                size={13}
                color={activeFilter === 'ready' ? '#FFFFFF' : '#EA580C'}
              />
              <Text
                className={`text-xs font-extrabold ml-1.5 ${
                  activeFilter === 'ready' ? 'text-white' : 'text-textPrimary'
                }`}
              >
                Ready Now
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* ── 4. View Mode Switcher: List View vs Live Map ── */}
          <View className="flex-row items-center bg-gray-200/70 p-1 rounded-2xl mb-4">
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setViewMode('list');
              }}
              activeOpacity={0.8}
              className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center ${
                viewMode === 'list' ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Feather
                name="list"
                size={14}
                color={viewMode === 'list' ? '#9A3412' : '#6B7280'}
              />
              <Text
                className={`text-xs font-black ml-1.5 ${
                  viewMode === 'list' ? 'text-[#9A3412]' : 'text-textSecondary'
                }`}
              >
                List View
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setViewMode('map');
              }}
              activeOpacity={0.8}
              className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center ${
                viewMode === 'map' ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Feather
                name="map-pin"
                size={14}
                color={viewMode === 'map' ? '#9A3412' : '#6B7280'}
              />
              <Text
                className={`text-xs font-black ml-1.5 ${
                  viewMode === 'map' ? 'text-[#9A3412]' : 'text-textSecondary'
                }`}
              >
                Live Map Radar 🔴
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── 5. LIVE MAP RADAR (Showing nearest delivery jobs pinned on live map) ── */}
          {viewMode === 'map' ? (
            <View className="mb-5">
              {/* Live Map Card */}
              <View className="h-80 bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-sm relative">
                {WebView ? (
                  <WebView
                    source={{ html: mapHtml }}
                    style={{ flex: 1 }}
                    scrollEnabled={false}
                    onMessage={handleMapMessage}
                  />
                ) : Platform.OS === 'web' ? (
                  <iframe
                    srcDoc={mapHtml}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="Live Jobs Map"
                  />
                ) : (
                  <View className="flex-1 bg-gray-100 items-center justify-center">
                    <Feather name="map" size={40} color="#9CA3AF" />
                    <Text className="text-textMuted text-xs mt-2">Loading live map...</Text>
                  </View>
                )}

                {/* Floating Map Status Overlay */}
                <View className="absolute top-3 left-3 bg-white/95 px-3 py-1.5 rounded-full border border-gray-100 shadow-md flex-row items-center">
                  <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                  <Text className="text-textPrimary font-extrabold text-[11px]">
                    {filteredJobs.length} Nearest Jobs on Radar
                  </Text>
                </View>

                {/* Recenter Button */}
                <TouchableOpacity
                  onPress={onRefresh}
                  activeOpacity={0.8}
                  className="absolute bottom-3 right-3 w-10 h-10 rounded-2xl bg-white items-center justify-center shadow-md border border-gray-100"
                >
                  <Feather name="navigation" size={18} color="#EA580C" />
                </TouchableOpacity>
              </View>

              {/* Horizontal Carousel of Nearest Delivery Jobs below the Map */}
              <Text className="text-textPrimary text-sm font-black mt-4 mb-2">
                Nearest Delivery Jobs ({filteredJobs.length})
              </Text>
              {filteredJobs.length === 0 ? (
                <View className="bg-white rounded-2xl p-6 border border-gray-150 items-center justify-center my-2 shadow-xs">
                  <Feather name="inbox" size={24} color="#9CA3AF" />
                  <Text className="text-textPrimary font-bold text-sm mt-2">No active jobs on map</Text>
                  <Text className="text-textMuted text-xs text-center mt-1">Ready orders from nearby kitchens will appear as pins on this radar.</Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 8 }}
                  className="flex-row"
                >
                  {filteredJobs.map((job) => (
                    <View key={job.id} style={{ width: SCREEN_WIDTH * 0.82 }} className="mr-3">
                      <RiderOrderCard
                        job={job}
                        onAccept={() => handleOpenJob(job)}
                        accepting={accepting && selectedJob?.id === job.id}
                      />
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : (
            /* Mini Map preview card inside List View */
            <View className="mb-4">
              <View className="h-44 bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-sm relative">
                {WebView ? (
                  <WebView
                    source={{ html: mapHtml }}
                    style={{ flex: 1 }}
                    scrollEnabled={false}
                    onMessage={handleMapMessage}
                  />
                ) : Platform.OS === 'web' ? (
                  <iframe
                    srcDoc={mapHtml}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="Live Jobs Radar Preview"
                  />
                ) : (
                  <View className="flex-1 bg-gray-100 items-center justify-center">
                    <Feather name="map" size={30} color="#9CA3AF" />
                  </View>
                )}

                {/* Floating pill over mini map */}
                <View className="absolute top-2.5 left-2.5 bg-white/95 px-3 py-1 rounded-full border border-gray-150 shadow-sm flex-row items-center">
                  <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                  <Text className="text-textPrimary font-extrabold text-[10px]">
                    Live Radar: {filteredJobs.length} Jobs Nearby
                  </Text>
                </View>

                {/* Expand Map button */}
                <TouchableOpacity
                  onPress={() => setViewMode('map')}
                  activeOpacity={0.8}
                  className="absolute bottom-2.5 right-2.5 bg-[#9A3412] px-3 py-1.5 rounded-xl shadow-md flex-row items-center"
                >
                  <Feather name="maximize-2" size={11} color="#FFFFFF" />
                  <Text className="text-white font-black text-[11px] ml-1.5">
                    Expand Map
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── 6. Section Title Row ("Available Nearby" + Live Badge + Auto-refreshing) ── */}
          {viewMode === 'list' && (
            <>
              <View className="flex-row items-center justify-between mb-3.5">
                <View className="flex-row items-center">
                  <Text className="text-textPrimary text-lg font-black tracking-tight">
                    Available Nearby
                  </Text>
                  <View className="bg-[#EEF2FF] px-2.5 py-0.5 rounded-full ml-2">
                    <Text className="text-[#4F46E5] text-xs font-extrabold">
                      {filteredJobs.length} live
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={onRefresh}
                  activeOpacity={0.7}
                  className="flex-row items-center"
                >
                  <Animated.View style={{ transform: [{ rotate: spin }] }}>
                    <Feather name="refresh-cw" size={12} color="#059669" />
                  </Animated.View>
                  <Text className="text-textMuted text-xs font-semibold ml-1.5">
                    Auto-refreshing
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ── List of Job Cards or Empty/Loading State ── */}
              {loading ? (
                <View className="py-12 items-center justify-center">
                  <ActivityIndicator size="large" color="#EA580C" />
                  <Text className="text-textMuted text-xs mt-3 font-semibold">Scanning radar for live orders...</Text>
                </View>
              ) : filteredJobs.length === 0 ? (
                <View className="bg-white rounded-3xl p-8 items-center justify-center border border-gray-100 shadow-sm my-2">
                  <View className="w-16 h-16 rounded-full bg-orange-50 items-center justify-center mb-3">
                    <Feather name="package" size={28} color="#EA580C" />
                  </View>
                  <Text className="text-textPrimary font-extrabold text-base text-center">
                    {isOnline ? 'No Available Deliveries Right Now' : 'You Are Currently Offline'}
                  </Text>
                  <Text className="text-textMuted text-xs text-center mt-1.5 leading-5 max-w-xs">
                    {isOnline
                      ? 'When nearby cooks have freshly prepared meals ready for dispatch, they will appear here.'
                      : 'Toggle your status to "Ready" above to start receiving dispatch requests.'}
                  </Text>
                  {isOnline && (
                    <TouchableOpacity
                      onPress={onRefresh}
                      activeOpacity={0.8}
                      className="mt-4 bg-[#FFF7ED] border border-[#FFEDD5] px-4 py-2 rounded-full flex-row items-center"
                    >
                      <Feather name="refresh-cw" size={12} color="#EA580C" />
                      <Text className="text-[#EA580C] font-bold text-xs ml-1.5">Refresh Radar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                filteredJobs.map((job) => (
                  <RiderOrderCard
                    key={job.id}
                    job={job}
                    onAccept={() => handleOpenJob(job)}
                    accepting={accepting && selectedJob?.id === job.id}
                  />
                ))
              )}
            </>
          )}

          {/* ── 7. Rider Tip Card (Bottom Banner) ── */}
          <View className="bg-[#EEF4FF] rounded-3xl p-4 border border-blue-100 flex-row items-start mt-2 mb-4">
            <View className="w-10 h-10 rounded-full bg-[#FFEDD5] items-center justify-center mr-3 mt-0.5">
              <Text style={{ fontSize: 18 }}>💡</Text>
            </View>
            <View className="flex-1">
              <Text className="text-textPrimary font-extrabold text-sm mb-1">
                Rider Tip: Warm Packaging
              </Text>
              <Text className="text-textSecondary text-xs leading-5">
                Home cooks pack fresh off the flame! Keep thermal zippers sealed to lock in 5-star ratings and bigger tips.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── 8. Order Details & Acceptance Modal (View & Accept Sheet) ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 border-t border-gray-150">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-textPrimary font-black text-xl">
                  {selectedJob?.cookName}
                </Text>
                <Text className="text-textMuted text-xs font-medium">
                  Job {selectedJob?.orderNumber || '#NP-LIVE'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Feather name="x" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Fare Breakdown Card */}
            <View className="bg-[#FFF7ED] rounded-2xl p-4 border border-[#FFEDD5] mb-4">
              <Text className="text-[#7C2D12] text-xs font-bold uppercase tracking-wider mb-2">
                Estimated Earnings Breakdown
              </Text>
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-textSecondary text-xs">Guaranteed Delivery Fee</Text>
                <Text className="text-textPrimary font-bold text-xs">
                  RS {selectedJob ? (typeof selectedJob.payoutAmount === 'number' ? selectedJob.payoutAmount.toFixed(2) : selectedJob.payoutAmount) : '150.00'}
                </Text>
              </View>
              <View className="h-px bg-[#FED7AA] my-1.5" />
              <View className="flex-row justify-between items-center">
                <Text className="text-textPrimary font-extrabold text-sm">
                  Total Guaranteed Payout
                </Text>
                <Text className="text-textPrimary font-black text-lg">
                  RS {selectedJob ? (typeof selectedJob.payoutAmount === 'number' ? selectedJob.payoutAmount.toFixed(2) : selectedJob.payoutAmount) : '150.00'}
                </Text>
              </View>
            </View>

            {/* Trip Details */}
            <View className="bg-gray-50 rounded-2xl p-4 border border-gray-150 mb-5">
              <View className="flex-row items-center mb-3">
                <View className="w-7 h-7 rounded-full bg-orange-100 items-center justify-center mr-3">
                  <Feather name="map-pin" size={14} color="#EA580C" />
                </View>
                <View className="flex-1">
                  <Text className="text-textMuted text-[10px] font-bold uppercase">
                    Pickup Kitchen
                  </Text>
                  <Text className="text-textPrimary font-bold text-xs">
                    {selectedJob?.cookName} ({selectedJob?.pickupDistance || 'Kitchen'})
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <View className="w-7 h-7 rounded-full bg-blue-100 items-center justify-center mr-3">
                  <Feather name="navigation" size={14} color="#2563EB" />
                </View>
                <View className="flex-1">
                  <Text className="text-textMuted text-[10px] font-bold uppercase">
                    Dropoff Destination
                  </Text>
                  <Text className="text-textPrimary font-bold text-xs">
                    {selectedJob?.rawOrder?.address?.label || selectedJob?.dropoffDistance || 'Customer Address'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
                className="flex-1 py-4 rounded-2xl bg-gray-100 items-center justify-center"
              >
                <Text className="text-textSecondary font-bold text-sm">Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => selectedJob && handleAcceptJob(selectedJob)}
                disabled={accepting}
                activeOpacity={0.85}
                className="flex-[2] py-4 rounded-2xl bg-[#9A3412] items-center justify-center flex-row"
              >
                {accepting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="check" size={16} color="#FFFFFF" />
                    <Text className="text-white font-black text-sm ml-2">
                      ACCEPT JOB & DISPATCH
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
