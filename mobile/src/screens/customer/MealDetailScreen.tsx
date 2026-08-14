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
        <Text className="text-textMuted text-base font-bold text-center">Meal details missing</Text>
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
        'Added to Cart 🎉',
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
        <View className="w-full h-72 bg-primary/10 relative">
          {meal.photos && meal.photos.length > 0 ? (
            <Image source={{ uri: meal.photos[0] }} className="w-full h-full object-cover" />
          ) : (
            <View className="w-full h-full items-center justify-center">
              <Text className="text-6xl">🍛</Text>
            </View>
          )}

          {/* Top Actions Overlay */}
          <View className="absolute top-12 left-6 right-6 flex-row justify-between items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 rounded-full bg-white/95 items-center justify-center shadow-md border border-gray-100"
            >
              <Feather name="arrow-left" size={20} color="#1A1A2E" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsFavorite(prev => !prev)}
              className="w-10 h-10 rounded-full bg-white/95 items-center justify-center shadow-md border border-gray-100"
            >
              <Ionicons 
                name={isFavorite ? "heart" : "heart-outline"} 
                size={20} 
                color={isFavorite ? "#E04E1A" : "#1A1A2E"} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Box */}
        <View className="p-6 -mt-6 bg-surface-elevated rounded-t-[32px] shadow-lg border-t border-gray-100">
          {/* Category Badge & Title */}
          <View className="flex-row items-center justify-between mb-3">
            <Badge label={meal.category} variant="primary" />
            <View className="flex-row items-center bg-amber-50 border border-amber-150 px-2.5 py-0.5 rounded-full shadow-xs">
              <Text className="text-xs mr-0.5">⭐</Text>
              <Text className="text-amber-800 font-extrabold text-xs">
                {meal.avgRating > 0 ? meal.avgRating.toFixed(1) : 'New'}
              </Text>
            </View>
          </View>

          <View className="flex-row justify-between items-start mb-4">
            <Text className="text-textPrimary font-black text-2xl flex-1 mr-4 leading-8">{meal.name}</Text>
            <View className="items-end">
              <Text className="text-textSecondary text-[10px] font-bold uppercase mb-0.5">PRICE</Text>
              <Text className="text-primary font-black text-xl">LKR {meal.price}</Text>
            </View>
          </View>

          {/* Divider */}
          <View className="h-[1px] bg-gray-200/60 w-full mb-5" />

          {/* Cook/Chef details container */}
          <View className="bg-white rounded-3xl p-4 border border-gray-150 shadow-sm flex-row items-center justify-between mb-6">
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-11 h-11 rounded-full bg-orange-100 border border-orange-200 items-center justify-center shadow-inner mr-3">
                <Text className="text-primary-dark font-black text-base">{getInitials(meal.cookName)}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-textSecondary text-[9px] font-black uppercase tracking-wider">HOME CHEF</Text>
                <Text className="text-textPrimary font-extrabold text-sm mt-0.5">{meal.cookName}</Text>
              </View>
            </View>
            <View className="border border-gray-150 bg-gray-50 rounded-xl px-3 py-1.5 items-center">
              <Text className="text-textSecondary text-[8px] font-black uppercase">PORTIONS</Text>
              <Text className={`text-xs font-black mt-0.5 ${meal.portionsRemaining > 0 ? 'text-secondary' : 'text-red-500'}`}>
                {meal.portionsRemaining > 0 ? `${meal.portionsRemaining} Left` : 'Sold Out'}
              </Text>
            </View>
          </View>

          {/* Quantity Selector Section */}
          {meal.portionsRemaining > 0 && (
            <View className="bg-white border border-gray-100 rounded-3xl p-5 mb-6 flex-row justify-between items-center shadow-xs">
              <View>
                <Text className="text-textSecondary text-[10px] font-black uppercase tracking-wide">Select Portions</Text>
                <Text className="text-textPrimary font-bold text-xs mt-0.5">Adjust order size</Text>
              </View>
              <View className="flex-row items-center border border-gray-200 rounded-2xl px-4 py-1.5 bg-gray-50 shadow-inner">
                <TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))} className="px-2">
                  <Feather name="minus" size={16} color="#1A1A2E" />
                </TouchableOpacity>
                <Text className="font-extrabold text-textPrimary text-base px-4">{quantity}</Text>
                <TouchableOpacity onPress={() => setQuantity(Math.min(meal.portionsRemaining, quantity + 1))} className="px-2">
                  <Feather name="plus" size={16} color="#1A1A2E" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Description Section */}
          <Text className="text-textPrimary font-black text-sm uppercase tracking-wider mb-2">About this dish</Text>
          <Text className="text-textSecondary text-sm mb-6 leading-relaxed font-medium">{meal.description}</Text>

          {/* Ingredients & Allergens in Grid */}
          <View className="flex-row gap-4 mb-6">
            <View className="flex-1 bg-white border border-gray-100 rounded-3xl p-4 shadow-xs">
              <View className="flex-row items-center gap-1 mb-2">
                <Text className="text-xs">🥕</Text>
                <Text className="text-textPrimary font-extrabold text-xs uppercase tracking-wider">Ingredients</Text>
              </View>
              {meal.ingredients && meal.ingredients.length > 0 ? (
                meal.ingredients.map((item: string, index: number) => (
                  <Text key={index} className="text-textSecondary text-xs mb-1 font-medium">• {item}</Text>
                ))
              ) : (
                <Text className="text-textMuted text-xs italic">Not specified</Text>
              )}
            </View>
            
            <View className="flex-1 bg-white border border-gray-100 rounded-3xl p-4 shadow-xs">
              <View className="flex-row items-center gap-1 mb-2">
                <Text className="text-xs">⚠️</Text>
                <Text className="text-textPrimary font-extrabold text-xs uppercase tracking-wider">Allergens</Text>
              </View>
              {meal.allergenTags && meal.allergenTags.length > 0 ? (
                meal.allergenTags.map((item: string, index: number) => (
                  <View key={index} className="bg-red-50 border border-red-100 rounded-lg px-2 py-0.5 mb-1.5 self-start">
                    <Text className="text-red-700 text-[9px] font-black uppercase tracking-wide">{item}</Text>
                  </View>
                ))
              ) : (
                <Text className="text-textMuted text-xs italic">No allergens listed</Text>
              )}
            </View>
          </View>

          {/* Reviews list */}
          <Text className="text-textPrimary font-black text-sm uppercase tracking-wider mb-4">Neighbor Feedback</Text>
          {meal.recentReviews && meal.recentReviews.length > 0 ? (
            meal.recentReviews.map((item: any, index: number) => (
              <View key={index} className="bg-white border border-gray-100 rounded-2xl p-4 mb-3 shadow-xs">
                <View className="flex-row justify-between items-center mb-1.5">
                  <View className="flex-row items-center">
                    <View className="w-6 h-6 rounded-full bg-gray-100 items-center justify-center mr-2 border border-gray-200">
                      <Text className="text-[10px] font-bold text-gray-600">{getInitials(item.userName)}</Text>
                    </View>
                    <Text className="text-textPrimary font-extrabold text-xs">{item.userName}</Text>
                  </View>
                  <View className="flex-row">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Text key={i} className="text-accent text-[10px]">⭐</Text>
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
            <Text className="text-textMuted text-xs italic mb-6">No reviews submitted yet. Be the first to order and review!</Text>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions Bar (Uber Eats Style) */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-150 px-6 py-4 flex-row items-center justify-between shadow-2xl z-20">
        <View>
          <Text className="text-textSecondary text-[10px] font-bold uppercase">ORDER TOTAL</Text>
          <Text className="text-textPrimary font-black text-lg">LKR {totalPrice}</Text>
        </View>
        
        <View className="w-48">
          <Button
            title={meal.portionsRemaining > 0 ? "ADD TO CART 🛒" : "SOLD OUT"}
            onPress={handleOrder}
            disabled={meal.portionsRemaining <= 0}
            variant="primary"
          />
        </View>
      </View>
    </View>
  );
};
