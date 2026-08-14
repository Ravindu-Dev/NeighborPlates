import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Platform, Modal, Image } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { TextInput } from '../../components/common/TextInput';
import { Feather, Ionicons } from '@expo/vector-icons';
import { pickImageFromGallery, uploadImageToImgBB } from '../../services/imageService';

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
  const [reviewedMealIds, setReviewedMealIds] = useState<string[]>([]);
  const [selectedMealIndex, setSelectedMealIndex] = useState(0);
  const [reviewPhotoUrl, setReviewPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Dispute inputs
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [disputeReason, setDisputeReason] = useState('Late Delivery');
  const [disputeDetails, setDisputeDetails] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  const handleReportDisputeSubmit = async () => {
    if (!disputeReason) {
      Alert.alert('Error', 'Please select or enter a dispute reason.');
      return;
    }
    setDisputeSubmitting(true);
    try {
      await api.post(`/api/orders/${orderId}/dispute`, {
        reason: disputeReason,
        details: disputeDetails,
      });
      Alert.alert('Dispute Escalated', 'Your dispute has been logged and sent to Admin Command Center for resolution.');
      setDisputeModalVisible(false);
      setDisputeDetails('');
      fetchOrder();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit dispute');
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const fetchOrder = async () => {
    try {
      const response = await api.get('/api/orders/my');
      const target = response.data.find((o: any) => o.id === orderId);
      setOrder(target);

      if (target) {
        // Fetch existing reviews for this order
        try {
          const reviewsRes = await api.get(`/api/reviews/order/${orderId}`);
          const reviewedIds = reviewsRes.data.map((r: any) => r.mealId);
          setReviewedMealIds(reviewedIds);
        } catch (err) {
          console.warn("Failed fetching order reviews:", err);
        }

        if (target.cookId && !cookCoords) {
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

  const handlePickReviewPhoto = async () => {
    try {
      const uri = await pickImageFromGallery();
      if (!uri) return;
      setUploadingPhoto(true);
      const cdnUrl = await uploadImageToImgBB(uri);
      setReviewPhotoUrl(cdnUrl);
    } catch (err: any) {
      Alert.alert('Upload Error', err?.message || 'Could not upload food image.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const submitReviewForMeal = async (mealId: string) => {
    setReviewSubmitting(true);
    try {
      await api.post('/api/reviews', {
        orderId: order.id,
        mealId: mealId,
        rating: rating,
        comment: comment.trim(),
        photoUrl: reviewPhotoUrl,
      });
      Alert.alert('Thank you! 🎉', 'Your review has been shared with the kitchen.');
      
      // Reset inputs
      setRating(5);
      setComment('');
      setReviewPhotoUrl('');
      
      // Refresh order reviews list
      fetchOrder();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const renderReviewForm = () => {
    if (order?.status !== 'DELIVERED') return null;

    const unreviewedItems = order?.items?.filter((item: any) => !reviewedMealIds.includes(item.mealId)) || [];
    if (unreviewedItems.length === 0) {
      return (
        <View className="bg-emerald-50 border border-emerald-200 p-5 rounded-3xl mb-12 items-center">
          <Text className="text-emerald-700 font-extrabold text-base mb-1">🎉 All Reviewed!</Text>
          <Text className="text-emerald-600 text-xs text-center">
            Thank you for sharing your feedback on all meals in this order!
          </Text>
        </View>
      );
    }

    const currentItem = unreviewedItems[selectedMealIndex] || unreviewedItems[0];
    if (!currentItem) return null;

    return (
      <View className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm mb-12">
        <Text className="text-textPrimary font-bold text-base mb-1">Rate Your Meal</Text>
        <Text className="text-textMuted text-xs mb-4">Share your feedback to support local home kitchens!</Text>

        {/* Multi-item selector if applicable */}
        {unreviewedItems.length > 1 && (
          <View className="mb-5">
            <Text className="text-textSecondary text-[9px] font-black uppercase tracking-wider mb-2">SELECT ITEM TO RATE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
              {unreviewedItems.map((item: any, idx: number) => {
                const isSelected = (unreviewedItems[selectedMealIndex]?.mealId || unreviewedItems[0]?.mealId) === item.mealId;
                return (
                  <TouchableOpacity
                    key={item.mealId}
                    onPress={() => {
                      setSelectedMealIndex(idx);
                      setReviewPhotoUrl('');
                    }}
                    className={`px-3 py-2 rounded-xl border mr-2 ${isSelected ? 'bg-primary/10 border-primary' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <Text className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-textMuted'}`}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <Text className="text-textSecondary text-[10px] font-black uppercase mb-3">Rating for "{currentItem.name}"</Text>
        
        {/* Star Selector */}
        <View className="flex-row justify-center mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)} className="px-2">
              <Text className="text-3xl">{star <= rating ? "★" : "☆"}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Photo Selector */}
        <View className="mb-4">
          <Text className="text-textSecondary text-[10px] font-black uppercase mb-2">Food Photo (Optional)</Text>
          <TouchableOpacity
            onPress={handlePickReviewPhoto}
            disabled={uploadingPhoto}
            className="border border-dashed border-gray-300 bg-gray-50 rounded-2xl py-4 items-center justify-center relative overflow-hidden"
            activeOpacity={0.8}
          >
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color="#FF6B35" />
            ) : reviewPhotoUrl ? (
              <View className="w-full h-32 items-center justify-center">
                <Image source={{ uri: reviewPhotoUrl }} className="w-full h-full" resizeMode="contain" />
                <TouchableOpacity
                  onPress={() => setReviewPhotoUrl('')}
                  className="absolute top-2 right-2 bg-red-500 rounded-full p-1.5"
                >
                  <Feather name="trash-2" size={12} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <Feather name="camera" size={16} color="#6B7280" />
                <Text className="text-textSecondary font-bold text-xs">Add Food Photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TextInput
          label="REVIEW COMMENT (OPTIONAL)"
          placeholder="Write a brief comment about food taste, portion sizes, packaging..."
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={3}
        />
        <Button
          title={`SUBMIT REVIEW FOR ${currentItem.name.toUpperCase()}`}
          onPress={() => submitReviewForMeal(currentItem.mealId)}
          loading={reviewSubmitting}
          variant="primary"
          className="w-full mt-2"
        />
      </View>
    );
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
        ) : (
          renderReviewForm()
        )}
        {/* Report Dispute Button */}
        <View className="mb-12">
          {order?.disputed ? (
            <View className="bg-red-50 p-4 rounded-2xl border border-red-200 flex-row items-center">
              <Feather name="shield" size={16} color="#DC2626" />
              <Text className="text-red-700 text-xs font-bold ml-2">
                Dispute logged with Admin Command Center. (Status: {order.disputeStatus || 'OPEN'})
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setDisputeModalVisible(true)}
              className="py-3 px-4 rounded-2xl bg-gray-100 border border-gray-200 flex-row justify-center items-center"
            >
              <Feather name="alert-circle" size={14} color="#6B7280" />
              <Text className="text-textSecondary text-xs font-bold ml-2">Need help? Report an Order Issue</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Customer Dispute Modal */}
      <Modal visible={disputeModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6 border-t border-gray-100">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-textPrimary font-black text-lg">Report Order Issue</Text>
              <TouchableOpacity onPress={() => setDisputeModalVisible(false)}>
                <Feather name="x" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-textMuted text-xs mb-4">
              Having trouble with Order #{order?.orderNumber}? Submit an issue to notify platform Admin support.
            </Text>

            <Text className="text-textPrimary font-bold text-xs uppercase mb-2">Issue Reason</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {['Late Delivery', 'Missing Items', 'Cold Food', 'Rider Issue', 'Other'].map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setDisputeReason(r)}
                  className={`px-3 py-2 rounded-xl border ${
                    disputeReason === r ? 'bg-primary/10 border-primary' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      disputeReason === r ? 'text-primary' : 'text-textMuted'
                    }`}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              label="ADDITIONAL DETAILS (OPTIONAL)"
              placeholder="Describe what went wrong with your order..."
              value={disputeDetails}
              onChangeText={setDisputeDetails}
              multiline
              numberOfLines={3}
            />

            <View className="flex-row gap-3 mt-4">
              <Button title="CANCEL" onPress={() => setDisputeModalVisible(false)} variant="outline" className="flex-1" />
              <Button
                title="SUBMIT DISPUTE"
                onPress={handleReportDisputeSubmit}
                loading={disputeSubmitting}
                variant="primary"
                className="flex-1"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
