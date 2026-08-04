import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { useCartStore } from '../../store/cartStore';
import { Button } from '../../components/common/Button';
import { TextInput } from '../../components/common/TextInput';
import { Feather, Ionicons } from '@expo/vector-icons';

type CheckoutScreenProps = NativeStackScreenProps<CustomerStackParamList, 'Checkout'>;

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ navigation }) => {
  const { items: cartItems, getCartTotal } = useCartStore();

  const [deliveryMethod, setDeliveryMethod] = useState<'COOK_DELIVERY' | 'PICKUP'>('COOK_DELIVERY');
  const [address, setAddress] = useState('Home – 45/B, Flower Road, Colombo 3');
  const [instructions, setInstructions] = useState('');
  const [timeSlot, setTimeSlot] = useState<'ASAP' | 'SCHEDULED'>('ASAP');
  
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
  // Free delivery for orders LKR 1000+
  const isFreeDelivery = subtotal >= 1000;
  const deliveryFee = deliveryMethod === 'COOK_DELIVERY' ? (isFreeDelivery ? 0.0 : 150.0) : 0.0;
  const total = subtotal + deliveryFee;

  const handleContinueToPayment = () => {
    if (deliveryMethod === 'COOK_DELIVERY' && !address.trim()) {
      Alert.alert('Validation Error', 'Please specify a delivery address.');
      return;
    }

    const scheduledDate = new Date(Date.now() + (timeSlot === 'ASAP' ? 1800 : 3600) * 1000).toISOString(); // ISO timestamp for backend

    navigation.navigate('Payment', {
      address: deliveryMethod === 'PICKUP' ? 'Self Pickup at Kitchen' : address,
      deliveryMethod,
      specialInstructions: instructions,
      scheduledFor: scheduledDate,
    });
  };

  return (
    <View className="flex-1 bg-surface-elevated">
      {/* Header with visual stepper progress */}
      <View className="bg-white px-6 pt-12 pb-4 border-b border-gray-100 shadow-sm z-10 flex-row justify-between items-center">
        <View className="flex-row items-center flex-1 mr-2">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-3 border border-gray-150">
            <Feather name="chevron-left" size={18} color="#1A1A2E" />
          </TouchableOpacity>
          <Text className="font-black text-xl text-textPrimary">Checkout Info</Text>
        </View>
        <View className="flex-row items-center gap-0.5 bg-gray-50 border border-gray-150 rounded-full px-3 py-1">
          <Text className="text-[10px] font-black text-primary">STEP 2</Text>
          <Text className="text-[10px] font-black text-textMuted">/ 3</Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
        {/* Delivery Method Selection */}
        <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-5">
          <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-4">DELIVERY PREFERENCE</Text>
          <View className="flex-row gap-4">
            <TouchableOpacity
              onPress={() => setDeliveryMethod('COOK_DELIVERY')}
              className={`flex-1 py-3.5 rounded-2xl border flex-row items-center justify-center gap-2 ${
                deliveryMethod === 'COOK_DELIVERY'
                  ? 'bg-primary/10 border-primary'
                  : 'bg-white border-gray-200'
              }`}
              activeOpacity={0.8}
            >
              <Feather name="truck" size={14} color={deliveryMethod === 'COOK_DELIVERY' ? '#FF6B35' : '#6B7280'} />
              <Text className={`font-extrabold text-xs ${deliveryMethod === 'COOK_DELIVERY' ? 'text-primary' : 'text-textSecondary'}`}>
                Delivery
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setDeliveryMethod('PICKUP')}
              className={`flex-1 py-3.5 rounded-2xl border flex-row items-center justify-center gap-2 ${
                deliveryMethod === 'PICKUP'
                  ? 'bg-primary/10 border-primary'
                  : 'bg-white border-gray-200'
              }`}
              activeOpacity={0.8}
            >
              <Feather name="shopping-bag" size={14} color={deliveryMethod === 'PICKUP' ? '#FF6B35' : '#6B7280'} />
              <Text className={`font-extrabold text-xs ${deliveryMethod === 'PICKUP' ? 'text-primary' : 'text-textSecondary'}`}>
                Self Pickup
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Address Mock Map Interface */}
        {deliveryMethod === 'COOK_DELIVERY' && (
          <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-5">
            <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-3.5">DELIVERY LOCATION</Text>
            
            {/* Mock map graphical container */}
            <View className="bg-gray-100 rounded-2xl h-28 mb-4 border border-gray-250 items-center justify-center overflow-hidden relative">
              <View className="absolute inset-0 bg-sky-50 items-center justify-center opacity-70">
                <Text className="text-xs text-slate-400 font-semibold tracking-wider">🗺️ Colombo 03 Map Grid</Text>
              </View>
              {/* Central Map Pin */}
              <View className="w-8 h-8 rounded-full bg-primary/20 items-center justify-center border border-primary z-10 shadow-md">
                <Ionicons name="location-sharp" size={16} color="#FF6B35" />
              </View>
              <View className="absolute bottom-2 left-2 bg-white/90 border border-gray-200 rounded-md px-1.5 py-0.5 z-10">
                <Text className="text-[8px] text-textSecondary font-black">79.8612°E, 6.9271°N</Text>
              </View>
            </View>

            <TextInput
              label="STREET ADDRESS"
              placeholder="Enter complete delivery address"
              value={address}
              onChangeText={setAddress}
              multiline
            />
          </View>
        )}

        {deliveryMethod === 'PICKUP' && (
          <View className="bg-emerald-50 border border-emerald-100 p-4 rounded-3xl mb-5 flex-row items-start gap-2.5">
            <Ionicons name="information-circle" size={18} color="#10B981" />
            <Text className="text-emerald-800 text-xs font-semibold leading-relaxed flex-1">
              Pickup Mode Enabled: You will receive the cook's address details and instructions to pick up your order once the chef marks it ready.
            </Text>
          </View>
        )}

        {/* Scheduling Details */}
        <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-5">
          <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-4">TIME PREFERENCE</Text>
          <View className="flex-row gap-4 mb-4">
            <TouchableOpacity
              onPress={() => setTimeSlot('ASAP')}
              className={`flex-1 py-3.5 rounded-2xl border flex-row items-center justify-center gap-2 ${
                timeSlot === 'ASAP' ? 'bg-primary/10 border-primary' : 'bg-white border-gray-200'
              }`}
              activeOpacity={0.8}
            >
              <Feather name="clock" size={14} color={timeSlot === 'ASAP' ? '#FF6B35' : '#6B7280'} />
              <Text className={`font-extrabold text-xs ${timeSlot === 'ASAP' ? 'text-primary' : 'text-textSecondary'}`}>
                ASAP (25 mins)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTimeSlot('SCHEDULED')}
              className={`flex-1 py-3.5 rounded-2xl border flex-row items-center justify-center gap-2 ${
                timeSlot === 'SCHEDULED' ? 'bg-primary/10 border-primary' : 'bg-white border-gray-200'
              }`}
              activeOpacity={0.8}
            >
              <Feather name="calendar" size={14} color={timeSlot === 'SCHEDULED' ? '#FF6B35' : '#6B7280'} />
              <Text className={`font-extrabold text-xs ${timeSlot === 'SCHEDULED' ? 'text-primary' : 'text-textSecondary'}`}>
                Schedule Later
              </Text>
            </TouchableOpacity>
          </View>

          {timeSlot === 'SCHEDULED' && (
            <TextInput
              label="TARGET DELIVERY TIME"
              placeholder="e.g. 12:30 PM, 7:00 PM"
              value={scheduledFor}
              onChangeText={setScheduledFor}
            />
          )}

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
            <View key={item.mealId} className="flex-row justify-between items-center mb-2">
              <Text className="text-textPrimary font-bold text-xs flex-1 mr-2" numberOfLines={1}>
                {item.name} <Text className="text-textSecondary font-semibold">x{item.quantity}</Text>
              </Text>
              <Text className="text-textPrimary font-black text-xs">LKR {item.price * item.quantity}</Text>
            </View>
          ))}
          
          <View className="border-t border-gray-100 pt-4 mt-3">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-textSecondary text-xs font-semibold">Subtotal</Text>
              <Text className="text-textSecondary text-xs font-extrabold">LKR {subtotal}</Text>
            </View>
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-textSecondary text-xs font-semibold">Delivery Fee</Text>
              <Text className="text-textSecondary text-xs font-extrabold">LKR {deliveryFee}</Text>
            </View>
            <View className="h-[1px] bg-gray-150/50 w-full my-2.5" />
            <View className="flex-row justify-between items-center">
              <Text className="text-textPrimary font-black text-sm">Total Amount</Text>
              <Text className="text-primary font-black text-base">LKR {total}</Text>
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
    </View>
  );
};
