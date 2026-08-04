import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { useCartStore } from '../../store/cartStore';

type CartNavProp = NativeStackNavigationProp<CustomerStackParamList, 'HomeTabs'>;

export const CartScreen: React.FC = () => {
  const navigation = useNavigation<CartNavProp>();
  
  const { 
    items: cartItems, 
    updateQuantity, 
    removeItem, 
    getCartTotal 
  } = useCartStore();

  const subtotal = getCartTotal();
  const deliveryFee = cartItems.length > 0 ? 150 : 0;
  const total = subtotal + deliveryFee;

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
              : `${cartItems.length} unique item${cartItems.length > 1 ? 's' : ''} ready to order`}
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
                navigation.navigate('HomeTabs');
              }}
              className="bg-primary rounded-2xl px-10 py-4 items-center shadow-md"
              activeOpacity={0.8}
            >
              <Text className="text-white font-extrabold text-sm tracking-wide">Browse Meals 🍛</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Cart Items ─────────────────── */
          <>
            <View className="mb-4">
              <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-2">
                Ordering from Chef: {cartItems[0].cookName}
              </Text>
            </View>

            {cartItems.map((item, i) => (
              <View
                key={item.mealId}
                className="bg-white/60 border border-white/80 rounded-2xl p-4 mb-3 shadow-md flex-row items-center"
              >
                {/* Meal image indicator */}
                <View className="w-16 h-16 rounded-xl bg-primary/10 items-center justify-center mr-3 overflow-hidden border border-gray-150 shadow-inner">
                  {item.photos && item.photos.length > 0 ? (
                    <Image source={{ uri: item.photos[0] }} className="w-full h-full" />
                  ) : (
                    <Text className="text-primary text-xl">🍛</Text>
                  )}
                </View>

                {/* Details */}
                <View className="flex-1 mr-2">
                  <Text className="text-textPrimary font-extrabold text-sm leading-4" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-primary font-black text-xs mt-1">LKR {item.price}</Text>

                  {/* Quantity Adjuster */}
                  <View className="flex-row items-center mt-2.5 bg-white border border-gray-100 rounded-lg self-start py-0.5 px-2">
                    <TouchableOpacity 
                      onPress={() => {
                        if (item.quantity > 1) {
                          updateQuantity(item.mealId, item.quantity - 1);
                        } else {
                          removeItem(item.mealId);
                        }
                      }}
                      className="px-2 py-0.5"
                    >
                      <Text className="font-extrabold text-textPrimary text-xs">-</Text>
                    </TouchableOpacity>
                    <Text className="font-bold text-textPrimary text-xs px-2.5">{item.quantity}</Text>
                    <TouchableOpacity 
                      onPress={() => updateQuantity(item.mealId, item.quantity + 1)}
                      className="px-2 py-0.5"
                    >
                      <Text className="font-extrabold text-textPrimary text-xs">+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Action Right */}
                <View className="items-end justify-between h-16 py-1">
                  <TouchableOpacity 
                    onPress={() => removeItem(item.mealId)}
                    className="p-1 rounded-full bg-red-50 border border-red-100"
                  >
                    <Text className="text-red-500 font-extrabold text-[10px]">✕</Text>
                  </TouchableOpacity>
                  <Text className="text-textPrimary font-black text-sm">
                    LKR {item.price * item.quantity}
                  </Text>
                </View>
              </View>
            ))}

            {/* Price Details Card */}
            <View className="mt-4">
              <View className="bg-white/60 border border-white/80 rounded-2xl p-5 mb-4 shadow-md">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-textSecondary text-sm">Subtotal</Text>
                  <Text className="text-textPrimary font-bold text-sm">LKR {subtotal}</Text>
                </View>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-textSecondary text-sm">Delivery Fee</Text>
                  <Text className="text-textPrimary font-bold text-sm">LKR {deliveryFee}</Text>
                </View>
                <View className="flex-row justify-between items-center border-t border-gray-150 pt-3 mt-2">
                  <Text className="text-textPrimary font-black text-base">Total</Text>
                  <Text className="text-primary font-black text-base">LKR {total}</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  navigation.navigate('Checkout');
                }}
                className="bg-primary rounded-2xl py-4 items-center shadow-md flex-row justify-center"
                activeOpacity={0.8}
              >
                <Text className="text-white font-extrabold text-sm tracking-wide mr-2">Proceed to Checkout</Text>
                <Text className="text-white font-bold text-sm">→</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};
