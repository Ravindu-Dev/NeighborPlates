import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Badge } from '../common/Badge';
import {
  DEFAULT_COORDINATES,
  DISTRICT_COORDINATES,
  TOWN_COORDINATES,
} from '../../services/locationService';

let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {}
}

export interface OrderOperationalDetail {
  order: any;
  customerName: string;
  customerPhone?: string;
  cookName: string;
  cookPhone?: string;
  riderName?: string;
  riderPhone?: string;
  delayed: boolean;
  delayReason?: string;
  cookLocation?: number[]; // [lng, lat]
  cookDistrict?: string;
  cookTown?: string;
  customerLocation?: number[]; // [lng, lat]
  riderLocation?: number[]; // [lng, lat]
}

interface LiveOperationsMapProps {
  liveOrders: OrderOperationalDetail[];
  availableRiders: any[];
  onReassignRider: (order: OrderOperationalDetail) => void;
  onResolveDispute: (order: OrderOperationalDetail) => void;
  onForceStatus: (orderId: string, orderNumber: string, status: string) => void;
}

// Helper to resolve coordinates with Sri Lanka town/district fallbacks
const resolveCoordinates = (
  coords?: number[] | null,
  district?: string | null,
  town?: string | null,
  jitterSeed: number = 0
): { lat: number; lng: number } => {
  if (coords && coords.length >= 2 && coords[0] !== 0 && coords[1] !== 0) {
    return { lat: coords[1], lng: coords[0] };
  }
  if (town) {
    const key = town.toLowerCase().trim();
    if (TOWN_COORDINATES[key]) {
      const base = TOWN_COORDINATES[key];
      // Add slight jitter so multiple users in the same town don't completely overlap
      const jitterLat = ((jitterSeed % 7) - 3) * 0.003;
      const jitterLng = (((jitterSeed * 3) % 7) - 3) * 0.003;
      return { lat: base.latitude + jitterLat, lng: base.longitude + jitterLng };
    }
  }
  if (district) {
    const base = DISTRICT_COORDINATES[district];
    if (base) {
      const jitterLat = ((jitterSeed % 9) - 4) * 0.005;
      const jitterLng = (((jitterSeed * 5) % 9) - 4) * 0.005;
      return { lat: base.latitude + jitterLat, lng: base.longitude + jitterLng };
    }
  }
  // Default fallback (Colombo Center) with jitter
  const jitterLat = ((jitterSeed % 5) - 2) * 0.004;
  const jitterLng = (((jitterSeed * 2) % 5) - 2) * 0.004;
  return {
    lat: DEFAULT_COORDINATES.latitude + jitterLat,
    lng: DEFAULT_COORDINATES.longitude + jitterLng,
  };
};

export const LiveOperationsMap: React.FC<LiveOperationsMapProps> = ({
  liveOrders,
  availableRiders,
  onReassignRider,
  onResolveDispute,
  onForceStatus,
}) => {
  const [selectedOrder, setSelectedOrder] = useState<OrderOperationalDetail | null>(null);
  const [selectedRider, setSelectedRider] = useState<any | null>(null);

  // Layer switches
  const [showRiders, setShowRiders] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [filterProblematicOnly, setFilterProblematicOnly] = useState(false);

  // Compute map data
  const mapData = useMemo(() => {
    // 1. Process Orders
    const processedOrders = liveOrders
      .filter((item) => {
        if (!filterProblematicOnly) return true;
        return item.delayed || item.order.disputed || item.order.disputeStatus === 'OPEN';
      })
      .map((item, idx) => {
        const cookCoords = resolveCoordinates(
          item.cookLocation,
          item.cookDistrict,
          item.cookTown,
          idx + 1
        );
        const custCoords = resolveCoordinates(
          item.customerLocation,
          item.order?.address?.label,
          null,
          idx + 21
        );

        let riderCoords = null;
        if (item.riderLocation && item.riderLocation.length >= 2) {
          riderCoords = { lat: item.riderLocation[1], lng: item.riderLocation[0] };
        }

        return {
          id: item.order?.id,
          orderNumber: item.order?.orderNumber || 'NP-ORDER',
          status: item.order?.status,
          totalAmount: item.order?.totalAmount,
          delayed: item.delayed,
          delayReason: item.delayReason,
          disputed: item.order?.disputed || item.order?.disputeStatus === 'OPEN',
          disputeStatus: item.order?.disputeStatus,
          cookName: item.cookName,
          cookPhone: item.cookPhone,
          cookTown: item.cookTown || item.cookDistrict || 'Kitchen Area',
          cookDistrict: item.cookDistrict,
          cookCoords,
          custName: item.customerName,
          custPhone: item.customerPhone,
          custAddress: item.order?.address?.label || 'Customer Delivery Address',
          custCoords,
          riderName: item.riderName,
          riderPhone: item.riderPhone,
          riderCoords,
          itemsCount: item.order?.items?.length || 1,
          createdAt: item.order?.createdAt,
        };
      });

    // 2. Process Available Couriers
    const processedRiders = availableRiders.map((r, idx) => {
      const coords = resolveCoordinates(
        r.profile?.location?.coordinates,
        r.profile?.district,
        r.profile?.town,
        idx + 51
      );
      return {
        id: r.id,
        name: r.profile?.name || 'Community Rider',
        phone: r.profile?.phone,
        vehicleType: r.profile?.vehicleType || 'Motorcycle',
        isAvailable: r.profile?.isAvailable ?? true,
        coords,
      };
    });

    // 3. Compute Heatmap Cluster Points
    // Group orders by town/district coordinates to determine cluster intensities
    const clusters: Record<string, { lat: number; lng: number; count: number; name: string }> = {};
    liveOrders.forEach((item, idx) => {
      const coords = resolveCoordinates(
        item.cookLocation,
        item.cookDistrict,
        item.cookTown,
        idx
      );
      const key = `${coords.lat.toFixed(2)}_${coords.lng.toFixed(2)}`;
      if (!clusters[key]) {
        clusters[key] = {
          lat: coords.lat,
          lng: coords.lng,
          count: 0,
          name: item.cookTown || item.cookDistrict || 'Hub Area',
        };
      }
      clusters[key].count += 1;
    });

    return {
      orders: processedOrders,
      riders: processedRiders,
      clusters: Object.values(clusters),
    };
  }, [liveOrders, availableRiders, filterProblematicOnly]);

  // Generate Leaflet HTML
  const leafletHtml = useMemo(() => {
    const ordersJson = JSON.stringify(mapData.orders);
    const ridersJson = JSON.stringify(mapData.riders);
    const clustersJson = JSON.stringify(mapData.clusters);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      background: #0F172A;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .leaflet-popup-content-wrapper {
      background: #1E293B;
      color: #F8FAFC;
      border-radius: 12px;
      padding: 4px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .leaflet-popup-tip {
      background: #1E293B;
    }
    .leaflet-popup-content {
      margin: 8px 12px;
      line-height: 1.4;
      font-size: 12px;
    }

    /* Custom Marker Styles */
    .cook-pin {
      background: #FF6B35;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      border: 2px solid #FFFFFF;
      box-shadow: 0 4px 10px rgba(255, 107, 53, 0.5);
      cursor: pointer;
    }
    .cust-pin {
      background: #3B82F6;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      border: 2px solid #FFFFFF;
      box-shadow: 0 4px 10px rgba(59, 130, 246, 0.5);
      cursor: pointer;
    }
    .rider-pin {
      background: #10B981;
      color: white;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      border: 2px solid #FFFFFF;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.6);
      cursor: pointer;
    }
    .delayed-ring {
      border: 3px solid #EF4444 !important;
      animation: pulse-border 1.8s infinite;
    }
    @keyframes pulse-border {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var orders = ${ordersJson};
    var riders = ${ridersJson};
    var clusters = ${clustersJson};
    var showRiders = ${showRiders};
    var showRoutes = ${showRoutes};
    var showHeatmap = ${showHeatmap};

    // Initialize Map with Sri Lanka view
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([6.9271, 79.8612], 12);

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Standard 100% free OpenStreetMap tileLayer (Requires NO API key)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    var allBounds = [];
    var orderLayers = L.layerGroup().addTo(map);
    var riderLayers = L.layerGroup().addTo(map);
    var heatmapLayers = L.layerGroup().addTo(map);

    function sendMessage(payload) {
      var msg = JSON.stringify(payload);
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(msg);
      } else if (window.parent && window.parent.postMessage) {
        window.parent.postMessage(msg, '*');
      }
    }

    // 1. Draw Heatmap Density Circles
    if (showHeatmap) {
      clusters.forEach(function(c) {
        var radius = Math.min(2500, Math.max(900, c.count * 600));
        var color = c.count >= 3 ? '#EF4444' : (c.count >= 2 ? '#F59E0B' : '#10B981');
        var circle = L.circle([c.lat, c.lng], {
          color: color,
          fillColor: color,
          fillOpacity: 0.28,
          radius: radius,
          weight: 2
        }).addTo(heatmapLayers);

        circle.bindTooltip('🔥 <b>' + c.name + '</b><br/>' + c.count + ' Active Orders', {
          direction: 'top',
          className: 'leaflet-popup-content-wrapper'
        });
      });
    }

    // 2. Draw Orders (Cook -> Cust Route lines & Pins)
    orders.forEach(function(o) {
      allBounds.push([o.cookCoords.lat, o.cookCoords.lng]);
      allBounds.push([o.custCoords.lat, o.custCoords.lng]);

      // Route Polyline
      if (showRoutes) {
        var routeColor = o.disputed ? '#EF4444' : (o.delayed ? '#F59E0B' : '#FF6B35');
        var routeWeight = o.delayed || o.disputed ? 4 : 3;
        var dashArray = o.delayed || o.disputed ? '6, 6' : null;

        var latlngs = [
          [o.cookCoords.lat, o.cookCoords.lng],
          [o.custCoords.lat, o.custCoords.lng]
        ];

        var polyline = L.polyline(latlngs, {
          color: routeColor,
          weight: routeWeight,
          opacity: 0.85,
          dashArray: dashArray
        }).addTo(orderLayers);

        var routePopupHtml = '<div style="min-width: 210px; font-family: -apple-system, sans-serif;">' +
          '<div style="font-size: 10px; font-weight: 800; color: #FF6B35; letter-spacing: 0.5px;">📦 ORDER #' + o.orderNumber + ' ROUTE</div>' +
          '<div style="font-size: 12px; font-weight: 800; color: #FFFFFF; margin: 3px 0;">' + o.cookName + ' ➔ ' + o.custName + '</div>' +
          '<hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.12); margin: 5px 0;" />' +
          '<div style="font-size: 11px; color: #CBD5E1;"><b>👨‍🍳 Cook:</b> ' + o.cookName + ' (' + (o.cookPhone || 'No phone') + ')</div>' +
          '<div style="font-size: 11px; color: #CBD5E1; margin-top: 2px;"><b>📍 Drop-off:</b> ' + o.custName + '</div>' +
          '<div style="font-size: 11px; color: #94A3B8; margin-top: 2px;">🏠 ' + o.custAddress + '</div>' +
          '<div style="font-size: 11px; color: #10B981; margin-top: 4px;"><b>🛵 Courier:</b> ' + (o.riderName ? o.riderName + ' (' + (o.riderPhone || 'No phone') + ')' : '<span style="color:#F59E0B">⚠️ Unassigned</span>') + '</div>' +
          '</div>';

        polyline.bindPopup(routePopupHtml);
        polyline.on('click', function() {
          polyline.openPopup();
          sendMessage({ type: 'ORDER_SELECT', orderId: o.id });
        });
      }

      // Cook Kitchen Pin
      var cookPinHtml = '<div class="cook-pin ' + (o.delayed || o.disputed ? 'delayed-ring' : '') + '">🍳</div>';
      var cookIcon = L.divIcon({ html: cookPinHtml, className: '', iconSize: [32, 32], iconAnchor: [16, 16] });
      var cookMarker = L.marker([o.cookCoords.lat, o.cookCoords.lng], { icon: cookIcon }).addTo(orderLayers);

      var cookPopupHtml = '<div style="min-width: 210px; font-family: -apple-system, sans-serif;">' +
        '<div style="font-size: 10px; font-weight: 800; color: #FF6B35; letter-spacing: 0.5px; margin-bottom: 2px;">👨‍🍳 COOK KITCHEN</div>' +
        '<div style="font-size: 14px; font-weight: 800; color: #FFFFFF;">' + o.cookName + '</div>' +
        '<div style="font-size: 11px; color: #94A3B8; margin-top: 1px;">📞 ' + (o.cookPhone || 'No phone provided') + '</div>' +
        '<div style="font-size: 11px; color: #94A3B8; margin-top: 1px;">📍 Area: ' + (o.cookTown || 'Kitchen Area') + '</div>' +
        '<hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.12); margin: 6px 0;" />' +
        '<div style="font-size: 11px; color: #E2E8F0;"><b>Order:</b> #' + o.orderNumber + ' <span style="color:#F59E0B">(' + o.status + ')</span></div>' +
        '<div style="font-size: 11px; color: #E2E8F0; margin-top: 2px;"><b>Drop-off to:</b> 📍 ' + o.custName + '</div>' +
        '<div style="font-size: 11px; color: #10B981; margin-top: 2px;"><b>Courier:</b> 🛵 ' + (o.riderName ? o.riderName : '<span style="color:#F59E0B">⚠️ Unassigned</span>') + '</div>' +
        '</div>';

      cookMarker.bindPopup(cookPopupHtml, { offset: [0, -12] });
      cookMarker.bindTooltip('👨‍🍳 ' + o.cookName, { direction: 'top', offset: [0, -16] });

      cookMarker.on('click', function() {
        cookMarker.openPopup();
        sendMessage({ type: 'ORDER_SELECT', orderId: o.id });
      });

      // Customer Drop-off Pin
      var custPinHtml = '<div class="cust-pin">📍</div>';
      var custIcon = L.divIcon({ html: custPinHtml, className: '', iconSize: [28, 28], iconAnchor: [14, 14] });
      var custMarker = L.marker([o.custCoords.lat, o.custCoords.lng], { icon: custIcon }).addTo(orderLayers);

      var custPopupHtml = '<div style="min-width: 220px; font-family: -apple-system, sans-serif;">' +
        '<div style="font-size: 10px; font-weight: 800; color: #3B82F6; letter-spacing: 0.5px; margin-bottom: 2px;">📍 DROP-OFF DESTINATION</div>' +
        '<div style="font-size: 14px; font-weight: 800; color: #FFFFFF;">' + o.custName + '</div>' +
        '<div style="font-size: 11px; color: #94A3B8; margin-top: 1px;">📞 ' + (o.custPhone || 'No phone provided') + '</div>' +
        '<div style="font-size: 11px; color: #CBD5E1; margin-top: 3px; line-height: 1.3;">🏠 <b>Address:</b> ' + o.custAddress + '</div>' +
        '<hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.12); margin: 6px 0;" />' +
        '<div style="font-size: 11px; color: #E2E8F0;"><b>Order:</b> #' + o.orderNumber + ' (LKR ' + (o.totalAmount || 0) + ')</div>' +
        '<div style="font-size: 11px; color: #E2E8F0; margin-top: 2px;"><b>From Cook:</b> 👨‍🍳 ' + o.cookName + '</div>' +
        '<div style="font-size: 11px; color: #10B981; margin-top: 2px;"><b>Delivered by:</b> 🛵 ' + (o.riderName ? o.riderName : '<span style="color:#F59E0B">⚠️ Unassigned</span>') + '</div>' +
        '</div>';

      custMarker.bindPopup(custPopupHtml, { offset: [0, -10] });
      custMarker.bindTooltip('📍 Drop-off: ' + o.custName, { direction: 'top', offset: [0, -14] });

      custMarker.on('click', function() {
        custMarker.openPopup();
        sendMessage({ type: 'ORDER_SELECT', orderId: o.id });
      });
    });

    // 3. Draw Available Couriers (Riders)
    if (showRiders) {
      riders.forEach(function(r) {
        allBounds.push([r.coords.lat, r.coords.lng]);

        var vehicleEmoji = r.vehicleType === 'Car' ? '🚗' : (r.vehicleType === 'E-Bike' ? '⚡' : (r.vehicleType === 'Bicycle' ? '🚲' : '🛵'));
        var riderPinHtml = '<div class="rider-pin">' + vehicleEmoji + '</div>';
        var riderIcon = L.divIcon({ html: riderPinHtml, className: '', iconSize: [34, 34], iconAnchor: [17, 17] });
        var riderMarker = L.marker([r.coords.lat, r.coords.lng], { icon: riderIcon }).addTo(riderLayers);

        var riderPopupHtml = '<div style="min-width: 200px; font-family: -apple-system, sans-serif;">' +
          '<div style="font-size: 10px; font-weight: 800; color: #10B981; letter-spacing: 0.5px; margin-bottom: 2px;">🛵 COMMUNITY COURIER</div>' +
          '<div style="font-size: 14px; font-weight: 800; color: #FFFFFF;">' + r.name + '</div>' +
          '<div style="font-size: 11px; color: #94A3B8; margin-top: 1px;">Vehicle: ' + vehicleEmoji + ' ' + r.vehicleType + '</div>' +
          '<div style="font-size: 11px; color: #94A3B8; margin-top: 1px;">📞 ' + (r.phone || 'No phone') + '</div>' +
          '<div style="margin-top: 6px;">' +
          '<span style="background: rgba(16,185,129,0.2); color: #34D399; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700;">' +
          (r.isAvailable ? '● ONLINE & AVAILABLE' : '○ OFFLINE') +
          '</span>' +
          '</div>' +
          '</div>';

        riderMarker.bindPopup(riderPopupHtml, { offset: [0, -14] });
        riderMarker.bindTooltip('🛵 ' + r.name + ' (' + r.vehicleType + ')', { direction: 'top', offset: [0, -18] });

        riderMarker.on('click', function() {
          riderMarker.openPopup();
          sendMessage({ type: 'RIDER_SELECT', riderId: r.id });
        });
      });
    }

    // Auto-fit all points if orders exist
    if (allBounds.length > 0) {
      map.fitBounds(allBounds, { padding: [40, 40], maxZoom: 14 });
    }

    // Global listener for reset commands from React Native
    window.addEventListener('message', function(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'FIT_ALL' && allBounds.length > 0) {
          map.fitBounds(allBounds, { padding: [40, 40], maxZoom: 14 });
        } else if (data.type === 'FOCUS_COLOMBO') {
          map.setView([6.9271, 79.8612], 13);
        } else if (data.type === 'FOCUS_KANDY') {
          map.setView([7.2906, 80.6337], 13);
        }
      } catch(e) {}
    });
  </script>
</body>
</html>
    `;
  }, [mapData, showRiders, showRoutes, showHeatmap]);

  const handleMessage = (event: any) => {
    try {
      const rawData =
        typeof event.nativeEvent?.data === 'string'
          ? event.nativeEvent.data
          : typeof event.data === 'string'
          ? event.data
          : null;

      if (!rawData) return;
      const data = JSON.parse(rawData);

      if (data.type === 'ORDER_SELECT' && data.orderId) {
        const found = liveOrders.find((item) => item.order?.id === data.orderId);
        if (found) {
          setSelectedOrder(found);
          setSelectedRider(null);
        }
      } else if (data.type === 'RIDER_SELECT' && data.riderId) {
        const found = availableRiders.find((r) => r.id === data.riderId);
        if (found) {
          setSelectedRider(found);
          setSelectedOrder(null);
        }
      }
    } catch (e) {
      console.warn('Map message error:', e);
    }
  };

  const handleCall = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  return (
    <View className="flex-1 bg-surface-elevated">
      {/* Top Filter Chips */}
      <View className="bg-white px-3 py-2 border-b border-gray-100 flex-row items-center justify-between">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {/* Couriers Toggle */}
          <TouchableOpacity
            onPress={() => setShowRiders(!showRiders)}
            className={`flex-row items-center px-3 py-1.5 rounded-full mr-2 border ${
              showRiders
                ? 'bg-emerald-50 border-emerald-300'
                : 'bg-gray-100 border-gray-200 opacity-60'
            }`}
          >
            <Text className="text-xs mr-1">🛵</Text>
            <Text
              className={`text-xs font-bold ${
                showRiders ? 'text-emerald-700' : 'text-gray-500'
              }`}
            >
              Couriers ({availableRiders.length})
            </Text>
          </TouchableOpacity>

          {/* Routes Toggle */}
          <TouchableOpacity
            onPress={() => setShowRoutes(!showRoutes)}
            className={`flex-row items-center px-3 py-1.5 rounded-full mr-2 border ${
              showRoutes
                ? 'bg-orange-50 border-orange-300'
                : 'bg-gray-100 border-gray-200 opacity-60'
            }`}
          >
            <Feather
              name="git-commit"
              size={12}
              color={showRoutes ? '#FF6B35' : '#6B7280'}
              style={{ marginRight: 4 }}
            />
            <Text
              className={`text-xs font-bold ${
                showRoutes ? 'text-primary' : 'text-gray-500'
              }`}
            >
              Routes ({liveOrders.length})
            </Text>
          </TouchableOpacity>

          {/* Heatmap Toggle */}
          <TouchableOpacity
            onPress={() => setShowHeatmap(!showHeatmap)}
            className={`flex-row items-center px-3 py-1.5 rounded-full mr-2 border ${
              showHeatmap
                ? 'bg-rose-50 border-rose-300'
                : 'bg-gray-100 border-gray-200 opacity-60'
            }`}
          >
            <Text className="text-xs mr-1">🔥</Text>
            <Text
              className={`text-xs font-bold ${
                showHeatmap ? 'text-rose-700' : 'text-gray-500'
              }`}
            >
              Heatmap
            </Text>
          </TouchableOpacity>

          {/* Delayed / Disputes Filter */}
          <TouchableOpacity
            onPress={() => setFilterProblematicOnly(!filterProblematicOnly)}
            className={`flex-row items-center px-3 py-1.5 rounded-full mr-2 border ${
              filterProblematicOnly
                ? 'bg-amber-100 border-amber-400'
                : 'bg-gray-100 border-gray-200 opacity-60'
            }`}
          >
            <Feather
              name="alert-triangle"
              size={12}
              color={filterProblematicOnly ? '#D97706' : '#6B7280'}
              style={{ marginRight: 4 }}
            />
            <Text
              className={`text-xs font-bold ${
                filterProblematicOnly ? 'text-amber-800' : 'text-gray-500'
              }`}
            >
              Issues Only
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Map Canvas */}
      <View className="flex-1 relative">
        {Platform.OS === 'web' ? (
          // @ts-ignore
          <iframe
            srcDoc={leafletHtml}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        ) : WebView ? (
          <WebView
            originWhitelist={['*']}
            source={{ html: leafletHtml }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onMessage={handleMessage}
            className="flex-1"
          />
        ) : (
          <View className="flex-1 items-center justify-center p-4">
            <Text className="text-textMuted">Map viewer unavailable on this device.</Text>
          </View>
        )}

        {/* Legend Overlay on Map */}
        <View className="absolute top-3 left-3 bg-white/95 px-3 py-2 rounded-xl shadow-md border border-gray-100 flex-row gap-3">
          <View className="flex-row items-center">
            <View className="w-2.5 h-2.5 rounded-full bg-primary mr-1.5" />
            <Text className="text-[10px] font-bold text-gray-700">Kitchen</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-1.5" />
            <Text className="text-[10px] font-bold text-gray-700">Drop-off</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5" />
            <Text className="text-[10px] font-bold text-gray-700">Courier</Text>
          </View>
          {showHeatmap && (
            <View className="flex-row items-center">
              <View className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-1.5" />
              <Text className="text-[10px] font-bold text-gray-700">Demand Zone</Text>
            </View>
          )}
        </View>
      </View>

      {/* Bottom Selected Order Action Drawer */}
      {selectedOrder && (
        <View className="bg-white border-t border-gray-200 p-4 shadow-xl">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <Text className="font-black text-textPrimary text-base">
                #{selectedOrder.order?.orderNumber}
              </Text>
              <Badge
                label={selectedOrder.order?.status || 'PENDING'}
                variant={
                  selectedOrder.order?.status === 'DELIVERED'
                    ? 'success'
                    : selectedOrder.order?.status === 'CANCELLED'
                    ? 'error'
                    : 'warning'
                }
              />
              {selectedOrder.delayed && (
                <Badge label="DELAYED" variant="warning" />
              )}
              {selectedOrder.order?.disputed && (
                <Badge label="DISPUTE" variant="error" />
              )}
            </View>

            <TouchableOpacity
              onPress={() => setSelectedOrder(null)}
              className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center"
            >
              <Feather name="x" size={14} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Delay or Dispute Alert Text */}
          {selectedOrder.delayed && selectedOrder.delayReason && (
            <View className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2 flex-row items-center">
              <Feather name="alert-circle" size={12} color="#D97706" style={{ marginRight: 6 }} />
              <Text className="text-amber-800 text-xs font-semibold flex-1">
                {selectedOrder.delayReason}
              </Text>
            </View>
          )}

          {/* Cook, Customer & Courier Grid */}
          <View className="bg-gray-50 rounded-xl p-2.5 mb-3 flex-row justify-between">
            <View className="flex-1 pr-1">
              <Text className="text-[10px] uppercase font-bold text-gray-400">Cook Kitchen</Text>
              <Text className="text-xs font-bold text-gray-800" numberOfLines={1}>
                {selectedOrder.cookName}
              </Text>
              <Text className="text-[10px] text-gray-500" numberOfLines={1}>
                {selectedOrder.cookTown || selectedOrder.cookDistrict || 'Kitchen Area'}
              </Text>
              {selectedOrder.cookPhone && (
                <TouchableOpacity
                  onPress={() => handleCall(selectedOrder.cookPhone)}
                  className="flex-row items-center mt-1"
                >
                  <Feather name="phone" size={10} color="#FF6B35" />
                  <Text className="text-[10px] text-primary ml-1 font-bold">Call</Text>
                </TouchableOpacity>
              )}
            </View>

            <View className="w-[1px] bg-gray-200" />

            <View className="flex-1 px-2">
              <Text className="text-[10px] uppercase font-bold text-gray-400">Customer</Text>
              <Text className="text-xs font-bold text-gray-800" numberOfLines={1}>
                {selectedOrder.customerName}
              </Text>
              <Text className="text-[10px] text-gray-500" numberOfLines={1}>
                Drop-off Contact
              </Text>
              {selectedOrder.customerPhone && (
                <TouchableOpacity
                  onPress={() => handleCall(selectedOrder.customerPhone)}
                  className="flex-row items-center mt-1"
                >
                  <Feather name="phone" size={10} color="#3B82F6" />
                  <Text className="text-[10px] text-blue-600 ml-1 font-bold">Call</Text>
                </TouchableOpacity>
              )}
            </View>

            <View className="w-[1px] bg-gray-200" />

            <View className="flex-1 pl-1">
              <Text className="text-[10px] uppercase font-bold text-gray-400">Courier</Text>
              <Text
                className={`text-xs font-bold ${
                  selectedOrder.riderName ? 'text-gray-800' : 'text-amber-600'
                }`}
                numberOfLines={1}
              >
                {selectedOrder.riderName || 'Unassigned'}
              </Text>
              <Text className="text-[10px] text-gray-500" numberOfLines={1}>
                {selectedOrder.riderName ? 'On Route' : 'Needs Courier'}
              </Text>
              {selectedOrder.riderPhone && (
                <TouchableOpacity
                  onPress={() => handleCall(selectedOrder.riderPhone)}
                  className="flex-row items-center mt-1"
                >
                  <Feather name="phone" size={10} color="#10B981" />
                  <Text className="text-[10px] text-emerald-600 ml-1 font-bold">Call</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Drop-off Address Bar */}
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 mb-3 flex-row items-center">
            <View className="w-7 h-7 rounded-full bg-blue-100 items-center justify-center mr-2.5">
              <Feather name="map-pin" size={13} color="#2563EB" />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] uppercase font-extrabold text-blue-700">Drop-off Delivery Address</Text>
              <Text className="text-xs font-bold text-gray-800 mt-0.5" numberOfLines={2}>
                {selectedOrder.order?.address?.label || 'Customer Delivery Address'}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => onReassignRider(selectedOrder)}
              className="flex-1 bg-primary/10 border border-primary/30 rounded-xl py-2.5 items-center justify-center flex-row"
            >
              <Feather name="user-plus" size={13} color="#FF6B35" style={{ marginRight: 6 }} />
              <Text className="text-primary text-xs font-bold">
                {selectedOrder.riderName ? 'Reassign Rider' : 'Assign Rider'}
              </Text>
            </TouchableOpacity>

            {selectedOrder.order?.disputed && (
              <TouchableOpacity
                onPress={() => onResolveDispute(selectedOrder)}
                className="flex-1 bg-red-600 rounded-xl py-2.5 items-center justify-center flex-row"
              >
                <Feather name="shield" size={13} color="white" style={{ marginRight: 6 }} />
                <Text className="text-white text-xs font-bold">Resolve Dispute</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() =>
                onForceStatus(
                  selectedOrder.order.id,
                  selectedOrder.order.orderNumber,
                  'DELIVERED'
                )
              }
              className="px-3 bg-gray-100 rounded-xl py-2.5 items-center justify-center"
            >
              <Feather name="more-horizontal" size={16} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bottom Selected Rider Action Drawer */}
      {selectedRider && !selectedOrder && (
        <View className="bg-white border-t border-gray-200 p-4 shadow-xl">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center">
                <Text className="text-base">🛵</Text>
              </View>
              <View>
                <Text className="font-black text-textPrimary text-sm">
                  {selectedRider.name}
                </Text>
                <Text className="text-textMuted text-[10px]">
                  {selectedRider.vehicleType} • {selectedRider.isAvailable ? 'Online & Ready' : 'Offline'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setSelectedRider(null)}
              className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center"
            >
              <Feather name="x" size={14} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {selectedRider.phone && (
            <TouchableOpacity
              onPress={() => handleCall(selectedRider.phone)}
              className="mt-1 bg-emerald-50 border border-emerald-200 rounded-xl py-2 items-center flex-row justify-center"
            >
              <Feather name="phone" size={12} color="#059669" style={{ marginRight: 6 }} />
              <Text className="text-emerald-700 text-xs font-bold">
                Call Courier ({selectedRider.phone})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};
