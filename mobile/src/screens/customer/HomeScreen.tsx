import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { api } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

type HomeScreenNavigationProp = NativeStackNavigationProp<CustomerStackParamList, 'HomeTabs'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');

  const categories = ['ALL', 'BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

  const fetchMeals = async (category: string) => {
    try {
      const categoryParam = category && category !== 'ALL' ? `?category=${category}` : '';
      const response = await api.get(`/api/meals${categoryParam}`);
      setMeals(response.data);
    } catch (error) {
      console.error('Error fetching meals:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMeals(selectedCategory);
    setRefreshing(false);
  }, [selectedCategory]);

  useEffect(() => {
    fetchMeals(selectedCategory);

    const unsubscribe = navigation.addListener('focus', () => {
      fetchMeals(selectedCategory);
    });
    return unsubscribe;
  }, [navigation, selectedCategory]);

  return (
    <View className="flex-1 bg-surface-elevated px-4 pt-4">
      {/* Location Header */}
      <View className="mb-6 flex-row justify-between items-center">
        <View>
          <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider">CURRENT LOCATION</Text>
          <Text className="text-textPrimary font-extrabold text-sm mt-0.5">Colombo, Sri Lanka 📍</Text>
        </View>
        <View className="bg-primary/10 rounded-full px-3 py-1">
          <Text className="text-primary font-bold text-xs">Customer</Text>
        </View>
      </View>

      {/* Greeting */}
      <View className="mb-6">
        <Text className="text-textSecondary text-lg font-medium">Hello, hungry neighbor!</Text>
        <Text className="text-textPrimary text-2xl font-black mt-1">Discover Home Cooking</Text>
      </View>

      {/* Category Horizontal Filter Chips */}
      <View className="mb-6">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isActive = selectedCategory === item || (item === 'ALL' && selectedCategory === '');
            return (
              <TouchableOpacity
                onPress={() => setSelectedCategory(item === 'ALL' ? '' : item)}
                className={`mr-3 px-4 py-2.5 rounded-full border ${
                  isActive ? 'bg-primary border-primary' : 'bg-white border-gray-100'
                }`}
              >
                <Text className={`text-xs font-bold ${isActive ? 'text-white' : 'text-textSecondary'}`}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Meals Feed */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : meals.length === 0 ? (
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-textMuted text-base font-semibold text-center mb-1">No meals listed right now</Text>
          <Text className="text-textMuted text-xs text-center">Try switching categories or check back later.</Text>
        </View>
      ) : (
        <FlatList
          data={meals}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" colors={['#FF6B35']} />
          }
          renderItem={({ item }) => (
            <Card
              onPress={() => navigation.navigate('MealDetail', { mealId: item.id })}
              className="mb-4"
            >
              <View className="flex-row items-center">
                {/* Fallback image if photos are empty */}
                <View className="w-20 h-20 rounded-xl bg-primary/10 items-center justify-center mr-4 overflow-hidden">
                  {item.photos && item.photos.length > 0 ? (
                    <Image source={{ uri: item.photos[0] }} className="w-full h-full" />
                  ) : (
                    <Text className="text-primary text-xl font-bold">🍛</Text>
                  )}
                </View>
                <View className="flex-1">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-textPrimary font-bold text-base leading-5 flex-1 mr-2" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className="text-primary font-black text-base">LKR {item.price}</Text>
                  </View>
                  <Text className="text-textMuted text-xs mb-2">By Cook: {item.cookName}</Text>
                  <View className="flex-row justify-between items-center">
                    <Badge label={item.category} variant="primary" />
                    <View className="flex-row items-center">
                      <Text className="text-accent text-sm mr-1">⭐</Text>
                      <Text className="text-textPrimary text-xs font-bold">
                        {item.avgRating > 0 ? item.avgRating.toFixed(1) : 'New'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
};
