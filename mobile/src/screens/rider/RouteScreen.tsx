import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  Image,
  Modal,
  TextInput,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { SlideToConfirm } from '../../components/rider/SlideToConfirm';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {}
}

const getNavigationMapHtml = (
  cookLat: number,
  cookLon: number,
  custLat: number,
  custLon: number,
  cookName: string,
  custName: string,
  stage: 1 | 2
) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #0B1120; }
    .cook-label {
      background: #C25E00;
      color: #fff;
      font-weight: 800;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 8px;
      white-space: nowrap;
      box-shadow: 0 4px 14px rgba(0,0,0,0.6);
      border: 1px solid rgba(255,255,255,0.25);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .cust-label {
      background: #1D4ED8;
      color: #fff;
      font-weight: 800;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 8px;
      white-space: nowrap;
      box-shadow: 0 4px 14px rgba(0,0,0,0.6);
      border: 1px solid rgba(255,255,255,0.25);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var cookLat = ${cookLat};
    var cookLon = ${cookLon};
    var custLat = ${custLat};
    var custLon = ${custLon};
    var stage = ${stage};
    var cookLabelText = ${JSON.stringify(cookName)};
    var custLabelText = ${JSON.stringify(custName)};

    var centerLat = (cookLat + custLat) / 2;
    var centerLon = (cookLon + custLon) / 2;

    var map = L.map('map', { zoomControl: false }).fitBounds([
      [cookLat, cookLon],
      [custLat, custLon]
    ], { padding: [50, 50] });

    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=sk-OP85plgYVLRSP0UYseCWtvvDJITdJ3mgrBVjGmh9OzAnaVWL', {
      maxZoom: 20,
      attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var routePoints = [
      [cookLat, cookLon],
      [(cookLat * 2 + custLat) / 3, (cookLon * 2 + custLon) / 3],
      [(cookLat + custLat * 2) / 3, (cookLon + custLon * 2) / 3],
      [custLat, custLon]
    ];

    // Glowing Under-Line
    L.polyline(routePoints, {
      color: '#FB923C',
      weight: 10,
      opacity: 0.25,
      lineCap: 'round'
    }).addTo(map);

    // Main Neon Orange Nav Line
    L.polyline(routePoints, {
      color: '#EA580C',
      weight: 4,
      opacity: 0.95,
      dashArray: '8, 8',
      lineCap: 'round'
    }).addTo(map);

    // Cook Marker
    var cookHtml = '<div style="display:flex;flex-direction:column;align-items:center;">' +
      '<div class="cook-label">' + cookLabelText + ' (Pickup)</div>' +
      '<div style="width:28px;height:28px;border-radius:50%;background:#C25E00;border:3px solid #FFF;box-shadow:0 0 16px rgba(234,88,12,0.9);display:flex;align-items:center;justify-content:center;font-size:13px;margin-top:4px;">🍳</div>' +
      '</div>';
    L.marker([cookLat, cookLon], {
      icon: L.divIcon({ html: cookHtml, className: '', iconSize: [140, 60], iconAnchor: [70, 55] })
    }).addTo(map);

    // Customer Marker
    var custHtml = '<div style="display:flex;flex-direction:column;align-items:center;">' +
      '<div class="cust-label">' + custLabelText + ' (Dropoff)</div>' +
      '<div style="width:28px;height:28px;border-radius:50%;background:#2563EB;border:3px solid #FFF;box-shadow:0 0 16px rgba(37,99,235,0.9);display:flex;align-items:center;justify-content:center;font-size:13px;margin-top:4px;">📍</div>' +
      '</div>';
    L.marker([custLat, custLon], {
      icon: L.divIcon({ html: custHtml, className: '', iconSize: [140, 60], iconAnchor: [70, 55] })
    }).addTo(map);

    // Animated Rider Marker
    var riderStart = stage === 1 ? [cookLat, cookLon] : [cookLat, cookLon];
    var riderEnd = stage === 1 ? [cookLat, cookLon] : [custLat, custLon];

    var riderMarker = L.marker(riderStart, {
      icon: L.divIcon({
        html: '<div style="width:32px;height:32px;border-radius:50%;background:#10B981;border:3px solid #FFF;box-shadow:0 0 16px rgba(16,185,129,0.9);display:flex;align-items:center;justify-content:center;font-size:16px;">🛵</div>',
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
    }).addTo(map);

    if (stage === 2) {
      var startTime = Date.now();
      var duration = 20000;
      function animate() {
        var progress = ((Date.now() - startTime) % duration) / duration;
        var curLat = cookLat + (custLat - cookLat) * progress;
        var curLon = cookLon + (custLon - cookLon) * progress;
        riderMarker.setLatLng([curLat, curLon]);
        requestAnimationFrame(animate);
      }
      animate();
    }
  </script>
</body>
</html>`;

export const RouteScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [stage, setStage] = useState<1 | 2>(1);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [messageSentToast, setMessageSentToast] = useState(false);

  const passedOrderId = route.params?.orderId;

  const fetchActiveOrder = async () => {
    try {
      let order: any = null;

      if (passedOrderId) {
        try {
          const res = await api.get(`/api/orders/${passedOrderId}`);
          order = res.data;
        } catch {
          // ignore error and fallback to finding from my orders
        }
      }

      if (!order) {
        const res = await api.get('/api/orders/my');
        const inProgress = res.data.find(
          (o: any) => o.status === 'READY' || o.status === 'ACCEPTED' || o.status === 'DELIVERING'
        );
        if (inProgress) {
          order = inProgress;
        }
      }

      if (order && (order.status === 'READY' || order.status === 'ACCEPTED' || order.status === 'DELIVERING')) {
        setActiveOrder(order);
        setStage(order.status === 'DELIVERING' ? 2 : 1);
      } else {
        setActiveOrder(null);
      }
    } catch {
      setActiveOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchActiveOrder();
    }
  }, [isFocused, passedOrderId]);

  // Handle stage transitions
  const handleConfirmArrivalOrPickup = async () => {
    if (!activeOrder) return;

    if (stage === 1) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      try {
        const res = await api.put(`/api/orders/${activeOrder.id}/status?status=DELIVERING`);
        setActiveOrder(res.data);
        setStage(2);
      } catch (e: any) {
        const msg = e?.response?.data?.message || 'Could not update to in-transit status.';
        Alert.alert('Status Error', msg);
      }
    } else {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      try {
        const res = await api.put(`/api/orders/${activeOrder.id}/status?status=DELIVERED`);
        navigation.replace('DeliveryConfirmation', {
          orderId: activeOrder.id,
          earnings: res.data.riderEarnings ?? activeOrder.riderEarnings ?? 0,
        });
      } catch (e: any) {
        const msg = e?.response?.data?.message || 'Could not complete delivery.';
        Alert.alert('Status Error', msg);
      }
    }
  };

  const handleCall = (phoneNumber?: string, roleName?: string) => {
    if (!phoneNumber || phoneNumber.trim() === '') {
      Alert.alert('Phone Unavailable', `No contact number is registered for this ${roleName || 'contact'}.`);
      return;
    }
    if (Platform.OS !== 'web') {
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert('Calling Contact', `Dialing ${phoneNumber}...`);
    }
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;
    setMessageSentToast(true);
    setCustomMessage('');
    setTimeout(() => {
      setMessageSentToast(false);
      setMessageModalVisible(false);
    }, 1200);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#0B1120] items-center justify-center">
        <ActivityIndicator size="large" color="#EA580C" />
        <Text className="text-gray-400 font-bold text-sm mt-3">Connecting to GPS Dispatch...</Text>
      </View>
    );
  }

  // Empty state when rider has no active delivery
  if (!activeOrder) {
    return (
      <View className="flex-1 bg-[#0B1120] items-center justify-center px-8">
        <View className="w-20 h-20 rounded-full bg-[#1E293B] border border-gray-700 items-center justify-center mb-6">
          <Feather name="navigation" size={36} color="#EA580C" />
        </View>
        <Text className="text-white font-extrabold text-xl text-center mb-2">
          No Active Delivery Route
        </Text>
        <Text className="text-gray-400 text-sm text-center mb-8 leading-5">
          You do not have any active orders en route right now. Accept an open delivery job from the radar to start navigation.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Jobs')}
          activeOpacity={0.85}
          className="bg-[#C25E00] px-8 py-4 rounded-2xl flex-row items-center justify-center shadow-lg"
        >
          <Feather name="briefcase" size={18} color="#FFFFFF" className="mr-2" />
          <Text className="text-white font-bold text-base ml-2">Browse Available Jobs</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cookName = activeOrder.cookName || 'Home Cook';
  const customerName = activeOrder.customerName || 'Customer';
  const orderNumber = activeOrder.orderNumber;
  const orderItemsCount = activeOrder.items?.length || 0;
  const earningsAmount = `LKR ${(activeOrder.riderEarnings || 0).toFixed(0)}`;
  const cookAddress = activeOrder.cookAddressLabel || 'Home Kitchen';
  const customerAddress = activeOrder.address?.label || 'Delivery Address';

  const cookCoords = activeOrder.cookCoordinates || activeOrder.items?.[0]?.cookCoordinates || [79.8612, 6.9271];
  const custCoords = activeOrder.address?.coordinates || [79.8500, 6.9100];
  const cookLon = typeof cookCoords[0] === 'number' ? cookCoords[0] : 79.8612;
  const cookLat = typeof cookCoords[1] === 'number' ? cookCoords[1] : 6.9271;
  const custLon = typeof custCoords[0] === 'number' ? custCoords[0] : 79.8500;
  const custLat = typeof custCoords[1] === 'number' ? custCoords[1] : 6.9100;

  const riderDisplayName =
    user?.name?.trim() ||
    (user?.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : 'Rider');

  const avatarUrl =
    user?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(riderDisplayName)}&background=9A3412&color=fff&bold=true&size=256`;
  const cookAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(cookName)}&background=C25E00&color=fff&bold=true&size=256`;
  const customerAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(customerName)}&background=1D4ED8&color=fff&bold=true&size=256`;

  return (
    <View className="flex-1 bg-[#0B1120]">
      {/* ── Top Header (Ready Badge + Rider Avatar) ── */}
      <View className="absolute top-12 left-0 right-0 z-30 px-5 flex-row items-center justify-end">
        <View className="flex-row items-center gap-2.5">
          <View className="bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1 rounded-full flex-row items-center shadow-md">
            <View className="w-2 h-2 rounded-full bg-[#10B981] mr-1.5" />
            <Text className="text-[#059669] font-bold text-xs">On Delivery</Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Rider')}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: avatarUrl }}
              className="w-10 h-10 rounded-full border-2 border-white shadow-md bg-gray-200"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Map Canvas (Dark Theme) ── */}
      <View className="flex-1 relative">
        {WebView ? (
          <WebView
            source={{
              html: getNavigationMapHtml(cookLat, cookLon, custLat, custLon, cookName, customerName, stage),
            }}
            style={{ flex: 1 }}
            scrollEnabled={false}
          />
        ) : (
          <View className="flex-1 bg-[#0B1120] items-center justify-center p-6">
            <Feather name="navigation" size={48} color="#EA580C" />
            <Text className="text-gray-400 font-bold text-sm mt-3">Live Navigation Map Active</Text>
          </View>
        )}

        {/* ── Turn-by-Turn GPS HUD Overlay ── */}
        <View className="absolute top-24 left-4 right-4 z-20">
          {/* Breadcrumb Segmented Tracker */}
          <View className="flex-row items-center mb-2.5">
            <View
              className={`flex-row items-center px-3 py-1.5 rounded-full mr-2 shadow-sm ${
                stage === 1 ? 'bg-[#C25E00]' : 'bg-[#1E293B]/80 border border-gray-700'
              }`}
            >
              <Text className="text-white text-xs mr-1">🍳</Text>
              <Text className="text-white font-extrabold text-xs" numberOfLines={1}>
                1. {cookName} (Pickup)
              </Text>
            </View>

            <Feather name="chevron-right" size={14} color="#94A3B8" className="mr-2" />

            <View
              className={`flex-row items-center px-3 py-1.5 rounded-full shadow-sm ${
                stage === 2 ? 'bg-[#1D4ED8]' : 'bg-[#1E293B]/80 border border-gray-700'
              }`}
            >
              <Text className="text-white text-xs mr-1">📍</Text>
              <Text className="text-white font-extrabold text-xs" numberOfLines={1}>
                2. {customerName} (Dropoff)
              </Text>
            </View>
          </View>

          {/* Navigation Directions Box */}
          <View
            className="rounded-3xl p-4 shadow-2xl border border-gray-700/50"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.94)' }}
          >
            <View className="flex-row items-start">
              {/* Turn Arrow Icon */}
              <View className="w-12 h-12 rounded-2xl bg-[#1E293B] border border-gray-600 items-center justify-center mr-3.5">
                <Feather
                  name={stage === 1 ? 'corner-up-right' : 'corner-up-left'}
                  size={24}
                  color="#10B981"
                />
              </View>

              {/* Instructions */}
              <View className="flex-1">
                <View className="flex-row items-center justify-between mb-0.5">
                  <Text className="text-white font-black text-base">
                    {stage === 1 ? 'Stage 1: Pickup' : 'Stage 2: Delivery'}
                  </Text>
                  <View className="bg-[#C25E00] px-2.5 py-0.5 rounded-full">
                    <Text className="text-white text-[10px] font-black tracking-wider">
                      DIRECT ROUTE
                    </Text>
                  </View>
                </View>

                <Text className="text-white font-extrabold text-sm mb-1" numberOfLines={1}>
                  {stage === 1 ? `Proceed to ${cookAddress}` : `Proceed to ${customerAddress}`}
                </Text>
                <Text className="text-gray-400 text-xs font-medium" numberOfLines={1}>
                  {stage === 1
                    ? `Collect order items from ${cookName}`
                    : `Hand over order safely to ${customerName}`}
                </Text>
              </View>
            </View>

            {/* Metrics Bar */}
            <View className="h-px bg-gray-700/60 my-3" />
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Feather name="clock" size={13} color="#10B981" />
                <Text className="text-[#10B981] font-bold text-xs ml-1.5">
                  {stage === 1 ? 'Pickup Ready' : 'Delivery In Transit'}
                </Text>
              </View>

              <Text className="text-gray-400 font-semibold text-xs">
                • {orderItemsCount} items
              </Text>

              <Text className="text-white font-bold text-xs">
                • {earningsAmount} payout
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Bottom Sheet (White Curved Card) ── */}
      <View className="bg-white rounded-t-[36px] pt-3 pb-8 px-5 shadow-2xl border-t border-gray-100">
        {/* Handle Bar */}
        <View className="w-12 h-1.5 rounded-full bg-gray-300 self-center mb-3" />

        {/* Stage Info Row */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <View
              className={`w-2.5 h-2.5 rounded-full mr-2 ${
                stage === 1 ? 'bg-[#EA580C]' : 'bg-[#2563EB]'
              }`}
            />
            <Text className="text-[#EA580C] font-black text-xs uppercase tracking-wider">
              {stage === 1 ? 'STAGE 1 OF 2' : 'STAGE 2 OF 2'}
            </Text>
            <Text className="text-textSecondary font-bold text-xs ml-1">
              • {stage === 1 ? "Arriving at Cook's Home" : 'En Route to Customer'}
            </Text>
          </View>

          <View className="bg-[#EEF2FF] px-2.5 py-1 rounded-full">
            <Text className="text-[#4F46E5] text-xs font-extrabold">
              {orderNumber}
            </Text>
          </View>
        </View>

        {/* Cook / Customer Profile Card */}
        <View className="bg-[#EFF6FF] rounded-2xl p-3.5 mb-3 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2">
            <Image
              source={{ uri: stage === 1 ? cookAvatarUrl : customerAvatarUrl }}
              className="w-12 h-12 rounded-full border border-blue-200 mr-3"
            />
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="text-textPrimary font-extrabold text-base" numberOfLines={1}>
                  {stage === 1 ? cookName : customerName}
                </Text>
                <View className="ml-1.5 w-4 h-4 rounded-full bg-[#B45309] items-center justify-center">
                  <Feather name="check" size={10} color="#FFFFFF" />
                </View>
              </View>
              <Text className="text-textSecondary text-xs mt-0.5" numberOfLines={1}>
                {stage === 1 ? cookAddress : customerAddress}
              </Text>
            </View>
          </View>

          <View className="items-end">
            <Text className="text-textPrimary font-black text-sm">
              {orderItemsCount} Items
            </Text>
            <Text className="text-[#C25E00] font-black text-base">
              {earningsAmount}
            </Text>
          </View>
        </View>

        {/* Instructions Card */}
        <View className="bg-[#FFF7ED] rounded-2xl p-3.5 mb-3.5 border border-[#FFEDD5] flex-row items-start">
          <View className="w-8 h-8 rounded-full bg-[#9A3412] items-center justify-center mr-3 mt-0.5">
            <Feather name="info" size={14} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-textPrimary font-black text-xs mb-1">
              {stage === 1 ? 'Pickup Instructions' : 'Delivery Instructions'}
            </Text>
            <Text className="text-textSecondary text-xs leading-4">
              {stage === 1
                ? 'Check in with home cook, verify all order portions, and secure containers safely in your thermal bag.'
                : 'Deliver food to customer at destination address. Contact customer directly if assistance is required.'}
            </Text>
          </View>
        </View>

        {/* Quick Action Buttons: Call & Message */}
        <View className="flex-row gap-3 mb-3.5">
          <TouchableOpacity
            onPress={() => handleCall(stage === 1 ? activeOrder.cookPhone : activeOrder.customerPhone, stage === 1 ? 'cook' : 'customer')}
            activeOpacity={0.8}
            className="flex-1 bg-[#DBEAFE] py-3 rounded-2xl flex-row items-center justify-center"
          >
            <Feather name="phone" size={15} color="#1E40AF" />
            <Text className="text-[#1E40AF] font-black text-xs ml-2">
              {stage === 1 ? 'Call Cook' : 'Call Customer'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMessageModalVisible(true)}
            activeOpacity={0.8}
            className="flex-1 bg-[#DBEAFE] py-3 rounded-2xl flex-row items-center justify-center"
          >
            <Feather name="message-square" size={15} color="#1E40AF" />
            <Text className="text-[#1E40AF] font-black text-xs ml-2">
              Message
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Slide to Confirm Arrival / Delivery ── */}
        <SlideToConfirm
          label={stage === 1 ? 'Slide to Confirm Pickup' : 'Slide to Complete Delivery'}
          onConfirm={handleConfirmArrivalOrPickup}
          knobColor="#C25E00"
          backgroundColor="#1E293B"
        />
      </View>

      {/* ── Quick Message Modal ── */}
      <Modal
        visible={messageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMessageModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6 border-t border-gray-150">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-textPrimary font-black text-lg">
                Message {stage === 1 ? cookName : customerName}
              </Text>
              <TouchableOpacity
                onPress={() => setMessageModalVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Feather name="x" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {messageSentToast ? (
              <View className="bg-green-50 border border-green-200 rounded-2xl p-4 items-center mb-4">
                <Text className="text-green-700 font-extrabold text-sm">
                  ✓ Notification sent!
                </Text>
              </View>
            ) : null}

            <Text className="text-textMuted text-xs font-bold uppercase mb-2">
              Quick Preset Messages
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {[
                'Arrived outside 📍',
                'Be there in 3 minutes 🛵',
                'Waiting at the entrance 🚪',
                'Food secured in bag! 🍲',
              ].map((msg) => (
                <TouchableOpacity
                  key={msg}
                  onPress={() => handleSendMessage(msg)}
                  className="bg-gray-100 border border-gray-200 px-3.5 py-2 rounded-xl"
                >
                  <Text className="text-textPrimary font-bold text-xs">{msg}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row items-center gap-2">
              <TextInput
                placeholder="Type a message..."
                value={customMessage}
                onChangeText={setCustomMessage}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-textPrimary"
              />
              <TouchableOpacity
                onPress={() => handleSendMessage(customMessage)}
                className="w-12 h-12 rounded-2xl bg-[#C25E00] items-center justify-center"
              >
                <Feather name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
