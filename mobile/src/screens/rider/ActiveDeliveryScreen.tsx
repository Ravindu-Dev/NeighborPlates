import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, Platform, ActivityIndicator, Linking,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RiderStackParamList } from '../../navigation/RiderNavigator';
import { api } from '../../services/api';
import { DeliveryStepperComponent } from '../../components/rider/DeliveryStepperComponent';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { Feather } from '@expo/vector-icons';
import {
  getRealLocation,
  watchRealLocation,
  syncRiderLocationToServer,
  DEFAULT_COORDINATES,
  Coordinates,
} from '../../services/locationService';

let WebView: any = null;
if (Platform.OS !== 'web') {
  try { WebView = require('react-native-webview').WebView; } catch (e) {}
}

const getMapHtml = (
  cookLat: number,
  cookLon: number,
  custLat: number,
  custLon: number,
  status: string,
  riderLat?: number,
  riderLon?: number
) => {
  var rLat = riderLat !== undefined ? riderLat : cookLat;
  var rLon = riderLon !== undefined ? riderLon : cookLon;

  return `
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
    var map = L.map('map', { zoomControl: false }).fitBounds([[${rLat},${rLon}],[${cookLat},${cookLon}],[${custLat},${custLon}]], { padding: [40,40] });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=sk-OP85plgYVLRSP0UYseCWtvvDJITdJ3mgrBVjGmh9OzAnaVWL', { maxZoom: 20, attribution: '&copy; Stadia Maps &copy; OpenStreetMap contributors' }).addTo(map);
    // Cook
    L.marker([${cookLat},${cookLon}], {
      icon: L.divIcon({ html: '<div style="background:#FF6B35;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(255,107,53,.8)"></div>', className:'m', iconSize:[14,14] })
    }).addTo(map).bindPopup('<div style="font-family:sans-serif;font-size:11px;font-weight:700">👨‍🍳 Cook Kitchen</div>');
    // Customer
    L.marker([${custLat},${custLon}], {
      icon: L.divIcon({ html: '<div style="background:#3B82F6;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(59,130,246,.8)"></div>', className:'m', iconSize:[14,14] })
    }).addTo(map).bindPopup('<div style="font-family:sans-serif;font-size:11px;font-weight:700">📍 Delivery Destination</div>');
    // Route
    L.polyline([[${rLat},${rLon}],[${cookLat},${cookLon}],[${custLat},${custLon}]], { color:'#6366F1', dashArray:'5,8', weight:3 }).addTo(map);
    // Rider marker
    var riderMarker = L.marker([${rLat},${rLon}], {
      icon: L.divIcon({ html: '<div style="background:#10B981;width:26px;height:26px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(16,185,129,.8);display:flex;align-items:center;justify-content:center;font-size:13px">🛵</div>', className:'m', iconSize:[26,26] })
    }).addTo(map).bindPopup('<b>Your Live Position</b>');

    window.updateRiderLocation = function(lat, lon) {
      if (riderMarker) riderMarker.setLatLng([lat, lon]);
    };
  </script>
</body>
</html>`;
};

type Props = NativeStackScreenProps<RiderStackParamList, 'ActiveDelivery'>;

export const ActiveDeliveryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [riderCoords, setRiderCoords] = useState<Coordinates>(DEFAULT_COORDINATES);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let watcher: { remove: () => void } | null = null;
    (async () => {
      const init = await getRealLocation();
      setRiderCoords(init.coords);
      if (init.isRealGps) syncRiderLocationToServer(init.coords);

      watcher = await watchRealLocation((newCoords) => {
        setRiderCoords(newCoords);
        syncRiderLocationToServer(newCoords);
      });
    })();

    return () => {
      if (watcher) watcher.remove();
    };
  }, []);

  const fetchOrder = async () => {
    try {
      let orderData: any = null;
      try {
        const res = await api.get(`/api/orders/${orderId}`);
        orderData = res.data;
      } catch {
        const res = await api.get('/api/orders/my');
        orderData = res.data.find((o: any) => o.id === orderId);
      }

      if (orderData) {
        setOrder(orderData);
        setErrorMsg(null);
      } else {
        setOrder(null);
        setErrorMsg('Order not found or no longer active.');
      }
    } catch {
      setErrorMsg('Could not load order details. Please pull down to retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    pollRef.current = setInterval(fetchOrder, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [orderId]);

  const handleStatusUpdate = async (newStatus: 'DELIVERING' | 'DELIVERED') => {
    if (newStatus === 'DELIVERED') {
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
      }
    }

    setUpdating(true);
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(
          newStatus === 'DELIVERED'
            ? Haptics.NotificationFeedbackType.Success
            : (Haptics.ImpactFeedbackStyle.Medium as any)
        );
      }

      const res = await api.put(`/api/orders/${orderId}/status?status=${newStatus}`);
      setOrder(res.data);
      if (newStatus === 'DELIVERED') {
        if (pollRef.current) clearInterval(pollRef.current);
        navigation.replace('DeliveryConfirmation', {
          orderId,
          earnings: res.data.riderEarnings ?? order?.riderEarnings ?? 0,
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Could not update delivery status. Try again.';
      Alert.alert('Update Failed', msg, [{ text: 'OK' }]);
    } finally {
      setUpdating(false);
    }
  };

  const callContact = (phone?: string, roleName?: string) => {
    if (!phone || phone.trim() === '') {
      Alert.alert('Phone Unavailable', `No phone number is registered for this ${roleName || 'contact'}.`);
      return;
    }
    if (Platform.OS !== 'web') {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Calling Contact', `Dialing ${phone}...`);
    }
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
          Order Not Found
        </Text>
        <Text className="text-textMuted text-sm mt-2 text-center">
          {errorMsg || 'We could not find this order record in the database.'}
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-6">
          <Text className="text-[#9A3412] font-bold text-sm">← Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cookCoords = order.cookCoordinates || order.items?.[0]?.cookCoordinates || [79.8612, 6.9271];
  const custCoords = order.address?.coordinates || [79.8500, 6.9100];
  // Coordinates are [lng, lat]
  const cookLat = typeof cookCoords[1] === 'number' ? cookCoords[1] : 6.9271;
  const cookLon = typeof cookCoords[0] === 'number' ? cookCoords[0] : 79.8612;
  const custLat = typeof custCoords[1] === 'number' ? custCoords[1] : 6.9100;
  const custLon = typeof custCoords[0] === 'number' ? custCoords[0] : 79.8500;

  const isPickup = order.status === 'READY' || order.status === 'ACCEPTED';
  const primaryButtonLabel = isPickup ? 'Confirm Pickup 🛵' : 'Mark Delivered ✓';
  const primaryButtonStatus: 'DELIVERING' | 'DELIVERED' = isPickup ? 'DELIVERING' : 'DELIVERED';

  return (
    <View className="flex-1 bg-surface-elevated">
      {/* ── Map ── */}
      <View style={{ height: 240 }}>
        {WebView ? (
          <WebView
            source={{ html: getMapHtml(cookLat, cookLon, custLat, custLon, order.status, riderCoords.latitude, riderCoords.longitude) }}
            style={{ flex: 1 }}
            scrollEnabled={false}
          />
        ) : (
          <View className="flex-1 bg-gray-200 items-center justify-center">
            <Feather name="map" size={32} color="#9CA3AF" />
            <Text className="text-textMuted text-xs mt-2">Map preview active</Text>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-4 pb-8">
          {/* ── Header with issue report ── */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-textPrimary font-extrabold text-lg">Active Delivery</Text>
            <TouchableOpacity
              onPress={() => Alert.alert('Report Issue', 'Contact rider-support@neighborplates.lk for live dispatch assistance.', [{ text: 'OK' }])}
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

          {/* ── Turn-by-Turn Route Navigation Link ── */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Tabs', { screen: 'Route' } as any)}
            className="bg-[#FFF7ED] border border-[#FFEDD5] rounded-2xl py-3 px-4 mb-3 flex-row items-center justify-between"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <Feather name="navigation" size={16} color="#9A3412" />
              <Text className="text-[#9A3412] font-bold text-xs ml-2">Open Live Turn-by-Turn GPS HUD</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#9A3412" />
          </TouchableOpacity>

          {/* ── Order Details ── */}
          <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1">
                <Text className="text-textMuted text-[10px] uppercase tracking-wide font-bold mb-0.5">
                  Order
                </Text>
                <Text className="text-textPrimary font-bold text-sm">{order.orderNumber}</Text>
              </View>
              <View className="bg-[#FFF7ED] border border-[#FFEDD5] px-3 py-1.5 rounded-full">
                <Text className="text-[#7C2D12] font-bold text-xs">
                  LKR {(order.riderEarnings || 0).toFixed(0)} payout
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
              Total Order Value: LKR {order.totalAmount?.toFixed(0)}
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
                <Text className="text-textMuted text-[10px] uppercase tracking-wide font-bold">Cook (Pickup)</Text>
                <Text className="text-textPrimary font-bold text-sm">{order.cookName || 'Home Cook'}</Text>
                {order.cookAddressLabel || order.address?.cookAddress ? (
                  <Text className="text-textMuted text-xs mt-0.5" numberOfLines={1}>
                    {order.cookAddressLabel || order.address?.cookAddress}
                  </Text>
                ) : null}
              </View>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => callContact(order.cookPhone, 'cook')}
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
                <Text className="text-textMuted text-[10px] uppercase tracking-wide font-bold">Customer (Dropoff)</Text>
                <Text className="text-textPrimary font-bold text-sm">{order.customerName || 'Customer'}</Text>
                {order.address?.label ? (
                  <Text className="text-textMuted text-xs mt-0.5" numberOfLines={2}>{order.address.label}</Text>
                ) : null}
              </View>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => callContact(order.customerPhone, 'customer')}
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
              className="bg-[#9A3412] rounded-2xl py-4 items-center flex-row justify-center"
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
