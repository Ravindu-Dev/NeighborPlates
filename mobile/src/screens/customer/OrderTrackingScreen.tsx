import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { TextInput } from '../../components/common/TextInput';

type OrderTrackingScreenProps = NativeStackScreenProps<CustomerStackParamList, 'OrderTracking'>;

export const OrderTrackingScreen: React.FC<OrderTrackingScreenProps> = ({ route, navigation }) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Review inputs
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  const fetchOrder = async () => {
    try {
      const response = await api.get('/api/orders/my');
      const target = response.data.find((o: any) => o.id === orderId);
      setOrder(target);
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
    if (!comment) {
      Alert.alert('Validation Error', 'Please write a brief comment.');
      return;
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
    <ScrollView className="flex-1 bg-surface-elevated p-6">
      {order?.status === 'CANCELLED' ? (
        <View className="bg-red-50 border border-red-200 rounded-3xl p-5 mb-6 items-center">
          <Text className="text-red-700 font-extrabold text-lg">ORDER CANCELLED</Text>
          <Text className="text-red-600 text-xs mt-1 text-center">
            This order has been cancelled and portion balances have been returned to the cook.
          </Text>
        </View>
      ) : (
        /* Timeline Step Tracker (Phase 9 Animation targets this) */
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
            placeholder="Write a brief comment about food taste, portion sizes, packaging..."
            value={comment}
            onChangeText={setComment}
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
  );
};
