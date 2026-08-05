import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { TextInput } from '../../components/common/TextInput';
import { Feather } from '@expo/vector-icons';

let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    console.warn("react-native-webview not loaded", e);
  }
}

const getTrackingMapHtml = (cookCoords: number[], customerCoords: number[], status: string) => {
  // Fallbacks scattered slightly around Colombo center if coords are 0/empty
  const cookLon = cookCoords[0] && cookCoords[0] !== 0 ? cookCoords[0] : 79.865;
  const cookLat = cookCoords[1] && cookCoords[1] !== 0 ? cookCoords[1] : 6.932;
  const custLon = customerCoords[0] && customerCoords[0] !== 0 ? customerCoords[0] : 79.861;
  const custLat = customerCoords[1] && customerCoords[1] !== 0 ? customerCoords[1] : 6.927;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>NeighborPlates Live Tracking</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        html, body, #map {
          height: 100%;
          margin: 0;
          padding: 0;
          background: #F3F4F6;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${(cookLat + custLat)/2}, ${(cookLon + custLon)/2}], 14);
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);

        // Cook Kitchen location marker
        L.marker([${cookLat}, ${cookLon}], {
          icon: L.divIcon({
            html: '<div style="background-color: #FF6B35; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(255, 107, 53, 0.8);"></div>',
            className: 'm',
            iconSize: [14, 14]
          })
        }).addTo(map).bindPopup('<div style="font-family: sans-serif; font-size: 11px; font-weight: 700;">👨‍🍳 Cook Kitchen</div>');

        // Customer Home location marker
        L.marker([${custLat}, ${custLon}], {
          icon: L.divIcon({
            html: '<div style="background-color: #3B82F6; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(59, 130, 246, 0.8);"></div>',
            className: 'm',
            iconSize: [14, 14]
          })
        }).addTo(map).bindPopup('<div style="font-family: sans-serif; font-size: 11px; font-weight: 700;">📍 Your Delivery Location</div>');

        // Route path line
        L.polyline([[${cookLat}, ${cookLon}], [${custLat}, ${custLon}]], {
          color: '#FF6B35',
          dashArray: '5, 8',
          weight: 3
        }).addTo(map);

        // Moving delivery rider marker
        var rider = L.marker([${cookLat}, ${cookLon}], {
          icon: L.divIcon({
            html: '<div style="background-color: #10B981; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(16, 185, 129, 0.8); display: flex; align-items: center; justify-content: center; font-size: 11px; color: white;">🛵</div>',
            className: 'm',
            iconSize: [22, 22]
          })
        }).addTo(map);

        var status = "${status}";
        if (status === 'READY') {
          // Animate rider path progression loop
          var startTime = Date.now();
          var duration = 25000; // 25 seconds loop
          function animate() {
            var elapsed = (Date.now() - startTime) % duration;
            var fraction = elapsed / duration;
            var curLat = ${cookLat} + (${custLat} - ${cookLat}) * fraction;
            var curLng = ${cookLon} + (${custLon} - ${cookLon}) * fraction;
            rider.setLatLng([curLat, curLng]);
            requestAnimationFrame(animate);
          }
          animate();
        } else if (status === 'DELIVERED') {
          rider.setLatLng([${custLat}, ${custLon}]);
        } else {
          rider.setLatLng([${cookLat}, ${cookLon}]);
        }
      </script>
    </body>
    </html>
  `;
};

type OrderTrackingScreenProps = NativeStackScreenProps<CustomerStackParamList, 'OrderTracking'>;

export const OrderTrackingScreen: React.FC<OrderTrackingScreenProps> = ({ route, navigation }) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [cookCoords, setCookCoords] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Review inputs
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  const fetchOrder = async () => {
    try {
      const response = await api.get('/api/orders/my');
      const target = response.data.find((o: any) => o.id === orderId);
      setOrder(target);

      if (target && target.cookId && !cookCoords) {
        try {
          const cookRes = await api.get(`/api/users/cooks/${target.cookId}`);
          if (cookRes.data && cookRes.data.profile && cookRes.data.profile.location) {
            setCookCoords(cookRes.data.profile.location.coordinates);
          }
        } catch (e) {
          console.warn("Failed fetching cook coordinates:", e);
          // Scatter fallback coordinates for demo
          setCookCoords([79.865, 6.932]);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    
    // Live update polling for demo (Real-time Firebase listener setup in Phase 8)
    const interval = setInterval(fetchOrder, 8000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-elevated">
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  const steps = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED'];
  const currentStepIndex = steps.indexOf(order?.status || 'PLACED');

  const handleCancel = async () => {
    try {
      await api.put(`/api/orders/${orderId}/status?status=CANCELLED`);
      Alert.alert('Success', 'Order cancelled successfully.');
      fetchOrder();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to cancel order.');
    }
  };

  const submitReview = async () => {
    if (!comment.trim()) {
      setCommentError('Comment is required to submit a review.');
      return;
    } else {
      setCommentError('');
    }
    setReviewSubmitting(true);
    try {
      await api.post('/api/reviews', {
        orderId: order.id,
        mealId: order.items[0].mealId,
        rating: rating,
        comment: comment,
      });
      Alert.alert('Thank you!', 'Your feedback was successfully submitted.');
      setReviewed(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-surface-elevated">
      {/* Premium Header */}
      <View className="bg-white px-6 pt-12 pb-4 border-b border-gray-100 shadow-sm z-10 flex-row justify-between items-center">
        <View className="flex-row items-center flex-1 mr-2">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-3 border border-gray-150">
            <Feather name="chevron-left" size={18} color="#1A1A2E" />
          </TouchableOpacity>
          <Text className="font-black text-xl text-textPrimary">Track Order</Text>
        </View>
        <View className="bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1">
          <Text className="text-primary font-black text-[9px] uppercase tracking-wider">Live Tracker</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
        {order?.status === 'CANCELLED' ? (
          <View className="bg-red-50 border border-red-200 rounded-3xl p-5 mb-6 items-center">
            <Text className="text-red-700 font-extrabold text-lg">ORDER CANCELLED</Text>
            <Text className="text-red-600 text-xs mt-1 text-center">
              This order has been cancelled and portion balances have been returned to the cook.
            </Text>
          </View>
        ) : (
          <View>
            {/* Live Tracking Map using Leaflet & OpenStreetMap */}
            {cookCoords && (
              <View className="bg-white rounded-3xl overflow-hidden border border-gray-150 shadow-sm mb-6 h-60">
                {Platform.OS === 'web' ? (
                  <iframe
                    srcDoc={getTrackingMapHtml(cookCoords, order.address?.coordinates || [79.8612, 6.9271], order.status)}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="Live Delivery Map"
                  />
                ) : (
                  WebView && (
                    <WebView
                      originWhitelist={['*']}
                      source={{ html: getTrackingMapHtml(cookCoords, order.address?.coordinates || [79.8612, 6.9271], order.status) }}
                      style={{ flex: 1 }}
                      javaScriptEnabled
                      domStorageEnabled
                    />
                  )
                )}
              </View>
            )}

            {/* Timeline Step Tracker */}
            <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6">
              <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-4">ORDER TRACKING</Text>
              {steps.map((step, idx) => {
                const isCompleted = idx <= currentStepIndex;
                const isActive = idx === currentStepIndex;
                return (
                  <View key={step} className="flex-row items-start mb-4 relative">
                    <View className="items-center mr-4">
                      <View 
                        className={`w-6 h-6 rounded-full items-center justify-center border
                          ${isCompleted ? 'bg-primary border-primary' : 'bg-white border-gray-200'}
                        `}
                      >
                        <Text className="text-[10px] font-bold text-white">
                          {isCompleted ? "✓" : ""}
                        </Text>
                      </View>
                      {idx < steps.length - 1 && (
                        <View className={`w-0.5 h-8 ${isCompleted ? 'bg-primary' : 'bg-gray-200'}`} />
                      )}
                    </View>
                    <View className="flex-1 pt-0.5">
                      <Text className={`text-sm font-extrabold ${isActive ? 'text-primary' : isCompleted ? 'text-textPrimary' : 'text-textMuted'}`}>
                        {step}
                      </Text>
                      <Text className="text-textSecondary text-[10px] mt-0.5">
                        {isActive ? "ACTIVE STEP" : isCompleted ? "COMPLETED" : "PENDING"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Pricing / Items Detail */}
        <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6">
          <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-2">ORDER DETAIL</Text>
          <Text className="text-textPrimary font-extrabold text-sm">{order?.orderNumber}</Text>
          <Text className="text-textSecondary text-xs mt-1">Cook: {order?.cookName}</Text>
          <View className="border-t border-gray-50 mt-3 pt-3">
            <Text className="text-textPrimary font-black text-sm">
              Total Price: LKR {order?.totalAmount}
            </Text>
          </View>
        </View>

        {/* Cancellation / Review Forms */}
        {order?.status === 'PLACED' ? (
          <Button
            title="CANCEL ORDER"
            onPress={handleCancel}
            variant="outline"
            className="w-full mb-10 border-red-500 text-red-500"
          />
        ) : order?.status === 'DELIVERED' && !reviewed ? (
          <View className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm mb-12">
            <Text className="text-textPrimary font-bold text-base mb-1">Rate Your Meal</Text>
            <Text className="text-textMuted text-xs mb-4">Share your feedback to support local home cooks!</Text>
            
            {/* Star Selector */}
            <View className="flex-row justify-center mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} className="px-2">
                  <Text className="text-3xl">{star <= rating ? "★" : "☆"}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              label="REVIEW COMMENT *"
              placeholder="Write a brief comment about food taste, portion sizes, packaging..."
              value={comment}
              onChangeText={(text) => {
                setComment(text);
                if (text.trim()) setCommentError('');
              }}
              error={commentError}
              multiline
              numberOfLines={3}
            />
            <Button
              title="SUBMIT REVIEW"
              onPress={submitReview}
              loading={reviewSubmitting}
              variant="primary"
              className="w-full mt-2"
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};
