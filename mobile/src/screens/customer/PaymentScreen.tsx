import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Modal } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { useCartStore } from '../../store/cartStore';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { TextInput } from '../../components/common/TextInput';

type PaymentScreenProps = NativeStackScreenProps<CustomerStackParamList, 'Payment'>;

export const PaymentScreen: React.FC<PaymentScreenProps> = ({ route, navigation }) => {
  const { address, deliveryMethod, specialInstructions, scheduledFor } = route.params;
  const { items: cartItems, getCartTotal, clearCart } = useCartStore();

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [processing, setProcessing] = useState(false);

  // Modal display states for custom web-friendly success dialog
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newOrderId, setNewOrderId] = useState('');
  const [newTransactionId, setNewTransactionId] = useState('');

  const subtotal = getCartTotal();
  const deliveryFee = deliveryMethod === 'COOK_DELIVERY' ? 150.0 : 0.0;
  const total = subtotal + deliveryFee;

  // Detect card brand/emoji based on first digit
  const getCardBrandDetails = (num: string) => {
    const cleanNum = num.replace(/\s+/g, '');
    if (cleanNum.startsWith('4')) {
      return { name: 'Visa', emoji: '💳', color: 'text-blue-600' };
    }
    if (cleanNum.startsWith('5')) {
      return { name: 'Mastercard', emoji: '💳', color: 'text-red-500' };
    }
    if (cleanNum.startsWith('3')) {
      return { name: 'American Express', emoji: '💳', color: 'text-cyan-600' };
    }
    return { name: 'Card', emoji: '💳', color: 'text-gray-400' };
  };

  const cardDetails = getCardBrandDetails(cardNumber);

  // Format card number with spaces every 4 digits
  const handleCardNumberChange = (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    let formatted = '';
    for (let i = 0; i < cleanText.length && i < 16; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += ' ';
      }
      formatted += cleanText[i];
    }
    setCardNumber(formatted);
  };

  // Format expiry as MM/YY
  const handleExpiryChange = (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    let formatted = '';
    if (cleanText.length > 0) {
      formatted += cleanText.slice(0, 2);
    }
    if (cleanText.length > 2) {
      formatted += '/' + cleanText.slice(2, 4);
    }
    setExpiry(formatted);
  };

  const handleCvvChange = (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, '').slice(0, 4);
    setCvv(cleanText);
  };

  const handlePayment = async () => {
    console.log("[PaymentFlow] Pay button clicked");
    const cleanCard = cardNumber.replace(/\s+/g, '');
    
    if (cleanCard.length < 13 || cleanCard.length > 16) {
      console.log("[PaymentFlow] Validation Failed: Card length " + cleanCard.length);
      Alert.alert('Validation Error', 'Please enter a valid 16-digit card number.');
      return;
    }
    if (!expiry.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) {
      console.log("[PaymentFlow] Validation Failed: Expiry format: " + expiry);
      Alert.alert('Validation Error', 'Please enter a valid expiration date (MM/YY).');
      return;
    }
    if (cvv.length < 3 || cvv.length > 4) {
      console.log("[PaymentFlow] Validation Failed: CVV length: " + cvv.length);
      Alert.alert('Validation Error', 'Please enter a valid 3 or 4 digit CVV.');
      return;
    }
    if (!cardholderName.trim()) {
      console.log("[PaymentFlow] Validation Failed: Empty cardholder name");
      Alert.alert('Validation Error', 'Please enter the cardholder name.');
      return;
    }

    console.log("[PaymentFlow] Validation passed. Starting processing state...");
    setProcessing(true);

    try {
      const paymentPayload = {
        amount: total,
        cardNumber: cleanCard,
        expiry,
        cvv,
        cardholderName: cardholderName.trim(),
      };

      const targetUrl = (api.defaults.baseURL || "") + '/api/payments/charge';
      console.log("[PaymentFlow] Sending charge request to: " + targetUrl);
      console.log("[PaymentFlow] Payload details:", { ...paymentPayload, cardNumber: "xxxx-xxxx-xxxx-" + cleanCard.slice(-4) });

      const paymentRes = await api.post('/api/payments/charge', paymentPayload);
      console.log("[PaymentFlow] Charge response received. Success status:", paymentRes.data?.success);

      if (paymentRes.data.success) {
        const transactionId = paymentRes.data.transactionId;
        console.log("[PaymentFlow] Charge succeeded. Transaction ID:", transactionId);

        const orderItems = cartItems.map(item => ({
          mealId: item.mealId,
          quantity: item.quantity,
        }));

        const orderPayload = {
          cookId: cartItems[0].cookId,
          items: orderItems,
          deliveryMethod,
          address: {
            label: address,
            coordinates: [79.8612, 6.9271], // default coordinates
          },
          specialInstructions,
          scheduledFor,
          paymentTransactionId: transactionId,
        };

        console.log("[PaymentFlow] Submitting order payload to: " + (api.defaults.baseURL || "") + "/api/orders");
        const orderRes = await api.post('/api/orders', orderPayload);
        console.log("[PaymentFlow] Order placed successfully. Order ID:", orderRes.data?.id);

        clearCart();
        console.log("[PaymentFlow] Cart cleared. Displaying success dialog modal...");
        
        // Save states for modal visibility
        setNewOrderId(orderRes.data.id);
        setNewTransactionId(transactionId);
        setShowSuccessModal(true);

      } else {
        console.log("[PaymentFlow] Charge failed or declined:", paymentRes.data.message);
        Alert.alert('Payment Declined', paymentRes.data.message || 'Verification failed. Try again.');
      }
    } catch (error: any) {
      console.error("[PaymentFlow] Error encountered:", error);
      console.error("[PaymentFlow] Error response data:", error.response?.data);
      Alert.alert(
        'Transaction Error',
        error.response?.data?.message || 'Unable to process payment. Please verify your inputs.'
      );
    } finally {
      console.log("[PaymentFlow] Completed transaction processing state.");
      setProcessing(false);
    }
  };

  return (
    <View className="flex-1 bg-surface-elevated">
      <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
        {/* Stripe Branding & Summary */}
        <View className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm mb-6 items-center">
          <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-1">STRIPE SECURE CHECKOUT</Text>
          <Text className="text-primary font-black text-2xl mb-4">LKR {total}</Text>
          <View className="flex-row items-center justify-center bg-gray-100 rounded-full px-3 py-1">
            <Text className="text-gray-600 text-xs font-bold mr-1">🔐</Text>
            <Text className="text-gray-500 text-[10px] font-extrabold uppercase tracking-wide">256-Bit SSL Encrypted</Text>
          </View>
        </View>

        {/* Mock card preview */}
        <View className="bg-gradient-to-tr from-gray-900 to-slate-800 rounded-3xl p-6 mb-6 shadow-lg border border-gray-800 relative overflow-hidden">
          <View className="absolute w-64 h-64 rounded-full bg-white/5 -bottom-20 -right-20" />
          <View className="flex-row justify-between items-start mb-6">
            <Text className="text-white/60 font-black text-[10px] uppercase tracking-widest">NeighborPlates Card</Text>
            <Text className="text-2xl">{cardDetails.emoji}</Text>
          </View>
          <Text className="text-white font-extrabold text-lg tracking-widest mb-6 h-6">
            {cardNumber || '•••• •••• •••• ••••'}
          </Text>
          <View className="flex-row justify-between items-end">
            <View>
              <Text className="text-white/40 text-[9px] font-bold uppercase mb-0.5">CARDHOLDER</Text>
              <Text className="text-white/80 font-bold text-xs uppercase h-4" numberOfLines={1}>
                {cardholderName || 'Cardholder Name'}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-white/40 text-[9px] font-bold uppercase mb-0.5">EXPIRS</Text>
              <Text className="text-white/80 font-bold text-xs h-4">
                {expiry || 'MM/YY'}
              </Text>
            </View>
          </View>
        </View>

        {/* Credit Card Input Form */}
        <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6">
          <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-4">CARD DETAILS</Text>

          <TextInput
            label="CARDHOLDER NAME"
            placeholder="As shown on card"
            value={cardholderName}
            onChangeText={setCardholderName}
          />

          <View className="relative">
            <TextInput
              label="CARD NUMBER"
              placeholder="4242 4242 4242 4242"
              value={cardNumber}
              onChangeText={handleCardNumberChange}
              keyboardType="number-pad"
            />
            {cardNumber.length > 0 && (
              <View className="absolute right-4 top-9">
                <Text className={`font-black text-xs ${cardDetails.color}`}>{cardDetails.name}</Text>
              </View>
            )}
          </View>

          <View className="flex-row gap-4">
            <View className="flex-1">
              <TextInput
                label="EXPIRATION"
                placeholder="MM/YY"
                value={expiry}
                onChangeText={handleExpiryChange}
                keyboardType="number-pad"
              />
            </View>
            <View className="flex-1">
              <TextInput
                label="CVV"
                placeholder="123"
                value={cvv}
                onChangeText={handleCvvChange}
                keyboardType="number-pad"
                secureTextEntry
              />
            </View>
          </View>
        </View>

        <Text className="text-textMuted text-[10px] text-center px-4 leading-relaxed mb-6">
          NeighborPlates processes payments securely via Stripe test mode. Use standard Stripe test cards (e.g. card number <Text className="font-extrabold">4242 4242 4242 4242</Text>) to complete the transaction.
        </Text>

        <Button
          title={processing ? "PROCESSING PAYMENT..." : `PAY LKR ${total}`}
          onPress={handlePayment}
          loading={processing}
          variant="primary"
          className="w-full mb-12"
        />
      </ScrollView>

      {/* Success Modal popup (compatible on both Web and Mobile devices) */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center p-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center shadow-2xl border border-gray-100">
            <View className="w-16 h-16 rounded-full bg-green-50 items-center justify-center mb-4 border border-green-150 shadow-inner animate-bounce">
              <Text className="text-3xl">🎉</Text>
            </View>
            <Text className="font-extrabold text-xl text-textPrimary text-center mb-2">
              Payment Successful!
            </Text>
            <Text className="text-textSecondary text-xs text-center leading-relaxed mb-6 px-2">
              Your order has been placed successfully.{"\n"}Transaction Reference:{"\n"}
              <Text className="font-bold text-textPrimary">{newTransactionId}</Text>
            </Text>
            
            <TouchableOpacity
              onPress={() => {
                setShowSuccessModal(false);
                navigation.navigate('OrderTracking', { orderId: newOrderId });
              }}
              className="bg-primary rounded-xl py-3 w-full items-center shadow-md mb-2.5"
              activeOpacity={0.8}
            >
              <Text className="text-white font-extrabold text-sm tracking-wide">TRACK ORDER 📦</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowSuccessModal(false);
                navigation.navigate('HomeTabs');
              }}
              className="bg-gray-100 rounded-xl py-3 w-full items-center border border-gray-200"
              activeOpacity={0.8}
            >
              <Text className="text-textPrimary font-extrabold text-sm tracking-wide">PLACE ANOTHER ORDER 🍛</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};
