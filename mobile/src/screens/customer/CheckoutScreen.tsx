import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { useCartStore } from '../../store/cartStore';
import { Button } from '../../components/common/Button';
import { TextInput } from '../../components/common/TextInput';

type CheckoutScreenProps = NativeStackScreenProps<CustomerStackParamList, 'Checkout'>;

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ navigation }) => {
  const { items: cartItems, getCartTotal } = useCartStore();

  const [deliveryMethod, setDeliveryMethod] = useState<'COOK_DELIVERY' | 'PICKUP'>('COOK_DELIVERY');
  const [address, setAddress] = useState('Home – 45/B, Flower Road, Colombo 3');
  const [instructions, setInstructions] = useState('');
  
  // Default to 1 hour from now
  const [scheduledFor, setScheduledFor] = useState(() => {
    const d = new Date(Date.now() + 3600 * 1000);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  });

  useEffect(() => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty. Please add items to proceed.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
  }, [cartItems, navigation]);

  if (cartItems.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-elevated p-6">
        <Text className="text-textMuted text-base font-bold text-center">Cart is empty</Text>
      </View>
    );
  }

  const subtotal = getCartTotal();
  const deliveryFee = deliveryMethod === 'COOK_DELIVERY' ? 150.0 : 0.0;
  const total = subtotal + deliveryFee;

  const handleContinueToPayment = () => {
    if (deliveryMethod === 'COOK_DELIVERY' && !address.trim()) {
      Alert.alert('Validation Error', 'Please specify a delivery address.');
      return;
    }

    const scheduledDate = new Date(Date.now() + 3600 * 1000).toISOString(); // ISO timestamp for backend

    navigation.navigate('Payment', {
      address: deliveryMethod === 'PICKUP' ? 'Self Pickup at Kitchen' : address,
      deliveryMethod,
      specialInstructions: instructions,
      scheduledFor: scheduledDate,
    });
  };

  return (
    <ScrollView className="flex-1 bg-surface-elevated p-6" showsVerticalScrollIndicator={false}>
      <Text className="text-textPrimary font-bold text-xl mb-5">Order details</Text>

      {/* Delivery Method Selection */}
      <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-5">
        <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-3">DELIVERY METHOD</Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => setDeliveryMethod('COOK_DELIVERY')}
            className={`flex-1 py-3 rounded-xl border items-center justify-center ${
              deliveryMethod === 'COOK_DELIVERY'
                ? 'bg-primary/10 border-primary'
                : 'bg-white border-gray-200'
            }`}
          >
            <Text className={`font-extrabold text-xs ${deliveryMethod === 'COOK_DELIVERY' ? 'text-primary' : 'text-textSecondary'}`}>
              🚗 Cook Delivery
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setDeliveryMethod('PICKUP')}
            className={`flex-1 py-3 rounded-xl border items-center justify-center ${
              deliveryMethod === 'PICKUP'
                ? 'bg-primary/10 border-primary'
                : 'bg-white border-gray-200'
            }`}
          >
            <Text className={`font-extrabold text-xs ${deliveryMethod === 'PICKUP' ? 'text-primary' : 'text-textSecondary'}`}>
              🏃 Self Pickup
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Delivery details */}
      <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-5">
        <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-4">DELIVERY DETAILS</Text>
        
        {deliveryMethod === 'COOK_DELIVERY' ? (
          <TextInput
            label="DELIVERY ADDRESS"
            placeholder="Enter complete delivery address"
            value={address}
            onChangeText={setAddress}
            multiline
          />
        ) : (
          <View className="mb-4 p-3 bg-gray-50 border border-gray-100 rounded-xl">
            <Text className="text-textSecondary text-xs">
              📍 You will pick up the meal directly from the cook's home kitchen once it is marked as ready.
            </Text>
          </View>
        )}

        <TextInput
          label="ESTIMATED ARRIVAL / TARGET TIME"
          placeholder="e.g. 12:30 PM, 7:00 PM"
          value={scheduledFor}
          onChangeText={setScheduledFor}
        />

        <TextInput
          label="SPECIAL INSTRUCTIONS (Optional)"
          placeholder="e.g. Leave at gate, less spicy, allergy notes..."
          value={instructions}
          onChangeText={setInstructions}
          multiline
        />
      </View>

      {/* Summary Card */}
      <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6">
        <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-3">ITEMS SUMMARY</Text>
        {cartItems.map((item) => (
          <View key={item.mealId} className="flex-row justify-between items-center mb-1.5">
            <Text className="text-textPrimary font-bold text-xs flex-1 mr-2" numberOfLines={1}>
              {item.name} <Text className="text-textSecondary font-semibold">x{item.quantity}</Text>
            </Text>
            <Text className="text-textPrimary font-bold text-xs">LKR {item.price * item.quantity}</Text>
          </View>
        ))}
        
        <View className="border-t border-gray-100 pt-4 mt-3">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-textSecondary text-xs">Subtotal</Text>
            <Text className="text-textSecondary text-xs">LKR {subtotal}</Text>
          </View>
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-textSecondary text-xs">Delivery Fee</Text>
            <Text className="text-textSecondary text-xs">LKR {deliveryFee}</Text>
          </View>
          <View className="flex-row justify-between items-center border-t border-gray-50 pt-3">
            <Text className="text-textPrimary font-black text-sm">Total Amount</Text>
            <Text className="text-primary font-black text-sm">LKR {total}</Text>
          </View>
        </View>
      </View>

      <Button
        title="CONTINUE TO PAYMENT"
        onPress={handleContinueToPayment}
        variant="primary"
        className="w-full mb-12"
      />
    </ScrollView>
  );
};
