import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image, Alert, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useCartStore } from '../../store/cartStore';
import { Ionicons, Feather } from '@expo/vector-icons';

type MealDetailScreenProps = NativeStackScreenProps<CustomerStackParamList, 'MealDetail'>;

export const MealDetailScreen: React.FC<MealDetailScreenProps> = ({ route, navigation }) => {
  const { mealId } = route.params;
  const [meal, setMeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);

  const fetchMealDetails = async () => {
    try {
      const response = await api.get(`/api/meals/${mealId}`);
      setMeal(response.data);
    } catch (error) {
      console.error('Error fetching meal detail:', error);
      Alert.alert('Error', 'Unable to retrieve meal details.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMealDetails();
    }, [mealId])
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-elevated">
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!meal) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-elevated p-6">
        <Feather name="info" size={44} color="#9CA3AF" className="mb-3" />
        <Text className="text-textPrimary text-lg font-extrabold text-center mb-1">Meal No Longer Available</Text>
        <Text className="text-textMuted text-xs text-center mb-6">This meal listing may have been removed by the home chef.</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="bg-primary px-6 py-3 rounded-2xl shadow-sm"
        >
          <Text className="text-white font-bold text-sm uppercase tracking-wider">Explore Other Meals</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleOrder = () => {
    if (meal.portionsRemaining <= 0) {
      Alert.alert('Sold Out', 'Sorry, no portions remaining for this meal today.');
      return;
    }

    const res = useCartStore.getState().addItem(meal, quantity);
    if (res.success) {
      Alert.alert(
        'Added to Cart',
        `Successfully added ${quantity} portion(s) of "${meal.name}" to your cart.`,
        [
          {
            text: 'Keep Browsing',
            style: 'cancel',
          },
          {
            text: 'Go to Cart',
            onPress: () => navigation.navigate('HomeTabs', { screen: 'Cart' }),
          },
        ]
      );
    } else if (res.reason === 'diff_cook') {
      const existingCookName = useCartStore.getState().getCookName();
      Alert.alert(
        'Start a new cart?',
        `You already have items in your cart from Cook "${existingCookName}". Adding items from Cook "${meal.cookName}" will clear your existing cart. Do you want to proceed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear & Add',
            style: 'destructive',
            onPress: () => {
              useCartStore.getState().clearCart();
              useCartStore.getState().addItem(meal, quantity);
              Alert.alert('Success', 'Cart cleared and item added!');
            },
          },
        ]
      );
    } else if (res.reason === 'no_portions') {
      Alert.alert('Limit Exceeded', `Cannot add more than ${meal.portionsRemaining} portions of this meal.`);
    }
  };

  const getInitials = (nameStr: string) => {
    return nameStr ? nameStr.charAt(0).toUpperCase() : 'C';
  };

  const totalPrice = meal.price * quantity;

  return (
    <View className="flex-1 bg-surface-elevated">
      <ScrollView className="flex-1 pb-24" showsVerticalScrollIndicator={false}>
        {/* Banner Cover Image */}
        <View className="w-full h-80 bg-primary/10 relative">
          {meal.photos && meal.photos.length > 0 ? (
            <Image source={{ uri: meal.photos[0] }} className="w-full h-full object-cover" />
          ) : (
            <View className="w-full h-full items-center justify-center bg-gray-100">
              <Feather name="coffee" size={48} color="#FF6B35" />
            </View>
          )}

          {/* Gradient Overlay for Readability */}
          <View className="absolute inset-0 bg-black/20" />

          {/* Top Floating Actions Overlay */}
          <View className="absolute top-12 left-6 right-6 flex-row justify-between items-center z-10">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 rounded-full bg-white/90 items-center justify-center shadow-md border border-white/50"
              activeOpacity={0.8}
            >
              <Feather name="arrow-left" size={20} color="#1A1A2E" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsFavorite(prev => !prev)}
              className="w-10 h-10 rounded-full bg-white/90 items-center justify-center shadow-md border border-white/50"
              activeOpacity={0.8}
            >
              <Ionicons 
                name={isFavorite ? "heart" : "heart-outline"} 
                size={20} 
                color={isFavorite ? "#E04E1A" : "#1A1A2E"} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Details Sheet */}
        <View className="p-6 -mt-8 bg-surface-elevated rounded-t-[36px] shadow-2xl border-t border-gray-100">
          {/* Category Badge & Rating */}
          <View className="flex-row items-center justify-between mb-3">
            <Badge label={meal.category || 'Meal'} variant="primary" />
            <View className="flex-row items-center bg-amber-50 border border-amber-150 px-3 py-1 rounded-full shadow-xs">
              <Ionicons name="star" size={12} color="#F59E0B" className="mr-1" />
              <Text className="text-amber-800 font-extrabold text-xs ml-1">
                {meal.avgRating > 0 ? meal.avgRating.toFixed(1) : 'New'}
              </Text>
            </View>
          </View>

          {/* Title & Price Line */}
          <View className="flex-row justify-between items-start mb-4">
            <Text className="text-textPrimary font-black text-2xl flex-1 mr-4 leading-8">
              {meal.name}
            </Text>
            <View className="items-end">
              <Text className="text-textSecondary text-[9px] font-black uppercase tracking-wider mb-0.5">PRICE PER PORTION</Text>
              <Text className="text-primary font-black text-2xl">LKR {meal.price}</Text>
            </View>
          </View>

          {/* Divider Line */}
          <View className="h-[1px] bg-gray-200/60 w-full mb-5" />

          {/* Cook/Chef details Card */}
          <View className="bg-white rounded-3xl p-4 border border-gray-150 shadow-sm flex-row items-center justify-between mb-6">
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 items-center justify-center shadow-inner mr-3 relative">
                <Text className="text-primary font-black text-lg">{getInitials(meal.cookName)}</Text>
                <View className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1">
                  <Text className="text-textMuted text-[9px] font-black uppercase tracking-wider">HOME CHEF</Text>
                  <Feather name="check-circle" size={10} color="#10B981" />
                </View>
                <Text className="text-textPrimary font-extrabold text-base mt-0.5">{meal.cookName}</Text>
              </View>
            </View>
            <View className="border border-gray-150 bg-gray-50 rounded-2xl px-3 py-2 items-center">
              <Text className="text-textMuted text-[8px] font-black uppercase tracking-wider">PORTIONS</Text>
              <Text className={`text-xs font-black mt-0.5 ${meal.portionsRemaining > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {meal.portionsRemaining > 0 ? `${meal.portionsRemaining} Left` : 'Sold Out'}
              </Text>
            </View>
          </View>

          {/* Quantity Selector Section */}
          {meal.portionsRemaining > 0 && (
            <View className="bg-white border border-gray-100 rounded-3xl p-5 mb-6 flex-row justify-between items-center shadow-xs">
              <View>
                <Text className="text-textMuted text-[10px] font-black uppercase tracking-wide">Select Quantity</Text>
                <Text className="text-textPrimary font-extrabold text-xs mt-0.5">Adjust order portions</Text>
              </View>
              <View className="flex-row items-center border border-gray-200 rounded-2xl px-4 py-2 bg-gray-50 shadow-inner">
                <TouchableOpacity 
                  onPress={() => setQuantity(Math.max(1, quantity - 1))} 
                  className="px-2"
                  activeOpacity={0.7}
                >
                  <Feather name="minus" size={16} color="#1A1A2E" />
                </TouchableOpacity>
                <Text className="font-black text-textPrimary text-base px-4">{quantity}</Text>
                <TouchableOpacity 
                  onPress={() => setQuantity(Math.min(meal.portionsRemaining, quantity + 1))} 
                  className="px-2"
                  activeOpacity={0.7}
                >
                  <Feather name="plus" size={16} color="#1A1A2E" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Description Section */}
          <View className="mb-6">
            <Text className="text-textPrimary font-black text-sm uppercase tracking-wider mb-2">About this dish</Text>
            <Text className="text-textSecondary text-sm leading-relaxed font-medium">
              {meal.description || 'Prepared fresh with high-quality local ingredients by your neighbor chef.'}
            </Text>
          </View>

          {/* Ingredients & Allergens Grid */}
          <View className="flex-row gap-4 mb-6">
            <View className="flex-1 bg-white border border-gray-100 rounded-3xl p-4 shadow-xs">
              <View className="flex-row items-center gap-1.5 mb-2.5">
                <Feather name="list" size={14} color="#FF6B35" />
                <Text className="text-textPrimary font-extrabold text-xs uppercase tracking-wider">Ingredients</Text>
              </View>
              {meal.ingredients && meal.ingredients.length > 0 ? (
                meal.ingredients.map((item: string, index: number) => (
                  <Text key={index} className="text-textSecondary text-xs mb-1 font-medium">• {item}</Text>
                ))
              ) : (
                <Text className="text-textMuted text-xs italic">Fresh home ingredients</Text>
              )}
            </View>
            
            <View className="flex-1 bg-white border border-gray-100 rounded-3xl p-4 shadow-xs">
              <View className="flex-row items-center gap-1.5 mb-2.5">
                <Feather name="alert-circle" size={14} color="#EF4444" />
                <Text className="text-textPrimary font-extrabold text-xs uppercase tracking-wider">Allergens</Text>
              </View>
              {meal.allergenTags && meal.allergenTags.length > 0 ? (
                meal.allergenTags.map((item: string, index: number) => (
                  <View key={index} className="bg-red-50 border border-red-100 rounded-lg px-2 py-0.5 mb-1.5 self-start">
                    <Text className="text-red-700 text-[9px] font-black uppercase tracking-wide">{item}</Text>
                  </View>
                ))
              ) : (
                <Text className="text-textMuted text-xs italic">No major allergens listed</Text>
              )}
            </View>
          </View>

          {/* Neighbor Reviews Section */}
          <View className="mb-6">
            <Text className="text-textPrimary font-black text-sm uppercase tracking-wider mb-4">Neighbor Feedback</Text>
            {meal.recentReviews && meal.recentReviews.length > 0 ? (
              meal.recentReviews.map((item: any, index: number) => (
                <View key={index} className="bg-white border border-gray-100 rounded-2xl p-4 mb-3 shadow-xs">
                  <View className="flex-row justify-between items-center mb-1.5">
                    <View className="flex-row items-center">
                      <View className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center mr-2 border border-gray-200">
                        <Text className="text-[10px] font-black text-gray-700">{getInitials(item.userName)}</Text>
                      </View>
                      <Text className="text-textPrimary font-extrabold text-xs">{item.userName}</Text>
                    </View>
                    <View className="flex-row items-center gap-0.5">
                      {Array.from({ length: item.rating }).map((_, i) => (
                        <Ionicons key={i} name="star" size={10} color="#F59E0B" />
                      ))}
                    </View>
                  </View>
                  {item.comment ? (
                    <Text className="text-textSecondary text-xs leading-relaxed font-medium mb-1">{item.comment}</Text>
                  ) : null}
                  {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} className="w-full h-40 rounded-xl mt-2 bg-gray-50" resizeMode="cover" />
                  ) : null}
                </View>
              ))
            ) : (
              <View className="bg-white border border-gray-100 rounded-2xl p-5 items-center">
                <Feather name="message-square" size={24} color="#9CA3AF" className="mb-2" />
                <Text className="text-textMuted text-xs font-medium text-center">No reviews submitted yet. Be the first neighbor to review!</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-150 px-6 py-4 flex-row items-center justify-between shadow-2xl z-20">
        <View>
          <Text className="text-textMuted text-[9px] font-black uppercase tracking-wider">TOTAL AMOUNT</Text>
          <Text className="text-textPrimary font-black text-xl">LKR {totalPrice}</Text>
        </View>
        
        <View className="w-48">
          <Button
            title={meal.portionsRemaining > 0 ? "ADD TO CART" : "SOLD OUT"}
            onPress={handleOrder}
            disabled={meal.portionsRemaining <= 0}
            variant="primary"
          />
        </View>
      </View>
    </View>
  );
};
