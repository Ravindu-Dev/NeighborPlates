import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { TextInput } from '../../components/common/TextInput';

type CheckoutScreenProps = NativeStackScreenProps<CustomerStackParamList, 'Checkout'>;

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ route, navigation }) => {
  const { mealId, quantity } = route.params;
  const [meal, setMeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [address, setAddress] = useState('');
  const [instructions, setInstructions] = useState('');

  const fetchMeal = async () => {
    try {
      const response = await api.get(`/api/meals/${mealId}`);
      setMeal(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeal();
  }, [mealId]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-elevated">
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  const subtotal = meal.price * quantity;
  const deliveryFee = 150.0; // standard flat delivery fee
  const total = subtotal + deliveryFee;

  const handleCheckout = async () => {
    if (!address) {
      Alert.alert('Validation Error', 'Please specify a delivery address.');
      return;
    }

    setSubmitting(true);
    try {
      const orderPayload = {
        cookId: meal.cookId,
        items: [
          {
            mealId: meal.id,
            quantity: quantity,
          },
        ],
        deliveryMethod: 'COOK_DELIVERY',
        address: {
          label: address,
          coordinates: [79.8612, 6.9271], // default coordinates
        },
        specialInstructions: instructions,
        scheduledFor: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
      };

      const response = await api.post('/api/orders', orderPayload);
      Alert.alert('Order Placed!', 'Your order has been successfully placed with the cook.', [
        {
          text: 'TRACK ORDER',
          onPress: () => navigation.navigate('OrderTracking', { orderId: response.data.id }),
        },
      ]);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to place order. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-surface-elevated p-6">
      <Text className="text-textPrimary font-bold text-xl mb-6">Confirm Your Order</Text>

      {/* Summary Card */}
      <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6">
        <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-2">ORDERED ITEMS</Text>
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-textPrimary font-bold text-sm">
            {meal.name} <Text className="text-textSecondary font-medium">x{quantity}</Text>
          </Text>
          <Text className="text-textPrimary font-bold text-sm">LKR {subtotal}</Text>
        </View>
        <Text className="text-textMuted text-xs mb-4">By Cook: {meal.cookName}</Text>

        <View className="border-t border-gray-100 pt-4 mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-textSecondary text-xs">Subtotal</Text>
            <Text className="text-textSecondary text-xs">LKR {subtotal}</Text>
          </View>
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-textSecondary text-xs">Delivery Fee</Text>
            <Text className="text-textSecondary text-xs">LKR {deliveryFee}</Text>
          </View>
          <View className="flex-row justify-between items-center border-t border-gray-50 pt-3">
            <Text className="text-textPrimary font-black text-base">Total Amount</Text>
            <Text className="text-primary font-black text-base">LKR {total}</Text>
          </View>
        </View>
      </View>

      {/* Delivery config */}
      <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-8">
        <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-4">DELIVERY DETAILS</Text>
        <TextInput
          label="DELIVERY ADDRESS"
          placeholder="Enter complete delivery address"
          value={address}
          onChangeText={setAddress}
          multiline
        />
        <TextInput
          label="SPECIAL INSTRUCTIONS (Optional)"
          placeholder="e.g. Leave at gate, less spicy, allergy notes..."
          value={instructions}
          onChangeText={setInstructions}
          multiline
        />
      </View>

      <Button
        title="PLACE ORDER"
        onPress={handleCheckout}
        loading={submitting}
        variant="primary"
        className="w-full mb-12"
      />
    </ScrollView>
  );
};
