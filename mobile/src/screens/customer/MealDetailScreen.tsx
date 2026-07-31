import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image, Alert, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

type MealDetailScreenProps = NativeStackScreenProps<CustomerStackParamList, 'MealDetail'>;

export const MealDetailScreen: React.FC<MealDetailScreenProps> = ({ route, navigation }) => {
  const { mealId } = route.params;
  const [meal, setMeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

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

  useEffect(() => {
    fetchMealDetails();
  }, [mealId]);

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
    navigation.navigate('Checkout', { mealId, quantity });
  };

  return (
    <ScrollView className="flex-1 bg-surface-elevated">
      {/* Cover Image */}
      <View className="w-full h-64 bg-primary/10 items-center justify-center relative">
        {meal.photos && meal.photos.length > 0 ? (
          <Image source={{ uri: meal.photos[0] }} className="w-full h-full" />
        ) : (
          <Text className="text-primary text-5xl">🍛</Text>
        )}
        <View className="absolute bottom-4 left-4">
          <Badge label={meal.category} variant="primary" />
        </View>
      </View>

      <View className="p-6">
        {/* Header Title & Price */}
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-textPrimary font-extrabold text-2xl flex-1 mr-4">{meal.name}</Text>
          <Text className="text-primary font-black text-2xl">LKR {meal.price}</Text>
        </View>

        <Text className="text-textMuted text-xs mb-4">Prepared by: {meal.cookName}</Text>

        {/* Portions Status */}
        <View className="flex-row items-center justify-between bg-white border border-gray-100 rounded-2xl p-4 mb-6">
          <View>
            <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider">AVAILABLE PORTIONS</Text>
            <Text className={`text-sm font-extrabold mt-1 ${meal.portionsRemaining > 0 ? 'text-secondary' : 'text-red-500'}`}>
              {meal.portionsRemaining > 0 ? `${meal.portionsRemaining} Portions Left` : 'Sold Out'}
            </Text>
          </View>
          
          {meal.portionsRemaining > 0 ? (
            <View className="flex-row items-center border border-gray-200 rounded-xl px-3 py-1 bg-surface-elevated">
              <TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))} className="px-2.5 py-1">
                <Text className="font-extrabold text-textPrimary text-lg">-</Text>
              </TouchableOpacity>
              <Text className="font-bold text-textPrimary text-base px-3">{quantity}</Text>
              <TouchableOpacity onPress={() => setQuantity(Math.min(meal.portionsRemaining, quantity + 1))} className="px-2.5 py-1">
                <Text className="font-extrabold text-textPrimary text-lg">+</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Description */}
        <Text className="text-textPrimary font-bold text-base mb-2">Description</Text>
        <Text className="text-textSecondary text-sm mb-6 leading-5">{meal.description}</Text>

        {/* Ingredients & Allergens */}
        <View className="mb-6 flex-row justify-between">
          <View className="flex-1 mr-4">
            <Text className="text-textPrimary font-bold text-sm mb-2">Ingredients</Text>
            {meal.ingredients && meal.ingredients.length > 0 ? (
              meal.ingredients.map((item: string, index: number) => (
                <Text key={index} className="text-textSecondary text-xs mb-1">• {item}</Text>
              ))
            ) : (
              <Text className="text-textMuted text-xs italic">Not specified</Text>
            )}
          </View>
          
          <View className="flex-1">
            <Text className="text-textPrimary font-bold text-sm mb-2">Allergens</Text>
            {meal.allergenTags && meal.allergenTags.length > 0 ? (
              meal.allergenTags.map((item: string, index: number) => (
                <View key={index} className="bg-red-50 border border-red-150 rounded px-2 py-0.5 mb-1.5 self-start">
                  <Text className="text-red-700 text-[10px] font-bold uppercase">{item}</Text>
                </View>
              ))
            ) : (
              <Text className="text-textMuted text-xs italic">No allergens listed</Text>
            )}
          </View>
        </View>

        {/* Review list */}
        <Text className="text-textPrimary font-bold text-base mb-3">Recent Customer Reviews</Text>
        {meal.recentReviews && meal.recentReviews.length > 0 ? (
          meal.recentReviews.map((item: any, index: number) => (
            <View key={index} className="bg-white border border-gray-50 rounded-2xl p-4 mb-3">
              <View className="flex-row justify-between items-center mb-1.5">
                <Text className="text-textPrimary font-bold text-xs">{item.userName}</Text>
                <Text className="text-accent text-xs">{"⭐".repeat(item.rating)}</Text>
              </View>
              <Text className="text-textSecondary text-xs leading-4">{item.comment}</Text>
            </View>
          ))
        ) : (
          <Text className="text-textMuted text-xs italic mb-6">No reviews submitted yet.</Text>
        )}

        <Button
          title={meal.portionsRemaining > 0 ? "ORDER PORTION" : "SOLD OUT"}
          onPress={handleOrder}
          disabled={meal.portionsRemaining <= 0}
          variant="primary"
          className="w-full mt-4 mb-10"
        />
      </View>
    </ScrollView>
  );
};
