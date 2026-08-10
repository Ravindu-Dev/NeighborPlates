import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, Platform, ActivityIndicator, Linking,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderStackParamList } from '../../navigation/RiderNavigator';
import { api } from '../../services/api';
import { DeliveryStepperComponent } from '../../components/rider/DeliveryStepperComponent';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { Feather } from '@expo/vector-icons';

let WebView: any = null;
if (Platform.OS !== 'web') {
  try { WebView = require('react-native-webview').WebView; } catch (e) {}
}

const getMapHtml = (cookLat: number, cookLon: number, custLat: number, custLon: number, status: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).fitBounds([[${cookLat},${cookLon}],[${custLat},${custLon}]], { padding: [40,40] });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    // Cook
    L.marker([${cookLat},${cookLon}], {
      icon: L.divIcon({ html: '<div style="background:#FF6B35;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(255,107,53,.8)"></div>', className:'m', iconSize:[14,14] })
    }).addTo(map).bindPopup('<div style="font-family:sans-serif;font-size:11px;font-weight:700">👨‍🍳 Cook Kitchen</div>');
    // Customer
    L.marker([${custLat},${custLon}], {
      icon: L.divIcon({ html: '<div style="background:#3B82F6;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(59,130,246,.8)"></div>', className:'m', iconSize:[14,14] })
    }).addTo(map).bindPopup('<div style="font-family:sans-serif;font-size:11px;font-weight:700">📍 Delivery Destination</div>');
    // Route
    L.polyline([[${cookLat},${cookLon}],[${custLat},${custLon}]], { color:'#6366F1', dashArray:'5,8', weight:3 }).addTo(map);
    // Rider marker
    var riderMarker = L.marker([${cookLat},${cookLon}], {
      icon: L.divIcon({ html: '<div style="background:#10B981;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(16,185,129,.8);display:flex;align-items:center;justify-content:center;font-size:12px">🛵</div>', className:'m', iconSize:[24,24] })
    }).addTo(map);
    var status = "${status}";
    if (status === 'DELIVERING') {
      var startTime = Date.now(), duration = 20000;
      function animate() {
        var t = Math.min((Date.now() - startTime) % duration / duration, 1);
        riderMarker.setLatLng([${cookLat}+(${custLat}-${cookLat})*t, ${cookLon}+(${custLon}-${cookLon})*t]);
        requestAnimationFrame(animate);
      }
      animate();
    } else if (status === 'DELIVERED') {
      riderMarker.setLatLng([${custLat},${custLon}]);
    }
  </script>
</body>
</html>`;

type Props = NativeStackScreenProps<RiderStackParamList, 'ActiveDelivery'>;

export const ActiveDeliveryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrder = async () => {
    try {
      const res = await api.get('/api/orders/my');
      const found = res.data.find((o: any) => o.id === orderId);
      if (found) setOrder(found);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg('Couldn\'t load order details. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // Poll every 10 seconds for status changes
    pollRef.current = setInterval(fetchOrder, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [orderId]);

  const handleStatusUpdate = async (newStatus: 'DELIVERING' | 'DELIVERED') => {
    if (newStatus === 'DELIVERED') {
      // Confirm before delivering
      if (Platform.OS === 'web') {
        if (!window.confirm('Confirm delivery? The customer will be notified and your earnings credited.')) return;
      } else {
        await new Promise<void>((resolve, reject) =>
          Alert.alert(
            'Confirm Delivery',
            'Confirm delivery? The customer will be notified and your earnings will be credited.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => reject() },
              { text: 'Confirm', style: 'default', onPress: () => resolve() },
            ]
          )
        ).catch(() => null);
        // Re-check if actually confirmed
      }
    }

    setUpdating(true);
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(
          newStatus === 'DELIVERED'
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.ImpactFeedbackStyle.Medium as any
        );
      }
      const res = await api.put(`/api/orders/${orderId}/status?status=${newStatus}`);
      setOrder(res.data);

      if (newStatus === 'DELIVERED') {
        if (pollRef.current) clearInterval(pollRef.current);
        navigation.replace('DeliveryConfirmation', {
          orderId,
          earnings: res.data.riderEarnings ?? 150,
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Couldn\'t update status. Try again.';
      Alert.alert('Update Failed', msg, [{ text: 'OK' }]);
    } finally {
      setUpdating(false);
    }
  };

  const callContact = (phone: string) => {
    if (Platform.OS !== 'web') Linking.openURL(`tel:${phone}`);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-surface-elevated">
        <SkeletonLoader height={280} borderRadius={0} />
        <View className="px-4 pt-4">
          <SkeletonLoader height={80} borderRadius={16} className="mb-4" />
          <SkeletonLoader height={130} borderRadius={16} className="mb-4" />
          <SkeletonLoader height={56} borderRadius={12} />
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View className="flex-1 bg-surface-elevated items-center justify-center px-6">
        <Feather name="alert-circle" size={40} color="#EF4444" />
        <Text className="text-textPrimary font-bold text-base mt-4 text-center">
          Order not found
        </Text>
        <Text className="text-textMuted text-sm mt-2 text-center">
          {errorMsg || 'We couldn\'t find this order. It may have been cancelled.'}
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-6">
          <Text className="text-indigo-500 font-bold text-sm">← Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cookCoords = order.items?.[0]?.cookCoordinates || [6.9271, 79.8612];
  const custCoords = order.address?.coordinates || [6.9271, 79.8612];
  // coords are [lng, lat] in our system
  const cookLat = typeof cookCoords[1] === 'number' ? cookCoords[1] : 6.9271;
  const cookLon = typeof cookCoords[0] === 'number' ? cookCoords[0] : 79.8612;
  const custLat = typeof custCoords[1] === 'number' ? custCoords[1] : 6.9100;
  const custLon = typeof custCoords[0] === 'number' ? custCoords[0] : 79.8500;

  const isPickup = order.status === 'ACCEPTED';
  const primaryButtonLabel = isPickup ? 'Confirm Pickup 🛵' : 'Mark Delivered ✓';
  const primaryButtonStatus: 'DELIVERING' | 'DELIVERED' = isPickup ? 'DELIVERING' : 'DELIVERED';

  return (
    <View className="flex-1 bg-surface-elevated">
      {/* ── Map ── */}
      <View style={{ height: 240 }}>
        {WebView ? (
          <WebView
            source={{ html: getMapHtml(cookLat, cookLon, custLat, custLon, order.status) }}
            style={{ flex: 1 }}
            scrollEnabled={false}
          />
        ) : (
          <View className="flex-1 bg-gray-200 items-center justify-center">
            <Feather name="map" size={32} color="#9CA3AF" />
            <Text className="text-textMuted text-xs mt-2">Map unavailable on web</Text>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-4 pb-8">
          {/* ── Header with issue report ── */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-textPrimary font-extrabold text-lg">Active Delivery</Text>
            <TouchableOpacity
              onPress={() => Alert.alert('Report Issue', 'Contact support@neighborplates.lk or call 011-XXXX-XXX', [{ text: 'OK' }])}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Report a delivery issue"
              className="flex-row items-center px-3 py-1.5 rounded-full border border-gray-200"
            >
              <Feather name="alert-circle" size={13} color="#9CA3AF" />
              <Text className="text-textMuted text-xs font-medium ml-1">Report issue</Text>
            </TouchableOpacity>
          </View>

          {/* ── Stepper ── */}
          <View className="bg-white rounded-2xl border border-gray-100 mb-3">
            <DeliveryStepperComponent status={order.status} />
          </View>

          {/* ── Order Details ── */}
          <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1">
                <Text className="text-textMuted text-[10px] uppercase tracking-wide font-bold mb-0.5">
                  Order
                </Text>
                <Text className="text-textPrimary font-bold text-sm">{order.orderNumber}</Text>
              </View>
              <View className="bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full">
                <Text className="text-indigo-700 font-bold text-xs">
                  LKR {(order.riderEarnings || 0).toFixed(0)} earned
                </Text>
              </View>
            </View>
            {order.items?.slice(0, 3).map((item: any, i: number) => (
              <Text key={i} className="text-textSecondary text-xs mb-0.5">
                {item.quantity}× {item.name}
              </Text>
            ))}
            {order.items?.length > 3 && (
              <Text className="text-textMuted text-xs">+{order.items.length - 3} more items</Text>
            )}
            <View className="h-px bg-gray-100 mt-3 mb-2" />
            <Text className="text-textPrimary font-bold text-sm">
              Total: LKR {order.totalAmount?.toFixed(0)}
            </Text>
          </View>

          {/* ── People ── */}
          <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
            {/* Cook */}
            <View className="flex-row items-start mb-4">
              <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center mr-3">
                <Feather name="user" size={16} color="#FF6B35" />
              </View>
              <View className="flex-1">
                <Text className="text-textMuted text-[10px] uppercase tracking-wide font-bold">Cook</Text>
                <Text className="text-textPrimary font-bold text-sm">{order.cookName}</Text>
                {order.address?.cookAddress ? (
                  <Text className="text-textMuted text-xs mt-0.5" numberOfLines={1}>{order.address.cookAddress}</Text>
                ) : null}
              </View>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => callContact('0771234567')}
                  className="w-9 h-9 rounded-full bg-green-50 border border-green-200 items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel={`Call cook ${order.cookName}`}
                >
                  <Feather name="phone" size={15} color="#16A34A" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Customer */}
            <View className="flex-row items-start">
              <View className="w-9 h-9 rounded-full bg-blue-50 items-center justify-center mr-3">
                <Feather name="map-pin" size={16} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-textMuted text-[10px] uppercase tracking-wide font-bold">Customer</Text>
                <Text className="text-textPrimary font-bold text-sm">{order.customerName}</Text>
                {order.address?.label ? (
                  <Text className="text-textMuted text-xs mt-0.5" numberOfLines={2}>{order.address.label}</Text>
                ) : null}
              </View>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => callContact('0779876543')}
                  className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel={`Call customer ${order.customerName}`}
                >
                  <Feather name="phone" size={15} color="#3B82F6" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Error ── */}
          {errorMsg ? (
            <View className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-3 flex-row items-center">
              <Feather name="alert-circle" size={14} color="#DC2626" />
              <Text className="text-red-700 text-xs ml-2 flex-1">{errorMsg}</Text>
            </View>
          ) : null}

          {/* ── Primary Action Button ── */}
          {order.status !== 'DELIVERED' ? (
            <TouchableOpacity
              onPress={() => handleStatusUpdate(primaryButtonStatus)}
              disabled={updating}
              activeOpacity={0.85}
              className="bg-indigo-500 rounded-2xl py-4 items-center flex-row justify-center"
              style={{ opacity: updating ? 0.7 : 1 }}
              accessibilityRole="button"
              accessibilityLabel={primaryButtonLabel}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-bold text-base">{primaryButtonLabel}</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View className="bg-green-500 rounded-2xl py-4 items-center">
              <Text className="text-white font-bold text-base">✓ Delivered!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};
