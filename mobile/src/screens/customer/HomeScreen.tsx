import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { api } from '../../services/api';
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

  const categories = ['ALL', 'BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS'];

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
    <View className="flex-1 relative bg-surface-elevated">
      {/* Liquid Background Blobs */}
      <View className="absolute w-72 h-72 rounded-full bg-primary/10 -top-20 -left-20 blur-3xl opacity-40" />
      <View className="absolute w-80 h-80 rounded-full bg-secondary/8 top-80 -right-20 blur-3xl opacity-30" />
      <View className="absolute w-60 h-60 rounded-full bg-accent/8 bottom-20 -left-10 blur-3xl opacity-25" />

      {/* Main Container */}
      <View className="flex-1 px-5 pt-6">
        {/* Header Row */}
        <View className="flex-row justify-between items-center mb-5">
          <View>
            <Text className="text-textSecondary text-[10px] font-black uppercase tracking-widest">📍 Colombo, Sri Lanka</Text>
            <Text className="text-textPrimary font-extrabold text-lg mt-0.5">NeighborPlates</Text>
          </View>
          <View className="border border-primary/20 bg-primary/10 rounded-full px-3.5 py-1.5 shadow-sm">
            <Text className="text-primary font-black text-[10px] uppercase tracking-wider">🍛 Fresh & Local</Text>
          </View>
        </View>

        {/* Welcome Section */}
        <View className="mb-6">
          <Text className="text-textSecondary text-base font-medium">Hello, hungry neighbor!</Text>
          <Text className="text-textPrimary text-3xl font-black tracking-tight mt-0.5">Discover Home Cooking</Text>
        </View>

        {/* Categories Chips */}
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
                  className={`mr-2.5 px-5 py-2.5 rounded-full border shadow-sm ${
                    isActive
                      ? 'bg-primary border-primary'
                      : 'bg-white/60 border-white/80'
                  }`}
                  activeOpacity={0.75}
                >
                  <Text className={`text-xs font-extrabold ${isActive ? 'text-white' : 'text-textSecondary'}`}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Meals Feed */}
        {loading ? (
          <View className="flex-1 justify-center items-center pb-12">
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
        ) : meals.length === 0 ? (
          <View className="flex-1 justify-center items-center pb-12 px-6">
            <Text className="text-5xl mb-4">🍲</Text>
            <Text className="text-textPrimary font-bold text-base text-center mb-1">No meals listed right now</Text>
            <Text className="text-textSecondary text-xs text-center leading-relaxed">
              Try switching categories or check back later for fresh listings.
            </Text>
          </View>
        ) : (
          <FlatList
            data={meals}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 30 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" colors={['#FF6B35']} />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => navigation.navigate('MealDetail', { mealId: item.id })}
                className="mb-4 bg-white/60 border border-white/80 rounded-3xl p-4 shadow-md flex-row items-center relative overflow-hidden"
                activeOpacity={0.75}
              >
                {/* Fallback image if photos are empty */}
                <View className="w-20 h-20 rounded-2xl bg-primary/10 items-center justify-center mr-4 overflow-hidden border border-gray-100 shadow-inner">
                  {item.photos && item.photos.length > 0 ? (
                    <Image source={{ uri: item.photos[0] }} className="w-full h-full" />
                  ) : (
                    <Text className="text-primary text-2xl font-bold">🍛</Text>
                  )}
                </View>

                {/* Meal Details */}
                <View className="flex-1">
                  <View className="flex-row justify-between items-center mb-0.5">
                    <Text className="text-textPrimary font-extrabold text-base leading-5 flex-1 mr-2" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className="text-primary font-black text-sm">LKR {item.price}</Text>
                  </View>
                  <Text className="text-textSecondary text-xs mb-2">By Cook: {item.cookName}</Text>
                  <View className="flex-row justify-between items-center">
                    <Badge label={item.category} variant="primary" />
                    <View className="flex-row items-center bg-white/80 rounded-full px-2 py-0.5 border border-gray-100 shadow-xs">
                      <Text className="text-accent text-xs mr-0.5">⭐</Text>
                      <Text className="text-textPrimary text-[10px] font-black">
                        {item.avgRating > 0 ? item.avgRating.toFixed(1) : 'New'}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </View>
  );
};
