import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';

type CartNavProp = NativeStackNavigationProp<CustomerStackParamList, 'HomeTabs'>;

export const CartScreen: React.FC = () => {
  const navigation = useNavigation<CartNavProp>();

  // Future: connect to a global cart store (Zustand)
  const cartItems: any[] = [];

  return (
    <View className="flex-1 relative bg-surface-elevated">
      {/* Liquid Background Blobs */}
      <View className="absolute w-72 h-72 rounded-full bg-secondary/10 -top-20 -right-20 blur-3xl opacity-40" />
      <View className="absolute w-64 h-64 rounded-full bg-primary/8 bottom-40 -left-16 blur-3xl opacity-30" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingTop: 40, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-6">
          <Text className="font-black text-3xl tracking-tight text-textPrimary">Your Cart</Text>
          <Text className="text-sm mt-1 text-textSecondary">
            {cartItems.length === 0
              ? 'No items added yet'
              : `${cartItems.length} item${cartItems.length > 1 ? 's' : ''} ready to order`}
          </Text>
        </View>

        {cartItems.length === 0 ? (
          /* ── Empty State ─────────────────────────── */
          <View className="border rounded-3xl p-10 items-center bg-white/60 border-white/80 shadow-xl mt-8">
            <Text className="text-6xl mb-5">🛒</Text>
            <Text className="font-black text-xl text-textPrimary mb-2 text-center">
              Your cart is empty
            </Text>
            <Text className="text-textSecondary text-sm text-center px-4 leading-relaxed mb-8">
              Discover delicious home-cooked meals from local cooks in your neighborhood
            </Text>
            <TouchableOpacity
              onPress={() => {
                // Navigate back to Home tab
                navigation.navigate('HomeTabs');
              }}
              className="bg-primary rounded-2xl px-10 py-4 items-center shadow-md"
              activeOpacity={0.8}
            >
              <Text className="text-white font-extrabold text-sm tracking-wide">Browse Meals 🍛</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Cart Items (future) ─────────────────── */
          <>
            {cartItems.map((item, i) => (
              <View
                key={i}
                className="bg-white/60 border border-white/80 rounded-2xl p-4 mb-3 shadow-md flex-row items-center"
              >
                <View className="flex-1">
                  <Text className="text-textPrimary font-bold text-sm">{item.name}</Text>
                  <Text className="text-textMuted text-xs mt-0.5">Qty: {item.quantity}</Text>
                </View>
                <Text className="text-primary font-black text-sm">LKR {item.price}</Text>
              </View>
            ))}

            {/* Checkout button */}
            <View className="mt-4">
              <View className="bg-white/60 border border-white/80 rounded-2xl p-5 mb-4 shadow-md">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-textSecondary text-sm">Subtotal</Text>
                  <Text className="text-textPrimary font-bold text-sm">LKR 0</Text>
                </View>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-textSecondary text-sm">Delivery Fee</Text>
                  <Text className="text-textPrimary font-bold text-sm">LKR 150</Text>
                </View>
                <View className="flex-row justify-between items-center border-t border-gray-100 pt-3 mt-2">
                  <Text className="text-textPrimary font-black text-base">Total</Text>
                  <Text className="text-primary font-black text-base">LKR 150</Text>
                </View>
              </View>
              <TouchableOpacity
                className="bg-primary rounded-2xl py-4 items-center shadow-md"
                activeOpacity={0.8}
              >
                <Text className="text-white font-extrabold text-sm tracking-wide">Proceed to Checkout →</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};
