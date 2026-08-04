import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { useCartStore } from '../../store/cartStore';
import { Feather, Ionicons } from '@expo/vector-icons';

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

  const freeDeliveryThreshold = 1000;
  const remainingForFreeDelivery = freeDeliveryThreshold - subtotal;
  const isFreeDeliveryQualified = subtotal >= freeDeliveryThreshold;

  return (
    <View className="flex-1 bg-surface-elevated relative">
      {/* Liquid Background Blobs */}
      <View className="absolute w-72 h-72 rounded-full bg-secondary/5 -top-20 -right-20 blur-3xl opacity-40" />
      <View className="absolute w-64 h-64 rounded-full bg-primary/5 bottom-40 -left-16 blur-3xl opacity-30" />

      {/* Sticky Header */}
      <View className="bg-white px-6 pt-12 pb-4 border-b border-gray-100 shadow-sm z-10 flex-row justify-between items-center">
        <View className="flex-1 mr-4">
          <Text className="font-black text-xl text-textPrimary">Your Basket</Text>
          <Text className="text-textSecondary text-[10px] mt-0.5 font-bold uppercase tracking-wider">
            {cartItems.length === 0
              ? 'No items added yet'
              : `${cartItems.length} unique item${cartItems.length > 1 ? 's' : ''} ready to order`}
          </Text>
        </View>
        {cartItems.length > 0 && (
          <TouchableOpacity 
            onPress={() => useCartStore.getState().clearCart()}
            className="px-3 py-1.5 rounded-full bg-red-50 border border-red-100 flex-row items-center gap-1 shadow-xs"
          >
            <Feather name="trash-2" size={10} color="#EF4444" />
            <Text className="text-red-500 font-extrabold text-[9px] uppercase tracking-wider">Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingTop: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >

        {cartItems.length === 0 ? (
          /* ── Empty State ─────────────────────────── */
          <View className="border rounded-3xl p-8 items-center bg-white border-gray-100 shadow-sm mt-12">
            <View className="w-20 h-20 bg-orange-50 rounded-full items-center justify-center mb-5 border border-orange-100 shadow-inner">
              <Text className="text-4xl">🛒</Text>
            </View>
            <Text className="font-extrabold text-lg text-textPrimary mb-1.5 text-center">
              Your basket is empty
            </Text>
            <Text className="text-textSecondary text-xs text-center px-4 leading-relaxed mb-6 font-medium">
              Explore delicious home-cooked meals from local chefs in your neighborhood!
            </Text>
            <TouchableOpacity
              onPress={() => {
                navigation.navigate('HomeTabs');
              }}
              className="bg-primary rounded-xl px-8 py-3 items-center shadow-md flex-row gap-1"
              activeOpacity={0.8}
            >
              <Text className="text-white font-extrabold text-xs tracking-wide">BROWSE LISTINGS 🍛</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Cart Items ─────────────────── */
          <>
            {/* Chef info header banner */}
            <View className="bg-white p-4 rounded-3xl border border-gray-150 shadow-xs mb-5 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Text className="text-base mr-2">🍳</Text>
                <View>
                  <Text className="text-textSecondary text-[9px] font-black uppercase tracking-wider">COOKING NOW</Text>
                  <Text className="text-textPrimary font-extrabold text-sm mt-0.5">{cartItems[0].cookName}'s Kitchen</Text>
                </View>
              </View>
              <View className="bg-green-50 px-2 py-0.5 rounded-lg border border-green-150">
                <Text className="text-green-700 text-[8px] font-black uppercase">ACTIVE</Text>
              </View>
            </View>

            {/* Delivery threshold slider prompt */}
            <View className="bg-white p-4 rounded-3xl border border-gray-150 shadow-xs mb-5">
              <View className="flex-row items-center gap-1.5 mb-2">
                <Ionicons name="gift" size={12} color={isFreeDeliveryQualified ? "#10B981" : "#FF6B35"} />
                <Text className="text-textPrimary font-bold text-xs">
                  {isFreeDeliveryQualified 
                    ? "Congratulations! You get Free Delivery!" 
                    : `Add LKR ${remainingForFreeDelivery} more for Free Delivery`
                  }
                </Text>
              </View>
              <View className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <View 
                  className={`h-full ${isFreeDeliveryQualified ? 'bg-green-500' : 'bg-primary'}`} 
                  style={{ width: `${Math.min(100, (subtotal / freeDeliveryThreshold) * 100)}%` }} 
                />
              </View>
            </View>

            {cartItems.map((item) => (
              <View
                key={item.mealId}
                className="bg-white border border-gray-100 rounded-3xl p-4 mb-3 shadow-xs flex-row items-center justify-between relative"
              >
                {/* Image */}
                <View className="w-16 h-16 rounded-2xl bg-primary/10 items-center justify-center mr-3 overflow-hidden border border-gray-150 shadow-inner">
                  {item.photos && item.photos.length > 0 ? (
                    <Image source={{ uri: item.photos[0] }} className="w-full h-full object-cover" />
                  ) : (
                    <Text className="text-primary text-xl">🍛</Text>
                  )}
                </View>

                {/* Info details */}
                <View className="flex-1 mr-2">
                  <Text className="text-textPrimary font-extrabold text-sm leading-4" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-primary font-black text-xs mt-1">LKR {item.price}</Text>

                  {/* Quantity adjustment buttons */}
                  <View className="flex-row items-center mt-2 bg-gray-50 border border-gray-200 rounded-xl self-start py-0.5 px-2">
                    <TouchableOpacity 
                      onPress={() => {
                        if (item.quantity > 1) {
                          updateQuantity(item.mealId, item.quantity - 1);
                        } else {
                          removeItem(item.mealId);
                        }
                      }}
                      className="px-1.5 py-0.5"
                    >
                      <Feather name="minus" size={10} color="#1A1A2E" />
                    </TouchableOpacity>
                    <Text className="font-extrabold text-textPrimary text-xs px-2">{item.quantity}</Text>
                    <TouchableOpacity 
                      onPress={() => updateQuantity(item.mealId, item.quantity + 1)}
                      className="px-1.5 py-0.5"
                    >
                      <Feather name="plus" size={10} color="#1A1A2E" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Subtotal & Delete actions */}
                <View className="items-end justify-between h-16 py-1">
                  <TouchableOpacity 
                    onPress={() => removeItem(item.mealId)}
                    className="p-1 rounded-lg bg-red-50 border border-red-100"
                  >
                    <Feather name="trash-2" size={12} color="#EF4444" />
                  </TouchableOpacity>
                  <Text className="text-textPrimary font-black text-xs">
                    LKR {item.price * item.quantity}
                  </Text>
                </View>
              </View>
            ))}

            {/* Price Details Card */}
            <View className="mt-4">
              <View className="bg-white border border-gray-150 rounded-3xl p-5 mb-5 shadow-xs">
                <View className="flex-row justify-between items-center mb-2.5">
                  <Text className="text-textSecondary text-xs font-semibold">Subtotal</Text>
                  <Text className="text-textPrimary font-extrabold text-xs">LKR {subtotal}</Text>
                </View>
                <View className="flex-row justify-between items-center mb-2.5">
                  <Text className="text-textSecondary text-xs font-semibold">Delivery Fee</Text>
                  <Text className="text-textPrimary font-extrabold text-xs">
                    {isFreeDeliveryQualified ? "FREE" : `LKR ${deliveryFee}`}
                  </Text>
                </View>
                <View className="h-[1px] bg-gray-200/50 w-full my-3" />
                <View className="flex-row justify-between items-center">
                  <Text className="text-textPrimary font-black text-sm">Total Amount</Text>
                  <Text className="text-primary font-black text-base">
                    LKR {isFreeDeliveryQualified ? subtotal : total}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  navigation.navigate('Checkout');
                }}
                className="bg-primary rounded-xl py-4 items-center shadow-md flex-row justify-center gap-1.5"
                activeOpacity={0.8}
              >
                <Text className="text-white font-extrabold text-xs tracking-wider uppercase">PROCEED TO CHECKOUT</Text>
                <Feather name="arrow-right" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};
