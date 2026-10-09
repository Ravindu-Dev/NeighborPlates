import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  Image,
  Modal,
  TextInput,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { SlideToConfirm } from '../../components/rider/SlideToConfirm';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {}
}

const getNavigationMapHtml = (stage: 1 | 2) => `
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
    var cookLat = 6.9320, cookLon = 79.8650;
    var custLat = 6.9180, custLon = 79.8520;
    var stage = ${stage};

    var centerLat = stage === 1 ? (cookLat * 0.7 + 6.9270 * 0.3) : (cookLat + custLat) / 2;
    var centerLon = stage === 1 ? (cookLon * 0.7 + 79.8600 * 0.3) : (cookLon + custLon) / 2;

    var map = L.map('map', { zoomControl: false }).setView([centerLat, centerLon], 14);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '© CartoDB'
    }).addTo(map);

    // Route points from Rider to Cook to Customer
    var routePointsStage1 = [
      [6.9240, 79.8580],
      [6.9270, 79.8605],
      [6.9295, 79.8630],
      [cookLat, cookLon]
    ];

    var routePointsStage2 = [
      [cookLat, cookLon],
      [6.9270, 79.8605],
      [6.9220, 79.8560],
      [custLat, custLon]
    ];

    var activePoints = stage === 1 ? routePointsStage1 : routePointsStage2;

    // Glowing Under-Line
    L.polyline(activePoints, {
      color: '#FB923C',
      weight: 12,
      opacity: 0.25,
      lineCap: 'round'
    }).addTo(map);

    // Main Neon Orange Nav Line
    L.polyline(activePoints, {
      color: '#EA580C',
      weight: 5,
      opacity: 0.95,
      dashArray: '8, 8',
      lineCap: 'round'
    }).addTo(map);

    // Cook Marker
    var cookHtml = '<div style="display:flex;flex-direction:column;align-items:center;">' +
      '<div class="cook-label">Chef Elena\\'s Hearth</div>' +
      '<div style="width:30px;height:30px;border-radius:50%;background:#C25E00;border:3px solid #FFF;box-shadow:0 0 16px rgba(234,88,12,0.9);display:flex;align-items:center;justify-content:center;font-size:14px;margin-top:4px;">🍽</div>' +
      '</div>';
    L.marker([cookLat, cookLon], {
      icon: L.divIcon({ html: cookHtml, className: '', iconSize: [140, 60], iconAnchor: [70, 55] })
    }).addTo(map);

    // Customer Marker
    var custHtml = '<div style="display:flex;flex-direction:column;align-items:center;">' +
      '<div class="cust-label">2. David S.</div>' +
      '<div style="width:28px;height:28px;border-radius:50%;background:#2563EB;border:3px solid #FFF;box-shadow:0 0 16px rgba(37,99,235,0.9);display:flex;align-items:center;justify-content:center;font-size:13px;margin-top:4px;">📍</div>' +
      '</div>';
    L.marker([custLat, custLon], {
      icon: L.divIcon({ html: custHtml, className: '', iconSize: [110, 60], iconAnchor: [55, 55] })
    }).addTo(map);

    // Nearest Delivery Jobs on Live Map
    var nearbyDeliveryJobs = [
      { name: "silva & Sun's", payout: "1100.50", lat: 6.9360, lon: 79.8690 },
      { name: "Kamal's Ramen", payout: "600.00", lat: 6.9200, lon: 79.8630 }
    ];

    nearbyDeliveryJobs.forEach(function(nj) {
      var njHtml = '<div style="display:flex;flex-direction:column;align-items:center;opacity:0.9;">' +
        '<div style="background:#1E293B;color:#F8FAFC;font-size:9px;font-weight:800;padding:2px 7px;border-radius:8px;border:1px solid #EA580C;box-shadow:0 2px 8px rgba(0,0,0,0.5);">' + nj.name + ' (RS ' + nj.payout + ')</div>' +
        '<div style="width:18px;height:18px;border-radius:50%;background:#EA580C;border:2px solid #FFF;margin-top:2px;display:flex;align-items:center;justify-content:center;font-size:9px;">🍽</div>' +
        '</div>';
      L.marker([nj.lat, nj.lon], {
        icon: L.divIcon({ html: njHtml, className: '', iconSize: [140, 40], iconAnchor: [70, 36] })
      }).addTo(map);
    });

    // Animated Rider Marker
    var riderStart = stage === 1 ? [6.9240, 79.8580] : [cookLat, cookLon];
    var riderEnd = stage === 1 ? [cookLat, cookLon] : [custLat, custLon];

    var riderMarker = L.marker(riderStart, {
      icon: L.divIcon({
        html: '<div style="width:34px;height:34px;border-radius:50%;background:#10B981;border:3px solid #FFF;box-shadow:0 0 18px rgba(16,185,129,0.9);display:flex;align-items:center;justify-content:center;font-size:16px;">🛵</div>',
        className: '',
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      })
    }).addTo(map);

    var startTime = Date.now();
    var duration = 22000;
    function animate() {
      var progress = ((Date.now() - startTime) % duration) / duration;
      var curLat = riderStart[0] + (riderEnd[0] - riderStart[0]) * progress;
      var curLon = riderStart[1] + (riderEnd[1] - riderStart[1]) * progress;
      riderMarker.setLatLng([curLat, curLon]);
      requestAnimationFrame(animate);
    }
    animate();
  </script>
</body>
</html>`;

export const RouteScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuthStore();

  // Stage 1 = Arriving at Cook's Home (Pickup)
  // Stage 2 = En Route to Customer (Dropoff)
  const [stage, setStage] = useState<1 | 2>(1);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [messageSentToast, setMessageSentToast] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);

  const orderId = route.params?.orderId || 'HM-8841';

  // Fetch real order or sync with backend
  useEffect(() => {
    const fetchActiveOrder = async () => {
      try {
        const res = await api.get('/api/orders/my');
        const inProgress = res.data.find(
          (o: any) => o.status === 'ACCEPTED' || o.status === 'DELIVERING'
        );
        if (inProgress) {
          setActiveOrder(inProgress);
          if (inProgress.status === 'DELIVERING') {
            setStage(2);
          }
        }
      } catch (e) {
        // Fallback to demo mode
      }
    };
    fetchActiveOrder();
  }, [stage]);

  // Handle stage transitions
  const handleConfirmArrivalOrPickup = async () => {
    if (stage === 1) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // If live backend order, transition to DELIVERING
      if (activeOrder?.id && !activeOrder.id.startsWith('demo-')) {
        try {
          await api.put(`/api/orders/${activeOrder.id}/status?status=DELIVERING`);
        } catch (e) {}
      }
      setStage(2);
    } else {
      // Stage 2 complete! Transition to celebration
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      if (activeOrder?.id && !activeOrder.id.startsWith('demo-')) {
        try {
          await api.put(`/api/orders/${activeOrder.id}/status?status=DELIVERED`);
        } catch (e) {}
      }
      navigation.replace('DeliveryConfirmation', {
        orderId: activeOrder?.id || 'HM-8841',
        earnings: activeOrder?.riderEarnings || 38.50,
      });
    }
  };

  const handleCall = (phoneNumber: string) => {
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

  const cookName = activeOrder?.cookName || 'Chef Elena V.';
  const customerName = activeOrder?.customerName || 'David S.';
  const orderNumber = activeOrder?.orderNumber || '#HM-8841';
  const orderItemsCount = activeOrder?.items?.length || 3;
  const earningsAmount = activeOrder?.riderEarnings 
    ? `$${activeOrder.riderEarnings.toFixed(2)}`
    : '$38.50';

  const riderDisplayName =
    user?.name?.trim() ||
    (user?.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : 'Sahan');

  const avatarUrl =
    user?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(riderDisplayName)}&background=9A3412&color=fff&bold=true&size=256`;
  const cookAvatarUrl = 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=300&q=80';
  const customerAvatarUrl = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80';

  return (
    <View className="flex-1 bg-[#0B1120]">
      {/* ── Top Header (Ready Badge + Rider Avatar) ── */}
      <View className="absolute top-12 left-0 right-0 z-30 px-5 flex-row items-center justify-end">
        <View className="flex-row items-center gap-2.5">
          <View className="bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1 rounded-full flex-row items-center shadow-md">
            <View className="w-2 h-2 rounded-full bg-[#10B981] mr-1.5" />
            <Text className="text-[#059669] font-bold text-xs">Ready</Text>
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
            source={{ html: getNavigationMapHtml(stage) }}
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
              <Text className="text-white text-xs mr-1">🟠 🍴</Text>
              <Text className="text-white font-extrabold text-xs" numberOfLines={1}>
                1. Elena's Hearth (P...
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
                2. David S. (Dropoff)
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
                  <Text className="text-white font-black text-xl">
                    {stage === 1 ? 'In 250 m' : 'In 400 m'}
                  </Text>
                  <View className="bg-[#C25E00] px-2.5 py-0.5 rounded-full">
                    <Text className="text-white text-[10px] font-black tracking-wider">
                      FAST ROUTE
                    </Text>
                  </View>
                </View>

                <Text className="text-white font-extrabold text-base mb-1" numberOfLines={1}>
                  {stage === 1 ? 'Turn Right onto Maple Avenue' : 'Turn Left onto Palm Grove'}
                </Text>
                <Text className="text-gray-400 text-xs font-medium" numberOfLines={1}>
                  {stage === 1
                    ? '↑ Then straight 600m to 142 Elm Street'
                    : '↑ Continue 300m to Apt 4B, Ocean View'}
                </Text>
              </View>
            </View>

            {/* Metrics Bar */}
            <View className="h-px bg-gray-700/60 my-3" />
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Feather name="clock" size={13} color="#10B981" />
                <Text className="text-[#10B981] font-bold text-xs ml-1.5">
                  {stage === 1 ? '8 mins remaining' : '12 mins remaining'}
                </Text>
              </View>

              <Text className="text-gray-400 font-semibold text-xs">
                • {stage === 1 ? '3.2 km left' : '4.1 km left'}
              </Text>

              <Text className="text-white font-bold text-xs">
                • ETA {stage === 1 ? '12:44 PM' : '12:56 PM'}
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
              Order {orderNumber}
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
              <Text className="text-textSecondary text-xs mt-0.5">
                {stage === 1 ? (
                  <>
                    <Text className="text-[#C25E00] font-bold">★ 4.98</Text> (640+ homemade meals)
                  </>
                ) : (
                  <>
                    <Text className="text-[#2563EB] font-bold">★ 5.0</Text> Apt 4B, Ocean View
                  </>
                )}
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

        {/* Special Instructions Card */}
        <View className="bg-[#FFF7ED] rounded-2xl p-3.5 mb-3.5 border border-[#FFEDD5] flex-row items-start">
          <View className="w-8 h-8 rounded-full bg-[#9A3412] items-center justify-center mr-3 mt-0.5">
            <Feather name="key" size={14} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-textPrimary font-black text-xs mb-1">
              {stage === 1 ? 'Special Pickup Instructions' : 'Special Dropoff Instructions'}
            </Text>
            <Text className="text-textSecondary text-xs leading-4">
              {stage === 1
                ? 'Ring bell “Unit 3B” on garden gate or send quick in-app message. Casserole is oven-fresh in insulated carrier, please keep horizontal!'
                : 'Please leave on front porch bench and ring bell once. Do not knock as dog will bark. Thank you!'}
            </Text>
          </View>
        </View>

        {/* Quick Action Buttons: Call & Message */}
        <View className="flex-row gap-3 mb-3.5">
          <TouchableOpacity
            onPress={() => handleCall(stage === 1 ? '0771234567' : '0779876543')}
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
          label={stage === 1 ? 'Slide to Confirm Arrival' : 'Slide to Complete Delivery'}
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
                  ✓ Message sent instantly!
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
                'Waiting at the gate 🚪',
                'Hot & ready in bag! 🍲',
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
